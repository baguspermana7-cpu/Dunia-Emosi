#!/usr/bin/env python3
"""
G28 Stinky & Dirty — re-voice the Indonesian narration with OmniVoice (VoiceStudio), one CARD at a time.

    ~/.venvs/mms/bin/python tools/sd_tts_omni.py            # every card not yet on OmniVoice
    ~/.venvs/mms/bin/python tools/sd_tts_omni.py LIS-01     # only these cards

WHY (2026-10-17, owner: "ganti dg sound baru itu yg lbh jelas dan proper"): MMS-TTS is a robotic VITS voice that
passed the ASR gate on only 391 of 440 lines (49 lines were text-only). OmniVoice (k2-fsa/OmniVoice, run locally in
the VoiceStudio container on 127.0.0.1:3900, CC-BY-NC weights, licence accepted by the owner) reads Indonesian
naturally. Measured before switching: a designed Indonesian voice came back word-perfect from Whisper.

ONE VOICE: every clip is cloned from tools/voices/sd-narrator-id.flac (a voice designed once with
"female, young adult, moderate pitch"), so the narrator does not change between lines.

SAME GATE as tools/sd_tts.py: faster-whisper (small, id) must hear >= 90% of the letters, and the clip must be
mostly voiced (OmniVoice sometimes returns near-silence, which Whisper then "hears" as "Terima kasih sudah
menonton"). Up to TRIES seeds per line.

CARD-ATOMIC: a card is switched only when ALL its lines pass, so a child never hears two narrators in one card.
A card that does not pass keeps its MMS clips. The manifest records engine 'omnivoice' per line.

CPU only (~2-4 min per line): the run pauses while the CPU is above HOT degrees (thermal shutdowns, 2026-10).
"""
import hashlib, json, os, shutil, subprocess, sys, tempfile, time, uuid
import urllib.request as U
import numpy as np, soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))
import sd_tts as base   # noqa: E402  (jobs, toks, lcs, speakable, NAMES, write_js, paths)

VS = 'http://127.0.0.1:3900'
REF = os.path.join(base.ROOT, 'tools', 'voices', 'sd-narrator-id.flac')
REF_TEXT = 'Halo! Ayo kita dengarkan ceritanya bersama. Lihat baik-baik gambarnya, lalu pilih jawaban yang benar.'
PROFILE = 'Dunia SD narrator (id)'
TRIES = 3
STEPS = 16
HOT = 88.0


def cpu_temp():
    try:
        out = subprocess.run(['sensors'], capture_output=True, text=True).stdout
        for ln in out.splitlines():
            if ln.strip().startswith('Tctl:'):
                return float(ln.split('+')[1].split('°')[0])
    except Exception:
        pass
    return 0.0


def profile_id():
    for p in json.load(U.urlopen(VS + '/profiles')):
        if p['name'] == PROFILE:
            return p['id']
    bd = uuid.uuid4().hex
    wav = tempfile.mktemp(suffix='.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', REF, wav], check=True)
    parts = [f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
             for k, v in [('name', PROFILE), ('ref_text', REF_TEXT), ('language', 'Indonesian'), ('kind', 'clone')]]
    parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="ref_audio"; filename="ref.wav"\r\n'
                 'Content-Type: audio/wav\r\n\r\n'.encode() + open(wav, 'rb').read() + b'\r\n')
    body = b''.join(parts) + f'--{bd}--\r\n'.encode()
    r = U.Request(VS + '/profiles', data=body, headers={'Content-Type': 'multipart/form-data; boundary=' + bd, 'Origin': VS})
    return json.load(U.urlopen(r))['id']


def healthy():
    try:
        return json.load(U.urlopen(VS + '/health', timeout=10)).get('status') == 'ok'
    except Exception:
        return False


def speak(text, voice, seed, out):
    d = {'model': 'omnivoice', 'input': text, 'language': 'id', 'voice': voice, 'response_format': 'wav',
         'seed': seed, 'num_step': STEPS}
    # the container restarts now and then (memory): wait for /health and retry instead of losing the run
    for attempt in range(4):
        try:
            r = U.Request(VS + '/v1/audio/speech', data=json.dumps(d).encode(), headers={'Content-Type': 'application/json', 'Origin': VS})
            open(out, 'wb').write(U.urlopen(r, timeout=1800).read())
            return
        except (OSError, ConnectionError) as e:
            if isinstance(e, U.HTTPError) and e.code < 500:
                raise
            print(f'     VoiceStudio dropped the request ({e}); waiting for it to come back', flush=True)
            t0 = time.time()
            while not healthy() and time.time() - t0 < 900:
                time.sleep(15)
    raise RuntimeError('VoiceStudio did not recover')


def voiced(x, sr):
    h = sr // 50
    fr = x[:len(x) // h * h].reshape(-1, h)
    return float((np.sqrt((fr ** 2).mean(1)) > 0.02).mean())


def render(asr, text, voice, tmp, key):
    want = ''.join(t for t in base.toks(text) if t not in base.NAMES)
    best = (0.0, None, '')
    for seed in range(1, TRIES + 1):
        while cpu_temp() > HOT:
            time.sleep(30)
        wav = os.path.join(tmp, 'a.wav')
        speak(base.speakable(text), voice, seed, wav)
        w, sr = sf.read(wav, dtype='float32')
        if w.ndim > 1:
            w = w.mean(1)
        if voiced(w, sr) < 0.3:
            print(f'     {key} seed {seed}: near-silent', flush=True)
            continue
        w = w / (np.abs(w).max() + 1e-9) * 0.92
        sf.write(wav, w, sr)
        webm = os.path.join(tmp, f'{key}-{seed}.webm')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-af', 'apad=pad_dur=0.15', '-c:a', 'libopus',
                        '-b:a', '40k', '-ac', '1', webm], check=True)
        dec = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', webm, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
        segs, _ = asr.transcribe(np.frombuffer(dec, dtype=np.float32), language='id', beam_size=5,
                                 condition_on_previous_text=False, without_timestamps=True)
        heard = ' '.join(s.text for s in segs).strip()
        got = ''.join(t for t in base.toks(heard) if t not in base.NAMES and not any(t.startswith(n) for n in base.NAMES))
        score = 2 * base.lcs(want, got) / max(1, len(want) + len(got))
        if score > best[0]:
            best = (score, webm, heard)
        if score >= base.PASS:
            break
    return best


def main():
    from faster_whisper import WhisperModel
    only = [a for a in sys.argv[1:] if not a.startswith('--')]
    voice = profile_id()
    asr = WhisperModel('small', device='cpu', compute_type='int8', cpu_threads=2)
    man = json.load(open(base.MAN)) if os.path.exists(base.MAN) else {}
    cards = {}
    for key, text in base.jobs():
        cards.setdefault(key.rsplit('-', 1)[0] if not key.startswith('line:') else 'line', []).append((key, text))
    def done(c):
        return all(man.get(k, {}).get('engine') == 'omnivoice' and man[k].get('text') == t for k, t in cards[c])
    # cards with text-only lines first: they gain the most
    order = sorted((c for c in cards if (not only or c in only) and not done(c)),
                   key=lambda c: (-sum(k not in man for k, _ in cards[c]), c))
    print(f'{len(order)} cards to re-voice', flush=True)
    switched = kept = 0
    for c in order:
        tmp = tempfile.mkdtemp()
        res, t0 = {}, time.time()
        for key, text in cards[c]:
            res[key] = render(asr, text, voice, tmp, key) + (text,)
            print(f'  {key:12} {res[key][0]:.0%}  {res[key][2]}', flush=True)
            if res[key][0] < base.PASS:
                break
        if len(res) == len(cards[c]) and all(r[0] >= base.PASS for r in res.values()):
            for key, (score, webm, heard, text) in res.items():
                dst = base.path_for(key)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.move(webm, dst)
                man[key] = {'sha1': hashlib.sha1(open(dst, 'rb').read()).hexdigest(), 'text': text, 'heard': heard,
                            'score': round(score, 3), 'engine': 'omnivoice'}
            json.dump(dict(sorted(man.items())), open(base.MAN, 'w'), indent=1)
            base.write_js(man)
            switched += 1
            print(f'CARD {c} -> omnivoice ({time.time() - t0:.0f} s)', flush=True)
        else:
            kept += 1
            print(f'KEEP {c} (a line never passed; MMS clips stay)', flush=True)
        shutil.rmtree(tmp, ignore_errors=True)
    print(f'\nswitched {switched} cards, kept {kept}; voiced {len(man)}/{len(base.jobs())} lines')


if __name__ == '__main__':
    main()
