#!/usr/bin/env python3
"""Clean the 81 math-battle monster sprites in assets/math/monsters/mon-*.webp.

Each mon-*.webp is a transparent-bg creature cropped from a numbered 10x10 source
sheet. The crop left behind a small grid-cell number label (e.g. "1-2", "10-4")
as a DISCONNECTED dark glyph cluster in the TOP-LEFT strip, plus ragged cut edges
with no outline.

This tool (idioms borrowed from tools/crop-db-sheets.py):
  1. Loads RGBA, builds an alpha mask (>30).
  2. Connected-components. The creature is the single large blob (+ any large
     real parts like limbs/eyes). Number glyphs are SMALL components sitting in
     the top label strip.
  3. Drops a component only if it is BOTH small (< KEEP_PCT of the largest) AND
     sits in the top-left label strip (top edge above TOP_STRIP, centroid left of
     LEFT_HALF). Everything else (real body parts, top-right horns/ears, mid-frame
     eyes/sparkles) is KEPT. Large secondary parts are always kept.
  4. Autocrops tight to the kept bbox with a small pad.
  5. De-fringes the semi-transparent white halo.
  6. Adds a thin white sticker outline that also masks the ragged cut edge.
  7. Overwrites the SAME path as WebP quality 88.

Run:  python3 tools/crop-math-monsters.py
"""
import os, glob, re
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

MON_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "math", "monsters")
MON_DIR = os.path.abspath(MON_DIR)

ALPHA_THRESH = 30      # alpha above this = solid pixel
KEEP_PCT     = 0.06    # component >= 6% of the largest is always kept (real part)
TOP_STRIP    = 0.16    # label glyphs live with their TOP edge above this fraction
LEFT_HALF    = 0.60    # ...and centroid left of this fraction (labels are left-aligned)
PAD          = 6       # autocrop pad
RING         = 2       # outline half-width (2 -> ~5px MaxFilter)


def clean_monster(path):
    """Return (out_image, stats_dict) or (None, stats) if nothing usable."""
    im = Image.open(path).convert("RGBA")
    arr = np.array(im)
    H, W = arr.shape[:2]
    alpha = arr[:, :, 3]
    mask = alpha > ALPHA_THRESH

    lbl, n = ndimage.label(mask)
    if n == 0:
        return None, {"components": 0, "dropped": 0, "kept": 0, "touching": False}

    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    big = sizes.max()
    main_lab = int(np.argmax(sizes)) + 1

    keep_labels = []
    dropped = []
    for i in range(n):
        lab = i + 1
        s = sizes[i]
        pct = s / big
        if lab == main_lab or pct >= KEEP_PCT:
            keep_labels.append(lab)          # main blob or large real part
            continue
        # small component -> is it a label glyph (top-left strip)?
        ys, xs = np.where(lbl == lab)
        top_y = ys.min() / H
        cx = xs.mean() / W
        cy = ys.mean() / H
        if top_y < TOP_STRIP and cx < LEFT_HALF and cy < TOP_STRIP:
            dropped.append((lab, int(s)))    # number label -> drop
        else:
            keep_labels.append(lab)          # keep sparkles/eyes/features

    fg = np.isin(lbl, keep_labels)
    new_alpha = fg.astype(np.uint8) * 255
    if new_alpha.max() == 0:
        return None, {"components": n, "dropped": len(dropped), "kept": 0, "touching": False}

    # detect a label glyph physically TOUCHING the creature: a dark, glyph-shaped
    # region inside the kept main blob's top-left corner would be merged into `big`.
    touching = _label_touches_creature(arr, lbl, main_lab, H, W)

    # de-fringe: soft blur then high re-threshold to shave the semi-white halo
    a_img = Image.fromarray(new_alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    new_alpha = np.where(np.array(a_img) > 150, 255, 0).astype(np.uint8)

    out = arr.copy()
    out[:, :, 3] = new_alpha
    spr = Image.fromarray(out, "RGBA")
    bbox = spr.getbbox()
    if not bbox:
        return None, {"components": n, "dropped": len(dropped), "kept": len(keep_labels), "touching": touching}
    spr = spr.crop(bbox)

    final = add_outline(spr, pad=PAD, ring=RING)
    return final, {
        "components": n,
        "dropped": len(dropped),
        "kept": len(keep_labels),
        "dropped_areas": [d[1] for d in dropped],
        "touching": touching,
        "out_size": final.size,
    }


def _label_touches_creature(arr, lbl, main_lab, H, W):
    """Heuristic: within the main blob, is there a dark glyph-ish patch confined to
    the top-left corner (a number baked ONTO the creature)? Reports for manual review;
    does NOT erase creature pixels."""
    corner = np.zeros((H, W), bool)
    corner[: int(H * TOP_STRIP), : int(W * LEFT_HALF)] = True
    inside = (lbl == main_lab) & corner
    if inside.sum() < 30:
        return False
    rgb = arr[:, :, :3].astype(np.int16)
    lum = rgb.mean(axis=2)
    dark = (lum < 70) & inside          # number glyphs are near-black
    # a real dark antenna/outline is thin & connected to the body edge; a baked
    # number is a compact dark cluster of a few dozen px high in the corner only.
    if dark.sum() < 40:
        return False
    ys, xs = np.where(dark)
    # cluster confined to a small corner box => suspicious baked label
    span_y = (ys.max() - ys.min()) / H
    span_x = (xs.max() - xs.min()) / W
    return span_y < 0.14 and span_x < 0.30 and dark.sum() > 60


def add_outline(spr, pad=PAD, ring=RING):
    """Thin white sticker outline around the alpha silhouette (crop-db-sheets idiom)."""
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
    paths = glob.glob(os.path.join(MON_DIR, "mon-*.webp"))
    paths.sort(key=lambda p: int(re.search(r"mon-(\d+)\.webp$", p).group(1)))
    processed = 0
    with_label = 0
    single_comp = []      # only 1 component -> no label to drop
    touching = []         # label merged into creature -> manual review
    suspicious = []       # very small output
    failed = []
    for p in paths:
        name = os.path.basename(p)
        out, st = clean_monster(p)
        if out is None:
            failed.append(name)
            continue
        out.save(p, "WEBP", quality=88, method=6)
        processed += 1
        if st["dropped"] > 0:
            with_label += 1
        if st["components"] == 1:
            single_comp.append(name)
        if st.get("touching"):
            touching.append(name)
        w, h = st["out_size"]
        if w < 40 or h < 40:
            suspicious.append(f"{name}({w}x{h})")

    print(f"processed:        {processed}/{len(paths)}")
    print(f"labels removed:   {with_label}")
    print(f"single component: {len(single_comp)}  {single_comp}")
    print(f"touching-label(manual review): {len(touching)}  {touching}")
    print(f"suspicious(<40px): {len(suspicious)}  {suspicious}")
    print(f"failed:           {len(failed)}  {failed}")


if __name__ == "__main__":
    run()
