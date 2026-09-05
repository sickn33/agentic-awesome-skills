#!/usr/bin/env bash
# Stateless reminder using a caller-supplied session count. Never compacts or saves.
set -euo pipefail
if [ "$#" -gt 2 ]; then
  echo 'Usage: suggest-compact.sh [tool-count [threshold]]' >&2
  exit 2
fi
count="${1:-${COMPACT_TOOL_COUNT:-}}"
[ -n "$count" ] || exit 0
threshold="${2:-${COMPACT_THRESHOLD:-50}}"
if [[ ! "$count" =~ ^[0-9]{1,6}$ ]] || [[ ! "$threshold" =~ ^[0-9]{1,6}$ ]]; then
  echo '[StrategicCompact] Count and threshold must be bounded decimal integers.' >&2
  exit 2
fi
count=$((10#$count))
threshold=$((10#$threshold))
if [ "$threshold" -lt 1 ]; then
  echo '[StrategicCompact] Threshold must be positive.' >&2
  exit 2
fi
if [ "$count" -ge "$threshold" ] && [ $(((count - threshold) % 25)) -eq 0 ]; then
  echo "[StrategicCompact] $count tool calls; prepare a verified checkpoint if this phase has finished. Nothing compacted or saved." >&2
fi
