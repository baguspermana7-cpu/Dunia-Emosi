#!/usr/bin/env python3
"""
G23 Pokemon Bird Runner — GIF background remover.

Why threshold (not AI rembg):
- Pokemon sprite GIFs typically have solid single-color backgrounds.
- AI rembg mutilates small sprites and adds halo artifacts on 64-128px frames.
- Flood-fill from corners catches ~98% of cases cleanly.

Usage:
    python3 scripts/process-g23-sprite.py <input.gif> <output.gif> [options]

Options:
    --bg-color R,G,B   Force specific background color (skip auto-detect).
                       Example: --bg-color 255,255,255
    --tolerance N      Color match tolerance 0-255, default 24.
    --fringe N         Erode N pixels of anti-alias fringe, default 1.
    --preview          Save a PNG preview of first frame beside output.

Examples:
    python3 scripts/process-g23-sprite.py input/pidgeot-run.gif assets/Pokemon/g23/pidgeot.gif
    python3 scripts/process-g23-sprite.py input/pidgeot-run.gif out.gif --bg-color 255,255,255 --tolerance 30
    python3 scripts/process-g23-sprite.py input/zubat-run.gif out.gif --preview

Pipeline (per frame):
    1. Convert frame to RGBA.
    2. Auto-detect background color from corner pixels (or use --bg-color).
    3. Flood-fill from all 4 corners — mark pixels within tolerance as transparent.
    4. Erode 1px fringe to remove anti-alias residue.
    5. Re-encode as GIF with transparency index.
"""
import sys
import argparse
from pathlib import Path
from PIL import Image
import numpy as np


# ─────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────

def detect_bg_color(rgba: np.ndarray) -> tuple[int, int, int]:
    """Sample 4 corners + edge midpoints to find most-common opaque color."""
    h, w = rgba.shape[:2]
    samples = [
        rgba[0, 0], rgba[0, w - 1], rgba[h - 1, 0], rgba[h - 1, w - 1],
        rgba[0, w // 2], rgba[h - 1, w // 2],
        rgba[h // 2, 0], rgba[h // 2, w - 1],
    ]
    # Use first fully-opaque corner sample
    for s in samples:
        if s[3] > 200:
            return int(s[0]), int(s[1]), int(s[2])
    return 255, 255, 255  # fallback: white


def color_dist(pixel: np.ndarray, target: tuple[int, int, int]) -> float:
    return float(np.sqrt(
        (int(pixel[0]) - target[0]) ** 2 +
        (int(pixel[1]) - target[1]) ** 2 +
        (int(pixel[2]) - target[2]) ** 2
    ))


def flood_fill_alpha(rgba: np.ndarray, bg: tuple[int, int, int], tol: int) -> np.ndarray:
    """BFS flood-fill from all 4 corners — set matching pixels to alpha=0."""
    h, w = rgba.shape[:2]
    visited = np.zeros((h, w), dtype=bool)
    mask = np.zeros((h, w), dtype=bool)

    seeds = [(0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)]
    queue = []
    for r, c in seeds:
        if not visited[r, c] and color_dist(rgba[r, c], bg) <= tol:
            queue.append((r, c))
            visited[r, c] = True

    while queue:
        r, c = queue.pop()
        mask[r, c] = True
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < h and 0 <= nc < w and not visited[nr, nc]:
                if color_dist(rgba[nr, nc], bg) <= tol:
                    visited[nr, nc] = True
                    queue.append((nr, nc))

    result = rgba.copy()
    result[mask, 3] = 0
    return result


def erode_fringe(rgba: np.ndarray, pixels: int) -> np.ndarray:
    """Erode semi-transparent edge pixels to remove anti-alias fringe."""
    if pixels <= 0:
        return rgba
    from PIL import ImageFilter
    img = Image.fromarray(rgba, 'RGBA')
    alpha = img.split()[3]
    for _ in range(pixels):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    r, g, b, _ = img.split()
    img = Image.merge('RGBA', (r, g, b, alpha))
    return np.array(img)


def process_frame(frame: Image.Image, bg: tuple[int, int, int], tol: int, fringe: int) -> Image.Image:
    """Convert one GIF frame to RGBA with transparent background."""
    rgba = np.array(frame.convert('RGBA'))
    rgba = flood_fill_alpha(rgba, bg, tol)
    if fringe > 0:
        rgba = erode_fringe(rgba, fringe)
    return Image.fromarray(rgba, 'RGBA')


# ─────────────────────────────────────────────────────────
#  GIF encode helper
# ─────────────────────────────────────────────────────────

def rgba_to_p_with_transparency(rgba_img: Image.Image) -> tuple[Image.Image, int]:
    """
    Quantize RGBA frame to palette mode with a dedicated transparent index.
    Returns (P-mode image, transparent_index).
    """
    # Separate alpha
    alpha = np.array(rgba_img)[:, :, 3]
    rgb = rgba_img.convert('RGB')

    # Quantize to 255 colors, leaving slot 255 for transparent
    p_img = rgb.quantize(colors=255, dither=0)
    palette = p_img.getpalette()  # list of R,G,B * 256

    # Append transparent color at index 255 (black, unused)
    palette[255 * 3:255 * 3 + 3] = [0, 0, 0]
    p_img.putpalette(palette)

    # Pixels where alpha < 128 → index 255 (transparent)
    px = np.array(p_img)
    px[alpha < 128] = 255
    final = Image.fromarray(px, 'P')
    final.putpalette(palette)
    return final, 255


# ─────────────────────────────────────────────────────────
#  Main
# ─────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description='Remove GIF background for G23 Pokemon sprites')
    ap.add_argument('input', help='Source GIF file')
    ap.add_argument('output', help='Output GIF file')
    ap.add_argument('--bg-color', help='Force background R,G,B e.g. 255,255,255')
    ap.add_argument('--tolerance', type=int, default=24, help='Color match tolerance (default 24)')
    ap.add_argument('--fringe', type=int, default=1, help='Anti-alias fringe erosion px (default 1)')
    ap.add_argument('--preview', action='store_true', help='Save first-frame PNG preview')
    args = ap.parse_args()

    src = Path(args.input)
    dst = Path(args.output)
    dst.parent.mkdir(parents=True, exist_ok=True)

    if not src.exists():
        print(f'ERROR: {src} not found', file=sys.stderr)
        sys.exit(1)

    gif = Image.open(src)

    # Detect or parse background color
    if args.bg_color:
        parts = [int(x.strip()) for x in args.bg_color.split(',')]
        bg_color: tuple[int, int, int] = (parts[0], parts[1], parts[2])
        print(f'Background: forced {bg_color}')
    else:
        first_rgba = np.array(gif.convert('RGBA'))
        bg_color = detect_bg_color(first_rgba)
        print(f'Background: auto-detected {bg_color}')

    print(f'Tolerance: {args.tolerance}  Fringe: {args.fringe}px')

    # Collect frame durations
    durations: list[int] = []
    try:
        while True:
            durations.append(gif.info.get('duration', 80))
            gif.seek(gif.tell() + 1)
    except EOFError:
        pass

    n_frames = len(durations)
    print(f'Frames: {n_frames}')

    # Process each frame
    frames_rgba: list[Image.Image] = []
    gif.seek(0)
    for i in range(n_frames):
        gif.seek(i)
        rgba_frame = process_frame(gif, bg_color, args.tolerance, args.fringe)
        frames_rgba.append(rgba_frame)
        if (i + 1) % 5 == 0 or i == n_frames - 1:
            print(f'  processed {i+1}/{n_frames} frames')

    if args.preview:
        preview_path = dst.with_suffix('.preview.png')
        frames_rgba[0].save(preview_path)
        print(f'Preview saved: {preview_path}')

    # Encode as palette GIF with transparency
    frames_p: list[Image.Image] = []
    trans_index: int = 255
    for rgba in frames_rgba:
        p_img, trans_index = rgba_to_p_with_transparency(rgba)
        frames_p.append(p_img)

    frames_p[0].save(
        dst,
        format='GIF',
        save_all=True,
        append_images=frames_p[1:],
        loop=0,
        duration=durations[:n_frames],
        transparency=trans_index,
        disposal=2,  # restore to background — prevents ghost frames
    )

    size_kb = dst.stat().st_size // 1024
    print(f'Saved: {dst}  ({size_kb} KB, {n_frames} frames)')


if __name__ == '__main__':
    main()
