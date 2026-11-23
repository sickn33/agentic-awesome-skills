---
name: test-harness
description: 'Writing or running tests, proving a fix, a red or flaky run, a fix that didn''t land, ''is it verified'', ''run the gate'': tests where green means something.'
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Test harness — so a green gate means something

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Writing or running tests, proving a fix, a red or flaky run, a fix that didn't land, 'is it verified', 'run the gate': tests where green means something.


**Make each harness prove something real before trusting its green result.** A suite can pass against the wrong server, database, fixture branch, or developer's `.env` and prove nothing. This skill arranges the harnesses, defines gate runs and reporting, and keeps green runs honest with rules learned from bugs.

**On another stack, keep the principle and swap the mechanism.** Each rule states its principle first and the mechanism second. The web-app mechanisms use Next.js (App Router), Supabase Postgres, Clerk, Vitest, and Playwright. The two-halves mechanisms were learned on a relay service with a web client and an editor extension with desktop installers that drives a CLI agent.

**The product's own instructions come first** — where they name its scripts, folders, or coverage file, follow them.

## The one question: what does each harness fake?

**A bug survives exactly where every harness fakes the same side.** Coverage of surfaces is not coverage of journeys. Before adding a suite, write down what it makes real. If everything else already fakes the same side, it mostly re-covers ground.

| Harness | Makes real | Fakes | Runs |
|---|---|---|---|
| Unit | pure modules: authorization functions, schemas, token hashing, limits, escaping, the env schema, source guards, the edge-rule numbers | database, identity, browser | gate |
| Integration | the development Postgres: the applied schema, deny-all, cross-tenant, invariants and races through the real SQL functions | identity (a mock verifier behind the same seam as the real one) | gate |
| Schema catalog | every public relation and function, enumerated from the catalog so future objects are covered | identity, fixtures | gate |
| Browser, public | a real browser on a phone profile against the development database; the anonymous journey needs no account | member identity | gate |
| Browser, authenticated | the identity provider's real development instance and real sessions, an account per role | mail | local gate |
| Visual | a bounded release set of captures; on request, a full sweep | identity where a capture does not sign in | outside the gate, on purpose |
| Live agents (only with embedded agents) | the real model with each agent's tools | — | outside the gate: it costs money |
| Smoke | a deployed URL, write-free | — | after every deploy, last |

**When a product has two halves, ask what is faked per half.** This includes a backend and client, or a host and the vendor tool it drives. Defects needing both real halves, or a restart mid-journey, are invisible when every suite fakes the other side. Build one harness with both halves real that can kill a process mid-journey. Add a compatibility suite that holds an old client working against the new backend.

Every row in full, including its target and run placement, is in `references/harnesses.md`. That reference also covers the two-halves harnesses, browser configs, script contract, and authenticated mile.

When an external create lacks an idempotency guarantee, follow `references/external-creates.md` before the first review.

## The gate

**Run the full local gate at phase end and before deploying pushes.** Development deploys need browser coverage too. By default, `gate` runs `typecheck`, `test` (unit + integration), `e2e`, then `e2e:auth`, in that order, as applicable to the product's shape and current stage. Compare the actual script with `references/harnesses.md`'s script contract; a green script can omit a whole suite. The owner decides any narrower gate; record that choice in the plan, with its reason and revisit trigger.

`visual`, the live agent suite, and `smoke -- <url>` run outside it on purpose. There is no hosted CI unless wired as its own change (`release-gate`). If wired, it runs the gate minus the authenticated mile. The local gate covers that gap: never skip it silently, and name any suite that did not run.

**Run touched tests at stage end; reserve full gates for phases.** The coordinator runs new and touched tests itself and checks changed journeys' end-to-end specs. Run the full gate on the finished phase before visual checks, the docs check and fresh review. Rerun it on the cleared state if a fix followed its last full run, before the closing push. Apply `release-gate` § Stage and phase close for the full sequence. Time one full run and write it in the plan. Phase estimates count required runs. A gate of a couple of minutes can run on every piece.

## Tests and docs are part of the change, not a later step

- **Budget integration tests in round trips to the real database.** Include fixture setup and cleanup at the target's measured latency. A test needing more than 30 seconds states why and sets its own limit; don't raise the whole suite's timeout. When the builder cannot reach the database or launch the browser, budget one integration-fix pass by the session agent after its first real run. Put that budget in both the brief and stage plan.
- **A bug fix lands with a regression test run against broken behaviour.** It must fail on the broken behaviour and pass with the fix; run the failing half, don't assume it. Run the new test on the tree before the fix: the parent commit, or the fix reverted. If it passes there, the bug was not what the finding said: revert the fix and keep the assertion. Prove a review finding's fix the same way.
- **Any other behaviour change lands with the tests it owes** (below and in the references). Put each new test in the harness whose Runs column says where it runs: in the gate, outside it, or by hand. **Say which in the summary.**
- **When a rule must hold for every input, test it as a property.** An example picks inputs with its writer's bias; a generator does not. State what cannot fail: a round trip, an invariant, idempotency, or two implementations agreeing. Let fast-check, Hypothesis or proptest try to break it, with a bounded run count in the gate. Commit each counterexample as a regression test.
- **When a rewrite must not change behaviour, run old and new on the same inputs.** Every difference is a bug or an approved change. Normalize what does not matter, such as whitespace, and list the approved differences. Inputs come from generators, fixtures or a corpus, never production data.
- **Each stage lands end-to-end tests of journeys it adds or changes.** Write each flow's test once and commit it with the change; the gate reruns older journeys. A scratchpad script or an exploratory click-through leaves no durable regression check. A mocked session tests data rules, not the signed-in journey. Steps costing money or needing a real inbox stay in the live or operator suite; the gate covers the steps around them. The owner decides exceptions, recorded in the plan with a revisit trigger.
- **The builder runs its tests and fixes failures before the handoff.** Give it development test access and serialize suites on shared data. Apply `codex-agents` for a Codex build's test-running mode and `delegation` for its boundaries. Where the tool or platform cannot run them, name the concrete blocker and the session agent's checks; budget the fix pass above. A test changed to make it pass is named in the handoff, with why: a loosened assertion or an added fallback can turn a real failure green. The coordinator reruns touched and new tests at stage end and the full gate at phase end.
- **Every change updates the doc lines it made false.** If a doc disagrees with code you did not change, say so in the summary and let the owner decide which side moves. When instructions are silent, the skills' defaults apply. When those are silent too, decide and say so in the summary. When a library default conflicts with the product's instructions, the instructions win.

## When a fix doesn't land

**After two fixes that pass their checks and leave the reported symptom unchanged, stop fixing.** Green checks with an unchanged symptom mean the model of the problem is wrong: the tests exercise a sequence the person never meets. Write down the explanations still standing. Get one observation whose outcome tells them apart: a screenshot, a log line from their run, or a question answerable in a minute. Ask after the second fix that didn't land, not the fifth.

- **First check that the person is running your build.** A fix tested against yesterday's install fails twice for no reason in the code.
- **Reproduce the original symptom before the next fix**, in a test or by hand, and keep that reproduction. It is the regression test the fix lands with.

The fix that lands comes with a test that reproduced the symptom before it, and the person confirms the symptom is gone in their own run.

## Boundary tests for features that touch data

**Every feature that touches data gets the boundary and integrity tests its mechanisms need.** These checks establish:

- **Every data route refuses cross-tenant access.** Check a workspace A member cannot see or act on workspace B's ids.
- **Once-only actions refuse repeats and enforced quotas hold under a race.** Run these checks where those mechanisms exist.
- **Untrusted content rendered by the app displays a script tag as text.**
- **Replayable work runs twice and acts once.**
- **Scoped tokens do only what their scope permits.**
- **Every page renders once:** A page-level smoke in the browser suites opens each page as each role, with a foreign workspace's id, and signed out. Assert it renders, refuses, or sends to sign-in as its permission row says, never an error page. Per-route tests prove refusals; only this proves every page renders.
- **Every new database function runs end to end once**, in the integration suite against the applied schema, with the rows it will meet. A migration applying and a catalog check passing prove nothing about a body plpgsql checks only when run (`supabase-production`, `references/gotchas.md`).
- **Test deletion of a fully populated workspace as one test.** Put a row in every table a member can fill, then delete the workspace. The deletion completes and leaves none.

The `saas-authorization` skill explains what each protects and why invariants live in the database rather than code.

## Reporting a run

- **Read every exit code from the log, never the notification.** A background wrapper can report exit 0 while the command inside it failed.
- **The gate is the exit code, never the printed counts.** A run can print every test passed and exit 1 on an unhandled rejection. Counts without the exit code establish nothing (`references/rules-from-bugs.md § Reading a red run`).
- **An inherited report is a claim, not evidence.** Re-run the gate yourself before repeating a count.
- **Copy a red run's failure artifacts out of the output directory before rerunning.** The runner can erase them on startup.
- **Every preview and go message names each suite that did not run.** Counts alone can read as full coverage. For example: "Unit and integration passed; `e2e` and `e2e:auth` did not run: browser launch blocked." Include the reason and what unblocks each missing run.
- **The coverage map is written by whoever ran the gate, and by nobody else.** A builder records only what it actually ran, including blocked or partial suites. Read every line it adds and rewrite completion evidence from your own applicable run, never by editing its numbers. Use `references/coverage-map.md` for the map's format.
- **A green run that flakes is not a pass.** Judge a suite on a series. Record both a red run and the green one after it. A flake goes in the backlog on its first appearance; its second makes the fix due (`references/rules-from-bugs.md § Reading a red run`). Never cure one with a sleep, a retry until green or a skip: each hides the cause. A suite that has never been green reports nothing and hides the next real red.
- **A failure whose duration equals the budget is a hang until shown otherwise.** Read the trace, network, and whole log body before the failure list (`references/rules-from-bugs.md § Reading a red run`).

## The rules most often missed

Each of these rules has its receipt in the references. They are the ones that cost the most when skipped.

- **A fallback in a test is a bug in disguise.** "Try the new way, else the old way" passes exactly when the thing under test is absent. Assert the one true path.
- **A pin must not pass against a dead branch.** A substring assertion is satisfied by `if (false && …)`. Assert the whole conditional and watch it fail under that mutation.
- **A new precondition breaks the harnesses CI does not run.** If a change adds something a person must do before the product starts, every harness launching a real instance must seed it. Run the suites outside CI before the release, not inside it.
- **Test sign-in the way a new user meets it**, with no saved credential on the machine; a signed-in machine passes a broken sign-in.
- **A reused server can be a build from before your change.** The browser suites never reuse a server already on the port. When an assertion disagrees with source you just edited, check what answers the port before changing code.
- **The developer's `.env` is a harness default.** Pin every optional configuration a suite's meaning depends on in the shared server module. Otherwise, one assertion means different things on different machines.
- **A DOM assertion cannot see a layout.** Claims about layout need geometry, and a person looks at the captures.
- **A check that covers a class names who can reach the state.** Before a width, a state or a timing goes into every scene, write down who can reach it. A check of states nobody reaches fails on non-defects.
- **Nothing else touches the gate's data while it runs.** Run browser suites one at a time: they share a server and test accounts, and each resets what those accounts own. The same holds for every other actor on development. That includes a parallel agent driving a test account and a background worker acting on the suites' fixtures (`references/rules-from-bugs.md § The harness's environment`).

  **A deployed worker never stops**. Before the first deploy running one against development's database, scope it away from test-account workspaces or give the suites their own database. That can be a test project or the local stack. Until then, let suites' setup fail loudly when anything outside them has claimed one of their fixtures.
- **Never test against production data or with production credentials.** Use the development instance, development project, and dedicated test accounts. Only the smoke touches production, and it writes nothing.
- **A generated file can arrive rewritten by the tooling that wrote it.** A backtick inside `git commit -m "…"` is command substitution: the shell runs the word and replaces it with its output, usually nothing. The text vanishes silently. Commit messages go through a heredoc (`git commit -F -`). A test written through a shell into an interpreter is rewritten the same way. Generate through the fewest layers, using the agent's file-write tool, and read the bytes produced (`references/rules-from-bugs.md § Generated files`).
- **A suite outside the gate rots silently.** A screen's captures are part of its surface. Update visual specs in the same stage, and run the visual suite at phase end when screens changed.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

Your own run covered the tests the piece touches, or the full gate at the phase's end, and you read its exit code. Each new test sits in the harness whose Runs column says where it runs. The coverage map was updated from the full gate's run.

## Files

| File | Holds | Read when |
|---|---|---|
| `references/harnesses.md` | every harness in full; harnesses for a product with two halves (both real, old-client compatibility, the wire between DOM suites, operator checks, the authenticated canary); the two browser configs and the shared server module; the script contract; the authenticated mile | adding a suite or a script; a client and its backend; setting up or debugging the authenticated browser suite |
| `references/rules-from-bugs.md` | the gate and harness rules, grouped by moment: reading a red run (the exit code, flakes, hangs, rotted checks); writing assertions; fixtures; irreversible identifiers; the database; servers, builds and worktrees; browsers and layout; the harness's environment (preconditions, sign-in without a credential); same-origin checks; generated files | writing or running any test; a red, flaky or hanging run; creating or removing a worktree |
| `references/captures.md` | the capture harness and the exploratory pass: the release set as a budget, where captures live, sweeps | at the end of a phase that changes a screen; before a release's visual pass |
| `references/vendor-surfaces.md` | vendor-rendered elements measured from the DOM; API response parsers and shared contract suites; link previews asserted on the raw response; icons and generated images | testing a third-party component, API contract, share card, icon or OG image |
| `references/external-creates.md` | durable recovery for non-idempotent external writes and fault-injection tests | before reviewing a change that creates objects without an idempotency guarantee |
| `references/coverage-map.md` | the coverage map's sections and who writes it | after a gate run; at a release; when a stage adds tests |

**Use the related skills for screen claims, coverage documents, and release mechanics.** What a screen may claim and what to verify visually are outside this skill: widths, states, themes, roles, and the 320 px floor. Use the `ui-design` skill's `references/screens.md`. The coverage map as a document, including its required reviewer contents, is `shipping-artifacts`. The `derive-tests` skill derives one from docs; its `check` mode lists stale entries and writes nothing. Use `release-gate` for the release checklist. The identity provider's harness mechanics in depth are `clerk-production`; the database's catalog posture and error codes are `supabase-production`.

**The folders and scripts named here are a suggested layout:** Call yours what you like:

- `tests/unit/`, `tests/integration/`, `tests/e2e/` (`*.auth.spec.ts` for the authenticated suite), `tests/visual/`, `tests/live/`, `tests/smoke/`;
- `typecheck`, `test`, `e2e`, `e2e:auth`, `gate`, `visual`, `agents:live`, `smoke` (`references/harnesses.md § The script contract`).

The coverage map is the product's record of what was verified, by which run (`references/coverage-map.md`). The variables doc lists every environment variable the code reads. The kit is the product's design system and component primitives (`ui-design`).

## Example

Reproduce a duplicate webhook in a disposable fixture and assert that two deliveries produce one domain event. Record the fixture and test output.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/ai-shipping/skills/test-harness).
