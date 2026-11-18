#!/usr/bin/env python3
"""Build house-only Noto colour variants from exact Opus maps; no source writes."""
import argparse, collections, hashlib, json, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parent.parent
COLOUR=re.compile(rb'(fill:|fill="|stroke:|stroke="|stop-color:|stop-color=")#([0-9A-F]{6})(?![0-9A-F])',re.I)
def sha(raw):return hashlib.sha256(raw).hexdigest()
def header(item,variant):
 return f'<!-- Derived from Noto Emoji (Apache License 2.0): colours changed only, Lisa\'s house variant {variant}; original app/img/{item}.svg -->'.encode()
def transform(raw,item,variant,colours):
 if not re.fullmatch(r'[a-z]+',item) or variant not in ('b','c'):raise ValueError('invalid output id')
 if any(not re.fullmatch(r'[0-9A-F]{6}',x) for pair in colours.items() for x in pair):raise ValueError('invalid map hex')
 counts={key:0 for key in colours}
 def sub(m):
  key=m[2].decode().upper()
  if key not in colours:return m[0]
  counts[key]+=1;return m[1]+b'#'+colours[key].encode()
 changed=COLOUR.sub(sub,raw)
 if any(n==0 for n in counts.values()):raise ValueError(f'{item}/{variant}: unused map keys: '+','.join(k for k,n in counts.items() if not n))
 if changed==raw:raise ValueError(f'{item}/{variant}: unchanged output')
 index=raw.index(b'?>')+2 if raw.startswith(b'<?xml') else 0
 return changed[:index]+header(item,variant)+changed[index:],counts

def build(root=ROOT,check=False):
 maps=json.loads((root/'tools/house_variant_maps.json').read_text())['maps'];assets=[];outputs={};sources={}
 for item,variants in maps.items():
  source=f'app/img/{item}.svg';raw=(root/source).read_bytes();sources[source]=raw
  for variant in ('b','c'):
   result,counts=transform(raw,item,variant,variants[variant]);output=f'app/img/house/{item}_{variant}.svg';outputs[output]=result
   assets.append({'id':item,'variant':variant,'source':source,'output':output,'source_sha256':sha(raw),'output_sha256':sha(result),'counts':counts})
 # Validate every map and source before writing anything.
 for source,raw in sources.items():
  if (root/source).read_bytes()!=raw:raise ValueError('source changed: '+source)
 manifest={'author':'Opus 5.5; deterministic technical build','assets':assets}
 encoded=(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n').encode();outputs['tools/house_variant_manifest.json']=encoded
 for output,raw in outputs.items():
  dest=root/output
  if check:
   if not dest.exists() or dest.read_bytes()!=raw:raise ValueError('stale or missing output: '+output)
  else:
   dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 for source,raw in sources.items():
  if (root/source).read_bytes()!=raw:raise ValueError('source changed after write: '+source)
 for e in assets:print(e['output']+' '+json.dumps(e['counts'],sort_keys=True))
 print(f'{len(assets)} variants; {len(sources)} source hashes unchanged; manifest tools/house_variant_manifest.json; '+('checked' if check else 'written'))
 return manifest
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true');args=parser.parse_args()
 try:build(check=args.check)
 except (ValueError,OSError,KeyError) as exc:parser.exit(1,str(exc)+'\n')
