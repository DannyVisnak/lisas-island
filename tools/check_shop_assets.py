#!/usr/bin/env python3
"""Exact layered Opus sources; raster structure and audio readiness, never legal clearance."""
from pathlib import Path
import hashlib,json,sys,struct,zlib
R=Path(__file__).resolve().parent.parent
O=R/'tools/fixtures/approved/shop'
d=json.loads((O/'OPUS_DESIGN.json').read_text())
delta=json.loads((O/'EUR5_NOTE_DELTA.json').read_text())
s=(R/'app/js/shop_contract.js').read_text();c=json.loads(s[s.index('this,')+5:s.rindex(');')])
errors=[]
note_edit=next(e for e in delta['exactEdits'] if e['id']=='C2')
expected_notes=json.loads('{'+note_edit['new'].split(', "moneySizes"')[0]+'}')['noteAssets']
if c.get('noteAssets')!=expected_notes:errors.append('noteAssets differs from exact Opus delta')
for name in ['coinSvgAssets','iconSvg']:
 if c[name]!=d[name]:errors.append(name+' differs from exact Opus source')
css=d['cssAsset']['content']
for patch in [json.loads((O/'TOUCH_SHOP_CORRECTION.json').read_text()),json.loads((O/'RENDER_REVIEW_V2.json').read_text()),delta]:
 for e in patch['exactEdits']:
  if e.get('path',e.get('file'))!='app/css/mg_shop.css':continue
  if 'old' in e:
   if css.count(e['old'])!=1:errors.append('invalid author CSS anchor');continue
   css=css.replace(e['old'],e['new'])
  elif e['id']=='S1':css=css.replace('@media (prefers-reduced-motion',e['new']+'\n@media (prefers-reduced-motion')
if (R/'app/css/mg_shop.css').read_text()!=css:errors.append('CSS differs from layered exact Opus source')
for name in ['eur_c1','eur_c2','eur_c5','eur_c10','eur_c20','eur_c50','eur_1','eur_2','counter']:
 if not c['coinSvgAssets'][name].startswith('<svg ') or not c['coinSvgAssets'][name].endswith('</svg>'):errors.append('missing SVG '+name)
asset=R/'app/img/shop/eur_5_specimen.png';raster_ready=False;raster_errors=[]
if asset.exists():
 try:
  raw=asset.read_bytes();assert raw[:8]==b'\x89PNG\r\n\x1a\n','not PNG';pos=8;chunks=[];phys=None;dims=None
  while pos<len(raw):
   size=struct.unpack('>I',raw[pos:pos+4])[0];typ=raw[pos+4:pos+8];payload=raw[pos+8:pos+8+size];crc=struct.unpack('>I',raw[pos+8+size:pos+12+size])[0];assert zlib.crc32(typ+payload)&0xffffffff==crc,'PNG CRC';chunks.append(typ.decode());pos+=size+12
   if typ==b'IHDR':dims=struct.unpack('>IIBBBBB',payload)
   if typ==b'pHYs':phys=struct.unpack('>IIB',payload)
  assert dims==(300,155,8,6,0,0,0),'requires 300x155 8-bit RGBA';assert phys==(2500,2500,1),'requires 63.5dpi';assert set(chunks)<= {'IHDR','pHYs','IDAT','IEND','sRGB'},'unapproved metadata';assert chunks[0]=='IHDR' and chunks[-1]=='IEND' and pos==len(raw),'PNG structure'
  from PIL import Image
  im=Image.open(asset);im.load()
  for y in range(155):
   for x in range(300):
    if not ((x<4 or x>=296) and (y<4 or y>=151)):assert im.getpixel((x,y))[3]==255,'transparent pixels outside corner radii'
  raster_ready=True
 except Exception as e:raster_errors.append('invalid allowed euro raster: '+str(e))
font_allowlist=json.loads((O/'FONT_ALLOWLIST.json').read_text())
font_paths={R/name:digest for name,digest in font_allowlist.items()}
desktop=R/'desktop'
if desktop.exists():
 # Each packaged game/fonts mirror needs the complete approved set, including its licence.
 roots={p.parent for p in desktop.rglob('fonts') if p.is_dir()}
 roots.update(p for p in desktop.rglob('game') if p.is_dir())
 for root in roots:
  for name,digest in font_allowlist.items():font_paths[root/Path(name).relative_to('app')]=digest
for p,digest in font_paths.items():
 if not p.is_file():errors.append('missing approved font/licence '+str(p.relative_to(R)))
 elif hashlib.sha256(p.read_bytes()).hexdigest()!=digest:errors.append('approved font/licence hash mismatch '+str(p.relative_to(R)))
NOTE_SHA256='061500f9507682421f8b8625d71a799512fe033b0eb671b2f785acfd4d95ae62'
for base in [R/'app',R/'desktop']:
 if not base.exists():continue
 for p in base.rglob('*'):
  if not p.is_file():continue
  if p.suffix.lower() in {'.ttf','.otf','.woff','.woff2','.ttc','.otc','.eot','.pfa','.pfb'} and p not in font_paths:errors.append('unapproved font '+str(p.relative_to(R)))
  raw=p.read_bytes()
  try:text=raw.decode('utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8')
  except UnicodeDecodeError:text=''
  if any(name in text for name in ['LiberationSans','Liberation Sans','Arimo']):errors.append('build-only font reference '+str(p.relative_to(R)))
  if p.name.startswith('eur_5'):
   allowed_note=(p==asset or (base==desktop and p.name=='eur_5_specimen.png' and p.parent.parts[-2:]==('img','shop')))
   if not allowed_note:errors.append('unexpected euro note/source file '+str(p.relative_to(R)))
   elif hashlib.sha256(raw).hexdigest()!=NOTE_SHA256:errors.append('euro note hash mismatch '+str(p.relative_to(R)))
  if p.suffix.lower()=='.svg' and 'note' in p.stem.lower():errors.append('unexpected note SVG '+str(p.relative_to(R)))
  if ('shop' in p.parts or p.name.startswith(('eur_5','gbp_5','gbp_10','usd_1','chf_10','chf_20','brl_2','brl_5'))) and p.suffix.lower() in {'.png','.svg','.pdf','.psd','.xcf'}:
   allowed=(p==asset or (base==R/'desktop' and p.name=='eur_5_specimen.png' and 'shop' in p.parts and asset.exists() and p.read_bytes()==asset.read_bytes()))
   if not allowed:errors.append('unexpected shop note/source file '+str(p.relative_to(R)))
source_exact=not errors
errors+=raster_errors
pairs=json.loads((O/'AUDIO_JOBS.json').read_text());pairs.append({'path':'audio/ui/en_lisa_shop_note.ogg'})
missing=sorted(set(x['path'] for x in pairs if not (R/'app'/x['path']).exists() or (R/'app'/x['path']).stat().st_size<1024))
# Structural validation is not font/SPECIMEN measurement or Opus visual acceptance.
report={'sourceExact':source_exact,'noteRasterReady':raster_ready,'noteRasterSha256':hashlib.sha256(asset.read_bytes()).hexdigest() if asset.exists() else None,'noteV2V5ReviewRequired':True,'audioReady':not missing,'audioListeningApproved':False,'missingAudioCount':len(missing),'missingAudio':missing,'heldEuroNote':True,'heldForeignNoteArt':True,'errors':errors}
print(json.dumps(report,ensure_ascii=False,indent=2))
sys.exit(1 if errors or (not raster_ready and '--allow-pending-note' not in sys.argv) or (missing and '--allow-pending-audio' not in sys.argv) else 0)
