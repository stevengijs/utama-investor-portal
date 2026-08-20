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
 * Live unit-beschikbaarheid per project uit één bron (project_availability).
 * Geeft {total, sold, reserved, available, units:[{n,status}]} of null bij fout.
 * Statusmodel (zie migratie ..._availability_aanbetaald_is_gereserveerd):
 *   sold      = notarieel/historisch (projects.sold_units_manual)
 *   reserved  = getekende ITP, incl. aanbetaald (deposit_paid telt als reserved,
 *               NIET als sold)
 *   available = de rest
 * In marketing tonen we "vergeven" = verkocht + gereserveerd (zie availabilityText),
 * dus aanbetaald telt wél mee in het vergeven-getal, alleen niet als "verkocht".
 * Alle publieke pagina's + de digitale brochure lezen dit, zodat een reservering
 * overal meteen consistent doorwerkt.
 */
async function utamaAvailability(slug){
  const sb = getSupabaseClient();
  if(!sb) return null;
  try{
    const { data, error } = await sb.rpc('project_availability', { p_slug: slug });
    return error ? null : data;
  }catch(e){ return null; }
}
if(typeof window!=='undefined') window.utamaAvailability = utamaAvailability;

/*
 * DE enige bron voor beschikbaarheids-tekst. Alle pagina's (homepage, project-
 * pagina's, brochure) gebruiken dit, zodat de cijfers overal identiek zijn en
 * altijd optellen. "Vergeven" = verkocht + gereserveerd, zodat vergeven + nog
 * beschikbaar = totaal (geen "3 verkocht maar 2 beschikbaar"-verwarring meer).
 * Neemt {total, sold, reserved, available}; geeft {line, tag, short, presale, soldout}.
 */
function availabilityText(d, lang){
  lang = (lang === 'en') ? 'en' : 'nl';
  if(!d) return null;
  const total = +d.total || 0;
  const sold = +d.sold || 0;
  const reserved = +d.reserved || 0;
  const available = (d.available != null) ? (+d.available) : Math.max(0, total - sold - reserved);
  const taken = sold + reserved;
  if(taken <= 0){
    return { presale:true, soldout:false, total, taken:0, available,
      line:  (lang==='nl') ? 'In pre-sale' : 'In pre-sale',
      tag:   (lang==='nl') ? 'Nieuw in verkoop' : 'Newly launched',
      short: 'Pre-sale' };
  }
  if(available <= 0){
    return { presale:false, soldout:true, total, taken, available:0,
      line:  (lang==='nl') ? ('Volledig verkocht ('+total+' van '+total+')') : ('Fully sold out ('+total+' of '+total+')'),
      tag:   '',
      short: (lang==='nl') ? 'Uitverkocht' : 'Sold out' };
  }
  return { presale:false, soldout:false, total, taken, available,
    line:  (lang==='nl') ? (taken+' van '+total+' verkocht · nog '+available+' beschikbaar')
                         : (taken+' of '+total+' sold · '+available+' still available'),
    tag:   (lang==='nl') ? (taken+' verkocht') : (taken+' sold'),
    short: taken + (lang==='nl' ? ' van ' : ' of ') + total };
}
if(typeof window!=='undefined') window.availabilityText = availabilityText;

/*
 * DE enige bron voor projectbeelden (renders/foto's + plattegronden), uit de
 * admin-galerij (project_media). Alle oppervlaktes lezen dit: de projectpagina,
 * de digitale brochure EN de PDF-brochure, zodat de beelden overal identiek zijn
 * en niks meer hardcoded loshangt. Upload je in de admin een nieuwe render of
 * plattegrond, dan verschijnt die automatisch overal.
 *   kind 'render'    -> foto's/renders (galerij + omslag/hero)
 *   kind 'floorplan' -> plattegronden (aparte "Plattegronden"-sectie)
 * Geeft {all, renders, floorplans, hero, gallery} met kant-en-klare publieke
 * URL's, of null bij fout. gallery = renders zonder de hero.
 */
const PROJECT_MEDIA_BASE = 'https://gcpachivrwalsneuvlsa.supabase.co/storage/v1/object/public/project-media/';
async function utamaProjectMedia(slug){
  const sb = getSupabaseClient();
  if(!sb) return null;
  try{
    const { data, error } = await sb.rpc('project_media_public', { p_slug: slug });
    if(error || !Array.isArray(data)) return null;
    const all = data.map(function(r){
      return { url: PROJECT_MEDIA_BASE + r.path, caption: r.caption || '', hero: !!r.is_hero, kind: r.kind || 'render' };
    });
    const renders = all.filter(function(m){ return m.kind !== 'floorplan'; });
    const floorplans = all.filter(function(m){ return m.kind === 'floorplan'; });
    const hero = renders.filter(function(m){ return m.hero; })[0] || renders[0] || all[0] || null;
    const gallery = renders.filter(function(m){ return m !== hero; });
    return { all: all, renders: renders, floorplans: floorplans, hero: hero, gallery: gallery };
  }catch(e){ return null; }
}
if(typeof window!=='undefined') window.utamaProjectMedia = utamaProjectMedia;

/*
 * Herbruikbare, gestileerde locatiekaart (Leaflet + CARTO light tiles) met
 * POI-markers en reistijden, in de UTAMA-huisstijl. Vervangt de Google Maps-
 * iframe in de Locatie-tab. Elk project roept 'm aan met z'n eigen centrum +
 * POI-lijst, dus schaalbaar. Leaflet moet in de pagina geladen zijn (CDN).
 * opts = { center:[lat,lng], label:'The Maison', zoom, pois:[{name,lat,lng,cat,min,ico}] }
 *   cat: 'food' | 'fit' | 'beach' | 'spot'  (bepaalt kleur + standaard-emoji)
 */
function utamaLocationMap(elId, opts){
  if(typeof L==='undefined' || !opts) return null;
  var host=document.getElementById(elId); if(!host || host._umap) return null;
  if(!document.getElementById('utama-map-css')){
    var st=document.createElement('style'); st.id='utama-map-css';
    st.textContent=
      '.leaflet-container{background:#f3f1ea;font-family:inherit;border-radius:14px;position:relative;z-index:0;isolation:isolate}'+
      /* Leaflet gebruikt intern z-index tot 1000; zonder eigen stapelcontext
         schuift de kaart bij het scrollen over de sticky header heen. */

      '.leaflet-control-zoom a{color:#17140F}'+
      '.upoi .dot{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid #fff;box-shadow:0 2px 7px rgba(0,0,0,.28);transform:translate(-50%,-50%)}'+
      '.upoi .lbl{position:absolute;left:0;top:0;transform:translate(-50%,calc(-50% - 27px));white-space:nowrap;background:#fff;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;color:#17140F;box-shadow:0 3px 10px rgba(0,0,0,.16)}'+
      '.upoi.food .dot{background:#E8912A}.upoi.food .lbl b{color:#E8912A}'+
      '.upoi.fit .dot{background:#2E9E6B}.upoi.fit .lbl b{color:#2E9E6B}'+
      '.upoi.beach .dot{background:#3E86C9}.upoi.beach .lbl b{color:#3E86C9}'+
      '.upoi.spot .dot{background:#8B5A3C}.upoi.spot .lbl b{color:#8B5A3C}'+
      '.upoi.home .dot{width:44px;height:44px;font-size:20px;background:#8B5A3C;border:3px solid #fff}'+
      '.upoi.home .lbl{font-size:13px;background:#8B5A3C;color:#fff;transform:translate(-50%,calc(-50% - 34px))}';
    document.head.appendChild(st);
  }
  var map=L.map(elId,{scrollWheelZoom:false,zoomControl:true}).setView(opts.center, opts.zoom||14);
  host._umap=map;
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19,attribution:'© OpenStreetMap © CARTO'}).addTo(map);
  var EMO={food:'🍽️',fit:'🧘',beach:'🏖️',spot:'📍'};
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function mk(lat,lng,cls,ico,name,min){
    var lbl='<div class="lbl">'+esc(name)+(min!=null?' <b>'+esc(min)+' min</b>':'')+'</div>';
    return L.marker([lat,lng],{icon:L.divIcon({className:'upoi '+cls,html:lbl+'<div class="dot">'+ico+'</div>',iconSize:[0,0],iconAnchor:[0,0]}),keyboard:false}).addTo(map);
  }
  var pts=[opts.center];
  mk(opts.center[0],opts.center[1],'home','🏠',opts.label||'',null);
  (opts.pois||[]).forEach(function(p){
    mk(p.lat,p.lng,p.cat||'food',p.ico||EMO[p.cat]||'📍',p.name,p.min);
    pts.push([p.lat,p.lng]);
  });
  try{ map.fitBounds(pts,{padding:[46,46],maxZoom:15}); }catch(e){}


  // De kaart zit vaak in een verborgen tab: Leaflet kent dan de afmetingen niet
  // (0px hoog, tegels laden niet). Herbereken zodra de container zichtbaar wordt.
  function refresh(){ try{ map.invalidateSize(); map.fitBounds(pts,{padding:[46,46],maxZoom:15}); }catch(e){} }
  setTimeout(refresh, 250);
  if(window.ResizeObserver){ try{ new ResizeObserver(function(){ if(host.offsetHeight>0) refresh(); }).observe(host); }catch(e){} }
  window.addEventListener('resize', refresh);
  host._urefresh = refresh;
  return map;
}
if(typeof window!=='undefined') window.utamaLocationMap = utamaLocationMap;

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
/* Waarde voor Meta ("Value optimization"): de campagne zoekt dan mensen die op
 * je waardevolste leads lijken i.p.v. op willekeurige formulier-invullers. Het
 * gaat om de VERHOUDING tussen de waarden, niet om echte euro's. Twee signalen:
 *  1) koopintentie (timeline): 100/60/40/20 voor zsm / 3-6mnd / 6-12mnd / oriënteert.
 *  2) budget: alleen écht hoge budgetten (>=350K, premium/meerdere units) krijgen
 *     een bonus (x1.4). Je kernmarkt van 200-250K blijft de basiswaarde, die
 *     straffen we niet af. Zo is een snelle koper met veel budget de topwaarde. */
function _budgetMaxEur(budget){
  var s = String(budget || '').toLowerCase().replace(/[.\s]/g, ''); // "€200k-€250k" / "tot€350000"
  var m = s.match(/\d+k?/g);
  if (!m) return 0;
  var max = 0;
  m.forEach(function(tok){ var n = parseInt(tok, 10) * (/k/.test(tok) ? 1000 : 1); if (n > max) max = n; });
  return max;
}
function _leadValue(timeline, budget){
  var t = String(timeline || '').toLowerCase();
  var base = 20; // oriënteert nog / onbekend
  if (/snel mogelijk|as soon|secepatnya|binnen 3|within 3|dalam 3|< ?3/.test(t)) base = 100;
  else if (/3 ?(tot|-|to|–) ?6|3-6/.test(t)) base = 60;
  else if (/6 ?(tot|-|to|–) ?12|6-12/.test(t)) base = 40;
  var factor = _budgetMaxEur(budget) >= 350000 ? 1.4 : 1.0;
  return Math.round(base * factor);
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
        value: _leadValue(fields.when, fields.budget),
        currency: 'EUR',
        fbp: _readCookie('_fbp'),
        fbc: _readCookie('_fbc')
      })
    }).catch(()=>{});
  }catch(e){}
}
/* Read the first-party analytics session id (set by t.js in sessionStorage as _ua_sid).
 * Storing it on the lead lets the admin match a live website visitor to their CRM contact. */
function _getAnalyticsSession(){
  try{ if(window._ua_sid) return window._ua_sid; }catch(e){}
  try{ return sessionStorage.getItem('_ua_sid') || null; }catch(e){ return null; }
}
function _getAnalyticsVid(){
  try{ if(window._ua_vid) return window._ua_vid; }catch(e){}
  try{ return localStorage.getItem('_ua_vid') || null; }catch(e){ return null; }
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
      p_session_id: _getAnalyticsSession(),
      p_vid: _getAnalyticsVid(),
      p_fbp: _readCookie('_fbp'),
      p_fbc: _readCookie('_fbc')
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
