#!/usr/bin/env python3
"""Crop the owner's newly-generated sprite sheets into per-item WebP.

Reuses the pipeline idiom of tools/crop-db-sheets.py:
  pure-white-bg border-flood removal -> keep-large connected components
  -> de-fringe halo -> thin white sticker outline -> autocrop -> WebP q88.

Two sheet families here (NOT the plain 10x10 square of crop-db-sheets.py):

  Gemini sheets  (2816x1536)  = 18 columns x 6 rows = 108 cells.
    Each cell is TALL (156 x 256): an icon in the top ~square region and a
    1-2 line text label BELOW it on pure white. We crop only the top icon
    zone (ICON_FRAC of the cell height) so the label never enters the
    connected-component step, and to dodge vertical bleed from neighbours.

  ChatGPT sheets (1254x1254)  = 10 columns x 10 rows = 100 cells.
    Each cell is ~square (125 x 125): icon in the top ~78% with a single-line
    numbered label at the bottom. We trim the bottom label band.

Run:  python3 tools/crop-new-sheets.py            # all
      python3 tools/crop-new-sheets.py words count # subset by category
"""
import sys, os, json
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = "/home/baguspermana7/Documents/temporary/game asset/1"
OUT = "assets/db"
MAXPX = 200

# category : dict(file, cols, rows, icon_frac, [x_frac], [y_off_frac])
#   icon_frac  = fraction of the cell HEIGHT (from the top) kept as the icon zone
#                (drops the label band underneath)
#   x_frac     = fraction of the cell WIDTH kept (centered) to trim side bleed
#   y_off_frac = top offset (fraction of cell height) skipped before the icon zone
SHEETS = {
  "words":     dict(file="Gemini_db-words-extra-100.png", cols=18, rows=6,
                    icon_frac=0.66, x_frac=1.0, y_off=0.03, label_strip=0.10, x_pad=0.30),
  "count":     dict(file="Gemini_db-count-100.png", cols=18, rows=6,
                    icon_frac=0.66, x_frac=1.0, y_off=0.03, label_strip=0.10, x_pad=0.30),
  "breathe":   dict(file="Gemini_db-breathe-100.png", cols=18, rows=6,
                    icon_frac=0.66, x_frac=1.0, y_off=0.03, label_strip=0.10, x_pad=0.30),
  "vehicles2": dict(file="Gemini_db-road2-100.png", cols=18, rows=6,
                    icon_frac=0.66, x_frac=1.0, y_off=0.03, label_strip=0.10, x_pad=0.30),
  "science2":  dict(file="Gemini_db-sci2-100.png", cols=18, rows=6,
                    icon_frac=0.66, x_frac=1.0, y_off=0.03, label_strip=0.10, x_pad=0.30),
  "faces2":    dict(file="Gemini_db-faces2-100.png", cols=18, rows=6,
                    icon_frac=0.66, x_frac=1.0, y_off=0.03, label_strip=0.10, x_pad=0.30),
  # ChatGPT square sheets (10x10, numbered labels)
  "faces2b":   dict(file="ChatGPT db-faces2-100.png", cols=10, rows=10,
                    icon_frac=0.76, x_frac=0.98, y_off=0.02, label_strip=0.12),
  "letters":   dict(file="ChatGPT _db-letters-100.png", cols=10, rows=10,
                    icon_frac=0.76, x_frac=0.98, y_off=0.02, label_strip=0.12),
}


def process_cell(cell, label_strip=0.0, center_x=None):
    """cell: RGBA PIL image already cropped to the ICON zone (no label).
    label_strip: fraction of the crop HEIGHT at the bottom that may still hold
    label text; non-main components centred inside it are dropped.
    center_x: if set (0..1), the crop overlaps neighbour columns; the target
    icon is the LARGE blob whose centroid is nearest this x (not simply the
    biggest, which could be a neighbour's half-icon).
    Returns bordered, cropped RGBA or None if empty."""
    arr = np.array(cell.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    # near-white candidate bg
    near_white = (rgb[:, :, 0] > 236) & (rgb[:, :, 1] > 236) & (rgb[:, :, 2] > 236)
    # flood from border: label white regions, kill those touching the border
    lbl, n = ndimage.label(near_white)
    border_labels = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border_labels.discard(0)
    bg = np.isin(lbl, list(border_labels))
    alpha = (~bg).astype(np.uint8) * 255
    # keep foreground connected components
    fl, fn = ndimage.label(alpha > 0)
    if fn == 0:
        return None
    sizes = ndimage.sum(np.ones_like(fl), fl, range(1, fn + 1))
    biggest = int(np.argmax(sizes)) + 1
    if center_x is not None:
        # among large-ish blobs, pick the one whose centroid is nearest center_x;
        # a neighbour's half-icon is off-centre (near a crop edge) -> not picked
        cxs = ndimage.mean(
            np.tile(np.arange(w), (h, 1)), fl, range(1, fn + 1)) / w
        target_x = center_x
        best = None; best_d = 1e9
        maxs = sizes.max()
        for i in range(fn):
            if sizes[i] < maxs * 0.30:   # ignore small fragments as anchor
                continue
            d = abs(cxs[i] - target_x)
            if d < best_d:
                best_d = d; best = i + 1
        keep = best if best is not None else biggest
    else:
        keep = biggest
    big = sizes[keep - 1]
    # main-blob bbox — the real icon. Secondary parts must sit close to it;
    # card-panel frame lines and neighbour bleed are far away / thin strips.
    mys, mxs = np.where(fl == keep)
    mx0, mx1 = mxs.min(), mxs.max()
    my0, my1 = mys.min(), mys.max()
    # allow a margin around the main blob equal to ~30% of its own extent
    mgx = max(6, (mx1 - mx0) * 0.30)
    mgy = max(6, (my1 - my0) * 0.30)
    keep_labels = []
    for i, s in enumerate(sizes):
        lab = i + 1
        if lab == keep:
            keep_labels.append(lab); continue
        if s < max(20, big * 0.04):
            continue
        ys, xs = np.where(fl == lab)
        bx0, bx1 = xs.min(), xs.max()
        by0, by1 = ys.min(), ys.max()
        bw, bh = bx1 - bx0 + 1, by1 - by0 + 1
        fill = s / float(bw * bh)  # how much of its bbox the blob fills
        # thin frame/separator line, or an L-shaped card edge: very elongated,
        # or a large bbox that is mostly empty (a hairline outline) -> drop
        if (bw <= 3 or bh <= 3) or (max(bw, bh) / max(1, min(bw, bh)) > 8):
            continue
        if fill < 0.16 and s < big * 0.5:
            continue
        # neighbour half-icon hugging a crop side edge -> bleed, drop
        if center_x is not None and (bx0 <= 1 or bx1 >= w - 2):
            continue
        # proximity: the part's bbox must be within margin of the main blob bbox
        near_x = (bx1 >= mx0 - mgx) and (bx0 <= mx1 + mgx)
        near_y = (by1 >= my0 - mgy) and (by0 <= my1 + mgy)
        if not (near_x and near_y):
            continue
        # bottom label strip: a non-main blob wholly inside the label band -> label text
        cy = ys.mean() / h
        if label_strip > 0 and cy > (1.0 - label_strip) and by0 / h > (1.0 - label_strip - 0.05):
            continue
        # label fragment: sits ENTIRELY below the icon body (its top is below the
        # main blob's bottom) -> it is label text that crept into the icon zone
        if by0 > my1 + max(2, (my1 - my0) * 0.05):
            continue
        # label fragment from the row ABOVE bleeding into the top of this crop:
        # sits ENTIRELY above the icon body -> drop
        if by1 < my0 - max(2, (my1 - my0) * 0.05):
            continue
        keep_labels.append(lab)
    fg = np.isin(fl, keep_labels)
    alpha = (fg.astype(np.uint8)) * 255
    if alpha.max() == 0:
        return None
    # soft de-fringe: slight blur on alpha edge then re-threshold high to shave halo
    a_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.array(a_img)
    alpha = np.where(alpha > 150, 255, 0).astype(np.uint8)
    out = arr.copy(); out[:, :, 3] = alpha
    spr = Image.fromarray(out, "RGBA")
    bbox = spr.getbbox()
    if not bbox:
        return None
    spr = spr.crop(bbox)
    return add_border(spr)


def add_border(spr, pad=4, ring=2):
    """Add a thin light 'sticker' outline around the alpha silhouette."""
    spr = spr.convert("RGBA")
    w, h = spr.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    a = spr.split()[3]
    dil = a.filter(ImageFilter.MaxFilter(2 * ring + 1))
    ra = np.array(dil)
    rr = np.zeros((h, w, 4), np.uint8)
    rr[:, :, 0] = 255; rr[:, :, 1] = 255; rr[:, :, 2] = 255
    rr[:, :, 3] = (ra * 0.82).astype(np.uint8)
    ring_layer = Image.fromarray(rr, "RGBA")
    canvas.alpha_composite(ring_layer, (pad, pad))
    canvas.alpha_composite(spr, (pad, pad))
    return canvas


def run(cats):
    manifest = {}
    for cat in cats:
        cfg = SHEETS[cat]
        sheet = Image.open(os.path.join(SRC, cfg["file"])).convert("RGBA")
        W, H = sheet.size
        cols, rows = cfg["cols"], cfg["rows"]
        cw, ch = W / cols, H / rows
        icon_frac = cfg["icon_frac"]
        x_frac = cfg.get("x_frac", 1.0)
        y_off = cfg.get("y_off", 0.0)
        d = os.path.join(OUT, cat); os.makedirs(d, exist_ok=True)
        made = 0; empty = []
        for r in range(rows):
            for c in range(cols):
                idx = r * cols + c + 1
                x0 = c * cw; y0 = r * ch
                xpad = cfg.get("x_pad", 0.0) * cw   # overlap into neighbour cols
                # icon zone: top band of the cell, widened, top-offset
                ix0 = x0 + cw * (1 - x_frac) / 2 - xpad
                ix1 = x0 + cw * (1 + x_frac) / 2 + xpad
                iy0 = y0 + ch * y_off
                iy1 = y0 + ch * icon_frac
                ix0 = max(0, ix0); ix1 = min(W, ix1)
                cell = sheet.crop((int(round(ix0)), int(round(iy0)),
                                   int(round(ix1)), int(round(iy1))))
                # cell-centre in crop coords (for picking the right icon when the
                # crop overlaps neighbours)
                ccx = ((c + 0.5) * cw - ix0) / (ix1 - ix0)
                res = process_cell(cell, label_strip=cfg.get("label_strip", 0.0),
                                   center_x=ccx if xpad > 0 else None)
                if res is None:
                    empty.append(idx); continue
                res.thumbnail((MAXPX, MAXPX), Image.LANCZOS)
                res.save(os.path.join(d, f"{idx:03d}.webp"), "WEBP", quality=88, method=6)
                made += 1
        manifest[cat] = {"count": made, "empty": empty, "cols": cols, "rows": rows}
        print(f"{cat:10s} made={made}/{cols*rows} empty={empty}")
    return manifest


if __name__ == "__main__":
    cats = sys.argv[1:] if len(sys.argv) > 1 else list(SHEETS)
    m = run(cats)
    mpath = os.path.join(OUT, "manifest.json")
    existing = {}
    if os.path.exists(mpath):
        existing = json.load(open(mpath))
    existing.update(m)
    os.makedirs(OUT, exist_ok=True)
    json.dump(existing, open(mpath, "w"), indent=2)
    print("manifest updated")
