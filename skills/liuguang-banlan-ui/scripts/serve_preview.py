#!/usr/bin/env python3
"""Serve a directory over local HTTP with caching disabled, for previews and screenshots."""

import argparse
import functools
import http.server
import pathlib


# python -m http.server sends Last-Modified without Cache-Control, so browsers keep
# serving a stale theme-config.js after an edit and screenshots measure the old field.
class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", nargs="?", type=pathlib.Path, default=pathlib.Path("."))
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--bind", default="127.0.0.1")
    args = parser.parse_args()
    root = args.directory.resolve()
    handler = functools.partial(NoStoreHandler, directory=str(root))
    with http.server.ThreadingHTTPServer((args.bind, args.port), handler) as server:
        print(f"serving {root} at http://{args.bind}:{args.port}/ with Cache-Control: no-store")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
