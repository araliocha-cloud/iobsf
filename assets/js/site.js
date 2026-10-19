/* IOBSF site renderer.
   Every page is a shell; content lives in /data/*.json.
   English is primary. A second language (ko, ja, zh) is shown beneath it. */

(function () {
  "use strict";

  var SECONDS = ["ko", "ja", "zh"];
  var cache = {};

  /* ---------- second language ---------- */
  function getSecond() {
    var v = "ko";
    try { v = localStorage.getItem("iobsf-second") || "ko"; } catch (e) {}
    return SECONDS.indexOf(v) >= 0 ? v : "ko";
  }
  function setSecond(code) {
    document.documentElement.setAttribute("data-second", code);
    try { localStorage.setItem("iobsf-second", code); } catch (e) {}
    var btns = document.querySelectorAll(".lang-switch button");
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute("aria-pressed", btns[i].dataset.lang === code ? "true" : "false");
  }
  document.documentElement.setAttribute("data-second", getSecond());

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function en(o) { return o && typeof o === "object" ? (o.en || "") : (o || ""); }

  /* bilingual block: English first, the chosen second language beneath */
  var DICT = {};
  /* Japanese and Chinese come from data/i18n.json, keyed by the Korean text; untranslated text falls back to Korean */
  function tr(ko, k) { var d = DICT[ko]; return (d && d[k]) || ko; }
  function translateStatic(root) {
    var list = (root || document).querySelectorAll('.bi > .s[lang="ko"]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i], par = el.parentNode;
      if (par.querySelector('.s[lang="ja"]')) continue;
      ["ja", "zh"].forEach(function (k) {
        var n = el.cloneNode(false); n.setAttribute("lang", k); n.textContent = tr(el.textContent, k);
        par.insertBefore(n, el.nextSibling);
      });
    }
  }
  function bi(o, tag, cls, inline) {
    tag = tag || "div";
    if (!o || typeof o !== "object") return "<" + tag + (cls ? ' class="' + cls + '"' : "") + ">" + esc(o) + "</" + tag + ">";
    var h = '<span class="p" lang="en">' + esc(o.en || "") + "</span>";
    var sTag = inline ? "span" : "span";
    SECONDS.forEach(function (k) {
      var v = o[k] || (k !== "ko" && o.ko ? tr(o.ko, k) : "");
      if (v) h += "<" + sTag + ' class="s" lang="' + k + '">' + esc(v) + "</" + sTag + ">";
    });
    return "<" + tag + ' class="bi' + (inline ? " inline" : "") + (cls ? " " + cls : "") + '">' + h + "</" + tag + ">";
  }

  function fetchJSON(name) {
    return fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(name + ".json " + r.status);
      return r.json();
    });
  }
  function load(name) {
    if (!cache[name]) {
      cache[name] = name === "events"
        ? Promise.all([fetchJSON("events"), fetchJSON("event-list")]).then(function (r) { r[0].events = r[1].events || []; return r[0]; })
        : fetchJSON(name);
    }
    return cache[name];
  }
  function slug(t) { return String(t || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); }
  function idOf(x) { return (x && x.id) || slug(en(x.title) || en(x.name)); }
  /* small markdown reader for texts written in the admin */
  function inline(t) {
    return esc(t)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/(\\|  )\n/g, "\n").replace(/\n/g, "<br>");
  }
  function md(text) {
    return String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map(function (b) {
      b = b.replace(/^\n+|\s+$/g, ""); if (!b) return "";
      var m;
      if (/^(-{3,}|\* \* \*)$/.test(b)) return '<hr class="w-hr">';
      if (/^\|/.test(b)) {
        var rows = b.split(/\n/).filter(function (l) { return !/^\|\s*-{2,}/.test(l); }).map(function (l) { return l.replace(/^\||\|$/g, "").split("|"); });
        return '<div class="w-table"><table class="table"><thead><tr>' + rows[0].map(function (c) { return "<th>" + inline(c.trim()) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + inline(c.trim()) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>";
      }
      if ((m = b.match(/^#{1,6}\s+(.*)$/))) return "<h3>" + inline(m[1]) + "</h3>";
      if ((m = b.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) return '<figure class="w-fig"><img src="' + esc(m[2]) + '" alt="' + esc(m[1]) + '"></figure>';
      if (/^>/.test(b)) return '<p class="w-quote">' + inline(b.replace(/^>\s?/gm, "")) + "</p>";
      if (/^[-*]\s/.test(b)) return "<ul>" + b.split(/\n/).map(function (l) { return "<li>" + inline(l.replace(/^[-*]\s+/, "")) + "</li>"; }).join("") + "</ul>";
      if (/^\*\*[\s\S]*\*\*$/.test(b) && b.indexOf("**", 2) === b.length - 2) return '<p class="w-strong">' + inline(b.slice(2, -2)) + "</p>";
      return "<p" + (/\n/.test(b) ? ' class="w-verse"' : "") + ">" + inline(b) + "</p>";
    }).join("");
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (idOf(list[i]) === id) return list[i]; return null; }
  function nationName(nations, code) {
    var n = nations.filter(function (x) { return x.code === code; })[0];
    return n ? n.name : { en: code };
  }
  function param(k) { return new URLSearchParams(location.search).get(k); }
  function initials(name) { return en(name).split(/\s+/).map(function (w) { return w[0] || ""; }).join("").slice(0, 2); }
  function sampleBadge(x) { return x && x.sample ? '<span class="badge">Sample</span>' : ""; }
  function empty(o) { return '<div class="empty">' + bi(o) + "</div>"; }
  function fmtDate(e) {
    if (e.when) return e.when;
    if (e.date) { var d = new Date(e.date + "T00:00:00"); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
    return e.year ? String(e.year) : "";
  }
  function $(sel) { return document.querySelector(sel); }
  function put(sel, html) { var el = $(sel); if (el) el.innerHTML = html; }

  /* ---------- header & footer ---------- */
  function renderChrome(site) {
    var page = document.body.dataset.page;
    var nav = site.nav.map(function (n) {
      return '<li><a href="' + n.href + '"' + (n.id === page ? ' aria-current="page"' : "") + ">" + esc(n.label.en) + "</a></li>";
    }).join("");
    var langs = site.second_languages.map(function (l) {
      return '<button type="button" data-lang="' + l.code + '" aria-pressed="false" title="Second language">' + esc(l.name) + "</button>";
    }).join("");

    put("#site-header",
      '<div class="wrap">' +
        '<a class="brand" href="index.html" aria-label="IOBSF home">' +
          '<img src="assets/img/emblem-small.png" alt="" onerror="this.remove()">' +
          '<span class="brand-mark">IOBSF</span>' +
        "</a>" +
        '<button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>' +
        '<nav class="site-nav" id="site-nav" aria-label="Main"><ul>' + nav + "</ul></nav>" +
        '<div class="lang-switch" role="group" aria-label="Second language">' + langs + "</div>" +
      "</div>");
    var header = $("#site-header"); header.classList.add("site-header");

    var toggle = header.querySelector(".nav-toggle");
    toggle.addEventListener("click", function () {
      var nav = header.querySelector(".site-nav");
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    header.querySelectorAll(".lang-switch button").forEach(function (b) {
      b.addEventListener("click", function () { setSecond(b.dataset.lang); });
    });
    setSecond(getSecond());

    var links = site.links.map(function (l) {
      return '<a class="f-link" href="' + l.href + '"><strong>' + esc(l.name) + "</strong>" + bi(l.desc) + "</a>";
    }).join("");
    var f = site.federation;
    put("#site-footer",
      '<div class="wrap">' +
        '<div class="f-col1">' +
          '<div class="f-name">' + esc(f.name.en) + "</div>" + bi({ ko: f.name.ko, ja: f.name.ja, zh: f.name.zh, en: "" }) +
          '<div class="f-slogan">' + esc(site.statements.slogan.text.en) + "</div>" +
          '<img class="f-emblem" src="assets/img/emblem.webp" alt="IOBSF emblem" width="170" height="143" onerror="this.remove()">' +
        "</div>" +
        "<div>" + links + "</div>" +
        "<div>" + bi(site.statements.motto.text, "div", "f-motto") + "</div>" +
        '<div class="f-bottom">' +
          '<div class="f-line">' + esc("Founded 8 December 2018, Seoul. Headquarters: Republic of Korea.") + "</div>" +
          '<div class="f-line">' + esc("Secretary-General, International Outdoor Barbecue Sports Federation: Shaka Chaa") + "</div>" +
        "</div>" +
      "</div>");
    $("#site-footer").classList.add("site-footer");
  }

  /* ---------- pages ---------- */
  var pages = {};

  pages.home = function (site) {
    var st = site.statements, f = site.federation;
    put("#hero",
      '<img class="hero-emblem" src="assets/img/emblem.webp" alt="IOBSF emblem" onerror="this.outerHTML=\'<div class=&quot;hero-emblem-fallback&quot;>IOBSF</div>\'">' +
      bi(f.name, "p", "hero-name") +
      bi(st.motto.text, "p", "motto") +
      '<div class="placard">' +
        '<p class="placard-label">' + esc(st.creed.label.en) + "</p>" +
        bi(st.creed.text, "p", "placard-text") +
      "</div>" +
      '<picture class="dawn-wrap"><source srcset="assets/img/dawn-march-4.webp" type="image/webp"><img class="dawn" src="assets/img/dawn-march-4.jpg" alt="A band of early humans with stone axes, spears and bows advancing out of the dawn"></picture>');

    put("#home-spirit",
      '<div class="statement">' +
        '<p class="label">' + esc(st.spirit.label.en) + "</p>" +
        bi(st.spirit.text, "p", "text") +
        '<p style="margin-top:28px"><a class="more" href="fire.html">Read the Federation declaration</a></p>' +
      "</div>");

    Promise.all([load("rankings"), load("barbecuers"), load("events"), load("nations")]).then(function (r) {
      var rk = r[0], bb = r[1].barbecuers, ev = r[2], na = r[3].nations;
      var up = ev.events.filter(function (e) { return e.status === "upcoming" && e.org === "federation"; })
        .sort(function (a, b) { return (a.date || a.year) > (b.date || b.year) ? 1 : -1; });
      put("#home-next", up.length ? eventRows(up.slice(0, 3), ev, na)
        : empty({ en: "The next sanctioned event will be announced here.", ko: "다음 공인 대회가 이곳에 발표된다." }));
      put("#home-roster", roster(bb.slice(0, 4), na));
    });
    load("heritage").then(function (h) { (h.forms || []).forEach(function (f) { FORMS[f.key] = f; }); put("#home-heritage-intro", bi(h.intro, "div", "lede")); put("#home-register", registerList(h.register, true)); });
  };

  pages.fire = function (site) {
    var st = site.statements;
    put("#fire-body",
      '<div class="statement">' + bi(st.hwahap.text, "p", "text") + "</div>" +
      '<div style="height:80px"></div>' +
      ["motto", "spirit", "creed"].map(function (k) {
        return '<div class="statement" style="margin-bottom:72px"><p class="label">' + esc(st[k].label.en) + "</p>" + bi(st[k].text, "p", "text") + "</div>";
      }).join("") +
      '<div class="split" style="margin-top:40px">' +
        '<div><h2>' + esc(st.mission.label.en) + "</h2>" + bi(st.mission.text, "div", "prose lede") + "</div>" +
        '<div><h2>' + esc(st.pro_barbecuer.label.en) + "</h2>" + bi(st.pro_barbecuer.text, "div", "prose lede") + "</div>" +
      "</div>");
  };

  pages.barbecuers = function () {
    Promise.all([load("barbecuers"), load("nations")]).then(function (r) {
      var bb = r[0].barbecuers, na = r[1].nations;
      var active = bb.filter(function (b) { return b.status !== "hall_of_fame"; });
      var hof = bb.filter(function (b) { return b.status === "hall_of_fame"; });
      put("#roster", active.length ? roster(active, na) : empty({ en: "Certified Pro Barbecuers will be listed here.", ko: "인증된 프로바비큐어가 이곳에 오른다." }));
      if (hof.length) put("#hall", roster(hof, na)); else { var hs = $("#hall"); if (hs) hs.closest("section").remove(); }
    });
  };

  pages.barbecuer = function () {
    Promise.all([load("barbecuers"), load("nations"), load("events"), load("rankings")]).then(function (r) {
      var b = byId(r[0].barbecuers, param("id")), na = r[1].nations, ev = r[2], rk = r[3];
      if (!b) { put("#person", empty({ en: "This Pro Barbecuer could not be found. Return to the roster.", ko: "해당 프로바비큐어를 찾을 수 없다. 명단으로 돌아가라." }) + '<p><a href="barbecuers.html">Pro Barbecuers</a></p>'); return; }
      document.title = en(b.name) + " | IOBSF Pro Barbecuer";
      var tbc = bi({ en: "To be confirmed", ko: "확인 중" }, "span", "pending", true);
      var val = function (o) { return o && (o.en || o.ko) ? bi(o) : tbc; };
      var honors = rk.honors_def.map(function (h) {
        return "<dt>" + bi(h.name, "span", "", true) + "</dt><dd>" + (b.honors && b.honors[h.key] || 0) + "</dd>";
      }).join("");
      var recs = (b.records || []).map(function (x) {
        var e = byId(ev.events, x.event);
        return "<tr><td>" + (e ? '<a href="event.html?id=' + idOf(e) + '">' + esc(en(e.name)) + "</a>" + '<div class="entry-by">' + esc(fmtDate(e)) + "</div>" : esc(x.event)) + "</td><td>" + esc(x.result) + "</td><td>" + esc(x.note || "") + "</td></tr>";
      }).join("");
      var groups = [["role", { en: "Institutions and Fire", ko: "기관과 불의 자리" }], ["book", { en: "Books", ko: "저서" }], ["paper", { en: "Papers", ko: "논문" }], ["media", { en: "Broadcasts, Interviews and Columns", ko: "방송, 인터뷰, 칼럼" }], ["event", { en: "Events", ko: "대회" }], ["project", { en: "Projects in Preparation", ko: "추진 중인 일" }]];
      var portfolio = groups.map(function (g) {
        var list = (b.portfolio || []).filter(function (x) { return x.kind === g[0]; });
        return list.length ? '<h3 class="pf-head">' + esc(g[1].en) + bi({ ko: g[1].ko }, "span") + "</h3>" + entryList(list.map(function (x) { var y = {}; for (var k in x) y[k] = x[k]; y.kind = ""; return y; })) : "";
      }).join("");
      var career = (b.career || []).length ? '<ol class="timeline">' + b.career.map(function (x) { return '<li><div class="year">' + x.year + "</div>" + bi(x.text) + "</li>"; }).join("") + "</ol>" : "";
      put("#person",
        '<p class="form-kind">' + bi({ en: "Pro Barbecuer Profile", ko: "프로바비큐어 프로필" }, "span", "", true) + "</p>" +
        '<div class="split profile-head">' +
          '<div class="person"><div class="portrait">' + (b.photo ? '<img src="' + esc(b.photo) + '" alt="' + esc(en(b.name)) + '">' : "<span>" + esc(initials(b.name)) + "</span>") + "</div></div>" +
          "<div>" +
            (b.founder ? '<p class="founder-mark">' + bi({ en: "Founder of the Profession, 2013", ko: "프로바비큐어 창직자, 2013" }, "span", "", true) + "</p>" : "") +
            "<h1>" + esc(en(b.name)) + sampleBadge(b) + bi({ ko: b.name.ko, ja: b.name.ja, zh: b.name.zh }, "span") + "</h1>" +
            (b.titles && b.titles.length ? '<ul class="titles">' + b.titles.map(function (t) { return "<li>" + bi(t) + "</li>"; }).join("") + "</ul>" : "") +
            '<dl class="facts form-facts">' +
              "<dt>" + bi({ en: "Nation", ko: "국적" }, "span", "", true) + "</dt><dd>" + bi(nationName(na, b.nation)) + "</dd>" +
              (b.born_year ? "<dt>" + bi({ en: "Born", ko: "출생연도" }, "span", "", true) + "</dt><dd>" + esc(b.born_year) + "</dd>" : "") +
              "<dt>" + bi({ en: "Birthplace", ko: "출생지" }, "span", "", true) + "</dt><dd>" + val(b.birthplace) + "</dd>" +
              "<dt>" + bi({ en: "Raised", ko: "성장지" }, "span", "", true) + "</dt><dd>" + val(b.raised) + "</dd>" +
              "<dt>" + bi({ en: "Pro Barbecuer since", ko: "프로바비큐어" }, "span", "", true) + "</dt><dd>" + (b.certified ? esc(b.certified) : tbc) + "</dd>" +
              (b.pledge_signed ? "<dt>" + bi({ en: "Charter pledge", ko: "헌장 서약" }, "span", "", true) + "</dt><dd>" + esc(b.pledge_signed) + "</dd>" : "") +
            "</dl>" +
          "</div>" +
        "</div>" +
        '<div class="statement officiant"><p class="label">Officiant\'s Statement</p>' + bi(b.statement, "p", "text") + "</div>" +
        formSection("Narrative", "서사", b.narrative ? bi(b.narrative, "div", "prose narrative") : bi(b.bio, "div", "prose")) +
        (career ? formSection("Barbecue Career", "바비큐 경력", career) : "") +
        (portfolio ? formSection("Portfolio", "포트폴리오", portfolio) : "") +
        (rk.honors_def.some(function (h) { return b.honors && b.honors[h.key]; }) ? formSection("Honours of Distribution", "분배의 명예", '<dl class="facts">' + honors + "</dl>") : "") +
        (recs ? formSection("Events Hosted", "대회 개최 경력", '<div class="table-scroll"><table class="table"><thead><tr><th>Event</th><th>Role</th><th>Note</th></tr></thead><tbody>' + recs + "</tbody></table></div>") : ""));
    });
  };

  pages.rankings = function (site) {
    put("#rank-creed", '<div class="statement"><p class="label">' + esc(site.statements.creed.label.en) + "</p>" + bi(site.statements.creed.text, "p", "text") + "</div>");
    Promise.all([load("rankings"), load("barbecuers"), load("nations")]).then(function (r) {
      var rk = r[0];
      put("#rank-season", "Season " + rk.season + (rk.updated ? ", updated " + esc(rk.updated) : ""));
      put("#rank-note", bi(rk.points_note, "div", "prose"));
      put("#rank-table", rankingTable(rk, r[1].barbecuers, r[2].nations));
      put("#rank-honors", honorsTable(rk, r[1].barbecuers));
    });
  };

  pages.events = function (site) {
    put("#events-creed", '<div class="statement"><p class="label">' + esc(site.statements.creed.label.en) + "</p>" + bi(site.statements.creed.text, "p", "text") + "</div>");
    Promise.all([load("events"), load("nations")]).then(function (r) {
      var ev = r[0], na = r[1].nations;
      var byDate = function (a, b) { return (b.date || b.year) > (a.date || a.year) ? 1 : -1; };
      var fed = ev.events.filter(function (e) { return e.org === "federation"; }).sort(byDate);
      var kr = ev.events.filter(function (e) { return e.org !== "federation"; }).sort(byDate);
      var after = kr.filter(function (e) { return (e.year || 0) >= 2018; }), before = kr.filter(function (e) { return (e.year || 0) < 2018; });
      put("#events-up", fed.length ? eventRows(fed, ev, na) : empty({ en: "The next sanctioned event will be announced here.", ko: "다음 공인 대회가 이곳에 발표된다." }));
      put("#events-past", bi({ en: "Competitions hosted in Korea by KOOBA, the Federation’s member in Korea, and its forerunners.", ko: "연맹의 한국 회원인 KOOBA와 그 앞선 이들이 한국에서 연 대회." }, "div", "prose member-intro") +
        (after.length ? eventRows(after, ev, na) : "") +
        (before.length ? '<h3 class="pf-head">Before the Federation' + bi({ ko: "연맹 이전의 불" }, "span") + "</h3>" + eventRows(before, ev, na) : ""));
      put("#ritual", ritualList(ev.ritual_stages, null, true));
    });
    load("judges").then(function (j) {
      var spaced = function (t) { return esc(t).split("").join(" "); };
      var day = function (d) { var x = new Date(d + "T00:00:00"); return { dot: d.replace(/-/g, ". ") + ".", en: x.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) }; };
      put("#events-judges", bi({ en: "Judges certified by KOOBA, the Federation’s member in Korea, in the standard form of the official judge card.", ko: "연맹의 한국 회원인 KOOBA가 인정한 공식 심판. 공식 심판증의 표준 양식으로 싣는다." }, "div", "prose member-intro") +
        '<div class="judge-cards">' + j.judges.map(function (x) {
          var d = day(x.certified);
          return '<div class="judge-card"><div class="jc-title">Official Judge</div>' +
            '<img class="jc-photo" src="' + esc(x.photo) + '" alt="' + esc(x.name.en) + '" loading="lazy">' +
            '<div class="jc-name-ko" lang="ko">' + spaced(x.name.ko) + '</div><div class="jc-name-en">' + esc(x.name.en) + "</div>" +
            '<p class="jc-ko" lang="ko">이 사람은 대한아웃도어바비큐협회가 인정하는 공식 심판임을 확인합니다.</p>' +
            '<p class="jc-en">This person is an official judge certified by KOOBA.</p>' +
            '<div class="jc-date">' + esc(d.dot) + "<span>" + esc(d.en) + "</span></div>" +
            '<img class="jc-strip" src="assets/img/judges/kooba-strip.png" alt="Korea Outdoor &amp; Barbecue Association">' +
            '<img class="jc-seal" src="assets/img/judges/kooba-seal.png" alt="Seal of the Korea Outdoor &amp; Barbecue Association"></div>';
        }).join("") + "</div>" +
        '<p class="jc-confirm">' + bi({ en: "Confirmed as official judges of KOOBA on " + day(j.confirmed).en + ", by the Chairman of KOOBA.", ko: "상기인들이 사단법인 대한아웃도어바비큐협회 공식 심판임을 " + j.confirmed.replace(/-/g, ". ") + ". 협회장이 증명했다." }, "span", "", true) + "</p>");
    });
  };

  pages.event = function () {
    Promise.all([load("events"), load("nations"), load("barbecuers")]).then(function (r) {
      var ev = r[0], na = r[1].nations, bb = r[2].barbecuers;
      var e = byId(ev.events, param("id"));
      if (!e) { put("#event", empty({ en: "This event could not be found. Return to Events.", ko: "해당 대회를 찾을 수 없다. 대회 목록으로 돌아가라." }) + '<p><a href="events.html">Events</a></p>'); return; }
      document.title = en(e.name) + " | IOBSF";
      var who = function (x) { var b = x.barbecuer && byId(bb, x.barbecuer); return b ? '<a href="barbecuer.html?id=' + b.id + '">' + esc(en(b.name)) + "</a>" : esc(x.team || ""); };
      var results = e.results.map(function (x) { return '<tr><td class="rank">' + esc(x.rank) + "</td><td>" + who(x) + '</td><td class="num">' + esc(x.score || "") + "</td></tr>"; }).join("");
      var table = e.table.map(function (x) { return '<div class="dish"><div class="dish-name">' + who(x) + "</div>" + bi(x.story, "div", "prose") + "</div>"; }).join("");
      put("#event",
        '<p class="meta" style="color:var(--ash)">' + esc(fmtDate(e)) + ", " + esc(en(e.place)) + ", " + esc(en(ev.tiers[e.tier] || "")) + "</p>" +
        "<h1>" + esc(en(e.name)) + "</h1>" +
        bi(e.summary, "div", "prose lede") +
        (e.org === "federation" || (e.ritual && e.ritual.length) ? '<div class="section"><h2>The Ritual</h2><div style="margin-top:28px">' + ritualList(ev.ritual_stages, e.ritual, false) + "</div></div>" : "") +
        (e.status === "completed" && !results ? "" : '<div class="section"><h2>Results</h2><div style="margin-top:24px">' +
          (results ? '<div class="table-scroll"><table class="table"><thead><tr><th>Rank</th><th>Pro Barbecuer or team</th><th class="num">Score</th></tr></thead><tbody>' + results + "</tbody></table></div>" : empty({ en: "Results will be recorded after judgment.", ko: "판정 후 결과를 기록한다." })) +
          (e.acclaimed_by ? '<p style="margin-top:20px">Glory conferred by ' + esc(e.acclaimed_by) + ".</p>" : "") +
        "</div></div>") +
        (e.status === "completed" && !table ? "" : '<div class="section"><h2>The Table' + bi({ ko: "공동의 식탁", ja: "", zh: "" }, "span") + '</h2><p class="prose" style="margin-top:16px;color:var(--ash)">Every team that kept the fire, in its own words.</p><div style="margin-top:24px">' +
          (table || empty({ en: "The stories of every team will be recorded here.", ko: "모든 참가팀의 이야기가 이곳에 기록된다." })) +
        "</div></div>"));
    });
  };

  pages.pathway = function () {
    load("pathway").then(function (p) {
      put("#pathway-intro", bi(p.intro, "div", "lede"));
      var n = 0;
      put("#pathway", (p.tracks || []).map(function (t) {
        return '<div class="track"><h2 class="track-name">' + esc(t.name.en) + bi({ ko: t.name.ko, ja: t.name.ja, zh: t.name.zh }, "span") + "</h2>" + bi(t.rule, "div", "prose member-intro") +
          '<ol class="sequence compact track-steps">' + t.steps.map(function (s) { n++;
            return '<li value="' + n + '"><h3>' + esc(s.name.en) + "</h3>" + bi({ ko: s.name.ko, ja: s.name.ja, zh: s.name.zh }, "div") + (s.note ? bi(s.note, "p") : "") + "</li>";
          }).join("") + "</ol></div>";
      }).join(""));
      if (p.judges) put("#pathway-judges", bi(p.judges.text, "div", "prose"));
      if (p.reading && p.reading.length) put("#pathway-reading", bi(p.reading_intro, "div", "prose") + '<div style="margin-top:24px">' + entryList(p.reading) + "</div>");
    });
  };

  pages.heritage = function () {
    load("heritage").then(function (h) {
      (h.forms || []).forEach(function (f) { FORMS[f.key] = f; });
      put("#heritage-forms7", '<div class="forms7">' + h.forms.map(function (f) {
        var list = h.register.filter(function (d) { return (d.forms || []).indexOf(f.key) >= 0; });
        return '<div class="form7"><h3>' + esc(f.name.en) + bi({ ko: f.name.ko }, "span") + "</h3>" + bi(f.text, "div", "form7-text") +
          '<div class="form7-list">' + (list.length ? list.map(function (d) { return '<a href="heritage-item.html?id=' + esc(d.id) + '">' + esc(en(d.name)) + "</a>"; }).join(", ") : '<span style="color:var(--ash)">' + bi({ en: "Awaiting its first record", ko: "첫 기록을 기다린다" }, "span", "", true) + "</span>") + "</div></div>";
      }).join("") + "</div>");
      put("#heritage-intro", bi(h.intro, "div", "lede"));
      put("#trophies", trophyStage());
      put("#heritage-principle", '<div class="statement"><p class="label">Principles</p>' + h.principles.map(function (x) { return bi(x, "p", "text principle-line"); }).join("") + "</div>");
      put("#heritage-criteria", '<dl class="facts">' + h.criteria.map(function (c) {
        return "<dt>" + bi(c.name, "span", "", true) + "</dt><dd>" + bi(c.text) + "</dd>";
      }).join("") + "</dl>");
      var PM = { record: "bronze", review: "silver", inscribed: "gold", inscription: "gold" };
      put("#heritage-process", '<ol class="sequence compact three proc-list">' + h.process.map(function (x) {
        return '<li><div class="proc-trophy">' + (PM[x.key] ? trophySVG(PM[x.key]) : "") + "</div><h3>" + esc(x.name.en) + "</h3>" + bi({ ko: x.name.ko, ja: x.name.ja, zh: x.name.zh }, "div") + '<p class="proc-en">' + esc(x.text.en) + "</p>" + bi({ ko: x.text.ko, ja: x.text.ja, zh: x.text.zh }, "div", "proc-ko") + "</li>";
      }).join("") + "</ol>");
      var ins = h.register.filter(function (d) { return d.status === "origin" || d.status === "inscribed"; });
      var rec = h.register.filter(function (d) { return d.status === "record" || d.status === "review"; });
      put("#heritage-register", registerList(ins));
      put("#heritage-records", registerList(rec));
      put("#heritage-forms", '<p>' + bi({ en: "Federation Recorded Heritage follows the record form. Federation Inscribed Heritage follows the inscription form, with its plaque.", ko: "연맹기록유산은 기록양식을, 연맹등재유산은 명판을 포함한 등재양식을 따른다." }) + '</p><p style="margin-top:18px"><a class="more" href="heritage-item.html?id=ignis-primus&form=record">See the record form (No. 0, Ignis Primus)</a><br><a class="more" href="heritage-item.html?id=ignis-primus">See the inscription form and plaque (No. 0, Origin)</a></p>');

    });
  };
  pages.archives = function () {
    Promise.all([load("heritage"), load("writings").catch(function () { return { writings: [] }; })]).then(function (r) { renderArchives(r[0], r[1].writings || []); });
  };
  function renderArchives(h, writings) {
      put("#heritage-archives", h.archives.map(function (a) {
        var ess = writings.filter(function (w) { return w.category === a.key; }).map(function (w) {
          return { title: w.title, href: "writing.html?id=" + idOf(w), kind: "essay", by: "Shaka Chaa (차영기)" };
        });
        a = Object.assign({}, a, { entries: (a.entries || []).concat(ess) });
        return '<div class="nation-block"><h3>' + esc(a.name.en) + bi({ ko: a.name.ko, ja: a.name.ja, zh: a.name.zh }, "span") + "</h3><div>" + bi(a.text, "div", "prose") +
          '<div style="margin-top:18px">' + (a.entries.length ? entryList(a.entries) : '<p style="color:var(--ash);margin:0">Records will be published here.</p>') + "</div></div></div>";
      }).join(""));
  }


  pages.heritageitem = function () {
    load("heritage").then(function (h) {
      (h.forms || []).forEach(function (f) { FORMS[f.key] = f; });
      var id = param("id");
      var d = byId(h.register, id === "specimen" ? "ignis-primus" : id);
      if (!d) { put("#hitem", empty({ en: "This record could not be found. Return to Heritage.", ko: "해당 기록을 찾을 수 없다. 헤리티지로 돌아가라." }) + '<p><a href="heritage.html">Heritage</a></p>'); return; }
      document.title = en(d.name) + " | IOBSF Heritage";
      put("#hitem", d.inscription && param("form") !== "record" ? inscriptionForm(d, h) : recordForm(d, h));
    });
  };

  function fieldRow(label, val) { return "<dt>" + bi(label, "span", "", true) + "</dt><dd>" + val + "</dd>"; }
  function para(o) {
    if (!o || !(o.en || o.ko)) return '<p style="color:var(--ash)">' + bi({ en: "Record in preparation.", ko: "기록 준비 중." }, "span", "", true) + "</p>";
    return bi(o, "div", "prose");
  }
  function logList(d) {
    return '<ol class="timeline">' + (d.log || []).map(function (x) { return '<li><div class="year" style="font-size:18px">' + esc(x.date) + "</div>" + bi(x.text) + "</li>"; }).join("") + "</ol>";
  }
  function sourcesList(d) {
    if (!d.sources || !d.sources.length) return para(null);
    return "<ul>" + d.sources.map(function (x) { return '<li><a href="' + esc(x.href) + '">' + esc(x.title) + "</a></li>"; }).join("") + "</ul>";
  }
  function formSection(title, ko, inner) {
    return '<section class="form-section">' + bi({ en: title, ko: ko }, "h2") + inner + "</section>";
  }

  var KINDS = { book: { en: "Book", ko: "저서" }, paper: { en: "Paper", ko: "논문" }, article: { en: "Article", ko: "연구 글" }, video: { en: "Video", ko: "영상" }, media: { en: "Media", ko: "매체" }, role: { en: "Role", ko: "직책" }, event: { en: "Event", ko: "대회" }, essay: { en: "Essay", ko: "글" } };
  function entryList(list) {
    return '<ul class="entries">' + list.map(function (x) {
      var t = x.href ? '<a href="' + esc(x.href) + '">' + esc(en(x.title)) + "</a>" : '<span class="entry-title">' + esc(en(x.title)) + "</span>";
      var k = KINDS[x.kind] ? '<span class="entry-kind">' + bi(KINDS[x.kind], "span", "", true) + "</span>" : "";
      return "<li>" + k + t + bi({ ko: x.title.ko }, "div", "entry-sub") + (x.by ? '<div class="entry-by">' + esc(x.by) + "</div>" : "") + "</li>";
    }).join("") + "</ul>";
  }
  function smallTrophy(d) {
    var metal = d.status === "inscribed" ? "gold" : d.status === "review" ? "silver" : d.status === "record" ? "bronze" : "";
    if (!metal) return "";
    return '<div class="mini-trophy" title="' + esc(METALS[metal].label.en) + '"><div class="mini-trophy-label">' +
      '<span class="t-' + metal + '">' + esc(METALS[metal].label.en) + "</span>" + bi({ ko: METALS[metal].label.ko }, "span", "", false) + "</div>" + trophySVG(metal) + "</div>";
  }
  function recordForm(d, h) {
    var sec = d.sections || {};
    var statusLabel = d.status === "origin" ? { en: "Origin (not inscribed)", ko: "원점 (등재 대상 아님)" } : (d.status === "review" ? { en: "Federation Nominated Heritage, under Committee review", ko: "연맹심사유산, 등재위원회 심사 중" } : { en: "Federation Recorded Heritage", ko: "연맹기록유산" });
    return '<p class="form-kind">' + bi({ en: "Record Form, Federation Recorded Heritage", ko: "기록양식, 연맹기록유산" }, "span", "", true) + "</p>" +
      '<div class="form-head"><div class="form-head-title">' +
      '<p class="record-no">' + esc(d.record_no || (d.status === "origin" ? "No. 0" : "")) + "</p>" +
      "<h1>" + esc(en(d.name)) + (d.original && d.original !== en(d.name) ? ' <span class="orig-big">' + esc(d.original) + "</span>" : "") + bi({ ko: d.name.ko, ja: d.name.ja, zh: d.name.zh }, "span") + "</h1>" +
      "</div>" + smallTrophy(d.status === "origin" ? { status: "record" } : d) + "</div>" +
      '<dl class="facts form-facts">' +
        fieldRow({ en: "Original name", ko: "원어 이름" }, '<span class="orig-field">' + esc(d.original || "") + "</span>" + (d.original_lang ? bi(d.original_lang) : "")) +
        fieldRow({ en: "Form of fire", ko: "불의 형식" }, (d.forms && d.forms.length) ? (d.forms || []).map(function (k) { return FORMS[k] ? bi(FORMS[k].name) : ""; }).join("") : bi({ en: "Origin of all forms", ko: "모든 형식의 원점" })) +
        fieldRow({ en: "Community and region", ko: "공동체와 지역" }, bi(d.community)) +
        fieldRow({ en: "Era", ko: "시대" }, bi(d.era)) +
        fieldRow({ en: "Recorded", ko: "기록 일자" }, esc(d.recorded || "")) +
        fieldRow({ en: "Recorded by", ko: "기록 기관" }, d.recorder ? bi(d.recorder) : "") +
        fieldRow({ en: "Status", ko: "상태" }, bi(statusLabel)) +
      "</dl>" +
      formSection("Summary", "개요", para(sec.summary || d.text)) +
      (sec.fire ? formSection("Fire and Method", "불과 조리", para(sec.fire)) : "") +
      (sec.sharing ? formSection("Sharing and Ritual", "나눔과 의례", para(sec.sharing)) : "") +
      (sec.history ? formSection("History and Texts", "역사와 문헌", para(sec.history)) : "") +
      (sec.living ? formSection("Living Practice", "전승 현황", para(sec.living)) : "") +
      formSection("Sources", "출처", sourcesList(d)) +
      formSection("Record Log", "변경 이력", '<p class="form-note">' + bi({ en: "Entries are only ever added, never erased.", ko: "이력은 덧붙이기만 하고 지우지 않는다." }, "span", "", true) + "</p>" + logList(d)) +
      '<p style="margin-top:48px"><a href="heritage.html">Back to Heritage</a></p>';
  }

  function plaque(d) {
    var ins = d.inscription;
    return '<figure class="plaque' + (d.specimen ? " is-specimen" : "") + '" aria-label="Heritage plaque">' +
      (d.specimen ? '<div class="plaque-watermark">SPECIMEN</div>' : "") +
      '<img class="plaque-emblem" src="assets/img/emblem-small.png" alt="">' +
      '<div class="plaque-head">International Outdoor Barbecue<br>Sports Federation</div>' +
      '<div class="plaque-rule short"></div>' +
      '<div class="plaque-tier">' + (d.status === "origin" ? "Heritage of the Fire<br>The Origin" : "Federation Inscribed Heritage") + "</div>" +
      '<div class="plaque-no">No. ' + esc(d.number) + "</div>" +
      '<div class="plaque-name">' + esc(en(d.name)) + "</div>" +
      (d.original && d.original !== en(d.name) ? '<div class="plaque-orig">' + esc(d.original) + "</div>" : "") +
      '<div class="plaque-community">' + esc(en(d.community)) + "</div>" +
      '<div class="plaque-rule"></div>' +
      '<div class="plaque-text">' + esc(ins.plaque.en) + "</div>" +
      '<div class="plaque-rule"></div>' +
      '<div class="plaque-foot">' + (d.status === "origin" ? "Declared " : "Inscribed ") + esc(ins.date) + "<br>" + (d.status === "origin" ? "" : "Decision ") + esc(ins.decision_no) + "</div>" +
      '<div class="plaque-foot-en">' + (d.status === "origin" ? "Heritage of the Fire, No. " + esc(d.number) + ", The Origin" : "Federation Inscribed Heritage, No. " + esc(d.number)) + "</div>" +
    "</figure>";
  }

  function inscriptionForm(d, h) {
    var ins = d.inscription, dc = ins.decision, crit = h.criteria;
    var critRows = crit.map(function (c) { return fieldRow(c.name, bi(dc.criteria[c.key])); }).join("");
    return (d.specimen ? '<div class="specimen-banner">' + bi({ en: "Specimen. This page shows the inscription form. It is not an actual inscription.", ko: "견본. 등재양식을 보이기 위한 페이지이며, 실제 등재가 아니다." }) + "</div>" : "") +
      '<p class="form-kind">' + bi(d.status === "origin" ? { en: "Inscription Form, No. 0, the Origin", ko: "등재양식, 원점 제0호" } : { en: "Inscription Form, Federation Inscribed Heritage", ko: "등재양식, 연맹등재유산" }, "span", "", true) + "</p>" +
      '<div class="form-head form-head-plain">' + smallTrophy(d) + "</div>" +
      plaque(d) +
      formSection(d.status === "origin" ? "Declaration" : "Decision", d.status === "origin" ? "선언문" : "결정문",
        '<dl class="facts form-facts">' +
          fieldRow({ en: "Number", ko: "번호" }, esc(ins.decision_no)) +
          fieldRow({ en: "Date", ko: "일자" }, esc(ins.date)) +
          fieldRow({ en: "Authority", ko: "주체" }, bi(ins.session)) +
          (d.record_no ? fieldRow({ en: "Record", ko: "원 기록" }, esc(d.record_no)) : "") +
        "</dl>" +
        '<ol class="decision">' +
          "<li>" + bi(dc.receives) + "</li>" +
          "<li>" + bi(d.status === "origin" ? { en: "Against the four criteria, the Federation records:", ko: "연맹은 네 가지 기준에 비추어 이렇게 기록한다." } : { en: "The Committee finds that the record satisfies the four criteria:", ko: "위원회는 이 기록이 네 가지 기준을 충족한다고 판단한다." }) + '<dl class="facts" style="margin-top:14px">' + critRows + "</dl></li>" +
          "<li>" + bi(dc.inscribes) + "</li>" +
          "<li>" + bi(dc.invites) + "</li>" +
        "</ol>") +
      formSection("Statement of Value", "가치 선언문",
        '<dl class="facts form-facts">' +
          fieldRow({ en: "Summary", ko: "요약" }, bi(ins.statement.summary)) +
          fieldRow({ en: "Authenticity", ko: "진정성" }, bi(ins.statement.authenticity)) +
          fieldRow({ en: "Safeguarding", ko: "계승을 위한 당부" }, bi(ins.statement.safeguarding)) +
        "</dl>") +
      formSection("Community Consent", "공동체 동의", bi(ins.consent, "div", "prose")) +
      formSection("Record Log", "변경 이력", '<p class="form-note">' + bi({ en: "The plaque and the decision are never altered. Corrections are added here.", ko: "명판과 결정문은 바꾸지 않는다. 정정은 이곳에 덧붙인다." }, "span", "", true) + "</p>" + logList(d)) +
      '<p style="margin-top:48px"><a href="heritage.html">Back to Heritage</a></p>';
  }

  pages.chronicle = function () {
    load("chronicle").then(function (c) {
      put("#chronicle-intro", bi(c.intro, "div", "lede"));
      var stories = (c.stories || []).slice().sort(function (a, b) { return (b.date || "") > (a.date || "") ? 1 : -1; });
      put("#chronicle", stories.length ? stories.map(function (s) {
        var imgs = (s.images || []).concat(s.image ? [{ src: s.image, alt: "" }] : []);
        var gallery = imgs.length ? '<div class="story-gallery">' + imgs.map(function (im, i) {
          return '<figure class="' + (i === 0 ? "lead" : "") + '"><img src="' + esc(im.src) + '" alt="' + esc(im.alt || "") + '" loading="lazy"></figure>';
        }).join("") + "</div>" : "";
        var video = s.video ? '<p><a class="more" href="' + esc(s.video) + '">Watch the video</a></p>' : "";
        return '<article class="story" id="' + esc(idOf(s)) + '"><p class="story-date">' + esc(s.date ? fmtDate({ date: s.date }) : "") + "</p>" +
          bi(s.title, "h2", "story-title") + gallery + bi(s.text, "div", "prose story-text") + video + "</article>";
      }).join("") : empty({ en: "Stories from the fire will be published here after each event.", ko: "대회가 끝날 때마다 불 앞의 이야기가 이곳에 실린다." }));
    });
  };

  pages.writing = function () {
    Promise.all([load("writings"), load("heritage")]).then(function (r) {
      var w = byId(r[0].writings, param("id"));
      if (!w) { put("#writing", empty({ en: "This essay was not found.", ko: "글을 찾을 수 없다." })); return; }
      var cat = (r[1].archives || []).filter(function (a) { return a.key === w.category; })[0];
      document.title = en(w.title) + " | IOBSF";
      var body = md(w.body);
      var pub = w.published && w.published.outlet ? '<p class="w-pub">' + bi({ en: "First published in " + w.published.outlet + (w.published.date ? ", " + fmtDate({ date: w.published.date }) : ""), ko: "처음 실린 곳: " + w.published.outlet, ja: "初出：" + w.published.outlet, zh: "首次刊载于：" + w.published.outlet }, "span", "", true) + (w.published.href ? ' <a href="' + esc(w.published.href) + '">Original</a>' : "") + "</p>" : "";
      put("#writing",
        '<article class="writing">' +
          '<p class="w-crumb"><a href="archives.html">Archives</a>' + (cat ? " / " + esc(cat.name.en) + bi({ ko: cat.name.ko }, "span", "", true) : "") + "</p>" +
          "<h1>" + esc(en(w.title)) + "</h1>" +
          (w.subtitle && w.subtitle.en ? '<p class="w-sub-en">' + esc(w.subtitle.en) + "</p>" : "") +
          '<div class="w-ko">' + bi({ ko: w.title.ko }, "div", "w-title-ko") + (w.subtitle && w.subtitle.ko ? bi({ ko: w.subtitle.ko }, "div", "w-sub-ko") : "") + "</div>" +
          '<p class="w-by">' + esc((w.by && w.by.en) || "Shaka Chaa") + bi({ ko: (w.by && w.by.ko) || "차영기" }, "span", "", true) + "</p>" + pub +
          '<p class="w-lang">' + bi({ en: "Original text in Korean", ko: "원문 한국어" }, "span", "", true) + "</p>" +
          (w.image ? '<figure class="w-fig"><img src="' + esc(w.image) + '" alt="">' + (w.image_caption ? "<figcaption>" + esc(w.image_caption) + "</figcaption>" : "") + "</figure>" : "") +
          '<div class="w-body" lang="ko">' + body + "</div>" +
          (w.refs && w.refs.length ? '<div class="w-refs"><h3>' + bi({ en: "References", ko: "주요 참고 문헌" }, "span", "", true) + '</h3><ul>' + w.refs.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>" : "") +
        "</article>");
    });
  };

  pages.federation = function (site) {
    var st = site.statements, f = site.federation;
    put("#fed-facts",
      '<dl class="facts">' +
        "<dt>Name</dt><dd>" + bi(f.name) + "</dd>" +
        "<dt>Founded</dt><dd>" + bi({ en: "8 December 2018, " + f.founded_place.en, ko: "2018년 12월 8일, " + f.founded_place.ko, ja: "2018年12月8日、" + tr(f.founded_place.ko, "ja"), zh: "2018年12月8日，" + tr(f.founded_place.ko, "zh") }) + "</dd>" +
        "<dt>Headquarters</dt><dd>" + bi(f.headquarters) + "</dd>" +
        "<dt>" + esc(st.mission.label.en) + "</dt><dd>" + bi(st.mission.text) + "</dd>" +
        (site.secretariat ? "<dt>Secretariat</dt><dd>" + bi(site.secretariat.name) + bi(site.secretariat.head) + "</dd>" : "") +
      "</dl>");
    if (site.institutions) put("#fed-institutions", '<div class="forms7">' + site.institutions.map(function (x) {
      return '<div class="form7"><h3>' + (x.href ? '<a href="' + esc(x.href) + '">' + esc(x.name) + "</a>" : esc(x.name)) + "</h3>" + bi(x.full, "div", "form7-text") + bi(x.role, "div", "entry-sub") + "</div>";
    }).join("") + "</div>");
    load("nations").then(function (n) { put("#fed-members", nationsStrip(n.nations)); });
    load("articles").then(function (a) {
      var nat = { KR: { en: "Korea", ko: "한국", ja: "韓国", zh: "韩国" }, JP: { en: "Japan", ko: "일본", ja: "日本", zh: "日本" }, MY: { en: "Malaysia", ko: "말레이시아", ja: "マレーシア", zh: "马来西亚" }, PH: { en: "Philippines", ko: "필리핀", ja: "フィリピン", zh: "菲律宾" } };
      put("#fed-articles", bi(a.intro, "div", "prose") +
        '<dl class="facts articles">' + a.items.map(function (it) {
          return "<dt>" + bi(it.label, "span", "", true) + "</dt><dd>" + (it.text ? bi(it.text) : "") +
            (it.list ? '<ol class="art-list">' + it.list.map(function (x) { return "<li>" + bi(x) + "</li>"; }).join("") + "</ol>" : "") + "</dd>";
        }).join("") + "</dl>" +
        '<h3 class="pf-head">' + esc(a.officers_label.en) + bi({ ko: a.officers_label.ko, ja: a.officers_label.ja, zh: a.officers_label.zh }, "span") + "</h3>" +
        '<table class="table officers"><tbody>' + a.officers.map(function (o) {
          return "<tr><td>" + bi(o.role) + "</td><td>" + (o.name ? esc(o.name) : bi(o.vacant || { en: "Vacant", ko: "공석" }, "span", "pending", true)) + '</td><td class="entry-by">' + (o.nation ? bi(nat[o.nation] || { en: o.nation }, "span", "", true) : "") + "</td></tr>";
        }).join("") + "</tbody></table>");
    });
    load("history").then(function (hi) {
      var tl = function (list) { return '<ol class="timeline">' + list.slice().sort(function (a, b) { return a.year - b.year; }).map(function (x) {
        return '<li><div class="year">' + x.year + "</div>" + bi(x.text) + "</li>"; }).join("") + "</ol>"; };
      var fed = hi.entries.filter(function (x) { return x.scope === "federation"; }), roots = hi.entries.filter(function (x) { return x.scope !== "federation"; });
      put("#history", tl(fed) + (roots.length ? '<h3 class="pf-head">Roots of the Federation' + bi({ ko: "연맹의 뿌리", ja: "連盟の根", zh: "联合会的根基" }, "span") + "</h3>" +
        bi({ en: "The work in Korea that led to the Federation.", ko: "연맹으로 이어진 한국에서의 걸음.", ja: "連盟へとつながった韓国での歩み。", zh: "通往联合会的韩国足迹。" }, "div", "prose member-intro") + tl(roots) : ""));
    });
    if (site.roadmap) put("#fed-roadmap", bi(site.roadmap.intro, "div", "prose member-intro") + '<div class="forms7">' + site.roadmap.items.map(function (x) {
      return '<div class="form7"><h3>' + (x.href ? '<a href="' + esc(x.href) + '">' + esc(x.title.en) + "</a>" : esc(x.title.en)) + bi({ ko: x.title.ko, ja: x.title.ja, zh: x.title.zh }, "span") + "</h3>" + bi(x.text, "div", "form7-text") + "</div>";
    }).join("") + "</div>");
    load("chronicle").then(function (c) {
      var s0 = (c.stories || []).filter(function (x) { return x.id === "founding-general-meeting"; })[0];
      if (!s0) return;
      var imgs = s0.images || [];
      put("#fed-founding", (imgs.length ? '<div class="story-gallery">' + imgs.map(function (im, i) { return '<figure class="' + (i === 0 ? "lead" : "") + '"><img src="' + esc(im.src) + '" alt="' + esc(im.alt || "") + '" loading="lazy"></figure>'; }).join("") + "</div>" : "") + bi(s0.text, "div", "prose story-text"));
    });
  };

  pages.partners = function () {
    load("partners").then(function (p) {
      put("#partners-intro", bi(p.intro, "div", "lede"));
      put("#partners", p.tiers.map(function (t) {
        var list = p.partners.filter(function (x) { return x.tier === t.key; });
        return '<div class="nation-block"><h3>' + esc(en(t.name)) + bi({ ko: t.name.ko }, "span") + "</h3><div>" +
          (list.length ? list.map(function (x) { return '<a href="' + esc(x.href) + '">' + (x.logo ? '<img src="' + esc(x.logo) + '" alt="' + esc(x.name) + '" style="max-height:60px">' : esc(x.name)) + "</a>"; }).join("")
            : '<p style="color:var(--ash);margin:0">Open to partners.</p>') + "</div></div>";
      }).join(""));
    });
  };

  /* ---------- shared fragments ---------- */
  function rankingTable(rk, bb, na, limit) {
    var rows = rk.entries.slice().sort(function (a, b) { return b.points - a.points; });
    if (limit) rows = rows.slice(0, limit);
    if (!rows.length) return empty({ en: "The first season standings will appear after the first sanctioned event.", ko: "첫 공인 대회가 끝나면 시즌 순위가 이곳에 오른다." });
    return '<div class="table-scroll"><table class="table"><thead><tr><th>Rank</th><th>Pro Barbecuer</th><th>Nation</th><th class="num">Events</th><th class="num">Points</th></tr></thead><tbody>' +
      rows.map(function (x, i) {
        var b = byId(bb, x.barbecuer);
        return '<tr><td class="rank">' + (i + 1) + "</td><td>" + (b ? '<a href="barbecuer.html?id=' + b.id + '">' + esc(en(b.name)) + "</a>" : esc(x.barbecuer)) + sampleBadge(x) + "</td><td>" +
          esc(b ? en(nationName(na, b.nation)) : "") + '</td><td class="num">' + x.events + '</td><td class="num">' + x.points + "</td></tr>";
      }).join("") + "</tbody></table></div>";
  }
  function honorsTable(rk, bb) {
    if (!bb.length) return "";
    return '<div class="table-scroll"><table class="table"><thead><tr><th>Pro Barbecuer</th>' +
      rk.honors_def.map(function (h) { return '<th class="num">' + esc(h.name.en) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      bb.map(function (b) {
        return '<tr><td><a href="barbecuer.html?id=' + b.id + '">' + esc(en(b.name)) + "</a>" + sampleBadge(b) + "</td>" +
          rk.honors_def.map(function (h) { return '<td class="num">' + ((b.honors && b.honors[h.key]) || 0) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";
  }
  function eventRows(list, ev, na) {
    return list.map(function (e) {
      return '<a class="event-row" href="event.html?id=' + idOf(e) + '"><div class="when">' + esc(fmtDate(e)) + '</div><div><div class="title">' + esc(en(e.name)) + '</div><div class="where">' + esc(en(e.place)) + '</div></div><div class="tier">' + esc(en(ev.tiers[e.tier] || "")) + "</div></a>";
    }).join("");
  }
  function roster(list, na) {
    if (!list.length) return empty({ en: "Certified Pro Barbecuers will be listed here.", ko: "인증된 프로바비큐어가 이곳에 오른다." });
    return '<div class="roster">' + list.map(function (b) {
      return '<a class="person" href="barbecuer.html?id=' + b.id + '"><div class="portrait' + (b.photo ? " full" : "") + '">' + (b.photo ? '<img src="' + esc(b.photo) + '" alt="">' : "<span>" + esc(initials(b.name)) + "</span>") + "</div>" +
        '<div class="who">' + esc(en(b.name)) + sampleBadge(b) + "</div>" + bi({ ko: b.name.ko, ja: b.name.ja, zh: b.name.zh }, "div") +
        '<div class="meta">' + esc(en(nationName(na, b.nation))) + "</div></a>";
    }).join("") + "</div>";
  }
  function ritualList(stages, timing, compact) {
    var t = {}; (timing || []).forEach(function (x) { t[x.stage] = x; });
    return '<ol class="sequence' + (compact ? " compact" : "") + '">' + stages.map(function (s) {
      var x = t[s.key];
      return "<li><h3>" + esc(s.name.en) + "</h3>" + bi({ ko: s.name.ko, ja: s.name.ja, zh: s.name.zh }, "div") +
        (x ? "<p>" + esc(x.time || "") + (x.note ? ", " + esc(x.note) : "") + "</p>" : "") + "</li>";
    }).join("") + "</ol>";
  }

  /* three-tier trophies: cast metal, bearing the Federation emblem */
  var METALS = {
    gold:   { hi: "#fff4c9", mid: "#d9a93a", lo: "#6e4a0e", deep: "#3d2806", tbl: ["0.30 1", "0.20 0.93", "0.04 0.66"],
              label: { en: "Federation Inscribed Heritage", ko: "연맹등재유산" }, note: { en: "Inscribed by agreement of the Heritage Committee", ko: "등재위원회의 합의로 등재" } },
    silver: { hi: "#ffffff", mid: "#b9bfc7", lo: "#565c64", deep: "#2b2f34", tbl: ["0.26 1", "0.28 1", "0.31 1"],
              label: { en: "Federation Nominated Heritage", ko: "연맹심사유산" }, note: { en: "Under review by the Heritage Committee", ko: "등재위원회 심사 중" } },
    bronze: { hi: "#f7cfa4", mid: "#a8673a", lo: "#4e2810", deep: "#2a1407", tbl: ["0.26 0.98", "0.14 0.80", "0.05 0.60"],
              label: { en: "Federation Recorded Heritage", ko: "연맹기록유산" }, note: { en: "Recorded by the Federation", ko: "연맹이 기록" } }
  };
  function trophySVG(m) {
    var c = METALS[m], g = "tm-" + m;
    var body = "url(#" + g + "-body)", rim = "url(#" + g + "-rim)";
    return '<svg viewBox="0 0 220 330" class="trophy-svg" aria-hidden="true">' +
      "<defs>" +
        /* cylindrical body light: dark edges, bright off-centre band */
        '<linearGradient id="' + g + '-body" x1="0" x2="1" y1="0" y2="0">' +
          '<stop offset="0" stop-color="' + c.deep + '"/><stop offset=".18" stop-color="' + c.lo + '"/><stop offset=".38" stop-color="' + c.hi + '"/>' +
          '<stop offset=".52" stop-color="' + c.mid + '"/><stop offset=".8" stop-color="' + c.lo + '"/><stop offset="1" stop-color="' + c.deep + '"/></linearGradient>' +
        '<linearGradient id="' + g + '-rim" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + c.hi + '"/><stop offset=".5" stop-color="' + c.mid + '"/><stop offset="1" stop-color="' + c.lo + '"/></linearGradient>' +
        '<radialGradient id="' + g + '-flame" cx=".5" cy=".85" r=".9"><stop offset="0" stop-color="' + c.hi + '"/><stop offset=".6" stop-color="' + c.mid + '"/><stop offset="1" stop-color="' + c.lo + '"/></radialGradient>' +
        /* tint the emblem into the metal */
        '<filter id="' + g + '-tint" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/>' +
          '<feComponentTransfer><feFuncR type="table" tableValues="' + c.tbl[0] + '"/><feFuncG type="table" tableValues="' + c.tbl[1] + '"/><feFuncB type="table" tableValues="' + c.tbl[2] + '"/></feComponentTransfer></filter>' +
        '<clipPath id="' + g + '-medal"><circle cx="110" cy="132" r="35"/></clipPath>' +
      "</defs>" +
      /* flame finial */
      '<path d="M110 6 C118 22 132 30 127 50 C124 60 118 66 110 68 C102 66 96 60 93 50 C88 30 102 22 110 6 Z" fill="url(#' + g + '-flame)"/>' +
      '<path d="M110 30 C114 40 120 44 117 54 C115 60 113 62 110 63 C107 62 105 60 103 54 C100 44 106 40 110 30 Z" fill="' + c.deep + '" opacity=".35"/>' +
      '<path d="M90 30 C93 42 87 52 92 64 C84 61 79 54 80 46 C81 39 86 35 90 30 Z" fill="url(#' + g + '-flame)" opacity=".85"/>' +
      '<path d="M130 30 C127 42 133 52 128 64 C136 61 141 54 140 46 C139 39 134 35 130 30 Z" fill="url(#' + g + '-flame)" opacity=".85"/>' +
      /* rim with bead line */
      '<rect x="34" y="70" width="152" height="12" rx="3" fill="' + rim + '"/>' +
      '<rect x="38" y="84" width="144" height="4" rx="2" fill="' + c.lo + '"/>' +
      Array.apply(null, Array(23)).map(function (_, i) { return '<circle cx="' + (44 + i * 6) + '" cy="86" r="1.6" fill="' + c.hi + '" opacity=".75"/>'; }).join("") +
      /* bowl */
      '<path d="M40 88 H180 C178 140 150 170 110 172 C70 170 42 140 40 88 Z" fill="' + body + '"/>' +
      /* gadroons on the lower bowl */
      [-56, -40, -24, -8, 8, 24, 40, 56].map(function (x) { return '<path d="M' + (110 + x) + ' 150 Q' + (110 + x * 0.9) + ' 162 ' + (110 + x * 0.55) + ' 170" stroke="' + c.deep + '" stroke-opacity=".5" stroke-width="2" fill="none"/>'; }).join("") +
      /* scrolled handles */
      '<path d="M42 96 C14 96 10 124 26 138 C34 146 46 146 52 140" fill="none" stroke="' + rim + '" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M178 96 C206 96 210 124 194 138 C186 146 174 146 168 140" fill="none" stroke="' + rim + '" stroke-width="7" stroke-linecap="round"/>' +
      /* emblem medallion */
      '<circle cx="110" cy="132" r="40" fill="' + c.deep + '"/><circle cx="110" cy="132" r="38" fill="none" stroke="' + c.hi + '" stroke-opacity=".7" stroke-width="1.5"/>' +
      '<image href="assets/img/emblem-trophy.png" x="66" y="102" width="88" height="60" preserveAspectRatio="xMidYMid meet" clip-path="url(#' + g + '-medal)" filter="url(#' + g + '-tint)"/>' +
      /* baluster stem with knops */
      '<path d="M100 172 H120 L117 186 H103 Z" fill="' + body + '"/>' +
      '<ellipse cx="110" cy="190" rx="16" ry="6" fill="' + rim + '"/>' +
      '<path d="M104 194 C100 206 100 214 106 224 H114 C120 214 120 206 116 194 Z" fill="' + body + '"/>' +
      '<ellipse cx="110" cy="227" rx="20" ry="6" fill="' + rim + '"/>' +
      '<path d="M98 231 H122 L130 250 H90 Z" fill="' + body + '"/>' +
      /* stepped plinth with plate */
      '<rect x="70" y="250" width="80" height="10" rx="2" fill="' + rim + '"/>' +
      '<path d="M58 260 H162 L170 300 H50 Z" fill="' + body + '"/>' +
      '<rect x="80" y="270" width="60" height="18" rx="2" fill="' + c.deep + '" stroke="' + c.hi + '" stroke-opacity=".6"/>' +
      '<text x="110" y="283" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="10" letter-spacing="2" fill="' + c.hi + '">IOBSF</text>' +
      '<rect x="42" y="300" width="136" height="12" rx="2" fill="' + rim + '"/>' +
      '<rect x="36" y="312" width="148" height="10" rx="2" fill="' + body + '"/>' +
    "</svg>";
  }
  function trophyStage() {
    var order = ["gold", "silver", "bronze"];
    return '<div class="trophy-stage" role="img" aria-label="Three tiers: gold for Federation Inscribed Heritage, silver for Federation Nominated Heritage, bronze for Federation Recorded Heritage">' +
      '<div class="trophy-ring">' + order.map(function (m, i) {
        return '<div class="trophy-slot" style="--i:' + i + '"><div class="trophy-face">' + trophySVG(m) +
          '<div class="trophy-label t-' + m + '">' + esc(METALS[m].label.en) + "</div>" + bi({ ko: METALS[m].label.ko }, "div", "trophy-sub") + "</div></div>";
      }).join("") + "</div></div>" +
      '<ul class="trophy-legend">' + order.map(function (m) {
        return '<li><span class="dot t-' + m + '"></span>' + bi(METALS[m].label, "span", "", true) + '<span class="legend-note">' + bi(METALS[m].note, "span", "", true) + "</span></li>";
      }).join("") + "</ul>";
  }

  var FORMS = {};
  function formLine(d, inline) {
    var fs = (d.forms || []).map(function (k) { return FORMS[k]; }).filter(Boolean);
    if (!fs.length) return "";
    return '<div class="h-form">' + fs.map(function (f) { return bi(f.name, "span", "", true); }).join('<span class="sep">, </span>') + "</div>";
  }
  function registerList(reg, brief) {
    if (!reg.length) return empty({ en: "The first designations will be announced here.", ko: "첫 지정 유산이 이곳에 발표된다." });
    return '<div class="register">' + reg.map(function (d) {
      var mark = d.status === "origin" ? "No. 0, Origin" : d.status === "inscribed" ? "Federation Inscribed Heritage No. " + esc(d.number) : d.status === "review" ? "Federation Nominated Heritage" : "Federation Recorded Heritage";
      var metal = d.status === "inscribed" ? "gold" : d.status === "review" ? "silver" : d.status === "record" ? "bronze" : "";
      var src = (!brief && d.sources && d.sources.length) ? '<div class="h-sources">Sources: ' + d.sources.map(function (x) { return '<a href="' + esc(x.href) + '">' + esc(x.title) + "</a>"; }).join(", ") + "</div>" : "";
      if (d.status === "record" && d.record_no) mark = "Federation Recorded Heritage " + esc(d.record_no);
      return '<div class="heritage-item' + (d.status === "origin" ? " is-origin" : "") + '"><div class="h-mark' + (d.status === "origin" ? " is-designated" : "") + '">' + (metal ? '<span class="dot t-' + metal + '"></span>' : "") + mark + "</div>" +
        '<div class="dish-name"><a class="h-link" href="heritage-item.html?id=' + esc(d.id) + '">' + esc(en(d.name)) + "</a>" + (d.original && d.original !== en(d.name) ? '<span class="orig">' + esc(d.original) + "</span>" : "") + "</div>" +
        bi({ ko: d.name.ko, ja: d.name.ja, zh: d.name.zh }, "div") +
        '<div class="h-community">' + bi(d.community) + (d.era ? bi(d.era, "div", "h-era") : "") + "</div>" + formLine(d) +
        (brief ? "" : bi(d.text, "div", "h-text") + src) + "</div>";
    }).join("") + "</div>";
  }
  function nationsStrip(na) {
    return '<div class="nations">' + na.map(function (n) {
      return "<div>" + bi(n.name, "div", "n-name") + '<div class="n-org">' + (n.site ? '<a href="' + esc(n.site) + '">' + esc(n.member_org) + "</a>" : esc(n.member_org || "Member federation")) + (n.hq ? ". Headquarters" : "") + "</div></div>";
    }).join("") + "</div>";
  }

  /* ---------- boot ---------- */
  /* keep the reading position on reload: content is drawn after load, so restore once it is there */
  var SKEY = "iobsf-scroll:" + location.pathname + location.search;
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  window.addEventListener("pagehide", function () { try { sessionStorage.setItem(SKEY, String(window.scrollY)); } catch (e) {} });
  function restoreScroll() {
    var y = 0; try { y = parseInt(sessionStorage.getItem(SKEY) || "0", 10) || 0; } catch (e) {}
    var target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (!y && !target) return;
    var t0 = Date.now();
    (function tick() {
      if (target) { target.scrollIntoView(); return; }
      if (document.documentElement.scrollHeight >= y + window.innerHeight || Date.now() - t0 > 4000) { window.scrollTo(0, y); return; }
      setTimeout(tick, 60);
    })();
  }
  Promise.all([load("site"), fetchJSON("i18n").catch(function () { return {}; })]).then(function (r) {
    var site = r[0]; DICT = r[1] || {};
    translateStatic(document);
    renderChrome(site);
    var fn = pages[document.body.dataset.page];
    if (fn) fn(site);
    restoreScroll();
  }).catch(function (err) {
    var m = document.createElement("p");
    m.className = "noscript";
    m.textContent = "Content could not be loaded (" + err.message + "). Check that the data folder is published with the site.";
    document.body.appendChild(m);
  });
})();
