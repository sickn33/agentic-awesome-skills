#!/usr/bin/env bash
set -Eeuo pipefail

# Verification Script for Fedora Hyprland Installer

echo "=== Verification Report ==="

STATUS="SUCCESS"
CHECK_PASS=0
CHECK_WARN=0
CHECK_FAIL=0

log_check() {
    local level="$1"
    local msg="$2"
    if [ "$level" = "PASS" ]; then
        echo "  ✓ $msg"
        CHECK_PASS=$((CHECK_PASS + 1))
    elif [ "$level" = "WARN" ]; then
        echo "  ! $msg"
        CHECK_WARN=$((CHECK_WARN + 1))
    else
        echo "  ✗ $msg"
        CHECK_FAIL=$((CHECK_FAIL + 1))
    fi
}

echo "Components Check:"

# 1. Hyprland executable
if command -v Hyprland &>/dev/null || command -v hyprland &>/dev/null; then
    ver=$(Hyprland --version 2>/dev/null | head -n1 || hyprland --version 2>/dev/null | head -n1 || echo "installed")
    log_check "PASS" "Hyprland binary found ($ver)"
else
    log_check "FAIL" "Hyprland binary not found in PATH"
fi

# 2. Hyprland configuration file
HYPR_CONF="${HOME}/.config/hypr/hyprland.conf"
if [ -f "${HYPR_CONF}" ]; then
    log_check "PASS" "Hyprland configuration exists at ${HYPR_CONF}"
else
    log_check "FAIL" "Hyprland configuration missing at ${HYPR_CONF}"
fi

# 3. Session Desktop Entry
if [ -f /usr/share/wayland-sessions/hyprland.desktop ]; then
    log_check "PASS" "Wayland session entry exists (/usr/share/wayland-sessions/hyprland.desktop)"
else
    log_check "WARN" "Wayland session entry missing in /usr/share/wayland-sessions/"
fi

# 4. PipeWire & WirePlumber
if systemctl --user is-active --quiet pipewire 2>/dev/null || pgrep -x pipewire &>/dev/null; then
    log_check "PASS" "PipeWire audio server is running"
else
    log_check "WARN" "PipeWire audio server is not currently active"
fi

if systemctl --user is-active --quiet wireplumber 2>/dev/null || pgrep -x wireplumber &>/dev/null; then
    log_check "PASS" "WirePlumber session manager is running"
else
    log_check "WARN" "WirePlumber is not currently active"
fi

# 5. XDG Desktop Portal
if rpm -q xdg-desktop-portal-hyprland &>/dev/null; then
    log_check "PASS" "XDG Desktop Portal Hyprland backend installed"
else
    log_check "WARN" "XDG Desktop Portal backend for Hyprland not detected"
fi

# Determine overall status
if [ "$CHECK_FAIL" -gt 0 ]; then
    STATUS="FAILED"
elif [ "$CHECK_WARN" -gt 0 ]; then
    STATUS="PARTIAL"
fi

echo "----------------------------------------"
echo "Installation Status: ${STATUS}"
echo "Checks: ${CHECK_PASS} passed, ${CHECK_WARN} warnings, ${CHECK_FAIL} failed"

if [ "$STATUS" = "SUCCESS" ]; then
    echo "Next steps: Log out and select 'Hyprland' from your login screen desktop session menu."
    exit 0
elif [ "$STATUS" = "PARTIAL" ]; then
    echo "Notice: Installation completed with minor warnings. Review warnings above."
    exit 0
else
    exit 1
fi
