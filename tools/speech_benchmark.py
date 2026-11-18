#!/usr/bin/env python3
"""Offline adult-corpus feasibility measurement; validation is the default."""
import argparse
import hashlib
import importlib
import json
import math
import multiprocessing
import os
from pathlib import Path
import platform
import stat
import sys
import time
import wave

MAX_FILES = 100
MAX_SECONDS = 30
MAX_TOTAL_SECONDS = 300
MAX_MODEL_BYTES = 1024 ** 3
LOCALES = {'en-US', 'en-GB', 'de-DE', 'pt-PT'}

class BenchmarkError(Exception):
    pass

def fail(code):
    raise BenchmarkError(code)

def regular(path, limit):
    try:
        info = path.lstat()
    except OSError:
        fail('path_missing')
    if not stat.S_ISREG(info.st_mode) or info.st_size > limit:
        fail('file_invalid')
    return path

def relative(root, value, directory=False):
    if not isinstance(value, str) or not value or '\\' in value:
        fail('path_invalid')
    p = Path(value)
    if p.is_absolute() or any(part in ('..', '.') for part in value.split('/')):
        fail('path_invalid')
    current = root
    for part in p.parts:
        current = current / part
        if current.is_symlink():
            fail('symlink_forbidden')
    if directory and not current.is_dir():
        fail('model_missing')
    return current

def manifest(path):
    path = Path(os.path.abspath(path))
    # OS/home aliases may occur in parent paths; never follow a manifest link.
    if path.is_symlink():
        fail('symlink_forbidden')
    path = path.parent.resolve() / path.name
    regular(path, 1024 * 1024)
    try:
        data = json.loads(path.read_text(encoding='utf-8'))
    except (ValueError, UnicodeError, OSError):
        fail('manifest_invalid')
    if not isinstance(data, dict) or data.get('schema') != 1:
        fail('manifest_invalid')
    return path, data

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            h.update(chunk)
    return h.hexdigest()

def checked_file(root, record, limit):
    if not isinstance(record, dict):
        fail('manifest_invalid')
    path = regular(relative(root, record.get('path')), limit)
    expected = record.get('sha256')
    if not isinstance(expected, str) or len(expected) != 64 or any(c not in '0123456789abcdef' for c in expected):
        fail('hash_invalid')
    if digest(path) != expected:
        fail('hash_mismatch')
    return path

def provenance(record):
    if any(not isinstance(record.get(key), str) or not record[key].strip() or len(record[key]) > 4096 for key in ('license', 'provenance')):
        fail('provenance_missing')

def preflight(model_manifest, corpus_manifest, locale):
    if locale not in LOCALES:
        fail('locale_invalid')
    mp, model = manifest(model_manifest)
    cp, corpus = manifest(corpus_manifest)
    if model.get('locale') != locale or corpus.get('locale') != locale:
        fail('locale_mismatch')
    provenance(model)
    model_root = relative(mp.parent, model.get('directory'), directory=True)
    files = model.get('files')
    if not isinstance(files, list) or not 1 <= len(files) <= 10000:
        fail('model_inventory_invalid')
    paths = [checked_file(model_root, item, MAX_MODEL_BYTES) for item in files]
    if len(set(paths)) != len(paths):
        fail('model_inventory_invalid')
    actual = set()
    total = 0
    for root, dirs, names in os.walk(model_root, followlinks=False):
        for name in dirs + names:
            p = Path(root) / name
            if p.is_symlink():
                fail('symlink_forbidden')
            if name in names:
                regular(p, MAX_MODEL_BYTES)
                actual.add(p)
                total += p.stat().st_size
    if actual != set(paths) or total > MAX_MODEL_BYTES:
        fail('model_inventory_invalid')
    records = corpus.get('records')
    if not isinstance(records, list) or not 1 <= len(records) <= MAX_FILES:
        fail('corpus_bounds')
    prepared = []
    seconds = 0
    seen = set()
    for record in records:
        if not isinstance(record, dict) or record.get('population') not in ('adult-public', 'adult-consented'):
            fail('population_forbidden')
        provenance(record)
        if record.get('locale', locale) != locale:
            fail('locale_mismatch')
        if record.get('population') == 'adult-consented' and (not isinstance(record.get('consent_reference'), str) or not record['consent_reference'].strip() or len(record['consent_reference']) > 4096):
            fail('consent_missing')
        if record.get('observation') not in ('speech', 'silence'):
            fail('observation_invalid')
        reference = record.get('reference')
        if reference is not None and (not isinstance(reference, str) or len(reference) > 4096):
            fail('reference_invalid')
        path = checked_file(cp.parent, record, 44 + 32000 * MAX_SECONDS + 65536)
        if path in seen:
            fail('corpus_duplicate')
        seen.add(path)
        try:
            with wave.open(str(path), 'rb') as w:
                n = w.getnframes()
                if (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getcomptype()) != (1, 2, 16000, 'NONE') or not 0 < n <= 16000 * MAX_SECONDS:
                    fail('wav_format')
                if len(w.readframes(n + 1)) != n * 2:
                    fail('wav_truncated')
        except (wave.Error, EOFError, OSError):
            fail('wav_invalid')
        duration = n / 16000
        seconds += duration
        prepared.append({'path': str(path), 'sha256': record['sha256'], 'seconds': duration, 'reference': reference, 'observation': record['observation']})
    if seconds > MAX_TOTAL_SECONDS:
        fail('corpus_bounds')
    return {'model_root': str(model_root), 'model_manifest': str(mp), 'corpus_manifest': str(cp), 'model_hash': digest(mp), 'corpus_hash': digest(cp), 'locale': locale, 'records': prepared, 'audio_seconds': seconds}

def token_distance(left, right):
    row = list(range(len(right) + 1))
    for i, a in enumerate(left, 1):
        nxt = [i]
        for j, c in enumerate(right, 1):
            nxt.append(min(nxt[-1] + 1, row[j] + 1, row[j-1] + (a != c)))
        row = nxt
    return row[-1]

def rss_bytes(value, system):
    return int(value if system == 'darwin' else value * 1024)

def percentile(values, fraction):
    return sorted(values)[max(0, math.ceil(len(values) * fraction) - 1)]

def decode(prepared):
    # Only explicit local paths: never Model(lang=...) or Model(model_name=...).
    sdk = importlib.import_module('vosk')
    sdk.SetLogLevel(-1)
    start = time.perf_counter()
    model = sdk.Model(model_path=prepared['model_root'])
    load_seconds = time.perf_counter() - start
    latencies = []
    totals = dict(nonempty_results=0, silence_samples=0, nonempty_on_silence=0, reference_samples=0, reference_tokens=0, token_edits=0, exact_matches=0)
    for record in prepared['records']:
        start = time.perf_counter()
        rec = sdk.KaldiRecognizer(model, 16000)
        parts = []
        with wave.open(record['path'], 'rb') as w:
            while True:
                chunk = w.readframes(4000)
                if not chunk:
                    break
                if rec.AcceptWaveform(chunk):
                    parts.append(json.loads(rec.Result()).get('text', ''))
            parts.append(json.loads(rec.FinalResult()).get('text', ''))
        latencies.append(time.perf_counter() - start)
        text = ' '.join(parts).strip()
        tokens = text.split()
        totals['nonempty_results'] += bool(tokens)
        if record['observation'] == 'silence':
            totals['silence_samples'] += 1
            totals['nonempty_on_silence'] += bool(tokens)
        if record['reference'] is not None:
            ref = record['reference'].split()
            totals['reference_samples'] += 1
            totals['reference_tokens'] += len(ref)
            totals['token_edits'] += token_distance(ref, tokens)
            totals['exact_matches'] += ref == tokens
    decode_seconds = sum(latencies)
    try:
        import resource
        peak_rss = rss_bytes(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss, sys.platform)
    except (ImportError, AttributeError):
        peak_rss = None
    return dict(totals, load_seconds=load_seconds, decode_seconds=decode_seconds, realtime_factor=decode_seconds / prepared['audio_seconds'], latency_p50_seconds=percentile(latencies, .5), latency_p95_seconds=percentile(latencies, .95), worker_peak_rss_bytes=peak_rss, token_error_rate=totals['token_edits']/totals['reference_tokens'] if totals['reference_tokens'] else None)

def worker(connection, prepared):
    # Suppress native SDK stdout/stderr too; never serialize exception messages.
    with open(os.devnull, 'w') as sink:
        os.dup2(sink.fileno(), 1)
        os.dup2(sink.fileno(), 2)
        try:
            # Revalidate immediately before decoding, not an immutable snapshot.
            # Inputs must remain unchanged for the full run; Vosk opens model paths.
            fresh = preflight(prepared['model_manifest'], prepared['corpus_manifest'], prepared['locale'])
            if fresh != prepared:
                fail('inputs_changed')
            connection.send({'status': 'measured', **decode(fresh)})
        except ModuleNotFoundError as e:
            connection.send({'error': 'sdk_missing' if e.name == 'vosk' else 'sdk_broken'})
        except BenchmarkError as e:
            connection.send({'error': str(e)})
        except Exception:
            connection.send({'error': 'decode_error'})
        finally:
            connection.close()

def execute_worker(prepared, timeout):
    ctx = multiprocessing.get_context('spawn')
    receive, send = ctx.Pipe(duplex=False)
    process = ctx.Process(target=worker, args=(send, prepared))
    try:
        process.start()
        send.close()
        if not receive.poll(timeout):
            fail('timeout')
        try:
            result = receive.recv()
        except EOFError:
            fail('worker_exit')
        if 'error' in result:
            fail(result['error'])
        return result
    finally:
        try:
            if process.pid is not None:
                process.join(.1)
                if process.is_alive():
                    process.terminate(); process.join(.5)
                if process.is_alive():
                    process.kill(); process.join(.5)
                if process.is_alive():
                    fail('worker_unreaped')
                process.close()
        finally:
            receive.close(); send.close()

def run(model_manifest, corpus_manifest, locale, execute=False, timeout=30):
    if not math.isfinite(timeout) or not 0 < timeout <= 60:
        fail('timeout_bounds')
    prepared = preflight(model_manifest, corpus_manifest, locale)
    report = {'schema': 1, 'protocol': 'adult-offline-v1', 'status': 'validated', 'locale': locale, 'model_manifest_sha256': prepared['model_hash'], 'corpus_manifest_sha256': prepared['corpus_hash'], 'sample_sha256': [r['sha256'] for r in prepared['records']], 'sample_count': len(prepared['records']), 'audio_seconds': prepared['audio_seconds'], 'hardware': {'architecture': platform.machine(), 'system': platform.system()}, 'metric_normalization': 'case-sensitive-whitespace-tokens', 'latency_scope': 'recognizer-init-through-final-including-file-read'}
    if execute:
        report.update(execute_worker(prepared, timeout))
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-manifest', required=True)
    parser.add_argument('--corpus-manifest', required=True)
    parser.add_argument('--locale', required=True)
    parser.add_argument('--execute', action='store_true')
    parser.add_argument('--timeout', type=float, default=30)
    parser.add_argument('--output')
    args = parser.parse_args()
    output = None
    code = 0
    try:
        if args.output:
            try:
                output = open(args.output, 'x', encoding='utf-8')
            except FileExistsError:
                fail('output_exists')
        result = run(args.model_manifest, args.corpus_manifest, args.locale, args.execute, args.timeout)
    except BenchmarkError as e:
        result = {'status': 'error', 'error': str(e)}; code = 2
    except KeyboardInterrupt:
        result = {'status': 'error', 'error': 'interrupted'}; code = 130
    except Exception:
        result = {'status': 'error', 'error': 'operation_failed'}; code = 2
    encoded = json.dumps(result, sort_keys=True)
    if output:
        with output:
            output.write(encoded + '\n')
    print(encoded)
    return code

if __name__ == '__main__':
    multiprocessing.freeze_support()
    sys.exit(main())
