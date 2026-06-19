#!/usr/bin/env python3
"""Standalone viewer + API server for a YouTube deep-dive library.

Zero framework dependencies (Python stdlib + PyYAML). It serves the interactive
artifact and a small read/write API over a plain folder of markdown files, so the
whole thing runs anywhere with no custom backend.

  python3 serve.py [--dir LIBRARY] [--port 8000] [--artifact path/to/artifact.html]

LIBRARY defaults to $VIDEO_LIBRARY_DIR or ~/video-deepdives. Layout:
  LIBRARY/<YTID>.md                     one markdown file per video (frontmatter + transcript)
  LIBRARY/_media/<YTID>-slide-NN.jpg    slide images

Routes (the artifact talks to these; the /api/video-deepdives namespace is
arbitrary and kept only so the same artifact HTML works unmodified):
  GET   /                                       the artifact (single-page app)
  GET   /api/video-deepdives              list every video (flattened frontmatter)
  GET   /api/video-deepdives/<id>         one video: {meta, body}
  GET   /api/video-deepdives/_media/<f>   a slide image
  PATCH /api/video-deepdives/<id>         merge {fields:{...}} into frontmatter, rewrite
"""
import argparse, json, os, sys, re, mimetypes, posixpath
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

try:
    import yaml
except ImportError:
    sys.exit("pip install pyyaml")

API = "/api/video-deepdives"
FM_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)


def split_frontmatter(text):
    """Return (meta_dict, body_str) from a markdown file with YAML frontmatter."""
    m = FM_RE.match(text)
    if not m:
        return {}, text
    meta = yaml.safe_load(m.group(1)) or {}
    return meta, m.group(2)


def dump_file(meta, body):
    out = "---\n" + yaml.safe_dump(meta, sort_keys=False, allow_unicode=True, width=100) + "---\n"
    return out + body


def load_item(lib, slug):
    path = os.path.join(lib, slug + ".md")
    if not os.path.isfile(path):
        return None
    meta, body = split_frontmatter(open(path, encoding="utf-8").read())
    return path, meta, body


def list_items(lib):
    items = []
    for fn in sorted(os.listdir(lib)):
        if not fn.endswith(".md") or fn.startswith("_"):
            continue
        slug = fn[:-3]
        loaded = load_item(lib, slug)
        if not loaded:
            continue
        _, meta, body = loaded
        it = dict(meta)
        it["slug"] = slug
        it["file"] = fn
        it["preview"] = body.strip()[:160]
        items.append(it)
    return items


class Handler(BaseHTTPRequestHandler):
    lib = None
    artifact = None

    def log_message(self, *a):
        pass  # quiet

    def _send(self, code, body, ctype="application/json"):
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, b"")

    def do_GET(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        if path in ("/", "/index.html"):
            try:
                return self._send(200, open(self.artifact, encoding="utf-8").read(), "text/html; charset=utf-8")
            except OSError:
                return self._send(500, {"error": "artifact not found: " + self.artifact})

        if path == API:
            items = list_items(self.lib)
            return self._send(200, {"collection": "video-deepdives", "total": len(items), "items": items})

        if path.startswith(API + "/_media/"):
            fn = posixpath.basename(path)  # strip any traversal
            fp = os.path.join(self.lib, "_media", fn)
            if not os.path.isfile(fp):
                return self._send(404, {"error": "no such media"})
            ctype = mimetypes.guess_type(fp)[0] or "application/octet-stream"
            with open(fp, "rb") as f:
                return self._send(200, f.read(), ctype)

        if path.startswith(API + "/"):
            slug = posixpath.basename(path)
            loaded = load_item(self.lib, slug)
            if not loaded:
                return self._send(404, {"error": "no such item"})
            _, meta, body = loaded
            return self._send(200, {"slug": slug, "type": "video-deepdive", "meta": meta, "body": body.rstrip("\n")})

        return self._send(404, {"error": "not found"})

    def do_PATCH(self):
        path = self.path.split("?", 1)[0].rstrip("/")
        if not path.startswith(API + "/"):
            return self._send(404, {"error": "not found"})
        slug = posixpath.basename(path)
        loaded = load_item(self.lib, slug)
        if not loaded:
            return self._send(404, {"error": "no such item"})
        fp, meta, body = loaded
        try:
            n = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(n) or b"{}")
        except (ValueError, json.JSONDecodeError):
            return self._send(400, {"error": "bad json"})
        fields = payload.get("fields", payload)  # accept {fields:{...}} or a bare dict
        if not isinstance(fields, dict):
            return self._send(400, {"error": "fields must be an object"})
        meta.update(fields)
        open(fp, "w", encoding="utf-8").write(dump_file(meta, body))
        return self._send(200, {"ok": True, "slug": slug, "updated": list(fields.keys())})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.expanduser(os.environ.get("VIDEO_LIBRARY_DIR", "~/video-deepdives")))
    ap.add_argument("--port", type=int, default=int(os.environ.get("VIDEO_LIBRARY_PORT", "8000")))
    ap.add_argument("--host", default="127.0.0.1")
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--artifact", default=os.path.join(here, "..", "reference", "artifact.html"))
    a = ap.parse_args()

    lib = os.path.abspath(os.path.expanduser(a.dir))
    os.makedirs(lib, exist_ok=True)
    Handler.lib = lib
    Handler.artifact = os.path.abspath(a.artifact)
    n = len([f for f in os.listdir(lib) if f.endswith(".md") and not f.startswith("_")])
    print(f"Library: {lib}  ({n} videos)")
    print(f"Artifact: {Handler.artifact}")
    print(f"Serving on http://{a.host}:{a.port}/   (Ctrl-C to stop)")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
