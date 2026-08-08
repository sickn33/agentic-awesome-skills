# Decision Frameworks — Energy Procurement

This reference provides detailed decision trees, evaluation matrices, financial models,
and strategic frameworks for electricity and gas procurement, tariff optimization,
demand charge management, PPA evaluation, hedging strategy design, and multi-facility
portfolio optimization. It is loaded on demand when the agent needs to make or
recommend nuanced energy procurement decisions.

All thresholds, price assumptions, and market benchmarks reflect US commercial and
industrial electricity and natural gas markets. Adjust for regional markets, current
forward curves, and facility-specific tariff structures.

---

## 1. Procurement Strategy Selection

### 1.1 Pre-Procurement Intelligence Gathering

Before entering any procurement decision — contract renewal, new facility onboarding,
or mid-term restructuring — assemble a comprehensive data package.

#### Data Assembly Checklist

| Data Point | Source | Purpose |
|-----------|--------|---------|
| 36 months of 15-minute interval data (kWh and kW) | Utility meter data / MDM system | Load shape analysis, peak identification |
| Current tariff rate schedule and all applicable riders | Utility tariff book / state PUC | Baseline cost structure |
| Current supply contract terms, expiration, and auto-renewal provisions | Contract file | Timeline and constraints |
| Forward energy curves (12, 24, 36 month) for relevant hub | ICE, CME, broker quotes | Market benchmark for pricing evaluation |
| Capacity market auction results (PJM RPM, ISO-NE FCA) | ISO publications | Future capacity charge forecasting |
| Facility peak load contribution (PLC) or installed capacity (ICAP) tag | Utility / ISO settlement data | Capacity charge exposure |
| Historical weather data (HDD/CDD) for facility locations | NOAA / weather service | Weather-normalization of consumption |
| Pending utility rate cases at state PUC | State PUC docket search | Regulatory risk assessment |
| Corporate sustainability targets and timeline | Sustainability team | Renewable procurement requirements |
| Capital budget availability for demand-side investments | Finance team | Investment constraint for demand charge mitigation |

### 1.2 Fixed vs. Index vs. Block-and-Index Decision Tree

Use this decision tree for each facility or portfolio segment independently — one
strategy does not fit all sites.

```
START: What is the organization's tolerance for energy cost variance?

├── Budget variance >10% triggers executive escalation
│   ├── Contract tenor ≤ 24 months?
│   │   └── YES → Fixed-price full requirements
│   │       - Accept the risk premium (5-12% above forward curve)
│   │       - Negotiate volume tolerance band (±10-15%)
│   │       - Ensure contract includes change-of-use provisions
│   │   └── NO (>24 months) → Fixed-price with annual price resets
│   │       - Lock year 1 at fixed, years 2-3 at a formula (forward + adder)
│   │       - This limits the supplier's long-term risk premium
│
├── Budget variance of 5-10% is manageable
│   ├── Facility load factor > 0.70?
│   │   └── YES → Block-and-index
│   │       - Buy fixed blocks = 70-80% of baseload
│   │       - Float remaining 20-30% at index (day-ahead or real-time)
│   │       - Shape blocks to match base load pattern (ATC vs. on-peak only)
│   │   └── NO (load factor < 0.70) → Shaped block-and-index
│   │       - Buy on-peak blocks only (match production schedule)
│   │       - Float off-peak and shoulder at index
│   │       - Supplement with TOU-indexed product for off-peak
│
├── Organization can tolerate >15% variance (energy is <5% of COGS)
│   ├── Internal capability to monitor wholesale markets?
│   │   └── YES → Index pricing with financial hedges
│   │       - Base product: real-time or day-ahead index + supplier adder
│   │       - Layer financial hedges: buy call options for peak months
│   │       - Set a price ceiling through options ($X/MWh cap)
│   │   └── NO → Index with a price cap product
│   │       - Supplier provides index pricing with a contractual ceiling
│   │       - Cap premium is typically $3-7/MWh above forward curve
│   │       - Simpler than managing separate financial hedges
```

### 1.3 Layered Procurement Methodology

Layering eliminates single-point market timing risk. The methodology:

**Step 1: Determine the hedging horizon.**
Most C&I buyers layer 18–36 months ahead of the delivery period. For a January 2028
start date, begin buying tranches in July 2026.

**Step 2: Set the number of tranches.**
Standard approaches:

| Tranches | Buying Frequency | Volume per Tranche | Best For |
|----------|-----------------|-------------------|----------|
| 4 | Quarterly | 25% | Default approach, good balance |
| 6 | Bimonthly | ~17% | Large portfolios, higher granularity |
| 8 | Monthly (final 8 months) | 12.5% | Aggressive dollar-cost averaging |
| 12 | Monthly | ~8% | Very large portfolios with dedicated procurement staff |

**Step 3: Execution rules.**
- Execute each tranche at the prevailing market price on the scheduled date — do not try to time within the tranche window.
- Exception: if the forward curve drops into the bottom 20th percentile of the 5-year range, accelerate by buying 2 tranches immediately ("buy the dip" rule).
- Exception: if the forward curve spikes into the top 20th percentile, defer the current tranche by 30 days (skip and catch up later).
- Never defer more than 2 consecutive tranches — rolling deferrals leave you unhedged.

**Step 4: Document and report.**
Maintain a procurement log showing: tranche date, volume procured, price locked,
forward curve price at execution, cumulative weighted average price, and remaining
open position. Report to finance quarterly.

**Example — 10 MW peak load, 60M kWh annual consumption:**

```
Delivery year: 2028
Hedging start: July 2026
Tranches: 6 (bimonthly, ~10M kWh each)

Tranche 1 (Jul 2026): 10M kWh @ $44.50/MWh  — Forward was $45.20
Tranche 2 (Sep 2026): 10M kWh @ $42.80/MWh  — Forward was $43.10
Tranche 3 (Nov 2026): 10M kWh @ $46.30/MWh  — Forward was $46.30
Tranche 4 (Jan 2027): 10M kWh @ $41.20/MWh  — Forward was $41.50 (buy-the-dip rule: 
                                                 also executed Tranche 5 early)
Tranche 5 (Jan 2027): 10M kWh @ $41.40/MWh  — Accelerated from March
Tranche 6 (May 2027): 10M kWh @ $43.80/MWh  — Forward was $44.00

Weighted average: $43.33/MWh
Range of execution prices: $41.20 - $46.30 ($5.10 spread)
If locked all-at-once in Jul 2026: $44.50/MWh → layering saved $1.17/MWh = $70,200
```

### 1.4 RFP Process for Deregulated Markets

#### Timeline and Phases

| Phase | Duration | Key Activities |
|-------|----------|---------------|
| Pre-RFP Analysis | 2-3 weeks | Load data assembly, tariff analysis, market benchmarking, sustainability requirements definition |
| RFP Design | 1-2 weeks | Template creation, supplier longlist development, evaluation criteria weighting |
| RFP Distribution | 1 week | Issue to 5-8 qualified REPs, respond to clarification questions |
| Bid Window | 2-3 weeks | Suppliers develop pricing based on your interval data and requirements |
| Bid Evaluation | 1-2 weeks | Total cost modeling, credit assessment, contract review |
| Negotiation | 1-2 weeks | Shortlist to 2-3, negotiate terms, finalize pricing |
| Award and Execution | 1 week | Sign contract, notify utility of supplier switch (may require 30-60 day lead time) |
| **Total** | **9-14 weeks** | |

#### Supplier Evaluation Scoring Matrix

| Criterion | Weight | Scoring Guide |
|-----------|--------|---------------|
| Total cost (energy + adder + shaped premium) | 35-45% | Lowest total cost = 100 pts. Each 1% above lowest = -5 pts. Model across 3 price scenarios. |
| Credit quality | 15-20% | Investment grade (S&P BBB- or above) = 100 pts. Sub-investment grade = 50 pts. No rating / private = 70 pts with parent guarantee, 30 pts without. |
| Contract flexibility | 10-15% | Volume tolerance ±15% = 100. Volume tolerance ±5% = 50. No tolerance = 0. Early termination available = +20 pts. Change-of-use provisions = +15 pts. |
| Sustainability services | 10-15% | Bundled RECs from named projects = 100. Unbundled RECs available = 60. No REC options = 0. Carbon reporting support = +20 pts. |
| Market intelligence and advisory | 5-10% | Dedicated account manager + regular market updates = 100. Account manager only = 50. Call center support = 0. |
| Operational capability | 5-10% | EDI/API billing integration = 100. Electronic invoicing only = 60. Paper billing = 0. Multi-site consolidated billing = +20 pts. |

#### Bid Comparison Template

For each site, model the annual cost under each supplier's proposal:

```
Annual Cost = Σ(hourly volume × hourly price) + fixed charges + REC costs + adder fees

Where hourly price depends on product structure:
  Fixed: contract rate for all hours
  Block-and-index: block rate for block volume + index price for excess
  Index: (day-ahead or real-time LMP at load zone) + supplier adder
```

Always model at three forward price scenarios: base case (current forward curve),
low case (forward - 20%), and high case (forward + 30%). A supplier whose index
product looks cheapest at base case may be the most expensive at high case.

---

## 2. PPA Evaluation Framework

### 2.1 Physical PPA Evaluation

Physical PPAs involve direct energy delivery and are appropriate when:
- Your load is in the same ISO as the project
- You want both energy and RECs from a specific named facility
- You can manage the operational complexity of scheduling and balancing

#### Financial Modeling Framework

**Step 1: Establish the baseline (no-PPA scenario).**
Project your energy costs over the PPA term using forward curves for years 1-5 and
a long-term price escalation assumption (typically 2-3%/year) for years 6+.

**Step 2: Model PPA cash flows.**

```
Year N PPA Net Value = (Market Price at Hub - PPA Strike Price) × Expected Generation
                     - Basis Cost (Hub to Load Zone)
                     - Curtailment Cost (expected curtailed MWh × strike price)
                     - Balancing Costs (firming residual load not covered by PPA)
                     + REC Value (if RECs would otherwise be purchased separately)
```

**Step 3: Sensitivity analysis — run these scenarios at minimum:**

| Scenario | Market Price Assumption | Generation Assumption | Basis Assumption |
|----------|----------------------|----------------------|-----------------|
| Base | Current forward curve + 2.5%/yr escalation | Developer's P50 estimate | 5-year historical average basis |
| Bull | Forward + 4%/yr escalation | P50 generation | Basis narrows 20% |
| Bear | Forward + 1%/yr escalation | P75 generation (lower) | Basis widens 30% |
| Stress | Flat prices for 5 years, then 2%/yr | P90 generation (much lower) | Basis widens 50% |

**Step 4: Calculate NPV, IRR, and levelized cost of energy (LCOE) under each scenario.**
A PPA is economically justified if NPV is positive under base and bull cases and
the loss under bear case is tolerable (typically <$2M cumulative over the PPA term
for a mid-size C&I buyer).

### 2.2 Virtual PPA (VPPA) Evaluation

VPPAs are financial instruments — no physical energy delivery. The key risks differ:

#### Basis Risk Analysis

Basis risk is the primary financial risk in a VPPA. It arises because the generator
settles at its node price and your load settles at your load zone price.

**Quantification method:**

1. Obtain 3-5 years of hourly LMP data for the generator's node and your load zone from the ISO.
2. Calculate the hourly basis: Load Zone LMP - Generator Node LMP.
3. Filter to hours when the generator would be producing (solar: daylight hours; wind: use historical generation profile).
4. Calculate the generation-weighted average basis.
5. Model the basis impact on PPA settlement:

```
Annual Basis Cost = Σ(hourly basis × hourly expected generation)

If generation-weighted average basis = $5/MWh and annual generation = 200,000 MWh:
Annual Basis Cost = $1,000,000/year
Over a 15-year PPA: $15M in basis costs (undiscounted)
```

**Red flags for basis risk:**
- Basis spread > $8/MWh generation-weighted average → high risk, negotiate basis hedge or reject
- Basis volatility (standard deviation) > $15/MWh → unpredictable, hard to budget
- Basis trend is widening over the historical period → structural congestion, likely to worsen
- Generator is located behind a known transmission constraint → congestion will increase as more generation is added in that zone

#### Curtailment Risk Analysis

Curtailment occurs when the ISO orders the generator to reduce output due to
transmission constraints or oversupply.

| ISO | Technology | Typical Curtailment % | Trend |
|-----|-----------|----------------------|-------|
| ERCOT | Wind (West Texas) | 3-8% | Increasing as more wind is added |
| ERCOT | Solar | 1-3% | Low but increasing |
| CAISO | Solar | 5-12% (spring) | Increasing due to duck curve |
| CAISO | Wind | 1-3% | Stable |
| PJM | Wind | <1% | Minimal |
| PJM | Solar | <1% | Minimal |
| MISO | Wind | 2-5% | Moderate, depends on zone |
| SPP | Wind | 3-7% | Increasing in western zones |

**Contract protection:** Negotiate a curtailment threshold (e.g., first 5% is developer
risk) and a compensation mechanism for excess curtailment (developer provides
replacement RECs or a price adjustment). Never accept "buyer bears all curtailment
risk" on a VPPA — this transfers a risk the buyer cannot manage or influence.

#### Credit and Accounting Requirements

| Requirement | Details |
|-------------|---------|
| ISDA Master Agreement | Required for VPPA. Negotiate credit thresholds, margin call provisions, and termination values. |
| Credit support | Investment grade: typically no collateral for first $5-10M notional. Sub-IG: letter of credit or parent guarantee for 2-3 years of potential negative settlement. |
| Accounting treatment | VPPAs may qualify for hedge accounting (ASC 815) if they meet effectiveness testing requirements. Without hedge accounting, mark-to-market gains/losses flow through the P&L, creating earnings volatility. Consult treasury and accounting early. |
| Board / CFO approval | VPPAs are multi-year financial commitments. Most organizations require board approval for commitments >$10M notional or >10 years. Present as an energy cost management tool, not a speculative position. |

### 2.3 Physical vs. Virtual PPA Decision Matrix

| Factor | Favors Physical PPA | Favors Virtual PPA |
|--------|-------------------|-------------------|
| Load location | Same ISO as available projects | Load in regulated market or no nearby projects |
| Energy supply | Need the physical energy (replacing utility supply) | Already have a retail supply contract |
| Sustainability goal | Want bundled energy + RECs from a specific facility | Need RECs only for Scope 2 reporting |
| Operational capability | Have energy scheduling and balancing resources | No energy trading or scheduling staff |
| Balance sheet | Prefer to avoid financial derivative classification | Comfortable with ISDA and mark-to-market |
| Credit profile | Sub-investment grade (physical may require less credit support) | Investment grade (can post collateral efficiently) |
| Regulatory environment | Deregulated market with retail choice | Regulated market (VPPA may be the only option for additionality) |

---

## 3. Demand Charge Optimization

### 3.1 Load Analysis Methodology

**Step 1: Download 15-minute interval data.**
Request a minimum of 12 months of 15-minute kW demand data from the utility or your
meter data management system. For facilities with sub-metering, obtain interval data
at the system level (HVAC, production, compressed air) in addition to the main meter.

**Step 2: Identify peak demand intervals.**
Sort all 15-minute intervals by kW descending. Focus on the top 50 intervals (the
top 0.15% of all intervals in a year). These intervals drive your demand charges.

**Step 3: Characterize peak drivers.**
For each of the top 50 intervals, identify:
- Date and time of day
- Day of week
- Outdoor temperature (proxy for HVAC load)
- Production schedule (was the line running?)
- Any anomalous events (equipment startup, testing, maintenance)

**Typical findings for manufacturing facilities:**

| Peak Driver | Frequency in Top 50 | Root Cause |
|------------|---------------------|------------|
| Morning ramp-up (6-9 AM) | 30-50% | Simultaneous startup of HVAC, compressors, and production lines |
| Hot afternoon (2-5 PM) | 20-35% | HVAC at max coinciding with production peak |
| Equipment startup after maintenance | 10-20% | Inrush current from large motors starting simultaneously |
| Testing / commissioning | 5-10% | New equipment tested during peak periods |

**Step 4: Calculate the demand charge cost of peak intervals.**

```
Monthly Demand Charge = Peak kW × Demand Rate ($/kW)

If normal operating peak is 4,000 kW and the actual peak is 4,800 kW:
Excess peak cost = (4,800 - 4,000) × $15/kW = $12,000/month

With an 80% ratchet:
Minimum billing demand for next 11 months = 4,800 × 0.80 = 3,840 kW
If normal peak drops to 3,500 kW next month, you're still billed at 3,840 kW
Annual ratchet cost = (3,840 - 3,500) × $15/kW × 11 months = $56,100
```

### 3.2 Peak Shaving ROI Framework

#### Battery Energy Storage System (BESS)

**Sizing methodology:**
1. Determine the target peak reduction (kW to shave).
2. Calculate the required energy capacity: target kW × duration of peak events.
   For demand charge management, 1-2 hours of duration is typically sufficient.
3. Apply round-trip efficiency (88-92% for lithium-ion): size the battery 10% larger
   than the calculated energy requirement.

**Example — 500 kW peak shaving at a manufacturing plant:**

```
Target reduction: 500 kW
Peak event duration: 2 hours (based on interval data analysis)
Battery size: 500 kW / 1,000 kWh (with 10% efficiency buffer: 500 kW / 1,100 kWh)

Installed cost (2025): $800-$1,200/kWh for C&I BESS
Total capital: $880,000-$1,320,000 (using 1,100 kWh at midpoint $1,000/kWh = $1,100,000)

Annual savings stack:
  Demand charge savings: 500 kW × $15/kW × 12 months = $90,000
  Capacity tag reduction: 500 kW × $60/kW-yr (PJM example) = $30,000
  TOU energy arbitrage: charge off-peak ($0.04/kWh), discharge on-peak ($0.08/kWh)
    1,100 kWh × $0.04/kWh spread × 250 days × 90% efficiency = $9,900
  Demand response revenue: 500 kW × $40/kW-yr (PJM Economic DR) = $20,000

Total annual value: $149,900
Simple payback: $1,100,000 / $149,900 = 7.3 years
With ITC (30% for standalone storage as of IRA): payback = $770,000 / $149,900 = 5.1 years
```

**Decision thresholds:**
- Payback < 5 years (with stacked value + incentives): strong economic case, proceed
- Payback 5-7 years: viable if aligned with sustainability goals or if demand charges are rising
- Payback 7-10 years: marginal, requires additional strategic justification
- Payback > 10 years: economics don't support investment without regulatory mandate

#### Demand Response Program Evaluation

Not all DR programs are equal. Evaluate on these dimensions:

| Dimension | Questions to Answer |
|-----------|-------------------|
| Revenue certainty | Is payment capacity-based (guaranteed $/kW-yr) or performance-based (paid per curtailment event)? |
| Dispatch frequency | How many events per year? What is the maximum duration? Can you sustain curtailment for the full duration? |
| Baseline methodology | How is your curtailment measured? Customer Baseline Load (CBL) using 10-of-10 or adjusted methods? A poorly calculated baseline can understate your curtailment and reduce payments. |
| Penalty for non-performance | What happens if you can't curtail during an event? Some programs impose penalties 2-3× the capacity payment. |
| Interaction with other programs | Does DR enrollment affect your capacity tag calculation? Does it conflict with your behind-the-meter generation? |
| Operational impact | Can your facility actually curtail the committed kW without affecting production quality, safety, or customer commitments? |

### 3.3 Staggered Startup Protocol

The single lowest-cost demand charge reduction strategy — no capital required:

**Problem:** Morning startup creates a demand spike when HVAC, compressors, lighting,
and production equipment all energize simultaneously between 5:30-6:30 AM.

**Solution:** Stagger equipment startup over a 60-90 minute window:

```
5:00 AM  — Lighting (50-100 kW)
5:15 AM  — HVAC pre-cooling/heating (500-800 kW, ramps over 30 min)
5:45 AM  — Compressed air system (200-400 kW, staged compressor starts)
6:00 AM  — Production Line 1 (300-500 kW)
6:15 AM  — Production Line 2 (300-500 kW)
6:30 AM  — Auxiliary systems, battery chargers, water heating

Result: Peak during startup drops from 2,200 kW (simultaneous) to 1,600 kW (staggered)
Savings: 600 kW × $15/kW × 12 months = $108,000/year at zero capital cost
```

**Implementation:** Program the building automation system (BAS) to enforce startup
sequencing. Set hard interlocks that prevent the next system from starting until the
prior system has reached steady state.

---

## 4. Market Analysis Framework

### 4.1 Regulated vs. Deregulated Strategy Map

| Your Situation | Primary Strategy | Secondary Strategy |
|---------------|-----------------|-------------------|
| Regulated market, single rate schedule | Demand charge management, on-site generation, tariff schedule optimization | Lobby for utility green tariff, evaluate community solar |
| Regulated market, multiple rate options | Tariff analysis to select optimal schedule (TOU vs. flat vs. demand-based) | Load shifting to exploit TOU differentials |
| Deregulated, single site | Competitive supply procurement (RFP to 5-8 REPs) | Layer procurement to manage timing risk |
| Deregulated, multi-site same ISO | Aggregate sites for portfolio procurement (volume leverage) | Negotiate portfolio-level products (single supplier, blended rate) |
| Deregulated, multi-site multi-ISO | Procure separately by ISO (market structures differ) | Leverage total volume in supplier negotiations even if contracts are separate |
| Mixed regulated/deregulated portfolio | Competitive procurement for deregulated sites; demand management for regulated sites | Seek regulatory pilot programs in regulated territories |

### 4.2 Forward Curve Analysis

**What the forward curve tells you:**
- Market consensus on future energy prices (adjusted for risk premium)
- Seasonal price patterns (summer/winter spreads)
- Year-over-year price trajectory (escalation or decline)

**What the forward curve does NOT tell you:**
- Actual future spot prices (forwards are not forecasts — they include a risk premium)
- Short-term price spikes (forwards are averages, not tails)
- Regulatory changes, plant retirements, or transmission additions not yet priced in

**Using forward curves for procurement decisions:**

| Forward Curve Position | Procurement Action |
|-----------------------|-------------------|
| Bottom 20% of 5-year range | Accelerate buying — lock more volume at favorable prices |
| 20th-40th percentile | Proceed with scheduled layering — prices are reasonable |
| 40th-60th percentile | Maintain default layering schedule |
| 60th-80th percentile | Slow buying — defer non-critical tranches 30 days |
| Top 20% of 5-year range | Defer where possible, increase index exposure, evaluate financial hedges instead of physical locks |

### 4.3 Capacity Market Exposure

In organized capacity markets (PJM, ISO-NE, NYISO), capacity charges are a significant
cost component — $30–$120/kW-yr depending on the zone and auction results.

**PJM Reliability Pricing Model (RPM):**
- Auction held 3 years ahead of delivery year (Base Residual Auction)
- Incremental auctions adjust quantities closer to delivery
- Your capacity obligation is based on your PLC (Peak Load Contribution)
- PLC is set by your metered load during the 5 highest system coincident peak hours (5CP) in the prior delivery year

**Managing capacity exposure:**

1. **Track PJM system peak alerts.** PJM issues "hot weather alerts" and "emergency alerts" when system peaks are expected. Curtail discretionary load during these hours to reduce your PLC for the following year.
2. **Install peak notification systems.** Subscribe to PJM's demand response alerts. Deploy load curtailment controls that can drop 10-20% of facility load within 30 minutes of a peak alert.
3. **Behind-the-meter generation.** Running backup generators during coincident peak hours reduces your metered load and thus your PLC. Ensure generators are permitted for non-emergency operation and emissions-compliant.
4. **Capacity tag trading.** In some markets, capacity obligations can be traded or offset through financial instruments. Your supplier may offer capacity tag management as a service.

**Example — capacity charge impact:**

```
Facility peak: 5,000 kW
PLC (measured during prior year 5CP hours): 4,200 kW
PJM BRA clearing price for your zone: $85/MW-day

Annual capacity charge: 4,200 kW × $85/MW-day × 365 / 1,000 = $130,305/year

If you had curtailed 500 kW during the 5CP hours:
Reduced PLC: 3,700 kW
Annual capacity charge: 3,700 kW × $85/MW-day × 365 / 1,000 = $114,793/year
Savings: $15,512/year from 5 hours of load curtailment
```

---

## 5. Hedging Strategy Design

### 5.1 Hedging Instruments Available to C&I Buyers

| Instrument | Complexity | Capital Required | Protection |
|-----------|-----------|-----------------|------------|
| Fixed-price contract (through REP) | Low | None (embedded in price) | Full price certainty for contracted volume |
| Block purchases (through REP) | Low-Medium | None | Price certainty on base load; variable load exposed |
| Financial swap (through broker/bank) | Medium | ISDA + possible margin | Converts floating price to fixed on specified volume |
| Call option (through broker/bank) | Medium-High | Premium ($/MWh upfront) | Price ceiling at strike + premium; unlimited downside benefit retained |
| Heat rate call option | High | Premium | Protects against gas-to-power price spike (useful when gas drives marginal power price) |
| Collar (sell put, buy call) | Medium-High | Reduced premium (put proceeds offset call cost) | Ceiling and floor — limits both upside and downside |

### 5.2 Hedging Strategy by Risk Profile

| Risk Profile | Hedge Ratio | Instruments | Monitoring |
|-------------|-------------|-------------|-----------|
| Conservative (budget certainty paramount) | 80-95% hedged | Fixed-price contracts, financial swaps | Monthly mark-to-market review |
| Moderate (balanced cost/risk) | 60-80% hedged | Block-and-index, layered procurement | Monthly forward curve review, quarterly hedge adjustment |
| Aggressive (cost minimization focus) | 30-60% hedged | Index with call options for tail risk | Weekly market monitoring, daily during volatility events |
| Speculative (never recommended for C&I) | <30% hedged | Index with no protection | Real-time monitoring (impractical for most C&I buyers) |

### 5.3 Option Pricing and Evaluation

When buying call options to cap index pricing exposure, evaluate:

```
Option value = Max(0, Spot Price - Strike Price) × Volume

Cost: Premium per MWh × Contracted Volume
Annual premium for a $50/MWh cap on day-ahead pricing: $2-5/MWh (varies by market volatility)

Example — protecting 50,000 MWh annual index volume:
  Call option strike: $50/MWh
  Premium: $3/MWh
  Total premium cost: $150,000/year

  If spot averages $42/MWh: option expires worthless, total cost = $42 + $3 = $45/MWh
  If spot averages $65/MWh: option pays $15/MWh, effective cost = $65 - $15 + $3 = $53/MWh
  If spot spikes to $200/MWh (weather event): option pays $150/MWh, effective cap = $53/MWh

  Maximum effective rate: strike + premium = $53/MWh regardless of market price
```

**When to use options vs. fixed contracts:**
- Options when you want to participate in downside moves but protect against spikes
- Fixed contracts when the premium for options exceeds the cost of just locking in a fixed price (this happens when volatility is high and options are expensive)

---

## 6. Sustainability Procurement Alignment

### 6.1 Mapping Procurement to RE100 and SBTi

**RE100 progress calculation:**

```
RE% = (Renewable MWh procured) / (Total electricity consumption MWh) × 100

Acceptable renewable MWh sources (in order of additionality):
1. On-site generation (strongest claim)
2. Physical PPA with new project (strong additionality)
3. Virtual PPA with RECs from new project (good additionality)
4. Utility green tariff (varies by program design)
5. Unbundled RECs (weakest claim — RE100 tightening requirements)
```

**SBTi trajectory alignment:**
- SBTi requires absolute Scope 2 emissions reductions on a defined trajectory (typically 4.2%/year for 1.5°C alignment).
- Lock in long-term renewable procurement (PPAs) that deliver emission reductions year over year.
- Avoid procurement strategies that increase fossil dependence (long-term fixed contracts with fossil-heavy grid mix and no REC component).

### 6.2 Cost-Effective Sustainability Procurement Path

| Target RE% | Least-Cost Strategy |
|-----------|-------------------|
| 0-25% | Unbundled national wind RECs ($1-3/MWh). Cheapest entry point. |
| 25-50% | Utility green tariff + unbundled RECs. Green tariffs are often $0.005-$0.015/kWh premium. |
| 50-75% | VPPA with new wind/solar project. Fixed cost, long-term REC supply, additionality. |
| 75-90% | Physical PPA or additional VPPA to cover remaining gap. On-site solar where feasible. |
| 90-100% | Match remaining unhedged load with project-specific RECs or small on-site installations. The last 10% is the most expensive per MWh. |

---

## 7. Multi-Facility Portfolio Optimization

### 7.1 Portfolio Aggregation Strategy

**When to aggregate:**
- 3+ sites in the same ISO/utility territory
- Total volume > 20 GWh/year (attracts competitive supplier attention)
- Sites have complementary load profiles (some peak summer, others peak winter)

**Aggregation benefits:**
- Volume leverage: 5-15% lower supply pricing than individual site procurement
- Load diversity: combined portfolio has higher load factor than individual sites, reducing supplier risk premium
- Administrative efficiency: single contract, single invoice, single relationship

**When NOT to aggregate:**
- Sites in different ISOs with different market structures (PJM and ERCOT should be procured separately)
- One site has unique requirements (e.g., real-time pricing needed for a demand response strategy) that would constrain the entire portfolio
- Sites have vastly different contract expiration dates (stagger expirations to avoid all-at-once recontracting risk)

### 7.2 Portfolio-Level Risk Metrics

Track at the portfolio level, not just site-by-site:

| Metric | Formula | Target |
|--------|---------|--------|
| Portfolio hedge ratio | (Hedged MWh / Total expected MWh) × 100 | 60-80% |
| Weighted average procurement price | Σ(site MWh × site $/MWh) / Total MWh | Within 5% of portfolio benchmark |
| Supplier concentration | Largest supplier MWh / Total MWh | <50% (avoid single-supplier dependence) |
| Contract expiration clustering | % of portfolio MWh expiring in any 12-month period | <40% (stagger expirations) |
| Renewable coverage | Renewable MWh / Total MWh | On track to target |
| Portfolio load factor | Total kWh / (Sum of site peak kW × hours) | Track trend, higher is better |

### 7.3 Site Prioritization for Demand-Side Investment

With limited capital for demand charge mitigation, prioritize sites using this scoring model:

| Factor | Weight | Scoring |
|--------|--------|---------|
| Demand charges as % of total bill | 30% | >35% = 100, 25-35% = 70, 15-25% = 40, <15% = 10 |
| Peak-to-average ratio | 25% | >2.5 = 100, 2.0-2.5 = 70, 1.5-2.0 = 40, <1.5 = 10 |
| Available demand reduction (kW) | 20% | >1000 kW = 100, 500-1000 = 70, 200-500 = 40, <200 = 10 |
| Utility demand rate ($/kW) | 15% | >$20 = 100, $15-$20 = 70, $10-$15 = 40, <$10 = 10 |
| Capacity market exposure | 10% | PJM/ISO-NE (high) = 100, NYISO = 70, MISO = 40, none = 0 |

**Investment priority: highest composite score first.** A site scoring >80 is a strong
candidate for battery storage or demand response. A site scoring <40 has limited
demand charge optimization potential — focus on supply-side procurement instead.

---

## 8. Natural Gas Procurement

### 8.1 Gas Procurement Structures

Natural gas procurement for C&I consumers (boilers, CHP, process heat, backup generation)
follows similar principles to electricity but with distinct market mechanics.

| Structure | Description | Best For |
|-----------|-------------|----------|
| Firm fixed-price | Locked $/therm or $/MMBtu for contract term | Budget certainty, large heating loads |
| Index (first-of-month) | Monthly NYMEX Henry Hub settlement + basis + adder | Cost optimization, risk-tolerant buyers |
| Index (daily) | Daily Gas Daily midpoint + basis + adder | High-flexibility loads, interruptible processes |
| Baseload block + index | Fixed block covers base heating/process load, index covers variable | Facilities with both base process heat and weather-variable HVAC |
| Swing contract | Volume flexibility (50-130% of nominated quantity) | Facilities with highly variable gas consumption |

### 8.2 Basis Differentials for Natural Gas

Natural gas prices vary by delivery point. Henry Hub (Louisiana) is the benchmark,
but delivered cost depends on the basis differential between Henry Hub and your
local city gate or utility delivery point.

**Common basis differentials (approximate):**

| Delivery Point | Typical Basis to Henry Hub | Driver |
|---------------|--------------------------|--------|
| Chicago (NGPL Midcontinent) | -$0.10 to +$0.15/MMBtu | Pipeline capacity from Gulf to Midwest |
| New York (Transco Zone 6 NY) | +$0.50 to +$3.00/MMBtu | Winter constraint on pipelines into NYC |
| New England (Algonquin) | +$1.00 to +$8.00/MMBtu (winter) | Severe pipeline constraints, competes with LNG |
| California (SoCal Border) | -$0.50 to +$1.50/MMBtu | Varies with West Coast supply/demand |
| Appalachia (Dominion South) | -$1.50 to -$0.30/MMBtu | Oversupply from Marcellus shale production |
| Texas (HSC) | -$0.05 to +$0.20/MMBtu | Close to production, minimal basis |

**Key insight:** A facility in New England on index pricing faces dramatically different
winter risk than a facility in Texas. Basis in New England during a cold snap can
exceed $15/MMBtu, tripling the delivered gas cost. New England gas procurement
requires winter hedging with firm pipeline capacity or LNG backup — index pricing
without protection is reckless in that market.

### 8.3 Gas-Electric Interdependency

For facilities with both electricity and natural gas loads, recognize the coupling:

- **When gas prices spike, electricity prices spike.** Natural gas is the marginal fuel
  for electricity generation in most US ISOs. A $2/MMBtu increase in Henry Hub
  translates to approximately $10-$15/MWh increase in wholesale electricity prices
  (depending on the average heat rate of marginal gas plants, typically 7,000-8,000 BTU/kWh).

- **CHP economics are gas-price dependent.** A CHP system generating electricity at
  a heat rate of 6,500 BTU/kWh has a fuel cost of $6.50 × gas price per MWh. At gas
  $3/MMBtu, generation cost is $19.50/MWh. At gas $8/MMBtu, generation cost is
  $52/MWh. If your grid electricity cost exceeds your CHP generation cost, run the
  CHP. If grid electricity drops below CHP cost (e.g., during spring shoulder months
  with mild weather and low grid demand), consider shutting down CHP and buying
  from the grid.

- **Dual-fuel hedging:** When hedging gas and electricity simultaneously, recognize
  that fixing gas costs and leaving electricity at index (or vice versa) creates a
  cross-commodity basis risk. If gas prices drop but electricity stays high (due to
  transmission constraints or non-gas generation tightness), your gas hedge
  underperforms while your electric bill remains high. Consider hedging both
  commodities on a correlated basis — many energy suppliers offer combined
  gas+electric portfolio management.

---

## 9. Tariff Optimization in Regulated Markets

### 9.1 Rate Schedule Selection

In regulated markets, the available tariff options may seem limited, but switching
between rate schedules can save 5-15% on the total bill without changing consumption.

**Step 1: Identify available rate schedules for your demand level and voltage.**
Most utilities offer 2-4 rate options for large C&I customers:
- Standard demand rate (flat energy + demand charge)
- Time-of-use rate (lower off-peak energy, higher on-peak energy + demand)
- Real-time pricing pilot (if available)
- Interruptible service rate (lower cost, utility can curtail during emergencies)

**Step 2: Model 12 months of actual interval data against each available rate schedule.**

```
For each rate schedule:
  Monthly cost = Σ(energy_charge_component) + demand_charge + customer_charge + riders

Where:
  energy_charge_component = Σ(kWh_per_interval × applicable_rate_per_kWh)
  demand_charge = max(15-min kW interval in month) × demand_rate
  For TOU rates: separate on-peak demand charge may apply
```

**Step 3: Compare annual totals.**

| Rate Schedule | Annual Energy | Annual Demand | Annual Fixed | Annual Total | vs. Current |
|--------------|--------------|---------------|-------------|-------------|-------------|
| Current (GS-3) | $580,000 | $312,000 | $24,000 | $916,000 | baseline |
| TOU (GS-3-TOU) | $545,000 | $298,000 | $24,000 | $867,000 | -$49,000 (-5.3%) |
| RTP pilot | $510,000 | $312,000 | $36,000 | $858,000 | -$58,000 (-6.3%) |
| Interruptible | $565,000 | $250,000 | $24,000 | $839,000 | -$77,000 (-8.4%) |

**Step 4: Evaluate non-financial factors.**
- TOU: requires ability to shift load or accept higher on-peak costs
- RTP: requires market monitoring and tolerance for price volatility
- Interruptible: requires ability to curtail load on short notice (typically 30-60 min)

### 9.2 Rate Case Monitoring and Response

**When to intervene in a rate case:**

| Impact Level | Annual Cost Increase | Recommended Action |
|-------------|---------------------|-------------------|
| <$50K | Negligible for large C&I | Monitor only — track filing through settlement |
| $50K-$200K | Material but not critical | Join existing intervenor group (OIEC, etc.) |
| $200K-$500K | Significant | Individual intervention with regulatory counsel |
| >$500K | Critical | Full intervention with expert witnesses, rate design testimony |

**Rate case timeline (typical):**

```
Month 0: Utility files rate case with state PUC
Month 1-2: Intervenors file to participate
Month 3-4: Discovery (interrogatories, data requests to utility)
Month 5-7: Intervenor testimony filed
Month 8-9: Hearings
Month 10-12: PUC issues order
Month 13-15: New rates take effect (may be retroactive to filing date)
```

**What to challenge in a rate case:**
1. **Rate of return on equity (ROE):** Utilities typically request 10-11% ROE. Current
   authorized ROEs are trending down (9-10%). Challenge excessive ROE requests.
2. **Rate base additions:** Utilities earn their ROE on their rate base (invested capital).
   Challenge excessive or imprudent capital investments included in the rate base.
3. **Cost allocation between rate classes:** Utilities allocate total revenue
   requirement across residential, commercial, and industrial rate classes. Ensure your
   rate class is not subsidizing residential or other classes above cost causation.
4. **Rate design:** Even if the total revenue is approved, fight for demand-based rate
   design (rewards load factor management) rather than pure volumetric rates (punishes
   high-consumption customers regardless of load shape).

---

## 10. Emergency Procurement Protocols

### 10.1 Supplier Default / Bankruptcy

If your retail energy provider files for bankruptcy or fails to perform:

**Immediate actions (24-48 hours):**
1. Verify your account status with the utility. If the supplier defaults, your
   account reverts to the utility's Provider of Last Resort (POLR) service or standard
   offer service. You will NOT lose power — the grid keeps delivering regardless of
   supplier status.
2. Determine the POLR rate. In most states, the POLR rate is set quarterly based on
   wholesale market prices plus a premium (10-20% above competitive supply). This may
   be higher or lower than your current contract rate.
3. Contact 2-3 alternative suppliers immediately. Explain the situation — they will
   offer expedited enrollment (5-10 business days vs. normal 30-60 day switch process).
4. Review your contract for supplier default provisions, including any deposits or
   prepayments that may be at risk in the bankruptcy estate.

**Medium-term (2-4 weeks):**
1. Execute a new supply contract with the best available alternative supplier.
2. File a claim in the bankruptcy proceeding for any prepayments, deposits, or damages.
3. Review your supplier qualification criteria — consider adding financial covenants
   (minimum credit rating, tangible net worth requirements) to future contracts.

### 10.2 Force Majeure Events

When a force majeure event (natural disaster, grid emergency, pandemic) disrupts
your energy supply or operations:

**Assessment framework:**

| Event Type | Energy Impact | Procurement Response |
|-----------|--------------|---------------------|
| Hurricane/severe weather | Physical damage to generation/T&D, price spikes | Activate backup generation, curtail non-essential load, document for insurance |
| Grid emergency (EEA3) | Rolling blackouts, extreme prices | Maximum load curtailment, DR activation, generator deployment |
| Supplier force majeure claim | Supplier attempts to suspend contract | Review FM clause narrowly — "market price increase" is NOT force majeure; "physical inability to deliver" may be |
| Pandemic/operational shutdown | Facility closed, consumption drops dramatically | Invoke volume tolerance provisions, negotiate contract suspension, evaluate early termination |

### 10.3 Contract Termination Decision Matrix

When evaluating whether to terminate a supply contract early:

```
Early Termination Fee (ETF) = Σ(remaining months × monthly volume × |contract price - current market price|)

If contract price > current market:
  You owe the supplier (you're paying above market)
  ETF = remaining months × volume × (contract price - market) × discount factor

If contract price < current market:
  Supplier owes you (you have a favorable contract)
  You would NOT terminate — the contract is in-the-money

Decision: Terminate if ETF < cumulative savings from alternative contract + risk reduction value
```

**Example — mid-term exit evaluation:**

```
Current contract: $0.062/kWh, 18 months remaining, 50 GWh remaining
Current market: $0.055/kWh (market has dropped since contract signing)
ETF: 50,000 MWh × ($0.062 - $0.055) = $350,000

Alternative contract: $0.054/kWh for 18 months
Savings from alternative: 50,000 MWh × ($0.062 - $0.054) = $400,000

Net benefit of termination: $400,000 savings - $350,000 ETF = $50,000

Decision: Marginal. Factor in:
  - Renegotiation risk (can you lock $0.054 before market moves?)
  - Administrative cost of switching suppliers
  - Relationship cost with current supplier
  - If net benefit < $100K, generally not worth the disruption
```

---

## 11. Seasonal Procurement Calendar

A disciplined procurement calendar ensures no critical deadlines are missed and
procurement activities align with market conditions.

| Month | Activity | Deadline |
|-------|----------|----------|
| January | Annual energy budget review, lock natural gas hedges for next winter | Jan 31 for winter gas |
| February | Q1 forward curve review, PPA pipeline assessment | — |
| March | Begin RFP preparation for contracts expiring in Q4 or Q1 next year | — |
| April | Issue RFPs for fall contract starts, review summer DR enrollment | Apr 15 for PJM DR enrollment |
| May | Evaluate bids, begin summer peak preparation (generator testing, BAS settings) | May 31 for summer rate elections |
| June | Summer peak demand management begins, monitor 5CP forecasts (PJM) | — |
| July | Peak season monitoring, execute Q3 procurement tranches | Jul 15 for ERCOT 4CP mgmt |
| August | Peak season monitoring, finalize fall contract awards | Aug 31 for ISO-NE FCA positions |
| September | Post-summer review, capacity tag assessment, RE100 progress check | Sep 30 for Q4 procurement |
| October | Begin winter gas hedging, review heating load forecasts | Oct 31 for winter gas locks |
| November | Budget season — prepare next year's energy cost forecast | Nov 15 for budget submission |
| December | Year-end RE100 reconciliation, REC inventory check, contract renewals | Dec 31 for REC vintage retirement |
