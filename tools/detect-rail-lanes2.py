#!/usr/bin/env python3
"""v55.97 — RAIL LANE DETECTION v2 (coherence-based, kills vegetation false-positives).

The v1 detector found "a dark row flanked by bright ballast" — which ALSO fires on the grass /
vegetation strip ABOVE the tracks, so the top lane drifted up off the rails (level 2 = 0.495,
level 24 = 0.474) and some lanes collapsed onto one rail. Owner: trains float above the rail on
many levels while level 1 is fine.

v2 discriminator = HORIZONTAL COHERENCE. A real steel rail is a thin dark line that runs the FULL
width → at that row, MOST columns are a vertical-local-minimum (darker than the pixels a few rows
above and below, same column). Vegetation dark spots are localised → low coherence. We score each
row by coherence, take the strongest coherent dark lines in the lower scene, enforce a minimum
lane separation, and spread 3 lanes top/mid/bottom across the detected rail band. Bottom lane snaps
to the foreground-most rail.

Writes laneRatios.lanes to data/g14-journey/levelNN.json (overwrites v1 values) and a thick-line
overlay crop to tools/qa-out/lanecal2/levelNN.png for VISUAL verification.

Run: python3 tools/detect-rail-lanes2.py            # all levels
     python3 tools/detect-rail-lanes2.py 2 --dry     # one level, print only
"""
import sys, os, json, glob
import numpy as np
from PIL import Image, ImageDraw

DATA = "data/g14-journey"
PLATE = "assets/train/backdrop/level{:02d}-1024.webp"
OVL = "tools/qa-out/lanecal2"

LO, HI = 0.50, 0.93          # search only the lower scene (rails live here; excludes sky/city)
MIN_SEP = 0.055              # min fraction-H between two lanes (no collapse)
COH_MIN = 0.40              # a row must be a coherent horizontal dark line for ≥40% of its width


def rail_scores(path):
    """Return (val, coh, H): per-row brightness + horizontal dark-line coherence."""
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(float)
    H, W = a.shape[:2]
    gray = a.max(2) / 255.0                      # value channel
    # light vertical smoothing to merge a 1px-noisy rail into one line
    g = np.copy(gray)
    g[1:-1] = (gray[:-2] + gray[1:-1] + gray[2:]) / 3.0
    val = g.mean(1)
    val = np.convolve(val, np.ones(3) / 3, "same")
    r = max(2, int(0.009 * H))                   # vertical radius to compare against
    eps = 0.03
    up = np.empty_like(g); dn = np.empty_like(g)
    up[:r] = g[:r]; up[r:] = g[:-r]              # pixel r rows above (same column)
    dn[-r:] = g[-r:]; dn[:-r] = g[r:]            # pixel r rows below
    # a column is a vertical local-minimum (dark line) at row y
    locmin = (g < up - eps) & (g < dn - eps)
    coh = locmin.mean(1)                         # fraction of width that is a dark line → coherence
    coh = np.convolve(coh, np.ones(3) / 3, "same")
    return val, coh, H


def peaks(val, coh, H):
    """Coherent dark-line rows in the lower band: local maxima of coherence, dark, separated."""
    out = []
    sep = int(MIN_SEP * H)
    for y in range(int(LO * H), int(HI * H)):
        if coh[y] < COH_MIN:
            continue
        if not (coh[y] >= coh[y - 2] and coh[y] >= coh[y + 2]):
            continue
        if out and (y - out[-1][0]) < sep:       # keep the more-coherent of two close lines
            if coh[y] > out[-1][1]:
                out[-1] = (y, coh[y], val[y])
            continue
        out.append((y, coh[y], val[y]))
    # (frac, coherence) sorted top→bottom
    return [(y / H, c) for (y, c, v) in out]


def pick_spread(pk, H):
    """3 well-separated rails: split the detected rail span into top/mid/bottom thirds, take the
    strongest coherent rail in each. Fall back to an even spread if a third has none."""
    if not pk:
        return None
    fr = [p[0] for p in pk]
    pmin, pmax = min(fr), max(fr)
    if pmax - pmin < 0.10:                        # rails too clustered → even spread around them
        c = (pmin + pmax) / 2
        return sorted([round(c - 0.10, 3), round(c, 3), round(c + 0.10, 3)])
    band = (pmax - pmin) / 3.0
    chosen = []
    for z in range(3):
        z0 = pmin + z * band
        z1 = pmin + (z + 1) * band + (1e-6 if z == 2 else 0)
        cands = [p for p in pk if z0 <= p[0] <= z1]
        if cands:
            chosen.append(max(cands, key=lambda p: p[1])[0])   # most coherent rail in the third
        else:
            chosen.append((z0 + z1) / 2)
    chosen = sorted(chosen)
    # enforce minimum separation (nudge apart if two collapsed)
    for i in (1, 2):
        if chosen[i] - chosen[i - 1] < MIN_SEP:
            chosen[i] = chosen[i - 1] + MIN_SEP
    return [round(c, 3) for c in chosen]


def overlay(plate, lanes, out):
    im = Image.open(plate).convert("RGB")
    W, H = im.size
    d = ImageDraw.Draw(im)
    cols = [(255, 40, 40), (40, 255, 120), (60, 150, 255)]
    for i, f in enumerate(lanes):
        y = int(f * H)
        d.line([(0, y), (W, y)], fill=cols[i], width=4)
        d.text((6, y - 15), f"L{3 - i} {f:.3f}", fill=cols[i])
    cr = im.crop((0, int(H * 0.45), W, H)).resize((int(W * 1.1), int(H * 0.55 * 1.1)))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cr.save(out)


def process(level, dry):
    plate = PLATE.format(level)
    mpath = os.path.join(DATA, f"level{level:02d}.json")
    if not (os.path.exists(plate) and os.path.exists(mpath)):
        return None
    val, coh, H = rail_scores(plate)
    pk = peaks(val, coh, H)
    lanes = pick_spread(pk, H)
    cur = sorted((json.load(open(mpath, encoding="utf-8")).get("laneRatios") or {}).get("lanes") or [])
    if lanes is None:
        print(f"L{level:02d}: NO RAILS FOUND (keep {cur})")
        return cur
    if dry:
        print(f"L{level:02d}: {cur} -> {lanes}  (peaks={len(pk)})")
        return lanes
    m = json.load(open(mpath, encoding="utf-8"))
    m.setdefault("laneRatios", {})["lanes"] = lanes
    json.dump(m, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    overlay(plate, lanes, os.path.join(OVL, f"level{level:02d}.png"))
    print(f"L{level:02d}: {cur} -> {lanes}  (peaks={len(pk)})")
    return lanes


def main():
    dry = "--dry" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        process(int(args[0]), dry)
        return
    lv = sorted(int(os.path.basename(p)[5:7]) for p in glob.glob(os.path.join(DATA, "level*.json")))
    n = sum(1 for x in lv if process(x, dry))
    print(f"\n{'(dry) ' if dry else ''}processed {n} levels -> overlays in {OVL}/")


if __name__ == "__main__":
    main()
