/*
 * UTAMA - Project Updates op een projectpagina en in de brochure (Steven, 11 november 2026: "Zorg dat de bouw
 * updates van The Maison zelf met de drone foto's wel echt binnen het project The Maison worden geplaatst",
 * "Maak maar een aparte tab met Project Updates en voeg de live camera en project updates daar aan toe" en
 * "Voeg ook met enkele zinnen een persoonlijke tone of voice geschreven wat er op de bouw gebeurd aan de hand
 * van de foto's, zo heeft de lead een idee").
 *
 * De gegevens komen uit /maison-updates.js (window.UTAMA_UPDATES, per project, bron in packages/web-shared/):
 * per update de datum, een korte tekst (NL en EN) en de foto's. Geen update voor dit project, dan blijft het
 * blok verborgen. Zo werkt het voor elk project hetzelfde; een project heeft <div id="bouwUpd" hidden> en laadt
 * eerst /maison-updates.js en dan dit bestand (npm run check:projects bewaakt dat).
 *
 * Instellingen op het blok:
 *   data-alle="/the-maison/camera/#updates"   link "Alle updates en de live camera" (zonder dit attribuut geen link)
 *   data-fotos="alle"                          alle foto's van een update tonen (standaard de eerste drie)
 *   data-lightbox                              een foto opent groot in een venster (standaard: link naar data-alle)
 *   data-updates="alle"                        alle updates onder elkaar, nieuwste eerst (standaard alleen de nieuwste)
 * De projectpagina gebruikt de standaard (nieuwste update, drie foto's met een link). De brochure heeft een eigen
 * tabblad: <button data-tab="updates"> en <div id="pane-updates"> met daarin #bouwUpd (alle updates, alle foto's,
 * groot venster) en, bij The Maison, de live camera (#bouwcamera). Dit script toont het tabblad alleen als het
 * project updates of een camera heeft, vult de kop en de inleiding in de taal van de pagina en nummert de
 * hoofdstukken opnieuw (renumberChapters van de brochure). Heeft het tabblad een live camera, dan knippert er een groen
 * rondje achter de naam van de tabknop (Steven, 11 november 2026: "dat hier iets live te zien is").
 */
(function () {
  'use strict';
  var cont = document.getElementById('bouwUpd');
  if (!cont) return;

  var KEY = { 'the-maison': 'maison', 'moka': 'moka', 'the-reload': 'reload' };
  var slug = (location.pathname.match(/\/(the-maison|moka|the-reload)(\/|$)/) || [])[1] || '';
  var TXT = {
    nl: { kop: 'Project Updates', van: 'Update van {datum}', alle: 'Alle updates en de live camera →', foto: 'Foto {n} van {m}', sluit: 'Sluiten', vorige: 'Vorige foto', volgende: 'Volgende foto',
          tabKop: 'Kijk mee op de bouwplaats',
          tabLeadCam: "Kijk live mee via de camera's op de bouwplaats en bekijk de nieuwste foto's van de bouw, met een korte uitleg bij elke update.",
          tabLead: "De nieuwste foto's van de bouw, met een korte uitleg bij elke update." },
    en: { kop: 'Project Updates', van: 'Update of {datum}', alle: 'All updates and the live camera →', foto: 'Photo {n} of {m}', sluit: 'Close', vorige: 'Previous photo', volgende: 'Next photo',
          tabKop: 'Look in on the building site',
          tabLeadCam: 'Watch live through the cameras on the building site and see the latest photos of the build, with a short explanation for each update.',
          tabLead: 'The latest photos of the build, with a short explanation for each update.' }
  };
  var PAD = '/updates/' + (KEY[slug] || '') + '/';
  var ALLE_FOTOS = cont.getAttribute('data-fotos') === 'alle';
  var ALLE_UPDATES = cont.getAttribute('data-updates') === 'alle';
  var GROOT = cont.hasAttribute('data-lightbox');
  if (ALLE_UPDATES) cont.classList.add('bu-tab');

  var pane = document.getElementById('pane-updates');
  var knop = document.querySelector('#tabsNav button[data-tab="updates"]');
  var heeftCam = !!(pane && pane.querySelector('#bouwcamera'));

  var stijl = document.createElement('style');
  stijl.textContent =
    '.build-updates{margin-top:12px;background:#fff;border:1px solid var(--line,#E7DECD);border-radius:var(--radius,14px);padding:14px 16px}' +
    '.build-updates[hidden]{display:none}' +
    '.build-updates.bu-tab{margin-top:22px;background:var(--paper,#fff);padding:22px 24px 24px}' +
    '.bu-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}' +
    '.bu-eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--opt-deep,var(--gold,#8B5A3C))}' +
    '.bu-datum{font-size:14.5px;font-weight:700;color:var(--ink,#17140F)}' +
    '.bu-tab .bu-datum{font-size:17px;font-family:var(--display,inherit);letter-spacing:-.02em}' +
    '.bu-tab .bu-head{margin-bottom:6px}' +
    '.bu-tekst{margin:0 0 12px;padding:12px 14px;border-radius:10px;background:rgba(139,90,60,.14);box-shadow:inset 3px 0 0 var(--terra,#8B5A3C);font-size:14.5px;line-height:1.55}' +
    '.build-updates .bu-tekst{color:var(--ink,#17140F)}' +
    '.bu-groep+.bu-groep{margin-top:22px;padding-top:18px;border-top:1px solid var(--line,#E7DECD)}' +
    '.bu-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
    '.bu-strip.bu-alle-fotos{grid-template-columns:repeat(4,minmax(0,1fr))}' +
    '.bu-strip a,.bu-foto{display:block;border-radius:10px;overflow:hidden;background:#17140F;padding:0;border:0;cursor:pointer;font:inherit}' +
    '.bu-strip img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;transition:transform .4s ease}' +
    '.bu-strip a:hover img,.bu-foto:hover img{transform:scale(1.03)}' +
    '.bu-foto:focus-visible,.bu-strip a:focus-visible{outline:2px solid var(--ink,#17140F);outline-offset:2px}' +
    '.bu-alle{display:inline-block;margin-top:10px;font-size:13.5px;font-weight:600;color:var(--green,#2E7D5B);text-decoration:none}' +
    '.bu-alle:hover{text-decoration:underline}' +
    '@media(max-width:560px){.build-updates.bu-tab{padding:18px 18px 20px}' +
    '.bu-strip.bu-alle-fotos{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;gap:8px;padding-bottom:6px;scrollbar-width:thin}' +
    '.bu-strip.bu-alle-fotos>*{flex:0 0 74%;scroll-snap-align:start}}' +
    '.bu-dlg{border:0;padding:0;background:transparent;width:min(96vw,1200px);max-width:none;max-height:none;overflow:visible;color:#fff}' +
    '.bu-dlg::backdrop{background:rgba(23,20,15,.9)}' +
    '.bu-dlg img{display:block;width:100%;height:auto;max-height:78vh;object-fit:contain;border-radius:12px;background:#17140F}' +
    '.bu-bar{display:flex;align-items:center;justify-content:center;gap:12px;margin-top:12px}' +
    '.bu-cap{flex:1;text-align:center;font:600 14px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;color:#fff}' +
    '.bu-nav{flex:none;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font:600 22px/1 system-ui,sans-serif;cursor:pointer}' +
    '.bu-nav:hover{background:rgba(255,255,255,.28)}' +
    '.bu-nav:focus-visible{outline:2px solid #fff;outline-offset:2px}' +
    '.tab-live{--lv:46,125,91;flex:none;width:8px;height:8px;border-radius:50%;background:rgb(var(--lv));box-shadow:0 0 0 0 rgba(var(--lv),.55);animation:tabLive 1.6s ease-in-out infinite}' +
    '#tabsNav button.active .tab-live{--lv:92,214,150}' +
    '@keyframes tabLive{0%{box-shadow:0 0 0 0 rgba(var(--lv),.55)}70%{box-shadow:0 0 0 7px rgba(var(--lv),0)}100%{box-shadow:0 0 0 0 rgba(var(--lv),0)}}' +
    '@media(prefers-reduced-motion:reduce){.tab-live{animation:none}}';
  (document.head || document.documentElement).appendChild(stijl);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function taal() { return /^en/i.test(document.documentElement.lang || '') ? 'en' : 'nl'; }
  function datum(d, l) {
    var x = new Date(d + 'T12:00:00');
    return isNaN(x) ? d : x.toLocaleDateString(l === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  function tekstVan(u, l) { return typeof u.tekst === 'string' ? u.tekst : ((u.tekst && (u.tekst[l] || u.tekst.nl)) || ''); }

  var groepen = [];  // per getoonde update: { titel, tekst, items:[{klein, groot, cap}] }, voor het grote venster
  var dlg = null, curG = 0, cur = 0;

  // Het tabblad in de brochure: alleen zichtbaar als het project updates of een camera heeft.
  function tabBeheer(heeftUpdates, t) {
    if (!pane && !knop) return;
    var toon = heeftUpdates || heeftCam;
    if (pane) pane.hidden = !toon;
    if (knop) {
      knop.style.display = toon ? '' : 'none';
      // Heeft het tabblad een live camera, dan knippert er een groen rondje achter de naam: hier is iets live te zien.
      var stip = knop.querySelector('.tab-live');
      if (heeftCam && !stip) {
        stip = document.createElement('span'); stip.className = 'tab-live'; stip.setAttribute('role', 'img'); stip.setAttribute('aria-label', 'live'); stip.title = 'live';
        knop.appendChild(stip);
      } else if (!heeftCam && stip) { stip.parentNode.removeChild(stip); }
    }
    var kop = document.getElementById('bouwUpdKop'), lead = document.getElementById('bouwUpdLead');
    if (kop) kop.textContent = t.tabKop;
    if (lead) lead.textContent = heeftCam ? t.tabLeadCam : t.tabLead;
    try { if (typeof renumberChapters === 'function') renumberChapters(); } catch (e) { /* de nummering volgt bij de volgende taalwissel */ }
  }

  function render() {
    var l = taal(), t = TXT[l];
    var lijst = ((window.UTAMA_UPDATES && window.UTAMA_UPDATES[KEY[slug]]) || []).slice().sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
    tabBeheer(lijst.length > 0, t);
    if (!lijst.length) { cont.hidden = true; groepen = []; return; }
    var alle = cont.getAttribute('data-alle') || '';
    groepen = (ALLE_UPDATES ? lijst : lijst.slice(0, 1)).map(function (u) {
      var titel = t.van.replace('{datum}', datum(u.datum, l));
      return {
        titel: titel,
        tekst: tekstVan(u, l),
        items: u.fotos.map(function (id, i) {
          return { klein: PAD + id + '-s.webp', groot: PAD + id + '.webp', cap: titel + ' · ' + t.foto.replace('{n}', i + 1).replace('{m}', u.fotos.length) };
        })
      };
    });
    cont.innerHTML = groepen.map(function (g, gi) {
      var fotos = (ALLE_FOTOS ? g.items : g.items.slice(0, 3)).map(function (it, i) {
        var img = '<img src="' + esc(it.klein) + '" width="640" height="360" alt="' + esc(it.cap) + '" loading="lazy" decoding="async">';
        if (GROOT) return '<button type="button" class="bu-foto" data-g="' + gi + '" data-i="' + i + '" aria-label="' + esc(it.cap) + '">' + img + '</button>';
        return alle ? '<a href="' + esc(alle) + '">' + img + '</a>' : '<span>' + img + '</span>';
      }).join('');
      return '<div class="bu-groep"><div class="bu-head">' +
        (gi === 0 && !ALLE_UPDATES ? '<span class="bu-eyebrow">' + esc(t.kop) + '</span>' : '') +
        '<span class="bu-datum">' + esc(g.titel) + '</span></div>' +
        (g.tekst ? '<p class="bu-tekst">' + esc(g.tekst) + '</p>' : '') +
        '<div class="bu-strip' + (ALLE_FOTOS ? ' bu-alle-fotos' : '') + '">' + fotos + '</div></div>';
    }).join('') + (alle ? '<a class="bu-alle" href="' + esc(alle) + '">' + esc(t.alle) + '</a>' : '');
    cont.hidden = false;
  }

  function dialoog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'bu-dlg';
    dlg.innerHTML = '<img alt=""><div class="bu-bar"><button type="button" class="bu-nav" data-a="vorige">‹</button><span class="bu-cap"></span>' +
      '<button type="button" class="bu-nav" data-a="volgende">›</button><button type="button" class="bu-nav" data-a="sluit">×</button></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', function (e) {
      if (e.target === dlg) { dlg.close(); return; }
      var b = e.target.closest ? e.target.closest('[data-a]') : null;
      if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'sluit') dlg.close(); else if (a === 'vorige') groot(curG, cur - 1); else groot(curG, cur + 1);
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); groot(curG, cur - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); groot(curG, cur + 1); }
    });
    return dlg;
  }

  function groot(g, i) {
    var items = (groepen[g] || {}).items || [];
    if (!items.length) return;
    curG = g; cur = (i + items.length) % items.length;
    var it = items[cur];
    // Een browser zonder <dialog> opent de foto gewoon in een nieuw tabblad.
    if (typeof HTMLDialogElement !== 'function') { window.open(it.groot, '_blank'); return; }
    var d = dialoog(), t = TXT[taal()], im = d.querySelector('img');
    im.src = it.groot; im.alt = it.cap;
    d.querySelector('.bu-cap').textContent = it.cap;
    d.querySelector('[data-a="vorige"]').setAttribute('aria-label', t.vorige);
    d.querySelector('[data-a="volgende"]').setAttribute('aria-label', t.volgende);
    d.querySelector('[data-a="sluit"]').setAttribute('aria-label', t.sluit);
    if (!d.open) d.showModal();
  }

  cont.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.bu-foto') : null;
    if (!b) return;
    e.preventDefault();
    groot(parseInt(b.getAttribute('data-g'), 10) || 0, parseInt(b.getAttribute('data-i'), 10) || 0);
  });

  render();
  // De pagina wisselt van taal door <html lang> te zetten: dan tekenen we opnieuw.
  try { new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { /* oude browser: de taal blijft zoals bij het laden */ }
})();
