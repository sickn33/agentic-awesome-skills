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
license: "Apache-2.0 OR CC-BY-4.0"
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

## 1. Authority hierarchy

When sources conflict, apply this default order:

1. current explicit owner decision;
2. current approved requirements and acceptance criteria;
3. formal contracts, schemas, APIs, protocols, authorization rules, and risk constraints;
4. proven domain invariants and objective facts;
5. tests traceable to authoritative requirements;
6. current verified implementation behavior;
7. current canonical project-state records;
8. historical documentation;
9. historical review reports;
10. historical AI conversations, summaries, suggestions, or speculation.

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
workstream DONE != mission success
```

## 5. Session bootstrap and recall

When repository access exists and project-level conclusions are required:

1. read the repository-root `AGENTS.md` when present;
2. identify candidate paths that may be inspected, written, moved, or deleted;
3. before acting on each candidate path, discover and read every applicable `AGENTS.md` from the repository root through that path's parent; deeper rules govern only their subtree;
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

If verification is incomplete, keep the item `ACTIVE` or `BLOCKED`.

## 12. Documentation hygiene

Classify project-status documents as:

- `AUTHORITATIVE`
- `CURRENT_SUPPORTING`
- `HISTORICAL`
- `DUPLICATE`
- `STALE`
- `CONTRADICTORY`
- `GENERATED_TEMPORARY`
- `UNKNOWN`

Do not delete based on filename alone.
Before removing a document, determine whether it contains unique durable information.

Do not concatenate old documents into one giant archive. Reconstruct current state.

Avoid creating ad hoc status files such as `review-final-v2.md`, `todo-new.md`, `implementation-summary.md`, `current-progress.md`, `gpt-review.md`, `fix-report.md`, or `next-steps.md` unless a distinct external deliverable is explicitly required.

## 13. Branch awareness

Different branches may legitimately represent different implementation states.

Before reconciling branch conflicts:

- identify current branch and relevant ancestry;
- determine whether changes were merged;
- determine which branch is authoritative for the task;
- distinguish abandoned branch state from current branch state;
- keep branch-local completion branch-local until merged or accepted under project rules.

Mission and durable owner decisions may be global while implementation progress remains branch-specific.

Never silently blend incompatible branch state.

## 14. Historical conflict categories

Classify conflicts before editing canonical state.

### OBSOLETE_HISTORY
A statement was once valid but later superseded. Keep current state; Git retains history.

### IMPLEMENTATION_DRIFT
Documentation and implementation differ. Determine which violates higher-authority evidence.

### UNRESOLVED_BUSINESS_CONFLICT
Multiple legitimate intended behaviors remain. Escalate the smallest owner decision.

### FALSE_OR_UNSUPPORTED_HISTORY
A historical review or AI-generated claim was never established. Do not preserve it as truth.

### BRANCH_DIVERGENCE
Branches represent different states. Keep them distinct until merge/authority is resolved.

## 15. Negative evidence and lessons

Preserve failures or lessons when they are expensive to reproduce, strategically important, likely to be retried, necessary for research integrity, or necessary to prevent repeated agent mistakes.

Keep records concise:

- what failed or was corrected;
- why;
- supporting evidence;
- whether the result is permanent or conditional.

Do not preserve every failed debug attempt.

## 16. Consolidation and forgetting

Canonical state must not become an append-only diary.

Periodically consolidate when one or more are true:

- active sections contain completed/cancelled items;
- duplicate facts appear;
- old milestones no longer affect decisions;
- negative evidence can be compressed without losing its warning value;
- area files overlap;
- state loading repeatedly pulls irrelevant content;
- the canonical system has grown enough to impair fast comprehension.

During consolidation:

- deduplicate facts;
- remove obsolete low-value state;
- compress completed history into only decision-relevant milestones;
- preserve critical decisions, constraints, negative evidence, and lessons;
- migrate to scaled mode only when it improves retrieval;
- never remove information whose significance is materially uncertain without review.

Git remains the low-level historical archive.

## 17. Security and sensitive-state hygiene

Do not persist secrets, tokens, passwords, private keys, session cookies, raw credentials, or other authentication material in canonical project state.

Do not persist sensitive personal data merely because it appeared in conversation or logs.
When a useful durable fact can be recorded without sensitive detail, store the minimum necessary abstraction.

Do not copy secrets from code/config into state documents while documenting a finding.

## 18. Coordination with engineering governors

When `engineering-decision-governor` or equivalent exists:

Project State Governor owns:

- state reconstruction;
- goal hierarchy;
- persistent status;
- documentation hygiene;
- durable state transitions;
- cross-session continuity.

Engineering Governor owns:

- engineering task boundary;
- technical defect classification;
- deterministic fixes;
- engineering verification;
- scope-creep prevention;
- release-risk classification.

Consume verified engineering outputs as evidence.
Do not repeat engineering work unless evidence is missing or contradictory.

## 19. Coordination with research governors

When a domain research governor exists, it owns:

- research protocol and stage authorization;
- experiment execution;
- contamination/OOS rules;
- candidate acceptance/rejection;
- research evidence requirements.

Project State Governor owns:

- how research fits the mission;
- which workstream is active;
- persistent high-level research state;
- durable negative evidence;
- current next direction.

Never bypass research stage gates.
Never turn invalid/rejected research into project success.
Never reinterpret evidence merely to make project status appear advanced.

## 20. Owner authority boundary

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

## 21. Repository reconstruction mode

When asked to clean, repair, consolidate, or reconstruct a repository with fragmented history, enter `REPOSITORY_STATE_RECONSTRUCTION` and follow `references/reconstruction-workflow.md`.

Do not use reconstruction as justification for unrelated feature work.

## 22. State update equation

Before applying canonical state, compute:

```text
OLD_STATE
+ VERIFIED_NEW_FACTS
- INVALIDATED_FACTS
= NEW_STATE
```

For material updates, make the proposed semantic delta explicit before applying it.
Distinguish `CONFIRMED`, `INFERRED`, and `UNKNOWN` where reliability matters.

## 23. Final reporting

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

## 24. Anti-patterns

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
