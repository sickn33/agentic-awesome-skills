#!/usr/bin/env bash
# Local transcript-only example using the canonical bundled implementation.
set -euo pipefail
if [[ $# -ne 1 ]]; then
  echo 'Usage: bash basic-transcription.sh /path/to/audio-file' >&2
  exit 2
fi
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/../scripts/transcribe.py" "$1" --model "${MODEL:-base}" --output-dir . --llm none
