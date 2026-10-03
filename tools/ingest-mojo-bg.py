#!/usr/bin/env python3
"""
Cut the owner's Mojo scene backgrounds (sheets 31-55: one landscape + one portrait painting on a white page)
into assets/db/lib/mojo-bg/<name>-land.webp and <name>-port.webp.

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-bg.py            # write + merge both asset indexes
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-bg.py --dry      # report rectangles, quality, SSIM, size
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-bg.py --sheets DIR   # 2x crops of edges/skies for eyeballing

Method (deterministic):
  1. RECTANGLES: the two largest non-page components (page = min channel >= 236, low chroma) give each painting's
     bounding box. Each edge then steps inward while its row/column is still page-like or a thin frame line (mean
     >= 225 with < 6% coloured pixels) or a feathered light rim (> 8 levels lighter than the line inside it),
     plus a fixed 2 px safety inset for the anti-aliased rim. Fails closed unless exactly one landscape (w > h)
     and one portrait (h > w) painting are found.
  2. ENCODING: native resolution (never upscaled). WebP method 6 at the LOWEST quality in 82..88 whose SSIM
     (luma, gaussian window) against the crop is >= 0.97 AND whose worst 64x64 block SSIM is >= 0.90 (catches
     banding/blocking in a smooth sky that a global mean hides) AND that fits the size budget (250 KB landscape,
     200 KB portrait). If no quality passes the size budget, the image is downscaled in 5% steps (never below 85%
     of native) - reported, never silent.
  3. TITLE: the title key art carries painted PLAY/BUILD/SWAP/EXPLORE buttons. 'title-clean' is the same
     painting cut above those buttons (TITLE_CUT, measured) so the real UI never shows two sets of buttons.
"""
import argparse, importlib.util, io, os, sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.metrics import structural_similarity

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
SRC = Path(os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops/owner-sheets'))
LIB = ROOT / 'assets' / 'db' / 'lib'
SRCTAG = 'owner mojo backgrounds 2026-10-03'
SHEETS = {
    '31': 'garage-harbour', '32': 'title', '33': 'coastal-road', '34': 'fire-station', '35': 'forest-fire',
    '36': 'broken-bridge', '37': 'flood-street', '38': 'fallen-tree', '39': 'rockslide', '40': 'river-rapids',
    '41': 'rooftop-cat', '42': 'mud-road', '43': 'fairground',
    '44': 'canyon-bridge', '45': 'desert-arch', '46': 'night-highway', '47': 'ice-floes', '48': 'beach-cove',
    '49': 'underwater', '51': 'desert-road', '53': 'space-road', '54': 'snow-road', '55': 'pirate-pier',
}
# CHILD SAFETY (owner rule: no skull items in Mojo): the shipwreck flag on sheet 55 carries a skull and crossbones.
# Each box (sheet px, x0,y0,x1,y1) encloses it; the emblem is the light hole inside the dark flag and is painted
# out with the flag's own colour (harmonic fill from the surrounding cloth), leaving a plain black flag.
RETOUCH = {'55': [(985, 325, 1052, 396), (1568, 408, 1614, 462)]}
# Sheets 50 and 52 are byte-identical re-sends of 43 (fairground) and 40 (river-rapids); registered once.
DUPLICATES = {'50': '43', '52': '40'}
QUALITIES = range(82, 89)
MIN_SSIM, MIN_BLOCK_SSIM = 0.97, 0.90
BUDGET = {'land': 250 * 1024, 'port': 200 * 1024}
INSET = 2
# Fraction of the painting height kept for 'title-clean' (top part, above the painted buttons). Measured on
# sheet 32: landscape buttons start at 84.6% of the painting height, portrait ones at 83.6%.
TITLE_CUT = {'land': 0.835, 'port': 0.825}


def sheet(pfx):
    hits = sorted(SRC.glob(pfx + '-*.png'))
    if len(hits) != 1:
        raise SystemExit(f'sheet {pfx}: expected one file, found {hits}')
    return np.asarray(Image.open(hits[0]).convert('RGB'))


def page_mask(a):
    mn, mx = a.min(2).astype(int), a.max(2).astype(int)
    return (mn >= 236) & (mx - mn <= 14)


def rects(a):
    art = ndimage.binary_opening(~page_mask(a), iterations=2)
    lab, n = ndimage.label(art)
    boxes = sorted(((int((lab[s] == i + 1).sum()), s) for i, s in enumerate(ndimage.find_objects(lab))), key=lambda t: -t[0])[:2]
    out = {}
    for _, (sy, sx) in boxes:
        y0, y1, x0, x1 = sy.start, sy.stop, sx.start, sx.stop
        y0, y1, x0, x1 = tighten(a, y0, y1, x0, x1)
        kind = 'land' if (x1 - x0) > (y1 - y0) else 'port'
        if kind in out:
            raise SystemExit(f'two {kind} paintings found')
        out[kind] = (x0, y0, x1, y1)
    if set(out) != {'land', 'port'}:
        raise SystemExit(f'expected one landscape + one portrait painting, got {sorted(out)}')
    return out


def _edgy(line, inner):
    """True when a border line is page/frame rather than painting."""
    mn, mx = line.min(1).astype(int), line.max(1).astype(int)
    coloured = ((mx - mn) > 24) | (mn < 150)
    if line.mean() >= 225 and coloured.mean() < 0.06:
        return True
    # a soft light rim (anti-aliased / feathered painting edge): clearly lighter than the line inside it
    return float(line.astype(int).mean() - inner.astype(int).mean()) > 8.0


def tighten(a, y0, y1, x0, x1):
    for _ in range(12):
        moved = False
        if _edgy(a[y0, x0:x1], a[y0 + 1, x0:x1]): y0 += 1; moved = True
        if _edgy(a[y1 - 1, x0:x1], a[y1 - 2, x0:x1]): y1 -= 1; moved = True
        if _edgy(a[y0:y1, x0], a[y0:y1, x0 + 1]): x0 += 1; moved = True
        if _edgy(a[y0:y1, x1 - 1], a[y0:y1, x1 - 2]): x1 -= 1; moved = True
        if not moved:
            break
    return y0 + INSET, y1 - INSET, x0 + INSET, x1 - INSET


def luma(im):
    return np.asarray(im.convert('L'), dtype=np.float64)


def block_min(ref, dec, size=64):
    worst = 1.0
    for y in range(0, ref.shape[0] - size + 1, size):
        for x in range(0, ref.shape[1] - size + 1, size):
            r, d = ref[y:y + size, x:x + size], dec[y:y + size, x:x + size]
            if r.std() < 1.0 and d.std() < 1.0:
                continue
            worst = min(worst, structural_similarity(r, d, data_range=255, gaussian_weights=True, sigma=1.5))
    return worst


def encode(im, kind):
    """Lowest quality in QUALITIES meeting SSIM + block SSIM + size; downscale only if size never fits."""
    scale, base = 1.0, im
    while True:
        ref = luma(im)
        for q in QUALITIES:
            buf = io.BytesIO()
            im.save(buf, 'WEBP', quality=q, method=6)
            data = buf.getvalue()
            dec = luma(Image.open(io.BytesIO(data)))
            ssim = structural_similarity(ref, dec, data_range=255, gaussian_weights=True, sigma=1.5)
            if ssim < MIN_SSIM:
                continue
            blk = block_min(ref, dec)
            if blk < MIN_BLOCK_SSIM:
                continue
            if len(data) <= BUDGET[kind]:
                return data, q, ssim, blk, scale, im.size
        scale = round(scale - 0.05, 2)
        if scale < 0.85:
            raise SystemExit(f'{kind}: no quality in {list(QUALITIES)} meets SSIM {MIN_SSIM} within budget')
        im = base.resize((round(base.width * scale), round(base.height * scale)), Image.LANCZOS)


def check_duplicates():
    for dup, orig in DUPLICATES.items():
        hits = sorted(SRC.glob(dup + '-*.png'))
        if hits and not np.array_equal(sheet(dup), sheet(orig)):
            raise SystemExit(f'sheet {dup} is no longer identical to {orig}: give it its own name')


def paint_out_emblems(a, boxes):
    """Return a copy of the sheet with each light emblem inside a dark flag filled from the flag cloth."""
    out = a.astype(np.float32).copy()
    for x0, y0, x1, y1 in boxes:
        sub = out[y0:y1, x0:x1]
        lum = sub.mean(2)
        cloth = lum < 95
        # a bone tip may reach the flag's edge: close the cloth outline first so the emblem is still a hole
        flag = ndimage.binary_fill_holes(ndimage.binary_closing(np.pad(cloth, 6), iterations=4))[6:-6, 6:-6]
        r, b = sub[..., 0], sub[..., 2]
        tinted = ~cloth & ((b > r + 30) | (r > b + 30))
        # sky (blue) or sail (beige) seen past the cloth: tinted pixels CONNECTED to the outside of the flag;
        # tinted specks enclosed by the cloth are the emblem's own anti-aliased rim
        lab_t, _ = ndimage.label(tinted | ~flag)
        through = tinted & np.isin(lab_t, np.unique(lab_t[~flag]))
        # the emblem is the light, NEUTRAL bone/skull paint inside the flag outline
        emblem = flag & ~cloth & ~through
        lab, _ = ndimage.label(emblem)
        emblem = np.isin(lab, [i for i in np.unique(lab[emblem]) if (lab == i).sum() >= 4])
        # include its dark outline (darker than the cloth): grow 3 px, never past the flag or into sky/sail
        hole = ndimage.binary_dilation(emblem, iterations=3) & flag & ~through
        # boundary = real cloth pixels just outside the hole; sky/sail neighbours take the nearest cloth value
        ring = ndimage.binary_dilation(hole, iterations=2) & ~hole
        good = ring & cloth & (lum > np.percentile(lum[cloth], 15))
        if not good.any():
            raise SystemExit(f'retouch box {(x0, y0, x1, y1)}: no cloth around the emblem')
        _, (iy, ix) = ndimage.distance_transform_edt(~good, return_indices=True)
        fill = sub.copy()
        fill[~good] = sub[iy[~good], ix[~good]]
        for _ in range(600):   # harmonic (Laplace) fill: each hole pixel = mean of its 4 neighbours
            avg = (np.roll(fill, 1, 0) + np.roll(fill, -1, 0) + np.roll(fill, 1, 1) + np.roll(fill, -1, 1)) / 4
            fill[hole] = avg[hole]
        sub[hole] = fill[hole]
        if (sub.mean(2)[hole] > 110).any():
            raise SystemExit(f'retouch box {(x0, y0, x1, y1)}: emblem still visible')
    return np.clip(np.rint(out), 0, 255).astype(np.uint8)


def build(only=None):
    check_duplicates()
    results = []
    for pfx, name in SHEETS.items():
        if only and name not in only:
            continue
        a = sheet(pfx)
        if pfx in RETOUCH:
            a = paint_out_emblems(a, RETOUCH[pfx])
        for kind, (x0, y0, x1, y1) in sorted(rects(a).items()):
            crop = Image.fromarray(a[y0:y1, x0:x1])
            results.append((f'{name}-{kind}', kind, crop, (x0, y0, x1, y1)))
            if name == 'title':
                cut = Image.fromarray(a[y0:y0 + round((y1 - y0) * TITLE_CUT[kind]), x0:x1])
                results.append((f'title-clean-{kind}', kind, cut, (x0, y0, x1, y0 + cut.height)))
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--sheets')
    ap.add_argument('--only', nargs='*')
    args = ap.parse_args()
    exports, entries = {}, {}
    for key, kind, crop, box in build(args.only):
        data, q, ssim, blk, scale, size = encode(crop, kind)
        print(f'{key:24s} rect {box} -> {size[0]}x{size[1]} q{q} SSIM {ssim:.4f} worst-block {blk:.3f} '
              f'{len(data) // 1024} KB' + ('' if scale == 1.0 else f' (downscaled {scale:.2f})'))
        exports[LIB / 'mojo-bg' / (key + '.webp')] = data
        entries['mojo-bg/' + key] = {'file': f'assets/db/lib/mojo-bg/{key}.webp', 'cat': 'mojo-bg',
                                     'tags': key.split('-') + ['mojo', 'background'], 'source': SRCTAG,
                                     'w': size[0], 'h': size[1]}
        if args.sheets:
            out = Path(args.sheets)
            out.mkdir(parents=True, exist_ok=True)
            dec = Image.open(io.BytesIO(data)).convert('RGB')
            w, h = dec.size
            # top-left sky quarter and the four rims at 2x, side by side with the source
            for tag, b in (('sky', (0, 0, w // 3, h // 4)), ('rimL', (0, 0, 40, h)), ('rimB', (0, h - 40, w, h))):
                pair = Image.new('RGB', ((b[2] - b[0]) * 2, (b[3] - b[1]) * 4 + 6), (255, 0, 255))
                pair.paste(crop.crop(b).resize(((b[2] - b[0]) * 2, (b[3] - b[1]) * 2), Image.NEAREST), (0, 0))
                pair.paste(dec.crop(b).resize(((b[2] - b[0]) * 2, (b[3] - b[1]) * 2), Image.NEAREST), (0, (b[3] - b[1]) * 2 + 6))
                pair.save(out / f'{key}-{tag}.png')
            dec.save(out / f'{key}.png')
    if args.dry:
        return 0
    spec = importlib.util.spec_from_file_location('mojo_ingest_for_bg', ROOT / 'tools' / 'ingest-mojo-sheets.py')
    ingest = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(ingest)
    from asset_transaction import publish
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, exports, ingest.index_helper())
    print('published', len(entries), 'backgrounds; index now has', total, 'assets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
