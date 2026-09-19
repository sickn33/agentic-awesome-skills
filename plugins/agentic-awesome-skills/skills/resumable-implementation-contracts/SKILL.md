---
name: resumable-implementation-contracts
description: "Create repository-based execution contracts for multi-session implementation work, with stable task IDs, evidence, checkpoints, and exact resume state."
category: project-management
risk: safe
source: self
source_type: self
date_added: "2026-09-19"
author: ShianMike
tags: [project-management, execution-contracts, checkpoints, verification, agent-workflows]
tools: [claude, cursor, gemini, codex, antigravity]
---

# Resumable Implementation Contracts

## Overview

Turn a large, mostly defined implementation request into a repository contract
that a fresh agent can read, update, verify, and resume without reconstructing
the project from chat history. Keep stable intent separate from mutable
execution state, and require evidence before any task is called complete.

This is a tool-neutral document pattern. It does not depend on, replace, or
configure any agent platform's built-in goal, task, plan, or project feature.

This skill fills the layer between planning and execution. It does not replace
product discovery, detailed technical design, project-wide state governance,
or retrospective auditing.

## When to Use This Skill

Use it when work:

- spans multiple sessions, agents, branches, or context windows;
- has dependencies or acceptance criteria that must survive interruption;
- needs an exact resume point rather than a narrative handoff;
- can appear complete before runtime, artifact, UI, or test evidence exists;
- must preserve partial work and unrelated repository changes.

Skip it for a small task that can be completed and verified in one session.
If requirements are still unsettled, resolve them before freezing the
implementation contract.

## Reuse Existing Project Documents

Inspect the repository before creating files. Reuse equivalent documents and
the project's established names when their ownership is clear. For substantial
multi-session work, the minimum logical document set is:

| Document | Owns | Must not become |
| --- | --- | --- |
| `IMPLEMENTATION_CONTRACT.md` | stable intent, scope, tasks, acceptance, definition of done | a live activity log |
| `TASKS.md` | current task/subtask status, dependencies, evidence links | a second copy of the contract |
| `CHECKPOINT.md` | authoritative current position and exact next action | a vague progress summary |
| `DECISIONS.md` | material decisions, alternatives, and reasons | a transcript |
| `VALIDATION.md` | checks actually run, results, evidence, and unresolved gates | a list of planned tests |

These may live together under `docs/<contract-slug>/` or follow an existing
repo layout. An existing `GOAL.md`, specification, or execution brief may own
the contract role; do not rename it or create parallel files solely to match
this skill.

## Define Document Authority

- Current owner instructions and applicable repository instructions govern
  authorization and scope.
- `IMPLEMENTATION_CONTRACT.md`, or its existing repository equivalent, owns
  the implementation contract. Do not silently change it to fit the current
  code.
- The working tree, branch, commit, produced artifacts, and executed checks are
  truth for implementation state.
- The tracker files summarize that state; they do not override contrary
  evidence on disk.

When documents and reality disagree, reconcile status from evidence while
preserving the contract's intent. Escalate any conflict that would materially
change scope, behavior, or acceptance.

## Write a Self-Contained Contract

A new agent should be able to understand the work from the contract without
the original conversation. Include only what is needed to execute correctly:

1. objective and observable outcomes;
2. current baseline and important constraints;
3. in-scope work, exclusions, and authorization boundaries;
4. operating rules, including interruption and validation policy;
5. tasks with stable IDs, dependencies, acceptance, and breakpoints;
6. final definition of done and handoff requirements.

Use stable task and subtask IDs such as `T03` and `T03.2`. Never renumber them
after execution starts; add new IDs or mark obsolete work explicitly.

Each task should use this compact form:

```markdown
### T03 - <observable task outcome>

- [ ] T03.1 <first implementation slice>
- [ ] T03.2 <second implementation slice>

Dependencies: T01

Acceptance:
- <observable behavior or artifact>
- <required focused check and evidence>

Breakpoint:
- Update TASKS.md, VALIDATION.md, and CHECKPOINT.md after the accepted slice.
```

Write acceptance in pass/fail terms. File creation, code presence, or an
agent's completion claim is not acceptance unless that is genuinely the whole
requirement.

## Read Before Acting

At the start of a session or after interruption, read in this order:

1. applicable repository instructions;
2. the implementation contract;
3. `TASKS.md`, `CHECKPOINT.md`, `DECISIONS.md`, and `VALIDATION.md`;
4. current branch, `HEAD`, status, and relevant diff;
5. only the code, tests, and artifacts needed for the active task.

Reconcile the checkpoint with the working tree before editing. Preserve partial
and unrelated changes. Resume the exact unfinished subtask when it is still
valid; otherwise record why the next action changed.

## Keep Writes Narrow and Durable

- Change the implementation contract only when the owner changes intent or an
  ambiguity is deliberately resolved.
- Update `TASKS.md` when work starts, blocks, or becomes evidence-backed done.
- Replace `CHECKPOINT.md` with the latest authoritative resume state; Git owns
  its detailed history.
- Add to `DECISIONS.md` only for choices that constrain later work.
- Add to `VALIDATION.md` only after a check is actually run or explicitly
  recorded as not run.
- Update the checkpoint after a meaningful increment and before stopping.

Do not duplicate the same mutable status across every document. Link to the
owning record instead.

## Use Evidence-Gated Status

Use a small status vocabulary: `pending`, `in_progress`, `blocked`, and `done`.
A task may become `done` only when its acceptance criteria have supporting
evidence.

For each validation record, capture:

- timestamp and relevant commit or working-tree state;
- exact command or manual procedure;
- environment when it affects the result;
- result, including failures and skipped checks;
- artifact, log, screenshot, route, or report path when applicable;
- unresolved caveats or gates.

Run the smallest check that proves the current slice during implementation.
Run broader integration or release suites at defined milestones or when the
change's risk requires them. Never present a planned, mocked, or nominally
successful check as observed behavior.

## Make the Checkpoint Executable

`CHECKPOINT.md` must let another agent continue immediately. Record:

```markdown
# Checkpoint

Updated: <UTC timestamp>
Branch / HEAD: <branch> / <commit>
Active task: T03
Active subtask: T03.2
Status: in_progress

Completed behavior:
- <verified result and evidence link>

Work in progress:
- <files and partial state that must be preserved>

Validation performed:
- `<exact command>` -> <result>

Blockers or uncertainties:
- <blocker, owner, and condition for clearing it>

Pre-existing or unrelated changes:
- <paths or explicit none observed>

Next exact action:
- <one concrete edit, inspection, or command>

Next verification:
- <focused check that should follow that action>
```

Avoid next steps such as "continue implementation" or "finish tests." If the
next agent must decide what those words mean, the checkpoint is incomplete.

## Execution Loop

1. Select the smallest dependency-ready task.
2. Mark it `in_progress` and state the intended slice.
3. Inspect the real path that owns the behavior.
4. Make the minimum scoped change.
5. Run focused verification and record the actual outcome.
6. Update task status only from that evidence.
7. Refresh the checkpoint with one exact next action.
8. Repeat until every definition-of-done item is verified or explicitly
  blocked.

At final handoff, report completed outcomes, evidence, unresolved blockers,
branch and commit state, and the exact next action if anything remains. Do not
promote partial task completion into overall contract completion.

## Limitations

- This structure preserves execution state but cannot resolve unclear product
  intent or choose among materially different outcomes for the owner.
- Evidence quality depends on running checks that exercise the real behavior;
  complete-looking documents do not prove implementation correctness.
- Concurrent writers still need repository-level coordination to avoid
  conflicting checkpoints and status updates.
- The five-document layout is unnecessary overhead for small, single-session
  tasks; reuse fewer existing documents when they provide the same ownership.

## Common Failure Modes

- Rewriting or renumbering task IDs after work has begun.
- Treating checked boxes as evidence instead of linking the proof.
- Recording only happy-path checks and losing failed attempts that constrain
  the next decision.
- Replaying all history instead of loading the authoritative current state.
- Allowing implementation discoveries to silently expand the contract.
- Running an expensive full suite after every small edit while skipping the
  focused check that would isolate the defect.
- Persisting credentials, tokens, private data, or sensitive command output in
  tracking documents.

## Relationship to Other Skills

- Use `spec-driven-loop` when product requirements and technical design still
  need structured discovery, freezing, and approval.
- Use `planning-and-task-breakdown` when only an executable plan is needed.
- Use `project-state-governor` when the need is canonical state across the
  whole project rather than one scoped implementation effort.
- Use `audit-agent-run-evidence` for a read-only retrospective audit of an
  already completed run.

This skill owns the compact execution contract that connects those concerns:
stable intent, mutable progress, verification evidence, and exact resume state.
