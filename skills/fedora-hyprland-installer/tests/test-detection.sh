#!/usr/bin/env bash
set -Eeuo pipefail

# Test Detection Logic (Non-destructive)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"

echo "=== Testing System & GPU Detection Scripts ==="

echo "Testing detect-system.sh..."
SYS_OUT=$(bash "${SCRIPT_DIR}/detect-system.sh")
echo "$SYS_OUT"
python3 -c 'import json,sys; data=json.load(sys.stdin); required={"fedora_release","kernel","arch","hyprland_installed"}; assert required <= data.keys(); assert isinstance(data["hyprland_installed"], bool)' <<<"$SYS_OUT"
echo "[PASS] detect-system.sh output is valid JSON with required fields."

echo "Testing detect-gpu.sh..."
GPU_OUT=$(bash "${SCRIPT_DIR}/detect-gpu.sh")
echo "$GPU_OUT"
python3 -c 'import json,sys; data=json.load(sys.stdin); required={"primary_gpu","nvidia_detected","nvidia_driver_active","amd_detected","intel_detected","is_hybrid"}; assert required <= data.keys(); assert all(isinstance(data[key], bool) for key in required - {"primary_gpu"})' <<<"$GPU_OUT"
echo "[PASS] detect-gpu.sh output is valid JSON with required fields."

echo "[✓] All detection script unit tests passed!"
