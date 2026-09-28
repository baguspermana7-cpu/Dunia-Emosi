#!/usr/bin/env python3
"""
Timmy & Kapal Legendaris backdrops from the owner's sheets -> shared DB (assets/db/lib/tk-scene/).

    ~/.venvs/kokoro/bin/python tools/tk_scenes.py

Each owner sheet holds a LANDSCAPE panel (left) and a PORTRAIT panel (right) on white. Panels are
found by their non-white bounding box inside each half, trimmed 3 px (rounded corners / anti-alias
edge), upscaled x4 with Real-ESRGAN (tools/spelling_scenes.upscale, guarded against black output),
then fitted to 2000 px on the long side, WebP q84. Used as supplied (no retouch).
Sources: ~/Documents/temporary/game asset/timmy-ships/bg-<name>.png
"""
import importlib.util, json, os, tempfile
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.expanduser('~/Documents/temporary/game asset/timmy-ships')
OUT = os.path.join(ROOT, 'assets', 'db', 'lib', 'tk-scene')
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')
NAMES = {'sky-plaza': 'Pelabuhan Langit', 'island-cliff': 'Tebing Pulau', 'harbor-dock': 'Dermaga Pelabuhan', 'ship-deck': 'Dek Kapal', 'ice-night': 'Laut Es Malam', 'titanic-night-deck': 'Dek Titanic Malam', 'grand-staircase': 'Tangga Megah', 'engine-room': 'Ruang Mesin', 'sunset-port': 'Pelabuhan Senja', 'underwater': 'Bawah Laut', 'jungle-falls': 'Air Terjun Rimba', 'aurora-ice': 'Es Aurora'}


def panels(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    H, W = a.shape[:2]
    ink = (a < 235).any(axis=2)
    cols = ink.sum(0)
    # split between the two panels = the widest white gap in the middle third
    mid = [x for x in range(int(W * 0.45), int(W * 0.8)) if cols[x] < 3]
    cut = int(np.median(mid)) if mid else int(W * 0.68)
    out = []
    for x0, x1 in ((0, cut), (cut, W)):
        m = ink[:, x0:x1]
        ys, xs = np.nonzero(m)
        box = (x0 + xs.min() + 3, ys.min() + 3, x0 + xs.max() - 3, ys.max() - 3)
        out.append(im.crop(box).convert('RGB'))
    return out   # [landscape, portrait]


def main():
    os.makedirs(OUT, exist_ok=True)
    spec = importlib.util.spec_from_file_location('sc', os.path.join(ROOT, 'tools', 'spelling_scenes.py'))
    sc = importlib.util.module_from_spec(spec); spec.loader.exec_module(sc)
    new = {}
    only = set(__import__('sys').argv[1:])
    for key, name in NAMES.items():
        if only and key not in only: continue
        land, port = panels(Image.open(os.path.join(SRC, f'bg-{key}.png')))
        for kind, base in (('land', land), ('port', port)):
            with tempfile.TemporaryDirectory() as t:
                a_, b_ = os.path.join(t, 'a.png'), os.path.join(t, 'b.png'); base.save(a_)
                up = sc.upscale(a_, b_, base, f'{key}-{kind}')
            k = 2000 / max(up.size)
            final = up.resize((round(up.width * k), round(up.height * k)), Image.LANCZOS)
            rel = f'assets/db/lib/tk-scene/{key}-{kind}.webp'
            final.save(os.path.join(ROOT, rel), 'WEBP', quality=84, method=6)
            new[f'tk-scene/{key}-{kind}'] = {'file': rel, 'cat': 'tk-scene', 'tags': [key, kind, 'background', 'timmy'],
                                                     'name': name, 'source': f'bg-{key} (owner, as supplied, ESRGAN x4)', 'w': final.width, 'h': final.height}
            print(f'  {key}-{kind}: crop {base.size} -> {final.size}', flush=True)
    idx = json.load(open(INDEX)); idx['assets'].update(new)
    idx['assets'] = dict(sorted(idx['assets'].items()))
    json.dump(idx, open(INDEX, 'w'), indent=1)
    spec = importlib.util.spec_from_file_location('ing', os.path.join(ROOT, 'tools', 'ingest-asset-sheets.py'))
    ing = importlib.util.module_from_spec(spec); spec.loader.exec_module(ing); ing.write_js(idx)


if __name__ == '__main__':
    main()
