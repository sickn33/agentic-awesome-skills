#!/usr/bin/env bash
# Start a film for any story in any style from the style's starter.
# Usage: new_film.sh <style> <story> [project-dir]
#   <story>        a story folder (built by tools/story.py) or a bundled story name (kv-cache, _test-dry)
#   [project-dir]  default ./film-<style>; inside a presenter-skill job use <job>/film
# Steps: copy kits/<style>/starter → sync core + kit + story → stamp durations → subset fonts → build the sound bed
# (bash tools/sfx.sh in the project) → hyperframes check. The result plays end to end: captions, chapter chip,
# closing line and recap are live, every narration line has a placeholder beat. Replace the placeholders in
# beats.js with the topic's performed scenes (see kits/<style>/starter/STARTER.md).
# Env: FORCE=1 overwrites starter files in an existing project; SKIP_CHECK=1 skips the check; HYPERFRAMES=npx spec.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd -P)"
STYLE="$1"; STORY="$2"; DEST="${3:-$PWD/film-$STYLE}"
HF="${HYPERFRAMES:-hyperframes@0.8.81}"
STARTER="$ROOT/kits/$STYLE/starter"
[[ -d "$STARTER" ]] || { echo "no starter for style '$STYLE' (one of: $(ls "$ROOT/kits" | tr '\n' ' '))" >&2; exit 1; }
[[ -f "$STORY/story.json" || -f "$ROOT/stories/$STORY/story.json" ]] || { echo "no story: $STORY (run tools/story.py first)" >&2; exit 1; }
if [[ -e "$DEST/index.html" && "${FORCE:-0}" != "1" ]]; then echo "exists: $DEST (FORCE=1 to overwrite the starter files)" >&2; exit 1; fi
# check what the build needs before creating anything, so a missing piece never leaves a half-built project
PY="${PYTHON:-python3}"
"$PY" -c "import numpy" 2>/dev/null || { echo "the sound bed needs Python with numpy: pip install numpy, or set PYTHON=/path/to/python
音效需要装有 numpy 的 Python：pip install numpy，或设置 PYTHON=…" >&2; exit 1; }
for tool in node npx ffmpeg rsync; do command -v "$tool" >/dev/null || { echo "missing $tool (需要先安装 $tool)" >&2; exit 1; }; done
npx --yes "$HF" browser ensure >/dev/null 2>&1 || echo "note: could not prepare HyperFrames' Chrome (npx $HF browser ensure)" >&2
mkdir -p "$DEST"
rsync -a "$STARTER/" "$DEST/"
NAME="$(basename "$(cd "$DEST" && pwd -P)")"
sed -i.bak "s/\"name\": \"[^\"]*\"/\"name\": \"$NAME\"/" "$DEST/package.json" && rm -f "$DEST/package.json.bak"
printf '{\n  "id": "%s",\n  "name": "%s",\n  "createdAt": "%s"\n}\n' "$NAME" "$NAME" "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" > "$DEST/meta.json"
rm -f "$DEST/assets/audio/narration.wav"   # always take the story's own narration
export PYTHON="$PY"
bash "$ROOT/tools/sync.sh" "$DEST" "$STYLE" "$STORY"
python3 "$ROOT/tools/stamp.py" "$DEST"
python3 "$ROOT/tools/fonts.py" "$DEST" > /dev/null
(cd "$DEST" && bash tools/sfx.sh) || { echo "sound bed failed — fix the error above, then: (cd $DEST && bash tools/sfx.sh)" >&2; exit 1; }
if [[ "${SKIP_CHECK:-0}" != "1" ]]; then (cd "$DEST" && npx --yes "$HF" check 2>&1 | grep -E "error\(s\)|[0-9]+ errors|issues across|checks pass|Check (passed|failed)|✖"); fi
echo "film ready: $DEST   (preview: cd $DEST && npx --yes $HF preview)"
