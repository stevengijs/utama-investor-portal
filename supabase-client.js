/*
 * UTAMA lead capture - thin Supabase client wrapper.
 *
 * Fill in SUPABASE_URL and SUPABASE_ANON_KEY below once your Supabase project
 * exists (Supabase dashboard > Project Settings > API). Both values are safe
 * to ship in public site code: the anon key can only ever call submit_lead(),
 * it cannot read or write any table directly. See supabase/schema.sql for the
 * full setup (run that file once in the Supabase SQL Editor first).
 *
 * Until both values below are filled in, submitLead() is a harmless no-op - * the site keeps working exactly as before (forms still show the success
 * animation), it just doesn't persist leads anywhere yet.
 */
const SUPABASE_URL = "https://gcpachivrwalsneuvlsa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_P6qb3M4xQnPJGZkM-WFWdg_E9swz7Zn";

let _sbClient = null;
function getSupabaseClient(){
  if(!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if(!_sbClient && window.supabase && window.supabase.createClient){
    _sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _sbClient;
}

/*
 * Referral programme - lightweight attribution that runs on every page that
 * loads this file (no extra wiring needed per-page). Anyone landing with
 * ?ref=CODE in the URL gets that code remembered in localStorage for 90
 * days; submitLead() below automatically attaches it to every brochure/
 * early-access form submission from then on, so a friend who fills in a
 * form weeks later on a totally different page still gets credited.
 * See supabase/referrals-schema.sql for the server side of this.
 */
const REF_STORAGE_KEY = "utama_ref";
const REF_MAX_AGE_DAYS = 90;

function _captureReferralFromUrl(){
  try{
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('ref');
    if(!raw) return;
    const code = raw.trim().toUpperCase();
    if(!code) return;

    localStorage.setItem(REF_STORAGE_KEY, JSON.stringify({ code, ts: Date.now() }));

    // Log a visit at most once per code per browser session, so refreshing
    // or browsing multiple pages doesn't inflate the referrer's visit count.
    const visitFlag = "utama_ref_visit_logged_" + code;
    if(!sessionStorage.getItem(visitFlag)){
      sessionStorage.setItem(visitFlag, "1");
      const sb = getSupabaseClient();
      if(sb){
        sb.rpc('track_referral_visit', { p_code: code, p_source_page: window.location.pathname }).catch(()=>{});
      }
    }
  }catch(e){}
}
_captureReferralFromUrl();

function _getStoredReferralCode(){
  try{
    const raw = localStorage.getItem(REF_STORAGE_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    if(!parsed || !parsed.code || !parsed.ts) return null;
    const ageDays = (Date.now() - parsed.ts) / 86400000;
    if(ageDays > REF_MAX_AGE_DAYS) return null;
    return parsed.code;
  }catch(e){ return null; }
}

/**
 * Log a brochure request / early-access signup / any other lead form.
 * fields: { email, name, phone, project, unit, budget, when, lang }
 * Dedupes contacts by email server-side (see submit_lead in schema.sql) - * the same person requesting brochures for two projects becomes one contact
 * with two lead rows, not two contacts.
 *
 * Also fires a server-side Meta Conversions API "Lead" event (see the
 * meta-capi edge function) alongside the browser pixel, sharing one eventId
 * between the two so Meta dedupes them into a single conversion. This is
 * best-effort and never blocks or fails the actual lead submission - if
 * Meta/CAPI is slow or down, the visitor's brochure request still goes
 * through exactly as before. Callers should pass the returned eventId into
 * fbTrackLead(project, eventId) right after this resolves.
 */
function _genEventId(){
  try{ if(window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID(); }catch(e){}
  return 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
}
function _readCookie(name){
  try{
    const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : null;
  }catch(e){ return null; }
}
function _sendCapiLead(fields, eventId){
  try{
    fetch('https://gcpachivrwalsneuvlsa.supabase.co/functions/v1/meta-capi', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        event_name: 'Lead',
        event_id: eventId,
        email: fields.email,
        phone: fields.phone,
        project: fields.project,
        source_page: window.location.pathname,
        fbp: _readCookie('_fbp'),
        fbc: _readCookie('_fbc')
      })
    }).catch(()=>{});
  }catch(e){}
}
/* Read the first-party analytics session id (set by t.js in sessionStorage as _ua_sid).
 * Storing it on the lead lets the admin match a live website visitor to their CRM contact. */
function _getAnalyticsSession(){
  try{ return sessionStorage.getItem('_ua_sid') || null; }catch(e){ return null; }
}
async function submitLead(fields){
  const eventId = _genEventId();
  const sb = getSupabaseClient();
  if(!sb){ _sendCapiLead(fields, eventId); return { ok:false, reason:"not-configured", eventId }; }
  try{
    const { data, error } = await sb.rpc('submit_lead', {
      p_email: fields.email,
      p_name: fields.name,
      p_phone: fields.phone,
      p_project: fields.project,
      p_unit: fields.unit || null,
      p_budget: fields.budget || null,
      p_timeline: fields.when || null,
      p_source_page: window.location.pathname,
      p_lang: fields.lang || null,
      p_ref_code: _getStoredReferralCode(),
      p_type: fields.type || null,
      p_session_id: _getAnalyticsSession()
    });
    if(error){ console.error("submitLead error", error); return { ok:false, error, eventId }; }
    _sendCapiLead(fields, eventId);
    return { ok:true, contactId:data, eventId };
  }catch(err){
    console.error("submitLead exception", err);
    return { ok:false, error:err, eventId };
  }
}

/**
 * Referral portal (/referral/) helpers. Uses Supabase Auth's passwordless
 * email link - no password to set or remember. Requires "Email" auth to be
 * enabled in your Supabase project (on by default) and
 * https://invest.utamabali.com/referral/ to be added under Authentication ->
 * URL Configuration -> Redirect URLs, otherwise the emailed link will be
 * rejected on click.
 */
async function sendReferralMagicLink(email){
  const sb = getSupabaseClient();
  if(!sb) return { ok:false, reason:"not-configured" };
  try{
    const { error } = await sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + "/referral/" }
    });
    if(error){ console.error("sendReferralMagicLink error", error); return { ok:false, error }; }
    return { ok:true };
  }catch(err){
    console.error("sendReferralMagicLink exception", err);
    return { ok:false, error:err };
  }
}

/** Current Supabase Auth session, or null if not signed in. */
async function getReferralSession(){
  const sb = getSupabaseClient();
  if(!sb) return null;
  const { data } = await sb.auth.getSession();
  return data && data.session ? data.session : null;
}

function onReferralAuthChange(cb){
  const sb = getSupabaseClient();
  if(!sb) return;
  sb.auth.onAuthStateChange((_event, session) => cb(session));
}

async function signOutReferral(){
  const sb = getSupabaseClient();
  if(!sb) return;
  try{ await sb.auth.signOut(); }catch(e){}
}

/**
 * Once signed in: ensures a referral code exists for this person and
 * returns { code, visits, referrals:[{status,reward_amount,created_at,
 * eligible_at,paid_at}] }. See get_my_referral_stats() in
 * supabase/referrals-schema.sql.
 */
async function getMyReferralStats(){
  const sb = getSupabaseClient();
  if(!sb) return { ok:false, reason:"not-configured" };
  try{
    const { data, error } = await sb.rpc('get_my_referral_stats');
    if(error){ console.error("getMyReferralStats error", error); return { ok:false, error }; }
    return { ok:true, stats:data };
  }catch(err){
    console.error("getMyReferralStats exception", err);
    return { ok:false, error:err };
  }
}

/**
 * Data room helpers. One page per project (/the-maison/dataroom/, later
 * /moka/dataroom/, ...), mirroring how the rest of the site is structured -
 * not one generic cross-project /dataroom/. Same passwordless magic-link
 * pattern as the referral portal above - in fact the same Supabase Auth
 * session works across every page on the site (getReferralSession/
 * onReferralAuthChange/signOutReferral are generic, not actually
 * referral-specific, so they're reused as-is rather than duplicated here).
 * See supabase/dataroom-schema.sql.
 *
 * emailRedirectTo uses the CURRENT page's own URL, not a hardcoded path -
 * that's what makes this one function work unchanged for every project's
 * dataroom page.
 */
async function sendDataroomMagicLink(email){
  const sb = getSupabaseClient();
  if(!sb) return { ok:false, reason:"not-configured" };
  try{
    const { error } = await sb.auth.signInWithOtp({
      email: email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if(error){ console.error("sendDataroomMagicLink error", error); return { ok:false, error }; }
    return { ok:true };
  }catch(err){
    console.error("sendDataroomMagicLink exception", err);
    return { ok:false, error:err };
  }
}

/**
 * Once signed in: returns { projects:[{project, granted_at,
 * documents:[{id,category,title,description,view_url}]}] }, scoped to the
 * given project. An empty projects array means this person is signed in
 * but not (yet) approved for THIS project's data room - see
 * get_my_dataroom_access() in supabase/dataroom-schema.sql.
 */
async function getMyDataroomAccess(project){
  const sb = getSupabaseClient();
  if(!sb) return { ok:false, reason:"not-configured" };
  try{
    const { data, error } = await sb.rpc('get_my_dataroom_access', { p_project: project });
    if(error){ console.error("getMyDataroomAccess error", error); return { ok:false, error }; }
    return { ok:true, access:data };
  }catch(err){
    console.error("getMyDataroomAccess exception", err);
    return { ok:false, error:err };
  }
}

/**
 * Public file list for the current (deliberately open-for-now) phase of a
 * project's data room - no login required. Returns
 * [{id,category,title,description,view_url}]. Only ever exposes individual
 * Drive file links, never the underlying folder URL - see
 * list_dataroom_files() in supabase/dataroom-schema.sql.
 */
async function listDataroomFiles(project){
  const sb = getSupabaseClient();
  if(!sb) return { ok:false, reason:"not-configured" };
  try{
    const { data, error } = await sb.rpc('list_dataroom_files', { p_project: project });
    if(error){ console.error("listDataroomFiles error", error); return { ok:false, error }; }
    return { ok:true, files:data };
  }catch(err){
    console.error("listDataroomFiles exception", err);
    return { ok:false, error:err };
  }
}
