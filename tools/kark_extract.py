"""
Cut every sprite out of the owner's background-removed sheets (2026-10-10,
~/Documents/temporary/mojo asset/asset kark mojo/*.png) by their OWN alpha.

The owner removed the backgrounds by hand, so nothing here keys a colour: a
sprite is a connected alpha blob (closed a little so a dog's ear or a crane's
hook stays with its body). Text pills ("SIDE VIEW", "WRECKING BALL", name tags
under the helpers) are short, wide, mostly-blue/white blobs and are dropped.

    ~/.venvs/kokoro/bin/python tools/kark_extract.py [--sheet OUT.jpg]

Writes <scratch>/kark/<sheet-index>/<n>.png (tight RGBA crops) and
components.json: [{sheet, n, box:[x0,y0,x1,y1], area}].
"""
import glob, json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = os.path.expanduser('~/Documents/temporary/mojo asset/asset kark mojo')
OUT = os.environ.get('KARK_OUT', '/tmp/kark')


def is_label(rgb, a, box, H):
    x0, y0, x1, y1 = box
    h, w = y1 - y0, x1 - x0
    if h > 0.075 * H:
        return False
    m = a[y0:y1, x0:x1] > 128
    px = rgb[y0:y1, x0:x1][m].astype(float)
    if not len(px):
        return True
    blue = ((px[:, 2] > 150) & (px[:, 0] < 120)).mean()
    white = (px.min(1) > 215).mean()
    if w > 1.6 * h and blue + white > 0.6:
        return True
    # light-blue pills with navy text ("SIDE VIEW", "EXCAVATOR TOP"): flat, wide, bbox well filled
    fill = m.mean()
    return w > 2.2 * h and h < 0.1 * H and fill > 0.7


PHASE2 = os.path.join(SRC, 'phase 2')


def sheets():
    """Phase 1 sheets (indices 0-13, never reorder: BANNED / TIDY / TURN_FORMS refer to them) then the phase 2
    sheets (2026-10-10, indices 14+). KARK_SRC replaces the phase 1 dir, KARK_SRC2 the phase 2 dir."""
    p1 = sorted(glob.glob(os.path.join(os.environ.get('KARK_SRC', SRC), '*.png')))
    p2 = sorted(glob.glob(os.path.join(os.environ.get('KARK_SRC2', PHASE2), '*.png')))
    return p1 + p2


def load_rgba(path):
    """RGBA of a sheet, or None for a sheet whose page was NOT removed (phase 2: catalog, 3x3 grid, topper lineup,
    nine-mode: white page + label pills; keying white eats the white van bodies, and every form on them is already
    in mojo-top / the alpha sheets, so they are skipped rather than keyed)."""
    im = Image.open(path)
    if im.mode == 'RGBA' and np.asarray(im)[..., 3].min() < 250:
        return im
    return None


def extract(path):
    im = load_rgba(path)
    if im is None:
        return []
    arr = np.asarray(im)
    a = arr[..., 3]
    H, W = a.shape
    # alpha > 128 with NO closing: the sheets pack sprites tightly and their soft halos touch, so any closing
    # merged neighbours (sheet 00 came out as 11 blobs instead of ~31); tiny detached bits are re-attached below
    solid = a > 128
    lab, n = ndi.label(solid)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if sl is None:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        area = int((lab[sl] == i).sum())
        if area < 0.0012 * H * W:
            continue
        box = [x0, y0, x1, y1]
        if is_label(arr[..., :3], a, box, H):
            continue
        crop = arr[y0:y1, x0:x1].copy()
        crop[..., 3] = np.where(lab[y0:y1, x0:x1] == i, crop[..., 3], 0)   # only this blob
        out.append((box, area, crop))
    # reading order: rows by centre y (tolerance = a fifth of the median height), then x
    hs = np.median([b[3] - b[1] for b, _, _ in out]) if out else 1
    out.sort(key=lambda t: (round(((t[0][1] + t[0][3]) / 2) / (hs * 0.6)), t[0][0]))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    comps = []
    for si, p in enumerate(sheets()):
        d = os.path.join(OUT, '%02d' % si)
        os.makedirs(d, exist_ok=True)
        for n, (box, area, crop) in enumerate(extract(p)):
            Image.fromarray(crop).save(os.path.join(d, '%03d.png' % n))
            comps.append({'sheet': si, 'name': os.path.basename(p), 'n': n, 'box': box, 'area': area})
        print('%02d %-50s %d sprites' % (si, os.path.basename(p)[:50], sum(1 for c in comps if c['sheet'] == si)))
    json.dump(comps, open(os.path.join(OUT, 'components.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
