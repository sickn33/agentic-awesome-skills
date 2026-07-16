---
name: youtube-notetaker
description: "Turn YouTube talks into local study notes with slides, transcripts, editable annotations, and a markdown-backed viewer."
category: "video"
risk: "safe"
source: "official"
source_repo: "dair-ai/dair-academy-plugins"
source_type: "official"
date_added: "2026-06-19"
author: "DAIR.AI"
license: "MIT"
license_source: "https://github.com/dair-ai/dair-academy-plugins/blob/main/README.md#license"
tags:
  - dair-academy
  - ai
  - workflow
tools:
  - claude-code
  - codex-cli
  - cursor
---

# YouTube Notetaker

## When to Use

Use when this workflow matches the user request: >


_Source: [dair-ai/dair-academy-plugins](https://github.com/dair-ai/dair-academy-plugins) (MIT)._

Build a personal library of YouTube talks you study with. Each video becomes one **plain
markdown file**: slide snapshots at their timestamps, a full timestamped transcript, and
editable notes. A small bundled server renders the library as an interactive deep-dive in the
browser. No database, no cloud service. Everything is files on disk you fully own.

## Architecture (read this first)

The **markdown library is the single source of truth**. The artifact is a thin HTML shell that
fetches from the server and writes notes back. Never hardcode video data into the HTML.

- **Library:** a plain folder, set by `VIDEO_LIBRARY_DIR` (default `~/video-deepdives/`).
  - One markdown file per video, **filename slug = YouTube id** (e.g. `RtywqDFBYnQ.md`).
  - Frontmatter holds video metadata + a `slides` array.
  - Body holds the full transcript as `[HH:MM:SS] text` lines.
  - `_media/` holds slide images, **namespaced per video** as `<youtube_id>-slide-NN.jpg`
    to avoid collisions between videos.
- **Server:** `scripts/serve.py`, a single stdlib + PyYAML file. Start it with:
  ```
  python3 scripts/serve.py --dir ~/video-deepdives --port 8000
  ```
  It serves the artifact at `/` and a small API the artifact talks to:
  - `GET /api/video-deepdives` (front page fetches this) lists every video.
  - `GET /api/video-deepdives/<id>` returns one video `{meta, body}`.
  - `GET /api/video-deepdives/_media/<file>` serves a slide image.
  - `PATCH /api/video-deepdives/<id>` with `{fields:{slides:[...]}}` writes notes back.
  - **It picks up new videos automatically** the moment a markdown file exists. Adding a video
    means writing a markdown file + media; you almost never touch the HTML.
  - The `/api/video-deepdives` URL namespace is local to the bundled server.
- **Artifact:** `reference/artifact.html`, served by `serve.py` at `/`. A clean reference copy;
  only rewrite it if the user wants a UI change. For new videos, leave it alone.

## Requirements

- `yt-dlp` and `ffmpeg` on PATH (download + frame/scene extraction).
- Python 3 with `Pillow` (contact sheet) and `PyYAML` (markdown file + server).
  ```
  pip install yt-dlp pillow pyyaml      # ffmpeg via your package manager
  ```

## Adding a video — the pipeline

All helper scripts are in `scripts/`. Work in a scratch dir (e.g. `/tmp/ytnote-<id>/`), then
copy final assets into the library. Set `VIDEO_LIBRARY_DIR` once per shell if you don't want the
default. **Do not use em dashes (—) or arrows (→) in notes/titles.**

### 1. Resolve the id and check embeddability
```
scripts/setup.sh "<youtube_url_or_id>"
```
Prints the 11-char `YTID`, the scratch dir, the target library path, and whether YouTube
**embedding is allowed** (oembed 200) or **blocked** (oembed 401, e.g. some university talks).
If blocked, inline playback won't work but the artifact degrades gracefully to an "open at this
moment on YouTube" link, so proceed normally.

### 2. Download video + subtitles
```
scripts/download.sh "<YTID>" /tmp/ytnote-<YTID>
```
Uses `yt-dlp` to grab the video (≤720p is plenty for slide frames) and the best available
subtitles (manual if present, else auto-captions) as `.vtt`. Also fetches title/uploader.

### 3. Detect candidate slide timestamps
```
scripts/detect_slides.sh /tmp/ytnote-<YTID>/video.mp4 /tmp/ytnote-<YTID>
```
Runs ffmpeg scene detection (`select='gt(scene,0.3)'`) and writes `scene_times.txt` (seconds).
0.3 is a good default; lower it (0.2) for subtle slide decks, raise it (0.4) for busy video.

### 4. Build a contact sheet and CURATE
```
python3 scripts/contact_sheet.py /tmp/ytnote-<YTID>/video.mp4 /tmp/ytnote-<YTID>/scene_times.txt /tmp/ytnote-<YTID>/contact.jpg
```
Read `contact.jpg` (labeled with index + timestamp). **This is the human-judgment step:** keep
frames that are real content slides; **drop talking-head shots, transitions, duplicates, and
blurry mid-animation frames.** Save the kept timestamps (seconds) to `/tmp/ytnote-<YTID>/keep.txt`,
one per line. Typical talk yields 15-25 slides.

### 5. Extract the curated slides at full quality and install to _media
```
python3 scripts/extract_slides.py <YTID> /tmp/ytnote-<YTID>/video.mp4 /tmp/ytnote-<YTID>/keep.txt > /tmp/ytnote-<YTID>/slides.json
```
Extracts each kept timestamp at 1280px wide, JPEG, and copies them into
`$VIDEO_LIBRARY_DIR/_media/` as `<YTID>-slide-01.jpg`, `-02.jpg`, … (numbered in time order).
Progress goes to stderr; a clean `slides.json` scaffold prints to **stdout**, so redirect it to a
file as shown, then fill in `title` and `note`.

Tip: talks are often a slide + speaker-cam composite, and speakers flip back and forth, so the
same slide appears at several timestamps. Keep the cleanest instance of each, and re-anchor each
slide's `t` to where it is actually discussed in the transcript (better "play from here" UX).

### 6. Build the transcript
```
python3 scripts/vtt_to_transcript.py /tmp/ytnote-<YTID>/*.vtt /tmp/ytnote-<YTID>/transcript.txt
```
Parses the VTT into clean, de-duplicated `[HH:MM:SS] text` lines (YouTube auto-captions repeat
rolling text; the script collapses it). This becomes the markdown body.

### 7. Write notes and assemble the markdown file
For each kept slide, write a 1-3 sentence `note` grounded in the transcript around that timestamp
(don't invent claims). Then assemble:
```
python3 scripts/write_library_item.py \
  --id <YTID> \
  --title "Talk title" \
  --speaker "Name, Role, Org" \
  --tags tag1,tag2,tag3 \
  --slides /tmp/ytnote-<YTID>/slides.json \
  --transcript /tmp/ytnote-<YTID>/transcript.txt
```
Writes `$VIDEO_LIBRARY_DIR/<YTID>.md` with correct frontmatter + body.

### 8. Serve and verify (always do this)
```
python3 scripts/serve.py --dir "$VIDEO_LIBRARY_DIR" --port 8000 &
scripts/verify.sh <YTID>                 # defaults to http://127.0.0.1:8000
```
`verify.sh` curls the collection list, the item, the first slide image, and the artifact,
asserting HTTP 200 and that the new id appears in the index. Then open
`http://127.0.0.1:8000/#/<YTID>` in a browser to confirm slides + transcript + notes render.

## Markdown file shape (reference)

```markdown
---
id: RtywqDFBYnQ
title: Memory and dreaming for self-learning agents
youtube_id: RtywqDFBYnQ
speaker: Mahesh, Product Manager, Platform team at Anthropic
source_url: https://www.youtube.com/watch?v=RtywqDFBYnQ
slide_count: 19
created: '2026-05-25'
tags: [anthropic, memory, agents]
slides:
- idx: 1
  t: 55.7                 # seconds (float ok), used for seeking
  mmss: 00:55             # display label
  title: Agent primitives have evolved
  note: One to three sentences grounded in the transcript at this timestamp.
  img: /api/video-deepdives/_media/RtywqDFBYnQ-slide-01.jpg
# ... more slides
---
## Transcript
[00:00:08] Hello, everyone...
[00:00:11] ...
```

Notes:
- `idx` can be sparse/non-contiguous; the artifact sorts slides by `t`, so ordering is by
  timestamp, not idx.
- `img` is always a `/api/video-deepdives/_media/<file>` URL (served by serve.py),
  never base64.
- Slide `note` is what the user edits in the UI; PATCH writes the whole `slides` array back.

## Gotchas
- **Embedding disabled** (oembed 401): inline player is blocked by the video owner. Not a bug;
  the artifact shows an "open at this moment on YouTube" link instead. Mention it to the user.
- **Image collisions:** always namespace media `<YTID>-slide-NN.jpg`. Never reuse bare
  `slide-NN.jpg` for a new video.
- **Auto-caption noise:** rolling YouTube captions duplicate text across cues; use the provided
  VTT parser, don't dump raw VTT into the body.
- **Don't touch existing videos** when adding a new one. Each video is an independent file.
- **Server not picking up a video:** confirm the `.md` file is directly inside `--dir` (not a
  subfolder) and the filename is `<YTID>.md`.

## What makes this portable
- **No orchestrator / no database.** Storage is a plain folder of markdown + images.
- **One env var** (`VIDEO_LIBRARY_DIR`) controls where the library lives.
- **One small server file** (`serve.py`, stdlib + PyYAML) renders everything and handles
  note write-back. Drop it anywhere Python runs.
- The markdown files are portable: readable in Obsidian or any editor, and the frontmatter is
  standard YAML.


## Limitations

- Requires the upstream tool, account, API key, or local setup when the workflow names one.
- Does not authorize destructive, production, paid, or external-message actions without explicit user approval.
- Validate generated artifacts or recommendations against the user's real sources before treating them as final.
