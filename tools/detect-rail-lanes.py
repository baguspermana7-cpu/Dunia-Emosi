#!/usr/bin/env python3
"""v55.92 — CALIBRATE each plate's 3 rail lanes (SPREAD: top / middle / bottom track) and emit an
overlay image per plate for VISUAL verification. Owner wants lane 3 = a high track, lane 2 =
middle, lane 1 = a low track, each line sitting ON a painted rail, consistent across plates.

A rail/bed reads as a BRIGHT, low-saturation horizontal row; gaps between tracks are dark. We score
each row, find the rail-area span from the peaks, split it into 3 zones (top/mid/bottom) and take
the STRONGEST peak in each zone → 3 well-separated rails. Writes laneRatios.lanes to
data/g14-journey/levelNN.json and an overlay PNG to tools/qa-out/lanecal/levelNN.png.

Run: python3 tools/detect-rail-lanes.py            # all levels (write + overlays)
     python3 tools/detect-rail-lanes.py 5 --dry     # one level, print only
"""
import sys, os, json, glob
import numpy as np
from PIL import Image, ImageDraw

DATA = "data/g14-journey"
PLATE = "assets/train/backdrop/level{:02d}-1024.webp"
OVL = "tools/qa-out/lanecal"

def bed_scores(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(float); H, W = a.shape[:2]
    mx = a.max(2); mn = a.min(2); sat = (mx - mn) / (mx + 1e-6); val = mx / 255.0
    bed = ((sat < 0.32) & (val > 0.40)).astype(float).mean(1)
    bed = np.convolve(bed, np.ones(3) / 3, "same")
    return bed, H

def all_peaks(bed, H, lo=0.46, hi=0.94, thr=0.12):
    out = []
    for y in range(int(lo * H), int(hi * H)):
        if bed[y] >= thr and bed[y] >= bed[y - 2] and bed[y] >= bed[y + 2]:
            if out and (y - out[-1][0]) < int(0.025 * H):
                if bed[y] > out[-1][1]: out[-1] = (y, bed[y])
                continue
            out.append((y, bed[y]))
    return [(y / H, float(s)) for y, s in out]

def pick_spread(pk):
    """3 SPREAD rails: strongest peak in each of the 3 zones of the rail-area span."""
    if len(pk) < 3:
        return None
    fr = [p[0] for p in pk]
    pmin, pmax = min(fr), max(fr)
    if pmax - pmin < 0.12:
        return None
    band = (pmax - pmin) / 3.0
    chosen = []
    for z in range(3):
        z0, z1 = pmin + z * band, pmin + (z + 1) * band + (1e-6 if z == 2 else 0)
        cands = [p for p in pk if z0 <= p[0] <= z1]
        if not cands:                       # empty zone → nearest peak to the zone centre
            zc = (z0 + z1) / 2
            cands = [min(pk, key=lambda p: abs(p[0] - zc))]
        chosen.append(max(cands, key=lambda p: p[1])[0])
    chosen = sorted(set(round(c, 3) for c in chosen))
    return chosen if len(chosen) == 3 else None

def overlay(plate, lanes, out):
    im = Image.open(plate).convert("RGB"); W, H = im.size
    d = ImageDraw.Draw(im)
    cols = [(255, 60, 60), (60, 255, 120), (80, 160, 255)]
    for i, f in enumerate(lanes):
        y = int(f * H)
        d.line([(0, y), (W, y)], fill=cols[i], width=2)
        d.text((4, y - 12), f"L{3-i} {f:.3f}", fill=cols[i])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out)

def process(level, dry):
    plate = PLATE.format(level); mpath = os.path.join(DATA, f"level{level:02d}.json")
    if not (os.path.exists(plate) and os.path.exists(mpath)):
        return None
    bed, H = bed_scores(plate)
    pk = all_peaks(bed, H)
    lanes = pick_spread(pk)
    fell = False
    if not lanes:
        lanes = [0.56, 0.70, 0.84]; fell = True     # spread fallback (dark/water plates)
    if dry:
        print(f"L{level:02d}: peaks={[(round(f,2),round(s,2)) for f,s in pk]}\n        lanes={lanes}{' (fallback)' if fell else ''}")
        return lanes
    m = json.load(open(mpath, encoding="utf-8"))
    m.setdefault("laneRatios", {})["lanes"] = lanes
    json.dump(m, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    overlay(plate, lanes, os.path.join(OVL, f"level{level:02d}.png"))
    print(f"L{level:02d}: lanes={lanes}{' (fallback)' if fell else ''}")
    return lanes

def main():
    dry = "--dry" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        process(int(args[0]), dry); return
    lv = sorted(int(os.path.basename(p)[5:7]) for p in glob.glob(os.path.join(DATA, "level*.json")))
    n = sum(1 for x in lv if process(x, dry))
    print(f"\n{'(dry) ' if dry else ''}calibrated {n} levels → overlays in {OVL}/")

if __name__ == "__main__":
    main()
