#!/usr/bin/env python3
"""
Board props for G31 Mojo Swoptops at play size (audit L6, 2026-10-03): the pushable rock and the fire.

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-board-props.py          # write the two sprites
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-board-props.py --dry    # write previews to $MOJO_SCRATCH only

Why: the board drew mojo-tile/rock-push (72x58) and mojo-tile/fire (85x79), cut from the owner's 95 px grid-tile
sheet, at ~150 px, so they were blurry; the rock kept a pale page fringe and the fire is a framed TILE icon (a
square card with a flame painted on it), not a flame standing on the road.

Sources (owner art only, nothing drawn here):
  rock  owner-sheets/29-extra-*.png, cell row 1 col 3 (the single boulder, 250 px; its grass tufts kept as drawn)
  fire  owner-sheets/28-extra-*.png, cell row 1 col 2 (the campfire, 250 px): its FLAME only, cut above the logs
Method: the same edge-flood cut-out as tools/ingest-mojo-sheets.py (cutout(): the page colour flooded in from the
crop border, never a global white key), then the halo decontamination of tools/clean-mojo-sprites.py
(un-premultiply light edge pixels against the measured page colour). (The chase items sheet's rock was tried
first: removing its grass left holes in the stone, and the boulder touches its cell edge.)
The flame is separated from the logs and stones by colour (flame = bright warm pixels), its holes filled, and the
cut where it met the logs fades out over its lowest rows, so it reads as fire burning on the ground.
Outputs (new names; the old tiles stay for the Soal pack): mojo-prop/rock-road.webp, mojo-fx/flame-road.webp.
"""
import importlib.util, io, os, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'assets' / 'db' / 'lib'
GAME = Path(os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops'))
SCRATCH = Path(os.environ.get('MOJO_SCRATCH', os.path.join(tempfile.gettempdir(), 'dunia-mojo-board-props')))


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod); return mod


ING = load('mojo_ingest', 'ingest-mojo-sheets.py')
CLEAN = load('mojo_clean', 'clean-mojo-sprites.py')


def cell(path, col, row, n=5, inset=4):
    im = np.asarray(Image.open(path).convert('RGB'))
    h, w = im.shape[:2]; cw, ch = w / n, h / n
    return im[int(row * ch) + inset:int((row + 1) * ch) - inset, int(col * cw) + inset:int((col + 1) * cw) - inset].copy()


def finish(a, alpha, size):
    bg = CLEAN.page_colour(a, alpha)
    rgb, alpha = CLEAN.decontaminate(a, alpha, bg)
    im = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), 'RGBA')
    im = im.crop(im.getbbox())
    s = size / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return im


def rock():
    # the owner's single boulder (sheet 29, row 1 col 3): its two grass tufts stay, as drawn (a roadside rock)
    src = sorted((GAME / 'owner-sheets').glob('29-*.png'))[0]
    a = cell(src, 2, 0)
    out = np.asarray(ING.cutout(a, 'white'))
    return finish(out[..., :3].copy(), out[..., 3].copy(), 192)


def flame():
    src = sorted((GAME / 'owner-sheets').glob('28-*.png'))[0]
    a = cell(src, 1, 0)
    r, g, b = [a[..., k].astype(np.int16) for k in range(3)]
    warm = (r >= 200) & (r - b >= 70) & (g >= 50)
    warm = ndimage.binary_opening(warm, structure=np.ones((2, 2)))
    lab, n = ndimage.label(ndimage.binary_dilation(warm, iterations=2))
    sizes = ndimage.sum(warm, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 0.01 * sizes.max()])
    mask = ndimage.binary_fill_holes(keep & warm | (keep & ndimage.binary_closing(warm, iterations=3)))
    mask = ndimage.binary_fill_holes(mask)
    alpha = np.where(mask, 255, 0).astype(np.uint8)
    # the logs: brown, darker than any flame pixel; the flame ends at the top of the highest log
    logs = (r >= 90) & (r <= 200) & (g <= 120) & (b <= 90) & (r - g >= 40) & ~warm
    logs = ndimage.binary_opening(logs, structure=np.ones((3, 3)))
    ly = np.nonzero(logs[:, mask.any(0)].any(1))[0]
    cut = int(ly.min()) - 2 if len(ly) else a.shape[0]
    mask[cut:] = False
    alpha = np.where(mask, 255, 0).astype(np.uint8)
    alpha = np.clip(ndimage.gaussian_filter(alpha.astype(np.float32), 0.7), 0, 255).astype(np.uint8)
    alpha[cut:] = 0
    a, alpha = CLEAN.decontaminate(a, alpha, CLEAN.page_colour(a, alpha))   # the light page ring at the edge
    alpha = alpha.astype(np.float32)
    ys = np.nonzero(mask.any(1))[0]; y0, y1 = ys.min(), ys.max()
    fade = int((y1 - y0) * 0.22)
    ramp = np.ones(a.shape[0], np.float32)
    ramp[y1 - fade:y1 + 1] = np.linspace(1.0, 0.0, fade + 1) ** 0.8
    alpha = (alpha * ramp[:, None]).astype(np.uint8)
    im = Image.fromarray(np.dstack([a, alpha]).astype(np.uint8), 'RGBA')
    im = im.crop(im.getbbox())
    return im


def main():
    dry = '--dry' in sys.argv
    SCRATCH.mkdir(parents=True, exist_ok=True)
    for key, im in (('mojo-prop/rock-road', rock()), ('mojo-fx/flame-road', flame())):
        out = (SCRATCH / (key.replace('/', '-') + '.webp')) if dry else (LIB / (key + '.webp'))
        buf = io.BytesIO(); im.save(buf, 'WEBP', quality=92, method=6)
        out.write_bytes(buf.getvalue())
        for bgc, tag in (((40, 44, 52), 'dark'), ((234, 220, 194), 'road')):
            pv = Image.new('RGBA', im.size, bgc + (255,)); pv.alpha_composite(im); pv.convert('RGB').save(SCRATCH / (key.replace('/', '-') + '-' + tag + '.png'))
        print(key, im.size, out)


if __name__ == '__main__':
    main()
