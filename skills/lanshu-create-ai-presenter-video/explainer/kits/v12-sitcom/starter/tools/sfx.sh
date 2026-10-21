#!/usr/bin/env bash
# Build assets/audio/sfx.wav (the 小剧场 sound bed) from lib/story.js — run from anywhere.
# tools/sfx.py places the starter's chrome sounds (set changes, camera shifts, draft bubbles, the end set, the curtain-call
# recap); tools/sfx_beats.py adds the topic's own beat sounds (the sound twin of beats.js).
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"   # any Python with numpy
"$PY" -c "import numpy" 2>/dev/null || { echo "sfx: $PY has no numpy (pip install numpy, or set PYTHON=/path/to/python)" >&2; exit 1; }
"$PY" tools/sfx.py
