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
    # v55.93 — the train must sit on a RAIL = a DARK horizontal line (val minimum), NOT the bright
    # ballast between rails. Return the per-row brightness `val` (smoothed); rails are its minima.
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(float); H, W = a.shape[:2]
    val = (a.max(2) / 255.0).mean(1)
    val = np.convolve(val, np.ones(3) / 3, "same")
    return val, H

def all_peaks(val, H, lo=0.46, hi=0.90, thr=0.42):
    # RAIL line = a THIN dark minimum (below thr) flanked by BRIGHT ballast above AND below
    # (val>0.45 within ~5 rows each side). The wide dark FOREGROUND vegetation has no bright
    # ballast below it → excluded. Strength = how dark (thr - val).
    out = []; r = max(3, int(0.012 * H))
    for y in range(int(lo * H), int(hi * H)):
        if not (val[y] <= thr and val[y] <= val[y - 2] and val[y] <= val[y + 2]):
            continue
        up = val[max(0, y - 3 * r):y - 1].max() if y - 1 > 0 else 0
        dn = val[y + 1:y + 3 * r].max() if y + 1 < len(val) else 0
        if up < 0.45 or dn < 0.45:           # must be a thin line between ballast, not a wide dark
            continue
        if out and (y - out[-1][0]) < int(0.025 * H):
            if val[y] < out[-1][2]: out[-1] = (y, y / H, val[y])
            continue
        out.append((y, y / H, val[y]))
    return [(f, thr - v) for (_, f, v) in out]   # (frac, strength)

def pick_spread(pk):
    """3 SPREAD rails: in each of 3 zones pick the LOWER (besi bawah) strong rail line."""
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
        cands = [p for p in pk if z0 <= p[0] <= z1 and p[1] > 0.04]   # reasonably dark rails
        if not cands:
            zc = (z0 + z1) / 2
            cands = [min(pk, key=lambda p: abs(p[0] - zc))]
        # besi BAWAH: prefer the LOWEST rail in the zone (tie-break toward darker)
        chosen.append(max(cands, key=lambda p: (p[0], p[1]))[0])
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

def snap_lower_rail(val, H, f, window=0.055):
    # v55.93 — REFINE: snap a lane (currently near the bright ballast / besi ATAS) DOWN onto its
    # track's LOWER rail (besi BAWAH) = the LOWEST thin dark minimum within `window` below it that
    # has bright ballast just above (a real rail under the band the loco was on). Keep f if none.
    # The bottom (near/foreground) lane uses a WIDER window so it reaches the foreground-most rail.
    y0 = max(2, int((f - 0.006) * H)); y1 = min(int(0.91 * H), int((f + window) * H))
    best = None
    for y in range(y0, y1):
        if val[y] <= 0.43 and val[y] <= val[y - 2] and val[y] <= val[y + 2]:
            if val[max(0, y - int(0.03 * H)):y - 1].max() > 0.45:   # bright ballast just above
                best = y                                            # keep last (lowest) qualifier
    return round((best / H) if best is not None else f, 3)

def process(level, dry):
    plate = PLATE.format(level); mpath = os.path.join(DATA, f"level{level:02d}.json")
    if not (os.path.exists(plate) and os.path.exists(mpath)):
        return None
    val, H = bed_scores(plate)
    m = json.load(open(mpath, encoding="utf-8"))
    cur = sorted((m.get("laneRatios") or {}).get("lanes") or [0.56, 0.70, 0.84])
    # bottom (near/foreground) lane gets a WIDER drop so it reaches the foreground-most rail.
    lanes = sorted(round(snap_lower_rail(val, H, f, 0.11 if i == len(cur) - 1 else 0.055), 3)
                   for i, f in enumerate(cur))
    if dry:
        print(f"L{level:02d}: {cur} → {lanes}")
        return lanes
    m.setdefault("laneRatios", {})["lanes"] = lanes
    json.dump(m, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    overlay(plate, lanes, os.path.join(OVL, f"level{level:02d}.png"))
    print(f"L{level:02d}: {cur} → {lanes}")
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
