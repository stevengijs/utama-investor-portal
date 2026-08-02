/* UTAMA first-party analytics — cookieless, privacy-friendly. ~2KB. */
(function () {
  "use strict";
  var EP = "https://gcpachivrwalsneuvlsa.supabase.co/functions/v1/track";
  if (navigator.doNotTrack == "1" || window.doNotTrack == "1") return;

  function uuid() {
    try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c == "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  function rnd() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

  /* session id (per browser tab session) */
  var sid, ns = false;
  try {
    sid = sessionStorage.getItem("_ua_sid");
    if (!sid) { sid = rnd(); sessionStorage.setItem("_ua_sid", sid); ns = true; }
  } catch (e) { sid = rnd(); ns = true; }

  /* persistent first-party visitor id (survives across sessions; recognises returning sign-ups) */
  var vid = "";
  try {
    vid = localStorage.getItem("_ua_vid");
    if (!vid) { vid = uuid(); localStorage.setItem("_ua_vid", vid); }
  } catch (e) { vid = ""; }

  var UA = navigator.userAgent || "";
  function device() {
    if (/iPad|Tablet|PlayBook|Silk/i.test(UA) || (/Android/i.test(UA) && !/Mobile/i.test(UA))) return "tablet";
    if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(UA)) return "mobile";
    return "desktop";
  }
  function browser() {
    if (/Edg\//i.test(UA)) return "Edge";
    if (/OPR\/|Opera/i.test(UA)) return "Opera";
    if (/Chrome\//i.test(UA)) return "Chrome";
    if (/Firefox\//i.test(UA)) return "Firefox";
    if (/Safari\//i.test(UA)) return "Safari";
    return "Other";
  }
  function os() {
    if (/Windows/i.test(UA)) return "Windows";
    if (/iPhone|iPad|iPod/i.test(UA)) return "iOS";
    if (/Mac OS X/i.test(UA)) return "macOS";
    if (/Android/i.test(UA)) return "Android";
    if (/Linux/i.test(UA)) return "Linux";
    return "Other";
  }

  /* timezone -> country (best-effort, for a simple geo view) */
  var TZ = {};
  try { TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) { TZ = ""; }
  function country(tz) {
    var m = {
      "Europe/Amsterdam": "Netherlands", "Europe/Brussels": "Belgium", "Europe/Berlin": "Germany",
      "Europe/Paris": "France", "Europe/London": "United Kingdom", "Europe/Madrid": "Spain",
      "Europe/Lisbon": "Portugal", "Europe/Rome": "Italy", "Europe/Zurich": "Switzerland",
      "Europe/Vienna": "Austria", "Europe/Dublin": "Ireland", "Europe/Stockholm": "Sweden",
      "Europe/Oslo": "Norway", "Europe/Copenhagen": "Denmark", "Europe/Helsinki": "Finland",
      "Europe/Warsaw": "Poland", "Europe/Prague": "Czechia", "Europe/Athens": "Greece",
      "Europe/Bucharest": "Romania", "Europe/Budapest": "Hungary", "Europe/Luxembourg": "Luxembourg",
      "Asia/Jakarta": "Indonesia", "Asia/Makassar": "Indonesia", "Asia/Dubai": "UAE",
      "Asia/Singapore": "Singapore", "Asia/Hong_Kong": "Hong Kong", "Asia/Kuala_Lumpur": "Malaysia",
      "Asia/Bangkok": "Thailand", "Asia/Tokyo": "Japan", "Asia/Shanghai": "China",
      "Asia/Kolkata": "India", "Australia/Sydney": "Australia",
      "America/New_York": "United States", "America/Chicago": "United States",
      "America/Denver": "United States", "America/Los_Angeles": "United States",
      "America/Toronto": "Canada", "America/Sao_Paulo": "Brazil"
    };
    if (m[tz]) return m[tz];
    if (/^America\//.test(tz)) return "Americas";
    if (/^Europe\//.test(tz)) return "Europe (other)";
    if (/^Asia\//.test(tz)) return "Asia (other)";
    if (/^Australia\//.test(tz)) return "Australia";
    if (/^Africa\//.test(tz)) return "Africa";
    return "Other";
  }

  function channel(um, us, refhost, host, q) {
    var med = (um || "").toLowerCase();
    if (/cpc|ppc|paid|display|cpm|banner/.test(med)) return "paid";
    if (/email|newsletter/.test(med)) return "email";
    if (/social|social-media/.test(med)) return "social";
    if (/affiliate/.test(med)) return "referral";
    if (q.get("gclid") || q.get("gbraid") || q.get("wbraid")) return "paid";
    if (q.get("fbclid") || q.get("ttclid") || q.get("msclkid")) return "paid";
    if (us) return "campaign";
    if (!refhost) return "direct";
    if (refhost === host) return "internal";
    if (/google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\.|yandex\./.test(refhost)) return "organic";
    if (/facebook\.|instagram\.|linkedin\.|t\.co|twitter\.|x\.com|youtube\.|tiktok\.|pinterest\.|reddit\.|whatsapp/.test(refhost)) return "social";
    return "referral";
  }

  function send(p) {
    try {
      var b = JSON.stringify(p);
      if (navigator.sendBeacon) navigator.sendBeacon(EP, new Blob([b], { type: "text/plain" }));
      else fetch(EP, { method: "POST", body: b, headers: { "Content-Type": "text/plain" }, keepalive: true });
    } catch (e) {}
  }

  var eid, start, engaged, lastVis, visible;
  function pageview() {
    eid = uuid();
    start = Date.now(); engaged = 0; lastVis = Date.now(); visible = !document.hidden;
    var q = new URLSearchParams(location.search);
    var ref = document.referrer || "", refhost = "";
    try { if (ref) refhost = new URL(ref).hostname.replace(/^www\./, ""); } catch (e) {}
    var host = location.hostname.replace(/^www\./, "");
    send({
      t: "pv", eid: eid, sid: sid, vid: vid, ns: ns,
      site: host,
      path: location.pathname + location.search,
      title: (document.title || "").slice(0, 200),
      ref: ref, refhost: refhost,
      channel: channel(q.get("utm_medium"), q.get("utm_source"), refhost, host, q),
      utm_source: q.get("utm_source"), utm_medium: q.get("utm_medium"),
      utm_campaign: q.get("utm_campaign"), utm_content: q.get("utm_content"), utm_term: q.get("utm_term"),
      country: country(TZ), region: TZ, lang: navigator.language || "",
      device: device(), browser: browser(), os: os(),
      sw: screen && screen.width, sh: screen && screen.height
    });
    ns = false; // only first pageview of the session counts as new
  }

  function accrue() { if (visible) engaged += Date.now() - lastVis; lastVis = Date.now(); }
  function flush() { accrue(); if (eid) send({ t: "ping", eid: eid, dur: engaged }); }

  document.addEventListener("visibilitychange", function () {
    accrue(); visible = !document.hidden; lastVis = Date.now();
    if (document.hidden) flush();
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("beforeunload", flush);

  /* SPA route changes */
  function hook(type) {
    var orig = history[type];
    if (!orig) return;
    history[type] = function () {
      flush();
      var r = orig.apply(this, arguments);
      setTimeout(pageview, 0);
      return r;
    };
  }
  hook("pushState"); hook("replaceState");
  window.addEventListener("popstate", function () { flush(); setTimeout(pageview, 0); });

  pageview();

  /* ---- brochure interactions: chapter views + FAQ opens (brochure pages only) ---- */
  (function () {
    if (!/\/brochure(\/|$)/.test(location.pathname)) return;
    function projSlug() { var m = location.pathname.match(/^\/([a-z0-9-]+)\//i); return m ? m[1] : ""; }
    function ev(kind, label) {
      label = (label || "").replace(/\s+/g, " ").trim();
      if (!label) return;
      send({ t: "ev", eid: uuid(), sid: sid, vid: vid, site: location.hostname.replace(/^www\./, ""), path: location.pathname, project: projSlug(), kind: kind, label: label.slice(0, 300) });
    }
    var nav = document.getElementById("tabsNav");
    if (nav) {
      nav.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-tab]");
        if (!btn) return;
        var tn = btn.querySelector(".tn"); var num = tn ? tn.textContent.trim() : "";
        var name = "";
        btn.querySelectorAll("span").forEach(function (s) { if (!s.classList.contains("tn")) { var t = s.textContent.trim(); if (t) name = t; } });
        if (!name) name = btn.textContent.replace(num, "").trim();
        ev("chapter", (num ? num + " " : "") + name);
      });
    }
    document.querySelectorAll(".faq details").forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (d.open) { var s = d.querySelector("summary"); ev("faq", s ? s.textContent : ""); }
      });
    });
  })();
})();
