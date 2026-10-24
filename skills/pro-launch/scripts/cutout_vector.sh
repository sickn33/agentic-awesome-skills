#!/usr/bin/env bash
# One command: generated image -> transparent PNG -> SVG.
#   cutout_vector.sh in.png [outdir] [--mono]
#     default : Vision cutout (erode 2px) -> vtracer colour -> svgo      (needs node, macOS 14+)
#     --mono  : single-ink (icons, stamps, marker lines): threshold -> potrace -> svgo   (needs `brew install potrace`)
# Pitfalls already paid for (so the INPUT matters more than the settings):
#   1. Generate the asset on a flat, solid, high-contrast background (e.g. pure white or pure magenta); never on a busy scene.
#   2. Ask the generator for flat colour, no gradient, no soft shadow, thick shapes; photos and gradients vectorise into mud.
#   3. Always erode the mask a little: a blue/white fringe from the old background is the #1 defect after vectorising.
#   4. Check the SVG on BOTH a light and a dark background before shipping; render it at 1x and 3x.
set -euo pipefail
IN="${1:?usage: cutout_vector.sh in.png [outdir] [--mono]}"; OUT="${2:-out}"; MODE="${3:-color}"
HERE="$(cd "$(dirname "$0")" && pwd)"; NAME="$(basename "${IN%.*}")"; mkdir -p "$OUT"
if [ "$MODE" = "--mono" ] || [ "$OUT" = "--mono" ]; then
  [ "$OUT" = "--mono" ] && OUT=out && mkdir -p out
  command -v potrace >/dev/null || { echo "install potrace: brew install potrace"; exit 1; }
  command -v magick >/dev/null && magick "$IN" -colorspace Gray -threshold 55% "$OUT/$NAME.pbm" || sips -s format bmp "$IN" --out "$OUT/$NAME.bmp" >/dev/null
  potrace -s --flat -o "$OUT/$NAME.svg" "$OUT/$NAME.pbm" 2>/dev/null || potrace -s -o "$OUT/$NAME.svg" "$OUT/$NAME.bmp"
  echo "ok $OUT/$NAME.svg (mono)"; exit 0
fi
swiftc -O "$HERE/cut.swift" -o "$OUT/.cut" 2>/dev/null || { echo "swiftc failed (need Xcode CLT)"; exit 1; }
"$OUT/.cut" "$IN" "$OUT/$NAME-cut.png" 2
if [ ! -d "$OUT/node_modules/@neplex" ]; then (cd "$OUT" && npm init -y >/dev/null && npm i @neplex/vectorizer svgo >/dev/null 2>&1) ; fi
cp "$HERE/vectorize.js" "$OUT/vectorize.js"
(cd "$OUT" && node vectorize.js "$NAME-cut.png" "$NAME.svg")
