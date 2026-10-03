#!/usr/bin/env python3
"""
Cut the owner's two TRACK sheets for the 3-lane chase (2026-10-03) into assets/db/lib/mojo-chase/:

    track-kit-sheet.png            FAR / MID / ROADSIDE strips, roadside props (left + right), signs, finish arch
    track-backgrounds-sheet-2.png  10 biome scenes (stage cards), 6 FAR strips, side props, 6 skybox swatches

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-track-sheets.py             # write + merge both indexes
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-track-sheets.py --dry       # build + report only
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-track-sheets.py --audit DIR # hole composites
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-track-sheets.py --sheets DIR

Outputs:
  biome/<id>   stage-card art: the biome scene with its label pill cut off (top 26 px), Lanczos 2x + mild unsharp
  far/<id>     FAR parallax strips, HORIZONTALLY SEAMLESS: the last 12% crossfades into the first columns, so
               tile k+1 continues tile k with no visible seam (checked: the seam column difference is reported);
               sheet-1 strips 2x, sheet-2 strips 4x (Lanczos + unsharp; no ML upscaler, so no black frames)
  props/<id>   roadside props, signs/<id> signs + gantry + finish arch: cut from a measured box with the
               rear-sheet pipeline (edge flood, audited holes, halo decontamination, floor shadow removed), one
               shared canvas per family with a common bottom baseline (games/data/mojo-track-anchors.js)
  sky palettes sampled from the 6 skybox swatches (top / middle / horizon colours) -> mojo-track-anchors.js
The spike obstacles on both sheets are never cut (kid-safe rule); the sheet-1 obstacle row duplicates the larger
items already cut by tools/ingest-mojo-chase-sheets.py, so it is skipped. The tiny overlay swatches (88 px) are
references only: the chase draws those effects procedurally.
"""
import argparse, importlib.util, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
DIR = Path(os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops/chase'))
S1, S2 = DIR / 'track-kit-sheet.png', DIR / 'track-backgrounds-sheet-2.png'
LIB = ROOT / 'assets' / 'db' / 'lib'
ANCHORS_JS = ROOT / 'games' / 'data' / 'mojo-track-anchors.js'
SRCTAG = 'owner mojo chase track sheets 2026-10-03'
PAD = 6

# opaque scene rectangles (x0, y0, x1, y1) in sheet px
BIOMES = {   # sheet 2, label pill removed by cropping PILL px off the top
    'town': (0, 81, 265, 244), 'coastal': (270, 81, 527, 244), 'forest': (533, 81, 786, 244), 'desert': (791, 81, 1045, 244),
    'snow': (1052, 81, 1312, 244), 'bridge': (0, 249, 265, 422), 'tunnel': (270, 249, 527, 422), 'construction': (533, 249, 786, 422),
    'farm': (791, 249, 1045, 422), 'city-night': (1052, 249, 1312, 422)}
PILL = 26
FAR2 = {'castle': (11, 885, 221, 973), 'lighthouse': (227, 885, 437, 973), 'forest-lake': (442, 885, 654, 973),
        'mesas': (661, 885, 871, 973), 'aurora': (877, 885, 1087, 973), 'night-city': (1093, 885, 1302, 973)}
FAR1 = {'swoppiton': (0, 30, 1312, 166), 'swoppiton-mid': (0, 197, 1312, 287), 'swoppiton-roadside': (0, 318, 1312, 392)}
# the owner's 25-biome sheet (track-biomes-25-sheet.png): measured cell boxes; the label pill (top 34 px) is cut off
# and the card is centre-cropped to 4:3, Lanczos 2x + mild unsharp -> biome25/<nn>-<name>
S25 = DIR / 'track-biomes-25-sheet.png'
B25_COLS = [(0, 264), (266, 529), (533, 777), (782, 1045), (1049, 1312)]
B25_ROWS = [(82, 310), (311, 533), (536, 744), (746, 926), (929, 1140)]
B25 = ('town coastal forest desert snow bridge tunnel construction farm city-night jungle volcano night-highway autumn cherry-blossom '
       'rain beach-resort canyon-railway wind-farm space-base suburb harbor-port stadium ruins-temple candy-land').split()
SKY = ['clear', 'sunset', 'night', 'cloudy', 'rain', 'snow']
SKY_ROW = (738, 1110, 1306, 1162)     # six swatches side by side

# cut sprites: family -> name -> (sheet, box). Boxes include a white margin; only the largest art group stays.
CUTS = {
    'trackprops': {
        'guardrail': (1, (6, 842, 131, 930)), 'jersey': (1, (130, 858, 230, 931)), 'hedge': (1, (231, 849, 347, 937)),
        'tree-round': (1, (347, 821, 432, 940)), 'pine': (1, (431, 821, 502, 940)), 'rocks': (1, (504, 847, 584, 934)),
        'tree-small': (1, (582, 826, 650, 930)), 'jersey-2': (1, (662, 858, 765, 920)), 'guardrail-2': (1, (763, 849, 870, 929)),
        'fence': (1, (873, 850, 962, 928)), 'cactus-2': (1, (968, 823, 1024, 929)), 'boulders': (1, (1022, 837, 1127, 934)),
        'palm': (1, (1114, 821, 1218, 934)), 'snow-pine': (1, (1219, 823, 1305, 930)),
        'stone-wall': (2, (270, 1020, 318, 1077)), 'planter': (2, (313, 1025, 382, 1082)), 'windmill': (2, (940, 996, 982, 1078)),
        'hay': (2, (1188, 1010, 1247, 1078)), 'rail-wood': (2, (843, 1015, 932, 1075)), 'barrel-oil': (2, (1155, 1018, 1188, 1072)),
        'banner-blue': (2, (677, 997, 716, 1080)), 'banner-red': (2, (727, 997, 761, 1078))},
    'signs': {
        'chevron-yellow': (1, (16, 978, 82, 1061)), 'chevron-red': (1, (92, 977, 195, 1061)), 'swoppiton': (1, (212, 963, 346, 1061)),
        'flag-checker': (1, (345, 962, 437, 1061)), 'banner-gear': (1, (443, 962, 506, 1061)), 'banners': (1, (562, 962, 648, 1061)),
        'billboard': (1, (658, 963, 779, 1061)), 'gantry': (1, (785, 965, 1050, 1061)), 'sign-60': (1, (1068, 971, 1137, 1043)),
        'warning': (1, (1139, 973, 1208, 1042)), 'caution': (1, (1212, 967, 1298, 1061)), 'finish': (1, (957, 1096, 1123, 1189)),
        'chevron-board': (2, (70, 1018, 128, 1070))},
}
# audited at 3x (2026-10-03): CLEAR = page seen through rails, fences, the gantry truss, banner gaps, the finish
# arch opening; KEEP = snow on the pine, the white arrow on the Swoppiton sign
CLEAR_HOLES = {
    'trackprops:guardrail': '63,54', 'trackprops:guardrail-2': '45,57', 'trackprops:fence': '34,37 55,60',
    'trackprops:rail-wood': '32,45', 'signs:banner-gear': '45,41', 'signs:banners': '57,42',
    'signs:gantry': '29,27 35,20 228,20 216,28 236,28 103,28 166,28', 'signs:finish': '125,52', 'signs:chevron-board': '36,45',
}
KEEP_WHITE = {'trackprops:snow-pine': '57,28 55,74', 'signs:swoppiton': '114,30'}


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rear = _load('mojo_rear_for_track', 'ingest-mojo-rear.py')
clean, hero, ingest = rear.clean, rear.hero, rear.ingest
_pts, page, holes = clean._pts, hero.page, hero.holes


def sheet(n):
    return np.asarray(Image.open(S1 if n == 1 else S2).convert('RGB'))


def upscale(im, k):
    big = im.resize((im.width * k, im.height * k), Image.LANCZOS)
    return big.filter(ImageFilter.UnsharpMask(radius=2, percent=55, threshold=2))


def seamless(im, frac=0.12):
    """Crossfade the strip's last `frac` into its first columns: the result tiles with no seam."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    W = a.shape[1]
    N = int(W * frac)
    out = a[:, :W - N].copy()
    t = np.linspace(0, 1, N, dtype=np.float32)[None, :, None]
    out[:, :N] = a[:, W - N:] * (1 - t) + a[:, :N] * t
    seam = float(np.abs(out[:, -1] - out[:, 0]).mean())     # last column next to the first column of the next tile
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)), seam


def palette(a):
    x0, y0, x1, y1 = SKY_ROW
    w = (x1 - x0) / 6.0
    out = {}
    for i, name in enumerate(SKY):
        sx0, sx1 = int(x0 + i * w + 6), int(x0 + (i + 1) * w - 6)
        sw = a[y0 + 3:y1 - 3, sx0:sx1].astype(np.float32)
        def hexc(rows):
            c = np.median(rows.reshape(-1, 3), axis=0)
            return '#%02x%02x%02x' % tuple(int(v) for v in c)
        h = sw.shape[0]
        out[name] = [hexc(sw[:max(2, h // 5)]), hexc(sw[h * 2 // 5:h * 3 // 5]), hexc(sw[-max(2, h // 5):])]
    return out


def cut(fam, name, n, box, report):
    a = sheet(n)
    x0, y0, x1, y1 = box
    s = a[y0:y1, x0:x1].copy()
    tag = f'{fam}:{name}'
    bg = np.array([250, 250, 250], np.float32) if page(s).min() < 235 else page(s)
    ext, lab, found = holes(s, bg)
    alpha = np.where(ext, 0, 255).astype(np.uint8)
    clear = {lab[y, x] for x, y in _pts(CLEAR_HOLES.get(tag, '')) if lab[y, x]}
    keep = {lab[y, x] for x, y in _pts(KEEP_WHITE.get(tag, '')) if lab[y, x]}
    for i, area, seed, comp in found:
        if i in clear:
            alpha[comp] = 0
        elif i not in keep:
            report.append(f'{tag}: UNAUDITED hole {area}px seed {seed[0]},{seed[1]}')
    rgb, alpha2 = clean.decontaminate(s, alpha, bg)
    rgb3, alpha3 = hero.floor_shadow(s, rgb, alpha2, bg, 5, hero.SHADOW_SMOOTH)
    sh = (alpha3 < alpha2) & (rgb3.max(2) == 0)
    alpha3[sh] = 0
    rgb3[sh] = rgb[sh]
    alpha3 = rear.clear_floor(s, alpha3, 5, (), 252, 22)
    # keep the main art: components >= 8% of the largest (a neighbour's edge in the margin is dropped)
    lab2, n2 = ndimage.label(alpha3 > 0, structure=np.ones((3, 3)))
    if n2 > 1:
        sizes = ndimage.sum(np.ones_like(alpha3), lab2, range(1, n2 + 1))
        big = sizes.max()
        for i, sz in enumerate(sizes, 1):
            if sz < max(12, big * 0.08):
                alpha3[lab2 == i] = 0
    return np.dstack([rgb3, alpha3]).astype(np.uint8)


def audit(out):
    out.mkdir(parents=True, exist_ok=True)
    ims = []
    for fam, items in CUTS.items():
        for name, (n, box) in items.items():
            x0, y0, x1, y1 = box
            s = sheet(n)[y0:y1, x0:x1].copy()
            bg = np.array([250, 250, 250], np.float32) if page(s).min() < 235 else page(s)
            ext, lab, found = holes(s, bg)
            S = 3
            im = Image.fromarray(s).resize((s.shape[1] * S, s.shape[0] * S), Image.NEAREST).convert('RGBA')
            ov = Image.new('RGBA', im.size, (0, 0, 0, 0))
            od = ImageDraw.Draw(ov)
            ex = np.zeros(s.shape[:2], bool)
            for i, area, seed, comp in found:
                ys, xs = np.nonzero(comp)
                for yy, xx in zip(ys, xs):
                    od.rectangle([xx * S, yy * S, xx * S + S - 1, yy * S + S - 1], fill=(0, 255, 0, 150))
                print(f'{fam}:{name}: hole {area}px seed {seed[0]},{seed[1]}')
            ys, xs = np.nonzero(ext)
            for yy, xx in zip(ys[::1], xs[::1]):
                od.point((xx * S + 1, yy * S + 1), fill=(255, 0, 255, 255))
            im.alpha_composite(ov)
            d = ImageDraw.Draw(im)
            for i, area, seed, comp in found:
                d.text((seed[0] * S + 2, seed[1] * S - 6), '%d,%d' % seed, fill=(255, 0, 0, 255))
            d.text((2, 2), f'{fam}:{name}', fill=(0, 0, 255, 255))
            ims.append(im)
    for k in range(0, len(ims), 8):
        grp = ims[k:k + 8]
        w, h = max(i.width for i in grp), max(i.height for i in grp)
        sh = Image.new('RGB', (w * 4, h * 2), (255, 255, 255))
        for j, im in enumerate(grp):
            sh.paste(im, ((j % 4) * w, (j // 4) * h), im)
        sh.save(out / f'track-holes-{k // 8}.png')


def anchors_js(data):
    body = json.dumps(data, indent=1, sort_keys=True)
    return ('/* GENERATED by tools/ingest-mojo-track-sheets.py - do not edit by hand. Owner track kit for the chase:\n'
            ' * far strips (seamless widths), biome cards, prop/sign families (shared canvas, contact line on `base`),\n'
            ' * and the six skybox palettes [top, middle, horizon]. */\n'
            '(function (W) { W.MojoTrackAnchors = ' + body + ' })(typeof window !== \'undefined\' ? window : globalThis)\n')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--audit')
    ap.add_argument('--sheets')
    args = ap.parse_args()
    if args.audit:
        audit(Path(args.audit))
        return 0
    report, exports, entries = [], {}, {}
    data = {'far': {}, 'biome': {}, 'families': {}, 'sky': palette(sheet(2))}
    a1, a2 = Image.open(S1).convert('RGB'), Image.open(S2).convert('RGB')

    def put(key, im, extra):
        k = f'mojo-chase/{key}'
        exports[LIB / 'mojo-chase' / (key + '.webp')] = encode(im, 85 if key.startswith('far/') else 88)
        entries[k] = dict({'file': f'assets/db/lib/{k}.webp', 'cat': 'mojo-chase', 'source': SRCTAG,
                           'tags': key.split('/')[1].split('-') + ['mojo', 'chase', key.split('/')[0]], 'w': im.width, 'h': im.height}, **extra)

    for name, box in BIOMES.items():
        x0, y0, x1, y1 = box
        im = upscale(a2.crop((x0 + 2, y0 + PILL, x1 - 2, y1 - 2)), 2)
        put(f'biome/{name}', im, {})
        data['biome'][name] = {'w': im.width, 'h': im.height}
    if S25.exists():
        a25 = Image.open(S25).convert('RGB')
        for i, name in enumerate(B25):
            (x0, x1), (y0, y1) = B25_COLS[i % 5], B25_ROWS[i // 5]
            y0 += 34
            h = y1 - 2 - y0
            w = min(x1 - x0 - 4, int(h * 4 / 3))
            cx = (x0 + x1) // 2
            im = upscale(a25.crop((cx - w // 2, y0, cx + w // 2, y1 - 2)), 2)
            key = 'biome25/%02d-%s' % (i + 1, name)
            put(key, im, {})
            data.setdefault('biome25', {})[name] = {'key': key, 'w': im.width, 'h': im.height}
    for src, table, k in ((a1, FAR1, 2), (a2, FAR2, 4)):
        for name, box in table.items():
            x0, y0, x1, y1 = box
            im, seam = seamless(upscale(src.crop((x0 + 2, y0 + 2, x1 - 2, y1 - 2)), k))
            if seam > 40:
                report.append(f'far/{name}: seam difference {seam:.1f} too high')
            put(f'far/{name}', im, {'seamless': True})
            data['far'][name] = {'w': im.width, 'h': im.height, 'seam': round(seam, 1)}
    for fam, items in CUTS.items():
        built = [(name, cut(fam, name, n, box, report)) for name, (n, box) in items.items()]
        if report:
            continue
        cans = _load('mojo_chase_sheets_for_track', 'ingest-mojo-chase-sheets.py')
        # small sheet-2 props are 2x upscaled before sharing the canvas so every prop has similar pixel density
        scaled = []
        for name, im in built:
            p = Image.fromarray(im, 'RGBA')
            if items[name][0] == 2:
                p = p.resize((p.width * 2, p.height * 2), Image.LANCZOS)
            elif p.height < 140:
                p = p.resize((int(p.width * 1.6), int(p.height * 1.6)), Image.LANCZOS)
            scaled.append((name, np.asarray(p)))
        imgs, anchors, size = cans.family_canvas(scaled)
        data['families'][fam] = {'size': {'w': size[0], 'h': size[1]}, 'sprites': anchors}
        folder = 'props' if fam == 'trackprops' else 'signs'
        for name in imgs:
            put(f'{folder}/{name}', imgs[name], {'baseline': anchors[name]['base'], 'cx': anchors[name]['cx'], 'bw': anchors[name]['bw']})
        if args.sheets:
            out = Path(args.sheets)
            out.mkdir(parents=True, exist_ok=True)
            for mode in ('checker', 'dark'):
                cans.contact([(n, imgs[n]) for n in imgs], anchors, out / f'track-{fam}-{mode}.png', mode)
    for line in report:
        print('FAIL', line)
    if report:
        raise SystemExit('unaudited holes or seams; nothing written')
    if args.sheets:
        out = Path(args.sheets)
        strips = [Image.open(io.BytesIO(exports[LIB / 'mojo-chase' / f'far/{n}.webp'])) for n in list(FAR1) + list(FAR2)]
        W = 1600
        rows = []
        for im in strips:   # each strip tiled twice side by side, scaled to W: the seam sits in the middle
            two = Image.new('RGB', (im.width * 2, im.height))
            two.paste(im, (0, 0))
            two.paste(im, (im.width, 0))
            rows.append(two.resize((W, int(two.height * W / two.width))))
        H = sum(r.height for r in rows) + 4 * len(rows)
        sh = Image.new('RGB', (W, H), (0, 0, 0))
        y = 0
        for r in rows:
            sh.paste(r, (0, y))
            y += r.height + 4
        sh.save(out / 'track-far-tiled.png')
        cards = [Image.open(io.BytesIO(exports[LIB / 'mojo-chase' / f'biome/{n}.webp'])) for n in BIOMES]
        cw, ch = cards[0].width // 2, cards[0].height // 2
        sh = Image.new('RGB', (cw * 5, ch * 2))
        for i, c in enumerate(cards):
            sh.paste(c.resize((cw, ch)), ((i % 5) * cw, (i // 5) * ch))
        sh.save(out / 'track-biomes.png')
    print('built', len(entries), 'assets', sum(len(v) for v in exports.values()), 'bytes; seams', {k: v['seam'] for k, v in data['far'].items()})
    if args.dry:
        return 0
    from asset_transaction import publish
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, exports, ingest.index_helper())
    ANCHORS_JS.write_text(anchors_js(data))
    print('published; index now has', total, 'assets; anchors ->', ANCHORS_JS.relative_to(ROOT))
    return 0


def encode(im, q):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return buf.getvalue()


if __name__ == '__main__':
    sys.exit(main())
