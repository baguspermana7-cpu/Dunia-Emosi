#!/usr/bin/env python3
"""Ekstrak seni stiker Batwheels by You jadi webp berdiri sendiri untuk Gotham Getaway.

Pemilik minta eksplisit: AMBIL bagian cat/stiker dari by-you, jangan membuat sendiri.
Kelima kendaraan by-you memang lima hero gotham yang sama persis (terverifikasi
visual): vehicle1=Bam, vehicle2=Redbird, vehicle3=Bibi, vehicle4=Buff, vehicle5=Batwing.
Jadi decal-nya sudah digambar untuk karakter yang benar; yang kurang hanyalah bentuk
berkas yang bisa dipakai di luar mesin by-you.

Katalognya DIHASILKAN, tidak ditulis tangan — chip yang ditulis tangan sudah pernah
hanyut dua arah di game ini (chip untuk 0 kereta, 80 kereta tanpa chip).

    python3 tools/build-gg-stickers.py
"""
import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'games/film/batwheels-by-you/img')
OUT = os.path.join(ROOT, 'games/film/assets/gg-stickers')

# nomor kendaraan by-you -> id hero gotham
VEHICLE_HERO = {1: 'bam', 2: 'redbird', 3: 'bibi', 4: 'buff', 5: 'batwing'}

SHEETS = [('foxpic1_2x.json', 'foxpic1_2x.png'), ('foxpic2_2x.json', 'foxpic2_2x.png')]


def trim(im):
    """Ambil HANYA bentuk utama decal.

    Bingkai by-you berukuran 817x548 penuh dan sebagian menyimpan serpihan kecil
    jauh dari bentuk utamanya. Memotong ke kotak-batas seluruh isi ikut membawa
    serpihan itu, dan setelah ditempel ke badan mobil ia terlihat sebagai bercak
    liar. Jadi ambil komponen tersambung terbesar dulu, baru potong.
    """
    a = im.split()[3]
    mask = a.point(lambda v: 255 if v > 24 else 0).convert('L')
    px = mask.load()
    w, h = mask.size
    seen = [[False] * w for _ in range(h)]
    best, best_box, best_cells = 0, None, None
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0][x0] or px[x0, y0] == 0:
                continue
            stack, cells = [(x0, y0)], []
            seen[y0][x0] = True
            x1 = x2 = x0
            y1 = y2 = y0
            while stack:
                x, y = stack.pop()
                cells.append((x, y))
                if x < x1: x1 = x
                if x > x2: x2 = x
                if y < y1: y1 = y
                if y > y2: y2 = y
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and px[nx, ny]:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
            if len(cells) > best:
                best, best_box, best_cells = len(cells), (x1, y1, x2 + 1, y2 + 1), cells
    if not best_box:
        bb = im.getbbox()
        return im.crop(bb) if bb else im
    # buang piksel di luar komponen utama, lalu potong
    keep = Image.new('L', im.size, 0)
    kp = keep.load()
    for x, y in best_cells:
        kp[x, y] = 255
    out = im.copy()
    out.putalpha(Image.composite(a, Image.new('L', im.size, 0), keep))
    return out.crop(best_box)


def main():
    os.makedirs(OUT, exist_ok=True)
    catalog = {}
    total = 0
    for jf, pf in SHEETS:
        jpath, ppath = os.path.join(SRC, jf), os.path.join(SRC, pf)
        if not os.path.exists(jpath):
            print('lewati (tidak ada):', jf)
            continue
        data = json.load(open(jpath))
        sheet = Image.open(ppath).convert('RGBA')
        for name, f in data['frames'].items():
            # vehicle{N}sticker{idx}; idx -1 = logo pabrik karakter itu sendiri
            if 'sticker' not in name or not name.startswith('vehicle'):
                continue
            body = name[len('vehicle'):]
            num = body.split('sticker')[0]
            idx = body.split('sticker')[1]
            if not num.isdigit():
                continue
            hero = VEHICLE_HERO.get(int(num))
            if not hero:
                continue
            fr = f['frame']
            im = trim(sheet.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])))
            if im.width < 4 or im.height < 4:
                continue
            key = 'logo' if idx == '-1' else idx
            fn = '%s-%s.webp' % (hero, key)
            im.save(os.path.join(OUT, fn), 'WEBP', quality=92, method=6)
            catalog.setdefault(hero, []).append({'id': key, 'file': fn,
                                                 'w': im.width, 'h': im.height})
            total += 1

    for hero in catalog:
        # 'logo' dulu (itu bawaan karakternya), sisanya menurut angka
        catalog[hero].sort(key=lambda s: (s['id'] != 'logo', s['id']))

    with open(os.path.join(OUT, 'catalog.json'), 'w') as fh:
        json.dump(catalog, fh, indent=1)
    print('%d stiker -> %s' % (total, OUT))
    for hero, items in sorted(catalog.items()):
        print('  %-8s %d: %s' % (hero, len(items), ', '.join(s['id'] for s in items)))


if __name__ == '__main__':
    main()
