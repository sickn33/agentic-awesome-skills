#!/usr/bin/env bash
set -Eeuo pipefail

# Uninstall Script for Fedora Hyprland Installer

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${1:-}" != "--yes" ] || [ "$#" -ne 1 ]; then
    echo "Usage: $0 --yes" >&2
    echo "Review the package list in this script before confirming removal." >&2
    exit 2
fi

echo "=== Uninstall Hyprland Setup ==="

PACKAGES_TO_REMOVE=(
    "hyprland"
    "xdg-desktop-portal-hyprland"
)

echo "The following Hyprland-specific packages will be removed:"
for pkg in "${PACKAGES_TO_REMOVE[@]}"; do
    echo "  - $pkg"
done

echo ""
echo "Note: Base desktop environments (GNOME, KDE Plasma, Xfce) and user backup files will NOT be touched."

# Run backup prior to uninstallation
if [ -f "${SCRIPT_DIR}/backup.sh" ]; then
    echo "[+] Creating final backup before uninstallation..."
    bash "${SCRIPT_DIR}/backup.sh" || true
fi

if command -v dnf &>/dev/null; then
    echo "[+] Executing dnf removal..."
    # Filter to only remove packages that are actually installed
    INSTALLED_TO_REMOVE=()
    for pkg in "${PACKAGES_TO_REMOVE[@]}"; do
        if rpm -q "$pkg" &>/dev/null; then
            INSTALLED_TO_REMOVE+=("$pkg")
        else
            echo "[i] Package '$pkg' is not installed, skipping."
        fi
    done

    if [ "${#INSTALLED_TO_REMOVE[@]}" -gt 0 ]; then
        sudo dnf remove -y "${INSTALLED_TO_REMOVE[@]}"
        echo "[✓] Hyprland packages removed successfully."
    else
        echo "[i] No Hyprland packages found to remove."
    fi
else
    echo "[!] dnf package manager not found."
    exit 1
fi

echo "Uninstallation finished cleanly."
