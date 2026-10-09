#!/usr/bin/env python3
"""
Train art for the G31 Mojo Swoptops delivery missions (owner 2026-10-07: "rangkai gerbong untuk kereta
Malivlak — ambil dari aset Dunia Emosi", plus "jemput kereta diesel").

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-train.py          # write assets/db/lib/mojo-train/*
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-train.py --dry    # previews into $MOJO_SCRATCH only

Why: Malivlak and the Thomas/Mighty Express sprites live under assets/train/*, OUTSIDE the shared library, so
G31 could not ask for them by key (MojoArt.src -> assets/db/lib). The board needs them as board objects, which
in this family means the same treatment every other Mojo board sprite gets.

Sources (owner art only, nothing drawn here; all already cut out with alpha):
  mojo-train/malivlak     assets/train/malivlak-body.webp              the owner's own locomotive
  mojo-train/diesel       assets/train/aeg/diesel.webp                 the Diesel engine the owner asked for
  mojo-train/coach-annie  assets/train/aeg/annie-and-clarabel.webp     GERBONG (passenger coaches)
  mojo-train/coach-slip   assets/train/aeg/slip-coaches.webp           GERBONG
  mojo-train/tanker       assets/train/aeg/troublesome-tankers.webp    GERBONG (tank wagons)
  mojo-train/cargo-nate   assets/train/mighty/freight-nate.webp        GERBONG (freight)
  mojo-train/ice-penny    assets/train/mighty/penny-ice-cream.webp     GERBONG (the ice-cream van wagon)
  mojo-train/water-red    assets/train/mighty/red-water-rescue.webp    GERBONG (the water wagon)

Pipeline (the same one every Mojo board sprite goes through, so the board reads as one world):
  1 edge flood is not needed (the sources carry alpha), so the cut is the source's own alpha;
  2 halo decontamination (tools/clean-mojo-sprites.decontaminate): light edge pixels un-premultiplied against
    the measured page colour, which is what removes the pale fringe these sheets keep;
  3 tight crop to the alpha bounds and a LANCZOS downscale to the board's art size;
  4 the white sticker ring of tools/mojo_outline.py (owner 2026-10-03/04: every BOARD object carries it);
  5 the bottom contact row is recorded as `baseline` so a wagon sits on the road, not floating over it;
  6 one atomic index publish (assets/db/index.json + games/data/asset-index.js) via tools/asset_transaction.
"""
import importlib.util, io, os, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'assets' / 'db' / 'lib'
SRC = ROOT / 'assets' / 'train'
SCRATCH = Path(os.environ.get('MOJO_SCRATCH', os.path.join(tempfile.gettempdir(), 'dunia-mojo-train')))
SRCTAG = 'owner train art (assets/train) ingested for the G31 board'


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


ING = load('mojo_ingest', 'ingest-mojo-sheets.py')     # puts tools/ on sys.path for asset_transaction
CLEAN = load('mojo_clean', 'clean-mojo-sprites.py')

# key -> (source file, longest side on the board, tags, [left, right] crop of the source width)
# Two sources draw a whole RAKE: malivlak-body is the engine with three wagons already behind it and
# annie-and-clarabel is two coaches side by side. The board couples ONE wagon at a time, so the engine and a
# single coach are cut out of their own art by width fraction (nothing is drawn or redrawn here).
PLAN = {
    # the engine alone, without the soft smoke plume: a feathered plume edge takes a thinner white ring than
    # the body does, and the board object reads better as a locomotive standing on the rails
    # 170 px: measured — at the native crop size the spiky cowcatcher/wheel silhouette takes a 5 px ring whose
    # MEDIAN width reads 2.2 px (the ring merges in every narrow gap), which the art gate rejects. At 170 the
    # family thickness is 4 px and measures 3.6 on 0.95 of the boundary.
    'malivlak': ('malivlak-body.webp', 170, ['malivlak', 'locomotive', 'train'], [0.70, 1.0], [0.42, 1.0]),
    'diesel': ('aeg/diesel.webp', 220, ['diesel', 'locomotive', 'train']),
    'malivlak-rake': ('malivlak-body.webp', 300, ['malivlak', 'train', 'rake']),
    'coach-annie': ('aeg/annie-and-clarabel.webp', 232, ['coach', 'wagon', 'gerbong', 'train'], [0.0, 0.5]),
    'coach-slip': ('aeg/slip-coaches.webp', 232, ['coach', 'wagon', 'gerbong', 'train']),
    'tanker': ('aeg/troublesome-tankers.webp', 212, ['tanker', 'wagon', 'gerbong', 'train']),
    'cargo-nate': ('mighty/freight-nate.webp', 212, ['cargo', 'wagon', 'gerbong', 'freight']),
    'ice-penny': ('mighty/penny-ice-cream.webp', 200, ['ice', 'cream', 'wagon', 'gerbong']),
    'water-red': ('mighty/red-water-rescue.webp', 204, ['water', 'wagon', 'gerbong', 'rescue']),
}
# Cross-world guests the G31 board carries (owner 2026-10-07: "Antar Ash mencari Pikachu yang hilang").
# Their art lives under assets/Pokemon/, outside the shared library, so it goes through the same pipeline into
# its own family. Guests that are ALREADY in the library (tk-char Timmy, diver, penguin) are used as they are.
CROSS_SRC = ROOT / 'assets' / 'Pokemon'
CROSS = {
    'ash': ('trainer/ash-running.webp', 190, ['ash', 'trainer', 'guest']),
    'pikachu': ('g23/pikachu.webp', 176, ['pikachu', 'guest']),
}


def cleaned(path, size, crop=None, vcrop=None):
    """Source alpha -> halo-decontaminated, tightly cropped, board-sized RGBA."""
    src = Image.open(path).convert('RGBA')
    if crop or vcrop:
        box = src.getbbox() or (0, 0, src.width, src.height)
        w, h = box[2] - box[0], box[3] - box[1]
        cx = crop or [0.0, 1.0]
        cy = vcrop or [0.0, 1.0]
        src = src.crop((box[0] + round(w * cx[0]), box[1] + round(h * cy[0]),
                        box[0] + round(w * cx[1]), box[1] + round(h * cy[1])))
    rgba = np.asarray(src)
    rgb, alpha = rgba[..., :3].copy(), rgba[..., 3].copy()
    bg = CLEAN.page_colour(rgb, alpha)
    rgb, alpha = CLEAN.decontaminate(rgb, alpha, bg)
    im = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')
    box = im.getbbox()
    if box is None:
        raise ValueError(f'{path}: nothing visible after cleaning')
    im = im.crop(box)
    s = size / max(im.size)
    if s < 1:
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    return im


def outlined(im):
    """The white sticker ring every G31 board object carries (applied once, in memory)."""
    arr = np.asarray(im.convert('RGBA'))
    t = CLEAN.mo.thickness(CLEAN.mo.short_side(arr))
    ring, _ = CLEAN.mo.outline(arr, t)
    return Image.fromarray(ring, 'RGBA'), t


def baseline(im):
    """The bottom contact row: the lowest row with at least two solid pixels (so a wagon stands on the road)."""
    a = np.asarray(im.convert('RGBA'))[..., 3]
    rows = np.nonzero((a >= 128).sum(1) >= 2)[0]
    return int(rows[-1]) if len(rows) else im.height - 1


def main():
    import json
    dry = '--dry' in sys.argv
    SCRATCH.mkdir(parents=True, exist_ok=True)
    entries, files = {}, {}
    missing = [n for n, spec in PLAN.items() if not (SRC / spec[0]).exists()]
    missing += [n for n, spec in CROSS.items() if not (CROSS_SRC / spec[0]).exists()]
    if missing:
        raise SystemExit('missing owner sources: ' + ', '.join(missing))
    for fam, base, table in (('mojo-train', SRC, PLAN), ('mojo-cross', CROSS_SRC, CROSS)):
      for name, spec in table.items():
        rel, size, tags = spec[0], spec[1], spec[2]
        crop = spec[3] if len(spec) > 3 else None
        vcrop = spec[4] if len(spec) > 4 else None
        key = fam + '/' + name
        im, t = outlined(cleaned(base / rel, size, crop, vcrop))
        out = (SCRATCH / (fam + '-' + name + '.webp')) if dry else (LIB / (key + '.webp'))
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=92, method=6)
        if dry:
            out.parent.mkdir(parents=True, exist_ok=True); out.write_bytes(buf.getvalue())
        else:
            files[out] = buf.getvalue()
        entries[key] = {'file': f'assets/db/lib/{key}.webp', 'cat': fam, 'tags': tags + ['mojo', 'cartoon'],
                        'source': SRCTAG + ': ' + rel, 'w': im.width, 'h': im.height,
                        'outline': t, 'baseline': baseline(im)}
        for bgc, tag in (((40, 44, 52), 'dark'), ((234, 220, 194), 'road')):
            pv = Image.new('RGBA', im.size, bgc + (255,)); pv.alpha_composite(im)
            pv.convert('RGB').save(SCRATCH / (fam + '-' + name + '-' + tag + '.png'))
        print('%-24s %-12s outline %d baseline %d  <- %s' % (key, 'x'.join(map(str, im.size)), t, entries[key]['baseline'], rel))
    if not dry:
        from asset_transaction import publish
        publish(str(ROOT / 'assets' / 'db' / 'index.json'), entries, files, ING.index_helper())
        print('published', len(entries), 'sprites into assets/db/lib/mojo-train + mojo-cross')
    else:
        (SCRATCH / 'entries.json').write_text(json.dumps(entries, indent=2))
        print('dry run ->', SCRATCH)


if __name__ == '__main__':
    main()
