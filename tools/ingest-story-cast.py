#!/usr/bin/env python3
"""
Supporting cast atlases -> the SHARED asset database (owner 2026-10-10): ~/Downloads/Film-inspired 5x5 character and
train atlas.png and ~/Downloads/The Brave Locomotive 25-Sprite Atlas.png (5 x 5 each, transparent). Linus and Samson in
them are SKIPPED on purpose (the earlier sheets are used). Where both atlases draw the same pose the cleaner crop wins
(lowest background-tint score of the source edge, see `source` / `tint` in the index entry; printed by the tool).

    ~/.venvs/kokoro/bin/python tools/ingest-story-cast.py          # write assets/db/lib/{train-char,story-char,animal}/*
    ~/.venvs/kokoro/bin/python tools/ingest-story-cast.py --dry    # crops + contact sheets in $CAST_SCRATCH only

Keys:  train-char/goro-loco/34l-1|34l-2   train-char/coach-green/side-l   train-char/caboose-red/front-34l
       story-char/henry/wave|shovel  scarlet|baron|katrina|james|carter /stand
       animal/turtle/stand|walk  rabbit/sit|run  deer/stand|graze  bird-blue/fly  cardinal/fly  vulture/perch-1|2
Metadata (index.json): cat, char, view, facing, pose, expression, anchor, baseline, w, h, outline, fringe (cleanup stats).

PERFECT CROP (owner: "crop dengan sempurna"). The sheet's cut-out kept a red / dark fringe of the ORIGINAL background
on soft edges (rabbits, deer, cardinal, people). Pipeline per sprite:
  1 cut by the sprite's OWN alpha (connected blob; tiny detached bits re-attached so antlers, ears, cane tip and
    feathers stay whole);
  2 drop weak alpha (< 36) and every soft pixel further than 2 px from the solid body: the detached reddish / black
    halo goes, the anti-aliased edge stays;
  3 DEFRINGE: each remaining soft pixel (alpha < 250) takes its colour from the nearest SOLID pixel (alpha >= 250),
    keeping its own alpha: the background tint is pulled toward the inner colour (un-premultiply by replacement);
  4 one shared scale per family (people one scale, trains one scale, each animal its own), the white sticker ring
    (tools/mojo_outline.py), `baseline` = lowest solid row, `anchor` = [centre x, baseline];
  5 QA metrics on a WHITE and a DARK background (tools/qa-story-cast.mjs): no reddish low-alpha pixels remain,
    one connected body.
"""
import importlib.util, io, json, os, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'assets' / 'db' / 'lib'
SCRATCH = Path(os.environ.get('CAST_SCRATCH', os.path.join(tempfile.gettempdir(), 'dunia-story-cast')))


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


TRAIN = load('train_ingest', 'ingest-train-sprites.py')       # components(), cut()
CLEAN = TRAIN.CLEAN
ING = TRAIN.ING

# cell index (row-major, 0-based) -> (category, char, pose, view, facing, expression, family, tags)
S = None  # skip (Linus, Samson)
A1 = {
    0: S, 1: S,
    2: ('train-char', 'goro-loco', 'front-34l', 'front34', 225, 'neutral', 'train', ['goro', 'logging', 'locomotive', 'train']),
    3: ('train-char', 'coach-green', 'side-l', 'side', 270, 'neutral', 'train', ['coach', 'wagon', 'gerbong', 'train']),
    4: ('train-char', 'caboose-red', 'front-34l', 'front34', 225, 'neutral', 'train', ['caboose', 'wagon', 'gerbong', 'train']),
    5: ('story-char', 'henry', 'wave', 'front', 180, 'happy', 'people', ['henry', 'engineer', 'man']),
    6: ('story-char', 'scarlet', 'stand', 'front', 180, 'neutral', 'people', ['scarlet', 'hijab', 'woman']),
    7: ('story-char', 'baron', 'stand', 'front', 180, 'angry', 'people', ['baron', 'man']),
    8: ('story-char', 'katrina', 'stand', 'front', 180, 'neutral', 'people', ['katrina', 'hijab', 'woman']),
    9: ('story-char', 'james', 'stand', 'front', 180, 'neutral', 'people', ['james', 'forestry', 'man']),
    10: ('story-char', 'carter', 'stand', 'front', 180, 'angry', 'people', ['carter', 'logger', 'lumberyard', 'man']),
    11: ('animal', 'turtle', 'stand', 'side', 90, 'neutral', 'turtle', ['turtle', 'kura-kura', 'animal']),
    12: ('animal', 'rabbit', 'sit', 'side', 90, 'neutral', 'rabbit', ['rabbit', 'kelinci', 'animal']),
    13: ('animal', 'deer', 'stand', 'side', 90, 'neutral', 'deer', ['deer', 'rusa', 'animal']),
    14: ('animal', 'bird-blue', 'fly', 'side', 90, 'happy', 'bird', ['bird', 'burung', 'animal']),
    15: ('animal', 'cardinal', 'fly', 'side', 90, 'neutral', 'bird', ['cardinal', 'burung', 'animal']),
    16: ('animal', 'vulture', 'perch-1', 'side', 90, 'neutral', 'vulture', ['vulture', 'burung', 'animal']),
    17: ('animal', 'vulture', 'perch-2', 'side', 90, 'neutral', 'vulture', ['vulture', 'burung', 'animal']),
    18: ('animal', 'turtle', 'walk', 'side', 90, 'neutral', 'turtle', ['turtle', 'kura-kura', 'animal']),
    19: ('animal', 'rabbit', 'run', 'side', 90, 'happy', 'rabbit', ['rabbit', 'kelinci', 'animal']),
    20: ('animal', 'deer', 'graze', 'side', 270, 'neutral', 'deer', ['deer', 'rusa', 'animal']),
    21: S, 22: S,
    23: ('train-char', 'goro-loco', 'front-34r', 'front34', 135, 'neutral', 'train', ['goro', 'logging', 'locomotive', 'train']),
    24: ('story-char', 'henry', 'shovel', 'front', 180, 'neutral', 'people', ['henry', 'engineer', 'man']),
}
A2 = {i: S for i in range(8)}
A2.update({
    8: A1[2], 9: A1[23],
    10: ('story-char', 'henry', 'point', 'front', 180, 'neutral', 'people', ['henry', 'engineer', 'man']),
    11: ('story-char', 'henry', 'worried', 'front', 180, 'worried', 'people', ['henry', 'engineer', 'man']),
    12: A1[24],
    13: ('story-char', 'scarlet', 'gesture', 'front', 180, 'happy', 'people', ['scarlet', 'hijab', 'woman']),
    14: ('story-char', 'scarlet', 'worried', 'front', 180, 'worried', 'people', ['scarlet', 'hijab', 'woman']),
    15: A1[7],
    16: ('story-char', 'baron', 'shocked', 'front', 180, 'shocked', 'people', ['baron', 'man']),
    17: A1[8],
    18: ('story-char', 'katrina', 'shovel', 'front', 180, 'neutral', 'people', ['katrina', 'hijab', 'woman']),
    19: ('story-char', 'carter', 'arms-crossed', 'front', 180, 'angry', 'people', ['carter', 'logger', 'lumberyard', 'man']),
    20: A1[12], 21: A1[19], 22: A1[18], 23: A1[14], 24: A1[15],
})
ATLASES = [('film-atlas', Path(os.path.expanduser('~/Downloads/Film-inspired 5x5 character and train atlas.png')), A1),
           ('brave-atlas', Path(os.path.expanduser('~/Downloads/The Brave Locomotive 25-Sprite Atlas.png')), A2)]
TARGET = {'train': 300, 'people': 300, 'turtle': 150, 'rabbit': 170, 'deer': 230, 'bird': 120, 'vulture': 150}
SRCTAG = 'owner supporting-cast atlas (Downloads): '


def tint(crop):
    """Background tint of the SOURCE edge: mean redness of the soft pixels (alpha 24..199) next to the body."""
    rgb, a = crop[..., :3].astype(np.float32), crop[..., 3].astype(np.int32)
    soft = (a >= 24) & (a < 200)
    if not soft.any():
        return 0.0
    px = rgb[soft]
    return float((px[:, 0] - (px[:, 1] + px[:, 2]) / 2).clip(min=0).mean())


def defringe(crop):
    """-> (RGBA uint8 cleaned, stats). See the module docstring, steps 2 and 3."""
    rgb, a = crop[..., :3].astype(np.float32), crop[..., 3].astype(np.int32)
    before = int(((a > 0) & (a < 200)).sum())
    solid0 = a >= 200
    body = ndi.binary_closing(solid0, iterations=2) if solid0.any() else solid0
    near = ndi.binary_dilation(body, iterations=2)
    a2 = np.where(near & (a >= 24), a, 0)
    solid = a2 >= 200
    idx = ndi.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    nearest = rgb[idx[0], idx[1]]
    soft = (a2 > 0) & (a2 < 200)
    rgb2 = np.where(soft[..., None], nearest, rgb)
    out = np.dstack([rgb2, a2]).astype(np.uint8)
    lab, n = ndi.label(solid, structure=np.ones((3, 3)))     # solid parts that float free of the body are dropped
    if n > 1:
        sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1)); keep = 1 + int(np.argmax(sizes))
        grow = ndi.binary_dilation(np.isin(lab, [keep] + [i + 1 for i, sz in enumerate(sizes) if i + 1 != keep and sz >= 25]), iterations=3)
        out[..., 3] = np.where(grow, out[..., 3], 0)
    return out, {'soft_before': before, 'soft_after': int(((out[..., 3] > 0) & (out[..., 3] < 200)).sum())}


def baseline(arr):
    rows = np.nonzero((arr[..., 3] >= 128).sum(1) >= 2)[0]
    return int(rows[-1]) if len(rows) else arr.shape[0] - 1


def grid25(path):
    arr, lab, groups = TRAIN.components(path)
    items = [TRAIN.cut(arr, lab, ids) for ids in groups.values()]
    if len(items) != 25:
        raise SystemExit('%s: expected 25 sprites, found %d' % (path.name, len(items)))
    items.sort(key=lambda t: (t[0][1] + t[0][3]) / 2)
    rows = [sorted(items[r * 5:(r + 1) * 5], key=lambda t: t[0][0]) for r in range(5)]
    return [t[1] for r in rows for t in r]


def sheet(ims, labels, bg):
    cell = 190
    cols = 6; rows = (len(ims) + cols - 1) // cols
    sh = Image.new('RGB', (cols * cell, rows * cell), bg)
    d = ImageDraw.Draw(sh)
    for i, (im, lb) in enumerate(zip(ims, labels)):
        t = im.copy(); t.thumbnail((cell - 8, cell - 22)); r, c = divmod(i, cols)
        sh.paste(t, (c * cell + 4, r * cell + 16), t)
        d.text((c * cell + 4, r * cell + 2), lb, fill=(200, 30, 30) if bg[0] > 128 else (255, 255, 0))
    return sh


def main():
    dry = '--dry' in sys.argv
    SCRATCH.mkdir(parents=True, exist_ok=True)
    cand = {}      # key -> best candidate {spec, crop, tint, atlas}
    notes = []
    for aname, path, cells in ATLASES:
        crops = grid25(path)
        for i, spec in cells.items():
            if spec is None:
                continue
            key = f'{spec[0]}/{spec[1]}/{spec[2]}'
            t = tint(crops[i])
            if key in cand:
                other = cand[key]
                keep = other if other['tint'] <= t else {'spec': spec, 'crop': crops[i], 'tint': t, 'atlas': aname}
                notes.append('%-34s duplicate: %s tint %.1f vs %s tint %.1f -> kept %s' % (key, other['atlas'], other['tint'], aname, t, keep['atlas']))
                cand[key] = keep
            else:
                cand[key] = {'spec': spec, 'crop': crops[i], 'tint': t, 'atlas': aname}
    entries, files, ims, labels, cleaned, fam_scale = {}, {}, [], [], {}, {}
    for key, c in cand.items():
        cleaned[key] = defringe(c['crop'])
    for fam in set(c['spec'][6] for c in cand.values()):
        mx = max(max(cleaned[k][0].shape[:2]) for k, c in cand.items() if c['spec'][6] == fam)
        fam_scale[fam] = TARGET[fam] / mx
    for key in sorted(cand):
        c = cand[key]; cat, char, pose, view, facing, expr, fam, tags = c['spec']
        out, st = cleaned[key]
        im = Image.fromarray(out, 'RGBA'); sc = fam_scale[fam]
        im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
        arr = np.asarray(im)
        t = CLEAN.mo.thickness(CLEAN.mo.short_side(arr))
        ring, _ = CLEAN.mo.outline(arr, t)
        im = Image.fromarray(ring, 'RGBA'); im = im.crop(im.getbbox())
        bl = baseline(np.asarray(im))
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=90, method=6)
        files[LIB / (key + '.webp')] = buf.getvalue()
        entries[key] = {'file': f'assets/db/lib/{key}.webp', 'cat': cat, 'tags': tags + ['cartoon'], 'source': SRCTAG + c['atlas'], 'w': im.width, 'h': im.height,
                        'outline': t, 'baseline': bl, 'anchor': [im.width // 2, bl], 'char': char, 'view': view, 'facing': facing, 'pose': pose,
                        'expression': expr, 'fringe': st, 'tint': round(c['tint'], 1)}
        ims.append(im); labels.append(key.split('/', 1)[1])
        print('%-36s %4dx%-4d outline %d  soft px %5d -> %5d  tint %.1f  [%s]' % (key, im.width, im.height, t, st['soft_before'], st['soft_after'], c['tint'], c['atlas']))
    print('\n'.join(notes))
    sheet(ims, labels, (255, 255, 255)).save(SCRATCH / 'cast-contact-white.png')
    sheet(ims, labels, (34, 34, 42)).save(SCRATCH / 'cast-contact-dark.png')
    if dry:
        print('dry run ->', SCRATCH); return
    from asset_transaction import publish
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, files, ING.index_helper())
    (SCRATCH / 'entries.json').write_text(json.dumps(entries, indent=1))
    print('published', len(entries), 'cast sprites; index now', total, '->', SCRATCH)


if __name__ == '__main__':
    main()
