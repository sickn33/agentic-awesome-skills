# Architecture and technology decisions

Contents: 1 Why this is a separate track · 2 Step 1 drivers · 3 Step 2 candidate styles · 4 Step 3 the default and its exit triggers · 5 Step 4 boundaries · 6 Step 5 fitness functions · 7 Step 6 the cross-cutting decision list · 8 Step 7 technology selection · 9 Decision record format · 10 What to research and cite · 11 Anti-patterns · 12 Output into the blueprint

## 1. Why this is a separate track

A stack table answers "what will we use". It does not answer the two questions a fresh build session actually needs: **what shape is this system** and **why is it that shape rather than the obvious alternative**. Without the second answer, the first agent that hits friction re-decides — and now the codebase has two architectures.

Architecture here means the decisions that are expensive to reverse: the module boundaries, what talks to what and how, where state lives, how the system fails. Everything else is code, and code is cheap. So the ordering rule for the whole track is: **derive the drivers from the product, choose the shape from the drivers, choose the technology from the shape** — never the reverse. Picking a framework first and reverse-engineering a justification is the most common way a blueprint goes wrong, and it is invisible in the finished document unless you look for it.

## 2. Step 1 — Derive the architecture drivers

Before naming any technology, write the drivers: the quality attributes that this specific product must have, ranked, each with a *measurable* target. Vague drivers ("scalable", "secure", "fast") produce vague architectures.

Derive them from what you already know, not from a generic list:

| Source | Yields |
|---|---|
| Personas' context (device, network, patience) | latency and offline targets, payload budgets |
| Scale ceiling of v1 (stated in Scope, in numbers) | concurrency, data volume, throughput targets |
| The core loop and its failure cost | availability target, consistency requirements, recovery time |
| Money, identity, health, minors, personal data in scope | security and auditability requirements, data-residency questions |
| Market and hosting reality | deployability constraints, dependency on reachable services |
| Team shape (solo + agents, or a real team) | operability ceiling — how much system one person can run at 3am |
| Regulatory flags from research | audit trail, retention, consent, export/delete |
| The business's likely next 12 months | which axes must stay open (new channel, new market, new tenant model) |

Write 5–8 drivers, ranked, in this form:

```
AD-1 Operability by one maintainer  — target: full local run with one command; one deploy unit; any
     production issue diagnosable from logs + error tracking without attaching a debugger. Rank 1
     because [solo builder with agent sessions; nobody is on call].
AD-2 Correctness of money handling  — target: no partial writes; every payment state transition
     idempotent and auditable; reconciliation possible from stored events alone.
AD-3 p95 under 400 ms on the core read path at [stated ceiling] rows, on mid-range Android over 3G.
...
```

Then state the **explicit non-drivers** — the attributes you are deliberately not optimising for, each with a reason. "Not multi-region. Not sub-100ms. Not 1000 concurrent writers. Not multi-tenant." This is what keeps the architecture from growing to meet imaginary requirements, and it is the section future sessions will thank you for.

Ranked drivers with targets and named non-drivers are the contract the rest of this track is scored against.

## 3. Step 2 — Candidate architecture styles

List 2–3 realistic candidates for the shape of the system and score them against the ranked drivers. Realistic means: appropriate to the scale ceiling and buildable by the team that exists. Candidates typically come from — modular monolith; layered monolith; monolith plus a small number of extracted workers; serverless functions; service-oriented split; client-heavy with a thin backend (BaaS); bot/worker plus queue; CLI/local-first with sync.

Score explicitly:

```
| Driver (rank) | Modular monolith | Monolith + worker | Services |
|---|---|---|---|
| AD-1 operability (1) | 3 | 3 | 1 |
| AD-2 correctness (2)  | 3 | 3 | 1 — needs sagas |
| ... | | | |
| Total (weighted) | 27 | 25 | 14 |
```

Then write the decision as a DR, including what the loser would have bought you and at what price. A candidate that scores lower can still be chosen if a driver demands it — say so explicitly rather than letting the table decide silently.

## 4. Step 3 — The default, and the triggers that would change it

For nearly everything this skill produces — a v1 built by an agent, one deploy target, a scale ceiling in the thousands not millions — the answer is a **modular monolith**: one deployable unit, strict internal module boundaries, one database, one `check`, one deploy. The current industry discussion has converged on this as the sane starting point, with distributed architectures justified by *organisational* scale far more often than by traffic, and a visible movement of teams consolidating back after paying for complexity they did not need. Verify the current state of that discussion rather than asserting it.

The reason it is the default here is narrower than the general argument: a fresh-session agent is far more reliable inside one repo with one command and local function calls than across a distributed system where a failure could be in any of four places and the reproduction requires orchestration.

But "default" is not "always", and a blueprint that says only "we chose a modular monolith" has not done the work. Write the **exit triggers**: the specific, observable conditions under which this decision should be revisited, so a future session knows whether it is allowed to change the shape.

```
This decision holds until one of:
- a module needs independent scaling with a measured >5x load difference on the core path
- a module needs a different runtime/language for a capability the main stack cannot provide
- more than [n] people work on the codebase and merge contention is measured, not felt
- an availability requirement appears that one deploy unit cannot meet
Until then, extraction is out of scope, and the module boundaries in §5 are what make extraction
cheap if it ever becomes necessary.
```

The corollary: because extraction is not planned, boundaries are enforced *now* (§5, §6). A modular monolith without enforced boundaries is just a monolith, and it degrades into one within a few sessions.

## 5. Step 4 — Module boundaries

This is the part that most affects what an agent produces, because it decides where new code goes. Specify:

1. **The modules**, each with: the business capability it owns, the entities it owns, its public interface (the functions/types other modules may call), and one sentence on what it must never know about.
2. **The dependency rule**, stated as a direction, e.g. "feature modules may depend on `core` and `shared`; `core` depends on nothing internal; no feature module imports another feature module's internals — only its public interface"; and where the composition happens.
3. **Data ownership** — one module owns each table; cross-module reads go through the owner's interface, not through a join into someone else's tables. Where that rule is relaxed (reporting, admin), say so explicitly.
4. **The seams that matter later** — which boundaries are the plausible extraction points, and what makes them cheap (no shared transaction, no direct table access, an interface that could become an HTTP call).
5. **Where new code goes by default**, in one sentence per common case, so an agent does not have to decide: "a new endpoint goes in the feature module that owns the entity; a helper used by two features goes in `shared` only after the second use, never on the first."

Derive the modules from the domain (bounded contexts from the research and flows), not from technical layers. Modules named `controllers`, `services`, `utils` are layers, and they let anything depend on anything.

## 6. Step 5 — Fitness functions

A decision written down and never enforced is documentation, and it decays. For each architectural rule that can be checked mechanically, specify the automated check that enforces it — an architecture test in `check`, failing CI when violated. This is what makes the boundary real across many sessions.

Typical set:

- Dependency direction: no import from `core` into a feature module; no feature-to-feature internal imports.
- Layer rules: no database access outside the data layer of the owning module; no HTTP framework types in domain code.
- Public interface: only the module's index/public file is importable from outside.
- Entity ownership: no query against a table your module does not own.
- Contract: API responses match the OpenAPI/schema file; a breaking change without a version bump fails.
- Whatever else the DRs decided: "every state change emits an event", "no synchronous call to a third party inside a request handler".

Name the library or technique per language and verify it exists and is maintained (§10). Where no tool exists, write the rule as a test using the language's own module system, or as a lint rule with an explicit path pattern, and say which.

Every ADR that can be enforced carries a **Compliance** line saying how — this is the practice from Richards & Ford's addition to Nygard's original format, and it is the difference between an architecture and a wish.

## 7. Step 6 — The cross-cutting decisions list

Walk this list explicitly. Each item is either a DR or one line saying "not applicable, because…". Silence on any of them is a decision the first agent will make for you, differently each time.

**Data** — relational vs other, and why; the ownership model; identifiers (sequential vs UUID/ULID, and whether IDs are exposed); soft delete vs hard delete and the audit trail; timestamps and time zone storage rule; money representation (integer minor units, never floats) and currency; migration policy (forward-only, reviewed, reversible how); seed and fixture strategy; retention and deletion (a real requirement when personal data is in scope).

**Time and correctness** — synchronous vs queued work and where the boundary is; idempotency strategy for anything externally triggered (payment callbacks, webhooks, retries) and the key it uses; transaction boundaries; what is allowed to be eventually consistent and what is not; concurrency control (optimistic version column vs locking) on contended records; scheduled jobs and how a missed run is handled.

**Interfaces** — API style and the contract file as source of truth; versioning policy and what counts as breaking; error shape (a single documented error envelope with codes, not ad-hoc strings); pagination convention; validation location; whether the client is thin or holds state.

**Identity and access** — authentication mechanism and session/token lifetime, refresh, and revocation; the role × permission matrix; the object-level authorization rule; how the admin surface is separated; how a session ends everywhere.

**Failure** — timeout, retry and backoff policy per external dependency; circuit-breaking or its explicit absence; what degrades vs what blocks; the fallback per integration; what is queued for later vs dropped; how a partial failure of a multi-step operation is recovered.

**Operations** — environments and how they differ; configuration and secret loading with fail-fast validation at startup; logging format and levels and the PII redaction rule; metrics and health endpoints; error tracking; backup and restore (including a stated, tested restore procedure — an untested backup is not a backup); deploy and rollback steps; where state lives that is not in the database (uploads, caches) and its durability.

**Frontend, when there is one** — rendering strategy (server-rendered / SPA / hybrid) and why, tied to the personas' devices and network; state management approach; data fetching and caching; form/validation approach shared with the backend contract; asset and font loading (a real decision when a locale needs a specific font and a CDN may be unreachable); offline behaviour.

## 8. Step 7 — Technology selection, and how to justify it

Only now name technologies. Each choice is scored against the criteria in `research-protocol.md` §6 (weighted for a coding agent as the primary author) **plus** the architecture drivers from §2 — a stack that scores well generically but cannot meet AD-2 loses.

Every row of the stack table answers four things, and a row missing any of them is not finished:

1. **What** — the exact package/runtime, with a pinned version, verified this session.
2. **Why** — the *deciding* reason, tied to a driver or an agent criterion. Not "popular", not "modern". "Chosen for AD-1: single binary deploy, no runtime to manage" is a reason; "great developer experience" is not.
3. **What lost, and what it would have bought** — the runner-up in one clause, and the thing you gave up. This is what stops a future session re-litigating it, and it is the honest part: every choice costs something.
4. **Evidence** — `[VERIFIED — S-nn, date]` for the version, maintenance status, license, and any capability claim ("supports RTL", "has a maintained Jalali library", "sandbox available").

Also write, because they are the parts that actually prevent hallucination:

- **Forbidden choices** — packages and services explicitly not to use, with the reason (archived, unmaintained, license, unreachable from the target market, superseded API). An agent that knows what is banned is much safer than one that only knows what is blessed.
- **The dependency policy** — adding a package requires a DR entry; the bar for what justifies one; where the boundary is between "use a library" and "write 30 lines".
- **Version drift rule** — the pinned versions are what the blueprint was verified against; a session that finds a version has moved records it and re-verifies rather than silently upgrading.

## 9. Decision record format

One record per decision, in the blueprint's section 4 for cross-cutting decisions and inline in section 12 for architectural ones. Short — a record nobody reads is worse than none. Based on the widely used Nygard/MADR shape plus the compliance line:

```
### DR-07 — Idempotency keys on all payment callbacks
**Status** Accepted — 2026-09-06 · Supersedes: none
**Drivers** AD-2 (correctness of money handling), AD-5 (recoverability)
**Context** The gateway may deliver a callback more than once and does not guarantee ordering
  [VERIFIED — S-12, 2026-09-06]. Duplicate processing would double-credit an order.
**Options** (a) dedupe on gateway transaction ID at the DB level; (b) application-level lock;
  (c) accept duplicates and reconcile nightly.
**Decision** (a). A unique constraint on `payment.gateway_txn_id` plus an upsert; the handler is
  a pure function of the callback payload.
**Consequences** Callback handling becomes safe to retry, and replays are free. Cost: the gateway
  transaction ID becomes part of our schema and a gateway change would require a migration.
  Rejected (c) because reconciliation needs a human and this product has none.
**Compliance** Integration test `payments/callback_replay_test` sends the same callback 3x and
  asserts one payment row and one ledger entry. Runs in `check`.
**Reversibility** Medium — one-way once production rows exist; migration path noted.
```

Rules: one decision per record; IDs never reused; a superseded record stays in the document with its status changed and a pointer to the new one, because the record of *why we changed our mind* is often more valuable than the current answer.

## 10. What to research and cite

Nothing in this file is a fact about the world; it is a procedure. The facts come from this session's searches, each tagged and logged:

1. **Version, maintenance and license** of every component named — and whether the project is archived, in maintenance mode, or has a deprecation notice on the exact feature you plan to use. Read the page; snippets lie about archived projects.
2. **Capability claims** — the specific one you are relying on, from the official docs: RTL support, the locale/calendar library, the driver for your database, the ORM's support for the relation shape your data model needs, the framework's support for the rendering strategy you chose.
3. **Framework's recommended architecture** — the official "how to structure a project" guidance for the framework, because the blessed path is where the documentation and the agent's reliability are. Deviating from it is itself a DR.
4. **Fitness-function tooling** for the language — a maintained architecture-testing library, or the lint mechanism that will stand in for one.
5. **Hosting and runtime reality** — supported runtime versions on the chosen host, build and start commands, database and object-storage options, region reachability from the target market, and what the plan the user can actually buy includes.
6. **The current state of the architecture-style discussion** if the blueprint asserts anything about it (the modular-monolith default in §4, service-decomposition thresholds, any "most teams" claim). Cite the year, or drop the claim.
7. **Category-specific architectural requirements** — payments (callbacks, reconciliation, PCI-adjacent constraints), messaging platforms (bot API limits, webhook vs polling), mobile stores, anything with an audit requirement.

Where a claim cannot be verified, it is `[ASSUMED — reason]` or `[UNKNOWN → OQ-nn]` with a proposed default. Never an unmarked assertion — an unmarked wrong version number in a stack table produces an entire session of code against an API that does not exist.

## 11. Anti-patterns to avoid in the document

- **Technology-first justification.** The stack chosen before the drivers, then rationalised. Detect it by asking whether any driver in §2 could have changed the answer; if not, the drivers are decoration.
- **Resume architecture.** Complexity that serves the builder's interest rather than the product's — a queue with one job, a cache with no measured hot path, services for a single-person team.
- **"Scalable" as a driver.** Unquantified, so unfalsifiable, so it justifies anything. Replace with numbers from the scale ceiling.
- **Boundaries with no enforcement.** Modules described in prose and violated in week two.
- **Deferred decisions.** "We'll decide the auth model when we get there" hands the decision to whichever agent gets there first. Decide, record reversibility, move on.
- **Both-options prose.** "We could use X or Y" is not a decision. If the choice genuinely depends on an unknown, it is an OQ with a proposed default, not an open sentence.
- **Copying a reference architecture wholesale** from a blog post for a system three orders of magnitude larger than this one.

## 12. Output into the blueprint

- **Section 12.0** — Architecture drivers `AD-n` with targets and ranks, plus the explicit non-drivers.
- **Section 12.1** — Style decision: candidates, the scoring table, the decision, the exit triggers.
- **Section 12.2** — Module map, boundaries, dependency rule, data ownership, where-new-code-goes.
- **Section 12.3–12.9** — Component diagram, data model, API contracts, auth model, integrations, environments/config/secrets, observability, security baseline, performance budgets (as in the template).
- **Section 12.10** — Fitness functions: the rule, the check, where it runs.
- **Section 4.2 and inline** — DRs in the §9 format, each naming drivers, losers, consequences, compliance and reversibility.
- **Section 13** — The stack table where every row carries what/why/loser/evidence, plus forbidden choices and the dependency policy.
- **Epic 00** — Stories that create the module skeleton and the fitness functions, so the boundaries exist before there is any code to violate them.
