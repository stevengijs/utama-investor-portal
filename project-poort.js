/* Projectpoort (Steven, 11 oktober 2026): wie nog geen gegevens achterliet, ziet op een
 * projectpagina alleen het brochureformulier, als gewone pagina en zonder sluitknop.
 *
 * Waarom: als zwevende laag scrolde het formulier op mobiel binnen een pagina die zelf
 * ook scrolde, en na het kruisje lag de hele pagina met prijzen en cijfers open. Dat
 * converteerde slecht.
 *
 * Gebruik, synchroon in de <head> van elke projectpagina (dan is er geen flits van de
 * pagina): <script src="/project-poort.js" data-lead-key="maison_brochure_lead"></script>
 * De pagina zelf houdt haar formulier #broModal; dit bestand maakt er een pagina van
 * zolang window.utamaPoortDicht waar is. Wie al gegevens heeft (localStorage of
 * sessionStorage onder data-lead-key) of met een persoonlijke link komt
 * (brochure-poort.js, ?key=), ziet de pagina zoals altijd.
 */
(function(){
  var s = document.currentScript;
  var key = s && s.getAttribute('data-lead-key');
  if (!key) return;
  var heeft = false;
  try { heeft = !!(localStorage.getItem(key) || sessionStorage.getItem(key)); } catch (e) {}
  var persoonlijk = !!window.__utamaPoortBezig || /[?&]key=/.test(location.search);
  if (heeft || persoonlijk) { window.utamaPoortDicht = false; return; }

  window.utamaPoortDicht = true;
  var html = document.documentElement;
  html.classList.add('poort');
  var css = [
    /* alleen de navigatie en het formulier, de rest van de pagina blijft dicht */
    'html.poort body>*:not(nav):not(#broModal):not(script):not(noscript){display:none!important}',
    'html.poort nav .links{display:none!important}',
    /* het formulier als gewone pagina: in de documentstroom, dus één scrollbalk */
    'html.poort #broModal{position:static!important;inset:auto!important;display:block!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:18px 16px 44px!important;min-height:calc(100vh - 61px)}',
    'html.poort #broModal .modal{max-width:520px;margin:6px auto 0;max-height:none!important;overflow:visible!important}',
    'html.poort #broModal .x{display:none!important}',
    'html.poort body{overflow:auto!important}',
    /* een beeld van het project boven het formulier */
    '.poort-beeld{display:none}',
    'html.poort .poort-beeld{display:block;position:relative;height:190px;margin:-12px -12px 18px;border-radius:14px;background-size:cover;background-position:center;overflow:hidden}',
    'html.poort .poort-beeld::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,20,15,0) 45%,rgba(23,20,15,.6))}',
    'html.poort .poort-beeld span{position:absolute;left:14px;bottom:12px;z-index:1;color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}',
    /* iOS zoomt in op velden met tekst kleiner dan 16 px */
    '@media(max-width:760px){html.poort #broModal input,html.poort #broModal select{font-size:16px!important}html.poort #broModal{padding:12px 12px 36px!important}html.poort .poort-beeld{height:150px}}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'project-poort-css';
  st.textContent = css;
  (document.head || html).appendChild(st);
})();
