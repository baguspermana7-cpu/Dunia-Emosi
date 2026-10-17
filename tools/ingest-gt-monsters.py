"""Cut the owner's animated Monster Rush pack into games/data/gt-monster-sheets.js (2026-10-17).

Owner: "saya akan kasih asset animasi sprite utk monsternya tapi tetap ya besar dimensinya" -- a right answer is a
raid hit (the monster's 'hurt' animation), a wrong answer the monster's 'attack' on the player.

Expected pack (the same shape as the owner's vehicle packs): one PNG sheet per monster and state, RGBA (transparent,
no white background, no outline), frames left to right then top to bottom, every frame the same cell size:
  <pack>/animation_sheets/NN_<slug>_<state>.png      state = idle | attack | hurt | ko   (idle required)
  <pack>/manifest.json   optional: { "cell": [w, h], "fps": 20, "cols": 10 }   (else the cell is read from --cell)
<slug> is the monster's key in assets/db/lib/gt-monster/ (robo-gorilla, magma-golem ...). A slug written with
underscores is accepted (robo_gorilla).

Output, alpha only, one fixed box per monster = the union of its alpha over every frame of every state (so switching
state never jumps), longest side MAX px, frames in rows of COLS:
  assets/db/lib/gt-monster-anim/<slug>-<state>.webp
  games/data/gt-monster-sheets.js   window.GTMonsterSheets['gt-monster/<slug>'] = { cell, fps, states: {...} }

  ~/.venvs/kokoro/bin/python tools/ingest-gt-monsters.py <pack dir> [--cell 512x512] [--fps 20] [--cols 10]

--mecha <pack dir>: the owner's Monsters_16_Front_Mecha pack (2026-10-17): manifest.json lists 16 monsters, each ONE
looping "rampage" sheet (64 frames, 8x8, 384 px cells, 20 fps) built from 16 drawn poses, plus a 640 px front still.
  still   -> assets/db/lib/gt-monster/mecha-<slug>.webp (indexed in assets/db/index.json + asset-index.js, cut by alpha)
  idle    -> the whole 64-frame loop;  attack -> the wind-up to the stomp (poses ATTACK_POSES of the base sequence)
  hurt/ko -> none: the game plays them procedurally (white blink + knock-back, fall) on the canvas
Sheets go to assets/monster-anim/ (outside assets/db/lib, so the library index only lists the stills).
"""
import glob, json, os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'db', 'lib', 'gt-monster-anim')
JS = os.path.join(ROOT, 'games', 'data', 'gt-monster-sheets.js')
STATES = ('idle', 'attack', 'hurt', 'ko')
MAX = 420      # the rush draws the monster up to ~75% of a phone's short side: 420 px frames stay sharp at 2x DPR
COLS = 10


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def frames_of(path, cell, cols):
    sh = Image.open(path).convert('RGBA')
    cw, ch = cell
    n_cols, n_rows = sh.width // cw, sh.height // ch
    fr = [sh.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)) for r in range(n_rows) for c in range(n_cols)]
    return [f for f in fr if np.array(f)[..., 3].max() > 8]          # trailing empty cells dropped


def main():
    pack = sys.argv[1]
    man = {}
    mp = os.path.join(pack, 'manifest.json')
    if os.path.exists(mp):
        man = json.load(open(mp))
    cell = man.get('cell') or [int(v) for v in (arg('--cell', '512x512')).split('x')]
    fps = int(man.get('fps') or arg('--fps', 20))
    cols = int(arg('--cols', COLS))
    sheets = glob.glob(os.path.join(pack, 'animation_sheets', '*.png')) or glob.glob(os.path.join(pack, '*.png'))
    by = {}
    for f in sheets:
        m = re.match(r'(?:\d+_)?(.+)_(idle|attack|hurt|ko)\.png$', os.path.basename(f))
        if m:
            by.setdefault(m.group(1).replace('_', '-'), {})[m.group(2)] = f
    os.makedirs(OUT, exist_ok=True)
    data = json.load(open(JS + '.json')) if os.path.exists(JS + '.json') else {}
    for slug, st in sorted(by.items()):
        if 'idle' not in st:
            print('SKIP', slug, '(no idle sheet)'); continue
        fr = {s: frames_of(st[s], cell, cols) for s in STATES if s in st}
        alpha = np.stack([np.array(f)[..., 3] for s in fr for f in fr[s]]).max(0)
        ys, xs = np.where(alpha > 8)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        w, h = box[2] - box[0], box[3] - box[1]
        k = min(1.0, MAX / max(w, h))
        fw, fh = max(1, round(w * k)), max(1, round(h * k))
        states = {}
        for s, frames in fr.items():
            rows = -(-len(frames) // cols)
            out = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
            for i, f in enumerate(frames):
                out.alpha_composite(f.crop(box).resize((fw, fh), Image.LANCZOS), ((i % cols) * fw, (i // cols) * fh))
            rel = 'assets/db/lib/gt-monster-anim/%s-%s.webp' % (slug, s)
            out.save(os.path.join(ROOT, rel), quality=86, method=4)
            states[s] = {'src': rel, 'frames': len(frames), 'cols': cols, 'loop': s == 'idle'}
        data['gt-monster/' + slug] = {'cell': [fw, fh], 'fps': fps, 'states': states}
        print(slug, [fw, fh], {s: v['frames'] for s, v in states.items()})
    json.dump(data, open(JS + '.json', 'w'), indent=1, sort_keys=True)
    open(JS, 'w').write('/* GENERATED by tools/ingest-gt-monsters.py from the owner\'s animated monster pack -- do not edit.\n'
                        ' * Read by games/gt-monster-anim.js: a monster listed here plays its sheets in Monster Rush; any other\n'
                        ' * monster keeps its still picture with procedural motion. */\n'
                        'window.GTMonsterSheets = ' + json.dumps(data, sort_keys=True) + '\n')


ATTACK_POSES = range(6, 11)   # lift the limbs -> the stomp -> the impact (README: "ancang-ancang, mengangkat, hentakan")
ANIM = os.path.join(ROOT, 'assets', 'monster-anim')


def mecha(pack):
    import importlib.util
    man = json.load(open(os.path.join(pack, 'manifest.json')))
    an = man['animation']; cell0 = an.get('tile') or an.get('cell'); tw, th = cell0['width'], cell0['height']; cols0 = an['sheet']['columns']
    seq = an['base_pose_sequence']; fps = an.get('fps', 20)
    # Part 1 draws 16 poses (attack = 6..10), Parts 2-4 draw 8 (raise, strike, stomp = 2..4)
    poses = an.get('drawn_poses_per_character') or an.get('drawn_keyframes_per_character') or 16
    attack_poses = ATTACK_POSES if poses >= 16 else range(2, 5)
    os.makedirs(ANIM, exist_ok=True)
    spec = importlib.util.spec_from_file_location('ias', os.path.join(ROOT, 'tools', 'ingest-asset-sheets.py'))
    ias = importlib.util.module_from_spec(spec); spec.loader.exec_module(ias)
    index = json.load(open(ias.INDEX))
    data = json.load(open(JS + '.json')) if os.path.exists(JS + '.json') else {}
    out = []
    for a in man['assets']:
        files = a.get('files') or {}
        still_rel = a.get('front_png') or files.get('png'); sheet_rel = a.get('animation_sheet') or files.get('sprite_sheet')
        slug = re.sub(r'^\d+_', '', os.path.splitext(os.path.basename(still_rel))[0]).replace('_', '-')
        slug = slug if slug.startswith('mecha-') else 'mecha-' + slug   # 'mecha-shark' stays one word, not mecha-mecha-shark
        key = 'gt-monster/' + slug
        # the still: cut by its own alpha, trimmed, 4 px clear margin
        st = Image.open(os.path.join(pack, still_rel)).convert('RGBA')
        st = st.crop(st.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox())
        pad = Image.new('RGBA', (st.width + 8, st.height + 8), (0, 0, 0, 0)); pad.alpha_composite(st, (4, 4))
        rel = 'assets/db/lib/gt-monster/%s.webp' % slug
        pad.save(os.path.join(ROOT, rel), quality=90, method=6)
        index['assets'][key] = {'file': rel, 'cat': 'gt-monster', 'tags': sorted(set(slug.split('-') + ['mecha', 'monster', 'animated'])),
                                'source': 'owner Monsters_16_Front_Mecha #%d' % a['id'], 'w': pad.width, 'h': pad.height,
                                'name_id': a['name_id'], 'name': a['name'], 'anim': 'assets/monster-anim/%s-idle.webp' % slug,
                                'effect': a.get('effect'), 'part': man.get('name')}
        # the animation: one fixed box over all 64 frames (nothing jitters), alpha only
        sh = Image.open(os.path.join(pack, sheet_rel)).convert('RGBA')
        frames = [sh.crop(((i % cols0) * tw, (i // cols0) * th, (i % cols0 + 1) * tw, (i // cols0 + 1) * th)) for i in range(an['frame_count'])]
        alpha = np.stack([np.array(f)[..., 3] for f in frames]).max(0)
        ys, xs = np.where(alpha > 8)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        fw, fh = box[2] - box[0], box[3] - box[1]
        states = {}
        for name, idx in (('idle', list(range(len(frames)))), ('attack', [i for i, p in enumerate(seq) if p in attack_poses])):
            rows = -(-len(idx) // COLS)
            img = Image.new('RGBA', (fw * COLS, fh * rows), (0, 0, 0, 0))
            for j, i in enumerate(idx):
                img.alpha_composite(frames[i].crop(box), ((j % COLS) * fw, (j // COLS) * fh))
            srel = 'assets/monster-anim/%s-%s.webp' % (slug, name)
            img.save(os.path.join(ROOT, srel), quality=86, method=4)
            states[name] = {'src': srel, 'frames': len(idx), 'cols': COLS, 'loop': name == 'idle'}
        data[key] = {'cell': [fw, fh], 'fps': fps, 'states': states, 'name': a['name_id'], 'effect': a.get('effect')}
        out.append((key, a['name_id'], [fw, fh], states['attack']['frames']))
        print(key, a['name_id'], [fw, fh], 'attack', states['attack']['frames'], 'frames')
    json.dump(index, open(ias.INDEX, 'w'), indent=1, ensure_ascii=False)   # the file keeps its raw unicode (’)
    ias.write_js(index)
    json.dump(data, open(JS + '.json', 'w'), indent=1, sort_keys=True)
    open(JS, 'w').write('/* GENERATED by tools/ingest-gt-monsters.py from the owner\'s animated monster pack -- do not edit.\n'
                        ' * Read by games/gt-monster-anim.js: a monster listed here plays its sheets in Monster Rush and Petualangan\n'
                        ' * Matematika; any other monster keeps its still picture with procedural motion. */\n'
                        'window.GTMonsterSheets = ' + json.dumps(data, sort_keys=True) + '\n')


if __name__ == '__main__':
    if sys.argv[1] == '--mecha':
        mecha(sys.argv[2])
    else:
        main()
