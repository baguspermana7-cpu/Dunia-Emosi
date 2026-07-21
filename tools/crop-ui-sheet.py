#!/usr/bin/env python3
"""Crop the generated 'ui' icon sheet (RGB, checkerboard bg, baked labels) into
clean transparent webp sprites. Uniform 10-col grid; per cell keep the top icon
region (drop the text label band), key out the gray checkerboard, sticker border.
Outputs a montage for review + individual webp under a preview dir."""
import numpy as np, os
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = '/tmp/emoji-sheets/ui.png'
OUT = '/tmp/emoji-sheets/ui-crop'
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert('RGB')
W, H = im.size
arr = np.array(im).astype(int)

COLS = 10
# grid geometry measured from tile detection: first row icons ~y48, row pitch ~137
ROW_Y = [48, 185, 322, 459, 596]      # top of each icon band
CELL_W = W / COLS                      # 140.8
ICON_H = 104                           # icon height within a cell (excludes label)
PAD = 8

# how many real icons per row (last row 7)
ROW_N = [10, 10, 10, 10, 7]

def keyout(cell):
    a = np.array(cell.convert('RGB')).astype(int)
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
    sat = mx - mn
    # checkerboard bg = low-saturation gray in ~85-140 value → background
    gray_bg = (sat < 22) & (mx > 80) & (mx < 150)
    fg = ~gray_bg
    # flood border-touching bg to be safe, then keep icon blob(s)
    fl, n = ndimage.label(fg)
    if n == 0: return None
    sizes = ndimage.sum(np.ones_like(fl), fl, range(1, n + 1))
    big = sizes.max()
    keep = [i + 1 for i, s in enumerate(sizes) if s >= max(60, big * 0.05)]
    m = np.isin(fl, keep)
    ys, xs = np.where(m)
    if len(ys) == 0: return None
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    rgba = np.dstack([a.astype(np.uint8), (m * 255).astype(np.uint8)])
    crop = Image.fromarray(rgba[y0:y1 + 1, x0:x1 + 1], 'RGBA')
    return crop

def sticker(img, px=200):
    img.thumbnail((px - 16, px - 16), Image.LANCZOS)
    a = np.array(img)
    alpha = a[:, :, 3]
    # white outline: dilate alpha, fill new ring white
    d = ndimage.binary_dilation(alpha > 40, iterations=6)
    ring = d & ~(alpha > 40)
    out = a.copy()
    canvas = np.zeros((img.height, img.width, 4), np.uint8)
    canvas[:] = a
    canvas[ring] = [255, 255, 255, 255]
    im2 = Image.fromarray(canvas, 'RGBA')
    c = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    c.paste(im2, ((px - img.width) // 2, (px - img.height) // 2), im2)
    return c

idx = 0
cells = []
for r, ny in enumerate(ROW_N):
    for c in range(ny):
        idx += 1
        x = int(c * CELL_W + PAD)
        y = ROW_Y[r]
        box = im.crop((x, y, int(x + CELL_W - PAD), y + ICON_H))
        cut = keyout(box)
        if cut is None:
            continue
        spr = sticker(cut)
        spr.save(f'{OUT}/{idx:03d}.webp', 'WEBP', quality=90)
        cells.append((idx, spr))

# montage
cols = 10
rows = (len(cells) + cols - 1) // cols
mon = Image.new('RGB', (cols * 110, rows * 110), (40, 40, 48))
for i, (n, spr) in enumerate(cells):
    t = spr.copy(); t.thumbnail((104, 104))
    bg = Image.new('RGB', (110, 110), (60, 60, 70))
    bg.paste(t, ((110 - t.width) // 2, (110 - t.height) // 2), t)
    mon.paste(bg, ((i % cols) * 110, (i // cols) * 110))
mon.save('/tmp/emoji-sheets/ui-montage.png')
print(f'cropped {len(cells)} ui icons → {OUT}')
print('montage → /tmp/emoji-sheets/ui-montage.png')
