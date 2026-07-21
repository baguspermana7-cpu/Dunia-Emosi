#!/usr/bin/env python3
"""Generic cropper for the owner-generated icon sheets (RGB, gray checkerboard bg,
no labels). Keys out the checkerboard, finds icon blobs, orders them row-major,
crops each to a transparent sticker webp, writes a numbered montage for review.
Usage: crop-emoji-grid.py <sheet.png> <outdir> [min_area]"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1]
OUT = sys.argv[2]
MIN_AREA = int(sys.argv[3]) if len(sys.argv) > 3 else 1400
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert('RGB')
arr = np.array(im).astype(int)
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
sat = mx - mn
# bg is low-saturation: EITHER white (~>232) OR gray checkerboard (~80-160).
# (sheets vary: some white bg, some gray checkerboard.)
bg = (sat < 26) & ((mx > 232) | ((mx > 78) & (mx < 162)))
fg = ~bg
# clean tiny speckle, close holes so an icon = one blob
fg = ndimage.binary_opening(fg, iterations=1)
fg = ndimage.binary_closing(fg, iterations=3)
lbl, n = ndimage.label(fg)
objs = ndimage.find_objects(lbl)

boxes = []
for i, sl in enumerate(objs):
    ys, xs = sl
    h, w = ys.stop - ys.start, xs.stop - xs.start
    area = (lbl[sl] == i + 1).sum()
    if area < MIN_AREA: continue
    if w < 26 or h < 26: continue
    if w > 260 or h > 260: continue
    boxes.append([xs.start, ys.start, w, h, i + 1])

# order row-major: cluster rows by y-center
boxes.sort(key=lambda B: B[1] + B[3] / 2)
rows, cur, last = [], [], None
for B in boxes:
    cy = B[1] + B[3] / 2
    if last is None or cy - last < 55:
        cur.append(B)
    else:
        rows.append(cur); cur = [B]
    last = cy
if cur: rows.append(cur)
ordered = []
for row in rows:
    row.sort(key=lambda B: B[0])
    ordered += row

def sticker(cell_arr, mask, px=200):
    ys, xs = np.where(mask)
    if len(ys) == 0: return None
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    rgba = np.dstack([cell_arr.astype(np.uint8), (mask * 255).astype(np.uint8)])
    crop = Image.fromarray(rgba[y0:y1 + 1, x0:x1 + 1], 'RGBA')
    crop.thumbnail((px - 16, px - 16), Image.LANCZOS)
    if crop.width < 4 or crop.height < 4: return None
    a = np.array(crop); al = a[:, :, 3]
    d = ndimage.binary_dilation(al > 40, iterations=6)
    ring = d & ~(al > 40)
    a[ring] = [255, 255, 255, 255]
    im2 = Image.fromarray(a, 'RGBA')
    c = Image.new('RGBA', (px, px), (0, 0, 0, 0))
    c.paste(im2, ((px - crop.width) // 2, (px - crop.height) // 2), im2)
    return c

cells = []
idx = 0
for x, y, w, h, lab in ordered:
    idx += 1
    sub = arr[y:y + h, x:x + w]
    m = (lbl[y:y + h, x:x + w] == lab)
    spr = sticker(sub, m)
    if spr is None: continue
    spr.save(f'{OUT}/{idx:03d}.webp', 'WEBP', quality=90)
    cells.append((idx, spr))

cols = 12
rows_n = (len(cells) + cols - 1) // cols
mon = Image.new('RGB', (cols * 96, rows_n * 108), (36, 36, 44))
from PIL import ImageDraw
dr = ImageDraw.Draw(mon)
for i, (nn, spr) in enumerate(cells):
    t = spr.copy(); t.thumbnail((84, 84))
    cx, cy = (i % cols) * 96, (i // cols) * 108
    bgt = Image.new('RGB', (96, 96), (58, 58, 68))
    bgt.paste(t, ((96 - t.width) // 2, (96 - t.height) // 2), t)
    mon.paste(bgt, (cx, cy))
    dr.text((cx + 2, cy + 96), str(nn), fill=(200, 200, 120))
mon.save(f'{OUT}/montage.png')
print(f'cropped {len(cells)} icons → {OUT}   montage → {OUT}/montage.png')
