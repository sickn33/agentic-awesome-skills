#!/usr/bin/env bash
# Read-only message-count reminder. No extraction, model call, or persistence.
set -euo pipefail
if [ "$#" -gt 1 ]; then
  echo 'Usage: evaluate-session.sh [session.jsonl]' >&2
  exit 2
fi
transcript_path="${1:-${CLAUDE_TRANSCRIPT_PATH:-}}"
[ -n "$transcript_path" ] || exit 0
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
python3 - "$transcript_path" "$script_dir/config.json" <<'PY'
import json
import os
import stat
import sys


def inspect_session():
    with open(sys.argv[2], "rb") as config_file:
        config_bytes = config_file.read(16385)
    if len(config_bytes) > 16384:
        raise ValueError("Oversize configuration")
    threshold = json.loads(config_bytes)["min_session_length"]
    if type(threshold) is not int or not 1 <= threshold <= 100000:
        raise ValueError("Invalid threshold")
    descriptor = os.open(sys.argv[1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    with os.fdopen(descriptor, "rb") as transcript:
        info = os.fstat(transcript.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_size > 16 * 1024 * 1024:
            raise ValueError("Unsupported transcript")
        count = 0
        consumed = 0
        while True:
            line = transcript.readline(1024 * 1024 + 1)
            if not line:
                break
            consumed += len(line)
            if len(line) > 1024 * 1024 or consumed > 16 * 1024 * 1024:
                raise ValueError("Oversize transcript")
            if not line.strip():
                continue
            message = json.loads(line)
            if not isinstance(message, dict):
                raise ValueError("Expected message object")
            count += message.get("type") == "user"
    if count < threshold:
        print(f"[ContinuousLearning] {count} user messages; below review threshold {threshold}.", file=sys.stderr)
    else:
        print(f"[ContinuousLearning] {count} user messages; consider reviewing a verified reusable lesson. Nothing extracted or saved.", file=sys.stderr)


try:
    inspect_session()
except (OSError, ValueError, KeyError, TypeError, AttributeError, RecursionError):
    print("[ContinuousLearning] Cannot inspect this transcript or configuration. Nothing extracted or saved.", file=sys.stderr)
    sys.exit(2)
PY
