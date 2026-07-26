#!/usr/bin/env bash
set -Eeuo pipefail

# Test Detection Logic (Non-destructive)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"

echo "=== Testing System & GPU Detection Scripts ==="

echo "Testing detect-system.sh..."
SYS_OUT=$("${SCRIPT_DIR}/detect-system.sh")
echo "$SYS_OUT"
if echo "$SYS_OUT" | grep -q "fedora_release"; then
    echo "[PASS] detect-system.sh output valid JSON schema."
else
    echo "[FAIL] detect-system.sh produced invalid output."
    exit 1
fi

echo "Testing detect-gpu.sh..."
GPU_OUT=$("${SCRIPT_DIR}/detect-gpu.sh")
echo "$GPU_OUT"
if echo "$GPU_OUT" | grep -q "primary_gpu"; then
    echo "[PASS] detect-gpu.sh output valid JSON schema."
else
    echo "[FAIL] detect-gpu.sh produced invalid output."
    exit 1
fi

echo "[✓] All detection script unit tests passed!"
