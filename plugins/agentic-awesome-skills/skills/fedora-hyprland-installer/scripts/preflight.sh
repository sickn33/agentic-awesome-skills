#!/usr/bin/env bash
set -Eeuo pipefail

# Preflight Check Script for Fedora Hyprland Installer

echo "=== Fedora Hyprland Preflight Verification ==="

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

log_pass() { echo "[PASS] $1"; PASS_COUNT=$((PASS_COUNT + 1)); }
log_warn() { echo "[WARN] $1"; WARN_COUNT=$((WARN_COUNT + 1)); }
log_fail() { echo "[FAIL] $1"; FAIL_COUNT=$((FAIL_COUNT + 1)); }

# Check 1: Fedora Linux OS
if [ -f /etc/fedora-release ]; then
    FEDORA_VER=$(cat /etc/fedora-release)
    log_pass "Fedora Linux detected ($FEDORA_VER)"
else
    log_fail "Not a Fedora Linux distribution! This skill is Fedora-first."
fi

# Check 2: System Architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ] || [ "$ARCH" = "aarch64" ]; then
    log_pass "Supported architecture: $ARCH"
else
    log_warn "Unusual architecture: $ARCH"
fi

# Check 3: Package Manager (dnf)
if command -v dnf &>/dev/null; then
    log_pass "Package manager 'dnf' is available"
else
    log_fail "Package manager 'dnf' not found"
fi

# Check 4: Network Access
if ping -c 1 -W 3 fedoraproject.org &>/dev/null || ping -c 1 -W 3 8.8.8.8 &>/dev/null; then
    log_pass "Network connectivity active"
else
    log_warn "Network connection could not be verified"
fi

# Check 5: Disk Space (require at least 2GB free on /)
FREE_KB=$(df -k / | awk 'NR==2 {print $4}')
FREE_GB=$((FREE_KB / 1024 / 1024))
if [ "$FREE_KB" -gt 2097152 ]; then
    log_pass "Sufficient disk space available (${FREE_GB} GB free)"
else
    log_warn "Low disk space (${FREE_GB} GB free, <2GB recommended)"
fi

# Check 6: Sudo availability
if command -v sudo &>/dev/null; then
    log_pass "Sudo command utility is installed"
else
    log_warn "Sudo command utility not found"
fi

# Check 7: Existing Hyprland installation
if command -v Hyprland &>/dev/null || command -v hyprland &>/dev/null; then
    log_warn "Hyprland is already installed on this system"
else
    log_pass "No existing Hyprland installation detected"
fi

# Check 8: GPU detection quick check
if command -v lspci &>/dev/null; then
    GPU_LINE=$(lspci 2>/dev/null | grep -iE "VGA|3D" | head -n1 || echo "")
    if [ -n "$GPU_LINE" ]; then
        log_pass "GPU detected: $GPU_LINE"
    else
        log_warn "No GPU detected via lspci"
    fi
else
    log_warn "lspci not available — cannot detect GPU"
fi

# Check 9: PipeWire status
if systemctl --user is-active --quiet pipewire 2>/dev/null; then
    log_pass "PipeWire audio server is running"
else
    log_warn "PipeWire is not currently running"
fi

echo "----------------------------------------------"
echo "Preflight Summary: $PASS_COUNT passed, $WARN_COUNT warnings, $FAIL_COUNT failures"

if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
fi
exit 0
