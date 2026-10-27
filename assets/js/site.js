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
    /* the emblem always returns to the home page as first opened: top of the page, no saved position */
    var brand = header.querySelector(".brand");
    if (brand) brand.addEventListener("click", function (ev) {
      try { Object.keys(sessionStorage).forEach(function (k) { if (k.indexOf("iobsf-scroll:") === 0) sessionStorage.removeItem(k); }); } catch (e) {}
      if (page === "home" && !location.hash && !location.search) { ev.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }
      else { ev.preventDefault(); location.href = "./"; }
    });

    var toggle = header.querySelector(".nav-toggle");
    var navEl = header.querySelector(".site-nav");
    function closeNav() { navEl.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
    toggle.addEventListener("click", function () {
      var open = navEl.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    /* the menu never stays open: close it on choosing a page, on leaving, and on coming back with the back gesture */
    navEl.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeNav); });
    if (brand) brand.addEventListener("click", closeNav);
    window.addEventListener("pagehide", closeNav);
    window.addEventListener("pageshow", closeNav);
    document.addEventListener("click", function (ev) { if (navEl.classList.contains("open") && !header.contains(ev.target)) closeNav(); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") closeNav(); });
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
          '<div class="f-line">' + esc("Secretary-General, IOBSF Headquarters and Korea Secretariat: Shaka Chaa") + "</div>" +
        "</div>" +
      "</div>");
    $("#site-footer").classList.add("site-footer");
  }

  /* ---------- pages ---------- */
  var pages = {};

  pages.home = function (site) {
    var st = site.statements, f = site.federation;
    homeBusiness();
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
      (st.sports_barbecue ? '<div class="statement definition"><p class="label">' + esc(st.sports_barbecue.label.en) + "</p>" + bi(st.sports_barbecue.text, "p", "text") + '</div><div style="height:72px"></div>' : "") +
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
    load("ghbh").then(function (g) {
      put("#home-heritage-intro", gb(g.standard.s1, "p", "ghbh-lede"));
      put("#home-register", ghbhDoor(g, false));
    });
  };

  pages.fire = function (site) {
    var st = site.statements;
    put("#fire-body",
      (st.sports_barbecue ? '<div class="statement definition"><p class="label">' + esc(st.sports_barbecue.label.en) + "</p>" + bi(st.sports_barbecue.text, "p", "text") + '</div><div style="height:80px"></div>' : "") +
      '<div class="statement">' + bi(st.hwahap.text, "p", "text") + "</div>" +
      '<div style="height:80px"></div>' +
      ["motto", "spirit", "creed"].map(function (k) {
        return '<div class="statement" style="margin-bottom:72px"><p class="label">' + esc(st[k].label.en) + "</p>" + bi(st[k].text, "p", "text") + "</div>";
      }).join("") +
      '<div class="split" style="margin-top:40px">' +
        '<div><h2>' + esc(st.mission.label.en) + "</h2>" + bi(st.mission.text, "div", "prose lede lines") + "</div>" +
        '<div><h2>' + esc(st.pro_barbecuer.label.en) + "</h2>" + bi(st.pro_barbecuer.text, "div", "prose lede lines") + "</div>" +
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
          var d = day(x.issued || x.certified);
          return '<div class="judge-card"><div class="jc-title">Official Judge</div>' + (x.no ? '<div class="jc-no">No. ' + esc(x.no) + "</div>" : "") +
            '<img class="jc-photo" src="' + esc(x.photo) + '" alt="' + esc(x.name.en) + '" loading="lazy">' +
            '<div class="jc-name-ko" lang="ko">' + spaced(x.name.ko) + '</div><div class="jc-name-en">' + esc(x.name.en) + "</div>" +
            '<p class="jc-ko" lang="ko">이 사람은 대한아웃도어바비큐협회가 인정하는 공식 심판임을 확인합니다.</p>' +
            '<p class="jc-en">This person is an official judge certified by KOOBA.</p>' +
            '<div class="jc-date">' + esc(d.en) + "</div>" +
            '<div class="jc-meta">' + (x.reissued ? "Certified " + esc(String(x.certified).slice(0, 4)) + ", reissued " + esc((x.issued || "").slice(0, 4)) : "Certified " + esc(String(x.certified).slice(0, 4))) + "</div>" +
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
        (e.facts && e.facts.length ? '<div class="section"><h2>At a Glance' + bi({ ko: "개요", ja: "概要", zh: "概况" }, "span") + '</h2><dl class="facts" style="margin-top:24px">' + e.facts.map(function (f) {
          return "<dt>" + bi(f.label, "span", "", true) + "</dt><dd>" + (f.href ? '<a href="' + esc(f.href) + '">' + esc(en(f.value)) + "</a>" : bi(f.value)) + "</dd>"; }).join("") + "</dl></div>" : "") +
        (e.speech ? '<div class="section speech"><h2>' + esc(en(e.speech.title)) + bi({ ko: e.speech.title.ko, ja: e.speech.title.ja, zh: e.speech.title.zh }, "span") + "</h2>" +
          (e.speech.subject ? '<p class="speech-subject">' + esc(en(e.speech.subject)) + (e.speech.subtitle ? '<span class="speech-sub">' + esc(en(e.speech.subtitle)) + "</span>" : "") + "</p>" +
            bi({ ko: e.speech.subject.ko + (e.speech.subtitle ? ", " + e.speech.subtitle.ko : ""), ja: e.speech.subject.ja + (e.speech.subtitle ? "、" + e.speech.subtitle.ja : ""), zh: e.speech.subject.zh + (e.speech.subtitle ? "，" + e.speech.subtitle.zh : "") }, "div", "speech-subject-s") : "") +
          (e.speech.speaker ? '<p class="speech-by">' + bi({ en: "Speaker", ko: "연사" }, "span", "", true) + ' <a href="' + esc(e.speech.speaker.href) + '">' + esc(en(e.speech.speaker.name)) + "</a>" + bi({ ko: e.speech.speaker.name.ko, ja: e.speech.speaker.name.ja, zh: e.speech.speaker.name.zh }, "span", "", true) + "</p>" : "") +
          (e.speech.lead ? bi(e.speech.lead, "div", "speech-lead") : "") +
          (e.speech.note ? bi(e.speech.note, "div", "prose member-intro") : "") + (e.speech.points && e.speech.points.length ? '<ol class="decision speech-points">' + e.speech.points.map(function (x) { return "<li>" + bi(x) + "</li>"; }).join("") + "</ol>" : "") +
          (e.speech.body ? bi(e.speech.body, "div", "prose speech-body") : "") +
          (e.speech.file ? '<p style="margin-top:20px"><a class="more" href="' + esc(e.speech.file) + '">' + bi({ en: "Download the speech", ko: "연설문 내려받기" }, "span", "", true) + "</a></p>" : "") + "</div>" : "") +
        (e.kind === "summit" || e.kind === "external" ? "" :
        (e.org === "federation" || (e.ritual && e.ritual.length) ? '<div class="section"><h2>The Ritual</h2><div style="margin-top:28px">' + ritualList(ev.ritual_stages, e.ritual, false) + "</div></div>" : "") +
        (e.status === "completed" && !results ? "" : '<div class="section"><h2>Results</h2><div style="margin-top:24px">' +
          (results ? '<div class="table-scroll"><table class="table"><thead><tr><th>Rank</th><th>Pro Barbecuer or team</th><th class="num">Score</th></tr></thead><tbody>' + results + "</tbody></table></div>" : empty({ en: "Results will be recorded after judgment.", ko: "판정 후 결과를 기록한다." })) +
          (e.acclaimed_by ? '<p style="margin-top:20px">Glory conferred by ' + esc(e.acclaimed_by) + ".</p>" : "") +
        "</div></div>") +
        (e.status === "completed" && !table ? "" : '<div class="section"><h2>The Table' + bi({ ko: "공동의 식탁", ja: "", zh: "" }, "span") + '</h2><p class="prose" style="margin-top:16px;color:var(--ash)">Every team that kept the fire, in its own words.</p><div style="margin-top:24px">' +
          (table || empty({ en: "The stories of every team will be recorded here.", ko: "모든 참가팀의 이야기가 이곳에 기록된다." })) +
        "</div></div>")));
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

  function plaque(d, cls) {
    var ins = d.inscription;
    return '<figure class="plaque' + (cls ? " " + cls : "") + (d.specimen ? " is-specimen" : "") + '" aria-label="Heritage plaque">' +
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
      (d.status === "origin" ? '<div class="plaque-sealrow">' + ROSETTE_GOLD +
        '<div class="pq-sign"><span class="pq-sig">Shaka Chaa</span><span class="pq-sig-title">Secretary-General</span></div>' +
        ghbhSeal("pq-seal") + "</div>" : "") +
      '<div class="plaque-foot-en">' + (d.status === "origin" ? "Heritage of the Fire, No. " + esc(d.number) + ", The Origin" : "Federation Inscribed Heritage, No. " + esc(d.number)) + "</div>" +
    "</figure>";
  }

  function inscriptionForm(d, h) {
    var ins = d.inscription, dc = ins.decision, crit = h.criteria;
    var critRows = crit.map(function (c) { return fieldRow(c.name, bi(dc.criteria[c.key])); }).join("");
    return (d.specimen ? '<div class="specimen-banner">' + bi({ en: "Specimen. This page shows the inscription form. It is not an actual inscription.", ko: "견본. 등재양식을 보이기 위한 페이지이며, 실제 등재가 아니다." }) + "</div>" : "") +
      '<p class="form-kind">' + bi(d.status === "origin" ? { en: "Inscription Form, No. 0, the Origin", ko: "등재양식, 원점 제0호" } : { en: "Inscription Form, Federation Inscribed Heritage", ko: "등재양식, 연맹등재유산" }, "span", "", true) + "</p>" +
      '<div class="form-head form-head-plain">' + smallTrophy(d) + "</div>" +
      plaque(d, "gold") +
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
          return '<figure class="' + (i === 0 ? "lead" : "") + '"><img src="' + esc(im.src) + '" alt="' + esc(im.alt || "") + '" loading="lazy">' + (im.caption ? "<figcaption>" + bi(im.caption, "span", "", true) + "</figcaption>" : "") + "</figure>";
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
        (st.sports_barbecue ? "<dt>" + esc(st.sports_barbecue.label.en) + "</dt><dd>" + bi(st.sports_barbecue.text, "div", "lines") + "</dd>" : "") +
        "<dt>" + esc(st.mission.label.en) + "</dt><dd>" + bi(st.mission.text, "div", "lines") + "</dd>" +
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
      var shape = ["wide", "tall", "tall", "wide"];
      put("#fed-founding", (imgs.length ? '<div class="assembly-gallery">' + imgs.map(function (im, i) {
        return '<figure class="ag-' + (shape[i] || "wide") + '"><img src="' + esc(im.src) + '" alt="' + esc(im.alt || "") + '" loading="lazy">' +
          (im.caption ? "<figcaption>" + bi(im.caption, "span", "", true) + "</figcaption>" : "") + "</figure>";
      }).join("") + "</div>" : "") + bi(s0.text, "div", "prose story-text"));
    });
  };

  pages.partners = function () {
    load("partners").then(function (p) {
      put("#partners-intro", bi(p.intro, "div", "lede"));
      put("#partners", p.tiers.map(function (t) {
        var list = p.partners.filter(function (x) { return x.tier === t.key; });
        return '<div class="nation-block partner-tier"><h3>' + esc(en(t.name)) + bi({ ko: t.name.ko, ja: t.name.ja, zh: t.name.zh }, "span") + "</h3><div>" +
          (t.text ? bi(t.text, "div", "prose member-intro") : "") +
          (list.length ? '<div class="partner-list">' + list.map(function (x) {
            var name = x.logo ? '<img src="' + esc(x.logo) + '" alt="' + esc(x.name) + '" style="max-height:60px">' : '<span class="partner-name">' + esc(x.name) + "</span>";
            return '<div class="partner">' + (x.href ? '<a href="' + esc(x.href) + '">' + name + "</a>" : name) +
              (x.full && en(x.full) !== x.name ? bi(x.full, "div", "partner-full") : (x.full ? bi({ ko: x.full.ko, ja: x.full.ja, zh: x.full.zh }, "div", "partner-full") : "")) +
              (x.role ? bi(x.role, "div", "partner-role") : "") + "</div>";
          }).join("") + "</div>"
            : '<p class="partner-open">' + bi({ en: "Open to partners.", ko: "파트너를 기다린다.", ja: "パートナーを待っている。", zh: "期待合作伙伴。" }, "span", "", true) + "</p>") + "</div></div>";
      }).join(""));
    });
  };

  /* Hestia at the door: four painted scenes played as one short film, then the hearth keeps burning */
  function scene(n) {
    return '<img class="hf-scene hf-s' + n + '" src="assets/img/hestia/scene-' + n + '.webp" srcset="assets/img/hestia/scene-' + n + '-960.webp 960w, assets/img/hestia/scene-' + n + '.webp 1680w" sizes="(max-width: 960px) 960px, 1680px" alt="" decoding="async">';
  }
  function hestiaFilm(overlay, mode) {
    var hearth = mode === "hearth";
    var media = hearth ? scene(4) :
      '<video class="hf-video" muted playsinline preload="metadata" poster="assets/img/hestia/poster-1.webp" aria-hidden="true"></video>' + scene(4);
    return '<div class="hestia-film' + (hearth ? " hearth-only done" : "") + '" role="img" aria-label="A closed Greek temple at night. Its bronze doors open and Hestia, goddess of the hearth, steps out, greets the visitor and invites them inside, where her round hearth is blazing.">' +
      '<div class="hf-stage">' + media +
      '<span class="hf-glow"></span><canvas class="hf-sparks"></canvas><span class="hf-vignette"></span><span class="hf-black"></span></div>' +
      (overlay ? '<div class="hf-overlay">' + overlay + "</div>" : "") +
      (hearth ? "" : '<button class="hf-sound" type="button" aria-pressed="false" aria-label="Sound on"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="hf-wave" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path class="hf-mute" d="M16 9l6 6M22 9l-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>' +
        '<button class="hf-replay" type="button" aria-label="Replay">&#8635;</button>' +
        '<span class="hf-tap" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>') + "</div>";
  }
  function sparks(film) {
    var cv = film.querySelector(".hf-sparks"); if (!cv || !cv.getContext) return;
    var ctx = cv.getContext("2d"), ps = [], on = false, raf = 0;
    function size() { var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2); cv.width = r.width * d; cv.height = r.height * d; }
    function spawn() { var w = cv.width, h = cv.height; return { x: w * (0.5 + (Math.random() - 0.5) * 0.09), y: h * 0.6, vx: (Math.random() - 0.5) * w * 0.0006, vy: -h * (0.0016 + Math.random() * 0.0028), life: 0, max: 70 + Math.random() * 90, r: (0.6 + Math.random() * 1.6) * (cv.width / 900) }; }
    function tick() {
      if (!on) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (ps.length < 38 && Math.random() < 0.5) ps.push(spawn());
      ps = ps.filter(function (p) {
        p.life++; p.x += p.vx + Math.sin((p.life + p.max) * 0.07) * cv.width * 0.0004; p.y += p.vy;
        var t = p.life / p.max, a = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
        ctx.beginPath(); ctx.fillStyle = "rgba(255," + Math.round(170 + 60 * (1 - t)) + ",90," + (a * 0.85).toFixed(3) + ")";
        ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        return p.life < p.max;
      });
      raf = requestAnimationFrame(tick);
    }
    size(); window.addEventListener("resize", size);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) {
      es.forEach(function (e) { var v = e.isIntersecting; if (v && !on) { on = true; tick(); } else if (!v) { on = false; cancelAnimationFrame(raf); } });
    }).observe(film);
  }
  function runFilm(film) {
    if (!film) return;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var v = film.querySelector(".hf-video");
    if (v) {
      v.muted = true; v.defaultMuted = true; v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
      v.src = v.canPlayType('video/mp4; codecs="avc1.640028"')
        ? "assets/video/hestia-welcome-7" + (window.innerWidth < 900 ? "-720" : "") + ".mp4"
        : "assets/video/hestia-welcome-7.webm";
      /* plays when in view, rests on the hearth for a few seconds, dims, and begins again */
      var started = false, visible = false, failed = false, pending = false, timer = 0;
      var fail = function () { failed = true; v.classList.add("failed"); film.classList.add("done", "seen"); film.classList.remove("play"); };
      var play = function () {
        started = true; pending = false; clearTimeout(timer);
        film.classList.remove("done", "dim"); film.classList.add("play");
        try { v.currentTime = 0; } catch (e) {}
        var p = v.play(); if (p && p.catch) p.catch(function (e) { if (e && e.name === "NotAllowedError") blocked(); else fail(); });
      };
      /* phones in low-power or data-saving mode refuse to start a video on their own;
         then the film waits on its first frame with a play mark, and the first touch starts it */
      var blocked = function () {
        film.classList.remove("play"); film.classList.add("blocked");
        var go = function () {
          if (!film.classList.contains("blocked")) return;
          film.classList.remove("blocked"); play();
          document.removeEventListener("touchend", go, true); document.removeEventListener("click", go, true);
        };
        document.addEventListener("touchend", go, true); document.addEventListener("click", go, true);
      };
      var restart = function () {
        clearTimeout(timer); film.classList.add("dim");
        timer = setTimeout(play, 900);
      };
      v.addEventListener("ended", function () {
        film.classList.add("done", "seen"); film.classList.remove("play");
        timer = setTimeout(function () { if (visible) restart(); else pending = true; }, 300);   /* the film itself now rests 4.4 s on the hearth */
      });
      v.addEventListener("error", fail);
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          visible = es[0].isIntersecting;
          if (failed) return;
          if (visible) {
            if (!started) play();
            else if (pending) restart();
            else if (film.classList.contains("play") && v.paused) v.play().catch(function () {});
          } else if (film.classList.contains("play")) v.pause();
        }, { threshold: 0.6 }).observe(film.querySelector(".hf-stage"));
      } else play();
      /* the frame itself breathes with the film: it widens as the temple doors open,
         and grows again as the camera follows her into the hearth */
      var stage = film.querySelector(".hf-stage");
      if (!reduce && stage) {
        var ease = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
        var size = function (t) {
          if (t < 0.4) return 1;
          if (t < 4.6) return 1 + 0.08 * ease((t - 0.4) / 4.2);          /* doors part */
          if (t < 13.2) return 1.08;
          return 1.08 + 0.17 * ease((t - 13.2) / 5.2);                   /* into the hearth */
        };
        var tick = function () {
          var k = film.classList.contains("dim") ? 1 : film.classList.contains("play") || film.classList.contains("done") ? size(v.currentTime || 0) : 1;
          stage.style.transform = "scale(" + k.toFixed(4) + ")";
          requestAnimationFrame(tick);
        };
        stage.style.transformOrigin = "50% 52%";
        stage.style.transition = "transform .9s cubic-bezier(.4,0,.2,1)";
        v.addEventListener("playing", function () { stage.style.transition = "none"; });
        v.addEventListener("ended", function () { stage.style.transition = "transform .9s cubic-bezier(.4,0,.2,1)"; });
        requestAnimationFrame(tick);
      }
      /* the score is inside the film itself, so sound and picture never part; the button only lifts the mute */
      var snd = film.querySelector(".hf-sound");
      if (snd) snd.addEventListener("click", function () {
        var on = v.muted; v.muted = !on; if (on) v.removeAttribute("muted"); else v.setAttribute("muted", "");
        snd.setAttribute("aria-pressed", on ? "true" : "false"); snd.setAttribute("aria-label", on ? "Sound off" : "Sound on");
        film.classList.toggle("sound", on);
        if (on && v.paused && film.classList.contains("play")) v.play().catch(function () {});
      });
      var rp = film.querySelector(".hf-replay");
      if (rp) rp.addEventListener("click", function () { if (!failed) restart(); });
    }
    if (!reduce) sparks(film);
  }
  function homeBusiness() {
    load("business").then(function (b) {
      var t = b.welcome;
      put("#home-business", hestiaFilm(
        '<p class="placard-label">' + esc(b.statement.label.en) + "</p>" +
        bi(t.text, "p", "biz-welcome-line lines") +
        '<a class="biz-button" href="business.html">' + bi(t.button, "span", "", true) + "</a>"));
      runFilm(document.querySelector("#home-business .hestia-film"));
    });
  }

  pages.business = function () {
    load("business").then(function (b) {
      put("#biz-hestia", hestiaFilm("")); runFilm(document.querySelector("#biz-hestia .hestia-film"));
      if (document.getElementById("biz-scroll")) {
        var v = (document.querySelector('script[src*="site.js"]') || {}).src; v = v && v.split("?v=")[1] || "1";
        var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "assets/css/papyrus.css?v=" + v; document.head.appendChild(l);
        var sc = document.createElement("script"); sc.src = "assets/js/papyrus.js?v=" + v; sc.defer = true; document.body.appendChild(sc);
      }
      put("#biz-statement", '<div class="statement definition biz-statement"><p class="label">' + esc(b.statement.label.en) + "</p>" + bi(b.statement.text, "p", "text") + "</div>");
      put("#biz-areas", bi(b.areas_intro, "div", "prose member-intro") + '<div class="forms7 biz-areas">' + b.areas.map(function (a) {
        /* the whole field is the door to the request form */
        var inner = "<h3>" + esc(a.name.en) + bi({ ko: a.name.ko, ja: a.name.ja, zh: a.name.zh }, "span") + "</h3>" +
          '<div class="biz-desk">' + bi(a.desk, "span", "", true) + "</div>" + bi(a.text, "div", "form7-text");
        return b.form_url ? '<a class="form7 biz-area biz-area-card" href="' + esc(b.form_url) + '" target="_blank" rel="noopener">' + inner + "</a>" : '<div class="form7 biz-area">' + inner + "</div>";
      }).join("") + "</div>");
      put("#biz-steps", '<ol class="sequence compact biz-steps">' + b.steps.map(function (x) {
        return "<li><h3>" + esc(x.name.en) + "</h3>" + bi({ ko: x.name.ko, ja: x.name.ja, zh: x.name.zh }, "div") + '<p class="proc-en">' + esc(x.text.en) + "</p>" + bi({ ko: x.text.ko, ja: x.text.ja, zh: x.text.zh }, "div", "proc-ko") + "</li>";
      }).join("") + "</ol>");
      put("#biz-principle", bi(b.principle, "p", "biz-principle"));
      put("#biz-form", '<div class="biz-form">' + (b.form_url
        ? '<a class="biz-button biz-plaque" href="' + esc(b.form_url) + '" target="_blank" rel="noopener">' +
          '<span class="plaque-mark" aria-hidden="true"><svg viewBox="0 0 40 48"><defs><linearGradient id="pmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4dca2"/><stop offset=".55" stop-color="#c99a4f"/><stop offset="1" stop-color="#7d5a24"/></linearGradient></defs>' +
          '<path d="M20 3c3 7 11 11 11 21a11 11 0 0 1-22 0c0-6 3-9 5-12 0 4 2 6 4 6-2-6 0-11 2-15z" fill="url(#pmg)"/><path d="M6 44h28M10 40h20" stroke="url(#pmg)" stroke-width="2" stroke-linecap="round"/></svg></span>' +
          bi(b.form_label, "span", "", true) + "</a>"
        : bi(b.form_pending, "p", "biz-pending")) + "</div>");
    });
  };

  /* ---------- Global Human Barbecue Heritage (GHBH) ---------- */
  /* English first; the second language (ko, ja, zh) beneath, as on the rest of the site */
  function gb(o, tag, cls) {
    tag = tag || "p";
    if (!o || typeof o !== "object") o = { en: o };
    var h = "<" + tag + ' class="p" lang="en">' + inline(o.en || "") + "</" + tag + ">";
    SECONDS.forEach(function (k) {
      var v = o[k] || (k !== "ko" && o.ko ? tr(o.ko, k) : "");
      if (v) h += "<" + tag + ' class="s" lang="' + k + '">' + inline(v) + "</" + tag + ">";
    });
    return '<div class="bi gb' + (cls ? " " + cls : "") + '">' + h + "</div>";
  }
  function gs(o) { var k = getSecond(); return (o && (o[k] || o.ko)) || ""; }
  var GU = {
    door: { en: "Federation Archived Heritage", ko: "연맹기록유산", ja: "連盟記録遺産", zh: "联盟记录遗产" },
    open: { en: "Open the archive", ko: "아카이브 열기", ja: "アーカイブを開く", zh: "打开档案" },
    field: { en: "Standard field", ko: "표준 필드명", ja: "標準フィールド名", zh: "标准字段名" },
    desc: { en: "Description and contents", ko: "설명 및 수록 내용", ja: "説明および収録内容", zh: "说明与收录内容" },
    charterSub: { en: "Preamble, Chapters I to III with Articles 1 to 9, Ratification", ko: "전문, 제1장~제3장 제9조, 결어", ja: "前文、第1章～第3章（第1条～第9条）、結語", zh: "序言、第一章至第三章（第一条至第九条）、结语" },
    criteriaSub: { en: "Six criteria, Three Pillars of Verification, grounds for exclusion, review under Fluid Truth", ko: "6대 세부 평가 기준, 3대 필수 검증 요건, 배제 사유, 재심 규정", ja: "6大細部評価基準、3大必須検証要件、除外事由、再審規定", zh: "六大细项评估标准、三大必要验证条件、排除事由、复审规定" },
    charterTab: { en: "Charter", ko: "헌장", ja: "憲章", zh: "宪章" },
    criteriaTab: { en: "Criteria", ko: "등재기준", ja: "登録基準", zh: "登录标准" },
    all: { en: "All", ko: "전체", ja: "すべて", zh: "全部" },
    allNat: { en: "All nations and regions", ko: "모든 나라와 지역", ja: "すべての国と地域", zh: "所有国家和地区" },
    none: { en: "No heritage found.", ko: "찾는 유산이 없다.", ja: "該当する遺産はない。", zh: "未找到相应遗产。" },
    list: { en: "Archive", ko: "목록", ja: "一覧", zh: "目录" },
    tier: ["Tier I", "Tier II", "Tier III"]
  };
  function countLine(n, conts, nations) {
    return { en: n + " records, " + conts + " continents, " + nations + " nations and regions",
      ko: "연맹기록유산 " + n + "건, " + conts + "개 대륙, " + nations + "개 나라와 지역",
      ja: "連盟記録遺産 " + n + "件、" + conts + "大陸、" + nations + "の国と地域",
      zh: "联盟记录遗产 " + n + " 项，" + conts + " 大洲，" + nations + " 个国家和地区" };
  }
  var CONT_ORDER = ["아시아", "유럽", "아프리카", "북아메리카", "남아메리카", "오세아니아"];
  function contObj(arch, k) { for (var i = 0; i < arch.length; i++) if (arch[i].continent.ko === k) return arch[i].continent; return { en: k, ko: k }; }

  function ghbhCounts(arch) {
    var c = {}, nations = {};
    arch.forEach(function (r) { c[r.continent.ko] = (c[r.continent.ko] || 0) + 1; nations[r.custodian.ko] = 1; });
    return { byCont: c, nations: Object.keys(nations).length };
  }
  function ghbhDoor(g, withConts) {
    var c = ghbhCounts(g.archive);
    return '<a class="ghbh-door" href="heritage-archive.html"><span class="gd-label">' + esc(GU.door.en) + '</span><span class="gd-num">' + g.archive.length + "</span>" +
      bi(countLine(g.archive.length, CONT_ORDER.length, c.nations), "span", "gd-ko") +
      (withConts ? '<span class="gd-conts">' + CONT_ORDER.map(function (k) { return "<span><b>" + (c.byCont[k] || 0) + "</b> " + bi(contObj(g.archive, k), "span", "", true) + "</span>"; }).join("") + "</span>" : "") +
      '<span class="gd-go">' + bi(GU.open, "span", "", true) + " &rarr;</span></a>";
  }

  function ghbhFlow() {
    /* wide: three tiers in a row, track B rising from below; tall: the same, stacked, for phones */
    var NAMES = [
      { en: "Archived Heritage", ko: "연맹기록유산", ja: "連盟記録遺産", zh: "联盟记录遗产" },
      { en: "Candidate Heritage", ko: "연맹심사유산", ja: "連盟審査遺産", zh: "联盟审查遗产" },
      { en: "Inscribed Heritage", ko: "연맹등재유산", ja: "連盟登録遺産", zh: "联盟登录遗产" }];
    var sub = function (o, x, y) { return SECONDS.map(function (k) { return '<text class="gf-sub s-' + k + '" x="' + x + '" y="' + y + '" lang="' + k + '">' + esc(o[k]) + "</text>"; }).join(""); };
    var box = function (x, y, w, h, metal, n, i, code, line1, line2) {
      var id = "gfm-" + metal;
      return '<g class="gf-box gf-' + metal + '" filter="url(#gfsh)">' +
        '<rect class="gf-slab" x="' + x + '" y="' + (y + 6) + '" width="' + w + '" height="' + h + '" rx="12"/>' +
        '<rect class="gf-face" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="12" fill="url(#gff-' + metal + ')"/>' +
        '<rect class="gf-bevel" x="' + (x + 5) + '" y="' + (y + 5) + '" width="' + (w - 10) + '" height="' + (h - 10) + '" rx="8" stroke="url(#' + id + ')"/>' +
        '<rect class="gf-sheen" x="' + (x + 6) + '" y="' + (y + 6) + '" width="' + (w - 12) + '" height="' + (h * 0.42) + '" rx="7" fill="url(#gfsheen)"/>' +
        '<circle cx="' + (x + 36) + '" cy="' + (y + 42) + '" r="19" fill="url(#gfr-' + metal + ')" class="gf-medal"/><circle cx="' + (x + 36) + '" cy="' + (y + 42) + '" r="15" class="gf-medal-in" stroke="url(#' + id + ')"/>' +
        '<text class="gf-n" x="' + (x + 36) + '" y="' + (y + 49) + '">' + n + "</text>" +
        '<text class="gf-name" x="' + (x + 66) + '" y="' + (y + 40) + '">' + NAMES[i].en + "</text>" + sub(NAMES[i], x + 66, y + 63) +
        '<text class="gf-code" x="' + (x + w - 18) + '" y="' + (y + 63) + '">' + code + "</text>" +
        '<line class="gf-hair" x1="' + (x + 24) + '" y1="' + (y + 82) + '" x2="' + (x + w - 24) + '" y2="' + (y + 82) + '" stroke="url(#' + id + ')"/>' +
        '<text class="gf-line" x="' + (x + 24) + '" y="' + (y + 110) + '">' + line1 + '</text><text class="gf-line" x="' + (x + 24) + '" y="' + (y + 134) + '">' + line2 + "</text></g>";
    };
    var tag = function (x, y, w, t) { return '<g class="gf-tag"><rect x="' + (x - w / 2) + '" y="' + (y - 17) + '" width="' + w + '" height="30" rx="15"/><text x="' + x + '" y="' + (y + 4) + '">' + t + "</text></g>"; };
    var metal = function (k, a, b, c) { return '<linearGradient id="gfm-' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset=".5" stop-color="' + b + '"/><stop offset="1" stop-color="' + c + '"/></linearGradient>'; };
    var face = function (k, a, b) { return '<linearGradient id="gff-' + k + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>'; };
    var medal = function (k, a, b) { return '<radialGradient id="gfr-' + k + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></radialGradient>'; };
    var defs = "<defs>" +
      '<marker id="gfa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10z" fill="#c98a52"/></marker>' +
      '<filter id="gfsh" x="-10%" y="-10%" width="120%" height="135%"><feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#000" flood-opacity=".55"/></filter>' +
      '<linearGradient id="gfsheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      metal("bronze", "#e2a675", "#9a5b30", "#5a3118") + metal("silver", "#eef1f4", "#9aa1aa", "#565b62") + metal("gold", "#f4dc9a", "#c9a24a", "#7a5a1c") +
      face("bronze", "#3a2615", "#1e140b") + face("silver", "#30333a", "#17181b") + face("gold", "#3b2f12", "#1d170a") +
      medal("bronze", "#f0b98a", "#7a4220") + medal("silver", "#ffffff", "#6b7178") + medal("gold", "#fbe7a8", "#8a6418") + "</defs>";
    var wide = '<svg class="gf gf-wide" viewBox="0 0 1100 430" role="img" aria-label="Archived Heritage advances to Candidate Heritage by Track A (designated by the Federation) or Track B (application by a global body), then through a three-stage review to Inscribed Heritage.">' + defs +
      box(10, 30, 300, 160, "bronze", "1", 0, "GHBH-A", "Researched by the Federation,", "entered in the academic archive") +
      box(400, 30, 300, 160, "silver", "2", 1, "GHBH-C", "A living practice and proper name,", "entered into formal review") +
      box(790, 30, 300, 160, "gold", "3", 2, "GHBH-I", "Six criteria and Three Pillars met,", "inscribed on the formal List") +
      '<line class="gf-ar" x1="314" y1="110" x2="394" y2="110" marker-end="url(#gfa)"/>' + tag(354, 72, 80, "Track A") +
      '<line class="gf-ar" x1="704" y1="110" x2="784" y2="110" marker-end="url(#gfa)"/>' + tag(744, 72, 80, "Review") +
      '<g class="gf-steps"><text x="940" y="240">Three-stage review</text><text x="940" y="270">1 Document review</text><text x="940" y="296">2 Records and sources</text><text x="940" y="322">3 Field inspection</text></g>' +
      '<line class="gf-ar" x1="550" y1="326" x2="550" y2="206" marker-end="url(#gfa)"/>' + tag(488, 268, 100, "Track B") +
      '<g class="gf-app"><rect x="330" y="330" width="440" height="74" rx="37"/><text class="gf-app-t" x="550" y="360">Application by a global body</text><text class="gf-app-s" x="550" y="386">Communities, pitmasters, scholars, NGOs, local self-government</text></g></svg>';
    var tall = '<svg class="gf gf-tall" viewBox="0 0 360 780" role="img" aria-label="Archived Heritage, Candidate Heritage, Inscribed Heritage">' + defs +
      box(20, 10, 320, 150, "bronze", "1", 0, "GHBH-A", "Researched by the Federation,", "entered in the academic archive") +
      '<line class="gf-ar" x1="120" y1="172" x2="120" y2="244" marker-end="url(#gfa)"/>' + tag(120, 208, 90, "Track A") +
      '<line class="gf-ar" x1="260" y1="172" x2="260" y2="244" marker-end="url(#gfa)"/>' + tag(260, 208, 90, "Track B") +
      box(20, 250, 320, 150, "silver", "2", 1, "GHBH-C", "A living practice and proper name,", "entered into formal review") +
      '<line class="gf-ar" x1="80" y1="412" x2="80" y2="574" marker-end="url(#gfa)"/>' + tag(80, 492, 90, "Review") +
      '<g class="gf-steps gf-steps-tall"><text x="150" y="464">1 Document review</text><text x="150" y="494">2 Records and sources</text><text x="150" y="524">3 Field inspection</text></g>' +
      box(20, 580, 320, 150, "gold", "3", 2, "GHBH-I", "Six criteria and Three Pillars met,", "inscribed on the formal List") + "</svg>";
    tall = tall.replace(/id="gf/g, 'id="gt').replace(/url\(#gf/g, "url(#gt");
    return '<figure class="ghbh-fig">' + wide + tall + "</figure>";
  }

  /* How to Apply: the application form, set below the Charter and the Criteria */
  var ICON_PDF = '<svg class="ap-ico" viewBox="0 0 120 150" aria-hidden="true"><defs>' +
    '<linearGradient id="apG1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c4"/><stop offset=".3" stop-color="#e6bd5c"/><stop offset=".62" stop-color="#a87a22"/><stop offset="1" stop-color="#5e400a"/></linearGradient>' +
    '<linearGradient id="apP1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf4e2"/><stop offset=".6" stop-color="#eadcb8"/><stop offset="1" stop-color="#cdb98a"/></linearGradient>' +
    '<linearGradient id="apF1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9c79c"/><stop offset="1" stop-color="#9c8456"/></linearGradient>' +
    '<radialGradient id="apW1" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#e2563f"/><stop offset=".55" stop-color="#a5221a"/><stop offset="1" stop-color="#5c0c08"/></radialGradient>' +
    '<filter id="apS1" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="3" dy="6" stdDeviation="4" flood-color="#000" flood-opacity=".6"/></filter></defs>' +
    '<g filter="url(#apS1)"><rect x="6" y="6" width="96" height="132" rx="5" fill="url(#apG1)" stroke="#4a3206" stroke-width="1.4"/>' +
    '<rect x="10" y="10" width="88" height="124" rx="3" fill="none" stroke="#fff4c8" stroke-opacity=".7" stroke-width="1"/>' +
    '<path d="M16 16 H72 L92 36 V128 H16 Z" fill="url(#apP1)" stroke="#7a5a1c" stroke-width="1"/>' +
    '<path d="M72 16 V36 H92 Z" fill="url(#apF1)" stroke="#7a5a1c" stroke-width="1"/>' +
    '<g stroke="#8a6a32" stroke-width="2" stroke-linecap="round" opacity=".75"><path d="M26 46 H66"/><path d="M26 56 H82"/><path d="M26 66 H82"/><path d="M26 76 H74"/><path d="M26 86 H82"/></g>' +
    '<text x="42" y="36" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="11" letter-spacing="1.2" fill="#5e400a">GHBH</text>' +
    '<g transform="translate(70 108)"><path d="M-8 6 L-14 30 L-7 25 L-3 32 L0 10 Z" fill="#8f1d16"/><path d="M8 6 L14 30 L7 25 L3 32 L0 10 Z" fill="#7a1611"/>' +
    '<path d="M0 -20 C7 -20 9 -16 14 -14 C19 -10 20 -6 20 0 C20 7 17 10 14 14 C9 19 6 20 0 20 C-7 20 -10 17 -14 14 C-19 9 -20 6 -20 0 C-20 -7 -17 -10 -14 -14 C-9 -18 -6 -20 0 -20 Z" fill="url(#apW1)" stroke="#4a0806" stroke-width="1"/>' +
    '<circle r="12" fill="none" stroke="#f08a70" stroke-opacity=".45" stroke-width="1.2"/>' +
    '<text y="4" text-anchor="middle" font-family="Cormorant Garamond, Georgia, serif" font-weight="700" font-size="10.5" fill="#ffd9c8" fill-opacity=".9">PDF</text></g></g></svg>';
  var ICON_DOC = '<svg class="ap-ico" viewBox="0 0 120 150" aria-hidden="true"><defs>' +
    '<linearGradient id="apG2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c4"/><stop offset=".3" stop-color="#e6bd5c"/><stop offset=".62" stop-color="#a87a22"/><stop offset="1" stop-color="#5e400a"/></linearGradient>' +
    '<linearGradient id="apP2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbf4e2"/><stop offset=".6" stop-color="#eadcb8"/><stop offset="1" stop-color="#cdb98a"/></linearGradient>' +
    '<linearGradient id="apQ2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#ece4d2"/><stop offset="1" stop-color="#b9ab8c"/></linearGradient>' +
    '<linearGradient id="apN2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#d9a93a"/><stop offset="1" stop-color="#6e4a0e"/></linearGradient>' +
    '<radialGradient id="apI2" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#5a6a8a"/><stop offset=".5" stop-color="#1a2440"/><stop offset="1" stop-color="#05080f"/></radialGradient>' +
    '<filter id="apS2" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="3" dy="6" stdDeviation="4" flood-color="#000" flood-opacity=".6"/></filter></defs>' +
    '<g filter="url(#apS2)"><rect x="6" y="6" width="96" height="132" rx="5" fill="url(#apG2)" stroke="#4a3206" stroke-width="1.4"/>' +
    '<rect x="10" y="10" width="88" height="124" rx="3" fill="none" stroke="#fff4c8" stroke-opacity=".7" stroke-width="1"/>' +
    '<rect x="16" y="16" width="76" height="112" rx="2" fill="url(#apP2)" stroke="#7a5a1c" stroke-width="1"/>' +
    '<g stroke="#8a6a32" stroke-width="1.6" stroke-linecap="round" opacity=".55"><path d="M24 34 H84"/><path d="M24 46 H84"/><path d="M24 58 H84"/><path d="M24 70 H70"/></g>' +
    '<path d="M24 86 C34 78 40 94 50 86 S64 80 70 88" fill="none" stroke="#1a2440" stroke-width="1.6" stroke-linecap="round"/>' +
    '<g transform="translate(82 112)"><ellipse cx="0" cy="12" rx="17" ry="5" fill="#2a1c06" opacity=".5"/><path d="M-14 -6 H14 L12 12 H-12 Z" fill="url(#apI2)" stroke="#000" stroke-width=".8"/>' +
    '<rect x="-16" y="-10" width="32" height="6" rx="2" fill="url(#apN2)" stroke="#4a3206" stroke-width=".8"/><ellipse cx="0" cy="-10" rx="8" ry="2.4" fill="#05080f"/></g>' +
    '<g transform="rotate(-38 70 70)"><path d="M70 6 C88 18 92 46 76 82 L70 98 L64 82 C48 46 52 18 70 6 Z" fill="url(#apQ2)" stroke="#8c7d60" stroke-width=".9"/>' +
    '<path d="M70 12 V96" stroke="#9c8a66" stroke-width="1.1"/><g stroke="#b5a582" stroke-width=".7" opacity=".8"><path d="M70 26 L60 34"/><path d="M70 38 L58 48"/><path d="M70 50 L59 60"/><path d="M70 30 L80 38"/><path d="M70 44 L82 54"/><path d="M70 58 L80 68"/></g>' +
    '<path d="M66 96 L70 116 L74 96 Z" fill="url(#apN2)" stroke="#4a3206" stroke-width=".8"/></g></g></svg>';
  function applyBlock(a) {
    var box = function (n, inner, cls) { return '<div class="rv3-box ap-box' + (cls ? " " + cls : "") + '">' + (n ? '<span class="rv3-n">' + n + "</span>" : "") + inner + "</div>"; };
    var dl = function (href, icon, label, ext) {
      return '<a class="ap-dl" href="' + href + '" download>' + icon + '<span class="ap-dl-t">' + gb(label, "span", "ap-dl-l") + '<span class="ap-dl-x">' + ext + "</span></span></a>"; };
    return '<div class="ap-lede">' + a.lede.map(function (p) { return gb(p, "p", "ap-p"); }).join("") + "</div>" +
      gb(a.types_title, "h3", "ap-h") +
      '<div class="ap-types">' + a.types.map(function (t, i) { return box(i + 1, gb(t[0], "h4", "rv3-name") + gb(t[1], "p", "rv3-d")); }).join("") + "</div>" +
      '<div class="ap-two">' +
        box("", gb(a.principles_title, "h3", "ap-h ap-h-in") + '<ol class="ap-list">' + a.principles.map(function (p) { return "<li>" + gb(p, "span", "rv3-d") + "</li>"; }).join("") + "</ol>") +
        box("", gb(a.steps_title, "h3", "ap-h ap-h-in") + '<ol class="ap-list">' + a.steps.map(function (p) { return "<li>" + gb(p, "span", "rv3-d") + "</li>"; }).join("") + "</ol>") +
      "</div>" +
      '<div class="ap-form">' + box("", '<img class="ap-emblem" src="assets/img/emblem-small.png" alt="">' + gb(a.form_title, "h3", "ap-form-t") + gb(a.form_note, "p", "ap-form-n") +
        '<div class="ap-dls">' + dl(a.pdf, ICON_PDF, a.pdf_label, "PDF") + dl(a.docx, ICON_DOC, a.docx_label, "DOCX") + "</div>" +
        '<p class="ap-mail">' + gb(a.submit, "span", "ap-mail-k") + '<a href="mailto:' + esc(a.email) + '?subject=GHBH%20Application">' + esc(a.email) + "</a></p>", "ap-form-box") + "</div>";
  }

  pages.heritage = function () {
    Promise.all([load("ghbh"), load("heritage")]).then(function (r) {
      var g = r[0], s = g.standard, h = r[1];
      put("#ghbh-intro", gb(s.s1, "p", "ghbh-lede") + '<div class="ghbh-principles">' + gb(s.principles_title, "p", "label") + s.principles.map(function (p, i) {
        return '<div class="gp"><span class="gp-n">' + (i + 1) + "</span><div>" + gb(p.name, "h3") + gb(p.text, "p", "gp-t") + "</div></div>";
      }).join("") + "</div>");
      var origin = (h.register || []).filter(function (d) { return d.status === "origin"; });
      put("#ghbh-origin", origin.length ? registerList(origin) : "");
      put("#ghbh-system", gb(s.s2, "p", "ghbh-p") + ghbhFlow() + gb(s.fig_caption, "p", "ghbh-cap") +
        '<div class="ghbh-tiers">' + s.tiers.map(function (t, i) {
          return '<article class="ghbh-tier t-' + t.metal + '"><p class="gt-no"><span class="dot t-' + t.metal + '"></span>' + GU.tier[i] + "</p>" + gb(t.name, "h3", "gt-name") + '<p class="gt-code">' + esc(t.code.en) + "</p>" +
            '<dl class="gt-rows">' + t.rows.map(function (row) { return "<dt>" + gb(row[0], "span") + "</dt><dd>" + gb(row[1], "span") + "</dd>"; }).join("") + "</dl>" +
            "</article>";
        }).join("") + "</div>" + s.tiers.filter(function (t) { return t.review; }).map(function (t) {
          return '<section class="rv3"><span class="rv3-k">' + esc(t.name.en) + "</span>" + gb(t.review_title, "h3", "rv3-t") + '<ol class="rv3-row">' + t.review.map(function (x, i) {
            return (i ? '<li class="rv3-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8"/></svg></li>' : "") +
              '<li class="rv3-box"><span class="rv3-n">' + (i + 1) + "</span>" + gb(x[0], "p", "rv3-stage") + gb(x[1], "h4", "rv3-name") + gb(x[2], "p", "rv3-d") + "</li>"; }).join("") + "</ol></section>";
        }).join(""));
      put("#ghbh-archive-door", ghbhDoor(g, true));
      put("#ghbh-applicants", gb(s.s31_title, "h3", "ghbh-h") + gb(s.s31, "p", "ghbh-p") + '<ul class="ghbh-list">' + s.applicants.map(function (a) { return "<li>" + gb(a, "span") + "</li>"; }).join("") + "</ul>" +
        gb(s.s32_title, "h3", "ghbh-h") + gb(s.s32, "p", "ghbh-p") + gb(s.types_title, "p", "label ghbh-types-t") + '<div class="ghbh-types">' + s.types.map(function (t, i) {
          return '<div class="gty"><span class="gty-n">' + (i + 1) + "</span>" + gb(t[0], "h4") + '<p class="gty-en">' + esc(t[1].en) + "</p>" + gb(t[2], "p", "gty-d") + "</div>"; }).join("") + "</div>");
      put("#ghbh-fields", gb(s.s4, "p", "ghbh-p") + '<div class="w-table"><table class="table ghbh-ftable"><thead><tr><th>No.</th><th>' + bi(GU.field, "span") + "</th><th>" + bi(GU.desc, "span") + "</th></tr></thead><tbody>" +
        s.fields.map(function (f, i) { return "<tr><td>" + (i + 1) + "</td><td>" + gb(f[0], "b", "gf-fname") + "</td><td>" + gb(f[2], "span") + "</td></tr>"; }).join("") + "</tbody></table></div>");
      if (s.apply) put("#ghbh-apply", applyBlock(s.apply));
      put("#ghbh-charter-door", '<div class="ghbh-docs"><a href="charter.html"><span class="gdc-k">Charter</span>' + gb(g.charter.title, "b", "gdc-t") + gb(GU.charterSub, "span", "gdc-s") + "</a>" +
        '<a href="criteria.html"><span class="gdc-k">Criteria</span>' + gb(g.criteria.title, "b", "gdc-t") + gb(GU.criteriaSub, "span", "gdc-s") + "</a></div>");
    });
  };

  /* the charter and the criteria, set like a constitution */
  function constitution(doc, id, kicker) {
    var body = doc.body.map(function (n) {
      if (n.k === "part") return gb(n.text, "h3", "cn-part");
      if (n.k === "chapter") return gb(n.text, "h3", "cn-chapter");
      if (n.k === "article") return gb(n.text, "h4", "cn-article");
      if (n.k === "labelled") return gb(n.text, "p", "cn-clause cn-lab");
      if (n.k === "ul") return '<ul class="cn-items">' + n.items.map(function (x) { return "<li>" + gb(x, "span") + "</li>"; }).join("") + "</ul>";
      if (n.k === "ol") return '<ol class="cn-items cn-num">' + n.items.map(function (x) { return "<li>" + gb(x, "span") + "</li>"; }).join("") + "</ol>";
      return gb(n.text, "p", "cn-clause");
    }).join("");
    return '<article class="constitution" id="' + id + '"><p class="cn-kicker">' + esc(kicker) + '</p><img class="cn-seal" src="assets/img/emblem.webp" alt="">' +
      gb(doc.title, "h2", "cn-title") + '<div class="cn-rule"><span></span></div>' +
      (doc.meta ? '<div class="cn-meta">' + doc.meta.map(function (m) { return gb(m, "p"); }).join("") + "</div>" : "") +
      '<div class="cn-body">' + body + '</div><div class="cn-rule"><span></span></div><div class="cn-sign">' + doc.sign.map(function (m) { return gb(m, "p"); }).join("") + "</div></article>";
  }
  function docNav(on) {
    return '<nav class="cn-tabs"><a href="charter.html"' + (on === "charter" ? ' class="on" aria-current="page"' : "") + ">" + bi(GU.charterTab, "span", "", true) + '</a><a href="criteria.html"' + (on === "criteria" ? ' class="on" aria-current="page"' : "") + ">" + bi(GU.criteriaTab, "span", "", true) + "</a></nav>";
  }
  pages.charter = function () {
    load("ghbh").then(function (g) { put("#charter-docs", docNav("charter") + constitution(g.charter, "charter", "Global Human Barbecue Heritage")); });
  };
  pages.criteria = function () {
    load("ghbh").then(function (g) { put("#charter-docs", docNav("criteria") + constitution(g.criteria, "criteria", "Global Human Barbecue Heritage")); });
  };

  /* the archive: every name, found by search, continent and nation */
  pages.ghbharchive = function () {
    load("ghbh").then(function (g) {
      var arch = g.archive, state = { q: "", cont: "", nat: "" };
      var c = ghbhCounts(arch);
      var nats = {}; arch.forEach(function (r) { var k = r.custodian.ko; if (!nats[k]) nats[k] = { o: r.custodian, n: 0 }; nats[k].n++; });
      var natKeys = Object.keys(nats).sort(function (a, b) { return nats[a].o.en.localeCompare(nats[b].o.en, "en"); });
      put("#ga-head", gb(g.archive_title, "p", "ga-sub"));
      put("#ga-tools", '<div class="ga-tools"><input id="ga-q" type="search" placeholder="Search by name, native name, nation or ID" aria-label="Search the archive">' +
        '<div class="ga-conts" role="group" aria-label="Continent"><button type="button" data-c="" class="on">' + bi(GU.all, "span", "", true) + " <b>" + arch.length + "</b></button>" +
        CONT_ORDER.map(function (k) { return '<button type="button" data-c="' + k + '">' + bi(contObj(arch, k), "span", "", true) + " <b>" + (c.byCont[k] || 0) + "</b></button>"; }).join("") + "</div>" +
        '<select id="ga-nat" aria-label="Nation"></select></div>');
      function fillNations() {
        var sel = document.getElementById("ga-nat");
        sel.innerHTML = '<option value="">' + esc(GU.allNat.en + "  " + gs(GU.allNat)) + "</option>" + natKeys.map(function (k) {
          var o = nats[k].o; return '<option value="' + esc(k) + '"' + (state.nat === k ? " selected" : "") + ">" + esc(o.en + "  " + gs(o) + "  (" + nats[k].n + ")") + "</option>"; }).join("");
      }
      function hay(r) { var t = r.title, u = r.custodian; return [r.id, t.en, t.ko, t.ja, t.zh, r.native, u.en, u.ko, u.ja, u.zh].join(" ").toLowerCase(); }
      function draw() {
        var q = state.q.trim().toLowerCase();
        var list = arch.filter(function (r) {
          if (state.cont && r.continent.ko !== state.cont) return false;
          if (state.nat && r.custodian.ko !== state.nat) return false;
          if (q && hay(r).indexOf(q) < 0) return false;
          return true;
        });
        put("#ga-count", list.length + (list.length === arch.length ? "" : " / " + arch.length) + " records");
        put("#ga-list", list.length ? '<ol class="ga-list">' + list.map(function (r) {
          return '<li><a href="heritage-record.html?id=' + esc(r.id) + '"><span class="ga-id">' + esc(r.id) + '</span><span class="ga-name">' + bi(r.title, "span", "", true) + '</span><span class="ga-native">' + esc(r.native || "") + '</span><span class="ga-cus">' + bi(r.custodian, "span") + "</span></a></li>";
        }).join("") + "</ol>" : empty(GU.none));
      }
      fillNations(); draw();
      document.getElementById("ga-q").addEventListener("input", function (e) { state.q = e.target.value; draw(); });
      document.getElementById("ga-nat").addEventListener("change", function (e) { state.nat = e.target.value; draw(); });
      document.querySelectorAll(".ga-conts button").forEach(function (b) {
        b.addEventListener("click", function () { state.cont = b.getAttribute("data-c"); document.querySelectorAll(".ga-conts button").forEach(function (x) { x.classList.toggle("on", x === b); }); draw(); });
      });
      document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest(".lang-switch button")) setTimeout(fillNations, 0); });
    });
  };

  var ROSETTE = '<svg class="rosette" viewBox="0 0 200 290" aria-label="Bronze rosette of Global Human Barbecue Heritage, IOBSF" role="img"><defs><linearGradient id="rzp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3c79a"/><stop offset=".35" stop-color="#b9773f"/><stop offset=".7" stop-color="#7a4520"/><stop offset="1" stop-color="#4e2a12"/></linearGradient><linearGradient id="rzt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3016"/><stop offset=".45" stop-color="#d79a62"/><stop offset=".55" stop-color="#e8b27c"/><stop offset="1" stop-color="#5a3016"/></linearGradient><radialGradient id="rzm" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#f0c08e"/><stop offset=".55" stop-color="#a8683a"/><stop offset="1" stop-color="#5e3418"/></radialGradient><radialGradient id="rzc" cx=".4" cy=".32" r=".75"><stop offset="0" stop-color="#e9b47e"/><stop offset="1" stop-color="#7a4421"/></radialGradient><path id="rzTop" d="M 42.9 126.6 A 63 63 0 1 1 157.1 126.6"/><path id="rzBot" d="M 31 100 A 69 69 0 0 0 169 100"/></defs><path d="M70 150 L44 284 L66 266 L82 288 L102 160 Z" fill="url(#rzt)" stroke="#3e2210" stroke-width="1"/><path d="M130 150 L156 284 L134 266 L118 288 L98 160 Z" fill="url(#rzt)" stroke="#3e2210" stroke-width="1"/><polygon points="100.0,3.0 106.8,13.3 115.2,4.2 120.3,15.4 130.0,7.7 133.3,19.6 144.0,13.6 145.5,25.8 157.0,21.5 156.5,33.8 168.6,31.4 166.2,43.5 178.5,43.0 174.2,54.5 186.4,56.0 180.4,66.7 192.3,70.0 184.6,79.7 195.8,84.8 186.7,93.2 197.0,100.0 186.7,106.8 195.8,115.2 184.6,120.3 192.3,130.0 180.4,133.3 186.4,144.0 174.2,145.5 178.5,157.0 166.2,156.5 168.6,168.6 156.5,166.2 157.0,178.5 145.5,174.2 144.0,186.4 133.3,180.4 130.0,192.3 120.3,184.6 115.2,195.8 106.8,186.7 100.0,197.0 93.2,186.7 84.8,195.8 79.7,184.6 70.0,192.3 66.7,180.4 56.0,186.4 54.5,174.2 43.0,178.5 43.5,166.2 31.4,168.6 33.8,156.5 21.5,157.0 25.8,145.5 13.6,144.0 19.6,133.3 7.7,130.0 15.4,120.3 4.2,115.2 13.3,106.8 3.0,100.0 13.3,93.2 4.2,84.8 15.4,79.7 7.7,70.0 19.6,66.7 13.6,56.0 25.8,54.5 21.5,43.0 33.8,43.5 31.4,31.4 43.5,33.8 43.0,21.5 54.5,25.8 56.0,13.6 66.7,19.6 70.0,7.7 79.7,15.4 84.8,4.2 93.2,13.3" fill="url(#rzp)" stroke="#3e2210" stroke-width="1"/><circle cx="100" cy="100" r="80" fill="url(#rzm)" stroke="#3e2210" stroke-width="1.4"/><circle cx="100" cy="100" r="76" fill="none" stroke="#ffe1b8" stroke-opacity=".55" stroke-width="1"/><circle cx="100" cy="100" r="48" fill="url(#rzc)" stroke="#3e2210" stroke-width="1.4"/><circle cx="100" cy="100" r="44" fill="none" stroke="#ffe1b8" stroke-opacity=".5" stroke-width=".9"/><g class="rz-t" fill="#2e1808"><text font-size="10.2" letter-spacing=".9"><textPath href="#rzTop" startOffset="50%" text-anchor="middle">GLOBAL HUMAN BARBECUE HERITAGE</textPath></text><text font-size="15" letter-spacing="5"><textPath href="#rzBot" startOffset="50%" text-anchor="middle" dominant-baseline="hanging">IOBSF</textPath></text><text x="100" y="106" font-size="17" letter-spacing="2.2" text-anchor="middle" font-weight="700">BRONZE</text></g></svg>';
  /* the gold rosette of No. 0, the Origin: the bronze rosette recast in gold */
  var ROSETTE_GOLD = (function () {
    var c = { "#f3c79a": "#fff0b8", "#b9773f": "#e0b04a", "#7a4520": "#9c6f1a", "#4e2a12": "#5e4008", "#5a3016": "#6b4a0c", "#d79a62": "#f0cc6a", "#e8b27c": "#fde49a",
      "#f0c08e": "#fbe39a", "#a8683a": "#c9962e", "#5e3418": "#6e4c0e", "#e9b47e": "#f6d47a", "#7a4421": "#9a6c16", "#3e2210": "#4a3206", "#ffe1b8": "#fff6d6", "#2e1808": "#2a1a02" };
    return ROSETTE.replace(/#[0-9a-f]{6}/g, function (h) { return c[h] || h; })
      .replace(/"rz/g, '"gz').replace(/#rz/g, "#gz")
      .replace("Bronze rosette of Global Human Barbecue Heritage, IOBSF", "Gold rosette of the Heritage of the Fire, No. 0, the Origin, IOBSF")
      .replace("GLOBAL HUMAN BARBECUE HERITAGE", "HERITAGE OF THE FIRE").replace(">BRONZE<", ">ORIGIN<")
      .replace('class="rosette"', 'class="rosette rosette-gold"');
  })();
  /* the federation seal: sixteen characters in four columns, read from the right */
  function ghbhSeal(cls) {
    var line = function (y, t, size, w) { return '<text x="55" y="' + y + '" font-size="' + size + '" textLength="' + w + '" lengthAdjust="spacing">' + t + "</text>"; };
    return '<svg class="seal ' + (cls || "") + '" viewBox="0 0 110 110" aria-label="Official seal of the International Outdoor Barbecue Sports Federation" role="img">' +
      '<defs><filter id="sealrough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" result="d"/><feComponentTransfer in="n" result="m"><feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 0 1"/></feComponentTransfer>' +
      '<feComposite in="d" in2="m" operator="in"/></filter></defs>' +
      '<g filter="url(#sealrough)" fill="#b3261c"><rect x="4" y="4" width="102" height="102" rx="4" fill="none" stroke="#b3261c" stroke-width="5"/>' +
      '<rect x="11" y="11" width="88" height="88" rx="1.5" fill="none" stroke="#b3261c" stroke-width="1.3"/>' +
      '<g class="seal-t">' + line(25, "INTERNATIONAL OUTDOOR", 6.2, 84) + line(35.5, "BARBECUE SPORTS", 6.9, 68) + line(46, "FEDERATION", 6.9, 54) +
      '<rect x="22" y="51.5" width="66" height="1.2"/>' + line(73, "IOBSF", 21, 64) + '<rect x="22" y="79" width="66" height="1.2"/>' +
      line(92, "OFFICIAL SEAL", 7, 62) + "</g></g></svg>";
  }
  function ghbhPlaque(r) {
    var n = r.title.en.length, size = n > 26 ? " bp-long" : n > 16 ? " bp-mid" : "";
    return '<figure class="bp" aria-label="Plaque of ' + esc(r.title.en) + '"><div class="bp-cast">' +
      '<i class="bp-rivet r1"></i><i class="bp-rivet r2"></i><i class="bp-rivet r3"></i><i class="bp-rivet r4"></i>' +
      '<div class="bp-field"><div class="bp-frame"><div class="bp-body">' +
        '<p class="bp-tier">Global Human Barbecue Heritage</p>' +
        '<p class="bp-status">' + esc(r.status.en) + "</p>" +
        '<img class="bp-emblem" src="assets/img/emblem.webp" alt="">' +
        '<p class="bp-rule"><span></span></p>' +
        '<p class="bp-recno"><span>Record No.</span>' + esc(r.id) + "</p>" +
        '<h2 class="bp-name' + size + '">' + esc(r.title.en) + "</h2>" +
        (r.native && r.native !== r.title.en ? '<p class="bp-native">' + esc(r.native) + "</p>" : "") +
        '<p class="bp-cus' + (r.custodian.en.length > 22 ? " bp-cus-long" : "") + '"><span>Custodian</span>' + esc(r.custodian.en) + "</p>" +
        '<p class="bp-rule"><span></span></p>' +
        '<p class="bp-cert">Recorded in the Federation Archive of Global Human Barbecue Heritage under the Charter of 24 October 2026</p>' +
        '<div class="bp-foot">' + ROSETTE + '<div class="bp-no"><span>24 October 2026</span><span class="bp-by">IOBSF &amp; KBRI</span></div>' + ghbhSeal("bp-seal") + "</div>" +
        '<p class="bp-fed">International Outdoor<br>Barbecue Sports Federation</p>' +
      "</div></div></div></div></figure>";
  }
  function ghbhSign(r) {
    var d = new Date(), iso = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
    return '<section class="gr-sign">' +
      gb({ en: "This is to certify that the heritage above is recorded in the Federation Archive of Global Human Barbecue Heritage under record number " + r.id + ".",
           ko: "위 유산이 세계인류바비큐유산 연맹기록유산 아카이브에 기록번호 " + r.id + "로 기록되어 있음을 증명한다.",
           ja: "上記の遺産が世界人類バーベキュー遺産の連盟記録遺産アーカイブに記録番号 " + r.id + " として記録されていることを証明する。",
           zh: "兹证明上述遗产已以记录编号 " + r.id + " 载入世界人类烧烤遗产联盟记录遗产档案。" }, "p", "gr-sign-t") +
      '<p class="gr-sign-date">Issued <span class="gr-sign-iso">' + iso + "</span></p>" +
      '<div class="gr-sign-block"><p class="gr-sign-fed">International Outdoor Barbecue Sports Federation</p><p class="gr-sign-role">Secretary-General</p>' +
      '<div class="gr-sign-row"><span class="gr-sig">Shaka Chaa</span>' + ghbhSeal("gr-sign-seal") + "</div>" +
      '<span class="gr-sign-line"></span><p class="gr-sign-name">Shaka Chaa</p></div></section>';
  }

  /* the humanist narrative of a record: English first, the chosen second language beneath when it exists */
  function ghbhStory(r) {
    var o = r.narrative; if (!o || !o.en) return "";
    var H = { en: "The Story of the Fire", ko: "불 곁의 이야기", ja: "火のほとりの物語", zh: "火边的故事" };
    var S = { en: "Sources", ko: "근거 자료", ja: "典拠", zh: "资料来源" };
    var h = '<p class="p" lang="en">' + esc(o.en) + "</p>";
    SECONDS.forEach(function (k) { if (o[k]) h += '<p class="s" lang="' + k + '">' + esc(o[k]) + "</p>"; });
    var src = (r.narrative_sources || []).map(function (u) {
      var t = u.replace(/^https?:\/\/(www\.)?/i, ""); try { t = decodeURIComponent(t); } catch (e) {}
      return '<li><a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t.length > 72 ? t.slice(0, 72) + "\u2026" : t) + "</a></li>"; }).join("");
    return '<section class="gr-story"><h2 class="gr-story-h">' + bi(H, "span", "", true) + "</h2>" +
      '<div class="bi gb gr-story-t">' + h + "</div>" +
      (src ? '<details class="gr-src"><summary>' + bi(S, "span", "", true) + "</summary><ol>" + src + "</ol></details>" : "") + "</section>";
  }

  /* one record: the ten standard fields */
  pages.ghbhrecord = function () {
    load("ghbh").then(function (g) {
      var id = param("id"), r = g.archive.filter(function (x) { return x.id === id; })[0];
      if (!r) { put("#gr", empty({ en: "This record was not found.", ko: "기록을 찾을 수 없다.", ja: "記録が見つからない。", zh: "未找到该记录。" })); return; }
      document.title = r.title.en + " | " + r.id + " | IOBSF";
      var F = g.standard.fields, v = [r.id, r.status, r.track, r.title, r.native, r.custodian, r.criteria.en, r.technique, r.trajectory, r.fragments];
      var i = g.archive.indexOf(r), prev = g.archive[i - 1], next = g.archive[i + 1];
      var PR = { en: "Print this record", ko: "이 기록 인쇄", ja: "この記録を印刷", zh: "打印此记录" };
      put("#gr", '<p class="w-crumb"><a href="heritage.html">Global Human Barbecue Heritage</a> / <a href="heritage-archive.html">Archive</a></p>' +
        '<div class="gr-grid"><div class="gr-head"><p class="gr-id"><span class="dot t-bronze"></span>' + esc(r.id) + "  " + bi(r.status, "span", "", true) + "</p>" + gb(r.title, "h1", "gr-title") + (r.native ? '<p class="gr-native">' + esc(r.native) + "</p>" : "") + "</div>" +
        '<aside class="gr-side">' + ghbhPlaque(r) + "</aside>" +
        '<div class="gr-print-title"><p class="gr-id">' + esc(r.id) + "  " + bi(r.status, "span", "", true) + "</p>" + gb(r.title, "h1", "gr-title") + (r.native ? '<p class="gr-native">' + esc(r.native) + "</p>" : "") + "</div>" +
        ghbhStory(r) +
        '<dl class="gr-fields">' + F.map(function (f, k) {
          var val = v[k] && typeof v[k] === "object" ? gb(v[k], "span") : esc(v[k] || "");
          return '<div><dt><span class="gr-n">' + (k + 1) + "</span>" + gb(f[0], "span") + "</dt><dd>" + val + "</dd></div>"; }).join("") + "</dl></div>" +
        '<p class="gr-printline"><button type="button" class="gr-print" id="gr-print"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M7 14h10v7H7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' + bi(PR, "span", "", true) + "</button></p>" +
        ghbhSign(r) +
        '<p class="gr-printfoot">International Outdoor Barbecue Sports Federation (IOBSF) &amp; Korea Barbecue Research &amp; Institute (KBRI)  |  iobsf.org/heritage-record.html?id=' + esc(r.id) + "</p>" +
        '<nav class="gr-nav">' + (prev ? '<a href="heritage-record.html?id=' + esc(prev.id) + '">&larr; ' + esc(prev.id) + " " + bi(prev.title, "span", "", true) + "</a>" : "<span></span>") +
        '<a href="heritage-archive.html">' + bi(GU.list, "span", "", true) + "</a>" + (next ? '<a href="heritage-record.html?id=' + esc(next.id) + '">' + esc(next.id) + " " + bi(next.title, "span", "", true) + " &rarr;</a>" : "<span></span>") + "</nav>");
      var fontReady = document.fonts && document.fonts.load ? document.fonts.load('42px "Pinyon Script"', "Shaka Chaa") : Promise.resolve();
      var pb = document.getElementById("gr-print"); if (pb) pb.addEventListener("click", function () { fontReady.then(function () { window.print(); }, function () { window.print(); }); });
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
      if (d.status === "record" && d.record_no) mark = "Federation Recorded Heritage " + '<span class="nowrap">' + esc(d.record_no) + "</span>";
      var withPlaque = !brief && d.status === "origin" && d.inscription;
      return '<div class="heritage-item' + (d.status === "origin" ? " is-origin" : "") + (withPlaque ? " has-plaque" : "") + '">' + (withPlaque ? '<div class="origin-body">' : "") + '<div class="h-mark' + (d.status === "origin" ? " is-designated" : "") + '">' + (metal ? '<span class="dot t-' + metal + '"></span>' : "") + mark + "</div>" +
        '<div class="dish-name"><a class="h-link" href="heritage-item.html?id=' + esc(d.id) + '">' + esc(en(d.name)) + "</a>" + (d.original && d.original !== en(d.name) ? '<span class="orig">' + esc(d.original) + "</span>" : "") + "</div>" +
        bi({ ko: d.name.ko, ja: d.name.ja, zh: d.name.zh }, "div") +
        '<div class="h-community">' + bi(d.community) + (d.era ? bi(d.era, "div", "h-era") : "") + "</div>" + formLine(d) +
        (brief ? "" : bi(d.text, "div", "h-text") + src) + (withPlaque ? '</div><a class="origin-plaque" href="heritage-item.html?id=' + esc(d.id) + '" aria-label="Plaque of ' + esc(en(d.name)) + '">' + plaque(d, "gold mini") + "</a>" : "") + "</div>";
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
    var nt = "navigate";
    try { var ne = performance.getEntriesByType("navigation")[0]; if (ne) nt = ne.type; else if (performance.navigation) nt = performance.navigation.type === 1 ? "reload" : performance.navigation.type === 2 ? "back_forward" : "navigate"; } catch (e) {}
    var y = 0;
    /* only a reload or back/forward returns to the old position; a link (the emblem included) always opens at the top */
    if (nt === "reload" || nt === "back_forward") { try { y = parseInt(sessionStorage.getItem(SKEY) || "0", 10) || 0; } catch (e) {} }
    else { try { sessionStorage.removeItem(SKEY); } catch (e) {} }
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
