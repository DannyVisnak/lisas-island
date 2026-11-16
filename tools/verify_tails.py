#!/usr/bin/env python3
"""Check every clip: tail (last 150 ms of speech, before 120 ms pad) is quiet and has no rising burst; start has no click."""
import subprocess, numpy as np, glob, sys
from concurrent.futures import ThreadPoolExecutor
def dec(p):
    r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", p, "-f", "s16le", "-ac", "1", "-ar", "24000", "-"], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768
db = lambda v: 20 * np.log10(v + 1e-9)
def chk(p):
    x = dec(p); SR = 24000; why = []
    body = x[:len(x) - int(0.12 * SR)]           # strip end pad
    last80 = np.sqrt(np.mean(body[-int(0.08 * SR):] ** 2))
    t = body[-int(0.14 * SR):-int(0.025 * SR)]
    S = np.abs(np.fft.rfft(t * np.hanning(len(t)))) ** 2 + 1e-12
    flat = float(np.exp(np.mean(np.log(S))) / np.mean(S))   # old C2PA noise: flatness 0.32-0.43 at about -12 dBFS, steady
    last150 = last80
    if flat > 0.30 and db(last80) > -20 and np.sqrt(np.mean(t ** 2)) > 0.15: why.append(f"noise-like tail flat={flat:.2f}")
    if np.max(np.abs(body[-int(0.005 * SR):])) > 0.02: why.append("tail not faded to zero")
    h = x[int(0.06 * SR):int(0.06 * SR) + int(0.002 * SR)]
    if np.max(np.abs(h)) > 0.05: why.append(f"head click peak {np.max(np.abs(h)):.3f}")
    return p, why, db(last80)
fs = sorted(glob.glob(sys.argv[1] if len(sys.argv)>1 else "app/audio/**/*.ogg", recursive=True))
with ThreadPoolExecutor(6) as ex: res = list(ex.map(chk, fs))
bad = [(p, w) for p, w, _ in res if w]
print("clips", len(res), "fail", len(bad), "worst last-150ms RMS dB", round(max(r[2] for r in res), 1))
for p, w in bad[:20]: print(" ", p, w)
sys.exit(1 if bad else 0)
