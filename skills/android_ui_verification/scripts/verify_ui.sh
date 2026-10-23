#!/bin/bash

# Helper script for Android UI Verification Skill
# Usage: ANDROID_SERIAL=<authorized-emulator> bash scripts/verify_ui.sh [screenshot_name]
set -euo pipefail

ARTIFACTS_DIR="./artifacts"
SCREENSHOT_NAME="${1:-latest_screen}"
[[ "$SCREENSHOT_NAME" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "Use a simple artifact name" >&2; exit 2; }
: "${ANDROID_SERIAL:?Set ANDROID_SERIAL to the authorized emulator serial}"
ADB=(adb -s "$ANDROID_SERIAL")
"${ADB[@]}" get-state >/dev/null

echo "🚀 Starting UI Verification..."

# 1. Create artifacts directory if not exists
mkdir -p "$ARTIFACTS_DIR"

# 2. Get Resolution
echo "📏 Calibrating display..."
"${ADB[@]}" shell wm size

# 3. Dump UI XML
echo "📋 Dumping UI hierarchy..."
"${ADB[@]}" shell uiautomator dump /sdcard/view.xml
"${ADB[@]}" pull /sdcard/view.xml "$ARTIFACTS_DIR/view.xml"

# 4. Capture Screenshot
echo "📸 Capturing screenshot: $SCREENSHOT_NAME.png"
"${ADB[@]}" shell screencap -p /sdcard/screen.png
"${ADB[@]}" pull /sdcard/screen.png "$ARTIFACTS_DIR/$SCREENSHOT_NAME.png"

# 5. Get Recent JS Logs
echo "📜 Fetching recent JS logs..."
# No ReactNativeJS records is not itself an ADB failure. pipefail preserves collection failures.
"${ADB[@]}" logcat -d | awk '/ReactNativeJS/' | tail -n 20 > "$ARTIFACTS_DIR/js_logs.txt"

echo "✅ Done. Artifacts saved in $ARTIFACTS_DIR"
