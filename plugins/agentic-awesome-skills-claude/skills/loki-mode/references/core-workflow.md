# Core Workflow Reference

Full RARV cycle, CONTINUITY.md template, and autonomy rules.

---

## Autonomy Rules

**This system runs with ZERO human intervention.**

### Core Rules
1. **NEVER ask questions** - Do not say "Would you like me to...", "Should I...", or "What would you prefer?"
2. **NEVER wait for confirmation** - Take immediate action. If something needs to be done, do it.
3. **NEVER stop voluntarily** - Continue until completion promise is fulfilled or max iterations reached
4. **NEVER suggest alternatives** - Pick the best option and execute. No "You could also..." or "Alternatively..."
5. **ALWAYS use RARV cycle** - Every action follows the Reason-Act-Reflect-Verify pattern

---

## RARV Cycle (Reason-Act-Reflect-Verify)

**Enhanced with Automatic Self-Verification Loop (Boris Cherny Pattern)**

Every iteration follows this cycle:

```
+-------------------------------------------------------------------+
| REASON: What needs to be done next?                               |
| - READ .loki/CONTINUITY.md first (working memory)                 |
| - READ "Mistakes & Learnings" to avoid past errors                |
| - Check current state in .loki/state/orchestrator.json            |
| - Review pending tasks in .loki/queue/pending.json                |
| - Identify highest priority unblocked task                        |
| - Determine exact steps to complete it                            |
+-------------------------------------------------------------------+
| ACT: Execute the task                                             |
| - Dispatch subagent via Task tool OR execute directly             |
| - Write code, run tests, fix issues                               |
| - Commit changes atomically (git checkpoint)                      |
| - Update queue files (.loki/queue/*.json)                         |
+-------------------------------------------------------------------+
| REFLECT: Did it work? What next?                                  |
| - Verify task success (tests pass, no errors)                     |
| - UPDATE .loki/CONTINUITY.md with progress                        |
| - Update orchestrator state                                       |
| - Check completion promise - are we done?                         |
| - If not done, loop back to REASON                                |
+-------------------------------------------------------------------+
| VERIFY: Let AI test its own work (2-3x quality improvement)       |
| - Run automated tests (unit, integration, E2E)                    |
| - Check compilation/build (no errors or warnings)                 |
| - Verify against spec (.loki/specs/openapi.yaml)                  |
| - Run linters/formatters via post-write hooks                     |
| - Browser/runtime testing if applicable                           |
|                                                                   |
| IF VERIFICATION FAILS:                                            |
|   1. Capture error details (stack trace, logs)                    |
|   2. Analyze root cause                                           |
|   3. UPDATE CONTINUITY.md "Mistakes & Learnings"                  |
|   4. Rollback to last good git checkpoint (if needed)             |
|   5. Apply learning and RETRY from REASON                         |
|                                                                   |
| - If verification passes, mark task complete and continue         |
+-------------------------------------------------------------------+
```

**Key Enhancement:** The VERIFY step creates a feedback loop where the AI:
- Tests every change automatically
- Learns from failures by updating CONTINUITY.md
- Retries with learned context
- Achieves 2-3x quality improvement (Boris Cherny's observed result)

---

## CONTINUITY.md - Working Memory Protocol

**CRITICAL:** You have a persistent working memory file at `.loki/CONTINUITY.md` that maintains state across all turns of execution.

### AT THE START OF EVERY TURN:
1. Read `.loki/CONTINUITY.md` to orient yourself to the current state
2. Reference it throughout your reasoning
3. Never make decisions without checking CONTINUITY.md first

### AT THE END OF EVERY TURN:
1. Update `.loki/CONTINUITY.md` with any important new information
2. Record what was accomplished
3. Note what needs to happen next
4. Document any blockers or decisions made

### CONTINUITY.md Template

```markdown
# Loki Mode Working Memory
Last Updated: [ISO timestamp]
Current Phase: [bootstrap|discovery|architecture|development|qa|deployment|growth]
Current Iteration: [number]

## Active Goal
[What we're currently trying to accomplish - 1-2 sentences]

## Current Task
- ID: [task-id from queue]
- Description: [what we're doing]
- Status: [in-progress|blocked|reviewing]
- Started: [timestamp]

## Just Completed
- [Most recent accomplishment with file:line references]
- [Previous accomplishment]
- [etc - last 5 items]

## Next Actions (Priority Order)
1. [Immediate next step]
2. [Following step]
3. [etc]

## Active Blockers
- [Any current blockers or waiting items]

## Key Decisions This Session
- [Decision]: [Rationale] - [timestamp]

## Mistakes & Learnings (Self-Updating)
**CRITICAL:** When errors occur, agents MUST update this section to prevent repeating mistakes.

### Pattern: Error -> Learning -> Prevention
- **What Failed:** [Specific error that occurred]
- **Why It Failed:** [Root cause analysis]
- **How to Prevent:** [Concrete action to avoid this in future]
- **Timestamp:** [When this was learned]
- **Agent:** [Which agent learned this]

### Example:
- **What Failed:** TypeScript compilation error - missing return type annotation
- **Why It Failed:** Express route handlers need explicit `: void` return type in strict mode
- **How to Prevent:** Always add `: void` to route handlers: `(req, res): void =>`
- **Timestamp:** 2026-01-04T00:16:00Z
- **Agent:** eng-001-backend-api

**Self-Update Protocol:**
```
ON_ERROR:
  1. Capture error details (stack trace, context)
  2. Analyze root cause
  3. Write learning to CONTINUITY.md "Mistakes & Learnings"
  4. Update approach based on learning
  5. Retry with corrected approach
```

## Working Context
[Any critical information needed for current work - API keys in use,
architecture decisions, patterns being followed, etc.]

## Files Currently Being Modified
- [file path]: [what we're changing]
```

---

## Memory Hierarchy

The memory systems work together:

1. **CONTINUITY.md** = Working memory (current session state, updated every turn)
2. **ledgers/** = Agent-specific state (checkpointed periodically)
3. **handoffs/** = Agent-to-agent transfers (on agent switch)
4. **learnings/** = Extracted patterns (on task completion)
5. **rules/** = Permanent validated patterns (promoted from learnings)

**CONTINUITY.md is the PRIMARY source of truth for "what am I doing right now?"**

---

## Git Checkpoint System

**CRITICAL:** Every completed task MUST create a git checkpoint for rollback safety.

### Protocol: Automatic Commits After Task Completion

**RULE:** When `task.status == "completed"`, create a git commit immediately.

```bash
# Git Checkpoint Protocol
ON_TASK_COMPLETE() {
    task_id=$1
    task_title=$2
    agent_id=$3

    # Stage modified files
    git add <modified_files>

    # Create structured commit message
    git commit -m "[Loki] ${agent_type}-${task_id}: ${task_title}

${detailed_description}

Agent: ${agent_id}
Parent: ${parent_agent_id}
Spec: ${spec_reference}
Tests: ${test_files}
Git-Checkpoint: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

    # Store commit SHA in task metadata
    commit_sha=$(git rev-parse HEAD)
    update_task_metadata task_id git_commit_sha "$commit_sha"

    # Update CONTINUITY.md
    echo "- Task $task_id completed (commit: $commit_sha)" >> .loki/CONTINUITY.md
}
```

### Commit Message Format

**Template:**
```
[Loki] ${agent_type}-${task_id}: ${task_title}

${detailed_description}

Agent: ${agent_id}
Parent: ${parent_agent_id}
Spec: ${spec_reference}
Tests: ${test_files}
Git-Checkpoint: ${timestamp}
```

**Example:**
```
[Loki] eng-005-backend: Implement POST /api/todos endpoint

Created todo creation endpoint per OpenAPI spec.
- Input validation for title field
- SQLite insertion with timestamps
- Returns 201 with created todo object
- Contract tests passing

Agent: eng-001-backend-api
Parent: orchestrator-main
Spec: .loki/specs/openapi.yaml#/paths/~1api~1todos/post
Tests: backend/tests/todos.contract.test.ts
Git-Checkpoint: 2026-01-04T05:45:00Z
```

### Rollback Strategy

**When to Rollback:**
- Quality gates fail after merge
- Integration tests fail
- Security vulnerabilities detected
- Breaking changes discovered

**Rollback Command:**
```bash
# Find last good checkpoint
last_good_commit=$(git log --grep="\[Loki\].*task-${last_good_task_id}" --format=%H -n 1)

# Rollback to that checkpoint
git reset --hard $last_good_commit

# Update CONTINUITY.md
echo "ROLLBACK: Reset to task-${last_good_task_id} (commit: $last_good_commit)" >> .loki/CONTINUITY.md

# Re-queue failed tasks
move_tasks_to_pending after_task=$last_good_task_id
```

---

## If Subagent Fails

1. Do NOT try to fix manually (context pollution)
2. Dispatch fix subagent with specific error context
3. If fix subagent fails 3x, move to dead letter queue
4. Open circuit breaker for that agent type
5. Alert orchestrator for human review
