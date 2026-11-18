"""Credential-free exact LISA-18 audio allowlists; no synthesis or approval side effects."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def letter_jobs(root=ROOT, include_ui=True, include_blocked=False):
    spec=json.loads((root/'content/letters_audio.json').read_text())
    jobs=[]
    for row in spec['assets']:
        if row['generationStatus']!='ready' and not include_blocked:
            continue
        jobs.append((root/'app'/row['path'],row['lang'],row['text'],row['kind']))
    if include_ui:
        wanted=set(spec['uiKeys'])
        for line in (root/'content/ui.tsv').read_text().splitlines():
            if not line.strip() or line.startswith('#'):continue
            key,lang,text=line.split('\t',2)
            if key in wanted and lang in ('ru','en'):
                jobs.append((root/'app/audio/ui'/f'{lang}_{key}.ogg',lang,text,'lisa'))
    return jobs

def select_letter_jobs(jobs,args):
    flag='--letter-files'
    if flag not in args:return None
    i=args.index(flag)
    if i+1>=len(args) or args[i+1].startswith('--'):raise ValueError('--letter-files requires an exact comma-separated qualified path list')
    names=args[i+1].split(',')
    if not all(names) or len(names)!=len(set(names)):raise ValueError('empty or duplicate --letter-files')
    spec=json.loads((ROOT/'content/letters_audio.json').read_text())
    allowed={str(j[0].relative_to(ROOT/'app/audio')) for j in letter_jobs()}
    blocked={x['path'].removeprefix('audio/') for x in spec['assets'] if x['generationStatus']!='ready'}
    if set(names)&blocked:raise ValueError('isolated phoneme author prompt is held')
    if not set(names)<=allowed:raise ValueError('unknown --letter-files asset')
    selected=[j for j in jobs if str(j[0].relative_to(ROOT/'app/audio')) in names]
    if len(selected)!=len(names):raise ValueError('not every letter file resolved exactly once')
    return selected

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--json',action='store_true');a=p.parse_args()
    rows=[{'path':str(path.relative_to(ROOT/'app/audio')),'lang':lang,'text':text,'kind':kind} for path,lang,text,kind in letter_jobs()]
    print(json.dumps(rows,ensure_ascii=False,indent=2) if a.json else ','.join(row['path'] for row in rows))
