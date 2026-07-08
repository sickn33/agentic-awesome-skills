# Vibe Kanban Integration

Loki Mode can optionally integrate with [Vibe Kanban](https://github.com/BloopAI/vibe-kanban) to provide a visual dashboard for monitoring autonomous execution.

## Why Use Vibe Kanban with Loki Mode?

| Feature | Loki Mode Alone | + Vibe Kanban |
|---------|-----------------|---------------|
| Task visualization | File-based queues | Visual kanban board |
| Progress monitoring | Log files | Real-time dashboard |
| Manual intervention | Edit queue files | Drag-and-drop tasks |
| Code review | Automated 3-reviewer | + Visual diff review |
| Parallel agents | Background subagents | Isolated git worktrees |

## Setup

### 1. Install Vibe Kanban

```bash
npx vibe-kanban
```

### 2. Enable Integration in Loki Mode

Set environment variable before running:

```bash
export LOKI_VIBE_KANBAN=true
./scripts/loki-wrapper.sh ./docs/requirements.md
```

Or create `.loki/config/integrations.yaml`:

```yaml
vibe-kanban:
  enabled: true
  sync_interval: 30  # seconds
  export_path: ~/.vibe-kanban/loki-tasks/
```

## How It Works

### Task Sync Flow

```
Loki Mode                          Vibe Kanban
    │                                   │
    ├─ Creates task ──────────────────► Task appears on board
    │                                   │
    ├─ Agent claims task ─────────────► Status: "In Progress"
    │                                   │
    │ ◄─────────────────── User pauses ─┤ (optional intervention)
    │                                   │
    ├─ Task completes ────────────────► Status: "Done"
    │                                   │
    └─ Review results ◄─────────────── User reviews diffs
```

### Task Export Format

Loki Mode exports tasks in Vibe Kanban compatible format:

```json
{
  "id": "loki-task-eng-frontend-001",
  "title": "Implement user authentication UI",
  "description": "Create login/signup forms with validation",
  "status": "todo",
  "agent": "claude-code",
  "tags": ["eng-frontend", "phase-4", "priority-high"],
  "metadata": {
    "lokiPhase": "DEVELOPMENT",
    "lokiSwarm": "engineering",
    "lokiAgent": "eng-frontend",
    "createdAt": "2025-01-15T10:00:00Z"
  }
}
```

### Mapping Loki Phases to Kanban Columns

| Loki Phase | Kanban Column |
|------------|---------------|
| BOOTSTRAP | Backlog |
| DISCOVERY | Planning |
| ARCHITECTURE | Planning |
| INFRASTRUCTURE | In Progress |
| DEVELOPMENT | In Progress |
| QA | Review |
| DEPLOYMENT | Deploying |
| BUSINESS_OPS | Done |
| GROWTH | Done |

## Export Script

Add this to export Loki Mode tasks to Vibe Kanban:

```bash
#!/bin/bash
# scripts/export-to-vibe-kanban.sh

LOKI_DIR=".loki"
EXPORT_DIR="${VIBE_KANBAN_DIR:-~/.vibe-kanban/loki-tasks}"

mkdir -p "$EXPORT_DIR"

# Export pending tasks
if [ -f "$LOKI_DIR/queue/pending.json" ]; then
    python3 << EOF
import json
import os

with open("$LOKI_DIR/queue/pending.json") as f:
    tasks = json.load(f)

export_dir = os.path.expanduser("$EXPORT_DIR")

for task in tasks:
    vibe_task = {
        "id": f"loki-{task['id']}",
        "title": task.get('payload', {}).get('description', task['type']),
        "description": json.dumps(task.get('payload', {}), indent=2),
        "status": "todo",
        "agent": "claude-code",
        "tags": [task['type'], f"priority-{task.get('priority', 5)}"],
        "metadata": {
            "lokiTaskId": task['id'],
            "lokiType": task['type'],
            "createdAt": task.get('createdAt', '')
        }
    }

    with open(f"{export_dir}/{task['id']}.json", 'w') as out:
        json.dump(vibe_task, out, indent=2)

print(f"Exported {len(tasks)} tasks to {export_dir}")
EOF
fi
```

## Real-Time Sync (Advanced)

For real-time sync, run the watcher alongside Loki Mode:

```bash
#!/bin/bash
# scripts/vibe-sync-watcher.sh

LOKI_DIR=".loki"

# Watch for queue changes and sync
while true; do
    # Use fswatch on macOS, inotifywait on Linux
    if command -v fswatch &> /dev/null; then
        fswatch -1 "$LOKI_DIR/queue/"
    else
        inotifywait -e modify,create "$LOKI_DIR/queue/" 2>/dev/null
    fi

    ./scripts/export-to-vibe-kanban.sh
    sleep 2
done
```

## Benefits of Combined Usage

### 1. Visual Progress Tracking
See all active Loki agents as tasks moving across your kanban board.

### 2. Safe Isolation
Vibe Kanban runs each agent in isolated git worktrees, perfect for Loki's parallel development.

### 3. Human-in-the-Loop Option
Pause autonomous execution, review changes visually, then resume.

### 4. Multi-Project Dashboard
If running Loki Mode on multiple projects, see all in one Vibe Kanban instance.

## Comparison: When to Use What

| Scenario | Recommendation |
|----------|----------------|
| Fully autonomous, no monitoring | Loki Mode + Wrapper only |
| Need visual progress dashboard | Add Vibe Kanban |
| Want manual task prioritization | Use Vibe Kanban to reorder |
| Code review before merge | Use Vibe Kanban's diff viewer |
| Multiple concurrent PRDs | Vibe Kanban for project switching |

## Future Integration Ideas

- [ ] Bidirectional sync (Vibe → Loki)
- [ ] Vibe Kanban MCP server for agent communication
- [ ] Shared agent profiles between tools
- [ ] Unified logging dashboard
