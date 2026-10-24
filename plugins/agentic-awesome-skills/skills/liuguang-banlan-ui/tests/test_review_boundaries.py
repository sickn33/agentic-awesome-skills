import copy
import functools
import http.server
import io
from pathlib import Path
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import manifest_parser as parser
import measure_preview as measurement
import scaffold_template as scaffold
import serve_preview as server
import validate_manifest as validator
from PIL import Image


class ReviewTests(unittest.TestCase):
    def test_parser_rejects_executable_and_nonfinite_data(self):
        for source in [
            'window.SPECTRAL_THEME={seed:1e999};',
            'window.SPECTRAL_THEME={__proto__:{hidden:1}};',
            'window.SPECTRAL_THEME={a:1,a:2};',
            'window.SPECTRAL_THEME=loadConfig();',
        ]:
            with self.assertRaises(parser.ManifestSyntaxError):
                parser.parse_manifest(source)

    def test_manifest_checks_actual_output_contract(self):
        config = parser.load_manifest(ROOT/'assets/starter/opal/theme-config.js')
        for key, value in [('output', []), ('schemaVersion', 'unknown'), ('label', None)]:
            changed = copy.deepcopy(config)
            changed[key] = value
            self.assertTrue(validator.validate(changed))
        config['colors'][0]['label'] = None
        self.assertTrue(validator.validate(config))

    def test_scaffold_rejects_escape_and_existing_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp).resolve()
            with self.assertRaises(ValueError):
                scaffold.scaffold(ROOT, directory/'out', '../escape')
            link = directory/'linked-parent'
            link.symlink_to(directory, target_is_directory=True)
            with self.assertRaises(ValueError):
                scaffold.scaffold(ROOT, link/'out', 'opal')
            output = directory/'out'
            scaffold.scaffold(ROOT, output, 'opal')
            self.assertTrue((output/'shared/spectral-field.js').exists())
            self.assertNotIn('../shared/', (output/'index.html').read_text())
            with self.assertRaises(SystemExit):
                scaffold.scaffold(ROOT, output, 'opal')

    def test_measurement_rejects_transparency_and_invalid_blocks(self):
        config = parser.load_manifest(ROOT/'assets/starter/opal/theme-config.js')
        with tempfile.TemporaryDirectory() as tmp:
            image = Path(tmp)/'transparent.png'
            Image.new('RGBA', (8,8), (0,0,0,0)).save(image)
            with self.assertRaises(ValueError):
                measurement.measure(image, config)
            Image.new('RGB', (8,8), (255,255,255)).save(image)
            with self.assertRaises(ValueError):
                measurement.measure(image, config, 0)
            self.assertEqual(measurement.measure(image, config, 64)['blockSize'], 8)

    def test_preview_denies_secret_paths_and_links(self):
        class Quiet(server.NoStoreHandler):
            def log_message(self, *args): pass
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/'.env').write_text('secret')
            (root/'public.txt').write_text('public')
            (root/'linked.txt').symlink_to(root/'public.txt')
            handler = functools.partial(Quiet, directory=str(root))
            with http.server.ThreadingHTTPServer(('127.0.0.1',0), handler) as preview:
                thread = threading.Thread(target=preview.serve_forever, daemon=True)
                thread.start()
                try:
                    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                    base = f'http://127.0.0.1:{preview.server_address[1]}'
                    for path in ['/.env', '/linked.txt', '/']:
                        with self.assertRaises(urllib.error.HTTPError) as caught:
                            opener.open(base+path, timeout=3)
                        self.assertEqual(caught.exception.code,403)
                    with opener.open(base+'/public.txt',timeout=3) as response:
                        self.assertEqual(response.read(), b'public')
                finally:
                    preview.shutdown()
                    thread.join(timeout=3)


if __name__ == '__main__':
    unittest.main()
