"""Translate the Korean originals in content/writings into English, Japanese and Chinese with Gemini.

Runs in GitHub Actions before tools/build_content.py, when the secret GEMINI_API_KEY is set.
- A translation is written into the same post file: body_en, body_ja, body_zh, and missing title and subtitle languages.
- A field edited by hand is never overwritten. The hash of each machine translation is kept in
  content/.translations/<file>.json, with the hash of the Korean it was made from.
  A field whose text no longer matches its hash was edited by a person.
- When the Korean original changes, the machine-made fields are translated again.
- Free-tier limits: a few seconds between calls, and a cap per run. Whatever is left is done on the next run.
"""
import hashlib, json, os, pathlib, sys, time, urllib.request, urllib.error

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
POSTS = ROOT / "content" / "writings"
STATE = ROOT / "content" / ".translations"
KEY = os.environ.get("GEMINI_API_KEY", "").strip()
MODELS = [m for m in [os.environ.get("GEMINI_MODEL", "").strip(), "gemini-flash-latest", "gemini-2.5-flash"] if m]
MAX_CALLS = int(os.environ.get("TRANSLATE_MAX_CALLS", "30"))
PAUSE = float(os.environ.get("TRANSLATE_PAUSE", "7"))
LANGS = {"en": "English", "ja": "Japanese", "zh": "Simplified Chinese"}

GLOSSARY = """Fixed terms of the federation. Always use exactly these renderings.
| Korean | English | Japanese | Chinese |
| 스포츠바비큐 | Sports Barbecue | スポーツバーベキュー | 运动烧烤 |
| 프로바비큐어 | Pro Barbecuer | プロバーベキュアー | 职业烧烤师 |
| 집전자(執典者) | Officiant | 執典者 | 执典者 |
| 호모날라리언스 | HomoNallarians (adjective and singular: HomoNallarian; one word, no hyphen, capital H and N) | ホモナラリアンス（HomoNallarians） | HomoNallarians |
| 국제아웃도어바비큐스포츠연맹 | International Outdoor Barbecue Sports Federation (IOBSF) | 国際アウトドアバーベキュースポーツ連盟 | 国际户外烧烤运动联合会 |
| 한국바비큐연구원 | Korea Barbecue Research & Institute (KBRI) | 韓国バーベキュー研究院 | 韩国烧烤研究院 |
| 대한아웃도어바비큐협회 | Korea Outdoor & Barbecue Association (KOOBA) | 大韓アウトドアバーベキュー協会 | 大韩户外烧烤协会 |
| 세계인류바비큐유산 | Global Human Barbecue Heritage (GHBH) | 世界人類バーベキュー遺産 | 世界人类烧烤遗产 |
| 이그니스 프리머스 | Ignis Primus | イグニス・プリムス | 伊格尼斯·普里穆斯 |
| 인류바비큐문명사 | A Civilization History of Human Barbecue | 人類バーベキュー文明史 | 人类烧烤文明史 |
| 바비큐 인문학 | Barbecue Humanities | バーベキュー人文学 | 烧烤人文学 |
| 분배경제학 | Distribution Economics | 分配経済学 | 分配经济学 |
| 화로경제학(火爐經濟學) | Hearth Economics | 火炉経済学 | 火炉经济学 |
| 누림경제 | Fruition Economy | 享受経済（Fruition Economy） | 享用经济（Fruition Economy） |
| 경기정신 | Spirit of the Game | 競技精神 | 竞技精神 |
| 프로바비큐어 신조 | Pro Barbecuer's Creed | プロバーベキュアー信条 | 职业烧烤师信条 |
| 화식(火食) | cooking with fire (火食) | 火食 | 火食 |
| 태초의 묵약(太初의 默約) | The Primordial Tacit Pact (Pactum Tacitum Primordiale) | 太初の黙約 | 太初的默约 |
| 분배의 4요소: 존엄, 감내, 참여, 기여 | Dignity, Endurance, Participation, Contribution | 尊厳、堪耐、参与、寄与 | 尊严、堪耐、参与、贡献 |
| 핏 마스터 | Pit Master | ピットマスター | 烧烤大师（Pit Master） |
| Slow & Low (keep this order, never Low & Slow) | Slow & Low | Slow & Low | Slow & Low |
| 고시례(高矢禮) | Gosirye (高矢禮) | 高矢禮（コシレ） | 高矢礼 |
| 샤카, 차영기 | Shaka Chaa | シャカ（車永基） | Shaka Chaa |
"""

RULES = """You translate essays by the Korean barbecue humanist Shaka Chaa for the official website of IOBSF.
Translate the Korean text into {lang}.
- Translate everything. Never summarise, shorten, skip, explain or add anything. Every paragraph, sentence and list item of the original appears in the translation.
- Keep the Markdown exactly: blank lines between paragraphs, headings (###), quotations (>), lists, bold and italics, links and images unchanged.
- Keep the tone: an essayist and scholar, declarative and clean, dignified. No casual register.
- Where the original pairs a word with its source in brackets (Hanja, Greek, Latin, English), keep that pairing in the translation.
- Proper names of people, books and theories: render them as they are known in {lang}; keep the original in brackets where the original does.
- When the original pairs a term with the very same word in brackets, as in 호모날라리언스(HomoNallarians), write the word once in the translation: HomoNallarians, not HomoNallarians (HomoNallarians).
- Do not use em-dashes to introduce explanations. Do not use the middle dot (·) as a separator; use commas.
- Output only the translated text, with no preface and no notes.

{glossary}"""


def sha(t):
    return hashlib.sha256((t or "").encode("utf-8")).hexdigest()[:16]


class Stop(Exception):
    pass


calls = 0
REPORT = []


def say(*a):
    line = " ".join(str(x) for x in a)
    print(line)
    REPORT.append(line)


def gemini(system, text, as_json=False):
    global calls
    if calls >= MAX_CALLS:
        raise Stop("call cap reached")
    if calls:
        time.sleep(PAUSE)
    calls += 1
    body = {"systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": text}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 65536}}
    if as_json:
        body["generationConfig"]["responseMimeType"] = "application/json"
    last = None
    for model in MODELS:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                out = json.loads(r.read().decode("utf-8"))
            cand = (out.get("candidates") or [{}])[0]
            if cand.get("finishReason") not in (None, "STOP"):
                raise RuntimeError("unfinished: " + str(cand.get("finishReason")))
            return "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", [])).strip()
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")[:300]
            if e.code == 429:
                raise Stop("free-tier limit reached: " + msg)
            if e.code == 404:
                last = f"{model}: not found"; continue
            raise RuntimeError(f"{model}: HTTP {e.code} {msg}")
    raise RuntimeError(last or "no model")


def translate_post(f):
    post = json.loads(f.read_text(encoding="utf-8"))
    sf = STATE / f.name
    st = json.loads(sf.read_text(encoding="utf-8")) if sf.exists() else {}
    ko = post.get("body") or ""
    if not ko.strip():
        return False
    changed = False
    src = sha(ko)
    for k, name in LANGS.items():
        field = "body_" + k
        cur = post.get(field) or ""
        made = st.get(k)
        by_hand = bool(cur) and made != sha(cur)
        if by_hand:
            continue
        if cur and st.get(k + "_src") == src:
            continue
        t = gemini(RULES.format(lang=name, glossary=GLOSSARY), ko)
        if len(t) < len(ko) * 0.4:
            raise RuntimeError(f"{f.name} {k}: translation suspiciously short, not saved")
        post[field] = t
        st[k] = sha(t)
        st[k + "_src"] = src
        changed = True
        f.write_text(json.dumps(post, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        sf.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        say("translated", f.name, k, len(ko), "->", len(t))
    # titles and subtitles: fill only the empty languages
    title, sub = post.get("title") or {}, post.get("subtitle") or {}
    want = {k: [x for x, o in (("title", title), ("subtitle", sub)) if (o.get("ko") or "").strip() and not (o.get(k) or "").strip()]
            for k in LANGS}
    want = {k: v for k, v in want.items() if v}
    if want:
        ask = ("Translate these Korean essay titles. Return JSON of the form "
               '{"en": {"title": "", "subtitle": ""}, "ja": {...}, "zh": {...}} with only these keys: '
               + json.dumps(want, ensure_ascii=False) + "\n\nKorean:\n" +
               json.dumps({"title": title.get("ko", ""), "subtitle": sub.get("ko", "")}, ensure_ascii=False))
        res = json.loads(gemini(RULES.format(lang="English, Japanese and Simplified Chinese", glossary=GLOSSARY), ask, as_json=True))
        for k, fields in want.items():
            for x in fields:
                v = ((res.get(k) or {}).get(x) or "").strip()
                if v:
                    post.setdefault(x, {})[k] = v
                    changed = True
        f.write_text(json.dumps(post, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return changed


def main():
    if not KEY:
        print("GEMINI_API_KEY is not set; nothing translated")
        return
    STATE.mkdir(parents=True, exist_ok=True)
    # newest first, so a new post is never kept waiting behind the backlog
    for f in sorted(POSTS.glob("*.json"), key=lambda p: p.name, reverse=True):
        try:
            translate_post(f)
        except Stop as e:
            say("stopped:", e, "(the rest follows on the next run)")
            break
        except Exception as e:
            say("error in", f.name, ":", e)
    say("calls", calls)
    (STATE / "_last_run.txt").write_text(time.strftime("%Y-%m-%d %H:%M UTC\n", time.gmtime()) + "\n".join(REPORT) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
