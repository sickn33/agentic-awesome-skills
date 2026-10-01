import functools
import http.server
import pathlib
import sys
import tempfile
import threading
import unittest
import urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
import serve_preview  # noqa: E402


class QuietHandler(serve_preview.NoStoreHandler):
    def log_message(self, *args):
        pass


class ServePreviewTest(unittest.TestCase):
    def test_responses_are_not_cached(self):
        body = b"window.SPECTRAL_THEME = {};"
        with tempfile.TemporaryDirectory() as root:
            pathlib.Path(root, "theme-config.js").write_bytes(body)
            handler = functools.partial(QuietHandler, directory=root)
            with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
                threading.Thread(target=server.serve_forever, daemon=True).start()
                try:
                    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
                    url = f"http://127.0.0.1:{server.server_address[1]}/theme-config.js"
                    with opener.open(url) as response:
                        self.assertEqual(response.headers["Cache-Control"], "no-store")
                        self.assertEqual(response.read(), body)
                finally:
                    server.shutdown()


if __name__ == "__main__":
    unittest.main()
