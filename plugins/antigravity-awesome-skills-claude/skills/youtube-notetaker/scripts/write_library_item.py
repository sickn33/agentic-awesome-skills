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
import argparse, json, os, sys, datetime
try:
    import yaml
except ImportError:
    sys.exit("pip install pyyaml")

LIB = os.path.expanduser(os.environ.get("VIDEO_LIBRARY_DIR", "~/video-deepdives"))

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
    os.makedirs(LIB,exist_ok=True)
    path=os.path.join(LIB,f"{a.id}.md")
    with open(path,"w",encoding="utf-8") as f:
        f.write("---\n")
        yaml.safe_dump(fm,f,sort_keys=False,allow_unicode=True,width=100)
        f.write("---\n## Transcript\n")
        f.write(body+"\n")
    print(f"wrote {path}  ({len(slides)} slides, {len(body.splitlines())} transcript lines)")
    print("Verify with: scripts/verify.sh "+a.id)

if __name__=="__main__": main()
