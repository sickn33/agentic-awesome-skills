# Decision Frameworks — Logistics Exception Management

This reference provides the detailed decision logic, scoring matrices, financial models,
and mode-specific resolution workflows for logistics exception management. It is loaded
on demand when the agent needs to make or recommend nuanced exception-handling decisions.

All thresholds, timelines, and cost assumptions reflect US domestic and international
freight operations across LTL, FTL, parcel, intermodal, ocean, and air modes.

---

## 1. Exception Severity Matrix

### 1.1 Scoring Methodology

Every incoming exception is scored across four dimensions. Each dimension produces a
score from 1 to 5. The **composite severity** equals the **highest single-dimension
score**, not the average — a shipment that scores 2/2/2/5 is a Level 5 exception
because a single critical dimension governs urgency.

After computing the raw composite, apply the **elevation modifiers** in §1.3 to
arrive at the effective severity, which caps at Level 5.

### 1.2 Full Severity Matrix

#### Dimension A — Financial Impact

| Level | Product Value at Risk | Expedite / Re-Ship Cost | Penalty Exposure | Typical Scenarios |
|-------|----------------------|------------------------|-----------------|-------------------|
| 1 — Minimal | < $1,000 | None or < $200 | None | Minor LTL shortage, single damaged carton, residential parcel delay |
| 2 — Moderate | $1,000–$5,000 | $200–$1,500 | Informal customer credit request likely | Multi-carton LTL damage, regional FTL delay 1–2 days, parcel loss with declared value |
| 3 — Significant | $5,000–$25,000 | $1,500–$8,000 | Contractual penalty triggers within 48 hrs | Full pallet damage, FTL delay into customer delivery window, ocean container shortage affecting production schedule |
| 4 — Major | $25,000–$100,000 | $8,000–$35,000 | Active penalty clause or chargeback imminent | Multi-pallet loss, air freight failure on critical launch shipment, reefer failure on full trailer of produce |
| 5 — Critical | > $100,000 | > $35,000 or no expedite option exists | Regulatory fine, contract termination risk, or litigation exposure | Full trailer loss/theft, ocean container of pharma with temp excursion, hazmat incident with EPA/DOT reporting obligation |

#### Dimension B — Customer Impact

| Level | Customer Tier | SLA Status | Business Impact to Customer | Typical Scenarios |
|-------|-------------|-----------|---------------------------|-------------------|
| 1 — Minimal | Standard / spot customer | No SLA or well within SLA window | Inconvenience only; customer has inventory buffer | Delay to distributor who carries 30-day stock |
| 2 — Moderate | Regular account | SLA at risk but not yet breached | Customer will notice, may request credit | Delivery misses requested date but within contractual tolerance |
| 3 — Significant | Key account (top 20%) | SLA breach within 24 hrs | Customer's operations impacted; regional stockout possible | Late delivery to DC feeding retail replenishment |
| 4 — Major | Enterprise / strategic account | SLA already breached or will breach today | Customer's production line slowed, retail launch compromised, or their customer is impacted | Automotive JIT delivery failure, retail holiday launch delay |
| 5 — Critical | Tier 1 enterprise or regulated customer | SLA breach + penalty clause triggered | Customer production shutdown, patient safety concern, or regulatory impact to customer | Pharma shipment to hospital, auto assembly plant line-down, government contract with liquidated damages |

#### Dimension C — Time Sensitivity

| Level | Available Recovery Window | Alternative Sourcing | Perishability | Typical Scenarios |
|-------|--------------------------|---------------------|--------------|-------------------|
| 1 — Minimal | > 5 business days before customer need-by | Multiple alternatives available | Non-perishable | Stock replenishment with safety stock in place |
| 2 — Moderate | 2–5 business days | Alternatives available but at premium cost | Non-perishable, but inventory turn pressure | Promotional inventory needed before event window |
| 3 — Significant | 24–48 hours | Limited alternatives, ground expedite still viable | Perishable with > 48 hrs remaining shelf life | Fresh produce with 5-day shelf life at day 3 |
| 4 — Major | < 24 hours | Air expedite only option | Perishable with < 48 hrs remaining shelf life, or time-definite service commitment | Temperature-sensitive biotech, next-day surgical supplies |
| 5 — Critical | No window — needed now | No alternative exists or product is custom/irreplaceable | Perishable with < 24 hrs, or already expired in transit | Transplant organs, custom-manufactured parts for shutdown line, court-ordered evidence delivery |

#### Dimension D — Regulatory / Safety

| Level | Regulatory Exposure | Safety Concern | Reporting Obligation | Typical Scenarios |
|-------|-------------------|---------------|---------------------|-------------------|
| 1 — None | No regulatory dimension | No safety concern | None | Standard dry freight, consumer goods |
| 2 — Low | Regulatory dimension exists but no violation | Potential quality concern, no safety risk | Internal documentation only | Cosmetics with minor packaging damage, electronics with cosmetic dents |
| 3 — Moderate | Potential regulatory inquiry if not documented properly | Quality compromise that could reach end consumer | Proactive notification to QA team; may require regulatory hold | Food products with cold chain deviation within acceptable range |
| 4 — High | Regulatory violation likely if product reaches market | Potential safety risk to end consumer or handler | Mandatory internal reporting to quality/regulatory within 4 hrs; potential voluntary recall | Pharma with temp excursion beyond validated range, dietary supplements with contamination exposure |
| 5 — Critical | Active regulatory violation; agency notification required | Immediate safety hazard | Mandatory external reporting (FDA, DOT, EPA, FMCSA) within hours; potential mandatory recall | Hazmat spill, pharma temp failure on life-saving medication, foodborne illness risk, leaking chemical container |

### 1.3 Elevation Modifiers

Apply these modifiers after computing the raw composite score. Elevation is additive
but caps at Level 5.

| Condition | Elevation |
|-----------|-----------|
| Customer is under active QBR (quarterly business review) period | +1 level |
| This is the 3rd+ exception on the same lane in 30 days | +1 level |
| Exception occurred on a shipment booked at premium/guaranteed service | +1 level |
| Carrier involved is under corrective action plan | +1 level |
| Shipment is for a new customer (first 90 days of relationship) | +1 level |
| Media or public visibility risk (e.g., branded trailer, viral social media) | +2 levels |
| Exception involves a shipment already recovering from a prior exception | +2 levels |

### 1.4 Severity-to-Action Mapping

| Effective Severity | Assigned To | Initial Response SLA | Customer Notification | Internal Notification | Review Cadence |
|-------------------|-------------|---------------------|----------------------|----------------------|---------------|
| Level 1 | Analyst (auto-assign) | 8 business hours | Only if customer inquires | None required | Daily batch review |
| Level 2 | Analyst (auto-assign) | 4 business hours | Proactive if delivery date affected | Team lead dashboard | Daily batch review |
| Level 3 | Senior analyst (manual assign) | 2 hours | Proactive with resolution timeline | Manager notification | Every 4 hours |
| Level 4 | Senior analyst + team lead | 1 hour | Immediate proactive call, then written follow-up | Director notification; account team briefed | Every 2 hours |
| Level 5 | Dedicated handler + manager direct oversight | 30 minutes | VP-to-VP or C-level communication path | VP notification within 1 hour; war-room if multiple Level 5s concurrent | Continuous until stabilized |

---

## 2. Financial Impact Calculation Model

### 2.1 Total Exception Cost Formula

```
Total Exception Cost (TEC) = Product Loss (PL)
                           + Expedite / Re-Ship Cost (ERC)
                           + Customer Penalties (CP)
                           + Administrative Processing Cost (APC)
                           + Relationship Damage Estimate (RDE)
                           + Downstream Ripple Cost (DRC)
```

### 2.2 Component Definitions and Assumptions

#### Product Loss (PL)

PL equals the lesser of (a) replacement cost at current wholesale or (b) original
invoice value, unless the customer contract specifies retail/resale valuation for
chargeback purposes.

- Damaged but salvageable: PL = invoice value × damage percentage. Use 25% for
  cosmetic-only damage, 50% for functional-but-impaired, 100% for unsalvageable.
- Shortage: PL = unit cost × units short.
- Full loss: PL = full invoice value including freight-in if FOB Origin.
- Temperature excursion: PL = full invoice value if excursion exceeds validated range.
  No partial credit on regulated products — it is all or nothing.

#### Expedite / Re-Ship Cost (ERC)

Standard cost multipliers against base freight cost:

| Expedite Method | Multiplier vs. Base Rate | Typical Lead Time | When to Use |
|----------------|------------------------|------------------|-------------|
| Ground re-ship (same mode) | 1.0–1.3× | Original transit time | Recovery window > 5 business days |
| Ground expedite (team driver / exclusive-use) | 2.5–4.0× | 40–60% of standard transit | Recovery window 2–5 business days, shipment > 150 lbs |
| LTL guaranteed (volume or guaranteed overnight) | 1.8–2.5× | Next-day to 2-day | Recovery window 1–3 days, shipment < 10,000 lbs |
| Domestic air (next-flight-out, NFO) | 6–12× | Same day or next morning | Recovery window < 24 hrs, shipment < 2,000 lbs |
| Domestic air charter | 15–30× | 4–8 hours | No commercial option fits; production shutdown imminent |
| International air (ex. ocean recovery) | 8–15× ocean base rate | 2–5 days vs. 25–40 days ocean | Recovery window < 2 weeks on ocean lane |
| Hotshot / sprinter van | Flat $2.50–$4.50 per mile | Depends on distance; ~500 mi/day | Small, urgent shipment (< 3,000 lbs); regional recovery |

Example: Base FTL rate Chicago to Dallas = $2,800. Customer needs delivery in 18 hours
instead of standard 2-day transit. Team driver expedite = $2,800 × 3.0 = $8,400.
Air NFO for 800 lbs at $0.85/lb = $680 freight + $150 handling = $830. Air is cheaper
if weight allows; FTL expedite is cheaper above roughly 4,000–5,000 lbs depending on lane.

#### Customer Penalties (CP)

| Penalty Type | Typical Range | Calculation |
|-------------|--------------|-------------|
| Retail chargeback (late delivery to DC) | $500 flat + $50–$150 per carton | Per retailer's vendor compliance guide |
| Retail chargeback (ASN/labeling error from re-ship) | $200–$1,000 flat | Often triggered by rush re-ships that bypass EDI integration |
| OTIF (On-Time In-Full) penalty | 3–8% of invoice value per occurrence | Walmart = 3% of COGS; other retailers vary |
| Production downtime reimbursement | $5,000–$50,000 per hour of line stoppage | Per manufacturing customer contract; automotive lines often $25K+/hr |
| Contractual SLA penalty | 1–5% of monthly freight spend per SLA breach | Cumulative; multiple breaches compound |
| Ad-hoc customer credit / goodwill | 5–15% of invoice as credit memo | Discretionary; used to preserve relationship when no formal penalty exists |

#### Administrative Processing Cost (APC)

Internal labor cost to manage the exception from intake to closure:

| Complexity Tier | Activities | Estimated Hours | Cost at $45/hr Fully Loaded |
|----------------|-----------|----------------|---------------------------|
| Tier 1 — Simple | Log, one carrier call, update customer, close | 1.5–2.5 hrs | $68–$113 |
| Tier 2 — Standard | Log, multiple carrier contacts, file claim, gather docs, customer updates, close | 4–8 hrs | $180–$360 |
| Tier 3 — Complex | All of Tier 2 + inspection coordination, multi-party dispute, escalation, legal review potential | 12–25 hrs | $540–$1,125 |
| Tier 4 — Litigation track | All of Tier 3 + legal engagement, deposition prep, expert witnesses | 40–100+ hrs | $1,800–$4,500+ (plus external legal at $250–$450/hr) |

#### Relationship Damage Estimate (RDE)

This is the hardest component to quantify. Use these heuristics:

- **New customer (< 6 months):** Exception during onboarding carries 3× the
  relationship weight. A $2,000 failure can cost a $500K annual account. RDE = 10–20%
  of estimated first-year revenue at risk of churn.
- **Stable customer (> 2 years):** Single exception rarely causes churn. RDE = 0–2%
  of annual revenue unless it is a pattern (3+ exceptions in 90 days, in which case
  treat as new-customer risk).
- **Customer under competitive bid:** Any exception during RFP evaluation period
  from a competitor. RDE = 25–50% of annual revenue at risk.

#### Downstream Ripple Cost (DRC)

Costs that propagate beyond the immediate exception:

- Inventory reorder disruption: If exception causes safety-stock depletion, the
  replenishment order will be rushed. Estimate 1.5× standard inbound freight for
  the replenishment cycle.
- Warehouse receiving disruption: Unexpected returns, re-deliveries, or inspection
  holds consume dock door time. Estimate $150–$300 per unplanned dock appointment.
- Customer service call volume: Each exception generates 2–5 inbound customer
  inquiries. At $8–$12 per call (including agent time and overhead), that is
  $16–$60 per exception.
- Reporting and analytics overhead: Carrier scorecards, root cause analysis
  meetings, and corrective action documentation. Estimate 1–3 hours per qualifying
  exception at $45/hr.

### 2.3 Worked Examples

#### Example A — LTL Damage, Mid-Value

Shipment: 6 pallets of consumer electronics, Chicago to Atlanta.
Invoice value: $18,500. One pallet fork-punctured at origin terminal.

```
PL  = $18,500 × (1/6 pallets) × 100% (unsalvageable)         = $3,083
ERC = Re-ship 1 pallet via LTL guaranteed 2-day: $650          = $650
CP  = Retailer OTIF penalty: $18,500 × 3% = $555
      (only if re-ship misses must-arrive-by date)             = $555
APC = Tier 2 standard claim: ~6 hrs × $45                      = $270
RDE = Stable customer, isolated incident: ~0%                   = $0
DRC = 3 customer service calls × $10                            = $30
---
TEC = $3,083 + $650 + $555 + $270 + $0 + $30                  = $4,588
```

Decision: File claim for $3,083 product value + $650 re-ship cost = $3,733 carrier
liability claim under Carmack. Customer penalty is shipper's loss unless carrier
proximate cause can support consequential damages (unlikely under standard BOL terms).

#### Example B — FTL Total Loss, High-Value

Shipment: Full truckload of medical devices, Memphis to Los Angeles.
Invoice value: $285,000. Shipment not delivered, no scans for 72 hours, presumed stolen.

```
PL  = $285,000 (full invoice)                                  = $285,000
ERC = Air charter for replacement: $48,000                      = $48,000
CP  = Hospital contract: 2 days production delay at $12,000/day = $24,000
APC = Tier 4 (theft investigation + legal): ~60 hrs × $45
      + external legal ~20 hrs × $350                           = $9,700
RDE = Strategic account in first year: 15% × $1.2M annual rev  = $180,000
DRC = Safety stock depletion replenishment, expedited inbound   = $8,500
---
TEC = $285,000 + $48,000 + $24,000 + $9,700 + $180,000 + $8,500 = $555,200
```

Decision: Level 5 severity. Immediate VP notification. Law enforcement report filed.
Carrier cargo insurance claim ($100K per occurrence typical — will not cover full
loss). Shipper's all-risk cargo policy for excess. Customer air-chartered at shipper
expense while claims are pursued. Consider consequential damages claim if carrier
was negligent in vetting driver or equipment.

#### Example C — Eat-the-Cost Decision

Shipment: 2 cartons of office supplies, parcel ground, value $380.
One carton crushed, contents destroyed.

```
PL  = $190 (one carton)                                        = $190
ERC = Re-ship via ground: $12                                   = $12
CP  = None (internal office supply order)                       = $0
APC = Tier 1 if filed: 2 hrs × $45                             = $90
RDE = N/A (internal)                                            = $0
DRC = None                                                      = $0
---
TEC = $190 + $12 + $0 + $90 + $0 + $0                         = $292

Potential claim recovery: $190 (carrier liability)
Filing cost: $90 (internal processing)
Net recovery: $190 - $90 = $100
```

Decision: Marginal. File only if parcel carrier has automated claims portal with < 15
minutes processing time. Otherwise absorb and log for quarterly carrier review.

---

## 3. Carrier Response Decision Tree

### 3.1 Path A — Cooperative Carrier

The carrier acknowledges the exception, provides updates, and works toward resolution.
This is the expected path with contracted carriers in good standing.

| Checkpoint | Action | Expected Carrier Response | If Response is Inadequate |
|-----------|--------|--------------------------|--------------------------|
| 0 hrs (intake) | Send initial exception notice via carrier portal or email with PRO#, BOL#, description of exception, requested action, and response deadline | Acknowledgment within 1 hour during business hours | Move to Path B at 2 hrs |
| 2 hrs | Verify carrier acknowledgment received; confirm they have assigned the exception internally | Carrier provides case/reference number and assigned handler name | Escalate to carrier's operations supervisor; send second notice with "Escalation" in subject |
| 4 hrs | Request status update — what has the carrier done so far, what is the plan, what is the revised ETA or inspection timeline | Specific plan with timeline: "Driver ETA 6pm" or "Inspector scheduled tomorrow AM" | Call carrier's account representative (not just dispatch). Document that operational channel is unresponsive |
| 8 hrs | Evaluate progress against carrier's stated plan. If delivery exception: is shipment moving? If damage: is inspection scheduled? | Tangible progress — updated tracking, inspection confirmed, driver checked in | Formal escalation email to carrier VP of Operations or regional director. CC your procurement/carrier management team |
| 24 hrs | Full status review. For delays: confirm revised delivery date. For damage/loss: confirm claim documentation in progress | Delivery completed, or inspection done and claim packet received, or clear revised timeline with daily updates committed | If still unresolved: initiate backup carrier for re-ship (do not wait longer). File formal carrier complaint in carrier management system |
| 48 hrs | Resolution or near-resolution expected for cooperative carriers | Claim acknowledged and in processing, or delivery completed with exception closed | Carrier performance review triggered. Procurement notified for quarterly scorecard impact |
| 72 hrs | Any open delay or loss should be fully resolved or in active claim processing | Claim payment timeline provided (30/60/90 day), or shipment delivered and exception closed | Consider carrier probation for new shipments on this lane |

### 3.2 Path B — Unresponsive Carrier

The carrier is not intentionally difficult but is not responding — dispatch is
overwhelmed, claims department is backed up, or the contact information is wrong.
Common with smaller asset carriers and during peak season.

| Checkpoint | Action | Objective | Escalation |
|-----------|--------|-----------|-----------|
| 0–2 hrs | Standard notice sent, no response received | Establish contact | Try all available channels: portal, email, phone. If broker-arranged shipment, contact broker AND underlying carrier |
| 2 hrs | Call carrier dispatch directly. If no answer, leave voicemail with your callback number and shipment references. Send follow-up email with "URGENT — Response Required" subject | Get any human response | If broker-arranged: put broker on notice that their carrier is unresponsive. Broker has contractual obligation to manage their carrier |
| 4 hrs | Second call to dispatch. Try driver's cell if available (from BOL or load confirmation). Contact carrier's safety/compliance department (different phone tree) as alternative entry point | Any status information | Notify your team lead. Begin contingency planning for re-ship or alternative resolution |
| 8 hrs | Three-channel blitz: call dispatch, email operations manager (find on carrier's website or LinkedIn), send formal notice via certified email or fax referencing carrier's MC/DOT number | Formal documentation of non-response | Authorize re-ship or expedite without waiting for carrier. Send carrier a "Notice of Non-Response" documenting all contact attempts with timestamps |
| 24 hrs | Final notice: "You have 24 hours to respond before we process this as an uncontested claim and adjust payment on open invoices" | Force response through financial leverage | Place freight payment hold on carrier's open invoices (coordinate with AP). File claim based on available documentation. Report to carrier management for immediate lane review |
| 48 hrs | If still no response, treat as abandoned. Process claim against carrier's cargo insurance (contact their insurer directly if you have the policy info from onboarding). If shipment is still in transit/unknown: report to FMCSA for potential out-of-service carrier | Full recovery mode | Remove carrier from active routing guide. Escalate to your legal team if claim value > $10,000 |
| 72 hrs | Formal demand letter from legal or via registered mail citing specific claim amount and legal basis (Carmack for domestic). 30-day response deadline per 49 CFR § 370.9 | Legal posture established | Begin preparation for small claims (< $10K) or federal court filing if value warrants |

### 3.3 Path C — Adversarial Carrier

The carrier denies liability, provides false information, disputes documentation,
or acts in bad faith. This includes situations where the carrier's claims department
issues a blanket denial without investigating.

| Checkpoint | Action | Documentation Priority | Escalation |
|-----------|--------|----------------------|-----------|
| 0 hrs (denial received) | Review denial letter/email line by line. Identify the specific basis for denial (act of shipper, inherent vice, act of God, packaging, etc.) | Preserve all original documentation. Screenshot carrier portal status history before it can be altered | Assign to senior analyst or claims specialist, not junior staff |
| 2 hrs | Draft point-by-point rebuttal addressing each denial reason with documentary evidence. Under Carmack, once shipper proves three elements (good condition at tender, damaged at delivery, damages amount), burden shifts to carrier | Organize evidence package: clean BOL, exception-noted POD, photos, packing specs, weight certificates, temperature logs | Brief team lead on denial and planned rebuttal strategy |
| 4 hrs | Send formal rebuttal via email and carrier portal with all supporting evidence attached. Request "reconsideration of claim denial" and cite specific regulatory basis for carrier liability | Send via method that provides delivery confirmation. Keep copies of everything sent | If denial is clearly frivolous (e.g., "act of God" for a forklift puncture), notify carrier's account manager that denial is damaging the relationship |
| 8 hrs | If carrier reaffirms denial: request the carrier's specific evidence supporting their defense. Under 49 CFR § 370.7, carrier must conduct a reasonable investigation before denying | Log all communications with exact timestamps. Note any inconsistencies between carrier's stated reasons and available evidence | Notify your manager and procurement. Begin calculating whether litigation cost is justified vs. claim value |
| 24 hrs | Escalate to carrier's VP of Claims or General Counsel with a summary letter: claim facts, evidence, legal basis, prior communications timeline, and a settlement demand | Prepare a claim file that is litigation-ready even if you hope to settle: chronological narrative, evidence index, damages calculation, legal authority summary | Procurement to issue formal notice of dispute to carrier's sales team. Separate the business relationship discussion from the claims dispute |
| 48 hrs | If no movement: engage third-party claims service or freight claims attorney for demand letter on legal letterhead. Cost: typically $500–$1,500 for demand letter, contingency fee of 25–33% if litigation needed | Provide complete file to outside counsel. Flag any potential weaknesses in your case (late filing, incomplete POD, packaging shortfalls) | Consider whether the carrier's business overall is worth preserving. If annual spend < claim value, this may be the last shipment regardless |
| 72 hrs+ | Decision point: litigate, settle at a discount, or absorb. See §9 Eat-the-Cost Analysis for framework | Final evidence review and case assessment | VP-level decision on litigation vs. settlement vs. walk-away |

### 3.4 Special Situation — Carrier Goes Dark Mid-Shipment

When a carrier stops responding and the freight is in transit (not yet delivered):

1. **Hour 0–1:** Attempt all contact channels (dispatch, driver cell, broker if applicable, carrier safety department). Check last known GPS/ELD position if available through your TMS integration or load-tracking platform.

2. **Hour 1–4:** Contact the carrier's insurance company to verify the policy is active. If brokered, demand the broker provide proof of last contact with the driver and GPS coordinates. If no GPS data available and shipment is high-value (> $50K), consider engaging a freight recovery service.

3. **Hour 4–8:** If high-value or theft indicators present (carrier is new, load was double-brokered, pickup was in a high-theft corridor like Los Angeles, Memphis, Dallas, or the I-10/I-95 corridors): file a report with local law enforcement in the jurisdiction of last known location. Notify CargoNet or FreightWatch if you have a subscription.

4. **Hour 8–24:** If the carrier is a broker's carrier: put the broker on formal notice that they are liable for the full shipment value. If the carrier is your contracted carrier: activate your contingency carrier for the lane and begin re-shipping replacement product.

5. **Hour 24+:** Treat as presumed theft/loss. File formal claim. Notify your cargo insurance underwriter. Do not wait for "certainty" — the claim clock starts ticking.

---

## 4. Claims Filing Decision Framework

### 4.1 File vs. Absorb vs. Negotiate Pre-Claim

The decision to file a formal claim is not automatic. Each path has costs and trade-offs.

#### Decision Matrix

| Scenario | Recommended Path | Rationale |
|----------|-----------------|-----------|
| Claim value < $250, carrier has self-service portal | File via portal (< 15 min effort) | Automated filing cost is near-zero; builds claims history for scorecard |
| Claim value < $500, no portal, good carrier relationship | Absorb, log for scorecard | APC exceeds likely net recovery. Mention informally to carrier rep at next review |
| Claim value $500–$2,500, clear carrier liability | Negotiate pre-claim: call carrier and propose a freight credit or invoice deduction | Faster resolution (days vs. months), preserves relationship, avoids formal claims overhead |
| Claim value $500–$2,500, disputed liability | File formal claim with documentation | Dispute needs formal record; informal negotiation without documentation weakens your position |
| Claim value $2,500–$10,000 | File formal claim regardless of circumstances | Value justifies APC and relationship friction. Negotiate settlement only above 75% of claimed amount |
| Claim value > $10,000 | File formal claim + involve senior management + legal awareness | Financial materiality threshold. Full documentation package. Independent inspection for damage claims. Accept settlement only above 85% or with strong business justification |
| Any amount, 3rd+ claim against same carrier in 90 days | File formal claim AND trigger carrier performance review | Pattern indicates systemic issue; formal filing creates the record needed for contract renegotiation or termination |
| Any amount, possible fraud indicators | File formal claim + notify compliance + preserve all evidence | Even small-dollar fraud must be documented. Patterns emerge only when individual incidents are formally recorded |

#### ROI Calculation for Filing

```
Net Claim ROI = (Claim Amount × Probability of Recovery) - APC

where:
  Claim Amount     = documented loss value (PL + ERC if carrier-caused)
  Probability of Recovery = see §4.2 below
  APC              = administrative processing cost from §2.2
```

File when Net Claim ROI > $0 and the ratio (Net Claim ROI / Claim Amount) > 15%.
Below 15% net margin on the claim, the organizational cost-of-attention often
exceeds the financial benefit unless the claim builds a needed pattern record.

### 4.2 Probability of Recovery by Carrier Type and Claim Type

These recovery rates reflect industry experience across hundreds of thousands of
claims. Adjust ±10% based on your specific carrier relationships and documentation
quality.

| Carrier Type | Damage (visible, noted on POD) | Damage (concealed) | Shortage (noted at delivery) | Full Loss | Delay (service failure) |
|-------------|-------------------------------|-------------------|----------------------------|----------|----------------------|
| National LTL (FedEx Freight, XPO, Estes, ODFL) | 80–90% | 40–55% | 70–80% | 85–95% | 15–25% (unless guaranteed service) |
| Regional LTL | 70–85% | 30–45% | 60–75% | 75–85% | 10–20% |
| Asset FTL carrier (large fleet) | 75–90% | 35–50% | 65–80% | 80–90% | 20–35% |
| Small FTL carrier (< 50 trucks) | 55–70% | 20–35% | 45–60% | 50–65% | 5–15% |
| Broker-arranged FTL | 60–75% | 25–40% | 50–65% | 60–75% | 10–20% |
| Parcel (UPS, FedEx, USPS) | 70–85% | 45–60% | 60–75% | 80–90% | 30–50% (guaranteed service) |
| Ocean (FCL) | 30–50% | 15–25% | 40–55% | 60–75% | < 5% |
| Ocean (LCL) | 25–40% | 10–20% | 30–45% | 50–65% | < 5% |
| Air freight (direct with airline) | 65–80% | 35–50% | 55–70% | 75–85% | 20–35% |
| Air freight (via forwarder) | 55–70% | 25–40% | 45–60% | 65–80% | 15–25% |

### 4.3 Documentation Checklist by Claim Type

#### Damage Claim — All Modes

Required:
- [ ] Original BOL (signed, showing clean receipt by carrier at origin)
- [ ] Delivery receipt / POD (showing exception notation — "damaged," "crushed," specific description)
- [ ] Photographs: minimum 4 views (overview of shipment, close-up of damage, packaging condition, label/PRO visible)
- [ ] Commercial invoice showing product value
- [ ] Packing list showing piece count and descriptions
- [ ] Written description of damage (what is damaged, extent, whether repairable)
- [ ] Repair estimate or replacement quote from vendor
- [ ] Packaging specifications (demonstrates product was packaged appropriately for the mode)

Strongly recommended:
- [ ] Weight certificate at origin (proves correct weight tendered)
- [ ] Inspection report from independent surveyor (required for claims > $10,000 or disputed claims)
- [ ] Temperature recorder data (for any temperature-sensitive product)
- [ ] Photos from origin showing product in good condition at loading
- [ ] Carrier inspection report (request from carrier's OS&D department)

#### Shortage Claim

Required:
- [ ] Original BOL showing piece count tendered
- [ ] Delivery receipt showing piece count received (discrepancy noted)
- [ ] Commercial invoice for shorted product
- [ ] Packing list with serial numbers or lot numbers if available
- [ ] Written description: how many pieces short, which items, value per item

Strongly recommended:
- [ ] Loading photos/video showing correct count at origin
- [ ] Seal numbers (origin seal vs. delivery seal — different seal = carrier liability strong)
- [ ] Weight certificate at origin vs. weight at delivery (weight discrepancy corroborates shortage)
- [ ] Security camera footage from dock (if available and shipment is high-value)

#### Loss Claim (Full Shipment)

Required:
- [ ] Original BOL (proves tender to carrier)
- [ ] Carrier pickup confirmation / signed pickup receipt
- [ ] Commercial invoice (full shipment value)
- [ ] Packing list (complete contents)
- [ ] Formal tracer request filed with carrier (with carrier's response or non-response documented)
- [ ] Proof of non-delivery: customer confirmation that product was never received

Strongly recommended:
- [ ] GPS/tracking history showing last known position
- [ ] Law enforcement report (if theft suspected)
- [ ] Carrier's insurance certificate (to file directly against insurer if carrier is unresponsive)
- [ ] Evidence of carrier tender acceptance and load confirmation

#### Delay Claim (Service Failure)

Required:
- [ ] Original BOL showing agreed pickup and delivery dates
- [ ] Service level documentation (rate confirmation, routing guide showing guaranteed service)
- [ ] Tracking history showing actual delivery date/time
- [ ] Proof of financial loss caused by delay (penalty invoice, expedite receipt, lost sales documentation)

Strongly recommended:
- [ ] Customer correspondence showing delivery commitment that was based on carrier's service
- [ ] Evidence that delay was not caused by shipper or consignee (no appointment changes, dock available)
- [ ] Documentation of mitigation efforts (you tried to minimize the loss)

### 4.4 Mode-Specific Filing Requirements

#### US Domestic Surface — Carmack Amendment (49 USC § 14706)

- **Jurisdiction:** All domestic surface transportation by motor carriers and freight forwarders operating under FMCSA authority.
- **Filing deadline:** 9 months from date of delivery (or reasonable delivery date for non-delivery claims).
- **Statute of limitations for litigation:** 2 years from the date the carrier disallows the claim.
- **Carrier liability standard:** Carrier is strictly liable for actual loss, damage, or injury to goods. Carrier defenses: act of God, public enemy, act of shipper, public authority, inherent nature of goods.
- **Shipper's burden:** (1) Goods were in good condition when tendered. (2) Goods were damaged/lost/short at destination. (3) Amount of damages.
- **Limitation of liability:** Carriers may limit liability via released rates (lower rate in exchange for lower liability cap). Check your rate confirmation and BOL for released value clauses. If you did not agree to a released rate, full actual value applies.
- **Filing method:** Written claim in any reasonable form that (a) identifies the shipment, (b) asserts liability, and (c) demands payment of a specific amount. 49 CFR § 370.3.
- **Carrier response obligation:** Must acknowledge within 30 days. Must pay, decline, or make a firm settlement offer within 120 days. 49 CFR § 370.9.

#### Ocean — Carriage of Goods by Sea Act (COGSA) / Hague-Visby Rules

- **Jurisdiction:** International ocean shipments to/from US ports (COGSA); most international ocean shipments (Hague-Visby).
- **Filing deadline:** Written notice of damage within 3 days of delivery (visible damage) or 3 days after delivery ends (concealed damage) under COGSA. Failure to give notice creates a presumption that goods were delivered in good condition — it does not bar the claim, but shifts the burden of proof.
- **Statute of limitations:** 1 year from delivery date (COGSA). This is a hard deadline — cannot be extended without carrier agreement.
- **Carrier liability standard:** Carrier is liable unless they prove one of 17 enumerated exceptions (perils of the sea, act of God, insufficiency of packing, etc.). Burden of proof is complex and shifting.
- **Liability limit:** $500 per package or customary freight unit (COGSA). SDR 666.67 per package or SDR 2 per kg gross weight, whichever is higher (Hague-Visby). Higher value must be declared on the bill of lading before shipment.
- **Critical documentation:** Ocean bill of lading, survey report at discharge port (hire a marine surveyor — typical cost $800–$2,500 depending on port), container inspection report, seal integrity evidence, reefer download data for temperature-controlled.

#### Air — Montreal Convention (International) / Air Cargo Act (Domestic US)

- **Jurisdiction:** International air carriage (Montreal Convention); domestic US air freight is governed by the air waybill terms and applicable contract law.
- **Notice deadline:** 14 days from receipt for damage claims. 21 days from delivery date for delay claims. These deadlines are strictly enforced — missing them is a complete bar to the claim.
- **Statute of limitations:** 2 years from date of arrival or from the date the aircraft ought to have arrived.
- **Liability limit:** 22 SDR per kilogram (~$30/kg, fluctuates with exchange rates). Higher value must be declared on the air waybill. Most airlines offer declared-value surcharges of 0.5–0.75% of excess value.
- **Filing method:** Written complaint to the airline or handling agent. Include air waybill number, flight numbers, claim details, and damage documentation.
- **Key nuance:** Ground handling agents (the companies that physically handle freight at airports) cause the majority of air freight damage, but the airline is liable to the shipper under Montreal Convention. The airline then has a subrogation claim against the handler.

---

## 5. Mode-Specific Resolution Workflows

### 5.1 LTL Damage Resolution

#### 5.1.1 Terminal-Caused Damage

Damage occurring at carrier's terminal during cross-dock operations (forklift
damage, stacking failures, improperly loaded onto delivery trailer).

**Indicators:** Damage pattern consistent with handling (fork punctures, crush from
top-loading, stretch wrap torn with product exposed). Often discovered at delivery
terminal or by consignee.

**Resolution Workflow:**

1. **Consignee documents on POD** — specific notation: "2 of 6 pallets crushed,
   product visible through torn packaging." Generic "damaged" is insufficient for
   strong claims.
2. **Photograph at delivery** — minimum 6 photos: overall shipment, each damaged
   unit, packaging failure point, freight label/PRO visible in frame, floor of
   trailer showing debris.
3. **Request carrier terminal inspection** — call the delivering terminal directly
   (not the 800-number). Ask for the OS&D clerk or terminal manager. Request that
   damaged freight be held for inspection, not sent to salvage.
4. **File claim within 48 hours** — terminal damage claims have highest recovery
   rates (80–90%) because the carrier knows their terminal caused it. Do not delay.
5. **If partial damage** — request carrier's salvage bid. Carriers sometimes offer
   to sell damaged freight at auction and credit the difference. Evaluate whether the
   salvage value is fair; reject lowball salvage bids (common tactic to reduce claim
   payout).
6. **Settlement expectation** — terminal-caused damage should settle at 85–100%
   of invoice value within 60 days. If carrier offers less than 75%, escalate to
   carrier's claims manager with terminal inspection evidence.

#### 5.1.2 Transit Damage

Damage occurring during over-the-road transit (shifting loads, hard braking, trailer
accident, weather infiltration through damaged trailer roof/walls).

**Indicators:** Product shifted within packaging, load bars displaced, multiple
pallets damaged in the same direction (forward movement = hard stop).

**Resolution Workflow:**

1. **Determine if damage is from a known incident** — ask carrier dispatch: "Was
   there any reported incident involving this trailer in transit?" Carriers are
   required to log accidents, but minor incidents (hard braking, pothole impact)
   often go unreported.
2. **Document loading condition evidence** — if you have photos from loading dock
   showing freight was properly loaded, secured with load bars/straps, and braced
   appropriately, your claim is significantly stronger.
3. **Weigh the shipment** — if you can get a weight ticket from a scale near the
   delivery point, compare to the origin weight ticket. Significant discrepancy
   combined with damage suggests freight shifted or fell off a pallet.
4. **File claim within 5 business days** — transit damage is moderately strong for
   the shipper (70–85% recovery). Carrier will investigate with the driver and
   potentially dispute if they believe packaging was insufficient.
5. **Common carrier defense** — "Inadequate packaging." Counter with: packaging
   specifications from the manufacturer, ISTA or ASTM test results if available,
   and evidence that the same packaging has shipped successfully on this lane before
   without damage.
6. **Settlement expectation** — 60–85% of invoice value within 90 days. Transit
   damage claims often involve more back-and-forth than terminal damage.

#### 5.1.3 Loading Damage (Origin)

Damage caused during pickup when the carrier's driver or dock workers load the
freight onto the trailer.

**Indicators:** Driver signs clean BOL at origin. Damage discovered at first
cross-dock terminal or at delivery. Damage pattern consistent with improper
stacking, dropping during loading, or trailer incompatibility (e.g., product loaded
in a trailer with protruding floor nails).

**Resolution Workflow:**

1. **Check for driver exception notations on pickup BOL** — if the driver noted
   "shipper load and count" (SL&C), carrier will argue they are not liable for
   how the product was loaded. SL&C is the shipper's enemy on damage claims. If
   your dock loaded the trailer while the driver was in the office, this notation
   is legitimate and weakens your claim.
2. **If carrier's driver loaded** — your claim is strong. Document that your dock
   staff witnessed proper product condition before loading and that the carrier's
   driver conducted the loading.
3. **First-terminal inspection** — if damage is discovered at the first terminal,
   request photos from the terminal before freight is further handled. This narrows
   the damage window to pickup-to-first-terminal.
4. **File claim within 5 business days** — include the clean-signed BOL from origin
   and the exception-noted delivery receipt.
5. **Settlement expectation** — 70–85% if you can prove damage occurred during
   carrier loading. Under 50% if SL&C was notated and you cannot prove carrier
   handling caused the damage.

### 5.2 FTL Delay Resolution

#### 5.2.1 Driver-Caused Delay

Late pickup, wrong routing, hours-of-service (HOS) violation forcing a rest stop,
driver no-show.

**Resolution Workflow:**

1. **Hour 0 (delay identified):** Contact dispatch. Get the driver's current
   location, reason for delay, and revised ETA. If driver no-showed at origin:
   demand a replacement driver or tractor within 2 hours, or you are tendering
   to backup carrier.
2. **Hour 2:** If revised ETA is within customer tolerance, monitor. If not:
   calculate whether a team driver can recover the schedule. Team driver cost adder
   is typically $0.25–$0.40/mile on top of the base rate.
3. **Hour 4:** If delay will cause a customer miss: authorize the team driver or
   arrange backup carrier from the driver's current location. The original carrier
   is responsible for the deadhead to the driver's current location (demand credit
   or refuse to pay for the partial haul).
4. **Hour 8+:** If carrier cannot recover the shipment and you have re-tendered to
   a backup carrier: deduct the expedite cost difference from the original carrier's
   open invoices. Document everything for the debit.
5. **Post-resolution:** Record the service failure in the carrier scorecard. If
   this is a pattern (2+ HOS-driven delays from same carrier in 60 days), their
   fleet management and driver scheduling practices need review.

#### 5.2.2 Mechanical Breakdown

Tractor or trailer breakdown in transit.

**Resolution Workflow:**

1. **Hour 0:** Carrier should notify you proactively per contract terms. If you
   discover via tracking: call dispatch immediately.
2. **Assess repair timeline:** If carrier says "truck will be repaired in 2 hours"
   — accept and monitor. If > 4 hours or uncertain: demand the carrier power-swap
   (send a replacement tractor to the breakdown location). Major carriers can
   power-swap within 2–4 hours in most metro areas.
3. **Reefer breakdown:** If reefer unit fails on a temperature-sensitive load, this
   becomes a product quality issue, not just a delay. Request the carrier download
   the reefer unit data log immediately. If ambient temperature is > 40°F and
   product is cold-chain: begin contingency for product replacement within 2 hours
   of reefer failure confirmation.
4. **Carrier liability for mechanical:** Carrier is generally liable for delays caused
   by mechanical failure — it is not "act of God." However, contractual terms may
   exclude or limit delay liability. Check your carrier agreement.
5. **Cost allocation:** Carrier should absorb any power-swap costs and incremental
   transit cost. If you had to re-tender to a backup carrier, deduct the cost
   difference from the original carrier.

#### 5.2.3 Weather Delay

Legitimate severe weather (winter storms, hurricanes, flooding, tornado activity)
that prevents safe transit.

**Resolution Workflow:**

1. **Verify the weather event** — check NOAA and FMCSA road condition reports for
   the specific route. Carriers sometimes claim "weather" for a light rain. The
   delay must be proportional to the actual event severity.
2. **Determine if the delay was avoidable** — if the weather was forecasted 48+
   hours in advance and the carrier could have routed around it or departed earlier:
   this is a planning failure, not force majeure. Challenge the carrier's defense.
3. **Customer communication** — notify immediately with the weather event details
   and revised ETA. Customers generally understand weather delays if communicated
   proactively. Do not wait until the delivery window expires to notify.
4. **Cost allocation** — true force majeure: neither party at fault. Carrier is not
   liable for delay. Shipper cannot deduct. Expedite costs after the weather clears
   are negotiable — the carrier should prioritize your shipment for recovery without
   charging a premium. If they try to charge expedite rates for post-weather recovery,
   push back.
5. **Pattern recognition** — if a lane experiences 3+ weather delays per season
   (e.g., Denver to Salt Lake City in January), build weather buffers into your
   transit time commitments for that lane rather than treating each as an exception.

#### 5.2.4 Capacity-Driven Delay

Carrier accepted the tender but cannot cover it — no driver available. Common during
peak season and month-end volume spikes.

**Resolution Workflow:**

1. **Hour 0 (carrier notifies or fails to cover):** Do not wait. Immediately
   re-tender to backup carriers. Do not give the primary carrier "until end of day"
   — capacity tightens as the day progresses. Every hour of delay reduces your
   options.
2. **Hour 2:** If primary carrier has not confirmed a driver: they have effectively
   rejected the tender. Re-tender to backup or spot market. The primary carrier
   owes you nothing for the delay (they did not pick up the freight), but you should
   record the service failure as a tender acceptance failure.
3. **Spot market premium:** If you must go to the spot market, the premium over
   contract rate is your loss. Track this as "tender rejection cost" in carrier
   scorecards. Typical spot premiums: 15–40% in normal market, 50–150% during
   peak events or regional disruptions.
4. **Contractual leverage:** If your carrier contract has tender acceptance minimums
   (e.g., 90% acceptance rate), document every failure. Aggregate for quarterly
   review. Carriers who repeatedly accept tenders and then fail to cover are worse
   than carriers who reject upfront — they destroy your ability to plan.

### 5.3 Parcel Loss Resolution

#### 5.3.1 Ground Parcel Loss

**Resolution Workflow:**

1. **Day 1 past expected delivery:** Check tracking. If status is "delivered" but
   customer says not received: request proof of delivery (signature, GPS stamp, photo).
   If no GPS/photo evidence, the carrier's "delivered" scan is insufficient.
2. **Day 2:** File online tracer through carrier portal. UPS: 1 business day for
   tracer investigation. FedEx: 1–2 business days. USPS: mail search request, allow
   5–10 business days.
3. **Day 3–5:** If tracer comes back "unable to locate": file formal claim through
   carrier portal.
4. **Day 5–10:** Re-ship replacement to customer. Do not wait for claim resolution
   to keep the customer whole.
5. **Claim processing:** UPS and FedEx typically resolve parcel claims within 5–8
   business days of filing. USPS: 30–60 days. Ensure declared value was purchased
   at time of shipping — default coverage is $100 (UPS/FedEx) or $50 (USPS Priority).
6. **If claim denied:** Most common denial reason is "insufficient declared value."
   If you declared the correct value at shipping, escalate. If you did not declare
   sufficient value, the recovery is capped at the default limit regardless of
   actual product value. This is an expensive lesson — ensure high-value parcel
   shipments always have declared value coverage.

#### 5.3.2 Air Parcel Loss (Next-Day/2-Day)

Same workflow as ground with these adjustments:
- Tracer filing is faster: file same day as missed delivery. Guaranteed service
  means the carrier prioritizes the investigation.
- Money-back guarantee: for late delivery on guaranteed services, file for full
  shipping cost refund regardless of whether the product arrives the next day. This
  is separate from a loss claim.
- UPS and FedEx each have automated money-back guarantee claim portals. For late
  NDA (Next Day Air), the refund is the full air shipping cost. These refunds can
  be significant on heavy or multi-package shipments.

#### 5.3.3 International Parcel Loss

- Customs holds are the most common cause of apparent "loss" in international parcel.
  Check customs status before filing a tracer.
- International parcel claims involve both the origin country carrier and the
  destination country carrier (or postal service). Filing is through the origin
  carrier.
- Liability is governed by the Universal Postal Convention (for postal services)
  or the carrier's tariff (for UPS/FedEx/DHL international). UPS international
  declared value cap is $50,000.
- Allow 30–90 days for international claim resolution due to multi-country
  investigation requirements.
- For DDP (Delivered Duty Paid) shipments, you are responsible for duties/taxes
  as part of the shipment value. Include these in the claim amount.

### 5.4 Ocean Container Shortage Resolution

#### 5.4.1 FCL (Full Container Load) Shortage

Container delivered with fewer pieces than the packing list, despite the container
seal being intact (or seal being different from the origin seal).

**Resolution Workflow:**

1. **At container unload:** Count every piece before signing the delivery receipt.
   If the container is being unloaded at a CFS (Container Freight Station), ensure
   the CFS provides a tally sheet.
2. **Check the seal:** Compare the seal number on the container door to the seal
   number on the bill of lading. If they match and are intact: the shortage likely
   occurred at the origin (stuffing error). Carrier liability is weak — this is
   a shipper/origin warehouse issue. If the seal is broken or does not match: carrier
   liability is strong. Photograph the seal immediately.
3. **File notice of shortage within 3 days** (COGSA requirement for concealed
   shortage). File with the ocean carrier AND the party who delivered the container
   (drayage company or terminal).
4. **Hire a marine surveyor** if the shortage value exceeds $5,000. The surveyor's
   report is the gold standard evidence for ocean claims. Cost: $800–$2,500
   depending on the port and survey complexity.
5. **Claim filing:** File against the ocean carrier under the bill of lading terms.
   If the BL incorporates COGSA, liability is capped at $500 per package (a "package"
   in FCL is typically interpreted as each carton, not the container). If you declared
   a higher value on the BL, the higher value applies.
6. **Recovery expectation:** FCL shortages with matching intact seals: 20–35%
   recovery (carrier argues origin stuffing error). FCL shortages with broken/mismatched
   seals: 65–80% recovery.

#### 5.4.2 LCL (Less than Container Load) Shortage

Product consolidated with other shippers' freight in a shared container. Shortages
are more common due to additional handling at CFS facilities at both origin and
destination.

**Resolution Workflow:**

1. **At CFS pickup/delivery:** Verify piece count against the house bill of lading
   (not the master BL, which covers the full container). Annotate any discrepancy
   on the CFS tally sheet and delivery receipt.
2. **Identify the shortage point:** Was the shortage at origin CFS (loaded fewer
   pieces), in transit, or at destination CFS (pieces misallocated to another
   consignee's lot)? Request the CFS tally reports from both origin and destination.
3. **Check for cross-allocation:** In LCL, your cargo may have been mistakenly
   delivered to another consignee in the same container. Request the destination
   CFS check all lots from the same container for over-shipment.
4. **File claim with the NVOCC or freight forwarder** who issued your house bill
   of lading. They are your contracting party. They will subrogate against the ocean
   carrier or CFS operator as appropriate.
5. **Recovery expectation:** LCL shortage claims take longer (90–180 days) and
   recover at lower rates (30–50%) due to the difficulty of proving where in the
   multi-handler chain the shortage occurred.

### 5.5 Air Freight Damage Resolution

#### 5.5.1 Airline Handling Damage

Damage caused by the airline's cargo handling team during loading, transit, or
unloading of the aircraft.

**Resolution Workflow:**

1. **At pickup from airline cargo terminal:** Inspect all pieces before signing the
   cargo release. Note any damage on the release form with specific descriptions:
   "carton #3 crushed on north face, contents exposed." Do not accept shipment
   without noting the damage — once you sign clean, your concealed damage notice
   window is only 14 days under Montreal Convention.
2. **File written notice within 14 days** — this is a hard deadline. Miss it and
   the claim is barred. Send notice to the airline's cargo claims department and to
   the handling agent at the arrival airport.
3. **Document the chain of custody:** Air freight often moves through multiple
   handlers: origin forwarder → origin ground handler → airline → destination ground
   handler → destination forwarder. Identify which handler had custody when the
   damage occurred. The airline's internal damage reporting ("damage noted during
   build-up/breakdown") is helpful — request it from the airline's cargo
   department.
4. **Liability under Montreal Convention:** 22 SDR/kg (approximately $30/kg). For
   a 500 kg shipment, the maximum recovery is roughly $15,000 regardless of product
   value. If your product value significantly exceeds the weight-based limit, you
   should have purchased declared-value surcharge at booking (typically 0.50–0.75%
   of the excess value). If you did not, recovery is capped at the Convention limit.
5. **Recovery expectation:** Airline direct claims with proper documentation:
   65–80% of the applicable liability limit within 60–90 days.

#### 5.5.2 Ground Handler Damage

Damage caused by the ground handling company (Swissport, Menzies, WFS, dnata, etc.)
that operates on behalf of the airline at the airport.

**Resolution Workflow:**

1. **Shipper files against the airline** — under Montreal Convention, the airline
   is liable to the shipper regardless of whether the airline or the ground handler
   caused the damage. The shipper does not need to prove which party handled the
   freight at the time of damage.
2. **Provide evidence to the airline** — the airline will conduct its own
   investigation and may pursue the ground handler for indemnification. Providing
   the airline with clear evidence (time-stamped photos, handling records, warehouse
   receipt stamps) speeds the process.
3. **If the airline denies** — they may argue the damage was pre-existing or caused
   by inadequate packaging. Counter with origin photos, packaging specifications,
   and the air waybill special handling instructions (e.g., "fragile," "this side up")
   that the handler failed to follow.
4. **Direct claim against ground handler:** In some cases, especially when the
   airline is uncooperative, filing a direct claim against the ground handler under
   local tort law is viable. Consult with an air cargo attorney — this is a
   specialized area.

### 5.6 Intermodal Liability Resolution

#### 5.6.1 Determining Liability Between Rail and Dray

Intermodal shipments involve at least two carriers: a drayage company (trucker) that
picks up the container/trailer at the rail terminal and delivers to the consignee,
and a railroad (BNSF, UP, CSX, NS, etc.) that performs the linehaul.

**Resolution Workflow:**

1. **Obtain the interchange records.** When the container moves from rail to dray
   (or dray to rail), an interchange inspection is supposed to occur. The interchange
   report documents the condition of the container and chassis at handoff. This
   document determines liability allocation.

2. **If damage is noted on the interchange report at rail-to-dray handoff:**
   Rail is liable. File the claim with the railroad or the intermodal marketing
   company (IMC) that booked the rail leg. Railroad claims are governed by the
   Carmack Amendment for domestic intermodal.

3. **If the interchange report is clean at rail-to-dray handoff, and damage is
   found at delivery:** Drayage company is liable. The damage occurred during
   the dray leg (local trucking from rail terminal to consignee). File with the
   dray carrier.

4. **If no interchange report exists** (common — many terminals skip this step):
   Liability is disputed. Both the railroad and the dray will point at each other.
   In this situation:
   - File claims against both parties simultaneously.
   - Provide the same evidence package to both.
   - The party with the weaker defense will typically settle first.
   - If neither settles: your claim is against the contracting party (whoever is
     on your bill of lading), and they can subrogate against the other.

5. **Railroad-specific considerations:**
   - Railroads have their own claims rules and are notoriously slow (90–180 days
     for resolution).
   - Impact damage (shifting during railcar coupling, hard stops, derailment) is
     common. Railroads have internal impact recording devices — request the data.
   - Temperature damage on reefer intermodal: the rail carrier is responsible for
     maintaining the reefer unit during rail transit if GenSet service was purchased.
     If you provided a self-powered reefer unit, the rail carrier may argue the
     unit failed on its own.

6. **Chassis damage vs. cargo damage:** If the chassis (the wheeled frame the
   container sits on) was damaged, causing the container to tilt or drop, this is
   typically a rail terminal or dray carrier issue depending on where the chassis
   was sourced. Chassis pool operators (DCLI, TRAC, Flexi-Van) may also be liable.
   This creates a three-party dispute — carrier, chassis pool, and terminal operator.

---

## 6. Escalation Matrix

### 6.1 Internal Escalation — Who, When, How

| Severity / Trigger | Escalation Target (Role) | Information Required | Channel | Expected Response Time | Follow-Up Cadence |
|--------------------|--------------------------|---------------------|---------|----------------------|-------------------|
| Level 1 exception, no resolution after 48 hrs | Exception Team Lead | Exception summary, carrier contact log, current status | Email (team queue) or Slack/Teams channel | 4 business hours | Daily until resolved |
| Level 2 exception, no resolution after 24 hrs | Exception Team Lead | Exception summary, financial impact estimate, carrier response history | Email with priority flag + verbal heads-up | 2 business hours | Every 8 hours |
| Level 3 exception at intake | Exception Manager | Full exception brief: financial impact, customer impact, timeline, carrier status, recommended action | Phone call + email follow-up within 30 min | 1 hour | Every 4 hours |
| Level 4 exception at intake | Director of Logistics / Director of Customer Operations | Executive summary: TEC calculation, customer risk, recommended action with cost estimate, alternatives considered | Phone call first, then email to director + CC manager | 30 minutes | Every 2 hours |
| Level 5 exception at intake | VP Supply Chain + VP Sales (if customer-facing) | One-page executive brief: situation, financial exposure, customer impact, recommended immediate action, resource needs | Phone call to VP, then email summary to VP + director + manager. Schedule war-room call within 1 hour | 15 minutes | Continuous (war room) until stabilized, then every hour |
| Carrier non-response after 4 hrs | Procurement / Carrier Management Analyst | Carrier name, MC#, exception details, all contact attempts with timestamps | Email to carrier management team | 4 business hours | Once (they own the carrier relationship escalation) |
| Carrier non-response after 24 hrs | Procurement Manager / Director of Transportation | All of above + recommended financial leverage (invoice hold, lane removal) | Phone + email | 2 business hours | Daily until resolved |
| Carrier claims denial > $10,000 | Legal / Risk Management Counsel | Complete claim file: claim filing, carrier denial, rebuttal sent, all evidence, financial exposure | Email with claim file attached + meeting request within 48 hrs | 48 hours for initial review | Weekly until disposition decided |
| Customer escalation (customer contacts their account manager or executive) | Sales Account Manager + Exception Manager | Current exception status, all actions taken, timeline of communications, what we need from the customer | Immediate phone call to account manager + email brief | 30 minutes | Match the customer's requested cadence (usually every 4–8 hours) |
| Potential fraud or compliance concern | Compliance Officer / Internal Audit | All available evidence, basis for suspicion, parties involved, recommended hold actions | Confidential email to compliance (do not discuss on open channels) | 4 business hours | As directed by compliance |
| Regulatory reporting event (hazmat, food safety, pharma) | Quality/Regulatory Affairs Manager + Legal | Product details, exception specifics, regulatory exposure assessment, recommended agency notifications | Phone call immediately + email within 30 min | 15 minutes | Continuous until regulatory obligations met |

### 6.2 External Escalation — Carrier-Side Contacts

| Escalation Level | Carrier Contact (Title) | When to Engage | What to Say | Expected Outcome |
|-----------------|------------------------|---------------|-------------|-----------------|
| Level 1 | Carrier Customer Service / Dispatch Agent | First contact for any exception | State the exception, provide references, request status and ETA | Information and initial action |
| Level 2 | Operations Supervisor / Terminal Manager | When Level 1 is unresponsive (2 hrs) or unable to resolve | Reference the open case number, state the business impact, request supervisor intervention | Escalated attention, possible override of standard process |
| Level 3 | Regional Operations Director or VP Operations | When 2+ business days with no resolution, or high-value exception | Formal email referencing all prior communications, stating financial exposure and expected resolution | Direct oversight, dedicated resource assigned |
| Level 4 | Carrier Account Manager / Director of Sales | When operational channels have failed and you need a business relationship lever | Contact through your procurement team. Frame as "this unresolved exception is affecting our routing decisions for this carrier" | Carrier sales team pressures their operations to resolve, often yields fastest results |
| Level 5 | Carrier CEO / General Counsel | Litigation-track only, or when all other paths exhausted on high-value claim | Formal demand letter from your legal counsel to carrier's registered agent or general counsel | Legal posture established, settlement negotiation begins |

### 6.3 External Escalation — Third Parties

| Party | When to Engage | Contact Method | Cost | Expected Outcome |
|-------|---------------|---------------|------|-----------------|
| Independent marine / cargo surveyor | Damage claim > $5,000, or any disputed damage | Engage through your insurance broker's surveyor network, or directly via NAMS (National Association of Marine Surveyors) | $800–$2,500 per survey (domestic); $1,500–$5,000 (international) | Independent damage assessment report admissible in claims and litigation |
| Third-party claims management firm | When internal claims volume exceeds capacity, or for complex multi-modal claims | Contract through RFP or direct engagement. Major firms: CIS (Claims Information Services), TranSolutions, NovaTrans | Contingency fee 25–33% of recovery, or flat fee $200–$800 per claim depending on complexity | Professional claims handling with higher recovery rates (typically 10–15% higher than in-house for complex claims) |
| Freight claims attorney | Denied claims > $25,000, or any claim heading to litigation | Engage through industry referral (Transportation Intermediaries Association, Transportation Lawyers Association) | Contingency 25–33%, or hourly $250–$450 for pre-litigation work | Legal demand, negotiation, or litigation |
| FMCSA (Federal Motor Carrier Safety Administration) | Carrier safety violations, out-of-service carrier, registration issues | File complaint online at NCCDB (National Consumer Complaint Database) or call 1-888-368-7238 | Free | Investigation of carrier safety record; public record |
| STB (Surface Transportation Board) | Rate disputes, service complaints against railroads, intermodal disputes that cannot be resolved commercially | File formal complaint with the STB | Filing fees vary; legal representation recommended | Regulatory review and potential order against carrier |
| Cargo insurance underwriter | Any loss exceeding your self-insured retention (SIR), or any total loss on insured shipment | Notify per your policy terms (typically within 30 days of loss discovery). Contact your insurance broker first | Claim against your own policy; subject to deductible and SIR | Insurance recovery minus deductible. Insurer may subrogate against carrier |

---

## 7. Time-Based Decision Triggers

### 7.1 Checkpoint Framework

This framework defines what decisions must be made and what actions must be taken at
specific time intervals from exception intake. "Intake" is when the exception is first
identified, regardless of when it actually occurred.

#### Checkpoint: 2 Hours Post-Intake

| Decision | Detail |
|----------|--------|
| Severity classified? | Must have a score. If insufficient information to score, default to one level above what you suspect and gather data to confirm/downgrade |
| Carrier contacted? | Initial contact must be made. If unable to reach carrier at 2 hrs, this is now Path B (Unresponsive) |
| Customer notification needed? | Level 3+: customer must be notified by this checkpoint. Level 1–2: only if customer has already inquired |
| Expedite decision needed? | If time sensitivity is Level 4+, the expedite vs. wait decision cannot wait past this checkpoint. Authorize or decline |
| Is this a pattern? | Quick check: same carrier, same lane, same customer in last 30 days? If yes, apply elevation modifier |

#### Checkpoint: 4 Hours Post-Intake

| Decision | Detail |
|----------|--------|
| Carrier response received? | If no response: escalate to carrier operations supervisor. Switch to Path B protocol |
| Resolution timeline established? | Carrier should have provided a plan and timeline. If not: this is a carrier performance failure in addition to the original exception |
| Internal escalation needed? | Level 3+: manager should be aware by now. Level 4+: director must be briefed |
| Customer update #2 | For Level 3+: provide update even if no new information — silence is worse than "we're still working on it" |
| Backup plan activated? | For time-sensitive exceptions: backup carrier or expedite method should be identified and on standby |

#### Checkpoint: 8 Hours Post-Intake (End of Business Day)

| Decision | Detail |
|----------|--------|
| Will this resolve today? | Honest assessment. If not: set next-day actions and ensure overnight monitoring for Level 4+ |
| Financial impact calculated? | Full TEC should be computed by this point for Level 3+ exceptions |
| Documentation gathered? | Photos, POD, BOL — everything needed for a claim should be in hand or requested with a deadline |
| Customer expectation set? | Customer should have a specific revised delivery date or resolution timeline. Do not give "TBD" past 8 hours |
| After-hours coverage needed? | For Level 4+: assign after-hours on-call responsibility. Provide the on-call person with a complete brief |

#### Checkpoint: 24 Hours Post-Intake

| Decision | Detail |
|----------|--------|
| Resolution achieved? | Level 1–2 exceptions should be resolved or near-resolution by 24 hrs. If not: why? |
| Claim filing decision made? | For damage/shortage/loss: you should know by now whether you are filing a claim, negotiating, or absorbing |
| Carrier accountability documented? | Regardless of resolution, the carrier's performance on this exception must be logged for scorecard purposes |
| Customer satisfaction check | For Level 3+: brief check-in with the customer. Are they satisfied with the resolution or progress? Adjust if needed |
| Aging alert set | If not resolved: ensure the exception is in the "aging" report and will be reviewed at the next team stand-up |

#### Checkpoint: 48 Hours Post-Intake

| Decision | Detail |
|----------|--------|
| Escalation review | Any exception open 48 hrs without clear resolution path: escalate to the next level in the chain, regardless of severity |
| Claim filed? | If claim was warranted, it should be filed by now. Every day of delay weakens the claim (evidence degrades, carrier disputes increase) |
| Root cause identified? | Even if the exception is not fully resolved, the root cause should be understood. If not: dedicate analytical resource to determine it |
| Carrier relationship impact assessed? | Procurement/carrier management should have a view on whether this carrier needs a corrective action discussion |

#### Checkpoint: 72 Hours Post-Intake

| Decision | Detail |
|----------|--------|
| Resolution or plan | Exception must be either resolved OR have a documented resolution plan with a specific completion date |
| Management review | All exceptions open > 72 hrs should be on the manager's weekly review report |
| Customer mitigation complete? | Any customer-facing mitigation (re-ship, credit, expedite) should be completed by this point. The customer should not be waiting |

#### Checkpoint: 5 Business Days

| Decision | Detail |
|----------|--------|
| Concealed damage window closing | 5 days is the industry-standard window for concealed damage claims. If damage was discovered post-delivery, the claim must be filed by this point |
| Team lead review | Team lead should review any exception open 5 days and assess whether it is being handled efficiently or is stuck |

#### Checkpoint: 10 Business Days

| Decision | Detail |
|----------|--------|
| Claim acknowledgment received? | If claim was filed, carrier must acknowledge within 30 days (per 49 CFR § 370.9), but should acknowledge within 10 business days. If not: follow up formally |
| Exception aging report | 10-day open exceptions should appear on the manager-level report with a status update required |

#### Checkpoint: 30 Calendar Days

| Decision | Detail |
|----------|--------|
| Claim acknowledgment mandatory deadline | 30 days is the carrier's regulatory deadline to acknowledge a domestic claim. If not acknowledged: send formal notice citing 49 CFR § 370.9 and state that failure to comply is a regulatory violation |
| Financial write-off or reserve decision | For unresolved claims: finance team should either reserve the claim amount or write it off, depending on recovery probability assessment |
| Carrier performance review trigger | Any carrier with an exception open 30 days without resolution should be in a formal performance review conversation |

### 7.2 Checkpoint Failure Protocol

When a checkpoint decision is not made or action not taken by the deadline:

1. **Immediate notification** to the next level in the escalation chain.
2. **Root cause of the miss:** Was it capacity (analyst overwhelmed), information
   (waiting on carrier/customer), process (no clear owner), or judgment (analyst
   unsure how to proceed)?
3. **Recovery action:** Assign fresh eyes. A different analyst reviews the exception
   and picks up from the current state. Stale exceptions tend to stay stale with
   the same handler.
4. **Process improvement:** If the same checkpoint is repeatedly missed across
   multiple exceptions, this is a systemic issue requiring process or staffing
   review.

---

## 8. Multi-Exception Triage Protocol

### 8.1 When to Activate Triage Mode

Activate formal triage when any of these conditions are met:

- 5+ new exceptions in a single 4-hour window
- 3+ Level 3+ exceptions active simultaneously
- A widespread disruption event (weather system, carrier outage, port closure, major highway closure) is generating exceptions faster than the team can process individually
- Peak season daily exception volume exceeds 150% of the 30-day rolling average

### 8.2 Triage Commander Role

Designate a single **triage commander** (typically the team lead or the most senior
analyst available) who:

- Stops working individual exceptions.
- Takes ownership of triage decisions: who works what, in what order.
- Provides a single point of status aggregation for management and customer-facing
  teams.
- Has authority to re-assign analyst workloads, authorize expedites up to a
  pre-approved threshold ($10,000 per incident without additional approval), and
  communicate directly with carrier account managers and customer account teams.

### 8.3 Triage Scoring — Rapid Prioritization

When volume overwhelms the standard severity matrix process, use this rapid
triage scoring:

| Factor | Score 3 (Highest Priority) | Score 2 | Score 1 (Lowest Priority) |
|--------|---------------------------|---------|--------------------------|
| Time to customer impact | < 8 hours | 8–48 hours | > 48 hours |
| Product at risk | Perishable, hazmat, pharma | High-value non-perishable (> $25K) | Standard product < $25K |
| Customer tier | Enterprise / penalty contract | Key account | Standard |
| Resolution complexity | Requires multi-party coordination | Single carrier, single action needed | Self-resolving (e.g., weather clearing) |
| Can it wait 4 hours? | No — irreversible damage if delayed | Probably, but will cost more | Yes, no penalty for delay |

Sum the scores (max 15). Process exceptions in descending score order.
Ties are broken by: (1) regulatory/safety always wins, (2) then highest dollar
value, (3) then oldest exception.

### 8.4 Triage Communication Protocol

During a triage event:

**Internal:**
- Triage commander sends a status update to management every 2 hours (or more
  frequently if Level 5 exceptions are active).
- Status update format: total exceptions active, top 3 by priority with one-line
  status each, resource utilization (analysts assigned / available), estimated
  clearance timeline.
- Each analyst provides a 2-sentence status on each assigned exception every 2
  hours to the triage commander.

**Customer-facing:**
- For widespread events (weather, carrier outage): issue a single proactive
  communication to all affected customers rather than individual reactive updates.
  Template: "We are aware of [event]. [X] shipments are potentially affected.
  We are actively working with carriers to reroute/recover. Your account team
  will provide individual shipment updates within [X] hours."
- For individual high-priority exceptions during triage: customer update cadence
  does not change (per severity level). The triage commander ensures high-priority
  customer updates are not missed because the analyst is overwhelmed.

**Carrier:**
- During widespread events, contact the carrier's account manager or VP of
  Operations (not dispatch) to get a single point of contact for all affected
  shipments. Working shipment-by-shipment through dispatch during a triage event
  is inefficient.
- Request a carrier-side recovery plan for all affected shipments as a batch.

### 8.5 Resource Allocation During Triage

| Exception Priority (Triage Score) | Analyst Allocation | Manager Involvement | Customer Communication |
|-----------------------------------|--------------------|--------------------|-----------------------|
| Score 13–15 (Critical) | Dedicated senior analyst, 1:1 ratio | Direct manager oversight | VP or account director handles |
| Score 10–12 (High) | Senior analyst, up to 3:1 ratio | Manager briefed every 2 hours | Account manager handles |
| Score 7–9 (Medium) | Analyst, up to 5:1 ratio | Included in batch status report | Standard proactive template |
| Score 4–6 (Low) | Deferred or batch-processed | No individual oversight | Reactive only (respond if customer asks) |

### 8.6 Triage Deactivation

Deactivate triage mode when:
- Active exception count drops below 5
- No Level 3+ exceptions remain unresolved
- New exception intake rate returns to within 120% of the 30-day rolling average
- All high-priority customer impacts are resolved or mitigated

Conduct a triage debrief within 48 hours of deactivation: what went well, what
broke, what needs to change for next time.

---

## 9. Eat-the-Cost Analysis Framework

### 9.1 Decision Model

The eat-the-cost decision determines whether pursuing a claim or dispute recovery
generates a positive return after all costs — financial, temporal, and relational —
are considered.

```
Net Recovery Value (NRV) = (Claim Amount × Recovery Probability × Time-Value Discount)
                         - Processing Cost
                         - Opportunity Cost
                         - Relationship Cost

If NRV > 0 and NRV / Claim Amount > 15%: FILE
If NRV > 0 but NRV / Claim Amount < 15%: FILE only if pattern documentation needed
If NRV ≤ 0: ABSORB and log for carrier scorecard
```

### 9.2 Component Calculations

#### Processing Cost by Complexity Tier

| Tier | Criteria | Internal Hours | External Cost | Total Estimated Cost |
|------|----------|---------------|--------------|---------------------|
| A — Automated | Parcel claim via portal, simple damage with clear POD notation | 0.5 hrs ($23) | $0 | $23 |
| B — Simple | LTL damage with good documentation, cooperative carrier, value < $2,500 | 2–3 hrs ($90–$135) | $0 | $90–$135 |
| C — Standard | FTL damage/loss, value $2,500–$10,000, standard claim process | 5–8 hrs ($225–$360) | $0 | $225–$360 |
| D — Complex | Multi-party dispute, ocean/air with international filing, disputed liability | 12–20 hrs ($540–$900) | Surveyor $800–$2,500 | $1,340–$3,400 |
| E — Litigation-track | Denied claim heading to legal, value > $25,000 | 30–60 hrs ($1,350–$2,700) | Attorney $5,000–$25,000+ | $6,350–$27,700+ |

#### Recovery Probability Adjustments

Start with the base recovery probabilities from §4.2 and adjust:

| Factor | Adjustment |
|--------|-----------|
| Documentation is complete and clean (photos, clean BOL, noted POD) | +10% |
| Documentation is incomplete (missing photos or POD unsigned) | -15% |
| Carrier has a history of paying claims promptly | +5% |
| Carrier has a history of denying or slow-walking claims | -10% |
| Claim is filed within 7 days of delivery | +5% |
| Claim is filed 30+ days after delivery | -10% |
| Independent survey/inspection supports the claim | +15% |
| Product is temperature-controlled with continuous logger data | +10% (if data supports excursion) or -25% (if data is ambiguous or missing) |

#### Time-Value Discount

Claims take time. The money recovered 120 days from now is worth less than money
in hand today.

```
Time-Value Discount Factor = 1 / (1 + (annual_cost_of_capital × estimated_days_to_recovery / 365))

Typical: annual cost of capital = 8-12%
```

| Estimated Days to Recovery | Discount Factor (at 10% annual) |
|---------------------------|-------------------------------|
| 30 days | 0.992 |
| 60 days | 0.984 |
| 90 days | 0.976 |
| 120 days | 0.968 |
| 180 days | 0.953 |
| 365 days | 0.909 |

For most claims, the time-value discount is small (1–5%) and rarely drives the
decision. It matters most for large claims (> $50K) with long expected resolution
timelines (> 180 days).

#### Opportunity Cost

Every hour an analyst spends on a low-value claim is an hour not spent on a
higher-value exception. Estimate:

```
Opportunity Cost = Processing Hours × (Average Exception Value Recovered per Analyst Hour - $45 blended labor cost)

Typical: An experienced analyst recovers ~$1,200 per hour of claims work (blended across all claim sizes).
Opportunity Cost ≈ Processing Hours × ($1,200 - $45) = Processing Hours × $1,155
```

This is the most often overlooked component. Filing a $500 claim that takes 4 hours
to process costs the organization 4 × $1,155 = $4,620 in recoveries NOT pursued
on other higher-value exceptions.

However, this applies only when the analyst has a backlog of higher-value work.
During low-volume periods, opportunity cost approaches zero and the threshold for
filing drops.

#### Relationship Cost

This is the qualitative overlay. Assign one of these values:

| Carrier Relationship Status | Relationship Cost Factor |
|----------------------------|------------------------|
| New carrier (< 6 months), building relationship | $500 imputed cost — filing a claim this early sends a signal. Absorb small claims if possible and address in the quarterly review |
| Established carrier (6+ months), good relationship | $0 — professional carriers expect claims as part of the business. Filing does not damage the relationship if done respectfully |
| Strategic carrier (top 5 by spend, or sole-source on critical lanes) | $250 imputed cost — even though the relationship is strong enough to handle claims, there is a negotiation overhead and quarterly review complexity |
| Carrier under corrective action or on probation | Negative cost: -$200 (i.e., filing the claim is relationship-positive because it creates the documentation trail needed for contract renegotiation or termination) |

### 9.3 Worked Examples

#### Example: Should We File This $850 LTL Damage Claim?

```
Claim Amount:        $850
Carrier:             National LTL, established relationship (18 months)
Documentation:       Complete (clean BOL, noted POD, photos)
Complexity:          Tier B (Simple)
Base Recovery Prob:  85% (national LTL, visible damage noted on POD)
Adjustments:         +10% (complete documentation) → 95% (cap at 95%)

Processing Cost:     2.5 hrs × $45 = $113
Opportunity Cost:    During peak season, analyst backlog is high →
                     2.5 hrs × $1,155 = $2,888
                     During slow season (January): $0

Relationship Cost:   $0 (established, good relationship)
Time-Value:          60-day expected resolution → discount factor 0.984

NRV (peak season) = ($850 × 0.95 × 0.984) - $113 - $2,888 - $0
                   = $794 - $113 - $2,888 = -$2,207 → DO NOT FILE

NRV (slow season) = ($850 × 0.95 × 0.984) - $113 - $0 - $0
                   = $794 - $113 = $681 → FILE (NRV/Claim = 80%)
```

During peak season, the analyst's time is better spent on higher-value
exceptions. During slow season, file it — the analyst has bandwidth.

#### Example: Should We File This $3,200 FTL Shortage Claim Against a Small Carrier?

```
Claim Amount:        $3,200
Carrier:             Small asset carrier (12 trucks), 8-month relationship
Documentation:       Incomplete — POD was signed clean (driver left before
                     count completed), shortage discovered 1 hour later
Base Recovery Prob:  55% (small FTL carrier, shortage)
Adjustments:         -15% (clean POD) → 40%
Complexity:          Tier C (Standard)

Processing Cost:     6 hrs × $45 = $270
Opportunity Cost:    6 hrs × $1,155 = $6,930 (peak), $0 (slow)
Relationship Cost:   $500 (relatively new carrier)
Time-Value:          120-day expected → 0.968

NRV (peak) = ($3,200 × 0.40 × 0.968) - $270 - $6,930 - $500
           = $1,239 - $270 - $6,930 - $500 = -$6,461 → DO NOT FILE

NRV (slow) = ($3,200 × 0.40 × 0.968) - $270 - $0 - $500
           = $1,239 - $270 - $500 = $469 → MARGINAL

Filing Ratio = $469 / $3,200 = 14.7% → BELOW 15% threshold → ABSORB
```

Even in the slow season, the low recovery probability (due to the clean POD)
makes this a marginal claim. Decision: absorb, but use this as a coaching
moment with the consignee about never signing clean before completing the count.
Log for carrier scorecard. If it happens again with the same carrier, the pattern
changes the calculus — file the second claim and reference both incidents.

---

## 10. Seasonal Adjustment Factors

### 10.1 Peak Season Adjustments (October–January)

During peak season, carrier networks are strained, transit times extend, exception
rates increase 30–50%, and claims departments slow down. Adjust decision frameworks
accordingly.

| Parameter | Standard Setting | Peak Season Adjustment | Rationale |
|-----------|-----------------|----------------------|-----------|
| Carrier response SLA (before escalation) | 2 hours | 4 hours | Carrier dispatch is overwhelmed; allow more time before declaring unresponsive |
| Customer notification threshold | Level 3+ proactive | Level 2+ proactive | Customer expectations are already fragile during peak; proactive communication prevents inbound complaint calls |
| Expedite authorization threshold | Manager approval > $5,000 | Manager approval > $10,000 | Expedite costs are inflated 50–100% during peak; air capacity is scarce. Raise the bar for what justifies a premium expedite |
| Eat-the-cost threshold | < $500 absorb | < $750 absorb | APC increases during peak (analysts are juggling more exceptions). Internal cost of claims processing rises |
| Claims filing timeline | Within 5 business days | Within 10 business days | Realistic given volume. Still well within the 9-month Carmack window |
| Carrier scorecard impact weight | Standard | 0.75× weighting | Across-the-board service degradation during peak is industry-wide. Do not penalize carriers disproportionately for systemic conditions, but still document everything |
| Triage mode activation threshold | 5+ simultaneous exceptions | 8+ simultaneous (expect a higher baseline) | Baseline exception volume is higher; activate triage based on deviation from the elevated baseline |
| Customer communication frequency (active exceptions) | Every 4 hours for Level 3+ | Every 8 hours for Level 3+ | Volume requires longer update cycles. Communicate the adjusted cadence to customer upfront: "During the holiday shipping season, we'll provide updates every 8 hours unless there is a material change" |
| Settlement acceptance threshold | > 75% for $500–$2,500 range | > 65% for $500–$2,500 range | Faster settlement frees capacity for higher-value claims. Accept slightly lower recoveries to close volume |

### 10.2 Weather Event Adjustments

Applied when a named weather system (winter storm, hurricane, tropical storm) or
widespread severe weather (tornado outbreak, flooding) is actively disrupting a
region.

| Parameter | Standard Setting | Weather Event Adjustment | Duration |
|-----------|-----------------|------------------------|----------|
| Carrier response SLA | 2 hours | 8 hours (carrier dispatch may be evacuated or overwhelmed) | Until 48 hours after last weather advisory expires |
| Force majeure acceptance | Require specific documentation | Accept carrier's force majeure claim if weather event is confirmed by NOAA for the route and timeframe | Event duration + 72 hours recovery |
| Expedite decisions | Standard ROI calculation | Suspend expedite for affected lanes until roads/airports reopen. Redirect expedite spend to alternative routing | Until carrier confirms lane is clear |
| Customer communication | Standard cadence per severity | Issue blanket proactive communication to all customers with shipments on affected lanes. Individual follow-ups only for Level 4+ | Until all affected shipments are rescheduled |
| Exception severity scoring | Standard matrix | Reduce time-sensitivity dimension by 1 level for weather-affected shipments (customer tolerance is higher for force majeure events) | Event duration + 24 hours |
| Claim filing | Standard timeline | Delay claim filing for weather events; focus on recovery and rerouting. File after the event when full impact is known | File within 30 days of delivery/non-delivery |
| Carrier scorecard | Standard weighting | 0.5× weighting for weather-affected lanes. Document for pattern tracking but do not penalize individual events | Exceptions within the event window only |

### 10.3 Produce / Perishable Season Adjustments (April–September)

Temperature-sensitive shipments increase dramatically. Reefer capacity tightens.
Temperature exceptions spike.

| Parameter | Standard Setting | Produce Season Adjustment | Rationale |
|-----------|-----------------|--------------------------|-----------|
| Temperature excursion response time | 2 hours to contact carrier | 1 hour to contact carrier | Perishable shelf life is non-recoverable. Every hour of delay in response reduces the salvageable value |
| Pre-trip inspection documentation | Recommended | Required — do not load without confirmed pre-trip on reefer unit | Carrier defense #1 is "reefer was fine at dispatch; product was loaded warm." Pre-trip eliminates this |
| Continuous temperature logging | Required for pharma/biotech | Required for ALL perishable shipments including produce, dairy, frozen food | Carrier disputes on temperature are unresolvable without continuous data |
| Reefer breakdown escalation | 4 hours before power-swap demand | 2 hours before power-swap demand | Product degradation accelerates with ambient temperature. In July, a reefer failure in Phoenix means product loss in under 2 hours |
| Carrier reefer fleet age threshold | Accept carriers with reefer units < 10 years old | Prefer carriers with reefer units < 5 years old during peak produce season | Older reefer units fail at higher rates in extreme heat |
| Claim documentation for temperature | Standard photo + logger | Add: pre-cool records, loading temperature readings (infrared gun logs), in-transit monitoring alerts, reefer unit download data | Temperature claims require more evidence than any other claim type. Produce buyers and carriers both dispute aggressively |

### 10.4 Month-End / Quarter-End Adjustments

The last 5 business days of any month (and especially quarter) see volume spikes,
carrier tender rejections, and increased exception rates as shippers rush to meet
revenue recognition deadlines.

| Parameter | Standard Setting | Month/Quarter-End Adjustment | Rationale |
|-----------|-----------------|------------------------------|-----------|
| Backup carrier readiness | Pre-identified for top 20 lanes | Pre-identified and confirmed available for top 50 lanes | Tender rejection rates spike 25–40% at month-end. Having confirmed backup capacity prevents scrambling |
| Tender rejection response time | 2 hours to re-tender | 1 hour to re-tender | Every hour matters when the month is closing. Spot market tightens through the day |
| Spot market premium approval | Manager approval > 20% over contract rate | Manager pre-approval up to 35% over contract rate | Speed of authorization matters more than cost optimization at month-end. Pre-authorize higher thresholds |
| Double-brokering verification | Standard onboarding check | Enhanced verification for any new or infrequent carrier used at month-end: confirm MC#, confirm truck matches BOL, confirm driver identity | Double-brokering spikes when capacity is tight and brokers scramble to cover loads they've committed |
| Exception reporting frequency | Daily summary | Twice-daily summary (midday and close of business) to operations leadership | Executives need real-time visibility into end-of-period exceptions that could affect revenue or delivery commitments |

### 10.5 Adjustment Interaction Rules

When multiple seasonal adjustments are active simultaneously (e.g., peak season +
weather event in December):

1. Apply the **more permissive** adjustment for carrier-facing parameters (response
   SLAs, scorecard weighting). Do not stack — use the adjustment that grants the
   carrier the most latitude.
2. Apply the **more conservative** adjustment for customer-facing parameters
   (notification thresholds, communication frequency). If peak says "Level 2+
   proactive" and weather says "blanket communication to all affected," use the
   blanket communication.
3. Apply the **lower** eat-the-cost threshold (i.e., absorb more). Overlapping
   stress periods mean higher APC and lower recovery probabilities.
4. Internal escalation thresholds remain at the **tighter** of any applicable
   adjustment. Overlapping stress events mean higher risk, not lower.
5. Document which adjustments are active and communicate to the team. A triage
   event during peak season with active weather is a different operating posture
   than normal operations — everyone must be calibrated to the same adjusted
   thresholds.

---

## Appendix A — Quick-Reference Decision Cards

### Card 1: "Should I escalate this?"

```
IF severity ≥ 3           → YES, to manager
IF severity ≥ 4           → YES, to director
IF severity = 5           → YES, to VP
IF carrier non-response > 4 hrs → YES, to carrier ops supervisor
IF carrier non-response > 24 hrs → YES, to carrier account manager + your procurement
IF customer has called about it → YES, to at least team lead
IF it smells like fraud   → YES, to compliance immediately
```

### Card 2: "Should I file this claim?"

```
IF value < $250 and portal available → FILE (automated, low effort)
IF value < $500 and no portal → ABSORB unless it is a pattern
IF value $500–$2,500 → RUN NRV CALC (see §9)
IF value > $2,500 → FILE regardless
IF this is the 3rd+ incident same carrier 90 days → FILE and flag for carrier review
IF documentation is weak (no POD notation, no photos) → NEGOTIATE informally first, file only if carrier acknowledges liability
```

### Card 3: "Should I expedite a replacement?"

```
IF customer impact ≥ Level 4 → YES, authorize now, sort out cost later
IF customer impact = Level 3 → CALCULATE: expedite cost vs. customer penalty + relationship damage
IF customer impact ≤ Level 2 → STANDARD re-ship unless customer specifically requests
IF product is perishable and original is salvageable → DO NOT re-ship; instead reroute or discount the original
IF product is custom/irreplaceable → EXPEDITE the manufacturing queue, not just the shipping
```

### Card 4: "What do I do first when 10 exceptions land at once?"

```
1. ACTIVATE triage mode
2. SCORE each exception using rapid triage (§8.3) — takes ~2 min per exception
3. SORT by score descending
4. ASSIGN: top 3 to senior analysts (1:1), next 4 to analysts (2:1), bottom 3 to batch queue
5. COMMUNICATE: send blanket status to customer teams, single contact to carrier account managers
6. UPDATE triage commander every 2 hours
7. DEACTIVATE when active count < 5 and no Level 3+ remain
```

---

## Appendix B — Acronyms and Glossary

| Term | Definition |
|------|-----------|
| APC | Administrative Processing Cost — internal labor cost to handle an exception |
| ASN | Advanced Shipping Notice — EDI 856 document notifying customer of incoming shipment |
| BOL / BL | Bill of Lading — the shipping contract between shipper and carrier |
| CFS | Container Freight Station — warehouse at a port where LCL cargo is consolidated/deconsolidated |
| COGSA | Carriage of Goods by Sea Act — US statute governing ocean carrier liability |
| DRC | Downstream Ripple Cost — secondary costs caused by the exception |
| ELD | Electronic Logging Device — required device tracking driver hours of service |
| ERC | Expedite / Re-Ship Cost — cost to recover from the exception via expedited shipment |
| FCL | Full Container Load — ocean shipping where one shipper uses the entire container |
| FMCSA | Federal Motor Carrier Safety Administration — US agency regulating trucking |
| FTL | Full Truckload — one shipper, one truck, dock-to-dock |
| HOS | Hours of Service — FMCSA regulations limiting driver driving/on-duty time |
| IMC | Intermodal Marketing Company — broker of intermodal (rail+truck) services |
| JIT | Just-In-Time — manufacturing/supply chain strategy with minimal inventory buffers |
| LCL | Less than Container Load — ocean shipping where multiple shippers share a container |
| LTL | Less than Truckload — shared carrier network with terminal cross-docking |
| MC# | Motor Carrier number — FMCSA-issued operating authority identifier |
| NFO | Next Flight Out — expedited air freight on the next available commercial flight |
| NRV | Net Recovery Value — expected financial return from pursuing a claim |
| NVOCC | Non-Vessel Operating Common Carrier — freight intermediary in ocean shipping |
| OS&D | Over, Short & Damage — carrier department handling freight exceptions |
| OTIF | On Time In Full — delivery performance metric |
| PL | Product Loss — value of product damaged, lost, or shorted |
| POD | Proof of Delivery — signed delivery receipt |
| PRO# | Progressive Rotating Order number — carrier's shipment tracking number (LTL) |
| QBR | Quarterly Business Review — periodic meeting between shipper and carrier/customer |
| RDE | Relationship Damage Estimate — imputed cost of relationship harm from exception |
| SDR | Special Drawing Rights — IMF currency unit used in international transport liability limits |
| SIR | Self-Insured Retention — amount the shipper pays before insurance coverage applies |
| SL&C | Shipper Load & Count — BOL notation indicating carrier did not verify the load |
| STB | Surface Transportation Board — US agency with jurisdiction over rail and some intermodal disputes |
| TEC | Total Exception Cost — comprehensive cost of an exception including all components |
| TMS | Transportation Management System — software for managing freight operations |
| WMS | Warehouse Management System — software for managing warehouse operations |
