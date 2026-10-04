"""Regression checks for owner-art extraction and failure-safe publication.

Run with a Python environment containing Pillow, NumPy and SciPy:
    python tools/qa-mojo-art.py

Synthetic checks always run. Original-art checks explicitly skip when the
owner sheets are unavailable; no source or production asset is modified.
"""
import contextlib
import importlib.util
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
spec = importlib.util.spec_from_file_location('mojo_ingest', ROOT / 'tools/ingest-mojo-sheets.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

ospec = importlib.util.spec_from_file_location('mojo_outline', ROOT / 'tools/mojo_outline.py')
mo = importlib.util.module_from_spec(ospec)
ospec.loader.exec_module(mo)
INDEX = json.loads((ROOT / 'assets/db/index.json').read_text(encoding='utf-8'))['assets']


def ring_of(key):
    """White sticker outline thickness (px) recorded for a published sprite, or None (not outlined)."""
    return (INDEX.get(key) or {}).get('outline')


def art_only(key, rgba):
    """The published sprite with its deliberate white outline peeled off (fringe measures look at the art)."""
    t = ring_of(key)
    return rgba if t is None else mo.peel(rgba, t)


def outline_contact(key, raw):
    """For an outlined sprite: a predicate 'this component touches the peeled outline'. White paint AT the
    silhouette (a white tail fin, a skid end) merges with the ring and reads as outline; a page-coloured slab seen
    THROUGH the art (a cab window) is enclosed by art and never touches it, so the slab audit still sees those."""
    t = ring_of(key)
    if t is None:
        return lambda component: False
    ring = mo.ring_mask(raw, t)
    return lambda component: bool((m.ndimage.binary_dilation(component, iterations=2) & ring).any())


def source_sheets_available(*prefixes):
    return all(any(Path(m.SRC).glob(prefix + '-*')) for prefix in prefixes)


class CropTests(unittest.TestCase):
    def test_large_enclosed_white_body_is_preserved(self):
        source = np.full((140, 120, 3), 255, dtype=np.uint8)
        source[20:120, 20:100] = (0, 95, 190)
        source[28:112, 28:92] = 255
        snapshot = source.copy()
        with mock.patch.object(Image.Image, 'getbbox', lambda im: (0, 0, im.width, im.height)):
            result = np.asarray(m.cutout(source, 'white'))
        self.assertEqual(result[60, 60, 3], 255)
        np.testing.assert_array_equal(source, snapshot)
        np.testing.assert_array_equal(result[:, :, :3], source)

    @unittest.skipUnless(source_sheets_available('07', '08'), 'owner Mojo source sheets 07/08 unavailable')
    def test_critical_fuel_and_rocket_white_paint(self):
        with mock.patch.object(Image.Image, 'getbbox', lambda im: (0, 0, im.width, im.height)):
            fuel = np.asarray(dict(m.items('07'))['mojo-top/fuel'])
            rocket = np.asarray(dict(m.items('08'))['mojo-top/rocket'])
        for x, y in [(234, 51), (310, 70), (347, 96)]:
            self.assertEqual(fuel[y, x, 3], 255, ('fuel', x, y))
        for x, y in [(241, 62), (276, 105)]:
            self.assertEqual(rocket[y, x, 3], 255, ('rocket', x, y))

    def test_void_is_explicit_and_protected_paint_wins(self):
        source = np.full((140, 120, 3), 255, dtype=np.uint8)
        source[20:120, 20:100] = (40, 100, 140)
        source[30:110, 30:90] = 255
        with mock.patch.object(Image.Image, 'getbbox', lambda im: (0, 0, im.width, im.height)):
            void = np.asarray(m.cutout(source, 'white', voids=[(0, 0, 1, 1)]))
            paint = np.asarray(m.cutout(source, 'white', voids=[(0, 0, 1, 1)], preserve=[[(45, 45),(75,45),(75,75),(45,75)]]))
        self.assertEqual(void[60, 60, 3], 0)
        self.assertEqual(paint[60, 60, 3], 255)
        np.testing.assert_array_equal(paint[:, :, :3], source)

    @unittest.skipUnless(source_sheets_available('02'), 'owner Mojo source sheet 02 unavailable')
    def test_cone_white_band_is_not_cut_into_two_pieces(self):
        with mock.patch.object(Image.Image, 'getbbox', lambda im: (0, 0, im.width, im.height)):
            cone = np.asarray(dict(m.items('02'))['mojo-tile/cone'])
        self.assertEqual(cone[39, 46, 3], 255)

    @unittest.skipUnless(source_sheets_available('06'), 'owner Mojo source sheet 06 unavailable')
    def test_mixer_caption_pixels_are_excluded(self):
        mixer = np.asarray(dict(m.items('06'))['mojo-top/mixer'])
        labels, count = m.ndimage.label(mixer[:, :, 3] > 8, structure=np.ones((3,3)))
        self.assertEqual(count, 1, 'detached caption pixels below mixer')

    def test_all_680_source_cells_have_distinct_dispositions(self):
        output = []
        for prefix, layout in m.LAYOUT.items():
            kind = layout[0]
            if kind == 'boxes':
                names = [item[0] for item in layout[2]]
            elif kind in {'cells', 'grid'}:
                names = layout[-1]
            elif kind == 'bg':
                names = [m.B + name for name in layout[1] if name != '-']
            elif kind == 'pair':
                names = [m.B + layout[1] + '-land', m.B + layout[1] + '-port']
            else:
                names = []
            names = list(names) + [entry[0] for entry in getattr(m, 'EXTRA_CELLS', {}).get(prefix, [])]
            output.extend(m.SOURCE_VARIANTS.get((prefix, name), name) for name in names if name)
        self.assertEqual(len(output), 680)
        self.assertEqual(len(set(output)), 680)
        self.assertEqual(sum(name.startswith(m.T) for name in output), 47)
        self.assertEqual(len(m.SOURCE_VARIANTS), 15)
        self.assertEqual(sum(name.startswith(m.T) and '-sheet' not in name for name in output), 44)
        for forbidden in ('lula', 'skull', 'dynamite', 'catapult', 'cannon', 'sword', 'spiked'):
            self.assertFalse(any(forbidden in name for name in output), forbidden)

    def test_extra_crop_outside_source_fails_closed(self):
        with mock.patch.object(m, 'sheet_path', return_value='synthetic'), mock.patch.object(Image, 'open', return_value=Image.new('RGB', (8, 8), 'white')):
            with self.assertRaisesRegex(ValueError, 'invalid extra crop bounds'):
                m.items('16')

    def test_recovered_components_and_correct_character_variants_remain_discoverable(self):
        names = {entry[0] for entries in m.EXTRA_CELLS.values() for entry in entries}
        self.assertIn(m.P + 'windshields-sheet12', names)
        self.assertIn(m.P + 'bodies-sheet12', names)
        self.assertIn(m.U + 'bo-dialogue-sheet15', names)
        self.assertIn(m.U + 'oona-dialogue-sheet15', names)
        self.assertEqual(sum('decal-' in name for name in names), 8)
        self.assertEqual(sum(name.startswith(m.U + 'reference-') for name in names), 8)
        self.assertEqual(m.SOURCE_VARIANTS[('10', m.T + 'base')], m.T + 'base-sheet10')

    @unittest.skipUnless(source_sheets_available('15'), 'owner Mojo source sheet15 unavailable')
    def test_sheet15_bo_foreground_overhang_preserves_source_pixels(self):
        source = np.asarray(Image.open(m.sheet_path('15')).convert('RGB'))
        outputs = dict(m.items('15'))
        samples = {
            m.U + 'bo-dialogue-sheet15': [(425,203), (423,188), (429,293)],
            m.U + 'bo-result-sheet15': [(418,690), (403,690), (407,659), (413,708), (470,764)],
        }
        definitions = {entry[0]: entry[1] for entry in m.EXTRA_CELLS['15']}
        for name, coordinates in samples.items():
            x0,y0,x1,y1 = definitions[name]
            output = np.asarray(outputs[name])
            for x,y in coordinates:
                self.assertTrue(x0 <= x < x1 and y0 <= y < y1, (name,x,y,'foreground clipped'))
                self.assertEqual(output[y-y0,x-x0,3],255,(name,x,y))
                np.testing.assert_array_equal(output[y-y0,x-x0,:3],source[y,x])
        x0,y0,_,_ = definitions[m.U + 'bo-result-sheet15']
        self.assertEqual(np.asarray(outputs[m.U + 'bo-result-sheet15'])[540-y0,402-x0,3],0,'neighboring snow panel leaked')

    @unittest.skipUnless(source_sheets_available('13', '15'), 'owner Mojo source sheets13/15 unavailable')
    def test_recovered_cone_paint_and_town_split_are_complete(self):
        with mock.patch.object(Image.Image, 'getbbox', lambda im: (0, 0, im.width, im.height)):
            cone = np.asarray(dict(m.items('15'))[m.P + 'cone-sheet15'])
        self.assertEqual(cone[44,27,3],255,'new cone white stripe erased')
        definitions = {name: bounds for name,bounds,_ in m.EXTRA_CELLS['13']}
        house = definitions[m.P + 'town-house-sheet13']
        square = definitions[m.P + 'town-square-sheet13']
        self.assertLessEqual(house[0],144)
        self.assertGreater(house[2],282,'house right tree clipped')
        self.assertGreaterEqual(square[0],286,'neighbor house leaks into town square')
        self.assertLessEqual(square[0],286,'town square left skyline clipped')

    @unittest.skipUnless(source_sheets_available('12', '15'), 'owner Mojo source sheets12/15 unavailable')
    def test_recovered_flags_keep_white_checks_and_pole(self):
        with mock.patch.object(Image.Image, 'getbbox', lambda im: (0, 0, im.width, im.height)):
            flag12 = np.asarray(dict(m.items('12'))[m.P + 'decal-flag-sheet12'])
            flag15 = np.asarray(dict(m.items('15'))[m.P + 'flag-sheet15'])
        for x,y in [(55,27),(16,42),(42,13)]:
            self.assertEqual(flag12[y,x,3],255,('flag12',x,y))
        for x,y in [(55,21),(7,33)]:
            self.assertEqual(flag15[y,x,3],255,('flag15',x,y))

    def test_bad_measured_grid_fails_closed(self):
        with mock.patch.object(m, 'cells_of', return_value=[]), mock.patch.object(m, 'sheet_path', return_value='synthetic'), mock.patch.object(Image, 'open', return_value=Image.new('RGB', (500,500), 'white')):
            with self.assertRaisesRegex(ValueError, 'expected 25 measured cells'):
                m.items('25')

    def test_bad_background_geometry_fails_closed(self):
        with mock.patch.object(m, 'bg_panels', return_value=[(0,0,600,300), (0,350,600,700)]), mock.patch.object(m, 'sheet_path', return_value='synthetic'), mock.patch.object(Image, 'open', return_value=Image.new('RGB', (700,700), 'white')):
            with self.assertRaisesRegex(ValueError, 'one landscape and one portrait'):
                m.items('17')

    @unittest.skipUnless(source_sheets_available('03'), 'owner Mojo source sheet 03 unavailable')
    def test_condition_card_remains_complete_not_patchy(self):
        items = dict(m.items('03'))
        image = np.asarray(items['mojo-tile/if-number'])
        self.assertGreaterEqual(image.shape[0], 70)
        self.assertTrue((image[8:-8, 8:-8, 3] == 255).all())

clean_spec = importlib.util.spec_from_file_location('mojo_clean', ROOT / 'tools/clean-mojo-sprites.py')
clean = importlib.util.module_from_spec(clean_spec)
clean_spec.loader.exec_module(clean)


class SpriteCleanTests(unittest.TestCase):
    """Published sprites carry no page-coloured slab that was not audited as genuine white art."""
    @staticmethod
    def page_components(rgba, page):
        """Opaque components within 8 levels of the crop's own sheet-background colour, larger than 40 px."""
        solid = rgba[..., 3] >= 250
        near = np.abs(rgba[..., :3].astype(np.int16) - page.astype(np.int16)).max(2) <= clean.HOLE_TOL
        labels, _ = m.ndimage.label(solid & near, structure=np.ones((3, 3)))
        for index, bounds in enumerate(m.ndimage.find_objects(labels), 1):
            if bounds is not None and (labels[bounds] == index).sum() >= clean.MIN_AREA:
                yield labels == index

    @unittest.skipUnless(source_sheets_available('02', '04', '09', '13', '25'), 'owner Mojo source sheets unavailable')
    def test_no_unaudited_sheet_background_component_over_40px(self):
        """Every published cut-out: no enclosed slab of its sheet's background colour unless audited as white art."""
        failures, checked = [], 0
        for name, a, alpha, bbox, preserve in clean.source_crops():
            page = clean.page_colour(a, alpha)
            raw = np.asarray(Image.open(clean.LIB / (name + '.webp')).convert('RGBA'))
            rgba, at_ring = art_only(name, raw), outline_contact(name, raw)
            checked += 1
            p = mo.pad(ring_of(name)) if ring_of(name) else 0     # outlined sprites moved by pad(t)
            keep = [(x + p, y + p) for x, y in clean._pts(clean.KEEP_WHITE.get(name, ''))]
            for component in self.page_components(rgba, page):
                grown = m.ndimage.binary_dilation(component, iterations=4)
                if not at_ring(component) and not any(0 <= y < grown.shape[0] and 0 <= x < grown.shape[1] and grown[y, x] for x, y in keep):
                    ys, xs = np.nonzero(component)
                    failures.append(f'{name} {int(component.sum())}px @ {int(xs.mean())},{int(ys.mean())}')
        self.assertGreater(checked, 500)
        self.assertEqual(failures, [], 'sheet-background slabs not audited in tools/clean-mojo-sprites.py:\n' + '\n'.join(failures))

    def test_hole_clearing_never_touches_protected_white_paint(self):
        source = np.full((60, 60, 3), 254, dtype=np.uint8)
        source[5:55, 5:55] = (200, 40, 40)
        source[20:40, 20:40] = 254          # enclosed page-coloured square
        alpha = np.zeros((60, 60), np.uint8)
        alpha[5:55, 5:55] = 255
        seed = {'t/x': '25,25'}
        with unittest.mock.patch.dict(clean.CLEAR_HOLES, seed, clear=False):
            cleared = clean.clear_holes('t/x', source, alpha, (0, 0, 60, 60), (), np.float32([254] * 3), [])
            painted = clean.clear_holes('t/x', source, alpha, (0, 0, 60, 60), [[(18, 18), (42, 18), (42, 42), (18, 42)]],
                                        np.float32([254] * 3), [])
        self.assertEqual(cleared[30, 30], 0)
        self.assertEqual(cleared[10, 10], 255)
        self.assertEqual(painted[30, 30], 255)

    def test_halo_pass_lowers_light_fringe_but_keeps_outline_and_white_paint(self):
        source = np.full((40, 40, 3), 254, dtype=np.uint8)
        source[8:32, 8:32] = (30, 140, 220)   # blue body
        source[8:32, 8] = (20, 20, 20)         # dark outline column
        source[8:32, 31] = (246, 248, 250)     # light halo column at the right edge
        alpha = np.zeros((40, 40), np.uint8)
        alpha[8:32, 8:32] = 255
        rgb, out = clean.decontaminate(source, alpha, np.float32([254] * 3))
        self.assertLess(out[20, 31], 40, 'light halo stays opaque')
        self.assertEqual(out[20, 8], 255, 'dark outline eroded')
        self.assertEqual(out[20, 20], 255)
        white = np.full((40, 40, 3), 254, dtype=np.uint8)
        white[8:32, 8:32] = 250               # white paint touching the page
        _, kept = clean.decontaminate(white, alpha, np.float32([254] * 3))
        self.assertEqual(kept[20, 31], 255, 'white paint at the silhouette eroded')

    def test_audit_seeds_are_well_formed_and_disjoint(self):
        for table in (clean.CLEAR_HOLES, clean.KEEP_WHITE):
            for name, value in table.items():
                self.assertTrue(name.split('/')[0] in clean.CATEGORIES, name)
                self.assertTrue(clean._pts(value), name)
        for name in set(clean.CLEAR_HOLES) & set(clean.KEEP_WHITE):
            self.assertFalse(set(clean._pts(clean.CLEAR_HOLES[name])) & set(clean._pts(clean.KEEP_WHITE[name])), name)


hspec = importlib.util.spec_from_file_location('mojo_hero', ROOT / 'tools/ingest-mojo-hero.py')
hero = importlib.util.module_from_spec(hspec)
hspec.loader.exec_module(hero)
bspec = importlib.util.spec_from_file_location('mojo_bg', ROOT / 'tools/ingest-mojo-bg.py')
bgs = importlib.util.module_from_spec(bspec)
bspec.loader.exec_module(bgs)


def thin_light_ring(rgba):
    """Opaque near-white silhouette pixels whose nearest interior (> 4 px deep) is NOT light: a page halo."""
    a = rgba.astype(int)
    al = a[..., 3]
    rim = (al > 0) & m.ndimage.binary_dilation(al == 0)
    edge = (al >= 200) & rim
    light = edge & (a[..., :3].min(2) >= 235)
    core = m.ndimage.distance_transform_edt(al > 0) > 4
    if not core.any():
        return 0, int(edge.sum())
    _, (iy, ix) = m.ndimage.distance_transform_edt(~core, return_indices=True)
    # denominator: the whole 1 px rim, soft edges included (after the 2026-10-03 halo pass most rim pixels are
    # partial-alpha, and an opaque-only denominator inflated the share of the few white-paint pixels left)
    return int((light & (a[iy, ix, :3].min(2) < 200)).sum()), int(rim.sum())


class HeroArtTests(unittest.TestCase):
    """mojo-hero/*: the owner's primary film Mojo sheet (30), cut by tools/ingest-mojo-hero.py."""
    @unittest.skipUnless(hero.SHEET.exists(), 'owner primary Mojo sheet 30 unavailable')
    def test_every_cell_audited_fresh_and_tight(self):
        report, stale, seen = [], [], 0
        for name, _, box, cell in hero.sources():
            im, _, _, trim = hero.build(name, cell, report)
            seen += 1
            path = hero.LIB / hero.CAT / (name + '.webp')
            if not path.exists() or path.read_bytes() != hero.encode(im):
                stale.append(name)
            self.assertLessEqual(im.width, box[2] - box[0], name)
            alpha = np.asarray(im)[..., 3]
            self.assertTrue(alpha[0].any() and alpha[-1].any() and alpha[:, 0].any() and alpha[:, -1].any(), name + ' bounds not tight')
        self.assertEqual(seen, 25)
        self.assertEqual(report, [], 'unaudited holes / stale seeds in tools/ingest-mojo-hero.py:\n' + '\n'.join(report))
        self.assertEqual(stale, [], 'published mojo-hero sprites differ from a fresh ingest (re-run the tool)')

    def test_audit_tables_name_real_cells_and_are_disjoint(self):
        names = {n for n, _ in hero.CELLS}
        self.assertEqual(len(names), 25)
        for table in (hero.CLEAR_HOLES, hero.KEEP_WHITE):
            for name, value in table.items():
                self.assertIn(name, names)
                self.assertTrue(clean._pts(value), name)
        for name in set(hero.CLEAR_HOLES) & set(hero.KEEP_WHITE):
            self.assertFalse(set(clean._pts(hero.CLEAR_HOLES[name])) & set(clean._pts(hero.KEEP_WHITE[name])), name)

    def test_published_hero_sprites_have_no_page_halo(self):
        """White PAINT at the silhouette (roof strips, skids, wings) is allowed; a thin light ring around dark
        or coloured art is not. Measured 2026-10-03: worst 10.6% (chopper-1: white skid tubes and rotor blades at the edge)."""
        worst = []
        for path in sorted((hero.LIB / hero.CAT).glob('*.webp')):
            ring, edge = thin_light_ring(art_only(hero.CAT + '/' + path.stem, np.asarray(Image.open(path).convert('RGBA'))))
            worst.append((ring / max(edge, 1), path.stem))
        self.assertEqual(len(worst), 25)
        self.assertLess(max(worst)[0], 0.12, max(worst))

    def test_published_hero_sprites_have_no_page_coloured_slab(self):
        """No opaque component of page colour > 40 px unless it is audited white art."""
        if not hero.SHEET.exists():
            self.skipTest('owner primary Mojo sheet 30 unavailable')
        failures = []
        for name, _, _, cell in hero.sources():
            _, _, page, trim = hero.build(name, cell, [])
            raw = np.asarray(Image.open(hero.LIB / hero.CAT / (name + '.webp')).convert('RGBA'))
            rgba, at_ring = art_only(hero.CAT + '/' + name, raw), outline_contact(hero.CAT + '/' + name, raw)
            keep = [(x - trim[0], y - trim[1]) for x, y in clean._pts(hero.KEEP_WHITE.get(name, ''))]
            for component in SpriteCleanTests.page_components(rgba, page):
                grown = m.ndimage.binary_dilation(component, iterations=4)
                if not at_ring(component) and not any(0 <= y < grown.shape[0] and 0 <= x < grown.shape[1] and grown[y, x] for x, y in keep):
                    ys, xs = np.nonzero(component)
                    failures.append(f'{name} {int(component.sum())}px @ {int(xs.mean())},{int(ys.mean())}')
        self.assertEqual(failures, [])

    def test_floor_shadow_keeps_a_white_tube_and_softens_the_floor(self):
        """A shaded white tube lying on a soft grey shadow: the tube stays opaque, the shadow turns translucent."""
        h, w = 80, 90
        page = np.float32([254] * 3)
        a = np.full((h, w, 3), 254, np.uint8)
        for y in range(44, 70):           # soft shadow, darkest at y=56
            a[y, 5:85] = int(254 - 40 * (1 - abs(y - 56) / 13))
        for y, v in zip(range(40, 52), (200, 232, 240, 242, 238, 232, 226, 214, 196, 176, 150, 120)):
            a[y, 15:75] = v                # shaded white tube (highlight on top, dark rim below)
        a[40:52, 14] = a[40:52, 75] = 140  # its anti-aliased end caps (a rendered tube is outlined all round)
        a[30:40, 10:80] = (200, 30, 30)   # red body above
        alpha = np.where(np.abs(a.astype(int) - 254).max(2) > 8, 255, 0).astype(np.uint8)
        rgb, out = hero.floor_shadow(a, a.copy(), alpha, page, 5, hero.SHADOW_SMOOTH)
        self.assertTrue((out[41:50, 20:70] == 255).all(), 'white tube eroded into shadow')
        self.assertTrue((out[60:66, 20:70] < 60).all(), 'floor shadow left opaque')


LUMA = np.float32([0.299, 0.587, 0.114])


def fringe_metrics(rgba):
    """White-fringe measures for one RGBA sprite (owner phone test 2026-10-03: "the crop isn't perfect, there's
    still white here" - Bo and the film Mojo on the home screen).

    halo       share of the silhouette rim (edge px) that is PAGE MIX: an opaque pixel <= 2.5 px from transparency
               pulled >= 35% of the way from its interior colour F toward white and >= 25 luma lighter than F,
               where F (nearest pixel > 3 px deep) is not itself white (|255-F| >= 60). This is the halo the
               owner saw: blue jeans mixed with the page are (179,225,253) - min 179, so a "near-white > 225"
               count misses it (that count is reported as nearwhite). White PAINT at the edge has a white F and is
               never counted; a dark outline is darker than F and is never counted.
    nearwhite  opaque-ish pixels within 3 px of the edge with every channel > 225 whose interior is not light.
    smear      translucent near-white blob pixels (alpha 20-200, min > 200, neutral, 3x3-thick): a pale ground
               shadow left as a white veil.
    floor      the largest opaque light-grey neutral component (min >= 150) in the bottom 20% of rows that lies
               <= 20 px below dark tyre/chassis art and touches the open page beneath it: the sheet's floor shadow
               left as an opaque slab between the wheels.
    """
    a = rgba.astype(np.float32)
    al, c = a[..., 3], a[..., :3]
    solid = al > 0
    depth = m.ndimage.distance_transform_edt(np.pad(solid, 1))[1:-1, 1:-1]
    rim = solid & (depth <= 1.5)
    core = depth > 3
    mn, mx = c.min(2), c.max(2)
    out = {}
    if core.any():
        _, (iy, ix) = m.ndimage.distance_transform_edt(~core, return_indices=True)
        f = c[iy, ix]
        d = 255.0 - f
        n2 = (d ** 2).sum(2)
        pull = ((c - f) * d).sum(2) / np.maximum(n2, 1.0)
        mixed = solid & (depth <= 2.5) & (al >= 128) & (np.sqrt(n2) >= 60) & (pull >= 0.35) & ((c - f) @ LUMA >= 25)
        nearwhite = solid & (depth <= 3) & (mn > 225) & (f.min(2) < 200)
    else:
        mixed = nearwhite = np.zeros_like(solid)
    out['halo'] = float(mixed.sum() / max(int(rim.sum()), 1))
    out['nearwhite'] = int(nearwhite.sum())
    veil = (al >= 20) & (al <= 200) & (mn > 200) & (mx - mn < 30)
    out['smear'] = int(m.ndimage.binary_opening(veil, structure=np.ones((3, 3))).sum())
    h = al.shape[0]
    floor = (al >= 200) & (mn >= 150) & (mx - mn <= 16)
    floor[:int(h * 0.8)] = False
    dark = solid & (c @ LUMA < 70)
    near_dark = np.zeros_like(dark)
    for s in range(1, 21):
        near_dark[s:] |= dark[:-s]
    open_below = np.zeros_like(solid)
    open_below[:-1] = ~solid[1:]
    open_below[-1] = True
    lab, n = m.ndimage.label(floor & near_dark, structure=np.ones((3, 3)))
    out['floor'] = 0
    if n:
        touch = np.unique(lab[open_below & (lab > 0)])
        if len(touch):
            out['floor'] = int(m.ndimage.sum(np.ones_like(lab), lab, touch).max())
    return out


# Per family: max halo share. Tuned 2026-10-03 on the cleaned sprites (worst clean value in brackets) against
# the unfixed ones (every unfixed vehicle/character >= 0.18; the owner's two: mojo-char/bo 0.218, mojo-hero/base-bo
# 0.294). Families with DRAWN pale outlines (mojo-fx glows, mojo-ui captions/buttons, mojo-tile icons, the chase
# items/props icons, the codex cprops/ui/edu/vfx) are not halo-gated: a painted white stroke is indistinguishable
# from page mix at the pixel level; they are smear-gated only.
HALO_MAX = {
    'mojo-hero': 0.12,            # [0.095 chopper-1: white skid tubes]
    'mojo-char': 0.12,            # [0.058 race-bot]
    'mojo-top': 0.10,             # [0.042 jet]
    'mojo-rear': 0.24,            # [0.20 base/prop-plane: white bumpers and wing tips meet the dark tyres]
    'mojo-chase/vehicles': 0.20,  # [0.150 loot]
    'mojo-chase/robbers': 0.15,   # [0.086 robber-cap]
    'mojo-chase/signs': 0.15,     # [0.104 chevron-red]
}
# The element-library animals (light-blue card sheet 02, tint-only cleaning): white/cream fur drawn to the edge.
HALO_EXEMPT = {'mojo-char/' + n for n in ('bird', 'cat', 'cow', 'dog', 'rabbit', 'sheep')}
SMEAR_MAX = 80                    # [63 mojo-top/searchlight: its painted light beam]; families below
SMEAR_FAMILIES = ('mojo-hero', 'mojo-char', 'mojo-top', 'mojo-prop', 'mojo-rear', 'mojo-fx', 'mojo-ui', 'mojo-tile',
                  'mojo-chase/items', 'mojo-chase/props', 'mojo-chase/robbers', 'mojo-chase/vehicles', 'mojo-chase/signs')
FLOOR_MAX = 30                    # wheeled film poses [6 offroad/van]; unfixed base-bo 130, van 504
FLOOR_GATED = {'mojo-hero/' + n for n in hero.WHEELED}


def fringe_failures(lib):
    """Every gated sprite under lib that breaks a fringe limit, as readable lines."""
    lib = Path(lib)
    bad, seen = [], 0
    for fam in SMEAR_FAMILIES:
        for path in sorted((lib / fam).glob('*.webp')):
            key = fam + '/' + path.stem
            f = fringe_metrics(art_only(key, np.asarray(Image.open(path).convert('RGBA'))))
            seen += 1
            # an outlined sprite's rim is blended over its own white ring BY DESIGN (that is what disguises the
            # leftover pale pixels): its halo is gated by OutlineTests (ring coverage), not by page mix
            limit = None if ring_of(key) else HALO_MAX.get(fam)
            if limit is not None and key not in HALO_EXEMPT and f['halo'] > limit:
                bad.append(f'{key}: white edge halo {f["halo"]:.3f} > {limit} of the rim (near-white {f["nearwhite"]} px)')
            if f['smear'] > SMEAR_MAX:
                bad.append(f'{key}: translucent white smear {f["smear"]} px > {SMEAR_MAX}')
            if key in FLOOR_GATED and f['floor'] > FLOOR_MAX:
                bad.append(f'{key}: opaque light floor slab {f["floor"]} px under the vehicle > {FLOOR_MAX}')
    return bad, seen


class SpriteFringeTests(unittest.TestCase):
    """No Mojo sprite shows a white edge halo, a white translucent smear or an opaque floor slab."""
    def test_every_mojo_sprite_is_free_of_white_fringe(self):
        bad, seen = fringe_failures(ROOT / 'assets/db/lib')
        self.assertGreater(seen, 780)
        self.assertEqual(bad, [], 'white fringe (re-run the ingest tool; see tools/clean-mojo-sprites.decontaminate):\n' + '\n'.join(bad))

    def test_metric_flags_page_mix_but_not_white_paint_or_outline(self):
        img = np.zeros((40, 40, 4), np.uint8)
        img[8:32, 8:32] = (110, 170, 215, 255)           # blue body
        img[8:32, 31] = (180, 222, 250, 255)             # page-mixed rim column (min 180: not "near white")
        self.assertGreater(fringe_metrics(img)['halo'], 0.15)
        img[8:32, 31] = (20, 30, 40, 255)                # dark outline instead
        self.assertEqual(fringe_metrics(img)['halo'], 0.0)
        white = np.zeros((40, 40, 4), np.uint8)
        white[8:32, 8:32] = (250, 250, 250, 255)         # white paint to the edge
        self.assertEqual(fringe_metrics(white)['halo'], 0.0)

    def test_metric_flags_floor_slab_and_white_veil(self):
        img = np.zeros((100, 80, 4), np.uint8)
        img[20:84, 5:75] = (40, 150, 220, 255)           # body
        img[70:90, 8:20] = img[70:90, 60:72] = (25, 25, 25, 255)   # tyres
        img[76:84, 20:60] = (30, 30, 40, 255)            # dark chassis underside
        img[84:92, 20:60] = (172, 170, 170, 255)         # opaque grey floor between the tyres
        self.assertGreater(fringe_metrics(img)['floor'], FLOOR_MAX)
        img[84:92, 20:60] = (0, 0, 0, 60)                # the same floor as a translucent dark shadow
        self.assertLessEqual(fringe_metrics(img)['floor'], FLOOR_MAX)
        img[84:96, 20:60] = (240, 240, 240, 120)         # a white veil
        self.assertGreater(fringe_metrics(img)['smear'], 100)


# Owner 2026-10-03: "There's still a little white. We should give it a white outline line to disguise it."
# family -> (expected outlined sprite count, one shared thickness or None = per pose)
OUTLINED = {
    'mojo-hero': (25, 5), 'mojo-char': (47, None), 'mojo-top': (47, 8), 'mojo-rear': (25, 5),
    'mojo-chase/robbers': (4, 5), 'mojo-chase/vehicles': (44, 5), 'mojo-chase/items': (8, 4),
}
NEVER_OUTLINED = ('mojo-bg', 'mojo-prop', 'mojo-fx', 'mojo-tile', 'mojo-ui', 'mojo-chase/props', 'mojo-chase/signs',
                  'mojo-chase/vfx', 'mojo-chase/far', 'mojo-chase/biome')
RING_COVERAGE = 0.90      # measured 2026-10-03: worst 0.994 (mojo-hero/base-front, mojo-char/rabbit)


def outline_failures(lib):
    lib = Path(lib)
    bad, counts = [], {}
    for fam, (count, fixed) in OUTLINED.items():
        for path in sorted((lib / fam).glob('*.webp')):
            key = fam + '/' + path.stem
            t = ring_of(key)
            if t is None:
                continue
            counts[fam] = counts.get(fam, 0) + 1
            if not mo.MIN_T <= t <= mo.MAX_T or (fixed is not None and t != fixed):
                bad.append(f'{key}: outline {t} px outside {mo.MIN_T}-{mo.MAX_T} / family value {fixed}')
            rgba = np.asarray(Image.open(path).convert('RGBA'))
            entry = INDEX[key]
            if (entry.get('w'), entry.get('h')) != (rgba.shape[1], rgba.shape[0]):
                bad.append(f'{key}: index w/h {entry.get("w")}x{entry.get("h")} != file {rgba.shape[1]}x{rgba.shape[0]}')
            st = mo.ring_stats(rgba, t)
            if st['coverage'] < RING_COVERAGE:
                bad.append(f'{key}: white ring on {st["coverage"]:.3f} of the boundary < {RING_COVERAGE}')
            if not t - 1.5 <= st['thickness'] <= t + 1.0:
                bad.append(f'{key}: ring width {st["thickness"]:.1f} px, expected {t} (-1.5/+1)')
            if st['clipped']:
                bad.append(f'{key}: {st["clipped"]} opaque px on the canvas edge (outline clipped)')
        if counts.get(fam, 0) != count:
            bad.append(f'{fam}: {counts.get(fam, 0)} outlined sprites, expected {count}')
    for key, entry in INDEX.items():
        if entry.get('outline') and key.startswith(NEVER_OUTLINED):
            bad.append(f'{key}: world/background art must not be outlined')
    return bad


def anchors_json(name, var):
    text = (ROOT / 'games/data' / name).read_text(encoding='utf-8')
    return json.loads(text[text.index(var + ' = ') + len(var) + 3:text.rindex(' })(')])


class OutlineTests(unittest.TestCase):
    """White sticker outline: present, even, unclipped, never on world art, and the anchors still line up."""
    def test_outlined_families_have_an_even_unclipped_white_ring(self):
        bad = outline_failures(ROOT / 'assets/db/lib')
        self.assertEqual(bad, [], 'outline (re-run the ingest tools; see tools/mojo_outline.py):\n' + '\n'.join(bad))

    def test_anchor_baselines_agree_and_match_the_published_canvas(self):
        rear = anchors_json('mojo-rear-anchors.js', 'W.MojoRearAnchors')
        fams = {'mojo-rear': rear} | {'mojo-chase/' + f: v for f, v in anchors_json('mojo-chase-anchors.js', 'W.MojoChaseAnchors')['families'].items()}
        for fam, data in fams.items():
            bases = [a['base'] for a in data['sprites'].values()]
            self.assertLessEqual(max(bases) - min(bases), 2, fam)
            for name, a in data['sprites'].items():
                path = ROOT / 'assets/db/lib' / fam / (name + '.webp')
                rgba = np.asarray(Image.open(path).convert('RGBA'))
                self.assertEqual((rgba.shape[1], rgba.shape[0]), (data['size']['w'], data['size']['h']), name)
                rows = np.nonzero((rgba[..., 3] >= 128).sum(1) >= 2)[0]
                self.assertLessEqual(abs(int(rows[-1]) - a['base']), 2, f'{fam}/{name}: contact row moved')

    def test_outline_is_exact_inside_and_never_fills_an_enclosed_gap(self):
        img = np.zeros((60, 60, 4), np.uint8)
        img[10:50, 10:50] = (200, 40, 40, 255)
        img[25:35, 25:35] = 0                              # an enclosed see-through gap (cab window)
        img[10:50, 49] = (180, 120, 120, 128)              # a soft anti-aliased rim
        out, (ox, oy) = mo.outline(img, 4)
        self.assertEqual((ox, oy), (mo.pad(4),) * 2)
        inner = out[oy:oy + 60, ox:ox + 60]
        opaque = img[..., 3] == 255
        np.testing.assert_array_equal(inner[opaque], img[opaque])
        self.assertTrue((inner[25:35, 25:35, 3] == 0).all(), 'enclosed gap filled')
        self.assertTrue((out[oy + 30, ox + 7:ox + 10, :3] == 255).all() and (out[oy + 30, ox + 7:ox + 10, 3] == 255).all())
        self.assertEqual(int(out[0].max()), 0)
        again, _ = mo.outline(img, 4)
        np.testing.assert_array_equal(out, again)          # deterministic
        st = mo.ring_stats(out, 4)
        self.assertGreater(st['coverage'], 0.95)
        self.assertEqual(st['clipped'], 0)
        self.assertLess(mo.ring_stats(np.pad(img, ((8, 8), (8, 8), (0, 0))), 4)['coverage'], 0.1, 'no ring must fail')

    def test_floor_shadow_is_drawn_under_the_ring_not_outlined(self):
        img = np.zeros((40, 60, 4), np.uint8)
        img[5:25, 10:50] = (30, 140, 220, 255)
        img[25:35, 5:55] = (0, 0, 0, 70)                   # the cleaners' translucent black floor shadow
        out, (ox, oy) = mo.outline(img, 3)
        self.assertEqual(int(out[oy + 33, ox + 2, 3]), 0, 'ring drawn around the floor shadow')
        self.assertEqual(tuple(out[oy + 33, ox + 6]), (0, 0, 0, 70))


class SceneBackgroundTests(unittest.TestCase):
    """mojo-bg scene paintings from sheets 31-55 (tools/ingest-mojo-bg.py) and their use in mojo-art.js."""
    def test_every_scene_in_the_theme_map_exists_in_both_orientations_within_budget(self):
        js = (ROOT / 'games/data/mojo-art.js').read_text(encoding='utf-8')
        block = js[js.index('var SCENE = {'):js.index('}', js.index('var SCENE = {'))]
        import re
        names = set(re.findall(r":\s*'([a-z-]+)'", block))
        self.assertGreaterEqual(len(names), 22)
        for name in names:
            for kind, budget in (('land', 250 * 1024), ('port', 200 * 1024)):
                path = ROOT / 'assets/db/lib/mojo-bg' / f'{name}-{kind}.webp'
                self.assertTrue(path.exists(), path)
                self.assertLessEqual(path.stat().st_size, budget, path)
                w, h = Image.open(path).size
                self.assertTrue(w > h if kind == 'land' else h > w, path)

    @unittest.skipUnless(any(Path(bgs.SRC).glob('55-*')), 'owner sheet 55 unavailable')
    def test_pirate_flag_emblem_is_painted_out(self):
        """CHILD SAFETY: no skull on the shipwreck flag, in the source fix AND in both published files."""
        fixed = bgs.paint_out_emblems(bgs.sheet('55'), bgs.RETOUCH['55'])
        rects = bgs.rects(bgs.sheet('55'))
        for (x0, y0, x1, y1) in bgs.RETOUCH['55']:
            sub = fixed[y0:y1, x0:x1].astype(int)
            cloth = sub.mean(2) < 95
            flag = m.ndimage.binary_fill_holes(m.ndimage.binary_closing(np.pad(cloth, 6), iterations=4))[6:-6, 6:-6]
            neutral_light = (sub.min(2) > 120) & (sub.max(2) - sub.min(2) < 30)
            self.assertEqual(int((flag & neutral_light).sum()), 0)
            for kind, (rx0, ry0, rx1, ry1) in rects.items():
                if rx0 <= x0 and x1 <= rx1 and ry0 <= y0 and y1 <= ry1:
                    pub = np.asarray(Image.open(ROOT / f'assets/db/lib/mojo-bg/pirate-pier-{kind}.webp').convert('RGB')).astype(int)
                    p = pub[y0 - ry0:y1 - ry0, x0 - rx0:x1 - rx0]
                    self.assertEqual(int((flag & (p.min(2) > 175) & (p.max(2) - p.min(2) < 30)).sum()), 0, kind)

    def test_duplicate_sheets_are_registered_once(self):
        self.assertEqual(set(bgs.DUPLICATES), {'50', '52'})
        self.assertFalse(set(bgs.DUPLICATES) & set(bgs.SHEETS))


class PublicationTests(unittest.TestCase):
    def test_unknown_or_excluded_sheet_fails_before_writing(self):
        with mock.patch.object(sys, 'argv', ['ingest', '--assets-only', '14']), mock.patch.object(m.os, 'makedirs', side_effect=AssertionError('must not write')):
            with self.assertRaisesRegex(ValueError, 'unknown or excluded'):
                m.main()

    def run_fake(self, result_fn, failure=None, save=None):
        with tempfile.TemporaryDirectory() as td:
            directory = Path(td)
            prior = directory / 'lib/mojo-prop/testa.webp'
            prior.parent.mkdir(parents=True)
            prior.write_bytes(b'prior-sprite')
            patch_args = dict(SCRATCH=str(directory/'scratch'), LIB=str(directory/'lib'), LAYOUT={'02':(), '03':()}, items=result_fn, contact=lambda *a: None)
            with mock.patch.multiple(m, **patch_args), mock.patch.object(sys, 'argv', ['ingest', '--assets-only']), contextlib.redirect_stdout(io.StringIO()):
                if save:
                    save_context = mock.patch.object(Image.Image, 'save', save)
                else:
                    save_context = contextlib.nullcontext()
                with save_context:
                    if failure:
                        with self.assertRaises(failure):
                            m.main()
                        self.assertEqual(prior.read_bytes(), b'prior-sprite')
                        self.assertFalse((directory/'lib/mojo-prop/testb.webp').exists())
                        self.assertFalse((directory/'scratch/written-metadata.json').exists())
                    else:
                        with mock.patch.object(m, 'publish', side_effect=AssertionError('assets-only must not merge indexes')):
                            m.main()
                        self.assertNotEqual(prior.read_bytes(), b'prior-sprite')
                        metadata = json.loads((directory/'scratch/written-metadata.json').read_text())
                        self.assertEqual(len(metadata), 2)
                        self.assertEqual(metadata['mojo-prop/testb']['w'], 3)

    @staticmethod
    def images(pfx):
        return [('mojo-prop/testa', Image.new('RGBA', (2,2), (10,30,100,255)))] if pfx == '02' else [('mojo-prop/testb', Image.new('RGBA', (3,3), (10,30,100,255)))]

    def test_late_missing_source_does_not_publish_early_assets(self):
        def items(pfx):
            if pfx == '03':
                raise FileNotFoundError('late missing source')
            return self.images(pfx)
        self.run_fake(items, FileNotFoundError)

    def test_empty_required_sprite_does_not_publish(self):
        self.run_fake(lambda pfx: self.images(pfx) if pfx == '02' else [('mojo-prop/testb', None)], ValueError)

    def test_late_encoder_failure_does_not_publish(self):
        original_save = Image.Image.save
        def save(im, *args, **kwargs):
            if im.size == (3,3):
                raise OSError('encoder fault')
            return original_save(im, *args, **kwargs)
        self.run_fake(self.images, OSError, save)

    def test_valid_assets_only_batch(self):
        self.run_fake(self.images)

    def test_full_publication_preserves_unrelated_json_and_js_entries(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            index, javascript = root / 'index.json', root / 'asset-index.js'
            kept = {'file': 'assets/db/lib/tk-legend-side/kept.webp', 'cat': 'tk-legend-side'}
            index.write_text(json.dumps({'assets': {'tk-legend-side/kept': kept}}))
            javascript.write_text('prior JS')
            overrides = dict(SCRATCH=str(root/'scratch'), LIB=str(root/'lib'),
                             INDEX=str(index), AIDX=str(javascript), LAYOUT={'02':(), '03':()},
                             items=self.images, contact=lambda *args: None)
            with mock.patch.multiple(m, **overrides), mock.patch.object(sys, 'argv', ['ingest']), contextlib.redirect_stdout(io.StringIO()):
                m.main()
            updated = json.loads(index.read_text())['assets']
            self.assertEqual(updated['tk-legend-side/kept'], kept)
            self.assertEqual(len(updated), 3)
            self.assertIn('mojo-prop/testa', javascript.read_text())
            self.assertIn('tk-legend-side/kept', javascript.read_text())
            self.assertTrue((root/'lib/mojo-prop/testa.webp').is_file())

    def test_promote_io_failure_rolls_back(self):
        import asset_transaction as tx
        original = tx.os.replace
        with tempfile.TemporaryDirectory() as td:
            first, second = Path(td)/'a.webp', Path(td)/'b.webp'
            first.write_bytes(b'old')
            failed = False
            def replace(a, b):
                nonlocal failed
                if Path(b) == second and not failed:
                    failed = True
                    raise OSError('injected promotion fault')
                return original(a, b)
            with mock.patch.object(tx.os, 'replace', replace):
                with self.assertRaises(OSError):
                    m.replace_batch({first: b'new', second: b'new2'})
            self.assertEqual(first.read_bytes(), b'old')
            self.assertFalse(second.exists())
            self.assertFalse(list(Path(td).glob('.dunia-*')))

if __name__ == '__main__':
    unittest.main(verbosity=2)
