# Persistence Lifecycle

Use this lifecycle for durable project knowledge:

```text
RECALL -> PROPOSE -> VERIFY -> APPLY -> CONSOLIDATE
```

## 1. RECALL

Load only enough canonical state to understand the task.

- compact mode: read `PROJECT_STATE.md`;
- scaled mode: read `.project/MANIFEST.md`, then `STATE.md`, then only relevant routed files;
- inspect Git/code/tests/contracts only as needed;
- do not load historical docs unless a conflict or reconstruction requires them.

## 2. PROPOSE

After meaningful work, compute a semantic state delta.

Represent only changes such as:

- lifecycle transition;
- new verified decision/constraint;
- new blocker or resolved blocker;
- new/rejected research hypothesis;
- material negative evidence;
- durable owner correction/lesson;
- superseded historical belief.

Do not propose transcript summaries.

## 3. VERIFY

Before persistence:

- check authority hierarchy;
- verify completion claims against the correct DoD level;
- verify branch scope;
- distinguish `CONFIRMED`, `INFERRED`, and `UNKNOWN`;
- ensure the update does not silently redefine business intent;
- ensure no secret, credential, token, or unnecessary sensitive personal data is being persisted;
- ensure the same fact is not already represented canonically.

## 4. APPLY

### Auto-apply is allowed when

- the state transition is deterministic and evidence-backed;
- scope is already authorized;
- no owner/business semantics are being created;
- no uncertain unique history is being deleted;
- the change is low-risk and reversible through Git.

### Stage for owner review when

- mission or success criteria would change;
- multiple legitimate business outcomes remain;
- deletion scope is broad or uncertain;
- unique historical significance is uncertain;
- an `INFERRED` state would become an owner commitment;
- release, research-integrity, security, legal, or operational risk would be accepted.

A staged proposal should show the semantic delta, not a long prose recap.

## 5. CONSOLIDATE

Run consolidation when canonical state becomes noisy or repetitive.

Actions:

- deduplicate facts;
- remove stale active items;
- compress completed milestones;
- preserve only high-value negative evidence;
- merge overlapping lessons;
- remove low-value chronology;
- split into scaled mode only when retrieval improves;
- update MANIFEST routes after splits/merges.

Do not perform lossy consolidation when significance is uncertain.

## Persistence quality test

Before finishing, ask:

1. Would a fresh agent understand what changed?
2. Is every persisted claim useful for future decisions?
3. Is each high-impact claim supported or explicitly provisional?
4. Did we avoid storing conversation noise?
5. Did we avoid duplicating the same fact?
6. Is the canonical state now easier, not harder, to load?
