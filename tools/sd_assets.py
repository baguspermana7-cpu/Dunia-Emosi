#!/usr/bin/env python3
"""
G28 Stinky & Dirty — art from the owner's design sheets into the SHARED asset DB.

    ~/.venvs/kokoro/bin/python tools/sd_assets.py          # everything
    ~/.venvs/kokoro/bin/python tools/sd_assets.py sprites  # only the cut-out sprites
    ~/.venvs/kokoro/bin/python tools/sd_assets.py worlds   # only the world backgrounds

Sources (archived outside the repo): ~/Documents/temporary/game asset/stinky-dirty/
  ds1-brand-buttons-mascots.png — logo, S&D mark, mascots, animals, category icons
  ds3-world-backgrounds.png     — 6 worlds x (landscape 16:9, portrait 9:16)

Sprites: each is found as the largest drawn object inside a hand-measured box on the
sheet, UPSCALED x4 with Real-ESRGAN (the sheet draws a mascot ~130 px tall), then cut
out on the upscaled image with the library pipeline (flat-white page flood behind a
drawn-edge barrier, soft un-premultiplied edge, smooth white sticker outline) from
tools/ingest-asset-sheets.py, and written to assets/db/lib/sd/<name>.webp + indexed.

Worlds: each thumbnail is found on the sheet, the "Landscape (16:9)" / "Portrait (9:16)"
chip drawn in its bottom-left corner is cropped away with the rounded corners, and the
rest is upscaled x4 into assets/db/lib/sd/world-<key>-<land|port>.webp.
"""
import io, json, os, subprocess, sys, tempfile, importlib.util
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.expanduser('~/Documents/temporary/game asset/stinky-dirty')
OUTD = os.path.join(ROOT, 'assets', 'db', 'lib', 'sd')

_spec = importlib.util.spec_from_file_location('ing', os.path.join(ROOT, 'tools', 'ingest-asset-sheets.py'))
ing = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(ing)
_spec2 = importlib.util.spec_from_file_location('sc', os.path.join(ROOT, 'tools', 'spelling_scenes.py'))
sc = importlib.util.module_from_spec(_spec2); _spec2.loader.exec_module(sc)

# name -> (x0, y0, x1, y1) on ds1 (1536x1024), generous: the object is found inside
SPRITES = {
    'logo':        (18, 225, 205, 360),
    'logo-sd':     (212, 222, 330, 352),
    'explorer':    (296, 425, 400, 610),
    'adventurer':  (398, 425, 520, 610),
    'rover':       (20, 648, 100, 740),
    'mimi':        (112, 648, 192, 740),
    'pip':         (205, 648, 280, 740),
    'koko':        (295, 648, 372, 740),
    'lulu':        (392, 645, 470, 740),
    'cat-listening':   (1000, 628, 1075, 700),
    'cat-logic':       (1080, 628, 1155, 700),
    'cat-memory':      (1160, 628, 1238, 700),
    'cat-language':    (1245, 628, 1322, 700),
    'cat-math':        (1328, 628, 1405, 700),
    'cat-observation': (1413, 628, 1490, 700),
}
WORLDS = ['story-forest', 'logic-lab', 'memory-mountain', 'word-village', 'number-island', 'detective-city']
MAX_SPRITE = 520


def up4(rgb_img, name):
    with tempfile.TemporaryDirectory() as t:
        src, dst = os.path.join(t, 'a.png'), os.path.join(t, 'b.png')
        rgb_img.save(src)
        return sc.upscale(src, dst, rgb_img, name)


def sprite(name, box, sheet):
    crop = sheet.crop(box).convert('RGB')
    big = np.asarray(up4(crop, name).convert('RGB'))
    H, W = big.shape[:2]
    page, _, _ = ing.page_mask(big.astype(np.float32))
    fg = ~page
    lab, n = ndimage.label(fg)
    if n == 0:
        sys.exit(f'{name}: nothing drawn in its box')
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    # keep the main object and sizeable parts near it (a mascot's feet, the S&D leaves);
    # drop anything touching the box edge that is small (a neighbour poking in)
    keep = np.zeros_like(fg)
    for i, s in enumerate(sizes):
        part = lab == i + 1
        if i + 1 == main:
            keep |= part; continue
        if s < sizes.max() * 0.01:
            continue
        ys, xs = np.where(part)
        if (ys.min() == 0 or xs.min() == 0 or ys.max() == H - 1 or xs.max() == W - 1) and s < sizes.max() * 0.3:
            continue
        keep |= part
    spr = ing.cut(big, keep)
    if spr is None:
        sys.exit(f'{name}: cut failed')
    im = Image.fromarray(spr, 'RGBA')
    im.thumbnail((MAX_SPRITE, MAX_SPRITE), Image.LANCZOS)
    spr = ing.outline(np.asarray(im))
    return spr


def world_boxes(sheet):
    A = np.asarray(sheet.convert('RGB')).astype(np.int16)
    ink = (A.max(axis=2) < 236) | (A.max(axis=2) - A.min(axis=2) > 22)
    lab, _ = ndimage.label(ndimage.binary_opening(ink, iterations=3))
    out = []
    for sl in ndimage.find_objects(lab):
        if sl is None:
            continue
        y, x = sl
        w, h = x.stop - x.start, y.stop - y.start
        if w >= 110 and h >= 250 and y.start > 150:
            out.append([x.start, y.start, x.stop, y.stop])
    out.sort(key=lambda b: (round(b[1] / 300), b[0]))
    return out


def main():
    what = set(sys.argv[1:]) or {'sprites', 'worlds'}
    os.makedirs(OUTD, exist_ok=True)
    idx_path = os.path.join(ROOT, 'assets', 'db', 'index.json')
    index = json.load(open(idx_path))
    made = []
    if 'sprites' in what:
        ds1 = Image.open(os.path.join(SRC, 'ds1-brand-buttons-mascots.png'))
        for name, box in SPRITES.items():
            spr = sprite(name, box, ds1)
            data = ing.encode(spr)
            p, amax = ing.psnr_opaque(spr, data)
            if p < ing.MIN_PSNR:
                sys.exit(f'{name}: PSNR {p:.1f}')
            rel = f'assets/db/lib/sd/{name}.webp'
            open(os.path.join(ROOT, rel), 'wb').write(data)
            index['assets'][f'sd/{name}'] = {'file': rel, 'cat': 'sd', 'tags': name.split('-') + ['cartoon', 'stinky-dirty'],
                                             'source': f'ds1-brand-buttons-mascots@{box}', 'w': spr.shape[1], 'h': spr.shape[0],
                                             'psnr': round(float(p), 1)}
            made.append(name); print('  sprite', name, spr.shape[1], 'x', spr.shape[0], flush=True)
    if 'worlds' in what:
        ds3 = Image.open(os.path.join(SRC, 'ds3-world-backgrounds.png')).convert('RGB')
        bx = world_boxes(ds3)
        if len(bx) != 12:
            sys.exit(f'expected 12 world thumbnails, found {len(bx)}: {bx}')
        # rows: [land, port, land, port, land, port] x 2 -> world order by position
        for i, (x0, y0, x1, y1) in enumerate(bx):
            key = WORLDS[(i // 6) * 3 + (i % 6) // 2]
            kind = 'land' if (x1 - x0) > (y1 - y0) else 'port'
            w, h = x1 - x0, y1 - y0
            # rounded corners + the size chip drawn bottom-left: trim 7 px round and the
            # bottom 13% (the chip); the page overscans backdrops so edges are never seen
            crop = ds3.crop((x0 + 7, y0 + 7, x1 - 7, y1 - 7 - int(h * 0.13)))
            up = up4(crop, f'{key}-{kind}')
            rel = f'assets/db/lib/sd/world-{key}-{kind}.webp'
            up.save(os.path.join(ROOT, rel), 'WEBP', quality=84, method=6)
            index['assets'][f'sd/world-{key}-{kind}'] = {'file': rel, 'cat': 'sd', 'tags': key.split('-') + [kind, 'world', 'background'],
                                                        'source': f'ds3-world-backgrounds@{[x0, y0, x1, y1]}', 'w': up.size[0], 'h': up.size[1]}
            made.append(f'world-{key}-{kind}'); print('  world', key, kind, crop.size, '->', up.size, flush=True)
    index['assets'] = dict(sorted(index['assets'].items()))
    json.dump(index, open(idx_path, 'w'), indent=1)
    # regenerate the JS index from the JSON (same writer as the ingest tool)
    ing.write_js(index)
    print('made', len(made))


if __name__ == '__main__':
    main()
