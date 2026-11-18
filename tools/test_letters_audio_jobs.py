import json,pathlib,unittest
from letters_audio_jobs import letter_jobs,select_letter_jobs,ROOT
class LettersAudio(unittest.TestCase):
 def test_exact52(self):
  jobs=letter_jobs(); self.assertEqual(len(jobs),52);self.assertEqual(sum(j[1]=='pt' for j in jobs),6);self.assertEqual(sum(j[1]=='ru' for j in jobs),23);self.assertEqual(sum(j[1]=='en' for j in jobs),23)
  names=[str(j[0].relative_to(ROOT/'app/audio')) for j in jobs]
  self.assertEqual(select_letter_jobs(jobs,['--letter-files',','.join(names)]),jobs)
 def test_no_sound_or_unrelated(self):
  jobs=letter_jobs()
  for value in ['pt/sound_p.ogg','pt/duck.ogg','ui/en_welcome.ogg','pt/word_duck_bare.ogg,','pt/word_duck_bare.ogg,pt/word_duck_bare.ogg']:
   with self.subTest(value=value),self.assertRaises(ValueError):select_letter_jobs(jobs,['--letter-files',value])
  self.assertEqual(select_letter_jobs(jobs,[]),None)
 def test_copy_and_review_truth(self):
  spec=json.loads((ROOT/'content/letters_audio.json').read_text());self.assertEqual(len(spec['assets']),12)
  self.assertTrue(all(x['review']['status']=='needs-ear-check' for x in spec['assets']))
  self.assertEqual(sum(x['text'] is None for x in spec['assets']),6)
  self.assertTrue(all(x['generationStatus']=='blocked-opus-author-prompt' for x in spec['assets'] if x['text'] is None))
if __name__=='__main__':unittest.main()
