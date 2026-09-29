#!/usr/bin/env python3
"""
Owner's two LEGEND ship sheets (G30 Timmy & Kapal Legendaris, 2026-09-29): the same 25 historic
ships, same order, 5 per row, drawn twice -- SIDE view (caption BELOW each ship) and TOP view
(caption ABOVE each ship, bow pointing right).
    -> assets/db/lib/tk-legend-side/<id>.webp   bow RIGHT, as drawn (picker card + hero)
    -> assets/db/lib/tk-legend-top/<id>.webp    bow UP (rotated 90 deg CCW), gameplay sprite

    ~/.venvs/kokoro/bin/python tools/ingest-tk-legend.py [side.png top.png]

Pipeline (shared helpers from tools/ingest-asset-sheets.py and tools/ingest-tk-top.py, imported):
  1. the sheets are RULED: every thin grey grid line is measured, then blanked (blank_grid_lines
     re-paints a line only where art continues across it, so a mast over a line stays whole);
     the top sheet's outer frame is whitened too;
  2. the caption of each cell is found as the text band nearest the caption edge that is separated
     from the ship by a blank gap, and only those rows of that cell are whitened -- the ship is
     never cut (a run that touches the ship is not a caption and the cell FAILS instead);
  3. background = flat white CONNECTED to the border (edge flood with an edge barrier), NO global
     white key: white hulls (Estonia, Concordia, Gustloff) stay whole; thin rigging lines are
     foreground, so sails and rigging keep their lines; soft alpha un-premultiplied against white;
  4. top views get the same 2 px adaptive outline as tk-top/* (reads on the dark sea and the light
     card); side views are left without an outline (like tk-ship2/*-clean) so rigging stays fine.
Index writes MERGE: re-read right before writing; only tk-legend-side/* and tk-legend-top/* keys set.
"""
import importlib.util, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, 'tools', file))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


ias = _load('ias', 'ingest-asset-sheets.py')
itt = _load('itt', 'ingest-tk-top.py')

SRC = os.path.expanduser('~/Documents/temporary/game asset/timmy-ships')
SIDE = sys.argv[1] if len(sys.argv) > 2 else os.path.join(SRC, 'legend-side-25.png')
TOP = sys.argv[2] if len(sys.argv) > 2 else os.path.join(SRC, 'legend-top-25.png')
LIB = os.path.join(ROOT, 'assets', 'db', 'lib')
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')

# row-major, as drawn on both sheets
IDS = ['mary-rose', 'queen-annes-revenge', 'hms-victory', 'hms-erebus', 'hms-terror',
       'mary-celeste', 'ss-republic', 'ss-sultana', 'empress-of-ireland', 'lusitania',
       'ss-waratah', 'hms-hood', 'bismarck', 'uss-arizona', 'yamato',
       'wilhelm-gustloff', 'andrea-doria', 'edmund-fitzgerald', 'dona-paz', 'ms-estonia',
       'kursk', 'endurance', 'carpathia', 'andrea-gail', 'costa-concordia']
KIND = {'mary-rose': 'sailing', 'queen-annes-revenge': 'sailing pirate', 'hms-victory': 'sailing',
        'hms-erebus': 'sailing explorer', 'hms-terror': 'sailing explorer', 'mary-celeste': 'sailing',
        'ss-republic': 'steamship', 'ss-sultana': 'paddle steamer', 'empress-of-ireland': 'liner',
        'lusitania': 'liner', 'ss-waratah': 'liner', 'hms-hood': 'navy', 'bismarck': 'navy',
        'uss-arizona': 'navy', 'yamato': 'navy', 'wilhelm-gustloff': 'liner', 'andrea-doria': 'liner',
        'edmund-fitzgerald': 'cargo freighter', 'dona-paz': 'ferry', 'ms-estonia': 'ferry',
        'kursk': 'submarine', 'endurance': 'sailing explorer', 'carpathia': 'liner rescue',
        'andrea-gail': 'fishing boat', 'costa-concordia': 'cruise'}
SOLID_D = 14.0      # ink darker than this can be BODY (after the opening)
KEY_LO, KEY_W = 10.0, 34.0   # soft key outside the body: d <= 10 clear, d >= 44 opaque
PEEL = 4            # px next to the body where the off-white halo (d < HALO_D) is cleared
HALO_D = 26.0
CAP_BAND = 58       # px from the caption edge searched for the caption
MIN_GAP = 3         # blank rows that must separate the caption from the ship


def grid_lines(im):
    """Inner horizontal / vertical ruled lines (thin, light grey, low saturation, >50% of the span)."""
    a = im.astype(np.int32); g = a.mean(2); sat = a.max(2) - a.min(2)
    line = (g < 246) & (g > 120) & (sat < 25)
    out = []
    for ax, n in ((1, im.shape[0]), (0, im.shape[1])):
        v = np.where(line.mean(ax) > 0.5)[0]
        grp = [s for s in np.split(v, np.where(np.diff(v) > 2)[0] + 1) if len(s)]
        pos = [int(round(s.mean())) for s in grp if 8 < s.mean() < n - 8]
        out.append(pos)
    return out


def caption_rows(cell, where):
    """(r0, r1) rows of the caption in this cell, or None. where = 'bottom' | 'top'."""
    d = ias.whiteness_dist(cell.astype(np.float32))
    ink = (d > 40).sum(1) > 0
    H = len(ink)
    order = list(range(H - 1, -1, -1)) if where == 'bottom' else list(range(H))
    # skip blank rows from the caption edge, then take the text run, merging gaps <= 3 (tilde, apostrophe)
    i = 0
    while i < len(order) and not ink[order[i]] and i < CAP_BAND:
        i += 1
    if i >= CAP_BAND:
        return None
    start = i; last_ink = i; gap = 0
    while i < len(order) and i < start + 40:
        if ink[order[i]]:
            last_ink = i; gap = 0
        else:
            gap += 1
            if gap > 3:
                break
        i += 1
    # need MIN_GAP clean rows after the run before the ship starts
    j = last_ink + 1
    clean = 0
    while j < len(order) and not ink[order[j]]:
        clean += 1; j += 1
    if clean < MIN_GAP or last_ink - start < 8:
        return None
    rows = sorted(order[k] for k in (start, last_ink))
    return rows[0] - 2, rows[1] + 3


def prep(path, where):
    im = np.asarray(Image.open(path).convert('RGB')).copy()
    ys, xs = grid_lines(im)
    assert len(ys) == 4 and len(xs) == 4, (path, ys, xs)
    ias.blank_grid_lines(im, ys, xs)
    im[:3] = 255; im[-3:] = 255; im[:, :3] = 255; im[:, -3:] = 255   # outer frame (top sheet)
    H, W = im.shape[:2]
    Y = [0] + ys + [H]; X = [0] + xs + [W]
    boxes = [(X[c], Y[r], X[c + 1], Y[r + 1]) for r in range(5) for c in range(5)]
    bad = []
    for k, (x0, y0, x1, y1) in enumerate(boxes):
        # inset past the blanked line band so its residue is not read as ink
        cx0, cy0, cx1, cy1 = x0 + 6, y0 + 6, x1 - 6, y1 - 6
        cr = caption_rows(im[cy0:cy1, cx0:cx1], where)
        if cr is None:
            bad.append(f'{where}#{k} {IDS[k]}: caption not separable'); continue
        im[cy0 + max(0, cr[0]):cy0 + cr[1], cx0:cx1] = 255
    return im, boxes, bad


def body_mask(cell, own, close_iter=1):
    """The ship's THICK body: hull, decks, sails, funnels -- not masts, stays or rigging lines.
    Solid = ink darker than SOLID_D; opened by a 7 px disk (a 1-4 px line or JPEG noise vanishes),
    enclosed white paint filled back in (a white hull panel inside its outline stays body)."""
    d = ias.whiteness_dist(cell.astype(np.float32))
    filled = ndimage.binary_fill_holes(own)
    disk = np.hypot(*np.mgrid[-3:4, -3:4]) <= 3.2
    solid = ndimage.binary_opening(filled & (d >= SOLID_D), structure=disk)
    body = ndimage.binary_fill_holes(ndimage.binary_closing(solid, structure=disk, iterations=close_iter)) & filled
    return body, filled, d


def cut_alpha(cell, own, other, close_iter=1):
    """RGBA with soft alpha. Inside the thick body: opaque (anti-aliased rim). OUTSIDE it -- the
    rigging triangles the page flood could never reach, the masts, the stays -- alpha is a SOFT KEY
    on whiteness, clip((d - KEY_LO) / KEY_W): a grey rigging line stays, the white page between lines
    and its JPEG noise go. Within PEEL px of the body, light pixels (d < HALO_D) are cleared: the
    sheet's off-white halo around every outline. No global white key: a white hull is body."""
    body, filled, d = body_mask(cell, own, close_iter)
    region = ndimage.binary_dilation(filled, iterations=ias.EDGE) & ~other
    a = np.zeros(d.shape, np.float32)
    key = np.clip((d - KEY_LO) / KEY_W, 0.0, 1.0)
    outside = region & ~body
    a[outside] = key[outside]
    near = outside & (ndimage.distance_transform_edt(~body) <= PEEL) & (d < HALO_D)
    a[near] = 0.0
    a[body] = 1.0
    rim = body & (ndimage.distance_transform_edt(body) <= 1.0)
    a[rim] = np.clip((d[rim] - 4.0) / ias.BG_TOL, 0.35, 1.0)
    rgb = cell.astype(np.float32)
    safe = np.maximum(a, 1e-3)[..., None]
    col = (rgb - (1.0 - a)[..., None] * 255.0) / safe
    out = np.zeros(cell.shape[:2] + (4,), np.float32)
    out[..., :3] = np.clip(np.where(a[..., None] > 0, col, 0), 0, 255)
    out[..., 3] = a * 255.0
    out = out.round().astype(np.uint8)
    ys, xs = np.where(out[..., 3] > 8)
    if len(ys) == 0:
        return None
    P = ias.PAD
    return out[max(0, ys.min() - P):ys.max() + P + 1, max(0, xs.min() - P):xs.max() + P + 1]


def ingest(path, where, cat, rotate):
    im, boxes, bad = prep(path, where)
    ws = ias.segment_sheet(im, 5, 5, boxes=boxes, loose=True, cell_owned=True)
    out_dir = os.path.join(LIB, cat)
    os.makedirs(out_dir, exist_ok=True)
    made, rows = {}, []
    for k, name in enumerate(IDS):
        own_full = ws == k + 1
        if not own_full.any():
            bad.append(f'{cat}/{name}: no pixels'); continue
        ys, xs = np.where(own_full)
        y0, y1 = max(0, ys.min() - 8), min(im.shape[0], ys.max() + 9)
        x0, x1 = max(0, xs.min() - 8), min(im.shape[1], xs.max() + 9)
        own = own_full[y0:y1, x0:x1]
        other = (ws[y0:y1, x0:x1] > 0) & ~own
        # top views: a white deck's outline is a faint grey line, so the body is closed harder
        spr = cut_alpha(im[y0:y1, x0:x1], own, other, 3 if rotate else 1)
        if spr is None:
            bad.append(f'{cat}/{name}: empty cut'); continue
        spr = ias.drop_slivers(spr)
        ring = '-'
        if rotate:
            spr = np.asarray(Image.fromarray(spr, 'RGBA').rotate(90, expand=True))   # CCW: bow right -> bow up
            spr, ring = itt.adaptive_outline(spr)
        data = ias.encode(spr)
        ps, amax = ias.psnr_opaque(spr, data)
        if ps < ias.MIN_PSNR or amax > 2:
            bad.append(f'{cat}/{name}: webp psnr {ps:.1f} alpha {amax}')
        open(os.path.join(out_dir, name + '.webp'), 'wb').write(data)
        key = cat + '/' + name
        made[key] = {'file': 'assets/db/lib/' + key + '.webp', 'cat': cat,
                     'tags': name.split('-') + KIND[name].split() + [('top-view' if rotate else 'side-view'), 'ship', 'legend'],
                     'source': os.path.basename(path) + '#' + str(k), 'w': int(spr.shape[1]), 'h': int(spr.shape[0]),
                     'psnr': round(ps, 1)}
        rows.append(f'{key:40s} {spr.shape[1]:4d}x{spr.shape[0]:<4d} {len(data) // 1024:3d} KB  psnr {ps:.1f}  ring {ring}')
    return made, rows, bad


def main():
    made, rows, bad = {}, [], []
    for path, where, cat, rot in ((SIDE, 'bottom', 'tk-legend-side', False), (TOP, 'top', 'tk-legend-top', True)):
        m, r, b = ingest(path, where, cat, rot)
        made.update(m); rows += r; bad += b
    fresh = json.load(open(INDEX))          # MERGE: re-read right before writing; only our keys change
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
