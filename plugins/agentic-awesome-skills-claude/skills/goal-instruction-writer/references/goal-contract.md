# Goal Contract Reference

This reference defines the fields used by `goal-instruction-writer`. It is a
compact design contract rather than a generic project-management checklist.

## Why the three layers matter

An agent can fail in three different ways:

1. The **Goal** is vague, so activity is mistaken for progress.
2. The **Loop** is unbounded, so the agent repeats work or drifts out of scope.
3. The **Termination** rule is missing, so the agent cannot distinguish success
   from a blocker, a pause, or an exhausted budget.

The three layers are evaluated together. A precise objective with no evidence
is not complete; a good loop with no limit can still run forever; a stop rule
with no progress signal can stop at the wrong time.

## Field guide

| Field | Required question | Good evidence |
| --- | --- | --- |
| Objective | What observable end state should exist? | A file, behavior, decision, or verified fact |
| Goal anchor | What must remain true across iterations? | One-sentence outcome, criterion IDs, frozen scope, current phase |
| Loop preview | What will one iteration and each branch look like? | State transitions, first work unit, evidence, gates, terminal states |
| Baseline | What is authoritative now? | Revision, URL, dataset snapshot, or current finding |
| Allowed scope | What may change? | Named files, systems, sources, or decision boundary |
| Frozen scope | What must remain unchanged? | Explicitly protected behavior, data, or external state |
| Acceptance criteria | How will a reviewer know it is done? | Test result, diff, artifact, cited source, or checklist |
| Verification strategy | Which checks run during edits, at delivery, or after a change? | Focused checks, required broader gates, evidence validity, rerun reasons, cost bounds |
| Feedback evidence threshold | What counts as real feedback, and how much is required? | Entry point only, N non-author replies, named cohort, and a timebox |
| External wait (when applicable) | When may a pending dependency be checked again? | Open criterion, dependency, last observation, next check time/event, deadline or unblock |
| Work unit | What is one iteration small enough to verify? | One hypothesis, patch, experiment, or review slice |
| Progress signal | What changes after a useful iteration? | New evidence, reduced gap, changed artifact, or decision |
| Alignment check | How is each iteration tied back to the Goal? | Target criterion, expected delta, scope reason, alignment label |
| Drift trigger | When must the loop stop and realign? | No criterion moved, silent scope change, repeated no-progress iterations |
| Phase gate | When is the Anchor re-read? | Every 3–5 iterations, milestone, or before irreversible work |
| Decision log | What prevents rationale from being lost? | Decision, evidence, criterion, rejected side quest, scope impact |
| Limit | When must the loop yield? | Time, attempts, token/tool budget, or finite queue |
| No-op rule | What prevents repetition? | Change approach after failure; stop after repeated blocker |
| Terminal states | What are the legal endings? | Complete, blocked, paused, timeboxed/budgeted, stopped |
| Report | What survives the final response? | Status, evidence, remaining gap, cursor, next action |

## Ready-to-paste skeleton

```markdown
# Goal: <verb + observable outcome>

## Objective
Produce <artifact/behavior/decision> so that <user or system value>.

## Goal anchor
- Outcome: <one immutable sentence>
- Criteria: <C1, C2, C3>
- Frozen scope: <invariants and forbidden side effects>
- Current phase: <phase or milestone>

## Baseline and scope
- Baseline: <authoritative revision, source, or current state>.
- Allowed scope: <files, systems, sources, or decisions that may change>.
- Frozen scope: <invariants and forbidden side effects>.
- Authority: <tools and approvals available; owner-only gates>.

## Acceptance criteria
- [ ] <observable criterion with its evidence>
- [ ] <observable criterion with its evidence>
- [ ] <observable criterion with its evidence>

## Feedback evidence (when applicable)
- Threshold: <entry point only | N non-author responses | named cohort>
- What counts: <concrete use case, result, defect, or decision>
- Window: <date, number of attempts, or timebox>

## External wait (when applicable)
- Checkpoint: <open criterion, dependency, last observation>.
- Resume trigger: <next check time with timezone or relevant notification>;
  deadline/unblock: <feedback deadline or named dependency resolution>.
- Check overall limits and deadlines first. Before the trigger, skip further
  lookups or pings; continue independent work or yield with the checkpoint
  preserved. On the trigger, verify the response.
- Waiting and a due observation of "still pending" are neither failed
  actionable attempts nor acceptance progress. Actual tool calls and elapsed
  time still count against the overall host limits.

## Verification strategy
- Iteration checks: <smallest checks sufficient for the affected behavior>.
- Phase/delivery checks: <required broader checks and artifacts, with triggers>;
  complete them once the relevant implementation is stable.
- Evidence reuse: record the checked source/artifact and relevant inputs,
  dependencies, and environment; carry forward results while they remain valid.
  Label reused and newly run checks separately. Documentation or receipt edits
  do not invalidate unrelated runtime checks.
- Reruns: name the change or new evidence that invalidates a result; rerun
  affected checks, including consumers of changed artifacts. Broaden when the
  impact, a failure, uncertainty, or an explicit requirement warrants it.
- Cost bounds: <command timeouts or attempt caps for expensive checks>;
  a timeout leaves the corresponding criterion open.

## Execution loop
Repeat one bounded work unit at a time:
1. Inspect <state and last cursor>; honor pending wait triggers before lookups.
2. Select one unmet criterion, expected delta, and scope reason.
3. Act within Allowed scope and Authority.
4. Apply the verification strategy to the relevant criterion and capture evidence.
5. Classify the iteration as `ON_TARGET`, `SIDE_QUEST`, or `DRIFTED`.
6. Record the delta, remaining gap, decision, and next cursor.

## Drift control
- Re-read the Goal anchor every 3–5 iterations, at phase gates, and before
  irreversible or high-cost actions.
- Park side quests in a deferred list; do not expand the Goal silently.
- If two equivalent actionable attempts add neither acceptance progress nor
  new relevant evidence, or the Anchor/scope changes without owner approval,
  stop and emit `GOAL REALIGNMENT REQUIRED`. An agreed wait does not increment
  this counter; stop repeated premature polling and realign its schedule.
- Resume only after recording the re-aligned next action and its expected delta.

## Limits and no-op rule
- Limit: <timebox, budget, attempt cap, or finite work-unit list>.
- Do not repeat an action without new information. After <N> materially
  equivalent failures, change the hypothesis or terminate as blocked.

## Termination
- `GOAL COMPLETE` when all acceptance criteria are verified and the deliverable
  is available. Stop; further checking requires invalidated evidence or a
  concrete unresolved concern about a criterion.
- `GOAL BLOCKED: <reason>` when the next meaningful action needs a named
  dependency, owner decision, or unresolved failure; include the unblock needed.
- `GOAL PAUSED: <reason>` only after an explicit owner pause; preserve the
  cursor.
- `GOAL REALIGNMENT REQUIRED` when a drift check fails; preserve the checkpoint
  and resume only after recording a justified next action within the Goal anchor.
- `GOAL TIMEBOXED: <state>` when the limit is reached; report progress and the
  safest next action.
- `GOAL STOPPED: <reason>` when the owner cancels or authority would be
  exceeded.

## Reporting
After each iteration and at termination, report the terminal label (if any),
verified evidence, remaining gap, and next cursor or unblock.
```

## Quality checks

Before returning a Goal, check:

- For preview-first work, the loop was shown and confirmed before the final Goal
  was generated.
- The objective describes an end state rather than a list of activities.
- The Goal anchor is short enough to re-read and is not silently mutable.
- Every acceptance criterion can be checked from named evidence.
- The verification strategy separates iteration checks from required phase or
  delivery checks, defines evidence validity and rerun triggers, and bounds
  expensive commands without weakening acceptance requirements.
- For feedback, adoption, pilot, launch, or validation work, the evidence
  threshold and window are explicit; author-only activity is not counted unless
  the Goal chooses it.
- Pending external waits have a next check trigger and deadline/unblock. The
  loop skips early polling, can continue independent work or yield, and retains
  overall budget limits without counting waiting as a failed attempt.
- Every iteration names one criterion, an expected delta, and a scope reason.
- The next iteration is selected from current state, not from a fixed script
  that ignores results.
- The loop has a progress signal, a limit, a no-op rule, and a drift trigger.
- Phase gates and a decision log make long runs resumable and auditable.
- Complete, blocked, pause, and budget endings are distinguishable.
- The instruction does not grant new access or external side effects that the
  user did not authorize.
- The final report leaves a durable cursor another agent could resume.
