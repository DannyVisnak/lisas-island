#!/usr/bin/env python3
"""Repair an already-encoded clip made with the old raw-bytes-as-PCM bug (44-byte WAV header at start,
7664-byte C2PA chunk at end): cut both, fade, renormalise, re-encode. Usage: repair_ogg.py rel/path.ogg ..."""
import sys, subprocess, numpy as np, wave, pathlib, os
SR = 24000; ROOT = pathlib.Path(__file__).resolve().parent.parent
def dec(p):
    r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(p), "-f", "s16le", "-ac", "1", "-ar", "24000", "-"], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.int16).astype(np.float32) / 32768
def repair(p):
    x = dec(p)
    x = x[int(0.06 * SR):len(x) - int(0.12 * SR)]
    x = x[22:]                       # 44-byte WAV header read as samples
    # tail: C2PA chunk = 7664 bytes = 3832 samples; locate the jump near the expected position
    exp = len(x) - 3832
    w = 240; best = None
    for s in range(max(0, exp - 480), min(len(x) - w, exp + 480)):
        pre = np.sqrt(np.mean(x[max(0, s - w):s] ** 2)) + 1e-6; post = np.sqrt(np.mean(x[s:s + w] ** 2)) + 1e-6
        r = post / pre
        if best is None or r > best[0]: best = (r, s)
    x = x[:best[1]]
    idx = np.where(np.abs(x) > 10 ** (-45 / 20))[0]; x = x[idx[0]:idx[-1] + 1].copy()
    fi, fo = int(0.015 * SR), int(0.025 * SR)
    x[:fi] *= np.linspace(0, 1, fi, dtype=np.float32); x[-fo:] *= np.linspace(1, 0, fo, dtype=np.float32)
    x = x * (10 ** (-20 / 20) / float(np.sqrt(np.mean(x ** 2))))
    pk, lim = float(np.max(np.abs(x))), 10 ** (-2 / 20)
    if pk > lim: x *= lim / pk
    y = np.concatenate([np.zeros(int(0.06 * SR), np.float32), x, np.zeros(int(0.12 * SR), np.float32)])
    tmp = "/tmp/_repair.wav"
    with wave.open(tmp, "wb") as wf: wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR); wf.writeframes((y * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", tmp, "-ac", "1", "-ar", "24000", "-c:a", "libopus", "-b:a", "32k", str(p)], check=True)
    print("repaired", p, f"jump ratio {best[0]:.0f}x at {best[1]/SR:.2f}s, new dur {len(y)/SR:.2f}s")
for a in sys.argv[1:]: repair(ROOT / a if not os.path.isabs(a) else a)
