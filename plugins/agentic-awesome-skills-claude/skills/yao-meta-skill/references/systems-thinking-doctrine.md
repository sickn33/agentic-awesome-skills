# Systems Thinking Doctrine

Use this doctrine when a skill needs to keep producing good behavior after repeated real use.

## Core Principle

Structure drives behavior. Improve the system boundary, feedback loops, drift watch, and leverage points before adding more prose, templates, or tools.

This is inspired by general systems-thinking practice: recurring failures usually come from structure, incentives, feedback, delays, or boundary mistakes rather than from one isolated bad output.

## Apply Silently By Default

Use the systems model as author and reviewer evidence. Do not ask the user to choose between system concepts unless there is real uncertainty or a design conflict.

The user should usually see a recommendation, not a menu of theory.

## Four Questions

1. What does this skill own?
2. What feedback tells us it is improving or drifting?
3. Which failure will appear only after repeated use?
4. Where is the smallest change with the largest quality gain?

## Boundary Map

Define these before expanding the package:

- Owned job: the recurring behavior this skill is responsible for.
- Input boundary: the real material users will provide.
- Output boundary: the concrete hand-back users need.
- Non-goals: adjacent requests this skill should refuse or hand off.
- Human judgment boundary: places where the model should ask, escalate, or disclose uncertainty.

## Feedback Loops

Every serious skill should have at least one loop:

- Intent loop: user clarification changes the boundary.
- Reference loop: benchmark patterns become borrow or avoid guidance.
- Output loop: common output failures become self-repair checks.
- Reviewer loop: human feedback becomes a gate, reference, or regression case.
- Lifecycle loop: reuse level changes maturity tier and governance.

## Delay And Drift

Watch for problems that appear after initial success:

- Trigger drift: the skill starts activating on adjacent work.
- Output drift: outputs become generic, cluttered, or misaligned.
- Reference drift: borrowed patterns add ceremony without payoff.
- Governance drift: team-critical use grows faster than review discipline.

## Leverage Points

Prefer changes in this order:

1. Clarify the real job boundary.
2. Tune the frontmatter description.
3. Add one output self-repair check.
4. Borrow one external pattern as structure, not surface style.
5. Close one lifecycle or reviewer feedback loop.

Do not add more files if a description, boundary, or feedback-loop change would solve the root cause.

## Reviewer Standard

A reviewer should ask: will this skill's structure keep producing the desired behavior after repeated use?

If the answer is unclear, request one of these before approving:

- a sharper boundary
- a named feedback loop
- a drift watch
- a failure pattern
- a highest-leverage next move
