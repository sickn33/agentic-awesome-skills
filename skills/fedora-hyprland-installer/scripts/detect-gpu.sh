#!/usr/bin/env bash
set -Eeuo pipefail

# GPU Detection Script for Fedora Hyprland Installer

PRIMARY_GPU="unknown"
NVIDIA_DETECTED="false"
AMD_DETECTED="false"
INTEL_DETECTED="false"
IS_HYBRID="false"
NVIDIA_DRIVER_ACTIVE="false"

LSPCI_OUTPUT=""
if command -v lspci &>/dev/null; then
    LSPCI_OUTPUT=$(lspci -nnk 2>/dev/null | grep -A 2 -E "VGA|3D" || true)
fi

if echo "$LSPCI_OUTPUT" | grep -iq "nvidia" 2>/dev/null; then
    NVIDIA_DETECTED="true"
fi

if echo "$LSPCI_OUTPUT" | grep -iq -E "amd|radeon|advanced micro devices" 2>/dev/null; then
    AMD_DETECTED="true"
fi

if echo "$LSPCI_OUTPUT" | grep -iq "intel" 2>/dev/null; then
    INTEL_DETECTED="true"
fi

# Count detected GPU vendors
GPU_COUNT=0
if [ "$NVIDIA_DETECTED" = "true" ]; then GPU_COUNT=$((GPU_COUNT + 1)); fi
if [ "$AMD_DETECTED" = "true" ]; then GPU_COUNT=$((GPU_COUNT + 1)); fi
if [ "$INTEL_DETECTED" = "true" ]; then GPU_COUNT=$((GPU_COUNT + 1)); fi

if [ "$GPU_COUNT" -gt 1 ]; then
    IS_HYBRID="true"
fi

# Determine primary GPU label
if [ "$NVIDIA_DETECTED" = "true" ] && [ "$IS_HYBRID" = "false" ]; then
    PRIMARY_GPU="nvidia"
elif [ "$AMD_DETECTED" = "true" ] && [ "$IS_HYBRID" = "false" ]; then
    PRIMARY_GPU="amd"
elif [ "$INTEL_DETECTED" = "true" ] && [ "$IS_HYBRID" = "false" ]; then
    PRIMARY_GPU="intel"
elif [ "$IS_HYBRID" = "true" ]; then
    if [ "$NVIDIA_DETECTED" = "true" ]; then
        PRIMARY_GPU="hybrid-nvidia"
    else
        PRIMARY_GPU="hybrid-other"
    fi
fi

# Check if NVIDIA proprietary driver is loaded
if command -v nvidia-smi &>/dev/null && nvidia-smi &>/dev/null; then
    NVIDIA_DRIVER_ACTIVE="true"
elif lsmod 2>/dev/null | grep -q "^nvidia" 2>/dev/null; then
    NVIDIA_DRIVER_ACTIVE="true"
fi

cat <<EOF
{
  "primary_gpu": "${PRIMARY_GPU}",
  "nvidia_detected": ${NVIDIA_DETECTED},
  "nvidia_driver_active": ${NVIDIA_DRIVER_ACTIVE},
  "amd_detected": ${AMD_DETECTED},
  "intel_detected": ${INTEL_DETECTED},
  "is_hybrid": ${IS_HYBRID}
}
EOF
