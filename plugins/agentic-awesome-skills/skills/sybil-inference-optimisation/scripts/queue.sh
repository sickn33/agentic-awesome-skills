#!/usr/bin/env bash
# Serialized GPU queue: runs bench.py on each config in order, one GPU job at a time across all callers.
#   queue.sh ctl-a cand ctl-b            # interleave controls around each candidate
#   BENCH_FLAGS="--long 131072" queue.sh cand
# Detach long queues so they survive agent/terminal restarts:
#   setsid nohup bash queue.sh ctl-a cand ctl-b > queue.log 2>&1 < /dev/null & disown
# Run from your experiment directory (the one holding configs/ and ledger.jsonl).
set -euo pipefail

LOCK=${QUEUE_LOCK:-"${TMPDIR:-/tmp}/aas-inference-queue-$(id -u)/gpu.lock"}
if [[ -z "${QUEUE_LOCK:-}" ]]; then
  (umask 077 && mkdir -p "$(dirname "$LOCK")") || exit 1
  [[ -O "$(dirname "$LOCK")" && ! -L "$(dirname "$LOCK")" ]] || exit 1
fi
exec 9>>"$LOCK"
flock 9
if [[ $# -eq 0 ]]; then
  echo "Provide one or more configuration names." >&2
  exit 2
fi
for n in "$@"; do
  if [[ ! "$n" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    echo "Invalid configuration name: $n" >&2
    exit 2
  fi
  if ! python3 "${BENCH:-$(dirname "$0")/bench.py}" run "configs/$n.json" ${BENCH_FLAGS:-} > "runs-$n.log" 2>&1; then
    echo "Benchmark $n failed. See runs-$n.log." >&2
    exit 1
  fi
  echo "done $n: $(tail -c 300 "runs-$n.log" | tr '\n' ' ' | cut -c1-200)"
done
echo QUEUE_DONE "$@"
