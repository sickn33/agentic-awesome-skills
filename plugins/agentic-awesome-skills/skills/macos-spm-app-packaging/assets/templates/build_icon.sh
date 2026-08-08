#!/usr/bin/env bash
set -euo pipefail

ICON_FILE=${1:-Icon.icon}
BASENAME=${2:-Icon}
OUT_ROOT=${3:-build/icon}
XCODE_APP=${XCODE_APP:-/Applications/Xcode.app}

ICTOOL="$XCODE_APP/Contents/Applications/Icon Composer.app/Contents/Executables/ictool"
if [[ ! -x "$ICTOOL" ]]; then
  ICTOOL="$XCODE_APP/Contents/Applications/Icon Composer.app/Contents/Executables/icontool"
fi
if [[ ! -x "$ICTOOL" ]]; then
  echo "ictool/icontool not found. Set XCODE_APP if Xcode is elsewhere." >&2
  exit 1
fi

ICONSET_DIR="$OUT_ROOT/${BASENAME}.iconset"
TMP_DIR="$OUT_ROOT/tmp"
mkdir -p "$ICONSET_DIR" "$TMP_DIR"

MASTER_ART="$TMP_DIR/icon_art_824.png"
MASTER_1024="$TMP_DIR/icon_1024.png"

# Render inner art (no margin) with macOS Default appearance.
"$ICTOOL" "$ICON_FILE" \
  --export-preview macOS Default 824 824 1 -45 "$MASTER_ART"

# Pad to 1024x1024 with transparent border.
sips --padToHeightWidth 1024 1024 "$MASTER_ART" --out "$MASTER_1024" >/dev/null

# Generate required sizes.
sizes=(16 32 64 128 256 512 1024)
for sz in "${sizes[@]}"; do
  out="$ICONSET_DIR/icon_${sz}x${sz}.png"
  sips -z "$sz" "$sz" "$MASTER_1024" --out "$out" >/dev/null
  if [[ "$sz" -ne 1024 ]]; then
    dbl=$((sz*2))
    out2="$ICONSET_DIR/icon_${sz}x${sz}@2x.png"
    sips -z "$dbl" "$dbl" "$MASTER_1024" --out "$out2" >/dev/null
  fi
done

# 512x512@2x already covered by 1024; ensure it exists.
cp "$MASTER_1024" "$ICONSET_DIR/icon_512x512@2x.png"

iconutil -c icns "$ICONSET_DIR" -o Icon.icns

echo "Icon.icns generated at $(pwd)/Icon.icns"
