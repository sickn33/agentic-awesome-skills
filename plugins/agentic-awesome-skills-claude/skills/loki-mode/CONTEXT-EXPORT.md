# Loki Mode - Conversation Context Export

**Date:** 2025-12-28
**Version:** 2.5.0
**Repository:** https://github.com/asklokesh/loki-mode

---

## Project Overview

**Loki Mode** is a Claude Code skill that provides a multi-agent autonomous startup system. It dynamically orchestrates specialized agents across 6 swarms to take a PRD from idea to fully deployed product. It spawns only the agents needed - from a few for simple projects to 100+ for complex startups.

### Key Features
- 37 specialized agent types across 6 swarms (Engineering, Operations, Business, Data, Product, Growth)
- Dynamic agent scaling based on project complexity
- Task tool for subagent dispatch with fresh context
- Distributed task queue (pending, in-progress, completed, failed, dead-letter)
- Circuit breakers for per-agent failure handling
- Timeout/stuck agent detection with heartbeat monitoring
- State recovery via checkpoints in `.loki/state/`
- Autonomous execution with auto-resume on rate limits

---

## File Structure

```
loki-mode/
├── SKILL.md                    # The main skill file (YAML frontmatter required)
├── VERSION                     # Current version: 2.4.0
├── CHANGELOG.md                # Full version history
├── README.md                   # Main documentation
├── references/
│   ├── agents.md               # 37 agent type definitions
│   ├── deployment.md           # Cloud deployment guides
│   └── business-ops.md         # Business operation workflows
├── examples/
│   ├── simple-todo-app.md      # Simple PRD for testing
│   ├── api-only.md             # Backend-only PRD
│   ├── static-landing-page.md  # Frontend/marketing PRD
│   └── full-stack-demo.md      # Complete bookmark manager PRD
├── tests/
│   ├── run-all-tests.sh        # Main test runner (53 tests)
│   ├── test-bootstrap.sh       # 8 tests
│   ├── test-task-queue.sh      # 8 tests
│   ├── test-circuit-breaker.sh # 8 tests
│   ├── test-agent-timeout.sh   # 9 tests
│   ├── test-state-recovery.sh  # 8 tests
│   └── test-wrapper.sh         # 12 tests
├── scripts/
│   ├── loki-wrapper.sh         # Legacy wrapper (deprecated)
│   └── export-to-vibe-kanban.sh # Optional Vibe Kanban export
├── integrations/
│   └── vibe-kanban.md          # Vibe Kanban integration guide
├── autonomy/
│   ├── run.sh                  # ⭐ MAIN ENTRY POINT - handles everything
│   └── README.md               # Autonomy documentation
└── .github/workflows/
    └── release.yml             # GitHub Actions for releases
```

---

## How to Use

### Quick Start (Recommended)
```bash
./autonomy/run.sh ./docs/requirements.md
```

### What run.sh Does
1. Checks prerequisites (Claude CLI, Python, Git, curl)
2. Verifies skill installation
3. Initializes `.loki/` directory
4. Starts status monitor (updates `.loki/STATUS.txt` every 5s)
5. Runs Claude Code with live output
6. Auto-resumes on rate limits with exponential backoff
7. Continues until completion or max retries

### Monitor Progress
```bash
# In another terminal
watch -n 2 cat .loki/STATUS.txt
```

---

## Key Technical Details

### Claude Code Invocation
The autonomy runner pipes the prompt through stdin for live output:
```bash
echo "$prompt" | claude --dangerously-skip-permissions
```

**Important:** Using `-p` flag doesn't stream output properly. Piping through stdin shows interactive output.

### State Files
- `.loki/state/orchestrator.json` - Current phase, metrics
- `.loki/autonomy-state.json` - Retry count, status, PID
- `.loki/queue/*.json` - Task queues
- `.loki/STATUS.txt` - Human-readable status (updated every 5s)
- `.loki/logs/*.log` - Execution logs

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `LOKI_MAX_RETRIES` | 50 | Max retry attempts |
| `LOKI_BASE_WAIT` | 60 | Base wait time (seconds) |
| `LOKI_MAX_WAIT` | 3600 | Max wait time (1 hour) |
| `LOKI_SKIP_PREREQS` | false | Skip prerequisite checks |

---

## Version History Summary

| Version | Key Changes |
|---------|-------------|
| 2.5.0 | Real streaming output (stream-json), Web dashboard with Anthropic design |
| 2.4.0 | Live output fix (stdin pipe), STATUS.txt monitor |
| 2.3.0 | Unified autonomy runner (`autonomy/run.sh`) |
| 2.2.0 | Vibe Kanban integration |
| 2.1.0 | Autonomous wrapper with auto-resume |
| 2.0.x | Test suite, macOS compatibility, release workflow |
| 1.x.x | Initial skill with agents, deployment guides |

---

## Known Issues & Solutions

### 1. "Blank output when running autonomously"
**Cause:** Using `-p` flag doesn't stream output
**Solution:** Use stdin pipe: `echo "$prompt" | claude --dangerously-skip-permissions`

### 2. "Vibe Kanban not showing tasks"
**Cause:** Vibe Kanban is UI-driven, doesn't read JSON files automatically
**Solution:** Use `.loki/STATUS.txt` for monitoring, or run Vibe Kanban separately

### 3. "timeout command not found on macOS"
**Cause:** macOS doesn't have GNU coreutils
**Solution:** Perl-based fallback in test scripts

### 4. "TTY raw mode error"
**Cause:** Running Claude in non-interactive mode
**Solution:** Latest commit (008ed86) adds `--no-input` flag

---

## Git Configuration

**Committer:** asklokesh (never use Claude as co-author)

**Commit format:**
```
Short description (vX.X.X)

Detailed bullet points of changes
```

---

## Test Suite

Run all tests:
```bash
./tests/run-all-tests.sh
```

53 tests across 6 test suites - all should pass.

---

## Pending/Future Work

1. **Vibe Kanban proper integration** - Vibe Kanban doesn't read files, would need API integration
2. **Better live output** - Current stdin pipe works but may have edge cases
3. **Task visualization** - Could add a simple TUI for task monitoring

---

## Important Files to Read First

When starting a new session, read these files:
1. `SKILL.md` - The actual skill instructions
2. `autonomy/run.sh` - Main entry point
3. `VERSION` and `CHANGELOG.md` - Current state
4. This file (`CONTEXT-EXPORT.md`) - Full context

---

## User Preferences

- Always use `asklokesh` as committer
- Never use Claude as co-author
- Keep skill files clean, autonomy separate
- Test before pushing
- Live output is important - user wants to see what's happening

---

## Last Known State

- **Version:** 2.5.0
- **Latest Commit:** (pending push)
- **Tests:** All 53 passing
- **Features Added:** Real-time streaming output via stream-json, web dashboard with Anthropic design
