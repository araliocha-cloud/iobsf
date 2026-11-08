"""Translate the Korean originals in content/writings into English, Japanese and Chinese with Gemini.

Runs in GitHub Actions before tools/build_content.py, when the secret GEMINI_API_KEY is set.
- A translation is written into the same post file: body_en, body_ja, body_zh, and missing title and subtitle languages.
- A field edited by hand is never overwritten. The hash of each machine translation is kept in
  content/.translations/<file>.json, with the hash of the Korean it was made from.
  A field whose text no longer matches its hash was edited by a person.
- When the Korean original changes, the machine-made fields are translated again.
- Free-tier limits: a few seconds between calls, and a cap per run. Whatever is left is done on the next run.
"""
import hashlib, http.client, json, os, pathlib, sys, time, urllib.request, urllib.error

ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
FOLDERS = ["writings", "kbri"]  # boards whose Korean originals are translated
STATE = ROOT / "content" / ".translations"
KEY = os.environ.get("GEMINI_API_KEY", "").strip()
MODELS = [m for m in [os.environ.get("GEMINI_MODEL", "").strip(), "gemini-2.5-flash", "gemini-flash-latest", "gemini-2.5-flash-lite", "gemini-flash-lite-latest"] if m]
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
| 샤카, 차영기(車英基) | Shaka Chaa | 車英基（シャカ） | 车英基（Shaka Chaa） |
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
- The output must not contain Korean script (Hangul) where it does not belong. Write every Korean name, title and term in the target language: romanised in English, in kanji or katakana in Japanese, in hanzi in Chinese. In English a Korean original may stay only inside brackets after its English rendering, and only where the Korean text itself gives such a pairing. In Japanese and Chinese no Hangul at all.
- Output only the translated text, with no preface and no notes.

{glossary}"""


import re
HANGUL = re.compile(r"[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]+")


def stray(t, k):
    """Hangul left where it does not belong: none at all in Japanese and Chinese, only inside brackets in English."""
    if k == "en":
        t = re.sub(r"\([^()]*\)", "", t)
    return len(HANGUL.findall(t or ""))


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
    for model in list(MODELS):
        # translation needs no long deliberation: thinking off keeps each answer quick
        cfg = dict(body["generationConfig"])
        if model.startswith("gemini-2.5"):
            cfg["thinkingConfig"] = {"thinkingBudget": 0}
        body_m = dict(body, generationConfig=cfg)
        for attempt in range(3):
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                data=json.dumps(body_m).encode("utf-8"),
                headers={"Content-Type": "application/json", "x-goog-api-key": KEY})
            try:
                with urllib.request.urlopen(req, timeout=300) as r:
                    out = json.loads(r.read().decode("utf-8"))
                cand = (out.get("candidates") or [{}])[0]
                if cand.get("finishReason") not in (None, "STOP"):
                    raise RuntimeError(model + " unfinished: " + str(cand.get("finishReason")))
                return "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", [])).strip()
            except urllib.error.HTTPError as e:
                raw = e.read().decode("utf-8", "replace")
                if e.code == 404:
                    last = f"{model}: not found"; break
                if e.code in (429, 503):
                    try:
                        det = json.loads(raw)["error"].get("details", [])
                    except Exception:
                        det = []
                    quota = ",".join(v.get("quotaId", "") for d in det for v in d.get("violations", []))
                    delay = next((d.get("retryDelay") for d in det if d.get("retryDelay")), None)
                    say("limit", model, e.code, quota or raw[:160].replace("\n", " "), "retry in", delay)
                    if e.code == 503 or ("PerDay" not in quota and delay):
                        secs = float(str(delay or "30s").rstrip("s")) + 2
                        if secs <= 90 and attempt < 2:
                            time.sleep(secs); continue
                    MODELS.remove(model)  # this model is spent for today; the next one carries on
                    last = f"{model}: limit"
                    break
                raise RuntimeError(f"{model}: HTTP {e.code} {raw[:300]}")
            except (urllib.error.URLError, http.client.HTTPException, TimeoutError, ConnectionError) as e:
                # the connection dropped during a long answer: try again, then the next model
                say("connection", model, type(e).__name__, str(e)[:120])
                last = f"{model}: connection"
                if attempt < 2:
                    time.sleep(15); continue
                break
    if last and "limit" in last:
        raise Stop("all models at their free-tier limit")
    raise RuntimeError(last or "no model")


def repair(t, ko, k, name):
    """Ask again only for the lines that still carry Korean script, and put the answers back in place."""
    lines = t.split("\n")
    idx = [i for i, l in enumerate(lines) if stray(l, k)][:40]
    if not idx:
        return t
    ask = ("Below is a Korean original and some lines of its " + name + " translation that still contain Korean script by mistake. "
           "Return JSON {\"lines\": [...]} with each line corrected, in the same order, fully in " + name +
           ", with no Hangul (English may keep a Korean original only inside brackets). Change nothing else in the line.\n\n"
           "Lines:\n" + json.dumps([lines[i] for i in idx], ensure_ascii=False) + "\n\nKorean original:\n" + ko)
    try:
        fixed = json.loads(gemini(RULES.format(lang=name, glossary=GLOSSARY), ask, as_json=True)).get("lines") or []
    except Stop:
        raise
    except Exception as e:
        say("repair failed:", e)
        return t
    if len(fixed) == len(idx):
        for i, l in zip(idx, fixed):
            if isinstance(l, str) and l.strip() and stray(l, k) <= stray(lines[i], k):
                lines[i] = l
    return "\n".join(lines)


CHUNK = int(os.environ.get("TRANSLATE_CHUNK", "4500"))


def chunks(text):
    """Long essays go in parts cut at paragraph breaks, so no single answer runs long enough to be dropped."""
    parts, cur = [], ""
    for para in text.split("\n\n"):
        if cur and len(cur) + len(para) + 2 > CHUNK:
            parts.append(cur); cur = para
        else:
            cur = cur + "\n\n" + para if cur else para
    if cur:
        parts.append(cur)
    return parts


def translate_text(ko, name):
    parts = chunks(ko)
    if len(parts) == 1:
        return gemini(RULES.format(lang=name, glossary=GLOSSARY), ko)
    out = []
    for i, part in enumerate(parts, 1):
        note = (f"This is part {i} of {len(parts)} of one essay. Translate only this part, completely, "
                "and continue the same style and terms as the other parts.\n\n")
        t = gemini(RULES.format(lang=name, glossary=GLOSSARY), note + part)
        if len(t) < len(part) * 0.4:
            raise RuntimeError(f"part {i} of {len(parts)} came back too short")
        out.append(t.strip())
    return "\n\n".join(out)


# ---------- designed reports (HTML): only the words are translated, the design stays ----------
SKIP = re.compile(r"(<style\b.*?</style>|<script\b.*?</script>|<!--.*?-->)", re.S | re.I)
TAG = re.compile(r"(<[^>]+>)")
CSS_WORDS = re.compile(r"(content:\s*['\"])([^'\"]*)(?=['\"])")


def html_pieces(html):
    """The document as a list of pieces; text pieces outside style and script are the ones to translate."""
    out = []
    for i, block in enumerate(SKIP.split(html)):
        if i % 2:
            if block[:6].lower() == "<style":
                # words drawn by the stylesheet itself (content: '...') are translated too
                for j, piece in enumerate(CSS_WORDS.split(block)):
                    out.append((piece, j % 3 == 2 and bool(HANGUL.search(piece))))
            else:
                out.append((block, False))
            continue
        for j, piece in enumerate(TAG.split(block)):
            out.append((piece, j % 2 == 0 and bool(HANGUL.search(piece))))
    return out


HTML_RULES = """These are text pieces taken from a designed research report (charts, tables, cards), in order.
Translate each Korean piece into {lang}. Return JSON {{"t": [...]}} with exactly one string per piece, in the same order.
- A piece may be a heading, a label in a chart, a number with a unit, or part of a sentence cut by bold or italic markup: translate it so that it joins naturally with its neighbours.
- Keep numbers, years, currency figures, units, symbols and HTML entities (&amp; &nbsp; ...) exactly as they are.
- Keep chart labels short; do not add words.
- Keep spaces at the start and end of a piece as they are.

{glossary}"""


def translate_html(ko, name, k):
    pieces = html_pieces(ko)
    idx = [i for i, (t, tr_) in enumerate(pieces) if tr_]
    out = {}
    batch, size = [], 0

    def run(b):
        core = [pieces[i][0].strip() for i in b]
        res = json.loads(gemini(HTML_RULES.format(lang=name, glossary=GLOSSARY), json.dumps({"pieces": core}, ensure_ascii=False), as_json=True))
        got = res.get("t") if isinstance(res, dict) else None
        if not isinstance(got, list) or len(got) != len(b):
            raise RuntimeError(f"pieces came back {len(got) if isinstance(got, list) else '?'} for {len(b)}")
        for i, t in zip(b, got):
            raw = pieces[i][0]
            lead, trail = raw[:len(raw) - len(raw.lstrip())], raw[len(raw.rstrip()):]
            out[i] = lead + str(t).strip() + trail

    for i in idx:
        n = len(pieces[i][0])
        if batch and (size + n > 3000 or len(batch) >= 80):
            run(batch); batch, size = [], 0
        batch.append(i); size += n
    if batch:
        run(batch)
    # pieces that still carry Korean script are asked once more, one small batch
    left = [i for i in idx if stray(out.get(i, ""), k)]
    if left:
        try:
            run(left[:60])
        except Stop:
            raise
        except Exception as e:
            say("html repair failed:", e)
    return "".join(out.get(i, t) for i, (t, _) in enumerate(pieces))


def translate_field(f, post, st, src_field, prefix, state_prefix, translate, sf):
    ko = post.get(src_field) or ""
    if not ko.strip():
        return False
    changed = False
    src = sha(ko)
    for k, name in LANGS.items():
        field = prefix + k
        sk = state_prefix + k
        cur = post.get(field) or ""
        if cur and st.get(sk) != sha(cur):
            continue  # edited by hand: never overwritten
        tries = st.get(sk + "_tries", 0) if st.get(sk + "_src") == src else 0
        if cur and st.get(sk + "_src") == src and (stray(cur, k) == 0 or tries >= 3):
            continue
        if prefix == "html_" and cur and st.get(sk + "_src") == src:
            # a report keeps its few leftovers; they are listed for a look by hand
            st[sk + "_tries"] = 3
            sf.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            continue
        if cur and st.get(sk + "_src") == src:
            t = repair(cur, ko, k, name)
            st[sk + "_tries"] = 3
            if t != cur:
                post[field] = t; st[sk] = sha(t); changed = True
                f.write_text(json.dumps(post, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                say("repaired", f.name, field, "left:", HANGUL.findall(t)[:5] if stray(t, k) else "none")
            sf.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            continue
        best = None
        for _ in range(2):
            try:
                t = translate(ko, name, k)
            except Stop:
                raise
            except Exception as e:
                say("error in", f.name, field, ":", str(e)[:200], "(tried again on the next run)")
                break
            tries += 1
            if len(t) < len(ko) * 0.4:
                continue
            if best is None or stray(t, k) < stray(best, k):
                best = t
            if stray(best, k) == 0:
                break
        if best is None:
            continue
        t = best
        if stray(t, k) and prefix != "html_":
            t = repair(t, ko, k, name)
        if stray(t, k):
            say("check by hand:", f.name, field, "Korean script left:", HANGUL.findall(t)[:5])
        post[field] = t
        st[sk] = sha(t)
        st[sk + "_src"] = src
        st[sk + "_tries"] = tries
        changed = True
        f.write_text(json.dumps(post, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        sf.write_text(json.dumps(st, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        say("translated", f.name, field, len(ko), "->", len(t))
    return changed


def translate_post(f, folder):
    post = json.loads(f.read_text(encoding="utf-8"))
    sf = STATE / (f.name if folder == "writings" else f"{folder}__{f.name}")
    st = json.loads(sf.read_text(encoding="utf-8")) if sf.exists() else {}
    if not (post.get("id") or "").strip() and not ((post.get("title") or {}).get("en") or "").strip():
        post["id"] = f.stem
        f.write_text(json.dumps(post, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    changed = translate_field(f, post, st, "body", "body_", "", lambda ko, name, k: translate_text(ko, name), sf)
    changed = translate_field(f, post, st, "html", "html_", "h_", translate_html, sf) or changed
    # titles and subtitles: fill only the empty languages
    title, sub = post.get("title") or {}, post.get("subtitle") or {}
    if not (title.get("ko") or "").strip():
        return changed
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
    files = [(f, d) for d in FOLDERS for f in (ROOT / "content" / d).glob("*.json")]
    for f, d in sorted(files, key=lambda x: x[0].name, reverse=True):
        try:
            translate_post(f, d)
        except Stop as e:
            say("stopped:", e, "(the rest follows on the next run)")
            break
        except Exception as e:
            say("error in", f.name, ":", e)
    say("calls", calls)
    (STATE / "_last_run.txt").write_text(time.strftime("%Y-%m-%d %H:%M UTC\n", time.gmtime()) + "\n".join(REPORT) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
