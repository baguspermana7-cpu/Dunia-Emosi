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
_LEGEND_SHIPS = {'ship-' + n for n in 'titanic britannic arizona cuttysark victory vasa mayflower endurance kontiki calypso queenmary nautilus'.split()}
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
  # Garasi Tempur UI icons (owner sheet, 2026-09-27): labelled 5x5 on a grid. #25 (ramp) carries
  # a "MONSTER JAM" trademark on its side, so it is skipped. The card frame (#10) is NOT used:
  # frames are drawn in code (games/gt-card.js) so text is live, translatable and read aloud.
  'icons-ui-25': (5, 5,
    g('gt', 'avatar-player avatar-opponent trophy coin gem')
    + g('gt', 'fuel-can deck discard card-back SKIP-frame')
    + g('gt', 'type-power type-mud type-speed type-armor type-stunt')
    + g('gt', 'type-tech hp attack defense repair')
    + g('gt', 'part-tire part-bumper part-engine part-nitro SKIP-ramp'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1}),
  'icons-ui2-25': (5, 5,
    g('gt', 'start-flag end-turn play-confirm auto-battle undo')
    + g('gt', 'reward-chest coin-stack gem-stack xp level-up')
    + g('gt', 'q-math q-english q-knowledge q-science q-islamic')
    + g('gt', 'fx-mud fx-fire fx-dust fx-skid fx-impact')
    + g('gt', 'finish-gate traffic-cone car-crush-stack oil-barrel tire-barrier'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1}),
  'icons-parts-25': (5, 5,
    g('gt', 'driver-helmet garage upgrade-tire shock-absorber flame-decal')
    + g('gt', 'bull-bumper nitrous-tank turbo air-filter roll-cage')
    + g('gt', 'spot-lights spoiler armor-plate spike-bumper winch')
    + g('gt', 'tool-kit eco-fuel ice-nitro repair-kit shield-boost')
    + g('gt', 'extra-turn scout map start-light checkered-flag'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1}),
  'icons-world-25': (5, 5,
    g('gt', 'rank1-badge timer race-flag announcement mission-list')
    + g('gt', 'star-collectible magnet-powerup force-field portal mystery-box')
    + g('gt', 'road-barrier direction-sign safety-barrel cactus rock')
    + g('gt', 'wood-ramp hay-bale windmill barn pine-tree')
    + g('gt', 'bush water-puddle mud-puddle log sharp-turn-sign'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1}),
  'icons-sky-25': (5, 5,
    g('gt', 'moon sun rain-cloud lightning rainbow')
    + g('gt', 'ufo alien satellite rocket planet')
    + g('gt', 'asteroid crystal energy-orb teleport-gate key')
    + g('gt', 'lock treasure-chest crown map-scroll compass')
    + g('gt', 'binoculars lantern campfire tent signpost'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1}),
  # Monster-truck art (owner, 2026-09-27). Stored under NEUTRAL ids: the sheet's names/logos
  # are Feld Monster Jam trademarks (and a Warner Bros character) — the logo block under each
  # truck is cut away, the game gives every truck an original name (games/data/gt-trucks.js).
  'trucks-a-25': (5, 5, [('gt-truck', 'truck-%03d' % n) for n in range(1, 26)],
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1, 'tyres': True}),
  'trucks-b-25': (5, 5, [('gt-truck', 'truck-%03d' % n) for n in range(26, 51)],
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1, 'tyres': True}),
  'trucks-c-25': (5, 5, [('gt-truck', 'SKIP-logo')] + [('gt-truck', 'truck-%03d' % n) for n in range(51, 75)],
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1, 'tyres': True}),
  'trucks-d-25': (5, 5, [('gt-truck', 'truck-%03d' % n) for n in range(75, 100)],
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1, 'tyres': True}),
  'trucks-e-25': (5, 5, [('gt-truck', 'truck-%03d' % n) for n in range(100, 125)],
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1, 'tyres': True}),
  'trucks-f-25': (5, 5, [('gt-truck', 'truck-%03d' % n) for n in range(125, 150)],
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1, 'tyres': True}),
  'trucks-g-25': (5, 5, [('gt-truck', 'truck-%03d' % n) for n in range(150, 175)],
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True, 'label': 1, 'tyres': True}),
  # Garasi Tempur world elements + Monster Rush monsters (owner, 2026-09-27)
  'elements-a-25': (5, 5, g('gt-el', 'bridge-wood finish-banner star-gold signpost-arrow lighthouse ice-crystal fuel-barrel-red crate tire-stack palm-tree crown-coin traffic-cone barricade-lamp cactus-flower windmill rope-bridge ramp-chevron magnet energy-bottle boulders balloon-red snowman oak-tree gold-cart portal-stone'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  'elements-b-25': (5, 5, g('gt-el', 'archery-target treasure-open hanging-bridge purple-crystal lantern-post cannon mushroom signpost-multi ruin-arch dino-skull ice-arch pirate-raft hover-pad tnt-crate street-lantern windsock spring-pad gear water-wheel cactus-desert portal-green hay-roll snow-pine spiked-log crystal-cart'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  'elements-c-25': (5, 5, g('gt-el', 'trophy-1 water-well portal-blue mine-entrance hang-glider signpost-color snow-pine-2 biplane balloon-blue watch-tower shark-jump viking-ship toxic-barrel sandcastle radar-dish traffic-light pink-crystal rock-arch windsock-2 anchor water-tower bonfire moai torii-gate desert-tree'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  'monsters-a-16': (4, 4, g('gt-monster', 'robo-shark magma-golem ice-yeti pumpkin-wraith cactus-mech pirate-octopus stone-golem drill-wasp mimic-chest tornado island-turtle ufo-alien crystal-spider boiler-bot tree-ent bone-dragon'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck')}),
  'monsters-b-16': (4, 4, g('gt-monster', 'robo-shark-2 gold-rock-golem plant-chomper ghost-ship robo-crab crystal-yeti volcano-golem steam-octopus ufo-alien-2 sand-worm storm-cloud pumpkin-mech bone-dragon-2 waterfall-turtle mimic-chest-2 cactus-cowboy'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  'monsters-c-16': (4, 4, g('gt-monster', 'angler-sub crystal-crab lava-tortoise lantern-wraith flower-chomper robo-gorilla tornado-face snow-golem airship-whale fire-bone-dragon crown-mimic moss-golem drill-scorpion brain-ufo sun-totem pirate-octopus-cannon'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  'monsters-d-16': (4, 4, g('gt-monster', 'sand-mummy rhino-tank deep-angler forest-ent cupcake-monster clock-owl amethyst-golem oni-samurai mushroom-cyclops chain-reaper totem-golem brain-ufo-2 penguin-king lava-worm cupid-cyclops toxic-spider'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  'monsters-e-16': (4, 4, g('gt-monster', 'mosquito-bot magma-rock-golem ghost-pirate-ship ice-walrus orange-chomper void-mage waterfall-golem angler-bot sand-worm-2 bat-eye crystal-mushroom-golem storm-wolf ice-pirate-skeleton smoke-lava-tortoise brain-spider-bot storm-cloud-2'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  'monsters-f-16': (4, 4, g('gt-monster', 'samurai-oni portal-rock-golem jester-box spike-snail ghost-queen pumpkin-chomper crystal-rhino bomb-pumpkin tentacle-angler pyramid-golem bone-unicorn snow-rabbit tar-blob autumn-ent steam-fish-sub rainbow-crystal-spider'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/monster-truck'), 'grid': True}),
  # Timmy & Kapal Legendaris (owner, 2026-09-28): inner grid lines only, art painted OVER them.
  # grand-staircase is a full rectangular picture: trimmed + rounded corners, background kept.
  'props-a-30': (6, 5,
    g('tk-prop', 'iceberg propeller porthole necklace-box boarding-pass engine-telegraph')
    + g('tk-prop', 'deck-chair lifeboat ship-bell captain-hat spyglass suitcase')
    + g('tk-prop', 'anchor rope-coil crate-white-star lifebuoy searchlight seagull')
    + g('tk-prop', 'grand-staircase flag-white-star pocket-watch coal-lump teacup water-barrel')
    + g('tk-prop', 'lantern sextant binoculars blanket crate-fragile ice-cube'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 'rect': {'grand-staircase'}}),
  'props-b-30': (6, 5,
    g('tk-prop', 'engine-telegraph-2 deck-chair-2 porthole-2 ship-bell-2 suitcase-2 ship-wheel')
    + g('tk-prop', 'lifeboat-6 iceberg-2 compass spyglass-2 blanket-2 top-hat')
    + g('tk-prop', 'lantern-2 crate-supplies lifebuoy-2 sextant-2 coal-pile diving-helmet')
    + g('tk-prop', 'champagne-bottle dinner-plate flag-white-star-2 first-class-key boarding-pass-2 violin')
    + g('tk-prop', 'pocket-watch-2 teacup-2 books-passenger-list binoculars-2 first-class-sign trunk'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True, 'hole_rim': 1.5}),
  'props-c-25': (5, 5,
    g('tk-prop', 'titanic-ship iceberg-3 ice-floe rowboat lifebuoy-3')
    + g('tk-prop', 'ship-bell-3 ship-wheel-2 binoculars-3 compass-2 treasure-map')
    + g('tk-prop', 'spyglass-3 crate-titanic barrel rope-coil-2 anchor-2')
    + g('tk-prop', 'funnel porthole-3 lantern-3 pocket-watch-3 captain-key')
    + g('tk-prop', 'engine-telegraph-3 ice-crystal seagull-2 deck-chair-3 suitcase-3'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True, 'hole_rim': 1.5}),
  'ships-a-25': (5, 5,
    g('tk-ship', 'pirate-ship galleon-blue tugboat-red viking-longship steampunk-submarine')
    + g('tk-ship', 'yacht chinese-junk fishing-trawler shark-battleship pirate-ship-red')
    + g('tk-ship', 'turtle-ship icebreaker caravel-cross dragon-boat ghost-ship')
    + g('tk-ship', 'tugboat-black cargo-sailboat aircraft-carrier submarine-black sailboat')
    + g('tk-ship', 'airship lightship paddle-steamer container-ship orca-submarine'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True, 'hole_rim': 1.5}),
  # Timmy legend + labelled ships (2026-09-28). Ship cells carry a name banner at the bottom:
  # the sprite is kept as drawn AND, via 'clean_banner', a '<name>-clean' twin is cut above the
  # banner with a soft alpha fade on the water (banner_clean_sprites). time-harbor keeps its opaque picture (plain cut).
  'legend-25': (5, 5,
    g('tk-legend', 'timmy-spyglass bedroom time-portal ship-titanic ship-britannic')
    + g('tk-legend', 'ship-arizona ship-cuttysark ship-victory ship-vasa ship-mayflower')
    + g('tk-legend', 'ship-endurance ship-kontiki ship-calypso ship-queenmary ship-nautilus')
    + g('tk-legend', 'time-harbor ship-wheel-3 sextant-3 world-map-scroll hourglass')
    + g('tk-legend', 'seagull-3 signpost-ships iceberg-4 bell-good-journey journal-book'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 
     'outline_open': 3, 'outline_open_only': _LEGEND_SHIPS,
     'clean_banner': _LEGEND_SHIPS}),
  'props-d-30': (6, 5,
    g('tk-prop', 'spyglass-4 life-vest sextant-4 ships-bell nautical-chart iceberg-5')
    + g('tk-prop', 'deck-chair-4 engine-telegraph-4 anchor-3 crate-rms rope-coil-3 diving-helmet-2')
    + g('tk-prop', 'lifebuoy-4 binoculars-4 water-barrel-2 rope-knot open-compass passenger-book')
    + g('tk-prop', 'coal-crate lantern-4 seagull-4 picnic-basket porthole-4 propeller-2')
    + g('tk-prop', 'whistle flag-white-star-3 armillary-globe journey-scroll message-bottle treasure-chest-open'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True, 'hole_rim': 1.5}),
  'props-e-25': (5, 5,
    g('tk-prop', 'funnel-2 deck-chair-5 engine-telegraph-5 porthole-open ship-horn')
    + g('tk-prop', 'cloche sealed-letter binoculars-5 napkin deck-bench')
    + g('tk-prop', 'lantern-red suitcase-4 lifeboat-11 crystal-goblet propeller-3')
    + g('tk-prop', 'blueprint-scroll wall-clock suitcase-first-class champagne-bucket spyglass-5')
    + g('tk-prop', 'iceberg-6 deck-railing captain-hat-white sextant-5 route-scroll'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True, 'hole_rim': 1.5}),
  'props-f-25': (5, 5,
    g('tk-prop', 'engine-telegraph-6 porthole-underwater ship-bell-1912 crate-engine-room grand-staircase-2')
    + g('tk-prop', 'compass-3 iceberg-7 lifebuoy-5 binoculars-6 suitcase-5')
    + g('tk-prop', 'deck-chair-6 anchor-4 blanket-navy captain-hat-white-2 violin-2')
    + g('tk-prop', 'champagne-bottle-2 tea-set ticket-first-class lantern-5 sextant-6')
    + g('tk-prop', 'crate-spare-parts blueprint coal-scoop newspaper pocket-watch-4'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 'rect': {'grand-staircase-2'}}),
  # the owner's label reads "MAERSK EXPLORER": keyed neutrally as container-ship
  'ships-b-25': (5, 5,
    g('tk-ship2', 'rms-titanic hmhs-britannic uss-arizona cutty-sark hms-victory')
    + g('tk-ship2', 'vasa mayflower endurance kon-tiki calypso')
    + g('tk-ship2', 'queen-mary nautilus viking-longship red-dragon-junk blackbeard')
    + g('tk-ship2', 'santa-maria atakebune uss-enterprise container-ship arctic-explorer')
    + g('tk-ship2', 'venetian-gondola mississippi-steamboat coast-guard-cutter ocean-dream-yacht fishing-boat'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 'clean_banner': True, 'outline_open': 3}),
  # Timmy characters + UI (2026-09-28). Busts sit ON the cell's bottom line (flat bottom kept).
  # btn-shop / anchor-coin / diamond are ingested only: owner policy is no shop, coins or gems.
  'chars-ui-30': (6, 5,
    g('tk-char', 'officer-boy explorer-kid lady-hat captain-old maid chef')
    + g('tk-char', 'diver') + g('tk-prop', 'iceberg-8 rowboat-2 ship-wheel-4 engine-telegraph-7 binoculars-7')
    + g('tk-prop', 'mission-scroll treasure-chest-2 porthole-5 lifebuoy-6 compass-open-2 boarding-pass-3')
    + g('tk-ui', 'btn-play btn-settings btn-map btn-shop btn-achievements btn-exit')
    + g('tk-ui', 'star heart anchor-coin diamond hourglass level-complete'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True, 'hole_rim': 1.5,
     'grid_ys': (220, 427, 642, 791)}),
  'ships-c-25': (5, 5,
    g('tk-ship3', 'trireme viking-ship chinese-junk-2 atakebune-2 pirate-galleon')
    + g('tk-ship3', 'spanish-galleon dutch-east-indiaman royal-frigate river-steamboat uss-monitor')
    + g('tk-ship3', 'u-boat uss-nimitz uss-zumwalt rv-discovery icebreaker-50-let-pobedy')
    + g('tk-ship3', 'flying-cloud lng-carrier msc-container-ship cruise-ship-symphony lightship-nantucket')
    + g('tk-ship3', 'fv-atlantic-star harbor-tug corvette usns-mercy planetsolar'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 'clean_banner': True, 'outline_open': 3}),
  'ships-d-30': (6, 5,
    g('tk-ship3', 'athenian-trireme roman-quinquereme zheng-he-treasure-ship atago hms-dreadnought-f111 yamal')
    + g('tk-ship3', 'hms-beagle hms-endeavour sao-gabriel arabian-dhow ss-great-eastern rv-atlantis')
    + g('tk-ship3', 'bismarck ijn-akagi uss-arleigh-burke chikyu rainbow-warrior polarstern')
    + g('tk-ship3', 'stad-amsterdam eclipse-yacht azzam-yacht roald-amundsen energy-observer mv-malama')
    + g('tk-ship3', 'fujian-junk krusenstern hos-achiever sea-explorer fdny-fireboat suzumushi'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 'clean_banner': True, 'outline_open': 3}),
  'ships-e-30': (6, 5,
    g('tk-ship3', 'drakkar nile-river-boat treasure-junk japanese-sekibune uss-monitor-2 bluewave-express')
    + g('tk-ship3', 'clermont cutty-sark-2 ss-rotterdam arctic-venture oceanx-explorer euroferry')
    + g('tk-ship3', 'deepsea-voyager le-commandant national-guard-cutter hovercraft hydrofoil-x1 global-mercy')
    + g('tk-ship3', 'lng-voyager borealis-heavy-lift cable-layer deep-driller seismic-explorer salvage-master')
    + g('tk-ship3', 'sea-guardian windrunner submarine-support polar-supply ocean-carrier aurora-cruise'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 'clean_banner': True, 'outline_open': 3}),
  # Timmy crew, second and third cast sheets (2026-09-28). Owner rule: no woman without hijab
  # in this game, so tk-char/lady-hat and tk-char/maid (chars-ui-30) stay in the DB unreferenced.
  'chars-b-30': (6, 5,
    g('tk-char', 'lantern-boy hijab-girl-book captain-pointing hijab-girl-blueprint mechanic-boy diver-2')
    + g('tk-prop', 'engine-telegraph-8 sextant-7 blueprint-2 pocket-watch-5 suitcase-6 sign-welcome-aboard')
    + g('tk-prop', 'bulb-horn captain-hat-3 deck-chair-7 crate-hanging searchlight-2 bell-good-journey-2')
    + g('tk-prop', 'duffel-bag lifeboat-14 signpost-deck scroll-sealed iceberg-9 telescope-tripod')
    + g('tk-prop', 'porthole-night gear-upgrade banner-event cabin-key message-bottle-help sign-next-voyage'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True, 'hole_rim': 1.5}),
  'chars-c-30': (6, 5,
    g('tk-char', 'officer-boy-binoculars hijab-officer-tablet captain-map mechanic-boy-wrench hijab-girl-camera diver-bearded')
    + g('tk-prop', 'ship-bell-wall propeller-4 diving-suit deck-chair-8 suitcase-7 iceberg-10')
    + g('tk-prop', 'globe spyglass-6 blueprint-3 flag-white-star-4 sextant-8 seagull-5')
    + g('tk-prop', 'dinner-plate-2 lifebuoy-7 vip-rope grand-staircase-3 coal-cart signpost-bridge')
    + g('tk-prop', 'porthole-whales envelope-new-york pocket-watch-6 captains-log atlantic-map message-bottle-hope'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True,
     'art_over_grid': True, 'hole_rim': 1.5, 'rect_cell': {'grand-staircase-3'}}),
  # Timmy world sheet + fourth cast sheet (2026-09-28). Art sits over the row lines, which then
  # read too faint to detect, so the rows are named.
  'world-25': (5, 5,
    g('tk-char', 'timmy-reading timmy-spyglass-2 penguin-captain hijab-girl-map') + g('tk-prop', 'treasure-map-2')
    + g('tk-prop', 'ship-wheel-5 lantern-6 anchor-gold sign-next-destination') + g('tk-world', 'lighthouse-island')
    + g('tk-world', 'iceberg-big cave-island whirlpool storm-cloud sunset-sea')
    + g('tk-world', 'moon-sea snow-island harbor-station arch-island') + g('tk-prop', 'signpost-harbor')
    + g('tk-prop', 'compass-open-3 spyglass-7 lifebuoy-8 suitcase-8 books-ocean'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True,
     'hole_rim': 1.5, 'grid_ys': (209, 423, 610, 799), 'line_sat': 42, 'drop_slivers': True, 'rect': {'sunset-sea', 'moon-sea'}}),
  'chars-d-30': (6, 5,
    g('tk-char', 'timmy-map officer-boy-salute hijab-officer-pointing penguin-sailor captain-binoculars mechanic-boy-2')
    + g('tk-prop', 'engine-telegraph-9 ship-bell-4 porthole-whale-2 sextant-9 diving-helmet-3 treasure-chest-3')
    + g('tk-prop', 'blueprint-4 submersible-expedition titanic-ship-2 iceberg-11 lifeboat-6b buoy-light')
    + g('tk-prop', 'hourglass-2 captain-key-2 suitcase-9 lifebuoy-9 boarding-pass-4 globe-2')
    + g('tk-prop', 'pocket-watch-7 scroll-sealed-2 sign-adventure-awaits captain-hat-4 porthole-moon adventure-log'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True,
     'hole_rim': 1.5, 'grid_ys': (209, 414, 602, 795), 'line_sat': 42, 'drop_slivers': True}),
  # world-b (2026-09-28): pale grey gutters, mostly hidden under full-cell pictures, so the
  # lines are named. cannon is ingested but not used (owner: no weapons).
  'world-b-30': (6, 5,
    g('tk-world', 'arch-beach lighthouse-sunset') + g('tk-prop', 'ship-wheel-6 spyglass-8 treasure-map-3 treasure-chest-4')
    + g('tk-prop', 'ship-bell-5 seagull-6 lantern-7 lifebuoy-10 bollard-rope crate-plain')
    + g('tk-prop', 'barrels rope-coil-4 anchor-5') + g('tk-world', 'iceberg-2 arch-rock palm-island')
    + g('tk-prop', 'cannon cargo-net compass-4 signpost-blank flag-compass') + g('tk-world', 'snow-mountain')
    + g('tk-world', 'waterfall ruins') + g('tk-char', 'penguins') + g('tk-world', 'whale-tail aurora titanic-funnels'),
    {'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'grid': True, 'art_over_grid': True,
     'hole_rim': 1.5, 'grid_ys': (189, 387, 594, 793), 'grid_xs': (255, 511, 767, 1022, 1279), 'line_sat': 12,
     'drop_slivers': True, 'blank_border': 5, 'rect_cell': {'arch-beach', 'lighthouse-sunset', 'waterfall', 'aurora', 'titanic-funnels'}}),
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
# Timmy & Kapal (2026-09-28), by KEY so a bare name ('sailboat') never changes an older sheet's
# sprite. Reviewed on magenta: wheel spokes, buoy centres, chair legs, key rings, sextant
# frames, the bow/violin gap, rigging between masts and sails. NOT pirate-ship (its only
# pocket is the white skull), teacups/plate/flag star (white paint).
HOLES |= set('''tk-prop/ship-wheel tk-prop/ship-wheel-2 tk-prop/lifebuoy-2 tk-prop/lifebuoy-3
  tk-prop/deck-chair-2 tk-prop/deck-chair-3 tk-prop/captain-key tk-prop/first-class-key
  tk-prop/sextant tk-prop/sextant-2 tk-prop/rope-coil tk-prop/violin tk-prop/titanic-ship
  tk-ship/pirate-ship-red tk-ship/caravel-cross tk-ship/cargo-sailboat tk-ship/chinese-junk
  tk-ship/sailboat tk-ship/airship tk-ship/container-ship tk-ship/dragon-boat
  tk-ship/fishing-trawler tk-ship/icebreaker tk-ship/paddle-steamer tk-ship/turtle-ship
  tk-ship/viking-longship'''.split())
HOLE_MIN_PX = 150   # smaller pockets inside a HOLES sprite are highlights/eyes, kept
HOLE_MIN_PX_FOR = {'rainbow': 2000,
                   # rigging triangles: smaller sky pockets between thin lines are gaps too
                   'tk-prop/titanic-ship': 80, 'tk-ship/fishing-trawler': 80, 'tk-ship/sailboat': 80,
                   'tk-ship/caravel-cross': 80}   # only the gap under the arc; the clouds' highlights stay
# Timmy legend / props-d,e,f / ships-b (2026-09-28), by KEY, reviewed on magenta: rigging and
# the sky between masts, wheel spokes, sextant frames, chair/bench/railing gaps, rope loops.
_TK_SHIPS = [f'tk-legend/ship-{n}' for n in 'titanic britannic arizona cuttysark victory vasa mayflower endurance kontiki calypso queenmary'.split()]
_TK_SHIPS += [f'tk-ship2/{n}' for n in """rms-titanic hmhs-britannic uss-arizona cutty-sark hms-victory vasa mayflower
  endurance kon-tiki calypso queen-mary viking-longship red-dragon-junk blackbeard santa-maria atakebune
  uss-enterprise container-ship arctic-explorer mississippi-steamboat coast-guard-cutter ocean-dream-yacht fishing-boat""".split()]
HOLES |= set(_TK_SHIPS) | set('''tk-prop/ship-wheel-4 tk-prop/lifebuoy-6 tk-prop/rowboat-2 tk-prop/compass-open-2 tk-ui/hourglass
  tk-legend/ship-wheel-3 tk-legend/sextant-3 tk-legend/hourglass
  tk-prop/sextant-4 tk-prop/sextant-5 tk-prop/sextant-6 tk-prop/deck-chair-4 tk-prop/deck-chair-5 tk-prop/deck-chair-6
  tk-prop/anchor-3 tk-prop/anchor-4 tk-prop/whistle tk-prop/rope-knot tk-prop/armillary-globe tk-prop/picnic-basket
  tk-prop/funnel-2 tk-prop/deck-bench tk-prop/deck-railing tk-prop/champagne-bucket tk-prop/ship-horn
  tk-prop/lifebuoy-5 tk-prop/violin-2 tk-prop/pocket-watch-4 tk-prop/binoculars-6 tk-prop/tea-set tk-prop/lantern-5
  tk-prop/compass-3 tk-prop/open-compass tk-prop/treasure-chest-open'''.split())
HOLE_MIN_PX_FOR.update({k: 150 for k in _TK_SHIPS})
HOLES |= set('''tk-prop/ship-wheel-6 tk-prop/lifebuoy-10 tk-prop/anchor-5 tk-world/arch-rock tk-prop/cargo-net
  tk-prop/lantern-7 tk-prop/ship-bell-5'''.split())
# ships-c/d/e: every labelled ship is rigged or railed; reviewed on magenta after the run
_TK_SHIPS3 = [f'tk-ship3/{n}' for sh in ('ships-c-25', 'ships-d-30', 'ships-e-30') for _, n in SHEETS[sh][2]]
# only rigged / sailing ships: a flat-white hull or superstructure (hospital ships, ferries,
# RoRo, yachts) is PAINT, and opening it punched magenta holes in Global Mercy and the RoRo
HOLES |= {f'tk-ship3/{n}' for n in '''trireme viking-ship chinese-junk-2 atakebune-2 pirate-galleon spanish-galleon
  dutch-east-indiaman royal-frigate flying-cloud athenian-trireme roman-quinquereme zheng-he-treasure-ship
  hms-beagle hms-endeavour sao-gabriel arabian-dhow ss-great-eastern stad-amsterdam fujian-junk krusenstern
  drakkar nile-river-boat treasure-junk japanese-sekibune clermont cutty-sark-2 ss-rotterdam fv-atlantic-star'''.split()}
HOLES |= set('''tk-prop/ship-wheel-5 tk-prop/lifebuoy-8 tk-prop/anchor-gold tk-prop/compass-open-3
  tk-world/arch-island tk-prop/sextant-9 tk-prop/captain-key-2 tk-prop/lifebuoy-9 tk-prop/globe-2 tk-prop/pocket-watch-7
  tk-prop/hourglass-2 tk-prop/lifeboat-6b tk-prop/buoy-light tk-prop/ship-bell-4 tk-prop/titanic-ship-2'''.split())   # 80 opened white highlights in sails
HOLES |= set('''tk-prop/sextant-7 tk-prop/deck-chair-7 tk-prop/telescope-tripod tk-prop/crate-hanging
  tk-prop/bell-good-journey-2 tk-prop/sign-welcome-aboard tk-prop/pocket-watch-5 tk-prop/cabin-key tk-prop/lifeboat-14
  tk-prop/sign-next-voyage tk-prop/bulb-horn tk-prop/ship-bell-wall tk-prop/deck-chair-8 tk-prop/vip-rope tk-prop/coal-cart
  tk-prop/sextant-8 tk-prop/pocket-watch-6 tk-prop/lifebuoy-7 tk-prop/globe tk-prop/spyglass-6'''.split())
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


def detect_grid(im, cols, rows, ys_inner=None, xs_inner=None):
    """Cell boxes from the grid lines actually drawn on a sheet (lines are not evenly spaced:
    one row of the owner's icon sheet is 278 px, the others ~235)."""
    a = im.astype(np.int32); g = a.mean(2); sat = a.max(2) - a.min(2)
    line = (g < 236) & (g > 120) & (sat < 25)
    def lines(frac, n):
        v = np.where(frac > 0.55)[0]
        grp = [s_ for s_ in np.split(v, np.where(np.diff(v) > 2)[0] + 1) if len(s_)]
        pos = [int(s_.mean()) for s_ in grp]
        if len(pos) == n + 1:
            return pos
        # Timmy sheets (2026-09-28) draw only the INNER lines; the sheet edge is the outer border
        return [0] + pos + [len(frac) - 1] if len(pos) == n - 1 else None
    ys, xs = lines(line.mean(1), rows), lines(line.mean(0), cols)
    if ys_inner:   # a sheet whose button frames read as extra lines names its rows
        ys = [0] + list(ys_inner) + [im.shape[0] - 1]
    if xs_inner:
        xs = [0] + list(xs_inner) + [im.shape[1] - 1]
    if not ys or not xs:
        return None
    return [(xs[c], ys[r], xs[c + 1], ys[r + 1]) for r in range(rows) for c in range(cols)]


def blank_grid_lines(im, ys, xs, half=5, line_sat=28):
    """Remove the drawn grid lines (inner lines only; the sheet edge is not a line).
    Where art continues on BOTH sides right next to the line's core, the line was drawn
    across the art (a buoy's rope) or the art over the line (a bell rope): the grey line
    pixels there are re-painted by interpolating between the art just above and below,
    so the sprite is not cut in two. Everywhere else the line-grey / near-white pixels
    of the band are whitened, so a sprite that merely touches the line keeps its edge and
    no line stub or crossing dot survives."""
    H, W = im.shape[:2]
    a = im.astype(np.int32)
    lineish = (a.min(2) >= 80) & ((a.max(2) - a.min(2)) < line_sat)   # line core is ~109 grey (bluish on some sheets)
    core = lineish & (a.max(2) <= 200)
    ink = (whiteness_dist(im.astype(np.float32)) > 24) & ~core
    src = im.astype(np.float32)

    def fix(y, horiz):
        n = H if horiz else W
        if y <= 0 or y >= n - 1:
            return
        top, bot = max(0, y - 3), min(n - 1, y + 4)
        if horiz:
            both = ink[top] & ink[bot]
            lo, hi = max(0, y - half), min(n, y + half + 1)
            m = lineish[lo:hi] & ~both[None, :]
            im[lo:hi][m] = 255
            for r in range(top + 1, bot):
                t = (r - top) / (bot - top)
                sel = both & lineish[r]
                im[r][sel] = np.clip(src[top][sel] * (1 - t) + src[bot][sel] * t, 0, 255).astype(np.uint8)
        else:
            both = ink[:, top] & ink[:, bot]
            lo, hi = max(0, y - half), min(n, y + half + 1)
            m = lineish[:, lo:hi] & ~both[:, None]
            im[:, lo:hi][m] = 255
            for r in range(top + 1, bot):
                t = (r - top) / (bot - top)
                sel = both & lineish[:, r]
                im[:, r][sel] = np.clip(src[:, top][sel] * (1 - t) + src[:, bot][sel] * t, 0, 255).astype(np.uint8)

    for y in ys:
        fix(y, True)
    for x in xs:
        fix(x, False)


def rect_sprite(cell, own, radius=14):
    """A full rectangular illustration (grand staircase): no background removal, trim to
    the art's box and give it an anti-aliased rounded-corner mask."""
    ys, xs = np.where(own)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgb = cell[y0:y1, x0:x1]
    # the source's own soft corners/edge: trim rows/cols that are still mostly page white
    d = whiteness_dist(rgb.astype(np.float32))
    rows = np.where((d > 24).mean(1) > 0.9)[0]; cols = np.where((d > 24).mean(0) > 0.9)[0]
    rgb = rgb[rows.min():rows.max() + 1, cols.min():cols.max() + 1]
    h, w = rgb.shape[:2]
    S = 4
    yy, xx = np.mgrid[0:h * S, 0:w * S].astype(np.float32) / S
    cx = np.clip(xx, radius, w - radius); cy = np.clip(yy, radius, h - radius)
    inside = (np.hypot(xx - cx, yy - cy) <= radius).astype(np.float32)
    a = inside.reshape(h, S, w, S).mean((1, 3))
    return np.dstack([rgb, (a * 255).round().astype(np.uint8)])


def segment_sheet(im, cols, rows, boxes=None, loose=True, cell_owned=False):
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
            if boxes:
                bx0, by0, bx1, by1 = boxes[r * cols + c]
                y0, y1 = int(by0 + 0.15 * (by1 - by0)), int(by0 + 0.75 * (by1 - by0))
                x0, x1 = int(bx0 + 0.15 * (bx1 - bx0)), int(bx0 + 0.85 * (bx1 - bx0))
                sub = core[y0:y1, x0:x1] & (markers[y0:y1, x0:x1] == 0)
                l, n = ndimage.label(sub)
                if n:
                    k = int(np.argmax(ndimage.sum(np.ones_like(l), l, range(1, n + 1)))) + 1
                    markers[y0:y1, x0:x1][l == k] = r * cols + c + 1
                continue
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
    loose_, ln = ndimage.label(fg & (ws == 0))
    if ln and loose:
        _, (iy, ix) = ndimage.distance_transform_edt(ws == 0, return_indices=True)
        nearest = ws[iy, ix]
        for k in range(1, ln + 1):
            part = loose_ == k
            if part.sum() >= 40:
                lab_ = np.bincount(nearest[part]).argmax()
                if boxes and cell_owned:
                    # on a ruled sheet a detached tip (a mast top just under the line) belongs
                    # to the cell it sits in, not to the closer hull across the line
                    cy_, cx_ = ndimage.center_of_mass(part)
                    for bi, (bx0, by0, bx1, by1) in enumerate(boxes):
                        if bx0 <= cx_ < bx1 and by0 <= cy_ < by1:
                            lab_ = bi + 1 if (markers == bi + 1).any() else lab_
                            break
                ws[part] = lab_
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


def outline(spr, hole_rim=None, open_px=None):
    """Smooth white sticker border (owner: "borderline putih agar tampak smooth nggak
    patah2 ujung2nya"). Built at SSx from a distance field of the silhouette, so tips
    and corners come out ROUND and the edge is anti-aliased, then box-downsampled."""
    h, w = spr.shape[:2]
    pad = OUTLINE_PX + 3
    a = np.zeros((h + 2 * pad, w + 2 * pad), np.float32)
    sil = spr[..., 3]
    if open_px:
        # rigged ships: the ring follows the hull, masts and sails only. Thin rigging is
        # opened out of the silhouette first, else the blurred web of lines reads as solid and
        # the sky between masts fills up with white. The lines themselves are drawn on top.
        yy_, xx_ = np.mgrid[-open_px:open_px + 1, -open_px:open_px + 1]
        sil = ndimage.grey_opening(sil, footprint=(xx_ * xx_ + yy_ * yy_) <= open_px * open_px + 0.5)
    a[pad:pad + h, pad:pad + w] = sil / 255.0
    big = np.asarray(Image.fromarray((a * 255).astype(np.uint8), 'L')
                     .resize((a.shape[1] * SS, a.shape[0] * SS), Image.BICUBIC)).astype(np.float32) / 255.0
    # smooth the silhouette first (sigma 2.5 native px; 1.2 still traced the grey specks
    # the source sheets carry in their own anti-aliased edge) so the ring follows the SHAPE,
    # not every 1px bump of the anti-aliased edge -- otherwise the outline looks wavy
    solid = ndimage.gaussian_filter(big, sigma=2.5 * SS) > 0.35
    dist = ndimage.distance_transform_edt(~solid)
    R = OUTLINE_PX * SS
    ring = np.clip((R + SS * 0.5 - dist) / SS, 0.0, 1.0)            # 1 inside radius, AA over 1 px
    if hole_rim is not None:
        # a see-through gap (wheel spokes, buoy centre) gets only a THIN rim: the full-width
        # ring filled a wheel's gaps back up with white, leaving pin-pricks of background
        lbl, _ = ndimage.label(~solid)
        outer = set(np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]]))) - {0}
        hole = (lbl > 0) & ~np.isin(lbl, list(outer))
        ring = np.where(hole, np.clip((hole_rim * SS + SS * 0.5 - dist) / SS, 0.0, 1.0), ring)
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


def drop_slivers(spr):
    """Grid-line residue: a detached piece at most 4 px thick in one direction (a leftover
    run of a faint ruled line: <= 9 px thick, < 3% of the sprite) is cleared; a real detached
    part (a clove, a star) is thicker or bigger."""
    l, n = ndimage.label(spr[..., 3] > 8)
    if n < 2:
        return spr
    sizes = ndimage.sum(np.ones_like(l), l, range(1, n + 1))
    main_ = int(np.argmax(sizes)) + 1
    out = spr.copy()
    for k, sl in enumerate(ndimage.find_objects(l), 1):
        if k != main_ and min(sl[0].stop - sl[0].start, sl[1].stop - sl[1].start) <= 9 and sizes[k - 1] < 0.03 * sizes[main_ - 1]:
            out[sl][l[sl] == k] = 0
    return out


def _open_px(opts, name):
    only = opts.get('outline_open_only')
    return opts.get('outline_open') if only is None or name in only else None


def _longest_run(row):
    best = cur = 0
    for v in row:
        cur = cur + 1 if v else 0
        best = max(best, cur)
    return best


def banner_cut_rows(im, boxes, cols, cells):
    """Sheet row where each labelled ship's name banner starts. The banner is a dark plate
    with a GOLD frame: its bottom edge is the lowest row in the cell with a long gold run.
    The top is taken as bottom - BANNER_H (frame height is constant on a sheet), because a
    gilded hull (HMS Victory, the Kon-Tiki raft) makes the top edge ambiguous. A cell whose
    bottom strays from its sheet-row's consensus uses the consensus."""
    bots = {}
    for i in cells:
        x0, y0, x1, y1 = boxes[i]
        c = im[y0:y1, x0 + 4:x1 - 4].astype(np.int16)
        h, w = c.shape[:2]
        R, G, B = c[..., 0], c[..., 1], c[..., 2]
        gold = (R > 150) & (R - B > 70) & (G > 90) & (G < R) & (R - G < 110)
        gold = ndimage.binary_closing(gold, structure=np.ones((1, 5)))
        long_ = [y for y in range(int(h * 0.55), h) if _longest_run(gold[y]) >= 0.22 * w]
        bots[i] = y0 + max(long_) if long_ else None
        # a darker frame (ships-d row 1) hides its bottom edge from the gold test: the plate's
        # near-black fill still ends 1-2 px above the frame's bottom
        dk = c.max(2) < 60
        dark_ = [y for y in range(int(h * 0.55), h) if _longest_run(dk[y]) >= 0.25 * w]
        if dark_ and (bots[i] is None or y0 + max(dark_) > bots[i] + 4):
            bots[i] = y0 + max(dark_) + 1
    out = {}
    for i in cells:
        r = i // cols
        row = [b for j, b in bots.items() if j // cols == r and b is not None]
        med = int(np.median(row))
        b = bots[i] if bots[i] is not None and abs(bots[i] - med) <= 5 else med
        out[i] = b - BANNER_H
    return out


BANNER_H = 31      # gold frame bottom -> top, plus a 2px margin above the frame
BANNER_FADE = 12   # px of water faded to transparent above the cut


def banner_clean_sprites(sheet, im, boxes, cols, rows, names, opts, assets, bad, dups):
    """'<name>-clean' twin of each labelled ship: the cell is whitened from the banner's top
    down, re-segmented, cut as usual, and where the art (water) reaches the cut line it fades
    to transparent over BANNER_FADE px instead of ending on a flat white sticker edge."""
    want = opts['clean_banner']
    cells = [i for i, (_, n) in enumerate(names) if want is True or n in want]
    rows_cut = banner_cut_rows(im, boxes, cols, cells)
    im2 = im.copy()
    for i in cells:
        x0, y0, x1, y1 = boxes[i]
        im2[rows_cut[i]:y1, x0:x1] = 255
    seg = segment_sheet(im2, cols, rows, boxes, loose=True, cell_owned=bool(opts.get('art_over_grid')))
    H, W = im2.shape[:2]
    made = 0
    for i in cells:
        cat, name = names[i]
        key = f'{cat}/{name}-clean'
        if key in assets and assets[key].get('source') != f'{sheet}#{i + 1}-clean':
            dups.append(f'{key} (kept {assets[key]["source"]})'); continue
        lab = seg == i + 1
        if not lab.any():
            bad.append(f'{key}: nothing segmented'); continue
        ys, xs = np.where(lab)
        Y0, Y1 = max(0, ys.min() - 8), min(H, ys.max() + 9)
        X0, X1 = max(0, xs.min() - 8), min(W, xs.max() + 9)
        win = seg[Y0:Y1, X0:X1]
        spr = cut(im2[Y0:Y1, X0:X1], lab[Y0:Y1, X0:X1], holes_ok=f'{cat}/{name}' in HOLES,
                  hole_min=HOLE_MIN_PX_FOR.get(f'{cat}/{name}', HOLE_MIN_PX),
                  other=(win != 0) & (win != i + 1))
        if spr is None:
            bad.append(f'{key}: empty cell'); continue
        spr = outline(spr, hole_rim=opts.get('hole_rim'), open_px=_open_px(opts, name)).astype(np.float32)
        if ys.max() >= rows_cut[i] - 2 and (lab[rows_cut[i] - 1] if rows_cut[i] - 1 < H else lab[-1]).sum() > 12:
            # art row just above the cut = sprite bottom - PAD (cut's trim) - outline pad
            rc = spr.shape[0] - 1 - PAD - (OUTLINE_PX + 3)
            ramp = np.clip((rc + 1 - np.arange(spr.shape[0], dtype=np.float32)) / BANNER_FADE, 0.0, 1.0)
            spr[..., 3] *= ramp[:, None]
            nz = np.where(spr[..., 3].max(1) > 8)[0]
            spr = spr[:nz.max() + 2]
        spr = np.clip(spr.round(), 0, 255).astype(np.uint8)
        data = encode(spr)
        p, amax = psnr_opaque(spr, data)
        if p < MIN_PSNR or amax > 2:
            bad.append(f'{key}: PSNR {p:.1f} dB, alpha err {amax}'); continue
        rel = f'assets/db/lib/{key}.webp'
        os.makedirs(os.path.dirname(os.path.join(ROOT, rel)), exist_ok=True)
        open(os.path.join(ROOT, rel), 'wb').write(data)
        assets[key] = {'file': rel, 'cat': cat, 'tags': name.split('-') + ['clean', 'cartoon'],
                       'source': f'{sheet}#{i + 1}-clean',
                       'w': int(spr.shape[1]), 'h': int(spr.shape[0]), 'psnr': round(float(p), 1)}
        made += 1
    return made


# Free-layout sheets (no grid): key -> (x0, y0, x1, y1) box on the sheet, read by eye. Inside a
# box the sprite is the largest non-page piece plus every piece wholly inside the box, so a
# neighbour that merely reaches in (a drop shadow, a ribbon end) is clipped at the box edge.
# UI mock pieces (buttons, chips, caption plates, quiz panel, route panel, board) are not cut:
# the game draws those in code. 'glow' items keep their soft glow as alpha (no outline).
FREE = {
  'keyart-free': ({'src': os.path.expanduser('~/Documents/temporary/game asset/timmy-ships'), 'glow': {'portal'},
                   'holes': {'ship-wheel', 'lifebuoy', 'dock', 'signpost', 'sign-kinder', 'crate-hanging'},
                   'cutout': {'logo': [(408, 4, 440, 125)]}}, {
    'timmy': (0, 0, 172, 272), 'logo': (164, 4, 440, 262), 'timmy-sleeping': (408, 18, 664, 248),
    'timmy-flying': (656, 4, 894, 246), 'captain-arms': (892, 4, 1072, 248), 'titanic-smoke': (1074, 4, 1327, 250),
    'titanic-bow': (1327, 2, 1528, 250), 'portal': (338, 346, 554, 464), 'radar': (18, 678, 174, 832),
    'ship-wheel': (176, 678, 326, 832), 'compass': (324, 688, 452, 822), 'lifebuoy': (453, 688, 612, 826),
    'star': (613, 698, 730, 812), 'crystal': (733, 693, 832, 827), 'ship-log': (833, 693, 1014, 822),
    'backpack': (1013, 683, 1172, 837), 'captain-hat': (1179, 697, 1347, 821), 'spyglass': (1341, 694, 1528, 827),
    'sign-kinder': (1341, 319, 1534, 462), 'crate-hanging': (1341, 455, 1534, 694), 'dock': (706, 820, 1014, 1017),
    'iceberg': (1013, 846, 1197, 1008), 'signpost': (1194, 829, 1358, 1007), 'treasure-map': (1352, 829, 1535, 1007),
    'mission-complete': (4, 830, 272, 986)}),
}


def free_sheet(sheet, opts, boxes, assets, bad):
    im = np.asarray(Image.open(os.path.join(opts['src'], sheet + '.png')).convert('RGB')).copy()
    page, _, _ = page_mask(im.astype(np.float32))
    fg = ~page
    # the top row of key art is ONE connected piece (drop shadows, a map over the logo ribbon):
    # each box seeds its largest eroded core, and a whole-sheet watershed splits the pieces at
    # their narrowest joins; a sprite is its basin clipped to its box
    from skimage.segmentation import watershed
    core = ndimage.binary_erosion(fg, iterations=4)
    markers = np.zeros(fg.shape, np.int32)
    names = list(boxes)
    for k, name in enumerate(names, 1):
        x0, y0, x1, y1 = boxes[name]
        sub = core[y0:y1, x0:x1] & (markers[y0:y1, x0:x1] == 0)
        l, n = ndimage.label(sub)
        if n:
            big = int(np.argmax(ndimage.sum(np.ones_like(l), l, range(1, n + 1)))) + 1
            markers[y0:y1, x0:x1][l == big] = k
    ws = watershed(-ndimage.distance_transform_edt(fg), markers, mask=fg)
    made = 0
    for k, name in enumerate(names, 1):
        x0, y0, x1, y1 = boxes[name]
        key = f'tk-key/{name}'
        own = ws[y0:y1, x0:x1] == k
        for (cx0, cy0, cx1, cy1) in opts.get('cutout', {}).get(name, ()):   # a neighbour's overlap
            own[max(0, cy0 - y0):max(0, cy1 - y0), max(0, cx0 - x0):max(0, cx1 - x0)] = False
        if not own.any():
            bad.append(f'{key}: empty box'); continue
        # a basin reaching over the box edge leaves slivers: keep the main piece and pieces
        # wholly inside the box
        l, n = ndimage.label(own)
        if n > 1:
            sizes = ndimage.sum(np.ones_like(l), l, range(1, n + 1))
            edge = set(np.unique(np.concatenate([l[0], l[-1], l[:, 0], l[:, -1]])))
            keep = {int(np.argmax(sizes)) + 1} | {j + 1 for j, v in enumerate(sizes) if v >= 40 and (j + 1) not in edge}
            own = np.isin(l, list(keep))
        cell = im[y0:y1, x0:x1]
        if name in opts.get('glow', ()):
            # soft glow: alpha = distance from page white, colour un-premultiplied against white
            d = whiteness_dist(cell.astype(np.float32))
            a = np.clip(d / 90.0, 0.0, 1.0)
            a[~ndimage.binary_dilation(own, iterations=4)] = 0
            col = (cell.astype(np.float32) - (1.0 - a)[..., None] * 255.0) / np.maximum(a, 1e-3)[..., None]
            spr = np.dstack([np.clip(np.where(a[..., None] > 0, col, 0), 0, 255), a * 255.0]).round().astype(np.uint8)
            ys, xs = np.where(spr[..., 3] > 4)
            spr = spr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        else:
            spr = cut(cell, own, holes_ok=name in opts.get('holes', ()))
            if spr is None:
                bad.append(f'{key}: empty cut'); continue
            spr = outline(spr, hole_rim=1.5)
        data = encode(spr)
        p, amax = psnr_opaque(spr, data)
        if p < MIN_PSNR or amax > 2:
            bad.append(f'{key}: PSNR {p:.1f} dB, alpha err {amax}'); continue
        rel = f'assets/db/lib/{key}.webp'
        os.makedirs(os.path.dirname(os.path.join(ROOT, rel)), exist_ok=True)
        open(os.path.join(ROOT, rel), 'wb').write(data)
        assets[key] = {'file': rel, 'cat': 'tk-key', 'tags': name.split('-') + ['cartoon'], 'source': f'{sheet}:{name}',
                       'w': int(spr.shape[1]), 'h': int(spr.shape[0]), 'psnr': round(float(p), 1)}
        made += 1
    return made


def main():
    only = set(sys.argv[1:])
    index = json.load(open(INDEX)) if os.path.exists(INDEX) else {'_note': '', 'assets': {}}
    assets = index['assets']
    loaded = dict(assets)          # to MERGE on write: other tools add keys while a run is going
    dups, bad, made = [], [], 0
    for sheet, spec in SHEETS.items():
        cols, rows, names = spec[:3]
        opts = spec[3] if len(spec) > 3 else {}
        if only and sheet not in only:
            continue
        assert len(names) == cols * rows, f'{sheet}: {len(names)} names for {cols * rows} cells'
        im = np.asarray(Image.open(os.path.join(opts.get('src', SRC), sheet + '.png')).convert('RGB')).copy()
        H, W = im.shape[:2]
        cw, ch = W / cols, H / rows
        boxes = detect_grid(im, cols, rows, opts.get('grid_ys'), opts.get('grid_xs')) if opts.get('grid') else None
        im_orig = im.copy()
        if opts.get('blank_border'):   # a pale frame drawn at the sheet edge itself
            bb = int(opts['blank_border']); im[:bb] = 255; im[-bb:] = 255; im[:, :bb] = 255; im[:, -bb:] = 255
        if opts.get('grid') and not boxes:
            bad.append(f'{sheet}: grid lines not found'); continue
        if boxes:
            # blank the drawn grid lines and every cell's label band to page white, so
            # neither ever joins a sprite (measured per cell, the grid is uneven)
            if opts.get('art_over_grid'):
                # art is painted OVER the grid (a bell rope crosses a line): blank only grey/white
                # line pixels, and leave the band alone where ink sits on both sides of it
                blank_grid_lines(im, sorted({b[1] for b in boxes} | {b[3] for b in boxes}),
                                 sorted({b[0] for b in boxes} | {b[2] for b in boxes}), line_sat=opts.get('line_sat', 28))
            for (x0, y0, x1, y1) in boxes:
                if opts.get('art_over_grid'):
                    break
                im[max(0, y0 - 3):y0 + 4, x0:x1] = 255; im[max(0, y1 - 3):y1 + 4, x0:x1] = 255
                im[y0:y1, max(0, x0 - 3):x0 + 4] = 255; im[y0:y1, max(0, x1 - 3):x1 + 4] = 255
                if opts.get('label'):
                    # the label is the ink block at the bottom of the cell, separated from the
                    # art by white rows: walk up from the bottom, through the text, to the first
                    # clear gap (>= 4 white rows), and blank everything below that gap. A fixed
                    # band missed labels that sit higher and cut art that sits lower.
                    ink = (im[y0:y1, x0 + 6:x1 - 6].min(axis=2) < 200).any(axis=1)
                    h = y1 - y0; y = h - 1
                    while y > 0 and not ink[y]: y -= 1                  # blank rows under the text
                    top_text = y
                    while y > int(h * 0.55):
                        if ink[y]: top_text = y; y -= 1; continue
                        gap = 0
                        while y > int(h * 0.55) and not ink[y]: gap += 1; y -= 1
                        if gap >= 4: break
                    if opts.get('tyres'):
                        # truck sheets: a brand logo sits right under the tyres, often touching
                        # them, so walking gaps cuts the wheels off. The tyres are the lowest rows
                        # that are dense in near-black pixels; everything below them is text.
                        cell = im[y0:y1, x0 + 6:x1 - 6].astype(np.int16)
                        dark = ((cell.max(axis=2) < 70) & (cell.max(axis=2) - cell.min(axis=2) < 30)).mean(axis=1)
                        dense = dark > 0.30
                        runs, start = [], None
                        for yy in range(h):
                            if dense[yy] and start is None: start = yy
                            if (not dense[yy] or yy == h - 1) and start is not None:
                                end = yy if not dense[yy] else yy + 1
                                if end - start >= 10: runs.append((start, end))
                                start = None
                        if runs:
                            wb = max(runs, key=lambda r_: r_[1] - r_[0])[1]   # the TALLEST dark band is the tyres (a bold logo is thinner)
                            # tyre undersides fade out below the dense band: follow ink down
                            # until the first fully white row, capped at 6% of the cell
                            ink2 = (im[y0:y1, x0 + 6:x1 - 6].min(axis=2) < 200).any(axis=1)
                            lim = min(h, wb + int(h * 0.04))
                            band_bottom = wb
                            while wb < lim and ink2[wb]: wb += 1
                            # under the tyre band only the dark tyre rubber may stay: colourful
                            # logo tops that touch the tyres are blanked pixel by pixel
                            win = im[y0 + band_bottom:y0 + wb, x0:x1].astype(np.int16)
                            dk = win.max(axis=2) < 95
                            # thin logo outlines touching the tyres survive a colour test, so only
                            # THICK dark areas that connect to the tyre band above are kept
                            dk = ndimage.binary_opening(dk, iterations=3)
                            lbl_, n_ = ndimage.label(dk)
                            top = set(np.unique(lbl_[0])) - {0}
                            dk = np.isin(lbl_, list(top))
                            win_im = im[y0 + band_bottom:y0 + wb, x0:x1]
                            win_im[~dk] = 255
                            im[y0 + wb:y1, x0:x1] = 255
                        continue
                    # a truck sheet has TWO blocks under the art (brand logo, then caption):
                    # label = n blocks walks up past each one
                    for _blk in range(int(opts.get('label', 1)) - 1):
                        while y > int(h * 0.45) and not ink[y]: y -= 1
                        while y > int(h * 0.45):
                            if ink[y]: top_text = y; y -= 1; continue
                            gap = 0
                            while y > int(h * 0.45) and not ink[y]: gap += 1; y -= 1
                            if gap >= 3: break
                    im[y0 + max(0, top_text - 2):y1, x0:x1] = 255
        if opts.get('clean_banner') and boxes:
            # nothing of a labelled ship sits below its name plate: a neighbour's stray smoke
            # puff there (atakebune got the steamboat's) is blanked before segmentation
            _want = opts['clean_banner']
            _cells = [i for i, (_, n) in enumerate(names) if _want is True or n in _want]
            for _i, _y in banner_cut_rows(im, boxes, cols, _cells).items():
                bx0, _, bx1, by1 = boxes[_i]
                im[_y + BANNER_H + 3:by1, bx0:bx1] = 255
        seg = segment_sheet(im, cols, rows, boxes, loose=not opts.get('tyres'), cell_owned=bool(opts.get('art_over_grid')))
        for i, (cat, name) in enumerate(names):
            if name.startswith('SKIP'):
                continue
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
            if name in opts.get('rect_cell', ()):
                # a picture that fills its ruled cell: the watershed split it, so take the cell box
                bx0, by0, bx1, by1 = boxes[i]
                cb = np.zeros(im.shape[:2], bool); cb[by0 + 4:by1 - 3, bx0 + 4:bx1 - 3] = True
                spr = rect_sprite(im_orig[by0:by1, bx0:bx1], cb[by0:by1, bx0:bx1])
            elif name in opts.get('rect', ()):
                spr = rect_sprite(im[Y0:Y1, X0:X1], lab[Y0:Y1, X0:X1])
            else:
                spr = cut(im[Y0:Y1, X0:X1], lab[Y0:Y1, X0:X1], holes_ok=name in HOLES or f'{cat}/{name}' in HOLES,
                          hole_min=HOLE_MIN_PX_FOR.get(f'{cat}/{name}', HOLE_MIN_PX_FOR.get(name, HOLE_MIN_PX)), other=(win != 0) & (win != i + 1))
            if spr is None:
                bad.append(f'{key}: empty cell'); continue
            if opts.get('drop_slivers'):
                spr = drop_slivers(spr)
            spr = outline(spr, hole_rim=opts.get('hole_rim'), open_px=_open_px(opts, name))
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
        if opts.get('clean_banner') and boxes:
            made += banner_clean_sprites(sheet, im, boxes, cols, rows, names, opts, assets, bad, dups)
    for sheet, (fopts, fboxes) in FREE.items():
        if not only or sheet in only:
            made += free_sheet(sheet, fopts, fboxes, assets, bad)
    index['_note'] = ('Named shared sprites (owner sheets, tools/ingest-asset-sheets.py). Key = '
                      '"<category>/<name>". Reuse before cropping anything new.')
    # re-read the index right before writing and apply only what THIS run produced, so keys
    # another tool wrote meanwhile (tk_scenes.py) survive a run that loaded an older copy
    changed = {k: v for k, v in assets.items() if loaded.get(k) is not v}
    fresh = json.load(open(INDEX)) if os.path.exists(INDEX) else {'assets': {}}
    fresh['assets'].update(changed)
    index['assets'] = dict(sorted(fresh['assets'].items()))
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
