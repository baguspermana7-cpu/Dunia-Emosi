#!/usr/bin/env python3
"""
Replace the badly cropped Mojo character / vehicle / item sprites with the owner's own BACKGROUND-REMOVED sheets
(~/Documents/temporary/mojo asset/asset kark mojo/*.png, 2026-10-10) and add the six NEW Mojo forms of
`baru_Toy Construction Vehicle View Grid.png` (excavator, grapple, shuttle, jet, police, skidder x side/diag/rear).

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-kark.py --dry        # match + build + report + contact sheets, write nothing
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-kark.py              # write sprites, both indexes, anchors, review list
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-kark.py --sheets DIR # before/after contact sheet per directory

Method
  * SPRITES: tools/kark_extract.py cuts every sprite by its own alpha (no colour keying). Text pills that stayed glued
    to a sprite (NEON, WHEELS, 'DIAGONAL VIEW') are painted out by TIDY below.
  * MATCH: every existing asset of a directory is compared with the candidate sprites of that directory's sheets by
    appearance (48 px RGBA-on-grey thumbnail of the ART bbox - the old white ring is peeled off first -, alpha mask
    and aspect ratio; mirrored candidates for characters/heroes whose facing is not text-bearing). Only confident
    matches (score <= MAX_SCORE[group]) are replaced; everything else keeps its old file. kark-match-review.tsv
    lists (key, sheet, n, score, margin, flip, scale) for EVERY asset, replaced or kept, plus the reason.
  * SAME SIZE CLASS: the new art is fitted INSIDE the old art's bbox (ring excluded), centred on the old contact
    point (band centre) and bottom-aligned on the old contact row, on the OLD canvas (w x h), so the shared
    baselines of the rear / chase families and the on-screen size do not move. The same white sticker ring
    (tools/mojo_outline.py, thickness = the old index `outline`) is applied once, in memory.
  * TURNAROUND (mojo-turn): the 3 old forms + 6 new ones, sheets 01 and 13: one drawing scale per sheet (rear wheel
    width = the median mojo-rear wheel width), the same ring, side / diag share one baseline canvas per view,
    rear on the 297x254 mojo-rear canvas (anchors merged into games/data/mojo-rear-anchors.js "extra").
  * KID SAFETY: skull / spike / weapon sprites are blacklisted (BANNED); a key whose best match is one of them
    keeps the old asset.
"""
import argparse, importlib.util, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
LIB = ROOT / 'assets' / 'db' / 'lib'
INDEX = ROOT / 'assets' / 'db' / 'index.json'
REAR_JS = ROOT / 'games' / 'data' / 'mojo-rear-anchors.js'
CHASE_JS = ROOT / 'games' / 'data' / 'mojo-chase-anchors.js'
REVIEW = ROOT / 'tools' / 'kark-match-review.tsv'
SRCTAG = 'owner bg-removed sheets 2026-10-10'
QUALITY = 92
MAX_UP = 2.0          # a replacement needing more than this upscale would be blurrier than the old crop: keep old


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


extract = _load('kark_extract_for_ingest', 'kark_extract.py')
outline = _load('mojo_outline_for_kark', 'mojo_outline.py')
rear = _load('mojo_rear_for_kark', 'ingest-mojo-rear.py')
turn = _load('mojo_turn_for_kark', 'ingest-mojo-turnaround.py')

# (sheet, n) sprites that must never reach the game: skull / crossbones, spikes, weapons, wanted poster.
BANNED = {
    (5, 3): 'mohawk robber, skull jacket',
    (5, 16): 'spike strip',
    (7, 4): 'PIRATE skull', (7, 7): 'RAIDER spikes+skull', (7, 14): 'FAKE ambulance', (7, 21): 'FIRE skull', (7, 24): 'OUTLAW wanted',
    (11, 22): 'striped car with spikes',
    (4, 74): 'skull', (10, 7): 'skull sign',
}

# directory group -> (sheets searched, may mirror, max score, kind)
GROUPS = {
    'mojo-char': dict(sheets=[0, 4, 6], flip=True, thr=0.30),
    'mojo-hero': dict(sheets=[8], flip=True, thr=0.34),
    'mojo-rear': dict(sheets=[3], flip=False, thr=0.34),
    'mojo-top': dict(sheets=[0, 8, 1, 13], flip=False, thr=0.0),       # no counterpart in the sheets: see report
    'mojo-chase/vehicles': dict(sheets=[7, 11], flip=False, thr=0.34),
    'mojo-chase/robbers': dict(sheets=[5], flip=False, thr=0.34),
    'mojo-chase/items': dict(sheets=[5, 10, 4, 6, 0], flip=True, thr=0.30),
    'mojo-chase/props': dict(sheets=[5, 2, 10, 12, 9], flip=False, thr=0.22, margin=0.05),
}
# identity checked by eye: the generic matcher picks a look-alike (a plain crate for the question block, a 3-stack for
# the 2-stack) or the old art carries something the new one lacks (zzz, question mark, hearts): keep the old file.
FORCE_KEEP = {
    'mojo-chase/items/mystery': 'new sheets have no question block (best match is a plain crate)',
    'mojo-chase/items/tyres-2': 'new sheets only have the 3-stack',
    'mojo-char/oona-sleep': 'old art carries the zzz; new sleeping dog has none',
    'mojo-char/float-curious': 'old art carries the question mark', 'mojo-char/float-love': 'old art carries the hearts',
}
# identity checked by eye where the score is poor only because the old art carries sparkles / a different crop
FORCE_MATCH = {'mojo-chase/items/rocket': (5, 8), 'mojo-chase/items/stopwatch': (6, 56)}
# keys that are matched by the generic matcher only when the best score is this good (identity needs care)
STRICT_MARGIN = 0.0

def deep_blue(a):
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    return (b > 170) & (r < 70) & (g > 60) & (g < 150)


def light_blue(a):
    r, g, b = [a[..., i].astype(int) for i in range(3)]
    return (b > 235) & (g > 195) & (r > 150) & (r < 242) & (b - r > 12)


def strip_pill(region, pred):
    """Erase a name pill glued to a sprite: the bbox of the biggest wide pill-coloured blob inside `region`
    (x0, y0, x1, y1 as fractions of the sprite), grown 2 px (covers its text and soft rim)."""
    def f(a):
        h, w = a.shape[:2]
        y0, y1, x0, x1 = int(region[1] * h), int(region[3] * h), int(region[0] * w), int(region[2] * w)
        m = np.zeros((h, w), bool)
        m[y0:y1, x0:x1] = pred(a)[y0:y1, x0:x1] & (a[y0:y1, x0:x1, 3] > 128)
        lab, n = ndimage.label(ndimage.binary_closing(m, iterations=2))
        best = None
        for i, sl in enumerate(ndimage.find_objects(lab), 1):
            bw, bh = sl[1].stop - sl[1].start, sl[0].stop - sl[0].start
            if bw > 2 * bh and (best is None or bw * bh > best[0]):
                best = (bw * bh, sl)
        if best is None:
            raise SystemExit('pill not found - TIDY entry is stale')
        sl = best[1]
        out = a.copy()
        out[max(0, sl[0].start - 2):sl[0].stop + 2, max(0, sl[1].start - 2):sl[1].stop + 2, 3] = 0
        return out
    return f


# Pills glued to a sprite, (sheet, n) -> tidy function (then the largest blob is kept)
TIDY = {
    (4, 1): strip_pill((0, 0.80, 1, 1), deep_blue),            # NEON
    (4, 45): strip_pill((0, 0.60, 1, 1), deep_blue),           # WHEELS
    (13, 16): strip_pill((0.4, 0, 1, 0.25), light_blue),       # 'DIAGONAL VIEW' on the skidder diagonal
}


# --------------------------------------------------------------------------------------------------------- sprites
def keep_largest(a):
    lab, n = ndimage.label(a[..., 3] > 128)
    if n <= 1:
        return a
    sizes = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1))
    big = {i + 1 for i, s in enumerate(sizes) if s >= 0.04 * sizes.max()}
    keep = np.isin(lab, list(big))
    keep = ndimage.binary_dilation(keep, iterations=2) & (a[..., 3] > 0)
    out = a.copy()
    out[~keep] = 0
    return out


def tight(a):
    ys, xs = np.nonzero(a[..., 3] > 0)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()


def load_sprites():
    """{(sheet, n): RGBA uint8, tight}"""
    out = {}
    for si, p in enumerate(extract.sheets()):
        for n, (box, area, crop) in enumerate(extract.extract(p)):
            f = TIDY.get((si, n))
            if f:
                crop = tight(keep_largest(f(crop)))
            out[(si, n)] = crop
    return out


# ----------------------------------------------------------------------------------------------------------- matching
TH = 48


def art_of_old(rgba, t):
    """Peel the white sticker ring (white pixels within t+1.5 px of the exterior) off an old asset."""
    a = rgba[..., 3] >= 128
    ext = ~ndimage.binary_fill_holes(a)
    lab, _ = ndimage.label(~a)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    ext = np.isin(lab, border[border > 0])
    d = ndimage.distance_transform_edt(~ext)
    white = rgba[..., :3].min(2) > 232
    out = rgba.copy()
    out[(d <= t + 1.5) & white] = 0
    if not (out[..., 3] >= 128).any():
        return rgba
    return tight(np.where((out[..., 3:4] >= 128), out, 0).astype(np.uint8))


def thumb(a):
    m = (a[..., 3] >= 128)
    rgb = np.where(m[..., None], a[..., :3], 128).astype(np.uint8)
    im = Image.fromarray(rgb).resize((TH, TH), Image.LANCZOS)
    mk = Image.fromarray((m * 255).astype(np.uint8)).resize((TH, TH), Image.LANCZOS)
    return np.asarray(im, np.float32) / 255.0, np.asarray(mk, np.float32) / 255.0


def score(old_t, new_t, ar_o, ar_n):
    (ro, mo), (rn, mn) = old_t, new_t
    union = np.maximum(mo, mn)[..., None]
    rgb = float((np.abs(ro - rn) * union).sum() / (union.sum() * 3 + 1e-6))
    msk = float(np.abs(mo - mn).mean())
    return rgb + 0.8 * msk + 0.35 * abs(np.log(ar_o / ar_n))


def bbox_a(a):
    m = a[..., 3] >= 128
    ys, xs = np.nonzero(m)
    return ys.min(), ys.max() + 1, xs.min(), xs.max() + 1


_TC = {}


def cand_thumb(key, a, fl):
    k = (key, fl)
    if k not in _TC:
        b = a[:, ::-1] if fl else a
        _TC[k] = (thumb(b), b.shape[1] / b.shape[0])
    return _TC[k]


def best_matches(old_art, cands, flip):
    ar_o = old_art.shape[1] / old_art.shape[0]
    to = thumb(old_art)
    res = []
    for key, a in cands.items():
        for fl in ((False, True) if flip else (False,)):
            tn, ar_n = cand_thumb(key, a, fl)
            res.append((score(to, tn, ar_o, ar_n), key, fl))
    res.sort(key=lambda r: r[0])
    return res


# ------------------------------------------------------------------------------------------------ building a sprite
def steep(a):
    out = a.copy()
    al = out[..., 3].astype(np.float32)
    out[..., 3] = np.clip((al - 64) * 255.0 / 128.0, 0, 255).astype(np.uint8)
    out[out[..., 3] == 0] = 0
    return out


def resize(a, k):
    im = Image.fromarray(a, 'RGBA')
    return steep(np.asarray(im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)).copy())


def ringed(a, t):
    if not t:
        return a
    return outline.crop_tight(*outline.outline(a, t))[0]


def encode(arr):
    buf = io.BytesIO()
    Image.fromarray(arr, 'RGBA').save(buf, 'WEBP', quality=QUALITY, method=6)
    return buf.getvalue()


def place_on_old(new, old, t):
    """Fit `new` (tight RGBA art, no ring) inside the old art bbox; ring it; put it on the old canvas on the old
    contact point. Returns (canvas array, scale, up) or None when it needs > MAX_UP upscale."""
    oa = art_of_old(old, t)
    oh, ow = oa.shape[:2]
    nh, nw = new.shape[:2]
    k = min(ow / nw, oh / nh)
    if k > MAX_UP:
        return None
    sp = resize(new, k)
    sp = tight(sp)
    rg = ringed(sp, t)
    Ho, Wo = old.shape[:2]
    ys, xs = np.nonzero(old[..., 3] >= 128)
    ob, ocx = ys.max(), rear.measure(old)['cx'] if True else 0
    rm = rear.measure(rg) if rg.shape[0] > 3 else None
    ry, rx = np.nonzero(rg[..., 3] >= 128)
    nb, ncx = ry.max(), rm['cx']
    if rg.shape[0] > Ho or rg.shape[1] > Wo:                           # ring pushed it past the old canvas: shrink 1-2 %
        sp = tight(resize(new, k * min(Ho / rg.shape[0], Wo / rg.shape[1]) * 0.99))
        rg = ringed(sp, t)
        ry, rx = np.nonzero(rg[..., 3] >= 128)
        nb, ncx = ry.max(), rear.measure(rg)['cx']
    dx = int(round(ocx - ncx))
    dy = int(ob - nb)
    dx = max(0, min(Wo - rg.shape[1], dx))
    dy = max(0, min(Ho - rg.shape[0], dy))
    cv = Image.new('RGBA', (Wo, Ho), (0, 0, 0, 0))
    cv.alpha_composite(Image.fromarray(rg, 'RGBA'), (dx, dy))
    return np.asarray(cv).copy(), k


# --------------------------------------------------------------------------------------------------------- the run
def old_image(key):
    return np.asarray(Image.open(LIB / (key + '.webp')).convert('RGBA')).copy()


def group_of(key):
    if key.startswith('mojo-chase/'):
        g = '/'.join(key.split('/')[:3][:2] if False else key.split('/')[:2])
        g = 'mojo-chase/' + key.split('/')[1]
        return g if g in GROUPS else None
    g = key.split('/')[0]
    return g if g in GROUPS else None


def run_matching(index, sprites, report):
    plans = {}
    for key, e in index.items():
        g = group_of(key)
        if not g:
            continue
        spec = GROUPS[g]
        t = int(e.get('outline') or 0)
        old = old_image(key)
        cands = {k: v for k, v in sprites.items() if k[0] in spec['sheets'] and k not in BANNED
                 and max(v.shape[:2]) >= 40}
        if not cands:
            continue
        flip = spec['flip'] and not key.startswith('mojo-chase/vehicles')
        oart = art_of_old(old, t)
        res = best_matches(oart, cands, flip)
        sc, k0, fl = res[0]
        # margin vs the best DIFFERENT sprite
        nxt = next((r[0] for r in res[1:] if r[1] != k0), 9.0)
        row = dict(key=key, sheet=k0[0], n=k0[1], score=sc, margin=nxt - sc, flip=fl, reason='')
        banned_best = None
        allr = best_matches(oart, {k: v for k, v in sprites.items() if k[0] in spec['sheets']}, flip)
        if allr[0][1] in BANNED and allr[0][0] < sc:
            banned_best = allr[0][1]
        if key in FORCE_KEEP:
            row['reason'] = 'KEEP: ' + FORCE_KEEP[key]
        elif key in FORCE_MATCH and FORCE_MATCH[key] in sprites:
            k0 = FORCE_MATCH[key]
            row.update(sheet=k0[0], n=k0[1], score=0.0, margin=0.0)
            built = place_on_old(sprites[k0], old, t)
            if built is None:
                row['reason'] = 'KEEP: new sprite too small'
            else:
                row.update(reason='REPLACE (identity forced by eye)', k=built[1])
                plans[key] = dict(arr=built[0], src=k0, flip=False)
        elif banned_best:
            row['reason'] = f'KEEP: best match is banned sprite {banned_best} ({BANNED[banned_best]})'
        elif sc > spec['thr'] or row['margin'] < spec.get('margin', 0):
            row['reason'] = f'KEEP: score {sc:.2f} / margin {row["margin"]:.2f} not confident' if spec['thr'] else 'KEEP: no counterpart in the sheets'
        else:
            src = sprites[k0]
            src = src[:, ::-1].copy() if fl else src
            built = place_on_old(src, old, t)
            if built is None:
                row['reason'] = 'KEEP: new sprite too small (would need > %.1fx upscale)' % MAX_UP
            else:
                row['reason'] = 'REPLACE'
                row['k'] = built[1]
                plans[key] = dict(arr=built[0], src=k0, flip=fl)
        report.append(row)
    return plans


def measure_chase(arr):
    a = arr[..., 3] >= 128
    rows = np.nonzero(a.sum(1) >= 2)[0]
    cols = np.nonzero(a.any(0))[0]
    top, base = int(rows[0]), int(rows[-1])
    h = base - top + 1
    band = a[max(top, base - max(6, int(h * 0.12))):base + 1]
    bc = np.nonzero(band.any(0))[0]
    return {'top': top, 'base': base, 'left': int(cols[0]), 'right': int(cols[-1]), 'cx': (bc[0] + bc[-1]) / 2.0,
            'bw': int(bc[-1] - bc[0] + 1), 'h': h}


def js_json(path, marker):
    t = path.read_text(encoding='utf-8')
    head = t[:t.index(marker) + len(marker)]
    tail = t[t.rindex(' })('):]
    return head, json.loads(t[len(head):t.rindex(' })(')]), tail


def update_anchors(plans):
    """Refresh the per-sprite measures of the replaced assets in the chase / rear anchor files."""
    head, data, tail = js_json(CHASE_JS, 'W.MojoChaseAnchors = ')
    n = 0
    for key, p in plans.items():
        parts = key.split('/')
        if parts[0] != 'mojo-chase' or parts[1] not in data['families'] or parts[2] not in data['families'][parts[1]]['sprites']:
            continue
        a = data['families'][parts[1]]['sprites'][parts[2]]
        m = measure_chase(p['arr'])
        lights = rear.tail_lights(p['arr'], {'top': m['top'], 'h': m['h'], 'cx': m['cx'], 'bw': m['bw']}) if parts[1] == 'vehicles' else a.get('lights', [])
        a.update({'base': m['base'], 'cx': round(m['cx'], 1), 'bw': m['bw'], 'top': m['top'], 'left': m['left'], 'right': m['right'], 'lights': lights})
        n += 1
    if n:
        CHASE_JS.write_text(head + json.dumps(data, indent=1, sort_keys=True) + tail, encoding='utf-8')
    head, data, tail = js_json(REAR_JS, 'W.MojoRearAnchors = ')
    m2 = 0
    for key, p in plans.items():
        if key.startswith('mojo-rear/'):
            name = key.split('/')[1]
            old = data['sprites'].get(name)
            if old:
                data['sprites'][name] = turn.rear_anchor(p['arr'], old['kind'])
                m2 += 1
    if m2:
        REAR_JS.write_text(head + json.dumps(data, indent=1, sort_keys=True) + tail, encoding='utf-8')
    return n, m2


# ------------------------------------------------------------------------------------------------------- turnaround
TURN_FORMS = [  # (id, kind, sheet, [side, diag, rear] sprite numbers)
    ('wrecking', 'ground', 1, (0, 1, 2)), ('boat', 'amph', 1, (3, 4, 5)), ('dump', 'ground', 1, (6, 7, 8)),
    ('excavator', 'ground', 13, (0, 1, 2)), ('grapple', 'ground', 13, (3, 4, 5)), ('shuttle', 'ground', 13, (6, 7, 8)),
    ('jet', 'ground', 13, (9, 10, 11)), ('police', 'ground', 13, (12, 13, 14)), ('skidder', 'ground', 13, (15, 16, 17)),
]
VIEWS = ['side', 'diag', 'rear']


def build_turn(sprites):
    T = 5
    cuts, kinds = {}, {}
    for fid, kind, sh, ns in TURN_FORMS:
        for v, n in zip(VIEWS, ns):
            cuts[f'{fid}-{v}'] = sprites[(sh, n)]
            kinds[f'{fid}-{v}'] = kind
    target = turn.rear_family_bw()
    ks = {}
    for sh in (1, 13):
        fs = [f for f, _, s, _ in TURN_FORMS if s == sh]
        bws = [rear.measure(np.pad(cuts[f'{f}-rear'], ((2, 2), (2, 2), (0, 0))))['bw'] for f in fs]
        ks[sh] = target / float(np.median(bws))
    p = outline.pad(T)
    # the tallest rear must fit the mojo-rear canvas; the factor is limited PER SHEET (never per form: one drawing scale)
    for sh in (1, 13):
        fs = [f for f, _, s, _ in TURN_FORMS if s == sh]
        ks[sh] = min(ks[sh], (turn.REAR_BASE - turn.PAD - 2 * p) / max(cuts[f'{f}-rear'].shape[0] for f in fs))
    form_sheet = {f: s for f, _, s, _ in TURN_FORMS}
    for sh in (1, 13):                    # an off-centre rear (the excavator arm) may not fit at the width-derived factor
        fs = [f for f, _, s, _ in TURN_FORMS if s == sh]
        while True:
            fit = True
            for f in fs:
                r = outline.crop_tight(*outline.outline(turn.scale(cuts[f'{f}-rear'], ks[sh]), T))[0]
                m = rear.measure(r)
                if max(m['cx'], r.shape[1] - m['cx']) > turn.REAR_W / 2.0 - turn.PAD - 1:
                    fit = False
            if fit:
                break
            ks[sh] *= 0.98
    ring = {n: outline.crop_tight(*outline.outline(turn.scale(im, ks[form_sheet[n.rsplit('-', 1)[0]]]), T))[0] for n, im in cuts.items()}
    imgs, anchors, sizes = {}, {}, {}
    for view in VIEWS:
        items = [(f'{f}-{view}', ring[f'{f}-{view}']) for f, _, _, _ in TURN_FORMS]
        if view == 'rear':
            placed, size, base = turn.place(items, (turn.REAR_W, turn.REAR_H), turn.REAR_BASE)
        else:
            placed, size, base = turn.place(items)
        for n, cv in placed.items():
            if view != 'rear':
                # side/diag only dress the picker cards and preview (object-fit:contain), never the race: a shared
                # canvas left the machine at 59-74% of the card width beside full-bleed forms (2026-10-10 review),
                # so trim to the drawing plus a 2% margin; the rear keeps the shared race canvas and baseline
                bb = cv.getchannel('A').getbbox()
                m = max(2, round(0.02 * max(cv.size)))
                cv = cv.crop((max(0, bb[0] - m), max(0, bb[1] - m), min(cv.width, bb[2] + m), min(cv.height, bb[3] + m)))
            imgs[n], sizes[n] = cv, (size if view == 'rear' else cv.size)
            arr = np.asarray(cv)
            anchors[n] = turn.rear_anchor(arr, kinds[n]) if view == 'rear' else {'base': int(arr.shape[0] - 1), 'cx': round(rear.measure(arr)['cx'], 1)}
    entries, files = {}, {}
    for n, im in imgs.items():
        key = f'mojo-turn/{n}'
        veh, view = n.rsplit('-', 1)
        a = anchors[n]
        files[LIB / 'mojo-turn' / (n + '.webp')] = encode(np.asarray(im))
        e = {'file': f'assets/db/lib/{key}.webp', 'cat': 'mojo-turn', 'tags': [veh, view, 'mojo', 'turnaround', 'chase', 'cartoon'],
             'source': SRCTAG, 'w': sizes[n][0], 'h': sizes[n][1], 'baseline': a['base'], 'cx': a['cx'], 'kind': kinds[n], 'outline': T}
        if view == 'rear':
            e['bw'] = a['bw']
        entries[key] = e
    return entries, files, {f'mojo-turn/{f}-rear': anchors[f'{f}-rear'] for f, _, _, _ in TURN_FORMS}, ks


# ------------------------------------------------------------------------------------------------------- contact sheets
def contact_before_after(rows, path, sprites=None, cols=4, tw=300, th=190):
    """rows: [(key, old_arr, new_arr|None)]. Old left, new right, key labelled."""
    per = (len(rows) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * tw, per * th), (96, 104, 120))
    d = ImageDraw.Draw(sheet)
    for i, (key, o, nw) in enumerate(rows):
        x, y = (i % cols) * tw, (i // cols) * th
        for j, arr in enumerate((o, nw)):
            if arr is None:
                continue
            im = Image.fromarray(arr, 'RGBA')
            k = min((tw / 2 - 6) / im.width, (th - 18) / im.height)
            t = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
            sheet.paste(t, (x + j * tw // 2 + (tw // 2 - t.width) // 2, y + 2), t)
        d.text((x + 3, y + th - 14), key.split('/', 1)[-1][:46], fill=(255, 255, 255))
        d.line([x + tw // 2, y, x + tw // 2, y + th - 16], fill=(60, 66, 80))
    sheet.save(path)


def write_review(report, extra_lines):
    lines = ['key\tsheet\tn\tscore\tmargin\tflip\tscale\tresult']
    for r in sorted(report, key=lambda r: r['key']):
        lines.append('%s\t%02d\t%03d\t%.3f\t%.3f\t%s\t%s\t%s' % (r['key'], r['sheet'], r['n'], r['score'], r['margin'],
                     'F' if r['flip'] else '-', ('%.2f' % r['k']) if 'k' in r else '-', r['reason']))
    REVIEW.write_text('\n'.join(lines + extra_lines) + '\n', encoding='utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--sheets')
    args = ap.parse_args()
    sprites = load_sprites()
    index = json.loads(INDEX.read_text(encoding='utf-8'))['assets']
    report = []
    plans = run_matching(index, sprites, report)
    t_entries, t_files, t_anchors, ks = build_turn(sprites)
    # plans -> exports / entries
    files, entries = {}, {}
    for key, p in plans.items():
        e = dict(index[key])
        arr = p['arr']
        files[LIB / (key + '.webp')] = encode(arr)
        e.update({'source': SRCTAG, 'w': arr.shape[1], 'h': arr.shape[0]})
        m = rear.measure(arr) if arr.shape[0] > 3 else None
        if 'baseline' in e:
            e['baseline'] = int(m['base'])
        if 'cx' in e:
            e['cx'] = round(m['cx'], 1)
        if 'bw' in e:
            e['bw'] = int(m['bw'])
        entries[key] = e
    # the old turnaround files are replaced by the rebuilt set
    files.update(t_files)
    entries.update(t_entries)
    by_dir = {}
    for r in report:
        by_dir.setdefault(r['key'].rsplit('/', 1)[0] if r['key'].startswith('mojo-chase') else r['key'].split('/')[0], []).append(r)
    summary = {d: (sum(1 for r in v if r['reason'].startswith('REPLACE')), len(v)) for d, v in sorted(by_dir.items())}
    print('replaced / considered per dir:', summary)
    print('turnaround forms:', len(TURN_FORMS), 'scales', {k: round(v, 3) for k, v in ks.items()})
    if args.sheets:
        out = Path(args.sheets)
        out.mkdir(parents=True, exist_ok=True)
        for d, v in by_dir.items():
            rows = [(r['key'], old_image(r['key']), plans[r['key']]['arr'] if r['key'] in plans else None) for r in sorted(v, key=lambda r: r['key'])]
            rows = [x for x in rows if x[2] is not None]
            if rows:
                contact_before_after(rows, out / (d.replace('/', '-') + '.png'))
        rows = []
        for fid, _, _, _ in TURN_FORMS:
            for v in VIEWS:
                k = f'mojo-turn/{fid}-{v}'
                rows.append((k, old_image(k) if (LIB / (k + '.webp')).exists() else None, np.asarray(Image.open(io.BytesIO(t_files[LIB / 'mojo-turn' / f'{fid}-{v}.webp'])).convert('RGBA'))))
        rows = [(a, b if b is not None else np.zeros((4, 4, 4), np.uint8), c) for a, b, c in rows]
        contact_before_after(rows, out / 'mojo-turn.png', cols=3)
    extra = ['# mojo-turn rebuilt from sheet 01 (3 forms) + sheet 13 (6 forms); scale per sheet %s' % {k: round(v, 3) for k, v in ks.items()}]
    if args.dry:
        write_review(report, extra)
        return 0
    from asset_transaction import publish
    helper = rear.ingest.index_helper()
    total = publish(str(INDEX), entries, files, helper)
    n_chase, n_rear = update_anchors(plans)
    # turnaround rear anchors (the six new forms + the three rebuilt)
    head, data, tail = js_json(REAR_JS, 'W.MojoRearAnchors = ')
    data['extra'] = {**data.get('extra', {}), **t_anchors}
    REAR_JS.write_text(head + json.dumps(data, indent=1, sort_keys=True) + tail, encoding='utf-8')
    write_review(report, extra)
    print('published; index has', total, 'assets; chase anchors', n_chase, 'rear anchors', n_rear, '+', len(t_anchors), 'turn')
    return 0


if __name__ == '__main__':
    sys.exit(main())
