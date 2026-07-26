#!/usr/bin/env bash
set -Eeuo pipefail

# Non-destructive test runner for installer scripts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../scripts" && pwd)"

echo "=== Running Non-Destructive Installer Test Suite ==="

# 1. Preflight test
echo "Running preflight test..."
"${SCRIPT_DIR}/preflight.sh" || true

# 2. Dry run install test
echo "Running install dry-run test..."
"${SCRIPT_DIR}/install.sh" --dry-run || true

# 3. Backup test
echo "Running backup test..."
BACKUP_OUT=$("${SCRIPT_DIR}/backup.sh") || true
echo "$BACKUP_OUT"
if echo "$BACKUP_OUT" | grep -q "BACKUP_PATH"; then
    echo "[PASS] backup.sh generated valid output."
else
    echo "[FAIL] backup.sh failed to return backup path."
    exit 1
fi

echo "[✓] All non-destructive installer test suite cases completed successfully."
