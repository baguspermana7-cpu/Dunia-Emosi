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
    9: S,    # earlier vest man (not James): dropped
    10: S,   # WRONG Carter (owner correction): dropped
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
    19: S,
    20: A1[12], 21: A1[19], 22: A1[18], 23: A1[14], 24: A1[15],
})
def MV(char, pose, name, expr='neutral', view='side', facing=90, fam='mvpeople'):
    return ('malivlak-char', char, pose, view, facing, expr, fam, [char.split('-')[0], 'malivlak', 'cartoon', name.lower()], name)
A3 = {
    0: MV('masinis', 'pipa', 'Masinis Berpipa'), 1: MV('penumpang-ungu', 'koper', 'Penumpang Ungu Berkoper'),
    2: MV('petugas-stasiun', 'berdiri', 'Petugas Stasiun'), 3: MV('petugas-bagasi', 'angkat', 'Petugas Bagasi'),
    4: MV('penumpang-jas-kotak', 'jalan', 'Penumpang Berjas Kotak'),
    5: MV('orkes', 'pemimpin', 'Pemimpin Orkes'), 6: MV('orkes', 'drum', 'Pemain Drum'), 7: MV('orkes', 'tuba', 'Pemain Tuba'),
    8: MV('orkes', 'terompet', 'Pemain Terompet'), 9: MV('orkes', 'kontrabas', 'Pemain Kontrabas'),
    10: MV('penyambut', 'jangkung', 'Penyambut Jangkung'), 11: MV('pembaca-pidato', 'kertas', 'Pembaca Pidato'), 12: MV('penyambut', 'pendek', 'Penyambut Pendek'),
    13: ('animal', 'beruang', 'depan', 'front', 180, 'neutral', 'bear', ['bear', 'beruang', 'animal', 'malivlak'], 'Beruang (tampak depan)'),
    14: ('animal', 'beruang', 'belakang', 'rear', 0, 'neutral', 'bear', ['bear', 'beruang', 'animal', 'malivlak'], 'Beruang (tampak belakang)'),
    15: ('animal', 'kelinci', 'berdiri', 'side', 90, 'neutral', 'rabbit', ['rabbit', 'kelinci', 'animal', 'malivlak'], 'Kelinci Berdiri'),
    16: ('animal', 'kelinci', 'jongkok', 'side', 90, 'neutral', 'rabbit', ['rabbit', 'kelinci', 'animal', 'malivlak'], 'Kelinci Jongkok'),
    17: ('animal', 'ikan', 'samping', 'side', 90, 'neutral', 'fish', ['fish', 'ikan', 'animal', 'malivlak'], 'Ikan'),
    18: MV('masinis', 'palu', 'Masinis Memegang Palu'), 19: MV('masinis', 'wajan', 'Masinis Membawa Wajan', 'happy'),
    20: MV('masinis', 'medali', 'Masinis Bermedali', 'happy'), 21: MV('penumpang-ungu', 'lari', 'Penumpang Ungu Berlari'),
    22: MV('petugas-stasiun', 'bendera', 'Petugas Stasiun Mengangkat Bendera'), 23: MV('orkes', 'pemimpin-tongkat', 'Pemimpin Orkes Mengayun Tongkat'),
    24: MV('pembaca-pidato', 'gestur', 'Pembaca Pidato Bergestur'),
}
def AN(name, pose, nm, view, facing, fam, tags):
    return ('animal', name, pose, view, facing, 'neutral', fam, tags + ['animal', 'malivlak'], nm)
A4 = {
    0: MV('masinis', 'pipa-2', 'Masinis (berdiri dengan pipa di mulut)'), 1: MV('masinis', 'jalan', 'Masinis (berjalan)'),
    2: MV('masinis', 'terkejut', 'Masinis (terkejut sambil mengangkat tangan)', 'shocked'), 3: MV('masinis', 'periksa', 'Masinis (berjongkok dan memeriksa ke bawah)'),
    4: MV('masinis', 'ikan', 'Masinis (mengangkat ikan)', 'happy'),
    5: MV('penumpang-ungu', 'berdiri', 'Penumpang Ungu (berdiri membawa koper)'), 6: MV('penumpang-ungu', 'lari-2', 'Penumpang Ungu (berlari membawa koper)'),
    7: MV('penumpang-ungu', 'duduk', 'Penumpang Ungu (duduk memegang koper di pangkuan)'),
    8: MV('petugas-stasiun', 'bendera-bawah', 'Petugas Stasiun (memegang bendera merah mengarah ke bawah)'), 9: MV('petugas-stasiun', 'peluit', 'Petugas Stasiun (meniup peluit sambil mengangkat tangan)'),
    10: MV('orkes', 'pemimpin-kiri', 'Pemimpin Orkes (mengarahkan tongkat ke kiri)'), 11: MV('orkes', 'drum-angkat', 'Pemain Drum (mengangkat pemukul drum)'),
    12: MV('orkes', 'tuba-tekuk', 'Pemain Tuba (meniup tuba sambil menekuk lutut)'), 13: MV('orkes', 'terompet-atas', 'Pemain Terompet (meniup terompet mengarah ke atas)'),
    14: MV('orkes', 'kontrabas-2', 'Pemain Kontrabas (memainkan kontrabas)'),
    15: MV('penyambut', 'jangkung-bungkuk', 'Penyambut Jangkung (membungkuk dengan tangan di dada)'), 16: MV('pembaca-pidato', 'terkejut', 'Pembaca Pidato (memegang kertas dengan ekspresi terkejut)', 'shocked'),
    17: MV('penyambut', 'pendek-medali', 'Penyambut Pendek (memegang medali berpita merah)', 'happy'), 18: MV('petugas-bagasi', 'koper-besar', 'Petugas Bagasi (membawa koper besar)'),
    19: MV('penumpang-jas-kotak', 'jam-saku', 'Penumpang Berjas Kotak (memeriksa jam saku)'),
    20: AN('beruang', 'jalan', 'Beruang (berjalan dengan empat kaki)', 'side', 90, 'bear', ['bear', 'beruang']), 21: AN('beruang', 'duduk', 'Beruang (duduk tegak)', 'front', 90, 'bear', ['bear', 'beruang']),
    22: AN('kelinci', 'lompat', 'Kelinci (melompat)', 'side', 90, 'rabbit', ['rabbit', 'kelinci']), 23: AN('kelinci', 'duduk-belakang', 'Kelinci (duduk membelakangi sambil menoleh)', 'rear', 0, 'rabbit', ['rabbit', 'kelinci']),
    24: AN('ikan', 'kanan', 'Ikan (menghadap ke kanan dengan tubuh mendatar)', 'side', 90, 'fish', ['fish', 'ikan']),
}
def P(char, pose, expr='neutral', tags=None, view='front', facing=180, fam='people'):
    return ('story-char', char, pose, view, facing, expr, fam, tags or [char, 'cartoon'])
A5 = {
    0: A2[10], 1: P('scarlet', 'ramah', 'happy', ['scarlet', 'hijab', 'woman']), 2: P('baron', 'angkuh', 'angry', ['baron', 'man']),
    3: P('katrina', 'khawatir', 'worried', ['katrina', 'hijab', 'woman']), 4: S,
    5: S, 6: A1[2], 7: A1[23],
    8: ('train-char', 'coach-green', 'front-34l', 'front34', 225, 'neutral', 'train', ['coach', 'wagon', 'gerbong', 'train']),
    9: ('train-char', 'caboose-red', 'front-34r', 'front34', 135, 'neutral', 'train', ['caboose', 'wagon', 'gerbong', 'train']),
    10: P('henry', 'jongkok', 'neutral', ['henry', 'engineer', 'man']), 11: A1[24],
    12: P('scarlet', 'cemas-atas', 'worried', ['scarlet', 'hijab', 'woman']), 13: A2[18], 14: A2[16],
    15: A1[12], 16: A1[19], 17: A1[13], 18: A1[20], 19: A1[18], 20: A1[14], 21: A1[15], 22: A1[16], 23: A1[17],
    24: ('animal', 'turtle', 'shell', 'side', 90, 'worried', 'turtle', ['turtle', 'kura-kura', 'animal']),
}
OFFICIAL = {'henry': 'Henry McCloud', 'scarlet': 'Scarlet McCloud', 'baron': 'Baron Von Kapital', 'katrina': 'Katrina Von Kapital', 'james': 'James Wethworth',
            'carter': 'Mr Carter', 'goro-loco': 'Goro', 'coach-green': 'Gerbong Penumpang Hijau', 'caboose-red': 'Gerbong Caboose Merah', 'rabbit': 'Kelinci',
            'deer': 'Rusa', 'turtle': 'Kura-kura', 'bird-blue': 'Burung Biru', 'cardinal': 'Burung Merah', 'vulture': 'Burung Nasar', 'lelaki-rompi': 'Lelaki Berompi'}
PRIORITY = {}   # the canonical James (hat, long brown coat) replaces the earlier vest man
def Q(char, pose, expr='angry'):
    return ('story-char', char, pose, 'front', 180, expr, 'people', [char, 'cartoon'])
# owner correction: 2 columns x 5 rows. LEFT = Mr Carter, RIGHT = James Wethworth. KID-SAFE FILTER: Carter rows 1-4 hold a whip and / or a
# chain and James row 1 a revolver: NOT ingested. Both carry a pipe: kept as drawn, never animated.
A6 = {(4, 0): Q('carter', 'hands-open'), (1, 1): Q('james', 'arms-folded'), (2, 1): Q('james', 'scroll'), (3, 1): Q('james', 'walk-scroll'), (4, 1): Q('james', 'point-scroll')}
CJ = [Path(os.path.expanduser('~/Downloads/Ten-character transparent sprite sheet-2.png')), Path(os.path.expanduser('~/Downloads/Carter and Wethworth Sprite Sheet.png'))]


def grid_cols(path, nrows=5, ncols=2):
    """Components of a 2 x 5 sheet grouped by cell (detached bits of one pose merge into it)."""
    arr, lab, groups = TRAIN.components(path)
    H, W = arr.shape[:2]; cells = {}
    for ids in groups.values():
        box, crop = TRAIN.cut(arr, lab, ids)
        cy, cx = (box[1] + box[3]) / 2, (box[0] + box[2]) / 2
        cells.setdefault((min(nrows - 1, int(cy / (H / nrows))), min(ncols - 1, int(cx / (W / ncols)))), []).append(ids)
    return {k: TRAIN.cut(arr, lab, [i for g in v for i in g])[1] for k, v in cells.items()}


ATLASES = [('film-atlas', Path(os.path.expanduser('~/Downloads/Film-inspired 5x5 character and train atlas.png')), A1),
           ('brave-atlas', Path(os.path.expanduser('~/Downloads/The Brave Locomotive 25-Sprite Atlas.png')), A2),
           ('malivlak-atlas', Path(os.path.expanduser('~/Downloads/1959 Mali vlak character sprite atlas.png')), A3),
           ('malivlak-atlas-2', Path(os.path.expanduser('~/Downloads/Mali vlak Part 2 sprite atlas.png')), A4),
           ('brave-final', Path(os.path.expanduser('~/Downloads/Brave Locomotive Supporting Sprite Atlas.png')), A5)]
TARGET = {'mvpeople': 300, 'bear': 250, 'fish': 110, 'train': 300, 'people': 300, 'turtle': 150, 'rabbit': 170, 'deer': 230, 'bird': 120, 'vulture': 150}
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
    cols = 8; rows = (len(ims) + cols - 1) // cols
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
            if key in cand and key in PRIORITY:
                if aname == PRIORITY[key]:
                    cand[key] = {'spec': spec, 'crop': crops[i], 'tint': t, 'atlas': aname}
                    notes.append('%-34s priority: %s' % (key, aname))
            elif key in cand:
                other = cand[key]
                keep = other if other['tint'] <= t else {'spec': spec, 'crop': crops[i], 'tint': t, 'atlas': aname}
                notes.append('%-34s duplicate: %s tint %.1f vs %s tint %.1f -> kept %s' % (key, other['atlas'], other['tint'], aname, t, keep['atlas']))
                cand[key] = keep
            else:
                cand[key] = {'spec': spec, 'crop': crops[i], 'tint': t, 'atlas': aname}
    cj = grid_cols(CJ[0])
    for (r, c), spec in A6.items():
        crop = cj[(r, c)]; key = f'{spec[0]}/{spec[1]}/{spec[2]}'
        cand[key] = {'spec': spec, 'crop': crop, 'tint': tint(crop), 'atlas': 'carter-james-sheet'}
    entries, files, ims, labels, cleaned, fam_scale = {}, {}, [], [], {}, {}
    for key, c in cand.items():
        cleaned[key] = defringe(c['crop'])
    for fam in set(c['spec'][6] for c in cand.values()):
        mx = max(max(cleaned[k][0].shape[:2]) for k, c in cand.items() if c['spec'][6] == fam)
        fam_scale[fam] = TARGET[fam] / mx
    for key in sorted(cand):
        c = cand[key]; cat, char, pose, view, facing, expr, fam, tags = c['spec'][:8]; name_id = c['spec'][8] if len(c['spec']) > 8 else None
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
        name_id = name_id or OFFICIAL.get(char)
        if name_id: entries[key]['name_id'] = name_id
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
