"""Make a seamless looping music file from a song (2026-10-18: game background music the owner supplies).

  python3 tools/make-music-loop.py <song> <out.mp3> [--start S] [--end E] [--xf 3] [--kbps 112]

--start / --end: the part of the song to loop (skip a talking intro or the fade-out; find them with ffmpeg
silencedetect / volumedetect). The tail crossfades into the head (equal-power, --xf seconds), so the file's last
sample continues into its first: played on a loop -- or by two players handing over at the end -- there is no seam.
"""
import argparse, array, math, os, subprocess, tempfile, wave

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('out')
ap.add_argument('--start', type=float, default=0); ap.add_argument('--end', type=float, default=None)
ap.add_argument('--xf', type=float, default=3.0); ap.add_argument('--kbps', type=int, default=112)
a = ap.parse_args()
tmp = tempfile.mkdtemp()
seg, loop = os.path.join(tmp, 'seg.wav'), os.path.join(tmp, 'loop.wav')
cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', str(a.start)] + (['-to', str(a.end)] if a.end else []) + ['-i', a.src, '-ac', '2', '-ar', '44100', seg]
subprocess.run(cmd, check=True)
w = wave.open(seg); n, sr = w.getnframes(), w.getframerate(); s = array.array('h'); s.frombytes(w.readframes(n)); w.close()
xf = int(a.xf * sr)
out = array.array('h', s[xf * 2:(n - xf) * 2])
for i in range(xf):
    t = i / xf; go, gi = math.cos(t * math.pi / 2), math.sin(t * math.pi / 2)
    for c in (0, 1):
        v = s[(n - xf + i) * 2 + c] * go + s[i * 2 + c] * gi
        out.append(max(-32768, min(32767, int(v))))
o = wave.open(loop, 'w'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(sr); o.writeframes(out.tobytes()); o.close()
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', loop, '-codec:a', 'libmp3lame', '-b:a', '%dk' % a.kbps, a.out], check=True)
print(a.out, round(len(out) / 2 / sr, 1), 's', os.path.getsize(a.out), 'bytes')
