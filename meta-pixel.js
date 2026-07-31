/* Meta (Facebook/Instagram) Pixel - gedeeld over het hele platform.
   Ingeladen op elke publieke pagina via <script src="/meta-pixel.js"></script> in de <head>.

   Pixel ID 419037194248722, aangeleverd door Steven (Events Manager -> Data Sources
   -> Pixel). Als dit veld ooit weer op "REPLACE_WITH_PIXEL_ID" gezet wordt (bijv. voor
   een test-omgeving), laadt dit bestand fbq() nog steeds in maar vuurt er bewust niets:
   zo breekt er niets op de live site, maar wordt er ook geen data naar een verkeerd/leeg
   pixel-ID gestuurd. */
var PIXEL_ID = "419037194248722";

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
   unlockt (de belangrijkste conversie van de campagne). project = projectnaam string.
   eventId = optioneel, meestal het eventId dat submitLead() teruggeeft: als je die
   meegeeft, dedupt Meta dit browser-event automatisch tegen het server-side
   Conversions API-event dat submitLead() ernaast al verstuurt (zie meta-capi
   edge function + supabase-client.js). Zonder eventId werkt dit nog steeds prima,
   je verliest dan alleen die dedup-koppeling. */
function fbTrackLead(project, eventId) {
  try {
    if (typeof fbq === "function") {
      var params = project ? { content_name: project } : {};
      if (eventId) fbq("track", "Lead", params, { eventID: eventId });
      else fbq("track", "Lead", params);
    }
  } catch (e) {}
}

/* Helper: roep dit aan bij een klik op een WhatsApp-contactknop (Ashley/Steven). */
function fbTrackContact(project) {
  try {
    if (typeof fbq === "function") fbq("track", "Contact", project ? { content_name: project } : {});
  } catch (e) {}
}
