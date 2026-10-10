#!/usr/bin/env python3
"""
Workshop cast + wrecked engines (owner 2026-10-10) -> shared DB.
  ~/Downloads/Workshop cast and wrecked engine sprite atlas.png   7 columns x 5 rows (rows 1-3 = 7 people x 3 poses, rows 4-5 = wrecks)
  ~/Downloads/Modest hijab edits in sprite atlas.png              SAME layout; ONLY columns 1 and 6 are taken from it (the owner's hijab fixes).
The hijab sheet carries leftover background blotches (grey / red / purple) around the figures, so each cell keeps only the
largest connected figure (opaque mask, thin bridges cut by an opening, then re-grown inside the mask), then the usual edge
decontamination (ingest-story-cast.defringe) and sticker outline. The unveiled lady and the unveiled mechanic of the FIRST sheet are not used.
Keys: story-char/{pelukis,anak-cat,mekanik,anak-kura,mekanik-wanita,nyonya-topi,tuan-merah}/<pose>, train-char/rongsokan-{a,b}/v1..v7.
Wrecks: abandoned junk in the dark logging area only, never Linus or Samson.
"""
import io, os, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
import importlib.util
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('cast', ROOT / 'tools' / 'ingest-story-cast.py'); CAST = importlib.util.module_from_spec(spec); spec.loader.exec_module(CAST)
LIB = ROOT / 'assets' / 'db' / 'lib'
WS = Path(os.path.expanduser('~/Downloads/Workshop cast and wrecked engine sprite atlas.png'))
HJ = Path(os.path.expanduser('~/Downloads/Modest hijab edits in sprite atlas.png'))
SCR = Path(os.environ.get('CAST_SCRATCH', '/tmp/dunia-story-cast'))
PEOPLE = {  # column -> (char, name_id, [poses], expr list, sheet)
    0: ('nyonya-topi', 'Nyonya Bertopi', ['stand-fan', 'wave', 'cheer'], ['neutral', 'happy', 'happy'], 'hj', ['woman', 'hijab']),
    1: ('pelukis', 'Pelukis', ['stand', 'crouch-paint', 'thumbs'], ['happy', 'happy', 'happy'], 'ws', ['man', 'painter']),
    2: ('anak-cat', 'Anak dengan Ember Cat', ['stand', 'walk', 'kneel'], ['happy', 'happy', 'happy'], 'ws', ['girl', 'hijab', 'painter']),
    3: ('mekanik', 'Mekanik', ['stand', 'kneel', 'wave'], ['happy', 'neutral', 'happy'], 'ws', ['man', 'mechanic']),
    4: ('anak-kura', 'Anak Penyayang Kura-kura', ['hold', 'hug', 'shy'], ['happy', 'happy', 'neutral'], 'ws', ['girl', 'hijab', 'turtle']),
    5: ('mekanik-wanita', 'Mekanik Wanita', ['stand', 'bend', 'hips'], ['neutral', 'neutral', 'happy'], 'hj', ['woman', 'hijab', 'mechanic']),
    6: ('tuan-merah', 'Tuan Merah', ['stand', 'point', 'shocked'], ['angry', 'angry', 'shocked'], 'ws', ['man', 'red-coat']),
}


def figure(cell):
    """Largest connected figure of an RGBA cell (see docstring)."""
    a = cell[..., 3]; m = a > 128
    core = ndi.binary_opening(m, iterations=2)
    lab, n = ndi.label(core, structure=np.ones((3, 3)))
    if not n:
        return cell
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1)); keep = lab == (1 + int(np.argmax(sizes)))
    grow = ndi.binary_dilation(keep, iterations=6) & m
    lab2, n2 = ndi.label(grow, structure=np.ones((3, 3)))
    out = cell.copy(); out[..., 3] = np.where(ndi.binary_dilation(grow, iterations=1), cell[..., 3], 0)
    return out


def main():
    dry = '--dry' in sys.argv
    sheets = {'ws': np.asarray(Image.open(WS).convert('RGBA')), 'hj': np.asarray(Image.open(HJ).convert('RGBA'))}
    H, W = sheets['ws'].shape[:2]; cw = W / 7
    PB = [0, 240, 480, 720]; WB = [720, 890, 1060]   # people rows are 240 px tall, the two wreck rows 170 px
    items = []   # (key, cat, char, pose, view, expr, fam, tags, name_id, cell)
    for col, (char, nm, poses, exprs, sh, tags) in PEOPLE.items():
        for r in range(3):
            cell = sheets[sh][PB[r]:PB[r + 1], int(col * cw):int((col + 1) * cw)].copy()
            bb = Image.fromarray(cell).getbbox(); cell = figure(cell)
            items.append((f'story-char/{char}/{poses[r]}', 'story-char', char, poses[r], 'front', exprs[r], 'people', tags + ['cartoon'], nm, cell))
    for r, mod in ((3, 'a'), (4, 'b')):
        for col in range(7):
            cell = sheets['ws'][WB[r - 3]:WB[r - 2], int(col * cw):int((col + 1) * cw)].copy()
            items.append((f'train-char/rongsokan-{mod}/v{col + 1}', 'train-char', f'rongsokan-{mod}', f'v{col + 1}', 'angle', 'sad', 'wreck', ['wreck', 'rongsokan', 'junk', 'train', 'cartoon'], 'Lokomotif Rongsokan', figure(cell)))
    cleaned = []
    for it in items:
        cell = it[-1]; bb = Image.fromarray(cell).getbbox(); cell = cell[bb[1]:bb[3], bb[0]:bb[2]]
        cleaned.append(CAST.defringe(cell))
    scale = {}
    for fam, T in (('people', 300), ('wreck', 240)):
        mx = max(max(c[0].shape[:2]) for it, c in zip(items, cleaned) if it[6] == fam); scale[fam] = T / mx
    entries, files, ims, labs = {}, {}, [], []
    for it, (out, st) in zip(items, cleaned):
        key, cat, char, pose, view, expr, fam, tags, nm = it[:9]
        im = Image.fromarray(out, 'RGBA'); im = im.crop(im.getbbox()); s = scale[fam]
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        arr = np.asarray(im); t = CAST.CLEAN.mo.thickness(CAST.CLEAN.mo.short_side(arr)); ring, _ = CAST.CLEAN.mo.outline(arr, t)
        im = Image.fromarray(ring, 'RGBA'); im = im.crop(im.getbbox()); bl = CAST.baseline(np.asarray(im))
        b = io.BytesIO(); im.save(b, 'WEBP', quality=90, method=6); files[LIB / (key + '.webp')] = b.getvalue()
        entries[key] = {'file': f'assets/db/lib/{key}.webp', 'cat': cat, 'tags': tags, 'source': 'owner workshop cast atlas (Downloads): ' + ('Modest hijab edits' if char in ('nyonya-topi', 'mekanik-wanita') else 'Workshop cast and wrecked engine'),
                        'w': im.width, 'h': im.height, 'outline': t, 'baseline': bl, 'anchor': [im.width // 2, bl], 'char': char, 'view': view, 'facing': 180, 'pose': pose, 'expression': expr, 'fringe': st, 'tint': 0.0, 'name_id': nm}
        ims.append(im); labs.append(key.split('/', 1)[1])
    pick = [i for i, k in enumerate(labs) if k.startswith(('nyonya', 'mekanik-wanita'))]
    for bg, nm in (((255, 255, 255), 'white'), ((34, 34, 42), 'dark')):
        CAST.sheet([ims[i] for i in pick], [labs[i] for i in pick], bg).save(SCR / f'hijab-c1c6-{nm}.png')
        CAST.sheet(ims, labs, bg).save(SCR / f'workshop-{nm}.png')
    print(len(entries), 'sprites; sheets in', SCR)
    if dry:
        return
    from asset_transaction import publish
    print('published; index now', publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, files, CAST.ING.index_helper()))


if __name__ == '__main__':
    main()
