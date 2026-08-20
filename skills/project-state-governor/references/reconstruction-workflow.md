# Repository State Reconstruction Workflow

Use this workflow when a repository contains conflicting historical reviews, plans, TODOs, status notes, GPT summaries, branch-specific docs, or unclear progress.

## 1. Establish scope and authority

Identify:

- repository and target branch;
- owner-requested cleanup boundary;
- candidate paths and every applicable `AGENTS.md` from the repository root through each path's parent;
- compact vs scaled canonical-state mode;
- whether deletion is explicitly authorized or only recommendations are allowed.

Do not expand into unrelated feature work.

Before inspecting, writing, moving, or deleting a candidate path, resolve its full `AGENTS.md` chain. Apply deeper rules only to their governed subtree, and do not let a repository-level cleanup instruction override a more specific local constraint.

## 2. Inventory candidate state documents

Find files likely to contain project state:

- plans/TODOs;
- reviews/audits;
- implementation summaries;
- status/progress/handoff docs;
- research manifests and decision records;
- GPT-generated summaries;
- branch-specific notes.

Do not assume every Markdown file is status documentation.

Classify each file initially as:

- `AUTHORITATIVE`;
- `CURRENT_SUPPORTING`;
- `HISTORICAL`;
- `DUPLICATE`;
- `STALE`;
- `CONTRADICTORY`;
- `GENERATED_TEMPORARY`;
- `UNKNOWN`.

## 3. Extract claims, not prose

Extract only material claims affecting current state:

- mission/success criteria;
- completion claims and DoD;
- active tasks/workstreams;
- decisions/constraints;
- blockers;
- research state/results;
- rejected directions/lessons;
- branch assumptions.

Ignore rhetorical explanation and conversation chronology unless needed as provenance.

## 4. Verify each material claim

Inspect only the code, tests, contracts, commits, configuration, and history necessary to evaluate claims.

Classify claims:

- `CURRENT_CONFIRMED`: supported by authoritative evidence;
- `CURRENT_INFERRED`: plausible but not directly authoritative;
- `SUPERSEDED`: once true, now replaced;
- `FALSE`: contradicted by higher-authority evidence;
- `CONFLICTED`: multiple legitimate interpretations remain;
- `UNKNOWN`: insufficient evidence.

Never use current code as automatic proof of intended semantics.
Never promote `CURRENT_INFERRED` to settled truth without justification.

## 5. Verify completion at the correct level

For each completion claim, distinguish:

- session completion;
- task completion;
- milestone completion;
- workstream completion;
- mission success.

Reject parent-level completion claims supported only by child-level evidence.

## 6. Resolve conflict type

### OBSOLETE_HISTORY
Statement was once valid but superseded. Keep only current canonical state.

### IMPLEMENTATION_DRIFT
Code and intended requirement differ. Determine which violates higher authority.

### UNRESOLVED_BUSINESS_CONFLICT
Multiple legitimate outcomes remain. Escalate the smallest owner decision.

### FALSE_OR_UNSUPPORTED_HISTORY
Review/AI output was never established. Do not preserve as truth.

### BRANCH_DIVERGENCE
Branches reflect different states. Keep them distinct until merge/authority is resolved.

## 7. Rebuild canonical state

Use `project-state-schema.md`.

Rules:

- preserve current durable state only;
- preserve concise high-value negative evidence and lessons;
- represent unresolved ambiguity explicitly;
- attach provenance/confidence only where material;
- do not copy whole historical documents;
- do not create an append-only archive;
- choose compact mode unless scaled routing clearly improves retrieval.

## 8. Build a staged cleanup set

For each old document choose:

- `KEEP`: independent stable purpose remains;
- `MERGE_THEN_DELETE`: unique durable content must enter canonical state first;
- `DELETE`: redundant/stale/generated with no unique required content;
- `OWNER_DECISION`: significance or deletion authority is genuinely uncertain.

Never delete first and reconcile later.

If broad deletion was not explicitly authorized, present this cleanup set for owner review before applying destructive changes.

## 9. Apply authorized cleanup

When authorized:

- update canonical state;
- remove obsolete redundant status files;
- preserve legitimate technical/public docs;
- avoid unrelated code edits;
- keep branch-specific facts branch-specific;
- ensure secrets/sensitive data are not copied into canonical state.

## 10. Consolidate

After reconstruction:

- remove duplicate canonical facts;
- compress low-value completed history;
- retain important decisions, constraints, negative evidence, and lessons;
- update MANIFEST if scaled mode is used.

## 11. Verify

Before declaring reconstruction complete, verify:

- canonical state is internally consistent;
- active tasks are actually open;
- completion claims match the correct DoD level;
- key decisions/constraints are represented;
- meaningful negative evidence is preserved;
- stale status docs no longer compete as sources of truth;
- no unique required information was lost;
- branch scope is represented correctly;
- provenance/confidence caveats are accurate;
- canonical state contains no exposed secrets copied during cleanup.

## 12. Report

Return only:

### Project State Changes
What became canonical or changed status.

### Current Focus
Resulting active workstream/task/research direction.

### Remaining Blockers / Decisions
Only unresolved items requiring action.

### Documentation Actions
Files kept, staged, merged/deleted, or awaiting owner review.

### Evidence Notes
Only material provenance/confidence caveats.
