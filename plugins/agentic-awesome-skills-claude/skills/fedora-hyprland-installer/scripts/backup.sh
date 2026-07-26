#!/usr/bin/env bash
set -Eeuo pipefail

# Backup Script for Fedora Hyprland Installer

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_BASE="${HOME:?HOME is not set}/.local/state/fedora-hyprland-installer/backups"
BACKUP_DIR="${BACKUP_BASE}/${TIMESTAMP}"

echo "=== Hyprland Configuration Backup ==="
echo "Target backup directory: ${BACKUP_DIR}"

CONFIG_ITEMS=(
    ".config/hypr"
    ".config/waybar"
    ".config/wofi"
    ".config/rofi"
    ".config/kitty"
    ".config/alacritty"
    ".config/dunst"
    ".config/mako"
)

# Check if any config items exist before creating backup directory
HAS_ITEMS="false"
for item in "${CONFIG_ITEMS[@]}"; do
    if [ -e "${HOME}/${item}" ]; then
        HAS_ITEMS="true"
        break
    fi
done

if [ "$HAS_ITEMS" = "false" ]; then
    echo "[i] No pre-existing Hyprland configuration files found to back up."
    echo "BACKUP_PATH=none"
    exit 0
fi

mkdir -p "${BACKUP_DIR}"

BACKED_UP_COUNT=0

for item in "${CONFIG_ITEMS[@]}"; do
    SRC_PATH="${HOME}/${item}"
    if [ -e "${SRC_PATH}" ]; then
        DEST_PATH="${BACKUP_DIR}/${item}"
        mkdir -p "$(dirname "${DEST_PATH}")"
        if cp -a "${SRC_PATH}" "${DEST_PATH}"; then
            echo "[+] Backed up: ~/${item} -> ${DEST_PATH}"
            BACKED_UP_COUNT=$((BACKED_UP_COUNT + 1))
        else
            echo "[!] Warning: Failed to back up ~/${item}"
        fi
    fi
done

echo "[✓] Successfully created backup of $BACKED_UP_COUNT items at: ${BACKUP_DIR}"

cat <<EOF > "${BACKUP_DIR}/manifest.txt"
Backup Date: $(date)
Backed up items count: ${BACKED_UP_COUNT}
User: $(whoami)
EOF

echo "BACKUP_PATH=${BACKUP_DIR}"
