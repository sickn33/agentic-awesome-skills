#!/usr/bin/env bash
# V3 notebook sound bed, built from the page's own cue log (run from anywhere; tools/new_film.sh runs it):
#   1. node lib/kit/events.mjs .   loads index.html headless and saves every pen job / slap / camera travel /
#                                  page turn the kit scheduled → tools/events.json
#   2. tools/sfx.py                notebook_sfx.bed(events) + chapter slides, a swell under the closing line,
#                                  the recap finale; times read from lib/story.js → assets/audio/sfx.wav
# Python with numpy: python3 (needs numpy; override with PYTHON=…).
set -euo pipefail
cd "$(dirname "$0")/.."
node lib/kit/events.mjs .
PY="${PYTHON:-python3}"   # any Python with numpy
"$PY" -c "import numpy" 2>/dev/null || { echo "sfx: $PY has no numpy (pip install numpy, or set PYTHON=/path/to/python)" >&2; exit 1; }
"$PY" tools/sfx.py
