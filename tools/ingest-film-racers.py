"""Cut the owner's film-racer pack into the Mojo chase's three-view racer sheets (2026-10-18).

Owner: the film racers come as three animated rear views -- straight, turning a little left, a little right -- used on
a lane change or in a curve. The pack (Cars_23_Animated_Pack.zip) holds per character:
  <NN_Name>/<Name>_12_Poses.png   2048 x 1536, 4 x 3 cells of 512: row 1 Straight, row 2 Left, row 3 Right, 4 drive
                                  phases each, smooth alpha, NO particles  <- the source used here
  <NN_Name>/<Name>_Preview.png    640 x 640 rear-diagonal still              <- the chip picture
  (the GIF/MP4 clips carry baked dust and speed lines on binary alpha; the chase draws its own dust, smoke and speed
   lines, so the clean poses are used and the game crossfades between them)

Output (Dunia root):
  assets/mojo-film/<id>-<view>.webp   one row of 4 cells per view, every cell the SAME box (the union of the alpha of
                                      all 12 poses), so switching view or phase never moves the car
  assets/mojo-film/<id>-pic.webp      the trimmed preview, 256 px
  games/data/mojo-racer-sheets.js     window.MojoRacerSheets[id] = { name, pic, form, line, color, cell, fps, anchor,
                                      views: { straight|left|right: { src, frames, cols } } }
anchor (cell px): base = the wheels' contact row, cx = the straight pose's centre, bw = its width at the wheels,
lights = the two tail-lamp centres found by colour (fallback: the usual height), dust = the rear wheels, exhaust below
the bumper.

  python3 tools/ingest-film-racers.py <extracted pack dir>
"""
import glob, json, os, re, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'mojo-film')
JS = os.path.join(ROOT, 'games', 'data', 'mojo-racer-sheets.js')
VIEWS = ('straight', 'left', 'right')
MAXH = 300      # the chase draws the racer ~150 px tall on a phone: 300 px cells stay sharp at 2x DPR

# per character: the Mojo form underneath (its perk), a one-line intro and the chip colour (all others: racer/boost)
NAME = {'strip-the-king-weathers': 'The King'}   # the chip shows the short name

ROLE = {
    'lightning-mcqueen': ('racer', 'Pembalap merah nomor 95, kilat di lintasan!', '#D7261E'),
    'tow-mater': ('grapple', 'Derek paling setia, kuat menarik apa saja!', '#B5652B'),
    'sheriff': ('police', 'Polisi kota, ahli mengejar pencuri!', '#2B3A55'),
    'red': ('fire', 'Mobil pemadam yang baik hati!', '#D93030'),
    'mack': ('cargo', 'Truk besar yang tangguh!', '#C0392B'),
    'fillmore': ('monster', 'Santai tapi tahan lumpur!', '#3DA35D'),
    'sarge': ('monster', 'Jip tangguh, batu tidak masalah!', '#556B2F'),
    'miss-fritter': ('wrecking', 'Bus derby, menerobos rintangan!', '#E1B12C'),
    'cruz-ramirez': ('racer', 'Pembalap kuning nomor 51, cepat sekali!', '#F2B705'),
    'jackson-storm': ('jet2', 'Pembalap generasi baru, melesat!', '#2C2C34'),
    'doc-hudson': ('racer', 'Juara lama yang bijak!', '#1F4E9C'),
    'chick-hicks': ('racer', 'Pembalap hijau yang suka menyalip!', '#3E9B3E'),
    'strip-the-king-weathers': ('racer', 'Raja lintasan, tenang dan cepat!', '#2E7BE8'),
    'sally-carrera': ('racer', 'Mobil biru yang anggun!', '#3B8FD9'),
    'luigi': ('racer', 'Ahli ban, selalu ceria!', '#F4D03F'),
    'guido': ('racer', 'Kecil tapi paling cepat ganti ban!', '#2E86C1'),
    'ramone': ('racer', 'Mobil ungu, catnya berkilau!', '#8E44AD'),
    'flo': ('racer', 'Pemilik kafe, ramah sekali!', '#16A085'),
    'lizzie': ('racer', 'Mobil tua yang lucu!', '#7F8C8D'),
    'sterling': ('jet2', 'Mobil bisnis yang rapi!', '#95A5A6'),
    'smokey': ('dump', 'Pelatih bengkel yang hebat!', '#6E4B2A'),
    'louise-nash': ('racer', 'Pembalap legenda yang berani!', '#2471A3'),
    'river-scott': ('racer', 'Pembalap legenda yang gesit!', '#1C1C1C'),
    'cal-weathers': ('racer', 'Pembalap muda biru!', '#2E7BE8'),
}


def slug(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')


def red_lights(cell, box):
    """centres of the two tail lamps: the REDDEST pixels in the lower body band, in the outer part of each side.
    A plain red threshold took the rust of a tow truck, a red cab and a roof siren (seen 2026-10-18), so the search
    is limited to the band between 40% and 97% of the height and to the outer 45% of each half, and only the top
    redness percentile of that band counts."""
    a = np.array(cell).astype(int)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    ys, xs = np.where(al > 10)
    top, bot, left, right = ys.min(), ys.max(), xs.min(), xs.max()
    red = (r - np.maximum(g, b)) * (al > 200) * (r > 150)
    Y, X = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    band = (Y > top + (bot - top) * 0.4) & (Y < top + (bot - top) * 0.97)
    mid, half = (left + right) / 2, (right - left) / 2
    for edge in (0.55, 0.25):   # small cars carry their lamps nearer the middle: a second, wider look
        out = []
        for side in (X < mid - half * edge, X > mid + half * edge):
            sc = np.where(band & side, red, 0)
            if sc.max() < 110:
                break
            m = sc >= max(110, np.percentile(sc[sc > 0], 85))
            yy, xx = np.where(m)
            out.append([float(xx.mean()), float(yy.mean())])
        if len(out) == 2:
            return out
    return None


def main(pack):
    os.makedirs(OUT, exist_ok=True)
    data = {}
    for folder in sorted(glob.glob(os.path.join(pack, 'characters', '*'))):
        man = json.load(open(os.path.join(folder, 'manifest.json')))
        name, cs = man['name'], man.get('cell_size', 512)
        rid = slug(name)
        sheet = Image.open(os.path.join(folder, man['poses'])).convert('RGBA')
        cols = man['pose_sheet']['columns']
        cells = {v: [sheet.crop((c * cs, i * cs, (c + 1) * cs, (i + 1) * cs)) for c in range(cols)] for i, v in enumerate(VIEWS)}
        alpha = np.stack([np.array(f)[..., 3] for v in VIEWS for f in cells[v]]).max(0)
        ys, xs = np.where(alpha > 10)
        box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        w, h = box[2] - box[0], box[3] - box[1]
        k = min(1.0, MAXH / h)
        fw, fh = round(w * k), round(h * k)
        views = {}
        for v in VIEWS:
            out = Image.new('RGBA', (fw * cols, fh), (0, 0, 0, 0))
            for j, f in enumerate(cells[v]):
                out.alpha_composite(f.crop(box).resize((fw, fh), Image.LANCZOS), (j * fw, 0))
            rel = 'assets/mojo-film/%s-%s.webp' % (rid, v)
            out.save(os.path.join(ROOT, rel), quality=88, method=6)
            views[v] = {'src': rel, 'frames': cols, 'cols': cols}
        # the anchor, measured on the straight pose (cell px after the crop and scale)
        st = np.array(cells['straight'][0])[..., 3]
        sys_, sxs = np.where(st > 10)
        base = (int(sys_.max()) + 1 - box[1]) * k
        sl, sr = (int(sxs.min()) - box[0]) * k, (int(sxs.max()) + 1 - box[0]) * k
        low = st[int(sys_.max()) - 12:int(sys_.max()) + 1]
        lx = np.where(low.max(0) > 10)[0]
        wl, wr = (int(lx.min()) - box[0]) * k, (int(lx.max()) + 1 - box[0]) * k
        cx, bw, bh = (sl + sr) / 2, wr - wl, base - (int(sys_.min()) - box[1]) * k
        lights = red_lights(cells['straight'][0], (int(sxs.min()), 0, int(sxs.max()), 0))
        lights = [[round((x - box[0]) * k, 1), round((y - box[1]) * k, 1)] for x, y in lights] if lights else \
            [[round(cx - bw * 0.33, 1), round(base - bh * 0.45, 1)], [round(cx + bw * 0.33, 1), round(base - bh * 0.45, 1)]]
        anchor = {'cx': round(cx, 1), 'base': round(base, 1), 'bw': round(bw, 1), 'top': round(base - bh, 1), 'kind': 'ground', 'lights': lights,
                  'dust': [[round(wl + bw * 0.1, 1), round(base, 1)], [round(wr - bw * 0.1, 1), round(base, 1)]],
                  'exhaust': [[round(cx - bw * 0.2, 1), round(base - bh * 0.12, 1)], [round(cx + bw * 0.2, 1), round(base - bh * 0.12, 1)]]}
        pv = Image.open(os.path.join(folder, man['preview'])).convert('RGBA')
        pv = pv.crop(pv.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox())
        pv.thumbnail((256, 256), Image.LANCZOS)
        pic = 'assets/mojo-film/%s-pic.webp' % rid
        pv.save(os.path.join(ROOT, pic), quality=88, method=6)
        form, line, color = ROLE.get(rid, ('racer', 'Siap balapan!', '#E8432E'))
        data[rid] = {'name': NAME.get(rid, name), 'pic': pic, 'form': form, 'line': line, 'color': color, 'order': man['id'],
                     'cell': [fw, fh], 'fps': man['animation'].get('fps', 20) / 5, 'anchor': anchor, 'views': views}
        print(rid, [fw, fh], 'lights', 'found' if lights and lights[0][1] != round(base - bh * 0.45, 1) else 'default')
    open(JS, 'w').write('/* GENERATED by tools/ingest-film-racers.py from the owner\'s film-racer pack -- do not edit by hand.\n'
                        ' * Read by games/mojo-chase.js (three rear views: straight / left / right, 4 drive phases each, crossfaded)\n'
                        ' * and games/data/mojo-team-film.js (the racer list). fps = drive phases per second at full speed. */\n'
                        'window.MojoRacerSheets = ' + json.dumps(data, sort_keys=True, ensure_ascii=False) + '\n')
    print(len(data), 'racers ->', os.path.relpath(JS, ROOT))


def clean_frames(gif, every):
    """the frames of a binary-alpha GIF with only the largest body kept (wind streaks and dust are separate blobs)"""
    from PIL import ImageSequence
    import scipy.ndimage as nd
    g = Image.open(gif)
    out = []
    for f in [f.convert('RGBA') for f in ImageSequence.Iterator(g)][::every]:
        a = np.array(f)
        lab, n = nd.label(a[..., 3] > 0)
        if n > 1:
            sizes = nd.sum(np.ones_like(lab), lab, range(1, n + 1))
            a[..., 3] = np.where(lab == 1 + int(np.argmax(sizes)), a[..., 3], 0)
        out.append(Image.fromarray(a))
    return out, g.info.get('duration', 50)


def gif_racer(rid, name, gifs, every):
    """one racer from GIF clips {view: path} (straight required; left / right optional). Binary alpha: per frame only
    the largest body is kept, every `every`-th frame is used, all views share one box (no jump on a view change) and
    the LANCZOS downscale softens the binary edge. A racer without left / right turns with the body-roll pose."""
    views_f, dur = {}, 50
    for v in VIEWS:
        if v in gifs:
            views_f[v], dur = clean_frames(gifs[v], every)
    alpha = np.stack([np.array(f)[..., 3] for v in views_f for f in views_f[v]]).max(0)
    ys, xs = np.where(alpha > 10)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    w, h = box[2] - box[0], box[3] - box[1]
    k = min(1.0, MAXH / h)
    fw, fh, cols = round(w * k), round(h * k), 8
    views = {}
    for v, fr in views_f.items():
        rows = -(-len(fr) // cols)
        out = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
        for j, f in enumerate(fr):
            out.alpha_composite(f.crop(box).resize((fw, fh), Image.LANCZOS), ((j % cols) * fw, (j // cols) * fh))
        rel = 'assets/mojo-film/%s-%s.webp' % (rid, v)
        out.save(os.path.join(ROOT, rel), quality=88, method=6)
        views[v] = {'src': rel, 'frames': len(fr), 'cols': cols}
    first = views_f['straight'][0]
    st = np.array(first)[..., 3]
    sys_, sxs = np.where(st > 10)
    base = (int(sys_.max()) + 1 - box[1]) * k
    low = st[int(sys_.max()) - 8:int(sys_.max()) + 1]
    lx = np.where(low.max(0) > 10)[0]
    wl, wr = (int(lx.min()) - box[0]) * k, (int(lx.max()) + 1 - box[0]) * k
    sl, sr = (int(sxs.min()) - box[0]) * k, (int(sxs.max()) + 1 - box[0]) * k
    cx, bw, bh = (sl + sr) / 2, max(wr - wl, (sr - sl) * 0.8), base - (int(sys_.min()) - box[1]) * k
    L = red_lights(first, None)
    lights = [[round((x - box[0]) * k, 1), round((y - box[1]) * k, 1)] for x, y in L] if L else \
        [[round(cx - bw * 0.33, 1), round(base - bh * 0.45, 1)], [round(cx + bw * 0.33, 1), round(base - bh * 0.45, 1)]]
    pic = 'assets/mojo-film/%s-pic.webp' % rid
    pv = first.crop(first.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox())
    pv.thumbnail((256, 256), Image.LANCZOS)
    pv.save(os.path.join(ROOT, pic), quality=88, method=6)
    form, line, color = ROLE.get(rid, ('racer', 'Pembalap Piala Piston, siap ngebut!', COLORS[sum(map(ord, rid)) % len(COLORS)]))
    print(rid, [fw, fh], {v: len(f) for v, f in views_f.items()}, 'lights', 'found' if L else 'default')
    # fps here = drawn frames per second at full speed (the chase scales it with the speed)
    return {'name': name, 'pic': pic, 'form': form, 'line': line, 'color': color, 'cell': [fw, fh],
            'fps': round(1000 / (dur * every) * 0.6, 2),
            'anchor': {'cx': round(cx, 1), 'base': round(base, 1), 'bw': round(bw, 1), 'top': round(base - bh, 1), 'kind': 'ground', 'lights': lights,
                       'dust': [[round(cx - bw * 0.4, 1), round(base, 1)], [round(cx + bw * 0.4, 1), round(base, 1)]],
                       'exhaust': [[round(cx - bw * 0.2, 1), round(base - bh * 0.12, 1)], [round(cx + bw * 0.2, 1), round(base - bh * 0.12, 1)]]},
            'views': views}


COLORS = ['#E8432E', '#2E7BE8', '#F2B705', '#3DA35D', '#8E44AD', '#E67E22', '#16A085', '#C0392B']


def merge(entries, replace):
    s = open(JS).read()
    i = s.index('window.MojoRacerSheets = ') + len('window.MojoRacerSheets = ')
    data = json.loads(s[i:])
    n = len(data)
    for rid, e in entries:
        if rid in data and not replace:
            print('keep', rid, '(already in from the smooth-alpha pose pack)')
            continue
        e['order'] = data.get(rid, {}).get('order', 100 + len(data))
        data[rid] = e
    open(JS, 'w').write(s[:i] + json.dumps(data, sort_keys=True, ensure_ascii=False) + '\n')
    print(len(data) - n, 'added,', len(data), 'racers')


def single(rid, name, gif):
    # Lightning McQueen (owner 2026-10-18): one straight-view GIF, 72 frames at 50 ms -> every 3rd frame
    e = gif_racer(rid, name, {'straight': gif}, 3)
    e['order'] = 0
    merge([(rid, e)], True)


def gifdir(pack, replace=False):
    # Cars_18_Karakter_GIF_Transparan (owner 2026-10-18): <id>/straight.gif, left.gif, right.gif; 384 px, 50 frames
    man = json.load(open(os.path.join(pack, 'manifest.json')))
    data = json.loads(open(JS).read().split('window.MojoRacerSheets = ', 1)[1])
    out = []
    for ch in man['characters']:
        rid = slug(ch['name'].replace('"', ''))
        if rid in data and not replace:
            print('keep', rid); continue
        gifs = {c['motion']: os.path.join(pack, c['path']) for c in ch['clips'] if c['format'] == 'gif'}
        out.append((rid, gif_racer(rid, ch['name'].replace('"', ''), gifs, 2)))
    merge(out, replace)


if __name__ == '__main__':
    # python3 tools/ingest-film-racers.py <pack dir>
    # python3 tools/ingest-film-racers.py --single <id> "<Name>" <straight-view.gif>   (adds / replaces one racer)
    #   python3 tools/ingest-film-racers.py --gifdir <folder with <id>/straight|left|right.gif + manifest.json>
    if sys.argv[1] == '--single':
        single(sys.argv[2], sys.argv[3], sys.argv[4])
    elif sys.argv[1] == '--gifdir':
        gifdir(sys.argv[2], '--replace' in sys.argv)
    else:
        main(sys.argv[1])
