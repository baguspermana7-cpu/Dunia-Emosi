#!/usr/bin/env python3
"""
Owner train sprite sheets -> the SHARED asset database, tagged by ORIENTATION + EXPRESSION (2026-10-10).

    ~/.venvs/kokoro/bin/python tools/ingest-train-sprites.py          # write assets/db/lib/train-char/* + indexes
    ~/.venvs/kokoro/bin/python tools/ingest-train-sprites.py --dry    # crops + contact sheets in $TRAIN_SCRATCH only

Seven owner sheets (transparent RGBA, 25 views each in a 5 x 5 grid), source folder ~/Downloads:
  linus       Brave Locomotive, blue            samson   Brave Locomotive, dark
  malivlak    red-orange vintage engine         dragutin / dragutin-alt   green railcar (two colourways)
  silver      Hellbent "Win the War Special"    defeatist   Hellbent sleepy "Defeatist Limited"
Printed text on the Hellbent sheets ("WIN THE WAR SPECIAL", "DEFEATIST LIMITED 1929") is kept as drawn.

Grid layout (the same on every sheet; the LABEL tables below record what each sheet really drew, because the
nose side differs sheet to sheet):
  row 0-1  orientation views: front, front 3/4, side, rear 3/4, rear (and a second set from the other side)
  row 2    TOP-DOWN views: nose down, a diagonal, nose left, then (sheet dependent) nose up / nose right
  row 3-4  expression sets (two expressions per sheet) in front, 3/4 and side views

Pipeline: cut each sprite by its OWN alpha (connected blob, tiny detached bits re-attached to the nearest big
blob, the few merged blobs split at the row gap; never a global colour key) -> halo decontamination ->
ONE scale per character (largest view = TARGET px, so Linus's side view and top view share a scale) ->
white sticker ring (tools/mojo_outline.py) -> `baseline`/`anchor` recorded.

Top-down completeness: the sheets do not draw every compass heading. The four cardinals and four diagonals are
ALWAYS present in the database; a heading the sheet did not draw is derived from a native one by flip or 180 degree
turn (top views are symmetric lengthwise) and flagged `derived: true`. Everything the sheet could not give
natively is listed in each entry's `missing` (and in games/data/train-sprites.js) so callers can fall back.

Metadata per entry: view (top|front|front34|side|rear34|rear), facing (compass degrees the NOSE points: 0 = away
from the camera / up the screen, 90 = right, 180 = toward the camera / down, 270 = left), expression, anchor
[x, y] (rotation pivot for top views, the wheel-contact point for the rest), baseline, w, h, alt, derived.
"""
import importlib.util, io, json, os, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'assets' / 'db' / 'lib'
DL = Path(os.path.expanduser('~/Downloads'))
SCRATCH = Path(os.environ.get('TRAIN_SCRATCH', os.path.join(tempfile.gettempdir(), 'dunia-train-char')))
TARGET = 256   # px: the longest side among a character's views
CAT = 'train-char'
SRCTAG = 'owner train sprite sheet (Downloads): '


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


ING = load('mojo_ingest', 'ingest-mojo-sheets.py')      # puts tools/ on sys.path for asset_transaction
CLEAN = load('mojo_clean', 'clean-mojo-sprites.py')

SHEETS = {
    'linus': 'Brave locomotive _name_Linus_Blue locomotive sprite sheet with paired eyes.png',
    'samson': 'Brave locomotive _name_Samson’s 25-view steam locomotive sprite sheet.png',
    'malivlak': 'malivlak_name_malivlak Vintage red-orange locomotive sprite sheet.png',
    'dragutin': 'malivlak_name_Dragutin Green Train Sprite Sheet-2.png',
    'dragutin-alt': 'malivlak_name_Dragutin Vintage green railcar sprite atlas-1.png',
    'silver': 'HEllbent _name_win the war speed Bespectacled Silver Locomotive Sprite Sheet-1.png',
    'defeatist': 'HEllbent _name_hellbent Mournful vintage steam train sprite sheet.png',
}
# y of the row gaps, for the one sheet whose neighbouring sprites touch (they are split there, at the thinnest row)
SPLIT_ROWS = {'linus': [745, 940]}

# view code -> (db name, view group, facing deg, short name used with an expression)
V = {
    'front': ('front', 'front', 180, 'face'),
    'f34l': ('front-34l', 'front34', 225, '34l'),
    'f34r': ('front-34r', 'front34', 135, '34r'),
    'sl': ('side-l', 'side', 270, 'side-l'),
    'sr': ('side-r', 'side', 90, 'side-r'),
    'rear': ('rear', 'rear', 0, 'rear'),
    'r34l': ('rear-34l', 'rear34', 315, 'rear-34l'),
    'r34r': ('rear-34r', 'rear34', 45, 'rear-34r'),
}
# rows 0-1 (neutral orientation views), as read from each sheet
ORIENT = {
    'linus': 'front f34l sl r34r rear f34r sr r34r f34l r34r',
    'samson': 'front f34l sl r34l rear f34r sr r34r f34l r34r',
    'malivlak': 'front f34l sl r34l rear f34r sr r34r f34r r34l',
    'dragutin': 'front f34r sr r34r rear f34l sl r34l f34l r34r',
    'dragutin-alt': 'front f34r sr r34r rear f34l sl r34l f34l r34r',
    'silver': 'front f34l sl r34r rear f34r sr r34l f34l r34r',
    'defeatist': 'front f34l sl r34r rear f34r sr r34r f34l r34r',
}
# rows 3 and 4: the five views of an expression set, and the two expressions of the sheet
EXPR_VIEWS = {
    'linus': 'front f34l sl f34l sl',
    'samson': 'front f34l sl f34r sr',
    'malivlak': 'front f34l sl f34r sl',
    'dragutin': 'front f34r sr f34l sl',
    'dragutin-alt': 'front f34r sr f34l sl',
    'silver': 'front f34l sl r34r rear',
    'defeatist': 'front f34l sl f34l f34l',
}
EXPR = {
    'linus': ('happy', 'sad'), 'samson': ('neutral', 'angry'), 'malivlak': ('happy', 'angry'),
    'dragutin': ('neutral', 'happy'), 'dragutin-alt': ('neutral', 'happy'),
    'silver': ('happy', 'angry'), 'defeatist': ('neutral', 'sad'),
}
# row 2: slot -> (compass heading the nose points, alt?)   (read from each sheet)
TOP = {
    'linus': {10: 's', 11: 'sw', 12: 'w', 13: 's+', 14: 'e'},
    'samson': {10: 's', 11: 'se', 12: 'w', 13: 's+', 14: 'rear+'},
    'malivlak': {10: 's', 11: 'sw', 12: 'w', 13: 'n', 14: 'e'},
    'dragutin': {10: 's', 11: 'se', 12: 'w', 13: 'n', 14: 'e'},
    'dragutin-alt': {10: 's', 11: 'se', 12: 'w', 13: 'n', 14: 'e'},
    'silver': {10: 's', 11: 'sw', 12: 'w', 13: 'n', 14: 'e'},
    'defeatist': {10: 's', 11: 'sw', 12: 'w', 13: 'n', 14: 'e'},
}
HEAD = {'n': 0, 'ne': 45, 'e': 90, 'se': 135, 's': 180, 'sw': 225, 'w': 270, 'nw': 315}
ALL8 = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']


def components(path):
    """Alpha blobs of a sheet: [(box, mask-crop RGBA)], tiny detached bits merged into the nearest big blob."""
    arr = np.asarray(Image.open(path).convert('RGBA'))
    a = arr[..., 3]
    H, W = a.shape
    lab, _ = ndi.label(a > 128)
    objs = ndi.find_objects(lab)
    area = ndi.sum(np.ones_like(lab), lab, range(1, len(objs) + 1))
    big = [i + 1 for i, ar in enumerate(area) if ar >= 0.0015 * H * W]
    small = [i + 1 for i, ar in enumerate(area) if 40 <= ar < 0.0015 * H * W]
    groups = {i: [i] for i in big}
    for s in small:
        sl = objs[s - 1]
        sc = ((sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2)
        best, bd = None, 1e9
        for b in big:
            o = objs[b - 1]
            dy = max(o[0].start - sc[0], 0, sc[0] - o[0].stop)
            dx = max(o[1].start - sc[1], 0, sc[1] - o[1].stop)
            d = (dy * dy + dx * dx) ** 0.5
            if d < bd:
                best, bd = b, d
        if best is not None and bd < 30:
            groups[best].append(s)
    return arr, lab, groups


def cut(arr, lab, ids):
    m = np.isin(lab, ids)
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = arr[y0:y1, x0:x1].copy()
    crop[..., 3] = np.where(m[y0:y1, x0:x1], crop[..., 3], 0)
    return [int(x0), int(y0), int(x1), int(y1)], crop


def split_merged(name, boxes_crops):
    """Cut a blob that spans a row gap into its sprites at the thinnest row near each gap."""
    gaps = SPLIT_ROWS.get(name)
    if not gaps:
        return boxes_crops
    out = []
    for box, crop in boxes_crops:
        pieces, top = [(box, crop)], None
        for g in gaps:
            nxt = []
            for bx, cr in pieces:
                if bx[1] < g - 30 and bx[3] > g + 30:
                    lo, hi = max(g - 30, bx[1] + 5) - bx[1], min(g + 30, bx[3] - 5) - bx[1]
                    prof = (cr[..., 3] > 128).sum(1)[lo:hi]
                    cy = lo + int(np.argmin(prof))
                    for part, (ya, yb) in enumerate(((0, cy), (cy, cr.shape[0]))):
                        sub = cr[ya:yb].copy()
                        ys, xs = np.nonzero(sub[..., 3] > 0)
                        if not len(ys):
                            continue
                        sub = sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
                        nxt.append(([bx[0] + int(xs.min()), bx[1] + ya + int(ys.min()),
                                     bx[0] + int(xs.max()) + 1, bx[1] + ya + int(ys.max()) + 1], sub))
                else:
                    nxt.append((bx, cr))
            pieces = nxt
        out.extend(pieces)
    return out


def grid25(name):
    arr, lab, groups = components(DL / SHEETS[name])
    items = [cut(arr, lab, ids) for ids in groups.values()]
    items = split_merged(name, items)
    if len(items) != 25:
        raise SystemExit(f'{name}: expected 25 sprites, found {len(items)}')
    items.sort(key=lambda t: (t[0][1] + t[0][3]) / 2)
    rows = [sorted(items[r * 5:(r + 1) * 5], key=lambda t: t[0][0]) for r in range(5)]
    return [t[1] for r in rows for t in r]


def tilt(im, op):
    return np.ascontiguousarray(im[:, ::-1] if op == 'h' else im[::-1, ::-1])


def plan(name, crops):
    """[(key-suffix, view, facing, expression, alt, derived, image)] for one character."""
    out, seen = [], {}

    def add(suffix, view, facing, expr, img, alt=False, derived=False):
        n = seen.get(suffix, 0)
        seen[suffix] = n + 1
        if n:
            suffix += '-' + 'bcdefg'[n - 1]
            alt = True
        out.append([suffix, view, facing, expr, alt, derived, img])

    for i, code in enumerate(ORIENT[name].split()):
        nm, grp, fc, _ = V[code]
        add(nm, grp, fc, 'neutral', crops[i])
    evs = EXPR_VIEWS[name].split()
    for r, expr in zip((3, 4), EXPR[name]):
        for c, code in enumerate(evs):
            nm, grp, fc, short = V[code]
            add(short + '-' + expr, grp, fc, expr, crops[r * 5 + c])
    native = {}
    for slot, h in TOP[name].items():
        if h in HEAD:
            native[h] = crops[slot]
            add('top-' + h, 'top', HEAD[h], 'neutral', crops[slot])
        elif h == 's+':
            add('top-s-alt', 'top', 180, 'neutral', crops[slot], alt=True)
        elif h == 'rear+':
            add('top-rear-alt', 'top', 0, 'neutral', crops[slot], alt=True)
    d = {}
    if 'n' not in native:
        d['n'] = tilt(native['s'], 'r180')
    if 'e' not in native:
        d['e'] = tilt(native['w'], 'h')
    sd = 'se' if 'se' in native else 'sw'
    od = 'sw' if sd == 'se' else 'se'
    d[od] = tilt(native[sd], 'h')
    d['nw'] = tilt(native['se'] if 'se' in native else d['se'], 'r180')
    d['ne'] = tilt(native['sw'] if 'sw' in native else d['sw'], 'r180')
    for h, im in d.items():
        add('top-' + h, 'top', HEAD[h], 'neutral', im, derived=True)
    missing = sorted('top-' + h for h in ALL8 if h not in native)
    return out, missing


def to_image(crop):
    """Alpha cut -> halo-decontaminated PIL image."""
    rgb, alpha = crop[..., :3].copy(), crop[..., 3].copy()
    pad = 6
    rgb = np.pad(rgb, ((pad, pad), (pad, pad), (0, 0)))
    alpha = np.pad(alpha, pad)
    bg = CLEAN.page_colour(rgb, alpha)
    rgb, alpha = CLEAN.decontaminate(rgb, alpha, bg)
    return Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')


def baseline(im):
    a = np.asarray(im.convert('RGBA'))[..., 3]
    rows = np.nonzero((a >= 128).sum(1) >= 2)[0]
    return int(rows[-1]) if len(rows) else im.height - 1


def contact(name, entries, ims):
    cell = 190
    sheet = Image.new('RGB', (5 * cell, 6 * cell), (96, 140, 104))
    d = ImageDraw.Draw(sheet)
    for i, (e, im) in enumerate(zip(entries, ims)):
        r, c = divmod(i, 5)
        t = im.copy(); t.thumbnail((cell - 8, cell - 22))
        sheet.paste(t, (c * cell + 4, r * cell + 16), t)
        d.text((c * cell + 4, r * cell + 2), '%s %s %s' % (e['name'], e['facing'], 'D' if e['derived'] else ''), fill=(255, 255, 0))
    return sheet


def main():
    dry = '--dry' in sys.argv
    SCRATCH.mkdir(parents=True, exist_ok=True)
    entries, files, table = {}, {}, {}
    for name in SHEETS:
        crops = grid25(name)
        items, missing = plan(name, crops)
        prepared = [(it, to_image(it[6])) for it in items]
        scale = TARGET / max(max(im.size) for _, im in prepared)
        rendered, metas = [], []
        for it, im in prepared:
            im = im.crop(im.getbbox())
            im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
            arr = np.asarray(im)
            t = CLEAN.mo.thickness(CLEAN.mo.short_side(arr))
            ring, _ = CLEAN.mo.outline(arr, t)
            im = Image.fromarray(ring, 'RGBA')
            im = im.crop(im.getbbox())
            suffix, view, facing, expr, alt, derived = it[:6]
            key = f'{CAT}/{name}/{suffix}'
            bl = baseline(im)
            anchor = [im.width // 2, im.height // 2] if view == 'top' else [im.width // 2, bl]
            buf = io.BytesIO(); im.save(buf, 'WEBP', quality=90, method=6)
            out = LIB / (key + '.webp')
            files[out] = buf.getvalue()
            entries[key] = {'file': f'assets/db/lib/{key}.webp', 'cat': CAT,
                            'tags': [name.split('-')[0], 'train', 'locomotive', view, expr, 'cartoon'],
                            'source': SRCTAG + SHEETS[name], 'w': im.width, 'h': im.height, 'outline': t,
                            'baseline': bl, 'anchor': anchor, 'char': name, 'view': view, 'facing': facing,
                            'expression': expr, 'alt': bool(alt), 'derived': bool(derived), 'missing': missing}
            rendered.append(im)
            metas.append({'name': suffix, 'facing': facing, 'derived': derived})
        table[name] = {'missing': missing, 'keys': [k for k in entries if k.startswith(f'{CAT}/{name}/')]}
        sheet = contact(name, metas, rendered[:30])
        sheet.save(SCRATCH / f'{name}-contact.png')
        print('%-13s %2d sprites  scale %.3f  missing native: %s' % (name, len(items), scale, ', '.join(missing) or '-'))
    if dry:
        print('dry run ->', SCRATCH)
        return
    from asset_transaction import publish
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, files, ING.index_helper())
    (SCRATCH / 'entries.json').write_text(json.dumps(entries, indent=1))
    print('published', len(entries), 'train-char sprites; index now', total, '->', SCRATCH)


if __name__ == '__main__':
    main()
