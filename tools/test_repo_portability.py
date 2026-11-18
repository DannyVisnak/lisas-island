"""Run approved-fixture checks in a source-only checkout with no private tickets."""
import hashlib
import pathlib
import shutil
import subprocess
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parent.parent
NODE_TESTS = [
    'test_history_lessons.js', 'test_opus_english.js',
    'test_countries_renderer.js', 'test_letters_runtime.js', 'test_shop_note.js',
]

def verify_fixture_hashes(root):
    fixture_root = root / 'tools/fixtures/approved'
    sums = fixture_root / 'SHA256SUMS'
    pins = {}
    for line in sums.read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        digest, name = line.split('  ', 1)
        relative = pathlib.PurePosixPath(name)
        if (len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest)
                or relative.is_absolute() or '..' in relative.parts
                or not name.startswith('tools/fixtures/approved/') or name in pins):
            raise ValueError('invalid fixture checksum entry: ' + name)
        pins[name] = digest
    expected = {str(p.relative_to(root)) for p in fixture_root.rglob('*')
                if p.is_file() and p.suffix in {'.json', '.tsv'}}
    if set(pins) != expected or len(pins) != 11:
        raise ValueError('fixture checksum inventory mismatch')
    for name, digest in pins.items():
        if hashlib.sha256((root / name).read_bytes()).hexdigest() != digest:
            raise ValueError('fixture checksum mismatch: ' + name)


class RepoPortability(unittest.TestCase):
    def test_all_approved_fixture_hashes_are_pinned(self):
        verify_fixture_hashes(ROOT)

    def test_tampering_with_each_fixture_is_rejected(self):
        with tempfile.TemporaryDirectory(prefix='lisa-fixture-tamper-') as tmp:
            clean = pathlib.Path(tmp)
            target = clean / 'tools/fixtures/approved'
            shutil.copytree(ROOT / 'tools/fixtures/approved', target)
            verify_fixture_hashes(clean)
            for fixture in sorted(target.rglob('*')):
                if not fixture.is_file() or fixture.suffix not in {'.json', '.tsv'}:
                    continue
                with self.subTest(fixture=str(fixture.relative_to(clean))):
                    original = fixture.read_bytes()
                    try:
                        fixture.write_bytes(original + b'\n')
                        with self.assertRaisesRegex(ValueError, 'fixture checksum mismatch'):
                            verify_fixture_hashes(clean)
                    finally:
                        fixture.write_bytes(original)
            verify_fixture_hashes(clean)

    def test_approved_checks_need_only_checkout_sources(self):
        with tempfile.TemporaryDirectory(prefix='lisa-clean-checkout-') as tmp:
            clean = pathlib.Path(tmp)
            # Audio readiness is separately gated; do not copy large/private inputs.
            for folder in ['tools', 'app/js', 'app/css', 'app/img', 'app/fonts', 'content']:
                for source in (ROOT / folder).rglob('*'):
                    if (source.is_file() and (source.suffix in {'.js', '.py', '.json', '.tsv', '.css', '.svg', '.png'} or source.name == 'SHA256SUMS' or folder == 'app/fonts')
                            and not any(part in {'tickets', 'node_modules', 'shots', '__pycache__'} for part in source.relative_to(ROOT).parts)):
                        dest = clean / source.relative_to(ROOT)
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(source, dest)
            verify_fixture_hashes(clean)
            guard = clean / 'reject_host_reads.cjs'
            guard.write_text("const fs=require('node:fs');const read=fs.readFileSync;fs.readFileSync=function(p,...args){if(String(p).startsWith('/root/'))throw Error('private host read: '+p);return read.call(this,p,...args);};\n")
            commands = [
                ['node', '--require', str(guard), '--test', *['tools/' + p for p in NODE_TESTS]],
                ['python3', '-m', 'unittest', 'tools/test_shop_note_assets.py'],
                ['python3', 'tools/check_shop_assets.py', '--allow-pending-note', '--allow-pending-audio'],
            ]
            for command in commands:
                with self.subTest(command=command):
                    result = subprocess.run(command, cwd=clean, text=True, capture_output=True, timeout=60)
                    self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

if __name__ == '__main__':
    unittest.main()
