"""Assemble the site's data files from the admin's one-file-per-post folders.

The admin writes each post as its own file under content/. The site still reads the
same data files as before (data/writings.json, data/news.json ...). This script puts
them together: settings from content/settings/, posts from the post folders, newest
file name first. Run: python3 tools/build_content.py  (GitHub Actions runs it on every push).
"""
import json, pathlib, sys

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
C, D = root / "content", root / "data"

import re


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", (t or "").lower()).strip("-")[:80]


def posts(folder):
    out = []
    for f in sorted((C / folder).glob("*.json"), key=lambda p: p.name, reverse=True):
        try:
            p = json.loads(f.read_text(encoding="utf-8"))
            # every post has an address: its own id, else its English title, else its file name
            if isinstance(p, dict) and not (p.get("id") or "").strip():
                t = p.get("title") if isinstance(p.get("title"), dict) else {}
                n = p.get("name") if isinstance(p.get("name"), dict) else {}
                p["id"] = slug(t.get("en") or n.get("en")) or f.stem
            out.append(p)
        except Exception as e:
            print("skip", f, e)
    return out

def settings(name):
    return json.loads((C / "settings" / f"{name}.json").read_text(encoding="utf-8"))

def into_sections(base, items):
    ids = [s["id"] for s in base["sections"]]
    for s in base["sections"]:
        s["posts"] = []
    for p in items:
        sec = p.pop("section", None)
        if sec not in ids:
            sec = ids[0]
        base["sections"][ids.index(sec)]["posts"].append(p)
    return base

out = {
    "writings.json": {"writings": posts("writings")},
    "event-list.json": {"events": posts("events")},
    "chronicle.json": dict(settings("chronicle"), stories=posts("chronicle")),
    "news.json": into_sections(settings("news"), posts("news")),
    "wbt.json": into_sections(settings("wbt"), posts("wbt")),
}
changed = 0
for name, data in out.items():
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    f = D / name
    if not f.exists() or f.read_text(encoding="utf-8") != text:
        f.write_text(text, encoding="utf-8"); changed += 1; print("wrote", name)
print("changed", changed)
