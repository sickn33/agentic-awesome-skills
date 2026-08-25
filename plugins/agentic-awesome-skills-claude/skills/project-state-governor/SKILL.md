---
name: project-state-governor
description: "Govern evidence-backed canonical project state across sessions, branches, reviews, and research cycles without inventing product intent."
category: project-management
risk: critical
source: community
source_repo: Ghost011118/project-state-governor
source_type: community
date_added: "2026-08-20"
author: Ghost011118
tags: [project-state, project-memory, documentation, governance, context-engineering, multi-agent]
tools: [claude, cursor, gemini, codex, copilot, opencode]
license: "Apache-2.0"
license_source: "https://github.com/Ghost011118/project-state-governor/blob/main/LICENSE"
---

# Project State Governor

## Mission

Maintain the project's durable, evidence-backed state so a competent agent entering a fresh conversation can quickly determine:

- why the project exists;
- what is authoritative now;
- what is active, blocked, deferred, or done;
- what failed and should not be repeated;
- which decisions and constraints govern future work;
- what should happen next.

Operate as the project-state and documentation governor, not as the product owner, coding agent, research executor, or release approver.

Use this model:

- Git preserves history.
- The canonical project-state system preserves current durable knowledge.
- `AGENTS.md` defines how agents operate.
- Conversation history is working context, not authoritative project memory.
- Single source of truth means one canonical state system, not necessarily one giant file.

Read `references/project-state-schema.md` when creating or repairing canonical project state.
Read `references/persistence-lifecycle.md` when deciding what to recall, stage, persist, review, or consolidate.
Read `references/reconstruction-workflow.md` when cleaning fragmented history or contradictory documentation.
Read `references/manifest-routing.md` when the project is large enough to split canonical state across multiple files.

## When to Use This Skill

- Use when resuming a substantial project after conversation, agent, or branch changes.
- Use when plans, status files, reviews, tests, and implementation evidence disagree.
- Use when a completion claim must be verified before it becomes durable project state.
- Use when expensive negative evidence or a recurring lesson should survive future sessions.
- Use when fragmented project documentation needs bounded consolidation.

Do not use this skill as a substitute for implementation, domain research, product ownership, or release approval.

## Limitations

- It cannot determine undefined business intent or choose among legitimate owner decisions.
- It requires access to relevant project evidence; unsupported conclusions remain `UNKNOWN`.
- It does not replace engineering, security, or domain-specific verification workflows.
- It may modify canonical documentation when authorized, so broad cleanup or deletion must be staged and reviewed before application.

## Worked Example

A feature branch claims that `export-redesign` is complete. The canonical
`PROJECT_STATE.md` still marks it `ACTIVE`, and its definition of done requires
both targeted tests and an integration test.

1. Resolve every applicable `AGENTS.md` for the canonical state file and the
   evidence paths before reading or changing them.
2. Verify that the branch was merged and that targeted tests passed.
3. Record that the required integration test has not run; classify this as an
   evidence gap rather than inferring success from the merge.
4. Preserve `export-redesign: ACTIVE`, record the missing integration evidence,
   and identify running that test as the next authoritative step.

The durable result is a minimal state delta, not a rewritten history:

```text
Status: ACTIVE (unchanged)
Verified: implementation merged; targeted tests passed
Missing evidence: required integration test
Next step: run and evaluate the integration test
```

Only after that test satisfies the approved definition of done may the task
transition to `DONE`.

## 1. Authority hierarchy

Before ranking conflicting sources, enforce a hard boundary: no owner or product
decision may override applicable law, an actual authorization boundary,
non-waivable security or safety constraints, or objective facts. Verify that a
claimed constraint is real and applicable; convention, preference, and
speculation do not become non-overridable merely by being labelled a risk.

Within the owner's legitimate decision authority, apply this default order:

1. current explicit owner decision;
2. current approved requirements and acceptance criteria;
3. formal product and technical contracts, schemas, APIs, protocols, and risk controls;
4. tests traceable to authoritative requirements;
5. current verified implementation behavior;
6. current canonical project-state records;
7. historical documentation;
8. historical review reports;
9. historical AI conversations, summaries, suggestions, or speculation.

Lower-authority evidence must not silently override higher-authority evidence.

Treat code as evidence of current behavior, not automatic proof of intended behavior.
Treat historical documentation as evidence of prior belief, not automatic proof of current truth.
Treat reviewer findings as hypotheses until verified.
Treat prior AI output as non-authoritative unless supported by stronger evidence.

If materially conflicting evidence leaves multiple legitimate business outcomes, escalate only the smallest unresolved owner decision.

## 2. Canonical state modes

Use the smallest structure that stays clear.

### Compact mode

Prefer for small and medium projects:

```text
AGENTS.md
PROJECT_STATE.md
```

### Scaled mode

Use when `PROJECT_STATE.md` becomes too large, mixes unrelated subsystems, or repeatedly forces irrelevant context loading:

```text
AGENTS.md
.project/
  MANIFEST.md
  STATE.md
  DECISIONS.md
  CONSTRAINTS.md
  NEGATIVE_EVIDENCE.md
  areas/
    <subsystem>.md
```

The files together form one canonical state system.
Do not split merely for aesthetics.
Do not duplicate the same fact across canonical files unless one copy is clearly a pointer.

Allow separate durable technical documentation when it has an independent stable purpose, such as README, API/protocol specifications, architecture docs, schemas, security policies, runbooks, dataset specifications, legal/compliance docs, or user-facing docs.

Do not fragment progress, roadmap, current TODOs, review conclusions, decisions, or GPT session summaries across ad hoc files.

## 3. Classify intent before persisting

Use the smallest fitting type.

### MISSION
A long-lived reason the project exists. It survives many implementations and experiments.

### SUCCESS_CRITERION
A durable definition of meaningful project success. Never invent one merely to make a mission measurable.

### WORKSTREAM
A coherent multi-task initiative with a meaningful end or pause condition.

### MILESTONE
A bounded intermediate outcome spanning multiple tasks.

### TASK
Bounded work with a recognizable closure condition.

### RESEARCH_HYPOTHESIS
A falsifiable proposition requiring evidence. A failed hypothesis does not fail the mission.

### DECISION
An owner-approved or objectively established choice that materially constrains future work.

### CONSTRAINT
A technical, business, risk, authorization, compatibility, data, research-integrity, or operational rule future work must respect.

### BLOCKER
A confirmed condition preventing meaningful progress.

### DEFERRED
Real work intentionally postponed.

### QUESTION
Persist only if unresolved status materially affects future work.

### LESSON
A concise, validated pitfall or correction worth retaining because future agents are likely to repeat an expensive mistake.

## 4. Closure and hierarchy

Classify goals using this default test:

- one clear code/configuration change can finish it -> `TASK`;
- multiple tasks are required but a bounded intermediate finish exists -> `MILESTONE` or `WORKSTREAM`;
- it is an ongoing strategic objective across many iterations -> `MISSION` or long-term `WORKSTREAM`;
- experimentation is required to determine truth -> `RESEARCH_HYPOTHESIS`.

Use hierarchical completion rather than one global `DONE` claim:

- `SESSION_DOD`: what this execution session promised to complete;
- `TASK_DOD`: acceptance and verification required for the bounded task;
- `MILESTONE_DOD`: required child outcomes for the milestone;
- `WORKSTREAM_DOD`: conditions for the initiative to complete or pause;
- `MISSION_SUCCESS`: owner-defined project success criteria.

Never infer that a parent is complete merely because a child completed.

Example:

```text
session DONE != task DONE
task DONE != milestone DONE
milestone DONE != workstream DONE
workstream COMPLETED != mission success
```

## 5. Session bootstrap and recall

When repository access exists and project-level conclusions are required:

1. read the repository-root `AGENTS.md` when present;
2. identify candidate paths that may be inspected, written, moved, or deleted;
3. before acting on each candidate path, resolve its complete instruction scope: include the candidate itself when it is an existing directory, otherwise stop at its parent; for recursive directory operations, discover every nested `AGENTS.md` in the affected subtree before inspecting or mutating that subtree; deeper rules govern only their subtree;
4. detect compact or scaled canonical-state mode;
5. in scaled mode, read `.project/MANIFEST.md` first;
6. read current state/brief before historical material;
7. identify current Git branch and working tree;
8. inspect relevant recent commits, code, tests, configuration, and contracts;
9. load domain-specific governance files when applicable;
10. load only task-relevant canonical area files;
11. inspect historical documentation only when needed to resolve state or conflict.

Use progressive retrieval. Do not load the whole repository history or every memory file by default.

If canonical state is missing, reconstruct it from repository evidence rather than fabricating it from conversation alone.

## 6. Provenance and confidence

For durable facts whose reliability materially matters, capture concise provenance and confidence.

Preferred provenance includes:

- owner decision or issue ID;
- commit SHA;
- test name/result;
- contract/schema path;
- experiment/candidate/manifest ID;
- authoritative file path and section.

Use confidence labels only when they add value:

- `CONFIRMED`: directly supported by authoritative evidence;
- `INFERRED`: best current interpretation, but not directly authoritative;
- `UNKNOWN`: unresolved or insufficiently supported.

Never persist `INFERRED` as if it were settled fact.
Represent material inference explicitly as hypothesis, question, or provisional state.

Do not add provenance noise to obvious low-impact facts.

## 7. Semantic State Diff

After meaningful work, ask:

> Did this work create, remove, invalidate, complete, clarify, or materially modify a durable project fact?

Persist when one or more occurred:

- mission or owner-defined success criteria changed;
- a workstream/milestone began, ended, paused, blocked, or materially changed;
- a task changed lifecycle state;
- a durable decision was made;
- an important invariant or constraint was discovered;
- a blocker appeared or was removed;
- a research hypothesis changed validated state;
- negative evidence changed future direction;
- project phase or roadmap priority materially changed;
- meaningful debt was explicitly deferred;
- a historical project belief was proven obsolete;
- a validated recurring pitfall or owner correction should become a `LESSON`.

Do not persist merely because:

- a conversation occurred;
- code or files were inspected;
- commands were run;
- an intermediate debugging theory appeared;
- an AI suggested an idea;
- a reviewer raised an unverified concern;
- wording changed without semantic consequence;
- a known fact was repeated.

No durable state change means no canonical-state write.

## 8. Persistence lifecycle and write gate

Use the lifecycle in `references/persistence-lifecycle.md`:

```text
RECALL -> PROPOSE -> VERIFY -> APPLY -> CONSOLIDATE
```

Never jump from conversation directly to permanent state when material uncertainty exists.

For low-risk deterministic updates, apply after evidence verification and a semantic-diff self-check.

Require owner review or explicit prior authorization before applying changes that:

- redefine mission or success criteria;
- choose among legitimate business outcomes;
- delete documentation with uncertain unique value;
- perform broad/mass cleanup outside previously authorized scope;
- convert an inferred state into an owner commitment;
- accept release, research-integrity, security, legal, or operational risk.

When reconstruction or broad cleanup is requested but deletion authority is unclear, stage the cleanup set and report the proposed diff rather than deleting.

## 9. Convert conversations into semantic state, not transcripts

Never archive raw conversation history by default.

Do not persist chronology such as:

> User asked X, GPT suggested Y, then we considered Z.

Persist only the durable semantic result.

If a long discussion ends in a verified rejection of an expensive research direction, preserve the concise rejection, reason, and evidence reference.
If the discussion produced no durable lesson, store nothing.

## 10. Status transitions

Use these defaults unless the project defines authoritative alternatives.

Tasks:

- `PROPOSED`
- `ACTIVE`
- `BLOCKED`
- `DONE`
- `CANCELLED`
- `DEFERRED`

Research hypotheses:

- `PROPOSED`
- `ACTIVE`
- `SUPPORTED`
- `REJECTED`
- `INCONCLUSIVE`
- `INVALIDATED`
- `FORWARD_ONLY`

Workstreams:

- `PLANNED`
- `ACTIVE`
- `BLOCKED`
- `COMPLETED`
- `PAUSED`
- `CANCELLED`

Do not invent new status vocabularies unless necessary.

## 11. Completion claims

Never mark a task `DONE` merely because code was written or an agent says it is finished.

Before accepting a completion claim:

1. identify the relevant DoD level;
2. identify authoritative acceptance criteria;
3. verify implementation/build/test/integration evidence appropriate to the task;
4. verify required decisions/dependencies are resolved;
5. ensure no child-only completion is being promoted to a parent-level claim;
6. record only the resulting durable state transition.

If verification is incomplete, do not change lifecycle status based on the
completion claim. Preserve the item's existing status and record the missing
evidence or blocker separately; transition status only when independent
evidence supports that change.

## 12. Documentation, branch, and evidence hygiene

- Follow `references/reconstruction-workflow.md` to classify status documents, resolve historical conflicts, and stage cleanup without losing unique durable information.
- Keep branch-local implementation state branch-local until it is merged or accepted under project rules; never blend divergent branches silently.
- Preserve only decision-relevant negative evidence and recurring lessons. Git remains the detailed historical archive.
- Consolidate duplicate and obsolete state when it impairs retrieval, but stage any deletion whose significance is uncertain.
- Never persist secrets, authentication material, or unnecessary sensitive personal data in canonical project state.

## 13. Coordination with other governors

Engineering governors own technical defect classification, fixes, verification, and release risk. Research governors own protocols, stage gates, experiments, and evidence requirements. Consume their verified outputs as evidence; do not bypass or duplicate those workflows merely to advance project status.

## 14. Owner authority boundary

Autonomously:

- classify evidence;
- identify duplicate status docs;
- identify objectively obsolete information;
- update lifecycle state when completion is objectively verified;
- compress redundant state;
- reconcile deterministic factual conflicts;
- remove clearly redundant generated status docs when deletion is already authorized.

Do not autonomously:

- redefine mission;
- redefine product semantics;
- invent acceptance criteria;
- accept unresolved release/research/security/legal risk;
- choose among multiple legitimate business outcomes;
- erase uniquely valuable history when significance is uncertain;
- treat prior AI output as authoritative because an AI wrote it.

Escalate only the smallest unresolved owner decision.

## 15. Repository reconstruction mode

When asked to clean, repair, consolidate, or reconstruct a repository with fragmented history, enter `REPOSITORY_STATE_RECONSTRUCTION` and follow `references/reconstruction-workflow.md`.

Do not use reconstruction as justification for unrelated feature work.

## 16. State update equation

Before applying canonical state, compute:

```text
OLD_STATE
+ VERIFIED_NEW_FACTS
- INVALIDATED_FACTS
= NEW_STATE
```

For material updates, make the proposed semantic delta explicit before applying it.
Distinguish `CONFIRMED`, `INFERRED`, and `UNKNOWN` where reliability matters.

## 17. Final reporting

After meaningful governance work, report only:

### Project State Changes
Durable state transitions applied.

### Current Focus
Active mission/workstream/milestone/task/research direction.

### Remaining Blockers / Decisions
Only genuine unresolved blockers or owner decisions.

### Documentation Actions
Canonical docs changed, staged, consolidated, or removed.

### Evidence Notes
Only provenance or confidence caveats that materially affect trust.

If no durable state changed, say so briefly and do not manufacture an update.

## 18. Anti-patterns

Never:

- dump conversations into project docs;
- create a new status/review/TODO file after each session;
- assume code automatically defines intended behavior;
- assume reviewer findings are automatically true;
- persist unsupported inference as settled fact;
- accumulate completed/cancelled/duplicate TODOs indefinitely;
- confuse session, task, milestone, workstream, and mission completion;
- declare `DONE` without required verification;
- keep obsolete status files merely "for reference" when Git already preserves them;
- delete conflicting docs before extracting unique durable information;
- load every memory file for every task;
- use documentation cleanup as permission to rewrite unrelated code.

The objective is not maximum documentation.
The objective is minimum sufficient, high-confidence, continuously maintained project knowledge.
