#!/usr/bin/env python3
"""Crop owner's named 10x10 monster sheets into assets/math/monsters/mon-N.webp.

Each sheet is 1254x1254 = 10 cols x 10 rows; every cell = one creature (top ~78%)
with a printed NAME label below it. We crop the top 80% of each cell (drops the
name band entirely), border-flood the near-white background to transparency
(interior white is PRESERVED, so white ghosts survive), keep the creature's
connected components, de-fringe the halo, add a thin white sticker outline, and
save as WebP q88.

Sheet 1 -> mon-82..181,  Sheet 2 -> mon-182..281.
Idioms borrowed from tools/crop-new-sheets.py.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

UP = "/home/baguspermana7/.claude/uploads/c58644e4-cfc2-4099-9de4-70f989a3b3f7"
OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "assets", "math", "monsters"))
SHEETS = [
    dict(file=os.path.join(UP, "69bebae7-1001131351.png"), start=82,  method="flood", white=236),  # mixed creatures
    dict(file=os.path.join(UP, "7ce28f5e-1001131352.png"), start=182, method="rembg"),              # WHITE ghosts (u2net-class segmentation)
]
COLS = ROWS = 10
CELL_TOP = 0.83   # keep only the top fraction of each cell (name text lives below)

# ---------------------------------------------------------------------------
# Sheet-2 GHOST path (mon-182..281): pale white ghosts on a near-white ground.
#
# These cells cannot be border-flooded (body ~252, bg ~254 — no threshold
# separates them) so we use a BEST-OF hybrid segmenter over two rembg models
# (isnet + u2net at 3x/4x) plus a cv2 corner-flood, scored for ghost-likeness.
#
# Crucially, the ghost sheet is NOT a uniform 125.4px grid: rows are ~132.6px
# and each row holds a creature followed by its printed NAME, separated by a
# small blank gap. GHOST_ROW_TOP / GHOST_SPLIT are the per-row creature band
# (detected from the sheet's blank separators) so the name text is cropped away
# BEFORE segmentation — the single biggest fix for the faceless-dome / leaked-
# name failures.
# ---------------------------------------------------------------------------
GHOST_COL_EDGES = [0, 126, 243, 375, 494, 616, 744, 864, 994, 1116, 1254]
GHOST_ROW_TOP   = [22, 157, 297, 424, 554, 692, 823, 950, 1057, 1172]
GHOST_SPLIT     = [115, 249, 382, 517, 648, 779, 906, 1028, 1143, 1236]

_GSESS = {}
def _gsession(name):
    if name not in _GSESS:
        from rembg import new_session
        _GSESS[name] = new_session(name)
    return _GSESS[name]


def ghost_creature_cell(sheet_rgb, r, c):
    """Crop just the creature (name excluded) at grid position (r, c)."""
    x0, x1 = GHOST_COL_EDGES[c], GHOST_COL_EDGES[c + 1]
    y0, y1 = GHOST_ROW_TOP[r], GHOST_SPLIT[r]
    return sheet_rgb.crop((x0 + 4, y0, x1 - 4, y1))


def _g_largest_cc(mask):
    lbl, n = ndimage.label(mask)
    if n == 0:
        return None
    sizes = ndimage.sum(np.ones_like(lbl), lbl, range(1, n + 1))
    return lbl == (int(np.argmax(sizes)) + 1)


def _g_keep_near(mask, seed, gxf=0.18, gyf=0.18):
    lbl, n = ndimage.label(mask)
    if n == 0:
        return mask
    sy, sx = np.where(seed)
    if len(sy) == 0:
        return mask
    y0, y1, x0, x1 = sy.min(), sy.max(), sx.min(), sx.max()
    gx = max(5, (x1 - x0) * gxf); gy = max(5, (y1 - y0) * gyf)
    seed_big = int(seed.sum())
    keep = np.zeros_like(mask)
    for lab in range(1, n + 1):
        comp = lbl == lab
        if (comp & seed).any():
            keep |= comp; continue
        cy, cx = np.where(comp)
        if comp.sum() < max(25, seed_big * 0.015):
            continue
        if (cx.max() >= x0 - gx and cx.min() <= x1 + gx and
                cy.max() >= y0 - gy and cy.min() <= y1 + gy):
            keep |= comp
    return keep


def _g_score(mask, H, W):
    ys, xs = np.where(mask)
    if len(ys) == 0:
        return -1e9
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    bw = x1 - x0 + 1; bh = y1 - y0 + 1
    area = int(mask.sum())
    aspect = bw / bh; hfrac = bh / H; wfrac = bw / W
    fill = area / (bw * bh)
    s = 0.0
    if 0.55 <= aspect <= 1.4: s += 3.5
    elif 0.42 <= aspect <= 1.7: s += 1.0
    else: s -= 5.0
    if hfrac >= 0.62: s += 3.0
    elif hfrac >= 0.5: s += 1.5
    elif hfrac >= 0.4: s -= 1.0
    else: s -= 5.0
    if wfrac > 0.88 and hfrac < 0.45: s -= 6.0
    if fill >= 0.93 and wfrac >= 0.93 and hfrac >= 0.93: s -= 8.0  # whole-frame grab
    if fill >= 0.45: s += 1.5
    elif fill < 0.16: s -= 3.0
    if area < 0.05 * H * W: s -= 4.0
    s += min(area / (H * W) * 4, 2.0)
    return s


def _g_recover_face(body, rgb, dark=205):
    hull = ndimage.binary_fill_holes(ndimage.binary_dilation(body, iterations=2))
    ink = (rgb.mean(axis=2) < dark) & hull
    return ndimage.binary_fill_holes(body | ink)


def _g_rembg_candidate(top, model, up):
    from rembg import remove
    big = top.resize((top.width * up, top.height * up), Image.LANCZOS)
    arr = np.array(remove(big, session=_gsession(model)).convert("RGBA"))
    rgb = arr[:, :, :3]
    m = arr[:, :, 3] > 60
    base = _g_largest_cc(m)
    if base is None:
        return None
    body = ndimage.binary_fill_holes(_g_keep_near(m, base))
    body = _g_recover_face(body, rgb)
    lc = _g_largest_cc(body)
    if lc is not None:
        body = _g_keep_near(body, lc)
    return (_g_score(body, *m.shape), rgb, body)


def _g_flood_candidate(top, up=3, tol=3):
    import cv2
    img = np.array(top.convert("RGB"))
    big = cv2.resize(img, (img.shape[1] * up, img.shape[0] * up),
                     interpolation=cv2.INTER_LANCZOS4)
    h, w = big.shape[:2]
    bg = np.zeros((h, w), bool)
    for sy, sx in [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1),
                   (0, w // 2), (h // 2, 0), (h // 2, w - 1)]:
        m2 = np.zeros((h + 2, w + 2), np.uint8)
        cv2.floodFill(big.copy(), m2, (sx, sy), 0, (tol,) * 3, (tol,) * 3,
                      flags=8 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY)
        bg |= m2[1:-1, 1:-1].astype(bool)
    fg = _g_recover_face(ndimage.binary_fill_holes(~bg), big)
    lc = _g_largest_cc(fg)
    if lc is None:
        return None
    lc = ndimage.binary_fill_holes(lc)
    if lc.sum() < 400:
        return None
    return (_g_score(lc, h, w), big, lc)


def process_ghost(cell):
    """Best-of hybrid segmentation for one pale-ghost creature crop."""
    cands = []
    for model in ("isnet-general-use", "u2net"):
        for up in (3, 4):
            try:
                c = _g_rembg_candidate(cell, model, up)
            except Exception:
                c = None
            if c:
                cands.append(c)
    try:
        fc = _g_flood_candidate(cell)
        if fc:
            cands.append(fc)
    except Exception:
        pass
    if not cands:
        return None
    cands.sort(key=lambda t: t[0], reverse=True)
    _sc, rgb, mask = cands[0]
    a = (mask.astype(np.uint8)) * 255
    a = np.array(Image.fromarray(a, "L").filter(ImageFilter.GaussianBlur(0.7)))
    a = np.where(a > 130, 255, 0).astype(np.uint8)
    spr = Image.fromarray(np.dstack([rgb, a]).astype(np.uint8), "RGBA")
    bb = spr.getbbox()
    if not bb:
        return None
    return add_border(spr.crop(bb))


def add_border(spr, pad=4, ring=2):
    spr = spr.convert("RGBA")
    w, h = spr.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    a = spr.split()[3]
    dil = a.filter(ImageFilter.MaxFilter(2 * ring + 1))
    ra = np.array(dil)
    rr = np.zeros((h, w, 4), np.uint8)
    rr[:, :, 0] = 255; rr[:, :, 1] = 255; rr[:, :, 2] = 255
    rr[:, :, 3] = (ra * 0.82).astype(np.uint8)
    canvas.alpha_composite(Image.fromarray(rr, "RGBA"), (pad, pad))
    canvas.alpha_composite(spr, (pad, pad))
    return canvas


def process_cell(cell, white=236):
    arr = np.array(cell.convert("RGBA"))
    h, w = arr.shape[:2]
    rgb = arr[:, :, :3].astype(np.int16)
    near_white = (rgb[:, :, 0] > white) & (rgb[:, :, 1] > white) & (rgb[:, :, 2] > white)
    lbl, n = ndimage.label(near_white)
    if n:
        border_labels = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
        border_labels.discard(0)
        bg = np.isin(lbl, list(border_labels))
    else:
        bg = np.zeros((h, w), bool)
    # fill enclosed background pockets -> a white ghost body sealed by its own faint
    # outline becomes solid foreground instead of being eaten as background.
    fgmask = ndimage.binary_fill_holes(~bg)
    alpha0 = (fgmask).astype(np.uint8) * 255
    fl, fn = ndimage.label(alpha0 > 0)
    if fn == 0:
        return None
    sizes = ndimage.sum(np.ones_like(fl), fl, range(1, fn + 1))
    keep = int(np.argmax(sizes)) + 1
    big = sizes[keep - 1]
    mys, mxs = np.where(fl == keep)
    mx0, mx1, my0, my1 = mxs.min(), mxs.max(), mys.min(), mys.max()
    mgx = max(6, (mx1 - mx0) * 0.32); mgy = max(6, (my1 - my0) * 0.32)
    keep_labels = [keep]
    for i, s in enumerate(sizes):
        lab = i + 1
        if lab == keep or s < max(20, big * 0.04):
            continue
        ys, xs = np.where(fl == lab)
        bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
        bw, bh = bx1 - bx0 + 1, by1 - by0 + 1
        if (bw <= 3 or bh <= 3) or (max(bw, bh) / max(1, min(bw, bh)) > 8):
            continue
        fill = s / float(bw * bh)
        if fill < 0.16 and s < big * 0.5:
            continue
        near_x = (bx1 >= mx0 - mgx) and (bx0 <= mx1 + mgx)
        near_y = (by1 >= my0 - mgy) and (by0 <= my1 + mgy)
        if not (near_x and near_y):
            continue
        keep_labels.append(lab)
    fg = np.isin(fl, keep_labels)
    alpha = (fg.astype(np.uint8)) * 255
    if alpha.max() == 0:
        return None
    a_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    alpha = np.where(np.array(a_img) > 150, 255, 0).astype(np.uint8)
    out = arr.copy(); out[:, :, 3] = alpha
    spr = Image.fromarray(out, "RGBA")
    bbox = spr.getbbox()
    if not bbox:
        return None
    return add_border(spr.crop(bbox))


def run():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for sh in SHEETS:
        is_ghost = sh.get("method") == "rembg"
        sheet = Image.open(sh["file"]).convert("RGBA")
        rgb_sheet = sheet.convert("RGB")
        W, H = sheet.size
        cw, ch = W / COLS, H / ROWS
        idx = sh["start"]
        made = 0
        for r in range(ROWS):
            for c in range(COLS):
                if is_ghost:
                    # detected non-uniform grid, name-band excluded, hybrid segmenter
                    cell = ghost_creature_cell(rgb_sheet, r, c)
                    spr = process_ghost(cell)
                else:
                    # both sheets share the SAME non-uniform grid; use the detected
                    # creature band (name excluded, no bottom-clip) then flood.
                    cell = ghost_creature_cell(rgb_sheet, r, c).convert("RGBA")
                    spr = process_cell(cell, white=sh.get("white", 236))
                path = os.path.join(OUT, f"mon-{idx}.webp")
                if spr is None:
                    print(f"  WARN empty cell r{r}c{c} -> mon-{idx}")
                else:
                    spr.save(path, "WEBP", quality=90, method=6)
                    made += 1
                idx += 1
        print(f"{os.path.basename(sh['file'])}: {made} sprites -> mon-{sh['start']}..{idx-1}")
        total += made
    print(f"TOTAL {total} new monster sprites")


if __name__ == "__main__":
    run()
