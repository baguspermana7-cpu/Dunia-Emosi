#!/usr/bin/env python3
"""
Ingest Codex's chase deliveries (~/Documents/temporary/mojo asset, manifest.json + partial-manifest-*.json) into
assets/db/lib/mojo-chase/ as KEY-BASED derivatives; source PNGs are never modified.

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-codex.py [--dry] [--sheets DIR] [--source DIR]

  cfar/<biome>   FAR strips (CHASE_BG_FAR_<BIOME>_NN, highest NN wins): seam crossfade of 12% (tiled-twice preview),
                 per-file horizon fraction (manifest 'horizon' / 'horizon_base_estimated_ratio', else 0.65)
  cmid/<biome>   MID strips (RGBA): cropped to the alpha bounds, light fringe defringed, seam crossfade; baseline = 1.0
  csky/<name>    skyboxes (CHASE_SKY_*), 1600 px wide
  cprops/<slug>  props (page-white holes seen through a prop are cleared; ui/edu/vfx keep every enclosed white face) from CHASE_PROP_ROADSIDE_MASTER_5X5 + CHASE_PROP_INTEGRATION_5X5 (recorded regions)
  ui/<slug>      CHASE_UI_MASTER_5X5 ; edu/<slug> CHASE_EDU_OVERLAYS_5X5 + numbers ; vfx/<slug> CHASE_VFX_MASTER_5X5
  vfx/<seq>-<n>  8-pose strips (BROK, NET v2, DIZZY, BOOST, CONFETTI): every pose on ONE shared canvas per sequence,
                 common scale, registered on the region centre (boost: the right edge, the exhaust ring)
  card/<name>    CHASE_ENV_*_LANDSCAPE stage cards: central 70% x 80% crop, 800 px wide
Kid-safe: every item name is checked against the denylist (skull, crossbones, weapon, spike, dynamite, blood);
the safety-net DRAFT sheet is never ingested. Anchors -> games/data/mojo-codex-anchors.js.
"""
import argparse, importlib.util, io, json, os, re, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(os.environ.get('DUNIA_ROOT') or Path(__file__).resolve().parents[1])
sys.path.insert(0, str(ROOT / 'tools'))
LIB = ROOT / 'assets' / 'db' / 'lib'
ANCHORS_JS = ROOT / 'games' / 'data' / 'mojo-codex-anchors.js'
DENY = re.compile(r'skull|crossbone|weapon|gun|sword|spike|dynamite|blood|knife|bomb', re.I)
SEQS = {'CHASE_VFX_BROK_8X1': ('brok', 'center'), 'CHASE_VFX_SAFETY_NET_8X1_v2': ('net', 'center'), 'CHASE_VFX_SAFETY_NET_8X1': ('net', 'center'),
        'CHASE_VFX_DIZZY_STARS_8X1': ('dizzy', 'center'), 'CHASE_VFX_BOOST_FLAME_8X1': ('boost', 'right'), 'CHASE_VFX_CONFETTI_8X1': ('confetti', 'top')}
SHEET_FAMILY = {'CHASE_PROP_ROADSIDE_MASTER_5X5': 'cprops', 'CHASE_PROP_INTEGRATION_5X5': 'cprops', 'CHASE_UI_MASTER_5X5': 'ui',
                'CHASE_EDU_OVERLAYS_5X5': 'edu', 'CHASE_EDU_NUMBERS_OPERATORS_5X5': 'edu', 'CHASE_VFX_MASTER_5X5': 'vfx'}


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


rear = _load('mojo_rear_for_codex', 'ingest-mojo-rear.py')
clean, hero, ingest = rear.clean, rear.hero, rear.ingest


def slug(s):
    s = s.lower().replace('−', 'minus').replace('+', 'plus')
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-') or 'x'


def encode(im, q=88):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return buf.getvalue()


def seamless(a, frac=0.12):
    """RGB/RGBA array -> crossfaded array that tiles; returns (array, seam difference before, after)."""
    a = a.astype(np.float32)
    W = a.shape[1]
    N = int(W * frac)
    before = float(np.abs(a[:, -1, :3] - a[:, 0, :3]).mean())
    out = a[:, :W - N].copy()
    t = np.linspace(0, 1, N, dtype=np.float32)[None, :, None]
    out[:, :N] = a[:, W - N:] * (1 - t) + a[:, :N] * t
    after = float(np.abs(out[:, -1, :3] - out[:, 0, :3]).mean())
    return np.clip(out, 0, 255).astype(np.uint8), before, after


def defringe(rgba):
    """MID strips: a light 1-2 px halo where alpha meets transparency -> alpha lowered by its lightness."""
    a = rgba.copy()
    al = a[..., 3].astype(np.float32)
    edge = (al > 0) & ndimage.binary_dilation(al == 0, iterations=2)
    lum = a[..., :3].astype(np.float32).mean(2)
    light = edge & (lum > 200) & ((a[..., :3].max(2).astype(int) - a[..., :3].min(2)) < 40)
    al[light] = al[light] * np.clip((255 - lum[light]) / 55.0, 0, 1)
    a[..., 3] = al.astype(np.uint8)
    return a


def cut_region(s, clear_page_holes=True):
    """A region on white -> RGBA: edge flood, holes = page white seen through (uniform >= 250) cleared, else kept."""
    bg = np.array([255, 255, 255], np.float32) if hero.page(s).min() > 235 else hero.page(s)
    ext, lab, found = hero.holes(s, bg)
    alpha = np.where(ext, 0, 255).astype(np.uint8)
    for i, area, seed, comp in found:
        px = s[comp].astype(int)
        if clear_page_holes and area > 120 and px.min() >= 246:
            alpha[comp] = 0
    rgb, alpha2 = clean.decontaminate(s, alpha, bg)
    rgb3, alpha3 = hero.floor_shadow(s, rgb, alpha2, bg, 5, hero.SHADOW_SMOOTH)
    sh = (alpha3 < alpha2) & (rgb3.max(2) == 0)
    alpha3[sh] = 0
    rgb3[sh] = rgb[sh]
    return np.dstack([rgb3, alpha3]).astype(np.uint8)


def trim(rgba, pad=4):
    ys, xs = np.nonzero(rgba[..., 3] > 8)
    if not len(ys):
        return rgba
    return rgba[max(0, ys.min() - pad):ys.max() + pad + 1, max(0, xs.min() - pad):xs.max() + pad + 1]


def manifests(src):
    out = {}
    for f in ['manifest.json'] + sorted(p.name for p in src.glob('partial-manifest-*.json')):
        try:
            m = json.load(open(src / f))
        except Exception:
            continue
        for a in (m['assets'] if isinstance(m, dict) else m):
            out.setdefault(a['id'], {}).update(a)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--source', default=os.path.expanduser('~/Documents/temporary/mojo asset'))
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--sheets')
    args = ap.parse_args()
    src = Path(args.source)
    M = manifests(src)
    exports, entries, report = {}, {}, []
    data = {'far': {}, 'mid': {}, 'sky': {}, 'roadside': {}, 'card': {}, 'families': {}, 'seq': {}, 'source': str(src)}
    previews = []

    def put(key, im, extra=None, q=88):
        k = 'mojo-chase/' + key
        exports[LIB / 'mojo-chase' / (key + '.webp')] = encode(im, q)
        entries[k] = dict({'file': f'assets/db/lib/{k}.webp', 'cat': 'mojo-chase', 'source': 'codex ' + key, 'tags': re.split(r'[/-]', key) + ['mojo', 'chase', 'codex'],
                           'w': im.width, 'h': im.height}, **(extra or {}))

    # parallax: highest version per biome/kind
    best = {}
    for id_, a in M.items():
        m = re.match(r'CHASE_BG_(FAR|MID)_([A-Z_]+?)_(\d+)$', id_)
        if not m or a.get('status') not in ('generated', 'ready_source', None) or not (src / a['path']).exists():
            continue
        kind, biome, nn = m.group(1).lower(), m.group(2).lower().replace('_', '-'), int(m.group(3))
        if (kind, biome) not in best or nn > best[(kind, biome)][0]:
            best[(kind, biome)] = (nn, a)
    for (kind, biome), (nn, a) in sorted(best.items()):
        if DENY.search(a.get('qa', '') + a.get('id', '')):
            report.append(f'{a["id"]}: denylisted words in its QA note')
            continue
        im = Image.open(src / a['path'])
        if kind == 'far':
            arr, b0, b1 = seamless(np.asarray(im.convert('RGB')))
            hz = a.get('horizon') or a.get('horizon_base_estimated_ratio') or 0.65
            out = Image.fromarray(arr)
            put(f'cfar/{biome}', out, {'horizon': hz, 'seamless': True}, 84)
            data['far'][biome] = {'w': out.width, 'h': out.height, 'horizon': hz, 'seam': [round(b0, 1), round(b1, 1)], 'id': a['id']}
        else:
            rgba = np.asarray(im.convert('RGBA'))
            if rgba[..., 3].min() == 255:   # delivered without alpha: skip, never invent a matte for a strip
                report.append(f'{a["id"]}: MID without alpha, skipped')
                continue
            ys, xs = np.nonzero(rgba[..., 3] > 10)
            crop = defringe(rgba[ys.min():ys.max() + 1])
            arr, b0, b1 = seamless(crop)
            out = Image.fromarray(arr, 'RGBA')
            put(f'cmid/{biome}', out, {'baseline': 1.0, 'seamless': True}, 86)
            data['mid'][biome] = {'w': out.width, 'h': out.height, 'baseline': 1.0, 'seam': [round(b0, 1), round(b1, 1)], 'id': a['id']}
        previews.append((f'{kind}/{biome}', out))
    for id_, a in M.items():
        if id_.startswith('CHASE_SKY_') and (src / a['path']).exists():
            name = slug(id_[10:])
            im = Image.open(src / a['path']).convert('RGB')
            im = im.resize((1600, int(im.height * 1600 / im.width)), Image.LANCZOS)
            put(f'csky/{name}', im, {}, 82)
            data['sky'][name] = {'w': im.width, 'h': im.height}
        if id_.startswith('CHASE_BG_ROADSIDE_') and (src / a['path']).exists():
            name = slug(id_[18:])
            rgba = np.asarray(Image.open(src / a['path']).convert('RGBA'))
            ys, xs = np.nonzero(rgba[..., 3] > 10)
            out = Image.fromarray(defringe(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]), 'RGBA')
            put(f'croadside/{name}', out, {}, 86)
            data['roadside'][name] = {'w': out.width, 'h': out.height}
        m = re.match(r'CHASE_ENV_(.+)_LANDSCAPE$', id_)
        if m and (src / a['path']).exists():
            im = Image.open(src / a['path']).convert('RGB')
            W, H = im.size
            c = im.crop((int(W * 0.15), int(H * 0.1), int(W * 0.85), int(H * 0.9)))
            c = c.resize((800, int(c.height * 800 / c.width)), Image.LANCZOS)
            name = slug(m.group(1))
            put(f'card/{name}', c, {}, 84)
            data['card'][name] = {'w': c.width, 'h': c.height, 'id': id_}
    # sheets with recorded regions
    for id_, fam in SHEET_FAMILY.items():
        a = M.get(id_)
        if not a or not (src / a['path']).exists():
            continue
        s = np.asarray(Image.open(src / a['path']).convert('RGB'))
        sprites = {}
        for it in a.get('items', []):
            if it['name'].upper() == 'EMPTY':
                continue
            if DENY.search(it['name']):
                report.append(f'{id_}: item "{it["name"]}" denylisted, skipped')
                continue
            r = it['region']
            rgba = trim(cut_region(s[r['y']:r['y'] + r['height'], r['x']:r['x'] + r['width']].copy(), fam == 'cprops'))
            name = slug(it['name'])
            if fam == 'edu' and 'NUMBERS' in id_:
                name = 'num-' + name
            im = Image.fromarray(rgba, 'RGBA')
            put(f'{fam}/{name}', im, {}, 90)
            sprites[name] = {'w': im.width, 'h': im.height, 'base': im.height - 5, 'cx': im.width / 2.0}
            previews.append((f'{fam}/{name}', im))
        data['families'].setdefault(fam, {}).update(sprites)
    # 8-pose sequences: one canvas per sequence, common scale, registered anchor
    for id_, (name, anchor) in SEQS.items():
        a = M.get(id_)
        if not a or 'DRAFT' in a['path'] or not (src / a['path']).exists():
            continue
        if name in data['seq']:
            continue
        s = np.asarray(Image.open(src / a['path']).convert('RGB'))
        frames = []
        for it in a.get('items', []):
            r = it['region']
            frames.append(cut_region(s[r['y']:r['y'] + r['height'], r['x']:r['x'] + r['width']].copy()))
        if not frames:
            continue
        W = max(f.shape[1] for f in frames)
        H = max(f.shape[0] for f in frames)
        for i, f in enumerate(frames):
            can = Image.new('RGBA', (W, H), (0, 0, 0, 0))
            ox = W - f.shape[1] if anchor == 'right' else (W - f.shape[1]) // 2
            oy = 0 if anchor == 'top' else (H - f.shape[0]) // 2
            can.alpha_composite(Image.fromarray(f, 'RGBA'), (ox, oy))
            put(f'vfx/{name}-{i + 1}', can, {}, 88)
            previews.append((f'vfx/{name}-{i + 1}', can))
        data['seq'][name] = {'n': len(frames), 'w': W, 'h': H, 'anchor': anchor, 'id': id_}
    for line in report:
        print('NOTE', line)
    if args.sheets:
        out = Path(args.sheets)
        out.mkdir(parents=True, exist_ok=True)
        strips = [(k, im) for k, im in previews if k.startswith(('far/', 'mid/'))]
        rows = []
        for k, im in strips:
            two = Image.new('RGBA', (im.width * 2, im.height), (40, 60, 90, 255))
            two.alpha_composite(im.convert('RGBA'), (0, 0))
            two.alpha_composite(im.convert('RGBA'), (im.width, 0))
            two = two.resize((1600, int(two.height * 1600 / two.width)))
            d = ImageDraw.Draw(two)
            d.line([(800, 0), (800, two.height)], fill=(255, 0, 255))
            d.text((4, 4), k, fill=(255, 255, 0))
            rows.append(two)
        if rows:
            for n in range(0, len(rows), 10):
                grp = rows[n:n + 10]
                sh = Image.new('RGB', (1600, sum(r.height + 4 for r in grp)), (0, 0, 0))
                y = 0
                for r in grp:
                    sh.paste(r.convert('RGB'), (0, y))
                    y += r.height + 4
                sh.save(out / f'codex-strips-{n // 10}.png')
        sprites = [(k, im) for k, im in previews if not k.startswith(('far/', 'mid/'))]
        for mode, col in (('dark', (12, 14, 22, 255)), ('checker', None)):
            cols, tw, th = 8, 200, 210
            sh = Image.new('RGBA', (cols * tw, ((len(sprites) + cols - 1) // cols) * th), (24, 32, 52, 255))
            d = ImageDraw.Draw(sh)
            for i, (k, im) in enumerate(sprites):
                x, y = (i % cols) * tw, (i // cols) * th
                cell = Image.new('RGBA', (tw, th), col or (210, 210, 210, 255))
                if col is None:
                    cd = ImageDraw.Draw(cell)
                    for yy in range(0, th, 10):
                        for xx in range(0, tw, 10):
                            if (xx // 10 + yy // 10) % 2:
                                cd.rectangle([xx, yy, xx + 9, yy + 9], fill=(255, 255, 255, 255))
                sh.alpha_composite(cell, (x, y))
                t = im.copy()
                t.thumbnail((tw - 8, th - 22))
                sh.alpha_composite(t, (x + (tw - t.width) // 2, y + 2))
                d.text((x + 3, y + th - 16), k[:30], fill=(255, 220, 120))
            sh.convert('RGB').save(out / f'codex-sprites-{mode}.png')
    print('built', len(entries), 'assets', sum(len(v) for v in exports.values()), 'bytes')
    print('far seams', {k: v['seam'] for k, v in data['far'].items()})
    if args.dry:
        return 0
    from asset_transaction import publish
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, exports, ingest.index_helper())
    body = json.dumps(data, indent=1, sort_keys=True)
    ANCHORS_JS.write_text('/* GENERATED by tools/ingest-mojo-codex.py - do not edit by hand. Codex chase assets: FAR horizon fractions,\n'
                          ' * MID baselines (1.0 = bottom of the alpha-cropped strip), skies, cards, sprite families and 8-pose sequences. */\n'
                          '(function (W) { W.MojoCodexAnchors = ' + body + ' })(typeof window !== \'undefined\' ? window : globalThis)\n')
    print('published; index now has', total, 'assets')
    return 0


if __name__ == '__main__':
    sys.exit(main())
