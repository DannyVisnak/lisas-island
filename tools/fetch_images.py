#!/usr/bin/env python3
"""Download Noto Emoji SVGs (Apache-2.0) + flags into app/img. Idempotent; --force re-downloads."""
import sys, pathlib, urllib.request, urllib.error
ROOT = pathlib.Path(__file__).resolve().parent.parent
IMG = ROOT / "app" / "img"
BASE = "https://raw.githubusercontent.com/googlefonts/noto-emoji/main/"
FORCE = "--force" in sys.argv

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "kids-lang-game-fetch"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def emoji_names(ch):
    cps = [ord(c) for c in ch]
    no_fe = [c for c in cps if c != 0xFE0F]
    cands = [no_fe, cps]
    seen = []
    for c in cands:
        n = "emoji_u" + "_".join(f"{x:x}" for x in c) + ".svg"
        if n not in seen:
            seen.append(n)
    return seen

def fetch_emoji(ch, dest):
    err = None
    for n in emoji_names(ch):
        try:
            data = get(BASE + "2D/svg/" + n)
            if b"<svg" in data:
                dest.write_bytes(data)
                return True
        except urllib.error.URLError as e:
            err = e
    print(f"  FAILED {ch!r}: {err}")
    return False

def main():
    IMG.mkdir(parents=True, exist_ok=True)
    jobs = []  # (name, kind, arg)
    for line in (ROOT / "content" / "vocab.tsv").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        c = line.split("\t")
        pic = c[2].strip()
        if pic.startswith("#") or pic.isdigit():
            continue
        jobs.append((c[1], "emoji", pic))
    ui = {"ui_star": "⭐", "ui_chest": "\U0001f381", "ui_home": "\U0001f3e0",
          "ui_album": "\U0001f4d2", "ui_run": "\U0001f3c3", "ui_fox": "\U0001f98a"}
    jobs += [(k, "emoji", v) for k, v in ui.items()]
    jobs += [(f"flag_{l.lower()}", "flag", {"pt": "PT", "en": "GB", "de": "DE"}[l.lower()]) for l in ("PT", "EN", "DE")]
    failed, done = [], 0
    for name, kind, arg in jobs:
        dest = IMG / f"{name}.svg"
        if dest.exists() and dest.stat().st_size > 100 and not FORCE:
            done += 1
            continue
        if kind == "emoji":
            ok = fetch_emoji(arg, dest)
        else:
            try:
                dest.write_bytes(get(BASE + f"third_party/region-flags/svg/{arg}.svg")); ok = True
            except urllib.error.URLError as e:
                print(f"  FAILED flag {arg}: {e}"); ok = False
        (done := done + 1) if ok else failed.append(name)
    # app icon (PNG, fox 1f98a)
    icon = ROOT / "app" / "icon" / "lisa.png"
    icon.parent.mkdir(parents=True, exist_ok=True)
    if not icon.exists() or FORCE:
        try:
            raw = get(BASE + "2D/png/512/emoji_u1f98a.png")
            tmp = icon.with_suffix(".tmp.png"); tmp.write_bytes(raw)
            import subprocess
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp), "-vf", "scale=256:256:flags=lanczos", str(icon)], check=True)
            tmp.unlink()
        except Exception as e:
            print(f"  FAILED icon png: {e}"); failed.append("icon")
    lic = IMG / "LICENSES.md"
    lic.write_text(
        "# Image licences\n\n"
        "- Emoji artwork (`*.svg` except `flag_*`): Noto Emoji / Noto Color Emoji, (c) Google, "
        "Apache License 2.0 - https://github.com/googlefonts/noto-emoji\n"
        "- Flags (`flag_pt/en/de.svg`): region-flags (third_party/region-flags in noto-emoji), "
        "public domain / as stated in https://github.com/googlefonts/noto-emoji/blob/main/third_party/region-flags/LICENSE\n"
        "- `app/icon/lisa.png`: Noto fox emoji (U+1F98A), Apache-2.0.\n"
        "- Lisa the mascot and all colour blobs / dot layouts are drawn in code (original).\n", encoding="utf-8")
    print(f"images ok: {done}, failed: {failed or 'none'}")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
