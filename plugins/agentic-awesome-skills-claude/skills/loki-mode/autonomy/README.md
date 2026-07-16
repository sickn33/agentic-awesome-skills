# Loki Mode - Autonomous Runner

Single script that handles everything: prerequisites, setup, Vibe Kanban monitoring, and autonomous execution with auto-resume.

## Quick Start

```bash
# Run with a PRD
./autonomy/run.sh ./docs/requirements.md

# Run interactively
./autonomy/run.sh
```

That's it! The script will:
1. Check all prerequisites (Claude CLI, Python, Git, etc.)
2. Verify skill installation
3. Initialize the `.loki/` directory
4. **Start Vibe Kanban background sync** (monitor tasks in real-time)
5. Start Claude Code with **live output** (no more waiting blindly)
6. Auto-resume on rate limits or interruptions
7. Continue until completion or max retries

## Live Output

Claude's output is displayed in real-time - you can see exactly what's happening:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CLAUDE CODE OUTPUT (live)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Claude's output appears here in real-time...]
```

## Status Monitor (Built-in)

The runner updates `.loki/STATUS.txt` every 5 seconds with task progress:

```
╔════════════════════════════════════════════════════════════════╗
║                    LOKI MODE STATUS                            ║
╚════════════════════════════════════════════════════════════════╝

Updated: Sat Dec 28 15:30:00 PST 2025

Phase: DEVELOPMENT

Tasks:
  ├─ Pending:     10
  ├─ In Progress: 1
  ├─ Completed:   5
  └─ Failed:      0

Monitor: watch -n 2 cat .loki/STATUS.txt
```

### Monitor in Another Terminal

```bash
# Watch status updates live
watch -n 2 cat .loki/STATUS.txt

# Or view once
cat .loki/STATUS.txt
```

## What Gets Checked

| Prerequisite | Required | Notes |
|--------------|----------|-------|
| Claude Code CLI | Yes | Install from https://claude.ai/code |
| Python 3 | Yes | For state management |
| Git | Yes | For version control |
| curl | Yes | For web fetches |
| Node.js | No | Needed for some builds |
| jq | No | Helpful for JSON parsing |

## Configuration

Environment variables:

```bash
# Retry settings
export LOKI_MAX_RETRIES=50      # Max retry attempts (default: 50)
export LOKI_BASE_WAIT=60        # Base wait time in seconds (default: 60)
export LOKI_MAX_WAIT=3600       # Max wait time in seconds (default: 3600)

# Skip prerequisite checks (for CI/CD or repeat runs)
export LOKI_SKIP_PREREQS=true

# Run with custom settings
LOKI_MAX_RETRIES=100 LOKI_BASE_WAIT=120 ./autonomy/run.sh ./docs/prd.md
```

## How Auto-Resume Works

```
┌─────────────────────────────────────────────────────────────┐
│  ./autonomy/run.sh prd.md                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Check Prerequisites  │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Initialize .loki/    │
              └───────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │  Run Claude Code with prompt   │◄────────────────┐
         └────────────────────────────────┘                 │
                          │                                 │
                          ▼                                 │
              ┌───────────────────────┐                     │
              │  Claude exits         │                     │
              └───────────────────────┘                     │
                          │                                 │
              ┌───────────┴───────────┐                     │
              ▼                       ▼                     │
      ┌───────────────┐       ┌───────────────┐             │
      │  Completed?   │──Yes──│   SUCCESS!    │             │
      └───────────────┘       └───────────────┘             │
              │ No                                          │
              ▼                                             │
      ┌───────────────┐                                     │
      │ Wait (backoff)│─────────────────────────────────────┘
      └───────────────┘
```

## State Files

The autonomy runner creates:

```
.loki/
├── autonomy-state.json    # Runner state (retry count, status)
├── logs/
│   └── autonomy-*.log     # Execution logs
├── state/
│   └── orchestrator.json  # Loki Mode phase tracking
└── COMPLETED              # Created when done
```

## Resuming After Interruption

If you stop the script (Ctrl+C) or it crashes, just run it again:

```bash
# State is saved, will resume from last checkpoint
./autonomy/run.sh ./docs/requirements.md
```

The script detects the previous state and continues from where it left off.

## Differences from Manual Mode

| Feature | Manual Mode | Autonomy Mode |
|---------|-------------|---------------|
| Start | `claude --dangerously-skip-permissions` | `./autonomy/run.sh` |
| Prereq check | Manual | Automatic |
| Rate limit handling | Manual restart | Auto-resume |
| State persistence | Manual checkpoint | Automatic |
| Logging | Console only | Console + file |
| Max runtime | Session-based | Configurable retries |

## Troubleshooting

### "Claude Code CLI not found"
```bash
npm install -g @anthropic-ai/claude-code
# or visit https://claude.ai/code
```

### "SKILL.md not found"
Make sure you're running from the loki-mode directory or have installed the skill:
```bash
# Option 1: Run from project directory
cd /path/to/loki-mode
./autonomy/run.sh

# Option 2: Install skill globally
cp -r . ~/.claude/skills/loki-mode/
```

### "Max retries exceeded"
The task is taking too long or repeatedly failing. Check:
```bash
# View logs
cat .loki/logs/autonomy-*.log | tail -100

# Check orchestrator state
cat .loki/state/orchestrator.json

# Increase retries
LOKI_MAX_RETRIES=200 ./autonomy/run.sh ./docs/prd.md
```
