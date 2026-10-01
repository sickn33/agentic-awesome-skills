# Code quality, review and delivery metrics

Contents: 1 Why this exists · 2 The two layers · 3 Layer 1 — automated gate · 4 Layer 2 — the review dimensions · 5 Test quality (not coverage) · 6 Reviewing agent-written code · 7 Delivery and codebase metrics · 8 Anti-metrics · 9 What to research and cite each run · 10 Where this lands in the blueprint · 11 Review checklist to embed verbatim

## 1. Why this exists

Every story in this blueprint is written by a coding agent in a fresh session and reviewed, usually once, by one human who did not write it and may not read every line. That is the exact condition under which quality problems become invisible: the code compiles, the tests are green, the demo works, and the defects are in the parts nobody looked at.

So the blueprint does not say "write good code". It specifies, before any code exists:

- what a machine checks on every change (Layer 1 — objective, non-negotiable, in `check`),
- what a human looks for and in what order (Layer 2 — judgement, a fixed checklist),
- how the system's health is measured over time (metrics that diagnose the *process*, never rank people),
- and what is deliberately not measured, because measuring it makes the codebase worse.

A reviewer who has to invent the standard at review time applies a different standard every time. A written standard is what makes "approved" mean something across ten sessions.

## 2. The two layers

Keep them strictly separated. It is the single highest-leverage rule in this file.

| | Layer 1 — the gate | Layer 2 — the review |
|---|---|---|
| Who | CI / `check` | A human (and optionally an AI reviewer) |
| What | Anything objectively decidable: format, lint, types, tests, coverage floor, schema drift, dependency audit, secret scan, bundle/query budgets, architecture rules | Design fit, boundaries, reversibility, failure behaviour, test *meaning*, security reasoning, copy and locale, naming |
| Failure mode it prevents | Reviewers spending attention on things a machine decides better | Rubber-stamping, because the human has nothing specific to look for |
| Rule | If a human is arguing about it and a machine could decide it, it belongs in Layer 1 by the next epic | If a machine could not decide it, it is never "fixed" by adding a linter rule |

Anything objective that a reviewer has to remember is a Layer 1 gap, and it gets a story. Formatting arguments in a PR thread are a defect in the process, not in the code.

## 3. Layer 1 — the automated gate

`check` is one command, runs locally and in CI identically, and is the definition of "green". Specify in the blueprint, with the actual command and the expected runtime:

1. **Format** — a formatter with zero configurable opinions left open; check mode in CI.
2. **Lint** — strict rule set; warnings are errors in CI. Include correctness rules, not only style (unused results, floating promises/unawaited futures, exhaustive switch, no implicit any-equivalents).
3. **Types** — the strictest mode the language offers, escape hatches banned by lint (`any`, `unwrap`, `!`, `# type: ignore`) or requiring an inline justification comment.
4. **Tests** — unit + integration; e2e on the critical paths. Fast enough to run per-change (state the target, e.g. unit under 2 minutes).
5. **Coverage floor** — a *floor to stop regressions*, not a target to chase (see §5 and §8).
6. **Migration/schema drift check** — the schema in the repo matches what migrations produce; no divergence.
7. **Dependency and secret checks** — vulnerability audit at a stated severity threshold, license check, lockfile committed and verified, secret scanning on the diff.
8. **Architecture fitness functions** — the module-boundary and dependency-direction rules from the architecture section, enforced as tests (see `architecture-decisions.md` §6). Without these, boundaries erode silently across sessions.
9. **Budgets** — whatever performance budget the product declares, asserted where it can be: query count per endpoint (N+1 guard), payload size, bundle size, p95 on a seeded dataset.
10. **Accessibility and locale checks** where a UI exists — automated a11y rules on key screens, and a check that no user-visible string is hardcoded outside the copy/i18n catalogue.

Two rules about the gate itself: **it never gets weakened to make a change pass** (weakening it is its own DR entry with a reason), and **a flaky test is a broken gate** — quarantine it in the same session with a story to fix it, never re-run until green.

## 4. Layer 2 — the review dimensions

In this order. The order is the point: it is roughly the cost of being wrong, and a reviewer who runs out of attention should run out of it at the bottom, not the top. Google's own review guidance leads with design for the same reason — a bug is cheap to fix relative to a wrong boundary.

**D1. Does it do the specified thing?** Every AC of the story, checked against observable behaviour, not against the author's summary. Anything built that no AC asked for is scope leak: either an AC is missing (amend the blueprint) or the code is.

**D2. Design and boundaries.** Does the change sit in the right module? Does it create a dependency the architecture forbids (fitness function should have caught it — if it did not, the rule is missing)? Is logic duplicated that already exists elsewhere? Is it the framework's blessed path or an invention? Cheap to fix in code, expensive to fix in structure.

**D3. Reversibility.** Flag one-way doors explicitly: schema changes on populated tables, public API contracts, event formats, a new external dependency, anything that writes data in a shape that will be hard to migrate. One-way doors get more scrutiny and a DR entry; everything else gets less. Treating both the same is how teams end up slow *and* fragile.

**D4. Failure and edge behaviour.** Walk the story's edge-case list against the code: empty, one, many, maximum, boundary; null/absent vs zero/empty-string; duplicate submission and idempotency; concurrent modification; dependency timeout, 5xx, partial response, slow response; offline mid-action; retry policy and whether retries are safe. The happy path is not where defects live.

**D5. Test meaning.** See §5. Does the test fail if the behaviour breaks? Does it test behaviour or implementation? Would it survive a refactor?

**D6. Security.** Input validated at the trust boundary; authorization checked per *object*, not just authentication at the door (an ID in a URL is not a permission); parameterised queries; output encoded for its sink; secrets not in code, logs or error payloads; PII not logged; upload type/size validated; rate limits on anything that costs money or sends messages; dependency added is one a human recognises (typosquat check). This dimension is non-optional on AI-written code — see §6.

**D7. Behaviour at real scale.** Not "is it fast" but "what happens at 100× the current data". Query per loop iteration (N+1), missing index on a filtered/sorted column, unbounded result set with no pagination, whole-table load into memory, an operation that is O(n²) on something that grows.

**D8. Observability.** Can this be diagnosed at 3am by someone who did not write it? Structured log at the decision points with a correlation ID, no PII; a metric for the outcome; errors reaching error tracking with enough context; health of any new dependency visible.

**D9. Copy, locale and accessibility.** Strings come from the copy table by ID, not improvised; every state of the screen has its line; digits, dates, currency and direction follow the locale rules; focus order, labels, contrast, touch targets.

**D10. Readability.** Naming that a stranger reads correctly; comments that explain *why*, not *what*; complexity that could be reduced without loss. Last on the list on purpose — it is real, but it is where review attention gets spent when the reviewer has no better checklist.

**D11. Size and shape of the change.** Reviews of 200–400 changed lines are where defect detection is strongest; past roughly 400 lines detection falls off, and past 60–90 minutes of continuous reviewing it falls off again. This is a claim about the reader, not the author, so it survives the fact that an agent can produce 2,000 lines in a minute. If a story routinely produces more than that, the story is too big — split it in the blueprint.

**The standard for approval** is not perfection: approve when the change definitively improves the system and carries no unacceptable risk, and file the rest as follow-ups. A review that blocks on preference is as expensive as a review that catches nothing.

## 5. Test quality, not test coverage

Coverage tells you a line executed. It does not tell you a test would notice if that line were wrong. The check that matters: *if I deliberately break this logic, does a test go red?* A test that passes against broken code is worse than no test, because it also blocks the refactor that would have removed it.

Specify in the blueprint:

- **Behaviour over implementation.** Tests assert observable outcomes (returned value, stored row, emitted event, rendered state, HTTP response), never internal call sequences or private structure. Heavy mocking of the unit's own collaborators is the usual tell.
- **Real assertions.** A test that only asserts a type, a length, or "no exception thrown" is not a test. Enumerate the specific expected values.
- **Red before green.** The story's tests are written to fail against the unimplemented behaviour and pass after; the session records that they were seen red. This is the cheapest possible mutation test.
- **Mutation testing on the critical modules** where the stack has a maintained tool: pricing, permissions, validation, money, state machines. Mutation score on those modules is a far better signal than global coverage, and unlike coverage it does not reward padding. Verify tool availability for the chosen stack; if none exists, say so and rely on red-before-green plus targeted boundary tests.
- **Determinism.** No wall-clock, no real network, no shared mutable fixtures, no ordering dependence, seeded randomness. Time and randomness are injected.
- **Fixtures over inline literals** for anything reused, so a schema change breaks one file.
- **The critical e2e paths are named** (3–5, no more) and kept green; everything else is unit and integration.

Coverage still appears — as a floor in `check` that prevents silent regression, with the explicit note that raising the number is never a story goal.

## 6. Reviewing code the agent wrote

This blueprint's whole premise is that most code is machine-authored, which changes the defect profile rather than removing it. The published evidence is consistent enough to design around: security performance of generated code has stayed roughly flat while volume exploded — Veracode's 2026 report puts the security pass rate near 56% across 100+ models even as syntax correctness sits near 100%; GitClear's longitudinal analysis of hundreds of millions of changed lines shows duplication and short-term churn climbing while refactoring/code-reuse ("moved" code) collapses; and DORA's 2025 research finds AI raising throughput while delivery stability still degrades, with review capacity becoming the bottleneck. Verify the current figures each run (§9) — the shape of the finding matters more than the exact number, and the numbers move.

Practical consequences to encode in the blueprint:

1. **Syntactic confidence is not correctness.** The code will look idiomatic and be wrong about *your* system: a stale API signature, an invented parameter, a plausible library that does not exist, a config key that was renamed two versions ago. Every external symbol used in a story must trace to a version-pinned dependency listed in the stack section; anything else is a review stop.
2. **Security is the first-class review dimension, not the last.** Assume generated code is untrusted input until checked. SAST/dependency scanning in `check` catches the mechanical classes; D6 catches authorization logic, which tooling cannot.
3. **Duplication is the default failure.** The agent cannot see the helper you already have. Before writing, the session searches the repo for an existing implementation; the review asks "have I seen this function before?" A duplication detector in `check` is worth its cost.
4. **Churn is the honesty metric.** Track what share of code is rewritten within ~2 weeks of merge. It is the number that tells you whether extra output is actually delivering, and it is the one that AI-assisted teams most often never look at.
5. **A human is the author of record.** "The model wrote it" is not an explanation. Whoever merges owns it and must be able to explain the non-obvious decisions in it. If they cannot, the change is not ready — and that is the honest test of whether review is happening at all.
6. **Annotate before review.** The session's handoff summary states what changed, what was deliberately not done, which ACs each part satisfies, and every deviation from the blueprint. Author-annotated changes review far better than raw diffs.
7. **Review load is the real constraint.** More generated code does not mean more shipped value if it queues behind one reviewer. This is why stories are sized for a 200–400 line diff in the first place.

## 7. Delivery and codebase metrics

These diagnose the system, at team level, over time. Every one of them is a way of generating a *question*, never a verdict. Put in the blueprint only the ones the product will actually instrument, each with definition, data source, the epic that instruments it, and a starting target tagged `[ASSUMED]` when it is a guess.

**Delivery (DORA).** The four keys — deployment frequency, lead time for changes, change failure rate, failed-deployment recovery time — plus rework rate, which DORA added in recent research, and reliability as a quasi-metric tied to stated SLOs. They earn their place by being counterbalanced: speed and stability cannot both be gamed at once. Confirm the current formulation and the current benchmark bands each run rather than quoting last year's.

**Review process.** Time to first review (target: same working day), review cycles to merge (1–2 for ordinary work; more usually means the requirement was unclear, not that the code was bad), median diff size, reviewer distribution (concentration is a bus-factor and a bottleneck at once), and the share of changes merged with no substantive comment.

**Codebase health.** Rework/churn rate (share of lines rewritten within ~2 weeks), duplication trend, revert and hotfix rate, escaped defects (found in production ÷ found by gate+review), flaky-test count, dependency vulnerabilities open by severity, `check` runtime (when it crosses the annoyance threshold people stop running it locally, and that is a leading indicator of everything else).

**Experience.** For anything with a team: whether people can get a change to production without friction. The DX Core 4 framing — speed, effectiveness, quality, impact — exists to keep speed from being read alone, and its effectiveness dimension is deliberately survey-based because dashboards cannot see friction. For a solo builder plus agents this collapses to two honest questions per epic: what slowed this session down, and what did I have to guess?

**Reading them.** Look at trends, not points. A metric moving is the start of an investigation, and the cause is almost always in the system — unclear requirements, an unrealistic staging environment, a slow gate, absent ownership — rather than in a person. Pair every number with one qualitative note; the number says something changed, the note says what it felt like.

## 8. Anti-metrics — never in the blueprint

Lines of code, commit count, PR count per person, story points as productivity, and coverage percentage as a goal. Goodhart's law is not a caveat here, it is the predicted outcome: each one is trivially satisfied in a way that makes the codebase worse — padded diffs, split commits, assertion-free tests written to touch lines.

Two harder rules:

- **No metric in this document is a measure of an individual.** DORA-style metrics are explicitly system- and team-level; applying them to a person converts a diagnostic into a target and destroys it. For a solo builder the same rule applies to self-flagellation: the metrics exist to find where the process leaks, not to grade the week.
- **Self-reported speed is not speed.** Perceived productivity and measured productivity have been found to diverge, sometimes in the opposite direction, in AI-assisted work. If the blueprint claims a time saving, it has to be measured, or it is `[ASSUMED]`.

If a stakeholder wants a single number, give them change failure rate next to deployment frequency, and refuse to reduce it further.

## 9. What to research and cite each run

Do not paste this file's figures into a blueprint. Verify, then cite with `S-nn` and a date:

1. **The stack's actual quality tooling** — formatter, linter and rule set, typechecker strict flags, test runner, coverage tool, mutation-testing tool (does a maintained one exist for this language?), SAST/dependency audit, a11y checker, architecture-rule/fitness-function library, duplication detector. Current versions, maintained status, the exact commands. This is the single highest-value part of this track: it is what makes `check` real instead of aspirational.
2. **Language and framework conventions** — the official style guide and the community-standard config, so the agent is not inventing conventions.
3. **Security baseline for the category** — the current OWASP Top 10 (and API or mobile equivalents if relevant), plus category-specific requirements (payments, health, minors, personal data).
4. **Current delivery-metric definitions and benchmarks** — the latest DORA formulation and performance bands; whether the four keys are still four where you are quoting them.
5. **Current evidence on AI-authored code quality** — the most recent security-pass-rate and maintainability/churn figures, if the blueprint states any. State them with the year, or state none.
6. **CI capability of the chosen host** — runners, cache, secrets, required checks, branch protection, and what a "required" gate can actually block on the plan the user has.

## 10. Where this lands in the blueprint

- **Section 13 (Tech Stack)** — the concrete tools and the `check` command, versions pinned, each with evidence.
- **Section 14 (Quality)** — this file, made specific: the gate contents and runtime, test-quality rules, the named critical e2e paths, the review checklist (§11) verbatim, the metric table, the anti-metric list, the definition of "green" and of "done".
- **Section 12 (Architecture)** — the fitness functions that enforce the boundaries.
- **Epic 00** — stories that build the gate: every item in §3 that applies, plus the review checklist committed into the repo so it is present in every future session's context.
- **Story DoD** — extended so a story is not done until the review checklist has been applied and the ACs each have a test that was seen red.
- **Section 18 (Session Protocol)** — the agent self-reviews against §4 and §6 before handoff and reports the result in the handoff summary; the human then reviews with the same checklist. Two passes with one checklist beats two different standards.

## 11. Review checklist to embed verbatim

Put this in the blueprint (section 14) and in `AGENTS.md`/`CLAUDE.md` so both the agent and the human use the same list. Adapt the bracketed items to the product; do not shorten the list.

```
REVIEW CHECKLIST — apply to every story before it is marked DONE.
Stop at the first unanswered item and fix it; do not batch.

Gate
[ ] `check` green on the whole repo, not just the changed files
[ ] No gate rule weakened, skipped or ignored to make this pass (if it was: DR entry, reason)
[ ] No new flaky test; any flake seen is quarantined with a follow-up story

Correctness
[ ] Every AC of this story is demonstrably met, verified against behaviour not description
[ ] Nothing implemented that no AC asked for
[ ] Every listed edge case is covered by a test or explicitly accepted with a reason

Design
[ ] Change sits in the module the architecture assigns it to; no forbidden dependency direction
[ ] No logic duplicated from elsewhere in the repo (searched before writing)
[ ] Framework's documented path used, not an invention
[ ] One-way doors (schema on populated tables, public contracts, event formats, new dependency)
    identified and recorded as a DR

Tests
[ ] Each AC maps to a named test; each was seen failing before implementation
[ ] Tests assert concrete expected values, not types/lengths/no-throw
[ ] Tests assert behaviour, not internal calls; they would survive a refactor
[ ] Deterministic: no wall clock, no network, no order dependence, seeded randomness
[ ] [Mutation score on <critical modules> not reduced]

Failure behaviour
[ ] Empty / one / many / max / boundary all specified and covered
[ ] Dependency timeout, 5xx and partial response each have defined behaviour
[ ] Repeat submission is idempotent where it must be; retries are safe
[ ] Nothing is left in a half-written state on failure

Security
[ ] Input validated at the trust boundary
[ ] Authorization checked per object, not only authentication
[ ] Queries parameterised; output encoded for its sink
[ ] No secret or PII in code, logs, error payloads or fixtures
[ ] Rate limits on anything that costs money, sends a message, or can be brute-forced
[ ] Every external symbol traces to a pinned dependency in the stack table; no invented APIs
[ ] Any new dependency: recognised, maintained, license-compatible, DR entry written

Scale
[ ] No query inside a loop; no unbounded result set; indexes exist for filtered/sorted columns
[ ] Behaviour at 100x current data is stated and acceptable

Observability
[ ] Decision points logged, structured, correlation ID present, no PII
[ ] Outcome metric emitted; errors reach error tracking with context
[ ] This change is diagnosable by someone who did not write it

Copy, locale, accessibility [UI stories]
[ ] All strings from the copy table by ID; every screen state has its line
[ ] Digits, dates, currency, direction follow the locale rules
[ ] Focus order, labels, contrast, touch targets checked

Shape
[ ] Diff is within [200–400] changed lines, or the story is split
[ ] A human can explain every non-obvious decision in this change
[ ] Handoff summary written: what changed, what was skipped, deviations, ACs satisfied
```
