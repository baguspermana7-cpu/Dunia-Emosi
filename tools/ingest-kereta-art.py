#!/usr/bin/env python3
"""
Codex's Kereta Pemberani art package -> the game (owner 2026-10-10).
Source: ~/Documents/temporary/game asset/train/kekurangan/handoff and result/ (database/asset-manifest.json is the index).
Ships ONLY backgrounds/, sheets/, characters/, story-cards/ (never preview/, reference-analysis/, source/).

    ~/.venvs/kokoro/bin/python tools/ingest-kereta-art.py [--dry]

  backgrounds  44 opaque PNG -> assets/kereta/bg/<key>-landscape.webp (1672x941) and -portrait.webp (941x1672), q82
  story cards  11 PNG (960x540) -> assets/kereta/cards/<name>.webp (q80)
  tiles-rel    5x5 atlas -> database keys kereta-tile/<name> (whole 250 cell, lossless alpha, 160 px)
  props-cerita 5x5 atlas -> database keys kereta-prop/<name> (tight crop, baseline + anchor bottom-centre)
  carter-extra 2x3 atlas -> story-char/carter/<pose> (kid-safe, empty-handed; name_id "Mr Carter"; sticker outline)
"""
import csv, io, json, os, sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
import importlib.util
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('cast', ROOT / 'tools' / 'ingest-story-cast.py'); CAST = importlib.util.module_from_spec(spec); spec.loader.exec_module(CAST)
PK = Path(os.path.expanduser('~/Documents/temporary/game asset/train/kekurangan/handoff and result'))
LIB = ROOT / 'assets' / 'db' / 'lib'
OUTB = ROOT / 'assets' / 'kereta'
SRC = 'Codex art package (handoff and result): '


def webp(im, q=82, lossless=False):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6, lossless=lossless); return b.getvalue()


def slug(n):
    return n.strip().lower().replace('/', '-').replace(' ', '-')


def main():
    dry = '--dry' in sys.argv
    man = json.loads((PK / 'database' / 'asset-manifest.json').read_text())
    files, entries = {}, {}
    # backgrounds
    nbg = 0
    for bg in man['backgrounds']:
        key = bg['id']
        for orient in ('landscape', 'portrait'):
            src = PK / 'backgrounds' / f'{key}-{orient}.png'
            im = Image.open(src).convert('RGB')
            exp = (1672, 941) if orient == 'landscape' else (941, 1672)
            assert im.size == exp, (src, im.size)
            files[OUTB / 'bg' / f'{key}-{orient}.webp'] = webp(im, 82); nbg += 1
    for p in sorted((PK / 'story-cards').glob('*.png')):
        im = Image.open(p).convert('RGB').resize((640, 360), Image.LANCZOS)
        files[OUTB / 'cards' / (p.stem + '.webp')] = webp(im, 80)
    # tiles + props
    def cells(csvname, sheet):
        im = Image.open(PK / 'sheets' / sheet).convert('RGBA'); rows = list(csv.DictReader(open(PK / 'database' / csvname)))
        for r in rows:
            R, C = int(r['row']) - 1, int(r['column']) - 1
            yield r['name'], im.crop((C * 250, R * 250, C * 250 + 250, R * 250 + 250))
    TILEKEY = {'rail straight horizontal': 'rail-h', 'rail straight vertical': 'rail-v', 'rail curve NE': 'curve-ne', 'rail curve NW': 'curve-nw', 'rail curve SE': 'curve-se', 'rail curve SW': 'curve-sw',
               'switch/wesel left': 'switch-left', 'switch/wesel right': 'switch-right', 'crossing': 'crossing', 'buffer stop': 'buffer', 'grass tile': 'grass', 'grass with flowers': 'grass-flowers',
               'gravel/ballast tile': 'gravel', 'dirt path': 'dirt-path', 'water tile': 'water', 'wooden bridge straight': 'bridge', 'bridge sagging': 'bridge-sagging', 'bridge broken with gap': 'bridge-broken',
               'tunnel portal': 'tunnel-portal', 'level crossing gate': 'level-crossing', 'signal red': 'signal-red', 'signal green': 'signal-green', 'station platform piece': 'platform', 'water tower': 'water-tower', 'coal bunker': 'coal-bunker'}
    PROPKEY = {'passenger luggage pile': 'luggage-pile', 'mail sacks with envelopes': 'mail-sacks', 'stack of logs': 'log-stack', 'single big log': 'log-single', 'coal pile': 'coal-pile', 'wooden crate': 'crate', 'barrel': 'barrel',
               'lantern': 'lantern', 'signal box hut': 'signal-box', 'ticket booth': 'ticket-booth', 'small station building': 'station-small', 'sawmill shed': 'sawmill', 'farmhouse': 'farmhouse', 'engine house': 'engine-house',
               'pine tree': 'pine', 'round tree': 'tree-round', 'bush': 'bush', 'rock': 'rock', 'haystack': 'haystack', 'fence piece': 'fence', 'bird nest with eggs': 'bird-nest', 'frying pan with fried egg': 'frying-pan-egg',
               'wheel bandage white cloth roll': 'wheel-bandage', 'medal with red ribbon': 'medal', 'leaf wreath': 'wreath'}
    for name, cell in cells('tiles-rel-cells.csv', 'tiles-rel.png'):
        k = 'kereta-tile/' + TILEKEY[name]; im = cell.resize((160, 160), Image.LANCZOS)
        files[LIB / (k + '.webp')] = webp(im, lossless=True)
        entries[k] = {'file': f'assets/db/lib/{k}.webp', 'cat': 'kereta-tile', 'tags': ['tile', 'rel', 'board', TILEKEY[name], 'cartoon'], 'source': SRC + 'tiles-rel.png', 'w': 160, 'h': 160, 'baseline': 159, 'anchor': [80, 80], 'name_id': name}
    for name, cell in cells('props-cerita-cells.csv', 'props-cerita.png'):
        k = 'kereta-prop/' + PROPKEY[name]; a = cell.getbbox(); im = cell.crop(a)
        s = 200 / max(im.size); im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        al = np.asarray(im)[..., 3]; rows = np.nonzero((al >= 128).sum(1) >= 2)[0]; bl = int(rows[-1]) if len(rows) else im.height - 1
        files[LIB / (k + '.webp')] = webp(im, 90)
        entries[k] = {'file': f'assets/db/lib/{k}.webp', 'cat': 'kereta-prop', 'tags': ['prop', 'cerita', PROPKEY[name], 'cartoon'], 'source': SRC + 'props-cerita.png', 'w': im.width, 'h': im.height, 'baseline': bl, 'anchor': [im.width // 2, bl], 'name_id': name}
    # carter
    CP = {(0, 0): ('hands-hips', 'angry', 'Berkacak pinggang'), (0, 1): ('point', 'angry', 'Menunjuk ke depan'), (1, 0): ('arms-crossed', 'angry', 'Berlipat tangan'),
          (1, 1): ('watch', 'neutral', 'Memeriksa jam saku'), (2, 0): ('surprised', 'shocked', 'Terkejut'), (2, 1): ('defeated', 'sad', 'Berjalan pergi lesu')}
    ci = Image.open(PK / 'characters' / 'carter-extra.png').convert('RGBA'); cl = []
    for (r, c), (pose, expr, lab) in CP.items():
        cell = np.asarray(ci.crop((c * 512, r * 512, c * 512 + 512, r * 512 + 512)))
        bb = Image.fromarray(cell).getbbox(); cell = cell[bb[1]:bb[3], bb[0]:bb[2]]
        out, st = CAST.defringe(cell); im = Image.fromarray(out, 'RGBA'); im = im.crop(im.getbbox())
        s = 300 / max(im.size); im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        arr = np.asarray(im); t = CAST.CLEAN.mo.thickness(CAST.CLEAN.mo.short_side(arr)); ring, _ = CAST.CLEAN.mo.outline(arr, t)
        im = Image.fromarray(ring, 'RGBA'); im = im.crop(im.getbbox()); bl = CAST.baseline(np.asarray(im)); k = 'story-char/carter/' + pose
        files[LIB / (k + '.webp')] = webp(im, 90)
        entries[k] = {'file': f'assets/db/lib/{k}.webp', 'cat': 'story-char', 'tags': ['carter', 'logger', 'man', 'cartoon'], 'source': SRC + 'carter-extra.png', 'w': im.width, 'h': im.height, 'outline': t, 'baseline': bl,
                      'anchor': [im.width // 2, bl], 'char': 'carter', 'view': 'front', 'facing': 180, 'pose': pose, 'expression': expr, 'fringe': st, 'tint': 0.0, 'name_id': 'Mr Carter'}
        cl.append(im)
    print('backgrounds', nbg, 'cards 11, tiles 25, props 25, carter', len(cl), 'files', len(files), 'bytes', sum(len(v) for v in files.values()))
    if dry:
        return
    from asset_transaction import publish
    # bg/cards are plain files outside the db: write them directly
    for f, b in list(files.items()):
        if str(f).startswith(str(OUTB)):
            f.parent.mkdir(parents=True, exist_ok=True); f.write_bytes(b); del files[f]
    total = publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, files, CAST.ING.index_helper())
    print('published', len(entries), 'entries; index now', total)


if __name__ == '__main__':
    main()
