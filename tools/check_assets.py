#!/usr/bin/env python3
"""Check every path data.js references exists (audio >= 1 KB)."""
import json, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
APP = ROOT / "app"
txt = (APP / "js" / "data.js").read_text(encoding="utf-8")
d = json.loads(txt[txt.index("{"):txt.rindex("}") + 1])
ap, miss, n = d["audioPath"], [], 0
seen = set()
def need(rel, minb=1):
    global n
    if rel in seen: return
    seen.add(rel)
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
for greeting in d.get("packs", {}).get("countries", {}).get("greetings", {}).values(): need(greeting["path"], 1024)
for v in d["uiImg"].values(): need(v, 100)
spec = json.loads((ROOT / "content/letters_audio.json").read_text())
from letters_asset_requirements import inspect_letter_assets
review_override = None
if "--letter-review" in sys.argv:
    index = sys.argv.index("--letter-review")
    if index + 1 >= len(sys.argv): raise SystemExit("--letter-review requires a review JSON file")
    review_override = json.loads(pathlib.Path(sys.argv[index+1]).read_text())
letter_inventory = inspect_letter_assets(APP, spec, review_override)
for rel in letter_inventory["required"]: need(rel, 1024)
print(f"letters: {len(letter_inventory['missingRequired'])} required missing, {len(letter_inventory['heldOptional'])} optional isolated sounds held")
for row in letter_inventory["heldOptional"]:
    print("  HELD OPTIONAL", row["path"], "status=" + row["status"], "available=" + str(row["available"]), "generation=" + row["generationStatus"])
need("icon/lisa.png", 1000)
print(f"checked {n} paths, missing {len(miss)}")
for m in miss: print("  MISSING", m)
sys.exit(1 if miss else 0)
