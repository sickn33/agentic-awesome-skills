#!/usr/bin/env bash
# End-to-end smoke test: drive one synthetic job from intake to verified with local media only.

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd -P)"
SCRIPTS="$SKILL_DIR/scripts"
TMP_ROOT="${TMPDIR:-/tmp}"
# Windows sets TMPDIR to a native path (C:\...\Temp); mktemp would then return a path
# carrying a drive colon, which rsync and friends read as a remote host. Normalise to POSIX.
if command -v cygpath >/dev/null 2>&1; then TMP_ROOT="$(cygpath -u "$TMP_ROOT")"; fi
WORK="$(mktemp -d "${TMP_ROOT%/}/presenter-smoke.XXXXXX")"
# A failed cleanup must not decide the exit status: under `set -e` a rejected rm would turn a
# fully successful run into exit code 1. Clean up best-effort and stay quiet.
trap 'rm -rf -- "$WORK" >/dev/null 2>&1 || true' EXIT INT TERM
# The unique directory name survives symlink resolution such as /var -> /private/var.
WORK_NAME="$(basename "$WORK")"

JOB="$WORK/job"
MANIFEST="$JOB/job.json"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

pass() {
  printf 'ok - %s\n' "$*"
}

set_json() {
  jq "$1" "$MANIFEST" >"$MANIFEST.tmp"
  mv -- "$MANIFEST.tmp" "$MANIFEST"
}

state_of() {
  python3 "$SCRIPTS/check_state.py" "$MANIFEST" | jq -r .evidenced_state | tr -d '\r'
}

synth_video() {
  ffmpeg -v error -y -f lavfi -i "testsrc2=s=540x960:r=30:d=$2" \
    -f lavfi -i "sine=f=330:d=$2,volume=0.3" \
    -c:v libx264 -pix_fmt yuv420p -c:a aac -ac 2 "$1"
}

mkdir -p "$WORK/in/other"
ffmpeg -v error -f lavfi -i testsrc2=s=720x1280 -frames:v 1 "$WORK/in/presenter.png"
ffmpeg -v error -f lavfi -i testsrc2=s=640x360 -frames:v 1 "$WORK/in/other/presenter.png"
ffmpeg -v error -f lavfi -i "sine=f=220:d=6" -ac 1 "$WORK/in/voice.wav"
printf '一分钟讲清楚上下文工程。\n' >"$WORK/in/script.txt"

# Intake copies inputs into the job and keeps paths job-relative.
python3 "$SCRIPTS/init_job.py" --job-dir "$JOB" \
  --presenter-image "$WORK/in/presenter.png" --script "$WORK/in/script.txt" \
  --voice-sample "$WORK/in/voice.wav" --supporting-media "$WORK/in/other/presenter.png" \
  --rights-confirmed --adult-presenter-confirmed >/dev/null
[[ "$(jq -r .input.presenter_image "$MANIFEST" | tr -d '\r')" == "assets/source/presenter.png" ]] || fail "presenter image path"
[[ "$(jq -r '.input.supporting_media[0]' "$MANIFEST" | tr -d '\r')" == "assets/source/presenter-2.png" ]] || fail "name collision"
[[ -f "$JOB/assets/audio/reference/voice.wav" ]] || fail "voice sample copy"
if python3 "$SCRIPTS/init_job.py" --job-dir "$JOB" --presenter-image "$WORK/in/presenter.png" --topic x 2>/dev/null; then
  fail "init_job overwrote a non-empty job"
fi
pass "init_job copies inputs and refuses to overwrite"

# Preflight blocks until manual review is recorded, then passes without leaking machine paths.
if python3 "$SCRIPTS/preflight.py" "$MANIFEST" >/dev/null; then
  fail "preflight passed without manual review"
fi
set_json '.manual_input_review |= map_values(true) | .input.remote_upload_approved = true | .input.voice_clone_approved = true'
python3 "$SCRIPTS/preflight.py" "$MANIFEST" | jq -e '.ok and .remote_ready' >/dev/null || fail "preflight after review"
if grep -q "$WORK_NAME" "$JOB/qa/reports/preflight.json"; then
  fail "preflight report contains an absolute path"
fi
pass "preflight gates manual review and stays portable"

# The state checker refuses unsupported claims.
set_json '.state = "verified"'
if python3 "$SCRIPTS/check_state.py" "$MANIFEST" >/dev/null; then
  fail "check_state accepted an unsupported verified claim"
fi
[[ "$(state_of)" == "intake" ]] || fail "expected intake"
pass "check_state rejects unsupported claims"

printf '# Script\n' >"$JOB/docs/SCRIPT.md"
printf '# Beat sheet\n' >"$JOB/docs/BEAT_SHEET.md"
set_json '.artifacts.script = "docs/SCRIPT.md" | .artifacts.beat_sheet = "docs/BEAT_SHEET.md"'
[[ "$(state_of)" == "content_locked" ]] || fail "expected content_locked"

ffmpeg -v error -f lavfi -i "sine=f=330:d=6" -ac 1 "$JOB/assets/audio/final/narration.wav"
printf '# ASR\n' >"$JOB/qa/reports/asr.md"
set_json '.artifacts.final_audio = "assets/audio/final/narration.wav" | .qa.asr_report = "qa/reports/asr.md"'
[[ "$(state_of)" == "audio_locked" ]] || fail "expected audio_locked"

# Segment planning cuts inside pauses and respects the cap.
cat >"$JOB/qa/asr/sentences.json" <<'JSON'
[{"start": 0.2, "end": 2.1}, {"start": 2.5, "end": 4.0}, {"start": 4.4, "end": 5.8}]
JSON
python3 "$SCRIPTS/plan_segments.py" --timings "$JOB/qa/asr/sentences.json" \
  --audio "$JOB/assets/audio/final/narration.wav" --cap 4 --whole-seconds \
  --output "$JOB/qa/requests/segment-plan.json" >/dev/null
jq -e '.seams_s == [4.0] and ([.segments[].requested_seconds] == [4, 2])' \
  "$JOB/qa/requests/segment-plan.json" >/dev/null || fail "segment plan"
if python3 "$SCRIPTS/plan_segments.py" --timings "$JOB/qa/asr/sentences.json" \
  --audio-duration 6 --cap 2 2>/dev/null; then
  fail "plan_segments accepted a cap with no usable pause"
fi
pass "plan_segments cuts inside pauses"

printf '# Timeline\n' >"$JOB/docs/TIMELINE.md"
printf '# Storyboard\n' >"$JOB/docs/STORYBOARD.md"
set_json '.artifacts.timeline = "docs/TIMELINE.md" | .artifacts.storyboard = "docs/STORYBOARD.md" | .plan.status = "approved" | .plan.segment_plan = "qa/requests/segment-plan.json"'
[[ "$(state_of)" == "visual_plan_locked" ]] || fail "expected visual_plan_locked"

synth_video "$JOB/assets/video/selected/presenter.mp4" 6
printf '# Presenter review\n' >"$JOB/qa/reports/presenter-review.md"
set_json '.capabilities.main_presenter = {"provider": "synthetic"} | .qa.manual_visual_review = "qa/reports/presenter-review.md"'
[[ "$(state_of)" == "presenter_generated" ]] || fail "expected presenter_generated"

printf '# Composition\n' >"$JOB/qa/reports/composition.md"
set_json '.qa.composition_report = "qa/reports/composition.md"'
[[ "$(state_of)" == "composition_checked" ]] || fail "expected composition_checked"

synth_video "$JOB/renders/rendered.mp4" 4
set_json '.artifacts.rendered = "renders/rendered.mp4"'
[[ "$(state_of)" == "rendered" ]] || fail "expected rendered"
pass "check_state advances only with evidence"

# Finalize verifies delivered loudness and refuses silent input or overwrites.
ffmpeg -v error -f lavfi -i testsrc2=s=540x960:r=30:d=2 -f lavfi -i anullsrc=r=48000:cl=stereo \
  -t 2 -c:v libx264 -pix_fmt yuv420p -c:a aac "$WORK/silent.mp4"
if bash "$SCRIPTS/finalize_delivery.sh" "$WORK/silent.mp4" "$WORK/silent-out" silent 2>/dev/null; then
  fail "finalizer accepted silent audio"
fi
[[ -z "$(ls -A "$WORK/silent-out")" ]] || fail "finalizer published files after a failed check"

bash "$SCRIPTS/finalize_delivery.sh" "$JOB/renders/rendered.mp4" "$JOB/outputs" smoke >/dev/null 2>&1 \
  || fail "finalizer on a valid render"
REPORT="$JOB/outputs/smoke-delivery-report.json"
jq -e '.status == "verified" and .loudness_passed
  and ((.master_loudness.input_i | tonumber) + 16 | fabs) <= 0.5
  and ((.share_loudness.input_i | tonumber) + 16 | fabs) <= 0.5
  and .master_probe.format.filename == "smoke-master.mp4"' "$REPORT" >/dev/null \
  || fail "delivery report loudness"
ffprobe -v error -show_entries stream=width,height -of json "$JOB/outputs/smoke-contact-sheet.png" \
  | jq -e '.streams[0] | .height > .width' >/dev/null \
  || fail "portrait contact sheet orientation"
if grep -q "$WORK_NAME" "$REPORT"; then
  fail "delivery report contains an absolute path"
fi
if bash "$SCRIPTS/finalize_delivery.sh" "$JOB/renders/rendered.mp4" "$JOB/outputs" smoke 2>/dev/null; then
  fail "finalizer overwrote existing outputs"
fi
pass "finalize_delivery verifies before publishing"

set_json '.artifacts.master = "outputs/smoke-master.mp4" | .artifacts.share = "outputs/smoke-share.mp4" | .qa.delivery_report = "outputs/smoke-delivery-report.json"'
python3 "$SCRIPTS/check_state.py" "$MANIFEST" --write >/dev/null
[[ "$(jq -r .state "$MANIFEST" | tr -d '\r')" == "verified" ]] || fail "expected verified"
pass "job reaches verified"
