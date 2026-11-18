import ast, pathlib, unittest
source = ast.parse(pathlib.Path('tools/gen_audio_gemini.py').read_text())
ns = {}
# Extract pure functions only: importing the module would load credentials.
for n in source.body:
    if isinstance(n, ast.Assign) and any(isinstance(t,ast.Name) and t.id=='LANGN' for t in n.targets):
        exec(compile(ast.Module(body=[n],type_ignores=[]),'generator','exec'),ns)
    if isinstance(n,ast.FunctionDef) and n.name in ('style','select_jobs'):
        exec(compile(ast.Module(body=[n],type_ignores=[]),'generator','exec'),ns)
class AudioLanguage(unittest.TestCase):
 def test_lisa_language(self):
  self.assertIn('British English',ns['style']('en','lisa'))
  self.assertNotIn('Russian',ns['style']('en','lisa'))
  self.assertIn('Russian',ns['style']('ru','lisa'))
 def test_exact_selection(self):
  jobs=[(pathlib.Path('app/audio/ui/'+s+'.ogg'),lang,'text','lisa') for s,lang in [('ru_lisa_hi1','ru'),('en_lisa_hi1','en'),('en_lisa_hi10','en')]]+[(pathlib.Path('app/audio/en/cat.ogg'),'en','cat','word')]
  self.assertIn('select_jobs',ns)
  self.assertEqual([str(j[0]) for j in ns['select_jobs'](jobs,['--keys','lisa_hi1','--ui-lang','en'])],['app/audio/ui/en_lisa_hi1.ogg'])
  with self.assertRaises(ValueError): ns['select_jobs'](jobs,['--ui-lang','xx'])
if __name__=='__main__': unittest.main()
