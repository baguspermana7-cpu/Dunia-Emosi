#!/usr/bin/env python3
"""white-outline.py - PRD-27 part 2: find sprites with a white sticker outline (owner rule: no white outline).

A sprite is RINGED when its outer alpha edge (2 px band) is mostly near-white (min RGB >= 235 on >= 50 % of the band)
while the band just inside it (next 4 px) is not (<= 35 % near-white): a white rim around a coloured figure. A white
object (cotton buds, smoke) is white inside too and is not counted.

Decoding all 9k images takes minutes, so tools/white-outline-baseline.json keeps the sha1 (12 hex) of every judged file:
  clean   - hashes judged without a ring
  ringed  - path -> hash of sprites that already had a ring on 2026-11-14 (known debt, listed for the owner)
Only files whose bytes are not in the baseline are decoded, so a CI run decodes ~nothing; a new or edited sprite is
judged, and a new ring fails.

  python3 tools/white-outline.py                 check (exit 1 on a new ring)
  python3 tools/white-outline.py --update        full re-scan, rewrite the baseline
  python3 tools/white-outline.py --plant         red proof: one clean sprite with a 2 px white rim added must be ringed
                                                 and the same sprite without it must not
"""
import glob, hashlib, json, os, sys, tempfile
from multiprocessing import Pool
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
BASE = os.path.join(ROOT, 'tools/white-outline-baseline.json')
DIRS = ['assets']


def judge(f):
    """[path, edge_white, inner_white, ringed] or None when the image has no alpha edge to judge"""
    try:
        im = Image.open(f)
        if im.mode not in ('RGBA', 'LA', 'PA') and 'transparency' not in im.info:
            return None
        im = im.convert('RGBA')
        a = im.getchannel('A')
        if a.getextrema()[0] >= 250:
            return None
        b = a.point(lambda v: 255 if v >= 128 else 0)
        e2 = b.filter(ImageFilter.MinFilter(5))
        band = ImageChops.subtract(b, e2)
        n = band.histogram()[255]
        if n < 40:
            return None
        r, g, bl, _ = im.split()
        w = ImageChops.darker(r, ImageChops.darker(g, bl)).point(lambda v: 255 if v >= 235 else 0)
        k = ImageChops.multiply(band, w).histogram()[255]
        inner = ImageChops.subtract(e2, e2.filter(ImageFilter.MinFilter(9)))
        ni = inner.histogram()[255]
        ki = ImageChops.multiply(inner, w).histogram()[255]
        ew, iw = k / n, (ki / ni if ni else 1.0)
        return [f, round(ew, 3), round(iw, 3), ew >= 0.5 and iw <= 0.35]
    except Exception as e:  # an unreadable file is reported, not judged
        return [f, -1, -1, False]


def sha(f):
    with open(f, 'rb') as h:
        return hashlib.sha1(h.read()).hexdigest()[:12]


def files():
    out = []
    for d in DIRS:
        for ext in ('webp', 'png'):
            out += glob.glob(os.path.join(ROOT, d, '**', '*.' + ext), recursive=True)
    return sorted(os.path.relpath(f, ROOT) for f in out)


def plant():
    os.chdir(ROOT)
    base = json.load(open(BASE)) if os.path.exists(BASE) else {}
    src = 'assets/db/people/001.webp'
    clean = judge(src)
    im = Image.open(src).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0)
    rim = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(5)), a)  # 2 px outside the figure
    out = im.copy()
    white = Image.new('RGBA', im.size, (255, 255, 255, 255))
    out.paste(white, (0, 0), rim)
    tmp = os.path.join(tempfile.mkdtemp(), 'planted.webp')
    out.save(tmp, 'WEBP', quality=92)
    ringed = judge(tmp)
    print('  plant: %s without rim -> edge %.2f inner %.2f ringed %s' % (src, clean[1], clean[2], clean[3]))
    print('  plant: same sprite with a 2 px white rim -> edge %.2f inner %.2f ringed %s' % (ringed[1], ringed[2], ringed[3]))
    newhash = sha(tmp)
    known = newhash in set(base.get('clean', []))
    print('  plant: the rimmed file is %s by the baseline, so a check would decode it' % ('KNOWN' if known else 'unknown'))
    ok = (not clean[3]) and ringed[3] and not known
    print('white-outline --plant: %s' % ('ok (rim caught, clean sprite passes)' if ok else 'FAILED'))
    return 0 if ok else 1


def main():
    os.chdir(ROOT)
    if '--plant' in sys.argv:
        return plant()
    upd = '--update' in sys.argv
    fl = files()
    hashes = {f: sha(f) for f in fl}
    base = {} if upd or not os.path.exists(BASE) else json.load(open(BASE))
    clean = set(base.get('clean', []))
    ringed = base.get('ringed', {})
    todo = [f for f in fl if hashes[f] not in clean and ringed.get(f) != hashes[f]]
    with Pool(4) as p:
        rows = [r for r in p.map(judge, todo, chunksize=16) if r]
    new_ring = [r for r in rows if r[3]]
    bad = [r for r in rows if r[1] < 0]
    if upd:
        out = {'note': 'tools/white-outline.py baseline: clean = sha1[:12] of sprites judged without a white rim; '
                       'ringed = sprites that already had one (known debt, PRD-27)',
               'ringed': {r[0]: hashes[r[0]] for r in sorted(new_ring)},
               'clean': sorted({hashes[r[0]] for r in rows if not r[3] and r[1] >= 0} | {hashes[f] for f in fl if f not in {r[0] for r in rows}})}
        with open(BASE, 'w') as h:
            json.dump(out, h, indent=0)
            h.write('\n')
        print('white-outline: baseline written: %d files, %d ringed (known debt), %d clean hashes' % (len(fl), len(out['ringed']), len(out['clean'])))
        return 0
    print('white-outline: %d images, %d not in the baseline and judged, %d known ringed (debt)' % (len(fl), len(todo), len(ringed)))
    for r in new_ring[:20]:
        print('  NEW WHITE RIM: %s (edge %.2f white, inside %.2f)' % (r[0], r[1], r[2]))
    for r in bad[:5]:
        print('  unreadable: %s' % r[0])
    gone = [f for f in ringed if f not in hashes]
    if gone:
        print('  %d known-ringed files no longer exist (run --update to drop them)' % len(gone))
    print('white-outline: %s' % ('FAIL - %d new sprite(s) with a white outline' % len(new_ring) if new_ring else 'ok'))
    return 1 if new_ring else 0


if __name__ == '__main__':
    sys.exit(main())
