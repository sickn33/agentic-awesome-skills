#!/usr/bin/env bash
set -Eeuo pipefail

# System Detection Script for Fedora Hyprland Installer

FEDORA_VERSION="unknown"
if [ -f /etc/fedora-release ]; then
    FEDORA_VERSION=$(cat /etc/fedora-release)
fi

KERNEL_RELEASE=$(uname -r)
ARCH=$(uname -m)
CURRENT_USER=$(whoami 2>/dev/null || echo "${USER:-unknown}")
CURRENT_DESKTOP="${XDG_CURRENT_DESKTOP:-unknown}"
SESSION_TYPE="${XDG_SESSION_TYPE:-unknown}"

# Detect Display Manager
DISPLAY_MANAGER="unknown"
for dm in gdm sddm lightdm gdm3; do
    if systemctl is-active --quiet "$dm" 2>/dev/null; then
        DISPLAY_MANAGER="$dm"
        break
    fi
done

# Detect Hyprland binary
HYPRLAND_INSTALLED="false"
HYPRLAND_VERSION="none"
if command -v Hyprland &>/dev/null || command -v hyprland &>/dev/null; then
    HYPRLAND_INSTALLED="true"
    HYPRLAND_VERSION=$(Hyprland --version 2>/dev/null | head -n1 || hyprland --version 2>/dev/null | head -n1 || echo "installed")
fi

# Detect PipeWire & WirePlumber
PIPEWIRE_STATUS="inactive"
if systemctl --user is-active --quiet pipewire 2>/dev/null; then
    PIPEWIRE_STATUS="active"
fi

WIREPLUMBER_STATUS="inactive"
if systemctl --user is-active --quiet wireplumber 2>/dev/null; then
    WIREPLUMBER_STATUS="active"
fi

# Detect XDG Desktop Portal
PORTAL_INSTALLED="false"
if rpm -q xdg-desktop-portal &>/dev/null; then
    PORTAL_INSTALLED="true"
fi

PORTAL_HYPRLAND_INSTALLED="false"
if rpm -q xdg-desktop-portal-hyprland &>/dev/null; then
    PORTAL_HYPRLAND_INSTALLED="true"
fi

# Detect CPU
CPU_MODEL="unknown"
if [ -f /proc/cpuinfo ]; then
    CPU_MODEL=$(grep -m1 "model name" /proc/cpuinfo | cut -d':' -f2 | sed 's/^ //' || echo "unknown")
fi

# Detect RAM
RAM_TOTAL="unknown"
if [ -f /proc/meminfo ]; then
    RAM_KB=$(grep -m1 "MemTotal" /proc/meminfo | awk '{print $2}')
    RAM_TOTAL="$((RAM_KB / 1024)) MB"
fi

# Detect Flatpak
FLATPAK_AVAILABLE="false"
if command -v flatpak &>/dev/null; then
    FLATPAK_AVAILABLE="true"
fi

# Output JSON-formatted report
cat <<EOF
{
  "fedora_release": "${FEDORA_VERSION}",
  "kernel": "${KERNEL_RELEASE}",
  "arch": "${ARCH}",
  "user": "${CURRENT_USER}",
  "cpu": "${CPU_MODEL}",
  "ram": "${RAM_TOTAL}",
  "current_desktop": "${CURRENT_DESKTOP}",
  "session_type": "${SESSION_TYPE}",
  "display_manager": "${DISPLAY_MANAGER}",
  "hyprland_installed": ${HYPRLAND_INSTALLED},
  "hyprland_version": "${HYPRLAND_VERSION}",
  "pipewire_status": "${PIPEWIRE_STATUS}",
  "wireplumber_status": "${WIREPLUMBER_STATUS}",
  "portal_installed": ${PORTAL_INSTALLED},
  "portal_hyprland_installed": ${PORTAL_HYPRLAND_INSTALLED},
  "flatpak_available": ${FLATPAK_AVAILABLE}
}
EOF
