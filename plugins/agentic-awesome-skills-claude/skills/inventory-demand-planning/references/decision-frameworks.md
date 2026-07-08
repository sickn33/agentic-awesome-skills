# Decision Frameworks — Inventory Demand Planning

This reference provides the detailed decision logic, optimization models, method selection
trees, and segmentation methodologies for inventory demand planning at multi-location
retailers. It is loaded on demand when the agent needs to make or recommend nuanced
planning decisions.

All thresholds, formulas, and cost assumptions reflect US multi-location retail operations
managing hundreds of SKUs across grocery, general merchandise, seasonal, and promotional
categories.

---

## 1. Forecast Method Selection Trees

### 1.1 Primary Selection Algorithm

The goal is to match each SKU to the forecasting method that minimizes WMAPE on out-of-time
holdout data. In practice, most organizations cannot afford per-SKU model optimization
across hundreds of items. Instead, classify items into demand pattern archetypes and assign
methods by archetype.

#### Step 1 — Classify the Demand Pattern

Compute the following statistics on the most recent 52 weeks of de-promoted demand data
(remove promotional lift periods before computing):

| Statistic | Formula | Purpose |
|---|---|---|
| **Coefficient of Variation (CV)** | σ_demand / μ_demand | Measures demand variability |
| **Average Demand Interval (ADI)** | Total periods / Number of non-zero demand periods | Measures intermittency |
| **Trend Strength** | R² of linear regression on 26-week trailing demand | Measures directional movement |
| **Seasonal Strength** | Autocorrelation at lag 52 (weekly) or lag 12 (monthly) | Measures repeating seasonal pattern |
| **Zero-Demand Ratio** | Count of zero-demand periods / Total periods | Measures how often demand is absent |

#### Step 2 — Map to Demand Archetype

| Archetype | CV | ADI | Trend R² | Seasonal AC | Zero Ratio | Example |
|---|---|---|---|---|---|---|
| **Smooth** | < 0.5 | 1.0–1.1 | < 0.3 | < 0.3 | < 5% | Milk, bread, paper towels |
| **Trending** | < 0.7 | 1.0–1.2 | ≥ 0.3 | < 0.3 | < 10% | Growing brand, declining legacy item |
| **Seasonal** | 0.3–1.0 | 1.0–1.3 | any | ≥ 0.3 | < 15% | Sunscreen, holiday decor, grills |
| **Trending-Seasonal** | 0.4–1.2 | 1.0–1.3 | ≥ 0.3 | ≥ 0.3 | < 15% | Growing seasonal category |
| **Erratic** | ≥ 0.7 | 1.0–1.5 | < 0.3 | < 0.3 | < 30% | Fashion accessories, novelty items |
| **Intermittent** | any | ≥ 1.5 | any | any | ≥ 30% | Spare parts, specialty ingredients |
| **Lumpy** | ≥ 1.0 | ≥ 1.5 | any | any | ≥ 30% | Bulk wholesale items with sporadic orders |

#### Step 3 — Assign Forecasting Method

| Archetype | Primary Method | Parameters | Fallback |
|---|---|---|---|
| **Smooth** | Weighted moving average (4–8 week window, recent-weighted) | Weights: 0.4/0.3/0.2/0.1 for 4-week | Single exponential smoothing (α = 0.15–0.25) |
| **Trending** | Holt's double exponential smoothing | α = 0.2–0.4, β = 0.05–0.15 | Linear regression on trailing 26 weeks |
| **Seasonal** | Holt-Winters (additive if stable amplitude, multiplicative if growing amplitude) | α = 0.1–0.3, β = 0.01–0.05, γ = 0.1–0.3, period = 52 weeks | STL decomposition + SES on residual |
| **Trending-Seasonal** | Holt-Winters (multiplicative) | α = 0.2–0.4, β = 0.05–0.15, γ = 0.15–0.3 | X-13ARIMA-SEATS |
| **Erratic** | Damped trend exponential smoothing | α = 0.2–0.4, β = 0.05, φ = 0.8–0.95 | Ensemble of 3 methods (median) |
| **Intermittent** | Croston's method or SBA | α_demand = 0.1–0.2, α_interval = 0.1–0.2 | Bootstrap simulation (1000 draws) |
| **Lumpy** | SBA (Syntetos-Boylan Approximation) | Same as Croston's with bias correction | Aggregated to monthly then disaggregated |

### 1.2 Model Switching Rules

Do not switch methods based on a single bad week. Models need time to prove or disprove themselves.

| Condition | Action | Minimum Observation Period |
|---|---|---|
| WMAPE improves > 10% on holdout vs. current method | Switch to candidate method | 8-week parallel test |
| Tracking signal exceeds ±4 for 2 consecutive periods | Trigger model review; re-estimate parameters first | 2 periods (weeks) |
| Tracking signal exceeds ±6 for 1 period | Immediate model review; likely archetype change | 1 period |
| Demand pattern archetype changes (e.g., smooth → trending) | Re-run selection algorithm from Step 1 | Quarterly archetype reassessment |
| New product transitions from analog-based to own-history | Switch when 12+ weeks of own data available and own-data WMAPE < analog-based | 12 weeks |
| Post-promotion baseline contamination detected | Refit baseline model excluding promo periods | Immediate |

### 1.3 Parameter Optimization Protocol

For exponential smoothing methods, optimize parameters using grid search on time-series
cross-validation (rolling origin, 1-step ahead forecast, 26+ origins).

**Grid search ranges:**

| Parameter | Range | Step Size | Constraint |
|---|---|---|---|
| α (level) | 0.05–0.50 | 0.05 | — |
| β (trend) | 0.01–0.20 | 0.01 | β ≤ α |
| γ (seasonal) | 0.05–0.40 | 0.05 | — |
| φ (damping) | 0.80–0.98 | 0.02 | Only for damped methods |

**Optimization metric:** Minimize WMAPE on the holdout origins. If two parameter sets
produce WMAPE within 1 percentage point, prefer the set with lower α (more smoothing)
for stability.

**Overfitting guard:** If the optimized model produces WMAPE on the holdout that is
>5 percentage points better than on the fitting data, the model is likely overfit.
Increase smoothing (lower α) until the gap narrows to <3 points.

---

## 2. Safety Stock Optimization Models

### 2.1 Standard Safety Stock (Normal Demand, Fixed Lead Time)

When demand follows a roughly normal distribution and lead time is consistent:

```
SS = Z × σ_d × √(LT)
```

Where:
- Z = z-score for the target service level (see lookup table below)
- σ_d = standard deviation of demand per period (use same period as LT)
- LT = lead time in periods

**Z-Score Lookup:**

| Service Level | Z-Score | Typical Application |
|---|---|---|
| 85.0% | 1.04 | CZ items — minimal investment |
| 90.0% | 1.28 | C-items, non-critical B-items |
| 92.0% | 1.41 | Mid-range safety net |
| 95.0% | 1.65 | Standard target for A/B items |
| 97.5% | 1.96 | AX items — high value, predictable |
| 99.0% | 2.33 | Critical items — stockout cost vastly exceeds holding |
| 99.5% | 2.58 | Life-safety or contractual obligation items |
| 99.9% | 3.09 | Rarely justified — extreme holding cost |

### 2.2 Safety Stock with Lead Time Variability

When vendor lead times are uncertain (CV of lead time > 0.15):

```
SS = Z × √(LT_avg × σ_d² + d_avg² × σ_LT²)
```

Where:
- LT_avg = average lead time in periods
- σ_LT = standard deviation of lead time in periods
- d_avg = average demand per period

**Practical note:** Many planners underestimate lead time variability because they
measure "vendor ship date to DC receipt" without accounting for receiving delays,
quality holds, or weekend/holiday dead time. Measure lead time from PO release to
"available to sell" — this is the operationally relevant metric.

### 2.3 Safety Stock with Review Period

For periodic review systems (review every R periods):

```
SS = Z × σ_d × √(LT + R)
```

The review period adds exposure time — between reviews, you cannot react to demand
changes. Weekly review (R=1) on a 2-week lead time item needs safety stock for √3 weeks.
Monthly review (R=4) on the same item needs safety stock for √6 weeks — 41% more.

### 2.4 Safety Stock for Intermittent Demand

Normal-distribution formulas fail when demand has many zero periods. Use empirical
(bootstrapped) safety stock instead:

1. Collect the last 52 periods of demand data (include zeros).
2. Generate 10,000 bootstrap samples of length (LT + R) by random sampling with
   replacement from the historical demand.
3. Compute the sum of each bootstrap sample (= simulated demand during lead time + review).
4. The safety stock is the (service level)th percentile of the simulated demand totals
   minus the mean simulated demand total.

**Example:** For 95% service level, safety stock = P95 of bootstrap demand — mean of
bootstrap demand. This captures the skewed, zero-inflated distribution that parametric
formulas miss.

### 2.5 Safety Stock for New Products (No History)

When an item has < 8 weeks of own demand history:

1. Identify 3–5 analogous items matching on: category, price point (±20%), brand tier
   (national/private label), pack size, and target demographic.
2. Compute the average σ_d and CV across the analogs.
3. Apply a "new product uncertainty premium" of 1.25× to the analog σ_d.
4. Use the standard formula with the inflated σ_d: `SS = Z × (1.25 × σ_d_analog) × √(LT + R)`.
5. Every 2 weeks, blend own-history σ_d with the analog σ_d. By week 8, use 70% own history
   and 30% analog. By week 12, use 100% own history.

### 2.6 Safety Stock Cost-Optimization

The naive approach is to set a service level target and compute SS. The sophisticated
approach is to optimize the tradeoff between holding cost and stockout cost:

```
Optimal SL = 1 − (H / (H + S × D/Q))
```

Where:
- H = holding cost per unit per period
- S = stockout cost per unit (lost margin + customer goodwill + substitution cost)
- D = demand per period
- Q = order quantity

For most retailers, stockout cost on A-items is 3–5× the unit margin (including lost
customer visits and substitution effects), which pushes optimal SL to 96–98%.
For C-items, stockout cost is approximately equal to the unit margin, yielding optimal
SL of 88–92%.

---

## 3. Promotional Planning Frameworks

### 3.1 Promotional Lift Estimation Methodology

Promotional lift is always computed relative to the baseline forecast (the forecast that
would have been generated without the promotion). Contaminating the baseline with
promotional history is the #1 source of systematic forecast error in retail.

#### Step 1 — Establish Clean Baseline

Strip promotional periods from the demand history before fitting the baseline model.
Flag weeks as "promotional" if any of the following were active:
- Temporary price reduction (TPR) > 5% off regular price
- Feature in circular, digital ad, or endcap display
- BOGO or multi-buy offer
- Cross-promotion in another category

After stripping, interpolate the gaps using the forecast model fitted to non-promotional
periods. This creates a "what would have sold at regular price" baseline.

#### Step 2 — Compute Historical Lifts

For each historical promotional event on this SKU:

```
Lift Ratio = Actual Promo-Period Sales / Baseline Forecast for Promo Period
```

A lift ratio of 2.5 means the promotion drove 2.5× baseline volume (150% incremental).

Organize lift ratios by promotional mechanism:

| Mechanism | Typical Lift Range | Key Drivers |
|---|---|---|
| TPR only (5–15% off) | 1.15–1.40 | Depth of discount, category elasticity |
| TPR (15–30% off) | 1.40–2.00 | Deeper discount creates sharper response |
| TPR + display | 1.80–2.50 | Display location (endcap > wing > inline) |
| TPR + circular feature | 2.00–3.00 | Circular reach and placement (front page > interior) |
| TPR + display + circular | 2.50–4.00 | Full support — this is the "A-level" promo |
| BOGO | 2.50–5.00 | Perceived value drives high response but heavy forward-buy |
| Doorbuster / loss leader | 3.00–6.00+ | Traffic driver; lift varies wildly by event |

#### Step 3 — Apply Lift to Current Forecast

```
Promo Forecast = Baseline Forecast × Lift Ratio
```

When multiple promotional mechanisms are combined, do NOT multiply individual lifts.
Use the combined-mechanism lift from historical data or the table above. The interaction
effects are sub-additive (display alone = 1.5× and circular alone = 1.8× does not mean
display + circular = 2.7×; it's typically 2.0–2.5×).

#### Step 4 — Model the Post-Promotion Dip

```
Post-Promo Demand = Baseline × (1 − Dip Factor × Decay)
```

Default dip factors by product type:

| Product Type | Dip Factor (% of incremental lift) | Dip Duration | Decay Pattern |
|---|---|---|---|
| **Shelf-stable pantry** | 40–60% | 2–4 weeks | 60/30/10 (Week 1/2/3) |
| **Perishable / refrigerated** | 10–20% | 0–1 week | Immediate recovery |
| **Household consumables** | 30–50% | 2–3 weeks | 50/35/15 |
| **Personal care** | 25–40% | 2–3 weeks | 50/30/20 |
| **Seasonal** | 15–30% | 1–2 weeks | 70/30 |
| **Discretionary / general merch** | 10–25% | 1–2 weeks | 70/30 |

### 3.2 Cannibalization Estimation

When SKU A is promoted, substitutable SKU B loses sales. The cannibalization rate is:

```
Cannibalization Rate = ΔB_down / ΔA_up
```

Where ΔA_up is the incremental lift on A and ΔB_down is the volume loss on B during
the same period.

**Default estimates when no cross-elasticity data exists:**

| Substitutability | Cannibalization Rate | Example |
|---|---|---|
| Direct substitute (same brand, different size) | 25–40% | 12-oz promoted, 16-oz loses |
| Close substitute (different brand, same segment) | 15–25% | National brand promoted, private label loses |
| Moderate substitute (same category, different segment) | 5–15% | Premium promoted, value tier affected |
| Weak substitute (adjacent category) | 0–5% | Chips promoted, crackers slightly affected |

**Important:** Cannibalization is bidirectional across the category. When building the
category-level promotional plan, sum the cannibalization effects across all substitutes
to compute the true category-level lift (which is always less than the item-level lift).

### 3.3 Forward-Buy and Pantry Loading

Deep promotions cause customers to purchase ahead of their consumption schedule.
Forward-buy volume is demand pulled from future periods, not incremental category demand.

**Forward-buy estimation:**

```
Forward-Buy Volume = Incremental Lift × Forward-Buy Factor
```

| Promotional Depth | Product Shelf Life | Forward-Buy Factor |
|---|---|---|
| 10–20% off | < 2 weeks (perishable) | 0.05–0.10 |
| 10–20% off | 2–12 weeks | 0.10–0.20 |
| 10–20% off | > 12 weeks (shelf-stable) | 0.20–0.35 |
| 20–35% off | < 2 weeks | 0.05–0.15 |
| 20–35% off | 2–12 weeks | 0.20–0.35 |
| 20–35% off | > 12 weeks | 0.35–0.50 |
| 35–50% off | < 2 weeks | 0.10–0.20 |
| 35–50% off | 2–12 weeks | 0.30–0.45 |
| 35–50% off | > 12 weeks | 0.50–0.70 |
| BOGO / > 50% | Any | 0.50–0.80 |

The forward-buy factor tells you what fraction of the incremental lift came from
pantry loading rather than true consumption increase. This directly feeds the
post-promo dip calculation — the dip is approximately equal to the forward-buy volume
spread over its consumption period.

### 3.4 Promotional Calendar Planning

When planning the annual promotional calendar, apply these rules:

1. **Minimum inter-promotion gap:** 4 weeks between promotions on the same SKU. Shorter
   gaps train customers to only buy on deal, eroding brand equity and baseline velocity.
2. **Maximum promotional frequency:** 13 weeks per year (25%) for any single SKU.
   Beyond this, the "promotional price" becomes the reference price in consumers' minds.
3. **Seasonal alignment:** Promote seasonal items during the build phase (first 40% of
   the season), not during peak or decline. Promoting at peak wastes money on demand
   that would have occurred anyway. Promoting during decline is a markdown, not a promotion.
4. **Cross-category coordination:** Avoid promoting close substitutes simultaneously.
   Stagger promotions across substitutes by at least 2 weeks to avoid self-cannibalization.
5. **Vendor funding alignment:** Match promotional timing to vendor trade fund availability.
   Many CPG manufacturers operate on calendar quarters — funds not committed by quarter-end
   expire. Plan key promos in weeks 8–12 of each quarter when vendors are motivated to
   spend remaining funds.

---

## 4. ABC/XYZ Segmentation Methodology

### 4.1 ABC Classification (Value)

ABC classification segments SKUs by their financial contribution. The classification
drives differentiated investment in forecasting effort, safety stock, review frequency,
and management attention.

#### Classification Procedure

1. **Select the value metric.** Options in order of preference:
   - Gross margin contribution (best — focuses investment on profit, not revenue)
   - Revenue (acceptable when margin data is unavailable)
   - Unit volume (use only for warehouse space planning, not financial investment)

2. **Compute trailing 52-week value** for each active SKU.

3. **Sort descending** by the value metric.

4. **Compute cumulative % of total value** and classify:

| Class | Cumulative % of Value | Typical % of SKUs | Description |
|---|---|---|---|
| A | 0–80% | 10–20% | High-value items driving the business |
| B | 80–95% | 20–30% | Mid-value items providing assortment breadth |
| C | 95–100% | 50–70% | Long-tail items with minimal individual impact |

5. **Exception overrides:**
   - New items (< 13 weeks) are auto-classified one tier higher than their data suggests
     until they have sufficient history. A new item computing as C is treated as B.
   - Items with contractual obligations (planogram commitment, vendor agreement) are
     classified minimum B regardless of current sales velocity.
   - Items flagged as strategic by merchandising (e.g., traffic drivers, competitive
     price match items) are classified minimum A.

#### Reclassification Schedule

Run ABC reclassification quarterly. Between quarters, items are reclassified only
if they cross a threshold by >50% (e.g., an item must contribute >120% of the A/B
boundary to move from B to A mid-quarter). This prevents oscillation at class boundaries.

### 4.2 XYZ Classification (Predictability)

XYZ classification segments SKUs by demand forecast difficulty. It drives differentiated
forecasting method selection and safety stock strategies.

#### Classification Procedure

1. **Compute de-seasonalized, de-promoted demand** for each SKU over the trailing 52 weeks.
   Remove seasonal indices and promotional lift periods so that the variability metric
   reflects genuine demand uncertainty, not planned variation.

2. **Compute the coefficient of variation (CV):**
   ```
   CV = σ_demand / μ_demand
   ```
   Use the de-seasonalized, de-promoted demand series.

3. **Classify:**

| Class | CV Range | Description | Forecast Difficulty |
|---|---|---|---|
| X | < 0.5 | Highly predictable — demand varies little around its mean | Low — simple methods work well |
| Y | 0.5–1.0 | Moderately predictable — noticeable variability | Medium — requires good models and monitoring |
| Z | > 1.0 | Erratic/lumpy — demand is highly variable or intermittent | High — no model will be highly accurate |

4. **Supplement with ADI (Average Demand Interval):** Items with ADI > 2.0 (meaning
   demand occurs less than every other period) should be classified Z regardless of CV,
   because the intermittency itself creates forecast difficulty that CV alone doesn't capture.

### 4.3 Combined ABC/XYZ Policy Matrix

| Segment | Forecast Method | Safety Stock | Review Frequency | Replenishment | Management Attention |
|---|---|---|---|---|---|
| **AX** | Exponential smoothing (automated) | Z = 1.96 (97.5%) | Weekly | Automated with exception alerts | Monthly review |
| **AY** | Holt-Winters or causal model | Z = 1.65 (95%) | Weekly | Automated with planner review | Bi-weekly review |
| **AZ** | Ensemble or manual override | Z = 1.41–1.65 (92–95%) | Weekly | Planner-managed; never fully automated | Weekly review |
| **BX** | Moving average (automated) | Z = 1.65 (95%) | Bi-weekly | Automated | Monthly review |
| **BY** | Exponential smoothing (automated) | Z = 1.65 (95%) | Bi-weekly | Automated with exception alerts | Monthly review |
| **BZ** | Croston's or damped trend | Z = 1.28 (90%) | Bi-weekly | Semi-automated with planner approval | Monthly review |
| **CX** | Simple moving average | Z = 1.28 (90%) | Monthly | Automated | Quarterly review |
| **CY** | Simple moving average | Z = 1.28 (90%) | Monthly | Automated | Quarterly review |
| **CZ** | Croston's or none | Z = 1.04 (85%) | Monthly | Manual or min/max | Quarterly — discontinuation candidate |

### 4.4 Migration Tracking

Track SKU movement between segments quarterly. Key migration patterns to monitor:

| Migration | Signal | Action |
|---|---|---|
| A → B | Revenue or margin declining | Investigate: is this category shrinkage, competitive loss, or assortment issue? |
| B → A | Revenue or margin growing | Upgrade forecasting method and review frequency. Validate safety stock. |
| X → Y or Z | Demand becoming less predictable | Check for demand pattern regime change. Review forecast model fit. Increase safety stock. |
| Z → X or Y | Demand stabilizing | Possible to simplify forecast model. Review safety stock for reduction. |
| Any → CZ | Low value + erratic | Strong discontinuation candidate. Run slow-mover kill decision. |

---

## 5. Vendor Management Decision Logic

### 5.1 Vendor Tier Classification

Classify vendors into tiers based on annual purchase volume, strategic importance,
and supply risk profile:

| Tier | Criteria | Count (typical) | Review Cadence |
|---|---|---|---|
| **Strategic** | Top 5 by spend, or sole-source for A-items | 3–8 | Monthly scorecards, quarterly business reviews |
| **Preferred** | Top 20 by spend, multiple A/B items | 10–25 | Quarterly scorecards |
| **Approved** | All remaining active vendors | 30–100+ | Annual review |
| **Probationary** | Vendors under corrective action | Variable | Weekly monitoring, monthly review |

### 5.2 Vendor Scorecard Metrics

Score each vendor quarterly on a 0–100 scale across these dimensions:

| Dimension | Weight | Metric | Target | Calculation |
|---|---|---|---|---|
| **On-time delivery** | 30% | % of POs delivered within the agreed window (±1 day) | > 95% | Score = (Actual % / 95%) × 100, cap at 100 |
| **Fill rate** | 25% | % of ordered units actually shipped | > 97% | Score = (Actual % / 97%) × 100, cap at 100 |
| **Lead time consistency** | 20% | CV of actual lead time vs. stated lead time | CV < 0.15 | Score = max(0, 100 − (CV − 0.15) × 500) |
| **Quality** | 15% | % of received units passing QC inspection | > 99% | Score = (Actual % / 99%) × 100, cap at 100 |
| **Responsiveness** | 10% | Average response time to inquiries/issues (hours) | < 24 hours | Score = max(0, 100 − (Avg Hours − 24) × 2) |

**Composite score thresholds:**

| Score Range | Rating | Action |
|---|---|---|
| 90–100 | Excellent | Consider for volume increase, preferred terms |
| 75–89 | Good | Standard operations, no action needed |
| 60–74 | Needs Improvement | Issue corrective action request; 90-day improvement plan |
| < 60 | Unacceptable | Immediate escalation; begin qualifying alternative suppliers |

### 5.3 Vendor Lead Time Management

Lead time management is the demand planner's most underleveraged tool for reducing
inventory investment. A 1-day reduction in lead time across all vendors can reduce
aggregate safety stock by 5–8%.

**Lead time decomposition:**

| Component | Typical Range | Planner Influence |
|---|---|---|
| Order processing at vendor | 1–3 days | Low — vendor's internal process |
| Production/picking | 2–10 days | Medium — negotiate priority tiers |
| Vendor ship preparation | 1–2 days | Low |
| Transit time | 1–14 days | Medium — carrier selection, mode choice |
| Receiving and put-away | 1–3 days | High — internal process improvement |
| Quality hold (if applicable) | 0–5 days | High — streamline QC process |

**Actions to reduce lead time:**

1. For strategic vendors: negotiate VMI (vendor-managed inventory) where the vendor
   monitors your inventory and ships proactively. Eliminates order processing delay.
2. For all vendors: provide rolling 8-week forecasts to allow pre-positioning. Reduces
   production/picking time on non-stock items.
3. Internally: invest in receiving automation (ASN-enabled receiving, barcode scanning)
   to cut receiving from 2–3 days to same-day.
4. Negotiate consolidated weekly shipments vs. per-PO shipments to reduce transit
   frequency while maintaining fill rate.

### 5.4 MOQ (Minimum Order Quantity) Negotiation Framework

When a vendor's MOQ creates excess inventory, evaluate these options in order:

| Option | When to Use | Expected Outcome |
|---|---|---|
| **Negotiate lower MOQ** | Annual spend > $50K with this vendor; you have leverage | MOQ reduced 20–40% |
| **Consolidate with other SKUs** | Multiple SKUs from same vendor; dollar minimum instead of unit minimum | Meet dollar MOQ without over-ordering individual SKUs |
| **Accept higher price for lower MOQ** | MOQ overage cost > price premium cost | Pay 3–8% more per unit but order only what you need |
| **Negotiate consignment** | Slow-moving items from strategic vendors | Vendor owns inventory until you sell it |
| **Split orders with another buyer** | Known network of retailers ordering from the same vendor | Share the MOQ and split the shipment |
| **Accept the overage** | Holding cost for the excess is < $500 and item is non-perishable | Order the MOQ and treat the overage as forward inventory |

### 5.5 Vendor Negotiation for Lead Time Reduction

**Preparation checklist before negotiating:**

1. Document your current order volume and growth trajectory with this vendor.
2. Compute the cost of their current lead time to your business: excess safety stock
   carrying cost + stockout cost from lead time variability.
3. Identify what you can offer in return: longer-term commitments, higher volumes,
   fewer order frequency changes, rolling forecasts.
4. Know your BATNA (best alternative): have a qualified secondary supplier identified.

**Negotiation structure:**

1. Present the data: "Over the past 6 months, your average lead time has been X days
   with a standard deviation of Y. This variability costs us $Z annually in excess
   safety stock."
2. Propose the target: "We're requesting a committed lead time of X−2 days with a
   guarantee of CV < 0.15."
3. Offer the exchange: "In return, we can commit to rolling 8-week forecasts updated
   weekly, and we'll consolidate to 2 orders per week instead of daily."
4. Set the timeline: "Let's implement this for Q2 and review the scorecard at the
   end of Q2 QBR."

---

## 6. Seasonal Buy and Markdown Timing Models

### 6.1 Seasonal Buy Planning

Seasonal categories require forward commitments because lead times exceed the selling
season. The buy decision has two components: the initial buy (pre-season) and the
in-season reorder (if the vendor supports it).

#### Initial Buy Calculation

```
Initial Buy = Season Forecast × Initial Commitment % − Carry-Over Inventory
```

| Category Risk Profile | Initial Commitment % | Reserve for Reorder | Rationale |
|---|---|---|---|
| Low risk (staple seasonal, proven seller) | 70–80% | 20–30% | High confidence in forecast; reorder available |
| Medium risk (trend-influenced, moderate history) | 55–65% | 35–45% | Hedge against forecast error |
| High risk (fashion, new trend, first season) | 40–50% | 50–60% | Maximize flexibility; accept possible stockout |
| One-time buy (import, long lead, no reorder) | 100% | 0% | No reorder option; commit fully but forecast conservatively |

#### In-Season Reorder Triggers

Monitor sell-through rate weekly starting from week 2 of the season:

```
Sell-Through Rate = Units Sold / (Units Sold + Units On-Hand + Units On-Order)
```

| Weeks into Season | Sell-Through vs. Plan | Action |
|---|---|---|
| Weeks 1–2 | > 120% of plan | Issue reorder immediately for 50% of reserve allocation |
| Weeks 1–2 | 80–120% of plan | Hold; too early to confirm trend |
| Weeks 3–4 | > 110% of plan | Issue reorder for remaining reserve |
| Weeks 3–4 | 90–110% of plan | Issue conservative reorder (25% of reserve) |
| Weeks 3–4 | 70–89% of plan | Hold all reserve; prepare markdown contingency |
| Weeks 3–4 | < 70% of plan | Cancel any open reorders; initiate early markdown |
| Weeks 5+ | Any pace | Reorders unlikely to arrive in time; manage with markdowns |

### 6.2 Markdown Timing and Depth Model

The markdown decision balances margin recovery against sell-through velocity. Every
week of delay costs margin because holding costs accrue and the remaining selling
window shrinks.

#### Markdown Decision Matrix

| Weeks Remaining in Season | Weeks of Supply at Current Rate | Recommended Action |
|---|---|---|
| > 6 weeks | < 3 | No markdown; possible reorder |
| > 6 weeks | 3–6 | Hold price; monitor weekly |
| > 6 weeks | 7–10 | First markdown: 20–25% off |
| > 6 weeks | > 10 | Aggressive markdown: 30–40% off |
| 4–6 weeks | < 3 | No markdown needed |
| 4–6 weeks | 3–6 | Consider 15–20% markdown |
| 4–6 weeks | 6–10 | Markdown 25–35% |
| 4–6 weeks | > 10 | Markdown 40–50%; explore liquidation |
| 2–4 weeks | < 3 | No markdown |
| 2–4 weeks | 3–6 | Markdown 30–40% |
| 2–4 weeks | > 6 | Markdown 50–60%; liquidation channels |
| < 2 weeks | Any remaining | Final clearance 60–75% off or liquidation |

#### Markdown Velocity Curve

After applying a markdown, monitor the velocity response:

| Markdown Depth | Expected Velocity Increase | If Not Achieved Within 1 Week |
|---|---|---|
| 20% off | 1.5–2.0× | Deepen to 30% |
| 30% off | 2.0–3.0× | Deepen to 40% |
| 40% off | 3.0–4.0× | Deepen to 50% or explore liquidation |
| 50% off | 4.0–6.0× | If still not moving, this is dead stock — liquidate |

### 6.3 Season-End Liquidation Decision

When the selling season is ending and inventory remains:

```
Liquidation Net Recovery = (Liquidation Price × Remaining Units) − Logistics Cost
Hold-to-Next-Season Net = (Expected Sell Price × Sell-Through Estimate) 
                          − Holding Cost − Obsolescence Risk
```

**Liquidation is preferred when:**
- Hold-to-next-season sell-through estimate < 60% (style risk, trend change)
- Holding cost for 9–12 months > 15% of original cost (typical for most retailers)
- Warehouse space is constrained and the space has higher-value alternative use
- The product is trend/fashion and will be visually dated next season

**Holding is preferred when:**
- Product is a classic/carryover style with minimal fashion risk
- Hold-to-next-season sell-through estimate > 80%
- Warehouse space is available at low marginal cost
- Liquidation offers are below variable cost (you'd lose money selling)

---

## 7. New Product Introduction Forecasting

### 7.1 Analogous Item Selection

The quality of a new product forecast depends almost entirely on the quality of the
analogous items selected. Bad analogs produce bad forecasts regardless of the method.

#### Selection Criteria (rank by importance)

| Criterion | Weight | How to Match |
|---|---|---|
| **Category/subcategory** | 25% | Must be same subcategory (e.g., "premium yogurt" not just "dairy") |
| **Price point** | 20% | Within ±20% of the new item's retail price |
| **Brand tier** | 15% | National brand → national brand analog; private label → private label |
| **Pack size / format** | 15% | Similar unit count, size, or weight |
| **Target demographic** | 10% | Same customer segment (value, mainstream, premium) |
| **Launch season** | 10% | Same quarter launch; seasonal patterns differ by quarter |
| **Distribution breadth** | 5% | Similar initial door count (±25%) |

#### Analog Scoring

Score each candidate analog on the criteria above (1–5 scale per criterion, weighted).
Select the top 3–5 analogs with composite scores > 3.5. If no analogs score > 3.0, the
new product is truly novel — use category average with a 40% confidence band.

### 7.2 New Product Lifecycle Curve

Most new products follow a lifecycle curve with four phases:

| Phase | Duration | Demand Pattern | Description |
|---|---|---|---|
| **Introduction** | Weeks 1–4 | Ramp-up, often trial-driven | Initial customer trial. Demand is unpredictable. |
| **Growth** | Weeks 5–12 | Accelerating, repeat purchases begin | Repeat buyers emerge. Demand becomes more predictable. |
| **Stabilization** | Weeks 13–26 | Plateaus to steady state | Item finds its "run rate." Baseline forecast is reliable. |
| **Maturity** | Weeks 27+ | Stable or slowly declining | Standard demand planning applies. |

**Forecast by phase:**

| Phase | Method | Confidence Band |
|---|---|---|
| Introduction (1–4 weeks) | Analog average × 1.1 (trial bump) | ±40–50% |
| Growth (5–12 weeks) | Blend: 40% analog + 60% own trajectory | ±25–35% |
| Stabilization (13–26 weeks) | 80% own history, 20% analog | ±15–25% |
| Maturity (27+ weeks) | Standard method selection per demand pattern | Standard WMAPE target |

### 7.3 New Product Safety Stock Protocol

| Weeks of History | Safety Stock Approach | Uncertainty Premium |
|---|---|---|
| 0–4 | Analog σ_d with 30% premium | 1.30× |
| 5–8 | Blended σ_d (50% own + 50% analog) with 20% premium | 1.20× |
| 9–12 | Blended σ_d (75% own + 25% analog) with 10% premium | 1.10× |
| 13+ | Own σ_d, standard formula | 1.00× |

### 7.4 New Product Kill Decision

Not every new product succeeds. The kill decision should be structured, not emotional:

| Metric | Kill Threshold | Timeframe |
|---|---|---|
| Sell-through vs. analog-based plan | < 30% of plan | After 6 weeks |
| Repeat purchase rate (if measurable) | < 10% of trial purchasers | After 8 weeks |
| Velocity trend | Declining for 4 consecutive weeks after introduction | After 6 weeks |
| Category manager assessment | "Would not re-buy" | After 8 weeks |

When a kill decision is made:
1. Cancel all open POs immediately.
2. Halt any planned promotions.
3. Mark down remaining inventory at 30% off for 3 weeks, then 50% for 2 weeks.
4. Liquidate any remainder after 5 weeks.
5. Document the post-mortem: why did the analog-based forecast fail? Was it the
   analogs, the product, the pricing, or the competitive context?

---

## 8. Demand Sensing and Exception Management

### 8.1 Real-Time Demand Signal Monitoring

In addition to periodic forecast reviews, monitor for demand signals that require
immediate attention between forecast cycles:

| Signal | Detection Method | Threshold | Action |
|---|---|---|---|
| **POS velocity spike** | Daily POS > 3× trailing 4-week daily average | 3× for 2+ consecutive days | Investigate cause; manual override if sustained |
| **POS velocity drop** | Daily POS < 0.3× trailing 4-week daily average | 0.3× for 3+ consecutive days | Check for phantom inventory, display removal, or competitive action |
| **Stockout cascade** | 3+ locations out of stock on same SKU within 48 hours | 3 locations | Emergency replenishment from DC; allocate by sales velocity |
| **Weather alert** | NWS severe weather warning for region covering > 10% of stores | Forecast impact > 5% of category volume | Adjust forecasts for weather-sensitive categories |
| **Competitive price move** | Competitor price check shows > 15% lower on comparable SKU | Confirmed at 3+ competitor locations | Alert merchandising; prepare forecast downward revision |
| **Social media spike** | Monitoring tool shows > 500% increase in brand/product mentions | Sustained > 24 hours | Assess virality risk; prepare allocation plan |

### 8.2 Forecast Override Governance

Manual overrides are necessary but dangerous. Ungoverned overrides introduce bias and
degrade forecast accuracy over time.

**Override rules:**

1. **All overrides must be documented** with a reason code and quantitative justification.
2. **Override authority by magnitude:**
   - ±10%: Planner can override without approval
   - ±10–25%: Requires planning manager approval
   - ±25–50%: Requires director approval
   - > ±50%: Requires VP approval (or planning committee)
3. **Override accuracy tracking:** Every override is tracked against actuals. If a planner's
   overrides have a WMAPE > 40% over a quarter, their override authority is reviewed.
4. **Sunset rule:** Overrides expire after 4 weeks. If the condition persists, a new
   override (with fresh justification) must be created. This prevents stale overrides
   from contaminating forecasts months later.
5. **No "consensus" overrides:** Overrides from demand review meetings where forecasts
   are adjusted to match sales team wishful thinking are the #1 source of positive bias.
   Require every meeting override to cite a specific, verifiable external signal.

---

## 9. Inventory Health Diagnostics

### 9.1 Weeks of Supply Analysis

Weeks of supply (WOS) is the primary pulse-check metric for inventory health. Compute
at the SKU level, aggregate to category, and review weekly.

```
WOS = On-Hand Inventory (units) / Average Weekly Demand (units)
```

Use the forward-looking forecast for the denominator, not trailing sales. Trailing sales
understates demand when items have been out of stock (you can't sell what you don't have).

**WOS Health Bands:**

| WOS Range | Status | Action |
|---|---|---|
| < 2 weeks | Critical low | Expedite replenishment; consider reallocation from low-velocity locations |
| 2–3 weeks | Low | Verify next PO arrival; place emergency order if no PO in transit |
| 4–8 weeks | Healthy | Standard operations |
| 9–12 weeks | Elevated | Review forecast; defer or reduce next PO if demand hasn't increased |
| 13–26 weeks | Excess | Initiate markdown or promotional sell-through plan |
| > 26 weeks | Critical excess | Flag for slow-mover kill decision; markdown or liquidate |

### 9.2 Inventory Turns and GMROI

**Inventory Turns:**
```
Annual Turns = Annual COGS / Average Inventory at Cost
```

| Category Type | Target Turns | Benchmark |
|---|---|---|
| Perishable grocery | 30–52 | 1× per week |
| Center-store grocery | 12–20 | Every 2–4 weeks |
| General merchandise | 6–12 | Every 4–8 weeks |
| Seasonal (in-season) | 8–15 | Sell through in-season |
| Seasonal (annual) | 2–4 | Lower because of off-season zero sales |

**GMROI (Gross Margin Return on Inventory Investment):**
```
GMROI = Gross Margin $ / Average Inventory at Cost
```

A GMROI of 2.0 means you earn $2 in gross margin for every $1 invested in inventory.
Minimum acceptable GMROI varies by category but should generally exceed the company's
cost of capital divided by the gross margin percentage. For a retailer with 8% cost of
capital and 35% gross margin, minimum GMROI = 0.08 / 0.35 = 0.23. In practice, most
retailers target GMROI > 1.5 for healthy categories.

### 9.3 Dead Stock and Obsolescence Identification

Dead stock is inventory with zero sales for a defined period. It is the most expensive
form of excess inventory because it generates zero return while consuming warehouse space
and working capital.

**Dead stock tiers:**

| Tier | Definition | Action | Timeline |
|---|---|---|---|
| Aging | Zero sales for 8–12 weeks | Review — is this seasonal? New? Misplaced? | Investigate within 1 week |
| Dead | Zero sales for 13–26 weeks | Markdown 40–50% or move to clearance | Initiate within 2 weeks |
| Obsolete | Zero sales for > 26 weeks | Liquidate at any positive recovery or donate | Execute within 4 weeks |
| Write-off | Liquidation/donation uneconomical | Destroy and write off; recover warehouse space | Execute within 2 weeks |

**Root cause analysis for dead stock:**

Run quarterly. Categorize dead stock by root cause to prevent recurrence:

| Root Cause | % of Dead Stock (typical) | Prevention |
|---|---|---|
| Over-buying (forecast too high) | 35–45% | Improve forecast accuracy; tighten override governance |
| Product failure (quality, customer rejection) | 15–20% | Faster new product kill decisions |
| Seasonal carryover (missed markdown window) | 15–25% | Enforce markdown timing model from §6.2 |
| Assortment change (delisted but not sold through) | 10–15% | Coordinate delist timing with sell-through |
| Phantom inventory (system says it exists but doesn't) | 5–10% | Regular cycle counts on zero-velocity items |

### 9.4 Allocation Logic for Multi-Location Retailers

When DC inventory is insufficient to fill all store-level demand, allocate using a
priority framework rather than pro-rata distribution:

**Priority 1: Prevent store stockout on A-items.**
Allocate first to stores with < 3 days of supply on A-items. Quantity = minimum of
(days-to-next-DC-shipment × daily demand) to bridge until the next allocation cycle.

**Priority 2: Match allocation to store-level forecast.**
For remaining inventory, allocate proportional to each store's forward weekly forecast
(not historical sales, which penalizes stores that have been out of stock).

**Priority 3: Minimum presentation stock.**
Every store receives at least the minimum display quantity regardless of forecast. An
empty shelf signals "this item is discontinued" to the customer and destroys demand.

**Priority 4: Cap allocation to shelf capacity.**
Do not send more than a store can merchandise. Excess units in the backroom create
shrinkage, damage, and out-of-date risk (for perishables).

**Allocation frequency:**
- A-items: allocate with every DC-to-store shipment (typically 2–5× per week)
- B-items: allocate 1–2× per week
- C-items: allocate weekly or bi-weekly
