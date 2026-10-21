#!/usr/bin/env bash
# Render a film project, finalize it with the skill's finalize_delivery.sh (loudness, decode checks, contact sheet),
# write subtitles, and log freeze events.
# Usage: render.sh <project-dir> <name> [out-dir]      out-dir defaults to <project-dir>/outputs
#   DRAFT=1        a quick low-quality <name>-draft.mp4 in out-dir for review on a phone (no finalize)
#   SKIP_RENDER=1  re-finalize an existing renders/<name>.mp4 (e.g. after changing PROGRAM_LUFS) without rendering again
#   HYPERFRAMES=   npx spec (default hyperframes@0.8.81)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
PROJECT="$(cd "$1" && pwd -P)"; NAME="$2"; OUT="${3:-$PROJECT/outputs}"
HF="${HYPERFRAMES:-hyperframes@0.8.81}"
FINALIZE="$ROOT/../scripts/finalize_delivery.sh"
mkdir -p "$PROJECT/renders" "$OUT"
OUT="$(cd "$OUT" && pwd -P)"
if [[ "${DRAFT:-0}" == "1" ]]; then
  (cd "$PROJECT" && npx --yes "$HF" render --quality draft --fps 30 -o "renders/$NAME-draft-full.mp4")
  ffmpeg -y -loglevel error -i "$PROJECT/renders/$NAME-draft-full.mp4" -vf scale=1280:-2 -c:v libx264 -crf 30 -preset veryfast \
    -c:a aac -b:a 96k -movflags +faststart "$OUT/$NAME-draft.mp4"
  rm -f "$PROJECT/renders/$NAME-draft-full.mp4"
  echo "draft for review: $OUT/$NAME-draft.mp4 ($(du -h "$OUT/$NAME-draft.mp4" | cut -f1); 低清审片版，可直接发到手机上看)"
  exit 0
fi
if [[ "${SKIP_RENDER:-0}" != "1" ]]; then
  (cd "$PROJECT" && npx --yes "$HF" render --quality delivery --fps 30 --no-best-effort --strict --skill general-video -o "renders/$NAME.mp4")
fi
if ! bash "$FINALIZE" "$PROJECT/renders/$NAME.mp4" "$OUT" "$NAME"; then
  echo "finalize failed. If it is the loudness check: rebuild the story with the current tools/story.py (it levels the
narration), sync and render again; to retry only the finalize step: SKIP_RENDER=1 bash $0 $1 $2 ${3:-}
交付检查未通过：若是响度问题，用新版 story.py 重新生成配音后再渲染；只重做交付步骤可加 SKIP_RENDER=1。" >&2
  exit 1
fi
if [[ -f "$PROJECT/lib/story.js" ]]; then python3 "$ROOT/tools/srt.py" "$PROJECT" "$OUT/$NAME.srt"; fi
ffmpeg -hide_banner -nostats -i "$OUT/$NAME-master.mp4" -vf "freezedetect=n=-60dB:d=0.4" -map 0:v -f null - 2>&1 \
  | grep -Eo 'freeze_(start|end): [0-9.]+' | paste - - > "$OUT/$NAME-freeze.txt" || true
echo "freeze events: $(wc -l < "$OUT/$NAME-freeze.txt" | tr -d ' ')  (a performed explainer should have 0)"
echo "subtitles: $OUT/$NAME.srt   cover: run tools/qa.py for a cover.png"
