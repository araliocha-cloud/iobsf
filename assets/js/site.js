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
  function bi(o, tag, cls, inline) {
    tag = tag || "div";
    if (!o || typeof o !== "object") return "<" + tag + (cls ? ' class="' + cls + '"' : "") + ">" + esc(o) + "</" + tag + ">";
    var h = '<span class="p" lang="en">' + esc(o.en || "") + "</span>";
    var sTag = inline ? "span" : "span";
    SECONDS.forEach(function (k) {
      if (o[k]) h += "<" + sTag + ' class="s" lang="' + k + '">' + esc(o[k]) + "</" + sTag + ">";
    });
    return "<" + tag + ' class="bi' + (inline ? " inline" : "") + (cls ? " " + cls : "") + '">' + h + "</" + tag + ">";
  }

  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(name + ".json " + r.status);
        return r.json();
      });
    }
    return cache[name];
  }
  function byId(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
  function nationName(nations, code) {
    var n = nations.filter(function (x) { return x.code === code; })[0];
    return n ? n.name : { en: code };
  }
  function param(k) { return new URLSearchParams(location.search).get(k); }
  function initials(name) { return en(name).split(/\s+/).map(function (w) { return w[0] || ""; }).join("").slice(0, 2); }
  function sampleBadge(x) { return x && x.sample ? '<span class="badge">Sample</span>' : ""; }
  function empty(o) { return '<div class="empty">' + bi(o) + "</div>"; }
  function fmtDate(e) {
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
        "<div>" +
          '<div class="f-name">' + esc(f.name.en) + "</div>" + bi({ ko: f.name.ko, ja: f.name.ja, zh: f.name.zh, en: "" }) +
          '<div class="f-slogan">' + esc(site.statements.slogan.text.en) + "</div>" +
        "</div>" +
        "<div>" + links + "</div>" +
        "<div>" + bi(site.statements.motto.text, "div", "f-motto") + "</div>" +
        '<div class="f-bottom">Founded 8 December 2018, Seoul. Headquarters: Republic of Korea.</div>' +
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
      "</div>");

    put("#home-spirit",
      '<div class="statement">' +
        '<p class="label">' + esc(st.spirit.label.en) + "</p>" +
        bi(st.spirit.text, "p", "text") +
        '<p style="margin-top:28px"><a class="more" href="fire.html">Read the Federation declaration</a></p>' +
      "</div>");

    Promise.all([load("rankings"), load("barbecuers"), load("events"), load("nations")]).then(function (r) {
      var rk = r[0], bb = r[1].barbecuers, ev = r[2], na = r[3].nations;
      put("#home-rankings", rankingTable(rk, bb, na, 5));
      var up = ev.events.filter(function (e) { return e.status === "upcoming"; })
        .sort(function (a, b) { return (a.date || a.year) > (b.date || b.year) ? 1 : -1; });
      put("#home-next", up.length ? eventRows(up.slice(0, 3), ev, na)
        : empty({ en: "The next sanctioned event will be announced here.", ko: "다음 공인 대회가 이곳에 발표된다." }));
      put("#home-roster", roster(bb.slice(0, 4), na));
    });
    load("heritage").then(function (h) { put("#home-heritage-intro", bi(h.intro, "div", "lede")); put("#home-register", registerList(h.register, true)); });
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
      put("#hall", hof.length ? roster(hof, na) : empty({ en: "The Hall of Fame awaits its first officiant.", ko: "명예의 전당은 첫 집전자를 기다린다." }));
    });
  };

  pages.barbecuer = function () {
    Promise.all([load("barbecuers"), load("nations"), load("events"), load("rankings")]).then(function (r) {
      var b = byId(r[0].barbecuers, param("id")), na = r[1].nations, ev = r[2], rk = r[3];
      if (!b) { put("#person", empty({ en: "This Pro Barbecuer could not be found. Return to the roster.", ko: "해당 프로바비큐어를 찾을 수 없다. 명단으로 돌아가라." }) + '<p><a href="barbecuers.html">Pro Barbecuers</a></p>'); return; }
      document.title = en(b.name) + " | IOBSF";
      var honors = rk.honors_def.map(function (h) {
        return "<dt>" + bi(h.name, "span", "", true) + "</dt><dd>" + (b.honors && b.honors[h.key] || 0) + "</dd>";
      }).join("");
      var recs = (b.records || []).map(function (x) {
        var e = byId(ev.events, x.event);
        return "<tr><td>" + (e ? '<a href="event.html?id=' + e.id + '">' + esc(en(e.name)) + "</a>" : esc(x.event)) + '</td><td class="num">' + esc(x.result) + "</td><td>" + esc(x.note || "") + "</td></tr>";
      }).join("");
      put("#person",
        '<div class="split">' +
          '<div class="person"><div class="portrait">' + (b.photo ? '<img src="' + esc(b.photo) + '" alt="">' : "<span>" + esc(initials(b.name)) + "</span>") + "</div></div>" +
          "<div>" +
            "<h1>" + esc(en(b.name)) + sampleBadge(b) + bi({ ko: b.name.ko, ja: b.name.ja, zh: b.name.zh }, "span") + "</h1>" +
            '<p class="person"><span class="meta">' + esc(en(nationName(na, b.nation))) + (b.certified ? ", certified " + b.certified : "") + "</span></p>" +
            '<h3 style="margin-top:36px">Officiant\'s Statement</h3>' + bi(b.statement, "div", "prose lede") +
            '<h3 style="margin-top:36px">Profile</h3>' + bi(b.bio, "div", "prose") +
            '<h3 style="margin-top:36px">Honours</h3><dl class="facts" style="margin-top:14px">' + honors + "</dl>" +
            '<h3 style="margin-top:36px">Pledge</h3><p>' + (b.pledge_signed ? "Charter pledge signed " + esc(b.pledge_signed) : '<span style="color:var(--ash)">Charter pledge pending.</span>') + "</p>" +
          "</div>" +
        "</div>" +
        '<div class="section"><h2>Records</h2><div style="margin-top:24px">' +
          (recs ? '<div class="table-scroll"><table class="table"><thead><tr><th>Event</th><th class="num">Result</th><th>Note</th></tr></thead><tbody>' + recs + "</tbody></table></div>"
                : empty({ en: "No sanctioned records yet.", ko: "아직 공인 기록이 없다." })) +
        "</div></div>");
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
      var up = ev.events.filter(function (e) { return e.status === "upcoming"; });
      var past = ev.events.filter(function (e) { return e.status === "completed"; }).sort(function (a, b) { return (b.date || b.year) > (a.date || a.year) ? 1 : -1; });
      put("#events-up", up.length ? eventRows(up, ev, na) : empty({ en: "The next sanctioned event will be announced here.", ko: "다음 공인 대회가 이곳에 발표된다." }));
      put("#events-past", past.length ? eventRows(past, ev, na) : empty({ en: "No results yet.", ko: "아직 결과가 없다." }));
      put("#ritual", ritualList(ev.ritual_stages, null, true));
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
        '<div class="section"><h2>The Ritual</h2><div style="margin-top:28px">' + ritualList(ev.ritual_stages, e.ritual, false) + "</div></div>" +
        '<div class="section"><h2>Results</h2><div style="margin-top:24px">' +
          (results ? '<div class="table-scroll"><table class="table"><thead><tr><th>Rank</th><th>Pro Barbecuer or team</th><th class="num">Score</th></tr></thead><tbody>' + results + "</tbody></table></div>" : empty({ en: "Results will be recorded after judgment.", ko: "판정 후 결과를 기록한다." })) +
          (e.acclaimed_by ? '<p style="margin-top:20px">Glory conferred by ' + esc(e.acclaimed_by) + ".</p>" : "") +
        "</div></div>" +
        '<div class="section"><h2>The Table' + bi({ ko: "공동의 식탁", ja: "", zh: "" }, "span") + '</h2><p class="prose" style="margin-top:16px;color:var(--ash)">Every team that kept the fire, in its own words.</p><div style="margin-top:24px">' +
          (table || empty({ en: "The stories of every team will be recorded here.", ko: "모든 참가팀의 이야기가 이곳에 기록된다." })) +
        "</div></div>");
    });
  };

  pages.pathway = function () {
    load("pathway").then(function (p) {
      put("#pathway-intro", bi(p.intro, "div", "lede"));
      put("#pathway", '<ol class="sequence">' + p.steps.map(function (s) {
        return "<li><h3>" + esc(en(s.name)) + (s.status === "preparing" ? '<span class="badge">In preparation</span>' : "") + bi({ ko: s.name.ko, ja: s.name.ja, zh: s.name.zh }, "span") + "</h3>" + bi(s.text, "p") + "</li>";
      }).join("") + "</ol>");
    });
  };

  pages.heritage = function () {
    load("heritage").then(function (h) {
      put("#heritage-intro", bi(h.intro, "div", "lede"));
      put("#heritage-principle", '<div class="statement"><p class="label">Principle</p>' + bi(h.principle, "p", "text") + "</div>");
      put("#heritage-criteria", '<dl class="facts">' + h.criteria.map(function (c) {
        return "<dt>" + bi(c.name, "span", "", true) + "</dt><dd>" + bi(c.text) + "</dd>";
      }).join("") + "</dl>");
      put("#heritage-process", '<ol class="sequence compact three">' + h.process.map(function (x) {
        return "<li><h3>" + esc(x.name.en) + "</h3>" + bi({ ko: x.name.ko, ja: x.name.ja, zh: x.name.zh }, "div") + bi(x.text, "p") + "</li>";
      }).join("") + "</ol>");
      var ins = h.register.filter(function (d) { return d.status !== "record"; });
      var rec = h.register.filter(function (d) { return d.status === "record"; });
      put("#heritage-register", registerList(ins));
      put("#heritage-records", registerList(rec));
      put("#heritage-archives", h.archives.map(function (a) {
        return '<div class="nation-block"><h3>' + esc(a.name.en) + bi({ ko: a.name.ko, ja: a.name.ja, zh: a.name.zh }, "span") + "</h3><div>" + bi(a.text, "div", "prose") +
          '<div style="margin-top:18px">' + (a.entries.length ? a.entries.map(function (x) {
            return '<p style="margin:0 0 10px"><a href="' + esc(x.href || "#") + '">' + esc(en(x.title)) + "</a>" + (x.date ? ' <span style="color:var(--ash)">' + esc(x.date) + "</span>" : "") + "</p>";
          }).join("") : '<p style="color:var(--ash);margin:0">Records will be published here.</p>') + "</div></div></div>";
      }).join(""));
    });
  };

  pages.chronicle = function () {
    load("chronicle").then(function (c) {
      put("#chronicle-intro", bi(c.intro, "div", "lede"));
      put("#chronicle", c.stories.length ? c.stories.map(function (s) {
        return '<article class="dish" style="margin-bottom:48px"><p style="color:var(--ash);margin:0">' + esc(s.date || "") + "</p><h2>" + esc(en(s.title)) + "</h2>" + bi(s.text, "div", "prose") + "</article>";
      }).join("") : empty({ en: "Stories from the fire will be published here after each event.", ko: "대회가 끝날 때마다 불 앞의 이야기가 이곳에 실린다." }));
    });
  };

  pages.federation = function (site) {
    var st = site.statements, f = site.federation;
    put("#fed-facts",
      '<dl class="facts">' +
        "<dt>Name</dt><dd>" + bi(f.name) + "</dd>" +
        "<dt>Founded</dt><dd>" + bi({ en: "8 December 2018, " + f.founded_place.en, ko: "2018년 12월 8일, " + f.founded_place.ko }) + "</dd>" +
        "<dt>Headquarters</dt><dd>" + bi(f.headquarters) + "</dd>" +
        "<dt>" + esc(st.mission.label.en) + "</dt><dd>" + bi(st.mission.text) + "</dd>" +
      "</dl>");
    load("nations").then(function (n) { put("#fed-members", nationsStrip(n.nations)); });
    load("history").then(function (hi) {
      put("#history", '<ol class="timeline">' + hi.entries.slice().sort(function (a, b) { return a.year - b.year; }).map(function (x) {
        return '<li><div class="year">' + x.year + "</div>" + bi(x.text) + "</li>";
      }).join("") + "</ol>");
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
      return '<a class="event-row" href="event.html?id=' + e.id + '"><div class="when">' + esc(fmtDate(e)) + '</div><div><div class="title">' + esc(en(e.name)) + '</div><div class="where">' + esc(en(e.place)) + '</div></div><div class="tier">' + esc(en(ev.tiers[e.tier] || "")) + "</div></a>";
    }).join("");
  }
  function roster(list, na) {
    if (!list.length) return empty({ en: "Certified Pro Barbecuers will be listed here.", ko: "인증된 프로바비큐어가 이곳에 오른다." });
    return '<div class="roster">' + list.map(function (b) {
      return '<a class="person" href="barbecuer.html?id=' + b.id + '"><div class="portrait">' + (b.photo ? '<img src="' + esc(b.photo) + '" alt="">' : "<span>" + esc(initials(b.name)) + "</span>") + "</div>" +
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
  function registerList(reg, brief) {
    if (!reg.length) return empty({ en: "The first designations will be announced here.", ko: "첫 지정 유산이 이곳에 발표된다." });
    return '<div class="register">' + reg.map(function (d) {
      var mark = d.status === "origin" ? "No. 0, Origin" : d.status === "inscribed" ? "Inscribed No. " + esc(d.number) : "Federation Record";
      var src = (!brief && d.sources && d.sources.length) ? '<div class="h-sources">Sources: ' + d.sources.map(function (x) { return '<a href="' + esc(x.href) + '">' + esc(x.title) + "</a>"; }).join(", ") + "</div>" : "";
      return '<div class="heritage-item' + (d.status === "origin" ? " is-origin" : "") + '"><div class="h-mark' + (d.status !== "record" ? " is-designated" : "") + '">' + mark + "</div>" +
        '<div class="dish-name">' + esc(en(d.name)) + (d.original && d.original !== en(d.name) ? '<span class="orig">' + esc(d.original) + "</span>" : "") + "</div>" +
        bi({ ko: d.name.ko, ja: d.name.ja, zh: d.name.zh }, "div") +
        '<div class="h-community">' + bi(d.community) + (d.era ? bi(d.era, "div", "h-era") : "") + "</div>" +
        (brief ? "" : bi(d.text, "div", "h-text") + src) + "</div>";
    }).join("") + "</div>";
  }
  function nationsStrip(na) {
    return '<div class="nations">' + na.map(function (n) {
      return "<div>" + bi(n.name, "div", "n-name") + '<div class="n-org">' + (n.site ? '<a href="' + esc(n.site) + '">' + esc(n.member_org) + "</a>" : esc(n.member_org || "Member federation")) + (n.hq ? ". Headquarters" : "") + "</div></div>";
    }).join("") + "</div>";
  }

  /* ---------- boot ---------- */
  load("site").then(function (site) {
    renderChrome(site);
    var fn = pages[document.body.dataset.page];
    if (fn) fn(site);
  }).catch(function (err) {
    var m = document.createElement("p");
    m.className = "noscript";
    m.textContent = "Content could not be loaded (" + err.message + "). Check that the data folder is published with the site.";
    document.body.appendChild(m);
  });
})();
