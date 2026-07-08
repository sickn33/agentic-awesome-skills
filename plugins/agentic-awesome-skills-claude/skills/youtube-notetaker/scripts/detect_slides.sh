#!/usr/bin/env bash
# Scene-detect candidate slide-change timestamps with ffmpeg.
# Usage: detect_slides.sh <video.mp4> <out_dir> [threshold]
# threshold default 0.3 (lower=more frames for subtle decks, higher=fewer for busy video).
set -euo pipefail
VIDEO="${1:?usage: detect_slides.sh <video.mp4> <out_dir> [threshold]}"
OUT="${2:?usage: detect_slides.sh <video.mp4> <out_dir> [threshold]}"
THRESH="${3:-0.3}"
mkdir -p "$OUT"

# showinfo on the scene-selected frames prints pts_time per cut.
ffmpeg -hide_banner -i "$VIDEO" \
  -vf "select='gt(scene,$THRESH)',showinfo" -vsync vfr -f null - 2>"$OUT/ffinfo.log" || true

grep -oE 'pts_time:[0-9.]+' "$OUT/ffinfo.log" | sed 's/pts_time://' | sort -n -u > "$OUT/scene_times.txt"

N=$(wc -l < "$OUT/scene_times.txt" | tr -d ' ')
echo "Detected $N candidate scene changes (threshold=$THRESH) -> $OUT/scene_times.txt"
echo "Next: build a contact sheet and curate which are real content slides."
