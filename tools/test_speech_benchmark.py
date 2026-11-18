import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch
import wave

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location('speech_benchmark', HERE / 'speech_benchmark.py')
b = importlib.util.module_from_spec(SPEC) if SPEC and SPEC.loader and (HERE / 'speech_benchmark.py').exists() else None
if b:
    sys.modules[SPEC.name] = b
    SPEC.loader.exec_module(b)

class BenchmarkTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name).resolve()
        (self.root / 'model').mkdir()
        (self.root / 'model/data').write_bytes(b'opaque-model-fixture')
        self.audio = self.root / 'sample.wav'
        self.wav()
        self.model = {'schema': 1, 'locale': 'en-US', 'directory': 'model', 'license': 'fixture-license', 'provenance': 'fixture-source', 'files': [{'path': 'data', 'sha256': self.sha(self.root / 'model/data')}]}
        self.corpus = {'schema': 1, 'locale': 'en-US', 'records': [{'path': 'sample.wav', 'sha256': self.sha(self.audio), 'population': 'adult-public', 'license': 'fixture-license', 'provenance': 'fixture-source', 'reference': 'private reference phrase', 'observation': 'silence'}]}
        self.save()
    def sha(self, p):
        return hashlib.sha256(p.read_bytes()).hexdigest()
    def wav(self, channels=1, rate=16000, width=2, frames=1600):
        with wave.open(str(self.audio), 'wb') as w:
            w.setnchannels(channels); w.setsampwidth(width); w.setframerate(rate)
            w.writeframes(b'\0' * frames * channels * width)
    def save(self):
        for name, obj in [('model.json', self.model), ('corpus.json', self.corpus)]:
            (self.root / name).write_text(json.dumps(obj))
    def run_tool(self, execute=False, timeout=2):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        return b.run(self.root / 'model.json', self.root / 'corpus.json', 'en-US', execute=execute, timeout=timeout)
    def test_dry_run_validates_without_sdk_and_does_not_change_inputs(self):
        before = {p.name: self.sha(p) for p in self.root.rglob('*') if p.is_file()}
        report = self.run_tool()
        self.assertEqual(report['status'], 'validated')
        self.assertEqual(report['audio_seconds'], .1)
        self.assertEqual(before, {p.name: self.sha(p) for p in self.root.rglob('*') if p.is_file()})
        self.assertNotIn('private reference phrase', json.dumps(report))
    def test_invalid_inputs_never_invoke_decoder(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        original = b.execute_worker
        b.execute_worker = lambda *a, **k: self.fail('decoder called before preflight')
        self.addCleanup(setattr, b, 'execute_worker', original)
        cases = [('population', 'child'), ('population', 'unknown'), ('sha256', '0'*64), ('path', '../escape.wav'), ('path', str(self.audio))]
        for field, value in cases:
            with self.subTest(field=field, value=value):
                old = self.corpus['records'][0][field]
                self.corpus['records'][0][field] = value; self.save()
                with self.assertRaises(b.BenchmarkError): self.run_tool(True)
                self.corpus['records'][0][field] = old
        self.corpus['locale'] = 'de-DE'; self.save()
        with self.assertRaises(b.BenchmarkError): self.run_tool(True)
    def test_wav_format_truncation_bounds_and_symlinks(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        for args in [dict(channels=2), dict(rate=8000), dict(width=1), dict(frames=0), dict(frames=16000*31)]:
            self.wav(**args); self.corpus['records'][0]['sha256'] = self.sha(self.audio); self.save()
            with self.assertRaises(b.BenchmarkError): self.run_tool()
        self.wav(); self.audio.write_bytes(self.audio.read_bytes()[:-10]); self.corpus['records'][0]['sha256'] = self.sha(self.audio); self.save()
        with self.assertRaises(b.BenchmarkError): self.run_tool()
        self.wav(); real = self.root/'real.wav'; self.audio.rename(real); self.audio.symlink_to(real)
        self.corpus['records'][0]['sha256'] = self.sha(real); self.save()
        with self.assertRaises(b.BenchmarkError): self.run_tool()
    def test_model_inventory_hash_license_and_missing_path(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        for field, value in [('license', ''), ('provenance', ''), ('directory', 'absent')]:
            old = self.model[field]; self.model[field] = value; self.save()
            with self.assertRaises(b.BenchmarkError): self.run_tool()
            self.model[field] = old
        self.save(); (self.root/'model/extra').write_bytes(b'x')
        with self.assertRaises(b.BenchmarkError): self.run_tool()
        (self.root/'model/extra').unlink(); (self.root/'model/data').write_bytes(b'bad')
        with self.assertRaises(b.BenchmarkError): self.run_tool()
    def test_adapter_uses_only_explicit_model_and_aggregates_private_text(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        calls = []
        class Recognizer:
            def __init__(self, model, rate): calls.append(('rate', rate))
            def AcceptWaveform(self, data): calls.append(('bytes', len(data))); return True
            def Result(self): return json.dumps({'text': 'private recognized phrase'})
            def FinalResult(self): return json.dumps({'text': ''})
        sdk = types.SimpleNamespace(Model=lambda **kw: calls.append(kw) or object(), KaldiRecognizer=Recognizer, SetLogLevel=lambda level: None)
        old = sys.modules.get('vosk'); sys.modules['vosk'] = sdk
        self.addCleanup(lambda: sys.modules.pop('vosk', None) if old is None else sys.modules.__setitem__('vosk', old))
        prepared = b.preflight(self.root/'model.json', self.root/'corpus.json', 'en-US')
        result = b.decode(prepared)
        self.assertEqual(calls[0], {'model_path': str(self.root/'model')})
        self.assertIn(('rate', 16000), calls)
        self.assertEqual(result['reference_tokens'], 3)
        self.assertEqual(result['token_edits'], 1)
        self.assertEqual(result['exact_matches'], 0)
        self.assertEqual(result['nonempty_on_silence'], 1)
        self.assertNotIn('private', json.dumps(result))
        self.assertGreaterEqual(result['decode_seconds'], 0)
        self.assertAlmostEqual(result['realtime_factor'], result['decode_seconds']/.1)
        self.assertEqual(b.token_distance(['a','b'], ['a','x','b']), 1)
        self.assertEqual(b.rss_bytes(1024, 'darwin'), 1024)
        self.assertEqual(b.rss_bytes(1024, 'linux'), 1048576)
    def cli(self, sdk_text, *args):
        sdk = self.root/'sdk'; sdk.mkdir(exist_ok=True)
        (sdk/'vosk.py').write_text(sdk_text)
        env = dict(os.environ, PYTHONPATH=str(sdk), PYTHONDONTWRITEBYTECODE='1')
        return subprocess.run([sys.executable, str(HERE/'speech_benchmark.py'), '--model-manifest', str(self.root/'model.json'), '--corpus-manifest', str(self.root/'corpus.json'), '--locale', 'en-US', *args], env=env, text=True, capture_output=True, timeout=5)
    def test_worker_missing_sdk_error_timeout_and_success_are_private(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        for source, code in [("raise ModuleNotFoundError('private reference phrase', name='vosk')", 'sdk_missing'), ("raise RuntimeError('private reference phrase')", 'decode_error'), ('import time; time.sleep(10)', 'timeout')]:
            result = self.cli(source, '--execute', '--timeout', '0.3')
            self.assertEqual(result.returncode, 2, result.stderr)
            self.assertEqual(json.loads(result.stdout)['error'], code)
            self.assertNotIn('private', result.stdout + result.stderr)
        source = '''import json
class Model:
 def __init__(self, **kwargs): print('private SDK log')
class KaldiRecognizer:
 def __init__(self,*args): pass
 def AcceptWaveform(self,data): return False
 def FinalResult(self): return json.dumps({'text':'private recognized phrase'})
def SetLogLevel(level): pass
'''
        result = self.cli(source, '--execute')
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertEqual(report['status'], 'measured')
        self.assertEqual(report['nonempty_results'], 1)
        self.assertNotIn('private', result.stdout+result.stderr)
    def test_record_locale_and_consent_metadata_are_not_implicitly_inferred(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        self.corpus['records'][0]['locale'] = 'de-DE'; self.save()
        with self.assertRaises(b.BenchmarkError): self.run_tool()
        self.corpus['records'][0].pop('locale')
        self.corpus['records'][0]['population'] = 'adult-consented'
        self.corpus['records'][0]['consent_reference'] = True; self.save()
        with self.assertRaises(b.BenchmarkError): self.run_tool()
    def test_timeout_reaps_its_owned_worker(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        import multiprocessing
        before = {p.pid for p in multiprocessing.active_children()}
        prepared = b.preflight(self.root/'model.json', self.root/'corpus.json', 'en-US')
        # A near-zero deadline forces cancellation even before SDK import.
        with self.assertRaises(b.BenchmarkError) as error:
            b.execute_worker(prepared, .000001)
        self.assertEqual(str(error.exception), 'timeout')
        self.assertEqual({p.pid for p in multiprocessing.active_children()}, before)
    def test_metric_arithmetic_and_silence_empty_reference(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        self.assertEqual(b.percentile([1., 2., 3., 4.], .5), 2.)
        self.assertEqual(b.percentile([1., 2., 3., 4.], .95), 4.)
        self.assertEqual(b.token_distance([], ['a', 'b']), 2)
        self.assertEqual(b.token_distance(['a', 'b'], []), 2)
        for timeout in [0, -1, float('nan'), 61]:
            with self.assertRaises(b.BenchmarkError): self.run_tool(timeout=timeout)
    def test_manifest_parent_alias_is_canonicalized_but_manifest_link_is_rejected(self):
        alias = self.root / 'parent-alias'
        alias.symlink_to(self.root, target_is_directory=True)
        prepared = b.preflight(alias/'model.json', alias/'corpus.json', 'en-US')
        self.assertEqual(prepared['model_root'], str(self.root/'model'))
        self.assertEqual(prepared['model_manifest'], str(self.root/'model.json'))
        linked = self.root/'linked.json'; linked.symlink_to(self.root/'model.json')
        with self.assertRaises(b.BenchmarkError) as error:
            b.preflight(linked, self.root/'corpus.json', 'en-US')
        self.assertEqual(str(error.exception), 'symlink_forbidden')
        # Relative component links stay forbidden after parent canonicalization.
        (self.root/'model-alias').symlink_to(self.root/'model', target_is_directory=True)
        self.model['directory'] = 'model-alias'; self.save()
        with self.assertRaises(b.BenchmarkError):
            b.preflight(alias/'model.json', alias/'corpus.json', 'en-US')
    def test_worker_surviving_kill_returns_typed_error_without_closing_live_process(self):
        class End:
            def __init__(self): self.closed = False
            def poll(self, timeout): return False
            def close(self): self.closed = True
        class Process:
            pid = 123
            def __init__(self): self.actions = []
            def start(self): self.actions.append('start')
            def join(self, timeout): self.actions.append(('join', timeout))
            def is_alive(self): return True
            def terminate(self): self.actions.append('terminate')
            def kill(self): self.actions.append('kill')
            def close(self): self.fail_close = True; raise ValueError('still running')
        receive, send, process = End(), End(), Process()
        context = types.SimpleNamespace(Pipe=lambda **kw: (receive, send), Process=lambda **kw: process)
        with patch.object(b.multiprocessing, 'get_context', return_value=context):
            with self.assertRaises(b.BenchmarkError) as error:
                b.execute_worker({}, .001)
        self.assertEqual(str(error.exception), 'worker_unreaped')
        self.assertNotIn('fail_close', vars(process))
        self.assertTrue(receive.closed and send.closed)
        self.assertIn('terminate', process.actions)
        self.assertIn('kill', process.actions)
    def test_missing_transitive_sdk_dependency_is_broken_sdk(self):
        result = self.cli("raise ModuleNotFoundError('private reference phrase', name='vosk_dependency')", '--execute')
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)['error'], 'sdk_broken')
        self.assertNotIn('private', result.stdout + result.stderr)
    def test_worker_exit_and_changed_inputs_fail_closed(self):
        result = self.cli('import os; os._exit(7)', '--execute')
        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)['error'], 'worker_exit')
        prepared = b.preflight(self.root/'model.json', self.root/'corpus.json', 'en-US')
        self.corpus['records'][0]['reference'] = 'changed private reference'; self.save()
        with self.assertRaises(b.BenchmarkError) as error:
            b.execute_worker(prepared, 2)
        self.assertEqual(str(error.exception), 'inputs_changed')
    def test_raw_token_metric_keeps_case_and_punctuation(self):
        self.assertEqual(self.run_tool()['metric_normalization'], 'case-sensitive-whitespace-tokens')
        self.assertEqual(b.token_distance('Hello world!'.split(), 'hello world'.split()), 2)
        self.assertEqual(b.token_distance('hello  world'.split(), 'hello world'.split()), 0)
    def test_existing_report_is_not_overwritten(self):
        self.assertIsNotNone(b, 'benchmark utility is missing')
        output = self.root/'report.json'; output.write_text('existing-partial')
        result = self.cli("raise RuntimeError('must not import')", '--execute', '--output', str(output))
        self.assertEqual(json.loads(result.stdout)['error'], 'output_exists')
        self.assertEqual(output.read_text(), 'existing-partial')

if __name__ == '__main__': unittest.main()
