# Stories, acceptance criteria, tests, DoD

Contents: 1 Why the format is strict · 2 Story format · 3 Acceptance criteria rules · 4 Edge cases, tests, tasks · 5 Epic template · 6 Epic 00 Foundation contents · 7 Sizing · 8 Worked example · 9 Anti-example

## 1. Why the format is strict

A coding agent in a fresh session turns each acceptance criterion into a test and then into code. Anything the criterion leaves open, the agent decides silently. So criteria are written to be **testable without interpretation**: concrete inputs, concrete observable outputs, concrete copy IDs, concrete numbers. Adjectives ("fast", "clear", "appropriate", "properly") are defects.

## 2. Story format

```
### E03-S02 — <Short imperative title>

**Story** — As **P2 (<persona name>)**, I want <capability>, so that <outcome the persona cares about>.
**Context** — 2–5 sentences: why this exists, what the persona is doing at that moment, what research/benchmark informed it (S-nn), which flow(s) and screen(s) it implements (F-03, SCR-07).
**Scope** — In: … Out (handled in E05-S01 / non-goal): …
**Acceptance Criteria**
- AC-1 (happy path) Given … When … Then …
- AC-2 (validation) …
- AC-3 (failure/degraded) …
- AC-4 (state edge) …
- AC-5 (permissions) …
- AC-6 (copy) …
- AC-7 (accessibility) …
- AC-8 (observability) …
**Edge cases** — EC-xxx-nn references plus story-specific ones, each with expected behaviour.
**Tests** — the tests that prove the ACs (see §4).
**Tasks** — ordered implementation tasks E03-S02-T1… (see §4).
**Story DoD** — the checklist that must be true before the story is marked DONE in PROGRESS.md.
```

Personas are referenced by ID and name; "As a user" is not allowed — if no persona fits, the persona list is incomplete, fix that first. Internal/technical work (migrations, CI) is written as a story for the **builder persona** (define one, e.g., `P0 — Builder (the coding agent / maintainer)`), so the format stays uniform and the linter stays happy.

## 3. Acceptance criteria rules

Each criterion is `Given <state> When <action> Then <observable result>` and:

- Names concrete data ("a phone number of 11 digits starting with 09", "an order with 3 items totalling 450,000 Toman"), not categories.
- Names the copy line shown (`CP-SCR07-4`), not "an error message".
- Uses numbers for anything measurable: timeouts, limits, lengths, response times, retry counts, cooldowns.
- Describes the observable result from the outside (HTTP status and body shape, screen state, stored record fields, emitted event, sent message), not the implementation ("uses a mutex").
- Is independently testable — one behaviour per criterion; split compound criteria.

Minimum coverage per story (skip a category only when it truly cannot apply, and say why in one word, e.g. "AC-5 permissions: n/a — public screen"):

| Category | Must answer |
|---|---|
| Happy path | The main success case with concrete data |
| Validation / negative | Empty, malformed, boundary, duplicate input → which copy line, which field, no state change |
| Failure / degraded | Dependency down, timeout, offline mid-action → what the user sees, what is retried, what is persisted |
| State edges | Empty state, single item, maximum, pagination boundary, concurrent modification, idempotent repeat |
| Permissions / auth | Wrong role, expired session mid-action, unauthenticated deep link |
| Copy | Which CP lines appear in which states (this is how UX writing becomes testable) |
| Accessibility (UI stories) | Focus order, labels, contrast, touch target size, screen-reader text — as concrete checks |
| Observability (backend stories) | Which log events (no PII), metrics, error-tracking events are emitted |
| Data integrity | What is stored, with which fields, audit trail, soft-delete behaviour |
| Locale (when relevant) | RTL rendering, digits, dates in Jalali with correct month lengths, currency label |

## 4. Edge cases, tests, tasks, DoD

**Edge cases.** Walk `edge-case-catalog.md` category by category for the story and list every applicable item as either a reference to a global `EC-*` (with any story-specific expected behaviour) or a new story-level item. If the list is empty, the story is trivial or you skipped the walk.

**Tests.** For each AC name the test(s) that prove it, at the right level:

```
**Tests**
- Unit: `<module>.<test_name>` — covers AC-2, AC-4 (pure validation and state logic)
- Integration: `<test file>::<test_name>` — covers AC-1, AC-3, AC-8 (through the real DB/test double for the gateway)
- E2E (only if this story is on a critical path listed in section 14): `<spec name>` — covers AC-1, AC-6
- Manual (only what cannot be automated, e.g., real SMS delivery): step list, expected observation, who does it
- Fixtures/data needed: …
- Run: `<check command>` must be green; the new tests must fail before the implementation and pass after.
```

**Tasks.** Ordered, small, each naming the indicative files/modules and the test it makes pass:

```
**Tasks**
- E03-S02-T1 Add `phone` validation to `ENT-User` schema + migration — proves AC-2
- E03-S02-T2 Implement `POST /auth/otp/request` (API-04) with rate limit 5/10min — proves AC-1, AC-3
- E03-S02-T3 Wire SCR-03 form states and copy CP-SCR03-1…6 — proves AC-6, AC-7
- E03-S02-T4 Emit `auth.otp.requested` log event without phone number — proves AC-8
```

**Story DoD** (default; extend per story):
- All ACs have passing automated tests (or a completed manual step recorded in PROGRESS.md with evidence).
- Each of those tests was seen **failing before** the implementation and passing after; PROGRESS.md records that.
- `check` is green on the whole repo — no gate rule weakened, skipped or ignored to get there (if one was, a DR says why).
- The **review checklist** (blueprint section 14.4) has been applied end to end and every item answered; unanswered items are fixed, not batched.
- Copy lines used match the copy table exactly (no improvised strings).
- Edge cases listed are each covered by a test or explicitly marked "accepted risk" in PROGRESS.md with reason.
- Every external symbol used traces to a pinned dependency in the stack table — no invented APIs, no unpinned imports.
- No new dependency without a DR entry.
- No logic duplicated from elsewhere in the repo (the session searched before writing).
- Commit(s) reference the story ID.
- PROGRESS.md updated: story DONE, AC evidence lines, and any deviation from the blueprint.

## 5. Epic template

```
## Epic 03 — <Title>

**Goal** (one line, outcome-oriented, in the user's language then English if bilingual)
**Personas served** P1, P2
**Depends on** E00, E01 (what specifically: tables, endpoints, components)
**Preconditions for the session** — PROGRESS.md shows E00–E02 DONE; `check` green on clean `main`; env vars X, Y present; `[VERIFY-AT-BUILD]` items for this epic re-checked: INT-sms availability, …
**Scope** — In: stories below. Out: … (where handled)
**Flows and screens implemented** F-02, F-03; SCR-03, SCR-04
**Data and API touched** ENT-User (new fields …), API-04, API-05
**Risks specific to this epic** R-02 …
**Stories**
### E03-S01 — …
### E03-S02 — …
**Epic-level tests** — the integration/e2e run that proves the epic as a whole (the flow end to end), plus regression: all previous epics' tests still green.
**Definition of Done**
- All stories DONE with evidence in PROGRESS.md
- Epic-level flow test(s) green; full `check` green; CI green on the merged branch
- Deployed to staging and smoke-verified (list the 3 manual checks if UI)
- PROGRESS.md: epic DONE, deviations recorded, next epic's preconditions confirmed
- DECISIONS.md updated for any decision taken during the session
- Blueprint Amendments log updated if any AC/scope changed
**Session handoff checklist** — the ≤20-line summary the agent prints before the user terminates (format in session-protocol.md §5).
```

## 6. Epic 00 — Foundation: mandatory contents

Epic 00 is where "no room for error" is manufactured. Its stories (builder persona) cover:

1. Repository init with the chosen layout; language/runtime version pinned (version file); package manager lockfile committed.
2. Formatter, linter (strict), typechecker (strict flags), test runner configured; `check` command that runs them all and fails on any warning class you decide is an error; documented expected runtime. Also in `check` from day one: coverage floor, dependency/vulnerability audit, secret scanning, and schema-drift check — every gate component listed in blueprint section 14.2 that applies.
2b. **Module skeleton and fitness functions**: the empty modules from the architecture's module map, plus the architecture tests that enforce the dependency-direction and ownership rules, failing the build on violation. These exist *before* there is any feature code to violate them; retrofitting boundaries after three epics does not work.
2c. **The review checklist** (blueprint section 14.4) committed to the repo at a fixed path and referenced from `AGENTS.md`/`CLAUDE.md`, so it is in every future session's context.
3. Test layout with one example unit test, one integration test against a real test database (containerised or local), one e2e smoke test; factories/fixtures pattern established. Mutation testing configured on the critical modules if a maintained tool exists for the stack (blueprint section 14.3 says which, or says none exists).
4. CI running `check` on every push and blocking merge on red; branch protection configured so the gate cannot be bypassed.
5. `docs/BLUEPRINT.md` (this document), `docs/PROGRESS.md`, `docs/DECISIONS.md`, `AGENTS.md` and `CLAUDE.md` created from Appendix B; `.env.example` with every variable and a one-line meaning; secrets policy.
6. Configuration loading with validation at startup (fail fast on missing/invalid env).
7. Logging with a structured logger, request/correlation ID, PII redaction rule; error-tracking hook (verified service or self-hosted); health endpoint.
8. Database with migration tooling; first migration; seed script for fixtures.
9. Hello-world vertical slice: one screen or endpoint through all layers, with i18n/RTL plumbing if the product needs it (locale, direction, font loading, digit formatting, calendar utility), proving the whole stack end to end.
10. Deployment skeleton to staging (build, run, migrate, health check), with the documented rollback step.
11. Coding conventions file the agent reads every session (error handling, naming, module boundaries, "no `any`/no untyped", commit format).

Every one of these has ACs and tests like any other story. Epic 00 is typically the largest epic; it can be split into E00a/E00b only if sessions are short.

## 7. Sizing

- Story: 0.5–3 hours of agent work including tests. Larger → split by AC groups.
- Epic: 3–7 stories for a half-day session; 2–4 for short sessions. Never more than one flow's worth of new surface area per epic.
- Sprint: 1–3 epics ending in a releasable or demonstrable increment.
- Mark sizes S/M/L in the epic order table; the user picks session length accordingly.

## 8. Worked example (good)

```
### E02-S01 — Request a one-time code by phone number

**Story** — As **P1 (Restaurant owner, Tehran, mid-range Android, busy)**, I want to enter my mobile number and receive a one-time code, so that I can sign in without remembering a password.
**Context** — Phone-first login is the norm in the benchmarked local products (S-09, S-11) and P1 rarely uses email. Implements F-01 steps 1–3 on SCR-03. SMS delivery through INT-sms (sandbox available [VERIFIED — S-16, 2026-09-05] [VERIFY-AT-BUILD]).
**Scope** — In: number entry, validation, code request, resend cooldown, rate limiting, delivery via provider sandbox in tests. Out: code verification (E02-S02), account creation on first login (E02-S03).
**Acceptance Criteria**
- AC-1 (happy) Given SCR-03 is open and no code was requested for `09123456789` in the last 60 s, When the user submits `09123456789`, Then `POST /auth/otp/request` (API-04) returns 200 `{ "expires_in": 120, "resend_after": 60 }`, a 6-digit code is stored hashed with a 120 s expiry, the provider is called once with template `otp_v1`, and SCR-03 shows state "code-sent" with CP-SCR03-4.
- AC-2 (validation) Given SCR-03, When the user submits `0912345678` (10 digits) or `+989123456789` or `۰۹۱۲۳۴۵۶۷۸۹` (Persian digits), Then Persian digits are normalised to Latin before validation, `+98` is normalised to `0`, a 10-digit input is rejected inline with CP-SCR03-2 under the field, no request is sent, and the submit button stays disabled until 11 valid digits are present.
- AC-3 (failure) Given the provider returns HTTP 5xx or times out after 5 s, When the user submits a valid number, Then API-04 returns 503 `{ "error": "sms_unavailable" }`, no code is stored, SCR-03 shows CP-SCR03-6 with a retry action, and the error is reported to error tracking with the correlation ID and without the phone number.
- AC-4 (state edge — rate limit) Given 5 requests for the same number in the last 10 minutes, When a 6th is submitted, Then API-04 returns 429 with `retry_after` seconds, the provider is not called, and SCR-03 shows CP-SCR03-7 including the remaining minutes in Persian digits.
- AC-5 (permissions) n/a — public endpoint; AC-4 is the abuse control.
- AC-6 (copy) Given each state of SCR-03 (idle, invalid, sending, code-sent, resend-cooldown, sms-unavailable, rate-limited), Then the exact copy from CP-SCR03-1…7 is shown, digits rendered as Persian digits, layout RTL.
- AC-7 (accessibility) Given a screen reader, When focus enters the field, Then its label (CP-SCR03-1) is announced; inline errors are announced via a live region; the field has `inputmode="numeric"`; the primary button is ≥ 44×44 px.
- AC-8 (observability) Given any outcome, Then one structured log event `auth.otp.requested` with `{ outcome, correlation_id, provider_latency_ms }` and no phone number is emitted; a counter `otp_requests_total{outcome}` increments.
**Edge cases** — EC-INPUT-03 (invisible characters pasted → stripped before validation), EC-INPUT-07 (mixed Persian/Latin digits → normalised), EC-AUTH-02 (double tap submit → single request, button disabled while pending), EC-NET-04 (offline at submit → CP-SCR03-6 without provider call), EC-MSG-01 (provider accepts but never delivers → covered by resend after 60 s, no more than 3 resends per code), EC-IR-02 (number with operator prefix not in the known list → still accepted; operator list is not a validation rule).
**Tests**
- Unit: `auth/phone.test` — normalisePhone (Persian digits, +98, spaces, ZWNJ, invisible chars), isValidIranMobile — covers AC-2, EC-INPUT-03/07
- Unit: `auth/otp_rate_limit.test` — 5-per-10-min window, retry_after computation — covers AC-4
- Integration: `api/auth_otp_request.test` — success path with provider fake; provider 5xx/timeout; rate limit; idempotent double submit — covers AC-1, AC-3, AC-4, AC-8, EC-AUTH-02
- E2E: `e2e/login.spec` step "request code" — covers AC-1, AC-6 (critical path #1 in section 14)
- Manual: send one real code in staging to a test number; confirm delivery within 30 s; recorded in PROGRESS.md
- Run: `make check` green; new tests red before implementation.
**Tasks**
- E02-S01-T1 `normalisePhone` + `isValidIranMobile` in `auth/phone` with unit tests
- E02-S01-T2 OTP store: hashed code, expiry, attempt counter (ENT-OtpChallenge) + migration
- E02-S01-T3 Rate limiter keyed by phone (5/10 min) using the shared store
- E02-S01-T4 API-04 handler with provider client (INT-sms) and 5 s timeout; 503/429 mapping
- E02-S01-T5 SCR-03 states and copy CP-SCR03-1…7, RTL, Persian digits, live region
- E02-S01-T6 Log event + counter; error-tracking capture without PII
**Story DoD** — default DoD + manual staging delivery check recorded.
```

## 9. Anti-example (what not to write, and why)

```
As a user I want to log in with my phone so that it's easy.
AC: user enters phone, gets SMS, sees success message. Errors are handled properly.
```

Defects: no persona (voice and constraints unknown); "easy" is untestable; no number format, so the agent invents one; "success message" and "handled properly" leave copy and failure behaviour to the agent; no rate limit, so abuse is unspecified; no tests, so "done" is an opinion; no copy IDs, so the UX writing work is discarded at build time. Every one of these becomes a silent decision in a fresh session.
