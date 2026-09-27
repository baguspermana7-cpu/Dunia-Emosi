#!/usr/bin/env python3
"""
G28 Stinky & Dirty — Indonesian narration, rendered offline and verified by ear-proxy.

    ~/.venvs/mms/bin/python tools/sd_tts.py            # everything missing/changed
    ~/.venvs/mms/bin/python tools/sd_tts.py LIS-01     # only these cards
    ~/.venvs/mms/bin/python tools/sd_tts.py --force

VOICE: Meta MMS-TTS Indonesian (facebook/mms-tts-ind, CC BY-NC 4.0 — allowed for this
free, ad-free, non-commercial kids' game with attribution; see assets/sd/audio/LICENSE.txt).
Chosen by measurement (2026-09-27): Piper's only Indonesian voice has no clear licence;
MMS at default settings scored 72% words-heard, tuned (noise 0.2, duration noise 0.3,
rate 0.85) 87% best-of-2. So every clip is rendered up to 8 times (different seeds) and
KEPT ONLY IF faster-whisper (small, language=id) hears >= 90% of its words in order.
A line that never passes gets NO clip: the game shows the text (PRD: audio is optional,
every card works at volume zero) — the pass rate is printed and recorded.

Output: assets/sd/audio/<CARD>-<part>.webm (part = s0.., q, h1, h2, x) and
        assets/sd/audio/line/<name>.webm; manifest assets/sd/audio/verified.json (sha1,
        text, heard, score) and games/data/sd-audio.js (the keys the game may play).
"""
import hashlib, json, os, re, shutil, subprocess, sys, tempfile
import numpy as np, soundfile as sf

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AUD = os.path.join(ROOT, 'assets', 'sd', 'audio')
MAN = os.path.join(AUD, 'verified.json')
JS = os.path.join(ROOT, 'games', 'data', 'sd-audio.js')
NUM = {'0': 'nol', '1': 'satu', '2': 'dua', '3': 'tiga', '4': 'empat', '5': 'lima', '6': 'enam', '7': 'tujuh', '8': 'delapan', '9': 'sembilan', '10': 'sepuluh', '12': 'dua belas'}
LINES = {'hebat': 'Hebat! Jawabanmu benar.', 'lihat-lagi': 'Ayo lihat lagi.'}
PASS = 0.90
# Character names are not Indonesian words: Whisper(id) writes "Pip" as "tapi" whatever the
# voice does, so they are left out of the score (and listed here so that is a decision).
NAMES = {'pip', 'mimi', 'rover', 'koko', 'lulu', 'lala', 'raka', 'stinky', 'dirty', 'tara'}
TRIES = 8


def speakable(t):
    t = re.sub(r'\b(\d+)\b', lambda m: NUM.get(m.group(1), m.group(1)), t)
    return t.replace('"', '').replace('...', ', ').replace('…', ', ')


def toks(t):
    return re.findall(r'[a-z0-9]+', speakable(t).lower().replace('-', ' '))


def lcs(a, b):
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a)):
        for j in range(len(b)):
            d[i + 1][j + 1] = d[i][j] + 1 if a[i] == b[j] else max(d[i][j + 1], d[i + 1][j])
    return d[-1][-1]


def jobs():
    out = subprocess.run(['node', '-e', "global.window=global;const D=require('./games/data/sd-cards.js');"
                          "console.log(JSON.stringify(D.CARDS.map(c=>({id:c.id,story:c.story,q:c.q,hints:c.hints,explain:c.explain}))))"],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    js = []
    for c in json.loads(out):
        for i, s in enumerate(c['story']):
            js.append((f"{c['id']}-s{i}", s))
        js += [(f"{c['id']}-q", c['q']), (f"{c['id']}-h1", c['hints'][0]), (f"{c['id']}-h2", c['hints'][1]), (f"{c['id']}-x", c['explain'])]
    js += [(f'line:{k}', v) for k, v in LINES.items()]
    return js


def path_for(key):
    return os.path.join(AUD, key.replace(':', '/') + '.webm')


def main():
    import torch
    from transformers import VitsModel, AutoTokenizer
    from faster_whisper import WhisperModel
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    force = '--force' in sys.argv
    tok = AutoTokenizer.from_pretrained('facebook/mms-tts-ind')
    m = VitsModel.from_pretrained('facebook/mms-tts-ind'); m.eval()
    m.noise_scale, m.noise_scale_duration, m.speaking_rate = 0.2, 0.3, 0.85
    sr = m.config.sampling_rate
    asr = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=3)
    man = json.load(open(MAN)) if os.path.exists(MAN) else {}
    todo = [j for j in jobs() if not only or any(j[0].startswith(o) for o in only)]
    ok = bad = skipped = 0
    tmp = tempfile.mkdtemp()
    for key, text in todo:
        dst = path_for(key)
        if not force and key in man and man[key].get('text') == text and os.path.exists(dst) and \
                man[key]['sha1'] == hashlib.sha1(open(dst, 'rb').read()).hexdigest():
            skipped += 1; continue
        # compare LETTERS, not words: Whisper(id) writes "Di mana" as "Dimana" and "Koko si" as
        # "Kokosi" — spelling variants of correct speech that a word match scored 33%
        want = ''.join(t for t in toks(text) if t not in NAMES)
        best = (0.0, None, '')
        for seed in range(TRIES):
            torch.manual_seed(seed)
            with torch.no_grad():
                w = m(**tok(speakable(text), return_tensors='pt')).waveform[0].numpy().astype(np.float32)
            w = w / (np.abs(w).max() + 1e-9) * 0.92
            wav = os.path.join(tmp, 'a.wav'); sf.write(wav, w, sr)
            webm = os.path.join(tmp, f'{seed}.webm')
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'apad=pad_dur=0.15', '-c:a', 'libopus', '-b:a', '40k', '-ac', '1', webm], check=True)
            dec = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', webm, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
            x = np.frombuffer(dec, dtype=np.float32)
            segs, _ = asr.transcribe(x, language='id', beam_size=5, condition_on_previous_text=False, without_timestamps=True)
            heard = ' '.join(s.text for s in segs).strip()
            got = ''.join(t for t in toks(heard) if t not in NAMES and not any(t.startswith(n) for n in NAMES))
            score = 2 * lcs(want, got) / max(1, len(want) + len(got))   # symmetric: missing AND extra sounds cost
            if score > best[0]:
                best = (score, webm, heard)
            if score >= PASS:
                break
        if best[0] >= PASS:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.move(best[1], dst)
            man[key] = {'sha1': hashlib.sha1(open(dst, 'rb').read()).hexdigest(), 'text': text, 'heard': best[2], 'score': round(best[0], 3)}
            ok += 1; print(f'OK   {key:12} {best[0]:.0%}  {best[2]}', flush=True)
        else:
            man.pop(key, None)
            if os.path.exists(dst):
                os.remove(dst)
            bad += 1; print(f'TEXT {key:12} best {best[0]:.0%}  {best[2]}', flush=True)
        json.dump(dict(sorted(man.items())), open(MAN, 'w'), indent=1)
        write_js(man)
    total = len(jobs())
    print(f'\nrendered {ok}, text-only {bad}, unchanged {skipped}; voiced {len(man)}/{total} lines ({len(man) / total:.0%})')


def write_js(man):
    keys = {k: 1 for k in man}
    open(JS, 'w').write(
        '/* GENERATED by tools/sd_tts.py — do not edit. window.SDAudio: which narration clips\n'
        ' * exist AND passed the Indonesian ASR check (assets/sd/audio/<key>.webm). A line\n'
        ' * without a clip is shown as text only (PRD: audio is optional). */\n'
        '(function () { var K = ' + json.dumps(keys, separators=(',', ':')) + '; window.SDAudio = { keys: K, has: function (k) { return !!K[k] } } })()\n')


if __name__ == '__main__':
    main()
