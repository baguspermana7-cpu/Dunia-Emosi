#!/usr/bin/env python3
"""
process-titipo-sprites.py

Sibling of scripts/process-chuggington-sprites.py. Crops the owner-supplied
Titipo character sheet (a 5x5 grid of 25 renders, each train sitting on a short
piece of track with a printed name label underneath) into 25 clean RGBA game
sprites at assets/train/titipo/<slug>.webp, and emits
assets/train/titipo/_meta.json mirroring the schema of
assets/train/chuggington/_meta.json.

The Chuggington script is left untouched -- its output must stay byte-identical.

Deltas vs the Chuggington sheet (all measured, none assumed)
------------------------------------------------------------
* BACKGROUND IS GREY, not paper white. The sheet paints a flat ~(229,228,228)
  card behind every character, so Chuggington's BG_MIN_CHANNEL = 232 would
  recognise none of it. Measured: the neutral background mode sits at
  min-channel 226..231 with a soft vignette reaching ~215 at the card corners,
  while character whites (XING-XING / STORM / JENNY / WALKIE bodies, cream
  roofs) sit at 240..255. BG_MIN_CHANNEL = 215 therefore separates cleanly and
  the flood frontier was verified stable at 210 / 215 / 220 (background
  fraction moved <2% per cell -- i.e. no runaway leak into a white body).

* GRID GEOMETRY IS NOT A UNIFORM 250.8 SPLIT. Measured from the full-width /
  full-height runs of non-background pixels: separator columns land on
  250-251 / 500-501 / 750-751 / 1001-1002 and separator ROWS on 250 / 501-502 /
  749-750 / 999, plus a 1 px dark frame on all four outer edges. The cells are
  244..252 px, never the same size twice.

* THE TRACK IS FLAT. The Chuggington sheet had a 3/4 camera and a -0.02 track
  slope; this sheet is a straight side elevation, so the fitted slope is ~0 and
  RAIL_SLOPE_RANGE is re-centred on zero.

Everything that made the Chuggington crops clean is kept:

1. CELL SPLIT      Measured grid lines, inset by GRID_INSET so no separator or
                   outer-frame fragment can survive into a sprite.

2. BACKGROUND      EDGE-SEEDED FLOOD FILL, never a global colour key. A global
                   "make light-grey transparent" pass would punch holes through
                   XING-XING's and STORM's white bullet bodies, JENNY's and
                   WALKIE's cream flanks, TITIPO's white waistband, ELLA's white
                   skirt and every cream roof on the sheet. The flood starts
                   only from the cell border and only walks through near-grey,
                   near-neutral pixels, so interior whites are enclosed by the
                   character outline and are never reached.

3. DE-HALO         The 2 px rim adjacent to the flood region is treated as an
                   alpha matte: alpha comes from how close the pixel still is to
                   the background level, and the colour is un-multiplied back
                   off the BACKGROUND GREY (not off white as in the Chuggington
                   script -- un-multiplying grey art off 255 would leave a bright
                   fringe). F = (C - (1-a)*BG) / a.

4. RAIL CUT        The track is a thin (~7-11 px) dark neutral band rendered IN
                   FRONT of the wheels, so its top edge is exactly the visible
                   bottom of the character. Columns whose lowest pixel group is
                   thin and neutral are pure track; a RANSAC line is fitted
                   through their top edge and everything at/below is dropped.
                   That deletes the track, its contact shadow and the printed
                   name label in one cut.

                   The slope is PINNED to the sheet median for every cell (pass
                   1 estimates per-cell slopes, pass 2 re-fits with the median
                   fixed). Per-cell slopes sliced the chassis on 3 Chuggington
                   cells; on this sheet the track is genuinely flat, so a
                   free-slope fit that latched onto a label serif or a footplate
                   could tilt the cut straight through a bogie.

5. STRAY CLEANUP   Connected components smaller than COMPONENT_KEEP_FRAC of the
                   largest are dropped (far-track slivers, label serifs, dust).
                   Run BEFORE the fit as well, so the dark thin label text
                   cannot capture the track detector.

6. MIRROR          Every one of the 25 characters is drawn facing LEFT (verified
                   by eye on all 25 cells, no exceptions). The games run
                   left->right and the Thomas AEG + Chuggington packs both ship
                   art that already points the way it travels with faces:'right'
                   describing the ART, so the crops are flipped horizontally and
                   trains-db.js records faces:'right'. One approach, applied
                   uniformly to all 25. Flip is a lossless whole-sprite
                   transpose.

Idempotent: re-running regenerates every sprite + _meta.json from the source PNG.

Usage:
  python3 scripts/process-titipo-sprites.py [--src /path/to/titipo.png]
                                            [--dump-mask DIR]

Requires: Pillow (PIL) + NumPy.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import deque
from pathlib import Path

try:
    import numpy as np
    from PIL import Image
except ImportError:
    print("ERROR: Pillow (PIL) and NumPy required. Install with: pip install Pillow numpy")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = Path.home() / "Downloads" / "ChatGPT Image Aug 7, 2026, 07_36_09 AM.png"
OUT_DIR = ROOT / "assets" / "train" / "titipo"
META_FILE = OUT_DIR / "_meta.json"

# --- source geometry -------------------------------------------------------
# Measured, NOT assumed: rows/cols whose background fraction collapses across
# the whole sheet are the printed separators. They are not evenly spaced.
#   separator cols: 250-251, 500-501, 750-751, 1001-1002  (+1 px outer frame)
#   separator rows: 250,     501-502, 749-750, 999        (+1 px outer frame)
GRID_ROWS = [0, 250, 502, 750, 999, 1253]
GRID_COLS = [0, 251, 501, 751, 1002, 1253]
GRID_INSET = 6                 # px trimmed inside each grid line / outer frame

# --- background flood-fill predicate --------------------------------------
# The card is GREY (~229,228,228), not paper white. 215 sits below the vignette
# floor of the card and above nothing that belongs to a character body.
BG_MIN_CHANNEL = 215
BG_MAX_SATURATION = 16         # max(R,G,B)-min(R,G,B) at or below this == neutral
BG_LEVEL = 228.0               # measured modal background level, used to un-multiply

# --- adaptive outline sealing ---------------------------------------------
# Four characters (XING-XING, STORM, GENIE, ERIC) are painted white and SHADED
# down to 230-232 -- i.e. numerically identical to the 226-230 background. No
# threshold can separate them; only their thin outline can, and that outline has
# 1-4 px breaks the raw flood pours through. So the flood is run on an ERODED
# copy of the paper mask (which closes breaks up to 2*SEAL px), then dilated
# back and re-clipped to the original paper mask so the silhouette edge is not
# eaten. Eroding costs thin genuine background channels (STEAM's wheel spokes,
# FIX's crane lattice), so the seal is chosen PER CELL, as small as possible:
# the smallest seal after which the background fraction no longer collapses.
SEAL_RANGE = range(0, 6)       # candidate seal radii, in px
SEAL_COLLAPSE = 0.02           # a >2%-of-cell drop in bg fraction == a leak

# --- de-halo matte band
RIM_WIDTH = 2                  # px of alpha-matte around the flood region
MATTE_OPAQUE_AT = 186          # min-channel at which the rim pixel is fully opaque

# --- rail detection
RAIL_ALPHA = 0.25              # alpha above which a pixel counts as "ink"
RAIL_GAP_MERGE = 3             # px gap still counted as the same vertical group
RAIL_MAX_THICKNESS = 18        # px; a lowest group thicker than this is not pure rail
RAIL_MAX_SATURATION = 30       # the track is grey/brown, never a character colour
RAIL_SLOPE_RANGE = (-0.030, 0.030)   # side elevation: the track is flat
RAIL_RANSAC_ITERS = 900
RAIL_INLIER_PX = 3.0
RAIL_CUT_FEATHER = 2           # cut this many px ABOVE the fitted rail top edge

COMPONENT_KEEP_FRAC = 0.02     # drop components < 2% of the largest

MAX_DIM = 600                  # same ceiling as the AEG / Chuggington packs
WEBP_QUALITY = 82              # tuned so output lands in the AEG/Chuggington KB band

MIRROR_TO_FACE = "right"       # games run left->right; art ships pointing right

# Row-major order of the sheet, exactly as printed on the labels.
SHEET = [
    ["Titipo", "Genie", "Diesel", "Eric", "Xing-Xing"],
    ["Loco", "Manny", "Berny", "Jenny", "Fix"],
    ["Setter", "Danny", "Tony", "Steam", "Boom-Boom"],
    ["Super Z", "Megatrain", "Strong", "Green", "Pecker"],
    ["Storm", "Cheki", "Ella", "Lord Greener", "Walkie"],
]

# Height tiers, same ladder as the Chuggington pack (tiny / standard / steam /
# express / tall). Must stay in lockstep with the `spriteHeight` values of the
# `titipo` category in games/trains-db.js -- _meta.json is the traceability
# record for them. games/balapan-kereta.html keeps its OWN shorter ladder.
ARCHETYPE = {
    # short boxy shunters / brake vans -- visibly stubbier than the rest
    "tiny":     {"chars": {"diesel", "eric", "green", "boom-boom"},          "spriteHeight": 100},
    # standard road diesels -- the bulk of the roster
    "standard": {"chars": {"titipo", "genie", "loco", "manny", "berny",
                           "setter", "danny", "tony", "super-z", "megatrain",
                           "strong", "pecker", "cheki", "ella", "lord-greener",
                           "walkie"},                                        "spriteHeight": 115},
    # genuine steam locomotive
    "steam":    {"chars": {"steam"},                                         "spriteHeight": 115},
    # streamlined / high-speed nose
    "express":  {"chars": {"xing-xing", "jenny", "storm"},                   "spriteHeight": 125},
    # crane train -- the jib makes it far taller than anything else here
    "tall":     {"chars": {"fix"},                                           "spriteHeight": 140},
}


def slugify(name: str) -> str:
    return name.lower().replace(" ", "-")


def slug_archetype(slug: str) -> str:
    for key, info in ARCHETYPE.items():
        if slug in info["chars"]:
            return key
    return "standard"


def slug_height(slug: str) -> int:
    return ARCHETYPE[slug_archetype(slug)]["spriteHeight"]


# ---------------------------------------------------------------- primitives

def dilate(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iterations):
        p = np.pad(out, 1, constant_values=False)
        out = out | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return out


def erode(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    """Erode, treating everything outside the array as set (so the cell border
    keeps its seeds no matter how hard we erode)."""
    out = mask.copy()
    for _ in range(iterations):
        p = np.pad(out, 1, constant_values=True)
        out = out & p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:]
    return out


def paper_mask(rgb: np.ndarray) -> np.ndarray:
    minc = rgb.min(axis=2)
    maxc = rgb.max(axis=2)
    return (minc >= BG_MIN_CHANNEL) & ((maxc - minc) <= BG_MAX_SATURATION)


def flood_from_border(paper: np.ndarray) -> np.ndarray:
    """Edge-seeded 4-connected flood over the given passable mask."""
    h, w = paper.shape

    bg = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    def seed(y: int, x: int) -> None:
        if paper[y, x] and not bg[y, x]:
            bg[y, x] = True
            queue.append((y, x))

    for x in range(w):
        seed(0, x)
        seed(h - 1, x)
    for y in range(h):
        seed(y, 0)
        seed(y, w - 1)

    while queue:
        y, x = queue.popleft()
        if y > 0:
            seed(y - 1, x)
        if y < h - 1:
            seed(y + 1, x)
        if x > 0:
            seed(y, x - 1)
        if x < w - 1:
            seed(y, x + 1)
    return bg


def sealed_flood(paper: np.ndarray, seal: int) -> np.ndarray:
    """Flood on an outline-sealed copy of `paper`, then restore the real edge.

    Eroding by `seal` closes any break in the character outline narrower than
    2*seal px, so the flood cannot pour through it into a near-white body.
    Dilating the result back by `seal` and re-clipping to `paper` puts the
    background boundary exactly back on the silhouette, so nothing is eroded off
    the character itself.
    """
    if seal <= 0:
        return flood_from_border(paper)
    bg = flood_from_border(erode(paper, seal))
    return dilate(bg, seal) & paper


def choose_seal(paper: np.ndarray) -> tuple[int, list[float]]:
    """Smallest seal radius after which the background fraction stops collapsing.

    A leak shows up as a big step down in background fraction when the seal that
    finally plugs it is applied. Walking up from 0 and taking the first radius
    with no collapse LEFT AHEAD OF IT gives the least destructive seal that is
    still leak-free -- 0 for most cells (which preserves genuine thin background
    channels such as STEAM's wheel spokes), 4 for the two bullet trains.
    """
    fracs = [float(sealed_flood(paper, s).mean()) for s in SEAL_RANGE]
    drops = [fracs[i] - fracs[i + 1] for i in range(len(fracs) - 1)]
    for i in range(len(drops) + 1):
        if all(d < SEAL_COLLAPSE for d in drops[i:]):
            return list(SEAL_RANGE)[i], fracs
    return list(SEAL_RANGE)[-1], fracs


def build_rgba(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, int]:
    """Return (float RGB un-multiplied off the background grey, alpha, bg, seal)."""
    paper = paper_mask(rgb)
    seal, _fracs = choose_seal(paper)
    bg = sealed_flood(paper, seal)
    minc = rgb.min(axis=2).astype(np.float32)

    rim = dilate(bg, RIM_WIDTH) & ~bg
    alpha = np.where(bg, 0.0, 1.0).astype(np.float32)
    # A rim pixel still sitting at the background level is nearly transparent;
    # one that has dropped to MATTE_OPAQUE_AT is fully the character.
    rim_alpha = np.clip((BG_LEVEL - minc) / (BG_LEVEL - MATTE_OPAQUE_AT), 0.0, 1.0)
    alpha[rim] = rim_alpha[rim]

    colour = rgb.astype(np.float32)
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmul = np.clip((colour - (1.0 - safe) * BG_LEVEL) / safe, 0.0, 255.0)
    colour = np.where(rim[..., None], unmul, colour)
    return colour, alpha, bg, seal


def column_groups(col_mask: np.ndarray) -> list[tuple[int, int]]:
    """Contiguous runs, merged across gaps up to RAIL_GAP_MERGE px."""
    ys = np.flatnonzero(col_mask)
    if ys.size == 0:
        return []
    groups: list[list[int]] = [[int(ys[0]), int(ys[0])]]
    for y in ys[1:]:
        if y - groups[-1][1] <= RAIL_GAP_MERGE + 1:
            groups[-1][1] = int(y)
        else:
            groups.append([int(y), int(y)])
    return [(a, b) for a, b in groups]


def rail_candidates(rgb: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """Columns whose lowest pixel group is thin + neutral == pure track."""
    ink = alpha > RAIL_ALPHA
    if not ink.any():
        return np.empty((0, 2))
    rows = np.flatnonzero(ink.any(axis=1))
    y0, y1 = int(rows[0]), int(rows[-1])
    sat = rgb.max(axis=2) - rgb.min(axis=2)

    pts: list[tuple[int, int]] = []
    for x in np.flatnonzero(ink.any(axis=0)):
        groups = column_groups(ink[:, x])
        if not groups:
            continue
        top, bot = groups[-1]
        if bot - top + 1 > RAIL_MAX_THICKNESS:
            continue
        if top < y0 + 0.55 * (y1 - y0):          # track always lives low in the cell
            continue
        band = sat[top:bot + 1, x]
        if band.size == 0 or float(np.percentile(band, 90)) > RAIL_MAX_SATURATION:
            continue                              # coloured -> part of the character
        pts.append((int(x), top))
    return np.asarray(pts, dtype=float) if pts else np.empty((0, 2))


def fit_rail_line(points: np.ndarray, fixed_slope: float | None = None
                  ) -> tuple[float, float] | None:
    """RANSAC-fit the top edge of the track band. Returns (slope, intercept).

    Every cell on the sheet is the same side-elevation camera, so the track
    slope is a property of the SHEET, not of the character. Pass 1 estimates a
    per-cell slope and the caller takes the median; pass 2 re-runs with that
    median PINNED so a character whose footplate happens to look track-ish (or a
    surviving label serif) cannot tilt its own cut line.
    """
    if len(points) < 6:
        return None
    P = points
    n = len(P)
    rng = np.random.default_rng(20260807)
    best_inliers: np.ndarray | None = None
    best_count = 0
    lo, hi = RAIL_SLOPE_RANGE

    if fixed_slope is not None:
        offsets = P[:, 1] - fixed_slope * P[:, 0]
        for candidate in offsets:
            inliers = np.abs(offsets - candidate) < RAIL_INLIER_PX
            if inliers.sum() > best_count:
                best_count = int(inliers.sum())
                best_inliers = inliers
        if best_inliers is None or best_count < 5:
            return None
        return float(fixed_slope), float(np.median(offsets[best_inliers]))

    for _ in range(RAIL_RANSAC_ITERS):
        i, j = rng.integers(0, n, 2)
        if abs(P[i, 0] - P[j, 0]) < 40:
            continue
        slope = (P[j, 1] - P[i, 1]) / (P[j, 0] - P[i, 0])
        if not (lo <= slope <= hi):
            continue
        intercept = P[i, 1] - slope * P[i, 0]
        inliers = np.abs(P[:, 1] - (slope * P[:, 0] + intercept)) < RAIL_INLIER_PX
        if inliers.sum() > best_count:
            best_count = int(inliers.sum())
            best_inliers = inliers
    if best_inliers is None or best_count < 5:
        return None

    A = np.vstack([P[best_inliers, 0], np.ones(best_count)]).T
    slope, intercept = np.linalg.lstsq(A, P[best_inliers, 1], rcond=None)[0]
    return float(slope), float(intercept)


def label_components(solid: np.ndarray) -> tuple[np.ndarray, list[int]]:
    """8-connected component labelling. Returns (labels, sizes indexed by label)."""
    h, w = solid.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes: list[int] = [0]
    current = 0
    for sy in range(h):
        for sx in range(w):
            if not solid[sy, sx] or labels[sy, sx]:
                continue
            current += 1
            size = 0
            stack = [(sy, sx)]
            labels[sy, sx] = current
            while stack:
                y, x = stack.pop()
                size += 1
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1),
                               (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = current
                        stack.append((ny, nx))
            sizes.append(size)
    return labels, sizes


def drop_small_components(alpha: np.ndarray) -> np.ndarray:
    """Keep the main silhouette; drop far-track slivers and label crumbs."""
    solid = alpha > RAIL_ALPHA
    labels, sizes = label_components(solid)
    if len(sizes) <= 1:
        return alpha
    biggest = max(sizes)
    keep = np.array([s >= COMPONENT_KEEP_FRAC * biggest for s in sizes], dtype=bool)
    keep[0] = False
    out = alpha.copy()
    out[~keep[labels]] = 0.0
    return out


def drop_components_below_main(alpha: np.ndarray) -> np.ndarray:
    """Delete every component that lies entirely BELOW the main silhouette.

    That is the printed name label, and only the printed name label: train +
    track are one huge component (the track renders across the wheels), and the
    label never touches it. Size-based pruning is not enough here -- XING-XING's
    long two-word label merges into a single 1.8 kpx blob, 8% of the train, and
    it then out-votes the track in the RANSAC because the train is so wide that
    few columns show bare track.
    """
    solid = alpha > RAIL_ALPHA
    labels, sizes = label_components(solid)
    if len(sizes) <= 1:
        return alpha
    main = int(np.argmax(sizes))
    rows_main = np.flatnonzero((labels == main).any(axis=1))
    if rows_main.size == 0:
        return alpha
    main_bottom = int(rows_main[-1])
    out = alpha.copy()
    for idx in range(1, len(sizes)):
        if idx == main:
            continue
        rows = np.flatnonzero((labels == idx).any(axis=1))
        if rows.size and int(rows[0]) > main_bottom:
            out[labels == idx] = 0.0
    return out


def largest_interior_hole(alpha: np.ndarray) -> int:
    """Biggest fully-enclosed transparent blob inside the silhouette, in px.

    THE acceptance measurement for "no holes punched through white bodies":
    label the transparent pixels, discard every blob touching the sprite border
    (that is the outside), and report the largest survivor. Genuine art holes
    (a cab window seen through, the gap under a crane jib) are legitimate and
    reported so they can be eyeballed on the contact sheet.
    """
    empty = alpha <= 0.02
    if not empty.any():
        return 0
    labels, sizes = label_components(empty)
    if len(sizes) <= 1:
        return 0
    outside = set(labels[0, :].tolist()) | set(labels[-1, :].tolist()) \
        | set(labels[:, 0].tolist()) | set(labels[:, -1].tolist())
    best = 0
    for idx, size in enumerate(sizes):
        if idx == 0 or idx in outside:
            continue
        best = max(best, size)
    return best


# ---------------------------------------------------------------- per-cell

def prepare_cell(sheet_rgb: np.ndarray, row: int, col: int) -> dict:
    """Cut the cell out, matte it, and collect its track-edge candidate points."""
    y0 = GRID_ROWS[row] + GRID_INSET
    y1 = GRID_ROWS[row + 1] - GRID_INSET
    x0 = GRID_COLS[col] + GRID_INSET
    x1 = GRID_COLS[col + 1] - GRID_INSET
    cell = sheet_rgb[y0:y1, x0:x1].astype(np.int16)

    colour, alpha, _bg, seal = build_rgba(cell)

    # The printed name label is dark, neutral and thin -- i.e. it looks exactly
    # like the track to the rail detector. It is however a cloud of small
    # disconnected letter blobs, while train+track is one huge component, so
    # pruning small components first keeps the RANSAC honest.
    alpha = drop_small_components(alpha)
    alpha = drop_components_below_main(alpha)

    points = rail_candidates(cell, alpha)
    solo = fit_rail_line(points)
    return {
        "cell": cell, "colour": colour, "alpha": alpha, "points": points,
        "soloSlope": solo[0] if solo else None, "seal": seal,
        "nativeW": cell.shape[1], "nativeH": cell.shape[0],
    }


def process_cell(prep: dict, slug: str, row: int, col: int, slope_hint: float,
                 src_name: str) -> dict:
    colour = prep["colour"]
    alpha = prep["alpha"].copy()
    native_w, native_h = prep["nativeW"], prep["nativeH"]

    line = fit_rail_line(prep["points"], fixed_slope=slope_hint)
    if line is None:
        line = fit_rail_line(prep["points"])
    if line is None:
        raise RuntimeError(f"{slug}: could not locate the track band -- refusing to guess")
    slope, intercept = line
    xs = np.arange(alpha.shape[1], dtype=np.float32)
    cut = slope * xs + intercept - RAIL_CUT_FEATHER
    ys = np.arange(alpha.shape[0], dtype=np.float32)[:, None]
    alpha = np.where(ys >= cut[None, :], 0.0, alpha)

    alpha = drop_small_components(alpha)

    rgba = np.dstack([colour, alpha * 255.0]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")

    bbox = img.getbbox()
    if bbox is None:
        raise RuntimeError(f"{slug}: sprite came out empty")
    img = img.crop(bbox)
    trimmed_w, trimmed_h = img.size

    hole = largest_interior_hole(np.asarray(img)[:, :, 3].astype(np.float32) / 255.0)

    if MIRROR_TO_FACE == "right":
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    longer = max(img.size)
    if longer > MAX_DIM:
        scale = MAX_DIM / longer
        img = img.resize((max(1, round(img.width * scale)),
                          max(1, round(img.height * scale))), Image.LANCZOS)
    final_w, final_h = img.size

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{slug}.webp"
    img.save(out, "WEBP", quality=WEBP_QUALITY, method=6)
    size_bytes = out.stat().st_size

    sprite_height = slug_height(slug)
    print(f"  {slug:14s} r{row}c{col}  native {native_w:3d}x{native_h:3d}  "
          f"trim {trimmed_w:3d}x{trimmed_h:3d}  out {final_w:3d}x{final_h:3d}  "
          f"{size_bytes/1024:5.1f} KB  rail y={intercept:6.1f}{slope:+.4f}x  "
          f"seal={prep['seal']}  hole={hole:4d}px  H={sprite_height}")

    return {
        "slug": slug,
        "source": f"{src_name}#r{row}c{col}",
        "nativeW": native_w,
        "nativeH": native_h,
        "trimmedW": trimmed_w,
        "trimmedH": trimmed_h,
        "outputW": final_w,
        "outputH": final_h,
        "outputBytes": size_bytes,
        "archetype": slug_archetype(slug),
        "suggestedSpriteHeight": sprite_height,
        "faces": MIRROR_TO_FACE,
        "mirrored": MIRROR_TO_FACE == "right",
        "largestInteriorHolePx": hole,
        "outlineSeal": prep["seal"],
        "railCut": {"slope": round(slope, 5), "intercept": round(intercept, 2)},
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, default=DEFAULT_SRC)
    args = ap.parse_args()

    if not args.src.exists():
        print(f"ERROR: source sheet not found: {args.src}")
        return 1

    sheet = np.asarray(Image.open(args.src).convert("RGB"))
    if sheet.shape[:2] != (GRID_ROWS[-1] + 1, GRID_COLS[-1] + 1):
        print(f"ERROR: unexpected sheet size {sheet.shape[1]}x{sheet.shape[0]}; "
              f"expected {GRID_COLS[-1]+1}x{GRID_ROWS[-1]+1}")
        return 1

    print("Processing 25 Titipo sprites:")
    print(f"  src: {args.src}")
    print(f"  out: {OUT_DIR}")
    print()

    preps = {}
    slopes = []
    for row in range(5):
        for col in range(5):
            prep = prepare_cell(sheet, row, col)
            preps[(row, col)] = prep
            if prep["soloSlope"] is not None:
                slopes.append(prep["soloSlope"])
    slope_hint = float(np.median(slopes))
    print(f"  sheet track slope (median of {len(slopes)} cells): {slope_hint:+.5f}")
    print()

    meta = []
    for row in range(5):
        for col in range(5):
            slug = slugify(SHEET[row][col])
            meta.append(process_cell(preps[(row, col)], slug, row, col, slope_hint,
                                     "titipo-sheet.png"))

    META_FILE.write_text(json.dumps(meta, indent=2) + "\n")
    total_kb = sum(m["outputBytes"] for m in meta) / 1024
    worst = max(meta, key=lambda m: m["largestInteriorHolePx"])
    print()
    print(f"Done. {len(meta)} sprites processed, {total_kb:.0f} KB total.")
    print(f"Largest interior hole anywhere: {worst['largestInteriorHolePx']} px "
          f"({worst['slug']})")
    print(f"Meta: {META_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
