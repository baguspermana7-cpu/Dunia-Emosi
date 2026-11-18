#!/usr/bin/env python3
"""PRD-34: 96 px WebP thumbs of the 630 px HD sprites -> assets/Pokemon/pokemondb_hd_alt2/thumb/.
Resize only (LANCZOS). No colour-key, no outline, alpha kept as is. Idempotent: skips files newer than the source.
Usage: python3 tools/make-poke-thumbs.py [--size 96]"""
import os, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/Pokemon/pokemondb_hd_alt2')
DST = os.path.join(SRC, 'thumb')
size = int(sys.argv[sys.argv.index('--size') + 1]) if '--size' in sys.argv else 96
os.makedirs(DST, exist_ok=True)
n = tot = 0
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.webp'): continue
    s, d = os.path.join(SRC, f), os.path.join(DST, f)
    if os.path.exists(d) and os.path.getmtime(d) >= os.path.getmtime(s): continue
    im = Image.open(s).convert('RGBA')
    im = im.resize((size, size), Image.LANCZOS)
    im.save(d, 'WEBP', quality=82, method=6)
    n += 1
for f in os.listdir(DST): tot += os.path.getsize(os.path.join(DST, f))
print(f'thumbs written {n}, folder {len(os.listdir(DST))} files, {tot/1e6:.2f} MB')
