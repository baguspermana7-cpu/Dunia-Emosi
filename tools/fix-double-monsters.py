#!/usr/bin/env python3
"""Fix math-battle monster sprites that contain TWO creatures merged into one image.

A prior keep-large-components crop grabbed two adjacent source-grid creatures into
one mon-*.webp (owner: "ada yang 2 monster bertumpuk keluarnya"). This tool takes an
explicit list of offending sprites, separates the two creatures, keeps ONLY ONE
(the single largest connected alpha component after a light erosion to break the
thin bridge between them), drops the other, then re-cleans it: de-fringe halo,
autocrop, thin white sticker outline, WebP q88 — overwriting in place.

Idioms borrowed from tools/crop-math-monsters.py (add_outline, de-fringe, alpha mask).

Only the sprites named in DOUBLES are touched. Clean/single sprites are left alone.

Run:  python3 tools/fix-double-monsters.py
"""
import os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

MON_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "math", "monsters")
MON_DIR = os.path.abspath(MON_DIR)

# Sprites confirmed (by montage inspection) to contain two stacked/adjacent creatures.
DOUBLES = ["mon-29.webp", "mon-30.webp", "mon-38.webp"]

ALPHA_THRESH = 30      # alpha above this = a foreground pixel (incl. soft halo)
CORE_THRESH  = 90      # solid body pixel (halo excluded) for separating creatures
ERODE_ITERS  = 4       # break the thin bridge / shared halo between the two creatures
MIN_COMP     = 400     # ignore dust components below this many px
PAD          = 6       # autocrop pad
RING         = 2       # outline half-width (2 -> ~5px MaxFilter)


def separate_and_keep_one(path):
    """Load the doubled sprite, keep only the single largest creature.

    Returns (out_image, stats) or (None, stats).
    """
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    H, W = arr.shape[:2]

    core = arr[:, :, 3] > CORE_THRESH
    eroded = ndimage.binary_erosion(core, iterations=ERODE_ITERS)
    lbl, n = ndimage.label(eroded)
    if n == 0:
        return None, {"components": 0}

    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    order = np.argsort(sizes)[::-1]
    big_labels = [int(order[k]) + 1 for k in range(len(order)) if sizes[order[k]] >= MIN_COMP]
    if not big_labels:
        return None, {"components": n}

    # keep the SINGLE largest creature core, then grow it back (undo the erosion)
    # and reclaim any full-alpha pixels reachable from it — so we recover the whole
    # creature (limbs/eyes/halo) WITHOUT re-absorbing the dropped neighbour.
    keep = big_labels[0]
    seed = (lbl == keep)
    grown = ndimage.binary_dilation(seed, iterations=ERODE_ITERS + 2)

    # reclaim the true creature: connected-component of the FULL mask, take only
    # blobs that overlap the grown seed (this pulls back soft-alpha edges the
    # erosion shaved, but not the other creature which sits in its own blob).
    full = arr[:, :, 3] > ALPHA_THRESH
    flbl, fn = ndimage.label(full)
    overlap_labels = set(np.unique(flbl[grown & (flbl > 0)]).tolist())
    creature = np.isin(flbl, list(overlap_labels)) if overlap_labels else grown

    kept_px = int(creature.sum())
    dropped_px = int(full.sum()) - kept_px

    new_alpha = np.where(creature, arr[:, :, 3], 0).astype(np.uint8)

    # de-fringe: soft blur then high re-threshold to shave the semi-white halo
    a_img = Image.fromarray(new_alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    new_alpha = np.where(np.array(a_img) > 150, np.array(a_img), 0).astype(np.uint8)

    out = arr.copy()
    out[:, :, 3] = new_alpha
    spr = Image.fromarray(out, "RGBA")
    bbox = spr.getbbox()
    if not bbox:
        return None, {"components": n}
    spr = spr.crop(bbox)

    final = add_outline(spr, pad=PAD, ring=RING)
    return final, {
        "components": n,
        "big_components": len(big_labels),
        "kept_px": kept_px,
        "dropped_px": dropped_px,
        "out_size": final.size,
    }


def add_outline(spr, pad=PAD, ring=RING):
    """Thin white sticker outline around the alpha silhouette (crop-math-monsters idiom)."""
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
    rr[:, :, 3] = (ra * 0.82).astype(np.uint8)
    ring_layer = Image.fromarray(rr, "RGBA")
    canvas.alpha_composite(ring_layer, (pad, pad))
    canvas.alpha_composite(spr, (pad, pad))
    return canvas


def run():
    fixed, failed = [], []
    for name in DOUBLES:
        p = os.path.join(MON_DIR, name)
        if not os.path.exists(p):
            failed.append(f"{name}(missing)")
            continue
        before = Image.open(p).size
        out, st = separate_and_keep_one(p)
        if out is None:
            failed.append(f"{name}(no-blob)")
            continue
        out.save(p, "WEBP", quality=88, method=6)
        fixed.append(name)
        print(f"{name}: {before[0]}x{before[1]} -> {st['out_size'][0]}x{st['out_size'][1]}  "
              f"kept={st['kept_px']}px dropped={st['dropped_px']}px comps={st['components']}")
    print(f"\nfixed: {len(fixed)} {fixed}")
    print(f"failed: {len(failed)} {failed}")


if __name__ == "__main__":
    run()
