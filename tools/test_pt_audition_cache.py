"""Cross-module cache contracts using the generator's actual AST encode and raw-cache branches."""
import ast
import hashlib
import json
import os
import pathlib
import shutil
import threading
import unittest
import test_pt_audition as base

M=base.M
class CacheIntegrity(unittest.TestCase):
 setUp=base.Audition.setUp
 tearDown=base.Audition.tearDown
 args=base.Audition.args
 def configured(self):
  c=M.load_request(self.args(self.keys[:1]),self.r)
  out,lang,text,kind=c['jobs'][0];out.parent.mkdir(parents=True)
  good=b'known encoded current-style clip'*100
  out.write_bytes(good)
  h=M.cache_identity(text,lang,c['style'],c['voice'],c['model'])
  raw=out.parent/'_gemini_raw';raw.mkdir();(raw/(h+'.pcm')).write_bytes(b'cached waveform placeholder'*100)
  rel=str(out.relative_to(self.r));man={'clips':{rel:{'done':True,'sha':h,'outputSha256':M.digest(out)}}}
  return c,out,h,rel,man,good
 def actual_adapter(self,c,man,good,fail_encode=False):
  calls={'tts':0,'encoded':0,'processed':0}
  def tts(*args):calls['tts']+=1;raise RuntimeError('test missing raw cache; network is forbidden')
  def process(pcm):calls['processed']+=1;return pcm
  def encode(batch):
   if fail_encode:raise RuntimeError('test encoder failure')
   for out,wav in batch:calls['encoded']+=1;out.write_bytes(good)
  ns={'os':os,'hashlib':hashlib,'pathlib':pathlib,'shutil':shutil,'lock':threading.Lock(),
      'T':c['directory'],'RAW':c['directory']/'_gemini_raw','ROOT':self.r,'man':man,'save':lambda:None,
      'SR':24000,'tts':tts,'process':process,'encode':encode,'write_wav':lambda p,x:p.write_bytes(b'waveform placeholder'),
      'sha':lambda text,lang,sty:M.cache_identity(text,lang,sty,c['voice'],c['model']),
      'job_style':lambda lang,kind:c['style']}
  tree=ast.parse((base.ROOT/'tools/gen_audio_gemini.py').read_text())
  for name in ['gen_one','stage_encode']:
   node=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name==name)
   exec(compile(ast.Module(body=[node],type_ignores=[]),'actual-generator-'+name,'exec'),ns)
  def generate(jobs):
   errors=[]
   for j in jobs:
    try:ns['gen_one'](j)
    except Exception as e:errors.append(str(e))
   return errors
  return generate,ns['stage_encode'],calls
 def run_actual(self,c,man,good,fail_encode=False):
  gen,encode,calls=self.actual_adapter(c,man,good,fail_encode)
  rc=M.run_audition(c,gen,encode,lambda p:{'flags':[],'duration':1.0},man,lambda:None)
  return rc,calls,json.loads((c['directory']/'review.json').read_text())
 def test_corrupt_completed_output_reencodes_cached_pcm_without_tts(self):
  c,out,h,rel,man,good=self.configured();out.write_bytes(b'altered but structurally valid candidate'*100)
  rc,calls,report=self.run_actual(c,man,good)
  self.assertEqual(out.read_bytes(),good,'actual stage_encode must rebuild the candidate instead of skipping stale done=True')
  self.assertEqual((rc,calls['tts'],calls['encoded']),(0,0,1));self.assertTrue(report['technicalReady'])
  self.assertEqual(man['clips'][rel]['outputSha256'],hashlib.sha256(good).hexdigest())
 def test_healthy_completed_output_does_not_generate_or_encode(self):
  c,out,h,rel,man,good=self.configured();rc,calls,report=self.run_actual(c,man,good)
  self.assertEqual((rc,calls['tts'],calls['encoded'],calls['processed']),(0,0,0,0));self.assertEqual(out.read_bytes(),good)
 def test_new_style_with_cached_pcm_reencodes_and_updates_identity(self):
  c,out,h,rel,man,good=self.configured();c['style']='SECOND_TEST_STYLE'
  new=M.cache_identity(c['jobs'][0][2],'pt',c['style'],c['voice'],c['model']);(c['directory']/'_gemini_raw'/(new+'.pcm')).write_bytes(b'new-style cached waveform'*100)
  rc,calls,report=self.run_actual(c,man,good)
  self.assertEqual((rc,calls['tts'],calls['encoded']),(0,0,1));self.assertEqual(man['clips'][rel]['sha'],new)
 def test_missing_candidate_rebuilds_from_cached_pcm(self):
  c,out,h,rel,man,good=self.configured();out.unlink();rc,calls,report=self.run_actual(c,man,good)
  self.assertEqual((rc,calls['tts'],calls['encoded']),(0,0,1));self.assertEqual(out.read_bytes(),good)
 def test_encoder_failure_does_not_bless_corrupt_existing_candidate(self):
  c,out,h,rel,man,good=self.configured();out.write_bytes(b'altered structurally valid candidate'*100)
  rc,calls,report=self.run_actual(c,man,good,fail_encode=True)
  self.assertEqual(rc,1);self.assertFalse(report['technicalReady']);self.assertFalse(man['clips'][rel]['done']);self.assertNotIn('outputSha256',man['clips'][rel])
 def test_missing_raw_and_generation_failure_stays_incomplete(self):
  c,out,h,rel,man,good=self.configured();out.write_bytes(b'altered structurally valid candidate'*100);(c['directory']/'_gemini_raw'/(h+'.pcm')).unlink()
  rc,calls,report=self.run_actual(c,man,good)
  self.assertEqual(rc,1);self.assertFalse(report['technicalReady']);self.assertFalse(man['clips'][rel]['done']);self.assertNotIn('outputSha256',man['clips'][rel]);self.assertEqual(calls['encoded'],0)

if __name__=='__main__':unittest.main()
