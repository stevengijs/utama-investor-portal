/* Projectpoort (Steven, 11 oktober 2026): wie nog geen gegevens achterliet, krijgt op een
 * projectpagina meteen het brochureformulier, en kan dat niet wegklikken.
 *
 * De pagina blijft wazig zichtbaar achter het formulier: die blik op wat je krijgt
 * converteerde goed en blijft zoals hij was (Steven: "just improve the form only").
 * Wat dit bestand verbetert:
 *  - geen sluitknop; Escape en een tik naast het formulier doen niets;
 *  - op mobiel geen scroll-in-scroll meer: de pagina erachter staat stil en de laag zelf
 *    is de enige scrollbalk, het formulier heeft geen eigen scrollbalk meer;
 *  - velden van 16 px, zodat iOS niet inzoomt bij het tikken.
 *
 * Gebruik, synchroon in de <head> van elke projectpagina (dan staat de laag er vanaf
 * de eerste weergave): <script src="/project-poort.js" data-lead-key="maison_brochure_lead"></script>
 * Wie al gegevens heeft (localStorage of sessionStorage onder data-lead-key) of met een
 * persoonlijke link komt (brochure-poort.js, ?key=), ziet de pagina zoals altijd.
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
    /* de pagina erachter staat stil; alleen de laag scrolt */
    'html.poort,html.poort body{overflow:hidden!important;overscroll-behavior:none}',
    /* de laag staat er meteen, met dezelfde wazige achtergrond als de pop-up */
    'html.poort #broModal{display:flex!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}',
    /* het formulier zelf zonder eigen scrollbalk; margin:auto centreert en schuift mee als het hoger is dan het scherm */
    'html.poort #broModal .modal{margin:auto;max-height:none!important;overflow:visible!important}',
    'html.poort #broModal .x{display:none!important}',
    /* iOS zoomt in op velden met tekst kleiner dan 16 px */
    '@media(max-width:760px){html.poort #broModal input,html.poort #broModal select{font-size:16px!important}html.poort #broModal{padding:14px 12px 28px!important}}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'project-poort-css';
  st.textContent = css;
  (document.head || html).appendChild(st);
})();
