#!/usr/bin/env python3
"""v55.89 — bake a thin white sticker outline onto the 275 world train sprites + emit WebP.

Source: assets/train/train char world/index/NNN.png  (transparent RGBA, cropped to content,
all facing LEFT). We do NOT mirror in-file — the game/picker mirror at runtime via faces:'left'
(same convention as the AEG pack), so picker and gameplay stay consistent.

Output: assets/train/world/NNN.webp  (thin ~3px white outline like caseyjr-body.webp, transparent
bg, quality 88). Outline = dilate alpha → white fill → composite original on top, on a padded
canvas so the stroke is never clipped, then re-cropped to content.

Run: python3 tools/build-train-world-sprites.py            # all 275
     python3 tools/build-train-world-sprites.py 1 5        # range (debug)
"""
import sys, os
from PIL import Image, ImageFilter

SRC = "assets/train/train char world/index"
OUT = "assets/train/world"
OUTLINE_PX = 3        # stroke half-width in px (thin, like Casey JR)
PAD = OUTLINE_PX + 3
QUALITY = 88

def outline(im, px=OUTLINE_PX):
    im = im.convert("RGBA")
    # pad so the dilated stroke isn't clipped at the cropped edges
    w, h = im.size
    canvas = Image.new("RGBA", (w + PAD * 2, h + PAD * 2), (0, 0, 0, 0))
    canvas.paste(im, (PAD, PAD))
    a = canvas.split()[3]
    # binarize alpha then dilate via MaxFilter (odd kernel) for a clean solid stroke
    mask = a.point(lambda v: 255 if v > 40 else 0)
    dil = mask.filter(ImageFilter.MaxFilter(px * 2 + 1))
    dil = dil.filter(ImageFilter.GaussianBlur(0.6)).point(lambda v: 255 if v > 60 else 0)
    white = Image.new("RGBA", canvas.size, (255, 255, 255, 255))
    white.putalpha(dil)
    out = Image.alpha_composite(white, canvas)
    # re-crop to content (the white stroke is now the outer bound)
    bbox = out.split()[3].getbbox()
    return out.crop(bbox) if bbox else out

def main():
    os.makedirs(OUT, exist_ok=True)
    lo, hi = 1, 275
    if len(sys.argv) == 3:
        lo, hi = int(sys.argv[1]), int(sys.argv[2])
    done = 0
    for i in range(lo, hi + 1):
        name = f"{i:03d}"
        src = os.path.join(SRC, name + ".png")
        if not os.path.exists(src):
            print("MISS", src); continue
        im = Image.open(src)
        out = outline(im)
        out.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=QUALITY, method=6)
        done += 1
    print(f"outlined+webp {done} sprites → {OUT}/")

if __name__ == "__main__":
    main()
