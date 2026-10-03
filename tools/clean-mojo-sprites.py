#!/usr/bin/env python3
"""
Clean the G31 Mojo Swoptops cut-outs: trapped sheet-background holes and light edge halos.

    ~/.venvs/kokoro/bin/python tools/clean-mojo-sprites.py            # rewrite changed sprites in place
    ~/.venvs/kokoro/bin/python tools/clean-mojo-sprites.py --dry      # report only, write nothing
    ~/.venvs/kokoro/bin/python tools/clean-mojo-sprites.py --sheets DIR   # before/after contact sheets into DIR
    ~/.venvs/kokoro/bin/python tools/clean-mojo-sprites.py --only mojo-top/crane

Why a second pass: tools/ingest-mojo-sheets.py cuts each sprite from the owner sheet by flooding the page colour
in from the crop border. Page colour that is ENCLOSED by the art (the triangle between a crane boom, its hook and
the cab; the gap between Bo's arm and body; wheel spokes; railing panels) is never reached by that flood, so it
stays opaque and shows as a white slab on a dark screen. The same ingest keeps a 1-2 px ring of light page pixels
around every silhouette (its ink mask is dilated by 2 px), which reads as a white halo on the navy HUD.

Method (deterministic, idempotent; the output depends only on the owner sheets plus the audit below):
  1. Re-run the ingest crop for every non-background sprite (same code, same crop, same alpha) so this pass sees
     the full-precision source pixels, not the lossy WebP.
  2. HOLES: a component of pixels within 8 levels of the crop's own sheet-background colour is cleared only when
     one of its audited seed points is listed in CLEAR_HOLES. There is NO global white key and no heuristic
     "large flat white = background" rule: in these renders a white panel, an eye white, a picket or a sign face
     has exactly the page value (254) with the same noise, so every such component was judged by eye and listed
     in CLEAR_HOLES or KEEP_WHITE. The ingest's measured WHITE_PAINT polygons always win over a hole seed.
  3. HALO: pixels within 3 px of transparency are un-premultiplied against the known page colour B. The foreground
     F is estimated twice (the most saturated/dark pixel of the 5x5 window, and the nearest interior pixel); the
     new alpha is the LARGER of the two projections (C-B).(F-B)/|F-B|^2, and only ever lowers alpha. Where F is
     itself near-white (|F-B| < 30: white paint touching the edge) nothing changes, so white art is never eroded.
     Dark outlines project to >= 1 and stay whole.
  4. Sizes, names and paths are unchanged (the asset index is untouched). WebP quality 92, encoded once from the
     owner source (not from the lossy committed file). A sprite is written only when its encoded bytes differ; the
     opaque interior must stay >= 36 dB of the committed sprite AND at least as close to the owner source as the
     committed sprite was (a > 40 dB match to the committed file is unreachable for ANY lossy re-encode: two
     4:2:0 WebP encodes of the same art differ by 38-43 dB; lossless would triple the file sizes).

New art: when a re-ingest produces a new near-white component, qa-mojo-art.py fails until it is audited here
(add its seed to CLEAR_HOLES or KEEP_WHITE). Seeds are sprite-pixel coordinates "x,y" inside the component.
"""
import argparse, importlib.util, io, math, os, sys
from pathlib import Path
from unittest import mock
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
LIB = ROOT / 'assets' / 'db' / 'lib'
CATEGORIES = ('mojo-top', 'mojo-char', 'mojo-prop', 'mojo-ui', 'mojo-fx', 'mojo-tile')
HOLE_TOL = 8          # max channel distance from the page colour for a hole pixel
MIN_AREA = 41         # holes above ~40 px are audited; smaller specks are left to the halo pass
BAND = 3.0            # halo band width in px from transparency
WHITE_FG = 30.0       # |F-B| below this = white paint at the edge -> never touched
QUALITY = 92
HOLE_GROW = 3        # px an audited hole may grow into touching near-page (>= 236, neutral) pixels
# Audited floor scraps (sprite px boxes x0,y0,x1,y1): light floor beside a foot that the ingest kept opaque.
FLOOR_REMNANTS = {
    'mojo-char/bo': [(70, 360, 84, 377)],   # right of the left heel (owner phone test 2026-10-03)
}
MIX_DEPTH = 2.0      # mid-tone page mix is looked for only in the outer 2 px (the ingest dilates its ink by 2 px)
MIX_MIN = 0.15       # ... and only where the pixel is pulled >= 15% of the way from its interior colour to the page
MIX_LUM = 12.0       # ... and is >= 12 luma levels lighter than that interior colour
LUMA = np.float32([0.299, 0.587, 0.114])
MIN_MOVED = 10      # a sprite is rewritten only when >= 10 pixels change alpha by >= 32 levels
# The halo pass runs where the art has no deliberate white stroke. UI captions/buttons, FX glows and painted
# tiles DO carry white outlines, which are indistinguishable from page-colour halo at the pixel level (both are
# ~254 against a 254 page), so those keep the ingest edge and only get hole clearing.
HALO_CATEGORIES = ('mojo-top', 'mojo-char', 'mojo-prop')
HALO_EXEMPT = set()
MIN_PSNR = 36.0      # new vs committed sprite, opaque interior (two lossy 4:2:0 encodes differ ~38-43 dB)
MAX_FIDELITY_LOSS = 0.5  # dB: new vs owner source may not be worse than committed vs owner source

# Audited background holes (sprite px). Judged by eye on source crops, 2026-10-01.
CLEAR_HOLES = {
    'mojo-char/bo': '56,187 119,196 96,344',
    'mojo-char/bo-celebrate': '91,95 61,139 80,176',
    'mojo-char/bo-goggles': '102,114 116,75 41,138 66,172',
    'mojo-char/bo-main': '52,192',
    'mojo-char/bo-sheet10': '35,150 86,154 60,192',
    'mojo-char/bo-sit': '29,129',
    'mojo-char/bo-surprised': '63,158',
    'mojo-char/bo-tablet': '55,158 68,188',
    'mojo-char/bo-think': '118,344',
    'mojo-char/bo-think2': '69,186',
    'mojo-char/bo-thumbs': '82,109 29,126 57,172',
    'mojo-char/bo-tools': '62,150 31,197 146,204 111,269 114,286 122,332',
    'mojo-char/bo-wave': '57,91 142,156 128,182 92,253',
    'mojo-char/bo-wink': '75,150',
    'mojo-char/build-bot': '103,53',
    'mojo-char/grandad': '44,87 158,167 101,251',
    'mojo-char/grandad-sheet10': '39,83 148,145 97,229',
    'mojo-char/grandad-wrench': '26,61',
    'mojo-char/grandad2': '34,69 68,182',
    'mojo-char/mechanic-bot': '36,39',
    'mojo-char/neon': '100,121 69,250',
    'mojo-char/neon2': '84,95 55,164',
    'mojo-char/oona': '44,77',
    'mojo-char/oona-play': '28,56',
    'mojo-char/oona-run': '39,69 41,126',
    'mojo-char/oona-sheet10': '41,79',
    'mojo-char/painter-bot': '46,89 95,83',
    'mojo-char/race-bot': '93,35 63,137',
    'mojo-fx/mud-splash': '28,29 16,58',
    'mojo-fx/repair-sparks': '10,70',
    'mojo-prop/attachments': '139,73 131,86',
    'mojo-prop/banana-banner': '55,70',
    'mojo-prop/banana-crate': '3,56',
    'mojo-prop/banner-steps': '138,40 119,116',
    'mojo-prop/barrier2': '29,39 75,42',
    'mojo-prop/battery': '2,83',
    'mojo-prop/bell': '27,65',
    'mojo-prop/bridge-road': '34,70',
    'mojo-prop/bridge-wood': '187,64',
    'mojo-prop/bridge2': '62,33',
    'mojo-prop/bumpers': '44,71 29,76 153,76',
    'mojo-prop/bush-flowers': '126,0',
    'mojo-prop/cactus': '56,87 147,108',
    'mojo-prop/cactus2': '79,93 79,159',
    'mojo-prop/cement-swoptop': '61,148',
    'mojo-prop/chevron': '9,47 58,49',
    'mojo-prop/coin-crown': '47,12',
    'mojo-prop/collectibles': '152,54',
    'mojo-prop/collectibles2': '145,101',
    'mojo-prop/cone-barrier': '163,63',
    'mojo-prop/construction-swoptop': '55,86 100,75 119,183',
    'mojo-prop/crate2': '87,30',
    'mojo-prop/crates': '157,84',
    'mojo-prop/crystal-rocks': '173,113',
    'mojo-prop/decal-flame-sheet12': '86,22',
    'mojo-prop/env-props': '235,16 297,29 74,72',
    'mojo-prop/exhaust': '31,42',
    'mojo-prop/exhausts': '16,68',
    'mojo-prop/face-panels': '64,56 89,18',
    'mojo-prop/fan': '39,67',
    'mojo-prop/fence2': '17,30 42,29 69,31',
    'mojo-prop/flower-cactus': '78,92 135,114',
    'mojo-prop/fountain': '153,110 64,112 130,122',
    'mojo-prop/gear': '35,37',
    'mojo-prop/gear-sheet15': '31,33',
    'mojo-prop/grass-tuft': '170,73',
    'mojo-prop/hay-cart': '162,133 172,148',
    'mojo-prop/haystack2': '78,42',
    'mojo-prop/headlights': '115,15',
    'mojo-prop/lantern-post': '98,49 27,86',
    'mojo-prop/level-markers': '18,25',
    'mojo-prop/magnet2': '39,38',
    'mojo-prop/materials': '151,18 90,72',
    'mojo-prop/mission-items': '234,64',
    'mojo-prop/mod-cargo': '0,51',
    'mojo-prop/mod-crane': '23,30',
    'mojo-prop/mod-drill': '68,66',
    'mojo-prop/monkey-orange': '66,215',
    'mojo-prop/monkey-red': '133,55 90,223',
    'mojo-prop/multiplier': '37,34',
    'mojo-prop/mushrooms': '123,104',
    'mojo-prop/obstacles': '241,44 229,71 210,100',
    'mojo-prop/palm': '149,20 41,50 112,96',
    'mojo-prop/potion': '118,75 142,112',
    'mojo-prop/race-swoptop': '154,34 131,33 61,146',
    'mojo-prop/road-barrier': '34,40',
    'mojo-prop/roofs': '50,5',
    'mojo-prop/ruin-pillar': '81,146',
    'mojo-prop/seats': '157,13',
    'mojo-prop/sign-left': '1,85',
    'mojo-prop/signpost': '46,64',
    'mojo-prop/sirens': '114,120',
    'mojo-prop/space-swoptop': '74,156',
    'mojo-prop/spoilers': '20,30',
    'mojo-prop/status-icons': '242,73',
    'mojo-prop/stone-block': '188,32',
    'mojo-prop/street-lamp': '29,18',
    'mojo-prop/sunflower': '109,196',
    'mojo-prop/swap-stand': '32,51 60,32 131,34 153,39',
    'mojo-prop/swoptop-faces': '170,11 20,47 203,54 157,61 171,65',
    'mojo-prop/swoptops-example': '43,44 174,147 170,207',
    'mojo-prop/tires': '120,62 61,68',
    'mojo-prop/toolbox': '75,14',
    'mojo-prop/town-house-sheet13': '40,17',
    'mojo-prop/track-tiles': '351,12 98,26 244,67 13,77 79,121',
    'mojo-prop/treehouse': '31,76',
    'mojo-prop/vine-bridge': '43,103',
    'mojo-prop/water-tower': '43,42 118,137 153,154',
    'mojo-prop/wheels': '247,79',
    'mojo-prop/workbench': '39,36 181,38 188,98',
    'mojo-top/aerial-ladder': '158,94',
    'mojo-top/balloon': '148,100 240,130 202,147',
    'mojo-top/base': '216,86 13,190',
    'mojo-top/bridge': '287,25 321,23 174,28 199,28 137,39 117,33 159,43 325,45 199,113 275,100 253,134 263,210 23,207',
    'mojo-top/camera': '176,13 195,12 327,29 170,97 231,304 217,306',
    'mojo-top/cargo-crane': '180,6 208,66 271,67 22,192',
    'mojo-top/crane': '135,100 87,120',
    'mojo-top/dozer': '169,63 229,126',
    'mojo-top/drill': '236,48 222,101 266,122',
    'mojo-top/drilling': '26,173',
    'mojo-top/farm': '318,82 308,114',
    'mojo-top/fire': '164,59 297,151 298,212',
    'mojo-top/forklift': '129,34 129,74',
    'mojo-top/jet': '205,60',
    'mojo-top/jumper': '170,34 140,38 195,60 118,265',
    'mojo-top/lift': '67,10 90,11 50,14 24,21 25,45',
    'mojo-top/logging': '198,47',
    'mojo-top/monster': '222,41 181,47 147,52',
    'mojo-top/racer': '254,25 144,41 250,48 222,55',
    'mojo-top/rescue': '209,60 318,56 231,66 276,58',
    'mojo-top/satellite': '233,33 222,327',
    'mojo-top/searchlight': '276,126 244,125 22,208',
    'mojo-top/space-lab': '255,106',
    'mojo-top/towing': '207,108',
    'mojo-top/tree-cutter': '181,88 18,192',
    'mojo-top/wrecking-ball': '277,43 204,138 238,165',
    'mojo-ui/btn-nav': '107,20 120,24',
    'mojo-ui/buttons': '1,17',
    'mojo-ui/customize-ui': '1,7',
    'mojo-ui/feedback-icons': '152,34',
    'mojo-ui/map-ui': '149,9 149,48',
    'mojo-ui/mission-panel': '0,10 21,29',
    'mojo-ui/mission-ui': '0,28',
    'mojo-ui/progress-green-sheet15': '75,35',
    'mojo-ui/reward-panel': '1,23',
    'mojo-ui/settings-panel': '2,7',
}

# Audited genuine white art that has the page colour (eye whites, white paint, pickets, sign faces, foam, UI glyphs).
KEEP_WHITE = {
    'mojo-ui/ring': '23,25',   # pale shaded disc, not a flat card-colour slab (clearing leaves a ragged blob)
    'mojo-char/bo': '57,66',
    'mojo-char/bo-main': '34,40',
    'mojo-char/bo-sheet10': '43,55 57,137',
    'mojo-char/bo-sit': '40,48',
    'mojo-char/bo-surprised': '32,62',
    'mojo-char/bo-thumbs': '43,41',
    'mojo-char/bo-wink': '31,64',
    'mojo-char/grandad-sheet10': '73,48',
    'mojo-char/neon': '32,70',
    'mojo-char/neon2': '23,62',
    'mojo-char/oona2': '43,45',
    'mojo-char/rabbit': '5,55',
    'mojo-fx/boost-flame-sheet13': '32,44',
    'mojo-fx/effects': '99,91',
    'mojo-fx/fireworks': '10,22 66,20 47,36 7,26 88,37 27,38',
    'mojo-fx/invalid': '24,20 44,17 21,42 40,43',
    'mojo-fx/level-up': '37,31',
    'mojo-fx/repair': '45,37',
    'mojo-fx/repair-sparks': '85,54',
    'mojo-fx/skid': '90,11 90,25',
    'mojo-fx/smoke': '11,6',
    'mojo-fx/speed-trail': '64,7 80,26 63,41',
    'mojo-prop/bird-blue': '116,55',
    'mojo-prop/bush-flowers': '105,72 123,79 90,81 118,96 166,106 154,116 185,120 156,128 176,134',
    'mojo-prop/bush3': '105,55 114,62 100,72 113,72 157,109 148,118 172,121 150,130 168,137',
    'mojo-prop/cloud': '34,20 44,29 4,28 31,34',
    'mojo-prop/decal-flag-sheet12': '31,57',
    'mojo-prop/diamond': '117,21',
    'mojo-prop/exhausts': '82,111',
    'mojo-prop/ice-crystal': '163,62 149,69 111,140 165,180 61,181',
    'mojo-prop/ice-crystals': '122,55 87,70 146,144 84,163 136,202',
    'mojo-prop/igloo': '84,6 157,38 133,34 176,31 175,54 142,60 185,69 46,144 90,153 76,166',
    'mojo-prop/invincibility': '25,11',
    'mojo-prop/medal-sheet15': '26,13',
    'mojo-prop/monkey-white': '127,92',
    'mojo-prop/mushrooms': '120,30',
    'mojo-prop/potion': '103,109',
    'mojo-prop/race-swoptop': '88,101 20,105',
    'mojo-prop/sign-speed': '29,18 19,34',
    'mojo-prop/sign-stop': '19,3 11,25 33,24 49,25 55,43',
    'mojo-prop/sign-yield': '5,0 24,17',
    'mojo-prop/space-swoptop': '84,49 80,111 17,114',
    'mojo-prop/spoiler': '33,14 69,16',
    'mojo-prop/stickers': '36,29 14,30',
    'mojo-prop/time-extend': '28,40',
    'mojo-prop/water-tower': '110,69',
    'mojo-prop/waterfall': '116,55 106,179 58,199 133,193 108,197',
    'mojo-prop/waterfall2': '133,60 92,63 117,64 154,164 91,166 109,178 120,181 73,190 137,194',
    'mojo-prop/waterfall3': '148,56 121,59 113,169 154,158 134,166 171,181 95,159',
    'mojo-tile/barrier': '52,31',
    'mojo-tile/fence': '25,8 81,8 3,8 2,31',
    'mojo-tile/fire': '84,25',
    'mojo-tile/storm': '64,34 33,30',
    'mojo-tile/time-bonus': '19,15',
    'mojo-top/aerial-ladder': '98,15 119,262 17,264',
    'mojo-top/ambulance': '243,50 112,210 12,208',
    'mojo-top/balloon': '112,258 16,247',
    'mojo-top/base': '25,192',
    'mojo-top/base-sheet04': '127,157 16,159',
    'mojo-top/base-sheet05': '126,182 15,182',
    'mojo-top/base-sheet10': '90,132 19,136',
    'mojo-top/boat': '259,96 287,126 264,132 129,241 15,245',
    'mojo-top/bridge': '124,247 12,251',
    'mojo-top/camera': '113,235 15,238',
    'mojo-top/cargo-crane': '115,240 17,238',
    'mojo-top/chopper': '129,255 17,261',
    'mojo-top/crane': '126,270 18,275',
    'mojo-top/delivery': '117,206 12,210',
    'mojo-top/dozer': '127,223 15,225',
    'mojo-top/drill': '113,240 12,239',
    'mojo-top/drilling': '134,24 115,222 19,224',
    'mojo-top/dumper': '126,236 12,240',
    'mojo-top/farm': '110,195 12,195',
    'mojo-top/fire': '212,74 129,240 16,240',
    'mojo-top/forklift': '140,210 231,212',
    'mojo-top/fuel': '235,44 200,38 308,56 117,222 16,221 188,31',
    'mojo-top/garbage': '289,121 116,229 17,225',
    'mojo-top/ice-cream': '227,75 291,82 302,84 115,228 15,226',
    'mojo-top/jet': '270,184 320,187 280,198 124,228 11,234',
    'mojo-top/jumper': '144,197 36,198',
    'mojo-top/lift': '128,256 21,254',
    'mojo-top/logging': '115,220 13,224',
    'mojo-top/mixer': '236,34 199,52 273,122 112,211 11,213',
    'mojo-top/monster': '151,223 35,225',
    'mojo-top/police': '114,222 12,215',
    'mojo-top/racer': '21,212 134,214',
    'mojo-top/recycling': '259,98 274,108 249,134 269,149 118,224 18,225',
    'mojo-top/rescue': '108,249 11,247',
    'mojo-top/rocket': '211,19 246,27 213,50 125,234 17,236',
    'mojo-top/satellite': '130,9 104,267 12,258 7,272',
    'mojo-top/searchlight': '201,43 215,51 226,57 125,255 11,255',
    'mojo-top/snow-plow': '113,228 16,228',
    'mojo-top/space-lab': '111,245 17,240',
    'mojo-top/submarine': '122,248 15,251',
    'mojo-top/sweeper': '245,49 329,68 138,212 37,208',
    'mojo-top/towing': '252,156 113,227 16,224',
    'mojo-top/tree-cutter': '105,238 13,233',
    'mojo-top/water': '176,71 220,76 247,111 129,231 22,229',
    'mojo-top/workshop': '129,235 20,233',
    'mojo-top/wrecking-ball': '120,259 14,265',
    'mojo-ui/back-sheet15': '39,23',
    'mojo-ui/blank-green-sheet15': '0,19',
    'mojo-ui/btn-customize': '27,29',
    'mojo-ui/btn-garage': '30,22 21,34',
    'mojo-ui/btn-hapus': '54,18',
    'mojo-ui/btn-jalan': '57,32 50,66 93,66',
    'mojo-ui/btn-langkah': '51,34 67,35',
    'mojo-ui/btn-main': '42,32 152,33 294,33',
    'mojo-ui/btn-missions': '33,19 101,33',
    'mojo-ui/btn-play': '35,22 70,27 54,29',
    'mojo-ui/btn-reset': '48,27 71,32',
    'mojo-ui/btn-settings': '36,9 124,11 226,8',
    'mojo-ui/buttons': '38,20 107,17 70,75 105,77 179,77',
    'mojo-ui/coin-counter': '185,27 86,20 76,24 106,31',
    'mojo-ui/confirm-sheet11': '86,55',
    'mojo-ui/customize-ui': '124,41 17,42 103,55 29,56 60,57 89,69 52,38 86,39',
    'mojo-ui/forbidden': '30,17 14,26',
    'mojo-ui/home-sheet15': '53,26',
    'mojo-ui/hud': '197,44 112,65 85,67',
    'mojo-ui/ico-info': '19,23',
    'mojo-ui/ico-pengaturan': '22,25',
    'mojo-ui/icons': '15,9 97,6 151,70 223,87',
    'mojo-ui/level-select-sheet13': '112,55 154,54',
    'mojo-ui/map-sheet15': '41,23 76,24',
    'mojo-ui/menu-buttons': '125,34 38,41 175,34 0,36',
    'mojo-ui/mission-ui': '22,45 40,75 180,83 200,43',
    'mojo-ui/next-sheet15': '45,24',
    'mojo-ui/play-sheet15': '67,28',
    'mojo-ui/pulse': '12,14 38,10',
    'mojo-ui/ripple': '12,36',
    'mojo-ui/settings-panel': '25,38',
    'mojo-ui/settings-sheet15': '56,18 1,30',
    'mojo-ui/star-counter': '74,21 99,31 110,22',
    'mojo-ui/upgrade-token': '20,27',
}


def _pts(value):
    return [tuple(int(v) for v in p.split(',')) for p in value.split()]


def load_ingest():
    sys.path.insert(0, str(ROOT / 'tools'))
    spec = importlib.util.spec_from_file_location('mojo_ingest_for_clean', ROOT / 'tools' / 'ingest-mojo-sheets.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def source_crops(only=None):
    """Yield (name, rgb crop, full-crop alpha, bbox, preserve polygons) for every cut-out sprite."""
    m = load_ingest()
    original = m.cutout

    def capture(a, kind, *args, **kw):
        with mock.patch.object(Image.Image, 'getbbox', lambda im: (0, 0, im.width, im.height)):
            full = original(a, kind, *args, **kw)
        if full is None:
            return None
        return ('cut', a, np.asarray(full)[..., 3].copy(), full.getbbox(), kw.get('preserve', ()), kind)

    with mock.patch.object(m, 'cutout', capture):
        for prefix, layout in m.LAYOUT.items():
            for name, item in m.items(prefix):
                key = m.SOURCE_VARIANTS.get((prefix, name), name)
                if key.startswith(m.B) or not isinstance(item, tuple):
                    continue   # painted backgrounds and opaque panels/tiles carry no page colour
                if only and key not in only:
                    continue
                _, a, alpha, bbox, preserve, kind = item
                # Element-library cards (sheets 02/03) sit on a light-blue card, not the white page: their cream
                # and white art is only ~30 levels from that card colour, too close to un-premultiply safely.
                yield key, a, alpha, bbox, tuple(preserve) + (('card',) if kind == 'card' else ())


def page_colour(a, alpha):
    exterior = ndimage.binary_erosion(alpha == 0, iterations=2)
    px = a[exterior]
    if len(px) < 50:
        px = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    light = px[px.min(1) >= np.percentile(px.min(1), 50)]
    return np.median(light, axis=0).astype(np.float32)


def hole_components(a, alpha, bg):
    dist = np.abs(a.astype(np.int16) - bg.astype(np.int16)).max(2)
    labels, _ = ndimage.label((alpha > 0) & (dist <= HOLE_TOL), structure=np.ones((3, 3)))
    return labels, dist


def preserved(shape, polygons):
    mask = Image.new('1', (shape[1], shape[0]), 0)
    painter = ImageDraw.Draw(mask)
    for polygon in polygons:
        painter.polygon(polygon, fill=1)
    return np.asarray(mask, dtype=bool)


def clear_holes(name, a, alpha, bbox, preserve, bg, report):
    labels, _ = hole_components(a, alpha, bg)
    alpha = alpha.copy()
    x0, y0 = bbox[:2]
    keep_paint = preserved(alpha.shape, preserve) if preserve else None
    for x, y in _pts(CLEAR_HOLES.get(name, '')):
        label = labels[y + y0, x + x0] if 0 <= y + y0 < alpha.shape[0] and 0 <= x + x0 < alpha.shape[1] else 0
        if not label:
            report.append(f'{name}: hole seed {x},{y} no longer on page colour (re-audit)')
            continue
        region = labels == label
        # the page sliver that a slightly darker (>8 levels) seam cut off from the audited hole (Bo's akimbo arm
        # kept a 3x4 px white fleck at the top of its cleared gap): near-page neutral pixels touching the hole,
        # grown at most HOLE_GROW px, go with it
        sub = a.astype(np.int16)
        paperish = (alpha > 0) & (sub.min(2) >= 236) & (sub.max(2) - sub.min(2) <= 12)
        region = ndimage.binary_dilation(region, iterations=HOLE_GROW, mask=paperish | region)
        if keep_paint is not None:
            region &= ~keep_paint
        alpha[region] = 0
    return alpha


def floor_below_holes(a, before, after, bbox):
    """Floor shading that continues straight down out of a cleared hole (between legs, between wheels).

    Column by column, from the lowest cleared pixel downward, while the pixel is solid, neutral and light, and
    ONLY when that walk ends at transparency within 30 px (it really was the floor strip under the gap). A walk
    that runs into coloured art or another part (a fence rail, a picket) is discarded whole.
    """
    cleared = (before > 0) & (after == 0)
    mask = np.zeros_like(cleared)
    if not cleared.any():
        return mask
    sub = a.astype(np.int16)
    mn, mx = sub.min(2), sub.max(2)
    neutral = (after > 0) & (mx - mn <= 12) & (mn >= 120)
    y0, y1 = bbox[1], bbox[3]
    for x in np.nonzero(cleared.any(0))[0]:
        y = int(np.nonzero(cleared[:, x])[0].max()) + 1
        if y < y0 + 0.85 * (y1 - y0):
            continue   # the gap ends above the feet/wheels: whatever is below it is art (a rail), not floor
        run = []
        while y < a.shape[0] and neutral[y, x] and len(run) <= 30:
            run.append(y)
            y += 1
        if run and len(run) <= 30 and (y >= a.shape[0] or after[y, x] == 0):
            mask[run, x] = True
    return mask


def to_shadow(a, rgb, alpha, mask, bg):
    """A grey floor pixel of lightness L over page colour B is exactly black at alpha (B-L)/B."""
    if not mask.any():
        return rgb, alpha
    page = float(bg.mean())
    shade = np.clip((page - a.astype(np.float32).mean(2)) / page, 0.0, 1.0)
    rgb, alpha = rgb.copy(), alpha.copy()
    rgb[mask] = 0
    alpha[mask] = np.minimum(alpha[mask], np.rint(shade[mask] * 255)).astype(np.uint8)
    return rgb, alpha


def decontaminate(a, alpha, bg, tint_only=False):
    """Lower alpha of light edge pixels by un-premultiplying against the page colour."""
    af = a.astype(np.float32)
    solid = alpha > 0
    exterior = ~solid
    if not exterior.any():
        return a, alpha
    depth = ndimage.distance_transform_edt(solid)
    band = solid & (depth <= BAND)
    interior = solid & (depth > BAND)
    diff = af - bg
    strength = np.sqrt((diff ** 2).sum(2))
    # F1: strongest foreground pixel in the 5x5 window (solid pixels only)
    score = np.where(solid, strength, -1.0)
    best = ndimage.maximum_filter(score, size=5)
    ys, xs = np.nonzero(band)
    f1 = np.zeros((len(ys), 3), np.float32)
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            yy = np.clip(ys + dy, 0, a.shape[0] - 1); xx = np.clip(xs + dx, 0, a.shape[1] - 1)
            hit = (score[yy, xx] == best[ys, xs]) & (score[yy, xx] >= 0)
            f1[hit] = af[yy[hit], xx[hit]]
    # F2: nearest interior pixel (the body colour behind a halo)
    if interior.any():
        _, (iy, ix) = ndimage.distance_transform_edt(~interior, return_indices=True)
        f2 = af[iy[ys, xs], ix[ys, xs]]
    else:
        f2 = f1
    c = af[ys, xs] - bg

    def project(f):
        fb = f - bg
        n2 = (fb ** 2).sum(1)
        est = (c * fb).sum(1) / np.maximum(n2, 1.0)
        est[(np.sqrt(n2) < WHITE_FG) | (f.min(1) >= 232)] = 1.0   # near-white foreground: white paint/fur, leave it
        return np.clip(est, 0.0, 1.0)

    est = np.maximum(project(f1), project(f2))
    # Light PAINT reaching the silhouette (white flag squares, grey pickets, white body panels): a light pixel
    # that connects, through light pixels, to light art lying deeper than any halo (>= 3 px in) is paint.
    light = solid & (strength <= 40)
    paint = light & (depth >= 3)
    protect = ndimage.binary_dilation(paint, iterations=3, mask=light) | paint
    est[protect[ys, xs]] = 1.0
    # A LIGHT pixel (every channel >= 200) at the edge may be a page-colour halo. A MID-TONE pixel may be one too
    # (2026-10-03, owner: "there's still white here" on Bo's jeans/hair and the film Mojo's body): blue jeans
    # mixed half-and-half with the white page are (179,225,253), min 179, and the old light-only gate kept that
    # opaque, so every coloured silhouette carried a pale 1-2 px rim that reads as a white outline when the
    # sprite is shown 2-3x on a phone. A mid-tone edge pixel is treated as page mix only when it lies within
    # MIX_DEPTH px of transparency AND is measurably pulled from its interior colour F2 toward the page
    # (projection of C-F2 onto B-F2 >= MIX_MIN and >= MIX_LUM levels lighter); an outline darker than the
    # body, or the art's own anti-aliasing against a darker part, is never pulled toward the page and stays.
    pix = a[ys, xs].astype(np.float32)
    toward = bg - f2
    pull = ((pix - f2) * toward).sum(1) / np.maximum((toward ** 2).sum(1), 1.0)
    lighter = pix @ LUMA - f2 @ LUMA
    mixed = (depth[ys, xs] <= MIX_DEPTH) & (pull >= MIX_MIN) & (lighter >= MIX_LUM)
    est[(pix.min(1) < 200) & ~mixed] = 1.0
    if tint_only:
        # Light-blue card page (sheets 02/03): a halo pixel carries the card's blue cast. White/cream art does
        # not, so it is never faded however close its lightness is.
        px = a[ys, xs].astype(np.int16)
        cast = float(bg[2] - bg[0])
        est[(px[:, 2] - px[:, 0]) < 0.6 * cast] = 1.0
    old = alpha[ys, xs].astype(np.float32) / 255.0
    new = np.minimum(old, est)
    lower = new < old - 1e-3
    out_alpha = alpha.copy()
    out_rgb = a.copy()
    if lower.any():
        ly, lx = ys[lower], xs[lower]
        na = new[lower]
        fg = np.where((na >= 0.25)[:, None],
                      (af[ly, lx] - (1 - na)[:, None] * bg) / np.maximum(na, 1e-3)[:, None],
                      f1[lower])
        # recompute the edge colour from the interior: an un-premultiplied colour that is still LIGHTER than the
        # body behind it would bring the pale rim back at partial alpha, so it takes the interior colour F2
        f2l = f2[lower]
        relit = (fg @ LUMA) > (f2l @ LUMA) + 10
        fg[relit] = f2l[relit]
        out_rgb[ly, lx] = np.clip(np.rint(fg), 0, 255).astype(np.uint8)
        out_alpha[ly, lx] = np.rint(na * 255).astype(np.uint8)
    # A halo is at most 2 px thick (the ingest dilates its ink by 2 px). Where the pass took out a region a 3x3
    # block fits into, it was eating light PAINT at the silhouette (white flag squares, a grey picket, a cone
    # stripe), not a fringe: put those pixels and their 1 px surround back exactly as the ingest had them.
    faded = (alpha >= 200) & (out_alpha < 128)
    thick = ndimage.binary_opening(faded, structure=np.ones((3, 3)))
    if thick.any():
        revert = ndimage.binary_dilation(thick, iterations=2) & (out_alpha != alpha)
        out_alpha[revert] = alpha[revert]
        out_rgb[revert] = a[revert]
    return out_rgb, out_alpha


def floor_shadow(a, rgb, alpha, bbox, bg):
    """Vehicle contact shadows: grey floor below the art becomes a translucent BLACK shadow.

    Per column, only neutral light pixels BELOW the lowest dark (tyre/chassis) or coloured pixel, in the lower
    half of the sprite. A grey floor pixel of lightness L over page colour B is exactly black at alpha (B-L)/B,
    so the shadow keeps its shape and reads correctly on any backdrop instead of as a pale grey slab.
    """
    x0, y0, x1, y1 = bbox
    sub = a[y0:y1, x0:x1].astype(np.int16)
    solid = alpha[y0:y1, x0:x1] > 0
    mn, mx = sub.min(2), sub.max(2)
    art = solid & ((mn < 105) | (mx - mn > 30))
    rows = np.arange(sub.shape[0])[:, None]
    lowest = np.where(art, rows, -1).max(0)
    lowest = ndimage.maximum_filter1d(lowest, size=5)
    below = rows > lowest[None, :]
    floor = solid & below & (rows > sub.shape[0] * 0.5) & (mx - mn <= 18) & (mn >= 110)
    full = np.zeros(alpha.shape, dtype=bool)
    full[y0:y1, x0:x1] = floor
    return to_shadow(a, rgb, alpha, full, bg)


def floor_remnants(name, a, alpha, bbox, preserve):
    """Audited floor scraps beside a foot (FLOOR_REMNANTS): light floor the ingest kept opaque because it touches a
    white sole. They become translucent BLACK floor through to_shadow, never a pale smear."""
    mask = np.zeros(alpha.shape, bool)
    x0, y0 = bbox[:2]
    for bx0, by0, bx1, by1 in FLOOR_REMNANTS.get(name, ()):
        mask[by0 + y0:by1 + y0, bx0 + x0:bx1 + x0] = True
    sub = a.astype(np.int16)
    mask &= (alpha > 0) & (sub.min(2) >= 200) & (sub.max(2) - sub.min(2) <= 14)
    if preserve:
        mask &= ~preserved(alpha.shape, preserve)
    return mask


def clean(name, a, alpha, bbox, preserve, report):
    card = 'card' in preserve
    preserve = tuple(p for p in preserve if p != 'card')
    bg = page_colour(a, alpha)
    ingest_alpha = alpha
    alpha = clear_holes(name, a, alpha, bbox, preserve, bg, report)
    hole_floor = floor_below_holes(a, ingest_alpha, alpha, bbox)
    if name in HALO_EXEMPT:
        rgb = a
    elif card:
        rgb, alpha = decontaminate(a, alpha, bg, tint_only=True)
    elif name.split('/')[0] in HALO_CATEGORIES:
        rgb, alpha = decontaminate(a, alpha, bg)
    else:
        rgb = a
    rgb, alpha = to_shadow(a, rgb, alpha, hole_floor | floor_remnants(name, a, alpha, bbox, preserve), bg)
    if name.startswith('mojo-top/'):
        rgb, alpha = floor_shadow(a, rgb, alpha, bbox, bg)
    x0, y0, x1, y1 = bbox
    return Image.fromarray(np.dstack([rgb, alpha])[y0:y1, x0:x1].astype(np.uint8), 'RGBA'), bg


def psnr_interior(before, after):
    b, n = np.asarray(before.convert('RGBA')).astype(np.float64), np.asarray(after.convert('RGBA')).astype(np.float64)
    core = ndimage.binary_erosion((b[..., 3] == 255) & (n[..., 3] == 255), iterations=3)
    if not core.any():
        return float('inf')
    mse = ((b[..., :3][core] - n[..., :3][core]) ** 2).mean()
    return float('inf') if mse == 0 else 10 * math.log10(255 ** 2 / mse)


def encode(im, quality=QUALITY):
    buffer = io.BytesIO()
    im.save(buffer, 'WEBP', quality=quality, method=6)
    return buffer.getvalue()


def contact(entries, path, bg):
    cols, tw, th = 8, 190, 210
    rows = max(1, (len(entries) + cols - 1) // cols)
    sheet = Image.new('RGBA', (cols * tw, rows * th), bg)
    draw = ImageDraw.Draw(sheet)
    for i, (label, im) in enumerate(entries):
        x, y = (i % cols) * tw, (i // cols) * th
        t = im.copy()
        t.thumbnail((tw - 8, th - 24), Image.LANCZOS)
        sheet.alpha_composite(t, (x + (tw - t.width) // 2, y + 4))
        draw.text((x + 4, y + th - 18), label[:30], fill=(255, 220, 120))
    sheet.convert('RGB').save(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry', action='store_true')
    parser.add_argument('--only', nargs='*')
    parser.add_argument('--sheets')
    parser.add_argument('--before', help='directory of original sprites for the before sheets')
    args = parser.parse_args()
    report, changed, per_cat, before_after = [], [], {}, {}
    for name, a, alpha, bbox, preserve in source_crops(set(args.only) if args.only else None):
        path = LIB / (name + '.webp')
        current = Image.open(path).convert('RGBA')
        reference = Image.open(Path(args.before) / (name + '.webp')).convert('RGBA') if args.before else current
        new, _ = clean(name, a, alpha, bbox, preserve, report)
        if new.size != current.size:
            raise SystemExit(f'{name}: size drift {current.size} -> {new.size}; re-ingest first')
        x0, y0, x1, y1 = bbox
        truth = Image.fromarray(np.dstack([a, alpha])[y0:y1, x0:x1].astype(np.uint8), 'RGBA')
        fidelity_old = psnr_interior(truth, current)
        for q in (QUALITY, 95, 98, 100):   # smallest quality that is at least as faithful to the owner art
            data = encode(new, q)
            decoded = Image.open(io.BytesIO(data)).convert('RGBA')
            fidelity_new = psnr_interior(truth, decoded)
            if fidelity_new >= fidelity_old - MAX_FIDELITY_LOSS:
                break
        else:
            report.append(f'{name}: SKIPPED, interior {fidelity_new:.1f} dB vs source < committed {fidelity_old:.1f}')
            continue
        quality = psnr_interior(current, decoded)
        cat = name.split('/')[0]
        moved = int((np.abs(np.asarray(decoded)[..., 3].astype(np.int16) - np.asarray(current)[..., 3]) >= 32).sum())
        if moved < MIN_MOVED:
            # nothing visible to fix: leave the committed file byte-identical (idempotent re-runs)
            before_after.setdefault(cat, []).append((name.split('/')[1], reference, current))
            continue
        before_after.setdefault(cat, []).append((name.split('/')[1], reference, decoded))
        if quality < MIN_PSNR:
            report.append(f'{name}: interior {quality:.1f} dB vs committed (source fidelity {fidelity_old:.1f} -> '
                          f'{fidelity_new:.1f}): the two lossy encodes differ, the new one is no further from the owner art')
        changed.append((name, quality, moved))
        per_cat[cat] = per_cat.get(cat, 0) + 1
        if not args.dry:
            tmp = path.with_suffix('.webp.tmp')
            tmp.write_bytes(data)
            os.replace(tmp, path)
    for line in report:
        print('WARN', line)
    print('changed', len(changed), dict(sorted(per_cat.items())))
    if changed:
        print('lowest interior PSNR %.1f dB (%s)' % min((q, n) for n, q, _ in changed))
        for n, q, mv in sorted(changed):
            print(f'  {n}: {mv} px alpha changed, interior {q:.1f} dB vs committed')
    if args.sheets:
        out = Path(args.sheets)
        out.mkdir(parents=True, exist_ok=True)
        for cat, entries in before_after.items():
            for tag, idx in (('before', 1), ('after', 2)):
                for bgname, colour in (('navy', (20, 48, 90, 255)), ('mid', (128, 128, 128, 255))):
                    tiles = [(e[0], e[idx]) for e in entries]
                    for part in range(0, len(tiles), 64):
                        contact(tiles[part:part + 64], out / f'{cat}-{part // 64:02d}-{tag}-{bgname}.png', colour)
    return 0


if __name__ == '__main__':
    sys.exit(main())
