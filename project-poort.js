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
// Projectfoto bovenaan het brochureformulier (Steven, 11 oktober 2026), voor iedereen die het
// formulier ziet. De pagina zet <div class="form-beeld" style="background-image:..."> direct in .modal.
(function(){
  var css = [
    '#broModal .form-beeld{position:relative;display:block;height:190px;margin:-30px -30px 20px;border-radius:20px 20px 0 0;background-size:cover;background-position:center;overflow:hidden}',
    '#broModal .form-beeld::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,20,15,0) 45%,rgba(23,20,15,.6))}',
    '#broModal .form-beeld span{position:absolute;left:18px;bottom:14px;z-index:1;color:#fff;font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}',
    '#broModal .x{z-index:2;color:#fff;text-shadow:0 1px 6px rgba(0,0,0,.4)}',
    '@media(max-width:760px){#broModal .form-beeld{height:150px}}'
  ].join('\n');
  var st = document.createElement('style');
  st.id = 'form-beeld-css';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
})();

// De poort zelf staat sinds 14 oktober 2026 uit (Steven): "Wat stopte is niet de ad
// maar de pagina. Vanaf 11 oktober 14:11 staat er een poort voor /the-maison en /moka
// die het formulier over de pagina legt zonder sluitknop. Conversie van 3,97% naar
// 0,85%, en bij bezoekers zonder advertentieklik van 9,3% naar nul. Zet dit terug."
// Het formulier gaat weer open zoals van 8 tot 11 oktober ("Formulier eerst"): vanzelf,
// maar met sluitknop, en wegklikken kan. window.utamaPoortDicht blijft false, zodat
// openBrochure en closeBrochure in de pagina's weer gewoon werken.
window.utamaPoortDicht = false;
