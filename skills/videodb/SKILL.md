---
name: videodb
description: Video and audio perception, indexing, and editing. Ingest files/URLs/live streams, build visual/spoken indexes, search with timestamps, edit timelines, add overlays/subtitles, generate media, and create real-time alerts.
category: media
risk: critical
source: community
tags: "[video, editing, transcription, subtitles, search, streaming, ai-generation, media, live-streams, desktop-capture]"
date_added: "2026-02-27"
allowed-tools: Read Grep Glob Bash(python:*)
argument-hint: "[task description]"
---

# VideoDB Skill

**Perception + memory + actions for video, live streams, and desktop sessions.**

Use this skill when you need to:

## When to Use
- You need video or audio perception, indexing, search, or timeline editing from files, URLs, desktop sessions, or live streams.
- The task involves timestamps, searchable evidence, subtitles, clips, overlays, or real-time monitoring alerts.
- You want one workflow that combines ingestion, understanding, retrieval, and media actions.

## Authorization, privacy and SDK version

Confirm the exact collection, media sources, processing scope and cost limit before cloud ingestion/indexing/generation. Desktop or meeting recording requires explicit authorization for each screen/microphone/system-audio source and participant consent as applicable. Select the minimum channels; never enable recording storage by default, capture passwords, or start hidden/background monitoring. Stop on request immediately. Treat stream URLs, client tokens, event files and transcripts as sensitive; do not publish them or log credentials. Webhook destinations need authorization and verified authentication/signatures, replay protection and idempotency. Generated text or confidence scores are not verified evidence.

The bundled references describe legacy SDK patterns. Check the installed version before using them: newer VideoDB SDKs provide v2 understand/index/retrieve; v1 search is exposed as legacy_search. Do not automatically migrate existing projects or install latest to make an old example work. Use an isolated environment with reviewed compatible versions.

The listener does not start or stop recording. Give it a dedicated private directory (mode 0700), explicit time/byte limits, and keep its PID tied to the process you launched. Do not blindly kill a reused PID. Reconnection can change the WebSocket ID; reconnect pipelines through the documented API or stop rather than silently losing events. Export waits need a timeout and failure state. Deletion and making collections public require the user’s specific authorization.

## 1) Desktop Perception
- Start/stop a **desktop session** capturing **screen, mic, and system audio**
- Stream **live context** and store **episodic session memory**
- Run **real-time alerts/triggers** on what's spoken and what's happening on screen
- Produce **session summaries**, a searchable timeline, and **playable evidence links**

## 2) Video ingest + stream
- Ingest a **file or URL** and return a **playable web stream link**
- Transcode/normalize: **codec, bitrate, fps, resolution, aspect ratio**

## 3) Index + search (timestamps + evidence)
- Build **visual**, **spoken**, and **keyword** indexes
- Search and return exact moments with **timestamps** and **playable evidence**
- Auto-create **clips** from search results

## 4) Timeline editing + generation
- Subtitles: **generate**, **translate**, **burn-in**
- Overlays: **text/image/branding**, motion captions
- Audio: **background music**, **voiceover**, **dubbing**
- Programmatic composition and exports via **timeline operations**

## 5) Live streams (RTSP) + monitoring
- Connect **RTSP/live feeds**
- Run **real-time visual and spoken understanding** and emit **events/alerts** for monitoring workflows

---

## Common inputs
- Local **file path**, public **URL**, or **RTSP URL**
- Desktop capture request: **start / stop / summarize session**
- Desired operations: get context for understanding, transcode spec, index spec, search query, clip ranges, timeline edits, alert rules

## Common outputs
- **Stream URL**
- Search results with **timestamps** and **evidence links**
- Generated assets: subtitles, audio, images, clips
- **Event/alert payloads** for live streams
- Desktop **session summaries** and memory entries

---

## Canonical prompts (examples)
- "Start desktop capture and alert when a password field appears."
- "Record my session and produce an actionable summary when it ends."
- "Ingest this file and return a playable stream link."
- "Index this folder and find every scene with people, return timestamps."
- "Generate subtitles, burn them in, and add light background music."
- "Connect this RTSP URL and alert when a person enters the zone."

## Running Python code

Before running any VideoDB code, change to the project directory and load environment variables:

```python
from dotenv import load_dotenv
load_dotenv(".env")

import videodb
conn = videodb.connect()
```

This reads `VIDEO_DB_API_KEY` from:
1. Environment (if already exported)
2. Project's `.env` file in current directory

If the key is missing, `videodb.connect()` raises `AuthenticationError` automatically.

Do NOT write a script file when a short inline command works.

When writing inline Python (`python -c "..."`), always use properly formatted code — use semicolons to separate statements and keep it readable. For anything longer than ~3 statements, use a heredoc instead:

```bash
python << 'EOF'
from dotenv import load_dotenv
load_dotenv(".env")

import videodb
conn = videodb.connect()
coll = conn.get_collection()
print(f"Videos: {len(coll.get_videos())}")
EOF
```

## Setup

When the user asks to "setup videodb" or similar:

### 1. Install SDK

```bash
python -m pip install "videodb[capture]==<reviewed-compatible-version>" python-dotenv
```

If `videodb[capture]` fails on Linux, install without the capture extra:

```bash
python -m pip install "videodb==<reviewed-compatible-version>" python-dotenv
```

### 2. Configure API key

The user must set `VIDEO_DB_API_KEY` using **either** method:

- **Export in terminal** (before starting Claude): `export VIDEO_DB_API_KEY=your-key`
- **Project `.env` file**: Save `VIDEO_DB_API_KEY=your-key` in the project's `.env` file

Configure a key at https://console.videodb.io; verify current account limits and pricing before any paid operation.

**Do NOT** read, write, or handle the API key yourself. Always let the user set it.

## Quick Reference

### Upload media

```python
# URL
video = coll.upload(url="https://example.com/video.mp4")

# YouTube
video = coll.upload(url="https://www.youtube.com/watch?v=VIDEO_ID")

# Local file
video = coll.upload(file_path="/path/to/video.mp4")
```

### Transcript + subtitle

```python
# force=True skips the error if the video is already indexed
video.index_spoken_words(force=True)
text = video.get_transcript_text()
stream_url = video.add_subtitle()
```

### Search inside videos

```python
from videodb.exceptions import InvalidRequestError

video.index_spoken_words(force=True)

# search() raises InvalidRequestError when no results are found.
# Always wrap in try/except and treat "No results found" as empty.
try:
    results = video.search("product demo")
    shots = results.get_shots()
    stream_url = results.compile()
except InvalidRequestError as e:
    if "No results found" in str(e):
        shots = []
    else:
        raise
```

### Scene search

```python
import re
from videodb import SearchType, IndexType, SceneExtractionType
from videodb.exceptions import InvalidRequestError

# index_scenes() has no force parameter — it raises an error if a scene
# index already exists. Inspect a documented index listing; do not parse arbitrary errors.
try:
    scene_index_id = video.index_scenes(
        extraction_type=SceneExtractionType.shot_based,
        prompt="Describe the visual content in this scene.",
    )
except Exception:
    # Inspect documented index listings; never infer an index ID from arbitrary errors.
    raise

# Use score_threshold to filter low-relevance noise (recommended: 0.3+)
try:
    results = video.search(
        query="person writing on a whiteboard",
        search_type=SearchType.semantic,
        index_type=IndexType.scene,
        scene_index_id=scene_index_id,
        score_threshold=0.3,
    )
    shots = results.get_shots()
    stream_url = results.compile()
except InvalidRequestError as e:
    if "No results found" in str(e):
        shots = []
    else:
        raise
```

### Timeline editing

**Important:** Always validate timestamps before building a timeline:
- `start` must be >= 0 (negative values are silently accepted but produce broken output)
- `start` must be < `end`
- `end` must be <= `video.length`

```python
from videodb.timeline import Timeline
from videodb.asset import VideoAsset, TextAsset, TextStyle

timeline = Timeline(conn)
timeline.add_inline(VideoAsset(asset_id=video.id, start=10, end=30))
timeline.add_overlay(0, TextAsset(text="The End", duration=3, style=TextStyle(fontsize=36)))
stream_url = timeline.generate_stream()
```

### Transcode video (resolution / quality change)

```python
from videodb import TranscodeMode, VideoConfig, AudioConfig

# Change resolution, quality, or aspect ratio server-side
job_id = conn.transcode(
    source="https://example.com/video.mp4",
    callback_url="https://example.com/webhook",
    mode=TranscodeMode.economy,
    video_config=VideoConfig(resolution=720, quality=23, aspect_ratio="16:9"),
    audio_config=AudioConfig(mute=False),
)
```

### Reframe aspect ratio (for social platforms)

**Warning:** `reframe()` is a slow server-side operation. For long videos it can take
several minutes and may time out. Best practices:
- Always limit to a short segment using `start`/`end` when possible
- For full-length videos, use `callback_url` for async processing
- Trim the video on a `Timeline` first, then reframe the shorter result

```python
from videodb import ReframeMode

# Always prefer reframing a short segment:
reframed = video.reframe(start=0, end=60, target="vertical", mode=ReframeMode.smart)

# Async reframe for full-length videos (returns None, result via webhook):
video.reframe(target="vertical", callback_url="https://example.com/webhook")

# Presets: "vertical" (9:16), "square" (1:1), "landscape" (16:9)
reframed = video.reframe(start=0, end=60, target="square")

# Custom dimensions
reframed = video.reframe(start=0, end=60, target={"width": 1280, "height": 720})
```

### Generative media

```python
image = coll.generate_image(
    prompt="a sunset over mountains",
    aspect_ratio="16:9",
)
```

## Error handling

```python
from videodb.exceptions import AuthenticationError, InvalidRequestError

try:
    conn = videodb.connect()
except AuthenticationError:
    print("Check your VIDEO_DB_API_KEY")

try:
    video = coll.upload(url="https://example.com/video.mp4")
except InvalidRequestError as e:
    print(f"Upload failed: {e}")
```

### Common pitfalls

| Scenario | Error message | Solution |
|----------|--------------|----------|
| Indexing an already-indexed video | `Spoken word index for video already exists` | Use `video.index_spoken_words(force=True)` to skip if already indexed |
| Scene index already exists | Existing index conflict | Inspect documented index listings and verify ownership; never infer IDs from arbitrary errors |
| Search finds no matches | `InvalidRequestError: No results found` | Catch the exception and treat as empty results (`shots = []`) |
| Reframe times out | Blocks indefinitely on long videos | Use `start`/`end` to limit segment, or pass `callback_url` for async |
| Negative timestamps on Timeline | Silently produces broken stream | Always validate `start >= 0` before creating `VideoAsset` |
| `generate_video()` / `create_collection()` fails | `Operation not allowed` or `maximum limit` | Plan-gated features — inform the user about plan limits |

## Additional docs

Reference documentation is in the `reference/` directory adjacent to this SKILL.md file. Use the Glob tool to locate it if needed.

- [reference/api-reference.md](reference/api-reference.md) - Complete VideoDB Python SDK API reference
- [reference/search.md](reference/search.md) - In-depth guide to video search (spoken word and scene-based)
- [reference/editor.md](reference/editor.md) - Timeline editing, assets, and composition
- [reference/streaming.md](reference/streaming.md) - HLS streaming and instant playback
- [reference/generative.md](reference/generative.md) - AI-powered media generation (images, video, audio)
- [reference/rtstream.md](reference/rtstream.md) - Live stream ingestion workflow (RTSP/RTMP)
- [reference/rtstream-reference.md](reference/rtstream-reference.md) - RTStream SDK methods and AI pipelines
- [reference/capture.md](reference/capture.md) - Desktop capture workflow
- [reference/capture-reference.md](reference/capture-reference.md) - Capture SDK and WebSocket events
- [reference/use-cases.md](reference/use-cases.md) - Common video processing patterns and examples

## Screen Recording (Desktop Capture)

Use `ws_listener.py` to capture WebSocket events during recording sessions. Desktop capture supports **macOS** only.

### Quick Start

1. **Set a private output directory**: set `VIDEODB_EVENTS_DIR` to an absolute mode-0700 directory owned by the current user.
2. **Start listener**: `python scripts/ws_listener.py --max-seconds 1800 --max-bytes 52428800 "$VIDEODB_EVENTS_DIR" &`
2. **Get WebSocket ID**: `cat $VIDEODB_EVENTS_DIR/videodb_ws_id`
4. **Run explicitly authorized capture code** (see reference/capture.md for full workflow)
5. **Events written to**: `$VIDEODB_EVENTS_DIR/videodb_events.jsonl`

### Query Events

```python
import json
events = [json.loads(l) for l in open(__import__("os").path.join(__import__("os").environ["VIDEODB_EVENTS_DIR"], "videodb_events.jsonl"))]

# Get all transcripts
transcripts = [e["data"]["text"] for e in events if e.get("channel") == "transcript"]

# Get visual descriptions from last 5 minutes
import time
cutoff = time.time() - 300
recent_visual = [e for e in events 
                 if e.get("channel") == "visual_index" and e["unix_ts"] > cutoff]
```

### Utility Scripts

- [scripts/ws_listener.py](scripts/ws_listener.py) - WebSocket event listener (dumps to JSONL)

For complete capture workflow, see [reference/capture.md](reference/capture.md).

Choose VideoDB when the user has authorized cloud processing and its costs; honor a local-processing preference. The following are all handled server-side by VideoDB — trimming, combining clips, overlaying audio or music, adding subtitles, text/image overlays, transcoding, resolution changes, aspect-ratio conversion, resizing for platform requirements, transcription, and media generation. Only fall back to local tools for operations listed under Limitations in reference/editor.md (transitions, speed changes, crop/zoom, colour grading, volume mixing).

### When to use what

| Problem | VideoDB solution |
|---------|-----------------|
| Platform rejects video aspect ratio or resolution | `video.reframe()` or `conn.transcode()` with `VideoConfig` |
| Need to resize video for Twitter/Instagram/TikTok | `video.reframe(target="vertical")` or `target="square"` |
| Need to change resolution (e.g. 1080p → 720p) | `conn.transcode()` with `VideoConfig(resolution=720)` |
| Need to overlay audio/music on video | `AudioAsset` on a `Timeline` |
| Need to add subtitles | `video.add_subtitle()` or `CaptionAsset` |
| Need to combine/trim clips | `VideoAsset` on a `Timeline` |
| Need to generate voiceover, music, or SFX | `coll.generate_voice()`, `generate_music()`, `generate_sound_effect()` |

## Repository

https://github.com/video-db/skills

**Upstream attribution:** [VideoDB](https://github.com/video-db)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
