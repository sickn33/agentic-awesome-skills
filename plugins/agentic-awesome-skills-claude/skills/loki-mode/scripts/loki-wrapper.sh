#!/bin/bash
# Loki Mode Wrapper Script
# Provides true autonomy by auto-resuming on rate limits or interruptions
#
# How it works:
# 1. Launches Claude Code with Loki Mode prompt
# 2. Monitors the process - when Claude exits, checks exit code
# 3. On rate limit (exit code != 0), waits with exponential backoff
# 4. Restarts automatically, telling Claude to resume from checkpoint
# 5. Continues until successful completion or max retries exceeded
#
# Usage:
#   ./scripts/loki-wrapper.sh [PRD_PATH]
#   ./scripts/loki-wrapper.sh ./docs/requirements.md
#   ./scripts/loki-wrapper.sh  # Interactive mode

set -uo pipefail

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

    cat > "$STATE_FILE" << EOF
{
    "retryCount": $retry_count,
    "status": "$status",
    "lastExitCode": $last_exit_code,
    "lastRun": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "prdPath": "$PRD_PATH",
    "pid": $$
}
EOF
}

# Load wrapper state if resuming
load_state() {
    if [ -f "$STATE_FILE" ]; then
        if command -v python3 &> /dev/null; then
            RETRY_COUNT=$(python3 -c "import json; print(json.load(open('$STATE_FILE')).get('retryCount', 0))" 2>/dev/null || echo "0")
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
    local wait_time=$((BASE_WAIT * (2 ** retry)))

    # Add jitter (0-30 seconds)
    local jitter=$((RANDOM % 30))
    wait_time=$((wait_time + jitter))

    # Cap at max wait
    if [ $wait_time -gt $MAX_WAIT ]; then
        wait_time=$MAX_WAIT
    fi

    echo $wait_time
}

# Check if this looks like a rate limit error
is_rate_limit() {
    local exit_code="$1"

    # Exit code 1 with rate limit indicators in log
    if [ $exit_code -ne 0 ]; then
        # Check recent .loki logs for rate limit indicators
        if [ -d ".loki/logs" ]; then
            if grep -r -l "rate.limit\|429\|too.many.requests\|quota.exceeded" .loki/logs/*.log 2>/dev/null | head -1 | grep -q .; then
                return 0
            fi
        fi
        # Assume rate limit on non-zero exit (conservative approach)
        return 0
    fi
    return 1
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
            echo "Loki Mode - Resume from checkpoint. PRD at $PRD_PATH. This is retry #$retry after rate limit. Check .loki/state/ for current progress and continue from where we left off."
        else
            echo "Loki Mode - Resume from checkpoint. This is retry #$retry after rate limit. Check .loki/state/ for current progress and continue from where we left off."
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

    while [ $retry -lt $MAX_RETRIES ]; do
        local prompt=$(build_resume_prompt $retry)

        log_info "Attempt $((retry + 1))/$MAX_RETRIES"
        log_info "Prompt: $prompt"
        save_state $retry "running" 0

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
        claude --dangerously-skip-permissions -p "$prompt" 2>&1 | tee -a "$LOG_FILE"
        local exit_code=${PIPESTATUS[0]}
        set -e

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_info "Claude exited with code $exit_code after ${duration}s"
        save_state $retry "exited" $exit_code

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

        # Handle non-zero exit (likely rate limit)
        if is_rate_limit $exit_code; then
            local wait_time=$(calculate_wait $retry)
            log_warn "Rate limit detected. Waiting ${wait_time}s before retry..."

            # Show countdown
            local remaining=$wait_time
            while [ $remaining -gt 0 ]; do
                printf "\r${YELLOW}Resuming in ${remaining}s...${NC}  "
                sleep 10
                remaining=$((remaining - 10))
            done
            echo ""

            ((retry++))
        else
            # Non-rate-limit error
            log_error "Non-rate-limit error (exit code: $exit_code)"

            # Still retry, but with shorter wait
            local wait_time=$((BASE_WAIT / 2))
            log_info "Retrying in ${wait_time}s..."
            sleep $wait_time
            ((retry++))
        fi
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
