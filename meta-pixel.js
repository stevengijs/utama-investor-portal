/* Meta (Facebook/Instagram) Pixel - gedeeld over het hele platform.
   Ingeladen op elke publieke pagina via <script src="/meta-pixel.js"></script> in de <head>.

   PIXEL_ID moet nog worden ingevuld door Steven (Events Manager -> Data Sources -> Pixel).
   Zolang dit "REPLACE_WITH_PIXEL_ID" is, laadt dit bestand fbq() wel in maar vuurt er
   bewust niets: zo breekt er niets op de live site, maar wordt er ook geen data naar
   een verkeerd/leeg pixel-ID gestuurd. Vervang de waarde hieronder en alles hierboven
   (PageView, Lead, Contact) begint direct te vuren, zonder dat er iets anders hoeft te
   veranderen op de losse pagina's. */
var PIXEL_ID = "REPLACE_WITH_PIXEL_ID";

(function () {
  if (!PIXEL_ID || PIXEL_ID.indexOf("REPLACE_WITH") === 0) {
    // Nog geen echt Pixel ID: fbq() bestaat als no-op zodat de rest van de site
    // (die fbq(...) aanroept voor Lead/Contact events) niet crasht op een
    // ontbrekende functie, maar er wordt niets verstuurd of geladen.
    window.fbq = function () {};
    return;
  }
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", PIXEL_ID);
  fbq("track", "PageView");
})();

/* Helper: roep dit aan zodra een bezoeker een leadformulier invult en de brochure
   unlockt (de belangrijkste conversie van de campagne). project = projectnaam string. */
function fbTrackLead(project) {
  try {
    if (typeof fbq === "function") fbq("track", "Lead", project ? { content_name: project } : {});
  } catch (e) {}
}

/* Helper: roep dit aan bij een klik op een WhatsApp-contactknop (Ashley/Steven). */
function fbTrackContact(project) {
  try {
    if (typeof fbq === "function") fbq("track", "Contact", project ? { content_name: project } : {});
  } catch (e) {}
}
