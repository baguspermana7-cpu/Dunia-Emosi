"""
Pick the clearest spelling for letter clips that ASR cannot tell apart in
context. Run: ~/.venvs/kokoro/bin/python tools/spelling_audio_pick.py a e t

Each candidate is rendered with EXACTLY the shipping parameters (voice, speed,
trim, normalise) and round-tripped through Opus, so what is scored is what a
child hears. It is then spliced into the full alphabet, the rest of which comes
from the clips already on disk, and scored by how much of A..Z an ASR recovers
IN ORDER. In-context, because Whisper on a lone half-second clip invents
articles ("a b", "the da") -- that instrument was shown to be wrong.
"""
import os, sys, subprocess, re, json
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
AUD = os.path.join(ROOT, 'assets', 'spelling', 'audio')
VOICE, SPEED, SR = 'af_heart', 0.85, 24000
LETTERS = 'abcdefghijklmnopqrstuvwxyz'
NAME2L = {'ay':'a','a':'a','hey':'a','bee':'b','be':'b','b':'b','see':'c','sea':'c','c':'c','dee':'d','d':'d',
  'ee':'e','e':'e','eh':'e','eff':'f','ef':'f','f':'f','gee':'g','jee':'g','g':'g','aitch':'h','h':'h','eight':'h',
  'eye':'i','i':'i','jay':'j','j':'j','kay':'k','k':'k','el':'l','l':'l','em':'m','m':'m','en':'n','n':'n',
  'oh':'o','o':'o','pee':'p','p':'p','cue':'q','queue':'q','q':'q','ar':'r','are':'r','r':'r','ess':'s','s':'s',
  'tee':'t','tea':'t','t':'t','you':'u','u':'u','vee':'v','v':'v','w':'w','ex':'x','x':'x','why':'y','y':'y',
  'zee':'z','zed':'z','z':'z'}
CAND = {'a': ['ay', 'A.', 'aye', 'ey'], 'e': ['ee', 'E.', 'eee', 'ea'], 't': ['tee', 'T.', 'tea', 'tee.']}

k = Kokoro(os.path.expanduser('~/.cache/kokoro/kokoro-v1.0.onnx'), os.path.expanduser('~/.cache/kokoro/voices-v1.0.bin'))
asr = WhisperModel('base.en', device='cpu', compute_type='int8', cpu_threads=3)


def render(text, webm):
    s, sr = k.create(text, voice=VOICE, speed=SPEED, lang='en-us')
    s = np.asarray(s, dtype=np.float32)
    a = np.abs(s); nz = np.nonzero(a > max(a.max() * 0.02, 1e-4))[0]
    pad = int(0.04 * sr); s = s[max(0, nz[0] - pad): min(len(s), nz[-1] + pad)]
    s = s / (np.abs(s).max() + 1e-9) * 0.95
    wav = webm[:-5] + '.wav'; sf.write(wav, s, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libopus', '-b:a', '32k',
                    '-ac', '1', '-application', 'voip', webm], check=True)
    os.remove(wav)


def decode(p):
    r = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32)


def lcs(a, b):
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a)):
        for j in range(len(b)):
            dp[i + 1][j + 1] = dp[i][j] + 1 if a[i] == b[j] else max(dp[i][j + 1], dp[i + 1][j])
    return dp[-1][-1]


def score(files):
    sil = np.zeros(int(16000 * 0.4), dtype=np.float32)
    seq = np.concatenate([x for f in files for x in (decode(f), sil)])
    sf.write('/tmp/_alpha.wav', seq, 16000)
    segs, _ = asr.transcribe('/tmp/_alpha.wav', language='en', beam_size=5, temperature=0,
                             initial_prompt='Reciting the English alphabet, one letter at a time.')
    txt = ' '.join(s.text for s in segs).lower()
    got = ''.join(NAME2L[t] for t in re.findall(r'[a-z]+', txt) if t in NAME2L)
    return lcs(LETTERS, got), txt.strip()[:120]


if __name__ == '__main__':
    targets = sys.argv[1:] or ['a', 'e', 't']
    base = {c: os.path.join(AUD, 'letters', c + '.webm') for c in LETTERS}
    s0, t0 = score([base[c] for c in LETTERS])
    print(f'BASELINE {s0}/26  :: {t0}')
    tmp = '/tmp/_cand'; os.makedirs(tmp, exist_ok=True)
    best = dict(base)
    for c in targets:
        results = []
        for cand in CAND[c]:
            f = os.path.join(tmp, f'{c}_{re.sub("[^a-z]", "_", cand.lower())}.webm')
            render(cand, f)
            trial = dict(best); trial[c] = f
            sc, txt = score([trial[x] for x in LETTERS])
            results.append((sc, cand, f))
            print(f'  {c}: "{cand}" -> {sc}/26')
        results.sort(key=lambda r: -r[0])
        best[c] = results[0][2]
        print(f'  => {c} keeps "{results[0][1]}"')
    s1, t1 = score([best[c] for c in LETTERS])
    print(f'FINAL {s1}/26  :: {t1}')
    json.dump({c: best[c] for c in targets}, open('/tmp/_cand/winners.json', 'w'))
