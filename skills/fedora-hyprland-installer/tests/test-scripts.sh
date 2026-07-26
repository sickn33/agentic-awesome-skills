#!/usr/bin/env bash
set -Eeuo pipefail

# Non-destructive test runner for installer scripts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"
TEST_HOME=$(mktemp -d "${TMPDIR:-/tmp}/fedora-hyprland-test.XXXXXX")
trap 'rm -rf "$TEST_HOME"' EXIT
export HOME="$TEST_HOME"

echo "=== Running Non-Destructive Installer Test Suite ==="

# 1. Shell syntax test
echo "Checking shell syntax..."
for script in "${SCRIPT_DIR}"/*.sh; do
    bash -n "$script"
done

# 2. Dry run install test
echo "Running install dry-run test..."
INSTALL_OUT=$(bash "${SCRIPT_DIR}/install.sh" --dry-run)
echo "$INSTALL_OUT"
grep -Fq "[DRY-RUN] Would run: sudo dnf install" <<<"$INSTALL_OUT"

# 3. Backup test
echo "Running isolated backup test..."
mkdir -p "$HOME/.config/hypr"
printf '%s\n' 'monitor=,preferred,auto,1' > "$HOME/.config/hypr/hyprland.conf"
BACKUP_OUT=$(bash "${SCRIPT_DIR}/backup.sh")
echo "$BACKUP_OUT"
BACKUP_PATH=$(sed -n 's/^BACKUP_PATH=//p' <<<"$BACKUP_OUT")
test -n "$BACKUP_PATH"
case "$BACKUP_PATH" in
    "$HOME"/.local/state/fedora-hyprland-installer/backups/*) ;;
    *) echo "[FAIL] backup escaped isolated HOME: $BACKUP_PATH" >&2; exit 1 ;;
esac
test -f "$BACKUP_PATH/.config/hypr/hyprland.conf"
cmp "$HOME/.config/hypr/hyprland.conf" "$BACKUP_PATH/.config/hypr/hyprland.conf"
echo "[PASS] backup.sh copied configuration inside isolated HOME."

# 4. Existing configuration must be preserved
cp "$HOME/.config/hypr/hyprland.conf" "$TEST_HOME/hyprland.conf.before"
bash "${SCRIPT_DIR}/configure.sh"
cmp "$TEST_HOME/hyprland.conf.before" "$HOME/.config/hypr/hyprland.conf"
echo "[PASS] configure.sh preserved an existing configuration."

echo "[✓] All non-destructive installer test suite cases completed successfully."
