#!/usr/bin/env bash
# Aggregate completed ablation results from the per-instance data disk to durable storage.
# Idempotent (cp -f overwrites, so a retry result overwrites an epoch-1-failure snapshot).
#
# Override DATA_DIR / DURABLE_DIR per your platform profile (profiles/<platform>.md §8). Defaults = AutoDL.
#
# Usage: bash aggregate_to_fs.sh   (run on each instance after its queue completes)
#
# This is a SAFETY NET — run_one.sh already auto-syncs per ablation. Use it when an auto-sync failed,
# an older run_one lacked it, or as a final pass before releasing an instance.
set -u

DATA_DIR="${DATA_DIR:-/root/autodl-tmp}"
DURABLE_DIR="${DURABLE_DIR:-/root/autodl-fs}"

FS_BASE="$DURABLE_DIR/final_ckpts"
LOCAL_CKPT_BASE="$DATA_DIR/checkpoints"
LOCAL_LOG_BASE="$DATA_DIR/runs/logs"

mkdir -p "$FS_BASE"

count=0
fail=0
for d in "$LOCAL_CKPT_BASE"/*/; do
    [ -d "$d" ] || continue
    name=$(basename "$d")

    # Skip an ablation that never reached epoch 1 (no metrics written).
    if [ ! -f "$d/best_metrics.json" ]; then
        echo "SKIP $name (no best_metrics.json)"
        continue
    fi

    FS_DIR="$FS_BASE/$name"
    # GATE on the copy result — never echo OK unconditionally. A full / inode-exhausted durable FS
    # makes mkdir/cp fail silently; an unconditional "OK" would lie (references/gotchas_universal.md,
    # silent-sync; principle #3). Verify best.pth landed before counting it.
    if mkdir -p "$FS_DIR" && cp -f "$d/best.pth" "$FS_DIR/" && [ -f "$FS_DIR/best.pth" ]; then
        cp -f "$d/best_metrics.json" "$FS_DIR/" 2>/dev/null || true
        cp -rf "$d/protocol" "$FS_DIR/" 2>/dev/null || true
        cp -f "$LOCAL_LOG_BASE/$name.log" "$FS_DIR/" 2>/dev/null || true
        echo "OK $name"
        count=$((count+1))
    else
        echo "!! FAIL $name — durable copy did not land (check 'df -i $DURABLE_DIR'). Data-disk copy is source-of-truth."
        fail=$((fail+1))
    fi
done

echo
echo "=== Aggregated $count ablations to $FS_BASE ($fail failed) ==="
echo "Total dirs on durable FS now: $(find "$FS_BASE" -mindepth 1 -maxdepth 1 -type d | wc -l)"
df -h "$FS_BASE" | tail -1
df -i "$FS_BASE" | tail -1
[ "$fail" -eq 0 ] || exit 1
