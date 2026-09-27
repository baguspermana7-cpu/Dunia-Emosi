#!/usr/bin/env python3
"""
Owner's icon sheets -> NAMED, shared sprites in the asset DB.

    ~/.venvs/kokoro/bin/python tools/ingest-asset-sheets.py            # all sheets
    ~/.venvs/kokoro/bin/python tools/ingest-asset-sheets.py icons-animals-25

Owner (2026-09-27): "masukkan ke database asset … agar reusable", "crop dg sempurna",
"compressed … webp … tapi dg tidak membuat gambar sprite jadi pecah".

Output
  assets/db/lib/<category>/<name>.webp   one sprite per icon, native resolution
  assets/db/index.json                   name -> {file, cat, tags, source, w, h}
  games/data/asset-index.js              window.AssetIndex (same data, for pages)

Why not tools/crop-new-sheets.py: it thresholds alpha hard (>150 -> 255), which
stair-steps every curved edge, and floods ALL near-white from the border, which
hollows a white subject whose outline has a gap. Here:
  - background = near-white pixels CONNECTED to the cell border only;
  - the alpha edge is SOFT: over a 3px band, alpha follows the pixel's distance
    from the white background, and the colour is un-premultiplied against white,
    so no white halo and no jaggies;
  - a white subject (chicken, snowman, milk, cloud) is protected: bg flood stops at
    any pixel darker than the tolerance, and a hole INSIDE the subject is filled back;
  - sprites stay at the sheet's native size (~240 px), WebP q95 + sharp YUV with
    LOSSLESS alpha (~19 KB; lossless is ~48 KB and looks identical at 2x), and every
    file is decoded and compared to its source (LUMA PSNR >= 38 dB on the opaque area,
    alpha exact within 2/255);
    a sprite that would visibly degrade fails the run instead of shipping.
Names: row-major, as listed below. A name that already exists (the same subject on
two sheets) is kept once — the first sheet wins — and logged as a duplicate.
"""
import io, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = os.path.expanduser('~/Documents/temporary/game asset/stinky-dirty')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'db', 'lib')
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')
JS = os.path.join(ROOT, 'games', 'data', 'asset-index.js')

# sheet -> (cols, rows, [(category, name) row-major])
def g(cat, names): return [(cat, n) for n in names.split()]
SHEETS = {
  'icons-platformer-25': (5, 5,
    g('game', 'signpost-arrows portal-stone trophy-gold barrel mushroom-red')
    + g('game', 'crate-wood coin-star gem-blue heart question-block')
    + g('game', 'pipe-green spring-pad conveyor bomb target-board')
    + g('game', 'ladder mine-cart shield-star flag-red bush')
    + g('game', 'crystal-ice cactus lantern bridge-rope chest-red')),
  'icons-items-25': (5, 5,
    g('game', 'crown sword chest-dark treasure-map compass')
    + g('game', 'lifebuoy gear hourglass gem-green potion-purple')
    + g('game', 'target-arrow signpost-wood torch bomb-skull bell')
    + g('game', 'anchor hot-air-balloon magnet clover key-ornate')
    + g('nature', 'snowflake sprout') + g('game', 'windmill') + g('toys', 'soccer-ball') + g('game', 'shield-lion')),
  'icons-animals-food-things-25': (5, 5,
    g('animals', 'dog cat panda cow chicken')
    + g('food', 'carrot tomato broccoli banana apple')
    + g('food', 'burger pizza donut bread cheese')
    + g('food', 'milk water-bottle mug orange-juice popcorn')
    + g('toys', 'soccer-ball basketball gamepad') + g('school', 'books backpack-yellow')),
  'icons-nature-vehicles-25': (5, 5,
    g('nature', 'sun moon-stars cloud rainbow') + g('things', 'umbrella-red')
    + g('vehicles', 'airplane car-red school-bus bicycle sailboat')
    + g('toys', 'guitar') + g('things', 'camera') + g('toys', 'soccer-ball') + g('vehicles', 'excavator fire-truck')
    + g('nature', 'potted-plant cherry-blossom sunflower rose') + g('game', 'clover')
    + g('nature', 'maple-leaf snowman sandcastle snowflake') + g('things', 'gift')),
  'icons-everyday-park-25': (5, 5,
    g('things', 'key-gold padlock light-bulb battery alarm-clock')
    + g('school', 'globe backpack-brown notebook laptop') + g('things', 'smartphone')
    + g('things', 'shopping-cart trash-can recycle cardboard-box') + g('park', 'bench')
    + g('park', 'street-lamp fence tree well fountain')
    + g('park', 'wheelbarrow watering-can lawn-mower arrow-sign potted-cactus')),
  'icons-sea-fruit-veg-sweets-30': (5, 6,
    g('animals', 'penguin dolphin sea-turtle clownfish octopus')
    + g('animals', 'bee ladybug butterfly frog snail')
    + g('food', 'strawberry grapes orange watermelon pineapple')
    + g('food', 'coconut avocado kiwi mango eggplant')
    + g('food', 'chili bell-pepper garlic onion mushroom')
    + g('food', 'cookie cupcake ice-cream chocolate pancakes')),
  'icons-animals-25': (5, 5,
    g('animals', 'owl husky duckling elephant pig')
    + g('animals', 'lion zebra giraffe koala monkey')
    + g('animals', 'parrot flamingo toucan eagle owl-blue')
    + g('animals', 'crab starfish clownfish blue-tang lobster')
    + g('animals', 'sea-turtle shark pufferfish squid stingray')),
  # ── second batch (2026-09-27). Same subject = same key (merged as a duplicate);
  #    logo items -> branded/, banknotes -> currency/ (NOT for default use: public repo,
  #    trademarks; reproducing rupiah is restricted). Indonesian culture keeps its name.
  'icons-safety-party-toys-25': (5, 5,
    g('things', 'fire-extinguisher hard-hat traffic-cone house-plant') + g('game', 'trophy-cup')
    + g('things', 'gift birthday-cake alarm-clock-black lifebuoy-rope') + g('school', 'globe')
    + g('game', 'treasure-chest diamond crown-jewel horseshoe-magnet') + g('things', 'binoculars')
    + g('toys', 'beach-ball rubber-duck') + g('park', 'potted-cactus') + g('things', 'beach-umbrella') + g('toys', 'soccer-ball')
    + g('things', 'flashlight first-aid-kit cooking-pot picnic-basket') + g('toys', 'skateboard')),
  'icons-animals-fruit-home-30': (5, 6,
    g('things', 'soccer-boot') + g('vehicles', 'motorcycle airplane') + g('things', 'hard-hat') + g('school', 'backpack-green')
    + g('animals', 'golden-retriever tabby-cat rabbit panda penguin')
    + g('food', 'pineapple grapes watermelon mango orange')
    + g('food', 'eggplant bell-pepper broccoli cauliflower tomato')
    + g('things', 'key-gold padlock toothbrush toothpaste toilet-paper')
    + g('food', 'mug-blue water-bottle burger french-fries cookie')),
  'icons-home-hobby-25': (5, 5,
    g('toys', 'soccer-goal') + g('vehicles', 'helicopter') + g('park', 'potted-cactus') + g('toys', 'grand-piano') + g('vehicles', 'dump-truck')
    + g('people', 'astronaut') + g('things', 'refrigerator') + g('school', 'telescope books globe')
    + g('things', 'rocking-chair umbrella-red fishbowl toaster') + g('toys', 'kite')
    + g('things', 'cuckoo-clock') + g('park', 'wheelbarrow') + g('animals', 'butterfly') + g('things', 'microwave') + g('game', 'hot-air-balloon')
    + g('park', 'watering-can') + g('things', 'rubber-glove') + g('toys', 'drum') + g('school', 'easel') + g('park', 'lawn-mower')),
  'icons-outdoor-camping-30': (5, 5,
    g('vehicles', 'car-red airplane excavator bicycle') + g('park', 'lighthouse')
    + g('vehicles', 'sailboat') + g('park', 'tree') + g('nature', 'flower-pink') + g('game', 'windmill') + g('park', 'doghouse')
    + g('game', 'treasure-chest compass') + g('park', 'campfire tent') + g('game', 'signpost-wood')
    + g('things', 'camera binoculars megaphone') + g('game', 'bell') + g('park', 'grill')
    + g('toys', 'guitar') + g('nature', 'sunflower') + g('toys', 'rocking-horse') + g('things', 'rain-boot') + g('park', 'deck-chair')),
  'icons-wear-snacks-farm-25': (5, 5,
    g('things', 'soccer-boot cap sunglasses') + g('toys', 'harmonica trumpet')
    + g('food', 'burger french-fries popcorn donut') + g('toys', 'basketball')
    + g('toys', 'gamepad paint-palette') + g('game', 'star hourglass target-arrow')
    + g('animals', 'ladybug') + g('game', 'clover mushroom-red') + g('food', 'banana apple')
    + g('animals', 'cow chicken') + g('food', 'carrot corn milk')),
  'icons-daily-branded-25': (5, 5,
    g('branded', 'aqua-gallon') + g('things', 'tumbler') + g('currency', 'rupiah-100000') + g('things', 'paper-plane') + g('branded', 'sandals-swallow')
    + g('branded', 'underwear-hanes') + g('things', 'drying-rack') + g('school', 'laptop') + g('things', 'umbrella-blue cargo-shorts')
    + g('things', 'wallet smartphone') + g('school', 'backpack-red') + g('things', 'raincoat toothbrush')
    + g('branded', 'toothpaste-pepsodent') + g('things', 'toilet hanger laundry-basket lunch-box')
    + g('school', 'books') + g('things', 'envelope') + g('food', 'chips') + g('park', 'watering-can') + g('vehicles', 'bicycle')),
  'icons-daily-branded2-25': (5, 5,
    g('branded', 'aqua-gallon') + g('things', 'sport-bottle') + g('currency', 'rupiah-2000') + g('things', 'paper-plane') + g('branded', 'sandals-swallow')
    + g('things', 'underwear') + g('things', 'drying-rack') + g('school', 'backpack-black') + g('things', 'umbrella-yellow') + g('food', 'mug')
    + g('branded', 'thermos') + g('things', 't-shirt sunglasses car-keys smartphone')
    + g('vehicles', 'bicycle') + g('things', 'office-chair suitcase') + g('branded', 'detergent-daia cooking-oil-bimoli')
    + g('things', 'cooking-pot towel shopping-bag') + g('toys', 'soccer-ball') + g('branded', 'headphones-jbl')),
  'icons-home-office-25': (5, 5,
    g('things', 'bed electric-fan air-conditioner wall-clock house-plant')
    + g('school', 'notebook-pen scissors glue-stick binder-clip tape')
    + g('things', 'tissue-box') + g('branded', 'hand-soap-lifebuoy soap-lux') + g('things', 'hanger broom')
    + g('things', 'dustpan trash-bin laundry-basket') + g('branded', 'lpg-bright-gas') + g('things', 'power-strip')
    + g('school', 'stapler') + g('branded', 'calculator-casio tape-measure-stanley') + g('things', 'paintbrush bandage')),
  'icons-real-household-branded-25': (5, 5,
    g('things', 'soccer-boot') + g('animals', 'hen') + g('food', 'meat') + g('branded', 'ultra-milk rice-cooker-miyako')
    + g('park', 'wheelbarrow') + g('things', 'wallet') + g('branded', 'helmet-kyt') + g('food', 'corn') + g('toys', 'guitar')
    + g('things', 'toilet syringe') + g('school', 'dictionary') + g('branded', 'glass-cleaner-windex') + g('things', 'frying-pan')
    + g('things', 'step-ladder') + g('park', 'garden-hose') + g('things', 'cutting-board') + g('food', 'red-onion') + g('animals', 'tuna')
    + g('vehicles', 'tyre') + g('things', 'pacifier') + g('branded', 'camera-canon') + g('things', 'glasses umbrella-black')),
  'icons-real-toys-nature-25': (5, 5,
    g('school', 'globe') + g('animals', 'butterfly iguana cow') + g('nature', 'sunflower')
    + g('food', 'popcorn donut') + g('toys', 'basketball') + g('game', 'trophy-cup') + g('vehicles', 'sailboat')
    + g('toys', 'dice') + g('nature', 'snowman') + g('food', 'strawberry') + g('animals', 'clownfish') + g('park', 'potted-cactus')
    + g('toys', 'kite xylophone rubber-duck jigsaw') + g('things', 'magnifier')
    + g('park', 'wheelbarrow') + g('things', 'chef-hat') + g('game', 'hourglass') + g('things', 'alarm-clock ring')),
  'icons-indonesia-branded-25': (5, 5,
    g('indonesia', 'besek') + g('food', 'banana-bunch') + g('indonesia', 'caping') + g('branded', 'lpg-elpiji') + g('indonesia', 'sapu-lidi')
    + g('food', 'young-coconut nasi-goreng es-teh-plastik') + g('nature', 'seedling-polybag') + g('indonesia', 'cobek')
    + g('food', 'lemper tempe') + g('indonesia', 'kursi-rotan') + g('vehicles', 'scooter') + g('indonesia', 'gerobak-bakso')
    + g('indonesia', 'bendera-merah-putih') + g('food', 'durian') + g('indonesia', 'rumah-joglo') + g('branded', 'sandals-swallow-green le-minerale')
    + g('branded', 'indomie') + g('indonesia', 'keris peci tampah') + g('things', 'trash-bin-green')),
  'icons-real-home-produce-25': (5, 5,
    g('toys', 'soccer-ball') + g('vehicles', 'mountain-bike') + g('school', 'laptop') + g('things', 'smartphone') + g('branded', 'printer-epson')
    + g('food', 'mango orange corn eggplant bok-choy')
    + g('animals', 'cockroach frog pigeon goldfish shrimp')
    + g('things', 'cardboard-box') + g('school', 'backpack-blue') + g('things', 'umbrella-pink') + g('school', 'scissors') + g('branded', 'tape-daimaru')
    + g('things', 'frying-pan cooking-pot') + g('branded', 'rice-cooker-miyako-white') + g('things', 'broom-plastic') + g('park', 'garden-hose')),
  'icons-real-office-market-25': (5, 5,
    g('currency', 'rupiah-100000') + g('branded', 'calculator-casio') + g('school', 'stapler tape-dispenser') + g('things', 'power-strip')
    + g('branded', 'key-yale') + g('indonesia', 'bola-takraw') + g('things', 'drinking-glass face-mask') + g('branded', 'helmet-gm')
    + g('things', 'sunglasses') + g('branded', 'mie-sedaap') + g('food', 'peanuts') + g('things', 'table') + g('branded', 'yogurt-indomilk')
    + g('branded', 'flashdisk-sandisk') + g('food', 'young-coconut') + g('things', 'tv-antenna') + g('animals', 'hen') + g('things', 'rope')
    + g('things', 'basin') + g('indonesia', 'gayung') + g('things', 'house-plant') + g('branded', 'lpg-pertamina ac-daikin')),
  'icons-real-indonesia2-25': (5, 5,
    g('indonesia', 'sapu-lidi') + g('things', 'bucket-pink') + g('park', 'watering-can') + g('indonesia', 'peci tampah')
    + g('branded', 'train-kai helmet-gojek') + g('food', 'rice-sack') + g('indonesia', 'gerobak-cendol') + g('food', 'rambutan')
    + g('food', 'mangosteen carrots cauliflower') + g('indonesia', 'batik-shirt kipas-batik')
    + g('things', 'trash-bin-green rice-paddle') + g('branded', 'bus-damri') + g('food', 'ketupat') + g('things', 'megaphone')
    + g('indonesia', 'cobek bakiak') + g('animals', 'cat') + g('food', 'grapes') + g('branded', 'switch-panasonic')),
  'icons-real-daily3-25': (5, 5,
    g('branded', 'aqua-gallon le-minerale') + g('currency', 'rupiah-2000') + g('things', 'paper-plane') + g('branded', 'underwear-rider')
    + g('things', 'drying-rack clothespin safety-pin binder-clip toothbrush')
    + g('things', 'spoon thermos-flask') + g('branded', 'helmet-ink sandals-swallow-red') + g('toys', 'kite-layangan')
    + g('food', 'lime water-spinach ginger chili-red garlic')
    + g('food', 'eggs') + g('branded', 'coffee-goodday') + g('things', 'phone-charger tv-remote dustpan-broom')),
  'icons-real-indonesia3-25': (5, 5,
    g('animals', 'hen') + g('food', 'spinach papaya cookie-jar') + g('indonesia', 'wayang')
    + g('things', 'soccer-boot') + g('indonesia', 'kendang') + g('toys', 'kite-white') + g('indonesia', 'tampah') + g('things', 'cotton-buds')
    + g('park', 'wheelbarrow') + g('school', 'cutter') + g('toys', 'teddy-bear') + g('branded', 'car-battery-gs') + g('food', 'broccoli')
    + g('things', 'traffic-cone tissue-box-wood') + g('school', 'stapler-pink') + g('food', 'dragon-fruit') + g('things', 'dustpan')
    + g('things', 'hanger-wood') + g('branded', 'tape-measure-stanley') + g('currency', 'coin-500') + g('things', 'hand-mirror') + g('branded', 'container-locklock')),
  'icons-real-farm-home-25': (5, 5,
    g('food', 'banana-bunch pineapple watermelon lemongrass') + g('indonesia', 'cobek')
    + g('things', 'light-bulb') + g('indonesia', 'tudung-saji') + g('animals', 'cow duck') + g('food', 'long-beans')
    + g('food', 'durian') + g('park', 'wheelbarrow') + g('things', 'step-ladder window trash-can-steel')
    + g('branded', 'wall-clock-seiko') + g('food', 'young-coconut shallots parsley') + g('branded', 'water-tank-penguin')
    + g('park', 'bench') + g('things', 'tablet') + g('branded', 'fan-miyako') + g('things', 'rain-boots') + g('indonesia', 'sapu-lidi')),
  'icons-real-kitchen-outdoor-25': (5, 5,
    g('branded', 'stove-rinnai') + g('indonesia', 'kukusan-bambu') + g('food', 'lychee') + g('things', 'mosquito-racket') + g('branded', 'camera-canon-eos')
    + g('animals', 'goat') + g('food', 'water-spinach') + g('vehicles', 'scooter-white') + g('branded', 'soap-lux-pink') + g('nature', 'rock')
    + g('things', 'bandage compass') + g('food', 'jackfruit') + g('things', 'binoculars') + g('food', 'chili')
    + g('branded', 'hand-sanitizer-aseptic') + g('toys', 'ukulele') + g('food', 'sugar-jar') + g('things', 'kitchen-towel feather-duster')
    + g('food', 'young-coconut') + g('things', 'swim-goggles flashlight') + g('branded', 'powerbank-romoss') + g('food', 'tamarind')),
}

# Sprites whose enclosed flat-white pockets are real see-through GAPS -- decided by
# eye on a checkerboard review (2026-09-27) of all 67 sprites the rule would change.
# Everything else keeps its white paint (penguin belly, garlic, "?" marks, sails ...).
HOLES = set('''trophy-gold ladder bridge-rope gear lifebuoy key-ornate key-gold bicycle padlock bench
  fence shopping-cart wheelbarrow watering-can excavator mug hot-air-balloon windmill well anchor
  crab lobster octopus squid flamingo snowflake rainbow
  trophy-cup lifebuoy-rope mug-blue rocking-chair easel rocking-horse deck-chair trumpet drying-rack
  car-keys office-chair headphones-jbl scissors binder-clip tape step-ladder garden-hose pacifier
  glasses ring kursi-rotan gerobak-bakso scooter helicopter iguana hen fire-extinguisher xylophone
  seedling-polybag tumbler sport-bottle hanger-wood hand-mirror'''.split())
HOLE_MIN_PX = 150   # smaller pockets inside a HOLES sprite are highlights/eyes, kept
HOLE_MIN_PX_FOR = {'rainbow': 2000}   # only the gap under the arc; the clouds' highlights stay
# Realistic-render sheets live under real/ so a game keeps ONE look (a photo-real dog
# never replaces the cartoon dog as a "duplicate").
REAL = {'icons-daily-branded-25', 'icons-daily-branded2-25', 'icons-home-office-25',
        'icons-real-household-branded-25', 'icons-real-toys-nature-25', 'icons-indonesia-branded-25',
        'icons-real-home-produce-25', 'icons-real-office-market-25', 'icons-real-indonesia2-25', 'icons-real-daily3-25',
        'icons-real-indonesia3-25', 'icons-real-farm-home-25', 'icons-real-kitchen-outdoor-25'}
MARGIN = 0.22      # each cell is read with this margin so overflowing sprites stay whole
BG_TOL = 22          # a pixel within this distance of white may be background
EDGE = 3             # soft-edge band width (px)
PAD = 6
MIN_PSNR = 38.0      # decoded WebP vs source, opaque area


def whiteness_dist(rgb):
    return np.sqrt(((255.0 - rgb) ** 2).sum(axis=2)) / np.sqrt(3.0)


def page_mask(rgb):
    """Pixels that are PAGE: flat white (d < 4) reachable from the border without
    crossing a drawn edge. A shaded white body (milk, garlic, chicken) is never page;
    the 4..BG_TOL band next to the page becomes the soft anti-aliased rim later."""
    d = whiteness_dist(rgb)
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    grad = np.hypot(ndimage.sobel(lum, 0), ndimage.sobel(lum, 1)) / 8.0
    cand = (d < 4.0) & ~(grad > 14)      # EDGE BARRIER: the flood may not cross a drawn line
    lbl, _ = ndimage.label(cand)
    edge = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]]))) - {0}
    return np.isin(lbl, list(edge)), cand, d


def segment_sheet(im, cols, rows):
    """Label map: 0 = page, k = sprite of cell k-1. WHOLE-SHEET marker watershed.
    Sheets are not a clean grid -- rows overlap with no gutter, a banknote is wider than
    its cell, the cupcake's cherry TOUCHES the bell pepper, an alarm clock's bell pokes
    into the jigsaw's cell -- so neither the cell nor connectivity can decide. Each cell
    seeds its LARGEST 4px-eroded core; every other pixel goes to the seed that floods it
    first over -distance (the sprite it is most solidly attached to). Pieces attached
    to nothing (a separate garlic clove, the moon's stars) go to the nearest sprite."""
    from skimage.segmentation import watershed
    rgb = im.astype(np.float32)
    page, _, _ = page_mask(rgb)
    fg = ~page
    H, W = fg.shape
    cw, ch = W / cols, H / rows
    core = ndimage.binary_erosion(fg, iterations=4)
    markers = np.zeros(fg.shape, np.int32)
    for r in range(rows):
        for c in range(cols):
            # seed = largest core piece inside the cell's CENTRAL 70%: two sprites that
            # touch still get one seed each (a merged core used to leave a cell seedless)
            y0, y1 = int((r + 0.15) * ch), int((r + 0.85) * ch)
            x0, x1 = int((c + 0.15) * cw), int((c + 0.85) * cw)
            sub = core[y0:y1, x0:x1] & (markers[y0:y1, x0:x1] == 0)
            l, n = ndimage.label(sub)
            if n == 0:
                continue
            k = int(np.argmax(ndimage.sum(np.ones_like(l), l, range(1, n + 1)))) + 1
            markers[y0:y1, x0:x1][l == k] = r * cols + c + 1
    ws = watershed(-ndimage.distance_transform_edt(fg), markers, mask=fg)
    loose, ln = ndimage.label(fg & (ws == 0))
    if ln:
        _, (iy, ix) = ndimage.distance_transform_edt(ws == 0, return_indices=True)
        nearest = ws[iy, ix]
        for k in range(1, ln + 1):
            part = loose == k
            if part.sum() >= 40:
                ws[part] = np.bincount(nearest[part]).argmax()
    return ws


def cut(cell, own, holes_ok=False, hole_min=150, other=None):
    """cell: RGB window, own: this sprite's pixels in it (from segment_sheet).
    Returns RGBA uint8 array (soft alpha), trimmed, or None."""
    rgb = cell.astype(np.float32)
    _, cand, d = page_mask(rgb)
    # Enclosed flat-white pockets. No pixel statistic separates a see-through GAP (gear
    # hole, ladder rungs, bicycle spokes) from white PAINT (penguin belly, garlic, the
    # "?" on a block, a soccer ball's panels) -- both are page-flat white inside a drawn
    # line. So pockets stay OPAQUE unless the sprite is named in HOLES (reviewed by eye).
    fg = ndimage.binary_fill_holes(own)
    if holes_ok:
        pl, pn = ndimage.label(cand & fg)
        for k in range(1, pn + 1):
            pocket = pl == k
            if pocket.sum() > hole_min and np.median(d[pocket]) < 3.0:
                fg &= ~pocket
    if not fg.any():
        return None
    # only pinholes are filled (barrier pixels between two drawn lines); real pockets
    # were decided above by their colour
    holes = ndimage.binary_fill_holes(fg) & ~fg
    hl, hn = ndimage.label(holes)
    if hn:
        hs = ndimage.sum(np.ones_like(hl), hl, range(1, hn + 1))
        fg |= np.isin(hl, [i + 1 for i, v in enumerate(hs) if v <= 12])
    # soft alpha: inside = 1; across an EDGE-px band outside the hard mask, alpha
    # follows how far the pixel is from white (anti-aliased rim of the drawing)
    dist_out = ndimage.distance_transform_edt(~fg)
    rim = (~fg) & (dist_out <= EDGE)
    if other is not None:
        rim &= ~other                  # never feather into a touching neighbour
    a = np.zeros(d.shape, np.float32)
    a[fg] = 1.0
    a[rim] = np.clip(d[rim] / BG_TOL, 0.0, 1.0)
    # the hard mask's own outermost pixel ring is also anti-aliased in the source
    inner_ring = fg & (ndimage.distance_transform_edt(fg) <= 1.0)
    a[inner_ring] = np.maximum(np.clip(d[inner_ring] / BG_TOL, 0.35, 1.0), 0.35)
    # un-premultiply against white: C = (P - (1-a)*255) / a
    out = np.zeros(cell.shape[:2] + (4,), np.float32)
    safe = np.maximum(a, 1e-3)[..., None]
    col = (rgb - (1.0 - a)[..., None] * 255.0) / safe
    out[..., :3] = np.clip(np.where(a[..., None] > 0, col, 0), 0, 255)
    out[..., 3] = a * 255.0
    out = out.round().astype(np.uint8)
    ys, xs = np.where(out[..., 3] > 8)
    if len(ys) == 0:
        return None
    y0, y1 = max(0, ys.min() - PAD), min(out.shape[0], ys.max() + PAD + 1)
    x0, x1 = max(0, xs.min() - PAD), min(out.shape[1], xs.max() + PAD + 1)
    return out[y0:y1, x0:x1]


def psnr_opaque(src_rgba, webp_bytes):
    # LUMA PSNR on the opaque area: lossy WebP's 4:2:0 chroma shift scores ~29 dB in
    # RGB on saturated art yet is invisible side by side at 2x (checked on blue-tang);
    # detail the eye resolves lives in luma, where "pecah" (blocking, ringing) shows.
    dec = np.asarray(Image.open(io.BytesIO(webp_bytes)).convert('RGBA')).astype(np.float32)
    s = src_rgba.astype(np.float32)
    m = s[..., 3] > 200
    if m.sum() == 0:
        return 99.0, 0
    Y = lambda a: 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    mse = ((Y(dec)[m] - Y(s)[m]) ** 2).mean()
    amax = np.abs(dec[..., 3] - s[..., 3]).max()
    return (99.0 if mse == 0 else float(10 * np.log10(255.0 ** 2 / mse))), float(amax)


OUTLINE_PX = 5      # white sticker outline, px at native size (~240 px sprites)
SS = 4              # supersampling for the outline edge


def outline(spr):
    """Smooth white sticker border (owner: "borderline putih agar tampak smooth nggak
    patah2 ujung2nya"). Built at SSx from a distance field of the silhouette, so tips
    and corners come out ROUND and the edge is anti-aliased, then box-downsampled."""
    h, w = spr.shape[:2]
    pad = OUTLINE_PX + 3
    a = np.zeros((h + 2 * pad, w + 2 * pad), np.float32)
    a[pad:pad + h, pad:pad + w] = spr[..., 3] / 255.0
    big = np.asarray(Image.fromarray((a * 255).astype(np.uint8), 'L')
                     .resize((a.shape[1] * SS, a.shape[0] * SS), Image.BICUBIC)).astype(np.float32) / 255.0
    # smooth the silhouette first (sigma 2.5 native px; 1.2 still traced the grey specks
    # the source sheets carry in their own anti-aliased edge) so the ring follows the SHAPE,
    # not every 1px bump of the anti-aliased edge -- otherwise the outline looks wavy
    solid = ndimage.gaussian_filter(big, sigma=2.5 * SS) > 0.35
    dist = ndimage.distance_transform_edt(~solid)
    R = OUTLINE_PX * SS
    ring = np.clip((R + SS * 0.5 - dist) / SS, 0.0, 1.0)            # 1 inside radius, AA over 1 px
    ring = np.asarray(Image.fromarray((ring * 255).astype(np.uint8), 'L')
                      .resize((a.shape[1], a.shape[0]), Image.BOX)).astype(np.float32) / 255.0
    ring = np.maximum(ring, a)
    out = np.zeros(a.shape + (4,), np.float32)
    out[..., :3] = 255.0
    out[..., 3] = ring
    src = np.zeros(a.shape + (4,), np.float32)
    src[pad:pad + h, pad:pad + w] = spr.astype(np.float32) / 255.0 * np.array([255, 255, 255, 1], np.float32)
    sa = src[..., 3:4]
    rgb = src[..., :3] * sa + out[..., :3] * (1 - sa)                # sprite over white ring
    res = np.concatenate([rgb, np.maximum(sa, out[..., 3:4]) * 255.0], axis=2)
    return np.clip(res.round(), 0, 255).astype(np.uint8)


def encode(spr):
    buf = io.BytesIO()
    Image.fromarray(spr, 'RGBA').save(buf, 'WEBP', quality=95, use_sharp_yuv=True, alpha_quality=100, method=6, exact=True)
    return buf.getvalue()


def write_js(index):
    slim = {k: v['file'] for k, v in index['assets'].items()}
    open(JS, 'w').write(
        '/* GENERATED by tools/ingest-asset-sheets.py — do not edit. window.AssetIndex: named\n'
        ' * shared sprites. AssetIndex.path("animals/dog") -> base-path-aware URL or null;\n'
        ' * AssetIndex.find("dog") -> keys whose name or tags contain it. */\n'
        '(function () {\n  var W = typeof window !== "undefined" ? window : globalThis\n'
        '  if (W.AssetIndex) return\n  var MAP = ' + json.dumps(slim, separators=(',', ':')) + '\n'
        '  function base () { try { return location.pathname.indexOf("/Dunia-Emosi/") === 0 ? "/Dunia-Emosi/" : "/" } catch (e) { return "/" } }\n'
        '  W.AssetIndex = {\n    keys: function () { return Object.keys(MAP) },\n'
        '    /* default for games: no branded/ or currency/ sprites (trademarks; rupiah) */\n'
        '    safe: function () { return Object.keys(MAP).filter(function (k) { return !/^(real\\/)?(branded|currency)\\//.test(k) }) },\n'
        '    path: function (k) { return MAP[k] ? base() + MAP[k] : null },\n'
        '    find: function (q) { q = String(q).toLowerCase(); return Object.keys(MAP).filter(function (k) { return k.toLowerCase().indexOf(q) >= 0 }) }\n'
        '  }\n})()\n')


def main():
    only = set(sys.argv[1:])
    index = json.load(open(INDEX)) if os.path.exists(INDEX) else {'_note': '', 'assets': {}}
    assets = index['assets']
    dups, bad, made = [], [], 0
    for sheet, (cols, rows, names) in SHEETS.items():
        if only and sheet not in only:
            continue
        assert len(names) == cols * rows, f'{sheet}: {len(names)} names for {cols * rows} cells'
        im = np.asarray(Image.open(os.path.join(SRC, sheet + '.png')).convert('RGB'))
        H, W = im.shape[:2]
        cw, ch = W / cols, H / rows
        seg = segment_sheet(im, cols, rows)
        for i, (cat, name) in enumerate(names):
            key = ('real/' if sheet in REAL else '') + f'{cat}/{name}'
            if key in assets and assets[key].get('source') != f'{sheet}#{i + 1}':
                dups.append(f'{key} (again on {sheet}#{i + 1}; kept {assets[key]["source"]})')
                continue
            r, c = divmod(i, cols)
            x0, y0 = int(round(c * cw)), int(round(r * ch))
            x1, y1 = int(round((c + 1) * cw)), int(round((r + 1) * ch))
            lab = seg == i + 1
            if not lab.any():
                bad.append(f'{key}: nothing segmented'); continue
            ys, xs = np.where(lab)
            Y0, Y1 = max(0, ys.min() - 8), min(H, ys.max() + 9)
            X0, X1 = max(0, xs.min() - 8), min(W, xs.max() + 9)
            win = seg[Y0:Y1, X0:X1]
            spr = cut(im[Y0:Y1, X0:X1], lab[Y0:Y1, X0:X1], holes_ok=name in HOLES,
                      hole_min=HOLE_MIN_PX_FOR.get(name, HOLE_MIN_PX), other=(win != 0) & (win != i + 1))
            if spr is None:
                bad.append(f'{key}: empty cell'); continue
            spr = outline(spr)
            data = encode(spr)
            p, amax = psnr_opaque(spr, data)
            if p < MIN_PSNR or amax > 2:
                bad.append(f'{key}: PSNR {p:.1f} dB, alpha err {amax}'); continue
            os.makedirs(os.path.dirname(os.path.join(ROOT, f'assets/db/lib/{key}.webp')), exist_ok=True)
            rel = f'assets/db/lib/{key}.webp'
            open(os.path.join(ROOT, rel), 'wb').write(data)
            assets[key] = {'file': rel, 'cat': cat, 'tags': name.split('-') + (['branded'] if cat in ('branded', 'currency') else []) + (['realistic'] if sheet in REAL else ['cartoon']),
                           'source': f'{sheet}#{i + 1}',
                           'w': int(spr.shape[1]), 'h': int(spr.shape[0]), 'psnr': round(float(p), 1)}
            made += 1
    index['_note'] = ('Named shared sprites (owner sheets, tools/ingest-asset-sheets.py). Key = '
                      '"<category>/<name>". Reuse before cropping anything new.')
    index['assets'] = dict(sorted(assets.items()))
    json.dump(index, open(INDEX, 'w'), indent=1)
    write_js(index)
    print(f'made {made}, total {len(index["assets"])} named sprites')
    for d_ in dups:
        print('  dup  ', d_)
    for b_ in bad:
        print('  FAIL ', b_)
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
