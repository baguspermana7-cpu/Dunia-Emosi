#!/usr/bin/env python3
"""
Character sprite preprocessor — deterministic pipeline for cartoon train art.

Why this exists:
- AI rembg (u2net, isnet) hallucinates on flat cartoon art, removing inner body regions.
- Each sprite source has different characteristics (white bg JPEG / gray matte PNG / transparent PNG).
- Need consistent output dimensions for game engine positioning (spriteHeight + wheelPositions).

Usage:
    python3 scripts/process-character-sprite.py <input> <output.webp> [--outline] [--detect-wheels]

Example:
    python3 scripts/process-character-sprite.py \\
        "assets/train/linus casey/Linus.png" \\
        assets/train/linus-body.webp \\
        --outline --detect-wheels

Pipeline:
1. Detect source type — RGBA with existing transparency, white bg, gray matte, colored bg
2. Apply best threshold removal (no AI hallucination on flat fills)
3. Strip horizontal rail lines (thin dark bands <=6px with >70% opacity, brightness <60)
4. Optional: erode 1px anti-alias fringe + dilate 3px to add white outline stroke (for blend)
5. Crop to content bbox
6. Resize max 700px width
7. Save as WebP quality 92 method 6
8. Optional: scan sprite for wheel positions (dark clusters in bottom 20%)

See documentation/LESSONS-LEARNED.md "Manual threshold beats AI rembg for cartoon art".
"""
import sys
import argparse
from PIL import Image, ImageFilter
import numpy as np


def detect_source_bg(arr, h, w):
    """Return ('transparent', 'white', 'gray', 'colored') based on corner sampling."""
    corners = [arr[0,0], arr[0,w-1], arr[h-1,0], arr[h-1,w-1]]
    alphas = [c[3] for c in corners]
    if all(a < 128 for a in alphas):
        return 'transparent'
    rgbs = [c[:3] for c in corners]
    # All corners nearly white?
    if all(r >= 235 and g >= 235 and b >= 235 for r,g,b in rgbs):
        return 'white'
    # All corners similar gray?
    if all(abs(int(r)-int(g)) < 20 and abs(int(g)-int(b)) < 20 and 180 <= r <= 245 for r,g,b in rgbs):
        return 'gray'
    return 'colored'


def threshold_remove(arr, threshold=235, cream_strip=False):
    """Remove near-white + optional cream bg."""
    rgb = arr[:,:,:3]
    white_mask = (rgb[:,:,0] >= threshold) & (rgb[:,:,1] >= threshold) & (rgb[:,:,2] >= threshold)
    arr[white_mask, 3] = 0
    if cream_strip:
        cream_mask = ((rgb[:,:,0] >= 200) & (rgb[:,:,1] >= 200) & (rgb[:,:,2] >= 180) &
                      (abs(rgb[:,:,0].astype(int) - rgb[:,:,1].astype(int)) < 25) &
                      (abs(rgb[:,:,1].astype(int) - rgb[:,:,2].astype(int)) < 30))
        arr[cream_mask, 3] = 0
    return arr


def strip_rail_lines(arr, h, w, max_thickness=6, brightness_thresh=60, opacity_min=0.5):
    """Remove thin dark horizontal bands (rail lines embedded in source art)."""
    rail_rows = []
    for y in range(h):
        row = arr[y]
        opaque = (row[:, 3] > 128)
        if opaque.sum() < w * opacity_min: continue
        op_rgb = row[opaque, :3]
        if op_rgb.mean() > brightness_thresh: continue
        rail_rows.append(y)
    if not rail_rows: return arr
    groups = [[rail_rows[0]]]
    for y in rail_rows[1:]:
        if y - groups[-1][-1] <= 1: groups[-1].append(y)
        else: groups.append([y])
    for g in groups:
        if len(g) <= max_thickness:
            for y in g: arr[y, :, 3] = 0
    return arr


def add_outline(arr, stroke_px=3, alpha=240):
    """Add white stroke around sprite silhouette for cartoon-style blend."""
    alpha_ch = arr[:,:,3]
    a_bin = (alpha_ch > 64).astype(np.uint8) * 255
    a_img = Image.fromarray(a_bin, 'L')
    dilated = a_img.filter(ImageFilter.MaxFilter(2 * stroke_px + 1))
    dil_arr = np.array(dilated)
    stroke = (dil_arr > 64) & (alpha_ch <= 64)
    arr[stroke, 0] = 255
    arr[stroke, 1] = 255
    arr[stroke, 2] = 255
    arr[stroke, 3] = alpha
    return arr


def erode_fringe(img, iterations=1):
    """Erode alpha mask by N pixels to kill anti-alias fringe."""
    alpha = img.split()[-1]
    for _ in range(iterations):
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    img.putalpha(alpha)
    return img


def detect_wheels(arr, h, w, target_height=100):
    """Return list of [x_rel, y_rel, radius] wheel positions in render-space.

    Assumes sprite will be rendered at target_height. Scans bottom 20% for dark clusters.
    """
    bottom_y = int(h * 0.78)
    wheel_cols = []
    for x in range(w):
        for y in range(bottom_y, h):
            r, g, b, a = arr[y, x]
            if a > 128 and r < 100 and g < 100 and b < 100:
                wheel_cols.append(x); break
    if not wheel_cols: return []
    groups = [[wheel_cols[0]]]
    for x in wheel_cols[1:]:
        if x - groups[-1][-1] <= 5: groups[-1].append(x)
        else: groups.append([x])
    scale = target_height / h
    result = []
    for g in groups:
        if len(g) < 3: continue
        c = sum(g) // len(g)
        width = g[-1] - g[0] + 1
        x_rel = int(round((c - w // 2) * scale))
        r = max(4, int(width * scale * 0.4))
        result.append([x_rel, -int(round(6)), r])
    return result


def process(src_path, out_path, add_stroke=False, do_detect_wheels=False,
            target_height=100, max_width=700):
    img = Image.open(src_path).convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]
    bg_type = detect_source_bg(arr, h, w)
    print(f'[info] Source {w}×{h}, bg type: {bg_type}')

    if bg_type == 'transparent':
        pass  # no removal needed
    elif bg_type == 'white':
        arr = threshold_remove(arr, threshold=240)
    elif bg_type == 'gray':
        arr = threshold_remove(arr, threshold=200)
    else:  # colored
        arr = threshold_remove(arr, threshold=235)

    arr = strip_rail_lines(arr, h, w)

    if add_stroke:
        tmp = Image.fromarray(arr, 'RGBA')
        tmp = erode_fringe(tmp, iterations=1)
        arr = np.array(tmp)
        arr = add_outline(arr, stroke_px=3, alpha=240)

    out = Image.fromarray(arr, 'RGBA')
    bbox = out.getbbox()
    if bbox: out = out.crop(bbox)
    if out.width > max_width:
        out.thumbnail((max_width, max_width), Image.LANCZOS)
    out.save(out_path, 'WEBP', quality=92, method=6)
    print(f'[ok] Saved {out.size[0]}×{out.size[1]} → {out_path}')

    if do_detect_wheels:
        final_arr = np.array(out)
        wheels = detect_wheels(final_arr, *final_arr.shape[:2], target_height=target_height)
        if wheels:
            print(f'[wheels] Detected {len(wheels)} clusters at target spriteHeight={target_height}:')
            print(f'  wheelPositions: {wheels}')
        else:
            print('[wheels] No clusters auto-detected — use manual calibration or set wheelPositions:[]')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('input')
    ap.add_argument('output')
    ap.add_argument('--outline', action='store_true', help='Add white stroke around sprite')
    ap.add_argument('--detect-wheels', action='store_true', help='Auto-detect wheel positions')
    ap.add_argument('--target-height', type=int, default=100, help='Target render spriteHeight for wheel scaling')
    ap.add_argument('--max-width', type=int, default=700)
    args = ap.parse_args()
    process(args.input, args.output, add_stroke=args.outline,
            do_detect_wheels=args.detect_wheels,
            target_height=args.target_height, max_width=args.max_width)


if __name__ == '__main__':
    main()
