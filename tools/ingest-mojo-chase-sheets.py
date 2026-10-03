#!/usr/bin/env python3
"""
Cut the owner's four CHASE sheets (5x5 grids on white, 2026-10-03) into assets/db/lib/mojo-chase/:

    items/     pickups, obstacles and road pieces   (items-sheet-A + robbers-items-sheet-B rows 2-5)
    props/     roadside props (bush, rock, cactus, lamp, sign)
    robbers/   robbers on foot, seen from the rear (intro cutscene)
    vehicles/  robber getaway vehicles from the rear (plain sheet + the striped "gang" sheet) + the police van

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-chase-sheets.py               # write + merge both indexes
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-chase-sheets.py --dry         # build + report only
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-chase-sheets.py --audit DIR   # hole composites per sheet
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-chase-sheets.py --sheets DIR  # family contact sheets

Same method as tools/ingest-mojo-rear.py (measured grid lines - two sheets are 1278x1230 so cells are not
square; edge flood against the page colour; audited per-hole decisions; NO global white key: the striped cars'
white stripes, the ambulance-style panels and the white plates stay opaque; halo decontamination; the grey
floor shadow removed because the chase draws its own; one shared canvas per family with a common bottom
baseline and centred body). Anchors for every sprite go to games/data/mojo-chase-anchors.js.

KID-SAFE FILTER (owner rule: no skull, no weapon images). These cells are NEVER cut and their names must never
be referenced by the game (qa-mojo-chase checks the denylist):
  sheet B R1C4 mohawk robber (skull jacket); vehicles PIRATE (skull door), RAIDER (skull + spikes), FIRE (skull
  door), FAKE (a fake ambulance, confusing); striped R5C3 (spiked); both spike strips (dropped: sharp-looking);
  the portal (not used); OUTLAW (its WANTED poster face has hollow dark eyes that read as a skull at
  small size). PRISON (police-van look, light bar, no robber) is kept as the POLICE van.
Duplicates between sheet A and sheet B keep the sharper copy (variance of the Laplacian over the art), except
the 2-tyre and 3-tyre stacks which differ and are both kept.
"""
import argparse, importlib.util, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
DIR = Path(os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops/chase'))
LIB = ROOT / 'assets' / 'db' / 'lib'
ANCHORS_JS = ROOT / 'games' / 'data' / 'mojo-chase-anchors.js'
SRCTAG = 'owner mojo chase sheets 2026-10-03'
PAD = 6
X = None   # an excluded cell (kid-safe filter or unused)

# per sheet: 25 cells row by row -> (name, family) or X. Duplicate names across sheets compete (sharper wins).
SHEETS = {
    'A': ('items-sheet-A-5x5.png', [
        ('star', 'items'), ('coin', 'items'), ('heart', 'items'), ('crate', 'items'), ('barrel', 'items'),
        ('barrier', 'items'), ('cone', 'items'), ('tyres-2', 'items'), ('banana', 'items'), X,             # spike strip dropped
        ('magnet', 'items'), ('rocket', 'items'), ('shield', 'items'), ('stopwatch', 'items'), X,          # portal skipped
        ('mystery', 'items'), ('boost-pad', 'items'), ('ramp', 'items'), ('bridge', 'items'), ('pothole', 'items'),
        ('bush', 'props'), ('rock', 'props'), ('cactus', 'props'), ('lamp', 'props'), ('sign', 'props')]),
    'B': ('robbers-items-sheet-B-5x5.png', [
        ('robber-beanie', 'robbers'), ('robber-cap', 'robbers'), ('robber-cowboy', 'robbers'), X, ('robber-helmet', 'robbers'),   # mohawk: skull jacket
        ('star', 'items'), ('coin', 'items'), ('magnet', 'items'), ('rocket', 'items'), ('shield', 'items'),
        ('crate', 'items'), ('barrel', 'items'), ('tyres-3', 'items'), ('barrier', 'items'), ('cone', 'items'),
        ('banana', 'items'), X, ('oil', 'items'), ('boost-pad', 'items'), ('ramp', 'items'),                # spike strip dropped
        ('bush', 'props'), ('rock', 'props'), ('cactus', 'props'), ('lamp', 'props'), ('sign', 'props')]),
    'V': ('robber-vehicles-rear-5x5.png', [
        ('bad1', 'vehicles'), ('thief', 'vehicles'), ('vroom', 'vehicles'), ('cash', 'vehicles'), X,       # PIRATE: skull
        ('steal', 'vehicles'), ('loot', 'vehicles'), X, ('sweet', 'vehicles'), ('trash', 'vehicles'),      # RAIDER: skull + spikes
        ('joke', 'vehicles'), ('logs', 'vehicles'), ('fuel', 'vehicles'), ('chaos', 'vehicles'), X,        # FAKE: fake ambulance
        ('police-van', 'vehicles'), ('big', 'vehicles'), ('junk', 'vehicles'), ('yum', 'vehicles'), ('rich', 'vehicles'),
        ('work', 'vehicles'), X, ('army', 'vehicles'), ('speed', 'vehicles'), X]),    # FIRE: skull door; OUTLAW: hollow-eyed poster face
    'S': ('robber-striped-vehicles-rear-5x5.png', [
        ('striped-01', 'vehicles'), ('striped-02', 'vehicles'), ('striped-03', 'vehicles'), ('striped-04', 'vehicles'), ('striped-05', 'vehicles'),
        ('striped-06', 'vehicles'), ('striped-07', 'vehicles'), ('striped-08', 'vehicles'), ('striped-09', 'vehicles'), ('striped-10', 'vehicles'),
        ('striped-11', 'vehicles'), ('striped-12', 'vehicles'), ('striped-13', 'vehicles'), ('striped-14', 'vehicles'), ('striped-15', 'vehicles'),
        ('striped-16', 'vehicles'), ('striped-17', 'vehicles'), ('striped-18', 'vehicles'), ('striped-19', 'vehicles'), ('striped-20', 'vehicles'),
        ('striped-21', 'vehicles'), ('striped-22', 'vehicles'), X, ('striped-24', 'vehicles'), ('striped-25', 'vehicles')]),   # R5C3 spiked
}
# never cut, never referenced (qa-mojo-chase scans the game files for these names)
DENYLIST = ['robber-mohawk', 'pirate', 'raider', 'fire-truck-skull', 'fake', 'striped-23', 'spikes', 'spike-strip', 'portal', 'outlaw']
KEEP_BOTH = {'tyres-2', 'tyres-3'}

# Audited enclosed page-colour components, "sheet:name" -> "x,y ..." in cell-crop px (--audit, 2x-3x zoom).
# Floor under a vehicle/robber (the hole whose lowest row reaches the art's bottom 6% and whose centre is in the
# lower 22% of the cell) is cleared automatically on the V/S/B sheets and listed by --audit; everything else here.
CLEAR_HOLES = {
    'A:star': '108,193', 'A:barrier': '110,155', 'A:banana': '118,160', 'A:rocket': '132,167 117,187',
    'A:shield': '158,37 183,41', 'A:ramp': '193,129', 'A:bridge': '180,60 220,117', 'A:sign': '161,174',
    'B:robber-cap': '80,126', 'B:robber-cowboy': '84,126', 'B:star': '114,190',
    'B:shield': '101,33 142,31 135,42 46,144 190,153 90,192', 'B:barrier': '82,160', 'B:sign': '132,186',
    'V:police-van': '208,125', 'V:work': '48,98 191,97',
    'S:striped-03': '80,69 173,70', 'S:striped-10': '83,75 153,75 72,91 168,91',
    'S:striped-12': '140,50 88,57 159,66 143,84', 'S:striped-22': '92,74 157,75 42,94', 'S:striped-24': '150,154',
}
KEEP_WHITE = {
    'A:heart': '170,64', 'A:cone': '142,98', 'A:magnet': '66,29 166,31 117,54 192,85 170,98',
    'A:rocket': '171,55 121,88 72,147', 'A:stopwatch': '151,87 165,115 118,102', 'A:mystery': '104,25 127,31 170,79',
    'B:robber-beanie': '104,91 164,96 164,114 89,121 148,133', 'B:robber-helmet': '150,51',
    'B:magnet': '169,48 78,42 80,60 153,103', 'B:rocket': '165,70 106,94', 'B:barrier': '154,72', 'B:cone': '140,106',
}
# sheets whose enclosed page-white components are white PAINT by default (the striped gang: every white stripe
# enclosed by black is paint); CLEAR_HOLES still opens the audited see-through gaps there.
KEEP_BY_DEFAULT = {'S'}
FLOOR_KEEP = {}


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rear = _load('mojo_rear_for_chase', 'ingest-mojo-rear.py')
clean, hero, ingest = rear.clean, rear.hero, rear.ingest
_pts, page, holes = clean._pts, hero.page, hero.holes


def sources():
    for sid, (file, cells) in SHEETS.items():
        path = DIR / file
        if not path.exists():
            raise SystemExit(f'missing owner sheet {path}')
        a = np.asarray(Image.open(path).convert('RGB'))
        rows, cols = rear.grid(a)
        for r, (y0, y1) in enumerate(rows):
            for c, (x0, x1) in enumerate(cols):
                cell = cells[r * 5 + c]
                if cell is X:
                    continue
                name, fam = cell
                yield sid, name, fam, a[y0 + rear.INSET:y1 - rear.INSET, x0 + rear.INSET:x1 - rear.INSET].copy()


def build(sid, name, fam, s, report):
    tag = f'{sid}:{name}'
    bg = page(s)
    ext, lab, found = holes(s, bg)
    alpha = np.where(ext, 0, 255).astype(np.uint8)
    clear = {lab[y, x] for x, y in _pts(CLEAR_HOLES.get(tag, '')) if lab[y, x]}
    keep = {lab[y, x] for x, y in _pts(KEEP_WHITE.get(tag, '')) if lab[y, x]}
    for x, y in _pts(CLEAR_HOLES.get(tag, '')) + _pts(KEEP_WHITE.get(tag, '')):
        if not lab[y, x]:
            report.append(f'{tag}: seed {x},{y} not on a page-colour hole (re-audit)')
    rows = np.nonzero((~ext).sum(1) >= 3)[0]
    art_base = rows[-1] if len(rows) else s.shape[0]
    for i, area, seed, comp in found:
        ys = np.nonzero(comp)[0]
        if sid in ('V', 'S', 'B') and i not in keep and ys.mean() > 0.74 * s.shape[0] and ys.max() > 0.78 * s.shape[0]:
            clear.add(i)          # the floor seen between the wheels/feet
        if i in clear:
            alpha[comp] = 0
        elif i not in keep and sid not in KEEP_BY_DEFAULT:
            report.append(f'{tag}: UNAUDITED hole {area}px seed {seed[0]},{seed[1]}')
    rgb, alpha2 = clean.decontaminate(s, alpha, bg)
    rgb3, alpha3 = hero.floor_shadow(s, rgb, alpha2, bg, 5, hero.SHADOW_SMOOTH)
    shadow = (alpha3 < alpha2) & (rgb3.max(2) == 0)
    alpha3[shadow] = 0
    rgb3[shadow] = rgb[shadow]
    if fam in ('vehicles', 'robbers'):
        alpha3 = rear.clear_floor(s, alpha3, 5, FLOOR_KEEP.get(tag, ()), 252, 22)
    lab2, n2 = ndimage.label(alpha3 > 0, structure=np.ones((3, 3)))
    if n2 > 1:
        sizes = ndimage.sum(np.ones_like(alpha3), lab2, range(1, n2 + 1))
        for i, sz in enumerate(sizes, 1):
            if sz < 12:
                alpha3[lab2 == i] = 0
    return np.dstack([rgb3, alpha3]).astype(np.uint8)


def sharpness(rgba):
    a = rgba[..., 3] > 200
    if a.sum() < 50:
        return 0.0
    lum = rgba[..., :3].astype(np.float32).mean(2)
    lap = ndimage.laplace(lum)
    inner = ndimage.binary_erosion(a, iterations=3)
    return float(lap[inner].var()) if inner.any() else 0.0


def measure(rgba):
    a = rgba[..., 3] >= 128
    rows = np.nonzero(a.sum(1) >= 2)[0]
    cols = np.nonzero(a.any(0))[0]
    top, base = int(rows[0]), int(rows[-1])
    h = base - top + 1
    band = a[max(top, base - max(6, int(h * 0.12))):base + 1]
    bc = np.nonzero(band.any(0))[0]
    return {'top': top, 'base': base, 'left': int(cols[0]), 'right': int(cols[-1]),
            'cx': (bc[0] + bc[-1]) / 2.0, 'bw': int(bc[-1] - bc[0] + 1), 'w': int(cols[-1] - cols[0] + 1), 'h': h}


def family_canvas(items):
    """items: [(name, rgba)] -> {name: Image on a shared canvas}, anchors, size (baselines on one row)."""
    ms = {n: measure(im) for n, im in items}
    left = max(ms[n]['cx'] for n, _ in items)
    right = max(im.shape[1] - ms[n]['cx'] for n, im in items)
    above = max(ms[n]['base'] + 1 for n, _ in items)
    W = int(np.ceil(max(left, right) * 2)) + PAD * 2
    H = int(above) + PAD * 2
    CX, BASE = W / 2.0, H - PAD - 1
    out, anchors = {}, {}
    for n, im in items:
        m = ms[n]
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.alpha_composite(Image.fromarray(im, 'RGBA'), (int(round(CX - m['cx'])), int(BASE - m['base'])))
        arr = np.asarray(canvas)
        mm = measure(arr)
        lights = rear.tail_lights(arr, {'top': mm['top'], 'h': mm['h'], 'cx': mm['cx'], 'bw': mm['bw']})
        out[n] = canvas
        anchors[n] = {'base': int(BASE), 'cx': round(mm['cx'], 1), 'bw': mm['bw'], 'top': mm['top'],
                      'left': mm['left'], 'right': mm['right'], 'lights': lights}
    return out, anchors, (W, H)


def collect(report):
    built = {}
    for sid, name, fam, s in sources():
        im = build(sid, name, fam, s, report)
        score = sharpness(im)
        prev = built.get(name)
        if prev is None or (name not in KEEP_BOTH and score > prev['score']):
            built[name] = {'fam': fam, 'im': im, 'score': score, 'sheet': sid}
    return built


def checker(tw, th):
    ck = Image.new('RGBA', (tw, th), (200, 200, 200, 255))
    cd = ImageDraw.Draw(ck)
    for yy in range(0, th, 12):
        for xx in range(0, tw, 12):
            if (xx // 12 + yy // 12) % 2:
                cd.rectangle([xx, yy, xx + 11, yy + 11], fill=(255, 255, 255, 255))
    return ck


def contact(items, anchors, path, mode, cols=6):
    tw, th = 230, 250
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * tw, rows * th), (24, 32, 52, 255))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(items):
        x, y = (i % cols) * tw, (i // cols) * th
        sheet.alpha_composite(checker(tw, th) if mode == 'checker' else Image.new('RGBA', (tw, th), (12, 14, 22, 255)), (x, y))
        s = min((tw - 10) / im.width, (th - 26) / im.height)
        t = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
        ox, oy = x + (tw - t.width) // 2, y + 4
        sheet.alpha_composite(t, (ox, oy))
        a = anchors[n]
        d.line([(x, oy + a['base'] * s), (x + tw, oy + a['base'] * s)], fill=(255, 40, 200))
        d.line([(ox + a['cx'] * s, oy), (ox + a['cx'] * s, oy + t.height)], fill=(40, 220, 255))
        for lx, ly in a.get('lights', []):
            d.ellipse([ox + lx * s - 4, oy + ly * s - 4, ox + lx * s + 4, oy + ly * s + 4], outline=(255, 255, 0))
        d.rectangle([x, y + th - 20, x + tw, y + th], fill=(0, 0, 0))
        d.text((x + 4, y + th - 16), n, fill=(255, 220, 120))
    sheet.convert('RGB').save(path)


def audit(out):
    out.mkdir(parents=True, exist_ok=True)
    per = {}
    for sid, name, fam, s in sources():
        bg = page(s)
        ext, lab, found = holes(s, bg)
        if not found:
            continue
        S = 2
        im = Image.fromarray(s).resize((s.shape[1] * S, s.shape[0] * S), Image.NEAREST).convert('RGBA')
        ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        for i, area, seed, comp in found:
            ys, xs = np.nonzero(comp)
            for yy, xx in zip(ys, xs):
                od.rectangle([xx * S, yy * S, xx * S + S - 1, yy * S + S - 1], fill=(0, 255, 0, 150))
        im.alpha_composite(ov)
        d = ImageDraw.Draw(im)
        for i, area, seed, comp in found:
            d.text((seed[0] * S + 2, seed[1] * S - 6), '%d,%d' % seed, fill=(255, 0, 0, 255))
            print(f'{sid}:{name}: hole {area}px seed {seed[0]},{seed[1]}')
        d.text((4, 4), f'{sid}:{name}', fill=(0, 0, 255, 255))
        per.setdefault(sid, []).append(im)
    for sid, ims in per.items():
        for k in range(0, len(ims), 6):
            grp = ims[k:k + 6]
            w, h = max(i.width for i in grp), max(i.height for i in grp)
            sheet = Image.new('RGB', (w * 3, h * 2), (255, 255, 255))
            for j, im in enumerate(grp):
                sheet.paste(im, ((j % 3) * w, (j // 3) * h), im)
            sheet.save(out / f'holes-{sid}-{k // 6}.png')


def anchors_js(fams):
    body = json.dumps({'denylist': DENYLIST, 'families': fams}, indent=1, sort_keys=True)
    return ('/* GENERATED by tools/ingest-mojo-chase-sheets.py - do not edit by hand. Owner chase sprites: each family\n'
            ' * shares one canvas (size) with every contact line on row `base` and the body centred on `cx` (sprite px).\n'
            ' * `denylist` = kid-safe exclusions (skulls, spikes, the fake ambulance): never referenced by the game. */\n'
            '(function (W) { W.MojoChaseAnchors = ' + body + ' })(typeof window !== \'undefined\' ? window : globalThis)\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--audit')
    ap.add_argument('--sheets')
    args = ap.parse_args()
    if args.audit:
        audit(Path(args.audit))
        return 0
    report = []
    built = collect(report)
    for line in report:
        print('FAIL', line)
    if report:
        raise SystemExit('unaudited or stale audit entries; nothing written')
    fams, exports, entries = {}, {}, {}
    for fam in ('items', 'props', 'robbers', 'vehicles'):
        names = sorted(n for n, b in built.items() if b['fam'] == fam)
        imgs, anchors, size = family_canvas([(n, built[n]['im']) for n in names])
        fams[fam] = {'size': {'w': size[0], 'h': size[1]}, 'sprites': anchors}
        for n in names:
            key = f'mojo-chase/{fam}/{n}'
            exports[LIB / 'mojo-chase' / fam / (n + '.webp')] = hero.encode(imgs[n])
            anchors[n]['sheet'] = built[n]['sheet']
            entries[key] = {'file': f'assets/db/lib/{key}.webp', 'cat': 'mojo-chase', 'tags': n.split('-') + ['mojo', 'chase', fam, 'cartoon'],
                            'source': SRCTAG, 'w': size[0], 'h': size[1], 'baseline': anchors[n]['base'], 'cx': anchors[n]['cx'], 'bw': anchors[n]['bw']}
        if args.sheets:
            out = Path(args.sheets)
            out.mkdir(parents=True, exist_ok=True)
            items = [(n, Image.open(io.BytesIO(exports[LIB / 'mojo-chase' / fam / (n + '.webp')])).convert('RGBA')) for n in names]
            for mode in ('checker', 'dark'):
                contact(items, anchors, out / f'chase-{fam}-{mode}.png', mode)
        print(fam, len(names), 'sprites on', size, 'baseline row', anchors[names[0]]['base'] if names else '-')
    print('total', len(entries), 'sprites', sum(len(v) for v in exports.values()), 'bytes')
    if args.dry:
        return 0
    from asset_transaction import publish
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, exports, ingest.index_helper())
    ANCHORS_JS.write_text(anchors_js(fams))
    print('published; index now has', total, 'assets; anchors ->', ANCHORS_JS.relative_to(ROOT))
    return 0


if __name__ == '__main__':
    sys.exit(main())
