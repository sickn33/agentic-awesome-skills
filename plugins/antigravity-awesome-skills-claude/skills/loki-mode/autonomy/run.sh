#!/bin/bash
#===============================================================================
# Loki Mode - Autonomous Runner
# Single script that handles prerequisites, setup, and autonomous execution
#
# Usage:
#   ./autonomy/run.sh [PRD_PATH]
#   ./autonomy/run.sh ./docs/requirements.md
#   ./autonomy/run.sh                          # Interactive mode
#
# Environment Variables:
#   LOKI_MAX_RETRIES    - Max retry attempts (default: 50)
#   LOKI_BASE_WAIT      - Base wait time in seconds (default: 60)
#   LOKI_MAX_WAIT       - Max wait time in seconds (default: 3600)
#   LOKI_SKIP_PREREQS   - Skip prerequisite checks (default: false)
#   LOKI_DASHBOARD      - Enable web dashboard (default: true)
#   LOKI_DASHBOARD_PORT - Dashboard port (default: 57374)
#
# Resource Monitoring (prevents system overload):
#   LOKI_RESOURCE_CHECK_INTERVAL - Check resources every N seconds (default: 300 = 5min)
#   LOKI_RESOURCE_CPU_THRESHOLD  - CPU % threshold to warn (default: 80)
#   LOKI_RESOURCE_MEM_THRESHOLD  - Memory % threshold to warn (default: 80)
#
# Security & Autonomy Controls (Enterprise):
#   LOKI_STAGED_AUTONOMY    - Require approval before execution (default: false)
#   LOKI_AUDIT_LOG          - Enable audit logging (default: false)
#   LOKI_MAX_PARALLEL_AGENTS - Limit concurrent agent spawning (default: 10)
#   LOKI_SANDBOX_MODE       - Run in sandboxed container (default: false, requires Docker)
#   LOKI_ALLOWED_PATHS      - Comma-separated paths agents can modify (default: all)
#   LOKI_BLOCKED_COMMANDS   - Comma-separated blocked shell commands (default: rm -rf /)
#
# SDLC Phase Controls (all enabled by default, set to 'false' to skip):
#   LOKI_PHASE_UNIT_TESTS      - Run unit tests (default: true)
#   LOKI_PHASE_API_TESTS       - Functional API testing (default: true)
#   LOKI_PHASE_E2E_TESTS       - E2E/UI testing with Playwright (default: true)
#   LOKI_PHASE_SECURITY        - Security scanning OWASP/auth (default: true)
#   LOKI_PHASE_INTEGRATION     - Integration tests SAML/OIDC/SSO (default: true)
#   LOKI_PHASE_CODE_REVIEW     - 3-reviewer parallel code review (default: true)
#   LOKI_PHASE_WEB_RESEARCH    - Competitor/feature gap research (default: true)
#   LOKI_PHASE_PERFORMANCE     - Load/performance testing (default: true)
#   LOKI_PHASE_ACCESSIBILITY   - WCAG compliance testing (default: true)
#   LOKI_PHASE_REGRESSION      - Regression testing (default: true)
#   LOKI_PHASE_UAT             - UAT simulation (default: true)
#
# Autonomous Loop Controls (Ralph Wiggum Mode):
#   LOKI_COMPLETION_PROMISE    - EXPLICIT stop condition text (default: none - runs forever)
#                                Example: "ALL TESTS PASSING 100%"
#                                Only stops when Claude outputs this EXACT text
#   LOKI_MAX_ITERATIONS        - Max loop iterations before exit (default: 1000)
#   LOKI_PERPETUAL_MODE        - Ignore ALL completion signals (default: false)
#                                Set to 'true' for truly infinite operation
#===============================================================================

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

#===============================================================================
# Self-Copy Protection
# Bash reads scripts incrementally, so editing a running script corrupts execution.
# Solution: Copy ourselves to /tmp and run from there. The original can be safely edited.
#===============================================================================
if [[ -z "${LOKI_RUNNING_FROM_TEMP:-}" ]]; then
    TEMP_SCRIPT="/tmp/loki-run-$$.sh"
    cp "${BASH_SOURCE[0]}" "$TEMP_SCRIPT"
    chmod +x "$TEMP_SCRIPT"
    export LOKI_RUNNING_FROM_TEMP=1
    export LOKI_ORIGINAL_SCRIPT_DIR="$SCRIPT_DIR"
    export LOKI_ORIGINAL_PROJECT_DIR="$PROJECT_DIR"
    exec "$TEMP_SCRIPT" "$@"
fi

# Restore original paths when running from temp
SCRIPT_DIR="${LOKI_ORIGINAL_SCRIPT_DIR:-$SCRIPT_DIR}"
PROJECT_DIR="${LOKI_ORIGINAL_PROJECT_DIR:-$PROJECT_DIR}"

# Clean up temp script on exit
trap 'rm -f "${BASH_SOURCE[0]}" 2>/dev/null' EXIT

# Configuration
MAX_RETRIES=${LOKI_MAX_RETRIES:-50}
BASE_WAIT=${LOKI_BASE_WAIT:-60}
MAX_WAIT=${LOKI_MAX_WAIT:-3600}
SKIP_PREREQS=${LOKI_SKIP_PREREQS:-false}
ENABLE_DASHBOARD=${LOKI_DASHBOARD:-true}
DASHBOARD_PORT=${LOKI_DASHBOARD_PORT:-57374}
RESOURCE_CHECK_INTERVAL=${LOKI_RESOURCE_CHECK_INTERVAL:-300}  # Check every 5 minutes
RESOURCE_CPU_THRESHOLD=${LOKI_RESOURCE_CPU_THRESHOLD:-80}     # CPU % threshold
RESOURCE_MEM_THRESHOLD=${LOKI_RESOURCE_MEM_THRESHOLD:-80}     # Memory % threshold

# Security & Autonomy Controls
STAGED_AUTONOMY=${LOKI_STAGED_AUTONOMY:-false}           # Require plan approval
AUDIT_LOG_ENABLED=${LOKI_AUDIT_LOG:-false}               # Enable audit logging
MAX_PARALLEL_AGENTS=${LOKI_MAX_PARALLEL_AGENTS:-10}      # Limit concurrent agents
SANDBOX_MODE=${LOKI_SANDBOX_MODE:-false}                 # Docker sandbox mode
ALLOWED_PATHS=${LOKI_ALLOWED_PATHS:-""}                  # Empty = all paths allowed
BLOCKED_COMMANDS=${LOKI_BLOCKED_COMMANDS:-"rm -rf /,dd if=,mkfs,:(){ :|:& };:"}

STATUS_MONITOR_PID=""
DASHBOARD_PID=""
RESOURCE_MONITOR_PID=""

# SDLC Phase Controls (all enabled by default)
PHASE_UNIT_TESTS=${LOKI_PHASE_UNIT_TESTS:-true}
PHASE_API_TESTS=${LOKI_PHASE_API_TESTS:-true}
PHASE_E2E_TESTS=${LOKI_PHASE_E2E_TESTS:-true}
PHASE_SECURITY=${LOKI_PHASE_SECURITY:-true}
PHASE_INTEGRATION=${LOKI_PHASE_INTEGRATION:-true}
PHASE_CODE_REVIEW=${LOKI_PHASE_CODE_REVIEW:-true}
PHASE_WEB_RESEARCH=${LOKI_PHASE_WEB_RESEARCH:-true}
PHASE_PERFORMANCE=${LOKI_PHASE_PERFORMANCE:-true}
PHASE_ACCESSIBILITY=${LOKI_PHASE_ACCESSIBILITY:-true}
PHASE_REGRESSION=${LOKI_PHASE_REGRESSION:-true}
PHASE_UAT=${LOKI_PHASE_UAT:-true}

# Autonomous Loop Controls (Ralph Wiggum Mode)
# Default: No auto-completion - runs until max iterations or explicit promise
COMPLETION_PROMISE=${LOKI_COMPLETION_PROMISE:-""}
MAX_ITERATIONS=${LOKI_MAX_ITERATIONS:-1000}
ITERATION_COUNT=0
# Perpetual mode: never stop unless max iterations (ignores all completion signals)
PERPETUAL_MODE=${LOKI_PERPETUAL_MODE:-false}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

#===============================================================================
# Logging Functions
#===============================================================================

log_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} ${BOLD}$1${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
}

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_warning() { log_warn "$@"; }  # Alias for backwards compatibility
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $*"; }

#===============================================================================
# Prerequisites Check
#===============================================================================

check_prerequisites() {
    log_header "Checking Prerequisites"

    local missing=()

    # Check Claude Code CLI
    log_step "Checking Claude Code CLI..."
    if command -v claude &> /dev/null; then
        local version=$(claude --version 2>/dev/null | head -1 || echo "unknown")
        log_info "Claude Code CLI: $version"
    else
        missing+=("claude")
        log_error "Claude Code CLI not found"
        log_info "Install: https://claude.ai/code or npm install -g @anthropic-ai/claude-code"
    fi

    # Check Python 3
    log_step "Checking Python 3..."
    if command -v python3 &> /dev/null; then
        local py_version=$(python3 --version 2>&1)
        log_info "Python: $py_version"
    else
        missing+=("python3")
        log_error "Python 3 not found"
    fi

    # Check Git
    log_step "Checking Git..."
    if command -v git &> /dev/null; then
        local git_version=$(git --version)
        log_info "Git: $git_version"
    else
        missing+=("git")
        log_error "Git not found"
    fi

    # Check Node.js (optional but recommended)
    log_step "Checking Node.js (optional)..."
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_info "Node.js: $node_version"
    else
        log_warn "Node.js not found (optional, needed for some builds)"
    fi

    # Check npm (optional)
    if command -v npm &> /dev/null; then
        local npm_version=$(npm --version)
        log_info "npm: $npm_version"
    fi

    # Check curl (for web fetches)
    log_step "Checking curl..."
    if command -v curl &> /dev/null; then
        log_info "curl: available"
    else
        missing+=("curl")
        log_error "curl not found"
    fi

    # Check jq (optional but helpful)
    log_step "Checking jq (optional)..."
    if command -v jq &> /dev/null; then
        log_info "jq: available"
    else
        log_warn "jq not found (optional, for JSON parsing)"
    fi

    # Summary
    echo ""
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Please install the missing tools and try again."
        return 1
    else
        log_info "All required prerequisites are installed!"
        return 0
    fi
}

#===============================================================================
# Skill Installation Check
#===============================================================================

check_skill_installed() {
    log_header "Checking Loki Mode Skill"

    local skill_locations=(
        "$HOME/.claude/skills/loki-mode/SKILL.md"
        ".claude/skills/loki-mode/SKILL.md"
        "$PROJECT_DIR/SKILL.md"
    )

    for loc in "${skill_locations[@]}"; do
        if [ -f "$loc" ]; then
            log_info "Skill found: $loc"
            return 0
        fi
    done

    log_warn "Loki Mode skill not found in standard locations"
    log_info "The skill will be used from: $PROJECT_DIR/SKILL.md"

    if [ -f "$PROJECT_DIR/SKILL.md" ]; then
        log_info "Using skill from project directory"
        return 0
    else
        log_error "SKILL.md not found!"
        return 1
    fi
}

#===============================================================================
# Initialize Loki Directory
#===============================================================================

init_loki_dir() {
    log_header "Initializing Loki Mode Directory"

    mkdir -p .loki/{state,queue,messages,logs,config,prompts,artifacts,scripts}
    mkdir -p .loki/queue
    mkdir -p .loki/state/checkpoints
    mkdir -p .loki/artifacts/{releases,reports,backups}
    mkdir -p .loki/memory/{ledgers,handoffs,learnings,episodic,semantic,skills}
    mkdir -p .loki/metrics/{efficiency,rewards}
    mkdir -p .loki/rules
    mkdir -p .loki/signals

    # Initialize queue files if they don't exist
    for queue in pending in-progress completed failed dead-letter; do
        if [ ! -f ".loki/queue/${queue}.json" ]; then
            echo "[]" > ".loki/queue/${queue}.json"
        fi
    done

    # Initialize orchestrator state if it doesn't exist
    if [ ! -f ".loki/state/orchestrator.json" ]; then
        cat > ".loki/state/orchestrator.json" << EOF
{
    "version": "$(cat "$PROJECT_DIR/VERSION" 2>/dev/null || echo "2.2.0")",
    "currentPhase": "BOOTSTRAP",
    "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "agents": {},
    "metrics": {
        "tasksCompleted": 0,
        "tasksFailed": 0,
        "retries": 0
    }
}
EOF
    fi

    log_info "Loki directory initialized: .loki/"
}

#===============================================================================
# Task Status Monitor
#===============================================================================

update_status_file() {
    # Create a human-readable status file
    local status_file=".loki/STATUS.txt"

    # Get current phase
    local current_phase="UNKNOWN"
    if [ -f ".loki/state/orchestrator.json" ]; then
        current_phase=$(python3 -c "import json; print(json.load(open('.loki/state/orchestrator.json')).get('currentPhase', 'UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
    fi

    # Count tasks in each queue
    local pending=0 in_progress=0 completed=0 failed=0
    [ -f ".loki/queue/pending.json" ] && pending=$(python3 -c "import json; print(len(json.load(open('.loki/queue/pending.json'))))" 2>/dev/null || echo "0")
    [ -f ".loki/queue/in-progress.json" ] && in_progress=$(python3 -c "import json; print(len(json.load(open('.loki/queue/in-progress.json'))))" 2>/dev/null || echo "0")
    [ -f ".loki/queue/completed.json" ] && completed=$(python3 -c "import json; print(len(json.load(open('.loki/queue/completed.json'))))" 2>/dev/null || echo "0")
    [ -f ".loki/queue/failed.json" ] && failed=$(python3 -c "import json; print(len(json.load(open('.loki/queue/failed.json'))))" 2>/dev/null || echo "0")

    cat > "$status_file" << EOF
╔════════════════════════════════════════════════════════════════╗
║                    LOKI MODE STATUS                            ║
╚════════════════════════════════════════════════════════════════╝

Updated: $(date)

Phase: $current_phase

Tasks:
  ├─ Pending:     $pending
  ├─ In Progress: $in_progress
  ├─ Completed:   $completed
  └─ Failed:      $failed

Monitor: watch -n 2 cat .loki/STATUS.txt
EOF
}

start_status_monitor() {
    log_step "Starting status monitor..."

    # Initial update
    update_status_file
    update_agents_state

    # Background update loop
    (
        while true; do
            update_status_file
            update_agents_state
            sleep 5
        done
    ) &
    STATUS_MONITOR_PID=$!

    log_info "Status monitor started"
    log_info "Monitor progress: ${CYAN}watch -n 2 cat .loki/STATUS.txt${NC}"
}

stop_status_monitor() {
    if [ -n "$STATUS_MONITOR_PID" ]; then
        kill "$STATUS_MONITOR_PID" 2>/dev/null || true
        wait "$STATUS_MONITOR_PID" 2>/dev/null || true
    fi
    stop_resource_monitor
}

#===============================================================================
# Web Dashboard
#===============================================================================

generate_dashboard() {
    # Generate HTML dashboard with Anthropic design language + Agent Monitoring
    cat > .loki/dashboard/index.html << 'DASHBOARD_HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loki Mode Dashboard</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Söhne', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #FAF9F6;
            color: #1A1A1A;
            padding: 24px;
            min-height: 100vh;
        }
        .header {
            text-align: center;
            padding: 32px 20px;
            margin-bottom: 32px;
        }
        .header h1 {
            color: #D97757;
            font-size: 28px;
            font-weight: 600;
            letter-spacing: -0.5px;
            margin-bottom: 8px;
        }
        .header .subtitle {
            color: #666;
            font-size: 14px;
            font-weight: 400;
        }
        .header .phase {
            display: inline-block;
            margin-top: 16px;
            padding: 8px 16px;
            background: #FFF;
            border: 1px solid #E5E3DE;
            border-radius: 20px;
            font-size: 13px;
            color: #1A1A1A;
            font-weight: 500;
        }
        .stats {
            display: flex;
            justify-content: center;
            gap: 16px;
            margin-bottom: 40px;
            flex-wrap: wrap;
        }
        .stat {
            background: #FFF;
            border: 1px solid #E5E3DE;
            border-radius: 12px;
            padding: 20px 32px;
            text-align: center;
            min-width: 140px;
            transition: box-shadow 0.2s ease;
        }
        .stat:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .stat .number { font-size: 36px; font-weight: 600; margin-bottom: 4px; }
        .stat .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
        .stat.pending .number { color: #D97757; }
        .stat.progress .number { color: #5B8DEF; }
        .stat.completed .number { color: #2E9E6E; }
        .stat.failed .number { color: #D44F4F; }
        .stat.agents .number { color: #9B6DD6; }
        .section-header {
            text-align: center;
            font-size: 16px;
            font-weight: 600;
            color: #666;
            margin: 40px 0 20px 0;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .agents-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 16px;
            max-width: 1400px;
            margin: 0 auto 40px auto;
        }
        .agent-card {
            background: #FFF;
            border: 1px solid #E5E3DE;
            border-radius: 12px;
            padding: 16px;
            transition: box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .agent-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.06);
            border-color: #9B6DD6;
        }
        .agent-card .agent-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
        }
        .agent-card .agent-id {
            font-size: 11px;
            color: #999;
            font-family: monospace;
        }
        .agent-card .model-badge {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .agent-card .model-badge.sonnet {
            background: #E8F0FD;
            color: #5B8DEF;
        }
        .agent-card .model-badge.haiku {
            background: #FFF4E6;
            color: #F59E0B;
        }
        .agent-card .model-badge.opus {
            background: #F3E8FF;
            color: #9B6DD6;
        }
        .agent-card .agent-type {
            font-size: 14px;
            font-weight: 600;
            color: #1A1A1A;
            margin-bottom: 8px;
        }
        .agent-card .agent-status {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            margin-bottom: 12px;
        }
        .agent-card .agent-status.active {
            background: #E6F5EE;
            color: #2E9E6E;
        }
        .agent-card .agent-status.completed {
            background: #F0EFEA;
            color: #666;
        }
        .agent-card .agent-work {
            font-size: 12px;
            color: #666;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        .agent-card .agent-meta {
            display: flex;
            gap: 12px;
            font-size: 11px;
            color: #999;
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid #F0EFEA;
        }
        .agent-card .agent-meta span {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .columns {
            display: flex;
            gap: 20px;
            overflow-x: auto;
            padding-bottom: 24px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .column {
            flex: 1;
            min-width: 300px;
            max-width: 350px;
            background: #FFF;
            border: 1px solid #E5E3DE;
            border-radius: 12px;
            padding: 20px;
        }
        .column h2 {
            font-size: 13px;
            font-weight: 600;
            color: #666;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .column h2 .count {
            background: #F0EFEA;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 11px;
            color: #1A1A1A;
        }
        .column.pending h2 .count { background: #FCEEE8; color: #D97757; }
        .column.progress h2 .count { background: #E8F0FD; color: #5B8DEF; }
        .column.completed h2 .count { background: #E6F5EE; color: #2E9E6E; }
        .column.failed h2 .count { background: #FCE8E8; color: #D44F4F; }
        .task {
            background: #FAF9F6;
            border: 1px solid #E5E3DE;
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 12px;
            transition: border-color 0.2s ease;
        }
        .task:hover { border-color: #D97757; }
        .task .id { font-size: 10px; color: #999; margin-bottom: 6px; font-family: monospace; }
        .task .type {
            display: inline-block;
            background: #FCEEE8;
            color: #D97757;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            margin-bottom: 8px;
        }
        .task .title { font-size: 13px; color: #1A1A1A; line-height: 1.5; }
        .task .error {
            font-size: 11px;
            color: #D44F4F;
            margin-top: 10px;
            padding: 10px;
            background: #FCE8E8;
            border-radius: 6px;
            font-family: monospace;
        }
        .refresh {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #D97757;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s ease;
            box-shadow: 0 4px 12px rgba(217, 119, 87, 0.3);
        }
        .refresh:hover { background: #C56747; }
        .updated {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 24px;
        }
        .empty {
            color: #999;
            font-size: 13px;
            text-align: center;
            padding: 24px;
            font-style: italic;
        }
        .powered-by {
            text-align: center;
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #E5E3DE;
            color: #999;
            font-size: 12px;
        }
        .powered-by span { color: #D97757; font-weight: 500; }
    </style>
</head>
<body>
    <div class="header">
        <h1>LOKI MODE</h1>
        <div class="subtitle">Autonomous Multi-Agent Startup System</div>
        <div class="phase" id="phase">Loading...</div>
    </div>
    <div class="stats">
        <div class="stat agents"><div class="number" id="agents-count">-</div><div class="label">Active Agents</div></div>
        <div class="stat pending"><div class="number" id="pending-count">-</div><div class="label">Pending</div></div>
        <div class="stat progress"><div class="number" id="progress-count">-</div><div class="label">In Progress</div></div>
        <div class="stat completed"><div class="number" id="completed-count">-</div><div class="label">Completed</div></div>
        <div class="stat failed"><div class="number" id="failed-count">-</div><div class="label">Failed</div></div>
    </div>
    <div class="section-header">Active Agents</div>
    <div class="agents-grid" id="agents-grid"></div>
    <div class="section-header">Task Queue</div>
    <div class="columns">
        <div class="column pending"><h2>Pending <span class="count" id="pending-badge">0</span></h2><div id="pending-tasks"></div></div>
        <div class="column progress"><h2>In Progress <span class="count" id="progress-badge">0</span></h2><div id="progress-tasks"></div></div>
        <div class="column completed"><h2>Completed <span class="count" id="completed-badge">0</span></h2><div id="completed-tasks"></div></div>
        <div class="column failed"><h2>Failed <span class="count" id="failed-badge">0</span></h2><div id="failed-tasks"></div></div>
    </div>
    <div class="updated" id="updated">Last updated: -</div>
    <div class="powered-by">Powered by <span>Claude</span></div>
    <button class="refresh" onclick="loadData()">Refresh</button>
    <script>
        async function loadJSON(path) {
            try {
                const res = await fetch(path + '?t=' + Date.now());
                if (!res.ok) return [];
                const text = await res.text();
                if (!text.trim()) return [];
                const data = JSON.parse(text);
                return Array.isArray(data) ? data : (data.tasks || data.agents || []);
            } catch { return []; }
        }
        function getModelClass(model) {
            if (!model) return 'sonnet';
            const m = model.toLowerCase();
            if (m.includes('haiku')) return 'haiku';
            if (m.includes('opus')) return 'opus';
            return 'sonnet';
        }
        function formatDuration(isoDate) {
            if (!isoDate) return 'Unknown';
            const start = new Date(isoDate);
            const now = new Date();
            const seconds = Math.floor((now - start) / 1000);
            if (seconds < 60) return seconds + 's';
            if (seconds < 3600) return Math.floor(seconds / 60) + 'm';
            return Math.floor(seconds / 3600) + 'h ' + Math.floor((seconds % 3600) / 60) + 'm';
        }
        function escapeHtml(value) {
            return String(value ?? '').replace(/[&<>"']/g, (char) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[char]);
        }
        function renderAgent(agent) {
            const modelClass = getModelClass(agent.model);
            const modelName = escapeHtml(agent.model || 'Sonnet 4.5');
            const agentType = escapeHtml(agent.agent_type || 'general-purpose');
            const status = agent.status === 'completed' ? 'completed' : 'active';
            const currentTask = escapeHtml(agent.current_task || (agent.tasks_completed && agent.tasks_completed.length > 0
                ? 'Completed: ' + agent.tasks_completed.join(', ')
                : 'Initializing...'));
            const duration = formatDuration(agent.spawned_at);
            const tasksCount = agent.tasks_completed ? agent.tasks_completed.length : 0;

            return `
                <div class="agent-card">
                    <div class="agent-header">
                        <div class="agent-id">${escapeHtml(agent.agent_id || 'Unknown')}</div>
                        <div class="model-badge ${modelClass}">${modelName}</div>
                    </div>
                    <div class="agent-type">${agentType}</div>
                    <div class="agent-status ${status}">${status}</div>
                    <div class="agent-work">${currentTask}</div>
                    <div class="agent-meta">
                        <span>⏱ ${duration}</span>
                        <span>✓ ${tasksCount} tasks</span>
                    </div>
                </div>
            `;
        }
        function renderTask(task) {
            const payload = task.payload || {};
            const title = escapeHtml(payload.description || payload.action || task.type || 'Task');
            const error = task.lastError ? `<div class="error">${escapeHtml(task.lastError)}</div>` : '';
            return `<div class="task"><div class="id">${escapeHtml(task.id)}</div><span class="type">${escapeHtml(task.type || 'general')}</span><div class="title">${title}</div>${error}</div>`;
        }
        async function loadData() {
            const [pending, progress, completed, failed, agents] = await Promise.all([
                loadJSON('../queue/pending.json'),
                loadJSON('../queue/in-progress.json'),
                loadJSON('../queue/completed.json'),
                loadJSON('../queue/failed.json'),
                loadJSON('../state/agents.json')
            ]);

            // Agent stats
            document.getElementById('agents-count').textContent = agents.length;
            document.getElementById('agents-grid').innerHTML = agents.length
                ? agents.map(renderAgent).join('')
                : '<div class="empty">No active agents</div>';

            // Task stats
            document.getElementById('pending-count').textContent = pending.length;
            document.getElementById('progress-count').textContent = progress.length;
            document.getElementById('completed-count').textContent = completed.length;
            document.getElementById('failed-count').textContent = failed.length;
            document.getElementById('pending-badge').textContent = pending.length;
            document.getElementById('progress-badge').textContent = progress.length;
            document.getElementById('completed-badge').textContent = completed.length;
            document.getElementById('failed-badge').textContent = failed.length;
            document.getElementById('pending-tasks').innerHTML = pending.length ? pending.map(renderTask).join('') : '<div class="empty">No pending tasks</div>';
            document.getElementById('progress-tasks').innerHTML = progress.length ? progress.map(renderTask).join('') : '<div class="empty">No tasks in progress</div>';
            document.getElementById('completed-tasks').innerHTML = completed.length ? completed.slice(-10).reverse().map(renderTask).join('') : '<div class="empty">No completed tasks</div>';
            document.getElementById('failed-tasks').innerHTML = failed.length ? failed.map(renderTask).join('') : '<div class="empty">No failed tasks</div>';

            try {
                const state = await fetch('../state/orchestrator.json?t=' + Date.now()).then(r => r.json());
                document.getElementById('phase').textContent = 'Phase: ' + (state.currentPhase || 'UNKNOWN');
            } catch { document.getElementById('phase').textContent = 'Phase: UNKNOWN'; }
            document.getElementById('updated').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
        }
        loadData();
        setInterval(loadData, 3000);
    </script>
</body>
</html>
DASHBOARD_HTML
}

update_agents_state() {
    # Aggregate agent information from .agent/sub-agents/*.json into .loki/state/agents.json
    local agents_dir=".agent/sub-agents"
    local output_file=".loki/state/agents.json"

    # Initialize empty array if no agents directory
    if [ ! -d "$agents_dir" ]; then
        echo "[]" > "$output_file"
        return
    fi

    # Find all agent JSON files and aggregate them
    local agents_json="["
    local first=true

    for agent_file in "$agents_dir"/*.json; do
        # Skip if no JSON files exist
        [ -e "$agent_file" ] || continue

        # Read agent JSON
        local agent_data=$(cat "$agent_file" 2>/dev/null)
        if [ -n "$agent_data" ]; then
            # Add comma separator for all but first entry
            if [ "$first" = true ]; then
                first=false
            else
                agents_json="${agents_json},"
            fi
            agents_json="${agents_json}${agent_data}"
        fi
    done

    agents_json="${agents_json}]"

    # Write aggregated data
    echo "$agents_json" > "$output_file"
}

#===============================================================================
# Resource Monitoring
#===============================================================================

check_system_resources() {
    # Check CPU and memory usage and write status to .loki/state/resources.json
    local output_file=".loki/state/resources.json"

    # Get CPU usage (average across all cores)
    local cpu_usage=0
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: get CPU idle from top header, calculate usage = 100 - idle
        local idle=$(top -l 2 -n 0 | grep "CPU usage" | tail -1 | awk -F'[:,]' '{for(i=1;i<=NF;i++) if($i ~ /idle/) print $(i)}' | awk '{print int($1)}')
        cpu_usage=$((100 - ${idle:-0}))
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux: use top or mpstat
        cpu_usage=$(top -bn2 | grep "Cpu(s)" | tail -1 | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print int(100 - $1)}')
    else
        cpu_usage=0
    fi

    # Get memory usage
    local mem_usage=0
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS: use vm_stat
        local page_size=$(pagesize)
        local vm_stat=$(vm_stat)
        local pages_free=$(echo "$vm_stat" | awk '/Pages free/ {print $3}' | tr -d '.')
        local pages_active=$(echo "$vm_stat" | awk '/Pages active/ {print $3}' | tr -d '.')
        local pages_inactive=$(echo "$vm_stat" | awk '/Pages inactive/ {print $3}' | tr -d '.')
        local pages_speculative=$(echo "$vm_stat" | awk '/Pages speculative/ {print $3}' | tr -d '.')
        local pages_wired=$(echo "$vm_stat" | awk '/Pages wired down/ {print $4}' | tr -d '.')

        local total_pages=$((pages_free + pages_active + pages_inactive + pages_speculative + pages_wired))
        local used_pages=$((pages_active + pages_wired))
        mem_usage=$((used_pages * 100 / total_pages))
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux: use free
        mem_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    else
        mem_usage=0
    fi

    # Determine status
    local cpu_status="ok"
    local mem_status="ok"
    local overall_status="ok"
    local warning_message=""

    if [ "$cpu_usage" -ge "$RESOURCE_CPU_THRESHOLD" ]; then
        cpu_status="high"
        overall_status="warning"
        warning_message="CPU usage is ${cpu_usage}% (threshold: ${RESOURCE_CPU_THRESHOLD}%). Consider reducing parallel agent count or pausing non-critical tasks."
    fi

    if [ "$mem_usage" -ge "$RESOURCE_MEM_THRESHOLD" ]; then
        mem_status="high"
        overall_status="warning"
        if [ -n "$warning_message" ]; then
            warning_message="${warning_message} Memory usage is ${mem_usage}% (threshold: ${RESOURCE_MEM_THRESHOLD}%)."
        else
            warning_message="Memory usage is ${mem_usage}% (threshold: ${RESOURCE_MEM_THRESHOLD}%). Consider reducing parallel agent count or cleaning up resources."
        fi
    fi

    # Write JSON status
    cat > "$output_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "cpu": {
    "usage_percent": $cpu_usage,
    "threshold_percent": $RESOURCE_CPU_THRESHOLD,
    "status": "$cpu_status"
  },
  "memory": {
    "usage_percent": $mem_usage,
    "threshold_percent": $RESOURCE_MEM_THRESHOLD,
    "status": "$mem_status"
  },
  "overall_status": "$overall_status",
  "warning_message": "$warning_message"
}
EOF

    # Log warning if resources are high
    if [ "$overall_status" = "warning" ]; then
        log_warn "RESOURCE WARNING: $warning_message"
    fi
}

start_resource_monitor() {
    log_step "Starting resource monitor (checks every ${RESOURCE_CHECK_INTERVAL}s)..."

    # Initial check
    check_system_resources

    # Background monitoring loop
    (
        while true; do
            sleep "$RESOURCE_CHECK_INTERVAL"
            check_system_resources
        done
    ) &
    RESOURCE_MONITOR_PID=$!

    log_info "Resource monitor started (CPU threshold: ${RESOURCE_CPU_THRESHOLD}%, Memory threshold: ${RESOURCE_MEM_THRESHOLD}%)"
    log_info "Check status: ${CYAN}cat .loki/state/resources.json${NC}"
}

stop_resource_monitor() {
    if [ -n "$RESOURCE_MONITOR_PID" ]; then
        kill "$RESOURCE_MONITOR_PID" 2>/dev/null || true
        wait "$RESOURCE_MONITOR_PID" 2>/dev/null || true
    fi
}

#===============================================================================
# Audit Logging (Enterprise Security)
#===============================================================================

audit_log() {
    # Log security-relevant events for enterprise compliance
    local event_type="$1"
    local event_data="$2"
    local audit_file=".loki/logs/audit-$(date +%Y%m%d).jsonl"

    if [ "$AUDIT_LOG_ENABLED" != "true" ]; then
        return
    fi

    mkdir -p .loki/logs

    local log_entry=$(cat << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","event":"$event_type","data":"$event_data","user":"$(whoami)","pid":$$}
EOF
)
    echo "$log_entry" >> "$audit_file"
}

check_staged_autonomy() {
    # In staged autonomy mode, write plan and wait for approval
    local plan_file="$1"

    if [ "$STAGED_AUTONOMY" != "true" ]; then
        return 0
    fi

    log_info "STAGED AUTONOMY: Waiting for plan approval..."
    log_info "Review plan at: $plan_file"
    log_info "Create .loki/signals/PLAN_APPROVED to continue"

    audit_log "STAGED_AUTONOMY_WAIT" "plan=$plan_file"

    # Wait for approval signal
    while [ ! -f ".loki/signals/PLAN_APPROVED" ]; do
        sleep 5
    done

    rm -f ".loki/signals/PLAN_APPROVED"
    audit_log "STAGED_AUTONOMY_APPROVED" "plan=$plan_file"
    log_success "Plan approved, continuing execution..."
}

check_command_allowed() {
    # Check if a command is in the blocked list
    local command="$1"

    IFS=',' read -ra BLOCKED_ARRAY <<< "$BLOCKED_COMMANDS"
    for blocked in "${BLOCKED_ARRAY[@]}"; do
        if [[ "$command" == *"$blocked"* ]]; then
            audit_log "BLOCKED_COMMAND" "command=$command,pattern=$blocked"
            log_error "SECURITY: Blocked dangerous command: $command"
            return 1
        fi
    done

    return 0
}

#===============================================================================
# Cross-Project Learnings Database
#===============================================================================

init_learnings_db() {
    # Initialize the cross-project learnings database
    local learnings_dir="${HOME}/.loki/learnings"
    mkdir -p "$learnings_dir"

    # Create database files if they don't exist
    if [ ! -f "$learnings_dir/patterns.jsonl" ]; then
        echo '{"version":"1.0","created":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' > "$learnings_dir/patterns.jsonl"
    fi

    if [ ! -f "$learnings_dir/mistakes.jsonl" ]; then
        echo '{"version":"1.0","created":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' > "$learnings_dir/mistakes.jsonl"
    fi

    if [ ! -f "$learnings_dir/successes.jsonl" ]; then
        echo '{"version":"1.0","created":"'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' > "$learnings_dir/successes.jsonl"
    fi

    log_info "Learnings database initialized at: $learnings_dir"
}

save_learning() {
    # Save a learning to the cross-project database
    local learning_type="$1"  # pattern, mistake, success
    local category="$2"
    local description="$3"
    local project="${4:-$(basename "$(pwd)")}"

    local learnings_dir="${HOME}/.loki/learnings"
    local target_file="$learnings_dir/${learning_type}s.jsonl"

    if [ ! -d "$learnings_dir" ]; then
        init_learnings_db
    fi

    local learning_entry=$(cat << EOF
{"timestamp":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","project":"$project","category":"$category","description":"$description"}
EOF
)
    echo "$learning_entry" >> "$target_file"
    log_info "Saved $learning_type: $category"
}

get_relevant_learnings() {
    # Get learnings relevant to the current context
    local context="$1"
    local learnings_dir="${HOME}/.loki/learnings"
    local output_file=".loki/state/relevant-learnings.json"

    if [ ! -d "$learnings_dir" ]; then
        echo '{"patterns":[],"mistakes":[],"successes":[]}' > "$output_file"
        return
    fi

    # Simple grep-based relevance (can be enhanced with embeddings)
    # Pass context via environment variable to avoid quote escaping issues
    export LOKI_CONTEXT="$context"
    python3 << 'LEARNINGS_SCRIPT'
import json
import os

learnings_dir = os.path.expanduser("~/.loki/learnings")
context = os.environ.get("LOKI_CONTEXT", "").lower()

def load_jsonl(filepath):
    entries = []
    try:
        with open(filepath, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if 'description' in entry:
                        entries.append(entry)
                except:
                    continue
    except:
        pass
    return entries

def filter_relevant(entries, context, limit=5):
    scored = []
    for e in entries:
        desc = e.get('description', '').lower()
        cat = e.get('category', '').lower()
        score = sum(1 for word in context.split() if word in desc or word in cat)
        if score > 0:
            scored.append((score, e))
    scored.sort(reverse=True, key=lambda x: x[0])
    return [e for _, e in scored[:limit]]

patterns = load_jsonl(f"{learnings_dir}/patterns.jsonl")
mistakes = load_jsonl(f"{learnings_dir}/mistakes.jsonl")
successes = load_jsonl(f"{learnings_dir}/successes.jsonl")

result = {
    "patterns": filter_relevant(patterns, context),
    "mistakes": filter_relevant(mistakes, context),
    "successes": filter_relevant(successes, context)
}

with open(".loki/state/relevant-learnings.json", 'w') as f:
    json.dump(result, f, indent=2)
LEARNINGS_SCRIPT

    log_info "Loaded relevant learnings to: $output_file"
}

extract_learnings_from_session() {
    # Extract learnings from completed session
    local continuity_file=".loki/CONTINUITY.md"

    if [ ! -f "$continuity_file" ]; then
        return
    fi

    log_info "Extracting learnings from session..."

    # Parse CONTINUITY.md for Mistakes & Learnings section
    python3 << EXTRACT_SCRIPT
import re
import json
import os
from datetime import datetime, timezone

continuity_file = ".loki/CONTINUITY.md"
learnings_dir = os.path.expanduser("~/.loki/learnings")

if not os.path.exists(continuity_file):
    exit(0)

with open(continuity_file, 'r') as f:
    content = f.read()

# Find Mistakes & Learnings section
mistakes_match = re.search(r'## Mistakes & Learnings\n(.*?)(?=\n## |\Z)', content, re.DOTALL)
if mistakes_match:
    mistakes_text = mistakes_match.group(1)
    # Extract bullet points
    bullets = re.findall(r'[-*]\s+(.+)', mistakes_text)
    for bullet in bullets:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "project": os.path.basename(os.getcwd()),
            "category": "session",
            "description": bullet.strip()
        }
        with open(f"{learnings_dir}/mistakes.jsonl", 'a') as f:
            f.write(json.dumps(entry) + "\n")
        print(f"Extracted: {bullet[:50]}...")

print("Learning extraction complete")
EXTRACT_SCRIPT
}

start_dashboard() {
    log_header "Starting Loki Dashboard"

    # Create dashboard directory
    mkdir -p .loki/dashboard

    # Generate HTML
    generate_dashboard

    # Kill any existing process on the dashboard port
    if lsof -i :$DASHBOARD_PORT &>/dev/null; then
        log_step "Killing existing process on port $DASHBOARD_PORT..."
        lsof -ti :$DASHBOARD_PORT | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    # Start Python HTTP server from .loki/ root so it can serve queue/ and state/
    log_step "Starting dashboard server..."
    (
        cd .loki
        python3 -m http.server $DASHBOARD_PORT --bind 127.0.0.1 2>&1 | while read line; do
            echo "[dashboard] $line" >> logs/dashboard.log
        done
    ) &
    DASHBOARD_PID=$!

    sleep 1

    if kill -0 $DASHBOARD_PID 2>/dev/null; then
        log_info "Dashboard started (PID: $DASHBOARD_PID)"
        log_info "Dashboard: ${CYAN}http://127.0.0.1:$DASHBOARD_PORT/dashboard/index.html${NC}"

        # Open in browser (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open "http://127.0.0.1:$DASHBOARD_PORT/dashboard/index.html" 2>/dev/null || true
        fi
        return 0
    else
        log_warn "Dashboard failed to start"
        DASHBOARD_PID=""
        return 1
    fi
}

stop_dashboard() {
    if [ -n "$DASHBOARD_PID" ]; then
        kill "$DASHBOARD_PID" 2>/dev/null || true
        wait "$DASHBOARD_PID" 2>/dev/null || true
    fi
}

#===============================================================================
# Calculate Exponential Backoff
#===============================================================================

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

#===============================================================================
# Rate Limit Detection
#===============================================================================

# Detect rate limit from log and calculate wait time until reset
# Returns: seconds to wait, or 0 if no rate limit detected
detect_rate_limit() {
    local log_file="$1"

    # Look for rate limit message like "resets 4am" or "resets 10pm"
    local reset_time=$(grep -o "resets [0-9]\+[ap]m" "$log_file" 2>/dev/null | tail -1 | grep -o "[0-9]\+[ap]m")

    if [ -z "$reset_time" ]; then
        echo 0
        return
    fi

    # Parse the reset time
    local hour=$(echo "$reset_time" | grep -o "[0-9]\+")
    local ampm=$(echo "$reset_time" | grep -o "[ap]m")

    # Convert to 24-hour format
    if [ "$ampm" = "pm" ] && [ "$hour" -ne 12 ]; then
        hour=$((hour + 12))
    elif [ "$ampm" = "am" ] && [ "$hour" -eq 12 ]; then
        hour=0
    fi

    # Get current time
    local current_hour=$(date +%H)
    local current_min=$(date +%M)
    local current_sec=$(date +%S)

    # Calculate seconds until reset
    local current_secs=$((current_hour * 3600 + current_min * 60 + current_sec))
    local reset_secs=$((hour * 3600))

    local wait_secs=$((reset_secs - current_secs))

    # If reset time is in the past, it means tomorrow
    if [ $wait_secs -le 0 ]; then
        wait_secs=$((wait_secs + 86400))  # Add 24 hours
    fi

    # Add 2 minute buffer to ensure limit is actually reset
    wait_secs=$((wait_secs + 120))

    echo $wait_secs
}

# Format seconds into human-readable time
format_duration() {
    local secs="$1"
    local hours=$((secs / 3600))
    local mins=$(((secs % 3600) / 60))

    if [ $hours -gt 0 ]; then
        echo "${hours}h ${mins}m"
    else
        echo "${mins}m"
    fi
}

#===============================================================================
# Check Completion
#===============================================================================

is_completed() {
    # Check orchestrator state
    if [ -f ".loki/state/orchestrator.json" ]; then
        if command -v python3 &> /dev/null; then
            local phase=$(python3 -c "import json; print(json.load(open('.loki/state/orchestrator.json')).get('currentPhase', ''))" 2>/dev/null || echo "")
            # Accept various completion states
            if [ "$phase" = "COMPLETED" ] || [ "$phase" = "complete" ] || [ "$phase" = "finalized" ] || [ "$phase" = "growth-loop" ]; then
                return 0
            fi
        fi
    fi

    # Check for completion marker
    if [ -f ".loki/COMPLETED" ]; then
        return 0
    fi

    return 1
}

# Check if completion promise is fulfilled in log output
check_completion_promise() {
    local log_file="$1"

    # Check for the completion promise phrase in recent log output
    if grep -q "COMPLETION PROMISE FULFILLED" "$log_file" 2>/dev/null; then
        return 0
    fi

    # Check for custom completion promise text
    if [ -n "$COMPLETION_PROMISE" ] && grep -qF "$COMPLETION_PROMISE" "$log_file" 2>/dev/null; then
        return 0
    fi

    return 1
}

# Check if max iterations reached
check_max_iterations() {
    if [ $ITERATION_COUNT -ge $MAX_ITERATIONS ]; then
        log_warn "Max iterations ($MAX_ITERATIONS) reached. Stopping."
        return 0
    fi
    return 1
}

# Check if context clear was requested by agent
check_context_clear_signal() {
    if [ -f ".loki/signals/CONTEXT_CLEAR_REQUESTED" ]; then
        log_info "Context clear signal detected from agent"
        rm -f ".loki/signals/CONTEXT_CLEAR_REQUESTED"
        return 0
    fi
    return 1
}

# Load latest ledger content for context injection
load_ledger_context() {
    local ledger_content=""

    # Find most recent ledger
    local latest_ledger=$(ls -t .loki/memory/ledgers/LEDGER-*.md 2>/dev/null | head -1)

    if [ -n "$latest_ledger" ] && [ -f "$latest_ledger" ]; then
        ledger_content=$(cat "$latest_ledger" | head -100)
        echo "$ledger_content"
    fi
}

# Load recent handoffs for context
load_handoff_context() {
    local handoff_content=""

    # Find most recent handoff (last 24 hours)
    local recent_handoff=$(find .loki/memory/handoffs -name "*.md" -mtime -1 2>/dev/null | head -1)

    if [ -n "$recent_handoff" ] && [ -f "$recent_handoff" ]; then
        handoff_content=$(cat "$recent_handoff" | head -80)
        echo "$handoff_content"
    fi
}

# Load relevant learnings
load_learnings_context() {
    local learnings=""

    # Get recent learnings (last 7 days)
    for learning in $(find .loki/memory/learnings -name "*.md" -mtime -7 2>/dev/null | head -5); do
        learnings+="$(head -30 "$learning")\n---\n"
    done

    echo -e "$learnings"
}

#===============================================================================
# Save/Load Wrapper State
#===============================================================================

save_state() {
    local retry_count="$1"
    local status="$2"
    local exit_code="$3"

    cat > ".loki/autonomy-state.json" << EOF
{
    "retryCount": $retry_count,
    "status": "$status",
    "lastExitCode": $exit_code,
    "lastRun": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "prdPath": "${PRD_PATH:-}",
    "pid": $$,
    "maxRetries": $MAX_RETRIES,
    "baseWait": $BASE_WAIT
}
EOF
}

load_state() {
    if [ -f ".loki/autonomy-state.json" ]; then
        if command -v python3 &> /dev/null; then
            RETRY_COUNT=$(python3 -c "import json; print(json.load(open('.loki/autonomy-state.json')).get('retryCount', 0))" 2>/dev/null || echo "0")
        else
            RETRY_COUNT=0
        fi
    else
        RETRY_COUNT=0
    fi
}

#===============================================================================
# Build Resume Prompt
#===============================================================================

build_prompt() {
    local retry="$1"
    local prd="$2"
    local iteration="$3"

    # Build SDLC phases configuration
    local phases=""
    [ "$PHASE_UNIT_TESTS" = "true" ] && phases="${phases}UNIT_TESTS,"
    [ "$PHASE_API_TESTS" = "true" ] && phases="${phases}API_TESTS,"
    [ "$PHASE_E2E_TESTS" = "true" ] && phases="${phases}E2E_TESTS,"
    [ "$PHASE_SECURITY" = "true" ] && phases="${phases}SECURITY,"
    [ "$PHASE_INTEGRATION" = "true" ] && phases="${phases}INTEGRATION,"
    [ "$PHASE_CODE_REVIEW" = "true" ] && phases="${phases}CODE_REVIEW,"
    [ "$PHASE_WEB_RESEARCH" = "true" ] && phases="${phases}WEB_RESEARCH,"
    [ "$PHASE_PERFORMANCE" = "true" ] && phases="${phases}PERFORMANCE,"
    [ "$PHASE_ACCESSIBILITY" = "true" ] && phases="${phases}ACCESSIBILITY,"
    [ "$PHASE_REGRESSION" = "true" ] && phases="${phases}REGRESSION,"
    [ "$PHASE_UAT" = "true" ] && phases="${phases}UAT,"
    phases="${phases%,}"  # Remove trailing comma

    # Ralph Wiggum Mode - Reason-Act-Reflect-VERIFY cycle with self-verification loop (Boris Cherny pattern)
    local rarv_instruction="RALPH WIGGUM MODE ACTIVE. Use Reason-Act-Reflect-VERIFY cycle: 1) REASON - READ .loki/CONTINUITY.md including 'Mistakes & Learnings' section to avoid past errors. CHECK .loki/state/relevant-learnings.json for cross-project learnings from previous projects (mistakes to avoid, patterns to apply). Check .loki/state/ and .loki/queue/, identify next task. CHECK .loki/state/resources.json for system resource warnings - if CPU or memory is high, reduce parallel agent spawning or pause non-critical tasks. Limit to MAX_PARALLEL_AGENTS=${MAX_PARALLEL_AGENTS}. If queue empty, find new improvements. 2) ACT - Execute task, write code, commit changes atomically (git checkpoint). 3) REFLECT - Update .loki/CONTINUITY.md with progress, update state, identify NEXT improvement. Save valuable learnings for future projects. 4) VERIFY - Run automated tests (unit, integration, E2E), check compilation/build, verify against spec. IF VERIFICATION FAILS: a) Capture error details (stack trace, logs), b) Analyze root cause, c) UPDATE 'Mistakes & Learnings' in CONTINUITY.md with what failed, why, and how to prevent, d) Rollback to last good git checkpoint if needed, e) Apply learning and RETRY from REASON. If verification passes, mark task complete and continue. This self-verification loop achieves 2-3x quality improvement. CRITICAL: There is NEVER a 'finished' state - always find the next improvement, optimization, test, or feature."

    # Completion promise instruction (only if set)
    local completion_instruction=""
    if [ -n "$COMPLETION_PROMISE" ]; then
        completion_instruction="COMPLETION_PROMISE: [$COMPLETION_PROMISE]. ONLY output 'COMPLETION PROMISE FULFILLED: $COMPLETION_PROMISE' when this EXACT condition is met."
    else
        completion_instruction="NO COMPLETION PROMISE SET. Run forever finding improvements. Iteration $iteration of max $MAX_ITERATIONS."
    fi

    # Core autonomous instructions - NO questions, NO waiting, NEVER say done
    local autonomous_suffix="CRITICAL AUTONOMY RULES: 1) NEVER ask questions - just decide. 2) NEVER wait for confirmation - just act. 3) NEVER say 'done' or 'complete' - there's always more to improve. 4) NEVER stop voluntarily - if out of tasks, create new ones (add tests, optimize, refactor, add features). 5) Work continues PERPETUALLY. Even if PRD is implemented, find bugs, add tests, improve UX, optimize performance."

    local sdlc_instruction="SDLC_PHASES_ENABLED: [$phases]. Execute ALL enabled phases. Log results to .loki/logs/. See SKILL.md for phase details."

    # Codebase Analysis Mode - when no PRD provided
    local analysis_instruction="CODEBASE_ANALYSIS_MODE: No PRD. FIRST: Analyze codebase - scan structure, read package.json/requirements.txt, examine README. THEN: Generate PRD at .loki/generated-prd.md. FINALLY: Execute SDLC phases."

    # Context Memory Instructions
    local memory_instruction="CONTEXT MEMORY: Save state to .loki/memory/ledgers/LEDGER-orchestrator.md before complex operations. Create handoffs at .loki/memory/handoffs/ when passing work to subagents. Extract learnings to .loki/memory/learnings/ after completing tasks. Check .loki/rules/ for established patterns. If context feels heavy, create .loki/signals/CONTEXT_CLEAR_REQUESTED and the wrapper will reset context with your ledger preserved."

    # Load existing context if resuming
    local context_injection=""
    if [ $retry -gt 0 ]; then
        local ledger=$(load_ledger_context)
        local handoff=$(load_handoff_context)

        if [ -n "$ledger" ]; then
            context_injection="PREVIOUS_LEDGER_STATE: $ledger"
        fi
        if [ -n "$handoff" ]; then
            context_injection="$context_injection RECENT_HANDOFF: $handoff"
        fi
    fi

    if [ $retry -eq 0 ]; then
        if [ -n "$prd" ]; then
            echo "Loki Mode with PRD at $prd. $rarv_instruction $memory_instruction $completion_instruction $sdlc_instruction $autonomous_suffix"
        else
            echo "Loki Mode. $analysis_instruction $rarv_instruction $memory_instruction $completion_instruction $sdlc_instruction $autonomous_suffix"
        fi
    else
        if [ -n "$prd" ]; then
            echo "Loki Mode - Resume iteration #$iteration (retry #$retry). PRD: $prd. $context_injection $rarv_instruction $memory_instruction $completion_instruction $sdlc_instruction $autonomous_suffix"
        else
            echo "Loki Mode - Resume iteration #$iteration (retry #$retry). $context_injection Use .loki/generated-prd.md if exists. $rarv_instruction $memory_instruction $completion_instruction $sdlc_instruction $autonomous_suffix"
        fi
    fi
}

#===============================================================================
# Main Autonomous Loop
#===============================================================================

run_autonomous() {
    local prd_path="$1"

    log_header "Starting Autonomous Execution"

    # Auto-detect PRD if not provided
    if [ -z "$prd_path" ]; then
        log_step "No PRD provided, searching for existing PRD files..."
        local found_prd=""

        # Search common PRD file patterns
        for pattern in "PRD.md" "prd.md" "REQUIREMENTS.md" "requirements.md" "SPEC.md" "spec.md" \
                       "docs/PRD.md" "docs/prd.md" "docs/REQUIREMENTS.md" "docs/requirements.md" \
                       "docs/SPEC.md" "docs/spec.md" ".github/PRD.md" "PROJECT.md" "project.md"; do
            if [ -f "$pattern" ]; then
                found_prd="$pattern"
                break
            fi
        done

        if [ -n "$found_prd" ]; then
            log_info "Found existing PRD: $found_prd"
            prd_path="$found_prd"
        elif [ -f ".loki/generated-prd.md" ]; then
            log_info "Using previously generated PRD: .loki/generated-prd.md"
            prd_path=".loki/generated-prd.md"
        else
            log_info "No PRD found - will analyze codebase and generate one"
        fi
    fi

    log_info "PRD: ${prd_path:-Codebase Analysis Mode}"
    log_info "Max retries: $MAX_RETRIES"
    log_info "Max iterations: $MAX_ITERATIONS"
    log_info "Completion promise: $COMPLETION_PROMISE"
    log_info "Base wait: ${BASE_WAIT}s"
    log_info "Max wait: ${MAX_WAIT}s"
    echo ""

    load_state
    local retry=$RETRY_COUNT

    # Check max iterations before starting
    if check_max_iterations; then
        log_error "Max iterations already reached. Reset with: rm .loki/autonomy-state.json"
        return 1
    fi

    while [ $retry -lt $MAX_RETRIES ]; do
        # Increment iteration count
        ((ITERATION_COUNT++))

        # Check max iterations
        if check_max_iterations; then
            save_state $retry "max_iterations_reached" 0
            return 0
        fi

        local prompt=$(build_prompt $retry "$prd_path" $ITERATION_COUNT)

        echo ""
        log_header "Attempt $((retry + 1)) of $MAX_RETRIES"
        log_info "Prompt: $prompt"
        echo ""

        save_state $retry "running" 0

        # Run Claude Code with live output
        local start_time=$(date +%s)
        local log_file=".loki/logs/autonomy-$(date +%Y%m%d).log"

        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${CYAN}  CLAUDE CODE OUTPUT (live)${NC}"
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        # Log start time
        echo "=== Session started at $(date) ===" >> "$log_file"
        echo "=== Prompt: $prompt ===" >> "$log_file"

        set +e
        # Run Claude with stream-json for real-time output
        # Parse JSON stream, display formatted output, and track agents
        claude --dangerously-skip-permissions -p "$prompt" \
            --output-format stream-json --verbose 2>&1 | \
            tee -a "$log_file" | \
            python3 -u -c '
import sys
import json
import os
from datetime import datetime, timezone

# ANSI colors
CYAN = "\033[0;36m"
GREEN = "\033[0;32m"
YELLOW = "\033[1;33m"
MAGENTA = "\033[0;35m"
DIM = "\033[2m"
NC = "\033[0m"

# Agent tracking
AGENTS_FILE = ".loki/state/agents.json"
QUEUE_IN_PROGRESS = ".loki/queue/in-progress.json"
active_agents = {}  # tool_id -> agent_info
orchestrator_id = "orchestrator-main"
session_start = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def init_orchestrator():
    """Initialize the main orchestrator agent (always visible)."""
    active_agents[orchestrator_id] = {
        "agent_id": orchestrator_id,
        "tool_id": orchestrator_id,
        "agent_type": "orchestrator",
        "model": "sonnet",
        "current_task": "Initializing...",
        "status": "active",
        "spawned_at": session_start,
        "tasks_completed": [],
        "tool_count": 0
    }
    save_agents()

def update_orchestrator_task(tool_name, description=""):
    """Update orchestrator current task based on tool usage."""
    if orchestrator_id in active_agents:
        active_agents[orchestrator_id]["tool_count"] = active_agents[orchestrator_id].get("tool_count", 0) + 1
        if description:
            active_agents[orchestrator_id]["current_task"] = f"{tool_name}: {description[:80]}"
        else:
            active_agents[orchestrator_id]["current_task"] = f"Using {tool_name}..."
        save_agents()

def load_agents():
    """Load existing agents from file."""
    try:
        if os.path.exists(AGENTS_FILE):
            with open(AGENTS_FILE, "r") as f:
                data = json.load(f)
                return {a.get("tool_id", a.get("agent_id")): a for a in data if isinstance(a, dict)}
    except:
        pass
    return {}

def save_agents():
    """Save agents to file for dashboard."""
    try:
        os.makedirs(os.path.dirname(AGENTS_FILE), exist_ok=True)
        agents_list = list(active_agents.values())
        with open(AGENTS_FILE, "w") as f:
            json.dump(agents_list, f, indent=2)
    except Exception as e:
        print(f"{YELLOW}[Agent save error: {e}]{NC}", file=sys.stderr)

def save_in_progress(tasks):
    """Save in-progress tasks to queue file."""
    try:
        os.makedirs(os.path.dirname(QUEUE_IN_PROGRESS), exist_ok=True)
        with open(QUEUE_IN_PROGRESS, "w") as f:
            json.dump(tasks, f, indent=2)
    except:
        pass

def process_stream():
    global active_agents
    active_agents = load_agents()

    # Always show the main orchestrator
    init_orchestrator()
    print(f"{MAGENTA}[Orchestrator Active]{NC} Main agent started", flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            msg_type = data.get("type", "")

            if msg_type == "assistant":
                # Extract and print assistant text
                message = data.get("message", {})
                content = message.get("content", [])
                for item in content:
                    if item.get("type") == "text":
                        text = item.get("text", "")
                        if text:
                            print(text, end="", flush=True)
                    elif item.get("type") == "tool_use":
                        tool = item.get("name", "unknown")
                        tool_id = item.get("id", "")
                        tool_input = item.get("input", {})

                        # Extract description based on tool type
                        tool_desc = ""
                        if tool == "Read":
                            tool_desc = tool_input.get("file_path", "")
                        elif tool == "Edit" or tool == "Write":
                            tool_desc = tool_input.get("file_path", "")
                        elif tool == "Bash":
                            tool_desc = tool_input.get("description", tool_input.get("command", "")[:60])
                        elif tool == "Grep":
                            tool_desc = f"pattern: {tool_input.get('pattern', '')}"
                        elif tool == "Glob":
                            tool_desc = tool_input.get("pattern", "")

                        # Update orchestrator with current tool activity
                        update_orchestrator_task(tool, tool_desc)

                        # Track Task tool calls (agent spawning)
                        if tool == "Task":
                            agent_type = tool_input.get("subagent_type", "general-purpose")
                            description = tool_input.get("description", "")
                            model = tool_input.get("model", "sonnet")

                            agent_info = {
                                "agent_id": f"agent-{tool_id[:8]}",
                                "tool_id": tool_id,
                                "agent_type": agent_type,
                                "model": model,
                                "current_task": description,
                                "status": "active",
                                "spawned_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                                "tasks_completed": []
                            }
                            active_agents[tool_id] = agent_info
                            save_agents()
                            print(f"\n{MAGENTA}[Agent Spawned: {agent_type}]{NC} {description}", flush=True)

                        # Track TodoWrite for task updates
                        elif tool == "TodoWrite":
                            todos = tool_input.get("todos", [])
                            in_progress = [t for t in todos if t.get("status") == "in_progress"]
                            save_in_progress([{"id": f"todo-{i}", "type": "todo", "payload": {"action": t.get("content", "")}} for i, t in enumerate(in_progress)])
                            print(f"\n{CYAN}[Tool: {tool}]{NC} {len(todos)} items", flush=True)

                        else:
                            print(f"\n{CYAN}[Tool: {tool}]{NC}", flush=True)

            elif msg_type == "user":
                # Tool results - check for agent completion
                content = data.get("message", {}).get("content", [])
                for item in content:
                    if item.get("type") == "tool_result":
                        tool_id = item.get("tool_use_id", "")

                        # Mark agent as completed if it was a Task
                        if tool_id in active_agents:
                            active_agents[tool_id]["status"] = "completed"
                            active_agents[tool_id]["completed_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                            save_agents()
                            print(f"{DIM}[Agent Complete]{NC} ", end="", flush=True)
                        else:
                            print(f"{DIM}[Result]{NC} ", end="", flush=True)

            elif msg_type == "result":
                # Session complete - mark all agents as completed
                completed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                for agent_id in active_agents:
                    if active_agents[agent_id].get("status") == "active":
                        active_agents[agent_id]["status"] = "completed"
                        active_agents[agent_id]["completed_at"] = completed_at
                        active_agents[agent_id]["current_task"] = "Session complete"

                # Add session stats to orchestrator
                if orchestrator_id in active_agents:
                    tool_count = active_agents[orchestrator_id].get("tool_count", 0)
                    active_agents[orchestrator_id]["tasks_completed"].append(f"{tool_count} tools used")

                save_agents()
                print(f"\n{GREEN}[Session complete]{NC}", flush=True)
                is_error = data.get("is_error", False)
                sys.exit(1 if is_error else 0)

        except json.JSONDecodeError:
            # Not JSON, print as-is
            print(line, flush=True)
        except Exception as e:
            print(f"{YELLOW}[Parse error: {e}]{NC}", file=sys.stderr)

if __name__ == "__main__":
    try:
        process_stream()
    except KeyboardInterrupt:
        sys.exit(130)
    except BrokenPipeError:
        sys.exit(0)
'
        local exit_code=${PIPESTATUS[0]}
        set -e

        echo ""
        echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""

        # Log end time
        echo "=== Session ended at $(date) with exit code $exit_code ===" >> "$log_file"

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))

        log_info "Claude exited with code $exit_code after ${duration}s"
        save_state $retry "exited" $exit_code

        # Check for success - ONLY stop on explicit completion promise
        # There's never a "complete" product - always improvements, bugs, features
        if [ $exit_code -eq 0 ]; then
            # Perpetual mode: NEVER stop, always continue
            if [ "$PERPETUAL_MODE" = "true" ]; then
                log_info "Perpetual mode: Ignoring exit, continuing immediately..."
                ((retry++))
                continue  # Immediately start next iteration, no wait
            fi

            # Only stop if EXPLICIT completion promise text was output
            if [ -n "$COMPLETION_PROMISE" ] && check_completion_promise "$log_file"; then
                echo ""
                log_header "COMPLETION PROMISE FULFILLED: $COMPLETION_PROMISE"
                log_info "Explicit completion promise detected in output."
                save_state $retry "completion_promise_fulfilled" 0
                return 0
            fi

            # Warn if Claude says it's "done" but no explicit promise
            if is_completed; then
                log_warn "Claude claims completion, but no explicit promise fulfilled."
                log_warn "Projects are never truly complete - there are always improvements!"
            fi

            # SUCCESS exit - continue IMMEDIATELY to next iteration (no wait!)
            log_info "Iteration complete. Continuing to next iteration..."
            ((retry++))
            continue  # Immediately start next iteration, no exponential backoff
        fi

        # Only apply retry logic for ERRORS (non-zero exit code)
        # Handle retry - check for rate limit first
        local rate_limit_wait=$(detect_rate_limit "$log_file")
        local wait_time

        if [ $rate_limit_wait -gt 0 ]; then
            wait_time=$rate_limit_wait
            local human_time=$(format_duration $wait_time)
            log_warn "Rate limit detected! Waiting until reset (~$human_time)..."
            log_info "Rate limit resets at approximately $(date -v+${wait_time}S '+%I:%M %p' 2>/dev/null || date -d "+${wait_time} seconds" '+%I:%M %p' 2>/dev/null || echo 'soon')"
        else
            wait_time=$(calculate_wait $retry)
            log_warn "Will retry in ${wait_time}s..."
        fi

        log_info "Press Ctrl+C to cancel"

        # Countdown with progress
        local remaining=$wait_time
        local interval=10
        # Use longer interval for long waits
        if [ $wait_time -gt 1800 ]; then
            interval=60
        fi

        while [ $remaining -gt 0 ]; do
            local human_remaining=$(format_duration $remaining)
            printf "\r${YELLOW}Resuming in ${human_remaining}...${NC}          "
            sleep $interval
            remaining=$((remaining - interval))
        done
        echo ""

        ((retry++))
    done

    log_error "Max retries ($MAX_RETRIES) exceeded"
    save_state $retry "failed" 1
    return 1
}

#===============================================================================
# Cleanup Handler
#===============================================================================

cleanup() {
    echo ""
    log_warn "Received interrupt signal"
    stop_dashboard
    stop_status_monitor
    save_state ${RETRY_COUNT:-0} "interrupted" 130
    log_info "State saved. Run again to resume."
    exit 130
}

#===============================================================================
# Main Entry Point
#===============================================================================

main() {
    trap cleanup INT TERM

    echo ""
    echo -e "${BOLD}${BLUE}"
    echo "  ██╗      ██████╗ ██╗  ██╗██╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗"
    echo "  ██║     ██╔═══██╗██║ ██╔╝██║    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝"
    echo "  ██║     ██║   ██║█████╔╝ ██║    ██╔████╔██║██║   ██║██║  ██║█████╗  "
    echo "  ██║     ██║   ██║██╔═██╗ ██║    ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  "
    echo "  ███████╗╚██████╔╝██║  ██╗██║    ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗"
    echo "  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝"
    echo -e "${NC}"
    echo -e "  ${CYAN}Autonomous Multi-Agent Startup System${NC}"
    echo -e "  ${CYAN}Version: $(cat "$PROJECT_DIR/VERSION" 2>/dev/null || echo "2.x.x")${NC}"
    echo ""

    # Parse arguments
    PRD_PATH="${1:-}"

    # Validate PRD if provided
    if [ -n "$PRD_PATH" ] && [ ! -f "$PRD_PATH" ]; then
        log_error "PRD file not found: $PRD_PATH"
        exit 1
    fi

    # Check prerequisites (unless skipped)
    if [ "$SKIP_PREREQS" != "true" ]; then
        if ! check_prerequisites; then
            exit 1
        fi
    else
        log_warn "Skipping prerequisite checks (LOKI_SKIP_PREREQS=true)"
    fi

    # Check skill installation
    if ! check_skill_installed; then
        exit 1
    fi

    # Initialize .loki directory
    init_loki_dir

    # Start web dashboard (if enabled)
    if [ "$ENABLE_DASHBOARD" = "true" ]; then
        start_dashboard
    else
        log_info "Dashboard disabled (LOKI_DASHBOARD=false)"
    fi

    # Start status monitor (background updates to .loki/STATUS.txt)
    start_status_monitor

    # Start resource monitor (background CPU/memory checks)
    start_resource_monitor

    # Initialize cross-project learnings database
    init_learnings_db

    # Load relevant learnings for this project context
    if [ -n "$PRD_PATH" ] && [ -f "$PRD_PATH" ]; then
        get_relevant_learnings "$(cat "$PRD_PATH" | head -100)"
    else
        get_relevant_learnings "general development"
    fi

    # Log session start for audit
    audit_log "SESSION_START" "prd=$PRD_PATH,dashboard=$ENABLE_DASHBOARD,staged_autonomy=$STAGED_AUTONOMY"

    # Run autonomous loop
    local result=0
    run_autonomous "$PRD_PATH" || result=$?

    # Extract and save learnings from this session
    extract_learnings_from_session

    # Log session end for audit
    audit_log "SESSION_END" "result=$result,prd=$PRD_PATH"

    # Cleanup
    stop_dashboard
    stop_status_monitor

    exit $result
}

# Run main
main "$@"
