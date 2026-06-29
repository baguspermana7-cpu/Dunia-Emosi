#!/usr/bin/env python3
"""v55.90 — detect each plate's painted TRACK BEDS and set laneRatios.lanes so the 3 game lanes
land ON the rails (not in the dark ballast gaps). Owner: "roda terbawah menyentuh rel terbawah".

A track bed (sleepers + rails, where a loco sits) reads as a BRIGHT, low-saturation horizontal
band; the gaps between tracks are dark. We score each row, find bed peaks in the lower play area,
and pick 3 consecutive peaks with the most even spacing → write to data/g14-journey/levelNN.json.

Run: python3 tools/detect-rail-lanes.py            # all levels with a plate + manifest
     python3 tools/detect-rail-lanes.py 3           # one level (prints scores, no write w/ --dry)
     python3 tools/detect-rail-lanes.py 3 --dry
"""
import sys, os, json, glob
import numpy as np
from PIL import Image

DATA = "data/g14-journey"
PLATE = "assets/train/backdrop/level{:02d}-1024.webp"

def bed_scores(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(float); H, W = a.shape[:2]
    mx = a.max(2); mn = a.min(2); sat = (mx - mn) / (mx + 1e-6); val = mx / 255.0
    bed = ((sat < 0.30) & (val > 0.42)).astype(float).mean(1)
    bed = np.convolve(bed, np.ones(3) / 3, "same")
    return bed, H

def peaks(bed, H, lo=0.52, hi=0.90, thr=0.18):
    out = []
    for y in range(int(lo * H), int(hi * H)):
        if bed[y] >= thr and bed[y] >= bed[y - 3] and bed[y] >= bed[y + 3]:
            if out and (y - out[-1][0]) < int(0.035 * H):   # merge near-duplicates, keep stronger
                if bed[y] > out[-1][1]:
                    out[-1] = (y, bed[y])
                continue
            out.append((y, bed[y]))
    return [(y / H, s) for y, s in out]

def pick3(pk):
    """choose 3 consecutive peaks maximising strength and spacing evenness."""
    if len(pk) < 3:
        return None
    best, bestscore = None, -1e9
    for i in range(len(pk) - 2):
        tri = pk[i:i + 3]
        fr = [t[0] for t in tri]; sc = [t[1] for t in tri]
        d1, d2 = fr[1] - fr[0], fr[2] - fr[1]
        even = -abs(d1 - d2) * 8            # penalise uneven spacing
        span = (d1 + d2)                    # prefer a usable spread (not too tight)
        tight = -max(0, 0.06 - min(d1, d2)) * 20   # penalise <0.06 spacing
        score = sum(sc) + even + tight + min(span, 0.26)
        if score > bestscore:
            bestscore, best = score, fr
    return [round(f, 3) for f in best] if best else None

def process(level, dry):
    plate = PLATE.format(level)
    mpath = os.path.join(DATA, f"level{level:02d}.json")
    if not os.path.exists(plate) or not os.path.exists(mpath):
        return None
    bed, H = bed_scores(plate)
    pk = peaks(bed, H)
    lanes = pick3(pk)
    FALLBACK = [0.66, 0.74, 0.82]   # tight foreground triple when beds can't be detected
    fell_back = False                # (dark/water/tunnel plates) — never the old 0.62/0.74/0.86
    if not lanes:                    # spread (that oversized the loco).
        lanes = FALLBACK; fell_back = True
    # NB: lanes are bed CENTERS; the game (g14BackdropLanes) applies a perspective downward
    # nudge so the near/bottom lane's wheels reach its LOWER rail (v55.91).
    m = json.load(open(mpath, encoding="utf-8"))
    old = (m.get("laneRatios") or {}).get("lanes")
    if dry:
        print(f"L{level:02d}: peaks={[ (round(f,2),round(s,2)) for f,s in pk]}\n        old={old} → new={lanes}")
        return lanes
    m.setdefault("laneRatios", {})["lanes"] = lanes
    json.dump(m, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"L{level:02d}: {old} → {lanes}" + ("  (fallback — no beds detected)" if fell_back else ""))
    return lanes

def main():
    dry = "--dry" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        process(int(args[0]), dry)
        return
    levels = sorted(int(os.path.basename(p)[5:7]) for p in glob.glob(os.path.join(DATA, "level*.json")))
    changed = sum(1 for lv in levels if process(lv, dry))
    print(f"\n{'(dry) ' if dry else ''}set lanes on {changed} levels")

if __name__ == "__main__":
    main()
