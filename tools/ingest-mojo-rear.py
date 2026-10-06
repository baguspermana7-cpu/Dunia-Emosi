#!/usr/bin/env python3
"""
Cut the owner's REAR-VIEW Mojo sheet (chase/mojo-rear-sheet-5x5.png, 5x5 poses on white) into
assets/db/lib/mojo-rear/ for the 3-lane chase (games/mojo-chase.js).

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-rear.py             # write sprites + anchors + merge both indexes
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-rear.py --dry       # build + report, write nothing
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-rear.py --audit DIR # list every enclosed page-colour hole
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-rear.py --sheets DIR    # contact sheets (checker + dark + baseline)

Owner, 2026-10-03: "the game needs rear-view sprites ... make sure they're aligned, accurate and immersive."
The side/three-quarter mojo-hero art stays on the selection and showcase surfaces.

Method = tools/ingest-mojo-hero.py (same grid measure, edge flood fill against the page colour, audited holes,
halo decontamination, NO global white key: the ambulance body, the white plates, bumpers and the ladder stay
opaque because a shaded rim separates them from the page) plus:
  * NO floor shadow: the chase draws its own soft contact shadow, so the sheet's grey ground shadow is removed
    (alpha 0), which also makes the lowest opaque row the true wheel/contact line.
  * ALIGNMENT: every sprite is placed on ONE shared canvas: the contact line on a common baseline row and the
    body centred (centre = midpoint of the outer edges of the bottom 12% of the art: the wheel/skid/hull row).
    Swapping forms never jumps. Anchors (baseline, centre, body width, tail lights, emitters) are written to
    games/data/mojo-rear-anchors.js (window.MojoRearAnchors) and each index entry.
  * OUTLINE (owner 2026-10-03): every cut is ringed with a white sticker outline OUTLINE_T px wide plus a soft
    dark rim (tools/mojo_outline.py) BEFORE alignment, so the contact line, centre and body width are measured on
    the outlined sprite and the shared canvas grows to fit it (no clipping).
  * TAIL LIGHTS: the symmetric pair of small saturated-red blobs in the lower body (auto, audited by the
    contact sheet), so the chase can glow them additively.
"""
import argparse, importlib.util, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
SHEET = Path(os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops/chase/mojo-rear-sheet-5x5.png'))
LIB = ROOT / 'assets' / 'db' / 'lib'
CAT = 'mojo-rear'
SRCTAG = 'owner mojo rear-view sheet 2026-10-03'
ANCHORS_JS = ROOT / 'games' / 'data' / 'mojo-rear-anchors.js'
INSET = 3
QUALITY = 92
PAD = 6               # transparent margin around the shared canvas
OUTLINE_T = 5         # white ring px: 2.5% of the family's median shorter side (183 px), mojo_outline.thickness

# Row by row, as drawn. kind: ground (wheels -> dust), air (hovers, shadow offset), water (spray).
CELLS = [
    ('crane', 'ground'), ('crane-2', 'ground'), ('ladder', 'ground'), ('chopper', 'air'), ('excavator', 'ground'),
    ('loader', 'ground'), ('digger', 'ground'), ('monster', 'ground'), ('monster-2', 'ground'), ('tow', 'ground'),
    ('base-neon', 'ground'), ('base', 'ground'), ('cargo', 'ground'), ('dumper', 'ground'), ('snow', 'ground'),
    ('ambulance', 'ground'), ('boat', 'water'), ('delivery', 'ground'), ('jet', 'air'), ('jet-2', 'air'),
    ('plane', 'air'), ('prop-plane', 'air'), ('chopper-2', 'air'), ('chopper-3', 'air'), ('hover', 'water'),
]

KIND = dict(CELLS)
# Boxes (x0,y0,x1,y1, cell px) of low WHITE art with no dark/coloured part below it: never floor.
FLOOR_KEEP = {'excavator': [(68, 178, 154, 224)]}

# Audited enclosed page-colour components, cell-crop px "x,y". Filled from --audit at 3x zoom, 2026-10-03.
# CLEAR = page seen through the art (floor under the axle/skids, gaps in the ladder rack and roll bars, between
# rotor blades, inside the cargo handles). KEEP = white paint/glass with the page value: the cabin glass seen
# through to the white page, roof trims, bumpers, the ambulance panel, white lamp lenses, the life ring, the
# white engine cowlings and the chopper's white stripe.
CLEAR_HOLES = {
    # windscreen seen through the rear window: the white page beside Bo's head (re-judged 2026-10-03 after the
    # owner's phone test of the film Mojo's side window; the same page-through-glass slab)
    'base': '82,67 147,67',
    'base-neon': '77,63 156,58',
    'ladder': '100,29 145,71',
    'chopper': '175,54 149,158 138,206',
    'excavator': '177,107',
    'loader': '185,144',
    'monster': '65,85 166,87 105,191',
    'monster-2': '67,77 166,76 90,195',
    'tow': '100,197',
    'cargo': '53,94 182,98',
    'dumper': '95,188',
    'snow': '96,188 140,188',
    'chopper-2': '72,194',
    'chopper-3': '84,197',
}
KEEP_WHITE = {
    'crane-2': '140,102 117,131 82,184 155,184',
    'ladder': '92,111 129,187',
    'base-neon': '145,28',
    'base': '194,150',
    'ambulance': '165,42 145,72 107,112 177,116 58,157 177,156',
    'boat': '135,116',
    'delivery': '51,157',
    'jet': '72,129 179,128',
    'prop-plane': '165,145',
    'chopper-3': '145,153',
    'hover': '85,116',
}


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


clean = _load('mojo_clean_for_rear', 'clean-mojo-sprites.py')
ingest = _load('mojo_ingest_for_rear', 'ingest-mojo-sheets.py')
hero = _load('mojo_hero_for_rear', 'ingest-mojo-hero.py')
outline = hero.outline
_pts = clean._pts
page, holes, encode = hero.page, hero.holes, hero.encode


def grid(a):
    """The rear sheet's ruled lines are mid-grey (80-238, neutral) and span >= 80% of the sheet; the black
    tyres of a whole row never qualify (they are not >= 80% of a line). Must give exactly 6 x 6 lines."""
    mn, mx = a.min(2).astype(int), a.max(2).astype(int)
    line = (mn >= 80) & (mn <= 238) & (mx - mn <= 14)

    def groups(axis):
        idx = np.where(line.mean(axis=axis) > 0.8)[0]
        g = []
        for i in idx:
            if g and i - g[-1][-1] <= 3:
                g[-1].append(int(i))
            else:
                g.append([int(i)])
        return [(x[0], x[-1]) for x in g]
    rl, cl = groups(1), groups(0)
    if len(rl) != 6 or len(cl) != 6:
        raise SystemExit(f'grid is not 5x5: row lines {rl} col lines {cl}')
    return [(rl[i][1] + 1, rl[i + 1][0]) for i in range(5)], [(cl[i][1] + 1, cl[i + 1][0]) for i in range(5)]


def cells(a):
    rows, cols = grid(a)
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            name, kind = CELLS[r * 5 + c]
            yield name, kind, (x0 + INSET, y0 + INSET, x1 - INSET, y1 - INSET)


def sources():
    if not SHEET.exists():
        raise SystemExit(f'missing owner sheet {SHEET}')
    a = np.asarray(Image.open(SHEET).convert('RGB'))
    for name, kind, box in cells(a):
        x0, y0, x1, y1 = box
        yield name, kind, a[y0:y1, x0:x1].copy()


def build(name, s, report):
    """Cut one cell: exterior + audited holes cleared, halo un-premultiplied, ground shadow REMOVED."""
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
    hole_floor = clean.floor_below_holes(s, np.where(ext, 0, 255).astype(np.uint8), alpha, (0, 0, alpha.shape[1], alpha.shape[0]))
    hole_floor &= hero.smooth_mask(s, hero.SMOOTH_HOLE_FLOOR)
    rgb, alpha2 = clean.decontaminate(s, alpha, bg)
    rgb, alpha2 = clean.to_shadow(s, rgb, alpha2, hole_floor, bg)
    rgb3, alpha3 = hero.floor_shadow(s, rgb, alpha2, bg, 5, hero.SHADOW_SMOOTH)
    shadow = (alpha3 < alpha2) & (rgb3.max(2) == 0)
    alpha3[shadow] = 0                      # our own contact shadow replaces the sheet's
    rgb3[shadow] = rgb[shadow]
    air = KIND[name] == 'air'
    alpha3 = clear_floor(s, alpha3, 15 if name.startswith('chopper') else 5, FLOOR_KEEP.get(name, ()), 228 if name.startswith('chopper') else 252, 34 if air else 22)
    lab2, n2 = ndimage.label(alpha3 > 0, structure=np.ones((3, 3)))
    if n2 > 1:
        sizes = ndimage.sum(np.ones_like(alpha3), lab2, range(1, n2 + 1))
        for i, sz in enumerate(sizes, 1):
            if sz < 12:
                alpha3[lab2 == i] = 0
    return np.dstack([rgb3, alpha3]).astype(np.uint8)


def clear_floor(s, alpha, span, keep_boxes=(), lum_max=255, neutral=22):
    """The sheet's soft grey floor shadow/reflection left between the wheels/skids (darker than the page, so the
    exterior flood stops at it). Per column, every NEUTRAL light pixel (max-min <= 22, luma >= 110) below the
    lowest ART pixel (dark < 105 or coloured, max-min > 30; max over +-span//2 columns) and in the lower 40% is
    floor. White bumpers/panels always have a dark underside or coloured part below them in their column, so
    they stay; tyres are art. Then any light neutral speck still touching the open page in the bottom 6 rows goes."""
    sub = s.astype(np.int16)
    mn, mx = sub.min(2), sub.max(2)
    lum = sub.mean(2)
    solid = alpha > 0
    rws = np.nonzero(solid.sum(1) >= 3)[0]
    if not len(rws):
        return alpha
    top, base = int(rws[0]), int(rws[-1])
    art = solid & ((mn < 105) | (mx - mn > 30))
    lab, n = ndimage.label(art, structure=np.ones((3, 3)))
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        art &= np.isin(lab, 1 + np.nonzero(sizes >= 40)[0])   # a red speck ON the floor is not art
    rows = np.arange(sub.shape[0])[:, None]
    lowest = ndimage.maximum_filter1d(np.where(art, rows, -1).max(0), size=span)
    floor = solid & (rows > lowest[None, :]) & (rows > top + (base - top) * 0.6) & (mx - mn <= neutral) & (lum >= 110) & (lum <= lum_max)
    floor &= ~hero.box_mask(alpha.shape, keep_boxes)
    out = alpha.copy()
    out[floor] = 0
    return out


def measure(rgba):
    """Contact line (lowest row with >= 3 solid px), body centre and width from the bottom 12% of the art."""
    a = rgba[..., 3]
    solid = a >= 128
    rows = np.nonzero(solid.sum(1) >= 3)[0]
    top, base = int(rows[0]), int(rows[-1])
    h = base - top + 1
    band = solid[max(top, base - max(6, int(h * 0.12))):base + 1]
    cols = np.nonzero(band.any(0))[0]
    left, right = int(cols[0]), int(cols[-1])
    return {'top': top, 'base': base, 'cx': (left + right) / 2.0, 'bw': right - left + 1, 'h': h}


def tail_lights(rgba, m):
    """The symmetric pair of small red lamps in the lower body (x,y in sprite px), or [] when none qualify."""
    r, g, b, a = [rgba[..., i].astype(np.int16) for i in range(4)]
    red = (a > 200) & (r > 170) & (g < 110) & (b < 110) & (r - g > 90)
    y0, y1 = m['top'] + int(m['h'] * 0.40), m['top'] + int(m['h'] * 0.84)
    red[:y0] = False
    red[y1:] = False
    red = ndimage.binary_fill_holes(red)              # the white specular dot inside a lamp is still lamp
    lab, n = ndimage.label(red)
    blobs = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        comp = lab[sl] == i
        area = int(comp.sum())
        hh, ww = comp.shape
        fill = area / float(ww * hh)
        if 25 <= area <= 1600 and 0.6 <= ww / max(1, hh) <= 1.7 and fill >= 0.55:
            cy, cx = ndimage.center_of_mass(lab == i)
            blobs.append((area, float(cx), float(cy)))
    best, score = [], 1e9
    for i in range(len(blobs)):
        for j in range(i + 1, len(blobs)):
            a1, x1, y1 = blobs[i]
            a2, x2, y2 = blobs[j]
            if abs(y1 - y2) > 8 or abs(x1 - x2) < m['bw'] * 0.35:
                continue
            sym = abs((x1 + x2) / 2 - m['cx'])
            s = sym + abs(y1 - y2) * 2 + abs(a1 - a2) / 40
            inside = max(abs(x1 - m['cx']), abs(x2 - m['cx'])) < m['bw'] * 0.42
            if sym < m['bw'] * 0.12 and inside and s < score:
                score, best = s, sorted([(x1, y1), (x2, y2)])
    return [[round(x, 1), round(y, 1)] for x, y in best]


def align(built):
    """One shared canvas: baselines on one row, bodies centred. Returns (canvas images, anchors, size)."""
    ms = {n: measure(im) for n, _, im in built}
    left = max(ms[n]['cx'] for n, _, _ in built)
    right = max(im.shape[1] - ms[n]['cx'] for n, _, im in built)
    above = max(ms[n]['base'] + 1 for n, _, _ in built)
    W = int(np.ceil(max(left, right) * 2)) + PAD * 2
    H = int(above) + PAD * 2
    CX, BASE = W / 2.0, H - PAD - 1
    out, anchors = {}, {}
    for n, kind, im in built:
        m = ms[n]
        dx, dy = int(round(CX - m['cx'])), int(BASE - m['base'])
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.alpha_composite(Image.fromarray(im, 'RGBA'), (dx, dy))
        arr = np.asarray(canvas)
        mm = measure(arr)
        lights = tail_lights(arr, mm) if kind == 'ground' else []
        hh, bw = mm['h'], mm['bw']
        if kind == 'ground':
            dust = [[round(mm['cx'] - bw * 0.40, 1), BASE], [round(mm['cx'] + bw * 0.40, 1), BASE]]
            exhaust = [[round(mm['cx'] - bw * 0.22, 1), round(BASE - hh * 0.14, 1)], [round(mm['cx'] + bw * 0.22, 1), round(BASE - hh * 0.14, 1)]]
        elif kind == 'water':
            dust = [[round(mm['cx'] - bw * 0.42, 1), BASE], [round(mm['cx'] + bw * 0.42, 1), BASE]]
            exhaust = [[round(mm['cx'], 1), round(BASE - hh * 0.25, 1)]]
        else:
            dust = []
            exhaust = [[round(mm['cx'] - bw * 0.26, 1), round(BASE - hh * 0.30, 1)], [round(mm['cx'] + bw * 0.26, 1), round(BASE - hh * 0.30, 1)]]
        out[n] = canvas
        anchors[n] = {'kind': kind, 'base': int(BASE), 'cx': round(mm['cx'], 1), 'bw': int(bw), 'top': int(mm['top']),
                      'lights': lights, 'dust': dust, 'exhaust': exhaust}
    return out, anchors, (W, H)


# Mojo form id (games/data/mojo-art.js TOPS + game ids) -> rear key. Unlisted forms fall back to 'base'.
FORM_REAR = {
    'normal': 'base', 'base': 'base', 'racer': 'base', 'police': 'base-neon', 'fire': 'ladder', 'aerial-ladder': 'ladder',
    'chopper': 'chopper', 'dozer': 'loader', 'farm': 'loader', 'harvester': 'loader', 'crane': 'crane', 'cargo-crane': 'crane-2',
    'cherry': 'crane-2', 'lift': 'crane-2', 'forklift': 'crane-2', 'jumper': 'monster', 'monster': 'monster-2', 'dumper': 'dumper',
    'garbage': 'dumper', 'recycling': 'dumper', 'jet': 'jet', 'rocket': 'jet-2', 'space-lab': 'jet-2', 'boat': 'boat',
    'submarine': 'boat', 'water': 'cargo', 'fuel': 'cargo', 'mixer': 'cargo', 'delivery': 'delivery', 'ice-cream': 'delivery',
    'ambulance': 'ambulance', 'rescue': 'ambulance', 'towing': 'tow', 'workshop': 'tow', 'snow-plow': 'snow', 'searchlight': 'snow',
    'drill': 'excavator', 'drilling': 'excavator', 'tree-cutter': 'digger', 'logging': 'digger', 'wrecking-ball': 'digger',
    'balloon': 'prop-plane', 'satellite': 'chopper-3', 'camera': 'chopper-2', 'sweeper': 'hover', 'bridge': 'crane',
}


def kept_extra():
    """The 'extra' rear anchors other tools merge in (tools/ingest-mojo-turnaround.py: mojo-turn/<v>-rear on this same
    canvas); a re-run of this tool keeps them."""
    if not ANCHORS_JS.exists():
        return {}
    text = ANCHORS_JS.read_text(encoding='utf-8')
    try:
        return json.loads(text[text.index('W.MojoRearAnchors = ') + 20:text.rindex(' })(')]).get('extra', {})
    except ValueError:
        return {}


def anchors_js(anchors, size):
    data = {'size': {'w': size[0], 'h': size[1]}, 'forms': FORM_REAR, 'sprites': anchors}
    extra = kept_extra()
    if extra:
        data['extra'] = extra
    body = json.dumps(data, indent=1, sort_keys=True)
    return ('/* GENERATED by tools/ingest-mojo-rear.py - do not edit by hand. Rear-view Mojo anchors for the chase:\n'
            ' * every sprite shares one canvas (size), its contact line on row `base`, body centred on `cx`.\n'
            ' * lights = tail lamp centres, dust = wheel contact emitters, exhaust = exhaust/engine emitters (sprite px). */\n'
            '(function (W) { W.MojoRearAnchors = ' + body + ' })(typeof window !== \'undefined\' ? window : globalThis)\n')


def contact(items, anchors, path, mode):
    tw, th, cols = 270, 300, 5
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * tw, rows * th), (24, 32, 52, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(items):
        x, y = (i % cols) * tw, (i // cols) * th
        if mode == 'checker':
            ck = Image.new('RGBA', (tw, th), (200, 200, 200, 255))
            cd = ImageDraw.Draw(ck)
            for yy in range(0, th, 12):
                for xx in range(0, tw, 12):
                    if (xx // 12 + yy // 12) % 2:
                        cd.rectangle([xx, yy, xx + 11, yy + 11], fill=(255, 255, 255, 255))
            sheet.alpha_composite(ck, (x, y))
        elif mode == 'dark':
            sheet.alpha_composite(Image.new('RGBA', (tw, th), (12, 14, 22, 255)), (x, y))
        else:
            sheet.alpha_composite(Image.new('RGBA', (tw, th), (120, 120, 120, 255)), (x, y))
        s = min((tw - 10) / im.width, (th - 26) / im.height)
        t = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
        ox, oy = x + (tw - t.width) // 2, y + 4
        sheet.alpha_composite(t, (ox, oy))
        a = anchors[n]
        by = oy + a['base'] * s
        d.line([(x, by), (x + tw, by)], fill=(255, 40, 200), width=1)
        cx = ox + a['cx'] * s
        d.line([(cx, oy), (cx, oy + t.height)], fill=(40, 220, 255), width=1)
        for lx, ly in a['lights']:
            d.ellipse([ox + lx * s - 4, oy + ly * s - 4, ox + lx * s + 4, oy + ly * s + 4], outline=(255, 255, 0))
        for ex, ey in a['exhaust']:
            d.rectangle([ox + ex * s - 2, oy + ey * s - 2, ox + ex * s + 2, oy + ey * s + 2], outline=(0, 255, 0))
        d.rectangle([x, y + th - 20, x + tw, y + th], fill=(0, 0, 0))
        d.text((x + 4, y + th - 16), f"{n} [{a['kind']}]", fill=(255, 220, 120))
    sheet.convert('RGB').save(path)


def audit(out):
    out.mkdir(parents=True, exist_ok=True)
    for name, _, s in sources():
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--audit')
    ap.add_argument('--sheets')
    args = ap.parse_args()
    if args.audit:
        audit(Path(args.audit))
        return 0
    report, built = [], []
    for name, kind, s in sources():
        built.append((name, kind, outline.outline(build(name, s, report), OUTLINE_T)[0]))
    for line in report:
        print('FAIL', line)
    if report:
        raise SystemExit('unaudited or stale audit entries; nothing written')
    imgs, anchors, size = align(built)
    exports, entries = {}, {}
    for name, kind, _ in built:
        data = encode(imgs[name])
        key = f'{CAT}/{name}'
        exports[LIB / CAT / (name + '.webp')] = data
        a = anchors[name]
        entries[key] = {'file': f'assets/db/lib/{key}.webp', 'cat': CAT, 'tags': name.split('-') + ['mojo', 'rear', 'chase', 'cartoon'],
                        'source': SRCTAG, 'w': size[0], 'h': size[1], 'baseline': a['base'], 'cx': a['cx'], 'bw': a['bw'], 'kind': kind, 'outline': OUTLINE_T}
    if args.sheets:
        out = Path(args.sheets)
        out.mkdir(parents=True, exist_ok=True)
        items = [(n, Image.open(io.BytesIO(exports[LIB / CAT / (n + '.webp')])).convert('RGBA')) for n, _, _ in built]
        for mode in ('checker', 'dark', 'mid'):
            contact(items, anchors, out / f'rear-{mode}.png', mode)
    bases = sorted({a['base'] for a in anchors.values()})
    print('built', len(entries), 'sprites on a shared', size, 'canvas; baselines', bases, sum(len(v) for v in exports.values()), 'bytes')
    print('tail lights found for', sum(1 for a in anchors.values() if a['lights']), 'of', len(anchors))
    if args.dry:
        return 0
    from asset_transaction import publish
    helper = ingest.index_helper()
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, exports, helper)
    ANCHORS_JS.write_text(anchors_js(anchors, size))
    print('published; index now has', total, 'assets; anchors ->', ANCHORS_JS.relative_to(ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
