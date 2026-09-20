#!/usr/bin/env python3
"""
process-mighty-express-sprites.py

Third sibling of scripts/process-chuggington-sprites.py and
scripts/process-titipo-sprites.py. Cuts the owner-supplied Mighty Express
character sheets into 20 clean RGBA game sprites at
assets/train/mighty/<slug>.webp plus assets/train/mighty/_meta.json, whose
schema mirrors the Titipo pack's.

The two earlier scripts are left untouched; their output must stay identical.

Deltas vs the Titipo sheet (all measured on these two files, none assumed)
-------------------------------------------------------------------------
* TWO SOURCE SHEETS, different resolutions. The base sheet holds the nine core
  characters at ~390px per cell; the variant sheet holds all twenty at ~280px.
  The nine are therefore cut from the BASE sheet (more pixels per character)
  and only the eleven variants come from the variant sheet. Mixing sheets is
  safe because every size decision below is a RATIO, not a pixel count.

* PAPER IS WHITE (~254), not Titipo's grey card. BG_LEVEL and BG_MIN_CHANNEL
  move accordingly, and the de-halo un-multiplies off white.

* THERE IS NO TRACK. These are product renders standing on nothing, so the
  whole RANSAC rail-fit is dropped. What has to go instead is the printed name
  label, which sits in clear air below the character.

  Component pruning alone is NOT enough, and one cell proves it: Brock
  (Wrecking Ball) needs an outline seal of 5, and eroding the paper mask by 5
  closes the ~8px white gap between his wheels and his caption, so body and
  caption flood as ONE component and the caption rides into the sprite. The cut
  is therefore made on the UNSEALED flood, which still sees that gap: the
  lowest full-width run of background below the chassis is the caption gap, and
  everything at or below it is dropped. Component pruning then mops up dust.

* ART ALREADY FACES RIGHT (verified by eye on all 20 cells: the face is at the
  right-hand end of every vehicle). The Titipo and Chuggington sheets faced
  left and were mirrored at build time; mirroring here would turn every
  character around, so MIRROR is off and faces:'right' still means "render
  native, no flip".

* SIZES ARE DERIVED, NOT TIERED. Titipo sorted characters into five hand-picked
  height tiers. That cannot work here: Rescue Red's ladder and Brock's wrecking
  crane are twice as tall as their chassis, so a shared height would render
  their BODIES half the size of everyone else's. Instead the body height is
  measured per character (the median column height -- a thin jib occupies few
  columns and cannot move a median) and the sprite height is solved so every
  character's BODY lands on the same on-screen height, with the jib free to
  stick out above it. The pack median is pinned to 115px, the same figure the
  AEG/Chuggington/Titipo packs use, so a Mighty Express train stands exactly as
  tall as a Chuggington one next to it. Heights are clamped to MAX_SPRITE_H so a
  crane cannot overflow a game lane; the unclamped value stays in _meta.json.

Kept from the Titipo pipeline: measured grid lines, EDGE-SEEDED flood fill with
a per-cell adaptive outline seal (these sheets have cream and white bodies --
Penny, Mandy, Flicker -- that a global colour key would punch holes through),
the 2px de-halo matte, small-component pruning, and the interior-hole metric as
the acceptance measurement.

Idempotent: re-running regenerates every sprite and _meta.json from the PNGs.

Usage:
  python3 scripts/process-mighty-express-sprites.py
  python3 scripts/process-mighty-express-sprites.py --contact-sheet

Requires: Pillow + NumPy (this repo's venv: ~/.venvs/corpus/bin/python).
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
    print("ERROR: Pillow and NumPy required (try ~/.venvs/corpus/bin/python)")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
BASE_SRC = ROOT / "prompt" / "mighty-express" / "base-sheet.png"
VARIANT_SRC = ROOT / "prompt" / "mighty-express" / "variant-sheet.png"
OUT_DIR = ROOT / "assets" / "train" / "mighty"
META_FILE = OUT_DIR / "_meta.json"

# --- source geometry -------------------------------------------------------
# Measured: the columns/rows whose non-background fraction collapses across the
# whole sheet are the printed separators, plus a 1px outer frame. Neither sheet
# is an even split.
BASE_COLS = [0, 389, 774, 1168, 1579, 1983]
BASE_ROWS = [0, 420, 793]
VAR_COLS = [0, 280, 559, 840, 1118, 1402]
VAR_ROWS = [0, 279, 542, 811, 1122]
GRID_INSET = 6

# --- background flood-fill predicate --------------------------------------
BG_MIN_CHANNEL = 244      # paper sits at 252-255; the darkest cream body is far below
BG_MAX_SATURATION = 12    # max(R,G,B)-min(R,G,B) at or below this == neutral
BG_LEVEL = 254.0          # measured modal paper level, used to un-multiply

SEAL_RANGE = range(0, 6)
SEAL_COLLAPSE = 0.02

RIM_WIDTH = 2
MATTE_OPAQUE_AT = 200     # rim pixel this dark is fully the character

INK_ALPHA = 0.25
COMPONENT_KEEP_FRAC = 0.02

# --- caption cut
CAPTION_GAP_CLEAR = 0.995   # a row this empty in the UNSEALED flood is clear paper
CAPTION_SEARCH_FROM = 0.55  # only look for it below the chassis, never in the sky

# --- derived sizing --------------------------------------------------------
BODY_TARGET_MEDIAN = 115  # the pack's median sprite height, matching the other packs
MAX_SPRITE_H = 165        # a crane may be tall, but not tall enough to escape a lane

MAX_DIM = 600
WEBP_QUALITY = 82
FACES = "right"           # art already points the way the games travel

# (slug, display name, sheet, row, col)
BASE_SHEET = [
    ("freight-nate",      "Freight Nate",       0, 0),
    ("mechanic-milo",     "Mechanic Milo",      0, 1),
    ("build-it-brock",    "Build-It Brock",     0, 2),
    ("farmer-faye",       "Farmer Faye",        0, 3),
    ("rescue-red",        "Rescue Red",         0, 4),
    ("flicker",           "Flicker",            1, 0),
    ("peoplemover-penny", "Peoplemover Penny",  1, 1),
    ("mandy-mail",        "Mandy Mail",         1, 2),
    ("tricky-ricky",      "Tricky Ricky",       1, 3),
]
VARIANT_SHEET = [
    ("nate-special-mission", "Nate (Special Mission)", 1, 4),
    ("milo-construction",    "Milo (Construction)",    2, 0),
    ("penny-ice-cream",      "Penny (Ice Cream)",      2, 1),
    ("brock-wrecking-ball",  "Brock (Wrecking Ball)",  2, 2),
    ("faye-nature",          "Faye (Nature)",          2, 3),
    ("red-water-rescue",     "Red (Water Rescue)",     2, 4),
    ("flicker-ladder",       "Flicker (Ladder)",       3, 0),
    ("mandy-holiday",        "Mandy (Holiday)",        3, 1),
    ("ricky-stealth",        "Ricky (Stealth)",        3, 2),
    ("nate-cargo-hauler",    "Nate (Cargo Hauler)",    3, 3),
    ("milo-rescue",          "Milo (Rescue)",          3, 4),
]


# ---------------------------------------------------------------- primitives

def dilate(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    out = mask.copy()
    for _ in range(iterations):
        p = np.pad(out, 1, constant_values=False)
        out = out | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return out


def erode(mask: np.ndarray, iterations: int = 1) -> np.ndarray:
    """Erode with everything outside the array treated as set, so the cell
    border always keeps its flood seeds however hard we erode."""
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
    h, w = paper.shape
    bg = np.zeros((h, w), dtype=bool)
    q: deque = deque()

    def seed(y, x):
        if paper[y, x] and not bg[y, x]:
            bg[y, x] = True
            q.append((y, x))

    for x in range(w):
        seed(0, x); seed(h - 1, x)
    for y in range(h):
        seed(y, 0); seed(y, w - 1)
    while q:
        y, x = q.popleft()
        if y > 0: seed(y - 1, x)
        if y < h - 1: seed(y + 1, x)
        if x > 0: seed(y, x - 1)
        if x < w - 1: seed(y, x + 1)
    return bg


def sealed_flood(paper: np.ndarray, seal: int) -> np.ndarray:
    """Flood on an outline-sealed copy, then restore the true silhouette edge."""
    if seal <= 0:
        return flood_from_border(paper)
    bg = flood_from_border(erode(paper, seal))
    return dilate(bg, seal) & paper


def choose_seal(paper: np.ndarray) -> int:
    """Smallest seal radius after which the background fraction stops collapsing.

    A leak through a broken outline shows up as a step down in background
    fraction at the radius that finally plugs it. Taking the first radius with
    no collapse still ahead of it gives the least destructive seal that is
    still leak-free -- 0 for most cells, which preserves genuine thin channels
    such as the gaps in a crane lattice.
    """
    fracs = [float(sealed_flood(paper, s).mean()) for s in SEAL_RANGE]
    drops = [fracs[i] - fracs[i + 1] for i in range(len(fracs) - 1)]
    for i in range(len(drops) + 1):
        if all(d < SEAL_COLLAPSE for d in drops[i:]):
            return list(SEAL_RANGE)[i]
    return list(SEAL_RANGE)[-1]


def build_rgba(rgb: np.ndarray):
    paper = paper_mask(rgb)
    seal = choose_seal(paper)
    bg = sealed_flood(paper, seal)
    minc = rgb.min(axis=2).astype(np.float32)

    rim = dilate(bg, RIM_WIDTH) & ~bg
    alpha = np.where(bg, 0.0, 1.0).astype(np.float32)
    rim_alpha = np.clip((BG_LEVEL - minc) / (BG_LEVEL - MATTE_OPAQUE_AT), 0.0, 1.0)
    alpha[rim] = rim_alpha[rim]

    colour = rgb.astype(np.float32)
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmul = np.clip((colour - (1.0 - safe) * BG_LEVEL) / safe, 0.0, 255.0)
    colour = np.where(rim[..., None], unmul, colour)
    return colour, alpha, seal


def label_components(solid: np.ndarray):
    h, w = solid.shape
    labels = np.zeros((h, w), dtype=np.int32)
    sizes = [0]
    cur = 0
    for sy in range(h):
        for sx in range(w):
            if not solid[sy, sx] or labels[sy, sx]:
                continue
            cur += 1
            size = 0
            stack = [(sy, sx)]
            labels[sy, sx] = cur
            while stack:
                y, x = stack.pop()
                size += 1
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = cur
                        stack.append((ny, nx))
            sizes.append(size)
    return labels, sizes


def cut_below_caption_gap(alpha: np.ndarray, bg_unsealed: np.ndarray) -> tuple[np.ndarray, int]:
    """Drop everything below the strip of clear paper under the chassis.

    `bg_unsealed` is the flood WITHOUT the outline seal. The seal exists to stop
    leaks into white bodies, but eroding by more than the caption gap is wide
    also closes that gap, which welds the printed name onto the vehicle. The
    unsealed flood always sees the gap, and it is the only place below the
    chassis where background spans essentially the whole cell, so it locates the
    cut exactly without fitting anything.

    Returns the alpha and the cut row (0 when no gap was found, in which case
    nothing is cut and component pruning is left to do the work).
    """
    h, w = alpha.shape
    ink = alpha > INK_ALPHA
    rows = np.flatnonzero(ink.any(axis=1))
    if rows.size == 0:
        return alpha, 0
    top, bottom = int(rows[0]), int(rows[-1])
    clear = bg_unsealed.mean(axis=1) >= CAPTION_GAP_CLEAR
    # search below the chassis only: a gap higher up would be sky, not a caption
    lo = top + int(CAPTION_SEARCH_FROM * (bottom - top))
    for y in range(lo, h):
        if clear[y] and ink[y + 1:].any():
            out = alpha.copy()
            out[y:, :] = 0.0
            return out, y
    return alpha, 0


def strip_label_and_crumbs(alpha: np.ndarray) -> tuple[np.ndarray, int]:
    """Keep the character; drop the printed name and any dust.

    The name is a row of separate glyph blobs sitting in clear air below the
    vehicle, so two rules remove it exactly and nothing else: drop components
    under COMPONENT_KEEP_FRAC of the largest, and drop any component whose top
    is below the main silhouette's bottom. The second rule is what catches a
    long two-word name whose glyphs merge into one blob big enough to survive
    the first.
    """
    solid = alpha > INK_ALPHA
    labels, sizes = label_components(solid)
    if len(sizes) <= 1:
        return alpha, 0
    main = int(np.argmax(sizes))
    biggest = sizes[main]
    rows_main = np.flatnonzero((labels == main).any(axis=1))
    main_bottom = int(rows_main[-1]) if rows_main.size else alpha.shape[0]
    out = alpha.copy()
    dropped = 0
    for idx in range(1, len(sizes)):
        if idx == main:
            continue
        rows = np.flatnonzero((labels == idx).any(axis=1))
        below = rows.size and int(rows[0]) > main_bottom
        small = sizes[idx] < COMPONENT_KEEP_FRAC * biggest
        if below or small:
            out[labels == idx] = 0.0
            dropped += 1
    return out, dropped


def largest_interior_hole(alpha: np.ndarray) -> int:
    """Biggest fully-enclosed transparent blob inside the silhouette, in px.

    The acceptance measurement for "the flood did not eat a white body": label
    the transparent pixels, discard every blob touching the border (that is the
    outside), report the largest survivor. Genuine art holes -- a window seen
    through, the gap inside a crane jib -- are legitimate and reported so they
    can be eyeballed on the contact sheet.
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


def body_height(alpha: np.ndarray) -> int:
    """Median ink height over the columns that carry ink.

    This is the chassis height: a ladder, a crane jib or a funnel is tall but
    narrow, so it cannot move the median. Using the full trimmed height here
    would shrink every crane character's body to half the size of the others.
    """
    ink = alpha > INK_ALPHA
    cols = np.flatnonzero(ink.any(axis=0))
    if cols.size == 0:
        return max(1, alpha.shape[0])
    heights = []
    for x in cols:
        ys = np.flatnonzero(ink[:, x])
        heights.append(int(ys[-1] - ys[0] + 1))
    return max(1, int(np.median(heights)))


# ---------------------------------------------------------------- per-cell

def cut_cell(sheet: np.ndarray, rows, cols, row, col) -> np.ndarray:
    y0, y1 = rows[row] + GRID_INSET, rows[row + 1] - GRID_INSET
    x0, x1 = cols[col] + GRID_INSET, cols[col + 1] - GRID_INSET
    return sheet[y0:y1, x0:x1].astype(np.int16)


def process_cell(sheet, rows, cols, row, col, slug, name, src_name):
    cell = cut_cell(sheet, rows, cols, row, col)
    colour, alpha, seal = build_rgba(cell)
    bg0 = flood_from_border(paper_mask(cell))     # unsealed: still sees the caption gap
    alpha, cut_at = cut_below_caption_gap(alpha, bg0)
    alpha, dropped = strip_label_and_crumbs(alpha)

    rgba = np.dstack([colour, alpha * 255.0]).astype(np.uint8)
    img = Image.fromarray(rgba, "RGBA")
    bbox = img.getbbox()
    if bbox is None:
        raise RuntimeError(f"{slug}: sprite came out empty")
    img = img.crop(bbox)

    a = np.asarray(img)[:, :, 3].astype(np.float32) / 255.0
    hole = largest_interior_hole(a)
    body = body_height(a)
    trimmed_w, trimmed_h = img.size

    if max(img.size) > MAX_DIM:
        s = MAX_DIM / max(img.size)
        img = img.resize((max(1, round(img.width * s)), max(1, round(img.height * s))), Image.LANCZOS)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{slug}.webp"
    img.save(out, "WEBP", quality=WEBP_QUALITY, method=6)

    return {
        "slug": slug,
        "name": name,
        "source": f"{src_name}#r{row}c{col}",
        "nativeW": int(cell.shape[1]),
        "nativeH": int(cell.shape[0]),
        "trimmedW": trimmed_w,
        "trimmedH": trimmed_h,
        "outputW": img.size[0],
        "outputH": img.size[1],
        "outputBytes": out.stat().st_size,
        "bodyHeightPx": body,
        "bodyRatio": round(trimmed_h / body, 4),
        "faces": FACES,
        "mirrored": False,
        "largestInteriorHolePx": hole,
        "outlineSeal": seal,
        "captionCutRow": cut_at,
        "componentsDropped": dropped,
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", type=Path, default=BASE_SRC)
    ap.add_argument("--variant", type=Path, default=VARIANT_SRC)
    ap.add_argument("--contact-sheet", action="store_true",
                    help="also write assets/train/mighty/_contact.png for eyeballing")
    args = ap.parse_args()

    for p in (args.base, args.variant):
        if not p.exists():
            print(f"ERROR: source sheet not found: {p}")
            return 1

    base = np.asarray(Image.open(args.base).convert("RGB"))
    variant = np.asarray(Image.open(args.variant).convert("RGB"))
    if base.shape[:2] != (BASE_ROWS[-1], BASE_COLS[-1]):
        print(f"ERROR: base sheet is {base.shape[1]}x{base.shape[0]}, expected "
              f"{BASE_COLS[-1]}x{BASE_ROWS[-1]}")
        return 1
    if variant.shape[:2] != (VAR_ROWS[-1], VAR_COLS[-1]):
        print(f"ERROR: variant sheet is {variant.shape[1]}x{variant.shape[0]}, expected "
              f"{VAR_COLS[-1]}x{VAR_ROWS[-1]}")
        return 1

    print(f"Processing {len(BASE_SHEET) + len(VARIANT_SHEET)} Mighty Express sprites")
    print(f"  base   : {args.base}")
    print(f"  variant: {args.variant}")
    print(f"  out    : {OUT_DIR}\n")

    meta = []
    for slug, name, r, c in BASE_SHEET:
        meta.append(process_cell(base, BASE_ROWS, BASE_COLS, r, c, slug, name, "base-sheet.png"))
    for slug, name, r, c in VARIANT_SHEET:
        meta.append(process_cell(variant, VAR_ROWS, VAR_COLS, r, c, slug, name, "variant-sheet.png"))

    # Solve the sprite heights so every BODY renders at the same height, then
    # pin the pack median to the figure the other packs use.
    ratios = np.array([m["bodyRatio"] for m in meta], dtype=float)
    body_px = BODY_TARGET_MEDIAN / float(np.median(ratios))
    for m in meta:
        exact = body_px * m["bodyRatio"]
        m["bodyRenderPx"] = round(body_px, 1)
        m["suggestedSpriteHeightExact"] = round(exact, 1)
        m["suggestedSpriteHeight"] = int(min(MAX_SPRITE_H, round(exact)))
        m["clamped"] = m["suggestedSpriteHeight"] < round(exact)

    for m in meta:
        print(f"  {m['slug']:22s} {m['source']:22s} trim {m['trimmedW']:3d}x{m['trimmedH']:3d}  "
              f"body {m['bodyHeightPx']:3d}  H={m['suggestedSpriteHeight']:3d}"
              f"{'*' if m['clamped'] else ' '}  seal={m['outlineSeal']}  "
              f"hole={m['largestInteriorHolePx']:4d}px  {m['outputBytes']/1024:5.1f} KB")

    META_FILE.write_text(json.dumps(meta, indent=2) + "\n")
    total = sum(m["outputBytes"] for m in meta) / 1024
    worst = max(meta, key=lambda m: m["largestInteriorHolePx"])
    print(f"\nDone. {len(meta)} sprites, {total:.0f} KB total.")
    print(f"Body renders at {body_px:.1f}px for every character; median sprite height "
          f"{int(np.median([m['suggestedSpriteHeight'] for m in meta]))}px.")
    print(f"Largest interior hole anywhere: {worst['largestInteriorHolePx']}px ({worst['slug']})")
    print(f"Meta: {META_FILE}")

    if args.contact_sheet:
        write_contact_sheet(meta)
    return 0


def write_contact_sheet(meta):
    """One image with every sprite on a mid-grey checker, drawn at the height the
    games will actually use, so scale mistakes are visible rather than implied."""
    cols, pad = 5, 16
    scale = 1.6
    cellw = int(max(m["suggestedSpriteHeight"] * m["outputW"] / m["outputH"] for m in meta) * scale) + pad * 2
    cellh = int(MAX_SPRITE_H * scale) + pad * 2 + 18
    rows = (len(meta) + cols - 1) // cols
    sheet = Image.new("RGB", (cellw * cols, cellh * rows), (104, 104, 112))
    for i, m in enumerate(meta):
        spr = Image.open(OUT_DIR / f"{m['slug']}.webp").convert("RGBA")
        h = int(m["suggestedSpriteHeight"] * scale)
        w = max(1, round(spr.width * h / spr.height))
        spr = spr.resize((w, h), Image.LANCZOS)
        cx = (i % cols) * cellw + (cellw - w) // 2
        cy = (i // cols) * cellh + (cellh - 18 - h) - pad   # bottom-aligned, as in game
        sheet.paste(spr, (cx, cy), spr)
    out = OUT_DIR / "_contact.png"
    sheet.save(out)
    print(f"Contact sheet: {out}")


if __name__ == "__main__":
    sys.exit(main())
