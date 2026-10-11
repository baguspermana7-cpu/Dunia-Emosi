"""
Strip the baked white sticker ring (tools/mojo_outline.py) from PUBLISHED Mojo sprites, in place.

Owner, 2026-10-11: "Mojonya masih ada outline garis putih. Harusnya ganti yang clean asset" (earlier: "asset yang
saya kasih itu no background jadi tinggal crop dan nggak perlu ada outline putih").

Why in place: the outline was baked by nine ingest tools with sprite matching, crop boxes and anchors; re-running
them can swap sprites. The ring geometry is known exactly (mojo_outline.py), so it is removed from the file:
  * exterior = transparent pixels connected to the canvas border
  * band     = pixels within T px of the exterior (T = the widest ring mojo_outline draws: MAX_T + SHADOW_W + 1)
  * removed  = band pixels that are ring paint: white (all channels >= 244, any alpha) or the soft dark shadow
               (all channels <= 90, alpha < 220; webp shifts its colour), grown from the exterior only (a white highlight INSIDE the art
               that is not connected to the outside through ring pixels is kept)
  * the new 1-2 px edge is un-blended from white (colour-to-alpha), so the art's own anti-aliased rim, which
    mojo_outline composited over white, loses its pale halo
The canvas size is unchanged, so anchors, the RING scale table and every layout number stay valid.
A sprite with no ring (< 40% of its edge band white) is left byte-identical. Idempotent: a second run finds no ring.

    ~/.venvs/kokoro/bin/python tools/strip-mojo-ring.py [--dry] [dirs...]
"""
import sys
import glob
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

LIB = Path(__file__).resolve().parent.parent / 'assets' / 'db' / 'lib'
DIRS = ['mojo-top', 'mojo-char', 'mojo-hero', 'mojo-form', 'mojo-rear', 'mojo-turn', 'mojo-train', 'mojo-cross']   # + the sticker library, see the file list in the 2026-10-11 commit
BAND = 8 + 2 + 2


def exterior_of(alpha):
    tr = alpha < 8
    lab, _ = ndimage.label(tr)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(border))


def strip(a):
    rgb = a[..., :3].astype(int)
    al = a[..., 3].astype(int)
    ext = exterior_of(al)
    dist = ndimage.distance_transform_edt(~ext)
    band = (dist > 0) & (dist <= BAND)
    white = (rgb.min(axis=2) >= 244)
    dark = (rgb.max(axis=2) <= 90) & (al < 220)
    grey_aa = (al < 235) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 30)   # the shadow-to-white anti-aliased step
    paint = band & (white | dark | grey_aa)
    if band.sum() == 0:
        return None
    edge = band & (dist <= 3) & (al > 0)
    if edge.sum() == 0 or (edge & paint).sum() / edge.sum() < 0.4:
        return None
    # grow from the exterior through ring paint only
    removed = ndimage.binary_propagation(ext & False | (paint & ndimage.binary_dilation(ext)), mask=paint)
    out = a.copy()
    out[removed, 3] = 0
    out[removed, :3] = 0
    # un-blend the new rim from white (colour-to-alpha), 2 px deep
    ext2 = ext | removed
    d2 = ndimage.distance_transform_edt(~ext2)
    rim = (d2 > 0) & (d2 <= 2) & (out[..., 3] > 0)
    c = out[..., :3].astype(float)
    mn = c.min(axis=2)
    a_w = np.clip((255.0 - mn) / 255.0, 0, 1)
    pale = rim & (mn > 170)
    k = np.where(pale, np.maximum(a_w, 1e-3), 1.0)
    for ch in range(3):
        v = np.where(pale, (c[..., ch] - (1 - k) * 255.0) / k, c[..., ch])
        out[..., ch] = np.clip(v, 0, 255).astype(np.uint8)
    out[..., 3] = np.where(pale, (out[..., 3] * a_w).astype(np.uint8), out[..., 3])
    return out, int(removed.sum())


def main():
    dry = '--dry' in sys.argv
    dirs = [d for d in sys.argv[1:] if not d.startswith('--')] or DIRS
    tot = changed = 0
    for d in dirs:
        n = 0
        for f in sorted(glob.glob(str(LIB / d / '**' / '*.webp'), recursive=True)):
            tot += 1
            im = Image.open(f)
            a = np.array(im.convert('RGBA'))
            r = strip(a)
            if not r:
                continue
            out, px = r
            n += 1
            changed += 1
            if not dry:
                Image.fromarray(out, 'RGBA').save(f, 'WEBP', quality=90, method=6)
        print(f'{d:12s} stripped {n}')
    print(f'{changed}/{tot} sprites stripped' + (' (dry run)' if dry else ''))


if __name__ == '__main__':
    main()


def reseat(path, base):
    """After the ring under the wheels is gone, the art's contact row sits above the recorded anchor baseline:
    move the pixels down so the wheels touch the baseline again (canvas, anchors and layout unchanged)."""
    a = np.array(Image.open(path).convert('RGBA'))
    rows = np.nonzero((a[..., 3] >= 128).sum(1) >= 2)[0]
    dy = int(base) - int(rows[-1])
    if dy <= 0:
        return 0
    out = np.zeros_like(a)
    out[dy:] = a[:-dy]
    Image.fromarray(out, 'RGBA').save(path, 'WEBP', quality=90, method=6)
    return dy
