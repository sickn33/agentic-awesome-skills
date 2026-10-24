#!/bin/bash
# Loki Mode Wrapper Script
# Legacy bounded retry wrapper; completion markers are local claims, not verification.
#
# How it works:
# 1. Launches Claude Code with Loki Mode prompt
# 2. Monitors the process - when Claude exits, checks exit code
# 3. Stops on errors; a nonzero exit does not establish a rate limit
# 4. Restarts automatically, telling Claude to resume from checkpoint
# 5. Continues until successful completion or max retries exceeded
#
# Usage:
#   bash scripts/loki-wrapper.sh [PRD_PATH]
#   bash scripts/loki-wrapper.sh ./docs/requirements.md
#   bash scripts/loki-wrapper.sh  # Interactive mode

set -uo pipefail
umask 077

# Configuration
MAX_RETRIES=${LOKI_MAX_RETRIES:-50}           # Maximum retry attempts
BASE_WAIT=${LOKI_BASE_WAIT:-60}               # Base wait time in seconds
MAX_WAIT=${LOKI_MAX_WAIT:-3600}               # Max wait time (1 hour)
LOG_FILE=${LOKI_LOG_FILE:-.loki/wrapper.log}  # Log file location
STATE_FILE=${LOKI_STATE_FILE:-.loki/wrapper-state.json}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "[$timestamp] [$level] $msg" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$*"; }
log_warn() { log "${YELLOW}WARN${NC}" "$*"; }
log_error() { log "${RED}ERROR${NC}" "$*"; }
log_success() { log "${GREEN}SUCCESS${NC}" "$*"; }

# Bound arithmetic inputs before creating state or launching a model.
for setting in MAX_RETRIES BASE_WAIT MAX_WAIT; do
    value=${!setting}
    if [[ ! "$value" =~ ^[0-9]{1,6}$ ]] || (( 10#$value < 1 || 10#$value > 100000 )); then
        echo "Invalid $setting: expected integer 1..100000" >&2
        exit 2
    fi
    printf -v "$setting" '%d' "$((10#$value))"
done
command -v python3 >/dev/null || { echo "Python 3 required" >&2; exit 2; }
RETRY_COUNT=0
mkdir -p "$(dirname "$LOG_FILE")" "$(dirname "$STATE_FILE")"

# Ensure .loki directory exists
mkdir -p .loki

# Parse arguments
PRD_PATH="${1:-}"
INITIAL_PROMPT=""

if [ -n "$PRD_PATH" ]; then
    if [ -f "$PRD_PATH" ]; then
        INITIAL_PROMPT="Loki Mode with PRD at $PRD_PATH"
    else
        log_error "PRD file not found: $PRD_PATH"
        exit 1
    fi
else
    INITIAL_PROMPT="Loki Mode"
fi

# Save wrapper state
save_state() {
    local retry_count="$1"
    local status="$2"
    local last_exit_code="$3"

    python3 - "$STATE_FILE" "$retry_count" "$status" "$last_exit_code" "$PRD_PATH" "$$" <<'PYWRAPPER'
import datetime, json, os, pathlib, sys, tempfile
path, retry, status, code, prd, pid = sys.argv[1:]
parent = pathlib.Path(path).parent
parent.mkdir(parents=True, exist_ok=True)
fd, temporary = tempfile.mkstemp(dir=parent)
try:
    with os.fdopen(fd, 'w', encoding='utf-8') as stream:
        json.dump(dict(retryCount=int(retry), status=status, lastExitCode=int(code),
                       lastRun=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                       prdPath=prd, pid=int(pid)), stream)
    os.replace(temporary, path)
finally:
    if os.path.exists(temporary): os.unlink(temporary)
PYWRAPPER
}

# Load wrapper state if resuming
load_state() {
    if [ -f "$STATE_FILE" ]; then
        if command -v python3 &> /dev/null; then
            RETRY_COUNT=$(python3 - "$STATE_FILE" <<'PYWRAPPER'
import json, sys
try:
    with open(sys.argv[1], encoding='utf-8') as stream: state = json.load(stream)
    retry = state.get('retryCount', 0) if isinstance(state, dict) else 0
    print(retry if type(retry) is int and 0 <= retry <= 100000 else 0)
except (OSError, ValueError, TypeError): print(0)
PYWRAPPER
)
        else
            RETRY_COUNT=0
        fi
    else
        RETRY_COUNT=0
    fi
}

# Calculate wait time with exponential backoff and jitter
calculate_wait() {
    local retry="$1"
    local wait_time=$BASE_WAIT
    local step=0
    while [ "$step" -lt "$retry" ] && [ "$wait_time" -lt "$MAX_WAIT" ]; do
        if [ "$wait_time" -gt "$((MAX_WAIT / 2))" ]; then
            wait_time=$MAX_WAIT
        else
            wait_time=$((wait_time * 2))
        fi
        step=$((step + 1))
    done

    # Add jitter (0-30 seconds)
    local jitter=$((RANDOM % 30))
    wait_time=$((wait_time + jitter))

    # Cap at max wait
    if [ $wait_time -gt $MAX_WAIT ]; then
        wait_time=$MAX_WAIT
    fi

    echo $wait_time
}

# Check if Loki Mode completed successfully
is_completed() {
    # Check for completion markers
    if [ -f ".loki/state/orchestrator.json" ]; then
        if command -v python3 &> /dev/null; then
            local phase=$(python3 -c "import json; print(json.load(open('.loki/state/orchestrator.json')).get('currentPhase', ''))" 2>/dev/null || echo "")
            if [ "$phase" = "COMPLETED" ] || [ "$phase" = "complete" ]; then
                return 0
            fi
        fi
    fi

    # Check for success file
    if [ -f ".loki/COMPLETED" ]; then
        return 0
    fi

    return 1
}

# Build the resume prompt
build_resume_prompt() {
    local retry="$1"

    if [ $retry -eq 0 ]; then
        echo "$INITIAL_PROMPT"
    else
        # Resume from checkpoint
        if [ -n "$PRD_PATH" ]; then
            echo "Loki Mode - Resume from checkpoint. PRD at $PRD_PATH. This is retry #$retry after the previous session. Check .loki/state/ for current progress and continue from where we left off."
        else
            echo "Loki Mode - Resume from checkpoint. This is retry #$retry after the previous session. Check .loki/state/ for current progress and continue from where we left off."
        fi
    fi
}

# Main execution loop
main() {
    log_info "=========================================="
    log_info "Loki Mode Autonomous Wrapper"
    log_info "=========================================="
    log_info "PRD: ${PRD_PATH:-Interactive}"
    log_info "Max retries: $MAX_RETRIES"
    log_info "Base wait: ${BASE_WAIT}s"
    log_info ""

    load_state
    local retry=$RETRY_COUNT
    # Completion markers must belong to this invocation, not an older run.
    if is_completed; then
        log_error "Existing completion markers require manual review before starting this legacy wrapper"
        return 2
    fi

    while [ $retry -lt $MAX_RETRIES ]; do
        local prompt=$(build_resume_prompt $retry)

        log_info "Attempt $((retry + 1))/$MAX_RETRIES"
        log_info "Prompt: $prompt"
        RETRY_COUNT=$retry
        save_state $retry "running" 0 || return 1

        # Launch Claude Code
        # The process exits when:
        # 1. User types /exit or Ctrl+C (exit 0)
        # 2. Rate limit hit (exit 1 or other non-zero)
        # 3. Crash or error (non-zero exit)
        # 4. Session completes naturally (exit 0)

        local start_time=$(date +%s)

        # Run Claude Code with the prompt
        # Using -p for non-interactive prompt mode
        set +e
        claude -p "$prompt" 2>&1 | tee -a "$LOG_FILE"
        local pipeline_status=("${PIPESTATUS[@]}")
        local exit_code=${pipeline_status[0]}
        if [ "${pipeline_status[1]}" -ne 0 ]; then exit_code=${pipeline_status[1]}; fi
        set -e

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_info "Claude exited with code $exit_code after ${duration}s"
        save_state $retry "exited" $exit_code || return 1

        # Check for successful completion
        if [ $exit_code -eq 0 ]; then
            if is_completed; then
                log_success "Loki Mode completed successfully!"
                save_state $retry "completed" 0
                exit 0
            else
                log_info "Claude exited cleanly but work may not be complete"
                log_info "Checking if we should continue..."

                # If session was short, might be intentional exit
                if [ $duration -lt 30 ]; then
                    log_warn "Session was very short (${duration}s). User may have exited intentionally."
                    log_info "Waiting 10 seconds before checking again..."
                    sleep 10

                    # Re-check completion
                    if is_completed; then
                        log_success "Loki Mode completed!"
                        exit 0
                    fi
                fi
            fi
        fi

        if [ "$exit_code" -ne 0 ]; then
            log_error "Claude failed; inspect this invocation before resuming (exit $exit_code)"
            return "$exit_code"
        fi
        retry=$((retry + 1))
        sleep "$BASE_WAIT"
    done

    log_error "Max retries ($MAX_RETRIES) exceeded. Giving up."
    save_state $retry "failed" 1
    exit 1
}

# Trap signals for clean shutdown
cleanup() {
    log_warn "Received interrupt signal. Saving state..."
    save_state $RETRY_COUNT "interrupted" 130
    exit 130
}
trap cleanup INT TERM

# Check for claude command
if ! command -v claude &> /dev/null; then
    log_error "Claude Code CLI not found. Please install it first."
    log_info "Visit: https://claude.ai/code"
    exit 1
fi

# Run main
main "$@"
