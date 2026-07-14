#!/usr/bin/env python3
"""Cut the owner-provided math HERO knight art out of its scenic background.

Owner supplied three full-scene renders (blue sky + mountains on top, green
grass below) each with ONE centered chibi knight:

  ~/Downloads/ksatria pengurangan.png  -> subtraction knight  (-)
  ~/Downloads/ksatria perkalian.png    -> multiplication knight (x)
  ~/Downloads/ksatria pembagian.png    -> division knight      (/)

The existing hero `assets/math/hero-mathhero.webp` (462x700, transparent bg,
thin white sticker outline) is the visual target. This tool matches that look:

  1. rembg (u2net) segments the single knight subject from the scenery. Chroma
     keying is unsafe here (the green cape overlaps the green grass, mountains
     vary in hue) so we use subject segmentation instead of colour flood.
  2. Keep only the LARGEST connected component of the mask (drops any stray
     specks rembg leaves in the grass/sky) -> no merged second subject.
  3. De-fringe: soft-blur the alpha then re-threshold high to shave the
     semi-transparent halo left at the cut edge (crop-math-monsters idiom).
  4. Autocrop tight to the subject with a small transparent pad.
  5. Resize to a common target HEIGHT (matches hero-mathhero's 700px weight),
     preserving aspect ratio, so all four heroes share the same visual size.
  6. Add a thin white sticker outline (crop-db-sheets / crop-math-monsters
     idiom) so the cutout reads as a sticker like the current hero.
  7. Save WebP quality 88 to assets/math/heroes/<name>.webp.

Run:  python3 tools/crop-math-heroes.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DL = os.path.expanduser("~/Downloads")
OUT_DIR = os.path.join(ROOT, "assets", "math", "heroes")

# (source png, output webp basename)
JOBS = [
    ("ksatria pengurangan.png", "pengurangan"),
    ("ksatria perkalian.png",   "perkalian"),
    ("ksatria pembagian.png",   "pembagian"),
]

ALPHA_THRESH = 30      # alpha above this = solid pixel
DEFRINGE_BLUR = 0.8    # gaussian sigma for halo softening
DEFRINGE_KEEP = 165    # re-threshold: pixels above this stay opaque
PAD = 8                # autocrop transparent pad (px, pre-resize scale)
TARGET_H = 700         # match hero-mathhero.webp height
RING = 2               # outline half-width (2 -> 5px MaxFilter)
OUTLINE_ALPHA = 0.82   # sticker outline opacity


def segment(path):
    """Return an RGBA PIL image of the knight on a transparent background."""
    from rembg import remove
    src = Image.open(path).convert("RGBA")
    cut = remove(src)  # rembg returns RGBA with subject alpha
    return cut.convert("RGBA")


def keep_largest(arr):
    """Zero every alpha pixel not in the largest connected component."""
    alpha = arr[:, :, 3]
    mask = alpha > ALPHA_THRESH
    lbl, n = ndimage.label(mask)
    if n == 0:
        return arr, 0
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    keep = lbl == main
    out = arr.copy()
    out[:, :, 3] = np.where(keep, alpha, 0)
    return out, n


def defringe(arr):
    """Soft-blur + high re-threshold to shave the semi-transparent halo."""
    a = arr[:, :, 3]
    a_img = Image.fromarray(a, "L").filter(ImageFilter.GaussianBlur(DEFRINGE_BLUR))
    new_a = np.where(np.array(a_img) > DEFRINGE_KEEP, a, 0).astype(np.uint8)
    out = arr.copy()
    out[:, :, 3] = new_a
    return out


def add_outline(spr, pad=PAD, ring=RING):
    """Thin white sticker outline around the alpha silhouette."""
    spr = spr.convert("RGBA")
    w, h = spr.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    a = spr.split()[3]
    dil = a.filter(ImageFilter.MaxFilter(2 * ring + 1))
    ra = np.array(dil)
    rr = np.zeros((h, w, 4), np.uint8)
    rr[:, :, 0] = 255
    rr[:, :, 1] = 255
    rr[:, :, 2] = 255
    rr[:, :, 3] = (ra * OUTLINE_ALPHA).astype(np.uint8)
    ring_layer = Image.fromarray(rr, "RGBA")
    canvas.alpha_composite(ring_layer, (pad, pad))
    canvas.alpha_composite(spr, (pad, pad))
    return canvas


def process(src_path):
    cut = segment(src_path)
    arr = np.array(cut)

    arr, ncomp = keep_largest(arr)
    arr = defringe(arr)

    spr = Image.fromarray(arr, "RGBA")
    bbox = spr.getbbox()
    if not bbox:
        raise RuntimeError("empty mask after segmentation")
    spr = spr.crop(bbox)

    # normalise height to the shared target, preserving aspect
    w, h = spr.size
    if h != TARGET_H:
        scale = TARGET_H / float(h)
        spr = spr.resize((max(1, round(w * scale)), TARGET_H), Image.LANCZOS)

    final = add_outline(spr)
    return final, {"components": ncomp, "size": final.size}


def run():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src_name, out_name in JOBS:
        src = os.path.join(DL, src_name)
        if not os.path.exists(src):
            print(f"MISSING SOURCE: {src}")
            continue
        out, st = process(src)
        dst = os.path.join(OUT_DIR, out_name + ".webp")
        out.save(dst, "WEBP", quality=88, method=6)
        w, h = st["size"]
        print(f"{out_name:14s} <- {src_name:26s} components={st['components']:3d} out={w}x{h}  -> {dst}")


if __name__ == "__main__":
    run()
