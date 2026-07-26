#!/usr/bin/env bash
set -Eeuo pipefail

# Repair Script for Fedora Hyprland Installer

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLY="false"
if [ "${1:-}" = "--apply" ]; then
    APPLY="true"
elif [ "$#" -gt 0 ]; then
    echo "Usage: $0 [--apply]" >&2
    exit 2
fi

echo "=== Hyprland Repair Subsystem ==="

REPAIRS_MADE=0

# Subsystem 1: Missing or corrupted hyprland.conf
HYPR_CONF="${HOME}/.config/hypr/hyprland.conf"
if [ ! -f "${HYPR_CONF}" ]; then
    echo "[!] Missing hyprland.conf detected."
    if [ "$APPLY" = "true" ]; then
        bash "${SCRIPT_DIR}/configure.sh"
        REPAIRS_MADE=$((REPAIRS_MADE + 1))
    else
        echo "[PLAN] Would run configure.sh to create a minimal configuration."
    fi
fi

# Subsystem 2: XDG Desktop Portal repair
if ! rpm -q xdg-desktop-portal-hyprland &>/dev/null; then
    echo "[!] Missing xdg-desktop-portal-hyprland."
    if [ "$APPLY" = "true" ] && command -v dnf &>/dev/null; then
        echo "[+] Installing portal packages..."
        if sudo dnf install -y xdg-desktop-portal-hyprland xdg-desktop-portal-gtk; then
            REPAIRS_MADE=$((REPAIRS_MADE + 1))
        else
            echo "[!] Warning: Failed to install portal packages."
        fi
    elif [ "$APPLY" = "false" ]; then
        echo "[PLAN] Would install xdg-desktop-portal-hyprland and xdg-desktop-portal-gtk."
    fi
fi

# Subsystem 3: PipeWire / WirePlumber user services
if command -v systemctl &>/dev/null; then
    if ! systemctl --user is-active --quiet pipewire 2>/dev/null; then
        if [ "$APPLY" = "true" ]; then
            echo "[+] Enabling user service: pipewire"
            if systemctl --user enable --now pipewire; then
                REPAIRS_MADE=$((REPAIRS_MADE + 1))
            else
                echo "[!] Warning: Failed to enable pipewire."
            fi
        else
            echo "[PLAN] Would enable and start the pipewire user service."
        fi
    fi
    if ! systemctl --user is-active --quiet wireplumber 2>/dev/null; then
        if [ "$APPLY" = "true" ]; then
            echo "[+] Enabling user service: wireplumber"
            if systemctl --user enable --now wireplumber; then
                REPAIRS_MADE=$((REPAIRS_MADE + 1))
            else
                echo "[!] Warning: Failed to enable wireplumber."
            fi
        else
            echo "[PLAN] Would enable and start the wireplumber user service."
        fi
    fi
fi

# Subsystem 4: Restart user portals
if [ "$APPLY" = "true" ] && command -v systemctl &>/dev/null; then
    echo "[+] Resetting XDG portal user services..."
    systemctl --user restart xdg-desktop-portal-hyprland 2>/dev/null || true
    systemctl --user restart xdg-desktop-portal 2>/dev/null || true
fi

echo "---------------------------------"
if [ "$APPLY" = "false" ]; then
    echo "[i] Diagnostic complete. Re-run with --apply after reviewing the plan."
elif [ "$REPAIRS_MADE" -gt 0 ]; then
    echo "[✓] Repair complete. $REPAIRS_MADE issues addressed."
else
    echo "[i] Repair check finished. No automated issues identified."
fi

if [ "$APPLY" = "true" ]; then
    bash "${SCRIPT_DIR}/verify.sh"
fi
