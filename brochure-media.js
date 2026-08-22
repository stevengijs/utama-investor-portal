/*
 * DE gedeelde beeld-koppeling voor ALLE projectbrochures.
 *
 * Waarom dit bestand bestaat: de brochures zijn losse HTML-bestanden. Toen elke
 * brochure zijn eigen kopie van deze logica had, liep er steeds eentje achter
 * (renders wel op het ene project, niet op het andere). Nu staat het hier één
 * keer en roept elke brochure alleen nog utamaBrochureMedia('<slug>') aan.
 *
 * Wat het doet, voor elk project gelijk:
 *   - vult de projectgalerij (#bgal) met de renders uit de admin
 *   - vult de plattegronden (#floorplansGrid) en toont/verbergt dat hoofdstuk
 *   - zet window.BGIMG en window.FPIMG als [{src,cap}] voor de lightbox
 *
 * Staat er niets in de admin, dan blijft de vaste HTML als terugval staan.
 * Vereist: supabase-client.js (voor utamaProjectMedia) op de pagina.
 */
// De brochures hebben zelf een `let BGIMG/FPIMG`, wat window.BGIMG/FPIMG afschermt.
// Daarom houdt de module de lijsten zelf bij en biedt hij één aanroeppunt aan de
// onclick-handlers; zo kan er geen naamconflict meer ontstaan.
var _umBg = [], _umFp = [];
function utamaOpenLb(kind, i){
  var arr = (kind === 'fp') ? _umFp : _umBg;
  if (!arr.length) return;
  if (typeof window.openLbArr === 'function') window.openLbArr(arr, i);
}
if(typeof window!=='undefined') window.utamaOpenLb = utamaOpenLb;

async function utamaBrochureMedia(slug){
  if(!slug || typeof window.utamaProjectMedia !== 'function') return null;
  var m = null;
  try{ m = await window.utamaProjectMedia(slug); }catch(e){ return null; }
  if(!m) return null;

  // 1) Projectgalerij
  if(m.renders && m.renders.length){
    var imgs = m.hero ? [m.hero].concat(m.gallery) : m.renders;
    _umBg = imgs.map(function(x){ return { src:x.url, cap:x.caption||'' }; });
    window.BGIMG = _umBg;
    var bg = document.getElementById('bgal');
    if(bg){
      bg.innerHTML = imgs.map(function(it, i){
        return '<div class="g' + (i===0 ? ' big' : '') + '" style="background-image:url(\'' +
               String(it.url).replace(/'/g, '%27') + '\')" onclick="utamaOpenLb(\'bg\',' + i + ')"></div>';
      }).join('');
    }
  }

  // 2) Plattegronden (hoofdstuk verschijnt alleen als er iets is)
  var fps = m.floorplans || [];
  _umFp = fps.map(function(f){ return { src:f.url, cap:f.caption||'Plattegrond' }; });
  window.FPIMG = _umFp;
  var grid = document.getElementById('floorplansGrid');
  if(grid){
    grid.innerHTML = fps.map(function(f, i){
      return '<figure class="fplan"><img src="' + String(f.url).replace(/"/g, '%22') +
             '" loading="lazy" alt="' + String(f.caption||'Plattegrond').replace(/"/g,'%22') +
             '" onclick="utamaOpenLb(\'fp\',' + i + ')">' +
             (f.caption ? '<figcaption>' + f.caption + '</figcaption>' : '') + '</figure>';
    }).join('');
  }
  var tab = document.querySelector('#tabsNav button[data-tab="plattegronden"]');
  if(tab){
    var heeftPdf = (typeof FLOORPLAN_PDF_URL !== 'undefined' && FLOORPLAN_PDF_URL);
    tab.style.display = (fps.length || heeftPdf) ? '' : 'none';
    if(typeof renumberChapters === 'function') renumberChapters();
  }
  return m;
}
if(typeof window !== 'undefined') window.utamaBrochureMedia = utamaBrochureMedia;
