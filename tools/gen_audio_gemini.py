#!/usr/bin/env python3
"""Generate all game audio with Gemini TTS (voice Sulafat). Resumable (manifest keyed by sha of
text+voice+style+lang+model), 4 threads, backoff on 429/5xx, hard spend cap, QA pass.
Usage: gen_audio_gemini.py [--limit N] [--no-qa] [--qa-only] [--keys k1,k2 (ui keys only)]. Key is never printed."""
import sys, os, re, json, base64, wave, io, time, pathlib, hashlib, subprocess, shutil, threading, random, unicodedata, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
ROOT = pathlib.Path(__file__).resolve().parent.parent
T = ROOT / "tools"; A = ROOT / "app" / "audio"
BACKUP = T / "audio_piper_backup"; RAW = T / "_gemini_raw"; MAN = T / "gemini_manifest.json"
MODEL = "gemini-3.8-flash-tts"; QA_MODEL = "gemini-2.5-flash"; VOICE = "Sulafat"
P_TXT, P_AUD = 0.50, 9.00            # $/M tokens, tts text in / audio out (Standard, until 2026-12-31)
Q_AUD_IN, Q_TXT_IN, Q_OUT = 1.00, 0.30, 2.50   # gemini-2.5-flash $/M (audio in, text in, out)
CAP = 5.0; SR = 24000
LOC = {"ru": "ru-RU", "pt": "pt-PT", "en": "en-GB", "de": "de-DE"}
LANGN = {"pt": "European Portuguese from Portugal (Lisbon), not Brazilian", "en": "British English",
         "de": "standard German (Hochdeutsch)", "ru": "Russian"}
def style(lang, kind):
    if kind == "lisa":
        return "playful, energetic, smiling young female fox character, lively but clear; speak Russian"
    if lang == "ru":
        return "warm, slow, clear kindergarten teacher speaking Russian to a five-year-old, kind and patient"
    if kind == "word":
        return ("calm, clear, warm, natural pace, say only the word, as a kind teacher to a 5-year-old learner; "
                + LANGN[lang])
    return ("calm, clear, warm, natural pace, as a kind teacher to a 5-year-old learner; " + LANGN[lang])
def key():
    if os.environ.get("GEMINI_API_KEY"): return os.environ["GEMINI_API_KEY"]
    env_file = os.environ.get("GEMINI_ENV_FILE")
    if not env_file:
        sys.exit("Set GEMINI_API_KEY (or GEMINI_ENV_FILE pointing to a .env file with GEMINI_API_KEY=...)")
    for l in pathlib.Path(env_file).read_text().splitlines():
        if l.startswith("GEMINI_API_KEY="): return l.split("=", 1)[1].strip().strip("\"'")
K = key()
lock = threading.Lock()
man = json.loads(MAN.read_text()) if MAN.exists() else {"clips": {}, "spent": 0.0, "usage": {"tts_in": 0, "tts_out": 0, "qa_in_audio": 0, "qa_in_txt": 0, "qa_out": 0, "tts_calls": 0, "qa_calls": 0}}
def save():
    with lock: MAN.write_text(json.dumps(man, ensure_ascii=False, indent=0))
def spend(d):
    with lock:
        man["spent"] += d
        if man["spent"] >= CAP: raise SystemExit(f"SPEND CAP ${CAP} reached ({man['spent']:.3f}); stopping")

def post(model, body):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    for att in range(8):
        req = urllib.request.Request(url, json.dumps(body).encode(), {"Content-Type": "application/json", "x-goog-api-key": K})
        try:
            return json.load(urllib.request.urlopen(req, timeout=180))
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:500].replace(K, "***")
            if e.code in (401, 403) or (e.code == 400 and "API key" in msg):
                print("AUTH/PERMISSION ERROR", e.code, msg); os._exit(2)
            if e.code == 429 or e.code >= 500:
                time.sleep(min(60, 2 ** att + random.random())); continue
            raise RuntimeError(f"HTTP {e.code} {msg}")
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            time.sleep(min(60, 2 ** att + random.random()))
    raise RuntimeError("retries exhausted")

def tts(text, lang, sty):
    body = {"contents": [{"parts": [{"text": f"# Style: {sty}\n# Transcript:\n{text}"}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"languageCode": LOC[lang],
             "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    for att in range(4):
        r = post(MODEL, body)
        um = r.get("usageMetadata", {})
        i, o = um.get("promptTokenCount", 0), um.get("candidatesTokenCount", 0)
        with lock:
            man["usage"]["tts_in"] += i; man["usage"]["tts_out"] += o; man["usage"]["tts_calls"] += 1
        spend(i * P_TXT / 1e6 + o * P_AUD / 1e6)
        try:
            return base64.b64decode(r["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]), i, o
        except (KeyError, IndexError):
            time.sleep(1 + att)   # empty/blocked candidate: retry
    raise RuntimeError(f"no audio for {text!r}")

def sha(text, lang, sty):
    return hashlib.sha256(json.dumps([text, VOICE, sty, lang, MODEL], ensure_ascii=False).encode()).hexdigest()

def tsv(name):
    for line in (ROOT / "content" / name).read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.startswith("#"): yield line.split("\t")
def jobs():
    J = []   # (out_path, lang, text, kind)
    for c in tsv("vocab.tsv"):
        _w, id_, _p, en, pt, de, ru, q_en, q_pt, q_de = [x.strip() for x in c]
        for lang, word, q in (("pt", pt, q_pt), ("en", en, q_en), ("de", de, q_de)):
            J.append((A / lang / f"{id_}.ogg", lang, word, "word")); J.append((A / lang / f"{id_}_q.ogg", lang, q, "phrase"))
        J.append((A / "ru" / f"{id_}.ogg", "ru", ru, "word"))
    for c in tsv("ui.tsv"):
        key_, lang, text = c[0].strip(), c[1].strip(), "\t".join(c[2:]).strip()
        J.append((A / "ui" / f"{lang}_{key_}.ogg", lang, text, "lisa" if key_.startswith(("lisa_", "cs_")) else "phrase"))
    return J

def wav_data(b):
    """Gemini TTS inlineData is a full WAV (RIFF) with a trailing C2PA chunk: parse the data chunk, never treat bytes as raw PCM.
    Returns int16 mono 24 kHz samples (np array)."""
    import numpy as np, struct
    if not b.startswith(b"RIFF"):
        return np.frombuffer(b[:len(b) // 2 * 2], dtype=np.int16)
    pos, fmt, data = 12, None, None
    while pos + 8 <= len(b):
        cid, sz = b[pos:pos + 4], struct.unpack("<I", b[pos + 4:pos + 8])[0]
        body = b[pos + 8:pos + 8 + sz]
        if cid == b"fmt ": fmt = struct.unpack("<HHIIHH", body[:16])
        elif cid == b"data": data = body; break
        pos += 8 + sz + (sz & 1)
    if fmt is None or data is None: raise RuntimeError("RIFF without fmt/data chunk")
    tag, ch, sr, _br, _ba, bits = fmt
    if bits != 16 or tag not in (1, 0xFFFE): raise RuntimeError(f"unsupported WAV fmt {fmt}")
    x = np.frombuffer(data[:len(data) // 2 * 2], dtype=np.int16)
    if ch > 1: x = x.reshape(-1, ch).mean(axis=1).astype(np.int16)
    if sr != SR:
        n = int(round(len(x) * SR / sr))
        x = np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x.astype(np.float32)).astype(np.int16)
    return x

def process(pcm):
    import numpy as np
    x = wav_data(pcm).astype(np.float32) / 32768.0
    idx = np.where(np.abs(x) > 10 ** (-45 / 20))[0]
    if len(idx) < SR // 20: raise RuntimeError("empty clip")
    x = x[idx[0]:idx[-1] + 1].copy()
    fi, fo = int(0.015 * SR), int(0.025 * SR)
    x[:fi] *= np.linspace(0, 1, fi, dtype=np.float32)
    x[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)
    x = x * (10 ** (-20 / 20) / float(np.sqrt(np.mean(x ** 2))))
    peak, lim = float(np.max(np.abs(x))), 10 ** (-2 / 20)
    if peak > lim: x = x * (lim / peak)
    return np.concatenate([np.zeros(int(0.06 * SR), np.float32), x, np.zeros(int(0.12 * SR), np.float32)])
def write_wav(path, x):
    import numpy as np
    with wave.open(str(path), "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((x * 32767).astype(np.int16).tobytes())
def encode(batch):   # [(out, wav)]
    cmd = ["ffmpeg", "-nostdin", "-y", "-loglevel", "error"]
    for _o, w in batch: cmd += ["-i", str(w)]
    for i, (o, _w) in enumerate(batch):
        pathlib.Path(o).parent.mkdir(parents=True, exist_ok=True)
        cmd += ["-map", f"{i}:a", "-ac", "1", "-ar", "24000", "-c:a", "libopus", "-b:a", "32k", str(o)]
    r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode: raise RuntimeError("ffmpeg: " + r.stderr[-400:])

def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)], capture_output=True, text=True)
    try: return float(r.stdout.strip())
    except ValueError: return 0.0

def gen_one(j, force=False):
    out, lang, text, kind = j
    sty = style(lang, kind); h = sha(text, lang, sty)
    raw = RAW / f"{h}.pcm"
    if force and raw.exists(): raw.unlink()
    if not raw.exists():
        pcm, i, o = tts(text, lang, sty)
        RAW.mkdir(exist_ok=True); raw.write_bytes(pcm)
        with lock: man["clips"][str(out.relative_to(ROOT))] = {"sha": h, "tok_in": i, "tok_out": o, "secs": len(pcm) / 2 / SR, "regen": man["clips"].get(str(out.relative_to(ROOT)), {}).get("regen", 0) + (1 if force else 0), "done": False}
    return h

def stage_generate(J, force_set=frozenset()):
    def w(j):
        try: gen_one(j, force=str(j[0]) in force_set)
        except SystemExit: raise
        except Exception as e: return (j, repr(e))
    errs = []
    with ThreadPoolExecutor(4) as ex:
        for n, r in enumerate(ex.map(w, J), 1):
            if r: errs.append(r)
            if n % 50 == 0: print(f"  tts {n}/{len(J)} spent ${man['spent']:.3f}", flush=True); save()
    save()
    return errs

def stage_encode(J):
    pend = []; os.makedirs(T / "_wav", exist_ok=True)
    for out, lang, text, kind in J:
        rel = str(out.relative_to(ROOT)); e = man["clips"].get(rel)
        h = sha(text, lang, style(lang, kind)); raw = RAW / f"{h}.pcm"
        if not raw.exists(): continue
        if e and e.get("done") and e.get("sha") == h and out.exists() and out.stat().st_size > 1024: continue
        w = T / "_wav" / f"{hashlib.md5(rel.encode()).hexdigest()}.wav"; write_wav(w, process(raw.read_bytes())); pend.append((out, w, rel, h))
    for k in range(0, len(pend), 40):
        b = pend[k:k + 40]; encode([(o, w) for o, w, _r, _h in b])
        for o, w, rel, h in b:
            man["clips"].setdefault(rel, {"sha": h})["done"] = True; man["clips"][rel]["sha"] = h; w.unlink()
    shutil.rmtree(T / "_wav", ignore_errors=True); save(); return len(pend)

def norm(s):
    s = unicodedata.normalize("NFKC", s).lower().replace("ё", "е")
    s = re.sub(r"[^\w\s]", " ", s); s = s.replace("_", " ")
    return " ".join(s.split())
def transcribe(raw, lang):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf: wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes(raw)
    body = {"contents": [{"parts": [{"text": f"Transcribe this audio exactly, word for word, in its original language ({LANGN[lang]}). Output only the transcript, nothing else."},
            {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(buf.getvalue()).decode()}}]}],
            "generationConfig": {"thinkingConfig": {"thinkingBudget": 0}, "temperature": 0}}
    r = post(QA_MODEL, body); um = r.get("usageMetadata", {})
    ai = sum(d.get("tokenCount", 0) for d in um.get("promptTokensDetails", []) if d.get("modality") == "AUDIO")
    ti = um.get("promptTokenCount", 0) - ai; o = um.get("candidatesTokenCount", 0)
    with lock:
        u = man["usage"]; u["qa_in_audio"] += ai; u["qa_in_txt"] += ti; u["qa_out"] += o; u["qa_calls"] += 1
    spend(ai * Q_AUD_IN / 1e6 + ti * Q_TXT_IN / 1e6 + o * Q_OUT / 1e6)
    try: return r["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError): return ""

def qa_check(J):
    """returns dict out->(problem list)"""
    bad = {}
    def one(j):
        out, lang, text, kind = j
        h = sha(text, lang, style(lang, kind)); raw = RAW / f"{h}.pcm"; rel = str(out.relative_to(ROOT))
        probs = []
        d = dur(out)
        twin = BACKUP / out.relative_to(A)
        td = dur(twin) if twin.exists() else 0
        if (td and d > 3 * td) or (kind == "word" and d > 6): probs.append(f"duration {d:.1f}s (piper {td:.1f}s)")
        e = man["clips"].get(rel, {})
        if "tr" not in e or e.get("tr_sha") != h:
            try: tr = transcribe(raw.read_bytes(), lang)
            except SystemExit: raise
            except Exception as ex: tr = "ERR " + repr(ex)
            e["tr"] = tr; e["tr_sha"] = h
        if norm(e["tr"]) != norm(text): probs.append("transcript: " + e["tr"])
        return out, probs
    with ThreadPoolExecutor(4) as ex:
        for n, (o, p) in enumerate(ex.map(one, J), 1):
            if p: bad[str(o)] = p
            if n % 100 == 0: print(f"  qa {n}/{len(J)} spent ${man['spent']:.3f}", flush=True); save()
    save(); return bad

HAND_FIXED = {"app/audio/pt/scarf_q.ogg", "app/audio/en/hurts_q.ogg", "app/audio/ui/ru_lisa_poke1.ogg"}
def reprocess_only(J):
    """Rebuild every .ogg from the raw cache via manifest sha. No API calls."""
    pend = []; os.makedirs(T / "_wav", exist_ok=True)
    ov = json.loads((T / "reprocess_overrides.json").read_text()) if (T / "reprocess_overrides.json").exists() else {}
    for out, lang, text, kind in J:
        rel = str(out.relative_to(ROOT))
        if rel in HAND_FIXED: print("skip (hand-regenerated, raw not cached; fixed via repair_ogg.py)", rel); continue
        h = ov.get(rel) or sha(text, lang, style(lang, kind)); raw = RAW / f"{h}.pcm"
        if not raw.exists(): print("MISSING raw", rel); continue
        w = T / "_wav" / f"{hashlib.md5(rel.encode()).hexdigest()}.wav"; write_wav(w, process(raw.read_bytes())); pend.append((out, w))
    for k in range(0, len(pend), 40):
        encode(pend[k:k + 40])
    shutil.rmtree(T / "_wav", ignore_errors=True); print("reprocessed", len(pend))

def main():
    J = jobs()
    if "--reprocess-only" in sys.argv: return reprocess_only(J)
    if "--keys" in sys.argv:   # only these ui keys (comma list, e.g. scene_help,scene_peek): never touches any other clip
        ks = set(sys.argv[sys.argv.index("--keys") + 1].split(","))
        J = [j for j in J if j[0].parent.name == "ui" and j[0].stem.split("_", 1)[1] in ks]
        print("only keys:", sorted(j[0].stem for j in J))
    if "--limit" in sys.argv: J = J[:int(sys.argv[sys.argv.index("--limit") + 1])]
    if not BACKUP.exists():
        shutil.copytree(A, BACKUP); print("backed up Piper audio ->", BACKUP)
    print(f"{len(J)} jobs")
    if "--qa-only" not in sys.argv:
        errs = stage_generate(J)
        print("tts errors:", len(errs)); [print(" ", e[0][2][:40], e[1][:150]) for e in errs[:10]]
        print("encoded", stage_encode(J))
    if "--no-qa" not in sys.argv:
        bad = qa_check(J); print("QA round1 flagged", len(bad))
        if bad:
            byo = {str(j[0]): j for j in J}
            stage_generate([byo[o] for o in bad], force_set=set(bad))
            for o in bad: man["clips"][str(pathlib.Path(o).relative_to(ROOT))].pop("tr", None); man["clips"][str(pathlib.Path(o).relative_to(ROOT))]["done"] = False
            stage_encode(J)
            bad2 = qa_check([byo[o] for o in bad]); print("QA round2 remaining", len(bad2))
            man["qa"] = {"round1": {k: v for k, v in bad.items()}, "remaining": bad2}
        else: man["qa"] = {"round1": {}, "remaining": {}}
        save()
    print(f"spent ${man['spent']:.3f}")
if __name__ == "__main__": main()
