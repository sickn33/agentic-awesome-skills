#!/usr/bin/env bash
set -Eeuo pipefail

# Repair Script for Fedora Hyprland Installer

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Hyprland Repair Subsystem ==="

REPAIRS_MADE=0

# Subsystem 1: Missing or corrupted hyprland.conf
HYPR_CONF="${HOME}/.config/hypr/hyprland.conf"
if [ ! -f "${HYPR_CONF}" ]; then
    echo "[!] Missing hyprland.conf detected. Running configuration builder..."
    "${SCRIPT_DIR}/configure.sh"
    REPAIRS_MADE=$((REPAIRS_MADE + 1))
fi

# Subsystem 2: XDG Desktop Portal repair
if ! rpm -q xdg-desktop-portal-hyprland &>/dev/null; then
    echo "[!] Missing xdg-desktop-portal-hyprland. Installing portal package..."
    if command -v dnf &>/dev/null; then
        if sudo dnf install -y xdg-desktop-portal-hyprland xdg-desktop-portal-gtk; then
            REPAIRS_MADE=$((REPAIRS_MADE + 1))
        else
            echo "[!] Warning: Failed to install portal packages."
        fi
    fi
fi

# Subsystem 3: PipeWire / WirePlumber user services
if command -v systemctl &>/dev/null; then
    if ! systemctl --user is-active --quiet pipewire 2>/dev/null; then
        echo "[+] Enabling and restarting user service: pipewire"
        systemctl --user enable --now pipewire 2>/dev/null || true
        REPAIRS_MADE=$((REPAIRS_MADE + 1))
    fi
    if ! systemctl --user is-active --quiet wireplumber 2>/dev/null; then
        echo "[+] Enabling and restarting user service: wireplumber"
        systemctl --user enable --now wireplumber 2>/dev/null || true
        REPAIRS_MADE=$((REPAIRS_MADE + 1))
    fi
fi

# Subsystem 4: Restart user portals
if command -v systemctl &>/dev/null; then
    echo "[+] Resetting XDG portal user services..."
    systemctl --user restart xdg-desktop-portal-hyprland 2>/dev/null || true
    systemctl --user restart xdg-desktop-portal 2>/dev/null || true
fi

echo "---------------------------------"
if [ "$REPAIRS_MADE" -gt 0 ]; then
    echo "[✓] Repair complete. $REPAIRS_MADE issues addressed."
else
    echo "[i] Repair check finished. No automated issues identified."
fi

# Re-run verification
"${SCRIPT_DIR}/verify.sh"
