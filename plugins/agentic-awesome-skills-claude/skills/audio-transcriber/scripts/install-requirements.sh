#!/usr/bin/env bash
# Explicit dependency setup only; never modify system Python or install system packages.
set -euo pipefail
if [[ -z "${VIRTUAL_ENV:-}" ]]; then
  echo 'Activate a dedicated Python virtual environment first.' >&2
  exit 1
fi
python3 -m pip install faster-whisper tqdm rich
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo 'ffmpeg may be needed for some formats/backends. Install it separately through your approved system package workflow.'
fi
echo 'Dependencies installed. First model use may download weights; no model or CLI is run by this installer.'
