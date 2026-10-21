#!/usr/bin/env bash
# V11 casefile sound bed, built from the board's own cue log (run from anywhere; tools/new_film.sh runs it):
#   1. node lib/kit/events.mjs .   loads index.html headless and saves every card slap / pin push / typed run /
#                                  handwriting / marker / stamp / string / tape / camera travel the kit scheduled
#                                  → tools/events.json
#   2. tools/sfx.py                casefile_sfx.bed(events) + a folder slide per chapter change, a swell under the
#                                  closing line, the recap finale; times read from lib/story.js → assets/audio/sfx.wav
# Python with numpy: python3 (needs numpy; override with PYTHON=…).
set -euo pipefail
cd "$(dirname "$0")/.."
node lib/kit/events.mjs .
PY="${PYTHON:-python3}"   # any Python with numpy
"$PY" -c "import numpy" 2>/dev/null || { echo "sfx: $PY has no numpy (pip install numpy, or set PYTHON=/path/to/python)" >&2; exit 1; }
"$PY" tools/sfx.py
