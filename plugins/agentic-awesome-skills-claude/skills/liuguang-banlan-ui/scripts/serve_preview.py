#!/usr/bin/env python3
"""Serve a directory over local HTTP with caching disabled, for previews and screenshots."""

import argparse
import functools
import http.server
import pathlib


# python -m http.server sends Last-Modified without Cache-Control, so browsers keep
# serving a stale theme-config.js after an edit and screenshots measure the old field.
class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        lexical_root = pathlib.Path(self.directory).absolute()
        root = lexical_root.resolve()
        translated = pathlib.Path(self.translate_path(self.path)).absolute()
        try:
            relative = translated.relative_to(lexical_root)
        except ValueError:
            self.send_error(403, "Resource outside preview root")
            return None
        target = root / relative
        candidates = [target]
        if target.is_dir():
            candidates.extend(target / name for name in ("index.html", "index.htm"))
        for candidate in candidates:
            parts = candidate.relative_to(root).parts
            if (not candidate.resolve().is_relative_to(root)
                    or any(root.joinpath(*parts[:i]).is_symlink() for i in range(1, len(parts) + 1))):
                self.send_error(403, "Symlink resources are not served")
                return None
        return super().send_head()

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
