"""Behavioral checks for concurrent asset publication and recovery failures."""
import importlib.util
import json
import tempfile
import threading
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('asset_transaction', Path(__file__).with_name('asset_transaction.py'))
transaction = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(transaction)


class ConcurrentPublication(unittest.TestCase):
    def run_publishers(self, fail_second: bool) -> None:
        first_render, release_first, second_render = [threading.Event() for _ in range(3)]
        local = threading.local()
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); index = root / 'index.json'; javascript = root / 'index.js'
            initial = {'assets': {'legacy': {'file': 'legacy.webp'}}}
            index.write_text(json.dumps(initial)); javascript.write_text(json.dumps(initial))

            def render(data):
                if getattr(local, 'publisher', '') == 'first':
                    first_render.set()
                    if not release_first.wait(5):
                        raise TimeoutError('test did not release first publisher')
                else:
                    second_render.set()
                return json.dumps(data)

            def publish(name):
                local.publisher = name
                return transaction.publish(str(index), {name: {'file': name + '.webp'}},
                                           {root / (name + '.webp'): name.encode()}, helper)

            replace = transaction.os.replace

            def maybe_fail(source, target):
                if fail_second and getattr(local, 'publisher', '') == 'second' and Path(target) == index:
                    raise OSError('injected second-publisher index failure')
                return replace(source, target)

            helper = SimpleNamespace(JS=str(javascript), render_js=render)
            with patch.object(transaction.os, 'replace', side_effect=maybe_fail), ThreadPoolExecutor(max_workers=2) as pool:
                first = pool.submit(publish, 'first')
                self.assertTrue(first_render.wait(5))
                second = pool.submit(publish, 'second')
                entered_early = second_render.wait(.2)
                release_first.set()
                first.result(timeout=5)
                if fail_second:
                    with self.assertRaisesRegex(OSError, 'second-publisher'):
                        second.result(timeout=5)
                else:
                    second.result(timeout=5)
            self.assertFalse(entered_early, 'second publisher must wait before reading or rendering indexes')
            expected = {'legacy', 'first'} if fail_second else {'legacy', 'first', 'second'}
            result = json.loads(index.read_text())
            self.assertEqual(set(result['assets']), expected)
            self.assertEqual(json.loads(javascript.read_text()), result)
            self.assertEqual((root / 'first.webp').read_bytes(), b'first')
            self.assertEqual((root / 'second.webp').exists(), not fail_second)

    def test_concurrent_successes_keep_both_publishers(self):
        self.run_publishers(False)

    def test_failed_second_publisher_keeps_first_publisher(self):
        self.run_publishers(True)

    def test_cleanup_failure_after_success_reports_published_state(self):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'ship.webp'; target.write_bytes(b'old')
            unlink = Path.unlink

            def fail_backup_cleanup(path, *args, **kwargs):
                if path.name.startswith('.dunia-backup-'):
                    raise PermissionError('injected cleanup failure')
                return unlink(path, *args, **kwargs)

            with patch.object(Path, 'unlink', fail_backup_cleanup):
                with self.assertRaisesRegex(OSError, 'published successfully.*cleanup'):
                    transaction.replace_batch({target: b'new'})
            self.assertEqual(target.read_bytes(), b'new')
            self.assertEqual(list(Path(folder).glob('.dunia-backup-*'))[0].read_bytes(), b'old')


if __name__ == '__main__':
    unittest.main()
