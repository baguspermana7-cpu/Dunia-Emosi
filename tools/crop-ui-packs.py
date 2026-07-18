#!/usr/bin/env python3
"""Crop the owner's 6 UIUX/gameplay sprite sheets into assets/db/<pack>/NNN.webp.
Grids differ per sheet; empty cells (process_cell -> None) are skipped. Cells map
by POSITION (AI labels are unreliable) — see ui-sprites.js for the name maps.
Reuse process_cell (white-flood + fill-holes + largest-component + sticker outline)."""
import importlib.util, os
from PIL import Image
HERE = os.path.dirname(__file__)
spec = importlib.util.spec_from_file_location("cms", os.path.join(HERE, "crop-monster-sheet.py"))
cms = importlib.util.module_from_spec(spec); spec.loader.exec_module(cms)
SRCDIR = os.environ.get("UIPACK_SRC", os.path.expanduser("~/Documents/temporary/game asset/2"))
OUTROOT = os.path.abspath(os.path.join(HERE, "..", "assets", "db"))

# pack -> (filename, cols, rows, label-fraction dropped from bottom of each cell)
SHEETS = {
    "eco":   ("Ekonomi & HUD.png",           7, 4, 0.18),
    "badge": ("Lencana & Medali.png",        7, 4, 0.18),
    "fx":    ("Battle-FX Partikel.png",       7, 4, 0.18),
    "emo":   ("Emosi & Sahabat Hewan.png",    5, 4, 0.16),
    "deco":  ("Dekorasi & Parallax.png",      5, 4, 0.16),
    "conf":  ("Confetti & Perayaan.png",      6, 4, 0.16),
}

def crop_pack(pack, fname, cols, rows, labfrac):
    src = os.path.join(SRCDIR, fname)
    if not os.path.exists(src):
        print("MISS sheet:", src); return 0
    out = os.path.join(OUTROOT, pack); os.makedirs(out, exist_ok=True)
    sheet = Image.open(src).convert("RGBA"); W, H = sheet.size
    cw, ch = W / cols, H / rows
    made = 0
    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c + 1
            cell = sheet.crop((int(c * cw), int(r * ch), int((c + 1) * cw), int(r * ch + ch * (1 - labfrac))))
            spr = cms.process_cell(cell, white=236)
            if spr is not None:
                spr.save(os.path.join(out, ("00%d" % idx)[-3:] + ".webp"), "WEBP", quality=88, method=6)
                made += 1
    print("pack %-6s %dx%d -> %d sprites" % (pack, cols, rows, made))
    return made

if __name__ == "__main__":
    total = 0
    for pack, (fn, co, ro, lf) in SHEETS.items():
        total += crop_pack(pack, fn, co, ro, lf)
    print("TOTAL", total, "sprites in", OUTROOT)
