## Step 4 — Score and report

This reference covers everything that happens after recommendations are drafted: quality floor, impact framing, sort order, the customer-facing report template, and the playbook selection matrix.

## Table of contents

- [Quality floor and prune rules](#quality-floor-and-prune-rules)
- [Impact framing — the magnitude rule](#impact-framing--the-magnitude-rule)
- [`impactLabel` schema](#impactlabel-schema)
- [Sort order and platform-rec cap](#sort-order-and-platform-rec-cap)
- [The customer-facing report template](#the-customer-facing-report-template)
- [Playbook selection matrix](#playbook-selection-matrix)

## Quality floor and prune rules

| Rule | Value | Why |
|---|---|---|
| Drop recommendations with `quality.overall < 0.55` | Hard cutoff (raised from 0.4 in May 2026 audit) | Bad-grade recs erode trust faster than they help. 0.55 matches the Poor/Fair grade boundary; recs below this are "Poor" and shouldn't ship. |
| Prune cap on findings | 30% of input | Stops the pruner from wiping the report when LLM merit-grades are noisy |
| Platform-rec cap | 3 | Account-level recs (Fluid, Bot Protection, Speed Insights) only have room for the top three |
| Quick-wins definition | `effort === 'low' AND priority > 40` | Surfaces fixes the user can ship in a single PR |
| Savings floor (internal ranking only) | $5/mo equivalent | Below this, even a "high" tier impact translates to "negligible" magnitude |

## Impact framing — the magnitude rule

**Performance: be precise.** Use observed numbers. Example:

> "Reduce /api/products p95 from 850ms toward ~250-400ms; cache hit would lift from 0% toward ~60% based on similar cached routes."

Performance numbers come from `signals.json.metrics.*` — they're observed, not extrapolated. Cite the exact route + metric value.

**Dollar cost: never precise.** Use MAGNITUDE BUCKETS via `lib/impact-magnitude.mjs`'s `impactMagnitude({currentCost, impactTier})`:

| Estimated reduction (USD) | Magnitude | Customer-facing phrase |
|---|---|---|
| < $5 | `negligible` | "small cost impact at current traffic" |
| $5 – $50 | `small` | "low-tens of dollars per month at current traffic" |
| $50 – $500 | `medium` | "hundreds of dollars per month at current traffic" |
| $500 – $5,000 | `large` | "low-thousands of dollars per month at current traffic" |
| > $5,000 | `very-large` | "thousands+ of dollars per month at current traffic" |

Reduction is computed as `currentCost × fraction` where `fraction = {high: 0.4, medium: 0.2, low: 0.1}[impactTier]`. The fraction is intentionally conservative — we'd rather under-promise than mislead.

### Discountable vs non-discountable SKUs

When the project is on a Flex Commit and the report frames savings against contract burndown, segment spend before phrasing. Field doctrine (May 2026): the Flex discount slider applies only to a subset of SKUs.

| Discountable (slider applies) | Non-discountable (raw rate) |
|---|---|
| Seats | Build CPU Minutes |
| Edge Requests | Fluid Active CPU |
| Fast Data Transfer | Fluid Provisioned Memory |
| Fast Origin Transfer | Raw Flex top-up |
| Image Optimization | |
| ISR Reads / Writes | |
| Observability Events | |

A recommendation that targets a non-discountable SKU should never frame savings as a percentage of contract; frame as absolute magnitude only. Conversely, a discountable-SKU recommendation may surface "applies to contract burndown" in the magnitude phrase.

**Why magnitudes:**

- Traffic varies. A "20% reduction in edge requests" is exact at today's traffic and meaningless next quarter.
- Pricing changes. Vercel's billing rates move; precise dollar projections rot.
- The user is smart. They'd rather see "hundreds of dollars per month" with a real metric backing it than `$340/mo` with a hand-wave behind it.
- The `$-strip` sanitizer enforces this at output time. Any `$N` literal that slips into customer-facing fields is replaced with "the billed cost" before rendering.

## `impactLabel` schema

```ts
type ImpactLabel = {
  // PRECISE: performance recs
  performance?: string;
  // MAGNITUDE: cost recs
  costMagnitude?: 'negligible' | 'small' | 'medium' | 'large' | 'very-large';
  costPhrase?: string;
  billingDimension?: string;   // 'Edge Requests' | 'Function Duration' | ...
  fractionReduced?: number;    // 0.2 = ~20% — internal only, NOT rendered
};
```

Cost recs render `costPhrase`. Performance recs render `performance`. Reliability recs frame impact as observed error/timeout reduction (e.g., "Cuts 5xx rate from 0.4% to <0.1% based on current traffic").

When a rec spans buckets — e.g., a caching fix that reduces both cost AND latency — render both lines.

## Sort order and platform-rec cap

Internal sort key (never rendered): `priority = currentDimensionCost × fractionReduced × confidence`.

The list of recs the customer sees is sorted by this priority. The platform recommendations section is capped at 3, sorted the same way.

## The customer-facing report template

The agent renders this as the final output of Step 4. The shape is fixed; the content comes from the merged signals + verified recommendations + the `gated[]` list from Step 2.

```markdown
# Vercel Optimization Report — {projectName}

**Stack**: {framework}@{frameworkVersion} | {router} | {orm}
**Plan**: {plan.plan} ({plan.reason})
**Period**: {usage.period.from} → {usage.period.to}
**Observability**: {observability status}

## Cost breakdown

| Service | Usage | Billed Cost |
|---|---|---|
| (non-zero rows from usage.services, sorted by billedCost desc) |

Total billed: {usage.totals.billedCost} (we render the precise current cost — we just don't project future precise savings)

Omit zero-cost service rows from the table at the same cent precision shown to customers. If every row has `$0.00` billed cost but `effectiveCost` / USD `pricingQuantity` is non-zero, explain that net billed cost is `$0.00` after included credits or allotments and show the effective usage cost table instead. If both billed and effective costs are `$0.00`, replace the table with a concise note that `vercel usage` returned a billing payload but every reported service cost was `$0.00` for the window.

If `vercel usage` was queried and unavailable, the cost breakdown is replaced by an observability-derived cost ranking from `metrics.fnGbHrByRoute` + `metrics.fnCpuMsByRoute` + `metrics.fdtByRoute` when those metrics exist. These don't translate directly to dollars — they show *which routes consume the billable units* so the user knows what to attack first. If `usageError` is `NOT_COLLECTED_OBSERVABILITY_BLOCKED` or another `NOT_COLLECTED_*` value, say usage was not collected; do not describe it as a billing-plan or Costs-feature finding.

Render Observability status from the actual collection state:
- `Observability Plus enabled — per-route metrics included` when `observabilityPlusUsable=true`.
- `Per-route metrics unavailable — audit paused before metric-backed route ranking` when an Observability Plus blocker stopped the run before billing/scanner collection.
- `Per-route metrics unavailable — analysis based on billing + scanner findings` when the user accepted a limited audit and billing/scanner signals were collected.
- `Per-route metrics unavailable — limited analysis based on scanner findings` when the user accepted a limited audit but billing usage was queried and unavailable.
- `Not checked — audit paused at unsupported-framework preflight` when framework support stopped the run before the Observability Plus check.
- `Not enabled — analysis based on billing + scanner findings` only for legacy/limited reports where Observability Plus is known false and billing/scanner signals exist.

## Highest-impact recommendations

For each high-priority rec, in order:
1. **{route or file}** — {o11ySignal}
1. **{readable candidate label}** — {readable metric labels}
   - **What to do**: {rec.what}
   - **Impact**: {impactLabel.performance ?? impactLabel.costPhrase}
   - **Effort**: {rec.effort}
   - **Citations**: {rec.citations}

## Recommendations

### High impact

| # | Bucket | What | Impact | Effort | Citations |
|---|---|---|---|---|---|

### Medium impact
### Low impact

## Platform recommendations

(account-level recs from gate, capped at 3)

## Observations from investigation

Non-recommendation findings from reconciliation or investigation: deployment regressions, route-error storms, metric mismatches, and other real signals that should not become speculative performance recommendations.

Observations must not contain implementation-grade actions. If the suggested action says to enable, add, wrap, apply, move, configure, challenge, deny, or otherwise change code or project settings, the renderer must hold it back until it passes the ready-to-apply recommendation evidence bar. Customer-visible observations can ask for narrower evidence collection: inspect logs, compare deployments, check headers, or confirm cacheability.

## Investigated, no change recommended

Candidates that were checked but did not produce a supported recommendation. Use plain reasons; do not use "abstain" in customer-facing copy.

| Candidate | Why no recommendation shipped |
|---|---|
| Slow route on /docs | Detailed metrics did not support a code change |

## Not investigated in this run

This section earns the user's trust. For every metric signal we considered but didn't act on, group by candidate type and reason:

| Candidate type | Why not investigated | Targets | Count |
|---|---|---|---:|
| Low cache-hit route | hitRate 0.65 above threshold | /api/orders | 1 |
| Slow route | left for a larger run | /api/docs<br>/api/learn | 2 |

## Strengths

(what the project is doing right — caching is healthy on routes X/Y/Z; Fluid Compute is enabled; etc.)

## Data gaps

(what we couldn't measure — Observability Plus disabled means no per-route latency, etc.)
```

Common data gaps to call out when the underlying metric returned empty rows. If the metric query failed (`ok=false`), say the metric was not usable with the code; do not convert failed queries into "no measurements" or "not used" claims.

- **Core Web Vitals empty.** The Speed Insights metric returned no measurements for the 14-day window. The `cwv_poor` gate stayed dormant; no claims about LCP/INP/CLS are made.
- **ISR empty.** Project doesn't use Incremental Static Regeneration. The `isr_overrevalidation` gate stayed dormant.
- **Middleware empty.** No `middleware.ts` (or matcher excludes all observed traffic). The `middleware_heavy` gate stayed dormant.
- **Image transformations empty.** No `next/image` usage or no images served in the window.
- **BotID checks empty.** BotID is disabled — see the `platform_bot_protection` recommendation for the toggle.
- **Cold-start data near-zero.** Fluid Compute may already be enabled, or the project's traffic pattern keeps warm instances available; the `cold_start` gate evaluates the data but emits no candidate.

The "Not investigated in this run" section is critical. It comes directly from `gate.json` produced by the gate. It tells the user we considered everything; we didn't just pick the easy targets.

## Playbook selection matrix

The recommender selects 0-2 playbooks based on the project's `stack.applicationProfile` (inferred from frameworks + deps) and the top billing dimensions.

| Application profile | Likely top dimensions | Apply playbooks |
|---|---|---|
| `ai-application` (AI SDK, AI Gateway, Sandbox usage) | AI Gateway, Sandbox Active Compute, Function Duration | `playbooks/ai-application.md` |
| `ecommerce` (Stripe, Shopify, cart components) | Edge Requests, Function Duration | `playbooks/ecommerce.md` |
| `saas` (auth, dashboards, multi-tenant) | Function Duration, Bandwidth | `playbooks/saas.md` |
| `api-service` (mostly API routes, no UI) | Function Duration, Edge Requests | `playbooks/api-service.md` |
| `content-site` (blog, docs, mostly static) | Edge Requests, Image Optimization | `playbooks/content-site.md` |
| `marketing` (landing pages, A/B tests) | Edge Requests, ISR Reads | `playbooks/marketing.md` |

`ai-application` is checked first in `inferPlaybook()` — an AI-heavy SaaS or AI commerce app shares the AI playbook's billing shape (AI Gateway dominant) and gotchas, not the dashboard or cart-checkout patterns.

Playbooks shape phrasing and ordering of recommendations. They never invent claims — every rec must still trace back to verified findings.
