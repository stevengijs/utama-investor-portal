/* UTAMA early access: de aanmeldlaag voor het volgende project.
 *
 * Eén bron voor invest.utamabali.com en utamabali.com (Steven, 9 oktober 2026:
 * "exact dezelfde pop-up, zelfde database"). Invest laadt dit bestand zelf, de
 * homepage laadt het van https://invest.utamabali.com/early-access.js. Wijzig de
 * laag dus alleen hier.
 *
 * Gebruik:  window.utamaEarlyAccess.open('nl' | 'en')   en   .close()
 *
 * Opslag: submitLead() uit supabase-client.js (RPC submit_lead in portal-db), met
 * project "The Reload" en unit "Early access", zodat de lead in /admin onder The
 * Reload landt. Op een pagina zonder supabase-client.js (de homepage) laadt dit
 * bestand supabase-js en https://invest.utamabali.com/supabase-client.js zelf, dus
 * dezelfde functie, dezelfde database en dezelfde Meta-conversie (meta-capi).
 * fbTrackLead() (meta-pixel.js) wordt alleen aangeroepen als de pagina hem heeft.
 *
 * De opmaak is gescoped (uea-) en draagt de waarden van invest zelf, zodat de laag
 * er op beide sites hetzelfde uitziet, los van de stylesheet van de pagina.
 */
(function(){
  'use strict';
  if (window.utamaEarlyAccess) return;

  var INVEST = 'https://invest.utamabali.com';
  var SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';

  // Waarden blijven Nederlands (die komen zo in de CRM terecht, ook de budgetbanden);
  // alleen het label volgt de taal.
  var BUDGET = [
    ['Tot €200.000', 'Up to €200,000'],
    ['€200.000 - €250.000', '€200,000 - €250,000'],
    ['€250.000 - €350.000', '€250,000 - €350,000'],
    ['€350.000 of meer', '€350,000 or more'],
    ['Nog niet zeker', 'Not sure yet']
  ];
  var WHEN = [
    ['Zo snel mogelijk', 'As soon as possible'],
    ['Binnen 3 maanden', 'Within 3 months'],
    ['3 tot 6 maanden', '3 to 6 months'],
    ['6 tot 12 maanden', '6 to 12 months'],
    ['Ik oriënteer me nog', 'Still exploring']
  ];
  var T = {
    nl: {
      close: 'Sluiten', eb: 'Vroegtijdige toegang', title: 'Meld je alvast aan voor het volgende project',
      sub: 'Laat je gegevens achter, dan ben je een van de eersten die de details en pre-sale prijzen ontvangt zodra het project onthuld wordt.',
      name: 'Je naam', namePh: 'Je volledige naam', phone: 'Je WhatsApp-nummer', email: 'Je e-mailadres',
      budget: 'Budget', when: 'Wanneer wil je kopen?', whenPh: 'Kies je horizon',
      err: 'Vul je naam, WhatsApp-nummer en e-mailadres in.', btn: 'Meld je aan',
      trust: 'Geen spam. We gebruiken je gegevens alleen om je op de hoogte te houden van dit project.',
      okTitle: 'Aangemeld!', okP: 'We houden je op de hoogte zodra dit project onthuld wordt. Je hoort als eerste van ons.'
    },
    en: {
      close: 'Close', eb: 'Early access', title: 'Register your interest for the next project',
      sub: "Leave your details and you'll be one of the first to receive the details and pre-sale prices once the project is revealed.",
      name: 'Your name', namePh: 'Your full name', phone: 'Your WhatsApp number', email: 'Your email',
      budget: 'Budget', when: 'When do you want to buy?', whenPh: 'Choose your horizon',
      err: 'Please enter your name, WhatsApp number and email.', btn: 'Register interest',
      trust: "No spam. We'll only use your details to keep you posted about this project.",
      okTitle: "You're on the list!", okP: "We'll keep you posted as soon as this project is revealed. You'll be among the first to hear from us."
    }
  };

  var CSS = [
    '.uea-ov{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(33,30,24,.4);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);font-family:"Inter",system-ui,-apple-system,sans-serif;color:#17140F;-webkit-font-smoothing:antialiased}',
    '.uea-ov.uea-open{display:flex}',
    '.uea-ov *{box-sizing:border-box}',
    '.uea-m{background:#FEFBF6;border:1px solid #E7DECD;border-radius:20px;max-width:470px;width:100%;padding:30px 30px 26px;position:relative;box-shadow:rgba(0,0,0,.02) 0 0 0 1px,rgba(0,0,0,.04) 0 2px 6px 0,rgba(0,0,0,.1) 0 4px 8px 0;max-height:92vh;overflow:auto;text-align:left}',
    '.uea-x{position:absolute;top:12px;right:15px;background:none;border:none;font-size:24px;line-height:1;color:#5B564C;cursor:pointer;padding:0}',
    '.uea-x:hover{color:#17140F}',
    '.uea-eb{color:#17140F;font-weight:600;font-size:12px;letter-spacing:.16em;text-transform:uppercase;margin:0 0 6px}',
    '.uea-m h3{font-size:24px;line-height:1.2;margin:0 0 6px;font-family:"Inter",system-ui,-apple-system,sans-serif;font-weight:800;letter-spacing:-.01em;color:#17140F}',
    '.uea-sub{color:#5B564C;font-size:14px;line-height:1.5;margin:0 0 18px}',
    '.uea-f{margin-bottom:12px}',
    '.uea-f label{display:block;font-size:12.5px;font-weight:600;color:#5B564C;margin-bottom:5px}',
    '.uea-f input,.uea-f select{width:100%;padding:11px 13px;border:1px solid #E7DECD;border-radius:8px;font-family:inherit;font-size:15px;background:#FEFBF6;color:#17140F;margin:0;height:auto;appearance:auto}',
    '.uea-f input:focus,.uea-f select:focus{outline:none;border-color:#17140F}',
    '.uea-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
    '.uea-err{color:#b5462b;font-size:13px;margin:3px 0 0;display:none}',
    '.uea-btn{display:block;width:100%;margin-top:6px;border:none;background:#17140F;color:#fff;font-family:inherit;font-weight:600;font-size:15px;padding:13px 24px;border-radius:8px;cursor:pointer;text-align:center;transition:background .15s}',
    '.uea-btn:hover{background:#000}',
    '.uea-trust{margin-top:12px;font-size:12px;line-height:1.45;color:#5B564C}',
    '@media(max-width:520px){.uea-row{grid-template-columns:1fr}}',
    '.uea-ok{text-align:center;padding:16px 6px 8px}',
    '.uea-cw{width:82px;height:82px;margin:4px auto 14px;animation:uea-pop .45s ease}',
    '.uea-chk{width:82px;height:82px}',
    '.uea-chk circle{fill:none;stroke:#2E7D5B;stroke-width:3;opacity:.22}',
    '.uea-chk path{fill:none;stroke:#2E7D5B;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:60;stroke-dashoffset:60;animation:uea-draw .5s .18s ease forwards}',
    '.uea-ok h3{font-size:26px;margin-bottom:6px}',
    '.uea-ok p{color:#5B564C;font-size:14.5px;line-height:1.5;margin:0 auto;max-width:330px}',
    '@keyframes uea-draw{to{stroke-dashoffset:0}}',
    '@keyframes uea-pop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}',
    '.uea-cf{position:absolute;top:-12px;border-radius:2px;opacity:.9;z-index:1;animation-name:uea-fall;animation-timing-function:cubic-bezier(.3,.6,.4,1);animation-fill-mode:forwards;pointer-events:none}',
    '@keyframes uea-fall{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(105vh) rotate(680deg);opacity:.85}}'
  ].join('\n');

  var ov = null, lang = 'nl', depsPromise = null;

  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  function loadScript(src){
    return new Promise(function(res, rej){
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function(){ res(); }; s.onerror = function(){ rej(new Error('laden mislukt: ' + src)); };
      document.head.appendChild(s);
    });
  }
  // Zorgt dat submitLead() bestaat: op invest staat hij er al, elders laden we hem.
  function deps(){
    if (typeof window.submitLead === 'function') return Promise.resolve();
    if (depsPromise) return depsPromise;
    depsPromise = (window.supabase ? Promise.resolve() : loadScript(SUPABASE_JS))
      .then(function(){ return typeof window.submitLead === 'function' ? null : loadScript(INVEST + '/supabase-client.js'); })
      .catch(function(e){ depsPromise = null; throw e; });
    return depsPromise;
  }

  function opts(list, ph){
    var t = T[lang], i = (lang === 'en') ? 1 : 0;
    return '<option value="" disabled selected>' + esc(ph) + '</option>' +
      list.map(function(o){ return '<option value="' + esc(o[0]) + '">' + esc(o[i]) + '</option>'; }).join('');
  }

  function formHtml(){
    var t = T[lang];
    return '<button type="button" class="uea-x" aria-label="' + esc(t.close) + '">&times;</button>' +
      '<div class="uea-eb">' + esc(t.eb) + '</div>' +
      '<h3>' + esc(t.title) + '</h3>' +
      '<div class="uea-sub">' + esc(t.sub) + '</div>' +
      '<form novalidate>' +
        '<div class="uea-f"><label for="ueaName">' + esc(t.name) + '</label><input id="ueaName" type="text" autocomplete="name" placeholder="' + esc(t.namePh) + '" required></div>' +
        '<div class="uea-row">' +
          '<div class="uea-f"><label for="ueaPhone">' + esc(t.phone) + '</label><input id="ueaPhone" type="tel" autocomplete="tel" placeholder="+31 6 ..." required></div>' +
          '<div class="uea-f"><label for="ueaEmail">' + esc(t.email) + '</label><input id="ueaEmail" type="email" autocomplete="email" placeholder="jij@voorbeeld.com" required></div>' +
        '</div>' +
        '<div class="uea-row">' +
          '<div class="uea-f"><label for="ueaBudget">' + esc(t.budget) + '</label><select id="ueaBudget" required>' + opts(BUDGET, t.budget) + '</select></div>' +
          '<div class="uea-f"><label for="ueaWhen">' + esc(t.when) + '</label><select id="ueaWhen" required>' + opts(WHEN, t.whenPh) + '</select></div>' +
        '</div>' +
        '<div class="uea-err">' + esc(t.err) + '</div>' +
        '<button class="uea-btn" type="submit">' + esc(t.btn) + '</button>' +
        '<div class="uea-trust">' + esc(t.trust) + '</div>' +
      '</form>';
  }

  function build(){
    if (ov) return;
    var st = document.createElement('style'); st.id = 'uea-style'; st.textContent = CSS;
    document.head.appendChild(st);
    ov = document.createElement('div');
    ov.className = 'uea-ov'; ov.id = 'ueaModal';
    ov.innerHTML = '<div class="uea-m" role="dialog" aria-modal="true" aria-labelledby="ueaTitle"></div>';
    ov.addEventListener('click', function(e){ if (e.target === ov) close(); });
    document.body.appendChild(ov);
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && ov.classList.contains('uea-open')) close(); });
  }

  function render(){
    var m = ov.querySelector('.uea-m');
    m.innerHTML = formHtml();
    m.querySelector('h3').id = 'ueaTitle';
    m.querySelector('.uea-x').addEventListener('click', close);
    m.querySelector('form').addEventListener('submit', submit);
  }

  function val(id){ var e = document.getElementById(id); return e ? e.value.trim() : ''; }

  function submit(e){
    e.preventDefault();
    var name = val('ueaName'), phone = val('ueaPhone'), email = val('ueaEmail');
    var budget = val('ueaBudget'), when = val('ueaWhen');
    var errEl = ov.querySelector('.uea-err');
    if (!name || !phone || !email || !budget || !when){ errEl.style.display = 'block'; return false; }
    errEl.style.display = 'none';
    var lead = { project: 'The Reload', unit: 'Early access', name: name, phone: phone, email: email, budget: budget, when: when, lang: lang };
    var track = function(r){ try { if (typeof window.fbTrackLead === 'function') window.fbTrackLead('Early access', r && r.eventId); } catch (x) {} };
    deps()
      .then(function(){ return window.submitLead(lead); })
      .then(track)
      .catch(function(err){ try { console.error('early access', err); } catch (x) {} track(null); });
    success(name);
    return false;
  }

  function success(name){
    var t = T[lang], m = ov.querySelector('.uea-m');
    var first = name ? name.split(' ')[0] : '';
    m.innerHTML = '<div class="uea-ok">' +
      '<div class="uea-cw"><svg viewBox="0 0 52 52" class="uea-chk"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></div>' +
      '<h3>' + esc(t.okTitle) + (first ? ', ' + esc(first) : '') + '</h3>' +
      '<p>' + esc(t.okP) + '</p>' +
      '</div>';
    var colors = ['#243F35','#C06B3A','#B0873E','#2E7D5B','#EFE7D8'];
    for (var i = 0; i < 80; i++){
      var c = document.createElement('div'); c.className = 'uea-cf';
      c.style.left = (Math.random() * 100) + '%';
      c.style.background = colors[i % colors.length];
      c.style.width = (6 + Math.random() * 6) + 'px';
      c.style.height = (9 + Math.random() * 9) + 'px';
      c.style.animationDuration = (1.1 + Math.random() * 1.3) + 's';
      c.style.animationDelay = (Math.random() * 0.3) + 's';
      ov.appendChild(c);
    }
  }

  function open(l){
    lang = (l === 'en') ? 'en' : 'nl';
    build();
    ov.querySelectorAll('.uea-cf').forEach(function(c){ c.remove(); });
    render();
    ov.classList.add('uea-open');
    document.body.style.overflow = 'hidden';
    deps().catch(function(){});   // alvast laden, zodat versturen direct kan
    setTimeout(function(){ var f = document.getElementById('ueaName'); if (f) try { f.focus({ preventScroll: true }); } catch (x) {} }, 60);
  }

  function close(){
    if (!ov) return;
    ov.classList.remove('uea-open');
    document.body.style.overflow = '';
  }

  window.utamaEarlyAccess = { open: open, close: close };
})();
