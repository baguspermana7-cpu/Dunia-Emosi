#!/usr/bin/env python3
"""
process-chuggington-sprites.py  (v59.88)

Crops the owner-supplied Chuggington character sheet (a 5x5 grid of 25 renders on
a white background, each train sitting on a short piece of track with a printed
name label underneath) into 25 clean RGBA game sprites at
assets/train/chuggington/<slug>.webp, and emits assets/train/chuggington/_meta.json
mirroring the schema of assets/train/aeg/_meta.json.

House style is taken from the Thomas AEG pack (assets/train/aeg/*.webp): NO ground,
NO rail, wheels baked into the art, alpha-trimmed to the character bounding box.

Pipeline per cell
-----------------
1. CELL SPLIT      Exact grid-line rows/cols are hard-coded (measured from the
                   source: full-width/height runs of non-white pixels), then
                   inset by GRID_INSET px so no grey grid-line fragment can
                   survive into a sprite.

2. BACKGROUND      EDGE-SEEDED FLOOD FILL, never a global colour key. A global
                   "make white transparent" pass would punch holes straight
                   through Koko's white panel, Emery's silver body, Chatsworth's
                   white flank, Hanzo's white nose, Hoot/Toot's white cabs and
                   Old Puffer Pete's highlights. The flood starts only from the
                   cell border and only walks through near-white, near-neutral
                   pixels, so interior whites are unreachable and stay opaque.

3. DE-HALO         The 2 px rim adjacent to the flood region is treated as an
                   alpha-matte band: alpha is derived from how white the pixel
                   still is, and the colour is un-multiplied back off white
                   (F = (C - (1-a)*255) / a). That removes the white fringe the
                   owner has reported before ("white-background remnants +
                   border artifact") without eroding the silhouette.

4. RAIL CUT        The track is a thin (~7-10 px) near-neutral band that renders
                   IN FRONT of the wheels, so its top edge is exactly the visible
                   bottom of the character. Columns whose lowest pixel group is
                   thin and neutral are pure rail; a RANSAC line is fitted
                   through their top edge (slope constrained to the shallow 3/4
                   perspective) and everything at/below that line is dropped.
                   That deletes the rail, its contact shadow, the ground shadow
                   AND the printed name label in one cut, without clipping wheels.

5. STRAY CLEANUP   Connected components smaller than COMPONENT_KEEP_FRAC of the
                   largest are dropped (far-rail slivers, label serifs, dust).

6. MIRROR          The whole sheet is drawn facing LEFT. The games run left->right,
                   and the Thomas AEG pack ships art that already points the way
                   it travels with faces:'right'/'left' describing the ART. To
                   guarantee the owner's "menghadap ke arah permainan" the crops
                   are flipped horizontally so every Chuggington points RIGHT,
                   matching the direction of travel; trains-db.js records
                   faces:'right'. Flip is a lossless whole-sprite transpose.

Idempotent: re-running regenerates every sprite + _meta.json from the source PNG.

Usage:
  python3 scripts/process-chuggington-sprites.py [--src /path/to/chuggington.png]

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
DEFAULT_SRC = Path.home() / "Downloads" / "chuggington.png"
OUT_DIR = ROOT / "assets" / "train" / "chuggington"
META_FILE = OUT_DIR / "_meta.json"

# --- source geometry (measured: rows/cols that are 100% non-white across the sheet)
GRID_ROWS = [0, 260, 507, 761, 991, 1253]
GRID_COLS = [0, 270, 522, 774, 1009, 1253]
GRID_INSET = 4                 # px trimmed inside each grid line -> no line fragments

# --- background flood-fill predicate (deliberately strict: only true paper white)
BG_MIN_CHANNEL = 232           # min(R,G,B) at or above this == paper white
BG_MAX_SATURATION = 16         # max(R,G,B)-min(R,G,B) at or below this == neutral

# --- de-halo matte band
RIM_WIDTH = 2                  # px of alpha-matte around the flood region
MATTE_OPAQUE_AT = 196          # min-channel at which the rim pixel is fully opaque

# --- rail detection
RAIL_ALPHA = 0.25              # alpha above which a pixel counts as "ink"
RAIL_GAP_MERGE = 3             # px gap still counted as the same vertical group
RAIL_MAX_THICKNESS = 18        # px; a lowest group thicker than this is not pure rail
RAIL_MAX_SATURATION = 26       # the track is grey/brown, never a character colour
RAIL_SLOPE_RANGE = (-0.060, 0.005)
RAIL_RANSAC_ITERS = 900
RAIL_INLIER_PX = 3.0
RAIL_CUT_FEATHER = 2           # cut this many px ABOVE the fitted rail top edge

COMPONENT_KEEP_FRAC = 0.02     # drop components < 2% of the largest

MAX_DIM = 600                  # same ceiling as the AEG pack
WEBP_QUALITY = 85

MIRROR_TO_FACE = "right"       # games run left->right; art ships pointing right

# Row-major order of the sheet, exactly as printed on the labels.
SHEET = [
    ["Wilson", "Brewster", "Koko", "Hoot", "Toot"],
    ["Piper", "Action Chugger", "Calley", "Dunbar", "Old Puffer Pete"],
    ["Harrison", "Emery", "Irving", "Frostini", "Zephie"],
    ["Mtambo", "Hodge", "Olwin", "Chatsworth", "Hanzo"],
    ["Jackman", "Asher", "Zack", "Tyne", "Fletch"],
]

# Height tiers, same spirit as the AEG pack (tiny / standard / express / long).
# Must stay in lockstep with the `spriteHeight` values of the `chuggington`
# category in games/trains-db.js -- _meta.json is the traceability record for them.
ARCHETYPE = {
    "tiny":     {"chars": {"calley", "hodge"},                                       "spriteHeight": 100},
    "long":     {"chars": {"emery"},                                                 "spriteHeight": 105},
    "standard": {"chars": {"wilson", "koko", "hoot", "toot", "piper", "dunbar",
                           "irving", "frostini", "mtambo", "chatsworth", "jackman",
                           "asher", "zack", "tyne", "fletch"},                       "spriteHeight": 115},
    "steam":    {"chars": {"old-puffer-pete", "olwin"},                              "spriteHeight": 115},
    "express":  {"chars": {"brewster", "action-chugger", "harrison", "hanzo"},       "spriteHeight": 125},
    "tall":     {"chars": {"zephie"},                                                "spriteHeight": 140},
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


def flood_background(rgb: np.ndarray) -> np.ndarray:
    """Edge-seeded 4-connected flood over near-white, near-neutral pixels.

    This is the whole reason white-bodied characters survive: a pixel is only
    erased if it is white AND reachable from the cell border without crossing
    the character outline. Interior whites are enclosed and never reached.
    """
    h, w, _ = rgb.shape
    minc = rgb.min(axis=2)
    maxc = rgb.max(axis=2)
    paper = (minc >= BG_MIN_CHANNEL) & ((maxc - minc) <= BG_MAX_SATURATION)

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


def build_rgba(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Return (float RGB un-multiplied off white, float alpha 0..1)."""
    bg = flood_background(rgb)
    minc = rgb.min(axis=2).astype(np.float32)

    rim = dilate(bg, RIM_WIDTH) & ~bg
    alpha = np.where(bg, 0.0, 1.0).astype(np.float32)
    rim_alpha = np.clip((255.0 - minc) / (255.0 - MATTE_OPAQUE_AT), 0.0, 1.0)
    alpha[rim] = rim_alpha[rim]

    colour = rgb.astype(np.float32)
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmul = np.clip((colour - (1.0 - safe) * 255.0) / safe, 0.0, 255.0)
    colour = np.where(rim[..., None], unmul, colour)
    return colour, alpha


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
        if top < y0 + 0.55 * (y1 - y0):          # rail always lives low in the cell
            continue
        band = sat[top:bot + 1, x]
        if band.size == 0 or float(np.percentile(band, 90)) > RAIL_MAX_SATURATION:
            continue                              # coloured -> part of the character
        pts.append((int(x), top))
    return np.asarray(pts, dtype=float) if pts else np.empty((0, 2))


def fit_rail_line(points: np.ndarray, fixed_slope: float | None = None
                  ) -> tuple[float, float] | None:
    """RANSAC-fit the top edge of the track band. Returns (slope, intercept).

    Every cell on the sheet is the same 3/4 camera setup, so the track slope is a
    property of the SHEET, not of the character. Pass 1 estimates a per-cell slope
    and the caller takes the median; pass 2 re-runs with that median pinned so a
    character whose chassis happens to look rail-ish cannot tilt its own cut line.
    """
    if len(points) < 6:
        return None
    P = points
    n = len(P)
    rng = np.random.default_rng(20260802)
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


def drop_small_components(alpha: np.ndarray) -> np.ndarray:
    """Keep the main silhouette; drop far-rail slivers and label crumbs."""
    solid = alpha > RAIL_ALPHA
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
    if current == 0:
        return alpha
    biggest = max(sizes)
    keep = np.array([s >= COMPONENT_KEEP_FRAC * biggest for s in sizes], dtype=bool)
    keep[0] = False
    out = alpha.copy()
    out[~keep[labels]] = 0.0
    return out


# ---------------------------------------------------------------- per-cell

def prepare_cell(sheet_rgb: np.ndarray, row: int, col: int) -> dict:
    """Cut the cell out, matte it, and collect its track-edge candidate points."""
    y0 = GRID_ROWS[row] + GRID_INSET
    y1 = GRID_ROWS[row + 1] - GRID_INSET
    x0 = GRID_COLS[col] + GRID_INSET
    x1 = GRID_COLS[col + 1] - GRID_INSET
    cell = sheet_rgb[y0:y1, x0:x1].astype(np.int16)

    colour, alpha = build_rgba(cell)

    # The printed name label is dark, neutral and thin -- i.e. it looks exactly
    # like the track to the rail detector. It is however a cloud of tiny
    # disconnected letter blobs, while train+track is one huge component, so
    # pruning small components first keeps the RANSAC honest.
    alpha = drop_small_components(alpha)

    points = rail_candidates(cell, alpha)
    solo = fit_rail_line(points)
    return {
        "cell": cell, "colour": colour, "alpha": alpha, "points": points,
        "soloSlope": solo[0] if solo else None,
        "nativeW": cell.shape[1], "nativeH": cell.shape[0],
    }


def process_cell(prep: dict, slug: str, row: int, col: int, slope_hint: float) -> dict:
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
    print(f"  {slug:18s} cell r{row}c{col}  native {native_w:3d}x{native_h:3d}  "
          f"trim {trimmed_w:3d}x{trimmed_h:3d}  out {final_w:3d}x{final_h:3d}  "
          f"{size_bytes/1024:5.1f} KB  rail y={intercept:6.1f}{slope:+.4f}x  H={sprite_height}")

    return {
        "slug": slug,
        "source": f"chuggington.png#r{row}c{col}",
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

    print(f"Processing 25 Chuggington sprites:")
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
            meta.append(process_cell(preps[(row, col)], slug, row, col, slope_hint))

    META_FILE.write_text(json.dumps(meta, indent=2) + "\n")
    total_kb = sum(m["outputBytes"] for m in meta) / 1024
    print()
    print(f"Done. {len(meta)} sprites processed, {total_kb:.0f} KB total.")
    print(f"Meta: {META_FILE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
