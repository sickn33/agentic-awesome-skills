#!/usr/bin/env bash
# gpu_health.sh — portable pre-flight GPU-health probe for a rented box (see references/gotchas_universal.md U21-U23).
#
# Runs three independent checks and prints ONE PASS / WARN / FAIL summary:
#   1. live sampling     — nvidia-smi dmon over a few seconds (power/util/clocks/mem/temp)
#   2. Xid scan          — dmesg for hardware-failure Xid codes; Xid 48 / 79 are HARD failures
#   3. throttle scan     — SM clock crushed below base while hot, or nvidia-smi throttle reasons
#
# Exit codes (so a launch wrapper can react before it pays for GPU-hours):
#   0  PASS or WARN  — safe to launch (WARN = degraded but usable; see stderr notes)
#   2  HARD FAIL     — dead/throttling GPU; re-rent a DIFFERENT box, do not launch here
#
# Usage:  bash gpu_health.sh [GPU_INDEX]      # default 0
# On a rental there is no "reseat the card" — a HARD fail means stop + re-rent (see references/gotchas_universal.md U21-U23).
# NEVER an unquoted pipe inside a grep regex (it reads stdin and hangs).

set -u

# ---------------------------------------------------------------------------
# Tunable constants — every magic number is documented here, no voodoo.
# ---------------------------------------------------------------------------
GPU="${1:-0}"            # which GPU to probe (nvidia-smi index)
SAMPLE_COUNT=5          # dmon sample COUNT (-c N = N one-second samples); 5 samples ~= 5 s,
                        # enough to catch a clock dip without burning metered time on a no-op probe.
TEMP_HOT_C=83           # H100/A100-class throttle onset ~83 °C (U23). At/above this the
                        # board down-clocks itself; sustained >83 °C while SM clock is low
                        # is the thermal-throttle signature.
SM_CLOCK_FLOOR_FRAC=70  # treat SM clock < 70% of the board's *base* clock as "crushed".
                        # 70% chosen as a conservative gap: boost variance is normal,
                        # but a 30%+ drop below BASE under load is throttling, not jitter.

# ---------------------------------------------------------------------------
# Result accumulators. status escalates PASS -> WARN -> FAIL, never downgrades.
# ---------------------------------------------------------------------------
STATUS="PASS"
NOTES=""                # human-readable findings, one per line, emitted to stderr

# escalate <LEVEL> <message> — raise overall status and record the reason.
escalate() {
    local level="$1"; shift
    NOTES="${NOTES}  [${level}] $*"$'\n'
    # FAIL beats WARN beats PASS; only ever climb the ladder.
    if [ "$level" = "FAIL" ]; then
        STATUS="FAIL"
    elif [ "$level" = "WARN" ] && [ "$STATUS" != "FAIL" ]; then
        STATUS="WARN"
    fi
}

# ---------------------------------------------------------------------------
# Pre-flight: nvidia-smi must exist, and the requested GPU index must resolve.
# ---------------------------------------------------------------------------
if ! command -v nvidia-smi >/dev/null 2>&1; then
    echo "FAIL: nvidia-smi not found — no NVIDIA driver on this box." >&2
    exit 2
fi
if ! nvidia-smi -i "$GPU" -L >/dev/null 2>&1; then
    echo "FAIL: GPU index $GPU does not exist (nvidia-smi -L)." >&2
    exit 2
fi

GPU_NAME="$(nvidia-smi -i "$GPU" --query-gpu=name --format=csv,noheader 2>/dev/null)"
echo "== gpu_health: GPU $GPU ($GPU_NAME), sampling ${SAMPLE_COUNT}s =="

# ---------------------------------------------------------------------------
# CHECK 1 — live sampling with nvidia-smi dmon.
#   -s pucvmet selects: p=power, u=util(sm/mem), c=clocks(sm/mem), v=power/thermal
#   violations, m=mem usage, e=ECC errors, t=temp. -c N takes N one-second samples.
# We capture the raw table; later checks parse the peak temp / current SM clock out
# of the per-GPU query API (more robust than column-slicing dmon across driver versions).
# ---------------------------------------------------------------------------
DMON_OUT="$(nvidia-smi dmon -i "$GPU" -s pucvmet -c "$SAMPLE_COUNT" 2>/dev/null || true)"
if [ -n "$DMON_OUT" ]; then
    echo "$DMON_OUT"
else
    escalate WARN "dmon produced no samples (old driver?); falling back to point queries."
fi

# Point-in-time query: temperature, current SM clock, and BASE-equivalent reference.
# query-gpu fields are stable across drivers, unlike dmon column order.
read -r TEMP_C SM_CUR SM_MAX <<EOF
$(nvidia-smi -i "$GPU" \
    --query-gpu=temperature.gpu,clocks.current.sm,clocks.max.sm \
    --format=csv,noheader,nounits 2>/dev/null | tr ',' ' ')
EOF
TEMP_C="${TEMP_C:-0}"
SM_CUR="${SM_CUR:-0}"
SM_MAX="${SM_MAX:-0}"
echo "   temp=${TEMP_C}C  sm_clock=${SM_CUR}MHz  sm_max=${SM_MAX}MHz"

# ---------------------------------------------------------------------------
# CHECK 2 — Xid hardware-error scan (see references/gotchas_universal.md U21-U23).
#   Xid is the canonical NVIDIA hardware-failure channel in the kernel ring buffer.
#   Xid 48 = double-bit (uncorrectable) ECC  -> the GPU is effectively DEAD.
#   Xid 79 = "GPU has fallen off the bus"     -> PCIe link lost; board is gone.
#   Other Xids (e.g. 13, 31, 43, 45) are usually app faults, not hardware death -> WARN.
# dmesg may need root; if it is unreadable we cannot clear the GPU, so WARN (not silent PASS).
# IMPORTANT: grep alternation is fully quoted — an unquoted '|' would fork a pipe that
# reads stdin and hangs the probe forever.
# ---------------------------------------------------------------------------
if DMESG_OUT="$(dmesg 2>/dev/null)" && [ -n "$DMESG_OUT" ]; then
    # Any Xid line at all is worth surfacing.
    XID_LINES="$(printf '%s\n' "$DMESG_OUT" | grep -iE 'NVRM: Xid' || true)"
    if [ -n "$XID_LINES" ]; then
        # HARD-failure Xid codes. Match "Xid (...): 48," / "Xid 79" robustly by code.
        HARD_XID="$(printf '%s\n' "$XID_LINES" | grep -iE 'Xid[^0-9]*[0-9:() ]*[^0-9](48|79)([,. ]|$)' || true)"
        if [ -n "$HARD_XID" ]; then
            escalate FAIL "Xid 48/79 detected (dead GPU / off-the-bus): $(printf '%s' "$HARD_XID" | tail -n1)"
        else
            escalate WARN "Non-fatal Xid present (likely app fault): $(printf '%s' "$XID_LINES" | tail -n1)"
        fi
    fi
else
    escalate WARN "dmesg unreadable (need root?) — cannot rule out an Xid hardware fault. — exit code is non-authoritative; have a human confirm GPU health when dmesg is unreadable."
fi

# ---------------------------------------------------------------------------
# CHECK 3 — thermal / power throttling (see references/gotchas_universal.md U21-U23).
# Two independent signatures, either one trips a HARD fail:
#   (a) the kernel-reported clocks-throttle reasons via nvidia-smi -q -d PERFORMANCE
#       (HW thermal slowdown / HW power brake / SW thermal slowdown active = throttling now);
#   (b) heuristic: SM clock crushed below SM_CLOCK_FLOOR_FRAC% of sm_max WHILE temp >= 83 °C
#       — the classic "same code slower than yesterday" silent 25–40% loss.
# On a shared rental the cooling cannot be fixed, so confirmed throttling => re-rent.
# ---------------------------------------------------------------------------
PERF_OUT="$(nvidia-smi -i "$GPU" -q -d PERFORMANCE 2>/dev/null || true)"
# Look ONLY for reasons reported "Active" — the static list is always present.
# Quoted alternation again: never an unquoted pipe in the regex.
THROTTLE_ACTIVE="$(printf '%s\n' "$PERF_OUT" \
    | grep -iE 'slowdown|power brake|hw thermal|sw thermal' \
    | grep -i 'active' \
    | grep -iv ': not active' || true)"
if [ -n "$THROTTLE_ACTIVE" ]; then
    escalate FAIL "nvidia-smi reports active throttling: $(printf '%s' "$THROTTLE_ACTIVE" | tr -s ' ' | tail -n1)"
fi

# Heuristic clock-vs-temp check — only meaningful when we read real numbers.
# Integer math only (clocks are whole MHz); guards against a zero sm_max.
if [ "$SM_MAX" -gt 0 ] 2>/dev/null; then
    SM_FLOOR=$(( SM_MAX * SM_CLOCK_FLOOR_FRAC / 100 ))   # 70% of max = "crushed" threshold
    if [ "$SM_CUR" -lt "$SM_FLOOR" ] && [ "$TEMP_C" -ge "$TEMP_HOT_C" ] 2>/dev/null; then
        escalate FAIL "thermal throttle: sm_clock ${SM_CUR}MHz < ${SM_FLOOR}MHz (70% of max) while temp ${TEMP_C}C >= ${TEMP_HOT_C}C"
    elif [ "$TEMP_C" -ge "$TEMP_HOT_C" ] 2>/dev/null; then
        # Hot but clock still high: borderline, warn so the caller watches it.
        escalate WARN "running hot (${TEMP_C}C >= ${TEMP_HOT_C}C) but SM clock not yet crushed — watch for throttling."
    fi
fi

# ---------------------------------------------------------------------------
# Summary + exit. HARD fail => exit 2 so a wrapper aborts the launch.
# ---------------------------------------------------------------------------
echo "------------------------------------------------------------"
if [ -n "$NOTES" ]; then
    printf 'findings:\n%s' "$NOTES" >&2
fi
case "$STATUS" in
    FAIL)
        echo "RESULT: FAIL — GPU $GPU is unhealthy. Stop this instance and re-rent a different box."
        exit 2
        ;;
    WARN)
        echo "RESULT: WARN — GPU $GPU usable but degraded; review findings above before a long run."
        exit 0
        ;;
    *)
        echo "RESULT: PASS — GPU $GPU healthy (no Xid, no throttling, clocks nominal)."
        exit 0
        ;;
esac
