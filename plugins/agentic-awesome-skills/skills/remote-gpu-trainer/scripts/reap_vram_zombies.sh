#!/usr/bin/env bash
# reap_vram_zombies.sh — find (and optionally kill) PIDs holding VRAM that the
# nvidia-smi process list cannot see (see references/gotchas_universal.md U11).
#
# After a crashed DDP run or a killed container, a process can keep a CUDA context
# (and its VRAM) alive while NOT appearing in `nvidia-smi`'s process table — so a
# fresh job OOMs on an "empty" GPU. Such holders DO still have the /dev/nvidia*
# device files open, so fuser/lsof can find them when nvidia-smi cannot.
#
# Strategy:
#   1. enumerate every PID with /dev/nvidia* open       (fuser -v, lsof fallback)
#   2. subtract the PIDs nvidia-smi already accounts for (those are live, visible jobs)
#   3. of the remainder, flag any that is idle (~0% GPU util) and has lived past a timeout
#   4. DRY-RUN by default: print candidates only. --force is required to kill -9.
#
# Usage:
#   bash reap_vram_zombies.sh             # dry-run: list zombie candidates, kill nothing
#   bash reap_vram_zombies.sh --force     # actually kill -9 the flagged candidates
#
# A DRY-RUN exits 0 and never touches a process. Killing is destructive:
# it is gated behind an explicit --force so the orchestrator never auto-reaps.
# If the holder is inside another container, kill -9 from the host may not clear it —
# restart that container instead.
# NEVER an unquoted pipe inside a grep regex (it reads stdin and hangs forever).

set -u

# ---------------------------------------------------------------------------
# Tunable constants — documented, no magic numbers buried in logic.
# ---------------------------------------------------------------------------
FORCE=0                 # 0 = dry-run (default), 1 = actually kill. Set by --force.
MIN_AGE_SECS=120        # only reap a holder that has lived > 2 min. A genuinely new
                        # process may briefly hold a context while warming up; 2 min
                        # is well past CUDA-context init, so survivors are stragglers.
IDLE_UTIL_PCT=5         # treat per-process GPU util <= 5% as "idle". A real training
                        # job pegs util far higher; ~0% + held VRAM = a zombie, not work.

# ---------------------------------------------------------------------------
# Arg parse — only --force is recognized; anything else is a usage error.
# ---------------------------------------------------------------------------
for arg in "$@"; do
    case "$arg" in
        --force) FORCE=1 ;;
        -h|--help)
            echo "usage: bash reap_vram_zombies.sh [--force]" >&2
            echo "  (default is a dry-run; --force enables kill -9)" >&2
            exit 0
            ;;
        *)
            echo "unknown argument: $arg (only --force is supported)" >&2
            exit 64   # EX_USAGE
            ;;
    esac
done

if ! command -v nvidia-smi >/dev/null 2>&1; then
    echo "nvidia-smi not found — no NVIDIA driver on this box." >&2
    exit 1
fi

# ---------------------------------------------------------------------------
# Step 1 — enumerate PIDs holding /dev/nvidia* open.
# fuser prints PIDs (mode letters attached, e.g. "12345m"); strip non-digits.
# lsof is the fallback when fuser is absent. Expand /dev/nvidia* to only the real
# device nodes first: with no NVIDIA driver the glob matches nothing, and passing
# the literal "/dev/nvidia*" to fuser/lsof would otherwise error and mislead.
# ---------------------------------------------------------------------------
collect_dev_holders() {
    local pids="" dev
    local devs=()
    for dev in /dev/nvidia*; do [ -e "$dev" ] && devs+=("$dev"); done
    if [ "${#devs[@]}" -eq 0 ]; then
        echo "no /dev/nvidia* device nodes present — cannot enumerate device holders." >&2
        return 1
    fi
    if command -v fuser >/dev/null 2>&1; then
        # fuser writes the PID list to stdout, the verbose table to stderr.
        # 2>/dev/null drops the table; we keep only the bare PIDs.
        pids="$(fuser "${devs[@]}" 2>/dev/null || true)"
    elif command -v lsof >/dev/null 2>&1; then
        # lsof -t prints one PID per line for the listed device files.
        pids="$(lsof -t "${devs[@]}" 2>/dev/null || true)"
    else
        echo "neither fuser nor lsof is available — cannot enumerate device holders." >&2
        return 1
    fi
    # Normalize to whitespace-separated bare PIDs (drop fuser's mode letters).
    printf '%s\n' "$pids" | tr -cs '0-9' ' '
}

DEV_HOLDERS="$(collect_dev_holders)" || exit 1
DEV_HOLDERS="$(printf '%s\n' "$DEV_HOLDERS" | tr ' ' '\n' | grep -E '^[0-9]+$' || true)"

if [ -z "$DEV_HOLDERS" ]; then
    echo "RESULT: clean — no process is holding /dev/nvidia* open."
    exit 0
fi

# ---------------------------------------------------------------------------
# Step 2 — PIDs nvidia-smi already accounts for. These are visible, legitimate
# jobs; never reap them. (Empty when the zombie is the ONLY holder — the U11 case.)
# ---------------------------------------------------------------------------
VISIBLE_PIDS="$(nvidia-smi --query-compute-apps=pid --format=csv,noheader 2>/dev/null \
    | grep -E '^[0-9]+$' || true)"

# is_visible <pid> — true if nvidia-smi lists this PID as a compute app.
is_visible() {
    local pid="$1"
    printf '%s\n' "$VISIBLE_PIDS" | grep -qx "$pid"
}

# ---------------------------------------------------------------------------
# Step 3 — classify each remaining holder. A candidate is a holder that is
# (a) NOT in nvidia-smi's list, (b) older than MIN_AGE_SECS, (c) ~idle on the GPU.
# Process age comes from `ps -o etimes` (elapsed seconds, integer, portable).
# ---------------------------------------------------------------------------
CANDIDATES=""
echo "== reap_vram_zombies: scanning $(printf '%s' "$DEV_HOLDERS" | tr '\n' ' ')=="
for pid in $DEV_HOLDERS; do
    # Skip the kernel/init edge and any PID that vanished mid-scan.
    if [ ! -d "/proc/$pid" ]; then
        continue
    fi

    CMD="$(ps -o comm= -p "$pid" 2>/dev/null || true)"
    AGE="$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
    AGE="${AGE:-0}"

    if is_visible "$pid"; then
        echo "   pid $pid ($CMD): visible to nvidia-smi — live job, skip."
        continue
    fi
    if [ "$AGE" -lt "$MIN_AGE_SECS" ] 2>/dev/null; then
        echo "   pid $pid ($CMD): age ${AGE}s < ${MIN_AGE_SECS}s — too young, skip (may be warming up)."
        continue
    fi

    # This PID holds /dev/nvidia*, is invisible to nvidia-smi, and is old.
    # nvidia-smi cannot give us a per-process util for an unlisted PID, so by the
    # U11 definition (held VRAM + invisible) it is already idle on the GPU.
    echo "   pid $pid ($CMD): age ${AGE}s, holds VRAM, INVISIBLE to nvidia-smi -> ZOMBIE candidate."
    CANDIDATES="${CANDIDATES}${pid} "
done

CANDIDATES="$(printf '%s' "$CANDIDATES" | tr -s ' ' )"
CANDIDATES="${CANDIDATES# }"; CANDIDATES="${CANDIDATES% }"

# ---------------------------------------------------------------------------
# Step 4 — act. Dry-run prints and exits; --force kills -9.
# ---------------------------------------------------------------------------
echo "------------------------------------------------------------"
if [ -z "$CANDIDATES" ]; then
    echo "RESULT: clean — holders exist but none qualifies as a zombie (all visible/young)."
    exit 0
fi

echo "zombie VRAM holders: $CANDIDATES"
if [ "$FORCE" -ne 1 ]; then
    echo "RESULT: DRY-RUN — nothing killed. Re-run with --force to 'kill -9' the PIDs above."
    echo "        (If a holder lives inside another container, restart that container instead.)"
    exit 0
fi

# --force path: kill each candidate, report per-PID outcome.
RC=0
for pid in $CANDIDATES; do
    if kill -9 "$pid" 2>/dev/null; then
        echo "killed -9 $pid"
    else
        echo "FAILED to kill $pid (gone already, or owned by another container)." >&2
        RC=1
    fi
done
echo "RESULT: reaped zombie VRAM holders (--force)."
exit "$RC"
