# release-gate: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## On another stack, keep the principle and swap the mechanism.

The rules come from two kinds of product, named here only by kind. The web-app half — the bars, the preview, the promotion checklist, go-live, the verify probes, Netlify's edge — was learned on Next.js (App Router) + Supabase + Clerk + Netlify, with Vitest and Playwright, by several products (a live Q&A product, a monitoring product with worker boxes and edge workers beside its web app, and others). The client+backend half — any release as one logged checklist, the backend before the client, artifacts and store listings, issues — was learned on a remote-control product: a relay service with a web client, and an editor extension with desktop installers that drives a CLI agent (`references/runbook.md`). (Undated in the original.)

## Phase ends and deploying pushes require the full applicable gate.

- `2026-11-14`, an evals product: nine development deploys passed a gate with no `e2e` or `e2e:auth`. A promotion-only requirement left the missing browser suites outside the development bar. The owner made the applicable contract the default for stage ends and every deploying push, with narrower gates recorded in the plan.

## Close stages with coordinator checks, reserving the full process for phases.

- `2026-11-17`, the Claude Code team's account of how it verifies changes (Addy Osmani, "How the Claude Code team thinks about verification", claude.dev, 2026-11-16, read `2026-11-17`): each of 39 reliability checks has a trigger readable from a diff, the check, and the incidents behind it; a change runs only those it matches, usually 3 to 10. And: "If a change can modify the check that judges it, the check is broken." With the fresh review moved from each stage to each phase, the stage-end read is where a product's own checks run.
- `2026-11-16`, owner: "The exploratory look at the screens is done by the managing session, not by the session that built it."

## Offer owner previews after phase checks without blocking the next phase.

- `2026-11-16`, owner: "Once you’ve reviewed everything and the phase is complete, I may look at the software and provide feedback … most of the time I’m not here, and that shouldn’t block coding agents."

## Every preview and go message names each suite that did not run.

- `2026-11-14`, an evals product: go messages listed passing unit and integration counts and clean reviews. Its coverage map repeatedly said signed-in browser flows were uncovered, but the owner never saw that gap in the go message.

## A host that deploys by CLI upload deploys the working tree, not a commit.

- `2026-11-01`, an evals product's first deploy: this skill and `environments` both assumed a host that builds from a git branch.

## Local scheduled jobs run a released copy that changes only at release.

- `2026-11-18`, A scheduled job for a desktop tool that writes to an external system's API ran unreleased working-tree changes against production. The job was repointed to a released copy that is updated only at release.

## Stamp every upload with its commit.

- `2026-11-03`, an evals product's worker stop and start script: each found only by running it. A stopped deployment stays in `activeDeployments` with status `SUCCESS` and `deploymentStopped: true`, and reading `environmentStagedChanges` creates an empty staged record (`{ patch: {} }`), so a "nothing staged" check ignores an empty patch.

## Read the exit code from the log, never the notification.

- `2026-09-17`, a visual sweep's log ended `VISUAL_EXIT=1` under an exit-0 notification.

## An inherited report is a claim, not evidence.

- `2026-09-16`, a verified-sounding handoff missed unapplied production migrations.

## The coverage map is written by whoever ran the gate, and by nobody else.

- `2026-09-16` and `2026-09-17`, blocked builder runs were reported in the coordinator's name with invented counts.

## A caveat is a claim about the world, and gets checked like one.

- `2026-08-25`, twice in one session: "never fired on a schedule" with nineteen scheduled runs on disk, and "still needs a live connect" with the token already saved.

## Use fresh Codex when no reviewer is named.

- `2026-11-18`, the owner moved builds and reviews to GPT-6.2 Sol at `xhigh` and made a fresh Codex session the default reviewer, replacing Grok.

## The push applies nothing to the database.

- `2026-09-16`, three migrations were absent from production through a handoff that called the release verified.

## Unread means on.

- `2026-10-24`, a monitoring product: every push to its production branch drew the provider's check against the production project, and whether that run applied migrations was a setting nobody had read.

## Reach production through its connection string only.

- `2026-10-23`, a monitoring product: a review round observed `db push --linked --project-ref <production ref>` write to the linked project. On CLI 2.122.0, read 2026-10-25, a probe with dummy refs saw the typed ref used for the first request, so the precedence of that pair is not something to rely on across versions; a connection string names one database on every version.

## Send the owner a preview after phase checks and any closing deploy.

- `2026-10-22`, a monitoring product: through a tunnel to `next dev`, its owner found six problems no review had — placeholder examples naming the owner's own app, guessed defaults such as `/api/health` and `$.db.ok` prefilled as if they were real, both free-tier locations in Europe, an image size limit, an accent colour that did nothing visible, and a switch for a feature not built yet.

- `2026-11-16`, a live Q&A product: the owner placed the preview after phase tests and full review, while keeping early previews available on request.

## List changed flows as actions with their expected results.

- `2026-11-03`, an evals product's owner, meeting a placeholder landing: "Did you create legal pages, landing page …?"

## "Ready to test" means installed on every surface the owner holds, with nothing for the owner to do first.

- `2026-08-19`, the remote-control product: the owner tested two fixes against the previous night's build and had to ask whether they had been reinstalled.

## First prove the new build is the one serving.

- `2026-09-19` and `2026-09-21`, a live Q&A product: a chunk-hash probe that could never move, then a removal probe that could never reach zero.

## A push deploys one runtime; every other keeps its last bundle.

- `2026-10-23` and `2026-10-24`, a monitoring product: its probes ran a build without a new check type for a day while every monitor of that type alerted; a release that changed a shared module but no probe folder left every box behind; and a deploy from a detached operator checkout shipped the previous release while its status read current.

## Behind a CDN, prove on a path it never caches.

- `2026-10-24`, a monitoring product moving its status-page host behind Cloudflare: review rounds found its written procedure repointing DNS before the new host read ready, and calling the move done on a script the CDN could serve from cache.

## A deploy can change behaviour nothing in your diff touched.

- `2026-09-17` and `2026-09-18`, identical edge configuration enforced, stopped enforcing, then enforced again.

## If a script exists for a step, use the script.

- `Undated`: A hand-rolled release once attached a staging build to the public release.

- `2026-11-05`, a VS Code extension: one command checks the branch, runs every gate and checks the tag is free, then packages, pushes, waits for CI on the pushed commit, tags, publishes the release with its changelog section and installs it, with `--dry-run` and a skip per gate; the version bump, the changelog and the second store's publish stay the owner's.

## Run each release as one ordered, logged checklist.

- `Undated`: A live Q&A product's release doc lists its no-go checks with their commands, a go/no-go paragraph ("Silence is not go"), the promotion commands with the production refs spelled out, and how to prove the release serves. A skipped gate is a recorded waiver. (No separate date in the original's `2026-11-05` release examples.)

## The backend ships first.

- `2026-11-18`, A build for a live Q&A product started before sessions agreed on the contract. The sessions went on to agree explicitly and pin the version of the identical contract file in each repository. When a response enum gained a value, the compatibility assessment missed that the client's parser would reject it. The backend change waited until the tolerant client was live.

## The branch a plugin or skill marketplace serves is production.

- `2026-11-07`, a skill collection: two commits pushed after a release's tag reached auto-updated installs within the hour, a skill rename among them, before their review had finished.

## Keep owner feedback in the phase currently in flight.

- `2026-11-16`, owner: "Once you’ve reviewed everything and the phase is complete, I may look at the software and provide feedback … most of the time I’m not here, and that shouldn’t block coding agents." The plan records untried phases; release go names them.
