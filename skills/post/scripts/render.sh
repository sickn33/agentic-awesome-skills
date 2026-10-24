#!/usr/bin/env bash
# Render frames of an HTML template to 1080x1440 PNGs with headless Chrome.
# usage: render.sh <template.html> <out_dir> <frame_id> [frame_id ...]
# The template shows the frame given in ?p=<id>.
set -euo pipefail
tpl="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; out="$2"; shift 2
mkdir -p "$out"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
for id in "$@"; do
  perl -e 'alarm 40; exec @ARGV' "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1080,1440 --virtual-time-budget=4000 \
    --user-data-dir="/tmp/post-chrome-$id" --screenshot="$out/$id.png" "file://$tpl?p=$id" >/dev/null 2>&1 &
done
wait
ls "$out"
