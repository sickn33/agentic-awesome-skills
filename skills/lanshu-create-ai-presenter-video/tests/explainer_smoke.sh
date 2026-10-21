#!/usr/bin/env bash
# Smoke test for the styled explainer route, offline: no HyperFrames, no paid calls.
# Covers intake and preflight per route, the story pipeline (--check, --dry), every style's starter (sync, stamp,
# scripts parse), and the styled route's state evidence.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
SCRIPTS="$SKILL_DIR/scripts"
X="$SKILL_DIR/explainer"
TMP_ROOT="${TMPDIR:-/tmp}"
# Windows sets TMPDIR to a native path (C:\...\Temp); mktemp would then return a path
# carrying a drive colon, which rsync reads as a remote host. Normalise it to POSIX.
if command -v cygpath >/dev/null 2>&1; then TMP_ROOT="$(cygpath -u "$TMP_ROOT")"; fi
WORK="$(mktemp -d "${TMP_ROOT%/}/explainer-smoke.XXXXXX")"
# A failed cleanup must not decide the exit status: under `set -e` a rejected rm would turn a
# fully successful run into exit code 1. Clean up best-effort and stay quiet.
trap 'rm -rf -- "$WORK" >/dev/null 2>&1 || true' EXIT INT TERM

fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
pass() { printf 'ok - %s\n' "$*"; }

JOB="$WORK/job"
MANIFEST="$JOB/job.json"
set_json() { jq "$1" "$MANIFEST" >"$MANIFEST.tmp" && mv -- "$MANIFEST.tmp" "$MANIFEST"; }

# --- intake: the styled route needs no presenter image, but a style; it is 16:9
python3 "$SCRIPTS/init_job.py" --job-dir "$JOB" --route styled --explainer-style v3-notebook --topic "讲清楚 KV cache" >/dev/null
# jq.exe emits CRLF on Windows, so a command substitution keeps a trailing \r and the string
# comparisons below would never match. Strip it before comparing.
[[ "$(jq -r .creative.route "$MANIFEST" | tr -d '\r')" == "styled" ]] || fail "route not recorded"
[[ "$(jq -r .creative.explainer_style "$MANIFEST" | tr -d '\r')" == "v3-notebook" ]] || fail "style not recorded"
[[ "$(jq -r '.creative.width, .creative.height' "$MANIFEST" | tr -d '\r' | paste -sd x -)" == "1920x1080" ]] || fail "styled route is not 16:9"
[[ "$(jq -r .input.presenter_image "$MANIFEST" | tr -d '\r')" == "" ]] || fail "styled route recorded a presenter image"
if python3 "$SCRIPTS/init_job.py" --job-dir "$WORK/j2" --route styled --topic x 2>/dev/null; then fail "styled route without a style"; fi
if python3 "$SCRIPTS/init_job.py" --job-dir "$WORK/j3" --route presenter --topic x 2>/dev/null; then
  fail "presenter route without a presenter image"
fi
if python3 "$SCRIPTS/init_job.py" --job-dir "$WORK/j4" --route styled --explainer-style v1-editorial --aspect 9:16 --topic x 2>/dev/null; then
  fail "styled route accepted 9:16"
fi
pass "init_job routes: styled needs a style, presenter needs an image, styled is 16:9"

# --- preflight: no image review on the styled route
set_json '.input.remote_upload_approved = true'
python3 "$SCRIPTS/preflight.py" "$MANIFEST" | jq -e '.ok and .remote_ready' >/dev/null || fail "styled preflight"
set_json '.creative.explainer_style = "v99-nope"'
if python3 "$SCRIPTS/preflight.py" "$MANIFEST" >/dev/null; then fail "preflight accepted an unknown style"; fi
set_json '.creative.explainer_style = "v3-notebook"'
python3 "$SCRIPTS/preflight.py" "$MANIFEST" >/dev/null || fail "styled preflight after restoring the style"
pass "preflight skips presenter checks on the styled route and validates the style"

# --- story pipeline, offline
mkdir -p "$JOB/story"
cp "$X/stories/_test-dry/script.md" "$JOB/story/script.md"
python3 "$X/tools/story.py" "$JOB/story" --check >/dev/null || fail "story --check"
python3 "$X/tools/story.py" "$JOB/story" --dry >/dev/null || fail "story --dry"
S="$JOB/story/story.json"
jq -e '.draft == true and (.chapters | length) == 3 and (.lines | length) == 7 and .end.line == 7 and .recap.end == .duration' "$S" >/dev/null \
  || fail "dry story shape"
jq -e '[.lines[] | .chapter] == ["why","why","how","result","result","result","end"]' "$S" >/dev/null || fail "line chapters"
jq -e '[.lines[] | .words | length > 0] | all' "$S" >/dev/null || fail "word times"
python3 "$X/tools/docs.py" "$JOB/story" "$WORK/docs" >/dev/null || fail "docs.py"
for doc in SCRIPT BEAT_SHEET TIMELINE STORYBOARD; do [[ -s "$WORK/docs/$doc.md" ]] || fail "docs.py did not write $doc.md"; done
python3 "$X/tools/srt.py" "$S" "$WORK/story.srt" >/dev/null || fail "srt.py"
[[ "$(grep -c -- '-->' "$WORK/story.srt")" -ge 7 ]] || fail "srt.py wrote too few cues"
pass "story.py writes a draft story.json; docs.py and srt.py read it"

python3 "$SKILL_DIR/tests/story_timing.py" || fail "pause-marker and pronunciation regressions"
pass "pause markers preserve engine word times; pronunciation stays optional"

# --- every style's starter: sync, stamp, scripts parse
HAVE_NODE=0; command -v node >/dev/null && HAVE_NODE=1
DUR="$(jq -r .duration "$S" | tr -d '\r')"
for kit in "$X"/kits/*/; do
  style="$(basename "$kit")"
  P="$WORK/films/$style"
  mkdir -p "$P"
  rsync -a --exclude STARTER.md "$kit/starter/" "$P/"
  bash "$X/tools/sync.sh" "$P" "$style" "$JOB/story" >/dev/null
  python3 "$X/tools/stamp.py" "$P" >/dev/null
  grep -q "data-stamp=\"story\"[^>]*data-duration=\"$DUR\"\|data-duration=\"$DUR\"[^>]*data-stamp=\"story\"" "$P/index.html" \
    || fail "$style: root not stamped to $DUR s"
  grep -q 'data-stamp="narration"' "$P/index.html" || fail "$style: no narration track"
  [[ -f "$P/lib/core.js" && -f "$P/lib/kit/kit.js" && -f "$P/lib/story.js" && ! -e "$P/lib/kit/starter" ]] || fail "$style: lib layout"
  bash -n "$P/tools/sfx.sh" || fail "$style: sfx.sh syntax"
  if [[ $HAVE_NODE == 1 ]]; then
    for js in "$P/lib/core.js" "$P/lib/kit/kit.js" "$P/beats.js"; do node --check "$js" || fail "$style: $js"; done
  fi
done
pass "all $(ls -d "$X"/kits/*/ | wc -l | tr -d ' ') starters sync and stamp"

# --- state: the styled route reaches presenter_generated through the film, not a presenter video
mkdir -p "$JOB/docs" "$JOB/qa/reports"
for doc in SCRIPT BEAT_SHEET TIMELINE STORYBOARD; do printf '# %s\n' "$doc" >"$JOB/docs/$doc.md"; done
printf 'review\n' >"$JOB/qa/reports/visual-review.md"
cp -R "$WORK/films/v3-notebook" "$JOB/film"
set_json '.artifacts.script = "docs/SCRIPT.md" | .artifacts.beat_sheet = "docs/BEAT_SHEET.md"
  | .artifacts.final_audio = "story/audio/narration.wav" | .qa.asr_report = "story/story.json"
  | .artifacts.timeline = "docs/TIMELINE.md" | .artifacts.storyboard = "docs/STORYBOARD.md" | .plan.status = "approved"
  | .artifacts.story = "story/story.json"'
state() { python3 "$SCRIPTS/check_state.py" "$MANIFEST" | jq -r .evidenced_state | tr -d '\r'; }
[[ "$(state)" == "content_locked" ]] || fail "a --dry draft story locked the audio (state $(state))"
jq '.draft = false' "$S" >"$S.tmp" && mv -- "$S.tmp" "$S"   # stands in for a voiced story
[[ "$(state)" == "visual_plan_locked" ]] || fail "expected visual_plan_locked, got $(state)"
set_json '.artifacts.film_project = "film" | .qa.manual_visual_review = "qa/reports/visual-review.md"'
[[ "$(state)" == "presenter_generated" ]] || fail "film evidence did not reach presenter_generated, got $(state)"
pass "check_state refuses a draft story and accepts the performed film as the styled route's evidence"

printf 'explainer smoke: all checks passed\n'
