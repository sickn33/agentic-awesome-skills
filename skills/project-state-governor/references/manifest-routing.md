# Manifest Routing for Large Projects

Use scaled mode only when a single `PROJECT_STATE.md` is no longer efficient.

## Trigger conditions

Consider scaled mode when one or more are repeatedly true:

- agents must read large irrelevant sections to work on one subsystem;
- decisions/constraints substantially outgrow active-state information;
- unrelated research and engineering streams compete for context;
- negative evidence is important but rarely needed;
- the canonical state file is becoming difficult to scan or safely edit.

Do not split based on line count alone.

## Routing principle

`MANIFEST.md` is the stable map.
`STATE.md` is the fast cold-start brief.
Other files are loaded only when relevant.

Default load path:

```text
AGENTS.md
  -> .project/MANIFEST.md
  -> .project/STATE.md
  -> only task-relevant routed files
```

## Routing rules

- Put global mission, current phase, active workstreams, blockers, and next steps in `STATE.md`.
- Put durable choices in `DECISIONS.md`.
- Put non-negotiable rules in `CONSTRAINTS.md`.
- Put expensive failures and repeated pitfalls in `NEGATIVE_EVIDENCE.md`.
- Put subsystem-specific state in `areas/<subsystem>.md` only when the subsystem is large enough to justify independent loading.
- Keep global facts out of area files unless represented as pointers.
- Do not create one file per task, conversation, or day.

## MANIFEST quality rules

Keep MANIFEST concise and navigational.
Every routed file should state what question it answers.
Remove routes when files are merged or deleted.
Do not let MANIFEST become a second project summary.
