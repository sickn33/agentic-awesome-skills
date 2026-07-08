# Durability Patterns for Agent Harness

> "The 100th tool call is where agents fail. Non-trivial agent tasks involve dozens to hundreds of tool calls. Context windows fill up, summarization kicks in, and the agent quietly forgets something essential."

This reference documents patterns for building durable agent infrastructure — harnesses that survive failures, manage context across long sessions, and maintain agent effectiveness over extended workstreams.

Advanced profile only. Load this reference only when the user explicitly requests resumable
execution, checkpoints, durable state, long-running agent orchestration, or long-term memory. Do
not create `harness/state`, `harness/checkpoints`, or `harness/memory` as part of the default core
harness.

## 1. The Durability Problem

### Why Agents Drift

| Phase | Tool Calls | Context State | Risk |
|-------|-----------|---------------|------|
| Start (0-20) | Fresh | Full context available | Low |
| Middle (20-50) | Active | Context filling up | Medium |
| Extended (50-100) | Sustained | Summarization active | High |
| Long-running (100+) | Many | Critical details lost | Very High |

### Symptoms of Context Drift

- Agent forgets initial requirements
- Repeated attempts at already-completed tasks
- Contradictory decisions compared to earlier choices
- "Hallucinating" APIs or file structures that don't exist
- Losing track of what's changed vs. what's remaining

## 2. Context Engineering Strategies

### Strategy 1: Progressive Summarization

**When to use:** Context window approaching 50% capacity

**Implementation:**
```json
// harness/state/context-summary.json
{
  "task_id": "implement-auth-flow",
  "phase": "execution",
  "completed_steps": [
    {"step": 1, "summary": "Created UserService interface in types/user.go:15-30"},
    {"step": 2, "summary": "Implemented DefaultUserService in core/user.go:20-80"},
    {"step": 3, "summary": "Added JWT middleware in api/middleware/auth.go"}
  ],
  "current_step": 4,
  "remaining_steps": ["Add tests", "Update ARCHITECTURE.md"],
  "critical_context": {
    "architecture_layer": "L2 (Core)",
    "key_interfaces": ["UserService", "AuthProvider"],
    "validation_command": "make lint-arch && go test ./..."
  },
  "timestamp": "2026-03-23T10:30:00Z"
}
```

**Agent instruction in exec-plan:**
```markdown
## Context Management

After completing each major step:
1. Update `harness/state/context-summary.json` with step summary
2. Prune verbose details from working memory
3. Keep only: current file being edited, validation commands, critical constraints

If context feels unclear, re-read:
- AGENTS.md (navigation)
- harness/state/context-summary.json (progress)
- Current step details in this exec-plan
```

### Strategy 2: State Offloading

**When to use:** Multi-phase tasks with intermediate artifacts

**File structure:**
```
harness/
├── state/
│   ├── current-task.json      # What the agent is doing now
│   ├── context-summary.json   # Summarized progress
│   └── decisions.json         # Key decisions made (for consistency)
├── checkpoints/
│   ├── phase-1-complete.json  # Snapshot after phase 1
│   ├── phase-2-complete.json  # Snapshot after phase 2
│   └── latest.json            # Symlink to most recent checkpoint
└── artifacts/
    └── generated/             # Intermediate files the agent produced
```

**Decision log format:**
```json
// harness/state/decisions.json
{
  "decisions": [
    {
      "id": "D001",
      "timestamp": "2026-03-23T09:00:00Z",
      "context": "Choosing authentication method",
      "decision": "JWT with refresh tokens",
      "rationale": "Stateless, works with microservices architecture",
      "alternatives_rejected": ["Sessions (stateful)", "OAuth only (too complex for MVP)"]
    },
    {
      "id": "D002",
      "timestamp": "2026-03-23T09:30:00Z",
      "context": "Where to put auth middleware",
      "decision": "api/middleware/auth.go",
      "rationale": "Follows existing middleware pattern in api/middleware/",
      "alternatives_rejected": ["internal/auth/ (wrong layer)"]
    }
  ]
}
```

### Strategy 3: Task Isolation via Sub-Agents

**When to use:** Independent subtasks that don't need full context

**Pattern:**
```markdown
## Phase 3: Parallel Work

### 3.1 Test Writing (spawn sub-agent)
**Context needed:** UserService interface, existing test patterns
**Context NOT needed:** Implementation details of phases 1-2
**Output:** test files in internal/core/*_test.go

### 3.2 Documentation Update (spawn sub-agent)
**Context needed:** Public API changes, ARCHITECTURE.md
**Context NOT needed:** Internal implementation decisions
**Output:** Updated docs/design-docs/auth.md
```

**Sub-agent context injection:**
```json
{
  "task": "write-tests-for-userservice",
  "minimal_context": {
    "interface_file": "internal/types/user.go",
    "test_patterns_file": "internal/core/example_test.go",
    "output_directory": "internal/core/",
    "validation": "go test ./internal/core/..."
  },
  "excluded_context": ["implementation details", "other phases", "decision history"]
}
```

### Strategy 4: Checkpoint Resumption

**When to use:** Tasks that may be interrupted (restarts, errors, timeouts)

**Checkpoint schema:**
```json
// harness/checkpoints/phase-2-complete.json
{
  "checkpoint_id": "cp-20260323-103000",
  "task_id": "implement-auth-flow",
  "phase_completed": 2,
  "timestamp": "2026-03-23T10:30:00Z",

  "state_snapshot": {
    "files_created": ["internal/types/user.go", "internal/core/user.go"],
    "files_modified": ["go.mod"],
    "validation_status": {"build": "pass", "lint": "pass", "test": "pass"}
  },

  "resume_instructions": {
    "next_phase": 3,
    "context_to_reload": ["AGENTS.md", "docs/exec-plans/active/auth-flow.md"],
    "state_to_restore": "harness/state/context-summary.json",
    "first_step": "Run validation to confirm state is intact"
  },

  "critical_invariants": [
    "UserService interface must have GetUser, CreateUser, UpdateUser methods",
    "All new code must be in L2 (Core) layer"
  ]
}
```

**Resume flow:**
```markdown
## Resumption Protocol

If resuming from checkpoint:

1. Read checkpoint file: `harness/checkpoints/latest.json`
2. Verify state is intact:
   ```bash
   make lint-arch && go build ./...
   ```
3. If verification fails:
   - Check which files are corrupted
   - Restore from checkpoint's expected state
   - Re-run from last known good state
4. If verification passes:
   - Load context from checkpoint's `context_to_reload`
   - Continue from `next_phase`
```

## 3. Memory Architecture

> "A vector database alone is not memory. That's like giving someone a filing cabinet and calling it a brain."

### Three Types of Agent Memory

| Type | What It Stores | How to Implement | When to Access |
|------|---------------|------------------|----------------|
| **Episodic** | What happened | `harness/memory/episodes/` — timestamped event logs | When debugging why something went wrong |
| **Semantic** | What I know | `harness/memory/knowledge/` — facts about this codebase | Before making architectural decisions |
| **Procedural** | How I do things | `harness/memory/procedures/` — learned workflows | When starting familiar task types |

### Episodic Memory Implementation

```json
// harness/memory/episodes/2026-03-23-auth-implementation.json
{
  "episode_id": "ep-20260323-auth",
  "task": "Implement JWT authentication",
  "outcome": "success",
  "duration_minutes": 45,
  "tool_calls": 87,

  "key_events": [
    {
      "timestamp": "2026-03-23T09:15:00Z",
      "event": "lint_failure",
      "details": "Attempted to import core/config from types/user.go",
      "resolution": "Moved config-dependent logic to core/user.go",
      "lesson": "Layer 0 (types/) cannot import Layer 2 (core/)"
    },
    {
      "timestamp": "2026-03-23T09:45:00Z",
      "event": "test_failure",
      "details": "TestGetUser failed: expected mock to be called",
      "resolution": "Added missing dependency injection in test setup",
      "lesson": "Always use constructor injection for testability"
    }
  ],

  "patterns_discovered": [
    "This codebase uses constructor injection, not field injection",
    "Test files should mirror source file structure"
  ]
}
```

### Semantic Memory Implementation

```json
// harness/memory/knowledge/codebase-facts.json
{
  "updated": "2026-03-23T10:00:00Z",

  "architecture": {
    "layers": ["L0: types/", "L1: utils/", "L2: core/", "L3: api/, cmd/"],
    "forbidden_imports": "Lower layers cannot import higher layers",
    "key_interfaces": ["UserService", "AuthProvider", "Logger"]
  },

  "conventions": {
    "naming": "camelCase for variables, PascalCase for exported",
    "testing": "Table-driven tests, testify for assertions",
    "error_handling": "Wrap errors with fmt.Errorf, use typed errors from errors/"
  },

  "gotchas": [
    "chi router middleware order matters — auth before logging",
    "Database migrations must be idempotent",
    "Config is loaded once at startup, not reloaded"
  ]
}
```

### Procedural Memory Implementation

```json
// harness/memory/procedures/add-new-endpoint.json
{
  "procedure": "Add a new API endpoint",
  "last_used": "2026-03-22",
  "success_rate": "4/4",

  "steps": [
    {"step": 1, "action": "Define types in internal/types/", "notes": "Keep Layer 0 pure"},
    {"step": 2, "action": "Implement business logic in internal/core/", "notes": "Use interfaces for deps"},
    {"step": 3, "action": "Add handler in api/handlers/", "notes": "Follow existing handler patterns"},
    {"step": 4, "action": "Register route in api/routes.go", "notes": "Check middleware ordering"},
    {"step": 5, "action": "Write tests for each layer", "notes": "Use table-driven tests"},
    {"step": 6, "action": "Update docs/references/api.md", "notes": "Include request/response examples"}
  ],

  "validation": "make lint-arch && go test ./... && make build"
}
```

## 4. Goal Management

Real agents don't just respond to prompts — they pursue outcomes. A harness should support goal tracking, progress monitoring, and intelligent escalation.

### Goal Tracking Structure

```json
// harness/state/goals.json
{
  "primary_goal": {
    "id": "G001",
    "description": "Implement user authentication with JWT",
    "success_criteria": [
      "Users can register with email/password",
      "Users can log in and receive JWT",
      "Protected endpoints reject invalid tokens",
      "All tests pass"
    ],
    "status": "in_progress",
    "progress": "75%"
  },

  "subgoals": [
    {"id": "G001.1", "description": "Create user types", "status": "completed"},
    {"id": "G001.2", "description": "Implement user service", "status": "completed"},
    {"id": "G001.3", "description": "Add JWT middleware", "status": "completed"},
    {"id": "G001.4", "description": "Write tests", "status": "in_progress"},
    {"id": "G001.5", "description": "Update documentation", "status": "pending"}
  ],

  "blockers": [],

  "escalation_triggers": [
    {"condition": "3+ failures on same step", "action": "Report blocker to user"},
    {"condition": "Goal unchanged for 30 minutes", "action": "Check if stuck"},
    {"condition": "Dependencies missing", "action": "Request clarification"}
  ]
}
```

### When to Escalate

| Signal | Interpretation | Action |
|--------|---------------|--------|
| 3+ lint failures same rule | Possible misunderstanding | Re-read architecture docs, if still failing → escalate |
| Test passing then failing | Regression introduced | Review recent changes, if unclear → escalate |
| Unclear requirements | Ambiguity in task | Document uncertainty, ask user for clarification |
| Conflicting constraints | Impossible task | Report constraint conflict, propose alternatives |
| Progress stalled | Stuck or context lost | Resume from checkpoint, if still stuck → escalate |

### Good Agent Behavior: Restraint

> "Good agent behavior is often about restraint, not verbosity."

**Example from Hugo's article:** An agent detected stress signals (urgency, fragmented input) and instead of a detailed response, sent a simple emoji check-in.

**Harness implication:** Include signals for when to simplify:
- User seems rushed → shorter responses, focus on essentials
- Many rapid corrections → agent may be overcomplicating
- Explicit "just do it" → minimize explanation, maximize action

## 5. Harness Directory Structure for Durability

```
harness/
├── eval/              # Eval framework (existing)
├── trace/             # Observability (existing)
├── state/             # Current task state
│   ├── current-task.json
│   ├── context-summary.json
│   ├── decisions.json
│   └── goals.json
├── checkpoints/       # Resumption points
│   ├── latest.json -> phase-2-complete.json
│   └── phase-*.json
├── memory/            # Agent learning
│   ├── episodes/      # What happened (episodic)
│   ├── knowledge/     # What I know (semantic)
│   └── procedures/    # How I do things (procedural)
└── metrics/           # Performance tracking
    └── task-completion-times.json
```

## 6. Integration with Exec-Plans

Every exec-plan should include durability sections:

```markdown
## Durability Configuration

### Context Management
- **Summary interval:** After each phase
- **Offload location:** harness/state/context-summary.json
- **Critical context:** Layer constraints, validation commands

### Checkpoints
- **Save after:** Each phase completion
- **Location:** harness/checkpoints/
- **Resume from:** Latest checkpoint if interrupted

### Memory Updates
- **Episodic:** Log significant events (failures, key decisions)
- **Semantic:** Update if new codebase facts discovered
- **Procedural:** Update if workflow variation proven successful

### Escalation Triggers
- 3+ failures on same step → Report blocker
- Unclear requirement → Ask user
- Conflicting constraints → Propose alternatives
```

---

## Summary: The Durable Agent Checklist

When designing a harness, verify:

- [ ] **Context engineering:** Does the harness manage context for long sessions?
- [ ] **State persistence:** Can tasks survive restarts and failures?
- [ ] **Checkpoint resumption:** Can agents resume from intermediate states?
- [ ] **Memory architecture:** Does the harness help agents learn across sessions?
- [ ] **Goal tracking:** Does the harness support goal pursuit, not just prompt response?
- [ ] **Escalation paths:** Does the harness know when to ask for help?
- [ ] **Trajectory capture:** Does every run produce usable training data?
