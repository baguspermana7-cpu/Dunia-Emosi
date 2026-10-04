"""Regression checks for literal owner artwork and protected HQ provenance."""
import importlib.util
import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch

import numpy as np
from PIL import Image

TOOLS = Path(__file__).resolve().parent


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, TOOLS / filename)
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


class LegacyProtection(unittest.TestCase):
    def test_old_ingester_cannot_write_low_resolution_sides(self):
        old = module('legacy_ingest', 'ingest-tk-legend.py')
        for category in ['tk-legend-side', 'tk-legend-side/.', '../tk-legend-side', '/tmp/unowned']:
            with self.subTest(category=category), self.assertRaisesRegex(ValueError, 'ingest-tk-legend-hq'):
                old.ingest('unused.png', 'bottom', category, False)

    def test_supported_legacy_command_updates_only_top_views(self):
        old = module('legacy_ingest_main', 'ingest-tk-legend.py')
        with tempfile.TemporaryDirectory() as folder:
            index = Path(folder) / 'index.json'
            original = '{"assets":{"tk-legend-side/hms-victory":{"source":"legend-side-hq-1.png#2","file":"assets/db/lib/tk-legend-side/hms-victory.webp"}}}'
            index.write_text(original, encoding='utf-8')
            with patch.object(old, 'INDEX', str(index)), patch.object(old, 'ingest', return_value=({}, [], [], {})) as ingest, patch.object(old.ias, 'JS', str(Path(folder) / 'asset-index.js')):
                self.assertEqual(old.main(), 0)
            self.assertEqual([call.args[2] for call in ingest.call_args_list], ['tk-legend-top'])
            self.assertIn('legend-side-hq-1.png#2', index.read_text(encoding='utf-8'))


class PublicationRollback(unittest.TestCase):
    def test_invalid_index_does_not_truncate_existing_javascript(self):
        helper = module('shared_asset_writer', 'ingest-asset-sheets.py')
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'asset-index.js'
            target.write_bytes(b'approved javascript')
            with patch.object(helper, 'JS', str(target)), self.assertRaises(KeyError):
                helper.write_js({'assets': {'invalid': {}}})
            self.assertEqual(target.read_bytes(), b'approved javascript')

    def test_symlink_and_duplicate_destinations_are_rejected_before_promotion(self):
        transaction = module('transaction_paths', 'asset_transaction.py')
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); original = root / 'original'; link = root / 'link'
            original.write_bytes(b'approved'); link.symlink_to(original)
            for files in [{original: b'changed', link: b'candidate'},
                          {original: b'first', str(root / './original'): b'second'}]:
                with self.assertRaisesRegex(ValueError, 'symlink|duplicate'):
                    transaction.replace_batch(files)
                self.assertEqual(original.read_bytes(), b'approved')
                self.assertTrue(link.is_symlink())

    def test_cleanup_failure_preserves_rollback_recovery_message_and_backup(self):
        transaction = module('transaction_cleanup', 'asset_transaction.py')
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); asset = root / 'ship.webp'; index = root / 'index.json'
            asset.write_bytes(b'approved'); index.write_bytes(b'approved index')
            replace, unlink = transaction.os.replace, Path.unlink

            def fail_replace(source, target):
                if Path(target) == index or Path(source).name.startswith('.dunia-backup-'):
                    raise OSError('injected promotion or rollback failure')
                return replace(source, target)

            def fail_cleanup(path, *args, **kwargs):
                if path.name.startswith('.dunia-asset-'):
                    raise PermissionError('cleanup denied')
                return unlink(path, *args, **kwargs)

            with patch.object(transaction.os, 'replace', side_effect=fail_replace), patch.object(Path, 'unlink', fail_cleanup):
                with self.assertRaisesRegex(OSError, 'rollback incomplete.*backup:.*cleanup'):
                    transaction.replace_batch({asset: b'candidate', index: b'candidate index'})
            backups = list(root.glob('.dunia-backup-*'))
            self.assertEqual(len(backups), 1)
            self.assertEqual(backups[0].read_bytes(), b'approved')

    def test_index_failure_restores_replaced_asset_and_removes_new_asset(self):
        transaction = module('transaction', 'asset_transaction.py')
        with tempfile.TemporaryDirectory() as folder:
            asset, new, index = [Path(folder) / name for name in ['old.webp', 'new.webp', 'index.json']]
            asset.write_bytes(b'approved'); index.write_bytes(b'approved index')
            replace = transaction.os.replace

            def fail_on_index(source, target):
                if Path(target) == index:
                    raise OSError('injected index promotion failure')
                return replace(source, target)

            with patch.object(transaction.os, 'replace', side_effect=fail_on_index), self.assertRaisesRegex(OSError, 'injected'):
                transaction.replace_batch({asset: b'candidate', new: b'new', index: b'candidate index'})
            self.assertEqual(asset.read_bytes(), b'approved')
            self.assertEqual(index.read_bytes(), b'approved index')
            self.assertFalse(new.exists())
            self.assertFalse(list(Path(folder).glob('.dunia-*')))


class CropGeometry(unittest.TestCase):
    def test_blank_art_has_controlled_outcomes(self):
        hq = module('hq_blank', 'ingest-tk-legend-hq.py')
        blank = np.full((260, 504, 3), 255, dtype=np.uint8)
        self.assertIsNone(hq.cut_clean(blank), 'blank foreground returns no sprite')
        with self.assertRaisesRegex(ValueError, 'foreground'):
            hq.remove_sea(blank)
        with self.assertRaisesRegex(ValueError, 'caption'):
            hq.ship_window(np.full((1024, 1536, 3), 255, dtype=np.uint8), 0, 342, 0)

    def test_out_of_bounds_source_masks_fail(self):
        hq = module('hq_bounds', 'ingest-tk-legend-hq.py')
        with self.assertRaisesRegex(ValueError, 'bounds'):
            hq.polygon_mask((10, 10, 3), [[(0, 0), (20, 20), (5, 5)]])

    def test_invalid_source_dimensions_fail_before_segmentation(self):
        hq = module('hq_shape', 'ingest-tk-legend-hq.py')
        with self.assertRaisesRegex(ValueError, 'RGB'):
            hq.cut_clean(np.empty((0, 0, 3), dtype=np.uint8))


class LiteralShipPixels(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.hq = module('hq_ingest', 'ingest-tk-legend-hq.py')
        source = Path(cls.hq.SRC) / cls.hq.SHEETS[0][0]
        if not source.exists():
            raise unittest.SkipTest('Owner source sheets unavailable; visual fidelity remains unverified')
        with Image.open(source) as image:
            cls.sheet = np.asarray(image.convert('RGB')).copy()

    def cell(self, slug):
        _, rows, names = self.hq.SHEETS[0]
        row, column = divmod(names.index(slug), 3)
        top, bottom = self.hq.ship_window(self.sheet, rows[row], rows[row + 1], column * 512)
        return self.sheet[top:bottom, column * 512 + 4:column * 512 + 508].copy()

    def test_navy_hull_is_not_mistaken_for_seawater(self):
        source = self.cell('empress-of-ireland')
        clean, _ = self.hq.remove_sea(source, slug='empress-of-ireland')
        np.testing.assert_array_equal(clean[214, 340], source[214, 340])
        np.testing.assert_array_equal(clean[250, 340], [255, 255, 255])

    def test_pale_sail_highlight_stays_solid(self):
        source = self.cell('hms-victory')
        clean, _ = self.hq.remove_sea(source, slug='hms-victory')
        sprite = self.hq.cut_clean(clean, sail=True, trim=False, slug='hms-victory')
        self.assertGreaterEqual(sprite[90, 280, 3], 250)
        np.testing.assert_array_equal(sprite[90, 280, :3], source[90, 280])
        self.assertEqual(sprite[80, 490, 3], 0, 'sky outside the ship must remain clear')

    def test_enclosed_rigging_sky_is_clear_without_erasing_white_cabin(self):
        path = Path(self.hq.SRC) / 'legend-side-hq-3.png'
        with Image.open(path) as image:
            sheet = np.asarray(image.convert('RGB')).copy()
        top, bottom = self.hq.ship_window(sheet, 327, 679, 1024)
        cell = sheet[top:bottom, 1028:1532]
        sprite = self.hq.cut_clean(cell, slug='andrea-gail', trim=False)
        self.assertEqual(sprite[186, 260, 3], 0)
        self.assertGreaterEqual(sprite[188, 155, 3], 250)
        self.assertGreaterEqual(sprite[275, 250, 3], 250, 'the dark keel must remain whole')
        self.assertLess(sprite[274, 450, 3], 25, 'white ground beside the curved bow is not part of the boat')
        self.assertLess(sprite[274, 25, 3], 160, 'pale detached floor fringe must not become opaque paint')

    def test_steamship_rigging_pockets_are_sky_not_white_paint(self):
        cases = {
            'hms-hood': [(72, 192), (94, 173)],
            'uss-arizona': [(56, 170)],
            'bismarck': [(68, 163), (71, 150), (19, 178)],
            'yamato': [(79, 160), (47, 162), (43, 178), (51, 180)],
            'ss-waratah': [(451, 187), (468, 192)],
            'andrea-doria': [(432, 146)],
            'carpathia': [(442, 178), (465, 193)],
            'great-eastern': [(54, 160), (78, 151), (76, 164)],
            'kursk': [(434, 211)],
            'ss-sultana': [(272, 83), (300, 103), (76, 129), (433, 140)],
            'empress-of-ireland': [(262, 91), (313, 100), (431, 157)],
        }
        for filename, rows, names in self.hq.SHEETS:
            with Image.open(Path(self.hq.SRC) / filename) as image:
                sheet = np.asarray(image.convert('RGB')).copy()
            for slug, points in cases.items():
                if slug not in names:
                    continue
                row, column = divmod(names.index(slug), 3)
                top, bottom = self.hq.ship_window(sheet, rows[row], rows[row + 1], column * 512)
                cell = sheet[top:bottom, column * 512 + 4:column * 512 + 508]
                if filename in self.hq.WAVES:
                    cell, _ = self.hq.remove_sea(cell, slug)
                sprite = self.hq.cut_clean(cell, slug=slug, trim=False)
                with self.subTest(slug=slug):
                    for x, y in points:
                        self.assertEqual(sprite[y, x, 3], 0, f'{slug}: page pocket at {x},{y}')
                    if filename not in self.hq.WAVES:
                        self.assertGreater(sprite[-12, 250, 3], 240, 'painted hull must stay opaque')

    def test_gold_caption_badges_do_not_enter_ship_sprites(self):
        filename, rows, names = self.hq.SHEETS[1]
        with Image.open(Path(self.hq.SRC) / filename) as image:
            sheet = np.asarray(image.convert('RGB')).copy()
        for slug, x, y in [('ss-waratah', 58, 272), ('edmund-fitzgerald', 52, 242)]:
            row, column = divmod(names.index(slug), 3)
            top, bottom = self.hq.ship_window(sheet, rows[row], rows[row + 1], column * 512)
            cell = sheet[top:bottom, column * 512 + 4:column * 512 + 508]
            sprite = self.hq.cut_clean(cell, slug=slug, trim=False)
            with self.subTest(slug=slug):
                self.assertEqual(sprite[y, x, 3], 0, 'gold caption arc must be transparent')
                self.assertGreater(sprite[-12, 250, 3], 240, 'keel remains whole')

    def test_rejected_quality_batch_does_not_publish_any_asset_or_index(self):
        hq = self.hq
        sheet, rows, names = hq.SHEETS[0]
        sample = np.full((10, 10, 4), 255, dtype=np.uint8)
        sample[:, :, :3] = [40, 60, 80]
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); index = root / 'index.json'; asset = root / 'mary-rose.webp'
            index.write_text('{"assets":{}}', encoding='utf-8'); asset.write_bytes(b'approved')
            output = io.StringIO()
            with redirect_stdout(output), patch.object(hq, 'OUT', folder), patch.object(hq, 'INDEX', str(index)), patch.object(hq, 'SHEETS', [(sheet, rows, [names[0]])]), patch.object(hq, 'cut_clean', return_value=sample), patch.object(hq.ias, 'psnr_opaque', return_value=(0, 3)), patch.object(hq.transaction, 'publish') as publish:
                self.assertEqual(hq.main(), 1)
                publish.assert_not_called()
            self.assertIn('FAIL mary-rose: webp psnr 0.0 alpha 3', output.getvalue())
            self.assertEqual(asset.read_bytes(), b'approved')
            self.assertEqual(index.read_text(encoding='utf-8'), '{"assets":{}}')

    def test_missing_later_sheet_leaves_earlier_asset_unpublished(self):
        hq = self.hq
        sheet, rows, names = hq.SHEETS[0]
        sample = np.full((10, 10, 4), 255, dtype=np.uint8)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); index = root / 'index.json'; asset = root / 'mary-rose.webp'
            index.write_text('{"assets":{}}', encoding='utf-8'); asset.write_bytes(b'approved')
            sheets = [(sheet, rows, [names[0]]), ('missing.png', rows, [names[1]])]
            with patch.object(hq, 'OUT', folder), patch.object(hq, 'INDEX', str(index)), patch.object(hq, 'SHEETS', sheets), patch.object(hq, 'cut_clean', return_value=sample), patch.object(hq.ias, 'psnr_opaque', return_value=(50, 0)), patch.object(hq.transaction, 'publish') as publish:
                with self.assertRaises(FileNotFoundError):
                    hq.main()
                publish.assert_not_called()
            self.assertEqual(asset.read_bytes(), b'approved')
            self.assertEqual(index.read_text(encoding='utf-8'), '{"assets":{}}')


class StickerOutline(unittest.TestCase):
    """Grid sprites wear the white sticker rim (tools/tk_outline.py, the Mojo outline module)."""
    def test_twins_are_outlined_and_rebuild_identically(self):
        tko = module('tk_outline_gate', 'tk_outline.py')
        for twin, src in tko.TARGETS.items():
            with self.subTest(twin=twin):
                path = tko.LIB / (twin + '.webp')
                self.assertTrue(path.exists(), twin + ' is published')
                rgba = np.asarray(Image.open(path).convert('RGBA'))
                self.assertGreaterEqual(tko.rim_white(rgba), 0.5, twin + ' carries a white rim')
                self.assertEqual(path.read_bytes(), tko.build(src)[0], twin + ' rebuilds byte-identically (never double-outlined)')

    def test_grid_uses_the_outlined_patrol(self):
        grid = (TOOLS.parent / 'games' / 'tk-grid.js').read_text(encoding='utf-8')
        self.assertIn("patrol: 'tk-top/patrol-ol'", grid)


if __name__ == '__main__':
    unittest.main()
