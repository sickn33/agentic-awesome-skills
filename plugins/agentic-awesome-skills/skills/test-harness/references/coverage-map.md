# The coverage map

The record of what was verified, by which run, and what was not. What the map must contain for a reviewer — existing coverage, proposed tests, gaps, each row tied to a rule — is defined by the `shipping-artifacts` skill, and the `derive-tests` skill derives one from the docs and the suite. This file adds what a product that runs its own gate owes the map: who writes it, the run records, and the order of its sections. Where the two differ, the product's instructions win.

## Who writes it

- **Written by whoever ran the gate, and by nobody else.** A builder records only runs it performed, with their limits. The session agent rewrites stage-completion evidence from its own full run, not by editing the builder's numbers. (`2026-09-16` and `2026-09-17`, blocked builder runs were reported in the coordinator's name with invented counts.)
- **Update the map with its tests, starting in the first data stage.** Under `app-lifecycle`, it lands with stage 5's core docs. (`2026-11-14`, an evals product: core docs arrived two weeks into the build, after the original session was lost.)
- **Stage-by-stage harness receipts go here, not into the doc that describes the test method.** The method doc holds the harnesses and the rules; what each stage ran belongs in the map. (`2026-10-24`, a monitoring product's test-method doc had grown about 150 lines of per-stage harness tables above its method.)
- **In a product that keeps the map by hand**, the `derive-tests` skill in `check` mode lists where it is stale and writes nothing; never run the writing mode over it (`release-gate` § Static audits).

## Its sections

Kept in sections so it can never read falsely green.

**The evidence line, first:** "Evidence as of `<date>`. The last released revision is `<tag>`, promoted from `<commit>`."

### Gate runs

| Run | Tree | Result | Unit | Public browser | Authenticated browser |
|---|---|---|---|---|---|

- **Every exit code read from the log.**
- **A red run stays in the table beside the green re-run that followed it.**
- **A partial run says it is one**, naming what did not run — a builder's unit-only run in a sandbox with no database or browser is not a gate receipt. **"Written, not yet run" is a state of its own**, for a test that waits on something the shared environment lacks (a migration not yet applied to development), never folded into passing. (`2026-10-22`, a monitoring product's builder runs and a suite written ahead of its migration.)
- Beneath the table: the visual run's result and image count — the release set, or the full sweep when one was requested — taken from the exit line in its log.
- When the release changed an embedded agent: the live agent run on the exact commit (`release-gate`).

### Post-deploy checks

Per release: the smoke output; the code-and-schema probe with the route it used, the status it returned and the error code in its body; each runtime the push does not build, read current or deployed; the share cards read from the raw production response; and each check the procedure names but nobody has built, as *not run* (`release-gate`, `references/checklist.md § 4`).

### Existing coverage

Tests in the repository today, each tied to the rule it pins. **Every test file a doc cites exists** — check by path, because docs can cite a test nobody wrote. (`2026-10-22`, a monitoring product: a source guard replaced a test the docs cited and nobody had written.)

### Proposed

Recommended cases not yet written, each marked unit / integration / end-to-end / guarded live / manual.

### Journeys

**Map every journey in the flows doc to its end-to-end spec.** Record the actors, real sign-in or public entry, spec path and case, latest run, and any live or operator step outside the gate. Flag journeys whose only tests fake identity or the browser; those tests cannot establish the signed-in journey. Apply the `derive-tests` skill to check for missing specs.

| Journey (flows doc) | Actors and entry | End-to-end spec and case | Latest run | Uncovered or outside gate |
|---|---|---|---|---|

(`2026-11-14`, an evals product: its map repeatedly listed signed-in browser flows as uncovered while go messages quoted only unit and integration counts.)

### Gaps

Documented rules with no verification, ranked by exposure. Two things go here that would otherwise be lost:

- **A precondition the owner waived** — recorded here, not ticked in the release checklist.
- **Each capture cell the release set does not buy**, with why it was the cheapest to drop; the first is the next rotation's candidate (`captures.md`).

## What the first data stage must land with

The first stage that introduces the database lands with at least:

- **Each journey of the slice lands as a committed browser test.** Include real sign-in through the provider's own development component, one account per role, and two consecutive suite invocations. Under `app-lifecycle`, this is stage 5; paid or real-inbox steps remain in live or operator suites, with surrounding steps covered by the gate. (`2026-11-14`, an evals product: 77 reviews and nine development deploys had run without a browser test of the running app.)
- **cross-tenant isolation** — a member of one workspace cannot see or act on another's data;
- **the once-only action refused the second time**;
- **`<script>alert(1)</script>` renders as text**;
- **`/health` reports database status**;
- **the env schema refuses to boot on a missing variable** (`environments`, `references/variables.md`).
