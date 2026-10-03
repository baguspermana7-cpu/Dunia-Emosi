#!/usr/bin/env python3
"""
Cut the owner's PRIMARY Mojo sheet (30-mojo-primary.png, 5x5 poses on white) into assets/db/lib/mojo-hero/.

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-hero.py            # write sprites + merge both asset indexes
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-hero.py --dry      # build + report, write nothing
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-hero.py --audit DIR    # list every enclosed page-colour hole
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-hero.py --sheets DIR   # before/after contact sheets (navy + grey)

Owner, 2026-10-03: "The previous Mojo is a side character ... Use this as the main one. Make sure the crop is
perfect." The older mojo-top/* sprites stay as SECONDARY art for forms this sheet does not draw.

Method (deterministic: output depends only on the owner sheet and the audited tables below):
  1. GRID: the sheet's ruled grey lines are measured (tools/ingest-mojo-sheets.seps) and must give exactly 5x5
     cells, else the run fails closed. Each cell is cut 3 px inside its lines, so a neighbour never bleeds in
     (art that runs to a cell edge - the monster-2/-3 antennas - is cut by the owner's own line).
  2. BACKGROUND: page colour B = median of the cell border. Exterior = pixels within 8 levels of B that are
     connected to the cell border. NO global white key: Mojo's white panels, the white helicopter skids, the
     white wings, eyes and Bo's shirt are never reached because a shaded rim separates them from the page.
  3. HOLES: an enclosed page-coloured component (>= 41 px) is cleared only when one of its audited seeds is in
     CLEAR_HOLES; KEEP_WHITE lists audited white paint. An unaudited hole fails the run (and qa-mojo-art.py).
  4. HALO: the light 1-3 px edge ring is un-premultiplied against B (clean-mojo-sprites.decontaminate), which
     only lowers alpha and never erodes white paint or dark outlines.
  5. SHADOW: the soft grey ground shadow below the vehicle becomes translucent BLACK at alpha (B-L)/B
     (clean-mojo-sprites.floor_shadow), so it reads on any backdrop; FLOOR_KEEP boxes protect white parts that
     sit low in the frame (skids, wing tips). Shadow pixels under 3% alpha are dropped for tight bounds.
  6. Native resolution (no upscale), WebP q92 method 6. Both asset indexes are merged under the shared lock by
     asset_transaction.publish (re-read right before writing; other keys are never dropped).
"""
import argparse, importlib.util, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
SHEET = Path(os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops/owner-sheets/30-mojo-primary.png'))
LIB = ROOT / 'assets' / 'db' / 'lib'
CAT = 'mojo-hero'
SRCTAG = 'owner mojo primary sheet 2026-10-03'
INSET = 3
QUALITY = 92
SHADOW_MIN = 8        # alpha levels: fainter shadow is dropped (tight bounds, no grey dust)

# Row by row, as drawn. facing = which way the vehicle's nose points on screen ('l', 'r', or 'f' head-on).
CELLS = [
    ('base-1', 'r'), ('base-2', 'r'), ('racer', 'r'), ('chopper-1', 'f'), ('dozer-1', 'l'),
    ('dozer-2', 'l'), ('dozer-3', 'r'), ('monster-1', 'f'), ('monster-2', 'f'), ('monster-3', 'r'),
    ('van', 'r'), ('base-front', 'f'), ('base-bo', 'r'), ('rescue', 'f'), ('offroad', 'f'),
    ('base-bo-front', 'f'), ('boat', 'r'), ('cargo', 'l'), ('jet-1', 'r'), ('jet-2', 'r'),
    ('jet-3', 'r'), ('jet-4', 'r'), ('chopper-2', 'f'), ('chopper-3', 'f'), ('chopper-4', 'f'),
]

# Audited enclosed page-colour components, cell-crop px "x,y" (before trimming). Judged by eye at 2-6x zoom,
# 2026-10-03. CLEAR = page seen through the art (floor between wheels/skids, gaps in racks, rotor mast, lamp
# stands, wing roots, and the far SIDE WINDOW of every cab: re-judged after the owner's phone test, "there's
# still white here" - it is the white page seen through the cab, exactly 254 like the page, and showed as a
# white slab on the home screen). KEEP = white art with the page value: roof highlights, roof light plates,
# wheel-arch rims, white body panels, eye whites, white skid tubes, white tail paint.
CLEAR_HOLES = {
    'base-1': '70,203 175,210 185,110',
    'base-2': '90,80 74,203 163,208 191,121',
    'racer': '72,98 97,216 191,133',
    'chopper-1': '90,54 197,198 137,211 67,216 65,116',
    'dozer-2': '133,37 96,78',
    'monster-1': '175,110 89,78',
    'monster-2': '128,186',
    'monster-3': '150,180 147,201 164,115',
    'base-front': '38,54 196,68',
    'base-bo': '168,203 186,67',
    'rescue': '78,100 83,194 171,199 191,75',
    'offroad': '136,35 88,202 85,83',
    'base-bo-front': '169,211 196,79',
    'boat': '162,139',
    'cargo': '179,190 87,196 59,81',
    'jet-1': '61,154',
    'jet-3': '87,47',
    'chopper-2': '181,196 70,193 116,201 74,213 73,101',
    'chopper-3': '70,198 177,200 144,203 169,215 167,110',
    'chopper-4': '67,200 170,205 104,208 156,221 169,112',
    'dozer-1': '103,102',
    'dozer-3': '156,86',
    'van': '166,67',
    'jet-4': '186,99',
}
KEEP_WHITE = {
    'base-1': '161,71 105,182',
    'base-2': '160,86',
    'racer': '151,97',
    'chopper-1': '192,153 157,160 193,162 76,203 169,217',
    'monster-2': '111,65 108,83',
    'van': '175,44 68,92',
    'base-front': '123,67 105,141 63,164',
    'base-bo': '142,20 178,18 116,141',
    'rescue': '118,156',
    'offroad': '111,42 149,49 191,126',
    'base-bo-front': '114,22 129,21 170,22 61,172',
    'cargo': '136,153',
    'jet-2': '81,101',
    'jet-4': '82,76',
    'chopper-2': '127,142 156,156',
    'chopper-4': '93,166',
}
# Boxes (x0,y0,x1,y1 in cell px) where low white art must never become floor shadow.
FLOOR_KEEP = {}
# Floor shadow starts below the lowest coloured/dark pixel within +-span//2 columns. Striped white tubes (the
# helicopter skids, red bands every ~12 px) need a wide span so a white run between two bands counts as art.
SHADOW_SPAN = {}
# Smooth-floor test threshold (luma gradient per px) for every sprite: keeps white skids/wings whole.
SHADOW_SMOOTH = 5.0
# Wheeled poses with NO white art below the tyre tops (judged by eye 2026-10-03): their cast shadow ends in a
# steep ramp to the page (177 -> 233 -> 254 over 3 px), steeper than SHADOW_SMOOTH, so the smooth-reach never got
# into the shadow body and it stayed an OPAQUE light-grey slab under the car (owner phone test, base-bo on the
# home screen: "there's still white here"). These take the plain floor test (neutral light pixels below the
# lowest tyre/chassis pixel, connected to the open page under the vehicle). Choppers, jets and the boat keep
# the smooth test: their white skids, wings and hull sit on the floor.
SHADOW_SMOOTH_WHEELED = 1e9
WHEELED = set('base-1 base-2 racer dozer-1 dozer-2 dozer-3 monster-1 monster-2 monster-3 van base-front base-bo '
              'rescue offroad base-bo-front cargo'.split())


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


clean = _load('mojo_clean_for_hero', 'clean-mojo-sprites.py')
ingest = _load('mojo_ingest_for_hero', 'ingest-mojo-sheets.py')
_pts = clean._pts


def grid(a):
    """Measured ruled lines -> 6 row and 6 column bounds; blank margin strips (< 60 px) are not cells."""
    H, W = a.shape[:2]

    def bounds(v, n):
        v = sorted(set([0] + [p for p in v if 3 < p < n - 3] + [n]))
        segs = [(p, q) for p, q in zip(v[:-1], v[1:]) if q - p >= 60]
        return segs
    rows, cols = bounds(ingest.seps(a, 1, 0.3), H), bounds(ingest.seps(a, 0, 0.5), W)
    if len(rows) != 5 or len(cols) != 5:
        raise SystemExit(f'grid is not 5x5: rows {rows} cols {cols}')
    return rows, cols


def cells(a):
    rows, cols = grid(a)
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            name, facing = CELLS[r * 5 + c]
            box = (x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET)
            yield name, facing, box


def page(s):
    border = np.concatenate([s[0], s[-1], s[:, 0], s[:, -1]])
    return np.median(border, axis=0).astype(np.float32)


def exterior(s, bg):
    d = np.abs(s.astype(np.int16) - bg.astype(np.int16)).max(2)
    near = d <= clean.HOLE_TOL
    lab, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(edge)), near


def holes(s, bg):
    ext, near = exterior(s, bg)
    lab, n = ndimage.label(near & ~ext, structure=np.ones((3, 3)))
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        comp = lab == i
        area = int(comp.sum())
        if area >= clean.MIN_AREA:
            ys, xs = np.nonzero(comp)
            k = len(ys) // 2
            out.append((i, area, (int(xs[k]), int(ys[k])), comp))
    return ext, lab, out


def box_mask(shape, boxes):
    m = np.zeros(shape, bool)
    for b in boxes:
        x0, y0, x1, y1 = b
        m[y0:y1, x0:x1] = True
    return m


SMOOTH_HOLE_FLOOR = 5.0


def smooth_mask(a, grad_max):
    g = ndimage.gaussian_filter(a.astype(np.float32).mean(2), 0.8)
    return np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1)) / 8 < grad_max


def floor_shadow(a, rgb, alpha, bg, span, grad_max=None):
    """clean-mojo-sprites.floor_shadow with a configurable column span (see SHADOW_SPAN).

    With grad_max, a floor pixel must also be reachable from the page through smooth floor pixels (luma
    gradient < grad_max): a cast shadow is soft, while a white tube or wing meets the floor with a shaded rim,
    so the white art is never taken for shadow even where no coloured pixel lies below it in its column."""
    sub = a.astype(np.int16)
    solid = alpha > 0
    mn, mx = sub.min(2), sub.max(2)
    art = solid & ((mn < 105) | (mx - mn > 30))
    rows = np.arange(sub.shape[0])[:, None]
    lowest = ndimage.maximum_filter1d(np.where(art, rows, -1).max(0), size=span)
    floor = solid & (rows > lowest[None, :]) & (rows > sub.shape[0] * 0.5) & (mx - mn <= 18) & (mn >= 110)
    if grad_max is not None:
        smooth = smooth_mask(a, grad_max)
        # seeds: only the open page under the vehicle (transparent pixels connected to the bottom row), never
        # a cleared hole enclosed by the art above a skid
        open_lab, _ = ndimage.label(~solid)
        below = np.isin(open_lab, np.unique(open_lab[-1][open_lab[-1] > 0]))
        lab, _ = ndimage.label((floor & smooth) | below)
        reached = floor & np.isin(lab, np.unique(lab[below]))
        # the 1-2 px light fringe where the floor meets the open page (too steep to count as smooth): a
        # skid or hull rim there is darker than 215 and stays
        lum = sub.mean(2)
        under = np.zeros_like(below)          # the open page lies 1-2 px straight BELOW the pixel
        under[:-1] |= below[1:]
        under[:-2] |= below[2:]
        reached |= floor & under & (lum >= 215)
        # then let the shadow spread into touching floor pixels that are LIGHTER than it (its fading tail,
        # streaky render noise); a skid/wing rim is darker than the shadow it sits on and stops the spread
        loose = solid & (rows > sub.shape[0] * 0.5) & (mx - mn <= 18)
        for _ in range(30):
            nb = ndimage.grey_dilation(np.where(reached, -lum, -999.0), size=3)   # -(darkest reached neighbour)
            grow = loose & ~reached & (nb > -999) & (lum >= -nb - 1) & (lum >= 190)
            if not grow.any():
                break
            reached |= grow
        floor = reached
    return clean.to_shadow(a, rgb, alpha, floor, bg)


def build(name, s, report):
    """Return (RGBA trimmed sprite, alpha before cleaning, page colour, trim box) for one cell crop."""
    bg = page(s)
    ext, lab, found = holes(s, bg)
    alpha = np.where(ext, 0, 255).astype(np.uint8)
    clear = {lab[y, x] for x, y in _pts(CLEAR_HOLES.get(name, '')) if lab[y, x]}
    keep = {lab[y, x] for x, y in _pts(KEEP_WHITE.get(name, '')) if lab[y, x]}
    for x, y in _pts(CLEAR_HOLES.get(name, '')) + _pts(KEEP_WHITE.get(name, '')):
        if not lab[y, x]:
            report.append(f'{name}: seed {x},{y} not on a page-colour hole (re-audit)')
    for i, area, seed, comp in found:
        if i in clear:
            alpha[comp] = 0
        elif i not in keep:
            report.append(f'{name}: UNAUDITED hole {area}px seed {seed[0]},{seed[1]}')
    h, w = alpha.shape
    bbox = (0, 0, w, h)
    hole_floor = clean.floor_below_holes(s, np.where(ext, 0, 255).astype(np.uint8), alpha, bbox)
    hole_floor &= smooth_mask(s, SMOOTH_HOLE_FLOOR)   # a shaded white tube under a gap is art, not floor
    rgb, alpha2 = clean.decontaminate(s, alpha, bg)
    rgb, alpha2 = clean.to_shadow(s, rgb, alpha2, hole_floor, bg)
    rgb3, alpha3 = floor_shadow(s, rgb, alpha2, bg, SHADOW_SPAN.get(name, 5),
                               SHADOW_SMOOTH_WHEELED if name in WHEELED else SHADOW_SMOOTH)
    protect = box_mask(alpha.shape, FLOOR_KEEP.get(name, ()))
    rgb3[protect], alpha3[protect] = rgb[protect], alpha2[protect]
    shadow = (alpha3 < alpha2) & (rgb3.max(2) == 0)
    alpha3[shadow & (alpha3 < SHADOW_MIN)] = 0
    # specks: drop detached bits under 12 px (sheet noise), never a real thin part (those are larger)
    lab2, n2 = ndimage.label(alpha3 > 0, structure=np.ones((3, 3)))
    if n2 > 1:
        sizes = ndimage.sum(np.ones_like(alpha3), lab2, range(1, n2 + 1))
        for i, sz in enumerate(sizes, 1):
            if sz < 12:
                alpha3[lab2 == i] = 0
    rgba = Image.fromarray(np.dstack([rgb3, alpha3]).astype(np.uint8), 'RGBA')
    trim = rgba.getbbox()
    return rgba.crop(trim), alpha, bg, trim


def sources():
    if not SHEET.exists():
        raise SystemExit(f'missing owner sheet {SHEET}')
    a = np.asarray(Image.open(SHEET).convert('RGB'))
    for name, facing, box in cells(a):
        x0, y0, x1, y1 = box
        yield name, facing, box, a[y0:y1, x0:x1].copy()


def encode(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6)
    return buf.getvalue()


def contact(entries, path, colour, cols=5, tw=260, th=270):
    rows = max(1, (len(entries) + cols - 1) // cols)
    sheet = Image.new('RGBA', (cols * tw, rows * th), colour)
    d = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(entries):
        x, y = (i % cols) * tw, (i // cols) * th
        t = im.copy()
        t.thumbnail((tw - 8, th - 24), Image.LANCZOS)
        sheet.alpha_composite(t, (x + (tw - t.width) // 2, y + 4))
        d.text((x + 4, y + th - 18), label, fill=(255, 220, 120))
    sheet.convert('RGB').save(path)


def audit(out):
    out.mkdir(parents=True, exist_ok=True)
    for name, _, _, s in sources():
        bg = page(s)
        ext, lab, found = holes(s, bg)
        if not found:
            continue
        vis = s.copy()
        vis[ext] = (255, 0, 255)
        for i, area, seed, comp in found:
            vis[comp] = (0, 255, 0)
            print(f'{name}: hole {area}px seed {seed[0]},{seed[1]}')
        Image.fromarray(vis).resize((s.shape[1] * 3, s.shape[0] * 3), Image.NEAREST).save(out / f'{name}.png')


def entries_for(written):
    return {k: {'file': v['file'], 'cat': CAT, 'tags': k.split('/', 1)[1].split('-') + ['mojo', 'hero', 'cartoon'],
                'source': SRCTAG, 'w': v['w'], 'h': v['h'], 'facing': v['facing']} for k, v in written.items()}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--audit')
    ap.add_argument('--sheets')
    args = ap.parse_args()
    if args.audit:
        audit(Path(args.audit))
        return 0
    report, exports, written, before, after = [], {}, {}, [], []
    for name, facing, box, s in sources():
        im, _, _, _ = build(name, s, report)
        data = encode(im)
        key = f'{CAT}/{name}'
        exports[LIB / CAT / (name + '.webp')] = data
        written[key] = {'file': f'assets/db/lib/{key}.webp', 'w': im.width, 'h': im.height, 'facing': facing}
        before.append((name, Image.fromarray(s).convert('RGBA')))
        after.append((name, Image.open(io.BytesIO(data)).convert('RGBA')))
    for line in report:
        print('FAIL', line)
    if args.sheets:
        out = Path(args.sheets)
        out.mkdir(parents=True, exist_ok=True)
        for tag, items in (('before', before), ('after', after)):
            for bgname, colour in (('navy', (20, 48, 90, 255)), ('mid', (128, 128, 128, 255))):
                contact(items, out / f'hero-{tag}-{bgname}.png', colour)
    if report:
        raise SystemExit('unaudited or stale audit entries; nothing written')
    print('built', len(written), 'sprites', sum(len(v) for v in exports.values()), 'bytes')
    if args.dry:
        return 0
    from asset_transaction import publish
    helper = ingest.index_helper()
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries_for(written), exports, helper)
    print('published; index now has', total, 'assets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
