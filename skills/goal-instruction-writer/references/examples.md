# Goal Instruction Examples

These examples show the shape of the output. They are deliberately small so
they can be adapted to a real task.

## Coding: fix a reproducible import failure

Weak request:

> Fix the importer and keep trying until it works.

Better Goal:

```markdown
# Goal: Make the CSV importer accept quoted multiline fields

## Objective
Update the importer so the fixture `fixtures/quoted_multiline.csv` loads into
the existing record model without truncation or row-count drift.

## Baseline and scope
- Baseline: current `main` revision and the existing importer test suite.
- Allowed scope: importer code, its focused tests, and fixture data needed to
  reproduce the failure.
- Frozen scope: public record fields, unrelated parsers, and dependencies.

## Acceptance criteria
- [ ] The focused fixture test passes and preserves the expected row count.
- [ ] Existing importer tests pass.
- [ ] The diff explains the parsing boundary and contains no unrelated edits.

## Verification strategy
During parser edits, run the focused fixture test. Once the parser is stable,
run the existing importer suite and review the diff. Record the checked parser,
fixtures, dependencies, and test environment; reuse passing results while those
inputs remain valid. A report-only edit needs a report check. A later parser
change requires the focused test and affected importer regressions again;
broaden if its impact is unclear. Apply the repository's command timeout to
expensive checks and leave any timed-out criterion open.

## Execution loop
Inspect the failing fixture and parser state; make one smallest hypothesis-driven
change; run the focused test; record the result and diff; then choose the next
unmet criterion from the evidence.

## Limits and no-op rule
Use at most four hypothesis iterations. Do not repeat a failed parser change
without new evidence; after two equivalent failures, change the hypothesis and
report a blocker only when a named dependency is the actual cause.

## Termination
Emit `GOAL COMPLETE` only when all three criteria are verified. Emit
`GOAL BLOCKED: <reason>` only when the fixture or a required dependency is
unavailable and no alternative approach can proceed, naming the attempts made,
the dependency, and the exact unblock condition. Emit `GOAL TIMEBOXED: <state>`
after the fourth iteration if the criteria remain open.

## Reporting
Return the revision, commands and results, changed files, remaining gap, and
the terminal label. Distinguish newly run checks from reused evidence.
```

### SDK delivery: choose checks after a successful validation

Keep all required release checks, but let the actual change determine which
evidence must be refreshed:

| Later change | Next verification |
| --- | --- |
| Only the handoff report or receipt changes | Check that document; reuse runtime and artifact results whose inputs remain valid |
| A cancellation fix changes SDK behavior and the AAR | Run the affected regression checks, rebuild affected artifacts, and refresh consumer checks against the new AAR |
| A new API snapshot is added while the AAR is unchanged | Check the new snapshot; reuse existing compatibility and runtime results tied to the same AAR and inputs |

## Research: compare two options

Weak request:

> Research these tools and tell me which one is best.

Better Goal:

```markdown
# Goal: Recommend one analytics tool for the stated workload

## Objective
Produce a cited comparison of Tool A and Tool B and recommend one option for a
team with <constraints>, with the trade-offs explicit enough for a decision.

## Baseline and scope
- Baseline: official documentation and current pricing pages checked on the
  research date.
- Allowed scope: public, first-party sources plus the user's stated workload.
- Frozen scope: do not infer private capabilities or promise an unverified
  integration.

## Acceptance criteria
- [ ] Each decision criterion has a source and a short evidence quote or
  paraphrase.
- [ ] Material differences, costs, and constraints are compared in one table.
- [ ] The recommendation states when the other option would be better.

## Execution loop
Inspect one criterion at a time; collect the strongest primary source for each
tool; record evidence and uncertainty; update the comparison; then select the
next criterion that could change the recommendation.

## Limits and no-op rule
Cover the five agreed criteria and stop after one primary source per material
claim unless a conflict needs resolution. Do not keep searching after the
recommendation is stable and all criteria are sourced.

## Termination
Emit `GOAL COMPLETE` when the table, citations, and conditional recommendation
are complete. Emit `GOAL BLOCKED: <missing constraint or source>` when a decision
depends on an owner answer or inaccessible evidence, naming the attempts made
and the exact unblock condition. Uncertainty about which source to prefer is a
scoped question, not a blocker.

## Reporting
Return the comparison, recommendation, uncertainty, sources, and terminal
label.
```

## Open source: publish a skill with an external maintainer gate

Weak request:

> Promote the skill everywhere and get it merged into a curated list.

Better Goal:

```markdown
# Goal: Make the skill discoverable and leave the curated-list submission reviewable

## Objective
Publish a validated skill package, create one reviewable distribution
submission, and record the exact external dependency if a maintainer must merge
it.

## Goal anchor
- Outcome: the skill is installable from its source repository and its curated-list submission has a durable status.
- Criteria: C1 package validation; C2 one distribution submission; C3 feedback
  and blocker record; C4 one non-author response.
- Frozen scope: no new social accounts, mass posting, repeated maintainer pings, or silent scope expansion.
- Current phase: launch and first feedback.

## Baseline and scope
- Baseline: the current repository revision, release metadata, and existing
  installation command.
- Allowed scope: the skill repository, one curated-list submission, and one
  feedback thread.
- Authority: the agent may edit the repository and submit or update its own
  contribution; only the upstream maintainer may merge the external PR.

## Acceptance criteria
- [ ] The skill validator and installation smoke test pass.
- [ ] One public submission links to the repository and explains how to install it.
- [ ] The feedback thread records the use case, current status, and exact
  unblock needed for any external gate.
- [ ] At least one non-author reply records a concrete use case, result, defect,
  or improvement; an author-only comment does not satisfy this criterion.

## Execution loop
Repeat one bounded work unit at a time:
1. Inspect the durable cursor, then the repository, release, submission, and
   feedback-thread status only when the relevant check is due.
2. Select one open criterion, expected evidence, and scope reason.
3. Make one focused documentation, packaging, or submission update.
4. Verify the result with a validator, link, commit, or platform status.
5. Classify it as `ON_TARGET`, `SIDE_QUEST`, or `DRIFTED`, then record the next
   cursor.

## Drift control
- Re-read the Anchor before each public post, version change, or new submission.
- Defer unrelated channels, feature ideas, and promotional experiments.
- If a maintainer gate is the only remaining work, preserve the named dependency
  and its agreed resume trigger; otherwise report the exact blocker under host
  rules. Do not repeatedly contact the maintainer.
- If the scope expands without approval, or two equivalent actionable attempts
  add neither acceptance progress nor new relevant evidence, emit
  `GOAL REALIGNMENT REQUIRED`.

## Limits and no-op rule
- Use at most three actionable work units and one maintainer follow-up until
  new review evidence arrives.
- Do not repeat a post or submission without a material change in evidence.
- While C4 is pending within its feedback window, record the last observation,
  next agreed check time or reply notification, and deadline. Before that
  trigger, skip further queries and pings; continue other open criteria or
  yield with the checkpoint preserved. Verify any response before counting it.
- An agreed wait consumes neither an actionable work unit nor the no-progress
  allowance; a due observation of "still pending" is not a failed attempt or
  acceptance progress. Actual queries and elapsed time still count toward host
  limits; stop premature repeated polling and realign its schedule.
- Define a feedback window before execution; if it closes without the required
  non-author response, stop as `GOAL TIMEBOXED: awaiting first external feedback`.

## Termination
- `GOAL COMPLETE` when the package, submission, status record, and feedback
  threshold are verified.
- `GOAL BLOCKED: upstream maintainer review required` when only the external
  merge remains, the submission is clean, and no supported resume trigger is
  available; name the attempts made (submission, status check) and the unblock
  condition (maintainer merge), and honor the host's blocked-status rules.
- `GOAL TIMEBOXED: awaiting first external feedback` when the feedback window
  closes before the required non-author response arrives.
- `GOAL TIMEBOXED: <state>` when the launch window ends with the verified
  progress and next safe action recorded.

## Reporting
Return the release or revision, validation evidence, submission URL, current
external status, deferred side quests, remaining gap, and terminal label.
```

## Chinese output shape

When the user asks in Chinese, keep the same contract and translate the labels
or preserve exact terminal strings when a system already depends on them. For
example:

```markdown
目标：交付一个可验收的 <结果>
循环：检查 → 选择一个最小工作单元 → 执行 → 验证 → 记录游标
结束：`GOAL COMPLETE` / `GOAL BLOCKED: <原因>` / `GOAL TIMEBOXED: <状态>`
```
