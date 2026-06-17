---
name: screenstudio-alt
description: "Open-source headless Screen Studio alternative: auto speed-up of idle, auto-zoom on click clusters, keystroke overlay chips, smoothed synthetic cursor, and 9:16 vertical export that follows the action — post-production for screen recordings from the CLI."
risk: safe
source: community
source_type: community
source_repo: connerkward/screenstudio-alternative-skill
date_added: "2026-06-16"
author: Conner K Ward
license: MIT
tags:
  - screen-recording
  - video
  - post-production
  - auto-zoom
  - vertical-video
  - ffmpeg
tools:
  - claude-code
  - antigravity
  - cursor
  - gemini-cli
  - codex-cli
---
## When to Use

Use when polishing a screen recording / demo video for sharing, when the user mentions Screen Studio, auto-zoom, idle speed-up, or vertical/social video from a screen capture, and for any social-facing demo (vertical output is the default for those).

_Source: [connerkward/screenstudio-alternative-skill](https://github.com/connerkward/screenstudio-alternative-skill) (MIT)._

# screenstudio-alt

The skill's code lives in this directory (`polish.py`, `render.py`, `studio.py`,
`events-log.swift`, test fixtures, etc.). Published publicly as
`connerkward/screen-studio-alternative` via the publish-skill skill.

Two components:

- `events-log` (Swift) — capture-side input logger (cursor 60Hz, clicks, keys;
  drops keys during macOS secure input). Runs ONLY while recording. Needs
  Accessibility/Input Monitoring for the terminal. **Auto-zoom/keys/cursor need
  this data at capture time — it cannot be recovered from pixels later.**
- `polish.py` (Python, ffmpeg + PIL) — the post-production pass:

```bash
python3 src/polish.py in.mp4 --events in.events.jsonl \
  --speedup            # compress idle (input-gap ∩ frozen-pixels; animations stay 1x)
  --zoom               # eased auto-zoom on click clusters (zoompan)
  --keys               # accumulating keystroke chips (PIL overlays, no drawtext dep)
  --smooth-cursor      # synthetic eased cursor (best with sck-record --no-cursor)
  --vertical           # ALSO emit 1080x1920 following the action
```

`--speedup` works WITHOUT events (freezedetect only) — usable on the whole
existing dailies corpus.

- `render.py` — **high-quality non-destructive renderer** (preferred): single-pass
  spring-physics camera over the original high-res frames, LANCZOS into a smaller
  target (crisp zoom, ~1.3× sharper than the ffmpeg upscale path), 60fps, H + 9:16 V.
  Tunable `--freq`/`--zeta` (spring), `--fps`, `--target-w`. Takes explicit
  `--regions [{t0,t1,z,cx,cy}]`. `polish.py` is the older ffmpeg-filter fallback.
- `studio.py [recording.mp4]` — local web UI, **NLE-style fixed-ruler timeline** (bar =
  source duration, never rescales → upstream always planted): zoom regions are draggable
  blocks (move / retime edges / click to add / double-click delete); idle spans are
  **speed blocks with rate-only editing** — source range locked, rate set via inspector
  slider on select or right-edge **rate-stretch** drag (FCP retime / Premiere Rate
  Stretch); rate changes ripple downstream only. Tunable cosine-ease ramp, default zoom,
  aspect, frame styling. Always-smooth synthetic cursor + click ripple + real recorded
  click sound (CC0 #735771). Export uses render.py. Free port, local. (Keystroke overlay
  exists in the engine but is off by default.)

## Easy path

`screencast.sh --demo` (screencast skill) does the whole chain: starts the event
logger, records, then polishes + emits the 9:16 vertical automatically. Vertical
is the DEFAULT for social-facing demos.

## Gotchas (learned the hard way, kept here so they're not relearned)

- ffmpeg CANNOT do animated `scale=eval=frame` → `crop` (link reinit wedges crop's
  per-frame exprs). That's why zoom uses `zoompan` (no `t` var there — use `on/FPS`).
- This machine's ffmpeg lacks `drawtext`; all text/cursor overlays are PIL-rendered
  PNGs + `overlay`.
- Test rig: `make-fixture.py` synthesizes a fake screen recording + ground-truth
  events.jsonl — validate any change against it before trusting real footage.
