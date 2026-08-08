# dbos-golang

> **Note:** `CLAUDE.md` is a symlink to this file.

## Overview

DBOS Go SDK for building reliable, fault-tolerant applications with durable workflows. Use this skill when writing Go code with DBOS, creating workflows and steps, using queues, using the DBOS Client from external applications, or building Go applications that need to be resilient to failures.

## Structure

```
dbos-golang/
  SKILL.md       # Main skill file - read this first
  AGENTS.md      # This navigation guide
  CLAUDE.md      # Symlink to AGENTS.md
  references/    # Detailed reference files
```

## Usage

1. Read `SKILL.md` for the main skill instructions
2. Browse `references/` for detailed documentation on specific topics
3. Reference files are loaded on-demand - read only what you need

## Reference Categories

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Lifecycle | CRITICAL | `lifecycle-` |
| 2 | Workflow | CRITICAL | `workflow-` |
| 3 | Step | HIGH | `step-` |
| 4 | Queue | HIGH | `queue-` |
| 5 | Communication | MEDIUM | `comm-` |
| 6 | Pattern | MEDIUM | `pattern-` |
| 7 | Testing | LOW-MEDIUM | `test-` |
| 8 | Client | MEDIUM | `client-` |
| 9 | Advanced | LOW | `advanced-` |

Reference files are named `{prefix}-{topic}.md` (e.g., `query-missing-indexes.md`).

## Available References

**Advanced** (`advanced-`):
- `references/advanced-patching.md`
- `references/advanced-versioning.md`

**Client** (`client-`):
- `references/client-enqueue.md`
- `references/client-setup.md`

**Communication** (`comm-`):
- `references/comm-events.md`
- `references/comm-messages.md`
- `references/comm-streaming.md`

**Lifecycle** (`lifecycle-`):
- `references/lifecycle-config.md`

**Pattern** (`pattern-`):
- `references/pattern-debouncing.md`
- `references/pattern-idempotency.md`
- `references/pattern-scheduled.md`
- `references/pattern-sleep.md`

**Queue** (`queue-`):
- `references/queue-basics.md`
- `references/queue-concurrency.md`
- `references/queue-deduplication.md`
- `references/queue-listening.md`
- `references/queue-partitioning.md`
- `references/queue-priority.md`
- `references/queue-rate-limiting.md`

**Step** (`step-`):
- `references/step-basics.md`
- `references/step-concurrency.md`
- `references/step-retries.md`

**Testing** (`test-`):
- `references/test-setup.md`

**Workflow** (`workflow-`):
- `references/workflow-background.md`
- `references/workflow-constraints.md`
- `references/workflow-control.md`
- `references/workflow-determinism.md`
- `references/workflow-introspection.md`
- `references/workflow-timeout.md`

---

*29 reference files across 9 categories*