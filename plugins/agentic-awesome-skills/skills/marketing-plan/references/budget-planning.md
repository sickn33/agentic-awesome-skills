# Budget Planning — Assumption-Based Scenarios

Planning contract: user-selected scope, length, language and one-shot/interactive cadence override template defaults. All tier amounts, channel rankings, growth bands and hiring patterns below are illustrative hypotheses, not validated benchmarks. Draft completion is distinct from user approval. Use only available verified skill/tool IDs; missing dependencies are optional. No external execution is authorized by this document.
Use an affordable-spend scenario and a goal-based cross-check together. Neither is a scientific guarantee. Obtain approved cash/runway and capacity constraints before proposing spend. Distinguish total sales-and-marketing cost from marketing-only, media-only and incremental experiment budgets. Never double-count salaries or add a buffer beyond an approved total.

## Definitions

- `A0`: starting recurring ARR, excluding hardware sales and other one-time revenue.
- `At`: target ending ARR, not recognized annual revenue, billings or cash receipts.
- `g`: gross revenue retention of the opening cohort over the horizon (0–1).
- `E`: expansion ARR from that opening cohort, measured separately from `g`.
- `P`: expected monthly recurring ARPC for new customers at the horizon.
- `s`: expected revenue-weighted survival of new acquisitions to the horizon (0–1), reflecting their acquisition dates and cohort retention. Do not automatically use a full-year opening-cohort retention rate for customers added throughout the year.
- `C`: fully loaded acquisition cost per gross new customer, with the same cost scope and time lag used in the budget.

## Method 1 — Affordable spend

Start with an approved annual acquisition envelope `B`. Under constant-CAC and constant-price assumptions:

```
Gross new customers = B / C
Ending ARR = A0 * g + E + (B / C) * P * 12 * s
```

Worked sensitivity example: `A0=$1M`, `B=$50,000`, `C=$100`, `P=$50`, `g=.85`, `s=.85`, `E=0`.500 gross additions produce `$255,000` surviving new ARR. The opening base retains `$850,000`, so ending ARR is **$1.105M**, not $1.255M. At `$400,000` acquisition spend under the same assumptions, ending ARR is **$2.89M**, not $3.4M. These are hypothetical scenarios; scaling CAC and actual acquisition timing usually change the result.

Percent-of-ARR envelopes (for example5%,15–25% or40%) are optional scenario anchors, not market norms, entitlements or recommendations. At zero ARR the ratio is undefined; use cash/runway. Public-company sales-and-marketing ratios are not interchangeable with a startup marketing-only budget.

## Method 2 — Target ending ARR

```
Surviving new ARR needed = max(0, At - A0 * g - E)
Gross new customers needed = surviving new ARR needed / (P * 12 * s)
Acquisition budget = gross new customers needed * C
```

For `A0=$1M`, `At=$2M`, `g=.85`, `E=0`, `P=$50`, `s=.85`, `C=$100`: the surviving-new-ARR gap is `$1.15M`, requiring approximately2254.90 gross additions. Round up to2255 customers and **$225,500** acquisition budget. A `$196,118` result from dividing a `$1M` gap by survival ignores churn in the opening base and does not reach the stated ending target.

If using NRR instead, compute retained-and-expanded opening ARR as `A0 * NRR` and do not add expansion again. Logo retention is not revenue retention when customer prices differ. Validate positive ARPC/CAC, `0 < s <= 1`, `0 <= g <= 1`, horizon and currency; reject invalid inputs rather than emitting false precision.

## CAC, LTV and cash

Fully loaded CAC includes allocated acquisition salaries, media, content, tools and agency costs plus sales effort where appropriate, divided by gross new customers attributable to the matched acquisition period. Report paid/channel, blended and incremental CAC separately. Align sales-cycle lags and cohort windows. Zero acquisitions makes CAC undefined; do not use zero. Unknown CAC needs a clearly labeled low/base/high sensitivity range or a bounded learning experiment, not an invented historical baseline.

For rough steady-state subscription contribution LTV, `monthly ARPC * gross_margin / monthly_logo_churn` requires constant price/margin/churn and a compatible cohort; it breaks with zero churn, immature cohorts, expansion and changing hazards. Prefer observed contribution by cohort and an explicit forecast horizon. Hardware contribution must subtract COGS, fulfillment, returns, support and fees. Do not divide revenue-only LTV by fully loaded CAC and call it profitability.

Annual prepayment changes cash timing; it does not mechanically reduce normalized MRR for the same annualized price. Separate ARR, revenue recognition, cash, taxes, refunds and payment/platform fees. Cost payback uses contribution margin, not revenue alone.

## Experiment reserve and decision gates

A10–20% reserve is an optional scenario **within** the authorized total, not an automatic surcharge. Show committed, experimental and contingency allocations summing to the total. Set spend caps, owner, stop criteria, privacy/measurement constraints and review dates. Funding not yet closed remains a conditional scenario with a delayed/no-funding alternative.

## T2D3 reference

T2D3 is an optional venture-growth heuristic: two annual3× steps and three2× steps. Starting at an illustrative$1M gives$3M,$9M,$18M,$36M,$72M over **five years**. The original [Battery Ventures article](https://www.battery.com/blog/helping-entrepreneurs-triple-triple-double-double-double-to-a-billion-dollar-company/) uses a$2M starting milestone and reaches$144M after that sequence. It is not a universal investor requirement, a seven-year sequence or a budget guarantee.

## What enters the plan

Section3 records actual cost scope, evidence dates and missing data. Section8 defines unit economics and contribution margin. Section10 reconciles affordable and goal-based scenarios with current cash/capacity and sensitivity ranges. Section11 allocates the same approved total across activities. Section13 records assumptions, evidence gaps, decision owners and reassessment triggers. Monthly forecasts remain scenarios; do not promise a target simply because arithmetic can produce it.
