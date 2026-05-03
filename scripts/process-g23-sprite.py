#!/usr/bin/env python3
"""
G23 Pokemon Runner — universal sprite processor.

Output: unified canvas, 2× HiDPI, bottom-aligned sprites.

All sprites output to the SAME logical canvas (default 240×200 CSS px)
at 2× physical resolution (480×400 px). The game CSS displays them at
240×200 so they look sharp on HiDPI/retina screens. Every Pokemon
stands at the same ground line (bottom of canvas).

Usage:
    python3 scripts/process-g23-sprite.py <input> <output> [options]

Options:
    --method      auto|rembg|skip   BG removal method (default: auto)
    --bg-color    R,G,B             Force BG seed color
    --tolerance   N                 Flood-fill tolerance 0-255 (default: 28)
    --fringe      N                 Anti-alias erosion px (default: 1)
    --mirror                        Flip horizontally (left-facing sprites)
    --canvas-w    N                 Logical canvas width  px (default: 240)
    --canvas-h    N                 Logical canvas height px (default: 200)
    --dpr         N                 Device pixel ratio for HiDPI (default: 2)
    --quality     N                 WebP quality 1-100 (default: 92)
    --preview                       Save first-frame PNG for inspection

Methods:
    auto   BFS flood-fill from edges (white/solid backgrounds)
    rembg  AI segmentation — for complex scene backgrounds (Arcanine/Psyduck)
    skip   Already transparent — just mirror/place on canvas

Examples:
    python3 scripts/process-g23-sprite.py input.gif out.webp
    python3 scripts/process-g23-sprite.py input.gif out.webp --method rembg
    python3 scripts/process-g23-sprite.py input.webp out.webp --method skip --mirror
    python3 scripts/process-g23-sprite.py input.gif out.webp --tolerance 18 --fringe 0
"""

import sys
import argparse
from pathlib import Path
from collections import deque

import numpy as np
from PIL import Image, ImageFilter


# ─────────────────────────────────────────────────────────
#  Flood-fill background removal
# ─────────────────────────────────────────────────────────

def _cdist(px: np.ndarray, target: tuple) -> float:
    return float(np.sqrt(
        (int(px[0]) - target[0]) ** 2 +
        (int(px[1]) - target[1]) ** 2 +
        (int(px[2]) - target[2]) ** 2
    ))


def detect_bg_color(rgba: np.ndarray) -> tuple:
    h, w = rgba.shape[:2]
    probes = [
        rgba[0, 0], rgba[0, w // 4], rgba[0, w // 2], rgba[0, w * 3 // 4], rgba[0, w - 1],
        rgba[h - 1, 0], rgba[h - 1, w // 4], rgba[h - 1, w // 2], rgba[h - 1, w * 3 // 4], rgba[h - 1, w - 1],
        rgba[h // 4, 0], rgba[h // 2, 0], rgba[h * 3 // 4, 0],
        rgba[h // 4, w - 1], rgba[h // 2, w - 1], rgba[h * 3 // 4, w - 1],
    ]
    for p in probes:
        if p[3] > 200:
            return (int(p[0]), int(p[1]), int(p[2]))
    return (255, 255, 255)


def flood_fill_alpha(rgba: np.ndarray, bg: tuple, tol: int) -> np.ndarray:
    """BFS flood-fill from all edges. Returns RGBA with background → alpha=0."""
    h, w = rgba.shape[:2]
    visited = np.zeros((h, w), dtype=bool)
    mask = np.zeros((h, w), dtype=bool)

    seeds = []
    for x in range(0, w, max(1, w // 16)):
        seeds += [(0, x), (h - 1, x)]
    for y in range(0, h, max(1, h // 16)):
        seeds += [(y, 0), (y, w - 1)]

    q = deque()
    for r, c in seeds:
        r, c = max(0, min(r, h - 1)), max(0, min(c, w - 1))
        if not visited[r, c] and _cdist(rgba[r, c], bg) <= tol:
            visited[r, c] = True
            q.append((r, c))

    while q:
        r, c = q.popleft()
        mask[r, c] = True
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < h and 0 <= nc < w and not visited[nr, nc]:
                if _cdist(rgba[nr, nc], bg) <= tol:
                    visited[nr, nc] = True
                    q.append((nr, nc))

    result = rgba.copy()
    result[mask, 3] = 0
    return result


def remove_bg_floodfill(frame_rgba: np.ndarray, bg: tuple, tol: int, fringe: int) -> Image.Image:
    arr = flood_fill_alpha(frame_rgba, bg, tol)
    img = Image.fromarray(arr, 'RGBA')
    if fringe > 0:
        alpha = img.split()[3]
        for _ in range(fringe):
            alpha = alpha.filter(ImageFilter.MinFilter(3))
        r, g, b, _ = img.split()
        img = Image.merge('RGBA', (r, g, b, alpha))
    return img


# ─────────────────────────────────────────────────────────
#  AI background removal (rembg)
# ─────────────────────────────────────────────────────────

_rembg_session = None

def remove_bg_rembg(frame_rgba: np.ndarray) -> Image.Image:
    global _rembg_session
    from rembg import remove, new_session
    if _rembg_session is None:
        print('  Loading rembg u2net model...', flush=True)
        _rembg_session = new_session('u2net')
    inp = Image.fromarray(frame_rgba, 'RGBA')
    return remove(
        inp,
        session=_rembg_session,
        alpha_matting=True,
        alpha_matting_foreground_threshold=235,
        alpha_matting_background_threshold=12,
        alpha_matting_erode_size=8,
    )


# ─────────────────────────────────────────────────────────
#  Canvas placement: unified size, bottom-aligned, 2× HiDPI
# ─────────────────────────────────────────────────────────

def place_on_canvas(sprite: Image.Image, canvas_w: int, canvas_h: int) -> Image.Image:
    """
    Scale sprite to fit within canvas (with 6px padding each side),
    then place it bottom-center on a transparent canvas.
    The ground line = bottom of canvas = all Pokemon stand on same Y.
    """
    pad = 6
    max_w = canvas_w - pad * 2
    max_h = canvas_h - pad

    sw, sh = sprite.size
    scale = min(max_w / sw, max_h / sh)      # allow upscale for small sources
    new_w = max(1, round(sw * scale))
    new_h = max(1, round(sh * scale))

    scaled = sprite.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
    x = (canvas_w - new_w) // 2          # horizontally centered
    y = canvas_h - new_h - (pad // 2)    # bottom-aligned (feet at ground)
    canvas.paste(scaled, (x, y), scaled)
    return canvas


# ─────────────────────────────────────────────────────────
#  Frame loader
# ─────────────────────────────────────────────────────────

def load_frames(path: Path) -> tuple[list, list]:
    img = Image.open(path)
    frames, durations = [], []
    try:
        while True:
            durations.append(max(40, img.info.get('duration', 80)))
            frames.append(np.array(img.convert('RGBA')))
            img.seek(img.tell() + 1)
    except EOFError:
        pass
    return frames, durations


# ─────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('output')
    ap.add_argument('--method',     default='auto', choices=['auto', 'rembg', 'skip'])
    ap.add_argument('--bg-color',   help='R,G,B')
    ap.add_argument('--tolerance',  type=int, default=28)
    ap.add_argument('--fringe',     type=int, default=1)
    ap.add_argument('--mirror',     action='store_true')
    ap.add_argument('--canvas-w',   type=int, default=240)
    ap.add_argument('--canvas-h',   type=int, default=200)
    ap.add_argument('--dpr',        type=int, default=2)
    ap.add_argument('--quality',    type=int, default=92)
    ap.add_argument('--preview',    action='store_true')
    args = ap.parse_args()

    src, dst = Path(args.input), Path(args.output)
    dst.parent.mkdir(parents=True, exist_ok=True)

    # Physical canvas = logical × DPR
    phys_w = args.canvas_w * args.dpr
    phys_h = args.canvas_h * args.dpr

    print(f'\n=== {src.name} → {dst.name} ===')
    print(f'method={args.method}  tol={args.tolerance}  fringe={args.fringe}  '
          f'mirror={args.mirror}  canvas={args.canvas_w}×{args.canvas_h}  '
          f'output={phys_w}×{phys_h}px (DPR={args.dpr})')

    frames_raw, durations = load_frames(src)
    n = len(frames_raw)
    print(f'Source: {frames_raw[0].shape[1]}×{frames_raw[0].shape[0]}  {n} frames')

    forced_bg = None
    if args.bg_color:
        p = [int(x.strip()) for x in args.bg_color.split(',')]
        forced_bg = (p[0], p[1], p[2])
    elif args.method == 'auto':
        forced_bg = detect_bg_color(frames_raw[0])
        print(f'Auto BG: {forced_bg}')

    frames_out: list[Image.Image] = []

    for i, raw in enumerate(frames_raw):
        # 1. Remove background
        if args.method == 'skip':
            sprite = Image.fromarray(raw, 'RGBA')
        elif args.method == 'rembg':
            sprite = remove_bg_rembg(raw)
        else:
            sprite = remove_bg_floodfill(raw, forced_bg, args.tolerance, args.fringe)

        # 2. Mirror if needed
        if args.mirror:
            sprite = sprite.transpose(Image.FLIP_LEFT_RIGHT)

        # 3. Crop to content bbox (remove transparent padding from source)
        bbox = sprite.getbbox()
        if bbox:
            sprite = sprite.crop(bbox)

        # 4. Place on unified canvas at physical (2×) resolution
        frame = place_on_canvas(sprite, phys_w, phys_h)
        frames_out.append(frame)

        if (i + 1) % 8 == 0 or i == n - 1:
            print(f'  frame {i + 1}/{n}', flush=True)

    if args.preview:
        prev = dst.with_suffix('.preview.png')
        frames_out[0].save(prev)
        print(f'Preview → {prev}')

    is_static = len(frames_out) == 1 or dst.suffix.lower() == '.png'
    if is_static:
        frames_out[0].save(dst, format='PNG', optimize=True)
    else:
        frames_out[0].save(
            dst,
            format='WEBP',
            save_all=True,
            append_images=frames_out[1:],
            loop=0,
            duration=durations[:n],
            lossless=False,
            quality=args.quality,
            method=4,
        )

    kb = dst.stat().st_size // 1024
    print(f'✓ {dst}  {kb} KB  {len(frames_out)}fr  {phys_w}×{phys_h}px → CSS {args.canvas_w}×{args.canvas_h}')


if __name__ == '__main__':
    main()
