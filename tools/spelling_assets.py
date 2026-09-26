"""
G27 Spelling Adventure -- asset exporter.

Screen backdrops are NOT made here: they are the owner's scene sheet, cut and
upscaled by tools/spelling_scenes.py into assets/spelling/scenes/.

Run with the venv that has pillow + scipy:
    ~/.venvs/kokoro/bin/python tools/spelling_assets.py

SOURCES: the owner's two sheets in tools/spelling-src/ (kept in the repo so a
re-export is reproducible). Components on sheet 2 are found by connected-
component labelling; their boxes are pinned in sheet2-components.json so the
indices below stay stable.

WHY THE EDGE IS MATTED, NOT JUST MASKED
  The first export took alpha straight from the component mask. Anti-aliased
  rim pixels were blended with the WHITE sheet, so they kept alpha 255 and
  painted a white halo around every sprite -- measured 10-35% of the outer rim
  (black splat worst). It was invisible on a white test background and glaring
  on the game's sky.

  A global white colour-key is the documented wrong fix: it hollows out white
  bodies (the white splat, paper, the window). So the interior keeps alpha 1,
  and only the outer RIM band is matted -- each rim pixel is solved against the
  colour of the NEAREST INTERIOR pixel, not against "white":
      P = a*C + (1-a)*W   ->   a = |P-W| / |C-W|
  which stays stable for yellow and for near-white objects too.
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'tools', 'spelling-src')
OUT = os.path.join(ROOT, 'assets', 'spelling')
W = np.array([255.0, 255.0, 255.0])
RIM = 3


def ink_mask(A):
    """non-white pixels of a white-background sheet"""
    return (A.max(axis=2) < 246) | (A.max(axis=2) - A.min(axis=2) > 16)


def matte(rgb, mask):
    """rgb: HxWx3 float, mask: HxW bool (component, holes filled) -> RGBA uint8"""
    interior = ndi.binary_erosion(mask, iterations=RIM)
    if not interior.any():
        interior = mask
    rim = mask & ~interior
    alpha = mask.astype(np.float64)
    out = rgb.copy()
    # colour of the nearest interior pixel, for every pixel
    _, (iy, ix) = ndi.distance_transform_edt(~interior, return_indices=True)
    C = rgb[iy, ix]
    dCW = np.linalg.norm(C - W, axis=2)
    dPW = np.linalg.norm(rgb - W, axis=2)
    a = np.clip(dPW / np.maximum(dCW, 1e-6), 0.0, 1.0)
    # near-white objects: |C-W| tiny, the ratio is unstable. There, keep the
    # mask but drop only rim pixels that are essentially paper white.
    stable = dCW > 40
    a = np.where(stable, a, np.where(dPW > 10, 1.0, 0.0))
    alpha = np.where(rim, a, alpha)
    # un-premultiply the white out of the rim colour
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmix = (rgb - (1.0 - alpha)[..., None] * W) / safe
    out = np.where(rim[..., None], np.clip(unmix, 0, 255), rgb)
    alpha = np.where(alpha < 0.04, 0.0, alpha)        # kill dust
    return np.dstack([out, alpha * 255.0]).round().astype(np.uint8)


def save(rgba, folder, name):
    d = os.path.join(OUT, folder)
    os.makedirs(d, exist_ok=True)
    p = os.path.join(d, name + '.webp')
    Image.fromarray(rgba, 'RGBA').save(p, 'WEBP', quality=92, method=6)
    return p


def component(lab, box, rgb=None, want=None, ink=None):
    """The component's mask, from raw ink, with enclosed holes filled."""
    x0, y0, x1, y1 = box
    sub = lab[y0:y1, x0:x1]
    if want is None:
        vals, cnt = np.unique(sub[sub > 0], return_counts=True)
        want = int(vals[np.argmax(cnt)])
    own = sub == want
    # Closing is only for LABELLING (it keeps a splat and its droplets one
    # component). The alpha must come from the raw ink: closing also bridged
    # the paper between a droplet and the body, and that paper showed up as
    # white specks on the black splat.
    if ink is not None:
        own = own & ink[y0:y1, x0:x1]
    # Fill ENCLOSED holes only: the white body of the marker, window glass,
    # paper. A rule that dropped "white pockets in dark objects" was tried and
    # removed -- it hollowed the marker's white body (blue-dominant object,
    # white interior), the exact white-bodies-go-hollow trap. It was also
    # unnecessary: with alpha from raw ink, the paper between a splat's
    # droplets is open to the outside, so fill_holes never touches it.
    return ndi.binary_fill_holes(own)


def export_sheet2(made):
    im = Image.open(os.path.join(SRC, 'sheet2.png')).convert('RGB')
    A = np.asarray(im).astype(np.float64)
    INK = ink_mask(A.astype(np.int16))
    NW = ndi.binary_closing(INK, structure=np.ones((3, 3)))
    lab, _ = ndi.label(NW, structure=np.ones((3, 3)))
    B = json.load(open(os.path.join(SRC, 'sheet2-components.json')))
    MAP = json.load(open(os.path.join(SRC, 'sheet2-map.json')))
    for k, (folder, name) in MAP.items():
        box = B[int(k)]
        x0, y0, x1, y1 = box
        m = component(lab, box, A[y0:y1, x0:x1], ink=INK)
        made.append(save(matte(A[y0:y1, x0:x1], m), folder, name))
    # brown + black splats touch on the sheet: split on their internal gap
    x0, y0, x1, y1 = B[84]
    m = component(lab, B[84], A[y0:y1, x0:x1], ink=INK)
    col = m.sum(axis=0)
    lo = len(col) // 3
    mid = int(np.argmin(col[lo:2 * len(col) // 3]) + lo)
    for name, (a, b) in (('brown', (0, mid)), ('black', (mid, x1 - x0))):
        sm = ndi.binary_fill_holes(m[:, a:b])
        made.append(save(matte(A[y0:y1, x0 + a:x0 + b], sm), 'color', name))


def export_category_icons(made):
    """Sheet 1 cards are pastel tiles with a baked label. Take ONLY the
    illustration: flood the card's own background from its inner border
    (connected, so the picture is never keyed out), drop the label band,
    keep the largest remaining blob."""
    im = Image.open(os.path.join(SRC, 'sheet1.png')).convert('RGB')
    A = np.asarray(im).astype(np.float64)
    boxes = json.load(open(os.path.join(SRC, 'sheet1-boxes.json')))['cats']
    names = ['colors', 'school', 'everyday', 'athome', 'quran', 'mixed']
    for (x0, y0, x1, y1), name in zip(boxes, names):
        card = A[y0:y1, x0:x1]
        h, w = card.shape[:2]
        pad = max(4, w // 14)
        inner = card[pad:h - pad, pad:w - pad]
        bg = np.median(np.concatenate([inner[0], inner[-1], inner[:, 0], inner[:, -1]]), axis=0)
        near = np.linalg.norm(inner - bg, axis=2) < 30
        seed = np.zeros_like(near)
        seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
        lab, _ = ndi.label(near)
        ids = np.unique(lab[seed & near])
        background = np.isin(lab, ids[ids > 0])
        obj = ~background
        obj[int(inner.shape[0] * 0.70):, :] = False          # the baked label
        obj = ndi.binary_opening(obj, iterations=1)
        cl, n = ndi.label(obj)
        if not n:
            print('  !! no illustration found in', name); continue
        sizes = ndi.sum(obj, cl, range(1, n + 1))
        keep = ndi.binary_fill_holes(cl == (int(np.argmax(sizes)) + 1))
        ys, xs = np.nonzero(keep)
        a0, a1, b0, b1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        rgb = inner[a0:a1, b0:b1]
        m = keep[a0:a1, b0:b1]
        # matte against the CARD colour, not white
        global W
        saveW, W = W, bg
        rgba = matte(rgb, m)
        W = saveW
        made.append(save(rgba, 'cat', name))


if __name__ == '__main__':
    made = []
    export_sheet2(made)
    export_category_icons(made)
    print(f'exported {len(made)} files')
