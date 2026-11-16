#!/usr/bin/env python3
"""Check every path data.js references exists (audio >= 1 KB)."""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"
txt = (APP / "js" / "data.js").read_text(encoding="utf-8")
d = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
ap, miss, n = d["audioPath"], [], 0
def need(rel, minb=1):
    global n
    n += 1
    p = APP / rel
    if not p.exists() or p.stat().st_size < minb:
        miss.append(rel)
for it in d["items"].values():
    if it["pic"]["type"] == "emoji": need(it["pic"]["src"], 100)
    for l in d["langs"]:
        need(ap["word"].format(lang=l, id=it["id"]), 1024)
        need(ap["q"].format(lang=l, id=it["id"]), 1024)
    need(ap["gloss"].format(id=it["id"]), 1024)
for l, kv in d["ui"].items():
    for k in kv: need(ap["ui"].format(lang=l, key=k), 1024)
for v in d["uiImg"].values(): need(v, 100)
need("icon/lisa.png", 1000)
print(f"checked {n} paths, missing {len(miss)}")
for m in miss: print("  MISSING", m)
sys.exit(1 if miss else 0)
