/*
 * UTAMA - Project Updates op een projectpagina (Steven, 11 november 2026: "Zorg dat de bouw updates van The
 * Maison zelf met de drone foto's wel echt binnen het project The Maison worden geplaatst").
 *
 * Toont onder het bouwstatus-blok de nieuwste update van DIT project: de datum en drie foto's, met een link naar
 * alle updates. De gegevens komen uit /maison-updates.js (window.UTAMA_UPDATES, per project, bron in
 * packages/web-shared/): geen update voor dit project, dan blijft het blok verborgen. Zo werkt het voor elk
 * project hetzelfde; een project met een bouwstatus-blok heeft <div id="bouwUpd" hidden data-alle="..."> en
 * laadt eerst /maison-updates.js en dan dit bestand (npm run check:projects bewaakt dat).
 */
(function () {
  'use strict';
  var cont = document.getElementById('bouwUpd');
  if (!cont) return;

  var KEY = { 'the-maison': 'maison', 'moka': 'moka', 'the-reload': 'reload' };
  var slug = (location.pathname.match(/\/(the-maison|moka|the-reload)(\/|$)/) || [])[1] || '';
  var TXT = {
    nl: { kop: 'Project Updates', van: 'Update van {datum}', alle: 'Alle updates en de live camera →', foto: 'Foto {n} van {m}' },
    en: { kop: 'Project Updates', van: 'Update of {datum}', alle: 'All updates and the live camera →', foto: 'Photo {n} of {m}' }
  };
  var PAD = '/updates/' + (KEY[slug] || '') + '/';

  var stijl = document.createElement('style');
  stijl.textContent =
    '.build-updates{margin-top:12px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px}' +
    '.build-updates[hidden]{display:none}' +
    '.bu-head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:10px}' +
    '.bu-eyebrow{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--opt-deep)}' +
    '.bu-datum{font-size:14.5px;font-weight:700;color:var(--ink)}' +
    '.bu-strip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}' +
    '.bu-strip a{display:block;border-radius:10px;overflow:hidden;background:#17140F}' +
    '.bu-strip img{display:block;width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;transition:transform .4s ease}' +
    '.bu-strip a:hover img{transform:scale(1.03)}' +
    '.bu-alle{display:inline-block;margin-top:10px;font-size:13.5px;font-weight:600;color:var(--green);text-decoration:none}' +
    '.bu-alle:hover{text-decoration:underline}';
  (document.head || document.documentElement).appendChild(stijl);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function taal() { return /^en/i.test(document.documentElement.lang || '') ? 'en' : 'nl'; }
  function datum(d, l) {
    var x = new Date(d + 'T12:00:00');
    return isNaN(x) ? d : x.toLocaleDateString(l === 'nl' ? 'nl-NL' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function render() {
    var l = taal(), t = TXT[l];
    var lijst = ((window.UTAMA_UPDATES && window.UTAMA_UPDATES[KEY[slug]]) || []).slice().sort(function (a, b) { return a.datum < b.datum ? 1 : -1; });
    if (!lijst.length) { cont.hidden = true; return; }
    var u = lijst[0], titel = t.van.replace('{datum}', datum(u.datum, l)), alle = cont.getAttribute('data-alle') || '';
    var fotos = u.fotos.slice(0, 3).map(function (id, i) {
      var cap = titel + ' · ' + t.foto.replace('{n}', i + 1).replace('{m}', u.fotos.length);
      var img = '<img src="' + PAD + esc(id) + '-s.webp" width="640" height="360" alt="' + esc(cap) + '" loading="lazy" decoding="async">';
      return alle ? '<a href="' + esc(alle) + '">' + img + '</a>' : '<span>' + img + '</span>';
    }).join('');
    cont.innerHTML =
      '<div class="bu-head"><span class="bu-eyebrow">' + esc(t.kop) + '</span><span class="bu-datum">' + esc(titel) + '</span></div>' +
      '<div class="bu-strip">' + fotos + '</div>' +
      (alle ? '<a class="bu-alle" href="' + esc(alle) + '">' + esc(t.alle) + '</a>' : '');
    cont.hidden = false;
  }

  render();
  // De pagina wisselt van taal door <html lang> te zetten: dan tekenen we opnieuw.
  try { new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { /* oude browser: de taal blijft zoals bij het laden */ }
})();
