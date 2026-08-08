# Decision Frameworks — Carrier Relationship Management

This reference provides detailed decision trees, scoring matrices, negotiation models,
and strategic frameworks for managing carrier portfolios, negotiating freight rates,
running RFPs, and making allocation decisions. It is loaded on demand when the agent
needs to make or recommend nuanced carrier relationship decisions.

All thresholds, rate assumptions, and market benchmarks reflect US domestic freight
operations across TL, LTL, intermodal, and brokerage. Adjust for regional markets
and current cycle position.

---

## 1. Rate Negotiation Strategy

### 1.1 Pre-Negotiation Intelligence Gathering

Before entering any rate negotiation, assemble a lane-level data package for each
lane under discussion. Negotiating without data is guessing; carriers always have
better data about their own costs than you do about market rates.

#### Data Assembly Checklist

| Data Point | Source | Purpose |
|-----------|--------|---------|
| Current contract rate (linehaul + FSC + avg accessorials) | TMS / rate management system | Establish baseline total cost |
| DAT 90-day lane average (spot and contract) | DAT RateView | Market benchmark for shipper leverage |
| Greenscreens carrier-specific rate intelligence | Greenscreens.ai | Carrier-specific pricing behavior and predicted pricing |
| Your volume on this lane (loads/week, annual loads) | TMS shipment history | Volume leverage — carriers price based on density |
| Carrier's current tender acceptance rate on this lane | TMS acceptance data | Indicator of whether current rate is below carrier's floor |
| Carrier's OTD and claims performance on this lane | Carrier scorecard | Service quality justification for rate position |
| Competitor carrier bids (from recent RFP or spot activity) | RFP results / spot tender logs | Alternative pricing to create competitive tension |
| Diesel price trend and DOE forecast | DOE Weekly Retail Diesel | FSC modeling across price scenarios |
| Seasonal volume forecast for the lane | Demand planning / sales forecast | Carrier values volume predictability — share forecasts to build trust |

### 1.2 Total Cost Modeling

Never negotiate linehaul in isolation. Model total cost per shipment across diesel
price scenarios to expose hidden costs and FSC manipulation.

#### Total Cost Formula

```
Total Cost per Shipment = Linehaul Rate
                        + Fuel Surcharge (at given diesel price)
                        + Expected Detention (avg hours × rate × frequency)
                        + Expected Accessorials (liftgate, residential, etc. × frequency)
                        + Reweigh/Reclass Fees (LTL — frequency × cost)
                        + Payment Term Cost (if offering quick-pay discount)
```

#### Diesel Price Scenario Modeling

For every carrier proposal, calculate total cost at three diesel price points:

| Scenario | Diesel Price | Purpose |
|----------|-------------|---------|
| Low | $3.25/gallon | Tests carrier's FSC floor — does the FSC go to zero or maintain a minimum? |
| Current | Current DOE average | Apples-to-apples comparison with other carriers |
| High | $4.50/gallon | Exposes aggressive FSC schedules that inflate cost disproportionately |

**Example — Comparing Two TL Carrier Proposals (Chicago to Dallas, ~920 miles):**

```
Carrier A: Linehaul $2.10/mi, FSC base $3.50, $0.01/mi per $0.05 diesel increase
Carrier B: Linehaul $1.95/mi, FSC base $3.00, $0.015/mi per $0.05 diesel increase

At diesel $3.50:
  Carrier A: ($2.10 × 920) + ($0.00 FSC) = $1,932
  Carrier B: ($1.95 × 920) + ($0.015 × 10 increments × 920) = $1,794 + $138 = $1,932

At diesel $4.50:
  Carrier A: ($2.10 × 920) + ($0.01 × 20 × 920) = $1,932 + $184 = $2,116
  Carrier B: ($1.95 × 920) + ($0.015 × 30 × 920) = $1,794 + $414 = $2,208

Carrier B is $92 more expensive at high diesel despite a $0.15/mi lower linehaul.
The aggressive FSC base ($3.00 vs. $3.50) and steeper increment ($0.015 vs. $0.01)
make Carrier B the more expensive option when fuel prices rise.
```

### 1.3 Negotiation Positioning by Market Cycle

The freight market cycle determines your leverage. Negotiate differently in each phase:

#### Shipper-Favorable Market (Capacity Surplus)

Indicators: DAT load-to-truck ratio <3:1, OTRI <5%, spot rates below contract by >10%.

| Tactic | Detail |
|--------|--------|
| Push for rate reductions | Target 5-12% reduction on lanes where your rate exceeds DAT contract benchmark by >10% |
| Extend contract terms | Lock favorable rates for 18-24 months instead of the standard 12. Carriers will accept longer terms to secure volume during a downturn |
| Negotiate accessorial caps | Push for detention free time of 3 hours (instead of standard 2). Negotiate liftgate and residential fees down 15-20% |
| Add service commitments | Require 95% OTD and 92% tender acceptance as contract terms with remedy clauses (rate credits for non-performance) |
| Don't over-squeeze | A carrier losing money on your lanes will exit when the market turns. Leave enough margin for the carrier to cover their variable costs + a thin margin. A carrier hauling your freight at $0.05/mile below their cost will be the first to reject tenders when demand returns |

#### Carrier-Favorable Market (Capacity Shortage)

Indicators: DAT load-to-truck ratio >6:1, OTRI >12%, spot rates above contract by >15%.

| Tactic | Detail |
|--------|--------|
| Protect volume commitments | Offer volume guarantees (minimum loads/week) in exchange for capacity commitments. Carriers in a tight market prioritize shippers who provide consistent, guaranteed volume |
| Accept moderate rate increases | A 5-8% increase is reasonable when the market has moved 15-20%. Refusing all increases pushes carriers to more profitable freight |
| Accelerate payment terms | Offer 15-day or quick-pay terms (vs. standard 30-day) as a non-rate incentive. Carriers are cash-constrained in tight markets — faster payment is worth 2-3% rate equivalent |
| Improve shipper operations | Reduce driver detention, offer drop-trailer programs, ensure consistent dock scheduling. Every operational improvement makes your freight more attractive relative to competitors |
| Negotiate multi-year with escalators | Lock base rates for 24 months with a pre-agreed annual escalator (3-5%) tied to a cost index. Protects against further rate spikes while giving the carrier predictability |

#### Transitional Market

Indicators: Mixed signals — OTRI between 5-12%, spot-contract spread narrowing.

| Tactic | Detail |
|--------|--------|
| Benchmark aggressively | Transition markets are when benchmark data matters most. Carriers will argue the market is tighter than it is (if transitioning to carrier-favorable) or softer (if transitioning to shipper-favorable). Let the data decide |
| Run mini-bids | Instead of full RFPs, run targeted mini-bids on your bottom-performing 20% of lanes. This creates competitive pressure without disrupting your entire routing guide |
| Lock strategic lanes | Secure rates on your highest-volume, most critical lanes first. Leave secondary lanes flexible to benefit from continued market movement |

### 1.4 Concession Strategy

When a negotiation reaches an impasse, use structured concessions to find agreement
without giving away core economics:

#### Concession Priority (Give These First — They Cost Less Than They're Worth)

| Concession | Your Cost | Carrier Value | When to Offer |
|-----------|-----------|---------------|---------------|
| Volume commitment (guarantee minimum loads/week) | Low — you were shipping this volume anyway | High — predictable volume improves carrier utilization | When carrier won't budge on rate |
| Faster payment terms (Net 15 vs. Net 30) | Moderate — accelerates cash outflow by 15 days | High — carriers are always cash-constrained | When spread between positions is <5% |
| Drop-trailer program | Moderate — requires trailer parking space | Very High — eliminates driver detention, improves asset utilization | When carrier cites detention as cost driver |
| Consistent appointment scheduling | Low — operational discipline | High — drivers can plan routes and HOS around fixed appointments | When carrier cites unpredictable scheduling |
| Multi-year contract with escalators | Low — locks rate but adds predictability | High — long-term revenue certainty | When carrier values stability over short-term optimization |

#### Concession Boundary (Never Give These Away)

| Element | Why It's Non-Negotiable |
|---------|----------------------|
| FSC table transparency | Opaque FSC schedules are a carrier margin tool, not a cost recovery mechanism |
| Accessorial audit rights | You must be able to verify every accessorial charge against the BOL and contract |
| Service-level remedies | A contract without OTD and tender acceptance minimums is just a rate sheet with no accountability |
| Right to re-bid lanes annually | Market conditions change — you need the ability to benchmark and adjust |
| Carrier compliance requirements (FMCSA, insurance) | Safety and legal compliance are not negotiable under any market condition |

---

## 2. Carrier Portfolio Optimization

### 2.1 Portfolio Health Assessment

Run this assessment quarterly to identify optimization opportunities:

#### Step 1: Carrier Concentration Analysis

For each lane in your top 50 by volume:

| Metric | Target | Action If Out of Range |
|--------|--------|----------------------|
| Primary carrier volume share | 50-70% | If >70%: diversify. If <50%: routing guide isn't being followed — investigate ops compliance |
| Number of active carriers on lane | 2-4 | If <2: single point of failure risk. If >4: volume is too fragmented for carriers to care |
| Backup carrier last-used date | Within 90 days | If >90 days: the backup is stale. Run a test load to confirm the carrier can still service the lane |
| Spot freight % on lane | <15% | If >15%: routing guide is failing. Either rates are below market or tender acceptance is low |

#### Step 2: Carrier Scorecard Triage

Rank all active carriers by composite score (weighted: OTD 30%, tender acceptance 25%,
claims ratio 20%, invoice accuracy 15%, communication/responsiveness 10%).

| Tier | Score Range | Action |
|------|------------|--------|
| A — Strategic Partners | ≥90% | Increase allocation, offer longer-term contracts, invest in integration (EDI, API), invite to annual business review |
| B — Reliable Performers | 75-89% | Maintain current allocation, monitor for improvement or decline, include in next RFP |
| C — Underperformers | 60-74% | Issue corrective action plan with 60-day timeline. Reduce allocation by 25%. If no improvement at 60 days, reduce by another 25% |
| D — Exit Candidates | <60% | Initiate carrier exit process (see §2.4). Stop new lane awards immediately. Allow existing commitments to run out |

#### Step 3: Spend Optimization

| Analysis | Method | Target |
|----------|--------|--------|
| Rate-vs-market alignment | Compare contract rates to DAT contract lane average for each active lane | Within ±8% of DAT. If >+15%, renegotiate. If <-10%, carrier may be underpriced and at exit risk |
| Accessorial spend ratio | Total accessorials / total linehaul spend | <8% of total spend. If >12%, audit accessorial billing and address root causes (detention, reclass) |
| Spot premium tracking | (Avg spot rate - avg contract rate) / avg contract rate | <15% premium. If >25%, routing guide coverage is insufficient |
| Small shipment consolidation | Identify LTL shipments to same destination within 48-hour windows | Consolidate into TL or multi-stop when LTL spend on a lane exceeds $5K/month |

### 2.2 Routing Guide Design

The routing guide is your operational expression of carrier strategy. A well-designed
guide executes itself; a poorly designed one requires constant manual intervention.

#### Structure by Lane Volume

| Lane Volume | Guide Depth | Primary % | Secondary % | Tertiary % |
|-------------|------------|-----------|-------------|------------|
| >10 loads/week | 3-4 carriers | 50-60% | 25-30% | 10-20% |
| 5-10 loads/week | 3 carriers | 55-65% | 25-30% | 10-15% |
| 2-5 loads/week | 2-3 carriers | 60-75% | 25-40% | — |
| <2 loads/week | 2 carriers (or 1 + broker) | 70-80% | 20-30% | — |

#### Tender Waterfall Logic

```
1. Tender to Primary Carrier
   → If accepted within 2 hours: assign
   → If rejected or no response:

2. Tender to Secondary Carrier
   → If accepted within 1.5 hours: assign
   → If rejected or no response:

3. Tender to Tertiary Carrier
   → If accepted within 1 hour: assign
   → If rejected or no response:

4. Move to Spot Procurement
   → Post to carrier board or contact preferred spot carriers
   → Set rate ceiling at tertiary contract rate + 15%
   → If no coverage within 2 hours at ceiling: escalate to manager
```

#### Routing Guide Maintenance Cadence

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Review lane-level tender acceptance rates | Weekly | Transportation Analyst |
| Adjust carrier allocation based on performance trends | Monthly | Transportation Manager |
| Full routing guide audit (dead lanes, stale backups, rate alignment) | Quarterly | Director of Transportation |
| Complete routing guide rebuild (RFP) | Annually or after major volume/network change | VP Supply Chain + Procurement |

### 2.3 Carrier Onboarding Process

A standardized onboarding process protects against compliance risk and sets performance
expectations from day one.

#### Onboarding Checklist

| Step | Timeline | Owner | Verification Method |
|------|----------|-------|-------------------|
| FMCSA authority verification (active MC#, property authorization) | Day 1 | Compliance | SAFER website direct lookup |
| Insurance verification ($1M+ auto liability, $100K cargo, workers comp) | Day 1 | Compliance | FMCSA Insurance tab + certificate of insurance on file |
| Safety rating and CSA score review | Day 1 | Compliance | SAFER + CSA BASIC percentiles — flag if Unsafe Driving or HOS >75th percentile |
| W-9 and payment setup | Days 1-3 | AP/Finance | IRS TIN matching |
| Carrier agreement execution (rate confirmation template, accessorial schedule, insurance requirements, performance expectations) | Days 3-5 | Transportation Manager | Signed agreement on file |
| TMS/EDI setup (210, 214, 990 transactions if applicable) | Days 5-10 | IT/Integration | Test transaction confirmation |
| Initial rate confirmation for awarded lanes | Days 5-7 | Transportation Manager | Countersigned rate confirmation per lane |
| 30-day trial loads (minimum 5 loads before full allocation) | Days 10-40 | Operations | Trial performance review at day 30 — OTD, communication, billing accuracy |
| Quarterly compliance re-verification (ongoing) | Every 90 days | Compliance | Automated FMCSA/insurance monitoring via Highway, RMIS, or Carrier411 |

### 2.4 Carrier Exit Process

Exiting a carrier requires planning to avoid service disruption on lanes they currently serve.

#### Decision: Immediate vs. Managed Exit

| Scenario | Exit Type | Timeline |
|----------|-----------|----------|
| FMCSA authority revoked or insurance lapsed | Immediate — stop tendering now | 0 days |
| Confirmed double-brokering | Immediate — stop tendering, document evidence | 0 days |
| Unsatisfactory safety rating | Immediate — stop tendering | 0 days |
| Corrective action plan failed (service metrics) | Managed — transition volume over 30-60 days | 30-60 days |
| Rate renegotiation failed (carrier above market) | Managed — transition after RFP award | 60-90 days |
| Strategic portfolio simplification (too many carriers) | Managed — transition volume at next contract renewal | 90-120 days |

#### Managed Exit Steps

1. **Identify replacement capacity** — ensure backup carriers on every lane the exiting carrier serves can absorb the volume. Run test loads if backups haven't been used in 90+ days.
2. **Communicate transparently** — tell the carrier why. "Your OTD has been below 85% for the last quarter despite our corrective action plan. We need to shift this volume to a carrier that can meet our service requirements." Burning bridges is unnecessary — carriers improve, get acquired, or re-enter your network in future cycles.
3. **Transition volume gradually** — reduce allocation by 25% per week over 4 weeks. Abrupt volume loss can damage the carrier's operations (especially small carriers who built capacity around your freight).
4. **Settle outstanding claims and invoices** — ensure all open claims are filed and all invoices are paid or disputed before the relationship goes dormant. Unresolved financial items turn a professional exit into a adversarial one.
5. **Retain the carrier record** — do not delete the carrier from your systems. Document exit reasons, performance history, and corrective actions. If the carrier improves or changes ownership, you may onboard them again in 12-24 months.

---

## 3. RFP Execution Framework

### 3.1 RFP Timeline

| Phase | Duration | Activities |
|-------|----------|-----------|
| 1 — Pre-RFP Analysis | Weeks 1-2 | Analyze 12 months of shipment data, identify lanes for bid, benchmark current rates against DAT/Greenscreens, set cost and service targets, define evaluation criteria and weightings |
| 2 — RFP Development | Weeks 3-4 | Build lane-level bid package with volume, equipment, and service requirements. Define accessorial schedule, insurance minimums, and contract terms. Prepare carrier communication and Q&A timeline |
| 3 — Carrier Outreach | Week 5 | Distribute RFP to incumbent carriers + 5-10 prospective carriers identified through market research or peer referrals. Allow 2-3 weeks for bid submission |
| 4 — Bid Collection | Weeks 5-7 | Answer carrier questions (standardize responses via Q&A document shared with all bidders). Remind non-respondents at the halfway mark |
| 5 — Bid Analysis | Weeks 8-9 | Score bids using weighted criteria (see §3.2). Model total cost per lane. Rank carriers per lane. Identify negotiation targets (carriers close to award threshold) |
| 6 — Negotiation | Weeks 9-10 | Final-round negotiation with top 2-3 carriers per lane. Focus on lanes where top bids are within 5% of each other — these are negotiable. Do not renegotiate with the low bidder on lanes where they're already 10%+ below the field |
| 7 — Award | Week 11 | Notify winning carriers with lane awards and effective dates. Notify losing carriers with feedback (if they ask). Begin rate confirmation process |
| 8 — Implementation | Weeks 11-12 | Load new rates in TMS. Update routing guide. Run 2-week parallel period with old and new guides. Resolve any issues before full cutover |

### 3.2 Bid Evaluation Scoring

#### Criteria Weighting

| Criterion | Weight | Data Source | Scoring Method |
|-----------|--------|-------------|---------------|
| Rate competitiveness | 40% | Bid response | Normalize to 100-point scale where lowest total cost (linehaul + modeled FSC + expected accessorials) = 100, and each 1% above lowest = -3 points |
| Service history / OTD | 25% | Carrier scorecard (for incumbents) or reference checks (for new carriers) | 100 points for ≥96% OTD, 80 for 93-95%, 60 for 90-92%, 40 for 85-89%, 0 for <85% |
| Capacity commitment | 20% | Bid response (stated tender acceptance commitment, equipment availability, driver count on the lane) | 100 points for ≥95% acceptance commitment with driver count evidence, scaled down based on commitment level and supporting evidence |
| Operational fit | 15% | Bid response + due diligence | Technology integration (EDI/API), FMCSA compliance score, driver domicile proximity, equipment match, prior relationship quality |

#### Example Scoring — Lane CHI-DAL (5 loads/week)

```
                Rate (40%)  Service (25%)  Capacity (20%)  Ops Fit (15%)  Total
Carrier A:     85 × 0.40   95 × 0.25      90 × 0.20       80 × 0.15    = 88.75
Carrier B:     100 × 0.40  70 × 0.25      85 × 0.20       75 × 0.15    = 86.75
Carrier C:     92 × 0.40   90 × 0.25      80 × 0.20       90 × 0.15    = 89.10

Award: Carrier C as primary (89.10), Carrier A as secondary (88.75).
Carrier B has lowest rate but weakest service — appropriate as tertiary.
```

### 3.3 Incumbent vs. New Carrier Evaluation

Incumbents have data; new carriers have promises. Adjust evaluation accordingly:

| Factor | Incumbent | New Carrier |
|--------|-----------|-------------|
| Service history | Use actual OTD, claims, tender acceptance from your data | Use carrier's reported statistics + 2-3 reference checks from similarly sized shippers |
| Rate credibility | High — they know the lane and are pricing from experience | Moderate — new carriers may under-bid to win then renegotiate after award. Discount new-carrier bids by 3-5% for risk |
| Implementation risk | Low — already in your systems, familiar with your operations | Moderate — onboarding takes 2-3 weeks, first-month performance often lags |
| Competitive tension value | Moderate — they know you know their performance | High — new entrants create competitive pressure that benefits your entire portfolio |

### 3.4 Post-RFP Rate Lock and Market Movement

Your RFP award locks rates for 12 months (typical). But the market moves. Build
these protections into the contract:

- **Market-based reopener clause:** If DAT contract lane average moves >15% from the awarded rate for 60+ consecutive days, either party may request a rate review. This protects you in a softening market and protects the carrier in a tightening market.
- **Volume band pricing:** If your actual volume on a lane falls below 75% or exceeds 125% of the RFP-stated volume, rates are subject to renegotiation. This prevents you from losing volume and still paying volume-discounted rates, or from flooding a carrier with unanticipated volume at rates that don't cover their incremental costs.
- **Annual escalator option:** For multi-year contracts, build in a pre-agreed escalator (typically 2-4% annually) tied to a published index (PPI-Truck Transportation, DAT National Average). This avoids the disruption of an annual RFP while keeping rates aligned with costs.

---

## 4. Contract vs. Spot Market Decision Framework

### 4.1 Decision Matrix

| Condition | Recommendation | Rationale |
|-----------|---------------|-----------|
| Lane volume >3 loads/week, consistent year-round | Contract | Carrier will invest in dedicated capacity for predictable volume |
| Lane volume 1-3 loads/week, seasonal | Contract for peak months, spot for off-peak | Avoids paying contract rates during low-demand months |
| Lane volume <1 load/week, unpredictable | Spot or broker relationship | Carriers won't commit capacity to inconsistent volume; contract rates will be inflated to cover utilization risk |
| Spot rates are >15% below contract rate for 60+ days | Move 20-30% of volume to spot | Market has moved significantly — capture savings while maintaining contract relationship |
| Spot rates are >15% above contract rate | Stay on contract, honor volume commitments | This is when contract value materializes — your carriers are holding rates below market for you. Reward their commitment by giving them your full volume |
| Customer requires guaranteed transit time | Contract with service-level agreement | Spot carriers have no SLA obligation — you can't guarantee what you can't control |
| Lane serves a production line or retail replenishment | Contract with primary and secondary carriers | Risk of spot market non-coverage is unacceptable for critical supply chains |
| New lane with unknown volume pattern | Spot for 60-90 days, then evaluate | Gather data before committing to a contract rate that may not reflect actual demand |

### 4.2 Spot Market Best Practices

When procuring on the spot market:

- **Set a rate ceiling** before posting. Use your tertiary contract rate + 15% as the maximum. Anything above that threshold requires manager approval.
- **Vet the carrier** even for single loads. At minimum: FMCSA authority check, insurance verification, Carrier411 or Highway check for complaints. A 60-second screening prevents catastrophic outcomes (uninsured carrier, double-brokered load, stolen freight).
- **Demand rate confirmation** before the truck arrives. Verbal agreements on spot loads are unenforceable. Get the rate confirmation signed with all accessorials, FSC, and detention terms specified.
- **Track spot premium** meticulously. Report spot vs. contract spread weekly by lane. If any lane consistently shows >20% spot premium, your routing guide on that lane needs attention.

---

## 5. Carrier Onboarding and Offboarding Decision Trees

### 5.1 Onboarding Decision Tree

```
New carrier candidate identified
│
├─ FMCSA authority check
│  ├─ Authority inactive/revoked → REJECT (do not proceed)
│  ├─ Authority <6 months old → PROCEED WITH CAUTION (new entrant risk)
│  └─ Authority active, >12 months → PROCEED
│
├─ Insurance verification
│  ├─ Auto liability <$1M → REJECT (below your minimum)
│  ├─ Cargo insurance <$100K → NEGOTIATE (require $100K minimum)
│  └─ Meets all minimums → PROCEED
│
├─ Safety assessment
│  ├─ FMCSA Unsatisfactory rating → REJECT
│  ├─ CSA BASIC >90th percentile on Unsafe Driving → REJECT
│  ├─ CSA BASIC >75th percentile on any BASIC → FLAG for risk review
│  └─ CSA acceptable → PROCEED
│
├─ Financial health check
│  ├─ Broker bond revoked or reduced → REJECT (if broker)
│  ├─ Recent insurance underwriter changes (3+ in 12 months) → FLAG
│  ├─ Driver complaints on Carrier411 re: pay → FLAG for monitoring
│  └─ No red flags → PROCEED
│
├─ Operational fit
│  ├─ No EDI/API capability and your volume requires it → NEGOTIATE timeline
│  ├─ Equipment doesn't match requirements → REJECT for this lane
│  └─ Operational fit confirmed → PROCEED
│
└─ ONBOARD: Execute carrier agreement, set up in TMS, run trial loads
```

### 5.2 Offboarding Decision Tree

```
Carrier performance or compliance concern identified
│
├─ Compliance failure (authority, insurance, safety)
│  ├─ Authority revoked → IMMEDIATE EXIT (stop tendering today)
│  ├─ Insurance lapsed → IMMEDIATE SUSPENSION (reinstate if corrected in 48 hrs)
│  ├─ Unsatisfactory safety rating → IMMEDIATE EXIT
│  └─ CSA scores worsened into >90th percentile → 30-DAY REVIEW with carrier
│
├─ Service performance failure
│  ├─ OTD <85% for 60 days
│  │  ├─ First occurrence → CORRECTIVE ACTION PLAN (60-day timeline)
│  │  └─ Second occurrence after CAP → MANAGED EXIT (30-60 days)
│  │
│  ├─ Tender acceptance <70% for 30 days
│  │  ├─ Carrier communicating, rate issue → RENEGOTIATE
│  │  └─ Carrier non-responsive → MANAGED EXIT (30 days)
│  │
│  └─ Claims ratio >2% for 90 days → CORRECTIVE ACTION PLAN
│
├─ Integrity failure
│  ├─ Double-brokering confirmed → IMMEDIATE EXIT + document for industry
│  ├─ Insurance fraud (forged certificate) → IMMEDIATE EXIT + report to FMCSA
│  └─ Systematic overbilling (>5% overcharge pattern) → CORRECTIVE ACTION, exit if not resolved in 30 days
│
└─ Strategic portfolio decision
   ├─ Carrier redundant (consolidating) → MANAGED EXIT at contract renewal
   └─ Carrier non-competitive on rate → INCLUDE IN NEXT RFP (give them a chance to compete)
```

---

## 6. Market Cycle Positioning

### 6.1 Cycle Identification Framework

The freight market follows a pattern of loosening and tightening that repeats every
2-3 years. Identifying where you are in the cycle determines your negotiation stance,
contract strategy, and portfolio decisions.

#### Leading Indicators (Signal Direction 3-6 Months Ahead)

| Indicator | Source | Shipper-Favorable Signal | Carrier-Favorable Signal |
|-----------|--------|------------------------|------------------------|
| Class 8 truck orders | ACT Research, FTR | Rising (new capacity entering) | Falling (capacity leaving or not being replaced) |
| FMCSA new authority applications | FMCSA data | Rising (new carriers entering) | Falling (fewer new entrants, possibly exits increasing) |
| Diesel price trend | DOE | Falling (lowers carrier costs, reduces FSC) | Rising sharply (squeezes small carriers, may cause exits) |
| Manufacturing PMI | ISM | <50 (contraction, less freight demand) | >55 (expansion, freight demand growing) |
| Retail inventory-to-sales ratio | Census Bureau | Rising (retailers overstocked, less reorder freight) | Falling (retailers restocking, generating freight demand) |

#### Coincident Indicators (Confirm Current Position)

| Indicator | Source | Shipper-Favorable | Carrier-Favorable |
|-----------|--------|------------------|------------------|
| DAT load-to-truck ratio | DAT | <3:1 (more trucks than loads) | >6:1 (more loads than trucks) |
| Outbound Tender Rejection Index (OTRI) | FreightWaves SONAR | <5% (carriers accepting almost everything) | >12% (carriers cherry-picking profitable freight) |
| Spot rate trend (13-week) | DAT, Greenscreens | Declining or flat | Rising >5% over 13 weeks |
| Your tender acceptance rate | TMS data | >95% across portfolio | <85% across portfolio |

### 6.2 Strategic Actions by Cycle Phase

| Phase | Duration (typical) | Rate Action | Contract Action | Portfolio Action |
|-------|-------------------|-------------|-----------------|-----------------|
| Early recovery (market tightening) | 3-6 months | Lock rates on top 30% of lanes before carriers reprice | Extend expiring contracts 6-12 months at current rates | Onboard 2-3 new carriers for surge capacity |
| Peak (tight market) | 6-12 months | Minimize rate exposure — renegotiate only what's necessary | Honor commitments — this builds carrier trust for the downturn | Increase allocation to asset carriers (brokers get unreliable in tight markets) |
| Early softening (market loosening) | 3-6 months | Run mini-bids on your worst-performing 20% of lanes | Let short-term contracts expire — rebid at new market rates | Evaluate carrier portfolio for exits (weak performers lose leverage to resist) |
| Trough (soft market) | 6-12 months | Full RFP — maximum competitive tension, target 8-15% savings | Sign 18-24 month contracts to lock favorable rates | Consolidate to fewer, stronger carriers (volume concentration maximizes discount) |

---

## Appendix A — Quick-Reference Decision Cards

### Card 1: "Should I renegotiate this carrier's rate?"

```
IF contract rate > DAT contract average + 15% for 60+ days → YES
IF carrier tender acceptance < 75% for 30+ days → YES (rate is likely below their floor)
IF your volume dropped >25% from what was committed → YES (proactive, before carrier notices)
IF spot market is >15% below your contract for 60+ days → YES
IF carrier's service scores are in top 10% of your portfolio → NO (pay for quality)
IF contract expires in <90 days → WAIT for renewal negotiation
```

### Card 2: "How many carriers should I have on this lane?"

```
IF lane volume > 10 loads/week → 3-4 carriers
IF lane volume 5-10/week → 3 carriers
IF lane volume 2-5/week → 2-3 carriers
IF lane volume < 2/week → 1 carrier + 1 broker backup
IF lane is customer-critical (JIT, perishable, penalty clauses) → add 1 more carrier than volume alone suggests
IF lane serves a single customer who is >20% of your revenue → NEVER fewer than 3
```

### Card 3: "Is this carrier financially healthy?"

```
CHECK FMCSA for active authority and current insurance → If either is lapsed, STOP
CHECK insurance: has the underwriter changed 3+ times in 12 months? → RED FLAG
CHECK Carrier411/CarrierOK: driver complaints about pay? → YELLOW FLAG
CHECK: has the carrier's bond amount decreased? → RED FLAG (for brokers)
CHECK: sudden decline in tender acceptance across all your lanes? → YELLOW FLAG
IF 2+ yellow flags or 1+ red flag → REDUCE EXPOSURE incrementally, do not wait
```

### Card 4: "Should I go to spot market on this load?"

```
IF all routing guide carriers rejected → YES (no choice)
IF spot rate < contract rate - 10% → YES (capture savings, track as data for renegotiation)
IF lane is irregular (< 1 load/week) and no contract carrier → YES
IF customer requires guaranteed transit and SLA → NO (stay on contract)
IF you're in peak season and spot rates are 30%+ above contract → NO (honor contract, build carrier goodwill)
ALWAYS: vet the spot carrier (FMCSA check, rate confirmation signed before dispatch)
```

---

## Appendix B — Glossary

| Term | Definition |
|------|-----------|
| BASIC | Behavior Analysis and Safety Improvement Categories — the seven CSA safety dimensions scored by FMCSA |
| CAP | Corrective Action Plan — formal performance improvement plan with timeline and metrics |
| CSA | Compliance, Safety, Accountability — FMCSA's carrier safety measurement system |
| DAT | The largest spot market freight data provider (now DAT Freight & Analytics) |
| DOE | Department of Energy — publishes weekly national average diesel prices used for FSC calculations |
| EDI | Electronic Data Interchange — standardized electronic communication between shipper and carrier systems |
| FSC | Fuel Surcharge — variable rate component indexed to diesel prices |
| Greenscreens | AI-powered freight rate intelligence platform for benchmarking and predictive pricing |
| MC# | Motor Carrier number — FMCSA-issued operating authority identifier |
| OTRI | Outbound Tender Rejection Index — published by FreightWaves SONAR, measures % of electronic tenders rejected by carriers |
| PPI | Producer Price Index — published by BLS, used as a cost escalator in multi-year contracts |
| RMIS | Registry Monitoring Insurance Service — third-party carrier compliance monitoring platform |
| RFP | Request for Proposal — formal bid process for awarding freight lanes to carriers |
| SAFER | Safety and Fitness Electronic Records — FMCSA's public carrier database |
| SCAC | Standard Carrier Alpha Code — 2-4 letter identifier for each carrier |
| TMS | Transportation Management System — software for managing freight operations and carrier relationships |
