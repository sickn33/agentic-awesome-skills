#!/usr/bin/env python3
"""Stamp a film's timed elements with its story's lengths (HyperFrames reads durations from static HTML).

Usage: python3 tools/stamp.py <project-dir>

Elements carry a marker attribute and get their data-duration rewritten:
  data-stamp="story"      → story.duration (root, stage, sfx bed)
  data-stamp="narration"  → length of assets/audio/narration.wav
Run after tools/sync.sh whenever the story changes (tools/new_film.sh does it for you).
"""
import json, re, subprocess, sys
from pathlib import Path

P = Path(sys.argv[1]).resolve()
story = json.loads(re.search(r"window\.STORY = (.*);\s*$", (P / "lib/story.js").read_text(encoding="utf-8"), re.S).group(1))
narr = P / "assets/audio/narration.wav"
lens = {"story": max(float(story["duration"]), float((story.get("recap") or {}).get("end", 0)))}
if narr.exists():
    lens["narration"] = round(float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(narr)]).decode()), 2)
html = (P / "index.html").read_text(encoding="utf-8")
count = {}


def fix(m):
    tag = m.group(0)
    kind = re.search(r'data-stamp="(\w+)"', tag).group(1)
    if kind not in lens:
        sys.exit(f"stamp: no length for data-stamp=\"{kind}\"")
    count[kind] = count.get(kind, 0) + 1
    v = f"{lens[kind]:g}"
    return re.sub(r'data-duration="[^"]*"', f'data-duration="{v}"', tag) if "data-duration=" in tag else tag[:-1] + f' data-duration="{v}">'


html = re.sub(r"<[a-z][^>]*\bdata-stamp=\"\w+\"[^>]*>", fix, html)
(P / "index.html").write_text(html, encoding="utf-8")
print("stamped", ", ".join(f"{k}={lens[k]:g}s ×{n}" for k, n in count.items()) or "nothing (no data-stamp elements)")
