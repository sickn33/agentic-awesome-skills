#!/usr/bin/env bash
# usage: ref_frames.sh <url> <name> [frames=24]
# Downloads a low-res reference (YouTube / Vimeo-public / direct mp4 / 60fps.design page) and writes NAME_sheet.jpg (6×4 frames across the whole clip).
set -e
URL="$1"; NAME="$2"; N="${3:-24}"; D="$(cd "$(dirname "$0")" && pwd)"
FF="${FF:-$D/node_modules/ffmpeg-static/ffmpeg}"; [ -x "$FF" ] || FF=ffmpeg
Y="$D/yt-dlp"; [ -x "$Y" ] || { curl -sL -o "$Y" https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos && chmod +x "$Y"; }
if [[ "$URL" == *60fps.design* ]]; then curl -sL "$URL" | grep -oE 'https://[^"]+\.(mp4|webm)' | head -1 | xargs -I{} curl -sL {} -o "$NAME.mp4";
elif [[ "$URL" == *.mp4 ]]; then curl -sL "$URL" -o "$NAME.mp4";
else "$Y" -q --no-warnings -f "bv*[height<=480][ext=mp4]/b[height<=480]/worst" -o "$NAME.%(ext)s" "$URL"; [ -f "$NAME.mp4" ] || mv "$NAME".* "$NAME.mp4" 2>/dev/null || true; fi
DUR=$("$FF" -i "$NAME.mp4" 2>&1 | grep -oE "Duration: [0-9:.]+" | cut -d' ' -f2 | awk -F: '{print $1*3600+$2*60+$3}')
"$FF" -loglevel error -y -i "$NAME.mp4" -vf "fps=$N/$DUR,scale=-2:300,tile=6x$(( (N + 5) / 6 ))" -frames:v 1 "${NAME}_sheet.jpg"
echo "wrote ${NAME}_sheet.jpg ($DUR s)"
