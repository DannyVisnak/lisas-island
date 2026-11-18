"""Isolated LISA-09 planning and execution helpers; importing this loads no credentials."""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess

IDS = ('mouse','frog','purple','car','bird','strawberry','pig','black','white','dog')
PREFIX = 'lisa09_pt_clear_v1_'

class Parser(argparse.ArgumentParser):
    def error(self, message):
        raise ValueError('audition: ' + message)


def load_request(argv, root, model='gemini-3.8-flash-tts', voice='Sulafat'):
    if '--pt-audition' not in argv:
        if any('--pt-audition' in a or a == '--audition-dry-run' or PREFIX in a for a in argv):
            raise ValueError('audition: --pt-audition is required')
        return None
    flags = [a.split('=', 1)[0] for a in argv if a.startswith('--')]
    if len(flags) != len(set(flags)):
        raise ValueError('audition: duplicate option')
    parser = Parser(add_help=False, allow_abbrev=False)
    parser.add_argument('--pt-audition', action='store_true')
    parser.add_argument('--keys', required=True)
    parser.add_argument('--pt-audition-style', required=True)
    parser.add_argument('--audition-dry-run', action='store_true')
    args = parser.parse_args(argv)
    keys = args.keys.split(',')
    if not keys or len(set(keys)) != len(keys) or not set(keys) <= {PREFIX+x for x in IDS}:
        raise ValueError('audition: keys must be a nonempty unique subset of the ten approved keys')
    root = pathlib.Path(root).resolve()
    directory = root/'tools/voice_samples/lisa09'
    if directory.resolve() != directory:
        raise ValueError('audition: output directory must not traverse symlinks')
    try:
        supplied = json.loads(pathlib.Path(args.pt_audition_style).read_text())
        sty = supplied['style']
        if not isinstance(sty, str) or not sty.strip():
            raise ValueError('empty style')
    except (OSError, ValueError, KeyError, TypeError) as e:
        raise ValueError('audition: invalid style JSON') from e
    rows = {}
    for line in (root/'content/vocab.tsv').read_text().splitlines():
        if not line or line.startswith('#'):
            continue
        fields = line.split('\t')
        if len(fields) != 10:
            raise ValueError('audition: vocabulary row must have ten columns')
        id_ = fields[1].strip()
        if id_ in rows:
            raise ValueError('audition: duplicate vocabulary ID')
        rows[id_] = fields[4].strip()
    jobs, baselines = [], {}
    for key in keys:
        id_ = key.removeprefix(PREFIX)
        baseline = root/'app/audio/pt'/(id_+'.ogg')
        if id_ not in rows or not rows[id_] or not baseline.is_file() or baseline.stat().st_size <= 1024:
            raise ValueError('audition: missing vocabulary or baseline: '+id_)
        jobs.append((directory/(key+'.ogg'), 'pt', rows[id_], 'word'))
        baselines[key] = baseline
    # Guard every existing descendant, including caches and manifests, before any writes.
    if directory.exists() and any(p.is_symlink() for p in directory.rglob('*')):
        raise ValueError('audition: symlink under output directory')
    return {'root':root, 'directory':directory, 'style':sty, 'model':model, 'voice':voice,
            'dryRun':args.audition_dry_run, 'jobs':jobs, 'baselines':baselines}


def cache_identity(text, lang, style, voice, model):
    return hashlib.sha256(json.dumps([text,voice,style,lang,model],ensure_ascii=False).encode()).hexdigest()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def inspect_clip(path):
    """Local mechanical QA only; no transcription or pronunciation judgement."""
    import numpy as np
    flags = []
    probe = subprocess.run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(path)],capture_output=True,text=True,timeout=30)
    if probe.returncode:
        return {'flags':['ffprobe failed'], 'duration':0}
    info = json.loads(probe.stdout)
    streams = info.get('streams', [])
    if len(streams) != 1 or streams[0].get('codec_name') != 'opus' or streams[0].get('channels') != 1:
        flags.append('requires one mono Opus stream')
    # Opus reports a 48 kHz decoding clock; verify the original input rate in OpusHead.
    raw = path.read_bytes();head = raw.find(b'OpusHead')
    if head < 0 or int.from_bytes(raw[head+12:head+16], 'little') != 24000:
        flags.append('requires 24 kHz Opus input rate')
    decoded = subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(path),'-f','s16le','-ac','1','-ar','24000','-'],capture_output=True,timeout=30)
    if decoded.returncode or not decoded.stdout:
        return {'flags':flags+['audio decoding failed'], 'duration':0}
    x = np.frombuffer(decoded.stdout,dtype=np.int16).astype(np.float32)/32768
    duration = len(x)/24000
    if not 0.25 <= duration <= 6:
        flags.append('word duration outside 0.25..6 seconds')
    if np.max(np.abs(x)) < .01:
        flags.append('empty or silent clip')
    if np.max(np.abs(x)) >= .999:
        flags.append('clipping')
    # Same head/tail thresholds as the existing verify_tails.py, on 24 kHz PCM.
    if len(x) >= int(.3*24000):
        body=x[:-int(.12*24000)];last80=np.sqrt(np.mean(body[-int(.08*24000):]**2));t=body[-int(.14*24000):-int(.025*24000)]
        spectrum=np.abs(np.fft.rfft(t*np.hanning(len(t))))**2+1e-12
        flat=float(np.exp(np.mean(np.log(spectrum)))/np.mean(spectrum))
        if flat>.30 and 20*np.log10(last80+1e-9)>-20 and np.sqrt(np.mean(t**2))>.15:flags.append('noise-like tail')
        if np.max(np.abs(body[-int(.005*24000):]))>.02:flags.append('tail not faded to zero')
        if np.max(np.abs(x[int(.06*24000):int(.062*24000)]))>.05:flags.append('head click')
    return {'flags':flags,'duration':duration}


def run_audition(config, generate, encode, inspect, manifest, persist):
    """Callbacks reuse production TTS/encoding; all filesystem writes remain isolated."""
    directory, root = config['directory'], config['root']
    directory.mkdir(parents=True,exist_ok=True)
    for sub in ('_gemini_raw','_wav'):
        (directory/sub).mkdir(exist_ok=True)
    rows = []
    for out,lang,text,kind in config['jobs']:
        src = config['baselines'][out.stem];baseline = directory/(src.stem+'_current.ogg')
        if baseline.exists() and digest(baseline) != digest(src):
            raise ValueError('audition: baseline changed since previous run')
        if not baseline.exists():
            shutil.copyfile(src,baseline)
        rows.append({'key':out.stem,'transcript':text,'baseline':baseline.name,'baselineSha256':digest(src),'candidate':out.name,'parentVerdict':'pending'})
    pending = []
    for job in config['jobs']:
        out,lang,text,kind = job;entry = manifest['clips'].get(str(out.relative_to(root)),{})
        identity = cache_identity(text,lang,config['style'],config['voice'],config['model'])
        if not (entry.get('done') and entry.get('sha') == identity and out.is_file() and out.stat().st_size > 1024 and entry.get('outputSha256') == digest(out)):
            pending.append(job)
    for out, *_ in pending:
        entry = manifest['clips'].get(str(out.relative_to(root)))
        if entry is not None:
            entry['done'] = False
            entry.pop('outputSha256', None)
    errors = []
    try:
        errors.extend(generate(pending) or [])
        encode(pending)
    except (Exception, SystemExit) as e:
        errors.append(type(e).__name__+': '+str(e))
    ready = not errors
    for job,row in zip(config['jobs'],rows):
        out,lang,text,kind = job;entry = manifest['clips'].get(str(out.relative_to(root)),{})
        if not out.is_file() or out.stat().st_size <= 1024:
            row['structuralQA']={'flags':['missing or empty candidate'],'duration':0};ready=False
        else:
            row['candidateSha256']=digest(out)
            try:row['structuralQA']=inspect(out)
            except Exception as e:row['structuralQA']={'flags':[type(e).__name__+': '+str(e)],'duration':0}
            identity=cache_identity(text,lang,config['style'],config['voice'],config['model'])
            if not entry.get('done') or entry.get('sha') != identity:
                row['structuralQA']['flags'].append('candidate is not complete for this style')
            if row['structuralQA']['flags']:ready=False
            else:entry['outputSha256']=row['candidateSha256']
    report={'model':config['model'],'voice':config['voice'],'locale':'pt-PT','style':config['style'],
            'technicalReady':ready,'automatedTranscriptReview':'not_run','humanPronunciationVerdict':'pending',
            'generationErrors':[str(e) for e in errors],'clips':rows}
    (directory/'review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    persist()
    return 0 if ready else 1
