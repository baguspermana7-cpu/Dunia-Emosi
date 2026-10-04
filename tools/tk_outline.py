#!/usr/bin/env python3
"""
White STICKER OUTLINE for G30 Timmy & Kapal Legendaris board sprites (the Mojo approach, tools/mojo_outline.py).

Owner 2026-10-04: "Apply the improvements made in the Mojo game to the other games too, especially the Timmy game."
A measurement over every sprite a grid board can show (tools/tk_outline.py --check) found 115 of 116 already carry
a white rim from their owner sheets. The odd one out is the moving patrol boat (tk-top/patrol: the lanes game's
top view, drawn with the dark adaptive rim of tools/ingest-tk-top.py so it reads on the dark lanes sea). On the
grid it sits beside white-rimmed stickers, so the grid gets an outlined TWIN.

    ~/.venvs/kokoro/bin/python tools/tk_outline.py            # (re)write every twin + its index entry
    ~/.venvs/kokoro/bin/python tools/tk_outline.py --dry      # report only
    ~/.venvs/kokoro/bin/python tools/tk_outline.py --check    # rim-white share of every TARGET source and twin

Rules (why it can never double-outline):
  * a twin is always rebuilt from its SOURCE file, never from a published twin, so a re-run writes identical bytes;
  * sources are never written: the lanes / steer games keep their dark-rimmed top views and the paths their gates pin;
  * only characters, vessels and items are outlined; never ground tiles, sea, backgrounds or glow effects.
The twin is registered in assets/db/index.json + games/data/asset-index.js through the shared asset transaction
(index lock, rollback), the same publisher the Mojo cleaner uses.
"""
import argparse
import importlib.util
import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / 'assets' / 'db' / 'lib'
QUALITY = 92
# twin key -> source key
TARGETS = {
    'tk-top/patrol-ol': 'tk-top/patrol',
}


def _load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


mo = _load('mojo_outline_for_tk', 'mojo_outline.py')


def rim_white(rgba):
    """Share of the outermost 2 px of the opaque silhouette that is near white (>= .5 = already outlined)."""
    from scipy import ndimage
    al = rgba[..., 3] > 128
    if al.sum() < 50:
        return 0.0
    rim = al & ~ndimage.binary_erosion(al, iterations=2)
    return float((rgba[rim][:, :3].min(1) > 225).mean())


def build(src_key):
    """(webp bytes, w, h, t) for the outlined twin of src_key: pure function of the source file."""
    a = np.asarray(Image.open(LIB / (src_key + '.webp')).convert('RGBA'))
    t = mo.thickness(mo.short_side(a))
    out, off = mo.outline(a, t)
    out, _ = mo.crop_tight(out, off)
    im = Image.fromarray(out, 'RGBA')
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=QUALITY, method=6)
    return buf.getvalue(), im.width, im.height, t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--check', action='store_true')
    args = ap.parse_args()
    if args.check:
        bad = 0
        for twin, src in TARGETS.items():
            s = rim_white(np.asarray(Image.open(LIB / (src + '.webp')).convert('RGBA')))
            p = LIB / (twin + '.webp')
            t = rim_white(np.asarray(Image.open(p).convert('RGBA'))) if p.exists() else -1
            ok = t >= 0.5
            bad += not ok
            print('%s %s rim-white source %.2f twin %.2f' % ('PASS' if ok else 'FAIL', twin, s, t))
        print('tk_outline check: %d/%d twins outlined' % (len(TARGETS) - bad, len(TARGETS)))
        return 1 if bad else 0

    index = ROOT / 'assets' / 'db' / 'index.json'
    assets = json.loads(index.read_text(encoding='utf-8'))['assets']
    files, entries = {}, {}
    for twin, src in TARGETS.items():
        data, w, h, t = build(src)
        path = LIB / (twin + '.webp')
        base = assets.get(src) or {}
        entry = {'file': 'assets/db/lib/%s.webp' % twin, 'cat': twin.split('/')[0],
                 'tags': list(base.get('tags') or []) + ['outlined'], 'source': '%s + tools/tk_outline.py' % src,
                 'w': w, 'h': h, 'outline': t}
        changed = not path.exists() or path.read_bytes() != data
        if changed:
            files[path] = data
        if changed or assets.get(twin) != entry:
            entries[twin] = entry
        print('%s %s <- %s  %dx%d ring %d px' % ('write' if changed else 'same ', twin, src, w, h, t))
    if args.dry or not (files or entries):
        print('tk_outline: %d file(s), %d index entr(ies) %s' % (len(files), len(entries), 'to write (dry)' if args.dry else 'unchanged'))
        return 0
    sys.path.insert(0, str(ROOT / 'tools'))
    from asset_transaction import publish
    helper = _load('tk_asset_index_renderer', 'ingest-asset-sheets.py')
    publish(str(index), entries, files, helper)
    print('tk_outline: wrote %d file(s), %d index entr(ies)' % (len(files), len(entries)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
