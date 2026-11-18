"""Conditional LISA-18 audio validation. Held phonemes are reported, never faked or approved."""
from pathlib import Path

def letter_asset_requirements(spec,reviews=None):
    required=[];optional=[];reviews=reviews or {}
    for row in spec['assets']:
        if row['kind']=='word':
            required.extend([row['path'],'audio/pt/'+row['anchor']+'.ogg'])
        else:
            key=row['path'].removeprefix('audio/').removesuffix('.ogg')
            record=reviews.get(key,row['review'])
            if record.get('status')=='approved':required.append(row['path'])
            else:optional.append({'path':row['path'],'status':record.get('status','needs-ear-check'),'generationStatus':row['generationStatus']})
    for lang in ['ru','en']:
        required.extend('audio/ui/'+lang+'_'+key+'.ogg' for key in spec['uiKeys'])
    return list(dict.fromkeys(required)),optional

def inspect_letter_assets(app,spec,reviews=None):
    app=Path(app);required,optional=letter_asset_requirements(spec,reviews)
    def available(rel):
        p=app/rel
        return p.is_file() and p.stat().st_size>=1024
    return {'required':required,'missingRequired':[rel for rel in required if not available(rel)],'heldOptional':[dict(row,available=available(row['path'])) for row in optional]}
