/* UTAMA bouwcamera-speler (9 oktober 2026). Eén bestand voor de brochure en de deelbare
   camerapagina, want gedeelde logica hoort in een gedeeld bestand.

   Leest de MJPEG-stream van de edge function bouwcamera (?stream=1) met fetch en toont elk
   beeld in een <img>. Mislukt de stream drie keer achter elkaar, dan vallen we terug op een
   momentopname elke 30 s en proberen we de stream elke minuut opnieuw. Na maxS seconden
   kijken pauzeert de speler (stand 'pauze'); de pagina toont dan een knop om verder te
   kijken. Zo kost een vergeten tabblad geen bandbreedte.

   utamaBouwcamera({
     base:  'https://.../functions/v1/bouwcamera?project=the-maison',
     cams:  [{ n: 1, img: HTMLImageElement }, ...],
     fps:   4,      beelden per seconde die de functie doorgeeft (hooguit 8)
     maxS:  600,    sessielimiet in seconden
     onState(n, stand)   'laden' | 'live' | 'offline' | 'pauze'
     onFrame(n, tijdMs)  bij elk getoond beeld
   }) geeft { start(), stop(), actief() } */
(function(){
  'use strict';
  var dec = new TextDecoder();

  function zoekCRLF2(buf, van){
    for (var i = van; i <= buf.length - 4; i++) {
      if (buf[i] === 13 && buf[i+1] === 10 && buf[i+2] === 13 && buf[i+3] === 10) return i;
    }
    return -1;
  }

  window.utamaBouwcamera = function(opts){
    var base = opts.base, fps = opts.fps || 4, maxMs = (opts.maxS || 600) * 1000;
    var onState = opts.onState || function(){}, onFrame = opts.onFrame || function(){};
    var cams = (opts.cams || []).map(function(c){ return { n: c.n, img: c.img, ctl: null, url: null, fouten: 0, gen: 0, timer: null }; });
    var actief = false, capTimer = null;

    function state(c, s){ try { onState(c.n, s); } catch (e) {} }

    function toon(c, bytes){
      var u = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
      var oud = c.url;
      c.img.onerror = null;
      c.img.onload = function(){ if (oud) { try { URL.revokeObjectURL(oud); } catch (e) {} } };
      c.img.src = u; c.url = u;
      try { onFrame(c.n, Date.now()); } catch (e) {}
    }

    function later(c, fn, ms){ clearTimeout(c.timer); c.timer = setTimeout(function(){ if (actief) fn(); }, ms); }

    // Terugval: momentopname elke 30 s, en elke minuut de stream opnieuw proberen.
    function momentopname(c){
      var gen = c.gen;
      c.img.onload = function(){ if (gen === c.gen) state(c, 'live'); };
      c.img.onerror = function(){ if (gen === c.gen) state(c, 'offline'); };
      c.img.src = base + '&cam=' + c.n + '&t=' + Date.now();
      c.pogingen = (c.pogingen || 0) + 1;
      if (c.pogingen % 2 === 0) { later(c, function(){ c.fouten = 0; stream(c); }, 30000); }
      else later(c, function(){ momentopname(c); }, 30000);
    }

    function stream(c){
      var ctl = new AbortController(); c.ctl = ctl; var gen = ++c.gen;
      var frames = 0;
      state(c, frames ? 'live' : 'laden');
      fetch(base + '&cam=' + c.n + '&stream=1&fps=' + fps + '&t=' + Date.now(), { signal: ctl.signal, cache: 'no-store' })
        .then(function(r){
          if (!r.ok || !r.body) throw new Error('status ' + r.status);
          var reader = r.body.getReader(); var buf = new Uint8Array(0);
          function lees(){
            return reader.read().then(function(res){
              if (res.done) return 'einde';
              var nb = new Uint8Array(buf.length + res.value.length); nb.set(buf); nb.set(res.value, buf.length); buf = nb;
              var pos = 0;
              for (;;) {
                var h = zoekCRLF2(buf, pos); if (h < 0) break;
                var m = /Content-Length:\s*(\d+)/i.exec(dec.decode(buf.subarray(pos, h)));
                if (!m) { pos = h + 4; continue; }
                var len = parseInt(m[1], 10), start = h + 4, end = start + len;
                if (buf.length < end) break;
                toon(c, buf.slice(start, end)); pos = end;
                frames++; c.fouten = 0; c.pogingen = 0;
                if (frames === 1) state(c, 'live');
              }
              buf = buf.slice(pos);
              return lees();
            });
          }
          return lees();
        })
        .then(function(){
          // Netjes beëindigd door de server (sessielimiet of worker klaar): meteen opnieuw.
          if (gen !== c.gen || !actief) return;
          if (frames === 0) throw new Error('geen beeld');
          later(c, function(){ stream(c); }, 300);
        })
        .catch(function(e){
          if (ctl.signal.aborted || gen !== c.gen || !actief) return;
          c.fouten++;
          if (c.fouten >= 3) { state(c, 'offline'); momentopname(c); }
          else later(c, function(){ stream(c); }, 1500 * c.fouten);
        });
    }

    function stop(){
      actief = false;
      clearTimeout(capTimer); capTimer = null;
      cams.forEach(function(c){ clearTimeout(c.timer); c.gen++; if (c.ctl) { try { c.ctl.abort(); } catch (e) {} c.ctl = null; } });
    }
    function start(){
      if (actief) return;
      actief = true;
      cams.forEach(function(c){ c.fouten = 0; c.pogingen = 0; stream(c); });
      capTimer = setTimeout(function(){ stop(); cams.forEach(function(c){ state(c, 'pauze'); }); }, maxMs);
    }
    return { start: start, stop: stop, actief: function(){ return actief; } };
  };
})();
