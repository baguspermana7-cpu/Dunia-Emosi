"""
Render every G27 letter and word clip, then PROVE each one with ASR.

    ~/.venvs/kokoro/bin/python tools/spelling_tts.py            # all letters + words
    ~/.venvs/kokoro/bin/python tools/spelling_tts.py --check    # verify what is on disk, write nothing
    ~/.venvs/kokoro/bin/python tools/spelling_tts.py blue a e   # only these
    ... --force                                                  # re-render even verified clips

WHY A CARRIER SENTENCE. Kokoro given a lone "B." or "bee" invents an onset: an
extra vowel 60-80 ms long, as loud as the letter itself, then a gap -- so the
child heard "uh-BEE", "uh-GEE". Both Whisper models heard it too ("A G.A",
"A J", "Azzee") and scored the old clips 4-6/26. Spoken at the end of a real
sentence the voice has context, the artifact disappears (26/26), and the letter
gets natural sentence-final length. The carrier is cut off at the longest
silence, which is the sentence break.

Also: the phonemiser reads "ay" as /aI/ ("eye"), so the letter A must never be
spelled "ay". Letters are given as capitals; espeak says their names.

Every clip is round-tripped through the shipping codec and must come back from
Whisper as the intended letter/word; a clip that fails with every carrier is
NOT written and the run exits 1. Passing clips are recorded (sha1) in
assets/spelling/audio/verified.json, which qa-spelling-assets checks.
"""
import os, re, sys, json, hashlib, shutil, subprocess, tempfile
import numpy as np, soundfile as sf
from scipy.signal import resample_poly

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AUD = os.path.join(ROOT, 'assets', 'spelling', 'audio')
VOICE, SPEED = 'af_heart', 0.85
LETTERS = 'abcdefghijklmnopqrstuvwxyz'
# Tried in order until Whisper hears the item; the first carrier passes for
# almost everything ("book" once came back "buck" and needed another take).
CARRIERS = {'letters': ['Here is the next letter. ', 'Listen to this letter. ', 'The letter is. '],
            'words': ['Here is the next word. ', 'Listen to this word. ', 'Now spell this word. ',
                      'The next word is. ']}
# What Whisper may legitimately write for a letter NAME.
LETTER_OK = {'a': ['a', 'ay', 'eh'], 'b': ['b', 'bee', 'be'], 'c': ['c', 'see', 'sea'], 'd': ['d', 'dee'],
             'e': ['e', 'ee'], 'f': ['f', 'ef', 'eff'], 'g': ['g', 'gee'], 'h': ['h', 'aitch'], 'i': ['i', 'eye'],
             'j': ['j', 'jay'], 'k': ['k', 'kay'], 'l': ['l', 'el'], 'm': ['m', 'em'], 'n': ['n', 'en'],
             'o': ['o', 'oh'], 'p': ['p', 'pee', 'pea'], 'q': ['q', 'cue', 'queue'], 'r': ['r', 'are', 'ar'],
             's': ['s', 'ess'], 't': ['t', 'tee', 'tea'], 'u': ['u', 'you'], 'v': ['v', 'vee'], 'w': ['w'],
             'x': ['x', 'ex'], 'y': ['y', 'why'], 'z': ['z', 'zee']}
# Accepted alternate spellings Whisper uses for a few words.
WORD_OK = {'board': ['board', 'bored'],  # true homophones in American English
           'quran': ['quran', 'koran', 'quraan', 'kuran'], 'kaaba': ['kaaba', 'kaba', 'kabah'], 'gray': ['gray', 'grey'],
           'television': ['television', 'tv']}


# espeak says "kwer-RAN" (kw3r'aen) for Quran; Muslim English speakers -- and the
# children this is for -- say "kur-AAN". Spoken from phonemes, inside the carrier.
PHONEMES = {'quran': 'kʊɹˈɑːn'}


def words():
    js = open(os.path.join(ROOT, 'games', 'data', 'spelling-data.js')).read()
    return re.findall(r"\{\s*w:\s*'([a-z]+)'", js)


def texts():
    """word -> {'definitions': clue, 'sentences': say} for the spelling-bee ASK panel."""
    out = subprocess.run(['node', '-e', "global.window=global;const D=require('./games/data/spelling-data.js');"
                          "console.log(JSON.stringify(D.WORDS.map(w=>[w.w,w.clue,w.say])))"],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return {w: {'definitions': c, 'sentences': sy} for w, c, sy in json.loads(out)}


def POS():
    out = subprocess.run(['node', '-e', "global.window=global;const D=require('./games/data/spelling-data.js');"
                          "console.log(JSON.stringify(Object.fromEntries(D.WORDS.map(w=>[w.w,w.pos]))))"],
                         cwd=ROOT, capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def norm_toks(text):
    return [t.lower() for t in re.findall(r"[A-Za-z]+", text.replace("'", '').replace('’', ''))]


def speech_passes(key, want, got, need_word=True):
    """A sentence clip passes when Whisper hears >= 85% of its words IN ORDER (LCS) and
    the spelling word itself is among them."""
    a, b = norm_toks(want), norm_toks(got)
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a)):
        for j in range(len(b)):
            dp[i + 1][j + 1] = dp[i][j] + 1 if a[i] == b[j] else max(dp[i][j + 1], dp[i + 1][j])
    ok_word = any(t in WORD_OK.get(key, [key]) for t in b)
    return (ok_word or not need_word) and dp[-1][-1] >= 0.85 * len(a)


def cut_carrier(s, sr):
    """Everything after the longest interior silence (the sentence break)."""
    h = sr // 100
    e = np.array([np.sqrt(np.mean(s[i:i + h] ** 2)) for i in range(0, len(s) - h, h)])
    quiet = e < e.max() * 0.02
    best, i = (0, 0), 0
    while i < len(e):
        if quiet[i]:
            j = i
            while j < len(e) and quiet[j]:
                j += 1
            if 0 < i and j < len(e) and (j - i) > (best[1] - best[0]):
                best = (i, j)
            i = j
        else:
            i += 1
    if best[1] - best[0] < 12:  # < 120 ms: no sentence break found -- refuse, never guess
        raise RuntimeError('no carrier break')
    return s[best[1] * h:]


def trim_norm(s, sr):
    a = np.abs(s)
    nz = np.nonzero(a > max(a.max() * 0.02, 1e-4))[0]
    pad = int(0.04 * sr)
    s = s[max(0, nz[0] - pad): min(len(s), nz[-1] + pad)]
    return s / (np.abs(s).max() + 1e-9) * 0.95


def encode(s, sr, out):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as t:
        sf.write(t.name, s, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', t.name, '-c:a', 'libopus', '-b:a', '48k',
                    '-ac', '1', '-application', 'audio', out], check=True)
    os.remove(t.name)


def decode16(p):
    r = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'],
                       capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32)


def heard(asr, x16, kind):
    pad = np.zeros(8000, np.float32)
    prompt = {'letters': 'Spell it. The letter is:', 'words': 'Say the word:', 'pos': 'Part of speech:'}.get(kind, 'A sentence for a child:')
    segs, _ = asr.transcribe(np.concatenate([pad, x16, pad]), language='en', beam_size=5, initial_prompt=prompt,
                             condition_on_previous_text=False, without_timestamps=True)
    return ' '.join(z.text for z in segs).strip()


def passes(kind, key, text):
    toks = [t.lower() for t in re.findall(r"[A-Za-z]+", text.replace("'", '').replace('’', ''))]
    ok = LETTER_OK[key] if kind == 'letters' else WORD_OK.get(key, [key])
    return len(toks) == 1 and toks[0] in ok


def main():
    from faster_whisper import WhisperModel
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    TX = texts()
    jobs = [('letters', c) for c in LETTERS] + [('words', w) for w in words()] \
        + [(kd, w) for w in words() for kd in ('definitions', 'sentences')] \
        + [('pos', p_) for p_ in sorted({v for v in POS().values()})]
    if args:
        jobs = [j for j in jobs if j[1] in args]
    asr = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=3)
    k = None
    if not check:
        from kokoro_onnx import Kokoro
        k = Kokoro(os.path.expanduser('~/.cache/kokoro/kokoro-v1.0.onnx'),
                   os.path.expanduser('~/.cache/kokoro/voices-v1.0.bin'))
    mpath = os.path.join(AUD, 'verified.json')
    manifest = json.load(open(mpath)) if os.path.exists(mpath) else {}
    fails, done = [], 0
    tmp = tempfile.mkdtemp()
    for kind, key in jobs:
        dst = os.path.join(AUD, kind, key + '.webm')
        mkey = f'{kind}/{key}'
        want = TX.get(key, {}).get(kind)
        if check:
            t = heard(asr, decode16(dst), kind)
            good = speech_passes(key, want, t, kind == 'sentences') if want else passes(kind, key, t)
            print(('OK  ' if good else 'FAIL'), kind[:-1], key.ljust(12), repr(t), flush=True)
            if not good:
                fails.append(key)
            continue
        if '--force' not in sys.argv and mkey in manifest and os.path.exists(dst) and \
                manifest[mkey]['sha1'] == hashlib.sha1(open(dst, 'rb').read()).hexdigest() and \
                manifest[mkey].get('text') == want:
            continue  # already rendered and verified (and the text has not changed)
        if want:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            good, tries, carrier = False, [], ''
            for attempt in range(3):
                ph = k.tokenizer.phonemize(want, 'en-us')
                for w, p_ in PHONEMES.items():          # "Quran" -> kur-AAN inside sentences too
                    ph = ph.replace(k.tokenizer.phonemize(w, 'en-us'), p_)
                s, sr = k.create(ph, voice=VOICE, speed=SPEED + 0.05 * attempt, lang='en-us', is_phonemes=True)
                s = trim_norm(np.asarray(s, np.float32), sr)
                src = os.path.join(tmp, kind + '-' + key + '.webm')
                encode(s, sr, src)
                t = heard(asr, decode16(src), kind)
                tries.append(t)
                if speech_passes(key, want, t, kind == 'sentences'):  # a definition must NOT say the word
                    good = True
                    break
            print(('OK  ' if good else 'FAIL'), kind[:-1], key.ljust(12), ' / '.join(repr(x) for x in tries), flush=True)
            if not good:
                fails.append(mkey)
                continue
            shutil.move(src, dst)
            manifest[mkey] = {'sha1': hashlib.sha1(open(dst, 'rb').read()).hexdigest(), 'heard': t, 'text': want}
            with open(mpath, 'w') as fh:
                json.dump(dict(sorted(manifest.items())), fh, indent=1)
                fh.write('\n')
            done += 1
            continue
        say = key.upper() if kind == 'letters' else key
        good, tries = False, []
        for carrier in CARRIERS['words' if kind == 'pos' else kind]:
            if key in PHONEMES and kind == 'words':
                ph = k.tokenizer.phonemize(carrier, 'en-us') + ' ' + PHONEMES[key] + '.'
                s, sr = k.create(ph, voice=VOICE, speed=SPEED, lang='en-us', is_phonemes=True)
            else:
                s, sr = k.create(carrier + say + '.', voice=VOICE, speed=SPEED, lang='en-us')
            s = trim_norm(cut_carrier(np.asarray(s, np.float32), sr), sr)
            src = os.path.join(tmp, key + '.webm')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            encode(s, sr, src)
            t = heard(asr, decode16(src), kind)
            tries.append(t)
            if passes(kind, key, t):
                good = True
                break
        print(('OK  ' if good else 'FAIL'), kind[:-1], key.ljust(12), ' / '.join(repr(x) for x in tries), flush=True)
        if not good:
            fails.append(key)
            continue
        shutil.move(src, dst)
        manifest[mkey] = {'sha1': hashlib.sha1(open(dst, 'rb').read()).hexdigest(), 'heard': t,
                          'carrier': carrier.strip()}
        with open(mpath, 'w') as fh:  # saved after EVERY clip: a killed run keeps its work
            json.dump(dict(sorted(manifest.items())), fh, indent=1)
            fh.write('\n')
        done += 1
    if fails:
        print('\nFAILED:', ' '.join(fails))
        sys.exit(1)
    print(f'\nALL PASS' + ('' if check else f': {done} clips rendered and verified'))

if __name__ == '__main__':
    main()
