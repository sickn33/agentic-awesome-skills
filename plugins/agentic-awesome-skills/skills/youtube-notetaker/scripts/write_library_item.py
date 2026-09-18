#!/usr/bin/env python3
"""Assemble the library markdown file for a video deep-dive.

Usage:
  write_library_item.py --id <YTID> --title "..." --speaker "..." \
    --tags a,b,c --slides slides.json --transcript transcript.txt [--created YYYY-MM-DD]

slides.json: a JSON array of slide objects. Each:
  {
    "idx": 1,                # sequence/original frame number (display only; sorted by t)
    "t": 55.7,               # seconds (float ok) — used for video seeking
    "mmss": "00:55",         # display label
    "title": "Slide title",  # short headline
    "note": "1-3 sentences grounded in the transcript at this timestamp.",
    "img": "/api/video-deepdives/_media/<YTID>-slide-01.jpg"
  }

Writes  $VIDEO_LIBRARY_DIR/<YTID>.md  (default ~/video-deepdives/<YTID>.md)
with YAML frontmatter + transcript body. No em dashes or arrows in titles/notes.
"""
import argparse, json, os, re, sys, datetime
from pathlib import Path


def safe_user_path(path_value, base_dir="."):
    """Resolve a CLI path under the current workspace."""
    if base_dir != ".":
        raise ValueError("Custom base directories are not supported for CLI paths")
    base_path = Path.cwd().resolve()
    resolved_path = Path(path_value).expanduser().resolve()
    try:
        resolved_path.relative_to(base_path)
    except ValueError as exc:
        raise ValueError(f"Path escapes allowed directory: {path_value}") from exc
    return resolved_path
try:
    import yaml
except ImportError:
    sys.exit("pip install pyyaml")

LIB = os.path.expanduser(os.environ.get("VIDEO_LIBRARY_DIR", "~/video-deepdives"))
YTID_RE = re.compile(r"\A[A-Za-z0-9_-]{11}\Z")

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--id",required=True)
    ap.add_argument("--title",required=True)
    ap.add_argument("--speaker",default="")
    ap.add_argument("--tags",default="")
    ap.add_argument("--slides",required=True)
    ap.add_argument("--transcript",required=True)
    ap.add_argument("--created",default=datetime.date.today().isoformat())
    a=ap.parse_args()
    if not YTID_RE.fullmatch(a.id):
        sys.exit("--id must be an exact 11-character YouTube video id")

    slides=json.load(open(a.slides))
    slides=sorted(slides,key=lambda s:s["t"])
    for bad in ("—","→"):
        for s in slides:
            if bad in (s.get("title") or "")+(s.get("note") or ""):
                sys.exit(f"Found forbidden char {bad!r} in slide notes/titles; remove it.")

    fm={
        "id":a.id,
        "title":a.title,
        "youtube_id":a.id,
        "speaker":a.speaker,
        "source_url":f"https://www.youtube.com/watch?v={a.id}",
        "slide_count":len(slides),
        "created":a.created,
        "tags":[t.strip() for t in a.tags.split(",") if t.strip()],
        "slides":slides,
    }
    body=open(a.transcript,encoding="utf-8").read().strip()
    library = Path(LIB).expanduser()
    if library.is_symlink():
        sys.exit("VIDEO_LIBRARY_DIR must not be a symbolic link")
    library.mkdir(parents=True, exist_ok=True)
    library = library.resolve()
    path = library / f"{a.id}.md"
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write("---\n")
        yaml.safe_dump(fm,f,sort_keys=False,allow_unicode=True,width=100)
        f.write("---\n## Transcript\n")
        f.write(body+"\n")
    print(f"wrote {path}  ({len(slides)} slides, {len(body.splitlines())} transcript lines)")
    print("Verify with: scripts/verify.sh "+a.id)

if __name__=="__main__": main()
