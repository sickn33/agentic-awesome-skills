#!/usr/bin/env bash

set -euo pipefail

usage() {
  printf 'Usage: %s rendered.mp4 output-dir output-stem\n' "$(basename "$0")" >&2
  printf 'Environment: PROGRAM_LUFS sets the integrated loudness target (default -16).\n' >&2
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

[[ "$#" -eq 3 ]] || { usage; exit 64; }

INPUT="$1"
OUTPUT_DIR="$2"
STEM="$3"

TARGET_I="${PROGRAM_LUFS:--16}"
TARGET_TP="-1.5"
MAX_TP="-1.0"
TOLERANCE_LU="0.5"

[[ -f "$INPUT" && -s "$INPUT" ]] || die "input render is missing or empty: $INPUT"
[[ "$STEM" =~ ^[A-Za-z0-9._-]+$ ]] || die "output stem contains unsupported characters: $STEM"
[[ "$TARGET_I" =~ ^-[0-9]+([.][0-9]+)?$ ]] || die "PROGRAM_LUFS must be a negative number: $TARGET_I"
awk -v target="$TARGET_I" 'BEGIN { exit !(target >= -40 && target <= -5) }' \
  || die "PROGRAM_LUFS must be between -40 and -5: $TARGET_I"

for command in ffmpeg ffprobe jq mktemp awk sed tr; do
  command -v "$command" >/dev/null 2>&1 || die "required command unavailable: $command"
done

mkdir -p "$OUTPUT_DIR"
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd -P)"
INPUT="$(cd "$(dirname "$INPUT")" && pwd -P)/$(basename "$INPUT")"

MASTER="$OUTPUT_DIR/${STEM}-master.mp4"
SHARE="$OUTPUT_DIR/${STEM}-share.mp4"
REPORT="$OUTPUT_DIR/${STEM}-delivery-report.json"
CONTACT="$OUTPUT_DIR/${STEM}-contact-sheet.png"

for output in "$MASTER" "$SHARE" "$REPORT" "$CONTACT"; do
  [[ ! -e "$output" ]] || die "refusing to overwrite existing output: $output"
done

TMP_ROOT="${TMPDIR:-/tmp}"
if command -v cygpath >/dev/null 2>&1; then TMP_ROOT="$(cygpath -u "$TMP_ROOT")"; fi
TMP_DIR="$(mktemp -d "${TMP_ROOT%/}/presenter-finalize.XXXXXX")"
# A failed cleanup must not decide the exit status: under `set -e` a rejected rm would turn a
# fully successful delivery into exit code 1. Clean up best-effort and stay quiet.
trap 'rm -rf -- "$TMP_DIR" >/dev/null 2>&1 || true' EXIT INT TERM

# Every output is built and verified here first; nothing reaches OUTPUT_DIR unless all checks pass.
TMP_MASTER="$TMP_DIR/master.mp4"
TMP_SHARE="$TMP_DIR/share.mp4"
TMP_CONTACT="$TMP_DIR/contact.png"
TMP_REPORT="$TMP_DIR/report.json"

STREAM_JSON="$TMP_DIR/source-probe.json"
ffprobe -v error -show_streams -show_format -of json "$INPUT" >"$STREAM_JSON"
jq -e '.streams | any(.codec_type == "video") and any(.codec_type == "audio")' "$STREAM_JSON" >/dev/null \
  || die "input must contain decodable video and audio streams"

WIDTH="$(jq -r '[.streams[] | select(.codec_type == "video")][0].width' "$STREAM_JSON" | tr -d '\r')"
HEIGHT="$(jq -r '[.streams[] | select(.codec_type == "video")][0].height' "$STREAM_JSON" | tr -d '\r')"
FPS="$(jq -r '[.streams[] | select(.codec_type == "video")][0].avg_frame_rate' "$STREAM_JSON" | tr -d '\r')"
[[ "$FPS" != "0/0" && -n "$FPS" ]] || FPS="30"

measure_loudness() {
  local source="$1"
  local name="$2"
  local log="$TMP_DIR/${name}-loudnorm.log"
  local json="$TMP_DIR/${name}-loudness.json"

  ffmpeg -hide_banner -nostdin -nostats -i "$source" \
    -map 0:a:0 -vn \
    -af "loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=9:print_format=json" \
    -f null - >/dev/null 2>"$log"
  sed -n '/^{/,/^}/p' "$log" >"$json"
  jq -e . "$json" >/dev/null || die "could not parse loudness measurement for $name"
}

measure_loudness "$INPUT" source
MEASURE_JSON="$TMP_DIR/source-loudness.json"
jq -e '.input_i | test("^-?[0-9]+([.][0-9]+)?$") and (tonumber > -70)' "$MEASURE_JSON" >/dev/null \
  || die "input audio is silent or unmeasurable ($(jq -r .input_i "$MEASURE_JSON") LUFS); confirm the narration is routed into the render"

MEASURED_I="$(jq -r .input_i "$MEASURE_JSON" | tr -d '\r')"
MEASURED_TP="$(jq -r .input_tp "$MEASURE_JSON" | tr -d '\r')"
MEASURED_LRA="$(jq -r .input_lra "$MEASURE_JSON" | tr -d '\r')"
MEASURED_THRESH="$(jq -r .input_thresh "$MEASURE_JSON" | tr -d '\r')"
OFFSET="$(jq -r .target_offset "$MEASURE_JSON" | tr -d '\r')"

LOUDNORM="loudnorm=I=${TARGET_I}:TP=${TARGET_TP}:LRA=9:measured_I=${MEASURED_I}:measured_TP=${MEASURED_TP}:measured_LRA=${MEASURED_LRA}:measured_thresh=${MEASURED_THRESH}:offset=${OFFSET}:linear=true:print_format=summary"
VIDEO_FILTER="scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos,setsar=1,fps=${FPS},format=yuv420p"

encode() {
  local crf="$1"
  local preset="$2"
  local audio_bitrate="$3"
  local destination="$4"

  ffmpeg -hide_banner -nostdin -loglevel warning -stats -i "$INPUT" \
    -map 0:v:0 -map 0:a:0 -sn -dn \
    -vf "$VIDEO_FILTER" -af "$LOUDNORM" \
    -c:v libx264 -preset "$preset" -crf "$crf" -profile:v high \
    -pix_fmt yuv420p -tag:v avc1 -fps_mode cfr \
    -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a "$audio_bitrate" -ar 48000 -ac 2 \
    -map_metadata -1 -map_chapters -1 -movflags +faststart \
    "$destination"
  [[ -s "$destination" ]] || die "encoder produced an empty output"
}

encode 16 slow 256k "$TMP_MASTER"
encode 24 medium 160k "$TMP_SHARE"

for file in "$TMP_MASTER" "$TMP_SHARE"; do
  ffmpeg -hide_banner -nostdin -v error -xerror -i "$file" \
    -map 0:v:0 -map 0:a:0 -f null - >/dev/null \
    || die "full decode failed: $(basename "$file")"
done

# Verify the delivered program, not just the source: compositors can duplicate mono into stereo.
measure_loudness "$TMP_MASTER" master
measure_loudness "$TMP_SHARE" share
for name in master share; do
  jq -e --argjson target "$TARGET_I" --argjson tolerance "$TOLERANCE_LU" --argjson max_tp "$MAX_TP" \
    '((.input_i | tonumber) - $target) as $delta
     | (if $delta < 0 then -$delta else $delta end) <= $tolerance
       and (.input_tp | tonumber) <= $max_tp' \
    "$TMP_DIR/${name}-loudness.json" >/dev/null \
    || die "$name loudness out of tolerance: $(jq -r '"\(.input_i) LUFS, \(.input_tp) dBTP"' "$TMP_DIR/${name}-loudness.json") (target ${TARGET_I} ± ${TOLERANCE_LU} LU, true peak <= ${MAX_TP} dBTP)"
done

portable_probe() {
  local source="$1"
  local published_name="$2"
  local destination="$3"

  ffprobe -v error -show_streams -show_format -of json "$source" \
    | jq --arg name "$published_name" '.format.filename = $name' >"$destination"
}

# Keep shared reports portable and avoid exposing the developer machine path.
jq --arg name "$(basename "$INPUT")" '.format.filename = $name' "$STREAM_JSON" >"$STREAM_JSON.portable"
mv -- "$STREAM_JSON.portable" "$STREAM_JSON"
portable_probe "$TMP_MASTER" "$(basename "$MASTER")" "$TMP_DIR/master-probe.json"
portable_probe "$TMP_SHARE" "$(basename "$SHARE")" "$TMP_DIR/share-probe.json"

ffmpeg -hide_banner -nostdin -i "$TMP_MASTER" \
  -vf 'blackdetect=d=0.10:pix_th=0.02,freezedetect=n=-60dB:d=0.40' -an -f null - \
  >/dev/null 2>"$TMP_DIR/picture-events.log"
BLACK_EVENTS="$(grep -c 'black_start:' "$TMP_DIR/picture-events.log" || true)"
FREEZE_EVENTS="$(grep -c 'freeze_start:' "$TMP_DIR/picture-events.log" || true)"

DURATION="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$TMP_MASTER" | tr -d '\r')"
awk -v duration="$DURATION" 'BEGIN {
  p[1]=0.2; p[2]=duration*0.125; p[3]=duration*0.25; p[4]=duration*0.375;
  p[5]=duration*0.5; p[6]=duration*0.625; p[7]=duration*0.75;
  p[8]=duration*0.875; p[9]=duration-0.2;
  for(i=1;i<=9;i++) printf "%.6f\n", p[i]
}' >"$TMP_DIR/timestamps.txt"

if (( WIDTH > HEIGHT )); then
  CONTACT_FRAME_FILTER='scale=480:270:force_original_aspect_ratio=decrease:flags=lanczos,pad=480:270:(ow-iw)/2:(oh-ih)/2:color=black'
elif (( HEIGHT > WIDTH )); then
  CONTACT_FRAME_FILTER='scale=270:480:force_original_aspect_ratio=decrease:flags=lanczos,pad=270:480:(ow-iw)/2:(oh-ih)/2:color=black'
else
  CONTACT_FRAME_FILTER='scale=360:360:force_original_aspect_ratio=decrease:flags=lanczos,pad=360:360:(ow-iw)/2:(oh-ih)/2:color=black'
fi

index=0
while IFS= read -r timestamp; do
  index=$((index + 1))
  printf -v frame '%s/frame-%02d.png' "$TMP_DIR" "$index"
  ffmpeg -hide_banner -nostdin -loglevel error -ss "$timestamp" -i "$TMP_MASTER" \
    -frames:v 1 -vf "$CONTACT_FRAME_FILTER" -update 1 "$frame"
done <"$TMP_DIR/timestamps.txt"

ffmpeg -hide_banner -nostdin -loglevel error -framerate 1 -start_number 1 \
  -i "$TMP_DIR/frame-%02d.png" -frames:v 1 \
  -vf 'tile=3x3:padding=12:margin=12:color=0x101218' -update 1 "$TMP_CONTACT"

jq -n \
  --arg status verified \
  --arg input "$(basename "$INPUT")" \
  --arg master "$(basename "$MASTER")" \
  --arg share "$(basename "$SHARE")" \
  --arg contact "$(basename "$CONTACT")" \
  --arg duration "$DURATION" \
  --argjson target_i "$TARGET_I" \
  --argjson max_tp "$MAX_TP" \
  --argjson tolerance "$TOLERANCE_LU" \
  --argjson black_events "$BLACK_EVENTS" \
  --argjson freeze_events "$FREEZE_EVENTS" \
  --slurpfile measured "$MEASURE_JSON" \
  --slurpfile master_loudness "$TMP_DIR/master-loudness.json" \
  --slurpfile share_loudness "$TMP_DIR/share-loudness.json" \
  --slurpfile source_probe "$STREAM_JSON" \
  --slurpfile master_probe "$TMP_DIR/master-probe.json" \
  --slurpfile share_probe "$TMP_DIR/share-probe.json" \
  '{status:$status,input:$input,master:$master,share:$share,contact_sheet:$contact,duration_s:($duration|tonumber),loudness_target:{integrated_lufs:$target_i,tolerance_lu:$tolerance,max_true_peak_dbtp:$max_tp},loudness_passed:true,source_loudness:$measured[0],master_loudness:$master_loudness[0],share_loudness:$share_loudness[0],source_probe:$source_probe[0],master_probe:$master_probe[0],share_probe:$share_probe[0],full_decode_passed:true,black_frame_events:$black_events,freeze_events:$freeze_events}' \
  >"$TMP_REPORT"

# Publish only after every check passed; the report goes last as the completion marker.
mv -- "$TMP_MASTER" "$MASTER"
mv -- "$TMP_SHARE" "$SHARE"
mv -- "$TMP_CONTACT" "$CONTACT"
mv -- "$TMP_REPORT" "$REPORT"

printf 'Master: %s\nShare: %s\nReport: %s\nContact: %s\n' "$MASTER" "$SHARE" "$REPORT" "$CONTACT"
