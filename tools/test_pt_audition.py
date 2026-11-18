"""Credential-free audition contracts; this module never imports the generator."""
import hashlib
import importlib.util
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
from types import SimpleNamespace

ROOT = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('pt_audition', ROOT/'tools/pt_audition.py')
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)

class Audition(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.r=pathlib.Path(self.tmp.name)
  (self.r/'content').mkdir();shutil.copyfile(ROOT/'content/vocab.tsv',self.r/'content/vocab.tsv')
  self.style=self.r/'style.json';self.style.write_text(json.dumps({'style':'TEST_STYLE_LITERAL'}))
  self.keys=['lisa09_pt_clear_v1_'+x for x in ['mouse','frog','purple','car','bird','strawberry','pig','black','white','dog']]
  for key in self.keys:
   p=self.r/'app/audio/pt'/(key.removeprefix('lisa09_pt_clear_v1_')+'.ogg');p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'baseline'*200)
 def tearDown(self):self.tmp.cleanup()
 def args(self,keys=None):return ['--pt-audition','--keys',','.join(keys or self.keys),'--pt-audition-style',str(self.style)]
 def config(self):return M.load_request(self.args(),self.r,model='gemini-3.8-flash-tts',voice='Sulafat')
 def test_exact_ten_and_subset_word_jobs_from_latest_vocab(self):
  c=self.config();self.assertEqual(len(c['jobs']),10)
  rows={p[1]:p[4].strip() for p in [x.split('\t') for x in (ROOT/'content/vocab.tsv').read_text().splitlines() if x and not x.startswith('#')]}
  for out,lang,text,kind in c['jobs']:
   self.assertEqual((lang,kind),('pt','word'));self.assertEqual(text,rows[out.stem.removeprefix('lisa09_pt_clear_v1_')]);self.assertTrue(out.is_relative_to(self.r/'tools/voice_samples/lisa09'))
  self.assertEqual(len(M.load_request(self.args(self.keys[:2]),self.r)['jobs']),2)
 def test_invalid_modes_fail_without_writes(self):
  invalid=[['--pt-audition'],['--pt-audition','--keys',''],self.args()+['--force'],self.args()+['--limit','1'],self.args()+['--no-qa'],self.args()+['--qa-only'],self.args()+['--reprocess-only'],self.args()+['--vocab','mouse'],self.args()+['--ui-lang','pt'],self.args()+['--keys',self.keys[0]],self.args([self.keys[0],'lisa_hi1']),self.args([self.keys[0],self.keys[0]]),['--keys',self.keys[0]]]
  for args in invalid:
   with self.subTest(args=args),self.assertRaises(ValueError):M.load_request(args,self.r)
  self.assertFalse((self.r/'tools').exists())
 def test_style_is_exact_and_paths_cannot_escape(self):
  exact='  TEST_STYLE_LITERAL\n';self.style.write_text(json.dumps({'style':exact}));self.assertEqual(self.config()['style'],exact)
  outside=self.r/'outside';outside.mkdir();(self.r/'tools/voice_samples').mkdir(parents=True);(self.r/'tools/voice_samples/lisa09').symlink_to(outside,target_is_directory=True)
  with self.assertRaises(ValueError):self.config()
 def test_production_request_is_unchanged(self):
  self.assertIsNone(M.load_request(['--keys','lisa_hi1','--ui-lang','en','--vocab','mouse'],self.r))
 def run_mock(self,c,man,errors=None,flags=None,encode=True):
  calls=[]
  def gen(jobs):calls.extend(jobs);return errors or []
  def enc(jobs):
   for out,lang,text,kind in jobs:
    if encode:out.write_bytes(b'candidate'*200);man['clips'][str(out.relative_to(self.r))]={'done':True,'sha':M.cache_identity(text,lang,c['style'],c['voice'],c['model'])}
  status=M.run_audition(c,gen,enc,lambda p:{'flags':flags or [],'duration':1.0},man,lambda:None)
  return status,calls,json.loads((c['directory']/'review.json').read_text())
 def test_completion_reuses_output_and_style_changes_cache_identity(self):
  c=self.config();man={'clips':{}};status,calls,report=self.run_mock(c,man);self.assertEqual(status,0);self.assertEqual(len(calls),10);self.assertEqual(report['humanPronunciationVerdict'],'pending');self.assertEqual(report['automatedTranscriptReview'],'not_run');self.assertEqual(report['clips'][0]['baseline'],'mouse_current.ogg')
  status,calls,_=self.run_mock(c,man);self.assertEqual((status,len(calls)),(0,0))
  self.style.write_text(json.dumps({'style':'CHANGED_TEST_STYLE'}));status,calls,_=self.run_mock(self.config(),man);self.assertEqual(len(calls),10)
  self.assertFalse((self.r/'tools/audio_piper_backup').exists());self.assertFalse((self.r/'tools/gemini_manifest.json').exists())
 def test_missing_generation_errors_and_qa_flags_never_pass(self):
  for errors,flags,encode in [(['test_generation_error'],[],False),([],[],False),([],['test_qa_flag'],True)]:
   with self.subTest(errors=errors,flags=flags):
    c=self.config();status,_,report=self.run_mock(c,{'clips':{}},errors,flags,encode);self.assertEqual(status,1);self.assertFalse(report['technicalReady'])
 def test_cli_rejects_before_credentials_or_import(self):
  p=subprocess.run([sys.executable,str(ROOT/'tools/gen_audio_gemini.py'),'--pt-audition','--keys','unknown'],capture_output=True,text=True,env={'PATH':'/usr/bin:/bin'},timeout=10)
  self.assertNotEqual(p.returncode,0);self.assertNotIn('Set GEMINI_API_KEY',p.stdout+p.stderr);self.assertIn('audition',p.stdout+p.stderr)

 def test_dry_run_cli_accepts_valid_request_without_credentials_or_outputs(self):
  (self.r/'tools').mkdir()
  for name in ['gen_audio_gemini.py','pt_audition.py']:shutil.copyfile(ROOT/'tools'/name,self.r/'tools'/name)
  p=subprocess.run([sys.executable,str(self.r/'tools/gen_audio_gemini.py'),*self.args(),'--audition-dry-run'],env={'PATH':'/usr/bin:/bin'},capture_output=True,text=True,timeout=10)
  self.assertEqual(p.returncode,0,p.stderr);data=json.loads(p.stdout);self.assertEqual(len(data['jobs']),10);self.assertFalse(data['network']);self.assertFalse(data['writes']);self.assertFalse((self.r/'tools/voice_samples').exists());self.assertFalse(list((self.r/'tools').rglob('*.pyc')))
 def test_spend_cap_is_recorded_as_failure(self):
  c=self.config()
  def capped(jobs):raise SystemExit('SPEND CAP test')
  self.assertEqual(M.run_audition(c,capped,lambda j:None,lambda p:{'flags':[]},{'clips':{}},lambda:None),1)
  self.assertIn('SPEND CAP',json.loads((c['directory']/'review.json').read_text())['generationErrors'][0])
 def test_local_qa_rejects_silence_without_asr(self):
  clip=self.r/'silent.ogg';clip.write_bytes(b'OggS'+b'OpusHead'+bytes([1,1])+bytes(2)+(24000).to_bytes(4,'little')+bytes(3))
  probe=SimpleNamespace(returncode=0,stdout=json.dumps({'streams':[{'codec_name':'opus','channels':1}]}))
  decoded=SimpleNamespace(returncode=0,stdout=bytes(48000))
  with mock.patch.object(M.subprocess,'run',side_effect=[probe,decoded]) as run:
   report=M.inspect_clip(clip)
  self.assertIn('silent',str(report['flags']));self.assertEqual(run.call_count,2)

if __name__=='__main__':unittest.main()

