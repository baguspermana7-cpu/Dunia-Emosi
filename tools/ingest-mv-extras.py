#!/usr/bin/env python3
"""
Derived Malivlak poses (owner 2026-10-12, film 2:57 "pria berkoper terbaring di ladang"): no lying pose exists in the owner's atlas, so
`malivlak-char/penumpang-ungu/rebah` = the seated pose (duduk, suitcase on his lap) tipped back 60 degrees. Lossless rotate, no ring.

    ~/.venvs/kokoro/bin/python tools/ingest-mv-extras.py
"""
import importlib.util, io, json, sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(ROOT / 'tools'))
spec = importlib.util.spec_from_file_location('cast', ROOT / 'tools' / 'ingest-story-cast.py'); CAST = importlib.util.module_from_spec(spec); spec.loader.exec_module(CAST)
LIB = ROOT / 'assets' / 'db' / 'lib'
idx = json.loads((ROOT / 'assets' / 'db' / 'index.json').read_text())['assets']
src = idx['malivlak-char/penumpang-ungu/duduk'] if 'malivlak-char/penumpang-ungu/duduk' in idx else None
im = Image.open(LIB / 'malivlak-char/penumpang-ungu/duduk.webp').convert('RGBA').rotate(-60, expand=True, resample=Image.BICUBIC); im = im.crop(im.getbbox())
k = 'malivlak-char/penumpang-ungu/rebah'; b = io.BytesIO(); im.save(b, 'WEBP', quality=92, method=6)
bl = CAST.baseline(np.asarray(im)); e = dict(src or {}); e.update({'file': 'assets/db/lib/%s.webp' % k, 'w': im.width, 'h': im.height, 'baseline': bl, 'anchor': [im.width // 2, bl], 'pose': 'rebah', 'source': 'derived from penumpang-ungu/duduk (rotated 60 deg)'})
e.pop('key', None)
from asset_transaction import publish
print('published', publish(str(ROOT / 'assets' / 'db' / 'index.json'), {k: e}, {LIB / (k + '.webp'): b.getvalue()}, CAST.ING.index_helper()))
