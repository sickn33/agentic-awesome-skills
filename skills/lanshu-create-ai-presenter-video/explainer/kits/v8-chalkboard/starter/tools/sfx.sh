#!/usr/bin/env bash
# V8 黑板报 sound bed: read the chalk event log back from the page, then build assets/audio/sfx.wav from it + the story.
#   node lib/kit/chalklog.mjs .   → assets/audio/chalk-log.json  (every written character, stroke, tap, erasure, camera move, mark)
#   tools/sfx.py                  → assets/audio/sfx.wav         (procedural, lib/sfxlib.py; numpy)
# Run from anywhere; re-run after any change to beats.js or the story (tools/new_film.sh runs it for you).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$HERE"
node lib/kit/chalklog.mjs "$HERE"
PY="${PYTHON:-python3}"   # any Python with numpy
"$PY" -c "import numpy" 2>/dev/null || { echo "sfx: $PY has no numpy (pip install numpy, or set PYTHON=/path/to/python)" >&2; exit 1; }
"$PY" tools/sfx.py
