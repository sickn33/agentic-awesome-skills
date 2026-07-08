#!/bin/bash

# Helper script for Android UI Verification Skill
# Usage: ./verify_ui.sh [screenshot_name]

ARTIFACTS_DIR="./artifacts"
SCREENSHOT_NAME="${1:-latest_screen}"

echo "🚀 Starting UI Verification..."

# 1. Create artifacts directory if not exists
mkdir -p "$ARTIFACTS_DIR"

# 2. Get Resolution
echo "📏 Calibrating display..."
adb shell wm size

# 3. Dump UI XML
echo "📋 Dumping UI hierarchy..."
adb shell uiautomator dump /sdcard/view.xml
adb pull /sdcard/view.xml "$ARTIFACTS_DIR/view.xml"

# 4. Capture Screenshot
echo "📸 Capturing screenshot: $SCREENSHOT_NAME.png"
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png "$ARTIFACTS_DIR/$SCREENSHOT_NAME.png"

# 5. Get Recent JS Logs
echo "📜 Fetching recent JS logs..."
adb logcat -d | grep "ReactNativeJS" | tail -n 20 > "$ARTIFACTS_DIR/js_logs.txt"

echo "✅ Done. Artifacts saved in $ARTIFACTS_DIR"
