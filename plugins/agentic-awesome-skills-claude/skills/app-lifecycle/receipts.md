# app-lifecycle: receipts

Each heading is a rule from `SKILL.md`, with the case that taught it.

## Keep the stage principles and substitute your stack's vendor mechanisms.

- `Undated`: The path was learned building SaaS products with coding agents on Next.js (App Router) + Supabase Postgres + Clerk + Netlify, tested with Vitest and Playwright. A live Q&A product walked every stage first; a monitoring product and several others followed.

## Follow the product's plan; only the owner skips or defers a stage.

- `2026-11-14`, an evals product: browser proof stayed "not started" through stages 0–5 and six later stages, item four of seven behind product work. No owner decision deferred it; a broad "create everything and go with full implementation" was treated as a waiver. On `2026-11-03`, an agent's recorded call had similarly moved past design without bringing it back; that story remains in `references/stages.md`.

## Tests and docs land with the change.

- `2026-11-14`, an evals product: 77 reviews and nine development deploys ran without a browser test of the running app. The owner required implemented end-to-end tests at every phase's end; exploratory screen checks alone did not meet that need.

## Core docs arrive with the first real slice by default.

- `2026-11-14`, an evals product: architecture, flows and assumptions were first written two weeks into the build, after its original session was lost. Five agents had to read code to reconstruct the system. Feature docs had become dated build notes with current truth in the last paragraph. Plan statuses stayed "click-through pending" for weeks, with no stage closed against its done-when. The owner moved core docs to stage 5 and added check-only docs and plan-status checks at each stage end.

## Keep product decisions, operational changes and completion judgement with the coordinator.

- `2026-11-14`, the owner allowed builders to run and fix development suites, with one runner on shared data. Deploys, applied migrations, pushes, provider settings, secrets, production credentials and final stage judgement remained with the session agent.

- `2026-11-16`, owner on scope found while building: "Common sense. Unless something truly costly, state the assumption and continue." Costly choices come with their size and a cheaper option.

## Order every stage and phase by visible value against cost.

- `2026-11-03`, an evals product: its plan followed the proposal's build order, so after three phases and 22 review rounds, ten of them on the hard logic of paid sampling, it had no landing, legal pages or pricing. The owner: "Seeing app with all those elements that costs a little is wow. Debugging hard logic for hours isn't."

## A stage closes when its done-when holds on the coordinator's evidence.

- `2026-10-22`, a monitoring product: ten minutes of its owner using a preview found six problems no review had.
- `2026-11-14`, an evals product: a green product-defined gate omitted both browser suites through nine development deploys. The session agent now compares the gate with the applicable suite contract rather than trusting its name.

## Example prompts are one way to drive it.

- `Undated`: A set of prompts walked a live Q&A product through stages 0–8, one per stage. Each told the agent where it sat in the lifecycle, not how to do its job, because the instructions already held the how.

## An owner away from the machine can still sign a CLI in by device code.

- `2026-10-31`, an evals product signed its reviewer CLI in this way.

## Let the coordinator choose phase boundaries for agent capacity and quality.

- `2026-11-16`, owner: "Rather than prescribing everything I’d rather trust the agent to choose best and propose the exact split that works for it considering what agents can handle and what will slow us down vs. what will improve quality." Three phases for a new product were a suggestion, not a mandated split.

## Offer phase previews without making owner absence a coding dependency.

- `2026-11-16`, owner: "Once you’ve reviewed everything and the phase is complete, I may look at the software and provide feedback … most of the time I’m not here, and that shouldn’t block coding agents."

## Plan for the cases people meet, and state the rest as assumptions.

- `2026-11-18`, the owner, after one release's review rounds rated rare triggers Medium and two fixes added machinery that was later replaced by a stated assumption, asked for this weighing in planning and in fixing bugs, not only in review triage.

## Recommend stopping to use the product once it does its key job.

- `2026-11-19`, an agent product (an editor extension, a desktop app and a web relay): a build doing the feature's key job existed from stage 4 of 7. The coordinator never recommended using it, because the owner had said he would test at the end and this skill said early previews require the owner's request. Stage 5 then took nine review rounds, about 22 to 31 hours (9 rounds at the builder logs' 2.5 to 3.5 hours each), without one observation from use.

## Prove an untested premise live before a stage builds on it.

- `2026-11-20`, an agent product's editor extension: a four-minute live proof ran before a small build's third stage, and that stage's review found nothing. In a larger build of the same product, one area's design changed more than once inside a review series.
