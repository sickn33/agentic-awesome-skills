#!/usr/bin/env bash
# Real mobile screenshot of a live page (iPhone UA, 390pt wide @3x).
# usage: shoot.sh <url> <out.png> [height_pt=844]
# Set PROXY=http://127.0.0.1:7890 if your network needs a proxy.
set -euo pipefail
url="$1"; out="$2"; h="${3:-844}"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
args=(--headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=3 --window-size=390,"$h"
  --timeout=15000 --user-data-dir="/tmp/post-shoot-$$"
  --user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
  --screenshot="$out")
[ -n "${PROXY:-}" ] && args+=(--proxy-server="$PROXY")
perl -e 'alarm 45; exec @ARGV' "$CHROME" "${args[@]}" "$url" >/dev/null 2>&1
ls -la "$out"
