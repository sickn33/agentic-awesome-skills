# The stage brief

**What it is for:** what the session agent hands a builder for one stage — the stage's goal, the decisions that bind it, the files it will touch and the builder's boundaries — what the builder finishes and runs itself, and **what the stage is judged against when it comes back.** One file per active stage.

**Rules**

- **A brief, not a keystroke script.** State the goal once, hand over the binding decisions and the context, and let the builder pick the means. Numbered micro-instructions are recipe-writing dressed up as a brief. (How to brief a builder well, and when not to: the `delegation` and `codex-agents` skills.)
- **If the brief would be nearly as long as the diff, write the diff yourself.** The test is size, not time. (`2026-09-22`, a live Q&A product: a builder sat twelve minutes on a fifteen-line change with zero writes.)
- **Two done-whens, kept apart.**
  - **The stage's done-when is the plan's, copied**, so the stage is judged against what the owner agreed to, not against what came back. The coordinator owns deployment, phase preview and the phase's full gate; the builder can run tests against development.
  - **"Done, for this hand-off" is what the builder finishes and runs itself**: the code, its tests written, run and their failures fixed, its doc lines, a short note, and the commands the session agent will run. Where its tool or platform cannot run a suite, name the blocker and who runs it: "Browser launch is blocked here; write it, I run it." Apply `codex-agents` for Codex's test-running mode.
  - **A test changed to make it pass is named in the hand-off, with why.** A loosened assertion or an added fallback can turn a real failure green; the session agent reads each one in the diff (`test-harness`, a fallback in a test is a bug in disguise).
  - **Every handoff then says plainly that it is a code handoff, not the stage done**, and lists what it wrote but could not run. The session agent marks the stage done only from its own run against the stage's done-when.
  - (`2026-10-23`, a monitoring product: once its briefs split the two, every handoff opened "This is a code handoff, not a claim that the stage's live done-when passed" and reported database tests as written but not run. Earlier, on another product, builders whose sandbox reached no database had twice reported gate counts nobody ran, `2026-09-16` and `2026-09-17`.)
- **Development test access excludes operational changes and production credentials.** It never deploys, applies migrations, pushes, changes a provider setting or secret, or reads production credentials. Only one agent runs suites on shared development data at a time. A new migration goes to the session agent to apply to development before dependent tests run. Deploys, migrations, workers' secrets, settings and drills stay with the session agent; the builder names each as one command. (`2026-11-14`, the owner enabled builder-run tests after a sandboxed build could not launch Chromium or resolve DNS.)
- **The brief and stage plan budget the tests the sandbox cannot run**, including one integration-fix pass by the session agent: apply the `test-harness` skill's round-trip budget (§ Tests and docs are part of the change).
- **A stage that adds or changes screens names the `ui-design` skill** (`$app-stack:ui-design` for Codex) and carries its rows of the jobs map. A builder that reads no skill trigger never opens a method it isn't pointed at, and it loads one only from a pack installed in it. (`2026-11-03`, an evals product's builder, Codex with no pack installed, built its screens without the method.)
- **Without a builder**, the session agent builds the stage itself and the plan's line for the stage is its brief; no separate file is needed.
- **What a builder reports is a claim.** A delegated diff is unreviewed code. Read it before believing it, re-run the tests the handoff touches yourself, and rewrite the coverage evidence from your own run. Run touched and new tests yourself at stage end. The phase's full gate and review series cover this stage; no round per handoff is required.
- **When the stage is done, the brief moves unchanged to an archive folder** (`docs/history/briefs/<stage>.md`, say), and the stage's line in the plan points there. **A folder holding no brief means no stage is in flight.**

## Skeleton — copy from here

```markdown
# <stage> — <one-line goal>

## Goal

<What the stage delivers, in a paragraph, in the product's terms. Which use cases (by number, from the brief) it serves.>

## Done when

<The plan's done-when for this stage, copied: what a person can check. The session agent judges it, from its own run.>

## Done, for this hand-off

<Code, durable tests committed with the change where permitted, and current doc lines. Run the tests you write and fix failures before handoff. Name any tool/platform blocker, each suite not run and who runs it, and every test you changed to make it pass, with why. If you run without a sandbox, these instructions are your boundary. Leave changes uncommitted when the session agent owns the commit. Then report what was built, choices where this brief was silent, spec corrections, runs and commands for the session agent (the delegation skill's brief template). Open with: this is a code handoff, not the stage done.>

## Builder boundaries

You never deploy, apply migrations, push, change a provider setting or secret, or read production credentials.
Only one agent runs suites on shared development data at a time; coordinate the test window with the session agent.
Hand new migrations to the session agent to apply to development before running tests that need them.
Run tests against development with dedicated test accounts. The coordinator reruns stage tests itself and runs the full gate at phase end.

## What stays with the session agent

<Deploys, promotions, pushes, applied migrations, provider settings, secrets, drills and production credentials, including development operational changes. Development test runs are delegated within the boundaries above. Name each operational step as one command in the note.>

## Decisions that bind it

- <The product-section rules, decision-log entries and default choices this stage must hold — named, with where each lives.>
- <What is deliberately not in this stage.>
- <The rules review rounds taught since this brief was written, or the file that holds them, folded in before the builder starts.>

## Screens (when the stage adds or changes any)

- The design method: the `ui-design` skill, from `app-stack` installed in the builder (`$app-stack:ui-design` in Codex); its `references/method.md` read before any screen.
- The jobs map rows this stage serves: the job in the user's words → its screen → that screen's one question → its primary action.
- The data rules that stay out of the copy, each with the plain-words outcome a screen shows instead.
- Example data that fills every screen it touches.
- **The coordinator checks affected screens at stage end and before phase review.** Apply `ui-design` § Complete phase visual checks before its review series and owner preview for the routine rendered check and the full walkthrough, critique and audit for new or materially changed journeys or kit changes. Apply `release-gate` § Stage and phase close for the sequence.

## Files it will touch

- <The files and areas the change lands in, and the docs whose lines it will make false.>

## Tests and docs that land with it

- <Each journey added or changed → its committed end-to-end spec; its harness and gate command; live/operator steps kept outside the gate. Core docs with the first real slice, then current doc lines; the phase's document-app check runs before its review series.>
- <Every existing page and function the stage touches, exercised, not only the new ones.>
- <The real database's measured round-trip latency and integration-test budgets; one session-agent integration-fix pass when the sandbox cannot run them (the `test-harness` skill).>

## Needs a person

- <Dashboard settings, accounts, numbers that are judgements — anything the builder cannot do or decide.>
```
