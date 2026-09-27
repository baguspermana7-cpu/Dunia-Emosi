"""
Pictures for the G27 "At Home" and "Al-Qur'an" words, which the owner's asset
sheets do not contain. Source: Microsoft Fluent Emoji 3D (MIT licence,
github.com/microsoft/fluentui-emoji) -- see assets/spelling/obj/FLUENT-EMOJI-LICENSE.txt.

    ~/.venvs/kokoro/bin/python tools/spelling_fluent_pics.py

Each sprite gets a dark rim so it sits with the sheet art (which is outlined),
is trimmed to its content and written to assets/spelling/obj/<word>.webp.
Only concrete, unambiguous objects are used: the emoji "Mobile phone" draws a
tablet, so there is no "phone"; no figures of people or angels.
"""
import os, io, urllib.parse, urllib.request
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'spelling', 'obj')
BASE = 'https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/'
SRC = {
    # At Home
    'bed': 'Bed', 'sofa': 'Couch and lamp', 'clock': 'Mantelpiece clock', 'key': 'Key', 'spoon': 'Spoon',
    'bowl': 'Bowl with spoon', 'soap': 'Soap', 'broom': 'Broom', 'radio': 'Radio', 'teapot': 'Teapot',
    'mirror': 'Mirror', 'bucket': 'Bucket', 'basket': 'Basket', 'toothbrush': 'Toothbrush',
    'television': 'Television', 'candle': 'Candle', 'umbrella': 'Umbrella', 'bathtub': 'Bathtub',
    'toilet': 'Toilet', 'sponge': 'Sponge',
    # Al-Qur'an ("quran" itself comes from the owner's sheet)
    'mosque': 'Mosque', 'kaaba': 'Kaaba', 'moon': 'Crescent moon', 'star': 'Star', 'camel': 'Camel',
    'palm': 'Palm tree', 'beads': 'Prayer beads', 'desert': 'Desert', 'sunrise': 'Sunrise',
    'prayer': 'Palms up together',
}
MAX = 192       # longest side, px -- sharper than the sheet crops, still tiny
RIM = 4         # outline width at MAX
INK = (58, 40, 30)


def fetch(name):
    f = name.lower().replace(' ', '_')
    d = urllib.parse.quote(name)
    for path in (f'{d}/3D/{f}_3d.png', f'{d}/Default/3D/{f}_3d_default.png'):
        try:
            return Image.open(io.BytesIO(urllib.request.urlopen(BASE + path, timeout=30).read())).convert('RGBA')
        except Exception:
            continue
    raise SystemExit('cannot fetch ' + name)


def outline(im):
    im = im.crop(im.getchannel('A').getbbox())
    im.thumbnail((MAX - 2 * RIM, MAX - 2 * RIM), Image.LANCZOS)
    w, h = im.size
    canvas = Image.new('RGBA', (w + 2 * RIM, h + 2 * RIM), (0, 0, 0, 0))
    canvas.alpha_composite(im, (RIM, RIM))
    a = canvas.getchannel('A')
    grown = a.filter(ImageFilter.MaxFilter(2 * RIM + 1)).filter(ImageFilter.GaussianBlur(0.8))
    rim = Image.new('RGBA', canvas.size, INK + (0,))
    rim.putalpha(grown)
    rim.alpha_composite(canvas)
    return rim


def main():
    for word, name in SRC.items():
        img = outline(fetch(name))
        assert np.asarray(img.getchannel('A')).max() == 255, word
        img.save(os.path.join(OUT, word + '.webp'), 'WEBP', quality=90, method=6)
        print('ok', word, img.size)


if __name__ == '__main__':
    main()
