"""Credential-free isolation checks for the integrated audio selector; never imports generator."""
import ast
import pathlib
import unittest
source = ast.parse(pathlib.Path('tools/gen_audio_gemini.py').read_text())
ns = {}
for n in source.body:
    if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'LANGN' for t in n.targets):
        exec(compile(ast.Module(body=[n], type_ignores=[]), 'generator', 'exec'), ns)
    if isinstance(n, ast.FunctionDef) and n.name == 'select_jobs':
        exec(compile(ast.Module(body=[n], type_ignores=[]), 'generator', 'exec'), ns)

class SelectorUnion(unittest.TestCase):
    def setUp(self):
        self.jobs = [(pathlib.Path('app/audio/ui/'+lang+'_'+key+'.ogg'),lang,key,'lisa') for lang in ('ru','en') for key in ('cs_more_1','cs_more_10')]
        self.jobs += [(pathlib.Path('app/audio/'+lang+'/'+key+'.ogg'),lang,key,'word') for lang in ('pt','en','de','ru') for key in ('castle','castle_q','castle2','castle2_q')]
    def selected(self,args):
        return [str(j[0]) for j in ns['select_jobs'](self.jobs,args)]
    def vocab_paths(self):
        return [str(j[0]) for j in self.jobs if j[0].parent.name != 'ui' and j[0].stem in ('castle','castle_q')]
    def test_vocab_alone_never_includes_ui_or_prefix_collisions(self):
        self.assertEqual(self.selected(['--vocab','castle']),self.vocab_paths())
    def test_union_keeps_ui_language_scope_and_all_explicit_vocab_languages(self):
        self.assertEqual(self.selected(['--keys','cs_more_1','--ui-lang','en','--vocab','castle']), ['app/audio/ui/en_cs_more_1.ogg']+self.vocab_paths())
    def test_key_only_and_language_only_never_include_vocab(self):
        self.assertEqual(self.selected(['--keys','cs_more_1','--ui-lang','en']), ['app/audio/ui/en_cs_more_1.ogg'])
        self.assertEqual(self.selected(['--ui-lang','en']), ['app/audio/ui/en_cs_more_1.ogg','app/audio/ui/en_cs_more_10.ogg'])
    def test_unscoped_is_unchanged_and_invalid_values_fail_closed(self):
        self.assertEqual(ns['select_jobs'](self.jobs,[]),self.jobs)
        for args in (['--vocab'],['--vocab',''],['--vocab','castle,'],['--keys'],['--keys',''],['--ui-lang','xx'],['--vocab','--keys']):
            with self.subTest(args=args), self.assertRaises(ValueError): self.selected(args)
if __name__ == '__main__': unittest.main()
