#!/usr/bin/env python3
"""trim-sprite-padding — PRD-26 (docs/prd/PRD-26-potong-padding-sprite.md).

Some packs in assets/db were cut with the figure in the middle of a large empty canvas: people/ fills 35 % of its
200x200 box (median), so every place that draws a person at 1em shows a person a third that size.

Per sprite: alpha bounding box (alpha > 16), grown to a SQUARE (every consumer sizes these square with
object-fit: contain, and the Pixi path sets width = height) with a uniform 6 % margin, centred, cropped at the native
resolution (nothing is resampled, so no blur is added), saved as webp quality 92 (lossless doubled the pack, 516 -> 880 KB).
No colour keying of any kind (a global key hollows white bodies).

  python3 tools/trim-sprite-padding.py assets/db/people --dry-run     report fill before/after, write nothing
  python3 tools/trim-sprite-padding.py assets/db/people               rewrite the pack in place
"""
import sys, glob, os
from PIL import Image

MARGIN = 0.06


def box(im):
    return im.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()


def plan(im):
    bb = box(im)
    if not bb:
        return None
    w, h = im.size
    bw, bh = bb[2] - bb[0], bb[3] - bb[1]
    side = int(round(max(bw, bh) * (1 + 2 * MARGIN)))
    if side >= min(w, h):
        return None                      # already tight: leave it
    cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
    x0, y0 = int(round(cx - side / 2)), int(round(cy - side / 2))
    return (x0, y0, x0 + side, y0 + side), max(bw, bh) / max(w, h), max(bw, bh) / side


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    dry = '--dry-run' in sys.argv
    if not args:
        print(__doc__); sys.exit(2)
    done = skipped = 0
    for d in args:
        for f in sorted(glob.glob(os.path.join(d, '*.webp'))):
            im = Image.open(f).convert('RGBA')
            p = plan(im)
            if not p:
                skipped += 1; continue
            crop, before, after = p
            out = Image.new('RGBA', (crop[2] - crop[0], crop[3] - crop[1]), (0, 0, 0, 0))
            out.paste(im.crop((max(crop[0], 0), max(crop[1], 0), min(crop[2], im.width), min(crop[3], im.height))),
                      (max(-crop[0], 0), max(-crop[1], 0)))
            if dry:
                print(f'{f}: {im.size[0]}x{im.size[1]} fill {before:.2f} -> {out.size[0]}x{out.size[1]} fill {after:.2f}')
            else:
                out.save(f, 'WEBP', quality=92, method=6)
            done += 1
    print(f'trim-sprite-padding: {done} trimmed, {skipped} already tight{" (dry run)" if dry else ""}')


if __name__ == '__main__':
    main()
