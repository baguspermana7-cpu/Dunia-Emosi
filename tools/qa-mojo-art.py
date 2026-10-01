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
            rgba = np.asarray(Image.open(clean.LIB / (name + '.webp')).convert('RGBA'))
            checked += 1
            keep = clean._pts(clean.KEEP_WHITE.get(name, ''))
            for component in self.page_components(rgba, page):
                grown = m.ndimage.binary_dilation(component, iterations=4)
                if not any(0 <= y < grown.shape[0] and 0 <= x < grown.shape[1] and grown[y, x] for x, y in keep):
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
