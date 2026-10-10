#!/usr/bin/env python3
"""Build assets/vfx/<id>.webp spritesheets + assets/vfx/vfx-db.json + games/data/vfx-db.js
from the owner's raw packs. LICENSE GATE: only cc0 / public-domain packs whose license text
file was read (recorded in db). Re-runnable. Usage: python3 tools/build-vfx-library.py"""
import json, os, shutil, hashlib, math
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/home/baguspermana7/Documents/temporary/uiux/visual effect'
OUT = os.path.join(ROOT, 'assets/vfx')
BK = SRC + '/brackeys_vfx_bundle/brackeys_vfx_bundle'
PX = SRC + '/Free Pixel Effects Pack'
LIC = {
 'brackeys': dict(status='cc0', credit='Brackeys VFX bundle (CC0): textures by Picster & Kenney, flipbooks by Thomas Iche, spritesheets by CodeManu',
                  file='assets/vfx/licenses/brackeys-LICENSE-CREDITS.txt', terms='Creative Commons Zero (CC0), all assets in the pack'),
 'pixelfx': dict(status='public-domain', credit='Free Pixel Effects Pack by CodeManu / Davit Masia (public domain)',
                  file='assets/vfx/licenses/free-pixel-effects-README.txt', terms='Public domain; personal and commercial use; no credit required'),
}
os.makedirs(OUT + '/licenses', exist_ok=True)
shutil.copy(BK + '/LICENSE & CREDITS.txt', OUT + '/licenses/brackeys-LICENSE-CREDITS.txt')
shutil.copy(PX + '/README.txt', OUT + '/licenses/free-pixel-effects-README.txt')

db = []
def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()

def add_sheet(id, src, lic, fw, fh, tags, blend='screen', dur=700, loop=False, luma=False, anchor=(0.5, 0.5), scale=1.0, cols=None, rows=None):
    im = Image.open(src).convert('RGBA')
    W, H = im.size
    cols = cols or W // fw; rows = rows or H // fh
    if luma:  # opaque black-background sheet -> alpha from brightness
        px = im.load()
        for y in range(H):
            for x in range(W):
                r, g, b, _ = px[x, y]; a = max(r, g, b)
                px[x, y] = ((r * 255 // a, g * 255 // a, b * 255 // a, a) if a else (0, 0, 0, 0))
    n = 0
    for i in range(cols * rows):
        c, r = i % cols, i // cols
        if im.crop((c * fw, r * fh, (c + 1) * fw, (r + 1) * fh)).getchannel('A').getextrema()[1] > 8: n = i + 1
    used_rows = math.ceil(n / cols)
    im = im.crop((0, 0, cols * fw, used_rows * fh))
    f = id + '.webp'
    im.save(os.path.join(OUT, f), 'WEBP', quality=90, alpha_quality=100, method=5)
    db.append(dict(id=id, file='assets/vfx/' + f, frames=n, cols=cols, rows=used_rows, fw=fw, fh=fh, fps=round(n * 1000 / dur),
        dur=dur, loop=loop, blend=blend, anchor=list(anchor), scale=scale, kind='sheet', tags=tags, kid_safe=True,
        license=lic, pack=lic['credit'].split(' (')[0], source=os.path.relpath(src, SRC), sha256=sha(src)))

def add_tex(id, src, lic, tags, size=128, blend='screen'):
    im = Image.open(src).convert('RGBA'); im.thumbnail((size, size), Image.LANCZOS)
    f = id + '.webp'; im.save(os.path.join(OUT, f), 'WEBP', quality=88, alpha_quality=100, method=5)
    db.append(dict(id=id, file='assets/vfx/' + f, frames=1, cols=1, rows=1, fw=im.size[0], fh=im.size[1], fps=0, dur=600,
        loop=False, blend=blend, anchor=[0.5, 0.5], scale=1.0, kind='texture', tags=tags, kid_safe=True,
        license=lic, pack=lic['credit'].split(' (')[0], source=os.path.relpath(src, SRC), sha256=sha(src)))

P, B = LIC['pixelfx'], LIC['brackeys']
# --- Free Pixel Effects Pack: 100px frame sheets -----------------------------------------
px = [
 ('px-magicspell', '1_magicspell', ['magic', 'sparkle', 'aura', 'psychic', 'fairy', 'heal'], 'screen', 900),
 ('px-magic8', '2_magic8', ['magic', 'aura', 'psychic', 'normal'], 'screen', 800),
 ('px-bluefire', '3_bluefire', ['fire', 'water', 'ice', 'aura', 'projectile'], 'screen', 800),
 ('px-casting', '4_casting', ['magic', 'aura', 'windup', 'normal'], 'normal', 800),
 ('px-magickahit', '5_magickahit', ['impact', 'hit', 'magic', 'psychic', 'normal'], 'screen', 450),
 ('px-flamelash', '6_flamelash', ['fire', 'projectile', 'trail'], 'screen', 700),
 ('px-firespin', '7_firespin', ['fire', 'aura', 'windup'], 'screen', 800),
 ('px-protection', '8_protectioncircle', ['shield', 'aura', 'normal'], 'normal', 800),
 ('px-brightfire', '9_brightfire', ['fire', 'aura', 'impact'], 'screen', 800),
 ('px-fire', '11_fire', ['fire', 'aura', 'impact', 'projectile'], 'screen', 800),
 ('px-nebula', '12_nebula', ['psychic', 'magic', 'aura', 'ghost', 'dark'], 'screen', 900),
 ('px-vortex', '13_vortex', ['magic', 'aura', 'water', 'windup'], 'screen', 900),
 ('px-phantom', '14_phantom', ['ghost', 'dark', 'aura', 'projectile', 'magic'], 'screen', 800),
 ('px-sunburn', '16_sunburn', ['light', 'heal', 'impact', 'fairy', 'sparkle'], 'screen', 800),
 ('px-felspell', '17_felspell', ['poison', 'magic', 'aura', 'projectile'], 'screen', 900),
 ('px-midnight', '18_midnight', ['dark', 'ghost', 'aura'], 'normal', 800),
 ('px-freezing', '19_freezing', ['ice', 'impact', 'aura'], 'normal', 800),
 ('px-bubbles', '20_magicbubbles', ['water', 'bubble', 'aura', 'splash', 'projectile'], 'screen', 800),
]
for id, stem, tags, blend, dur in px:
    add_sheet(id, f'{PX}/{stem}_spritesheet.png', P, 100, 100, tags, blend, dur)
# --- Brackeys flipbooks (128 px frames) ---------------------------------------------------
fb = [
 ('bk-fire-01', 'fire_01_8x8', ['fire', 'aura', 'projectile'], True, 700),
 ('bk-fire-02', 'fire_02_8x8', ['fire', 'aura', 'projectile'], True, 700),
 ('bk-fire-03', 'fire_03_8x8', ['fire', 'aura', 'impact'], True, 700),
 ('bk-fire-04', 'fire_04_8x8', ['fire', 'aura', 'impact'], True, 700),
 ('bk-cloud-01', 'cloud_01_8x8', ['smoke', 'dust', 'cloud', 'rock', 'ground', 'normal', 'impact'], False, 900),
 ('bk-cloud-02', 'cloud_02_8x8', ['smoke', 'dust', 'cloud', 'rock', 'ground', 'impact'], False, 900),
 ('bk-smoke-wispy-01', 'wispy_smoke_01_8x8', ['smoke', 'wisp', 'ghost', 'poison', 'aura'], False, 1100),
 ('bk-smoke-wispy-02', 'wispy_smoke_02_8x8', ['smoke', 'wisp', 'ghost', 'poison', 'aura'], False, 1100),
 ('bk-smoke-wispy-03', 'wispy_smoke_03_8x8', ['smoke', 'wisp', 'dust', 'aura'], False, 1100),
 ('bk-smoke-puff', 'explosion_smoke_01_8x8', ['smoke', 'puff', 'dust', 'impact', 'hit'], False, 800),
]
for id, stem, tags, luma, dur in fb:
    add_sheet(id, f'{BK}/flipbooks/{stem}.tga', B, 128, 128, tags, 'screen' if luma else 'normal', dur, luma=luma)
add_sheet('bk-flame-tall', f'{BK}/flipbooks/flame_01_16x4.tga', B, 128, 256, ['fire', 'aura', 'windup'], 'screen', 800, anchor=(0.5, 0.8), cols=16, rows=4)
# --- Brackeys alpha particle textures (trail / head / sparkle pieces) ----------------------
tx = {}
for n in range(1, 8): tx[f'spark_0{n}'] = ['spark', 'electric', 'trail', 'hit']
for n in range(1, 8): tx[f'trace_0{n}'] = ['trace', 'trail', 'electric', 'projectile']
for n in range(1, 6): tx[f'magic_0{n}'] = ['magic', 'sparkle', 'psychic', 'fairy', 'trail']
for n in range(1, 5): tx[f'twirl_0{n}'] = ['twirl', 'water', 'wind', 'flying', 'trail']
for n in range(1, 10): tx[f'star_0{n}'] = ['star', 'sparkle', 'level-up', 'crit', 'hit']
for n in (1, 3, 5): tx[f'circle_0{n}'] = ['ring', 'shield', 'heal', 'impact']
for n in (1, 2, 3): tx[f'light_0{n}'] = ['light', 'heal', 'glow']
tx['flare_01'] = ['light', 'flare', 'glow', 'crit']
for n in (1, 5, 7): tx[f'smoke_0{n}'] = ['smoke', 'dust', 'trail']
for n in (1, 2, 3): tx[f'dirt_0{n}'] = ['dust', 'rock', 'ground', 'debris']
for n in (1, 2, 3): tx[f'effect_0{n}'] = ['magic', 'normal', 'sparkle']
for n in (1, 2): tx[f'flame_0{n}'] = ['fire', 'trail']
for k, tags in tx.items():
    add_tex('bk-' + k.replace('_', '-'), f'{BK}/particles/alpha/{k}_a.png', B, tags)

db.sort(key=lambda e: e['id'])
import colorsys
def hue_stats(e):
    im = Image.open(os.path.join(OUT, e['id'] + '.webp')).convert('RGBA'); im.thumbnail((96, 96))
    sx = sy = wt = 0.0; ssum = 0.0
    for r, g, b, a in im.get_flattened_data():
        if a < 40: continue
        h, sa, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        w = (a / 255) * sa * v
        sx += math.cos(h * 6.2832) * w; sy += math.sin(h * 6.2832) * w; wt += w; ssum += sa * (a / 255)
    n = max(1, sum(1 for px_ in im.get_flattened_data() if px_[3] >= 40))
    hue = (math.degrees(math.atan2(sy, sx)) % 360) if wt > 0 else 0
    return round(hue), round(ssum / n, 2)
def fill_stat(e):
    im = Image.open(os.path.join(OUT, e['id'] + '.webp')).convert('RGBA'); A = im.getchannel('A').point(lambda v: 255 if v > 24 else 0)
    best = 0.0
    for i in range(e['frames']):
        c, r = i % e['cols'], i // e['cols']
        bb = A.crop((c * e['fw'], r * e['fh'], (c + 1) * e['fw'], (r + 1) * e['fh'])).getbbox()
        if bb: best = max(best, max((bb[2] - bb[0]) / e['fw'], (bb[3] - bb[1]) / e['fh']))
    return round(max(0.15, best), 2)
for e in db:
    e['hue'], e['sat'] = hue_stats(e); e['fill'] = fill_stat(e)
BY = {e['id']: e for e in db}
def tint(id, hue=None, sat=1.2, bri=1.0):
    """CSS filter that moves effect `id` to target hue (None = leave native)."""
    e = BY[id]; parts = []
    if hue is not None:
        if e['sat'] < 0.12:  # near-white/grey: colourise via sepia (~40deg) then rotate
            parts.append('sepia(1) saturate(%.1f) hue-rotate(%ddeg)' % (3.2 * sat, (hue - 40) % 360))
        else:
            parts.append('hue-rotate(%ddeg) saturate(%.2f)' % ((hue - e['hue']) % 360, sat))
    if bri != 1.0: parts.append('brightness(%.2f)' % bri)
    return ' '.join(parts)
# Pokemon move-type sets: windup aura / head / trail / impact / crit-extra (+ colour used for crit + ring)
S = {}
def st(t, hue, w, h, tr, i, hs=1.0, is_=1.0, bri=1.0, sat=1.25):
    def part(id_, hh, size=1.0): return dict(id=id_, filter=tint(id_, hh, sat, bri))
    S[t] = dict(hue=hue, windup=part(w[0], w[1]), head=part(h[0], h[1]), trail=part(tr[0], tr[1]), impact=part(i[0], i[1]),
                crit=part('bk-star-05', hue), flare=part('bk-flare-01', hue), hs=hs, is_=is_)
st('fire', 20, ('px-firespin', None), ('px-fire', None), ('bk-flame-01', None), ('px-brightfire', None), 1.0, 1.1)
st('water', 205, ('px-vortex', 205), ('px-bubbles', None), ('bk-twirl-01', 205), ('px-bubbles', 205), 1.0, 1.15)
st('electric', 52, ('px-magic8', 52), ('bk-trace-03', 52), ('bk-spark-02', 52), ('px-magickahit', 52), 1.2, 1.2)
st('grass', 110, ('px-felspell', 110), ('bk-magic-02', 110), ('bk-twirl-03', 110), ('px-sunburn', 110), 1.0, 1.1)
st('ice', 190, ('px-freezing', None), ('bk-star-03', 190), ('bk-spark-05', 190), ('px-freezing', 195), 1.0, 1.1)
st('fighting', 8, ('px-brightfire', 8), ('px-magickahit', 15), ('bk-dirt-01', 12), ('bk-cloud-01', 14), 1.1, 1.2)
st('poison', 285, ('px-felspell', 285), ('bk-smoke-wispy-01', 285), ('bk-smoke-05', 285), ('bk-smoke-wispy-02', 290), 1.1, 1.1)
st('ground', 35, ('bk-cloud-02', 35), ('bk-dirt-02', 30), ('bk-dirt-01', 30), ('bk-cloud-01', 35), 1.0, 1.2, 0.85)
st('flying', 200, ('bk-twirl-01', 195), ('bk-twirl-02', 195), ('bk-twirl-04', 200), ('bk-cloud-02', 200), 1.1, 1.0, 1.1, 0.8)
st('psychic', 320, ('px-nebula', 320), ('bk-magic-03', 320), ('bk-magic-04', 330), ('px-magicspell', 320), 1.1, 1.1)
st('bug', 78, ('px-felspell', 85), ('bk-spark-04', 78), ('bk-trace-02', 80), ('px-sunburn', 78), 1.0, 1.0)
st('rock', 38, ('bk-cloud-01', 38), ('bk-dirt-03', 35), ('bk-dirt-02', 38), ('bk-smoke-puff', 38), 1.0, 1.25, 0.8, 0.9)
st('ghost', 268, ('px-phantom', None), ('bk-smoke-wispy-03', 268), ('bk-smoke-07', 268), ('px-midnight', 270), 1.1, 1.1, 0.9)
st('dragon', 252, ('px-bluefire', 252), ('px-vortex', 250), ('bk-flame-02', 250), ('px-brightfire', 255), 1.2, 1.3)
st('dark', 280, ('px-midnight', None), ('px-phantom', 300), ('bk-smoke-01', 280), ('px-midnight', 300), 1.0, 1.1, 0.75)
st('steel', 210, ('px-protection', 210), ('bk-spark-01', 210), ('bk-trace-05', 210), ('px-magickahit', 210), 1.1, 1.0, 1.0, 0.5)
st('fairy', 330, ('px-magicspell', 330), ('bk-star-05', 330), ('bk-magic-01', 330), ('px-sunburn', 330), 1.0, 1.1)
st('normal', 45, ('px-casting', None), ('bk-circle-03', 45), ('bk-effect-01', 45), ('px-magickahit', None), 1.0, 1.0, 1.0, 0.7)
S['_heal'] = dict(hue=125, windup=dict(id='px-magicspell', filter=tint('px-magicspell', 125)), impact=dict(id='px-sunburn', filter=tint('px-sunburn', 120)),
                  sparkle=dict(id='bk-star-02', filter=tint('bk-star-02', 130)))
S['_shield'] = dict(hue=210, windup=dict(id='px-protection', filter=''), impact=dict(id='bk-circle-05', filter=tint('bk-circle-05', 205)))
S['_whiff'] = dict(hue=200, windup=dict(id='bk-smoke-wispy-03', filter=tint('bk-smoke-wispy-03', 200)), impact=dict(id='bk-twirl-02', filter=tint('bk-twirl-02', 200)))
meta = dict(version=1, built='2026-10-10', notes='license gate: cc0/public-domain only; unknown packs (VFX Free Pack, SlashFX, Pipoya, Effect and FX Pixel) have no license file, not shipped; wills_pixel_explosions (restricted-product-only) held back for the kids explosion rule')
json.dump(dict(meta=meta, effects=db, sets=S), open(OUT + '/vfx-db.json', 'w'), indent=1)
os.makedirs(ROOT + '/games/data', exist_ok=True)
open(ROOT + '/games/data/vfx-db.js', 'w').write('/* generated by tools/build-vfx-library.py — do not edit */\nwindow.VFXDB = ' + json.dumps(dict(meta=meta, effects=db, sets=S), separators=(',', ':')) + ';\n')
tot = sum(os.path.getsize(os.path.join(OUT, e['id'] + '.webp')) for e in db)
print(len(db), 'effects', round(tot / 1e6, 2), 'MB')
