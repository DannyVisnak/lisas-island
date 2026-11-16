#!/usr/bin/env python3
"""Generate all game audio: Piper -> numpy post-processing -> batched ffmpeg Opus encode.
Idempotent (skips existing clips >1 KB); --force regenerates. At most 2 Piper workers."""
import sys, os, wave, subprocess, tempfile, pathlib, hashlib, shutil
from concurrent.futures import ProcessPoolExecutor
ROOT = pathlib.Path(__file__).resolve().parent.parent
VOICES = {"pt": "pt_PT-tugão-medium", "en": "en_GB-jenny_dioco-medium",
          "de": "de_DE-thorsten-medium", "ru": "ru_RU-irina-medium"}
FORCE = "--force" in sys.argv
TMP = tempfile.mkdtemp(prefix="lisa_audio_")
_voices = {}

def voice(lang):
    from piper import PiperVoice
    if lang not in _voices:
        _voices[lang] = PiperVoice.load(str(ROOT / "tools" / "voices" / (VOICES[lang] + ".onnx")))
    return _voices[lang]

def render(job):
    """Synthesize + trim/normalise in numpy; returns (out_path, temp_wav or None if skipped)."""
    import numpy as np
    lang, text, out, scale = job
    out = pathlib.Path(out)
    if out.exists() and out.stat().st_size > 1024 and not FORCE:
        return (str(out), None)
    from piper import SynthesisConfig
    parts, sr = [], 22050
    for ch in voice(lang).synthesize(text, SynthesisConfig(length_scale=scale)):
        sr = ch.sample_rate
        parts.append(np.frombuffer(ch.audio_int16_bytes, dtype=np.int16))
    if not parts:
        raise RuntimeError(f"no audio for {out} ({text!r})")
    x = np.concatenate(parts).astype(np.float32) / 32768.0
    idx = np.where(np.abs(x) > 10 ** (-45 / 20))[0]
    if len(idx) < sr // 20:
        raise RuntimeError(f"empty clip {out} ({text!r})")
    x = x[idx[0]:idx[-1] + 1]
    x = x * (10 ** (-20 / 20) / float(np.sqrt(np.mean(x ** 2))))   # common RMS -20 dBFS
    peak, lim = float(np.max(np.abs(x))), 10 ** (-2 / 20)
    if peak > lim:
        x = x * (lim / peak)
    x = np.concatenate([np.zeros(int(0.06 * sr), np.float32), x, np.zeros(int(0.12 * sr), np.float32)])
    wav = os.path.join(TMP, hashlib.md5(str(out).encode()).hexdigest() + ".wav")
    with wave.open(wav, "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(sr)
        wf.writeframes((x * 32767).astype(np.int16).tobytes())
    return (str(out), wav)

def encode_batch(batch):
    cmd = ["ffmpeg", "-nostdin", "-y", "-loglevel", "error"]
    for _o, w in batch:
        cmd += ["-i", w]
    for i, (o, _w) in enumerate(batch):
        pathlib.Path(o).parent.mkdir(parents=True, exist_ok=True)
        cmd += ["-map", f"{i}:a", "-ac", "1", "-ar", "24000", "-c:a", "libopus", "-b:a", "32k", o]
    r = subprocess.run(cmd, capture_output=True, text=True, stdin=subprocess.DEVNULL)
    if r.returncode:
        raise RuntimeError("ffmpeg batch failed: " + r.stderr[-500:])
    for o, w in batch:
        if not os.path.exists(o) or os.path.getsize(o) < 1024:
            raise RuntimeError(f"empty clip {o}")
        os.unlink(w)

def tsv(name):
    for line in (ROOT / "content" / name).read_text(encoding="utf-8").splitlines():
        if line.strip() and not line.startswith("#"):
            yield line.split("\t")

def main():
    A = ROOT / "app" / "audio"
    for p in A.rglob("*.ogg"):          # drop broken leftovers
        if p.stat().st_size < 1024:
            p.unlink()
    jobs = []
    for c in tsv("vocab.tsv"):
        _w, id_, _p, en, pt, de, ru, q_en, q_pt, q_de = [x.strip() for x in c]
        for lang, word, q in (("pt", pt, q_pt), ("en", en, q_en), ("de", de, q_de)):
            jobs.append((lang, word, str(A / lang / f"{id_}.ogg"), 1.15))
            jobs.append((lang, q, str(A / lang / f"{id_}_q.ogg"), 1.08))
        jobs.append(("ru", ru, str(A / "ru" / f"{id_}.ogg"), 1.15))
    for c in tsv("ui.tsv"):
        key, lang, text = c[0].strip(), c[1].strip(), "\t".join(c[2:]).strip()
        jobs.append((lang, text, str(A / "ui" / f"{lang}_{key}.ogg"), 1.08))
    n, pending = {"ok": 0, "skip": 0}, []
    with ProcessPoolExecutor(max_workers=2) as ex:
        for path, wav in ex.map(render, jobs, chunksize=4):
            if wav is None:
                n["skip"] += 1
                continue
            pending.append((path, wav))
            if len(pending) >= 40:
                encode_batch(pending); n["ok"] += len(pending); pending = []
                print(f"  ...{n['ok']} generated", flush=True)
    if pending:
        encode_batch(pending); n["ok"] += len(pending)
    shutil.rmtree(TMP, ignore_errors=True)
    print(f"audio: {len(jobs)} clips ({n['ok']} generated, {n['skip']} skipped)")

if __name__ == "__main__":
    main()
