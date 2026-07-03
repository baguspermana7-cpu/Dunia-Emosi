#!/usr/bin/env python3
"""v56.6 B-286/B1 — REAL parallax depth for g14: rewrite each level manifest's `bands`
table ONLY (lanes/lanesVerified/backdrop untouched — the lane data is HAND-VERIFIED).

Why: all 48 manifests shared ONE hardcoded template where the top 48% of the painting
(sky + mountains + village = where depth reads most) scrolled as a single near-static
band (speed 0.06) and the six rail strips differed only ~1.25x adjacent → flat scene.

New per-level table:
  sky   [0 .. cut1]     speed 0.02   (near-static)
  far   [cut1 .. cut2]  speed 0.10   (mountains / distant city)
  near  [cut2 .. 0.48]  speed 0.25   (village / tree line)
  rails [0.48 .. 1.0]   6 strips, speeds 0.45 / 0.65 / 0.90 / 1.15 / 1.40 / 1.60
The 2 new cuts are chosen PER LEVEL on the rows of minimum horizontal edge energy in
[0.10..0.46] (band tears land in sky/haze, not through buildings) with sep >= 0.08.

Run: python3 tools/regen-bands.py            # write all 48
     python3 tools/regen-bands.py --dry      # print only
"""
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data/g14-journey")
PLATE = os.path.join(ROOT, "assets/train/backdrop/level{:02d}-1024.webp")
RAIL_TOP = 0.48
RAIL_SPEEDS = [0.45, 0.65, 0.90, 1.15, 1.40, 1.60]


def low_edge_cuts(path):
    im = Image.open(path).convert("L")
    a = np.asarray(im).astype(float)
    H = a.shape[0]
    # per-row horizontal edge energy, smoothed
    e = np.abs(np.diff(a, axis=1)).mean(1)
    e = np.convolve(e, np.ones(7) / 7, "same")
    lo, hi = int(0.10 * H), int(0.46 * H)
    rows = np.argsort(e[lo:hi]) + lo
    cut1 = None
    for r in rows:
        f = r / H
        if cut1 is None:
            cut1 = f
        elif abs(f - cut1) >= 0.08:
            c1, c2 = sorted((cut1, f))
            return round(c1, 3), round(c2, 3)
    return 0.18, 0.34   # degenerate plate → sensible defaults


def bands_for(cut1, cut2):
    out = [
        {"y0": 0.0,  "y1": cut1, "speed": 0.02},
        {"y0": cut1, "y1": cut2, "speed": 0.10},
        {"y0": cut2, "y1": RAIL_TOP, "speed": 0.25},
    ]
    step = (1.0 - RAIL_TOP) / len(RAIL_SPEEDS)
    for i, sp in enumerate(RAIL_SPEEDS):
        out.append({"y0": round(RAIL_TOP + i * step, 3),
                    "y1": round(RAIL_TOP + (i + 1) * step, 3) if i < len(RAIL_SPEEDS) - 1 else 1.0,
                    "speed": sp})
    return out


def main():
    dry = "--dry" in sys.argv
    n = 0
    for f in sorted(glob.glob(os.path.join(DATA, "level*.json"))):
        lv = int(os.path.basename(f)[5:7])
        plate = PLATE.format(lv)
        if not os.path.exists(plate):
            continue
        c1, c2 = low_edge_cuts(plate)
        m = json.load(open(f, encoding="utf-8"))
        assert (m.get("laneRatios") or {}).get("lanesVerified"), f"L{lv}: lanes not verified — abort"
        if dry:
            print(f"L{lv:02d}: cuts {c1}/{c2}")
            continue
        m["bands"] = bands_for(c1, c2)
        json.dump(m, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
        n += 1
    print(("(dry) " if dry else "") + f"rebanded {n} manifests (lanes untouched)")


if __name__ == "__main__":
    main()
