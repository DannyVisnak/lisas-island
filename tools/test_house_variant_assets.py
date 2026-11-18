#!/usr/bin/env python3
import hashlib, importlib.util, json, pathlib, re, unittest, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).resolve().parent.parent
class HouseAssets(unittest.TestCase):
 def test_all_authored_assets_and_provenance_are_present(self):
  maps=json.loads((ROOT/'tools/house_variant_maps.json').read_text())['maps'];manifest=json.loads((ROOT/'tools/house_variant_manifest.json').read_text())
  self.assertEqual(len(manifest['assets']),34)
  for entry in manifest['assets']:
   item,v=entry['id'],entry['variant'];src=(ROOT/entry['source']).read_bytes();dst=(ROOT/entry['output']).read_bytes()
   self.assertEqual(hashlib.sha256(src).hexdigest(),entry['source_sha256']);self.assertEqual(hashlib.sha256(dst).hexdigest(),entry['output_sha256']);self.assertTrue(all(n>=1 for n in entry['counts'].values()))
   self.assertEqual(set(entry['counts']),set(maps[item][v]));ET.fromstring(dst)
   self.assertEqual(re.findall(rb'<path\b[^>]*\bd="([^"]*)"',src),re.findall(rb'<path\b[^>]*\bd="([^"]*)"',dst))
   self.assertEqual(re.findall(rb'<!\[CDATA\[.*?\]\]>',src,re.S),re.findall(rb'<!\[CDATA\[.*?\]\]>',dst,re.S))
   self.assertIn(b'Derived from Noto Emoji (Apache License 2.0)',dst)
   stripped=re.sub(rb'<!-- Derived from Noto Emoji \(Apache License 2\.0\):.*?-->',b'',dst)
   colour=re.compile(rb'(fill:|fill="|stroke:|stroke="|stop-color:|stop-color=")#[0-9A-F]{6}(?![0-9A-F])',re.I)
   self.assertEqual(colour.sub(rb'\1#HEXHEX',src),colour.sub(rb'\1#HEXHEX',stripped),'all non-colour source bytes conserved')
  self.assertFalse((ROOT/'app/img/house/MAP_MANIFEST.json').exists())
  self.assertIn('img/house/*_b.svg and *_c.svg: recoloured copies of the Noto Emoji SVGs above (Apache-2.0); change: fill/stroke/stop colours only.',(ROOT/'app/img/LICENSES.md').read_text())
 def test_single_pass_preserves_noncolour_bytes_including_cdata(self):
  spec=importlib.util.spec_from_file_location('house_build',ROOT/'tools/build_house_variants.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
  source=b'<?xml version="1.0"?><svg><path fill="#FF7555" stroke="#FFCA28" d="M0 1"/><style>.x{fill:#ff7555}</style><![CDATA[x #FF7555]]></svg>'
  out,counts=mod.transform(source,'backpack','b',{'FF7555':'FFCA28','FFCA28':'E0E0E0'})
  self.assertEqual(counts,{'FF7555':2,'FFCA28':1});self.assertIn(b'fill="#FFCA28" stroke="#E0E0E0"',out);self.assertIn(b'fill:#FFCA28',out);self.assertIn(b'<![CDATA[x #FF7555]]>',out)
  self.assertEqual(out.replace(mod.header('backpack','b'),b'').replace(b'fill="#FFCA28"',b'fill="#FF7555"').replace(b'stroke="#E0E0E0"',b'stroke="#FFCA28"').replace(b'fill:#FFCA28',b'fill:#ff7555'),source)
  with self.assertRaises(ValueError):mod.transform(source,'backpack','b',{'123456':'FFFFFF'})
if __name__=='__main__':unittest.main()
