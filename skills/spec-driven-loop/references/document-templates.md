# Specification Document Templates

Use the repository's existing document style when it is stricter. These templates define document ownership and minimum fields, not mandatory prose. Keep each fact in its owning document and reference stable FR, AC, Task, and Loop IDs elsewhere.

## `PRD.md`

Owns product intent, behavior, scope, assumptions, and product decisions. It does not own implementation design or verification evidence.

```markdown
# <Feature> Product Requirements

Status: Draft | Frozen
Owner:
Last updated:
Approval: Pending | Approved by <user> on <date>

## Problem and Context
## Users and Stakeholders
## Product Goals
## Success Metrics
| Metric | Baseline | Target | Measurement window/source |

## User Flows
## Functional Requirements
| FR ID | Requirement | Priority | Status | Notes |
| FR-001 | <observable product behavior> | Must | Draft | |

## Business Rules
## Data Lifecycle
## In Scope
## Out of Scope
## Non-goals
## Assumptions
| ID | Assumption | Risk | Validation plan | Status |

## Open Product Decisions
| Decision ID | Dependency | Options | Recommendation | Impacted FRs | Status |

## Decision Log
| Decision ID | Decision | Rationale | Decider/date | Impacted FRs |
```

## `TECH_DESIGN.md`

Owns the implementation design for frozen product requirements. Reference FRs rather than restating product behavior; keep pass/fail proof in `ACCEPTANCE.md`.

```markdown
# <Feature> Technical Design

Status: Draft | Frozen
Based on PRD version/date:
Owner:
Approval: Pending | Approved by <user> on <date>

## Current System State
## Overall Approach
## Modules and Responsibilities
| Module | Responsibility | Related FRs | Owned contracts |

## Interface Contracts
## Data Model and Migration
## State Transitions
## Concurrency, Consistency, and Idempotency
## Authentication, Authorization, Privacy, and Security
## Failures, Retry, Recovery, and Degradation
## Performance and Capacity
## Observability: Logs, Metrics, and Alerts
## Compatibility
## Release and Rollback
## Test Boundaries
## Alternatives Considered
## Blocked Technical Issues
| Issue | Product dependency | Impact | Status |

## Technical Decision Log
| Decision ID | Decision | Alternatives | Rationale | Related FRs |
```

## `ACCEPTANCE.md`

Owns observable pass/fail behavior and evidence. Reference FR and design IDs; do not repeat full requirements or implementation plans.

```markdown
# <Feature> Acceptance Contract

Status: Draft | Frozen
Based on PRD/Tech Design version/date:
Approval: Pending | Approved by <user> on <date>

## Scope Boundaries
### In Scope
### Out of Scope
### Non-goals
### Deferred
### Assumptions
### Release Blockers
### Definition of Done

## Acceptance Criteria
### AC-001 — <observable outcome>
- Related FRs: FR-001
- Blocking: Yes | No
- Scenario:
- Preconditions:
- Action/event:
- Expected result:
- Required evidence:

## Coverage Map
| FR ID | AC IDs | Coverage notes |
```

## `AGENT_PLAN.md`

Owns approved execution slices, dependencies, and file ownership. Reference frozen FR/AC IDs; do not redefine scope or acceptance.

```markdown
# <Feature> Agent Plan

Status: Draft | Frozen
Specification approval reference:
Shared contracts frozen at version/commit:
Plan owner: Main agent

## Frozen Shared Contracts
| Contract/type/schema | Location | Owner | Change approval rule |

## Dependency Graph
## Ownership Map
| Task ID | Allowed paths | Forbidden paths | Overlap check |

## Tasks
### TASK-001 — <vertical outcome>
- Objective:
- Related FRs:
- Related ACs:
- Inputs:
- Dependencies:
- Allowed files/directories:
- Forbidden files/directories:
- Required outputs:
- Required checks:
- Required evidence:
- Stop and report when:

## Integration Order
## Main-Agent Validation Plan
```

## `LOOP.md`

Owns recoverable current execution state and append-only attempt history. It references frozen documents and IDs instead of copying them.

```markdown
# <Feature> Delivery Loop

Current state: drafting | grilling | awaiting-spec-approval | ready | implementing | judging | changes-requested | blocked | accepted
Current loop: LOOP-001
Frozen specification: <paths and version/commit>
Current objective:
Blocking issue:
Next action:
Last updated:

## Current Loop — LOOP-001
- Objective:
- Related FRs/ACs:
- Agent assignments:
- Dependencies:
- Outputs:
- Files changed:
- Commands/checks executed:
- Results:
- Evidence:
- Main-agent judgment: Pending | ACCEPTED | CHANGES_REQUESTED | BLOCKED | ACCEPTED_WITH_CAVEATS
- Failure conditions observed:
- Rework requirements:
- Unresolved risks:
- Next state:
- Next action:

## Prior Loops
<!-- Append completed or failed loops here without deleting or rewriting their evidence. -->
```
