#!/usr/bin/env python3
"""
Garasi Tempur arena backdrops from the owner's sheets -> shared DB (assets/db/lib/gt-arena/).

    ~/.venvs/kokoro/bin/python tools/gt_arenas.py

Owner decision 2026-09-27: "jangan ditutup biarkan aja … sudah dapat izin dan ini utk keperluan
testing", "jangan di blur" — the art is used AS SUPPLIED (no logo removal, no blur). Each
split image (~1000 px) is upscaled x4 with Real-ESRGAN (tools/spelling_scenes.upscale, guarded
against black output) and downscaled to 2000 px on its long side, WebP q84.
Sources: ~/Documents/temporary/game asset/monster-truck/arenas-split/.
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.expanduser('~/Documents/temporary/game asset/monster-truck/arenas-split')
OUT = os.path.join(ROOT, 'assets', 'db', 'lib', 'gt-arena')
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')
# n -> (key, Indonesian name). Sheet 3 pairs a SNOW landscape with a CANDY portrait:
# they become two arenas, each missing orientation is a cover-crop of the one it has.
ARENAS = {
    '1': ('stadion-malam', 'Stadion Malam'), '2': ('kanyon-lava', 'Kanyon Air Terjun'),
    '3l': ('salju', 'Gunung Salju'), '3p': ('permen', 'Negeri Permen'),
    '4': ('pelabuhan', 'Pelabuhan Kapal'), '5': ('kuil-hutan', 'Kuil Hutan'),
    '6': ('pulau-langit', 'Pulau Langit'), '7': ('bawah-laut', 'Kota Bawah Laut'),
    '8': ('gunung-api', 'Gunung Api'),
}
BLUR = 7


def dissolve_logos(im):
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gold = (r > 170) & (g > 120) & (b < 110) & (r - b > 90) & (g - b > 50)
    H = a.shape[0]
    gold[int(H * 0.6):] = False                       # the big logos sit in the upper part
    gold = ndimage.binary_closing(gold, iterations=4)
    lab, n = ndimage.label(gold)
    mask = np.zeros_like(gold)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if sl is None:
            continue
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h > H * 0.06 and w > h * 0.8:              # a triangle frame, not a lamp or a flame
            m = np.zeros_like(gold); m[sl] = True     # its whole bounding box (frame + text inside)
            mask |= m
    mask = ndimage.binary_dilation(mask, iterations=10)
    if not mask.any():
        return im, 0
    wide = np.asarray(im.filter(ImageFilter.GaussianBlur(40))).astype(np.float32)
    soft = ndimage.gaussian_filter(mask.astype(np.float32), 6)[..., None]
    out = a * (1 - soft) + wide * soft
    return Image.fromarray(out.clip(0, 255).astype(np.uint8)), int(mask.sum())


def cover(im, w, h):
    s = max(w / im.width, h / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x, y = (im.width - w) // 2, (im.height - h) // 2
    return im.crop((x, y, x + w, y + h))


def main():
    os.makedirs(OUT, exist_ok=True)
    idx = json.load(open(INDEX))
    made = []
    for n, (key, name) in ARENAS.items():
        num = n.rstrip('lp')
        srcs = {}
        for kind in ('land', 'port'):
            p = os.path.join(SRC, f'arena-{num}-{kind}.png')
            if os.path.exists(p) and not (n.endswith('l') and kind == 'port') and not (n.endswith('p') and kind == 'land'):
                srcs[kind] = Image.open(p).convert('RGB')
        for kind in ('land', 'port'):
            base = srcs.get(kind)
            if base is None:                          # cover-crop the orientation it has
                other = srcs['land' if kind == 'port' else 'port']
                base = cover(other, 700, 1400) if kind == 'port' else cover(other, 1400, 900)
            import importlib.util, tempfile
            spec = importlib.util.spec_from_file_location('sc', os.path.join(ROOT, 'tools', 'spelling_scenes.py'))
            sc = importlib.util.module_from_spec(spec); spec.loader.exec_module(sc)
            with tempfile.TemporaryDirectory() as t:
                a_, b_ = os.path.join(t, 'a.png'), os.path.join(t, 'b.png'); base.save(a_)
                up = sc.upscale(a_, b_, base, f'{key}-{kind}')
            k2 = 2000 / max(up.size)
            final = up.resize((round(up.width * k2), round(up.height * k2)), Image.LANCZOS)
            px = 0
            rel = f'assets/db/lib/gt-arena/{key}-{kind}.webp'
            final.save(os.path.join(ROOT, rel), 'WEBP', quality=84, method=6)
            idx['assets'][f'gt-arena/{key}-{kind}'] = {'file': rel, 'cat': 'gt-arena', 'tags': [key, kind, 'arena', 'background'],
                                                      'name': name, 'source': f'arena-{num}-{kind} (as supplied, ESRGAN x4)', 'w': final.width, 'h': final.height}
            made.append(f'{key}-{kind}'); print(f'  {key}-{kind}: {final.size}, logo px dissolved {px}', flush=True)
    idx['assets'] = dict(sorted(idx['assets'].items()))
    json.dump(idx, open(INDEX, 'w'), indent=1)
    import importlib.util
    spec = importlib.util.spec_from_file_location('ing', os.path.join(ROOT, 'tools', 'ingest-asset-sheets.py'))
    ing = importlib.util.module_from_spec(spec); spec.loader.exec_module(ing); ing.write_js(idx)
    print('made', len(made))


if __name__ == '__main__':
    main()
