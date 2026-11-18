import copy,json,pathlib,tempfile,unittest
from letters_asset_requirements import inspect_letter_assets
ROOT=pathlib.Path(__file__).resolve().parent.parent
class LetterAssets(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.app=pathlib.Path(self.tmp.name);self.spec=json.loads((ROOT/'content/letters_audio.json').read_text())
 def make(self,rel):
  p=self.app/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'test-only-not-audio'*100)
 def fill(self):
  for row in self.spec['assets']:
   if row['kind']=='word':self.make(row['path']);self.make('audio/pt/'+row['anchor']+'.ogg')
  for lang in ['ru','en']:
   for key in self.spec['uiKeys']:self.make('audio/ui/'+lang+'_'+key+'.ogg')
 def test_required_bare_full_and_ui_missing_fail(self):
  r=inspect_letter_assets(self.app,self.spec);self.assertIn('audio/pt/word_duck_bare.ogg',r['missingRequired']);self.assertIn('audio/pt/duck.ogg',r['missingRequired']);self.assertIn('audio/ui/en_lisa_letters_intro.ogg',r['missingRequired']);self.assertIn('audio/ui/ru_lisa_letters_finish.ogg',r['missingRequired']);self.assertEqual(len(r['heldOptional']),6)
 def test_complete_bare_track_does_not_require_unapproved_sound(self):
  self.fill();r=inspect_letter_assets(self.app,self.spec);self.assertEqual(r['missingRequired'],[]);self.assertEqual(len(r['heldOptional']),6);self.assertTrue(all(x['status']=='needs-ear-check' and not x['available'] for x in r['heldOptional']))
 def test_approved_but_missing_sound_is_required_and_rejected(self):
  self.fill();reviews={'pt/sound_p':{'status':'approved','reviewer':'explicit-test-fixture','reviewerKind':'parent','date':'2026-11-17'}};r=inspect_letter_assets(self.app,self.spec,reviews);self.assertEqual(r['missingRequired'],['audio/pt/sound_p.ogg']);self.assertEqual(len(r['heldOptional']),5);self.make('audio/pt/sound_p.ogg');self.assertEqual(inspect_letter_assets(self.app,self.spec,reviews)['missingRequired'],[])
if __name__=='__main__':unittest.main()
