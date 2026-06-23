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
from pathlib import Path
from tempfile import TemporaryDirectory

try:
    import yaml
except ImportError:
    sys.exit("pip install pyyaml")

API = "/api/video-deepdives"
FM_RE = re.compile(r"^---\n(.*?)\n---\n?(.*)$", re.DOTALL)
SAFE_SLUG_RE = re.compile(r"^[A-Za-z0-9_-]+$")
SAFE_MEDIA_RE = re.compile(r"^[A-Za-z0-9_.-]+$")
SAFE_PATH_PART_RE = re.compile(r"^[A-Za-z0-9_.-]+$")
SAFE_CTYPE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]*(?:; charset=[A-Za-z0-9._-]+)?$")
LOCAL_ORIGIN_RE = re.compile(r"^(https?)://(127\.0\.0\.1|localhost)(:\d+)?$")


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


def library_path(lib, *parts):
    root = Path(lib).resolve()
    candidate = root
    for part in parts:
        value = str(part)
        if not SAFE_PATH_PART_RE.fullmatch(value) or value in {".", ".."}:
            return None
        candidate = candidate / value
    candidate = candidate.resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate


def media_path(lib, filename):
    if not SAFE_MEDIA_RE.fullmatch(filename or ""):
        return None
    media_dir = library_path(lib, "_media")
    if not media_dir or not media_dir.is_dir():
        return None
    for path in media_dir.iterdir():
        if path.is_file() and path.name == filename:
            return path
    return None


def item_path(lib, slug):
    if not SAFE_SLUG_RE.fullmatch(slug or ""):
        return None
    target = slug + ".md"
    for path in Path(lib).resolve().iterdir():
        if path.is_file() and path.name == target:
            return path
    return None


def safe_content_type(ctype):
    return ctype if isinstance(ctype, str) and SAFE_CTYPE_RE.match(ctype) else "application/octet-stream"


def safe_local_origin(origin):
    m = LOCAL_ORIGIN_RE.fullmatch(origin or "")
    if not m:
        return None
    scheme, host, port = m.groups()
    return f"{scheme}://{host}{port or ''}"


def load_item(lib, slug):
    path = item_path(lib, slug)
    if not path or not path.is_file():
        return None
    meta, body = split_frontmatter(path.read_text(encoding="utf-8"))
    return path, meta, body


def list_items(lib):
    items = []
    for path in sorted(Path(lib).iterdir()):
        fn = path.name
        if not path.is_file() or not fn.endswith(".md") or fn.startswith("_"):
            continue
        slug = path.stem
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
    write_token = None

    def log_message(self, *a):
        pass  # quiet

    def _send(self, code, body, ctype="application/json"):
        ctype = safe_content_type(ctype)
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode()
        elif isinstance(body, str):
            body = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Video-Library-Token")
        origin = safe_local_origin(self.headers.get("Origin"))
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
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
            if not SAFE_MEDIA_RE.fullmatch(fn):
                return self._send(400, {"error": "bad media name"})
            fp = media_path(self.lib, fn)
            if not fp or not fp.is_file():
                return self._send(404, {"error": "no such media"})
            ctype = mimetypes.guess_type(str(fp))[0] or "application/octet-stream"
            return self._send(200, fp.read_bytes(), ctype)

        if path.startswith(API + "/"):
            slug = posixpath.basename(path)
            loaded = load_item(self.lib, slug)
            if not loaded:
                return self._send(404, {"error": "no such item"})
            _, meta, body = loaded
            return self._send(200, {"slug": slug, "type": "video-deepdive", "meta": meta, "body": body.rstrip("\n")})

        return self._send(404, {"error": "not found"})

    def do_PATCH(self):
        if not self.write_token:
            return self._send(403, {"error": "writes disabled"})
        if self.headers.get("X-Video-Library-Token") != self.write_token:
            return self._send(403, {"error": "bad write token"})
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
        fp.write_text(dump_file(meta, body), encoding="utf-8")
        return self._send(200, {"ok": True, "slug": slug, "updated": list(fields.keys())})


def self_test():
    with TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "video_1.md").write_text("---\ntitle: Demo\n---\nBody", encoding="utf-8")
        (root / "_media").mkdir()
        (root / "_media" / "video_1-slide-01.jpg").write_bytes(b"x")
        assert load_item(str(root), "video_1")
        assert load_item(str(root), "../secret") is None
        assert library_path(str(root), "_media", "../video_1.md") is None
        assert safe_content_type("text/html; charset=utf-8") == "text/html; charset=utf-8"
        assert safe_content_type("text/html\r\nX-Bad: 1") == "application/octet-stream"
        assert safe_local_origin("http://localhost:8000") == "http://localhost:8000"
        assert safe_local_origin("http://localhost:8000\r\nX-Bad: 1") is None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--dir", default=os.path.expanduser(os.environ.get("VIDEO_LIBRARY_DIR", "~/video-deepdives")))
    ap.add_argument("--port", type=int, default=int(os.environ.get("VIDEO_LIBRARY_PORT", "8000")))
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--write-token", default=os.environ.get("VIDEO_LIBRARY_WRITE_TOKEN"))
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--artifact", default=os.path.join(here, "..", "reference", "artifact.html"))
    a = ap.parse_args()
    if a.self_test:
        self_test()
        return

    lib = os.path.abspath(os.path.expanduser(a.dir))
    os.makedirs(lib, exist_ok=True)
    Handler.lib = lib
    Handler.artifact = os.path.abspath(a.artifact)
    Handler.write_token = a.write_token
    n = len([f for f in os.listdir(lib) if f.endswith(".md") and not f.startswith("_")])
    print(f"Library: {lib}  ({n} videos)")
    print(f"Artifact: {Handler.artifact}")
    print("Writes: " + ("enabled with X-Video-Library-Token" if Handler.write_token else "disabled (set VIDEO_LIBRARY_WRITE_TOKEN to enable PATCH)"))
    print(f"Serving on http://{a.host}:{a.port}/   (Ctrl-C to stop)")
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
