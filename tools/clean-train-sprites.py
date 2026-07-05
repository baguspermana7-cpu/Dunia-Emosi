#!/usr/bin/env python3
"""
clean-train-sprites.py — A-330. Remove leftover background remnants on train
character sprites (owner: "putih2 sisa background" + Thomas AEG "garis sisa dari
border"). Two conservative passes, canvas size preserved (no re-crop → sprite
anchors/positioning unchanged):

  1. Edge flood-fill de-background: BFS from the border through "background-like"
     pixels (near-white, low-saturation) OR already-transparent pixels → alpha 0.
     A dark/coloured train edge STOPS the fill, so interior whites (windows,
     head-lights, steam, white body panels) are preserved.
  2. Isolated thin edge-rim trim: a ≤3px opaque band flush to an edge that is
     immediately followed by transparency (an isolated rim, e.g. the thomas blue
     bottom strip) is cleared — catches coloured leftover border lines.
  + 1px de-fringe on the resulting alpha edge.

Safety guard: if a sprite would lose > MAX_REMOVE_FRAC of its opaque pixels the
sprite is SKIPPED and flagged (protects white-bodied trains that legitimately
reach the border). Idempotent / re-runnable. Git is the backup.

Usage:
  python3 tools/clean-train-sprites.py --set aeg   [--out DIR] [--dry]
  python3 tools/clean-train-sprites.py --set world [--out DIR] [--dry]
  python3 tools/clean-train-sprites.py --files a.webp b.webp [--out DIR]
"""
import argparse, glob, os, sys
from collections import deque
from PIL import Image

NEAR_WHITE = 236          # R,G,B all >= this = background-like
MAX_SAT    = 26           # max(RGB)-min(RGB) <= this = low saturation
RIM_MAX    = 3            # max thickness (px) of an isolated edge rim to trim
MAX_REMOVE_FRAC = 0.18    # skip sprite if it would lose more than this of opaque px

def is_bg(px):
    r, g, b, a = px
    if a == 0:
        return True
    return (r >= NEAR_WHITE and g >= NEAR_WHITE and b >= NEAR_WHITE
            and (max(r, g, b) - min(r, g, b)) <= MAX_SAT)

def clean(im):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    opaque0 = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 8)
    cleared = [[False] * w for _ in range(h)]

    # -- pass 1: edge flood-fill through background-like pixels --
    q = deque()
    def seed(x, y):
        if not cleared[y][x] and is_bg(px[x, y]):
            cleared[y][x] = True
            q.append((x, y))
    for x in range(w):
        seed(x, 0); seed(x, h - 1)
    for y in range(h):
        seed(0, y); seed(w - 1, y)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not cleared[ny][nx] and is_bg(px[nx, ny]):
                cleared[ny][nx] = True
                q.append((nx, ny))

    # -- pass 2: isolated thin edge-rim trim (per edge) --
    # For each edge, if the outer band up to RIM_MAX is opaque and the pixel just
    # inside the band is transparent/cleared, the band is an isolated rim → clear.
    def opaque(x, y):
        return px[x, y][3] > 8 and not cleared[y][x]
    for x in range(w):  # top / bottom columns
        for edge, rng, inside in ((0, range(0, RIM_MAX + 1), RIM_MAX + 1),
                                  (h - 1, range(h - 1, h - RIM_MAX - 2, -1), h - RIM_MAX - 2)):
            if 0 <= inside < h and opaque(x, edge) and not opaque(x, inside):
                for yy in rng:
                    if 0 <= yy < h and opaque(x, yy):
                        cleared[yy][x] = True
                    else:
                        break
    for y in range(h):  # left / right rows
        for edge, rng, inside in ((0, range(0, RIM_MAX + 1), RIM_MAX + 1),
                                  (w - 1, range(w - 1, w - RIM_MAX - 2, -1), w - RIM_MAX - 2)):
            if 0 <= inside < w and opaque(edge, y) and not opaque(inside, y):
                for xx in rng:
                    if 0 <= xx < w and opaque(xx, y):
                        cleared[y][xx] = True
                    else:
                        break

    # apply clears
    for y in range(h):
        for x in range(w):
            if cleared[y][x] and px[x, y][3] != 0:
                r, g, b, _ = px[x, y]
                px[x, y] = (r, g, b, 0)

    # -- 1px de-fringe: opaque near-white touching a transparent pixel → clear --
    to_clear = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 8 and r >= NEAR_WHITE and g >= NEAR_WHITE and b >= NEAR_WHITE and (max(r,g,b)-min(r,g,b)) <= MAX_SAT:
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny][3] == 0:
                        to_clear.append((x, y)); break
    for x, y in to_clear:
        r, g, b, _ = px[x, y]
        px[x, y] = (r, g, b, 0)

    opaque1 = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 8)
    removed = opaque0 - opaque1
    frac = removed / max(1, opaque0)
    return im, opaque0, removed, frac

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', choices=['aeg', 'world'])
    ap.add_argument('--files', nargs='*')
    ap.add_argument('--out', default=None, help='output dir (default: in place)')
    ap.add_argument('--dry', action='store_true')
    a = ap.parse_args()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    files = list(a.files or [])
    if a.set == 'aeg':
        files += sorted(glob.glob(os.path.join(root, 'assets/train/aeg/*.webp')))
    elif a.set == 'world':
        files += sorted(glob.glob(os.path.join(root, 'assets/train/world/*.webp')))
    if not files:
        print('no files'); sys.exit(1)
    skipped = []
    for f in files:
        try:
            im0 = Image.open(f)
            im, o0, rem, frac = clean(im0)
            flag = ''
            if frac > MAX_REMOVE_FRAC:
                skipped.append((f, round(frac, 3))); flag = '  SKIP(>{:.0%})'.format(MAX_REMOVE_FRAC)
            print('{:40s} opaque {:6d}  removed {:5d} ({:5.1%}){}'.format(os.path.basename(f), o0, rem, frac, flag))
            if a.dry or flag:
                continue
            out = f
            if a.out:
                os.makedirs(a.out, exist_ok=True)
                out = os.path.join(a.out, os.path.basename(f))
            im.save(out, 'WEBP', quality=94, method=6)
        except Exception as e:
            print('ERR', f, e)
    if skipped:
        print('\nSKIPPED (needs manual — subject reaches border):')
        for f, fr in skipped:
            print('  {} ({:.0%})'.format(os.path.basename(f), fr))

if __name__ == '__main__':
    main()
