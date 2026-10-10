"""
Pictures for the G27 "Shapes" and "Numbers" words (2026-10-06).

    ~/.venvs/kokoro/bin/python tools/spelling_shapes_numbers.py

SHAPES are pure geometry, drawn here (no emoji, no outside art): a bright fill,
a soft top highlight, the dark ink rim the sheet art uses, and a white sticker
outline -- written to assets/spelling/shape/<word>.webp.

NUMBERS are COUNTING pictures built from the owner's own named library
(assets/db/lib): "three" is three strawberries, laid out like dice pips so a
6-year-old can count them, with the numeral in a small badge. Written to
assets/spelling/num/<word>.webp. Re-run after any library sprite changes.
"""
import os, math
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT_S = os.path.join(ROOT, 'assets', 'spelling', 'shape')
OUT_N = os.path.join(ROOT, 'assets', 'spelling', 'num')
FONT = os.path.join(ROOT, 'assets', 'spelling', 'fonts', 'fredoka-one.ttf')
INK = (58, 40, 30, 255)
SS = 4                     # supersampling
SIZE = 220                 # final px


def sticker(im, rim=7):
    """White sticker outline round the alpha, like the shared library sprites."""
    a = im.getchannel('A')
    pad = rim * 2
    canvas = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    canvas.alpha_composite(im, (pad, pad))
    grown = canvas.getchannel('A').filter(ImageFilter.MaxFilter(rim * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2))
    white = Image.new('RGBA', canvas.size, (255, 255, 255, 0))
    white.putalpha(grown)
    white.alpha_composite(canvas)
    return white.crop(white.getchannel('A').getbbox())


def poly(n, cx, cy, r, rot=-90):
    return [(cx + r * math.cos(math.radians(rot + i * 360 / n)), cy + r * math.sin(math.radians(rot + i * 360 / n))) for i in range(n)]


def heart_pts(cx, cy, r):
    pts = []
    for i in range(240):
        t = i / 240 * 2 * math.pi
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * r / 17, cy + y * r / 17 - r * 0.05))
    return pts


SHAPES = {   # word: (kind, fill)
    'circle':    ('circle',    (66, 153, 240)),
    'square':    ('square',    (255, 92, 92)),
    'triangle':  ('triangle',  (92, 200, 96)),
    'rectangle': ('rectangle', (255, 167, 52)),
    'oval':      ('oval',      (166, 107, 255)),
    'diamond':   ('diamond',   (36, 196, 210)),
    'heart':     ('heart',     (245, 74, 120)),
    'pentagon':  ('pentagon',  (255, 205, 40)),
    'hexagon':   ('hexagon',   (64, 190, 150)),
}


def draw_shape(kind, fill):
    S = SIZE * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c, r, w = S / 2, S * 0.40, int(S * 0.035)
    light = tuple(min(255, int(v + (255 - v) * 0.45)) for v in fill) + (255,)
    fill = fill + (255,)

    def shape(dd, col, inset=0, outline=None, width=0):
        rr = r - inset
        if kind == 'circle':
            dd.ellipse([c - rr, c - rr, c + rr, c + rr], fill=col, outline=outline, width=width)
        elif kind == 'oval':
            dd.ellipse([c - rr, c - rr * 0.66, c + rr, c + rr * 0.66], fill=col, outline=outline, width=width)
        elif kind == 'square':
            dd.rounded_rectangle([c - rr * 0.86, c - rr * 0.86, c + rr * 0.86, c + rr * 0.86], radius=S * 0.03, fill=col, outline=outline, width=width)
        elif kind == 'rectangle':
            dd.rounded_rectangle([c - rr, c - rr * 0.58, c + rr, c + rr * 0.58], radius=S * 0.03, fill=col, outline=outline, width=width)
        elif kind == 'triangle':
            dd.polygon(poly(3, c, c + rr * 0.18, rr * 1.06), fill=col, outline=outline, width=width)
        elif kind == 'diamond':
            dd.polygon([(c, c - rr), (c + rr * 0.72, c), (c, c + rr), (c - rr * 0.72, c)], fill=col, outline=outline, width=width)
        elif kind == 'pentagon':
            dd.polygon(poly(5, c, c + rr * 0.06, rr), fill=col, outline=outline, width=width)
        elif kind == 'hexagon':
            dd.polygon(poly(6, c, c, rr, rot=0), fill=col, outline=outline, width=width)
        elif kind == 'heart':
            dd.polygon(heart_pts(c, c, rr), fill=col, outline=outline, width=width)

    shape(d, fill)
    # soft highlight: the same shape, lighter, masked to the upper part
    hl = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    shape(ImageDraw.Draw(hl), light, inset=r * 0.16)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).ellipse([c - r * 1.2, c - r * 1.5, c + r * 0.9, c + r * 0.05], fill=150)
    mask = mask.filter(ImageFilter.GaussianBlur(S * 0.03))
    im.paste(hl, (0, 0), Image.composite(hl.getchannel('A'), Image.new('L', (S, S), 0), mask))
    # ink rim on top
    shape(d, None, outline=INK, width=w)
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    return sticker(im)


NUMBERS = [  # word, count, library sprite
    ('one', 1, 'food/apple'), ('two', 2, 'animals/duckling'), ('three', 3, 'food/strawberry'),
    ('four', 4, 'animals/ladybug'), ('five', 5, 'toys/beach-ball'), ('six', 6, 'food/cupcake'),
    ('seven', 7, 'animals/butterfly'), ('eight', 8, 'food/cookie'), ('nine', 9, 'nature/flower-pink'),
    ('ten', 10, 'game/star'),
]
# pip layouts on a 3x3 (or 4-row for 7-10) unit grid, like dice
LAYOUT = {
    1: [(1, 1)], 2: [(0.5, 1), (1.5, 1)], 3: [(0, 0), (1, 1), (2, 2)],
    4: [(0, 0), (2, 0), (0, 2), (2, 2)], 5: [(0, 0), (2, 0), (1, 1), (0, 2), (2, 2)],
    6: [(0, 0), (2, 0), (0, 1), (2, 1), (0, 2), (2, 2)],
    7: [(0, 0), (1, 0), (2, 0), (0.5, 1), (1.5, 1), (0, 2), (2, 2)],
    8: [(0, 0), (1, 0), (2, 0), (0.5, 1), (1.5, 1), (0, 2), (1, 2), (2, 2)],
    9: [(x, y) for y in range(3) for x in range(3)],
    10: [(0.5, 0), (1.5, 0), (0, 0.85), (1, 0.85), (2, 0.85), (0, 1.75), (1, 1.75), (2, 1.75), (0.5, 2.6), (1.5, 2.6)],
}


def draw_number(word, n, key):
    spr = Image.open(os.path.join(ROOT, 'assets', 'db', 'lib', key + '.webp')).convert('RGBA')
    W, H, TOP = 300, 300, 86       # the numeral sits in its own band above the pips
    cell = 92 if n <= 9 else 80
    spr.thumbnail((cell, cell), Image.LANCZOS)
    pts = LAYOUT[n]
    maxy = max(p[1] for p in pts)
    step = 98 if n <= 9 else 84
    gw, gh = 2 * step + cell, maxy * step + cell
    ox, oy = (W - gw) / 2, TOP + (H - gh) / 2
    im = Image.new('RGBA', (W, H + TOP), (0, 0, 0, 0))
    for (x, y) in pts:
        px = int(ox + x * step + (cell - spr.width) / 2)
        py = int(oy + y * step + (cell - spr.height) / 2)
        im.alpha_composite(spr, (px, py))
    # numeral badge, centred in the top band
    b = Image.new('RGBA', (W, H + TOP), (0, 0, 0, 0))
    d = ImageDraw.Draw(b)
    R = 36
    bx = W / 2 - R
    d.ellipse([bx, 4, bx + 2 * R, 4 + 2 * R], fill=(255, 201, 40, 255), outline=INK, width=5)
    f = ImageFont.truetype(FONT, 46 if n < 10 else 38)
    txt = str(n)
    tb = d.textbbox((0, 0), txt, font=f)
    d.text((bx + R - (tb[2] - tb[0]) / 2 - tb[0], 4 + R - (tb[3] - tb[1]) / 2 - tb[1]), txt, font=f, fill=INK)
    b.alpha_composite(im)
    return b.crop(b.getchannel('A').getbbox())


def main():
    os.makedirs(OUT_S, exist_ok=True)
    os.makedirs(OUT_N, exist_ok=True)
    for word, (kind, fill) in SHAPES.items():
        draw_shape(kind, fill).save(os.path.join(OUT_S, word + '.webp'), 'WEBP', quality=92, method=6)
    for word, n, key in NUMBERS:
        draw_number(word, n, key).save(os.path.join(OUT_N, word + '.webp'), 'WEBP', quality=92, method=6)
    print('shapes', len(SHAPES), 'numbers', len(NUMBERS))


if __name__ == '__main__':
    main()
