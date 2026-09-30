#!/usr/bin/env python3
"""
Owner's Mojo Swoptops art (G31, 2026-09-30): 29 sheets in
~/Documents/temporary/game asset/mojo-swoptops/owner-sheets/ -> assets/db/lib/mojo-*/<name>.webp

    ~/.venvs/kokoro/bin/python tools/ingest-mojo-sheets.py            # write sprites + contact sheets + merge the index
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-sheets.py --dry      # contact sheets only (scratch), nothing written
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-sheets.py --dry 04   # one sheet
    ~/.venvs/kokoro/bin/python tools/ingest-mojo-sheets.py --assets-only  # no shared index writes

Layouts (measured per sheet, see LAYOUT):
  grid   uniform R x C cells (the Mojo top sheets 04-08, the prop sheets 25-29); `cap` keeps the top fraction of a
         cell; measured top extents exclude captions without clipping vehicle wheels
  cells  cells found from the sheet's own light-grey separator lines (character/prop sheets 09-13); the caption is
         the lowest short ink block of a cell and is dropped
  boxes  explicit item boxes (the element-library sheets 02-03: rounded cards on a light-blue page)
  bg     large painted backgrounds (15, 17-24): every big opaque panel; pairs are landscape + portrait
Cut-out (every non-background item):
  1. INK = not page background (near-white + light-grey lines; on 02/03 also the light-blue card colours);
     specks under 3 % of the largest ink blob are dropped.
  2. ALPHA = own ink (dilated 2 px) MINUS the background flooded from the crop border. The flood is STRICT (page
     white / card colour only) and then creeps at most 1 px (3 px for cards) into light pixels to remove the outer halo. There is
     NO global white key: Mojo's white plastic and Bo's shirt highlights are inside the outline and stay whole.
  3. Measured polygons preserve original white paint where it meets a white page.
     Large enclosed white areas are NEVER assumed to be background. Audited architectural
     voids have explicit object/region rules; painted white surfaces take priority.
  4. Ground/snow/fog and special/condition tiles keep their painted square with rounded corners.
  5. Only exterior neutral floor pixels below the last dark vehicle pixel may be removed;
     wheel/body RGB pixels are never recoloured or faded wholesale.
Exclusions (never written): Lula (a girl without hijab: Dunia house rule); sheet captions/labels; wrong-character
mockup01 and duplicates (14 = 13, 21 = 20); props not kid-safe here (spiked logs, skull sign, skull gate, cannon,
dynamite, sword, archery target, catapult, spike fence); the mockup's red fire truck and its boy (wrong characters per the owner).
Index MERGE: assets/db/index.json ("assets") and games/data/asset-index.js (MAP) are re-read right before writing;
only current mojo-* entries are merged, nothing else is removed. The shared publisher
locks the index read/merge/preparation/promotion/rollback across ingesters. During parallel continuation
use --assets-only, then the coordinator merges written-metadata.json after validation.
"""
import importlib.util, io, json, os, re, sys, tempfile
from pathlib import Path
from asset_transaction import replace_batch, publish
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.expanduser('~/Documents/temporary/game asset/mojo-swoptops/owner-sheets')
LIB = os.path.join(ROOT, 'assets', 'db', 'lib')
INDEX = os.path.join(ROOT, 'assets', 'db', 'index.json')
AIDX = os.path.join(ROOT, 'games', 'data', 'asset-index.js')
SCRATCH = os.environ.get('MOJO_SCRATCH', os.path.join(tempfile.gettempdir(), 'dunia-mojo-ingest'))
SRCTAG = 'owner mojo sheets 2026-09-30'

T, P, C, U, F, B, K = 'mojo-top/', 'mojo-prop/', 'mojo-char/', 'mojo-ui/', 'mojo-fx/', 'mojo-bg/', 'mojo-tile/'


def names(prefix, s):
    return [None if w == '-' else prefix + w for w in s.split()]


# 02: measured 1312px sheet, card starts 12 + 99.7*i. The old 98.9px
# pitch drifted into adjacent cards and clipped the final columns.
X02 = [(round(12 + 99.7 * i), round(106 + 99.7 * i)) for i in range(13)]
ROWS02 = [(168, 253), (310, 397), (455, 543), (598, 686), (742, 828), (884, 969), (1020, 1086)]
N02 = [
    names(K, 'grass road dirt sand stone pavement indoor-floor checker-floor wood-floor metal-floor snow ice mud'),
    names(K, 'rock-small rock-large tree bush log boulder fallen-tree crate boxes fence wall barrier cone'),
    names(K, 'fire water deep-water mud-puddle oil-spill ice-patch snow-pile sand-dune lava storm falling-rocks quicksand fog'),
    names(K, 'button-red button-blue lever switch valve crate-move rock-push cart door-closed door-open gate-closed gate-open elevator'),
    [None, P + 'person-adult', C + 'cat', C + 'dog', C + 'bird', C + 'sheep', C + 'cow', C + 'rabbit', P + 'teddy', P + 'backpack', P + 'package', P + 'treasure-chest', P + 'special-star'],
    names(P, 'house school hospital shop garage factory bridge bridge-broken dock tower lighthouse playground windmill'),
    names(K, 'start finish checkpoint hint question-math question-letter toolbox blueprint fuel time-bonus teleport warp-pad random'),
]
BOX02 = []
for r, (y0, y1) in enumerate(ROWS02):
    for c, (x0, x1) in enumerate(X02):
        nm = N02[r][c]
        if nm:
            BOX02.append((nm, (x0, y0, x1, y1), r == 0))


def row(y0, y1, xs, nms):
    return [(n, (xa, y0, xb, y1), False) for n, (xa, xb) in zip(nms, xs) if n]


BOX03 = (
    row(165, 250, [(10, 106), (108, 204), (206, 302), (304, 400), (403, 500), (503, 600), (602, 700), (702, 800)],
        names(K, 'conveyor-right conveyor-left teleport-in teleport-out oneway-up oneway-down oneway-left oneway-right')) +
    row(165, 250, [(818, 914), (916, 1012), (1014, 1110), (1112, 1208), (1210, 1304)], names(K, 'if-number if-color if-item - weight')) +
    row(271, 354, [(10, 106), (108, 204), (206, 302), (304, 400), (403, 500), (503, 600), (602, 700), (702, 800)],
        names(K, 'ice-slide bouncy crack swamp speed-boost trap-hole magic rotating')) +
    row(271, 354, [(818, 914), (916, 1012), (1014, 1110), (1112, 1208), (1210, 1304)], names(K, 'pressure-plate timer day-night switch-on switch-off')) +
    row(419, 493, [(20, 90), (104, 182), (193, 272), (286, 362), (381, 454), (483, 542), (573, 639), (668, 732)], names(P, 'coin star blueprint gear bolt battery fuel-can crystal')) +
    row(517, 593, [(22, 86), (110, 172), (198, 262), (286, 354), (378, 450), (472, 544), (561, 647), (658, 740)], names(P, 'letter-a letter-b letter-c number-1 number-2 number-3 hammer wrench')) +
    row(418, 516, [(774, 904), (908, 1032), (1035, 1164), (1166, 1299)], names(U, 'btn-jalan btn-hapus btn-reset btn-langkah')) +
    row(517, 615, [(772, 877), (879, 983), (985, 1089), (1091, 1193), (1195, 1299)], names(U, 'btn-kembali btn-lanjut btn-pause btn-berhenti btn-bantuan')) +
    row(664, 736, [(18, 86), (98, 166), (178, 246), (260, 326), (342, 406), (423, 497)], names(U, 'ico-home ico-peta ico-episode ico-koleksi ico-bengkel ico-pengaturan')) +
    row(758, 830, [(10, 94), (92, 162), (181, 238), (260, 324), (346, 402), (433, 492)], names(U, '- ico-orangtua ico-bahasa ico-audio ico-info ico-keluar')) +
    row(660, 714, [(938, 994), (998, 1057), (1061, 1120), (1123, 1182), (1184, 1247)], names(U, 'star-0 star-1 star-2 star-2b star-3')) +
    row(902, 982, [(12, 94), (97, 181), (184, 264), (267, 353), (357, 441)], names(F, 'highlight valid invalid - selection')) +
    row(1002, 1078, [(16, 88), (102, 172), (178, 262), (283, 342), (360, 442)], names(F, 'sparkle smoke explosion splash confetti')) +
    row(902, 982, [(488, 542), (566, 642), (662, 726), (750, 812)], names(U, 'tap-hand drag-hand drop-slot forbidden')) +
    row(1002, 1078, [(488, 542), (570, 636), (660, 730), (748, 812)], names(U, 'arrow-down ring pulse ripple')) +
    row(902, 982, [(846, 934), (946, 1006), (1025, 1097), (1108, 1200), (1200, 1298)], names(P, 'cloud tree-small tree-large rock-cluster bush')) +
    row(1002, 1078, [(866, 907), (933, 1010), (1036, 1096), (1134, 1176), (1198, 1298)], names(P, 'lamp-post bench sign-arrow traffic-light fence'))
)

TOPS1 = 'base fire chopper dozer crane lift racer water jumper'
TOPS2 = 'base boat monster dumper jet wrecking-ball searchlight workshop bridge'
TOPS3 = 'mixer recycling snow-plow farm tree-cutter drill rescue satellite camera'
TOPS4 = 'forklift towing ice-cream delivery police ambulance garbage sweeper fuel'
TOPS5 = 'rocket submarine aerial-ladder logging drilling harvester balloon space-lab cargo-crane'

# 09-13: detector cells in reading order. None is an explicit exclusion or a merged
# region split by EXTRA_CELLS; the catalogue records each disposition. Captions are dropped.
CELLS = {
    '09': names(C, 'bo bo-wave bo-tools bo-think bo-excited') + [T + 'base', C + 'oona', C + 'grandad', C + 'float', P + 'swoptops-example'] +
          names(U, 'btn-main btn-action btn-nav btn-settings') + names(P, 'collectibles mission-items level-markers status-icons'),
    '10': [C+'bo', C+'oona', C+'grandad', C+'float', None, C + 'neon'] + [T+'base', P + 'race-swoptop', None, P + 'construction-swoptop', P + 'cement-swoptop', P + 'space-swoptop'] +
          names(P, 'tires face-panels roofs-lights bumpers spoilers special-parts') + names(P, 'building-station swap-stand workbench toolbox crates cone-barrier') +
          names(U, 'menu-buttons hud mission-ui feedback-icons arrows') + [P + 'star', P + 'bolt', P + 'gear', U + 'upgrade-token', None, P + 'battery', P + 'magnet', F + 'speed-boost', F + 'repair-sparks', F + 'portal', F + 'confetti'],
    '11': [B + 'panel-garage', None, B + 'panel-construction', B + 'panel-canyon', B + 'panel-snow'] +
          names(P, 'track-straight track-curve ramp hill bridge-road tunnel water-track lava-track') +
          names(P, 'cone2 barrier2 tire-stack crate2 rock bush2 mud-puddle ice-block oil-spill coin2 coin-star star2') +
          names(P, 'wrench screwdriver hammer2 drill spray-paint wheel engine spoiler rocket-part magnet2 suspension - fan') +
          names(P, 'face-panels2 roofs bumpers2 side-panels paint-colors stickers flags horns exhaust seats') +
          names(U, 'logo btn-play btn-garage btn-missions btn-customize coin-counter star-counter -') +
          names(U, '- mission-panel reward-panel pause-menu settings-panel -') +
          names(F, 'dust skid explosion2 sparks speed-trail collect repair portal2 confetti2 fireworks'),
    '12': [C + 'bo-main', None, C + 'neon2', C + 'grandad2', C + 'oona2', C + 'float2', C + 'mechanic-bot', C + 'painter-bot', C + 'build-bot', C + 'race-bot'] +
          names(P, 'swoptop-faces headlights - chassis') + names(P, 'wheels propellers sirens exhausts attachments') +
          [None] + names(P, 'materials tools consumables powerups') + names(P, 'track-tiles obstacles collectibles2 env-props') +
          names(U, 'frames buttons sliders icons') + [F + 'effects'],
    '13': names(C, 'bo-thumbs bo-jump bo-tablet bo-think2 bo-celebrate bo-surprised bo-wink bo-sit bo-goggles') +
          names(C, 'oona-sit oona-run oona-play oona-sleep float-happy float-curious float-love grandad-thumbs grandad-arms grandad-wrench') +
          names(P, 'mod-chassis mod-swap mod-ladder mod-drill mod-bucket mod-mixer mod-rocket mod-crane mod-cargo mod-rescue') +
          names(P, 'gas-station - bridge2 tunnel2 garage2 observatory lighthouse2 windmill2 treehouse') +
          names(P, 'sign-stop sign-yield sign-speed sign-left sign-right sign-curve cone3 road-barrier chevron direction-sign traffic-light2 fence2 street-lamp') +
          names(P, '- gem wrench-token battery2 magnet3 shield speed-boost2 jump-boost invincibility time-extend multiplier heart') +
          names(U, '- - garage-ui2 customize-ui map-ui pause-menu2 pause-menu3 loading2') +
          names(F, 'dust-cloud tire-smoke sparks2 - water-splash mud-splash snow-spray - checkpoint level-up'),
}
X25 = 'monkey-orange monkey-white gorilla monkey-red bird-blue banana tiki-mask spiral-stone treasure-map vine-bridge ' \
      'jungle-fruit banana-crate stone-face-pillar barrel-rope mossy-rock - rope-bridge golden-banana sign-arrow-wood hut ' \
      'stone-arch waterfall big-tree crystal-rocks banana-banner'
X26 = 'star4 coin-crown heart2 diamond potion sign-right sign-left - checkered-flag chest ' \
      'barrel mushroom spring crate3 stone-block bush3 cactus rocks stump log2 bridge-wood mine-cave crystal2 waterfall2 volcano'
X27 = 'bridge-arch well-red apple-cart market-stall watchtower lantern-post pond - - coin-sack ' \
      'chest-iron - tent - fire-bowl - - haystack bell fountain-wall - - rope-bridge2 lava-rock ice-crystal'
X28 = 'well-blue campfire signpost hay-cart lamp-post2 sunflower cactus2 dock-bridge fountain lighthouse3 ' \
      'blossom-tree snow-tree ice-crystals windmill3 mine-cart-cave hay-bale water-tower ruin-arch ruin-pillar banner-steps ' \
      'beach-shells mossy-rocks igloo flower-cactus rowboat'
X29 = 'tree-round tree-pine rock-grass sign-wood fence-wood bush-flowers grass-tuft mushrooms stump2 crate4 ' \
      'stone-arch2 bridge-rope waterfall3 banner-crown windmill4 block-grass cliff wall-stone stairs-stone pond2 ' \
      'chest-gold barrel2 logs haystack2 palm'

LAYOUT = {
    '02': ('boxes', 'card', BOX02),
    '03': ('boxes', 'card', BOX03),
    '04': ('grid', 3, 3, 0.86, names(T, TOPS1)),
    '05': ('grid', 3, 3, 0.86, names(T, TOPS2)),
    '06': ('grid', 3, 3, 0.84, names(T, TOPS3)),
    '07': ('grid', 3, 3, 0.84, names(T, TOPS4)),
    '08': ('grid', 3, 3, 0.84, names(T, TOPS5)),
    '09': ('cells', CELLS['09']), '10': ('cells', CELLS['10']), '11': ('cells', CELLS['11']),
    '12': ('cells', CELLS['12']), '13': ('cells', CELLS['13']),
    '15': ('bg', ['title-town', '-', 'map', 'garage', 'town-road', '-', '-', 'canyon', '-', 'construction', 'blueprint']),
    '16': ('extras',),
    '17': ('pair', 'coast'), '18': ('pair', 'garage-street'), '19': ('pair', 'beach-dock'), '20': ('pair', 'canyon-road'),
    '22': ('pair', 'forest-trail'), '23': ('pair', 'castle-bridge'), '24': ('pair', 'waterfall'),
    '25': ('grid', 5, 5, 1.0, names(P, X25)), '26': ('grid', 5, 5, 1.0, names(P, X26)), '27': ('grid', 5, 5, 1.0, names(P, X27)),
    '28': ('grid', 5, 5, 1.0, names(P, X28)), '29': ('grid', 5, 5, 1.0, names(P, X29)),
}


# Finite audit of omitted source slots. These literal crops are catalogue art;
# UI references and component panels do not imply implemented gameplay/forms.
EXTRA_CELLS = {
    '03': [
        (U+'objective-panel-sheet03', (726,664,911,770), 'opaque'),
        *[(U+name+'-panel-sheet03', (x,781,x+88,833), 'opaque') for name,x in [('info',534),('warning',631),('success',726),('hint',821)]],
        (U+'progress-bar-sheet03',(941,735,1162,768),'opaque'),
        (U+'life-hearts-sheet03',(1174,732,1297,772),'opaque'),
        (U+'step-counter-sheet03',(939,799,1024,838),'opaque'),
        (U+'item-counter-sheet03',(1027,799,1108,838),'opaque'),
        (U+'energy-counter-sheet03',(1110,799,1207,838),'opaque'),
        (U+'timer-sheet03',(1210,798,1300,838),'opaque'),
        (F+'path-preview-reference-sheet03',(269,907,353,979),'opaque'),
    ],
    '11': [
        (B+'city-sheet11',(261,4,467,200),'opaque'),
        (B+'road-track-sheet11',(470,4,652,200),'opaque'),
        (P+'suspension-spring-sheet11',(1128,533,1196,650),'white'),
        (U+'bo-profile-sheet11',(1180,821,1308,923),'white'),
        (U+'level-select-sheet11',(3,945,183,1060),'white'),
        (U+'garage-sheet11',(191,945,371,1060),'white'),
        (U+'confirm-sheet11',(1016,945,1157,1060),'white'),
        (U+'loading-sheet11',(1163,945,1308,1060),'white'),
    ],
    '12': [
        (P+'windshields-sheet12',(564,257,768,391),'white'),
        (P+'bodies-sheet12',(772,257,1032,391),'white'),
        (P+'decal-flame-sheet12',(10,638,116,690),'white'),
        (P+'decal-lightning-sheet12',(118,636,170,718),'white'),
        (P+'decal-flag-sheet12',(172,634,241,717),'white'),
        *[(P+'decal-star-'+str(i+1)+'-sheet12',(x,690,x+34,724),'white') for i,x in enumerate([12,46,80])],
        (P+'decal-rainbow-sheet12',(10,727,106,788),'white'),
        (P+'decal-heart-sheet12',(109,726,161,791),'white'),
    ],
    '13': [
        (P+'town-house-sheet13',(142,588,285,705),'white'),
        (P+'town-square-sheet13',(286,588,395,705),'white'),
        (P+'coin-sheet13',(4,850,87,938),'white'),
        (P+'star-sheet13',(90,850,174,938),'white'),
        (U+'bo-dialogue-sheet13',(4,967,147,1065),'white'),
        (U+'mission-complete-sheet13',(155,967,289,1065),'white'),
        (U+'level-select-sheet13',(299,967,480,1065),'white'),
        (F+'explosion-sheet13',(299,1091,417,1169),'white'),
        (F+'boost-flame-sheet13',(420,1091,525,1169),'white'),
        (F+'confetti-sheet13',(862,1091,978,1169),'white'),
        (F+'portal-sheet13',(982,1091,1073,1169),'white'),
    ],
    '15': [
        (U+'bo-dialogue-sheet15',(419,4,754,297),'opaque'),
        (U+'oona-dialogue-sheet15',(420,305,754,530),'opaque'),
        (U+'collection-panel-sheet15',(769,309,1109,524),'opaque'),
        (B+'snow-road-sheet15',(11,540,401,760),'opaque'),
        (U+'bo-result-sheet15',(401,536,756,768),'bo-overhang'),
        *[(U+name+'-sheet15',(x0,778,x1,865),'white') for name,x0,x1 in [
            ('play',15,171),('home',175,301),('settings',307,435),('map',438,564),
            ('chevron-left',569,639),('chevron-right',646,719),('back',725,828),('next',831,932),
            ('blank-blue',944,1083),('blank-yellow',1087,1221),('blank-green',1224,1374),('blank-red',1382,1523)]],
        *[(P+name+'-sheet15',(x0,886,x1,988),'white') for name,x0,x1 in [
            ('star',8,84),('gear',85,159),('wrench',159,228),('wheel',228,301),('cone',302,388),
            ('barrier',390,473),('flag',476,546),('tree',546,620),('rock',620,698),('crate',700,778),
            ('bush',779,856),('waterdrop',857,939),('coin',943,1047),('medal',1051,1135),('shield',1140,1250)]],
        (U+'progress-green-sheet15',(1261,860,1515,905),'white'),
        (U+'progress-yellow-sheet15',(1261,907,1515,947),'white'),
        (U+'progress-red-sheet15',(1261,949,1515,994),'white'),
    ],
    '16': [
        (U+'reference-main-menu-sheet16',(6,5,433,375),'opaque'),
        (U+'reference-map-sheet16',(447,5,820,375),'opaque'),
        (U+'reference-level-select-sheet16',(832,5,1111,375),'opaque'),
        (U+'reference-garage-sheet16',(1126,5,1530,375),'opaque'),
        (U+'reference-gameplay-sheet16',(6,410,440,748),'opaque'),
        (U+'reference-pause-sheet16',(448,410,729,748),'opaque'),
        (U+'reference-result-sheet16',(738,410,1115,748),'opaque'),
        (U+'reference-customize-sheet16',(1126,410,1530,748),'opaque'),
        (B+'garage-interior-sheet16',(7,786,349,987),'opaque'),
        (B+'town-sheet16',(358,786,614,987),'opaque'),
        (B+'construction-sheet16',(624,786,928,987),'opaque'),
        (B+'snow-sheet16',(939,786,1217,987),'opaque'),
        (B+'desert-sheet16',(1228,786,1530,987),'opaque'),
    ],
}


# Preserve every distinct source cell. Later high-resolution canonical keys
# stay compatible with game code; earlier variants remain discoverable too.
SOURCE_VARIANTS = {
    **{('10', C + name): C + name + '-sheet10' for name in ('bo', 'oona', 'grandad', 'float')},
    ('10', T + 'base'): T + 'base-sheet10',
    ('04', T + 'base'): T + 'base-sheet04',
    ('05', T + 'base'): T + 'base-sheet05',
    **{('03', P + name): P + name + '-sheet03' for name in ('star', 'gear', 'bolt', 'battery', 'wrench')},
    ('03', F + 'confetti'): F + 'confetti-sheet03',
    ('13', P + 'sign-left'): P + 'sign-left-sheet13',
    ('13', P + 'sign-right'): P + 'sign-right-sheet13',
}


# Polygon coordinates in each measured crop. Preserve original white paint,
# never inferred semantic "all large white regions" heuristics.
WHITE_PAINT = {
    P + 'decal-flag-sheet12': [[(13,23),(20,24),(28,20),(39,11),(48,7),(55,6),(60,8),(61,12),(60,25),(60,40),(60,59),(55,58),(49,60),(39,66),(29,72),(20,76),(14,74),(12,71),(12,24)]],
    P + 'flag-sheet15': [[(12,29),(19,32),(26,32),(33,29),(40,24),(48,19),(53,18),(58,20),(61,23),(61,65),(58,65),(52,63),(46,63),(39,66),(32,70),(25,73),(19,74),(12,71)],[(7,27),(10,27),(12,29),(12,86),(10,88),(6,88),(5,86),(5,32)]],
    P + 'cone-sheet15': [[(29,31),(54,31),(58,51),(25,51)]],
    K + 'cone': [[(36,30),(56,30),(61,46),(54,49),(42,49),(31,44)]],
    T + 'fuel': [[(177,54),(191,39),(238,27),(269,33),(305,44),(330,44),(353,53),(372,74),(382,101),(380,138),(364,161),(345,178),(297,178),(254,159),(232,135),(198,91)]],
    T + 'rocket': [[(211,79),(219,56),(245,38),(266,36),(299,49),(317,73),(324,113),(317,151),(304,173),(290,189),(251,177),(237,150),(229,103)]],
    T + 'lift': [[(189,31),(203,31),(301,90),(299,116),(195,66)]],
    T + 'boat': [[(159,82),(187,73),(215,81),(219,99),(253,98),(277,103),(288,122),(332,146),(344,170),(343,224),(273,225),(246,138),(208,103),(159,103)]],
    T + 'searchlight': [[(229,128),(264,127),(275,132),(288,224),(268,224),(254,158)]],
    T + 'sweeper': [[(261,81),(275,78),(347,87),(370,95),(375,185),(350,193),(282,174)]],
    K + 'fence': [[(4,25),(11,18),(17,24),(18,68),(4,70)],[(27,25),(35,17),(42,25),(42,69),(27,69)],[(49,25),(57,17),(63,25),(63,70),(49,70)],[(72,25),(80,17),(87,25),(88,69),(73,70)],[(4,34),(88,34),(88,39),(4,39)],[(4,59),(88,59),(88,66),(4,66)]],
    P + 'hospital': [[(24,25),(56,25),(58,68),(21,68)],[(10,31),(23,31),(23,61),(10,61)],[(59,30),(77,30),(77,61),(59,61)]],
    C + 'dog': [[(37,15),(42,16),(43,33),(51,36),(51,42),(47,45),(34,44),(26,40),(28,35),(33,32),(33,26)]],
    F + 'smoke': [[(6,22),(13,17),(14,10),(22,6),(31,9),(40,7),(46,11),(48,17),(56,20),(60,25),(62,32),(60,37),(63,43),(59,51),(49,55),(40,55),(37,60),(27,62),(22,58),(17,53),(11,53),(6,48),(6,42),(10,34)]],
    U + 'star-0': [[(28,7),(35,19),(48,21),(48,27),(38,35),(39,46),(34,47),(26,41),(15,47),(10,44),(14,33),(5,25),(7,20),(20,19)]],
    K + 'pressure-plate': [[(16,32),(44,17),(80,34),(80,43),(45,61),(15,43)]],
    P + 'cloud': [[(12,44),(12,39),(17,33),(20,31),(20,29),(24,25),(28,24),(29,21),(36,17),(43,17),(50,18),(57,22),(60,27),(61,31),(64,31),(65,34),(69,35),(73,39),(76,44),(76,50),(73,55),(67,59),(58,60),(54,63),(47,65),(41,65),(32,63),(28,59),(22,58),(17,55),(14,51)]],
    C + 'sheep': [[(20,23),(23,18),(27,17),(29,14),(34,14),(38,12),(43,13),(47,14),(50,15),(52,19),(56,21),(57,25),(58,28),(57,31),(45,31),(23,28)], [(53,33),(61,30),(68,37),(71,47),(73,44),(76,48),(73,55),(72,61),(67,69),(56,73),(42,74),(27,71),(20,67),(17,59),(15,53),(15,43),(19,36),(20,53),(26,60),(36,62),(47,55)]],
    C + 'cow': [[(28,20),(37,14),(45,15),(48,23),(50,31),(57,40),(62,45),(66,59),(60,70),(51,72),(40,70),(32,62),(27,52),(27,35)]],
    C + 'rabbit': [[(30,20),(32,29),(32,41),(40,37),(44,38),(49,31),(55,21),(58,17),(60,17),(61,21),(58,30),(52,38),(48,45),(52,52),(57,55),(60,65),(57,73),(46,76),(29,75),(21,68),(18,56),(20,49),(23,40),(24,28),(24,18),(26,15),(28,16)]],
    P + 'space-swoptop': [[(72,93),(80,65),(107,48),(124,49),(151,57),(163,73),(174,96),(174,119),(161,143),(145,150),(120,142),(91,117)]],
    P + 'igloo': [[(67,49),(89,34),(117,30),(146,35),(172,49),(188,66),(201,86),(214,112),(225,145),(228,168),(187,130),(124,104),(65,79)]],
    P + 'market-stall': [[(23,49),(164,22),(179,37),(204,68),(190,82),(45,104)]],
}
# White paper visible THROUGH these coloured structures is background, not
# white vehicle paint. Restrict removal to audited object names/regions. Bounds
# are fractions of the source crop; water-tower's white droplet stays untouched.
VOID_REGIONS = {P + name: [(0, 0, 1, 1)] for name in (
    'vine-bridge hut stone-arch big-tree banana-banner rope-bridge bridge-wood '
    'bridge-arch well-red watchtower rope-bridge2 well-blue dock-bridge '
    'sunflower ruin-arch fence-wood bridge-rope apple-cart hay-cart'
).split()}
VOID_REGIONS[P + 'water-tower'] = [(0, .55, 1, 1)]
VOID_REGIONS[P + 'market-stall'] = [(0, .36, 1, 1)]


def void_background(strict, loose, regions):
    """Return audited interior paper regions without a global white key."""
    result = np.zeros_like(strict)
    labels, _ = ndimage.label(strict)
    height, width = strict.shape
    for index, bounds in enumerate(ndimage.find_objects(labels), 1):
        if bounds is None:
            continue
        mask = labels[bounds] == index
        if mask.sum() < 20:
            continue
        ys, xs = np.nonzero(mask)
        x = (xs.mean() + bounds[1].start) / width
        y = (ys.mean() + bounds[0].start) / height
        if any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in regions):
            result[bounds] |= mask
    for _ in range(3):
        result |= ndimage.binary_dilation(result) & loose
    return result


# Explicit caption starts where the source text is too close to its object for
# generic whitespace separation. These bounds exclude text, never the subject.
CAPTION_START = {C + 'grandad-thumbs': 151, C + 'grandad-arms': 151,
                 C + 'grandad-wrench': 151, P + 'traffic-light2': 91,
                 P + 'wheels': 174, P + 'tools': 158, U + 'mission-ui': 110}

def sheet_path(pfx):
    for f in sorted(os.listdir(SRC)):
        if f.startswith(pfx + '-'):
            return os.path.join(SRC, f)
    raise SystemExit('missing sheet ' + pfx)


def masks(a, kind):
    mn, mx = a.min(2), a.max(2)
    if kind == 'card':
        loose = (mn >= 192) & (mx - mn <= 62)
        strict = (mn >= 205) & (mx - mn <= 50) & (a[:, :, 2] >= 238)
        return loose, strict
    return (mn >= 222) & (mx - mn <= 30), (mn >= 250) & (mx - mn <= 6)


def cutout(a, kind, drop_caption=False, opaque=False, shadow=False, preserve=(), voids=()):
    loose, strict = masks(a, kind)
    ink = ~loose
    if kind == 'card':
        rim = np.zeros_like(ink)
        rim[:7] = True
        rim[-7:] = True
        rim[:, :7] = True
        rim[:, -7:] = True
        pale_frame = (a.min(2) >= 160) & (a.max(2) - a.min(2) <= 95) & (a[:, :, 2] >= 220)
        ink[rim & pale_frame] = False
    ink = ndimage.binary_opening(ink, structure=np.ones((3, 3) if kind == 'card' else (2, 2)))
    if not ink.any():
        return None
    if drop_caption:
        rows = ink.any(1)
        blocks, s, last = [], None, -99
        for i, v in enumerate(rows):
            if v:
                if s is None:
                    s = i
                elif i - last > 5:
                    blocks.append((s, last + 1)); s = i
                last = i
        if s is not None:
            blocks.append((s, last + 1))
        for _ in range(2):   # one- or two-line captions
            if len(blocks) >= 2 and blocks[-1][1] - blocks[-1][0] <= max(40, int(a.shape[0] * 0.18)) and (blocks[-2][1] - blocks[0][0]) > 1.4 * (blocks[-1][1] - blocks[-1][0]):
                ink[blocks[-1][0]:, :] = False
                blocks = blocks[:-1]
                if not (blocks and blocks[-1][1] - blocks[-1][0] <= 22):
                    break
    lab, n = ndimage.label(ndimage.binary_dilation(ink, iterations=3))
    if n == 0:
        return None
    sizes = ndimage.sum(ink, lab, range(1, n + 1))
    keep = [i + 1 for i, s in enumerate(sizes) if s >= 0.03 * sizes.max()]
    own = ndimage.binary_dilation(np.isin(lab, keep) & ink, iterations=2)
    if opaque:
        own = ndimage.binary_fill_holes(ndimage.binary_dilation(own, iterations=2))
    sl_lab, _ = ndimage.label(strict)
    border = set(np.unique(np.concatenate([sl_lab[0, :], sl_lab[-1, :], sl_lab[:, 0], sl_lab[:, -1]]))) - {0}
    bg = np.isin(sl_lab, list(border)) if border else np.zeros_like(strict)
    for _ in range(3 if kind == 'card' else 1):
        bg = bg | (ndimage.binary_dilation(bg) & loose)
    if kind == 'white':
        mn, mx = a.min(2), a.max(2)
        floor = (mn >= 230) & (mx - mn <= 16)
        floor[:int(a.shape[0] * 0.72)] = False
        for _ in range(12):
            bg |= ndimage.binary_dilation(bg) & floor
    if voids:
        bg |= void_background(strict, loose, voids)
    alpha = ndimage.binary_fill_holes(own) & ~bg
    # Restore only source pixels inside measured white painted surfaces. These
    # masks do not invent colour or silhouettes; white can touch the page edge.
    if preserve:
        protection = Image.new('1', (a.shape[1], a.shape[0]), 0)
        painter = ImageDraw.Draw(protection)
        for polygon in preserve:
            painter.polygon(polygon, fill=1)
        alpha |= np.asarray(protection, dtype=bool)
    if shadow:
        # Only exterior floor pixels BELOW the last dark vehicle pixel in each
        # column. Never recolour wheels or make entire lower-body regions faint.
        mn, mx = a.min(2), a.max(2)
        dark = (mn < 105) & alpha
        bottom = np.where(dark, np.arange(a.shape[0])[:, None], -1).max(0)
        below = np.arange(a.shape[0])[:, None] > bottom[None, :]
        floor = below & (np.arange(a.shape[0])[:, None] > a.shape[0] * 0.8)
        alpha &= ~(floor & (mn > 110) & (mx - mn < 18))
    if not alpha.any():
        return None
    al = alpha.astype(np.float32)
    edge = alpha & ~ndimage.binary_erosion(alpha)
    wd = (255 - a.min(2)) / 60.0
    al[edge] = np.clip(0.35 + wd[edge], 0.35, 1.0)
    rgb = a.copy()
    im = Image.fromarray(np.dstack([rgb, (al * 255).astype(np.uint8)]).astype(np.uint8), 'RGBA')
    bb = im.getbbox()
    return im.crop(bb) if bb else None


def seps(a, axis, lo):
    mn, mx = a.min(2), a.max(2)
    line = (mn >= 195) & (mn <= 242) & (mx - mn <= 22)
    white = mn >= 243
    lf, wf = line.mean(axis=axis), (line | white).mean(axis=axis)
    idx = np.where((lf > lo) & (wf > 0.9))[0]
    g = []
    for i in idx:
        if g and i - g[-1][-1] <= 3:
            g[-1].append(i)
        else:
            g.append([i])
    return [int(np.mean(x)) for x in g]


def cells_of(a):
    H, W = a.shape[:2]
    rb = sorted(set([0] + seps(a, 1, 0.3) + [H]))
    out = []
    for y0, y1 in zip(rb[:-1], rb[1:]):
        if y1 - y0 < 60:
            continue
        cb = sorted(set([0] + seps(a[y0 + 3:y1 - 3], 0, 0.5) + [W]))
        for x0, x1 in zip(cb[:-1], cb[1:]):
            if x1 - x0 >= 30:
                out.append((x0 + 3, y0 + 3, x1 - 3, y1 - 3))
    return out


def bg_panels(a):
    mn = a.min(2)
    ink = mn < 240
    lab, n = ndimage.label(ndimage.binary_opening(ink, iterations=3))
    out = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if w > 280 and h > 200 and (lab[sl] == k).mean() > 0.85:
            out.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    out.sort(key=lambda b: (round(b[1] / 150), b[0]))
    return out


def extra_art(img, a, name, bounds, mode):
    """Preserve measured panel overhangs without adjoining source-cell pixels."""
    x0, y0, x1, y1 = bounds
    if not (0 <= x0 < x1 <= img.width and 0 <= y0 < y1 <= img.height):
        raise ValueError(f'invalid extra crop bounds for {name}')
    crop = a[y0:y1, x0:x1]
    if mode not in {'opaque', 'bo-overhang'}:
        return cutout(crop, mode, preserve=WHITE_PAINT.get(name, ()))
    art = Image.fromarray(crop).convert('RGBA')
    if mode == 'bo-overhang':
        # Sheet15 Bo crosses the panel's left gutter. Preserve the actual hat,
        # ear and hair; a wider opaque rectangle would import the snow panel.
        mask = Image.new('L', art.size, 0)
        painter = ImageDraw.Draw(mask)
        painter.rectangle((416-x0, 0, art.width-1, art.height-1), fill=255)
        outline = [(416,633),(412,638),(408,645),(404,654),(404,672),
                   (406,679),(403,684),(402,687),(402,695),(404,700),
                   (408,702),(410,708),(415,713),(416,713)]
        painter.polygon([(x-x0,y-y0) for x,y in outline], fill=255)
        art.putalpha(mask)
    return art


def items(pfx):
    img = Image.open(sheet_path(pfx)).convert('RGB')
    a = np.asarray(img)
    L = LAYOUT[pfx]
    kind = L[0]
    res = []
    if kind == 'boxes':
        for nm, (x0, y0, x1, y1), opaque in L[2]:
            if opaque:   # a ground tile: the painted square itself, corners rounded
                t = img.crop((x0 + 6, 174, x0 + 86, 250)).convert('RGBA')
                m = Image.new('L', t.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, t.width - 1, t.height - 1), radius=9, fill=255)
                t.putalpha(m); res.append((nm, t)); continue
            crop = a[y0:y1, x0:x1]
            if pfx == '03' and nm.startswith(K):
                # These are painted square tiles, including cream condition
                # tiles. Preserve their complete card art rather than leaving
                # broken patches after colour keying the card background.
                tile = Image.fromarray(crop[8:-5, 8:-8]).convert('RGBA')
                mask = Image.new('L', tile.size, 0)
                ImageDraw.Draw(mask).rounded_rectangle((0, 0, tile.width - 1, tile.height - 1), radius=7, fill=255)
                tile.putalpha(mask)
                res.append((nm, tile))
            elif nm in {K + 'fog', K + 'snow-pile', K + 'ice-patch'}:
                tile = Image.fromarray(crop[9:82, 7:87]).convert('RGBA')
                mask = Image.new('L', tile.size, 0)
                ImageDraw.Draw(mask).rounded_rectangle((0, 0, tile.width - 1, tile.height - 1), radius=7, fill=255)
                tile.putalpha(mask)
                res.append((nm, tile))
            else:
                res.append((nm, cutout(crop, 'card', preserve=WHITE_PAINT.get(nm, ()), voids=VOID_REGIONS.get(nm, ()))))
    elif kind == 'grid':
        _, rows, columns, _cap, nms = L
        height, width = a.shape[:2]
        if int(pfx) >= 25:
            bounds = cells_of(a)
            if len(bounds) != len(nms):
                raise ValueError(f'{pfx}: expected {len(nms)} measured cells, got {len(bounds)}')
        else:
            # Measured vehicle extents, excluding captions without clipping wheels.
            # Sheet 06 satellite dish crosses its printed row line at y=814.
            top_rows = {
                '04': [(3, 370), (419, 786), (826, 1185)],
                '05': [(3, 384), (423, 789), (826, 1195)],
                '06': [(3, 340), (408, 748), (806, 1169)],
                '07': [(3, 344), (420, 747), (818, 1156)],
                '08': [(3, 367), (431, 765), (826, 1175)],
            }
            bounds = [(int(width * col / columns) + 4, y0,
                       int(width * (col + 1) / columns) - 4, y1)
                      for y0, y1 in top_rows[pfx] for col in range(columns)]
        for nm, (x0, y0, x1, y1) in zip(nms, bounds):
            if nm:
                if nm == T + 'mixer':
                    y1 = min(y1, 338)  # source caption begins at y=338; wheels end above it
                res.append((nm, cutout(a[y0:y1, x0:x1], 'white', shadow=nm.startswith(T), preserve=WHITE_PAINT.get(nm, ()), voids=VOID_REGIONS.get(nm, ()))))
    elif kind == 'cells':
        cl = cells_of(a)
        nms = L[1]
        if len(cl) != len(nms):
            raise ValueError(f'{pfx}: {len(cl)} cells detected, expected {len(nms)}')
        for (x0, y0, x1, y1), nm in zip(cl, nms):
            if nm:
                crop = a[y0:y1, x0:x1]
                if nm in CAPTION_START:
                    crop = crop[:CAPTION_START[nm]]
                res.append((nm, cutout(crop, 'white', nm not in CAPTION_START, preserve=WHITE_PAINT.get(nm, ()), voids=VOID_REGIONS.get(nm, ()))))
    elif kind == 'bg':
        pn = bg_panels(a)
        nms = L[1]
        if len(pn) != len(nms):
            raise ValueError(f'{pfx}: {len(pn)} background panels, expected {len(nms)}')
        for (x0, y0, x1, y1), nm in zip(pn, nms):
            if nm and nm != '-':
                res.append((B + nm, img.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3)).convert('RGBA')))
    elif kind == 'pair':
        panels = bg_panels(a)
        if len(panels) != 2 or sum(x1 - x0 > y1 - y0 for x0, y0, x1, y1 in panels) != 1:
            raise ValueError(f'{pfx}: expected one landscape and one portrait panel')
        for (x0, y0, x1, y1) in panels:
            res.append((B + L[1] + ('-land' if x1 - x0 > y1 - y0 else '-port'), img.crop((x0 + 3, y0 + 3, x1 - 3, y1 - 3)).convert('RGBA')))
    for nm, bounds, mode in EXTRA_CELLS.get(pfx, []):
        res.append((nm, extra_art(img, a, nm, bounds, mode)))
    return res


def font(sz):
    for p in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def contact(tiles, path, bgc):
    cols, tw, th = 8, 170, 190
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * tw, max(1, rows) * th), bgc)
    d, f = ImageDraw.Draw(sheet), font(12)
    for i, (lb, t) in enumerate(tiles):
        x, y = (i % cols) * tw, (i // cols) * th
        if t is not None:
            t = t.copy(); t.thumbnail((tw - 10, th - 30))
            sheet.alpha_composite(t, (x + (tw - t.width) // 2, y + 4))
        d.text((x + 4, y + th - 20), lb[:26], fill=(255, 90, 90) if bgc[0] < 128 else (190, 0, 0), font=f)
    sheet.convert('RGB').save(path)


def main():
    dry = '--dry' in sys.argv
    only = [x for x in sys.argv[1:] if re.match(r'^\d\d$', x)]
    if any(pfx not in LAYOUT for pfx in only):
        raise ValueError('unknown or excluded sheet requested')
    os.makedirs(SCRATCH, exist_ok=True)
    written, exports = {}, {}
    for pfx in LAYOUT:
        if only and pfx not in only:
            continue
        res = items(pfx)
        tiles = []
        for original_name, im in res:
            nm = SOURCE_VARIANTS.get((pfx, original_name), original_name)
            if im is None:
                raise ValueError(f'{pfx}: empty required asset {nm}')
            if not nm.startswith(B) and max(im.size) > 512:
                im.thumbnail((512, 512), Image.LANCZOS)
            tiles.append((nm.split('/', 1)[1], im))
            if dry:
                continue
            if nm in written:
                raise ValueError(f'{pfx}: duplicate output key {nm}')
            out = os.path.join(LIB, nm + '.webp')
            encoded = io.BytesIO()
            (im.convert('RGB') if nm.startswith(B) else im).save(encoded, 'WEBP', quality=88 if nm.startswith(B) else 90, method=6)
            exports[Path(out)] = encoded.getvalue()
            written[nm] = {'file': 'assets/db/lib/' + nm + '.webp', 'w': im.width, 'h': im.height}
        contact(tiles, os.path.join(SCRATCH, 'sheet-%s-dark.png' % pfx), (34, 38, 46, 255))
        contact(tiles, os.path.join(SCRATCH, 'sheet-%s-light.png' % pfx), (250, 250, 250, 255))
        print(pfx, len(tiles), 'items')
    if not dry:
        exports[Path(SCRATCH) / 'written-metadata.json'] = json.dumps(written, indent=2).encode('utf-8')
        # No production sprite or index changes until every crop, geometry and
        # image encoding in the requested batch has succeeded.
        if not only and '--assets-only' not in sys.argv:
            publish(INDEX, index_entries(written), exports, index_helper())
        else:
            replace_batch(exports)
    print('written', len(written))


def index_entries(written):
    """Build owned entries without reading or mutating either shared index."""
    result = {}
    for key, value in written.items():
        category, name = key.split('/', 1)
        result[key] = {'file': value['file'], 'cat': category,
                       'tags': name.split('-') + ['mojo', 'cartoon'],
                       'source': SRCTAG, 'w': value['w'], 'h': value['h']}
    return result


def index_helper():
    """Use the common JS renderer; tests can direct both indexes to fixtures."""
    path = Path(ROOT) / 'tools' / 'ingest-asset-sheets.py'
    spec = importlib.util.spec_from_file_location('mojo_asset_index_renderer', path)
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    helper.JS = AIDX
    return helper


if __name__ == '__main__':
    main()
