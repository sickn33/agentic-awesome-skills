---
name: goal-instruction-writer
description: "Preview, draft, refine, or audit durable agent Goals with acceptance evidence, drift controls, proportional verification, and bounded waiting. Use for multi-stage work, not one-shot prompts."
category: agent-orchestration
risk: safe
source: "https://github.com/wu736139669/goal-instruction-writer"
source_repo: wu736139669/goal-instruction-writer
source_type: community
date_added: "2026-10-18"
author: wu736139669
tags: [goals, planning, drift-control, verification]
tools: [codex]
license: "MIT"
license_source: "https://github.com/wu736139669/goal-instruction-writer/blob/1e5d106a2092c1ab8ab4f2f5836cf85167d1b3e7/LICENSE"
---

# Goal Instruction Writer

## Overview

Turn a vague request into a ready-to-run Goal instruction that an agent can
execute without guessing what success, progress, or stopping means. Preserve
the user's intent, language, authority boundaries, and requested scope.
This skill designs and audits the instruction contract; runtime access,
permissions, and external approvals still come from the host agent and user.
Describe the checks while writing a Goal; execute the underlying task only
when the user has also requested execution.

Read [references/goal-contract.md](references/goal-contract.md) when drafting
or auditing a Goal. Read [references/examples.md](references/examples.md) only
when a worked example would clarify the requested task. For work that spans
multiple phases, artifacts, or more than a few iterations, also read
[references/drift-control.md](references/drift-control.md). For preview-first
workflows, read [references/loop-preview.md](references/loop-preview.md).

## When to Use

- Use when the user asks to preview, draft, refine, or audit a Goal for a multi-stage agent task.
- Use when acceptance evidence, scope, verification cadence, drift recovery, or external waiting is ambiguous.
- Use for instruction design; ordinary one-shot prompts do not need this skill. Use `goal-loop` when the request is primarily about operating a host's native Goal loop.

## Choose the mode

- **Draft:** build a Goal from a rough request.
- **Refine:** preserve an existing Goal while closing missing objective,
  evidence, loop, or termination fields.
- **Audit:** identify ambiguity, unbounded repetition, unverifiable criteria,
  and unsafe or unauthorized transitions; propose the smallest fixes.
- **Convert:** turn a checklist, ticket, or project brief into a Goal without
  expanding its scope.
- **Preview:** show the concrete loop, branches, drift gates, and stop
  conditions before writing the final Goal. Do not emit an executable Goal or
  perform external work in this mode.

If the mode is not stated, infer it from the input. Ask only questions whose
answers would change the objective, authority, acceptance evidence, or legal
terminal state. Otherwise state assumptions and continue.

## Preview before drafting

Use preview-first when the user asks to “先看循环”, “preview”, “先设计流程”,
or similar. Also prefer it for multi-stage, costly, irreversible, or materially
uncertain work. For a short, reversible task, a direct draft is enough.

The preview is a design checkpoint, not an approval to execute:

1. State the provisional outcome, baseline, and assumptions.
2. Show the loop as concrete state transitions, including the first work unit,
   success and failure branches, progress evidence, drift checks, phase gates,
   and legal stop states. Distinguish iteration checks from broader phase or
   delivery checks, including evidence reuse and bounds for expensive checks.
3. List the decisions that could change the loop or its scope. For feedback,
   adoption, pilot, launch, or validation work, include the evidence threshold,
   what counts, and the feedback window.
4. End with a clear handoff: wait for the user to confirm or revise the loop
   before generating the final Goal.

When the user confirms, carry the accepted preview into the final Goal without
quietly changing its loop, scope, or terminal rules. If the user revises it,
regenerate the preview or record the changed decision first. A preview response
must not claim that the Goal is complete and must not perform external side
effects merely because a loop was described.

## Build the three-layer contract

### 1. Goal: define the outcome

Write one sentence with an observable end state. It should say what artifact,
behavior, decision, or verified change will exist when the work is complete.
Then make the contract concrete:

- **Baseline:** what exists now and which revision, source, or facts are
  authoritative.
- **Scope:** what may change and what is frozen.
- **Acceptance criteria:** observable checks tied to evidence, not activities
  such as “keep working” or “try harder.”
- **Dependencies and authority:** tools, access, owner decisions, and external
  gates the agent may or may not cross.
- **Deliverable:** the files, decision, report, or message that will be handed
  back.

For Goals about feedback, adoption, pilots, launches, or validation, define a
**feedback evidence threshold** before drafting: what counts as feedback,
whether an entry point is enough or at least `N` non-author responses are
required, and the timebox or attempt window. Do not count author-only activity
unless the user explicitly chooses that threshold.

Prefer one load-bearing outcome per Goal. Split unrelated outcomes into
separate Goals. Replace vague verbs such as “improve,” “handle,” or “finish”
with a measurable result.

## Prevent drift in long-running work

For a long or multi-stage Goal, freeze a compact **Goal Anchor** before the
first iteration: the one-sentence outcome, criterion IDs, frozen scope, and
current phase. Treat it as an invariant. A new discovery may change the plan,
but it must not silently change the outcome, acceptance criteria, or authority.
An explicit owner decision creates a new Goal version or scope-change record.

At every iteration, record three links before acting:

1. **Target criterion:** which acceptance criterion this work advances.
2. **Expected delta:** what observable evidence should change if it works.
3. **Scope reason:** why this action is inside the frozen boundary now.

After verification, classify the result as:

- `ON_TARGET`: the named criterion moved or new relevant evidence supports a
  justified next step.
- `SIDE_QUEST`: useful but not required for this Goal; park it in a deferred
  list instead of expanding the loop.
- `DRIFTED`: the action changed the goal or scope without authorization, the
  next step cannot be justified from the Anchor, or the no-progress threshold
  is reached; stop and realign.

Run a phase gate every 3–5 iterations by default, at each milestone, and before
an irreversible or high-cost action. Re-read the Anchor, compare the current
state with the baseline, mark criteria open or verified, review deferred side
quests, and choose one justified next action. Never rewrite criteria to make
completed work appear on target.

### 2. Loop: define how progress is made

Use a bounded iteration with a visible progress signal:

1. **Inspect** the current state and the last durable cursor.
2. **Select** the smallest next work unit, name its target criterion, expected
   delta, and scope reason.
3. **Act** within the allowed scope and authority.
4. **Verify** the result against the relevant criterion using the verification
   strategy below; capture the evidence.
5. **Classify** the result as `ON_TARGET`, `SIDE_QUEST`, or `DRIFTED` and apply
   the corresponding drift rule.
6. **Record** the delta, remaining gap, decision, and next cursor before
   another iteration.

State the iteration limit that fits the task: a timebox, tool or token budget,
maximum attempts, or a finite work-unit list. Add a no-op rule: do not repeat
the same action without new information; after a repeated failure, change the
hypothesis or stop with the blocker. The loop must be able to explain why the
next iteration is different from the previous one.

For external dependencies, record the unmet criterion, next check time or
relevant notification, and deadline. Before that trigger, continue independent
work or yield with the checkpoint preserved. Waiting and a due check that
confirms the dependency is still pending do not count as failed actionable
attempts toward the default two-equivalent-no-progress threshold. Actual tool
calls and elapsed time still count against host limits. See
[scheduled waits](references/drift-control.md#scheduled-external-waits)
for polling, resumption, and deadline rules.

#### Verification strategy

Include a short verification strategy in the Goal. Preserve explicit user and
repository acceptance requirements while controlling when checks run:

- **Iteration checks:** choose the smallest checks sufficient for the affected
  behavior. Broaden for change impact, new failures, unresolved uncertainty,
  or a required gate.
- **Phase and delivery checks:** once the relevant implementation is stable,
  complete the remaining required regression, build, integration, and artifact
  checks. A phase gate reviews current evidence; it does not automatically
  repeat the entire validation and delivery pipeline.
- **Evidence reuse:** tie results to the checked source or artifact, relevant
  inputs, dependencies, and environment. Carry forward results while those
  conditions remain valid. Documentation or receipt changes do not invalidate
  unrelated runtime checks. Distinguish reused evidence from newly run checks.
- **Rerun reason:** before repeating a check, name the change or new evidence
  that invalidates its result and select the affected checks. A source or
  artifact change invalidates dependent evidence, including consumer checks
  when the consumed artifact changes.
- **Cost and completion:** give expensive checks suitable command timeouts or
  attempt bounds. A timeout leaves its criterion unverified; report the gap.
  Finish when all criteria have valid evidence and delivery is complete;
  further checking needs a concrete unresolved concern or invalidated result.

### 3. Termination: define legal endings

Make the terminal states explicit and mutually understandable:

- **Complete:** every acceptance criterion is verified and the deliverable is
  available.
- **Blocked:** a named, verifiable dependency, missing authority, or owner
  decision prevents the next meaningful action and cannot be resolved without
  new input or permission; report the attempts made, the dependency, and the
  exact unblock condition.
- **Paused:** the owner explicitly asks to pause; preserve the cursor and do
  not resume without authorization.
- **Timeboxed/Budgeted:** the limit is reached before completion; report the
  verified progress, remaining gap, and the safest next action.
- **Stopped:** the owner cancels the work or an action would exceed the granted
  authority; do not silently continue.
- **Realignment required:** a drift check fails; stop the current loop, preserve
  the checkpoint, and resume only after the next action is re-anchored. Use
  `GOAL REALIGNMENT REQUIRED` when a local terminal label is needed.

Blocked is a claim about the world, not a way to end a hard turn. It qualifies
only when all three hold: the dependency is named and verifiable, the agent
cannot resolve it without new input or permission, and the report states what
would unblock it. Difficulty, slowness, uncertainty, an ambiguous requirement,
a failure a different approach could resolve, and a preference the agent could
ask about are not blockers. Change approach, ask one scoped question, or
realign instead. If another criterion is still actionable, keep working it and
record the blocked criterion separately. A blocked claim that turns out to be
false is a defect in the report, not a neutral stop.

Do not use “continue until satisfied,” “try indefinitely,” or a success claim
based only on effort. If the task has a local convention for terminal strings,
preserve it; otherwise give each state a short, exact label and require the
final response to include it. A goal or acceptance criterion cannot be changed
just because the current work became difficult or interesting.

## Produce the answer

Return the result in the user's language. Unless they request another format,
use this order:

1. **Design notes:** one short paragraph explaining the objective, loop, and
   termination and drift-control choices; list assumptions or high-value open
   questions.
2. **Loop preview:** in Preview mode, show the state transitions, branches,
   evidence, drift gates, terminal states, and unresolved decisions; stop there
   and wait for confirmation.
3. **Ready-to-paste Goal:** in Draft, Refine, or Convert mode, include the full
   instruction in a fenced block with `Objective`, `Goal anchor`, `Baseline and
   scope`, `Acceptance criteria`, `Feedback evidence` when applicable,
   `Verification strategy`, `Execution loop`, `Drift control`, `Limits and no-op
   rule`, `Termination`, and `Reporting` sections.
4. **Audit notes:** if refining or auditing, name each remaining ambiguity and
   the smallest change that resolves it.

The ready-to-paste block must be executable as an instruction, not a discussion
of how one might write an instruction. Keep acceptance checks and terminal
states concrete enough that a later reviewer can decide them from evidence.

## Examples

```text
Preview a Goal for a playable Godot game slice. Preserve save compatibility,
separate focused iteration checks from the Mac and Android delivery gate,
and define observable completion conditions. Do not execute the project.
```

```text
Audit a Goal that waits for an external review until an agreed UTC deadline.
Preserve a next-check trigger and budget limits, avoid premature polling,
and keep independently actionable documentation work moving.
```

For worked contracts, read [the examples](references/examples.md). Public,
English [workflow cases](https://github.com/wu736139669/goal-instruction-writer/blob/main/docs/cases/README.md)
record the evidence and limits of the maintainer's use.

## Limitations

- This skill designs instructions; execution, permissions, persistence, and invocation come from the host and the user.
- A saved next-check time does not create a scheduler. The host must supply the timer, event, or later authorized invocation and checkpoint access.
- The documented waiting branch has not been validated by a live wait/resume test.
- Drafting or previewing a Goal does not itself authorize the underlying task.

## Provenance

Adapted from the MIT-licensed [Goal Instruction Writer](https://github.com/wu736139669/goal-instruction-writer)
at [commit 1e5d106](https://github.com/wu736139669/goal-instruction-writer/commit/1e5d106a2092c1ab8ab4f2f5836cf85167d1b3e7).
The four bundled references and license retain the upstream bytes. Catalog
metadata, explicit activation guidance, examples, and limitations adapt the
entry to this library; the core Goal-writing contract is retained.
