#!/usr/bin/env python3
"""
Owner's TOP-VIEW ship sheet (G30 Timmy & Kapal Legendaris, 2026-09-28) -> 25 named sprites
assets/db/lib/tk-top/<id>.webp, registered in assets/db/index.json + games/data/asset-index.js.

    ~/.venvs/kokoro/bin/python tools/ingest-tk-top.py [sheet.png]

Sheet: 25 ships on flat white, 5 per row, NO grid lines and uneven rows (row 4 and 5 almost
touch). Segmentation, soft alpha and the WebP round-trip check are the shared ones from
tools/ingest-asset-sheets.py (imported, not copied):
  - background = flat white CONNECTED to the border only (edge flood with an edge barrier), so a
    white hull (cruise ship, yacht, lifeboat cabin) is never hollowed by a colour key;
  - each cell is a watershed seed, so a mast tip or a rigging line that pokes into the next row
    still goes to its own ship (no neighbour bleed);
  - the alpha edge is soft and un-premultiplied against white (no halo).
Then every sprite is turned BOW-UP (the games drive upward): the right-facing ones rotate 90 deg
counter-clockwise; the two drawn vertically already point up; the sailing yacht is a 3/4 view
with the mast up, so it is kept upright. Finally a 2 px ADAPTIVE outline: light on a dark hull
edge (submarine), dark on a light one (cruise ship), so every ship reads on the dark sea AND on
the light selection card.
Index writes MERGE: the index is re-read right before writing and only tk-top/* keys are set.
"""
import importlib.util, io, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
spec = importlib.util.spec_from_file_location('ias', os.path.join(ROOT, 'tools', 'ingest-asset-sheets.py'))
ias = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ias)

SHEET = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    '~/Documents/temporary/game asset/timmy-ships/top-view-25.png')
OUT = os.path.join(ROOT, 'assets', 'db', 'lib', 'tk-top')
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')

# row-major, as drawn on the sheet; 'up' = already bow-up (no rotation), 'keep' = 3/4 view kept upright
NAMES = [
    ('titanic', 'r'), ('battleship', 'r'), ('carrier', 'r'), ('container', 'r'), ('lng', 'r'),
    ('offshore', 'r'), ('cruise', 'r'), ('bulk', 'r'), ('roro', 'r'), ('research', 'r'),
    ('tug', 'r'), ('tallship', 'r'), ('coastguard', 'r'), ('icebreaker', 'r'), ('submarine', 'r'),
    ('frigate', 'r'), ('patrol', 'r'), ('destroyer', 'r'), ('fastferry', 'r'), ('amphibious', 'r'),
    ('landing', 'r'), ('sailyacht', 'keep'), ('motoryacht', 'up'), ('lifeboat', 'up'), ('hovercraft', 'r'),
]
TAGS = {'titanic': 'liner titanic', 'battleship': 'battleship navy', 'carrier': 'aircraft carrier navy',
        'container': 'container cargo', 'lng': 'lng tanker gas', 'offshore': 'offshore supply helipad',
        'cruise': 'cruise pool', 'bulk': 'bulk cargo', 'roro': 'car carrier roro', 'research': 'research supply',
        'tug': 'tug harbor', 'tallship': 'sailing tall ship clipper', 'coastguard': 'coast guard rescue',
        'icebreaker': 'icebreaker', 'submarine': 'submarine', 'frigate': 'frigate navy', 'patrol': 'patrol navy',
        'destroyer': 'destroyer navy', 'fastferry': 'fast ferry yacht', 'amphibious': 'amphibious carrier navy',
        'landing': 'landing craft', 'sailyacht': 'sailing yacht', 'motoryacht': 'motor yacht pool',
        'lifeboat': 'lifeboat rescue', 'hovercraft': 'hovercraft'}
# cell boxes measured on the sheet (rows are uneven; x is an even 5-way split)
YS = [0, 240, 430, 672, 834, 1117]
XS = [0, 282, 564, 846, 1128, 1409]
PEEL = 4
OUTLINE = 2.0      # px at native size
SS = 4


def adaptive_outline(spr):
    """2 px ring around the silhouette. Colour from the sprite's own edge: a dark rim gets a light
    ring, a light rim a dark one. Built at SSx from a distance field (round, anti-aliased)."""
    h, w = spr.shape[:2]
    pad = int(OUTLINE) + 3
    a = np.zeros((h + 2 * pad, w + 2 * pad), np.float32)
    a[pad:pad + h, pad:pad + w] = spr[..., 3] / 255.0
    solid_n = a > 0.5
    rim = solid_n & ~ndimage.binary_erosion(solid_n, iterations=3)
    rgb_n = np.zeros(a.shape + (3,), np.float32)
    rgb_n[pad:pad + h, pad:pad + w] = spr[..., :3]
    lum = (0.299 * rgb_n[..., 0] + 0.587 * rgb_n[..., 1] + 0.114 * rgb_n[..., 2])[rim]
    edge = float(np.median(lum)) if lum.size else 128.0
    col = np.array([236, 246, 255], np.float32) if edge < 105 else np.array([18, 34, 52], np.float32)
    big = np.asarray(Image.fromarray((a * 255).astype(np.uint8), 'L').resize((a.shape[1] * SS, a.shape[0] * SS), Image.BICUBIC)).astype(np.float32) / 255.0
    solid = ndimage.gaussian_filter(big, sigma=1.0 * SS) > 0.4
    dist = ndimage.distance_transform_edt(~solid)
    ring = np.clip((OUTLINE * SS + SS * 0.5 - dist) / SS, 0.0, 1.0)
    ring = np.asarray(Image.fromarray((ring * 255).astype(np.uint8), 'L').resize((a.shape[1], a.shape[0]), Image.BOX)).astype(np.float32) / 255.0
    ring = np.maximum(ring * 0.92, a)
    src = np.zeros(a.shape + (4,), np.float32)
    src[pad:pad + h, pad:pad + w] = spr.astype(np.float32)
    sa = src[..., 3:4] / 255.0
    rgb = src[..., :3] * sa + col * (1 - sa)
    out = np.concatenate([rgb, np.maximum(sa[..., 0], ring)[..., None] * 255.0], axis=2)
    return np.clip(out.round(), 0, 255).astype(np.uint8), ('light' if edge < 105 else 'dark')


def main():
    im = np.asarray(Image.open(SHEET).convert('RGB')).copy()
    boxes = [(XS[c], YS[r], XS[c + 1], YS[r + 1]) for r in range(5) for c in range(5)]
    ws = ias.segment_sheet(im, 5, 5, boxes=boxes, loose=True, cell_owned=True)
    os.makedirs(OUT, exist_ok=True)
    made, bad, rows = {}, [], []
    for k, (name, orient) in enumerate(NAMES):
        own_full = ws == k + 1
        if not own_full.any():
            bad.append(f'{name}: no pixels'); continue
        ys, xs = np.where(own_full)
        y0, y1 = max(0, ys.min() - 8), min(im.shape[0], ys.max() + 9)
        x0, x1 = max(0, xs.min() - 8), min(im.shape[1], xs.max() + 9)
        cell = im[y0:y1, x0:x1]
        own = own_full[y0:y1, x0:x1]
        other = (ws[y0:y1, x0:x1] > 0) & ~own
        # the sheet draws a 1-2 px off-white halo OUTSIDE each hull's dark line (d 4..40, so the page
        # flood keeps it). Peel it from the outside in, at most PEEL px deep: the hull's own dark line
        # stops the peel, so a white hull inside its outline is never touched.
        dw = ias.whiteness_dist(cell.astype(np.float32))
        peeled = np.zeros_like(own)
        for _ in range(PEEL):
            border = own & ndimage.binary_dilation(~own)
            off = border & (dw < 40)
            if not off.any():
                break
            own = own & ~off
            peeled |= off
        spr = ias.cut(cell, own, other=other | peeled)
        if spr is None:
            bad.append(f'{name}: empty cut'); continue
        spr = ias.drop_slivers(spr)
        img = Image.fromarray(spr, 'RGBA')
        if orient == 'r':
            img = img.rotate(90, expand=True)        # PIL rotates counter-clockwise: bow right -> bow up
        spr, ring = adaptive_outline(np.asarray(img))
        data = ias.encode(spr)
        ps, amax = ias.psnr_opaque(spr, data)
        if ps < ias.MIN_PSNR or amax > 2:
            bad.append(f'{name}: webp psnr {ps:.1f} alpha {amax}')
        open(os.path.join(OUT, name + '.webp'), 'wb').write(data)
        key = 'tk-top/' + name
        made[key] = {'file': 'assets/db/lib/tk-top/' + name + '.webp', 'cat': 'tk-top',
                     'tags': TAGS[name].split() + ['top-view', 'ship'], 'source': os.path.basename(SHEET) + '#' + str(k),
                     'w': int(spr.shape[1]), 'h': int(spr.shape[0]), 'psnr': round(ps, 1)}
        rows.append(f'{key:22s} {spr.shape[1]:4d}x{spr.shape[0]:<4d} {len(data) // 1024:3d} KB  psnr {ps:.1f}  ring {ring}')
    # MERGE: re-read right before writing; only our keys change
    fresh = json.load(open(INDEX))
    fresh['assets'].update(made)
    fresh['assets'] = dict(sorted(fresh['assets'].items()))
    json.dump(fresh, open(INDEX, 'w'), indent=1)
    ias.write_js(fresh)
    print('\n'.join(rows))
    print(f'made {len(made)}, index total {len(fresh["assets"])}')
    for b in bad:
        print('  FAIL', b)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
