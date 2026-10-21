#!/usr/bin/env bash
# Build assets/audio/sfx.wav (the V2 signal sound bed) from the story in lib/story.js.
# Run from anywhere; tools/new_film.sh runs it for you. Needs numpy: python3 (or $PYTHON).
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"   # any Python with numpy
"$PY" -c "import numpy" 2>/dev/null || { echo "sfx: $PY has no numpy (pip install numpy, or set PYTHON=/path/to/python)" >&2; exit 1; }
"$PY" tools/sfx.py
