# Deep research protocol

Contents: 1 Setup · 2 Evidence tagging · 3 Source tiers · 4 Track A understand · 5 Track B benchmark · 6 Track C architecture drivers and shape · 7 Track D stack for agentic engineering · 8 Track E quality bar and tooling · 9 Track F integrations & locale · 10 Track G UX benchmarks · 11 When research fails · 12 Research summary format · 13 Iran verification list

Run the tracks in order. C before D is not cosmetic: the shape of the system constrains which technologies can serve it, and choosing the technology first means the architecture gets reverse-engineered to fit a decision that was never tested against the product's requirements. D before E for the same reason — the quality tooling that exists depends on the language you picked.

## 1. Setup

- Confirm web search and page-fetch tools exist. Without them, stop and tell the user (see SKILL.md, Phase 1).
- Start a **source log** immediately: `S-01 | title | URL | accessed YYYY-MM-DD | what it supports`. Append as you go. The Sources section of the blueprint is this log, cleaned. Reconstructing sources afterwards is how fabricated citations happen.
- Budget: breadth first (short queries, 1–4 words, scan many results), then depth (fetch the 10–20 pages that matter: official docs, changelogs, pricing pages, store listings). A whole product typically needs 20–60 searches and 10–25 fetches; a feature needs a third of that. Stop a track when new searches stop changing decisions.
- Use the current year in queries about "latest", "current", "best" — stale year terms return stale pages.
- Read pages, don't trust snippets. A snippet that says "v3 recommended" may sit above a banner saying the project is archived.

## 2. Evidence tagging (used everywhere in the blueprint)

| Tag | Meaning | Example |
|---|---|---|
| `[VERIFIED — S-07, 2026-09-05]` | You read a primary or strong secondary source that states it | "Framework X current stable is 15.2 [VERIFIED — S-07, 2026-09-05]" |
| `[STATED]` | The user said it | "Users are Tehran restaurants [STATED]" |
| `[ASSUMED — reason]` | Your choice where nothing was stated or found; reason in one clause | "Single currency (Toman) [ASSUMED — all benchmarked local competitors price in Toman]" |
| `[UNKNOWN → OQ-04]` | Could not verify; routed to Open Questions with an owner | "Whether gateway Y supports refunds via API [UNKNOWN → OQ-04]" |
| `[VERIFY-AT-BUILD]` | True now but volatile (service availability, sanctions, prices); the building session must re-check | "SMS provider Z reachable from EU hosting [VERIFIED — S-12, 2026-09-05] [VERIFY-AT-BUILD]" |
| `[UNVERIFIED]` | Only when web tools were unavailable for the whole run: a claim from memory that could not be checked. The cover carries a warning and the first build session re-verifies every such tag | "ORM X supports composite keys [UNVERIFIED]" |

Rules: every version number, every "X supports Y", every competitor claim, every market or price figure, every "available in Iran" carries one of these. Numbers with no source are not written. A claim you *remember* but did not read this session is `[ASSUMED]` at best.

## 3. Source tiers

1. Official documentation, changelogs, release pages, standards bodies, regulators, the vendor's own pricing/status pages.
2. Primary product pages and store listings of competitors (for what they do and charge), GitHub repos (for activity, license, archived status).
3. Reputable independent reports and well-known technical publications — corroborate with a tier-1 source when the claim drives a decision.
4. Reviews, forums, app-store comments — only for *user pain and expectations*, paraphrased, never quoted, never as fact about features.
5. Blogs and listicles — leads only; never cite as the sole support for a decision.

Prefer the newest tier-1 source. When sources conflict, record both and pick with a stated reason.

## 4. Track A — Understand the idea

Goal: describe the problem space better than the user did, in their vocabulary and the market's.

- Domain concepts and terms → start the **Glossary** (term, plain definition, Persian/English equivalents when bilingual, notes on ambiguity).
- How the job is done today without this product (manual, spreadsheets, competitor, workaround). This becomes the "today vs with product" framing in the executive summary and the personas' current pains.
- Adjacent regulation or platform policy that shapes scope (payments licensing, data protection, app-store rules, messaging platform bot policies, content rules). Flag as Open Questions for a professional; never write legal conclusions.
- Analogous products in other domains whose flows solve the same shape of problem (a queue-ticketing pattern, a two-sided marketplace pattern). Note the pattern, not the brand, unless benchmarking it.
- Outcome definition: write the single sentence "After using this, <persona> can <outcome> in <time/effort> instead of <today>". Every goal and metric derives from it.

## 5. Track B — Benchmark

Goal: know who exists, what the best of them do per flow, where they fail, and where this product wins.

1. **Identify 5–10 players**: direct competitors, indirect substitutes (including "spreadsheet + WhatsApp"), and 1–2 best-in-class products from adjacent categories. For an Iranian market include local players found via Persian queries; global players still matter as UX references even if unavailable locally.
2. **Feature matrix** (Competitor × capability): ✔ / partial / ✘ / unknown, each cell traceable to a source. Only capabilities relevant to the idea's outcome.
3. **Per-competitor card**: what it is; platforms; pricing model (figures only if sourced); onboarding shape; the 2–3 things it does best; the 2–3 recurring complaints (paraphrased from reviews, tier 4); what we adopt, what we avoid.
4. **Best-in-class per key flow**: for each core flow of *our* product (e.g., onboarding, first-order, payment, recovery), name which benchmarked product handles it best and what exactly they do (steps, defaults, copy behaviour). This feeds the flows and UX writing sections directly.
5. **Gap and positioning**: one paragraph — the unmet need or under-served persona, and the positioning statement: "For <persona> who <need>, <product> is a <category> that <benefit>, unlike <alternative> which <limitation>."
6. **What not to copy**: anti-patterns observed (dark patterns, 6-screen tours, mandatory sign-up before value) with one line why.

Never quote review text or marketing copy; describe it. Keep pricing figures to what a pricing page states, with the date.

## 6. Track C — Architecture drivers and shape

Full procedure in `architecture-decisions.md`; read it before starting this track. What the research phase owes it:

1. **Drivers, not adjectives.** Derive 5–8 ranked architecture drivers `AD-n` with measurable targets from the personas, the stated scale ceiling, the failure cost of the core loop, the regulatory flags and the hosting reality. Then write the explicit non-drivers. A driver without a number is not a driver.
2. **Shape before technology.** Score 2–3 candidate architecture styles against those drivers. Record the scoring table; it becomes a DR. The default for this skill's output is a modular monolith with enforced boundaries — but "default" means it must still be argued against the drivers and given explicit exit triggers, not asserted.
3. **Verify the architectural claims you rely on.** The framework's officially recommended project structure; whether the data-access layer supports the relation shape your model needs; whether the chosen runtime can do the concurrency model you assumed; whether the host supports the deploy unit you chose. Read the docs page, tag it.
4. **Verify fitness-function tooling** for the candidate languages — a maintained architecture-testing library, or the lint mechanism that stands in for one. This determines whether boundaries can be enforced or only described, which is a real input to the style decision.
5. **Category-specific architectural requirements** — payment callback and reconciliation models, webhook vs polling for messaging platforms, audit-trail requirements, anything the domain forces on the shape.
6. **Any "most teams" or "industry standard" claim** the blueprint will make about architecture gets a source and a year, or gets cut.

Output of this track: the ranked drivers, the scoring table, the style decision with exit triggers, the module map, the cross-cutting decision list from `architecture-decisions.md` §7 walked and answered, and the fitness-function list.

## 7. Track D — Stack for agentic engineering

The stack is chosen for one reader: a coding agent working alone in a fresh session, who must produce correct code with no one watching. That changes the usual criteria. Score candidates against the weighted table below **and** against the architecture drivers from Track C — a stack that wins generically but cannot meet a rank-1 driver loses.

### Weighted criteria (score each candidate stack 0–3 per row; weights in brackets)

| Criterion | Why it matters for an agent | Weight |
|---|---|---|
| Mainstream adoption + volume of high-quality documentation and examples | More training data and more current docs → fewer invented APIs | 5 |
| Strict static typing available and enforceable (compiler/typechecker in `check`) | Catches an agent's wrong assumptions before runtime | 5 |
| One-command deterministic quality gate (`check` = format + lint + typecheck + tests) with fast feedback (< 2 min for unit) | The session protocol depends on a green/red signal the agent can't argue with | 5 |
| Mature, standard testing tooling (unit, integration, e2e) with good error output | Acceptance criteria must be provable | 4 |
| Convention-heavy framework (file structure, routing, data layer conventions) | Fewer free choices → fewer inconsistencies across sessions | 4 |
| Stable/LTS release, low churn, clear deprecation policy | A version pinned today still has docs in six months | 4 |
| Small dependency surface; batteries included | Every extra package is another thing to hallucinate about | 3 |
| Fits the market's hosting reality (self-hostable, no dependence on services blocked or sanctioned for the target country) | A stack that can't deploy is a stack that doesn't ship | 4 (5 for Iran) |
| Native or first-class i18n/RTL/locale support where needed | Retrofitting RTL is a whole epic | 3 (5 for RTL markets) |
| Permissive license compatible with the business | Legal blocker | 3 |
| Team familiarity (if a team exists) | Review capacity | 2 |

### Process

1. From the platform decision (web/PWA/mobile/bot/CLI), list 2–4 realistic candidate stacks (language + framework + ORM/DB + test tools + UI layer).
2. For every component of every candidate, verify **this session**: current stable version and release date, LTS/maintenance status, not archived/deprecated, license, RTL/i18n support if needed, and the exact install/init command from official docs. Tag each `[VERIFIED — S-nn, date]`.
3. Score the matrix, pick, and write the **decision record**: chosen stack with pinned versions; the runner-up and why it lost; explicitly **forbidden choices** with reason (e.g., "no ORM X — archived [VERIFIED]", "no service Y — requires foreign card / blocked for Iranian IPs [VERIFIED] [VERIFY-AT-BUILD]").
4. Define the **agentic engineering conventions** that go into the blueprint and Epic 0: repo layout, `check` command and what it runs, formatter and linter configs (strict), typechecker strictness flags, test layout and naming, fixtures/factories, environment variables and `.env.example`, secrets handling, commit message convention (`type(scope): message [E03-S02]`), branch strategy (trunk + short-lived epic branches), CI running `check` on push, migration policy, logging/observability baseline, error-handling conventions (typed errors, no swallowed exceptions), API contract format (OpenAPI/JSON schema) as a source of truth for both sides.
5. Verify the **hosting and deployment** path end to end: platform/provider, build command, runtime version, database hosting, object storage, domain/TLS, backups. For Iran see §13.

### Heuristics (not rules — verify every time)

- Strongly typed mainstream languages with huge ecosystems and strict modes tend to win for agents; dynamic languages without type checking tend to lose points on row 2 even when adoption is high.
- Prefer the framework's "blessed" path over clever architecture; agents do best where the docs have one recommended way.
- Prefer a relational database with migrations over schemaless stores unless the data model truly demands otherwise; schema is executable documentation.
- Prefer boring, stable UI component libraries with documented RTL behaviour over visually impressive ones with thin docs.
- Prefer a monorepo with one `check` over multiple repos for a solo builder.

## 8. Track E — Quality bar and tooling

Full procedure in `code-quality-and-review.md`; read it before starting this track. The purpose is to make the quality gate real rather than aspirational: an agent cannot run a `check` command built from a library that does not exist for its language.

Verify, for the stack chosen in Track D, each with version and maintenance status:

1. **The gate components** — formatter, linter and the community-standard strict rule set, typechecker and its strict flags, test runner, coverage tool, mutation-testing tool (does a maintained one exist for this language, or not?), SAST/dependency audit, secret scanning, duplication detector, accessibility checker, architecture-rule library. Get the exact commands from official docs, not from memory.
2. **The official style guide** for the language and framework, so conventions are cited rather than invented.
3. **CI reality on the chosen host** — runners, cache, secret storage, required-check/branch-protection capability, and what the plan the user can actually buy includes.
4. **The security baseline for the category** — the current OWASP Top 10 (or API/mobile equivalent), plus anything the domain adds (payments, health, minors, personal data).
5. **Current delivery-metric definitions** if the blueprint will name any — the present DORA formulation and its performance bands. The framework has changed more than once; do not quote a version from memory.
6. **Current evidence on AI-authored code quality** if the blueprint will assert anything about it (security pass rates, duplication and churn trends, review-bottleneck findings). State the figure with its year and source, or state none. These numbers move every few months and a stale one in a rationale is worse than no number.

Output of this track: the concrete `check` command with its components and expected runtime, the test-quality rules, the named critical e2e paths, and the metric table with definitions and data sources.

## 9. Track F — Integrations and locale realities

For every external dependency the product needs (payment gateway, SMS/OTP, email delivery, maps, push notifications, object storage, CDN, app stores, messenger bot APIs, analytics, error tracking), verify:

- Exists and is active today; official docs URL; pricing model (state figures only if on a pricing page, with date).
- Reachability from the target market and from the chosen hosting (blocked? needs foreign card? sanctions clause in ToS? requires local company registration?).
- Sandbox/test mode availability — the acceptance criteria will require testable integrations.
- Webhook/callback model, idempotency guarantees, rate limits, error codes — these become edge cases and AC.
- Fallback: what the product does when the service is down (queued, degraded, blocked).

Record each as an **Integration card**: name, purpose, docs `S-nn`, status `[VERIFIED …] [VERIFY-AT-BUILD]`, sandbox yes/no, fallback, owner of credentials (OQ if unknown).

## 10. Track G — UX benchmarks

From the benchmarked products and 2–3 best-in-class references: how they onboard (steps to first value), how they handle empty states, errors and recovery, how they confirm destructive actions, how they do phone/OTP login (for Iran), how they present prices/dates, and what accessibility features are standard. Capture as short observations tied to sources; they justify the flow and copy decisions ("we adopt A's 2-step onboarding because…"). Also check the current accessibility standard version and level to reference (verify).

## 11. When research fails

- Nothing found → `[UNKNOWN → OQ-nn]` with a proposed owner (user / vendor / legal / design) and a proposed default the build session may use if unanswered, clearly marked as such.
- Conflicting sources → record both, decide, state why; add `[VERIFY-AT-BUILD]` if the conflict is about volatile facts.
- Volatile facts (availability, sanctions, prices, app-store policy) → always `[VERIFY-AT-BUILD]` in addition to the verification tag; the session protocol makes the building agent re-check these before relying on them.
- Never "fill in" a plausible library, endpoint or parameter name. If the docs page that lists it was not read, it is not in the document.

## 12. Research summary format (feeds the Decision brief)

```
### Research summary
Outcome sentence: …
Glossary seeds: term → definition (5–15)
Today's alternatives: …
Benchmark: <n> players; leaders: …; gap: …; positioning: …
Best-in-class per flow: onboarding → …; core loop → …; payment → …; recovery → …
Architecture drivers (ranked, with targets): AD-1 …, AD-2 …; non-drivers: …
Architecture shape: … (score x/y vs runner-up …); exit triggers: …; modules: …; fitness functions: …
Stack decision: … (score x/y vs runner-up …); forbidden: …
Quality gate: check = …; expected runtime …; mutation tool: yes/no; metrics instrumented: …
Integrations: gateway → …; SMS → …; email → …; hosting → …
Locale realities: …
UX benchmarks: …
Open questions found: OQ-01 …, OQ-02 …
Sources so far: S-01 … S-nn
```

## 13. Iran verification list (load when users are Iranian)

Each item below is a *thing to verify this session*, not a fact. Availability, licensing and blocking change frequently; the tag on each must include the date and `[VERIFY-AT-BUILD]`.

**Money**
- Which payment gateways currently hold a Shaparak (شاپرک) licence / operate as licensed PSP aggregators; sandbox availability; refund API; callback model; fee structure; whether a company registration or personal ID is needed to open a merchant account.
- Currency display convention in the category (Toman vs Rial), rounding, and how competitors label it.
- Wallet/credit patterns common in the category.

**Identity and messaging**
- SMS/OTP providers currently operating (service SMS lines, template pre-approval requirements, delivery to all operators, blacklist behaviour, cost per message, Unicode segment length limits for Persian text).
- Mobile number formats and operator prefixes; national ID (کد ملی) check-digit validation if identity is needed; postal code format; address structure norms.
- Which messengers matter for bots/notifications in the target segment (domestic messengers vs Telegram/WhatsApp under filtering) and the current status of each bot API.

**Hosting and reach**
- Iranian cloud/VPS providers and their offerings (managed DB, object storage, CDN), or foreign hosts reachable from Iran without VPN; DNS/TLS providers reachable; whether the chosen hosting can pay for/reach the chosen services.
- Foreign services commonly blocked for Iranian IPs or requiring foreign cards (fonts CDNs, analytics, maps, package registries mirrors, container registries, error tracking, email delivery) — and the domestic or self-hosted alternative for each one you need.
- Sanctions clauses in ToS of any foreign service you still depend on.

**Distribution**
- App-store reality: domestic Android stores (which are active, their publishing requirements), whether Google Play / Apple App Store publishing is feasible for the user, PWA installability on common Iranian Android browsers.
- Common device/browser mix in the segment if any recent local data exists (otherwise `[ASSUMED]` mid-range Android).

**Calendar, time, language**
- Time zone (Asia/Tehran) and current DST policy; official holiday calendar source; work week (Saturday–Wednesday full, Thursday half or off in many sectors — verify for the segment); Jalali calendar library options in the chosen stack (maintained, correct leap-year handling).
- Persian typography: a well-maintained open Persian web font (license, weights, self-host files) and the number-glyph behaviour; whether the chosen UI library documents RTL.

**Legal/regulatory to flag (never answer)**
- E-commerce trust seal (e-namad) requirements for taking online payments; personal-data and consumer-protection rules applicable to the category; content licensing for any media; VAT/invoicing rules for the business model.
