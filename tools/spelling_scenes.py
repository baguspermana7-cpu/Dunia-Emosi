"""
G27 scene backgrounds: crop the owner's sheet, then upscale.

    ~/.venvs/kokoro/bin/python tools/spelling_scenes.py

SOURCE tools/spelling-src/sheet3-backgrounds.png — 9 scenes x (landscape,
portrait). The sheet labels them 1920x1080, but on the sheet each is only a
thumbnail: landscape ~330x205, portrait ~125-150x230. Shown full-screen that is
a 3-5.6x stretch — visibly blurry on a tablet.

CROP: a uniform 6 px inset, >= the sheet's rounded-corner radius. Three
content-sensitive inset rules were tried and rejected: two missed the tinted
corner remnants (a blend of image + white is coloured, not grey), and one
compared the corner with the pixels inside it and so cut up to 15 px of REAL
bright content (classroom window, sky) — 20% of a portrait's width. The page
overscans every backdrop for the parallax anyway, so the outer few percent of
each edge, corners included, is never on screen.

UPSCALE: Real-ESRGAN (BSD-3-Clause) ncnn-vulkan, model realesrgan-x4plus-anime,
x4, on the laptop's Radeon Vega (Vulkan/RADV) — ~5-8 s per image. Compared at
tablet display size against plain bicubic before adopting: clearly crisper
edges on clouds and buildings, slightly flatter shading, which suits the flat
cartoon style of these backdrops.
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHEET = os.path.join(ROOT, 'tools', 'spelling-src', 'sheet3-backgrounds.png')
OUT = os.path.join(ROOT, 'assets', 'spelling', 'scenes')
ESR = os.path.expanduser('~/.local/share/realesrgan/realesrgan-ncnn-vulkan')
MODELS = os.path.expanduser('~/.local/share/realesrgan/models')
NAMES = ['town', 'construction', 'recycling', 'park', 'classroom', 'bedroom', 'night', 'sunrise', 'reward']
INSET = 6


def boxes():
    A = np.asarray(Image.open(SHEET).convert('RGB')).astype(np.int16)
    ink = (A.max(axis=2) < 236) | (A.max(axis=2) - A.min(axis=2) > 22)
    lab, _ = ndi.label(ndi.binary_opening(ink, iterations=2))
    out = []
    for sl in ndi.find_objects(lab):
        if sl is None:
            continue
        y, x = sl
        if x.stop - x.start >= 120 and y.stop - y.start >= 180:
            out.append([x.start, y.start, x.stop, y.stop])
    out.sort(key=lambda b: (round(b[1] / 120), b[0]))
    if len(out) != 18:
        sys.exit(f'expected 18 scenes on the sheet, found {len(out)}')
    return out


def looks_right(up, crop):
    """The Vulkan upscaler can exit 0 and write a PURE BLACK image (it did for
    construction-land: std 0, one colour). So a result must keep the source's
    tonal range and roughly its mean colour, or it is rejected."""
    a = np.asarray(crop).astype(np.float64)
    b = np.asarray(up.resize(crop.size, Image.BOX)).astype(np.float64)
    if b.std() < 0.5 * a.std():
        return False
    return np.abs(a.mean(axis=(0, 1)) - b.mean(axis=(0, 1))).max() < 18


def upscale(src, dst, crop, name):
    # GPU with default tiling, then smaller tiles, then the CPU path.
    for extra in (['-g', '0'], ['-g', '0', '-t', '128'], ['-g', '0', '-t', '64'], ['-g', '-1']):
        if os.path.exists(dst):
            os.remove(dst)
        r = subprocess.run([ESR, '-i', src, '-o', dst, '-n', 'realesrgan-x4plus-anime', '-s', '4',
                            '-m', MODELS] + extra, capture_output=True, text=True)
        if r.returncode == 0 and os.path.exists(dst):
            up = Image.open(dst).convert('RGB')
            if looks_right(up, crop):
                return up
            print(f'  !! {name}: upscaler returned a bad image with {extra} — retrying', flush=True)
    sys.exit(f'upscale failed for {name} on every path')


def main():
    os.makedirs(OUT, exist_ok=True)
    im = Image.open(SHEET).convert('RGB')
    report = {}
    with tempfile.TemporaryDirectory() as tmp:
        for i, (x0, y0, x1, y1) in enumerate(boxes()):
            kind = 'land' if (x1 - x0) > (y1 - y0) else 'port'
            name = f'{NAMES[i // 2]}-{kind}'
            crop = im.crop((x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET))
            src = os.path.join(tmp, name + '.png')
            dst = os.path.join(tmp, name + '-x4.png')
            crop.save(src)
            up = upscale(src, dst, crop, name)
            p = os.path.join(OUT, name + '.webp')
            up.save(p, 'WEBP', quality=82, method=6)
            report[name] = {'crop': list(crop.size), 'out': list(up.size), 'kb': round(os.path.getsize(p) / 1024)}
            print(f'  {name:18} {crop.size[0]}x{crop.size[1]} -> {up.size[0]}x{up.size[1]}  {report[name]["kb"]} KB', flush=True)
    json.dump({'inset': INSET, 'model': 'realesrgan-x4plus-anime x4', 'scenes': report},
              open(os.path.join(ROOT, 'tools', 'spelling-src', 'sheet3-scenes.json'), 'w'), indent=1)
    print('total', sum(v['kb'] for v in report.values()), 'KB')


if __name__ == '__main__':
    main()
