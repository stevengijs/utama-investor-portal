/*
 * UTAMA - de persoonlijke brochurelink (gedeeld door alle brochures).
 *
 * Waarom dit bestaat. De poort van een brochure onthoudt een bezoeker alleen in
 * de opslag van die ene browser. Het meeste verkeer komt uit advertenties en
 * opent in de browser van Instagram of Facebook. Twee minuten na het invullen
 * sturen wij via WhatsApp een link naar dezelfde brochure, zes minuten erna per
 * mail. Die link opent in een andere browser, en daar stond weer "Eén laatste
 * stap, laat je gegevens achter". Leads vonden dat terecht vervelend: van de 89
 * aanvragers vulden er 7 het formulier opnieuw in en haakten er zeker 9 af.
 *
 * outreach-send zet daarom een sleutel achter de link (?key=...), een per
 * contact, niet te raden, zonder iets persoonlijks erin. Dit bestand haalt die
 * sleutel uit de adresbalk, laat de database zeggen of hij klopt (alleen ja of
 * nee), en doet de poort open zonder formulier.
 *
 * Agents (Steven, 11 november 2026): het agentenportaal vraagt na het inloggen een sleutel op
 * (rpc agent_brochure_sleutel, alleen voor een ingelogde, actieve agent) en zet hem als ?key=...
 * achter zijn links naar invest. brochure_open() kent die sleutel en antwoordt met agent: true. Dan
 * gaat de poort open zonder formulier en zonder dat er een lead of contact ontstaat, en slaan we
 * via: 'agent' op. Wie zonder het portaal komt, ziet gewoon de poort.
 *
 * MOET als eerste script in de <head> staan, voor meta-pixel.js en t.js: de
 * sleutel gaat uit de adresbalk voordat een tracker de URL kan lezen.
 * `npm run check:projects` bewaakt dat.
 */
(function () {
  'use strict';

  // De opslagsleutel per project. De brochures en projectpagina's lezen deze
  // zelf bij het laden; The Reload heet hier nog naar zijn oude naam.
  var SLEUTELS = { 'the-maison': 'maison_brochure_lead', 'moka': 'moka_brochure_lead', 'the-reload': 'dune_brochure_lead' };
  var NAMEN = { 'the-maison': 'The Maison', 'moka': 'MOKA', 'the-reload': 'The Reload' };

  var q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  var key = q.get('key');
  if (!key) return;

  // 1. Meteen uit de adresbalk. Zo komt de sleutel niet in analytics, niet bij
  //    Meta, niet in een referrer en niet in een doorgestuurde schermafdruk.
  q.delete('key');
  try {
    var rest = q.toString();
    history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
  } catch (e) { /* oude browser: dan blijft hij staan, de rest werkt wel */ }

  if (!/^[A-Za-z0-9_-]{20,64}$/.test(key)) return;

  // Op welk project staan we? Op de homepage of een andere pagina is er geen;
  // de sleutel werkt daar ook (Instagram-leads krijgen de link naar de homepage).
  var slug = (location.pathname.match(/\/(the-maison|moka|the-reload)(\/|$)/) || [])[1] || '';
  var opBrochure = !!slug && /\/brochure(\/|$)/.test(location.pathname);

  // Al binnen op dit toestel? Dan is er niets te doen.
  try {
    var alBinnen = slug
      ? (localStorage.getItem(SLEUTELS[slug]) || sessionStorage.getItem(SLEUTELS[slug]))
      : (localStorage.getItem(SLEUTELS['the-maison']) && localStorage.getItem(SLEUTELS['moka']) && localStorage.getItem(SLEUTELS['the-reload']));
    if (alBinnen) return;
  } catch (e) {}

  // 2. Terwijl we controleren geen formulier laten zien: wie op onze link tikt
  //    en toch even "laat je gegevens achter" ziet flitsen, schrikt alsnog.
  var html = document.documentElement;
  var nl = /^nl/i.test(navigator.language || '') || /(?:^|; )utama_geo=NL(?:;|$)/.test(document.cookie);
  var stijl = document.createElement('style');
  stijl.textContent =
    '.poort-bezig #gate .gcard>*{display:none!important}' +
    '.poort-bezig #gate .gcard::before{content:"' + (nl ? 'Je brochure wordt geopend…' : 'Opening your brochure…') +
    '";display:block;padding:40px 8px;text-align:center;font-weight:700;opacity:.75}';
  (document.head || html).appendChild(stijl);
  html.classList.add('poort-bezig');
  var klaar = false;
  function poortTerug() { if (klaar) return; klaar = true; html.classList.remove('poort-bezig'); }
  // Duurt het te lang of gaat het mis, dan gewoon de poort zoals altijd.
  var wekker = setTimeout(poortTerug, 5000);

  function open(agent) {
    var via = agent ? 'agent' : 'link';
    // De sleutel zegt wie dit is, niet welk project hij bekijkt. Wie wij kennen
    // hoeft bij geen enkel project nog een formulier in te vullen, dus alle drie
    // de poorten gaan open. (Wie zonder sleutel een formulier invult, ontgrendelt
    // nog steeds alleen dat ene project; dat is bewust zo gelaten.)
    Object.keys(SLEUTELS).forEach(function (s) {
      var json = JSON.stringify({ project: NAMEN[s], name: '', phone: '', email: '', budget: '', when: '', returning: true, via: via });
      try { if (!localStorage.getItem(SLEUTELS[s])) localStorage.setItem(SLEUTELS[s], json); } catch (e) {}
      try { if (!sessionStorage.getItem(SLEUTELS[s])) sessionStorage.setItem(SLEUTELS[s], json); } catch (e) {}
    });
    clearTimeout(wekker);
    klaar = true;
    // Op de brochure zelf doet reveal() van de pagina de poort open. Op de
    // homepage of een projectpagina is er geen poort; daar slaat openBrochure()
    // het formulier voortaan over omdat de opslag gevuld is.
    try {
      if (opBrochure && typeof window.reveal === 'function' && document.getElementById('gate')) {
        window.reveal({ project: NAMEN[slug], name: '', phone: '', email: '', budget: '', when: '', returning: true, via: via });
      }
    } catch (e) {}
    html.classList.remove('poort-bezig');
  }

  function controleer() {
    // De constanten komen uit supabase-client.js, dat verderop in de pagina
    // laadt; daarom wachten we tot het document er is.
    var url = (typeof SUPABASE_URL !== 'undefined') ? SUPABASE_URL : '';
    var anon = (typeof SUPABASE_ANON_KEY !== 'undefined') ? SUPABASE_ANON_KEY : '';
    if (!url || !anon || !window.fetch) { poortTerug(); return; }
    fetch(url + '/rest/v1/rpc/brochure_open', {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: anon, authorization: 'Bearer ' + anon },
      body: JSON.stringify({ p_token: key })
    }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok === true && !klaar) open(d.agent === true); else poortTerug(); })
      .catch(poortTerug);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', controleer);
  else controleer();
})();
