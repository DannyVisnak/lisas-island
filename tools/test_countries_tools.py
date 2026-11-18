"""Controller-run only: mocked/no-network production generator checks."""
import ast, pathlib, tempfile, unittest, json, shutil, importlib.util
ROOT=pathlib.Path(__file__).resolve().parent.parent
class CountryTools(unittest.TestCase):
 def selector(self):
  tree=ast.parse((ROOT/'tools/gen_audio_gemini.py').read_text());ns={}
  for n in tree.body:
   if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='LANGN' for t in n.targets):exec(compile(ast.Module(body=[n],type_ignores=[]),'selector','exec'),ns)
   if isinstance(n,ast.FunctionDef) and n.name=='select_jobs':exec(compile(ast.Module(body=[n],type_ignores=[]),'selector','exec'),ns)
  return ns['select_jobs']
 def test_new_vocab_selector_exact_and_ambiguous_fail_closed(self):
  jobs=[(pathlib.Path('app/audio/'+lang+'/'+stem+'.ogg'),lang,stem,'word') for lang in ('pt','en','de','ru') for stem in ('country_panda','country_panda_q','country_panda2')]
  jobs += [(pathlib.Path('app/audio/ui/en_country_panda.ogg'),'en','x','lisa')]
  selected=self.selector()(jobs,['--vocab-ids','country_panda']);self.assertEqual(len(selected),8);self.assertFalse(any(j[0].parent.name=='ui' for j in selected))
  for args in (['--vocab-ids','bad'],['--vocab-ids','country_panda','--keys','x'],['--vocab-ids','country_panda,country_panda'],['--vocab-ids']):
   with self.subTest(args=args),self.assertRaises(ValueError):self.selector()(jobs,args)
 def test_greeting_selector_preserves_explicit_locale(self):
  j=(pathlib.Path('app/audio/countries/country_hello_eg.ogg'),'ar-EG','أهلاً!','greeting')
  self.assertEqual(self.selector()([j],['--country-greeting-keys','country_hello_eg']),[j])
  with self.assertRaises(ValueError):self.selector()([j],['--country-greeting-keys','unknown'])
 def test_generator_optional_inventory_and_approved_text(self):
  spec=importlib.util.spec_from_file_location('country_build',ROOT/'tools/build_data.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  with tempfile.TemporaryDirectory() as t:
   tmp=pathlib.Path(t);shutil.copytree(ROOT/'content',tmp/'content');(tmp/'app/js').mkdir(parents=True);m.ROOT=tmp;m.main()
   text=(tmp/'app/js/data.js').read_text();data=json.loads(text[text.index('{'):text.rindex('}')+1])
   self.assertNotIn('countries',[w['id'] for w in data['worlds']]);self.assertEqual(len(data['packs']['countries']['countries']),12);self.assertEqual(len(data['packs']['countries']['items']),41)
   self.assertEqual(data['items']['country_sardine']['pt']['word'],'a sardinha');self.assertEqual(data['packs']['countries']['greetings']['country_hello_eg']['locale'],'ar-EG')

 def test_readiness_inventory_fails_closed_without_real_assets(self):
  spec=importlib.util.spec_from_file_location('country_ready_build',ROOT/'tools/build_data.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
  with tempfile.TemporaryDirectory() as t:
   tmp=pathlib.Path(t);shutil.copytree(ROOT/'content',tmp/'content');(tmp/'app/js').mkdir(parents=True);m.ROOT=tmp;m.main()
   text=(tmp/'app/js/data.js').read_text();data=json.loads(text[text.index('{'):text.rindex('}')+1]);pack=data['packs']['countries']
   self.assertIn('readyAssets',pack);self.assertEqual(pack['readyAssets'],[])
   self.assertIn('food',pack['countries'][0]);self.assertEqual(pack['countries'][0]['food'],['country_sardine','country_custard_tart'])
   self.assertEqual(pack['countries'][0]['greetingSrc'],'audio/pt/hello.ogg')
   (tmp/'app/img').mkdir();(tmp/'app/img/country_tram.svg').write_text('x'*100)
   (tmp/'app/audio/pt').mkdir(parents=True);(tmp/'app/audio/pt/country_sardine.ogg').write_bytes(b'x'*1024)
   (tmp/'app/audio/pt/country_sardine_q.ogg').write_bytes(b'x'*20)
   m.main();text=(tmp/'app/js/data.js').read_text();data=json.loads(text[text.index('{'):text.rindex('}')+1]);inventory=data['packs']['countries']['readyAssets']
   self.assertIn('img/country_tram.svg',inventory);self.assertIn('audio/pt/country_sardine.ogg',inventory);self.assertNotIn('audio/pt/country_sardine_q.ogg',inventory)

if __name__=='__main__':unittest.main()
