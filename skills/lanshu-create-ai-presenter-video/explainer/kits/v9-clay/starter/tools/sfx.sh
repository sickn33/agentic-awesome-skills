#!/usr/bin/env bash
# Build assets/audio/sfx.wav from the story (tools/plan.mjs → tools/sfx.py on lib/sfxlib.py). Needs node and numpy.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"   # any Python with numpy
"$PY" -c "import numpy" 2>/dev/null || { echo "sfx: $PY has no numpy (pip install numpy, or set PYTHON=/path/to/python)" >&2; exit 1; }
"$PY" tools/sfx.py
