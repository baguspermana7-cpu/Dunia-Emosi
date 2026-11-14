#!/usr/bin/env python3
"""strip-white-rim.py - PRD-27c: take the white sticker outline off sprites listed as ringed in
tools/white-outline-baseline.json (owner rule: no white outline).

Per sprite, only near-white pixels ON THE OUTER EDGE are removed, one pixel layer per round (max 6 rounds), stopping when
less than 20 % of the edge is near-white; a soft white halo (alpha < 128, near-white) goes too. White parts INSIDE the
figure are never touched, because only the current outer edge is peeled. A sprite that would lose more than 15 % of its
figure is left alone and reported (a white object, not a rim). No global colour key (memory: sprite-sheet crop traps).

  python3 tools/strip-white-rim.py --dry-run [--only <substr>]   report what would change, write nothing
  python3 tools/strip-white-rim.py --preview <out.png> --only <substr> [--n 24]   before/after sheet on dark + light
  python3 tools/strip-white-rim.py --apply --only <substr> [--max-loss 0.15] [--skip-changed]   rewrite the files
"""
import json, os, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE = os.path.join(ROOT, 'tools/white-outline-baseline.json')
WHITE = 225


def whitemask(im):
    r, g, b, _ = im.split()
    return ImageChops.darker(r, ImageChops.darker(g, b)).point(lambda v: 255 if v >= WHITE else 0)


def count(m):
    return m.histogram()[255]


def strip(im):
    """returns (new image, rounds, figure area lost as a fraction)"""
    im = im.convert('RGBA')
    a = im.getchannel('A')
    w = whitemask(im)
    # soft halo: near-white and mostly transparent
    halo = ImageChops.multiply(w, a.point(lambda v: 255 if 0 < v < 128 else 0))
    a = ImageChops.subtract(a, halo.point(lambda v: 255 if v else 0))
    fig0 = count(a.point(lambda v: 255 if v >= 128 else 0)) or 1
    rounds = 0
    for _ in range(6):
        b = a.point(lambda v: 255 if v >= 128 else 0)
        edge = ImageChops.subtract(b, b.filter(ImageFilter.MinFilter(3)))
        n = count(edge)
        we = ImageChops.multiply(edge, w)
        if not n or count(we) / n < 0.2:
            break
        a = ImageChops.subtract(a, we)
        # the faint antialias pixels just outside a removed white pixel go with it
        out = ImageChops.subtract(we.filter(ImageFilter.MaxFilter(3)), b)
        a = ImageChops.subtract(a, ImageChops.multiply(out, a.point(lambda v: 255 if v < 128 else 0)))
        rounds += 1
    if rounds:
        # the light-grey antialias fringe the rim leaves (low saturation, min RGB >= 120), outermost edge, 2 layers max;
        # a coloured edge (high saturation) and a dark outline stay
        r, g, bl, _ = im.split()
        lo = ImageChops.darker(r, ImageChops.darker(g, bl))
        hi = ImageChops.lighter(r, ImageChops.lighter(g, bl))
        grey = ImageChops.multiply(lo.point(lambda v: 255 if v >= 120 else 0), ImageChops.subtract(hi, lo).point(lambda v: 255 if v < 40 else 0))
        for _ in range(2):
            b = a.point(lambda v: 255 if v >= 128 else 0)
            edge = ImageChops.subtract(b, b.filter(ImageFilter.MinFilter(3)))
            a = ImageChops.subtract(a, ImageChops.multiply(edge, grey))
        a = a.point(lambda v: v if v >= 128 else 0)  # no faint leftovers outside the new edge
    fig1 = count(a.point(lambda v: 255 if v >= 128 else 0))
    res = im.copy()
    res.putalpha(a)
    return res, rounds, 1 - fig1 / fig0


def targets(only):
    base = json.load(open(BASE))
    return [f for f in sorted(base['ringed']) if not only or only in f]


def main():
    os.chdir(ROOT)
    args = sys.argv[1:]
    only = args[args.index('--only') + 1] if '--only' in args else ''
    fl = targets(only)
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    from importlib import import_module
    judge = import_module('white-outline').judge
    if '--preview' in args:
        outp = args[args.index('--preview') + 1]
        n = int(args[args.index('--n') + 1]) if '--n' in args else 24
        step = max(1, len(fl) // n)
        pick = fl[::step][:n]
        T = 150
        sheet = Image.new('RGB', (len(pick) * (T + 6), 4 * (T + 6) + 14), (128, 128, 128))
        d = ImageDraw.Draw(sheet)
        for i, f in enumerate(pick):
            src = Image.open(f).convert('RGBA')
            new, rounds, lost = strip(src)
            for j, (img, bg) in enumerate([(src, (34, 38, 52)), (new, (34, 38, 52)), (src, (250, 246, 236)), (new, (250, 246, 236))]):
                t = img.copy()
                t.thumbnail((T, T))
                tile = Image.new('RGB', (T, T), bg)
                tile.paste(t, ((T - t.width) // 2, (T - t.height) // 2), t)
                sheet.paste(tile, (i * (T + 6), j * (T + 6)))
            d.text((i * (T + 6) + 2, 4 * (T + 6)), '%s r%d -%d%%' % (os.path.basename(f)[:10], rounds, round(lost * 100)), fill=(0, 0, 0))
        sheet.save(outp)
        print('preview: %d sprites (rows: before dark, after dark, before light, after light) -> %s' % (len(pick), outp))
        return 0
    MAXLOSS = float(args[args.index('--max-loss') + 1]) if '--max-loss' in args else 0.15
    apply = '--apply' in args
    done = skipped = still = 0
    if '--skip-changed' in args:  # resume: leave files whose bytes already differ from the baseline (done before)
        import hashlib
        ring = json.load(open(BASE))['ringed']
        fl = [f for f in fl if hashlib.sha1(open(f, 'rb').read()).hexdigest()[:12] == ring[f]]
    for f in fl:
        src = Image.open(f)
        new, rounds, lost = strip(src)
        if lost > MAXLOSS:
            skipped += 1
            print('  skip (would lose %d%% of the figure): %s' % (round(lost * 100), f))
            continue
        if apply:
            tmp = f + '.tmp'  # write then rename: a killed run never leaves half a file
            if f.endswith('.webp'):
                new.save(tmp, 'WEBP', quality=92, method=6)
            else:
                new.save(tmp, 'PNG', optimize=True)
            os.replace(tmp, f)
            r = judge(f)
            if r and r[3]:
                still += 1
                print('  still ringed after strip: %s (edge %.2f inside %.2f)' % (f, r[1], r[2]))
        done += 1
    print('strip-white-rim: %d sprite(s) %s, %d skipped, %d still ringed' % (done, 'rewritten' if apply else 'would change', skipped, still))
    return 0


if __name__ == '__main__':
    sys.exit(main())
