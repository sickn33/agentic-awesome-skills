#!/usr/bin/env bash
# setup.sh [project_dir] — prepare a project folder for an MG film.
# Copies the template (film.html, film.js, motion-lib.js, fonts) and tools, installs puppeteer + ffmpeg-static
# (without downloading a bundled browser), and checks the Python deps used by analyze_music.py.
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${1:-.}"; mkdir -p "$DIR"; cd "$DIR"
[ -f film.js ] && echo "film.js exists — template not copied (delete it to start fresh)" || cp -R "$SKILL/assets/template/"* .
mkdir -p tools music out stills && cp "$SKILL/scripts/"* tools/ && rm -f tools/setup.sh
if [ ! -d tools/node_modules/puppeteer ]; then
  (cd tools && npm init -y >/dev/null && PUPPETEER_SKIP_DOWNLOAD=1 npm i --silent puppeteer ffmpeg-static)
fi
chmod +x tools/node_modules/ffmpeg-static/ffmpeg 2>/dev/null || true
python3 -c "import numpy, scipy, matplotlib" 2>/dev/null || echo "⚠︎ python deps missing: pip3 install numpy scipy matplotlib"
B=$(node tools/render-fast.js --find-chrome 2>/dev/null) && echo "browser: $B" || echo "⚠︎ no Chrome/Chromium found — install one or set CHROME=/path/to/chrome"
echo "ready: put your track at music/track.mp3, then run tools/analyze_music.py (see SKILL.md §2)"
