#!/usr/bin/env python3
"""
Malivlak's rake (owner 2026-10-12): ~/Documents/temporary/game asset/train/malivlak-wagons/malivlak-wagons-sheet.png (1122x1402 RGBA).
Columns = red coal tender, green, orange, blue coach; rows = top, side, 3/4, front, rear. Each cell is cut by its OWN alpha (defringe from
ingest-story-cast: weak alpha and floating specks dropped), ONE shared scale, NO outline ring. Keys train-char/mv-<car>/<view>.

    ~/.venvs/kokoro/bin/python tools/ingest-mv-wagons.py [--dry]
"""
import importlib.util, io, os, sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(ROOT / 'tools'))
spec = importlib.util.spec_from_file_location('cast', ROOT / 'tools' / 'ingest-story-cast.py'); CAST = importlib.util.module_from_spec(spec); spec.loader.exec_module(CAST)
SRC = Path(os.path.expanduser('~/Documents/temporary/game asset/train/malivlak-wagons/malivlak-wagons-sheet.png'))
LIB = ROOT / 'assets' / 'db' / 'lib'
CARS = [('mv-tender', 'Tender batu bara merah', 'red'), ('mv-coach-green', 'Gerbong hijau', 'green'), ('mv-coach-orange', 'Gerbong oranye', 'orange'), ('mv-coach-blue', 'Gerbong biru', 'blue')]
VIEWS = [('top', 'top', 0), ('side', 'side', 90), ('34', '34', 45), ('front', 'front', 180), ('rear', 'rear', 0)]
XS = [0, 270, 560, 850, 1122]; YS = [0, 350, 625, 905, 1130, 1402]


def main():
    dry = '--dry' in sys.argv
    im = np.asarray(Image.open(SRC).convert('RGBA')); out = {}
    for ci, car in enumerate(CARS):
        for vi, view in enumerate(VIEWS):
            cell = im[YS[vi]:YS[vi + 1], XS[ci]:XS[ci + 1]].copy(); cell[..., 3] = np.where(cell[..., 3] < 24, 0, cell[..., 3])
            bb = Image.fromarray(cell).getbbox(); cell = cell[bb[1]:bb[3], bb[0]:bb[2]]
            out[(ci, vi)] = CAST.defringe(cell)
    mx = max(max(o[0].shape[:2]) for o in out.values()); sc = 300 / mx
    files, entries, sheet = {}, {}, []
    for (ci, vi), (arr, st) in sorted(out.items()):
        car, view = CARS[ci], VIEWS[vi]; k = 'train-char/%s/%s' % (car[0], view[0])
        pim = Image.fromarray(arr, 'RGBA'); pim = pim.crop(pim.getbbox()); pim = pim.resize((max(1, round(pim.width * sc)), max(1, round(pim.height * sc))), Image.LANCZOS)
        a = np.asarray(pim); bl = CAST.baseline(a); b = io.BytesIO(); pim.save(b, 'WEBP', quality=92, method=6); files[LIB / (k + '.webp')] = b.getvalue()
        entries[k] = {'file': 'assets/db/lib/%s.webp' % k, 'cat': 'train-char', 'tags': ['coach', 'wagon', 'gerbong', 'malivlak', car[2], 'cartoon'], 'source': 'owner malivlak-wagons-sheet.png', 'w': pim.width, 'h': pim.height,
                      'baseline': bl, 'anchor': [pim.width // 2, bl], 'char': car[0], 'view': view[1], 'facing': view[2], 'pose': view[0], 'expression': 'neutral', 'fringe': st, 'name_id': car[1]}
        sheet.append((k, pim))
    W = Image.new('RGB', (4 * 330, 5 * 330), (255, 255, 255)); D = Image.new('RGB', W.size, (34, 34, 42))
    for (k, p) in sheet:
        ci = [c[0] for c in CARS].index(k.split('/')[1]); vi = [v[0] for v in VIEWS].index(k.split('/')[2])
        for bg in (W, D): bg.paste(p, (ci * 330 + 15, vi * 330 + 15), p)
    sd = Path(os.environ.get('MV_SCRATCH', '/tmp')); W.save(sd / 'mvw-white.png'); D.save(sd / 'mvw-dark.png')
    print('cut', len(files), 'scale', round(sc, 3), 'contact sheets in', sd)
    if dry: return
    from asset_transaction import publish
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, files, CAST.ING.index_helper()); print('published', len(entries), 'index now', total)


if __name__ == '__main__':
    main()
