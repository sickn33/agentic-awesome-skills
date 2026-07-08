# Doctrine

The four non-negotiable rules that shape every action this skill takes. If a future change conflicts with one of these, the change is wrong.

## Rule 1: Observability before investigation

The skill never reads a source file without an observability signal pointing at it. Step 1 (`node scripts/collect-signals.mjs`) is always first. Nothing reads source code until `signals.json` exists.

**Why this fails when skipped:** without metrics, the skill defaults to "grep the repo for known anti-patterns and complain." That produces noisy, low-impact recs that aren't tied to traffic, cost, or user pain. Metrics-first investigation keeps the skill focused on observed traffic, cost, and reliability signals.

### Four-check first-pass (Enterprise)

When `plan === 'enterprise'`, the gate run must surface these four checks before code-level recommendations. Field engineers confirm these are the highest-leverage account-level levers across every renewal audit:

1. **Observability Plus enabled?** From `signals.observabilityPlus`. If false, the whole audit degrades; surface as a top-of-report item.
2. **Reverse proxy in front?** Heuristic from response headers / CNAME chain (when collected). A non-Vercel CDN over Vercel ISR is usually a "dumb pipe" — wasted spend.
3. **WAF rules enabled?** From `signals.project.security`. BotID + managed rules absent on a project with bot evidence is the most common cost spike.
4. **ISR read:write ratio.** From `metrics.isrReadsByRoute` + `metrics.isrWritesByRoute`. Include CDN-tier reads (see [data-collection.md](data-collection.md)) before flagging "writes > reads."

These checks anchor the Enterprise-tier report's opening narrative; code-level recs follow.

## Rule 2: Deterministic gate before every sub-agent investigation

`node scripts/gate-investigations.mjs` is a pure-JS, LLM-free function. It reads `signals.json` and outputs `{toLaunch, platform, gated}`. Same input always produces byte-identical output (modulo `appliedAt`).

Every kind of candidate (uncached route, slow route, errors, cold starts, scanner findings, platform-level recs) has its threshold expression encoded as a `gate(signals) → Candidate[]` function in `lib/gates/<kind>.mjs`.

**Failed gates surface in the final report**, under "Not investigated in this run," with the exact reason they were held back. This is the user-facing trust mechanism: you see what we considered and chose to skip, and the reason.

**Why this matters:** the agent never decides "should I look at this route?" via LLM judgment. The threshold is mechanical. This eliminates the entire failure mode where the agent investigates routes it shouldn't (cold-path) and recommends fixes for routes that don't need them.

## Rule 3: Candidate-bound investigation scope

When the gate emits a candidate with `files: ['src/app/api/products/route.ts']`, the agent reads ONLY that file (and its imports as the chain unfolds). It does NOT `grep -r` across the repo.

If you find yourself wanting to grep the whole codebase, stop and re-read the current candidate's `question` field. If the question doesn't constrain the search, the candidate is malformed — log it as `gated` and skip. Do NOT compensate with a wider search.

**Why this matters:** the agent's job is to verify and explain the metric anomaly the gate found, not to do a general code review. Wandering investigations produce drift, hallucination, and recommendations untied to the cost and performance data.

### Scanner findings (the supplementary signal)

Static AST-grep scanners run in parallel with the metric-driven investigations. Their output is annotated with the per-file observability signal (`function invocations: 1.2M; 95th percentile duration: 850ms; cache hit rate: 0%` if the file maps to a hot route, `COLD-PATH` if it maps to a route with no traffic, `NO-ROUTE-MAPPING` if the file doesn't map to any route).

**Default rule:** scanner findings on `COLD-PATH` or `NO-ROUTE-MAPPING` files are dropped. They become recs only if the pattern is *traffic-independent*: build configuration, middleware matcher, source maps in production, raw script tags, React Compiler config. These don't care about traffic — they affect every request equally or affect the build itself.

The traffic-independent allow-list lives in each scanner's `metadata.trafficIndependent: boolean` field. Set it to `true` only when you can defend the claim.

## Rule 4: Doc-grounded, version-aware recommendations — no hallucinations

Every recommendation must carry at least one citation from `references/docs-library.json`. Anything else is dropped at sanitizer time.

The library has two parts:
- **URLs** — Vercel docs, Next.js docs, SvelteKit docs, etc. Each declares `applicableFrameworks` (e.g., `["next@>=15.0.0"]`).
- **Cross-skill rule references** — by name only (`vercel-react-best-practices:async-parallel`). The agent's host resolves these.

Three sanitizers enforce this:
- `missing-citation` — drops recs with empty `citations[]`.
- `unknown-citation` — strips URLs not in the library, marks `needsReview=true`.
- `version-mismatch` — strips URLs whose `applicableFrameworks` doesn't match the project's framework@version (parsed from `package.json`).

Two verifier claim types check it: `citation_in_library` (URL ∈ allow-list) and `citation_applies_to_version` (semver match).

**Why this matters:** LLMs cite plausible-looking URLs that 404, or recommend Next 15 features to Next 13 users. Both are trust-killers. The allow-list closes the first failure mode; the `applicableFrameworks` field closes the second.

### Performance citations cite observed data

Every performance claim cites the actual observability datum from `signals.json` — e.g., `functionRoutes[/api/products].p95Ms=850`. Estimated improvements are framed as ranges grounded in the observed baseline: `"Reduce /api/products 95th percentile duration from 850ms toward ~250-400ms based on similar cached routes."` Never an unanchored claim.

### Cost framing is magnitude, never precise

Cost claims like `$340/mo` are forbidden. The dollar noise floor on projections is too high to justify precision. The `impactMagnitude({currentCost, impactTier})` helper maps to phrases like `"hundreds of dollars per month at current traffic"` (computed against the user's actual `vercel usage` data).

The `$-strip` sanitizer enforces this at output time — any `$N` literal in customer-facing fields is stripped.

Performance numbers stay precise because they're observed, not extrapolated. We trust observed metrics; we don't trust dollar projections.

## What good looks like

A good run produces:
- A small number (5-15) of recommendations.
- Every rec ties to a specific route or file plus a specific metric signal.
- Every rec carries before/after code and ≥1 citation matching the user's framework version.
- Cost framing uses magnitude phrases. Performance framing uses precise observed numbers.
- The "Not investigated in this run" section explains every other signal we saw and why we chose not to dig (cache hit rate was below threshold, 95th percentile duration was already healthy, etc.).
- No `$N/mo` strings, no fabricated URLs, no Next.js 15 features recommended to a Next.js 13 user.

## What bad looks like (anti-patterns we will not ship)

- Recommendations from grepping the repo for known anti-patterns, without checking traffic.
- "Enable Fluid Compute" without a cold-start signal.
- "Add caching to /api/users" when the route has cookies() and is auth-gated.
- "Reduce the duration of `/.well-known/workflow/v1/step`" because a Workflow step is long-running. Workflow runtime endpoints are generated orchestration routes; high wall-clock duration there is expected unless a separate reliability/error signal points elsewhere.
- "Fix `/api/chat/[id]/stream` because it has high duration" without proving the stream does avoidable pre-first-byte work, high active CPU, duplicate invocations, or movable post-response work.
- "Save $340/mo by doing X" — invented precision.
- Citations to URLs that don't exist or that describe Next.js features the user's version doesn't have.
- Long lists of recs the user can't act on; every rec needs an evidence chain.

## Out of scope

The skill is bounded to runtime cost and performance optimization on Vercel-hosted projects. The following are explicit non-goals; if signals or scanner findings surface in these areas, route them out:

- **Deployment artifact size** in isolation. Bundle size matters only when it shows up as runtime cost (cold start, FDT) or performance (LCP, INP). If the only effect is "the .next directory is large," it's not in scope.
- **Build-time issues without runtime impact.** Slow builds, build-cache misses, monorepo build fan-out — these only enter scope when they show up as Build Minutes billing pressure (then they go through the `build-minutes-fanout` gate). A 6-minute build that completes successfully and ships a small artifact is not a target.
- **Security advisories and credential rotation.** RCE in `next-mdx-remote`, leaked env vars, OIDC vs explicit-key auth hygiene — refer to a security skill, not this one. Exception: when a security setting is also a documented cost lever (BotID = bot traffic = edge cost), it enters via the `platform_bot_protection` gate.
- **Commercial / billing-process trivia.** Discount sliders, seat reconciliation, contract renewal mechanics. The skill can quantify which SKU is expensive; it does not negotiate.
