import unittest,tempfile,shutil,json,subprocess,struct,zlib
from PIL import Image
from pathlib import Path
R=Path(__file__).resolve().parent.parent
class Gate(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.r=Path(self.tmp.name)
  for name in ['tools/check_shop_assets.py','app/js/shop_contract.js','app/css/mg_shop.css','content/ui.tsv']:
   p=self.r/name;p.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(R/name,p)
  shutil.copytree(R/'tools/fixtures/approved/shop',self.r/'tools/fixtures/approved/shop')
  shutil.copytree(R/'app/fonts',self.r/'app/fonts')
 def tearDown(self):self.tmp.cleanup()
 def check(self):
  p=subprocess.run(['python3',str(self.r/'tools/check_shop_assets.py'),'--allow-pending-audio','--allow-pending-note'],capture_output=True,text=True);return p,json.loads(p.stdout)
 def test_exact_layered_source_missing_raster_honestly_pending(self):
  p,d=self.check();self.assertEqual(p.returncode,0,p.stderr+str(d));self.assertTrue(d['sourceExact']);self.assertFalse(d['noteRasterReady']);self.assertTrue(d['heldEuroNote']);self.assertIn('audio/ui/en_lisa_shop_note.ogg',d['missingAudio'])
 def test_unapproved_foreign_and_larger_euro_rasters_stay_rejected(self):
  for n in ['gbp_5.png','eur_5_large.png']:
   p=self.r/'app/img/shop'/n;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'bad');r,d=self.check();self.assertNotEqual(r.returncode,0);self.assertTrue(any(n in e for e in d['errors']));p.unlink()
 def test_exact_filename_is_not_enough_to_allow_invalid_raster(self):
  p=self.r/'app/img/shop/eur_5_specimen.png';p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b'not PNG');r,d=self.check();self.assertNotEqual(r.returncode,0);self.assertFalse(d['noteRasterReady'])
 def test_unauthored_css_mutation_is_rejected(self):
  p=self.r/'app/css/mg_shop.css';p.write_text(p.read_text()+'\n/* unauthored */');r,d=self.check();self.assertNotEqual(r.returncode,0);self.assertFalse(d['sourceExact'])
 def put(self,name,data):
  p=self.r/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data);return p
 def expect_rejected(self):
  result,report=self.check();self.assertNotEqual(result.returncode,0,str(report));return report
 def desktop_fonts(self):
  p=self.r/'desktop/build/game/fonts';shutil.copytree(R/'app/fonts',p);return p
 def test_build_font_names_and_text_content_are_rejected(self):
  for name,data in [('app/fonts/Arimo.ttf',b'font'),('app/fonts/LiberationSans-Bold.ttf',b'font'),('app/fonts/unknown.woff2',b'font'),('app/extensionless',b'Arimo'),('desktop/config.css',b'font-family: Liberation Sans'),('desktop/readme.txt',b'LiberationSans')]:
   with self.subTest(name=name):
    p=self.put(name,data)
    try:self.expect_rejected()
    finally:p.unlink()
 def test_missing_or_changed_source_fonts_and_licence_fail_even_with_pending_flags(self):
  for name in ['Andika-Bold.ttf','Andika-Regular.ttf','OFL.txt']:
   p=self.r/'app/fonts'/name;old=p.read_bytes()
   for mutation in ['missing','changed']:
    with self.subTest(name=name,mutation=mutation):
     try:
      if mutation=='missing':p.unlink()
      else:p.write_bytes(old+b'changed')
      self.expect_rejected()
     finally:p.write_bytes(old)
 def test_desktop_copy_requires_complete_exact_font_set(self):
  folder=self.desktop_fonts();result,report=self.check();self.assertEqual(result.returncode,0,str(report))
  for name in ['Andika-Bold.ttf','Andika-Regular.ttf','OFL.txt']:
   p=folder/name;old=p.read_bytes()
   for mutation in ['missing','changed']:
    with self.subTest(name=name,mutation=mutation):
     try:
      if mutation=='missing':p.unlink()
      else:p.write_bytes(old+b'changed')
      self.expect_rejected()
     finally:p.write_bytes(old)
  shutil.rmtree(folder);self.expect_rejected()
 def test_unknown_desktop_font_is_rejected(self):
  self.desktop_fonts();self.put('desktop/build/game/unknown.woff2',b'font');self.expect_rejected()
 def test_valid_changed_note_is_rejected_by_hash_in_source_and_desktop(self):
  source=R/'app/img/shop/eur_5_specimen.png'
  for name in ['app/img/shop/eur_5_specimen.png','desktop/build/game/img/shop/eur_5_specimen.png']:
   with self.subTest(name=name):
    self.put('app/img/shop/eur_5_specimen.png',source.read_bytes())
    p=self.put(name,source.read_bytes())
    if name.startswith('desktop'):self.desktop_fonts()
    result,report=self.check();self.assertEqual(result.returncode,0,str(report))
    im=Image.open(p).convert('RGBA');im.putpixel((10,10),(1,2,3,255));im.save(p,dpi=(63.5,63.5))
    report=self.expect_rejected();self.assertTrue(any('hash' in e.lower() for e in report['errors']),str(report))
    p.unlink()
 def test_larger_note_alternate_eur5_files_and_note_svg_are_rejected(self):
  p=self.put('app/img/shop/eur_5_specimen.png',b'')
  Image.new('RGBA',(600,310),(255,255,255,255)).save(p,dpi=(63.5,63.5));self.expect_rejected();p.unlink()
  for name in ['app/eur_5_source.txt','desktop/eur_5_draft.dat','app/img/banknote.svg','desktop/note.svg']:
   with self.subTest(name=name):
    p=self.put(name,b'<svg/>')
    try:self.expect_rejected()
    finally:p.unlink()
if __name__=='__main__':unittest.main()

