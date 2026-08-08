#!/bin/bash
# Export Loki Mode tasks to Vibe Kanban format
# Usage: ./scripts/export-to-vibe-kanban.sh [export_dir]

set -uo pipefail

LOKI_DIR=".loki"
EXPORT_DIR="${1:-${VIBE_KANBAN_DIR:-$HOME/.vibe-kanban/loki-tasks}}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }

# Check if .loki directory exists
if [ ! -d "$LOKI_DIR" ]; then
    log_warn "No .loki directory found. Run Loki Mode first."
    exit 1
fi

mkdir -p "$EXPORT_DIR"
if [ -L "$EXPORT_DIR" ]; then
    log_warn "Refusing a symlinked export directory: $EXPORT_DIR"
    exit 1
fi

# Get current phase from orchestrator
CURRENT_PHASE="UNKNOWN"
if [ -f "$LOKI_DIR/state/orchestrator.json" ]; then
    CURRENT_PHASE=$(python3 -c "import json; print(json.load(open('$LOKI_DIR/state/orchestrator.json')).get('currentPhase', 'UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
fi

# Map Loki phases to Vibe Kanban columns
phase_to_column() {
    case "$1" in
        BOOTSTRAP|DISCOVERY|ARCHITECTURE) echo "planning" ;;
        INFRASTRUCTURE|DEVELOPMENT) echo "in-progress" ;;
        QA) echo "review" ;;
        DEPLOYMENT) echo "deploying" ;;
        BUSINESS_OPS|GROWTH|COMPLETED) echo "done" ;;
        *) echo "backlog" ;;
    esac
}

# Export tasks from all queues
export_queue() {
    local queue_file="$1"
    local status="$2"

    if [ ! -f "$queue_file" ]; then
        return
    fi

    python3 - "$queue_file" "$EXPORT_DIR" "$status" "$CURRENT_PHASE" << 'PY'
import json
import os
import re
import sys
import tempfile
from datetime import datetime

queue_file, requested_export_dir, queue_status, current_phase = sys.argv[1:]

try:
    with open(queue_file) as f:
        content = f.read().strip()
        if not content or content == "[]":
            tasks = []
        else:
            tasks = json.loads(content)
except (json.JSONDecodeError, FileNotFoundError):
    tasks = []

export_dir = os.path.realpath(os.path.expanduser(requested_export_dir))
exported = 0
skipped = 0


def atomic_json_write(path, payload):
    fd, temporary = tempfile.mkstemp(prefix=".loki-task-", suffix=".tmp", dir=export_dir)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2)
            handle.write("\n")
        os.replace(temporary, path)
    except Exception:
        try:
            os.close(fd)
        except OSError:
            pass
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise

for task in tasks:
    if not isinstance(task, dict):
        skipped += 1
        continue
    task_id = str(task.get('id', ''))
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", task_id):
        skipped += 1
        continue

    # Determine status based on queue and claimed state
    if queue_status == "pending":
        vibe_status = "todo"
    elif queue_status == "in-progress":
        vibe_status = "doing"
    elif queue_status == "completed":
        vibe_status = "done"
    elif queue_status == "failed":
        vibe_status = "blocked"
    else:
        vibe_status = "todo"

    # Build description from payload
    payload = task.get('payload', {})
    if isinstance(payload, dict):
        desc_parts = []
        if 'action' in payload:
            desc_parts.append(f"Action: {payload['action']}")
        if 'description' in payload:
            desc_parts.append(payload['description'])
        if 'command' in payload:
            desc_parts.append(f"Command: {payload['command']}")
        description = "\n".join(desc_parts) if desc_parts else json.dumps(payload, indent=2)
    else:
        description = str(payload)

    # Get agent type for tagging
    agent_type = str(task.get('type', 'unknown'))
    swarm = agent_type.split('-')[0] if '-' in agent_type else 'general'

    # Priority mapping (Loki uses 1-10, higher is more important)
    try:
        priority = int(task.get('priority', 5))
    except (TypeError, ValueError):
        priority = 5
    if priority >= 8:
        priority_tag = "priority-high"
    elif priority >= 5:
        priority_tag = "priority-medium"
    else:
        priority_tag = "priority-low"

    vibe_task = {
        "id": f"loki-{task_id}",
        "title": f"[{agent_type}] {payload.get('action', 'Task') if isinstance(payload, dict) else 'Task'}",
        "description": description,
        "status": vibe_status,
        "agent": "claude-code",
        "tags": [
            agent_type,
            f"swarm-{swarm}",
            priority_tag,
            f"phase-{current_phase}".lower()
        ],
        "metadata": {
            "lokiTaskId": task_id,
            "lokiType": agent_type,
            "lokiPriority": priority,
            "lokiPhase": current_phase,
            "lokiRetries": task.get('retries', 0),
            "createdAt": task.get('createdAt', datetime.utcnow().isoformat() + 'Z'),
            "claimedBy": task.get('claimedBy'),
            "lastError": task.get('lastError')
        }
    }

    # Write task file
    task_file = os.path.realpath(os.path.join(export_dir, f"{task_id}.json"))
    if os.path.commonpath((export_dir, task_file)) != export_dir:
        skipped += 1
        continue
    atomic_json_write(task_file, vibe_task)
    exported += 1

print(f"EXPORTED:{exported}")
print(f"SKIPPED:{skipped}")
PY
}

log_info "Exporting Loki Mode tasks to Vibe Kanban..."
log_info "Export directory: $EXPORT_DIR"
log_info "Current phase: $CURRENT_PHASE"

TOTAL=0

# Export from each queue
for queue in pending in-progress completed failed dead-letter; do
    queue_file="$LOKI_DIR/queue/${queue}.json"
    if [ -f "$queue_file" ]; then
        result=$(export_queue "$queue_file" "$queue")
        count=$(echo "$result" | grep "EXPORTED:" | cut -d: -f2)
        if [ -n "$count" ] && [ "$count" -gt 0 ]; then
            log_info "  $queue: $count tasks"
            TOTAL=$((TOTAL + count))
        fi
    fi
done

# Create the summary with JSON encoding and an atomic replacement.
python3 - "$EXPORT_DIR" "$CURRENT_PHASE" "$TOTAL" "$(phase_to_column "$CURRENT_PHASE")" << 'PY'
import json
import os
import sys
import tempfile
from datetime import datetime, timezone

export_dir, current_phase, total, column = sys.argv[1:]
try:
    with open("VERSION", encoding="utf-8") as handle:
        version = handle.read().strip() or "unknown"
except OSError:
    version = "unknown"
payload = {
    "exportedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    "currentPhase": current_phase,
    "totalTasks": int(total),
    "lokiVersion": version,
    "column": column,
}
fd, temporary = tempfile.mkstemp(prefix=".loki-summary-", suffix=".tmp", dir=export_dir)
try:
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)
        handle.write("\n")
    os.replace(temporary, os.path.join(export_dir, "_loki_summary.json"))
except Exception:
    try:
        os.close(fd)
    except OSError:
        pass
    try:
        os.unlink(temporary)
    except FileNotFoundError:
        pass
    raise
PY

log_info "Exported $TOTAL tasks total"
log_info "Summary written to $EXPORT_DIR/_loki_summary.json"
