#!/usr/bin/env bash
# Build assets/audio/sfx.wav from the story (lib/story.js) — V7 · 图纸与注脚 sound bed. Run from anywhere.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"   # any Python with numpy
"$PY" -c "import numpy" 2>/dev/null || { echo "sfx: $PY has no numpy (pip install numpy, or set PYTHON=/path/to/python)" >&2; exit 1; }
"$PY" tools/sfx.py
