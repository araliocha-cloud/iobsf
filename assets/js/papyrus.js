(function () {
  var host = document.getElementById("biz-scroll"); if (!host) return;
  host.className = "papyrus";
  host.innerHTML = "<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\"><filter id=\"ink\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".9\" numOctaves=\"2\" seed=\"4\"/><feDisplacementMap in=\"SourceGraphic\" scale=\"1.6\"/></filter><filter id=\"ink2\" x=\"-5%\" y=\"-10%\" width=\"110%\" height=\"120%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".09\" numOctaves=\"2\" seed=\"9\"/><feDisplacementMap in=\"SourceGraphic\" scale=\"5\"/></filter></svg>\n<div class=\"papyrus-in\">\n  <p class=\"hint\" id=\"hint\">ΕΣΤΙΑΣ<span class=\"ko\">헤스티아스, 헤스티아 엘레우테라</span><span class=\"ko\">두루마리를 눌러 펼친다</span></p>\n  <div class=\"scroll\" id=\"scroll\" role=\"button\" tabindex=\"0\" aria-label=\"두루마리를 펼쳐 서사시를 읽는다\">\n    <div class=\"rod\"></div>\n    <div class=\"bundle\"></div>\n    <div class=\"cord\"><i></i><i></i></div>\n    <div class=\"tag\"><svg class=\"t1\" viewBox=\"-6 0 862 118\" role=\"img\" aria-label=\"ΣΑΚΑ ΕΣΤΙΑΣ\"><g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" filter=\"url(#ink2)\"><g transform=\"translate(0.0 8.2) rotate(-1.2 37 50) scale(0.992)\"><path d=\"M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84\" stroke-width=\"12.0\"/><path d=\"M70 18 l2 6\" stroke-width=\"7.0\"/></g><g transform=\"translate(86.0 8.6) rotate(0.5 43 50) scale(0.974)\"><path d=\"M4 100 Q24 52 43 3\" stroke-width=\"6.5\"/><path d=\"M43 3 Q62 52 82 100\" stroke-width=\"16.0\"/><path d=\"M20 66 Q42 58 64 62\" stroke-width=\"6.5\"/></g><g transform=\"translate(184.0 9.7) rotate(-2.1 41 50) scale(0.986)\"><path d=\"M11 1 L11 100\" stroke-width=\"16.0\"/><path d=\"M74 4 Q42 30 13 56\" stroke-width=\"6.5\"/><path d=\"M30 42 Q54 70 79 100\" stroke-width=\"16.0\"/></g><g transform=\"translate(278.0 10.5) rotate(-1.2 43 50) scale(0.998)\"><path d=\"M4 100 Q24 52 43 3\" stroke-width=\"6.5\"/><path d=\"M43 3 Q62 52 82 100\" stroke-width=\"16.0\"/><path d=\"M20 66 Q42 58 64 62\" stroke-width=\"6.5\"/></g><g transform=\"translate(376.0 7.9) rotate(1.5 37 50) scale(1.008)\"><path d=\"M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84\" stroke-width=\"12.0\"/><path d=\"M8 53 L56 52\" stroke-width=\"6.5\"/></g><g transform=\"translate(462.0 8.7) rotate(-1.5 37 50) scale(1.022)\"><path d=\"M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84\" stroke-width=\"12.0\"/><path d=\"M70 18 l2 6\" stroke-width=\"7.0\"/></g><g transform=\"translate(548.0 9.2) rotate(0.1 41 50) scale(1.010)\"><path d=\"M4 9 Q40 3 78 7\" stroke-width=\"6.5\"/><path d=\"M41 6 L41 100\" stroke-width=\"16.0\"/></g><g transform=\"translate(642.0 9.3) rotate(-1.9 12 50) scale(1.005)\"><path d=\"M12 1 L12 100\" stroke-width=\"16.0\"/></g><g transform=\"translate(678.0 5.7) rotate(-0.9 43 50) scale(1.022)\"><path d=\"M4 100 Q24 52 43 3\" stroke-width=\"6.5\"/><path d=\"M43 3 Q62 52 82 100\" stroke-width=\"16.0\"/><path d=\"M20 66 Q42 58 64 62\" stroke-width=\"6.5\"/></g><g transform=\"translate(776.0 9.1) rotate(-0.1 37 50) scale(1.023)\"><path d=\"M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84\" stroke-width=\"12.0\"/><path d=\"M70 18 l2 6\" stroke-width=\"7.0\"/></g></g></svg></div>\n    <div class=\"sheet\" id=\"sheet\"><div class=\"clip\"><div class=\"text\" id=\"text\"></div></div></div>\n    <div class=\"rod\"></div>\n  </div>\n  <div class=\"controls\" id=\"controls\" hidden>\n    <button class=\"ctl\" id=\"all\" type=\"button\">전부 펼치기</button>\n    <button class=\"ctl\" id=\"again\" type=\"button\">처음부터 다시</button>\n  </div>\n</div>";
var POEM = {"songs": [{"gk": "ΠΡΟΟΙΜΙΟΝ", "title": "서가", "stanzas": [["노래하라, 무사(ΜΟΥΣΑ)여.", "창을 든 영웅도, 바다를 건넌 왕도 아니라", "한 번도 자리를 떠나지 않은 여신을 노래하라.", "신들의 집 한가운데,", "사람의 집 한가운데,", "꺼지지 않는 불 곁에 앉은 이를 노래하라."], ["그녀의 이름은 헤스티아(ΕΣΤΙΑ).", "그 이름이 곧 화로다.", "여신을 부르는 말과 화로를 부르는 말이", "처음부터 하나였다."]]}, {"gk": "Α", "title": "제1가. 맨 처음이자 맨 나중의 딸", "stanzas": [["크로노스(ΚΡΟΝΟΣ)는 두려웠다.", "제 자식에게 왕좌를 빼앗기리라는 예언이 그를 떨게 했다.", "레아(ΡΕΑ)가 아이를 낳을 때마다", "그는 아이를 통째로 삼켰다."], ["맨 처음 삼켜진 아이가 헤스티아였다.", "아버지의 어둠 속에서 그녀는 동생들을 기다렸다.", "데메테르가, 헤라가, 하데스가, 포세이돈이", "하나씩 그 어둠 속으로 내려왔다."], ["마침내 막내 제우스가 아버지를 꺾던 날,", "크로노스는 삼킨 자식들을 거꾸로 토해 냈다.", "맨 처음 들어간 헤스티아가", "맨 나중에 빛을 보았다."], ["그래서 그녀는 맏이이면서 막내가 되었다.", "그래서 신들에게 바치는 제물의", "맨 처음 몫과 맨 나중 몫이 그녀의 것이 되었다.", "모든 잔치는 헤스티아로 시작해 헤스티아로 끝났다."]]}, {"gk": "Β", "title": "제2가. 두 구혼자와 한 맹세", "stanzas": [["올림포스가 새 질서를 세우자", "두 신이 그녀 앞에 섰다."], ["바다의 왕 포세이돈이 말했다.", "나와 함께 파도 위를 다스리자.", "빛의 신 아폴론이 리라를 뜯으며 말했다.", "나와 함께 노래와 예언의 집을 짓자."], ["헤스티아는 고개를 저었다.", "그리고 제우스의 머리에 손을 얹고 맹세했다.", "나는 누구의 아내도 되지 않으리라.", "나는 영원히 처녀로 남으리라."], ["사랑의 여신 아프로디테는 신도 사람도 사랑에 빠뜨렸다."], ["그러나 그 힘이 끝내 닿지 못한 여신이 셋 있었다고 옛 노래는 전한다.", "지혜의 여신 아테나, 사냥의 여신 아르테미스,", "그리고 화로의 여신 헤스티아다."], ["제우스는 그 맹세를 받아들였다.", "그리고 혼인 대신 더 큰 것을 주었다.", "모든 집의 한가운데 자리와", "모든 신전의 첫 번째 영광이다.", "기름진 제물의 가장 좋은 몫도", "그녀의 화로로 모여들었다."], ["헤스티아는 어느 누구의 짝도 되지 않았다.", "그 대신 모든 이의 집이 되었다."]]}, {"gk": "Γ", "title": "제3가. 홀로 머무는 신", "stanzas": [["신들이 행렬을 지어 하늘을 돌 때,", "저마다 무리를 이끌고 나설 때,", "헤스티아만은 신들의 집에 홀로 남았다.", "플라톤(ΠΛΑΤΩΝ)은 그렇게 적었다."], ["그녀가 머무는 자리에서 불은 꺼지지 않았다.", "아테네의 프리타네이온(ΠΡΥΤΑΝΕΙΟΝ)에서는", "도시의 공공 화덕이 밤낮으로 타올랐다.", "바다 건너 새 도시를 세우러 떠나는 이들은", "그 화덕에서 불씨를 받아 배에 실었다.", "새 땅의 첫 불은 늘 어머니 도시의 화로에서 왔다."], ["떠돌던 오디세우스(ΟΔΥΣΣΕΥΣ)가 파이아케스의 궁전에 이르렀을 때", "그는 왕비의 무릎을 붙잡고 탄원한 뒤", "화로 곁 재 속에 앉았다.", "낯선 이도 화로 곁에 앉으면", "그 집의 보호를 받았기 때문이다.", "그것이 손님을 맞는 법, 크세니아(ΞΕΝΙΑ)였다."], ["헤스티아는 움직이지 않았다.", "그러나 그녀의 불은 도시에서 도시로,", "집에서 집으로 건너갔다."]]}, {"gk": "Δ", "title": "제4가. 닫힌 문", "stanzas": [["세월이 흘렀다.", "신전의 청동 문은 점점 무거워졌다.", "화로는 담장 안의 불이 되었고,", "집 안의 불이 되었다."], ["문 안은 따뜻했다.", "문 밖은 추웠다.", "불은 지키는 이들의 것이 되었고,", "나누는 이들의 것이 되지 못했다."], ["밤마다 바람이 신전의 문을 두드렸다.", "문틈으로 붉은 빛 한 줄이 새어 나왔다.", "그 빛을 보고 찾아온 이들이", "닫힌 문 앞에서 길을 묻다 돌아갔다."]]}, {"gk": "Ε", "title": "제5가. 문을 여는 밤", "stanzas": [["어느 밤, 헤스티아는 바람 소리를 들었다.", "그리고 처음으로 생각했다.", "불은 바람이 불수록 커진다.", "불은 나눌수록 따뜻해진다.", "그렇다면 이 불은 왜 문 안에만 있어야 하는가."], ["그녀는 일어섰다.", "태어나서 한 번도 떠나지 않은 화로 곁을 떠났다.", "두 손으로 육중한 청동 문을 밀었다.", "문틈의 빛 한 줄이 넓어지고,", "금빛이 홍수처럼 쏟아졌다."], ["빛 속에서 그녀가 걸어 나왔다.", "베일이 바람에 날렸다.", "손에는 화로에서 떠 온 불이 담긴 그릇이 들려 있었다."], ["불빛을 등진 그녀의 실루엣은 숨이 막힐 듯했고,", "히마티온(ΙΜΑΤΙΟΝ) 자락의 황금빛 반짝임은 보는 이를 황홀경에 빠뜨렸다.", "그녀가 얼마나 아름다운지는 아무도 말하지 못했다.", "보는 이들이 저마다 다른 아름다움을 보았기 때문이다."], ["그녀는 계단 위에 섰다.", "그리고 나그네와 눈을 맞추었다.", "웃었다.", "고개를 숙여 인사했다.", "그리고 손바닥을 펴 열린 문 안을 가리켰다."], ["들어오라.", "이 불은 이제 그대의 것이기도 하다."]]}, {"gk": "Ζ", "title": "제6가. 줄지 않는 불", "stanzas": [["나그네는 그녀의 손짓을 따라 문 안으로 들어섰다.", "기둥 사이로 둥근 화로가 보였다.", "그녀가 불을 떠서 나왔는데도", "화로의 불은 조금도 줄지 않았다.", "오히려 더 높이, 더 환하게 타오르고 있었다."], ["나그네는 그제야 알았다.", "나눈 불은 줄지 않는다.", "나눈 불은 커진다."]]}, {"gk": "Η", "title": "제7가. 새로운 이름", "stanzas": [["옛사람들은 그녀를 여러 이름으로 불렀다.", "의회의 화로를 지킬 때는 헤스티아 불라이아(ΕΣΤΙΑ ΒΟΥΛΑΙΑ),", "도시의 화덕을 지킬 때는 헤스티아 프리타니티스(ΕΣΤΙΑ ΠΡΥΤΑΝΙΤΙΣ),", "축복을 내릴 때는 헤스티아 폴리올보스(ΕΣΤΙΑ ΠΟΛΥΟΛΒΟΣ)라 불렀다.", "모두 그녀가 지키던 자리의 이름이었다."], ["그날 이후 사람들은 그녀에게 새 이름을 붙였다.", "헤스티아 엘레우테라(ΕΣΤΙΑ ΕΛΕΥΘΕΡΑ),", "문을 연 헤스티아,", "해방된 화로의 여신이라고.", "처음으로 그녀가 연 문의 이름이었다."], ["그녀가 문을 연 뒤로 신전 앞은 문전성시(門前聖市, ΘΕΩΝ ΑΓΟΡΗ)가 되었다.", "그녀는 문을 드나드는 이들에게 불의 축복을 나누었다.", "부와 기쁨, 찬양과 덕, 풍요와 번영이다.", "옛사람들이 폴리올보스의 이름으로", "천에 수놓았던 바로 그 축복이다."], ["오늘 우리는 열린 하늘 아래에서 불을 피운다."], ["헤스티아의 불,", "그 앞에 서서 겨루고,", "승리하지 못한 이가 승리한 이를 위해 술잔을 치켜든다.", "구운 고기를 나눈다.", "우리는 이것을 현대의 헤스티아 제전, 스포츠바비큐라 부른다."], ["신전 밖으로 나온 헤스티아의 불이", "마침내 세상 사람들의 가슴에 옮겨붙기 시작한 것이다.", "노동에서 풀려나 놀이로 돌아가는 새로운 인류,", "호모날라리언스(HomoNallarians)가", "그 불 앞에 둘러선다."], ["헤스티아의 새로운 전설은 이렇게 시작된다."]]}], "note": "이 서사시는 신화를 바탕으로 했지만 새롭게 각색한 부분이 있다."};
(function () {
  var scroll = document.getElementById("scroll"), sheet = document.getElementById("sheet"), text = document.getElementById("text");
  var controls = document.getElementById("controls"), hint = document.getElementById("hint");
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var queue = [], timer = 0, opened = false, follow = true, lastAuto = 0, paused = false, pending = null, done = false;
  function later(fn, ms) { pending = fn; timer = setTimeout(function () { pending = null; fn(); }, ms); }
  function pause() { if (!pending) return; clearTimeout(timer); paused = true; scroll.classList.add("paused"); }
  function resume() { paused = false; follow = true; scroll.classList.remove("paused"); var fn = pending; if (fn) later(fn, 150); }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var GR = /[\u0370-\u03FF\u1F00-\u1FFF]/;
  function gr(s) { return esc(s).replace(/[\u0370-\u03FF\u1F00-\u1FFF]+(?:\s+[\u0370-\u03FF\u1F00-\u1FFF]+)*/g, function (m) { return '<span class="gr">' + m + "</span>"; }); }
  function build() {
    var html = "";
    POEM.songs.forEach(function (s, si) {
      html += '<section class="song"><h2 class="hidden">' +
        (s.gk ? '<span class="gk' + (s.gk.length > 2 ? " word" : "") + '">' + esc(s.gk) + "</span>" : "") + "<span>" + esc(s.title) + "</span></h2>";
      var n = 0;
      s.stanzas.forEach(function (st) {
        html += '<div class="stanza">';
        st.forEach(function (l) { n++; html += '<span class="ln hidden" data-s="' + si + '">' + (n % 5 === 0 ? '<span class="no">' + n + "</span>" : "") + '<span class="t">' + gr(l) + "</span></span>"; });
        html += "</div>";
      });
      html += "</section>";
    });
    html += '<div class="end hidden"><span class="coronis"><svg viewBox="0 0 40 60" width="22" height="33" aria-hidden="true"><path d="M20 4c-9 6-12 14-8 20 3 5 10 5 10 11 0 5-6 7-9 4M20 56c9-6 12-14 8-20M8 30h24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></span><span class="colophon" lang="grc"><svg class="colo" viewBox="-6 0 1154 118" role="img" aria-label="ΤΟΥ ΣΑΚΑ ΕΣΤΙΑΣ"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" filter="url(#ink2)"><g transform="translate(0.0 6.3) rotate(-0.8 41 50) scale(1.009)"><path d="M4 9 Q40 3 78 7" stroke-width="6.5"/><path d="M41 6 L41 100" stroke-width="16.0"/></g><g transform="translate(94.0 8.2) rotate(-1.9 46 50) scale(0.992)"><path d="M46 4 A42 47 0 1 0 46.1 4" stroke-width="8.0"/><path d="M10 30 Q2 52 10 76" stroke-width="14.0"/><path d="M82 30 Q90 52 82 76" stroke-width="14.0"/></g><g transform="translate(198.0 8.0) rotate(-1.9 41 50) scale(0.972)"><path d="M5 4 Q22 22 40 52" stroke-width="16.0"/><path d="M77 4 Q60 26 40 52" stroke-width="6.5"/><path d="M40 50 L40 100" stroke-width="16.0"/></g><g transform="translate(292.0 5.8) rotate(-0.3 37 50) scale(0.975)"><path d="M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84" stroke-width="12.0"/><path d="M70 18 l2 6" stroke-width="7.0"/></g><g transform="translate(378.0 9.6) rotate(-0.3 43 50) scale(0.977)"><path d="M4 100 Q24 52 43 3" stroke-width="6.5"/><path d="M43 3 Q62 52 82 100" stroke-width="16.0"/><path d="M20 66 Q42 58 64 62" stroke-width="6.5"/></g><g transform="translate(476.0 8.6) rotate(-1.2 41 50) scale(1.027)"><path d="M11 1 L11 100" stroke-width="16.0"/><path d="M74 4 Q42 30 13 56" stroke-width="6.5"/><path d="M30 42 Q54 70 79 100" stroke-width="16.0"/></g><g transform="translate(570.0 7.5) rotate(0.3 43 50) scale(1.029)"><path d="M4 100 Q24 52 43 3" stroke-width="6.5"/><path d="M43 3 Q62 52 82 100" stroke-width="16.0"/><path d="M20 66 Q42 58 64 62" stroke-width="6.5"/></g><g transform="translate(668.0 9.8) rotate(-2.0 37 50) scale(0.987)"><path d="M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84" stroke-width="12.0"/><path d="M8 53 L56 52" stroke-width="6.5"/></g><g transform="translate(754.0 6.1) rotate(-1.6 37 50) scale(0.989)"><path d="M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84" stroke-width="12.0"/><path d="M70 18 l2 6" stroke-width="7.0"/></g><g transform="translate(840.0 6.4) rotate(1.4 41 50) scale(1.005)"><path d="M4 9 Q40 3 78 7" stroke-width="6.5"/><path d="M41 6 L41 100" stroke-width="16.0"/></g><g transform="translate(934.0 7.4) rotate(0.6 12 50) scale(1.003)"><path d="M12 1 L12 100" stroke-width="16.0"/></g><g transform="translate(970.0 5.8) rotate(-1.9 43 50) scale(0.982)"><path d="M4 100 Q24 52 43 3" stroke-width="6.5"/><path d="M43 3 Q62 52 82 100" stroke-width="16.0"/><path d="M20 66 Q42 58 64 62" stroke-width="6.5"/></g><g transform="translate(1068.0 7.6) rotate(0.8 37 50) scale(0.989)"><path d="M70 18 Q58 4 42 5 Q6 9 5 52 Q6 96 42 98 Q60 98 72 84" stroke-width="12.0"/><path d="M70 18 l2 6" stroke-width="7.0"/></g></g></svg></span><span class="byko">샤카의 헤스티아스</span><span class="note">' + esc(POEM.note) + "</span></div>";
    text.innerHTML = html;
    // the order of writing: a heading, then its lines; the proem's first stanza is written letter by letter
    queue = [];
    text.querySelectorAll(".song").forEach(function (sec, si) {
      queue.push({ el: sec.querySelector("h2"), kind: "head" });
      sec.querySelectorAll(".stanza").forEach(function (st, k) {
        st.querySelectorAll(".ln").forEach(function (ln) { queue.push({ el: ln, kind: (si === 0 && k === 0) ? "letters" : "line" }); });
        queue.push({ kind: "pause" });
      });
    });
    queue.push({ el: text.querySelector(".end"), kind: "head" });
  }
  function fit(instant) {
    var shown = text.querySelectorAll(".ink, .lettered"), last = shown[shown.length - 1];
    var h = last ? (last.getBoundingClientRect().bottom - text.getBoundingClientRect().top + 48) : 40;
    if (instant) { sheet.style.transition = "none"; }
    sheet.style.height = Math.ceil(h) + "px";
    if (instant) { void sheet.offsetHeight; sheet.style.transition = ""; }
    if (follow && last && !instant) {
      var r = last.getBoundingClientRect(), target = r.bottom - window.innerHeight * 0.62;
      if (target > 0) { lastAuto = Date.now(); window.scrollBy({ top: target, behavior: reduce ? "auto" : "smooth" }); }
    }
  }
  function show(item) {
    item.el.classList.remove("hidden");
    if (item.kind === "letters") {
      var t = item.el.querySelector(".t"), chars = Array.from(t.textContent);
      t.innerHTML = chars.map(function (c) { return '<span class="ch' + (GR.test(c) ? " gr" : "") + '">' + esc(c) + "</span>"; }).join("");
      item.el.classList.add("lettered");
      var spans = t.querySelectorAll(".ch"), i = 0;
      return new Promise(function (done) {
        (function step() {
          if (i >= spans.length) return done(260);
          spans[i++].classList.add("on"); later(step, 70);
        })();
      });
    }
    item.el.classList.add("ink");
    return Promise.resolve(item.kind === "head" ? 900 : 620);
  }
  function run() {
    if (!queue.length) { finish(); return; }
    var item = queue.shift();
    if (item.kind === "pause") { later(run, 520); return; }
    show(item).then(function (wait) { fit(false); later(run, wait); });
  }
  function finish() {
    clearTimeout(timer); done = true; paused = false; pending = null; scroll.classList.remove("paused");
    while (queue.length) { var it = queue.shift(); if (it.el) { it.el.classList.remove("hidden"); it.el.classList.add("ink"); } }
    text.querySelectorAll(".ch").forEach(function (c) { c.classList.add("on"); });
    fit(true); setTimeout(function () { fit(true); }, 950);
    document.getElementById("all").hidden = true; controls.classList.add("done");
  }
  function open() {
    if (opened) return; opened = true; scroll.classList.add("open"); controls.hidden = false; hint.style.visibility = "hidden";
    document.getElementById("all").hidden = false;
    done = false; build();
    later(run, 900);
  }
  function reset() {
    clearTimeout(timer); opened = false; done = false; paused = false; pending = null; scroll.classList.remove("paused"); controls.classList.remove("done"); follow = true; scroll.classList.remove("open"); controls.hidden = true; hint.style.visibility = "";
    sheet.style.height = "0px"; text.innerHTML = ""; window.scrollTo({ top: 0, behavior: "smooth" });
  }
  scroll.addEventListener("click", function () { if (!opened) open(); else if (!done) { paused ? resume() : pause(); } });
  scroll.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scroll.click(); } });
  document.getElementById("all").addEventListener("click", finish);
  document.getElementById("again").addEventListener("click", reset);
  // a reader who scrolls back up takes the wheel; the scroll stops following the pen
  window.addEventListener("scroll", function () { if (opened && Date.now() - lastAuto > 900) follow = false; }, { passive: true });
  window.addEventListener("resize", function () { if (opened) fit(true); });
})();
})();
