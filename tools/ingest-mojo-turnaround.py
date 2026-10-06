#!/usr/bin/env python3
"""
Cut the owner's 3x3 TURNAROUND sheet (chase/turnaround-wrecking-boat-dump.png: rows WRECKING BALL, BOAT, DUMP
TRUCK; columns SIDE, DIAGONAL, REAR view, on white with thin grey rules) into assets/db/lib/mojo-turn/
<vehicle>-{side,diag,rear}.webp for the chase picker (card = side, preview = diag) and the race (rear).

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-turnaround.py              # write sprites + anchors + merge both indexes
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-turnaround.py --dry        # build + report, write nothing
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-turnaround.py --audit DIR  # every enclosed page-colour hole, 3x zoom
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-turnaround.py --sheets DIR # contact sheet (navy + orange)

Owner, 2026-10-06: "These characters don't exist yet. Use all these assets: 3 characters, front, side and rear
views. Make sure they're in the selection by DEFAULT."

Method = tools/ingest-mojo-rear.py (grid measure, edge flood against the page colour, AUDITED holes, halo
decontamination, sheet floor shadow removed, NO global white key) plus:
  * LABEL PILLS: every cell carries a grey "... VIEW" pill top-right and row cells in column 1 a blue name pill
    top-left. They are separate from the art: every non-page component lying wholly inside the top band of a
    corner box is painted with the page colour BEFORE the flood (dilated 2 px for its soft rim). Art never sits
    wholly inside that band (the boom pulley and antennas run down into the body), and the result is checked:
    a pill must be found in every cell, and nothing may remain in the corner band.
  * SCALE: one factor for the whole sheet (one drawing scale), chosen so the rear body width matches the median
    mojo-rear body width; side and diagonal views use the same factor.
  * OUTLINE: the white sticker ring (tools/mojo_outline.py) at OUTLINE_T = 5, the mojo-rear / mojo-hero value.
  * ALIGNMENT: rear sprites land on the mojo-rear canvas (297 x 254, contact line row 247, body centred), so the
    race draws them exactly like the others; side and diag each share one canvas per view family (common
    baseline, centred). Rear anchors (base, cx, bw, lights, dust, exhaust, kind) are merged into
    games/data/mojo-rear-anchors.js under "extra" (key 'mojo-turn/<v>-rear'); tools/ingest-mojo-rear.py keeps that
    block when it regenerates the file.
"""
import argparse, importlib.util, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
SHEET = Path(os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops/chase/turnaround-wrecking-boat-dump.png'))
LIB = ROOT / 'assets' / 'db' / 'lib'
CAT = 'mojo-turn'
SRCTAG = 'owner mojo turnaround sheet 2026-10-06'
ANCHORS_JS = ROOT / 'games' / 'data' / 'mojo-rear-anchors.js'
INSET = 3
PAD = 6
OUTLINE_T = 5
REAR_W, REAR_H, REAR_BASE = 297, 254, 247      # the mojo-rear shared canvas (games/data/mojo-rear-anchors.js)
ROWS = [('wrecking', 'ground'), ('boat', 'amph'), ('dump', 'ground')]
VIEWS = ['side', 'diag', 'rear']
PILL_BAND = 52        # cell px from the top: the pills sit inside it
PILL_LEFT = 250       # name pill: x < this (column 1)
PILL_RIGHT = 150      # view pill: x > cell width - this

# Audited enclosed page-colour holes, cell-crop px "x,y" (filled from --audit at 3x, 2026-10-06).
# CLEAR = page seen through the art (floor under the pontoons/chassis, gaps between wheels and arms);
# KEEP = white paint (pulley, hull, life ring, trims, lamp lenses).
CLEAR_HOLES = {
    # cab windows seen through to the page (the mojo-rear rule), floor between the wheels and under the chassis
    'wrecking-side': '207,216 303,225 249,335 167,340',
    'wrecking-diag': '113,197 135,329 238,331',
    'wrecking-rear': '242,330',
    # the page inside the red A-frame behind the cab, and under the cab between the pontoons
    'boat-side': '210,151 337,174',
    'boat-diag': '171,138 317,130 178,265',
    'boat-rear': '174,150 307,152 237,270',
    # the slot between the dump bed and the cab back
    'dump-side': '288,143 400,143 299,280',
    'dump-diag': '224,95 378,136 197,278 340,282',
    'dump-rear': '249,284',
}
KEEP_WHITE = {
    # the boom-tip cable pulley, roof trims, fender and arch trims, the cab's white rear panel
    'wrecking-side': '394,53 287,185 296,290 201,290',
    'wrecking-diag': '393,52 144,149 155,150 180,275',
    'wrecking-rear': '176,208',
    # the white hull bands, wheel arch, life ring, roof trim and window trim
    'boat-side': '208,251',
    'boat-diag': '232,75 230,189 278,207 310,238 287,241',
    'boat-rear': '230,83 240,146 232,228 386,245 161,254',
    # roof trims, fender trims, eye whites, the teeth, the white arrow decal
    'dump-side': '356,94 335,220 347,224',
    'dump-diag': '314,79 350,83 308,194 165,219 246,220 365,222 177,236',
}


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rear = _load('mojo_rear_for_turn', 'ingest-mojo-rear.py')
clean, hero, outline = rear.clean, rear.hero, rear.outline
_pts, page, holes, encode = clean._pts, hero.page, hero.holes, hero.encode


def grid(a):
    """Thin neutral-grey rules spanning >= 80% of the sheet; the sheet edge counts as a rule when none is drawn
    there. Must give exactly 3 x 3 cells."""
    mn, mx = a.min(2).astype(int), a.max(2).astype(int)
    line = (mn >= 120) & (mn <= 236) & (mx - mn <= 16)

    def groups(axis, n):
        idx = np.where(line.mean(axis=axis) > 0.8)[0]
        g = []
        for i in idx:
            if g and i - g[-1][-1] <= 3:
                g[-1].append(int(i))
            else:
                g.append([int(i)])
        g = [(x[0], x[-1]) for x in g]
        if not g or g[0][0] > 8:
            g.insert(0, (-1, -1))
        if g[-1][1] < n - 9:
            g.append((n, n))
        return g
    rl, cl = groups(1, a.shape[0]), groups(0, a.shape[1])
    if len(rl) != 4 or len(cl) != 4:
        raise SystemExit(f'grid is not 3x3: row lines {rl} col lines {cl}')
    return [(rl[i][1] + 1, rl[i + 1][0]) for i in range(3)], [(cl[i][1] + 1, cl[i + 1][0]) for i in range(3)]


def sources():
    if not SHEET.exists():
        raise SystemExit(f'missing owner sheet {SHEET}')
    a = np.asarray(Image.open(SHEET).convert('RGB'))
    rows, cols = grid(a)
    for r, (y0, y1) in enumerate(rows):
        for c, (x0, x1) in enumerate(cols):
            veh, kind = ROWS[r]
            yield f'{veh}-{VIEWS[c]}', kind, c, a[y0 + INSET:y1 - INSET, x0 + INSET:x1 - INSET].copy()


def pill_zones(shape, col):
    h, w = shape[:2]
    z = np.zeros((h, w), bool)
    z[:PILL_BAND, w - PILL_RIGHT:] = True
    if col == 0:
        z[:PILL_BAND, :PILL_LEFT] = True
    return z


def depill(s, col, report, name):
    """Paint the label pills with the page colour. A pill = a non-page component wholly inside a corner zone."""
    bg = page(s)
    d = np.abs(s.astype(np.int16) - bg.astype(np.int16)).max(2)
    lab, n = ndimage.label(d > 3, structure=np.ones((3, 3)))
    zone = pill_zones(s.shape, col)
    kill = np.zeros(lab.shape, bool)
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        comp = lab[sl] == i
        if zone[sl][comp].all():
            kill[sl] |= comp
    kill = ndimage.binary_dilation(kill, iterations=2) & zone
    want = 2 if col == 0 else 1
    found = ndimage.label(ndimage.binary_closing(kill, iterations=6))[1]
    if found < want:
        report.append(f'{name}: {found} label pill(s) found, expected {want}')
    out = s.copy()
    out[kill] = bg.astype(np.uint8)
    d2 = np.abs(out.astype(np.int16) - bg.astype(np.int16)).max(2)
    lab2, _ = ndimage.label(d2 > 3, structure=np.ones((3, 3)))
    left = [i for i, sl in enumerate(ndimage.find_objects(lab2), 1) if sl is not None and zone[sl][lab2[sl] == i].all()]
    if left:
        report.append(f'{name}: {len(left)} pill remnant component(s) left in the corner band')
    return out, int(kill.sum())


def build(name, kind, s, report):
    """One cell: exterior + audited holes cleared, halo un-premultiplied, sheet floor shadow REMOVED."""
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
    alpha3[shadow] = 0                       # the race and the picker draw their own contact shadow
    rgb3[shadow] = rgb[shadow]
    alpha3 = rear.clear_floor(s, alpha3, 5, (), 252, 22)
    lab2, n2 = ndimage.label(alpha3 > 0, structure=np.ones((3, 3)))
    if n2 > 1:
        sizes = ndimage.sum(np.ones_like(alpha3), lab2, range(1, n2 + 1))
        for i, sz in enumerate(sizes, 1):
            if sz < 12:
                alpha3[lab2 == i] = 0
    rgba = np.dstack([rgb3, alpha3]).astype(np.uint8)
    ys, xs = np.nonzero(alpha3)
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def scale(rgba, k):
    """LANCZOS downscale, then the edge alpha is steepened (64..192 -> 0..255): a 2-3 px soft resampled rim would
    otherwise sit under the white ring and halve its measured width (mojo_outline.ring_stats)."""
    im = Image.fromarray(rgba, 'RGBA')
    out = np.asarray(im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)).copy()
    a = out[..., 3].astype(np.float32)
    out[..., 3] = np.clip((a - 64) * 255.0 / 128.0, 0, 255).astype(np.uint8)
    out[out[..., 3] == 0] = 0
    return out


def rear_family_bw():
    text = ANCHORS_JS.read_text(encoding='utf-8')
    data = json.loads(text[text.index('W.MojoRearAnchors = ') + 20:text.rindex(' })(')])
    return float(np.median([a['bw'] for a in data['sprites'].values() if a['kind'] == 'ground']))


def place(items, size=None, base=None):
    """Shared canvas: contact lines on one row, bodies centred (rear.measure). size/base fixed for the rear."""
    ms = {n: rear.measure(im) for n, im in items}
    if size is None:
        left = max(ms[n]['cx'] for n, _ in items)
        right = max(im.shape[1] - ms[n]['cx'] for n, im in items)
        W = int(np.ceil(max(left, right) * 2)) + PAD * 2
        H = int(max(ms[n]['base'] + 1 for n, _ in items)) + PAD * 2
        size, base = (W, H), H - PAD - 1
    W, H = size
    out = {}
    for n, im in items:
        m = ms[n]
        dx, dy = int(round(W / 2.0 - m['cx'])), int(base - m['base'])
        if dx < 0 or dy < 0 or dx + im.shape[1] > W or dy + im.shape[0] > H:
            raise SystemExit(f'{n}: does not fit the {W}x{H} canvas (dx {dx} dy {dy} size {im.shape[1]}x{im.shape[0]})')
        cv = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        cv.alpha_composite(Image.fromarray(im, 'RGBA'), (dx, dy))
        out[n] = cv
    return out, size, base


def rear_anchor(arr, kind):
    mm = rear.measure(arr)
    hh, bw, B, cx = mm['h'], mm['bw'], mm['base'], mm['cx']
    if kind == 'amph':       # pontoons glide: spray at the two hull tips, the outboard exhaust low in the middle
        dust = [[round(cx - bw * 0.40, 1), B], [round(cx + bw * 0.40, 1), B]]
        exhaust = [[round(cx - bw * 0.16, 1), round(B - hh * 0.12, 1)], [round(cx + bw * 0.16, 1), round(B - hh * 0.12, 1)]]
        lights = []
    else:
        dust = [[round(cx - bw * 0.40, 1), B], [round(cx + bw * 0.40, 1), B]]
        exhaust = [[round(cx - bw * 0.22, 1), round(B - hh * 0.14, 1)], [round(cx + bw * 0.22, 1), round(B - hh * 0.14, 1)]]
        lights = rear.tail_lights(arr, mm)
    return {'kind': kind, 'base': int(B), 'cx': round(cx, 1), 'bw': int(bw), 'top': int(mm['top']),
            'lights': lights, 'dust': dust, 'exhaust': exhaust}


def write_anchors(extra):
    text = ANCHORS_JS.read_text(encoding='utf-8')
    head = text[:text.index('W.MojoRearAnchors = ') + 20]
    data = json.loads(text[len(head):text.rindex(' })(')])
    data['extra'] = {**data.get('extra', {}), **extra}
    ANCHORS_JS.write_text(head + json.dumps(data, indent=1, sort_keys=True) + text[text.rindex(' })('):], encoding='utf-8')


def audit(out):
    out.mkdir(parents=True, exist_ok=True)
    rep = []
    for name, _, col, s in sources():
        s, _ = depill(s, col, rep, name)
        bg = page(s)
        ext, lab, found = holes(s, bg)
        vis = s.copy()
        vis[ext] = (255, 0, 255)
        for i, area, seed, comp in found:
            vis[comp] = (0, 255, 0)
            print(f'{name}: hole {area}px seed {seed[0]},{seed[1]}')
        Image.fromarray(vis).resize((s.shape[1] * 2, s.shape[0] * 2), Image.NEAREST).save(out / f'{name}.png')
    for r in rep:
        print('PILL', r)


def contact(imgs, path):
    tw, th = 300, 240
    names = [f'{v}-{w}' for v, _ in ROWS for w in VIEWS]
    sheet = Image.new('RGB', (tw * 6, th * 3), (0, 0, 0))
    d = ImageDraw.Draw(sheet)
    for i, n in enumerate(names):
        im = imgs[n]
        for half, colour in enumerate(((18, 28, 60), (240, 130, 30))):
            x, y = (i % 3) * tw + half * tw * 3, (i // 3) * th
            d.rectangle([x, y, x + tw - 1, y + th - 1], fill=colour)
            k = min((tw - 12) / im.width, (th - 24) / im.height)
            t = im.resize((int(im.width * k), int(im.height * k)), Image.LANCZOS)
            sheet.paste(t, (x + (tw - t.width) // 2, y + 4), t)
            d.text((x + 4, y + th - 16), n, fill=(255, 255, 255))
    sheet.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--audit')
    ap.add_argument('--sheets')
    args = ap.parse_args()
    if args.audit:
        audit(Path(args.audit))
        return 0
    report, cuts, kinds = [], {}, {}
    for name, kind, col, s in sources():
        s, n = depill(s, col, report, name)
        cuts[name], kinds[name] = build(name, kind, s, report), kind
    for line in report:
        print('FAIL', line)
    if report:
        raise SystemExit('unaudited holes / pill trouble; nothing written')
    bws = [rear.measure(np.pad(cuts[f'{v}-rear'], ((2, 2), (2, 2), (0, 0))))['bw'] for v, _ in ROWS]
    k = rear_family_bw() / float(np.median(bws))
    # fit: the tallest rear (with its ring) must stay inside the mojo-rear canvas
    p = outline.pad(OUTLINE_T)
    k = min(k, (REAR_BASE - PAD - 2 * p) / max(cuts[f'{v}-rear'].shape[0] for v, _ in ROWS))
    ringed = {n: outline.crop_tight(*outline.outline(scale(im, k), OUTLINE_T))[0] for n, im in cuts.items()}
    imgs, anchors, sizes = {}, {}, {}
    for view in VIEWS:
        items = [(f'{v}-{view}', ringed[f'{v}-{view}']) for v, _ in ROWS]
        if view == 'rear':
            placed, size, base = place(items, (REAR_W, REAR_H), REAR_BASE)
        else:
            placed, size, base = place(items)
        for n, cv in placed.items():
            imgs[n], sizes[n] = cv, size
            arr = np.asarray(cv)
            anchors[n] = rear_anchor(arr, kinds[n]) if view == 'rear' else {'base': int(base), 'cx': round(rear.measure(arr)['cx'], 1)}
    exports, entries = {}, {}
    for n, im in imgs.items():
        key = f'{CAT}/{n}'
        exports[LIB / CAT / (n + '.webp')] = encode(im)
        veh, view = n.rsplit('-', 1)
        a = anchors[n]
        e = {'file': f'assets/db/lib/{key}.webp', 'cat': CAT, 'tags': [veh, view, 'mojo', 'turnaround', 'chase', 'cartoon'],
             'source': SRCTAG, 'w': sizes[n][0], 'h': sizes[n][1], 'baseline': a['base'], 'cx': a['cx'], 'kind': kinds[n], 'outline': OUTLINE_T}
        if view == 'rear':
            e['bw'] = a['bw']
        entries[key] = e
    if args.sheets:
        out = Path(args.sheets)
        out.mkdir(parents=True, exist_ok=True)
        contact({n: Image.open(io.BytesIO(exports[LIB / CAT / (n + '.webp')])).convert('RGBA') for n in imgs}, out / 'turn-navy-orange.png')
    print('built', len(entries), 'sprites at scale', round(k, 3), 'canvases', sorted(set(sizes.values())),
          'rear bw', [anchors[f'{v}-rear']['bw'] for v, _ in ROWS], 'lights', [len(anchors[f'{v}-rear']['lights']) for v, _ in ROWS])
    if args.dry:
        return 0
    from asset_transaction import publish
    helper = rear.ingest.index_helper()
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, exports, helper)
    write_anchors({f'{CAT}/{v}-rear': anchors[f'{v}-rear'] for v, _ in ROWS})
    print('published; index now has', total, 'assets; rear anchors merged into', ANCHORS_JS.relative_to(ROOT), '"extra"')
    return 0


if __name__ == '__main__':
    sys.exit(main())
