#!/usr/bin/env bash
set -Eeuo pipefail

# Installation Script for Fedora Hyprland Installer

DRY_RUN="false"
UPDATE_MODE="false"

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN="true" ;;
        --update)  UPDATE_MODE="true" ;;
    esac
done

echo "=== Installing Fedora Hyprland Packages ==="

# Base required Fedora packages for Hyprland desktop environment
CORE_PACKAGES=(
    "hyprland"
    "xdg-desktop-portal"
    "xdg-desktop-portal-hyprland"
    "xdg-desktop-portal-gtk"
    "pipewire"
    "wireplumber"
    "kitty"
    "wofi"
    "waybar"
    "dunst"
    "grim"
    "slurp"
    "wl-clipboard"
    "polkit-gnome"
    "swaybg"
)

echo "Packages to ensure installed:"
for pkg in "${CORE_PACKAGES[@]}"; do
    echo "  - $pkg"
done

if [ "$DRY_RUN" = "true" ]; then
    echo "[DRY-RUN] Would run: sudo dnf install -y ${CORE_PACKAGES[*]}"
    exit 0
fi

if command -v dnf &>/dev/null; then
    if [ "$UPDATE_MODE" = "true" ]; then
        echo "[+] Updating Hyprland packages via dnf..."
        # dnf install also handles upgrades for already-installed packages,
        # ensuring missing packages are installed AND existing ones are updated.
        sudo dnf install -y "${CORE_PACKAGES[@]}"
    else
        echo "[+] Installing Hyprland packages via dnf..."
        sudo dnf install -y "${CORE_PACKAGES[@]}"
    fi
else
    echo "[!] Error: dnf package manager is missing."
    exit 1
fi

echo "[✓] Core package installation completed."
