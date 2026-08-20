# Canonical Project-State Schema

Use the smallest structure that remains easy to load and reason about.

## Compact mode: `PROJECT_STATE.md`

```markdown
# Project State

## Mission
[Why the project exists. Long-lived.]

## Success Criteria
[Owner-defined durable criteria for meaningful project success.]

## Current Phase
[Current engineering/product/research phase.]

## Active Workstreams
### [Workstream ID or name]
- Status: PLANNED | ACTIVE | BLOCKED | PAUSED
- Goal: ...
- DoD / exit condition: ...
- Current state: ...
- Next: ...

## Milestones
### [Milestone ID or name]
- Status: PROPOSED | ACTIVE | BLOCKED | DONE | DEFERRED
- Goal: ...
- DoD: ...
- Parent: ...
- Next: ...

## Current Tasks
### [Task ID or name]
- Status: PROPOSED | ACTIVE | BLOCKED | DEFERRED
- Goal: ...
- Task DoD: ...
- Parent: ...
- Evidence: ... [only when useful]
- Confidence: CONFIRMED | INFERRED | UNKNOWN [only when useful]

## Active Research / Experiments
### [Hypothesis or candidate ID]
- Status: PROPOSED | ACTIVE | SUPPORTED | REJECTED | INCONCLUSIVE | INVALIDATED | FORWARD_ONLY
- Hypothesis: ...
- Protocol / stage: ...
- Current evidence: ...
- Provenance: ... [experiment/manifest ID when material]
- Next authorized step: ...

## Decisions
### [Decision ID or concise title]
- Decision: ...
- Rationale: ...
- Authority / provenance: ... [when material]

## Constraints / Invariants
- ...

## Known Issues / Blockers
- ...

## Deferred Work
- ...

## Negative Evidence / Rejected Directions
- [what] — [why] — [evidence] — [permanent or conditional]

## Lessons / Pitfalls
- [validated recurring mistake or owner correction worth preserving]

## Recent Milestones
- [date/commit only when useful] ...
```

## Scaled mode

Use only when compact mode causes context bloat or unrelated subsystem loading.

```text
.project/
  MANIFEST.md
  STATE.md
  DECISIONS.md
  CONSTRAINTS.md
  NEGATIVE_EVIDENCE.md
  areas/
    <subsystem>.md
```

### `.project/MANIFEST.md`
Keep it short. It is the routing index, not a summary dump.

```markdown
# Project Memory Manifest

## Read First
- STATE.md — mission, phase, active workstreams, active tasks, blockers, next actions

## Read When Relevant
- DECISIONS.md — durable owner/project decisions
- CONSTRAINTS.md — technical/business/research invariants
- NEGATIVE_EVIDENCE.md — costly rejected directions and important lessons
- areas/execution.md — execution subsystem state
- areas/research.md — research subsystem state
```

### `.project/STATE.md`
Contain mission, success criteria, phase, active workstreams, milestones, active tasks, blockers, and next direction. Keep it sufficient for a fast cold start.

### `DECISIONS.md`
Store only durable decisions that materially constrain future work.

### `CONSTRAINTS.md`
Store only constraints/invariants future agents must respect.

### `NEGATIVE_EVIDENCE.md`
Store concise costly failures, rejected directions, and validated lessons likely to prevent repeated work.

### `areas/*.md`
Use only for large independent subsystems. Do not duplicate global mission or global decisions inside area files.

## Provenance rule

Add provenance only when it materially improves trust. Prefer concise references:

- owner decision / issue ID;
- commit SHA;
- test name/result;
- contract/schema path;
- experiment or manifest ID.

## Confidence rule

Use:

- `CONFIRMED` for directly supported authoritative facts;
- `INFERRED` for provisional interpretation;
- `UNKNOWN` when evidence is insufficient.

Do not represent `INFERRED` as settled truth.

## Completion hierarchy

Track completion at the correct level:

- Session DoD
- Task DoD
- Milestone DoD
- Workstream DoD
- Mission success criteria

A child completing does not automatically complete its parent.

## Compression rule

When state grows, remove or compress detail that is no longer decision-relevant. Git is the historical archive.
