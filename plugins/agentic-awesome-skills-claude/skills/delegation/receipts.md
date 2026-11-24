# delegation: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## A brief with the goal in it comes back with judgement.

- `2026-08-21`, a remote-control product. A brief with the goal in it comes back with judgement: "the force at replay end is redundant, here is why", "a 30px overlay would cover the last line, which is worse than the jump" — each of which changed what shipped.

## Keep operational changes and production credentials with the session agent.

- `2026-10-23` and `24`, a monitoring product: every stage brief listed these under "What stays with me". Delegated builds made 28 commits the day before the first release and none on the day of five production promotions, which was review fixes and real systems throughout.
- `2026-11-14`, the owner distinguished development suite runs from operational changes. Builders run and fix their tests; the session agent still applies migrations before dependent tests, serializes shared-data runs and independently verifies the full gate.

## If the brief would be nearly as long as the diff, write the diff.

- `2026-08-21`: having already found the exact lines, an agent wrote a 60-line brief and waited twenty minutes for a change it could have made in two.

## A build round that has made no writes on a small change is stopped.

- `2026-09-22`, a builder sat twelve minutes on a fifteen-line change with a clean tree.

## State the constraints that bind, including the do-nots.

- `2026-08-21`: The briefs that mattered most carried a warning, not a task: "do not fix this in the argument builder — the same string feeds another spawn path", "replay is off the table, recovery only". Each stopped a plausible fix that would have been wrong in the large.

## Define proof for this handoff, including checks you must run.

- `2026-10-22` and `23`, a monitoring product: briefs that said so got "written, not run" back. The invented counts under `SKILL.md` § When it comes back are what happens when a brief doesn't.

## Ask it to exercise every existing page and function the stage touches, not only its own.

- `2026-11-01`, an evals product: a builder's integration tests found a bug in the session agent's own code, an embed across a relationship that doesn't exist, on a page no earlier test had opened.

## The brief is the delegate's entire reality.

- `2026-10-23`: the owner changed the identity provider's organization settings mid-build.

## A feature that guesses from real-world input starts from evidence.

- `2026-10-23` and `24`, a monitoring product: a brief for suggested health checks was built on a scan of 495 real apps. A live run on 30 sites reversed one binding decision, because a browser-like `Accept` header turned checks into page loads: one framework's health route answered HTML, and an identity provider's development instance redirected every check to its sign-in. The same run found four more defects.

## Name ranges, not commits, in a brief you will reuse.

- `2026-08-22`, twice in one session: A second round run from a brief that pins a SHA re-reviews the commit already reviewed and confidently re-reports what was fixed one commit later.

## The session that wrote the code never clears it.

- `2026-11-06`, owner: The reviewer is a fresh session, ideally another model family, or the builder's family when no other can run, never the building thread resumed or forked and never a subagent of it.

## Set the model explicitly on every spawn.

- `2026-07-03`: a full day of mining agents, evidence filers and a benchmark babysitter ran silently at top-tier rates; the babysitter alone was about twenty rounds of purely mechanical work a mid-tier model does identically.

## Use the top tier adversarially.

- `2026-07-24`: The highest-value top-tier call of one day was "refute this audit", which overturned the parent's framing and trimmed two over-read magnitudes.

## Pull down, decide up.

- `2026-08-12`: a whole search-data scan ran in a top-tier parent — paginating an API, reducing 39K rows — when the only step that needed it was deciding that one 219K-impression row was worth zero.

## Parallelise on evidence, not impatience.

- `2026-08-20`: of eight commits, six touched one protocol file and five one host file, so almost nothing in the batch was parallel-safe; the two that touched neither were exactly the two that should have run alongside.

## Never two writers in one tree.

- `2026-08-19`: A fix written while a delegate built in the same checkout vanished silently when the delegate wrote its files back; `git status` showed the file identical to `HEAD`.

## Parallel stages merge through an integration branch.

- `Undated`: Two branches that pass alone can fail together (a test fixture from one predated a field the other made required).

- `2026-10-22` and `23`, a monitoring product: 39 merges into the integration branch, 16 with conflicts; 25 of the 37 conflicted files were shared docs. Two branches' migrations collided once, and the unapplied one was renumbered after the other, already applied with a later timestamp.

## Every merge checks the new migrations' timestamps against the ledger.

- `2026-11-01`, an evals product: a builder's timestamp matched, to the second, one applied on the main branch while it built.

## Parallel sessions share more than a tree.

- `2026-10-22`, a monitoring product: a design-review session created records in the gate's test account mid-run and turned the gate red, and development's workers picked up the suites' test records, about 90 checks a gate run racing their assertions.
- `2026-10-24`, a signed-in browser step failed two runs of three under a parallel review's load.

## Never `git checkout -- <file>` (or `git restore`) on a tree carrying uncommitted work.

- `2026-08-15`, twice in one day; one implementation was recovered only from a source map that still embedded the original TypeScript.

## When a build runs late, measure where the time went before changing the model.

- `2026-11-13`, a coding-agent client: the model worked about 35% of roughly 22 hours, with the rest in gate runs, review rounds and waiting. One stage's estimate rose from 6 hours to 12.5. The elapsed time alone did not show where the build was slow.

## Check the disk before believing a round happened.

- `2026-09-16`: A round that ran without write access returns a reasoned report that changed nothing and reads exactly like one that worked.

## Re-run its tests yourself, and rewrite any evidence it wrote from your own run.

- `2026-09-16`, `2026-09-17`: A delegated builder whose sandbox could not reach the database or a browser had no passing gate to report; twice its runs were written up with invented counts.

## Compare the test inventory before and after each delegated turn.

- `2026-11-18`, a builder for a live Q&A product rewrote a visual spec to cover only the changed states, silently dropping six captured states.

## Before passing a delegate's "commands for the owner" up, do every one you can.

- `2026-10-23`, a monitoring product: a handoff listed the identity provider's OAuth settings as owner settings; they were applied through its backend API with the instance's secret key and re-read, and the migrations and edge rollout in two other handoffs' owner commands were run by the coordinator.

## A builder's objection that is a product decision goes to the owner.

- `2026-11-01`, an evals product: a builder found that the brief's sample above a spending cap contradicted the brief's own overshoot bound; it was right, and which to keep was the owner's call.

## When you take a handoff over, put a dated status line at its top.

- `2026-10-24`: a handoff still opened "incomplete" and "uncommitted" after the coordinator had committed, reviewed and pushed it, and it claimed a deploy the environment log never recorded; review rounds found both.

## Audits record `HEAD` and `git status --short` at the start and again before delivering.

- `Undated`: An audit once reported a file "in limbo" whose deletion had been committed earlier the same session.

## Repeated correct fixes that don't work mean the model of the problem is wrong.

- `2026-08-21`: four rounds, each correct and green, none fixing the symptom.

## "Ready to test" means testable with nothing to do first.

- `2026-08-19`: the owner tested a fix twice against last night's build.
