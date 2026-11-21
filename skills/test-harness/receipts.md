# test-harness: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## On another stack, keep the principle and swap the mechanism.

- `Undated`: The rules come from two kinds of product, named here only by kind. Most were learned on web apps built on Next.js (App Router), Supabase Postgres and Clerk, tested with Vitest and Playwright (a live Q&A product, a monitoring product and others). The two-halves harnesses and several rules from bugs — marked *the remote-control product* where they appear — were learned on a relay service with a web client and an editor extension with desktop installers that drives a CLI agent.

## Run touched tests at stage end; reserve full gates for phases.

- `2026-11-13`, a coding-agent client: one full gate was estimated at 25 to 42 minutes and ran 3 to 4 times per delegated piece. Gate runs, review rounds and waiting took the time outside the model's roughly 35% of a 22-hour build day.

- `2026-11-16`, a live Q&A product: six roughly one-hour invoice stages exposed how the old stage-level full gate consumed the build. In the first three, full gates used 110 of 301 critical-path minutes; building used 137. The earlier case had roughly six-hour stages. Owner: add unit tests at each step, with full tests and review only when the phase is complete.

## Run the full local gate at phase end and before deploying pushes.

- `2026-11-14`, an evals product: from 31 October to 13 November, it built stages 0–5 and six later stages, ran 77 review rounds and deployed to development nine times. No browser test drove the running app. Its gate ran lint, typecheck, unit, integration, budgets and build, with neither `e2e` nor `e2e:auth`. Requiring those suites only before promotion left development uncovered; diff reviews could not find an unwritten suite.

## Each stage lands end-to-end tests of journeys it adds or changes.

- `2026-11-11`, an evals product: the owner asked to verify key flows when built without repeating costly screenshot reviews. The session read that as "once, by script" and kept scripts in its scratchpad. A `2026-11-14` restart deleted all of them. Every member-action test mocked the session module, so none tested the identity provider's sign-in. The owner's correction was to write each journey's test once and keep rerunning it through the gate.

## The builder runs its tests and fixes failures before the handoff.

- `2026-11-14`, the owner chose builder-run development tests, with operational changes and final verification kept by the session agent. Earlier sandboxed builds could not launch Chromium or resolve DNS; the `codex-agents` skill records the dated probe and test-running default.

## Every preview and go message names each suite that did not run.

- `2026-11-14`, an evals product: its coverage map said signed-in browser flows were uncovered at every run. The owner's go messages listed only counts, including 1,563 unit and 329 integration tests, with clean reviews. Those counts hid that no running-app or real-sign-in browser suite had run.

## Budget integration tests in round trips to the real database.

- `2026-11-04`, an evals product: a sandboxed builder wrote tests it could not run; 9 of 193 failed on test-side mistakes on the session agent's machine, then several timed out at 30 seconds against a remote database taking 130ms per round trip.

## A bug fix lands with a regression test run against broken behaviour.

- `2026-10-23`, a monitoring product: a review round's fix came with a journey check that passed on the commit before it; the fix was reverted and the assertion kept.

## After two fixes that pass their checks and leave the reported symptom unchanged, stop fixing.

- `2026-08-21`, a remote-control product: four rounds, each correct and green, none fixing what the owner saw.

## First check that the person is running your build.

- `2026-08-19`: the owner tested a fix twice against the previous night's build.

## Every feature that touches data gets the boundary and integrity tests its mechanisms need.

- `2026-11-01`, an evals product: builder-written integration tests found three bugs no review round had: a broken trace page no test had opened, a retention job that failed at runtime on an ambiguous plpgsql alias, and a workspace deletion that failed mid-cascade.

## Read every exit code from the log, never the notification.

- `2026-09-17`, a visual sweep's log ended `VISUAL_EXIT=1` under an exit-0 notification.

## The gate is the exit code, never the printed counts.

- `2026-09-23`: A run can print every test passed and exit 1 on one unhandled rejection; a report that quotes counts without the exit code has established nothing (`references/rules-from-bugs.md § Reading a red run`).

## An inherited report is a claim, not evidence.

- `2026-09-16`, a verified-sounding handoff missed unapplied production migrations.

## Copy a red run's failure artifacts out of the output directory before rerunning.

- `2026-11-18`, a rerun for a live Q&A product erased the failed run's trace. On the next failure, the trace was copied first and showed the cause.

## The coverage map is written by whoever ran the gate, and by nobody else.

- `2026-09-16` and `2026-09-17`, blocked builder runs were reported in the coordinator's name with invented counts.

## A deployed worker never stops

- `2026-11-01`, an evals product: at its first deploy the live worker claimed the integration suite's fixtures, and eight tests failed.

## A generated file can arrive rewritten by the tooling that wrote it.

- `Undated`: a commit landed reading "Grok sends , so".

## When a rule must hold for every input, test it as a property.

- `2026-11-17`, the Claude Code team's account of how it verifies changes (Addy Osmani, "How the Claude Code team thinks about verification", claude.dev, 2026-11-16, read `2026-11-17`): property tests pick edge cases without the bias of the agent that wrote the code; the four kinds named are round trips, invariants, idempotency and equivalence.

## When a rewrite must not change behaviour, run old and new on the same inputs.

- `2026-11-17`, the Claude Code team's account of how it verifies changes (Addy Osmani, "How the Claude Code team thinks about verification", claude.dev, 2026-11-16, read `2026-11-17`): for large migrations, old and new systems run on the same inputs, with irrelevant differences normalized and a list of approved ones.

## A green run that flakes is not a pass.

- `2026-11-17`, the Claude Code team's account of how it verifies changes (Addy Osmani, "How the Claude Code team thinks about verification", claude.dev, 2026-11-16, read `2026-11-17`): flaky tests teach an agent to rerun instead of fixing, so its agent may not skip one, add sleeps or retry until green.

## A check that covers a class names who can reach the state.

- `2026-11-19`, an agent product (an editor extension, a desktop app and a web relay): after one real overflow finding, the coordinator added a check to every scene that nothing spills its box at 260 and 320 pixels wide. It failed 11 of 12 runs on non-defects and cost about a day; 372 of the frames were desktop windows that cannot be made that narrow. The owner: "But who uses such screens?" The product now keeps a table of supported widths.
