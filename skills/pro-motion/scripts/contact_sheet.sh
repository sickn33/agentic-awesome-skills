#!/usr/bin/env bash
# usage: contact_sheet.sh video.mp4 out.jpg 0.5,1.2,3.0,...  [cols] [thumb_width]
# Pulls frames at the given seconds from the rendered video and tiles them into one jpg for review.
set -e
V="$1"; OUT="$2"; TIMES="$3"; COLS="${4:-8}"; TW="${5:-216}"
FF="${FF:-$(dirname "$0")/node_modules/ffmpeg-static/ffmpeg}"; [ -x "$FF" ] || FF=ffmpeg
FPS=$("$FF" -i "$V" 2>&1 | grep -oE '[0-9.]+ fps' | head -1 | cut -d' ' -f1); FPS=${FPS:-60}
SEL=$(python3 -c "import sys;ts=[float(x) for x in sys.argv[1].split(',')];print('+'.join(f'eq(n\\\\,{int(round(t*float(sys.argv[2])))})' for t in ts))" "$TIMES" "$FPS")
N=$(echo "$TIMES" | tr ',' '\n' | wc -l | tr -d ' '); ROWS=$(( (N + COLS - 1) / COLS ))
"$FF" -loglevel error -y -i "$V" -vf "select='$SEL',scale=$TW:-2,tile=${COLS}x${ROWS}" -frames:v 1 -vsync 0 "$OUT"
echo "wrote $OUT"
