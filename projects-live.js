/* UTAMA - live project data from Supabase (single source of truth).
 * Reads the public project fields via the get_project() RPC and lets each
 * page apply them (price, units). Fully graceful: if Supabase is unreachable
 * or the project is missing, the page keeps its built-in fallback values. */
async function applyLiveProject(slug, onData){
  try{
    var sb = (typeof getSupabaseClient === 'function') ? getSupabaseClient() : null;
    if(!sb || !sb.rpc) return;
    var res = await sb.rpc('get_project', { p_slug: slug });
    if(!res || res.error) return;
    var row = res.data && res.data[0];
    if(row) onData(row);
  }catch(e){}
}
