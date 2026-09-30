#!/usr/bin/env python3
"""
Owner's HIGH-RES legend side-view cards (G30 Timmy & Kapal Legendaris, 2026-09-30): three sheets of 3x3 cards,
27 ships (the 25 legend ships + USS Enterprise + SS Great Eastern). Each card = a ship over a caption band
(number badge, name, subtitle, flag / emblem). Replaces assets/db/lib/tk-legend-side/<slug>.webp (same slugs)
and adds the two new ones.

    ~/.venvs/kokoro/bin/python tools/ingest-tk-legend-hq.py

  1. CAPTION BAND: the card's lowest ink in the badge column is the badge's bottom; the ship window ends 58 px
     above it, so the badge, the name, the subtitle and the flag/emblem (incl. the swastika flags printed for
     Bismarck / Wilhelm Gustloff and the rising-sun flag for Yamato) are never in the window;
  2. SEA (sheet 1 only): the painted waves are removed -- the waterline is the first row where saturated sea
     blue covers the hull span; below it everything goes, above it sea blue and the white foam CONNECTED to
     the sea go; the hull keeps a 3 px soft fade at the waterline (no hard cut);
  3. background = white flooded from the window border (no global white key), then the ingest-tk-legend.py
     alpha: opaque thick body (white sails and white hulls stay whole), a soft whiteness key outside it so thin
     rigging lines keep their pixels; birds and loose specks (not attached to the ship) are dropped;
  4. FLAGS ON THE SHIPS of Bismarck, Wilhelm Gustloff and Yamato (small red ensigns on masts / stern that can
     carry the same symbols) are erased: each small saturated-red blob standing in the sky gets alpha 0 over
     its box (+2 px), so no symbol can survive; the red hull cross / boot-topping (inside the body) is kept;
  5. BOW RIGHT: six cards are drawn bow-left (Lusitania, Waratah, Gustloff, Andrea Doria, Kursk, Carpathia); the
     hull NAME box is flipped in place first, then the whole sprite is mirrored, so the name still reads left to
     right (a mirrored name would read backwards to a child learning to read);
  6. native size (no upscale), WebP PSNR >= 43. Index MERGE: re-read right before writing, only our keys set.
"""
import hashlib
import importlib.util, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def _load(name, file):
    spec = importlib.util.spec_from_file_location(name, os.path.join(ROOT, 'tools', file))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


ias = _load('ias', 'ingest-asset-sheets.py')
transaction = _load('asset_transaction', 'asset_transaction.py')

SRC = os.path.expanduser('~/Documents/temporary/game asset/timmy-ships')
OUT = os.path.join(ROOT, 'assets', 'db', 'lib', 'tk-legend-side')
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')
SOURCE_HASH = {
    'legend-side-hq-1.png': '47f0987061288a7772f3b7d0c6720e0cc6b31497587754036cd43b84901ddeb3',
    'legend-side-hq-2.png': '063f153587e646591b1dd1d5177fce74fa8d0d77a91ae55226f8cf57cca9e49b',
    'legend-side-hq-3.png': 'ca3162adf3274cec9fc3b938eee52235f2186effbe36a2b07dab19196d1ccfdd',
}
SHEETS = [
    ('legend-side-hq-1.png', [0, 342, 669, 1024], ['mary-rose', 'queen-annes-revenge', 'hms-victory', 'hms-erebus', 'hms-terror',
                                                  'mary-celeste', 'ss-republic', 'ss-sultana', 'empress-of-ireland']),
    ('legend-side-hq-2.png', [0, 349, 677, 1024], ['lusitania', 'ss-waratah', 'hms-hood', 'bismarck', 'uss-arizona', 'yamato',
                                                  'wilhelm-gustloff', 'andrea-doria', 'edmund-fitzgerald']),
    ('legend-side-hq-3.png', [0, 327, 679, 1024], ['dona-paz', 'ms-estonia', 'kursk', 'endurance', 'carpathia', 'andrea-gail',
                                                  'costa-concordia', 'uss-enterprise', 'great-eastern']),
]
WAVES = {'legend-side-hq-1.png'}
FLAG_ERASE = {'bismarck', 'wilhelm-gustloff', 'yamato'}
# bow-left cards: hull lettering boxes (x0, y0, x1, y1) in the ship window, inpainted before the mirror
BOW_LEFT = {
    'lusitania': [(80, 136, 162, 177)],
    'ss-waratah': [(82, 166, 154, 199)],
    'wilhelm-gustloff': [(90, 116, 207, 153)],
    'andrea-doria': [(80, 143, 194, 177)],
    'kursk': [(286, 164, 330, 192)],
    'carpathia': [(58, 170, 116, 196)],
}
BADGE_GAP = 58
# emblems painted ON a ship that may carry a banned symbol: (x0, y0, x1, y1) in the ship window, repainted with the
# box's own light surround (the Gustloff's funnel carries a small red emblem; checked by eye at 10x)
PAINT_OUT = {'wilhelm-gustloff': [(186, 64, 232, 84)]}
# these sheets are clean (page d ~ 0-1, no JPEG halo), so the alpha can key much closer to white than the
# first legend sheet: a sail's pale highlight (d 5-20) stays solid body instead of going half-transparent
# Sails and white-painted hulls have different foreground geometry; preserve their
# painted interiors while matting the surrounding thin rigging and page haze.
WHITE_HULL = {'wilhelm-gustloff'}   # a white hull shaded in the same neutral grey as the rigging haze
SAIL = {'mary-rose', 'queen-annes-revenge', 'hms-victory', 'hms-erebus', 'hms-terror', 'mary-celeste', 'endurance'}
DEBUG_NOFLIP = os.environ.get('TKL_NOFLIP') == '1'


# ALPHA for these cards (one rule for every ship), from measured whiteness maps (d = distance from white):
#  - the page is d ~ 1; a white hull can be just as white (Dona Paz's band is d < 1), so page = white CONNECTED
#    to the window border (edge flood with an edge barrier), never a colour key;
#  - the rigging is drawn inside a light NEUTRAL-GREY haze (d 10-25) around the masts, which is no paint;
#  - sails are CREAM (warm, saturated), hulls/funnels are dark or coloured.
# So the SOLID body = ink that is dark (d >= 40) or coloured (saturation >= 12 and d >= 12), opened by a 5 px disk
# (hairlines vanish), closed by the same disk and hole-filled (a white panel ringed by paint, a sail's highlight).
# Inside it alpha = 1. Outside it -- the haze, the hairlines, the smoke -- alpha is a soft key on d,
# clip((d - KEY_LO) / KEY_W), un-premultiplied on white, so a hairline stays a thin grey line on any background.
KEY_LO, KEY_W = 12.0, 50.0
PAINT_MED = 1.5
# Source-local hull boundary measured on the supplied Empress card. Its navy
# paint shares the sea's blue hues, so colour alone cannot identify water.
# Coordinates are in the caption-free 504px card, before trimming or mirroring.
HULL_KEEP = {
    'empress-of-ireland': [(28, 160), (85, 164), (454, 182), (482, 177),
                           (471, 209), (455, 227), (371, 232), (231, 232),
                           (85, 230), (46, 225)],
}
# Audited page-white pockets between rigging lines. Keep each flood within its
# source-local sky rectangle; white railings, decks and hull paint stay outside.
SKY_POCKETS = {
    'andrea-gail': [((195, 120, 345, 217), [(260, 186)])],
    'hms-hood': [((50, 154, 108, 215), [(72, 192), (94, 173)])],
    'uss-arizona': [((26, 135, 78, 187), [(56, 170)])],
    'bismarck': [((40, 140, 80, 176), [(68, 163), (71, 150)]),
                 ((9, 163, 23, 191), [(19, 178)])],
    'yamato': [((25, 140, 83, 195), [(79, 160), (47, 162), (43, 178), (51, 180)])],
    'ss-waratah': [((440, 155, 485, 218), [(451, 187), (468, 192)])],
    'andrea-doria': [((410, 128, 440, 160), [(432, 146)])],
    'carpathia': [((410, 142, 485, 210), [(442, 178), (465, 193)])],
    'great-eastern': [((37, 128, 86, 178), [(54, 160), (78, 151), (76, 164)])],
    'kursk': [((425, 201, 445, 220), [(434, 211)])],
    'ss-sultana': [((257, 39, 281, 124), [(272, 83)]),
                   ((292, 35, 315, 124), [(300, 103)]),
                   ((61, 109, 99, 136), [(76, 129)]),
                   ((399, 122, 463, 151), [(433, 140)])],
    'empress-of-ireland': [((247, 61, 280, 119), [(262, 91)]),
                           ((302, 74, 325, 131), [(313, 100)]),
                           ((413, 129, 477, 176), [(431, 157)])],
}


def polygon_mask(shape, polygons):
    mask = Image.new('1', (shape[1], shape[0]))
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        if any(x < 0 or y < 0 or x >= shape[1] or y >= shape[0] for x, y in polygon):
            raise ValueError('Source polygon is outside crop bounds')
        draw.polygon(polygon, fill=1)
    return np.asarray(mask, dtype=bool)


def clear_ground(alpha, distance, slug):
    """Un-key pale ground beneath the dark hull on the dry-background sheets."""
    if slug is None or slug in SHEETS[0][2]:
        return alpha
    rows = np.arange(distance.shape[0])[:, None]
    bottom = np.max(np.where(distance >= 80, rows, -1), axis=0)
    # Bridge one-pixel highlight gaps along the painted keel, without extending
    # the whole bounding rectangle over the background beneath a curved bow.
    bottom = ndimage.maximum_filter1d(bottom, size=3)
    ground = (rows > bottom) & (rows > distance.shape[0] * 0.7)
    out = alpha.copy()
    out[ground] = np.minimum(out[ground], np.clip((distance[ground] - KEY_LO) / KEY_W, 0, 1))
    return out


def clear_sky(alpha, distance, saturation, slug):
    """Matte measured empty rigging spaces without flooding painted panels."""
    out = alpha.copy()
    for (x0, y0, x1, y1), seeds in SKY_POCKETS.get(slug, []):
        height, width = alpha.shape
        if not (0 <= x0 < x1 <= width and 0 <= y0 < y1 <= height):
            raise ValueError(f'{slug}: sky rectangle is outside crop bounds')
        if any(not (x0 <= x < x1 and y0 <= y < y1) for x, y in seeds):
            raise ValueError(f'{slug}: sky seed is outside rectangle bounds')
        region = np.zeros_like(alpha, dtype=bool)
        region[y0:y1, x0:x1] = True
        # Sultana's neutral smoke haze extends between the funnels; it is not
        # white-painted structure. The source-local rectangles stop at deck.
        limit = 30 if slug == 'ss-sultana' else 10
        labels, _ = ndimage.label(region & (distance < limit) & (saturation < 6))
        ids = [labels[y, x] for x, y in seeds if labels[y, x] > 0]
        sky = region & ndimage.binary_dilation(np.isin(labels, ids), iterations=2)
        out[sky] = np.minimum(out[sky], np.clip((distance[sky] - KEY_LO) / KEY_W, 0, 1))
    return out


def require_rgb(cell):
    if cell.ndim != 3 or cell.shape[2] != 3 or min(cell.shape[:2]) < 5:
        raise ValueError('Expected nonempty RGB crop at least 5x5 pixels')


def cut_clean(cell, sail=False, white_hull=False, trim=True, slug=None):
    require_rgb(cell)
    rgb = cell.astype(np.float32)
    d = ias.whiteness_dist(rgb)
    sat = rgb.max(2) - rgb.min(2)
    # page flood that cannot squeeze through a 1-4 px gap in a white hull's faint outline (Gustloff, Dona Paz):
    # connectivity is decided on the flood candidates OPENED by a 5 px disk, then grown back 3 px
    _, cand, _ = ias.page_mask(rgb)
    core = ndimage.binary_opening(cand, structure=np.hypot(*np.mgrid[-2:3, -2:3]) <= 2.2)
    lab, _ = ndimage.label(core)
    edge_ids = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    page = cand & ndimage.binary_dilation(np.isin(lab, list(edge_ids)), iterations=3)
    own = main_part(~page)
    if not own.any():
        return None
    disk = np.hypot(*np.mgrid[-2:3, -2:3]) <= 2.2
    ink = own & ((d >= 40) | ((sat >= 12) & (d >= 12)))
    if slug == 'hms-victory':
        # This card's pale cream highlights fall below the generic ink cutoff.
        # Limit the lower threshold to its warm paint; neutral sky stays clear.
        warm = (rgb[..., 0] >= rgb[..., 1]) & (rgb[..., 1] >= rgb[..., 2])
        ink |= own & warm & (sat >= 5) & (d >= 4)
    solid = ndimage.binary_opening(ink, structure=disk)
    solid = ndimage.binary_fill_holes(ndimage.binary_closing(solid, structure=disk, iterations=2)) & own
    if not sail:
        # WHITE PAINT the solid missed (Gustloff's hull, Dona Paz's band: faint outline, so no closed ring). White
        # paint is near-white but SHADED -- its 7x7 median whiteness is >= PAINT_MED -- while the page and the sky
        # pockets are flat (median ~1) and the rigging haze is not near-white (d >= 8). Large pieces only.
        paint = own & ~solid & (d < 8.0) & (ndimage.median_filter(d, size=7) >= PAINT_MED)
        pl, pn = ndimage.label(paint)
        if pn:
            sz = ndimage.sum(np.ones_like(pl), pl, range(1, pn + 1))
            # ... and only in the HULL band (lower 45% of the ship): sky pockets in the rigging haze are above it
            ys_ = np.where(own.any(1))[0]
            band = ys_.min() + 0.55 * (ys_.max() - ys_.min())
            rows = np.arange(own.shape[0])[:, None] >= band
            low = np.atleast_1d(ndimage.mean(np.broadcast_to(rows, own.shape).astype(float), pl, range(1, pn + 1)))
            solid |= np.isin(pl, [i + 1 for i, v in enumerate(np.atleast_1d(sz)) if v >= 150 and low[i] >= 0.8])
            # the HULL band itself: everything the page flood did not take is hull (a white bow as flat as the page)
            hb = own.copy(); hb[:int(ys_.min() + 0.62 * (ys_.max() - ys_.min()))] = False
            med9 = ndimage.median_filter(d, size=9)
            if not white_hull:   # the neutral-grey rigging haze is not hull (but a white hull's shading looks the same)
                hb &= ~((med9 >= 6) & (med9 <= 40) & (sat < 10))
            solid |= ndimage.binary_opening(hb, structure=disk)
            solid = ndimage.binary_fill_holes(ndimage.binary_closing(solid, structure=disk)) & own
    a = np.where(solid, 1.0, np.clip((d - KEY_LO) / KEY_W, 0.0, 1.0)).astype(np.float32)
    a[~ndimage.binary_dilation(own, iterations=1)] = 0.0
    edge = solid & (ndimage.distance_transform_edt(solid) <= 1.0)
    a[edge] = np.clip(d[edge] / 20.0, 0.4, 1.0)
    # Rigging can enclose a pocket of page white. Explicit source-local seeds
    # identify sky rather than deleting large white panels throughout a hull.
    a = clear_sky(a, d, sat, slug)
    a = clear_ground(a, d, slug)
    if slug in {'ss-waratah', 'edmund-fitzgerald'}:
        # These two measured card badges start three pixels above the nominal
        # caption boundary. Their left-hand arc is below the curved stern/bow;
        # remove that page region without shortening the ship's central keel.
        a[-4:, :100] = 0
    safe = np.maximum(a, 1e-3)[..., None]
    col = (rgb - (1.0 - a)[..., None] * 255.0) / safe
    out = np.zeros(cell.shape[:2] + (4,), np.float32)
    out[..., :3] = np.clip(np.where(a[..., None] > 0, col, 0), 0, 255)
    out[..., 3] = a * 255.0
    out = out.round().astype(np.uint8)
    if not trim:
        return out
    ys, xs = np.where(out[..., 3] > 8)
    if not len(xs):
        return None
    P = ias.PAD
    return out[max(0, ys.min() - P):ys.max() + P + 1, max(0, xs.min() - P):xs.max() + P + 1]


def ship_window(im, y0, y1, x0):
    """(top, bottom) rows of the ship window of one card: the caption band starts BADGE_GAP px above the badge's
    bottom (the lowest ink in the badge column)."""
    require_rgb(im)
    if not (0 <= y0 < y1 <= im.shape[0] and 0 <= x0 < x0 + 512 <= im.shape[1]):
        raise ValueError(f'Card bounds exceed source: ({x0}, {y0}, {x0 + 512}, {y1})')
    d = ias.whiteness_dist(im[y0:y1, x0 + 20:x0 + 100].astype(np.float32))
    rows = np.where((d > 60).sum(1) > 4)[0]
    if not len(rows) or int(rows[-1]) - BADGE_GAP <= 4:
        raise ValueError(f'No valid caption badge in card ({x0}, {y0}, {x0 + 512}, {y1})')
    return y0 + 4, y0 + int(rows[-1]) - BADGE_GAP


def remove_sea(cell, slug=None):
    """Sheet-1 cards: whiten the painted sea + foam; returns (cell, waterline row)."""
    require_rgb(cell)
    a = cell.astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    blue = (b > r + 25) & (b > g + 5) & (b > 70)
    H = cell.shape[0]
    xs = np.where((ias.whiteness_dist(cell.astype(np.float32)) > 40).any(0))[0]
    if not len(xs) or xs.max() - xs.min() <= 80:
        raise ValueError(f'{slug or "ship"}: no sufficiently wide ship foreground for waterline')
    span = slice(xs.min() + 40, xs.max() - 40)
    frac = blue[:, span].mean(1)
    wl = next((y for y in range(int(H * 0.55), H) if frac[y] > 0.35), H - 1)
    d = ias.whiteness_dist(cell.astype(np.float32))
    light = d < 70
    sea = blue.copy()
    sea[wl:] = True
    lo = max(0, wl - 45)
    grow = np.zeros_like(sea)
    grow[lo:] = (sea | light)[lo:]
    lab, _ = ndimage.label(grow)
    keep = np.unique(lab[wl:][lab[wl:] > 0])
    sea |= np.isin(lab, keep)
    if slug in HULL_KEEP:
        sea &= ~polygon_mask(cell.shape, [HULL_KEEP[slug]])
    out = cell.copy()
    out[sea] = 255
    return out, wl


def erase_flags(spr):
    """Alpha 0 over every small saturated-red blob that stands in the sky (its ring is mostly transparent)."""
    a = spr.astype(np.int32)
    red = (a[..., 0] > 140) & (a[..., 1] < 110) & (a[..., 2] < 110) & (a[..., 3] > 60)
    lab, n = ndimage.label(ndimage.binary_dilation(red, iterations=2))
    out = spr.copy()
    alpha = spr[..., 3] > 128
    hit = 0
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w > 900:
            continue
        y0, y1 = max(0, sl[0].start - 4), min(spr.shape[0], sl[0].stop + 4)
        x0, x1 = max(0, sl[1].start - 4), min(spr.shape[1], sl[1].stop + 4)
        ring = ~alpha[y0:y1, x0:x1]
        if ring.mean() < 0.35:
            continue                     # inside the body (hull cross, boot-topping): kept
        out[max(0, sl[0].start - 2):sl[0].stop + 2, max(0, sl[1].start - 2):sl[1].stop + 2, 3] = 0
        hit += 1
    return out, hit


def inpaint(cell, boxes):
    if not boxes:
        return cell
    from skimage.restoration import inpaint_biharmonic
    out = cell.copy()
    for (x0, y0, x1, y1) in boxes:
        sub = out[y0 - 6:y1 + 6, x0 - 6:x1 + 6].astype(np.float64) / 255.0
        m = np.zeros(sub.shape[:2], bool)
        m[6:-6, 6:-6] = True
        fixed = inpaint_biharmonic(sub, m, channel_axis=-1)
        out[y0 - 6:y1 + 6, x0 - 6:x1 + 6] = np.clip(fixed * 255.0, 0, 255).round().astype(np.uint8)
    return out


def main_part(own):
    lab, n = ndimage.label(own, structure=np.ones((3, 3)))
    if n < 2:
        return own
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    near = ndimage.binary_dilation(lab == k, iterations=10)
    keep = [k] + [i + 1 for i, s in enumerate(sizes) if i + 1 != k and s >= 30 and (near & (lab == i + 1)).any()]
    return np.isin(lab, keep)


def main():
    os.makedirs(OUT, exist_ok=True)
    made, rows, bad, exports = {}, [], [], {}
    with open(INDEX, encoding='utf-8') as source:
        old = json.load(source)['assets']
    for fname, ys, slugs in SHEETS:
        source_path = Path(SRC) / fname
        if hashlib.sha256(source_path.read_bytes()).hexdigest() != SOURCE_HASH.get(fname):
            raise ValueError(f'{fname}: source differs from measured owner sheet; review crop coordinates first')
        with Image.open(source_path) as source:
            if source.size != (1536, 1024):
                raise ValueError(f'{fname}: expected measured 1536x1024 source, got {source.size}')
            im = np.asarray(source.convert('RGB')).copy()
        for k, slug in enumerate(slugs):
            r, c = divmod(k, 3)
            x0 = c * 512
            top, bot = ship_window(im, ys[r], ys[r + 1], x0)
            cell = im[top:bot, x0 + 4:x0 + 508].copy()
            if slug in BOW_LEFT and not DEBUG_NOFLIP:
                # the hull NAME is flipped in place first, so after the whole sprite is mirrored it reads right
                for (bx0, by0, bx1, by1) in BOW_LEFT[slug]:
                    cell[by0:by1, bx0:bx1] = cell[by0:by1, bx0:bx1][:, ::-1].copy()
            for (bx0, by0, bx1, by1) in PAINT_OUT.get(slug, []):
                box = cell[by0:by1, bx0:bx1].astype(np.int32)
                red = (box[..., 0] > 120) & (box[..., 0] - box[..., 2] > 45)
                red = ndimage.binary_dilation(red, iterations=2)
                light = box[~red & (box.min(2) > 190)]
                fill = np.median(light, axis=0) if len(light) else np.array([235, 235, 235])
                box[red] = fill
                cell[by0:by1, bx0:bx1] = box.astype(np.uint8)
            wl = None
            if fname in WAVES:
                cell, wl = remove_sea(cell, slug=slug)
            spr = cut_clean(cell, slug in SAIL, slug in WHITE_HULL, slug=slug)
            if spr is None:
                bad.append(f'{slug}: empty'); continue
            spr = ias.drop_slivers(spr)
            if slug in FLAG_ERASE:
                spr, hit = erase_flags(spr)
                rows.append(f'  {slug}: {hit} ship flag(s) erased')
            if wl is not None:
                # soft waterline: the last 3 opaque rows fade out
                ys_ = np.where((spr[..., 3] > 8).any(1))[0]
                b = ys_.max()
                for j, f in enumerate((0.35, 0.65, 0.85)):
                    spr[b - j, :, 3] = (spr[b - j, :, 3] * f).astype(np.uint8)
            if slug in BOW_LEFT and not DEBUG_NOFLIP:
                spr = spr[:, ::-1].copy()
            data = ias.encode(spr)
            ps, amax = ias.psnr_opaque(spr, data)
            if ps < 43.0:          # busy detail (Mary Rose's painted hull): a higher quality clears the bar
                buf = io.BytesIO()
                Image.fromarray(spr, 'RGBA').save(buf, 'WEBP', quality=99, use_sharp_yuv=True, alpha_quality=100, method=6, exact=True)
                data = buf.getvalue()
                ps, amax = ias.psnr_opaque(spr, data)
            if ps < 43.0 or amax > 2:
                bad.append(f'{slug}: webp psnr {ps:.1f} alpha {amax}')
            exports[slug] = data
            key = 'tk-legend-side/' + slug
            prev = old.get(key)
            made[key] = {'file': 'assets/db/lib/' + key + '.webp', 'cat': 'tk-legend-side',
                         'tags': slug.split('-') + ['side-view', 'ship', 'legend', 'hq'],
                         'source': fname + '#' + str(k), 'w': int(spr.shape[1]), 'h': int(spr.shape[0]), 'psnr': round(ps, 1)}
            was = f"{prev['w']}x{prev['h']}" if prev else 'new'
            rows.append(f'{key:40s} {was:>8s} -> {spr.shape[1]}x{spr.shape[0]:<4d} {len(data) // 1024:3d} KB psnr {ps:.1f}'
                        + (' mirrored' if slug in BOW_LEFT and not DEBUG_NOFLIP else '') + (f' waterline {wl}' if wl is not None else ''))
    if bad:
        print('\n'.join(rows))
        for failure in bad:
            print('  FAIL', failure)
        return 1
    total = transaction.publish(INDEX, made, {Path(OUT) / (slug + '.webp'): data for slug, data in exports.items()}, ias)
    print('\n'.join(rows))
    print(f'made {len(made)}, index total {total}')
    for b in bad:
        print('  FAIL', b)
    return 1 if bad else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        print(f'HQ ship ingestion failed before acceptance: {error}', file=sys.stderr)
        sys.exit(1)
