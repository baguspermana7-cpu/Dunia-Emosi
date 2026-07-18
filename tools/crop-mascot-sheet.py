#!/usr/bin/env python3
"""Crop the owner's 12-mascot sheet (4 cols x 3 rows, pure white, label under each)
into assets/db/mascots/001.webp..012.webp. Order = sheet numbering:
1 Kodok, 2 Sapi, 3 Burung-Beo, 4 Keong, 5 Lebah, 6 Burung-Hantu, 7 Hero-Anak,
8 Hero-Putri, 9 Kelinci, 10 Rubah, 11 Panda, 12 Bintang.
Keep top ~80% of each cell (drop the name label); reuse process_cell from
crop-monster-sheet.py (white-flood + fill-holes + largest-component + sticker outline)."""
import importlib.util, os
from PIL import Image
HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("cms", os.path.join(HERE, "crop-monster-sheet.py"))
cms = importlib.util.module_from_spec(spec); spec.loader.exec_module(cms)
SRC = os.environ.get("MASCOT_SRC", os.path.expanduser("~/Downloads/Maskot & Hero Pojok .png"))
OUT = os.path.abspath(os.path.join(HERE, "..", "assets", "db", "mascots"))
os.makedirs(OUT, exist_ok=True)
COLS, ROWS = 4, 3
sheet = Image.open(SRC).convert("RGBA"); W, H = sheet.size
cw, ch = W / COLS, H / ROWS
made = 0
for r in range(ROWS):
    for c in range(COLS):
        idx = r * COLS + c + 1
        cell = sheet.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int(r * ch + ch * 0.80)))
        spr = cms.process_cell(cell, white=236)
        if spr is not None:
            spr.save(os.path.join(OUT, ("00%d" % idx)[-3:] + ".webp"), "WEBP", quality=88, method=6)
            made += 1
        else:
            print("WARN cell", idx, "empty")
print("cropped", made, "of 12 ->", OUT)
