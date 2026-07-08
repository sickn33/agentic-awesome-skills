#!/usr/bin/env bash
# Download video (<=720p) + best subtitles for slide/transcript extraction.
# Usage: download.sh "<YTID>" "<scratch_dir>"
set -euo pipefail
YTID="${1:?usage: download.sh <YTID> <scratch_dir>}"
OUT="${2:?usage: download.sh <YTID> <scratch_dir>}"
mkdir -p "$OUT"
URL="https://www.youtube.com/watch?v=$YTID"

# Video: 720p mp4 is plenty for 1280px slide frames; merge to a single file.
yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720]" \
  --merge-output-format mp4 -o "$OUT/video.%(ext)s" "$URL"

# Subtitles: prefer human captions, fall back to auto. English variants.
yt-dlp --skip-download --write-subs --write-auto-subs \
  --sub-langs "en.*,en" --sub-format vtt -o "$OUT/subs.%(ext)s" "$URL" || true

# Metadata for title/uploader.
yt-dlp --skip-download --print "%(title)s\n%(uploader)s\n%(duration)s" "$URL" \
  > "$OUT/meta.txt" 2>/dev/null || true

echo "--- downloaded to $OUT ---"
ls -la "$OUT"
echo "title/uploader/duration:"; cat "$OUT/meta.txt" 2>/dev/null || true
