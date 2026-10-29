import sys, pathlib

root = pathlib.Path(sys.argv[1])
import time
VERSION = time.strftime('%Y%m%d%H%M')

HEAD = """<!doctype html>
<html lang="en" data-second="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://iobsf.org/{file}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="IOBSF, International Outdoor Barbecue Sports Federation">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="https://iobsf.org/{file}">
<meta property="og:image" content="https://iobsf.org/assets/img/emblem.png">
<meta name="twitter:card" content="summary">
{jsonld}
<link rel="icon" href="assets/img/emblem-small.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,500&family=EB+Garamond:wght@400;500&family=Noto+Serif+KR:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&family=Noto+Serif+SC:wght@400;500;700&display=swap" rel="stylesheet">
<script>/* before anything is drawn: the chosen language, and the veil that keeps a reload from being seen to move */(function(d){{var l="en";try{{l=localStorage.getItem("iobsf-lang")}}catch(e){{}}if(["en","ko","ja","zh"].indexOf(l)<0)l="en";d.setAttribute("data-second",l);d.setAttribute("lang",l==="zh"?"zh-CN":l);try{{if("scrollRestoration"in history)history.scrollRestoration="manual"}}catch(e){{}}var t="navigate";try{{var n=performance.getEntriesByType("navigation")[0];if(n)t=n.type}}catch(e){{}}if(t==="reload"||t==="back_forward"){{d.classList.add("iobsf-return");var y=0;try{{y=+sessionStorage.getItem("iobsf-scroll:"+location.pathname+location.search)||0}}catch(e){{}}if(y>0||location.hash){{d.classList.add("iobsf-veil");setTimeout(function(){{d.classList.remove("iobsf-veil")}},5000)}}}}}})(document.documentElement);</script>
<link rel="stylesheet" href="assets/css/site.css?v=VERSION">
</head>
<body data-page="{page}">
<header id="site-header"></header>
<main>
{main}
</main>
<footer id="site-footer"></footer>
<noscript><p class="noscript">This site needs JavaScript to show its content.</p></noscript>
<script src="assets/js/site.js?v=VERSION"></script>
</body>
</html>
"""

def head(h1, ko, lede_id=None, lede_html=""):
    lede = f'<div id="{lede_id}"></div>' if lede_id else lede_html
    return f"""<section class="page-head"><div class="wrap">
<h1><span class="p">{h1}</span><span class="bi"><span class="s" lang="ko">{ko}</span></span></h1>
{lede}
</div></section>"""

def section(title, ko, inner, extra=""):
    return f"""<section class="section"><div class="wrap">
<div class="section-head"><h2 class="bi"><span class="p">{title}</span><span class="s" lang="ko">{ko}</span></h2>{extra}</div>
{inner}
</div></section>"""

D = "The International Outdoor Barbecue Sports Federation (IOBSF) connects the Sports Barbecue cultures of the world, raises Pro Barbecuers and records the barbecue heritage of humankind."

DESC = {
 "index": D,
 "fire": "The founding thought of IOBSF: the motto, the Spirit of the Game, the Pro Barbecuer's Creed and the mission of the Federation.",
 "barbecuers": "Pro Barbecuers of IOBSF: certified officiants of Sports Barbecue, their statements, records and the Hall of Fame.",
 "barbecuer": "Profile of an IOBSF Pro Barbecuer.",
 "rankings": "IOBSF season rankings for Pro Barbecuers and the Honours of Distribution.",
 "events": "IOBSF sanctioned Sports Barbecue events, the eight-stage ritual of every event, and results.",
 "event": "An IOBSF Sports Barbecue event.",
 "pathway": "How a Pro Barbecuer is raised: Beginner, Intermediate and Advanced amateur courses, then Semi-Pro and Pro; and how judges are selected.",
 "heritage": "Global Human Barbecue Heritage (GHBH): the IOBSF archive and register of the barbecue heritage of humankind, beyond borders and ownership.",
 "charter": "The Charter of Global Human Barbecue Heritage, enacted by IOBSF and KBRI on 24 October 2026.",
 "criteria": "The Criteria for Inscription on the Global Human Barbecue Heritage List, enacted by IOBSF and KBRI on 24 October 2026.",
 "heritage-archive": "Federation Archived Heritage: 163 pure-fire barbecue traditions of humankind in the IOBSF archive.",
 "heritage-record": "A record in the Global Human Barbecue Heritage archive, in ten standard fields.",
 "heritage-item": "A record in the IOBSF Heritage of the Fire register.",
 "chronicle": "Stories from the fire at IOBSF events.",
 "federation": "About IOBSF: founding members, institutions, history and charter.",
 "partners": "Partner with IOBSF, the International Outdoor Barbecue Sports Federation.",
 "business": "The IOBSF Business Desk: event hosting and sanctioning, equipment certification, partnership, Pro Barbecuer education, research and advisory.",
 "writing": "An essay from the IOBSF archives, by Shaka Chaa.",
 "archives": "The IOBSF archives: barbecue humanities, civilization history and the histories of the nations' fires, with essays, books and papers by Shaka Chaa and KBRI.",
 "404": D,
}
JSONLD = """<script type="application/ld+json">{"@context":"https://schema.org","@type":"SportsOrganization","name":"International Outdoor Barbecue Sports Federation","alternateName":["IOBSF","International Outdoor & Barbecue Sports Federation","국제아웃도어바비큐스포츠연맹"],"url":"https://iobsf.org/","logo":"https://iobsf.org/assets/img/emblem.png","foundingDate":"2018-12-08","slogan":"DO NOT DO IF NOT FUN","sport":"Sports Barbecue","sameAs":["https://professionalbarbecuer.com","https://kooba.kr"]}</script>"""

pages = {
"index": ("IOBSF | International Outdoor Barbecue Sports Federation", "home",
  '<section class="hero" id="hero"></section>\n'
  '<section class="section"><div class="wrap" id="home-spirit"></div></section>\n'
  + section("Next Events", "다가오는 대회", '<div id="home-next"></div>', '<a class="more" href="events.html">All events</a>') + "\n"
  + section("Pro Barbecuers", "프로바비큐어", '<div id="home-roster"></div>', '<a class="more" href="barbecuers.html">All Pro Barbecuers</a>') + "\n"
  + section("Global Human Barbecue Heritage", "세계인류바비큐유산", '<div id="home-heritage-intro" class="prose" style="margin-bottom:32px"></div><div id="home-register"></div>', '<a class="more" href="heritage.html">Explore the heritage</a>')
  + '\n<section class="section home-business"><div class="wrap" id="home-business"></div></section>'),

"fire": ("The Fire | IOBSF", "fire",
  head("The Fire", "불") + '<section class="section"><div class="wrap" id="fire-body"></div></section>'),

"barbecuers": ("Pro Barbecuers | IOBSF", "barbecuers",
  head("Pro Barbecuers", "프로바비큐어", lede_html='<div class="lede bi"><span class="p">Officiants of the fire. Each one has signed the Charter and keeps it.</span><span class="s" lang="ko">불의 집전자들. 모두 헌장에 서약하고 그것을 지킨다.</span></div>')
  + section("Roster", "명단", '<div id="roster"></div>')
  + section("Hall of Fame", "명예의 전당", '<div id="hall"></div>')),

"barbecuer": ("Pro Barbecuer | IOBSF", "barbecuer",
  '<section class="page-head"><div class="wrap" id="person"></div></section>'),

"rankings": ("Rankings | IOBSF", "rankings",
  head("Rankings", "순위", lede_html='<p class="lede" id="rank-season"></p>')
  + '<section class="section"><div class="wrap" id="rank-creed"></div></section>'
  + section("Season Points", "시즌 포인트", '<div id="rank-note" style="margin-bottom:28px;color:var(--ash)"></div><div id="rank-table"></div>')
  + section("Honours of Distribution", "분배의 명예", '<div class="prose" style="margin-bottom:28px;color:var(--ash)"><div class="bi"><span class="p">Dignity, Endurance, Participation and Contribution. Recognised alongside the points, not instead of them.</span><span class="s" lang="ko">존엄, 감내, 참여, 기여. 포인트와 나란히 기리는 명예.</span></div></div><div id="rank-honors"></div>')),

"events": ("Events | IOBSF", "events",
  head("Events", "대회")
  + '<section class="section"><div class="wrap" id="events-creed"></div></section>'
  + section("Federation Events", "연맹 대회", '<div id="events-up"></div>')
  + section("The Ritual of Every Event", "모든 대회의 의례", '<div class="prose" style="margin-bottom:36px;color:var(--ash)"><div class="bi"><span class="p">Every sanctioned event follows the same eight stages, from entry to the promise to return.</span><span class="s" lang="ko">모든 공인 대회는 입장에서 재회 약속까지 같은 여덟 단계를 따른다.</span></div></div><div id="ritual"></div>')
  + section("Member Nation: Korea", "회원국 한국의 대회", '<div id="events-past"></div>')
  + section("Member Nation: Korea, Official Judges", "회원국 한국의 공식 심판", '<div id="events-judges"></div>')),

"event": ("Event | IOBSF", "event",
  '<section class="page-head"><div class="wrap" id="event"></div></section>'),

"pathway": ("Pathway | IOBSF", "pathway",
  head("Pathway", "육성 과정", lede_id="pathway-intro")
  + '<section class="section"><div class="wrap" id="pathway"></div></section>'
  + '<section class="section" id="judges"><div class="wrap"><div class="section-head"><h2 class="bi"><span class="p">Judges</span><span class="s" lang="ko">심판 과정</span></h2></div><div id="pathway-judges"></div></div></section>'
  + section("Academy Reading", "아카데미 기초 읽기", '<div id="pathway-reading"></div>')),

"heritage": ("Global Human Barbecue Heritage | IOBSF", "heritage",
  '<section class="heritage-hero ghbh-hero"><img class="hero-emblem" src="assets/img/emblem.webp" alt="IOBSF emblem">'
  '<h1><span class="p">Global Human Barbecue Heritage</span><span class="bi"><span class="s" lang="ko">세계인류바비큐유산 (GHBH)</span></span></h1>'
  '<div id="ghbh-intro" class="wrap"></div></section>'
  + section("Origin", "원점", '<div id="ghbh-origin"></div>')
  + section("Three Forms of Heritage", "3가지 유산 형태 및 관리 체계", '<div id="ghbh-system"></div>')
  + section("The Archive", "연맹기록유산 아카이브", '<div id="ghbh-archive-door"></div>')
  + section("Applicants and Techniques", "글로벌 등재 신청 주체 및 심사 평가 다변화", '<div id="ghbh-applicants"></div>')
  + section("Ten Standard Fields", "유산 아카이빙 데이터베이스 10대 표준 필드", '<div id="ghbh-fields"></div>')
  + section("Charter and Criteria", "헌장과 등재기준", '<div id="ghbh-charter-door"></div>')),

"charter": ("Charter of Global Human Barbecue Heritage | IOBSF", "charter",
  '<section class="section charter-page"><div class="wrap" id="charter-docs"></div></section>'),

"criteria": ("Criteria for Inscription | Global Human Barbecue Heritage | IOBSF", "criteria",
  '<section class="section charter-page"><div class="wrap" id="charter-docs"></div></section>'),

"heritage-archive": ("Archive | Global Human Barbecue Heritage | IOBSF", "ghbharchive",
  head("Federation Archived Heritage", "연맹기록유산 아카이브", lede_html='<div id="ga-head"></div>')
  + '<section class="section"><div class="wrap"><div id="ga-tools"></div><p class="ga-count" id="ga-count"></p><div id="ga-list"></div></div></section>'),

"heritage-record": ("Heritage Record | IOBSF", "ghbhrecord",
  '<section class="page-head"><div class="wrap" id="gr"></div></section>'),

"heritage-item": ("Heritage Record | IOBSF", "heritageitem",
  '<section class="page-head"><div class="wrap"><div id="hitem"></div></div></section>'),

"chronicle": ("Chronicle | IOBSF", "chronicle",
  head("Chronicle", "기록", lede_id="chronicle-intro")
  + '<section class="section"><div class="wrap" id="chronicle"></div></section>'),

"federation": ("Federation | IOBSF", "federation",
  head("Federation", "연맹")
  + section("About", "개요", '<div id="fed-facts"></div>')
  + section("Founding Members", "창립 회원국", '<div id="fed-members"></div>')
  + section("Institutions", "관련 기관", '<div id="fed-institutions"></div>')
  + section("Founding General Meeting", "창립총회", '<div id="fed-founding"></div>')
  + section("History", "연혁", '<div id="history"></div>')
  + section("Articles of the Federation", "연맹 정관", '<div id="fed-articles"></div>')
  + section("Roadmap", "연맹 로드맵", '<div id="fed-roadmap"></div>')),

"partners": ("Partners | IOBSF", "partners",
  head("Partners", "파트너", lede_id="partners-intro")
  + section("Our Partners", "연맹의 파트너", '<div id="partners"></div>')
  + '<section class="section"><div class="wrap"><p class="biz-link bi"><a class="p" href="business.html">To become a partner or host a sanctioned event, visit the Business Desk.</a><a class="s" lang="ko" href="business.html">파트너가 되거나 공인 대회를 열고자 하면 비즈니스 데스크로.</a></p></div></section>'),

"business": ("Business Desk | IOBSF", "business",
  '<section class="page-head biz-head"><div class="wrap"><div id="biz-hestia" class="biz-hestia" aria-hidden="true"></div><div id="biz-statement"></div></div></section>'
  + '<section class="section biz-epic"><div class="wrap"><div id="biz-scroll"></div></div></section>'
  + section("Fields of Request", "의뢰 분야", '<div id="biz-areas"></div>')
  + section("How It Works", "절차", '<div id="biz-steps"></div><div id="biz-principle"></div>')
  + section("Request Form", "의뢰서", '<div id="biz-form"></div>')),

"writing": ("Essay | IOBSF", "writing",
  '<section class="page-head"><div class="wrap" id="writing"></div></section>'),

"archives": ("Archives | IOBSF", "archives",
  head("Archives", "서고", lede_html='<div class="lede bi"><span class="p">Scholarly materials and essays kept by the Federation: the research of the Korea Barbecue Research &amp; Institute (KBRI) and the books, papers and essays of Shaka Chaa.</span><span class="s" lang="ko">연맹이 기록한 학술 자료와 글. 한국바비큐연구원(KBRI)의 연구와 샤카의 저서, 논문, 논설을 담는다.</span></div>')
  + '<section class="section"><div class="wrap"><div id="heritage-archives"></div></div></section>'),

"404": ("Not found | IOBSF", "notfound",
  head("Page not found", "페이지를 찾을 수 없다", lede_html='<p class="lede"><a href="index.html">Return to the home page</a></p>')),
}

for name, (title, page, main) in pages.items():
    (root / f"{name}.html").write_text(HEAD.replace('VERSION', VERSION).format(title=title, desc=DESC.get(name, D), page=page, main=main, file=('' if name=='index' else name+'.html'), jsonld=(JSONLD if name=='index' else '')), encoding="utf-8")
print("ok", len(pages))
