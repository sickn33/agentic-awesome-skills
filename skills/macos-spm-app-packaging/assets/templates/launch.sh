#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_NAME=${APP_NAME:-MyApp}
# AAS review: constrain names before constructing removal paths, process patterns or XML.
[[ "$APP_NAME" =~ ^[A-Za-z0-9][A-Za-z0-9_-]*$ ]] || { echo "Invalid APP_NAME" >&2; exit 1; }

APP_PATH="$PROJECT_ROOT/${APP_NAME}.app"

echo "==> Killing existing ${APP_NAME} instances"
# Do not terminate other same-named applications. Stop the exact running bundle manually if needed.
sleep 0.5

if [[ ! -d "$APP_PATH" ]]; then
    echo "ERROR: ${APP_NAME}.app not found at $APP_PATH"
    echo "Run ./Scripts/package_app.sh first to build the app"
    exit 1
fi

echo "==> Launching ${APP_NAME} from $APP_PATH"
open -n "$APP_PATH"

sleep 1
if pgrep -x "$APP_NAME" > /dev/null; then
    echo "OK: ${APP_NAME} is running."
else
    echo "ERROR: App exited immediately. Check crash logs in Console.app (User Reports)."
    exit 1
fi
