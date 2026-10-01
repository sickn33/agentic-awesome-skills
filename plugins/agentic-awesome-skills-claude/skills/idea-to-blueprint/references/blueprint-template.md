# Blueprint template

Contents: 1 Conventions the linter relies on · 2 ID schemes · 3 Section skeleton with depth targets · 4 Table formats · 5 Writing order and chunking · 6 Self-review before lint

The blueprint is one markdown file. Sections are numbered and appear in this order; drop a section only when it plainly does not apply (a CLI tool has no copy table for SMS templates) and say so in one line where it would have been.

## 1. Conventions the linter relies on

- Every top-level section heading contains its **English anchor** in parentheses when the prose language is not English: `## 5. پرسوناها (Personas)`. In English documents the heading itself is the anchor.
- Epic headings: `## Epic 03 — <Title>` (two-digit number, em dash). Epic 00 is always "Foundation".
- Story headings inside an epic: `### E03-S02 — <Title>`.
- Inside each story these bold labels appear, in this order: `**Story**`, `**Context**`, `**Scope**`, `**Acceptance Criteria**`, `**Edge cases**`, `**Tests**`, `**Tasks**`, `**Story DoD**`.
- Each epic ends with `**Definition of Done**` and `**Session handoff checklist**`.
- Evidence tags exactly as defined in `research-protocol.md` §2. Unknowns route to `OQ-nn` entries that exist in the Open Questions section.
- No placeholder text anywhere: no TODO, TBD, TBA, FIXME, XXX, "lorem", "???", "[insert", "to be defined". If something is undecided it is an `[UNKNOWN → OQ-nn]` with a proposed default.

## 2. ID schemes

| Thing | Pattern | Example |
|---|---|---|
| Source | `S-nn` | S-14 |
| Persona | `P<n>` (anti-persona `AP<n>`) | P2, AP1 |
| Goal / metric | `G<n>` / `M<n>` | G3, M3.1 |
| Flow | `F-nn` | F-03 |
| Screen / surface | `SCR-nn` (never `S-nn`, which is a source) | SCR-07 |
| Copy line | `CP-<screen>-<n>` | CP-SCR07-3 |
| Entity | `ENT-<Name>` | ENT-Order |
| API endpoint | `API-nn` | API-12 |
| Integration | `INT-<name>` | INT-payments |
| Edge case (global register) | `EC-<cat>-nn` | EC-PAY-04 |
| Epic | `E<nn>` | E03 |
| Story | `E<nn>-S<nn>` | E03-S02 |
| Acceptance criterion | `AC-<n>` (scoped to the story) | E03-S02 AC-4 |
| Task | `E<nn>-S<nn>-T<n>` | E03-S02-T3 |
| Test | `T-<story>-<n>` or the real test name once written | T-E03S02-2 |
| Open question | `OQ-nn` | OQ-07 |
| Decision record | `DR-nn` | DR-05 |
| Risk | `R-nn` | R-03 |

IDs never change once assigned; if a story is dropped, its ID is retired with a one-line note, not reused.

## 3. Section skeleton with depth targets

"Depth" is a floor, not a ceiling. Page estimates assume a whole product.

### 0. Cover and how to use this document (How to use)  — 1 page
Title, version, date, author, target agents (Claude Code / Codex), model/effort used for research. Then:
- Who reads what: humans read 1–7, 19–21; build sessions read 12–18 plus the epic in play; both read the Glossary.
- The language convention (prose vs machine text vs product copy).
- The evidence legend (all five tags).
- Status of this document: DRAFT / APPROVED, and the rule that changes go through the Amendments log (section 18).
- Table of contents.

### 1. Executive summary (Executive summary) — ½–1 page
What it is, for whom, the outcome sentence, how it is delivered (platform), what makes it different (from positioning), what v1 includes, what it excludes, and the build plan in one line ("13 epics, ~13 sessions, first releasable milestone after E05").

### 2. Idea interpretation and scope (Scope) — 1–2 pages
The user's idea as written (quoted verbatim in their language, short). Your interpretation. In-scope capabilities for v1 (bulleted, each tied to a persona and later to epics). Explicitly out of scope with reason (Non-goals live here). Scale ceiling of v1 stated in numbers.

### 3. Research findings (Research) — 4–10 pages
3.1 Domain overview and how the job is done today. 3.2 Benchmark: feature matrix, per-competitor cards, best-in-class per flow table, anti-patterns to avoid. 3.3 Gap and positioning statement. 3.4 Regulatory and platform-policy flags (as OQ pointers). 3.5 UX benchmark observations. Every row and claim carries an evidence tag.

### 4. Assumptions and decision records (Assumptions & Decisions) — 1–3 pages
4.1 Assumptions table: `# | Assumption | Why | Impact if wrong`. 4.2 Decision records `DR-nn` in the format from `architecture-decisions.md` §9: status, drivers served, context, options, decision, consequences (including what the rejected option would have bought), **compliance** (the automated check that enforces it, or "manual — reviewed against checklist item X"), and **reversibility** (one-way / medium / cheap). One record per decision, short. Covers stack, architecture style, auth model, data model shape, design system, currency, calendar, hosting. A superseded record stays in the document with its status changed and a pointer forward — why the team changed its mind is often worth more than the current answer.

### 5. Personas (Personas) — 2–5 pages
For each `P<n>` (3–5 typical): name and one-line role; context (where/when/on what device/network they use it); goals and the outcome they want; jobs-to-be-done; current pains and workarounds; tech comfort and reading tolerance; language, register and formality expectation (drives copy voice); accessibility considerations; trust concerns; key scenarios (2–4 short narratives that later map to flows); success looks like (what they say when it works). Anti-personas `AP<n>`: who we do not design for and why. End with a persona × capability matrix (which persona needs what).

### 6. Goals, non-goals and success metrics (Goals & Metrics) — 1–2 pages
Goals `G<n>` as measurable outcomes tied to personas. Metrics `M<n.m>`: leading and lagging, definition, measurement method (event, query, survey), target with `[ASSUMED]` when hypothetical, and which epic instruments it. Non-goals with a one-clause reason each.

### 7. User flows (Flows) — 3–8 pages
See `design-minimal.md` §3 for the format. One `F-nn` per core job, per persona where they differ. Each flow: trigger, preconditions, numbered steps (screen, user action, system response, copy IDs), decision points, failure branches with recovery, exit, metric. Include first-run, core loop, payment (if any), recovery/re-authentication, admin flows, and account deletion.

### 8. Information architecture and screen inventory (Screens) — 3–8 pages
Navigation model; screen table `SCR-nn | purpose | personas | entry points | components | states (empty/loading/error/success/offline) | copy IDs | edge cases`. A one-paragraph description per screen of what is on it and what the single primary action is.

### 9. Design direction (Design) — 2–4 pages
Reference-based or chosen (say which, with reason). Design tokens (colour, type scale with Persian/Latin font stacks, spacing, radius, breakpoints), component list from the chosen system with the RTL notes, iconography direction, motion policy, dark-mode decision, accessibility baseline (standard and level, verified), do/don't list of patterns for this product (from `design-minimal.md` §2).

### 10. UX writing guide (UX Writing) — 2–3 pages
Voice, tone matrix per persona and moment, terminology rules and the product glossary of UI terms (Persian ↔ English), formatting rules (numbers, dates, currency, phone), Persian pack rules when applicable, message formulas (error, empty, success, confirmation, loading, notification). See `ux-writing-guide.md`.

### 11. Copy tables (Copy) — 5–20 pages
One table per screen and one per message channel (SMS, email, push, in-app notification, bot messages): `CP-id | element | copy (product language) | English gloss | persona intent | state/variant | max length | notes`. Every state of every screen in the inventory has a line. Error variants are enumerated, not "error message".

### 12. Architecture (Architecture) — 6–12 pages
Full procedure in `architecture-decisions.md`. Order matters: drivers, then shape, then technology — never the reverse.

12.0 **Architecture drivers** `AD-n`: 5–8 quality attributes ranked, each with a measurable target and the reason for its rank, derived from personas, the scale ceiling, the failure cost of the core loop, regulatory flags and hosting reality. Then the **explicit non-drivers** with a reason each.
12.1 **Architecture style decision**: 2–3 candidates scored against the ranked drivers (scoring table), the decision, what the runner-up would have bought and at what price, and the **exit triggers** — the observable conditions under which a future session may revisit the shape.
12.2 **Module map and boundaries**: modules by business capability with owned entities and public interfaces; the dependency-direction rule; data ownership (one module owns each table); the plausible extraction seams; and a "where new code goes by default" line per common case.
12.3 Component diagram (fenced ASCII or Mermaid) and one paragraph per component.
12.4 Data model: `ENT-*` with fields (name, type, constraints, nullable, default), relations, indexes, ID scheme, money representation, time-zone storage rule, soft-delete/audit policy, retention and deletion policy, and the migration policy.
12.5 API contracts: `API-nn | method path | purpose | auth | request | response | errors` (or the OpenAPI file it will live in, with the rule that the file is the source of truth), plus the versioning policy, the single error envelope, and the pagination convention.
12.6 Auth and authorization model with the role × permission matrix and the object-level authorization rule.
12.7 Integrations: one card per `INT-*` from research, each with its timeout, retry, idempotency key and fallback.
12.8 Environments, configuration and secrets, with fail-fast validation at startup.
12.9 Observability (logs without PII, metrics, error tracking, health checks), security baseline, performance budgets, and backup/restore with a stated restore procedure.
12.10 **Fitness functions**: each architectural rule that can be enforced mechanically, the automated check that enforces it, and where it runs. A boundary with no fitness function is a boundary that will be gone in three sessions.
12.11 The cross-cutting decision list from `architecture-decisions.md` §7, each item either a DR reference or one line saying why it does not apply.

### 13. Tech stack and engineering conventions (Tech Stack) — 3–5 pages
13.1 Stack table: every row answers *what* (pinned version), *why* (the deciding reason, tied to an `AD-n` driver or an agent criterion — never "popular" or "modern"), *what lost and what it would have bought*, and *evidence*. A row missing any of the four is unfinished.
13.2 Forbidden choices with reasons (archived, unmaintained, license, unreachable from the market, superseded API). An agent that knows what is banned is safer than one that only knows what is blessed.
13.3 Repository layout, matching the module map in 12.2.
13.4 The `check` command, its components and expected runtime.
13.5 Formatting/lint/type strictness settings, including which escape hatches are banned and how an exception is justified inline.
13.6 Testing conventions (layout, naming, fixtures, factories, test DB strategy, e2e tooling).
13.7 Git conventions (branches, commit format with story IDs, PR/merge rule).
13.8 CI/CD and deployment procedure, plus rollback.
13.9 Error handling, logging and configuration conventions.
13.10 Dependency policy (adding a package requires a DR entry) and the version-drift rule: pinned versions are what this document was verified against; a session that finds a version has moved records it and re-verifies rather than silently upgrading.

### 14. Quality strategy, review and metrics (Quality) — 4–8 pages
Full procedure in `code-quality-and-review.md`. This section is what makes "done" mean the same thing in session 1 and session 14.

14.1 **The two layers**: what the machine decides (the gate) versus what a human judges (the review), and the rule that anything objective a reviewer has to remember is a gate gap that gets a story.
14.2 **The gate**: every component of `check` with its command and threshold — format, lint, types, tests, coverage floor, schema-drift check, dependency audit and secret scan, architecture fitness functions, budgets, accessibility and locale checks. State the expected runtime and the rule that the gate is never weakened to make a change pass (and if it is, that is a DR).
14.3 **Test strategy**: pyramid shape, the 3–5 named critical e2e paths, and the test-*quality* rules — behaviour not implementation, concrete assertions, red-before-green, determinism, mutation testing on the critical modules where a maintained tool exists (name it, or say none exists). State explicitly that the coverage number is a floor against regression and never a story goal.
14.4 **Review checklist**: the checklist from `code-quality-and-review.md` §11, embedded verbatim and adapted to this product. Both the agent's self-review and the human's review use this one list.
14.5 **Reviewing agent-written code**: the specific failure profile (invented APIs, duplication of code the agent could not see, security defects behind clean syntax, volume outrunning review capacity), the rule that every external symbol traces to a pinned dependency, and the human-author-of-record rule.
14.6 **Metrics table**: `M-id | metric | definition | data source | instrumented by (epic) | starting target | what a move in it would prompt`. Delivery metrics, review-process metrics, codebase-health metrics (rework/churn, duplication trend, revert rate, escaped defects, flaky count, `check` runtime). Every figure sourced or tagged `[ASSUMED]`.
14.7 **Anti-metrics**: the explicit list of what this product will not measure and why (LOC, commit/PR counts, points as productivity, coverage as a goal), plus the rule that no metric here measures an individual.
14.8 **Definition of green, definition of done**, and the manual verification policy — what a human checks by hand, when, and how it is recorded.

### 15. Edge-case register (Edge Cases) — 3–8 pages
Global, cross-cutting edge cases `EC-<cat>-nn` grouped by category from `edge-case-catalog.md`, each with: description, expected behaviour, which stories cover it (filled as stories are written), which copy lines it uses. Story-level edge cases reference these where they exist rather than restating them.

### 16. Delivery plan — sprints and epic order (Delivery Plan) — 1–2 pages
16.1 Epic order table: `Order | Epic | Goal | Depends on | Stories | Size (S/M/L) | Why now`. 16.2 Sprint table: `Sprint | Epics | Milestone (e.g., "closed beta") | Exit criteria`. One epic = one session by default; a sprint = 1–3 epics ending in something releasable or demonstrable. 16.3 Critical path and what can be reordered without risk.

### 17. Epics and stories (Epics) — 20–60 pages
Preceded by one line stating that everything from here is in English for the coding agent. Then `## Epic 00 — Foundation` through the last epic, each following the epic template in `stories-ac-tests.md` §5. Epic 00 always contains the repo bootstrap, tooling, `check`, CI, docs files (BLUEPRINT/PROGRESS/DECISIONS/AGENTS/CLAUDE), environment templates, a hello-world vertical slice with one unit, one integration and one e2e smoke test, and the deployment skeleton to staging.

### 18. Session protocol for Claude Code / Codex (Session Protocol) — 2–4 pages
The full per-session runbook from `session-protocol.md`, the PROGRESS.md and DECISIONS.md formats, the Amendments log (how the blueprint itself gets changed from a build session), termination rules, recovery from a crashed session, and the `[VERIFY-AT-BUILD]` re-check rule.

### 19. Risks and mitigations (Risks) — 1–2 pages
`R-nn | risk | likelihood | impact | mitigation | owner | trigger to revisit`. Only risks specific to this product and market. Legal/regulatory items point to OQs.

### 20. Open questions (Open Questions) — ½–2 pages
`OQ-nn | question | why it matters | owner (user/legal/vendor/design/engineering) | blocking? (which epic) | proposed default if unanswered`. Every `[UNKNOWN → OQ-nn]` in the document has a row here.

### 21. Glossary (Glossary) — 1–2 pages
Term | definition | Persian/English equivalent | where used. Includes UI terminology decisions (the *one* word used for each concept in the product).

### 22. Sources (Sources) — 1–3 pages
`S-nn | title | URL | accessed | supports`. Every `S-nn` referenced in the document appears; nothing appears that was not read.

### Appendix A — Session prompts (Appendix Session Prompts)
One copy-paste prompt per epic, generated from `assets/session-prompt.md`, with the epic ID and the section numbers filled in.

### Appendix B — Files to create in Epic 0 (Appendix Epic 0 Files)
The literal content of `docs/PROGRESS.md`, `docs/DECISIONS.md`, `AGENTS.md`, `CLAUDE.md`, `.env.example`, and the `check` script for this product, so Epic 0 copies rather than invents.

## 4. Table formats (copy exactly)

Assumptions
```
| # | Assumption | Why this was assumed | Impact if wrong |
|---|---|---|---|
```
Stack
```
| Layer | Technology | Pinned version | Deciding reason (driver / agent criterion) | Runner-up — why it lost, what it would have bought | Evidence |
|---|---|---|---|---|---|
```
Architecture drivers
```
| ID | Driver | Measurable target | Rank | Why this rank | Source (persona / scale ceiling / regulation / hosting) |
|---|---|---|---|---|---|
```
Architecture style scoring
```
| Driver (rank) | <Candidate A> | <Candidate B> | <Candidate C> |
|---|---|---|---|
```
Fitness functions
```
| ID | Architectural rule it enforces | Automated check | Where it runs | Fails the build? |
|---|---|---|---|---|
```
Metrics
```
| ID | Metric | Definition | Data source | Instrumented by | Starting target | What a move in it would prompt |
|---|---|---|---|---|---|---|
```
Copy
```
| ID | Element | Copy (fa) | English gloss | Persona intent | State / variant | Max length | Notes |
|---|---|---|---|---|---|---|---|
```
Screens
```
| ID | Screen | Purpose | Personas | Entry points | Primary action | States covered | Copy IDs | Edge cases |
|---|---|---|---|---|---|---|---|---|
```
Epic order
```
| Order | Epic | Goal | Depends on | Stories | Size | Why now, not earlier/later |
|---|---|---|---|---|---|---|
```
Open questions
```
| ID | Question | Why it matters | Owner | Blocking? | Proposed default if unanswered |
|---|---|---|---|---|---|
```
Sources
```
| ID | Title | URL | Accessed | Supports |
|---|---|---|---|---|
```

## 5. Writing order and chunking

Write in this order, one write operation per numbered item, appending to the same file:

1. Cover, how-to-use, TOC (section 0)
2. Sections 1–2
3. Section 3 (research) — may need two chunks
4. Sections 4–6
5. Section 7 (flows)
6. Sections 8–9
7. Section 10
8. Section 11 (copy tables) — one chunk per 3–5 screens
9. Section 12 — **two chunks**: 12.0–12.2 (drivers, style decision, module map) first, then 12.3–12.11
10. Section 13, then section 14 as its own chunk (the review checklist and metric table are long)
11. Section 15
12. Section 16
13. Section 17 — **one chunk per epic**
14. Section 18
15. Sections 19–22
16. Appendices

Why this order: flows before screens, screens before copy, copy before stories (stories reference copy IDs), architecture before stack conventions, everything before epics (epics reference all of it). Writing epics last means every AC can point at an existing ID instead of inventing one.

After each chunk, re-read the previous chunk's IDs you referenced; mismatched IDs are the most common defect in long documents.

## 6. Self-review before lint

Read as a stranger in a fresh session and check:

- Could I build Epic 03 with only sections 12–18 and the Glossary? What did I have to guess?
- Does every persona appear in at least one story, and does every story name a persona that exists?
- Does every screen in the inventory have every state in the copy table?
- Does every integration have a fallback and a sandbox statement?
- Does every `[VERIFY-AT-BUILD]` appear in the session protocol's re-check list?
- Is there any sentence where two options are left open? Decide it.
- Are all numbers sourced or tagged `[ASSUMED]`?
- Does the epic order respect every "Depends on"?
- Could any architecture driver in 12.0 have changed the style decision in 12.1? If not, the drivers are decoration — rewrite them with real targets.
- Does every stack row name what the runner-up would have bought? A row with no cost stated is a row that was not decided.
- Does every boundary rule in 12.2 have a fitness function in 12.10, or an explicit line saying why it cannot be enforced?
- Does every component of `check` in 14.2 name a tool that was verified to exist for this stack this session?
- Is the review checklist in 14.4 present verbatim, and does the Story DoD require it?
- Does any metric in 14.6 measure an individual? Remove it.

Then run the linter.
