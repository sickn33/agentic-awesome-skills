# Decision Frameworks — Returns & Reverse Logistics

This reference provides the detailed decision logic, scoring matrices, financial models,
grading standards, and disposition workflows for returns and reverse logistics operations.
It is loaded on demand when the agent needs to make or recommend nuanced return-handling
decisions.

All thresholds, timelines, and cost assumptions reflect US retail and e-commerce operations
with applicability to omnichannel, pure-play e-commerce, and brick-and-mortar environments.

---

## 1. Disposition Decision Trees by Product Category

### 1.1 Decision Methodology

Every returned item follows a decision tree that routes to the highest-value disposition
channel. The routing decision is made after grading (see §5) and considers:

1. **Recovered value** at each disposition tier (restock, open box, refurbish, liquidate, donate, destroy)
2. **Processing cost** for each tier (inspection, repackaging, refurbishment, shipping)
3. **Time-to-recovery** — cash tied up in returns inventory has a carrying cost
4. **Regulatory constraints** — some dispositions are prohibited for certain categories
5. **Brand protection** — premium brands may restrict secondary-market sales

The **net recovery** for any disposition = `(Sale price at channel) - (Processing cost) - (Shipping cost) - (Channel fees)`.

Always route to the disposition with the highest net recovery, subject to regulatory and
brand constraints.

### 1.2 Consumer Electronics

Consumer electronics are the highest-value and most complex returns category. Serial numbers,
firmware states, activation locks, and functional testing requirements add cost and time.

```
RECEIVE → Verify serial number matches RMA
  ├── Mismatch → Flag for fraud review (swap fraud), HALT processing
  └── Match → Visual inspection
        ├── Grade A (no cosmetic defects, all accessories, original packaging)
        │     └── Functional test (power on, screen, connectivity, battery health)
        │           ├── Pass → Check activation lock / factory reset status
        │           │     ├── Locked → Contact customer for unlock, hold 48 hrs
        │           │     │     ├── Unlocked within 48 hrs → Restock as new
        │           │     │     └── Not unlocked → Grade B (open box with disclaimer)
        │           │     └── Clean → Restock as new (full margin recovery)
        │           └── Fail → Route to refurbishment assessment
        │                 ├── Refurb cost < 40% of refurb selling price → Refurbish
        │                 ├── Refurb cost 40-60% → Liquidate as "for parts / not working"
        │                 └── Refurb cost > 60% → Parts harvest or e-waste recycling
        ├── Grade B (minor cosmetic wear, accessories complete, packaging damaged)
        │     └── Functional test
        │           ├── Pass → Repackage as "open box" or "renewed" (60-80% of retail)
        │           └── Fail → Refurbishment assessment (same tree as above)
        ├── Grade C (visible wear, scratches, missing non-essential accessories)
        │     └── Functional test
        │           ├── Pass → Sell through secondary channel at 30-50% of retail
        │           └── Fail → Parts harvest if unit value > $100, else e-waste
        └── Grade D (heavily damaged, non-functional, missing critical components)
              └── Parts harvest if any component value > $15, else e-waste recycling
```

**Category-specific thresholds:**
- Smartphones: Always verify IMEI against stolen device databases (GSMA) before restocking
- Laptops: Battery health must be > 80% for Grade A restock; 60-80% triggers Grade B
- Tablets: Check for MDM (mobile device management) profiles — enterprise tablets may have
  remote-lock capability that surfaces post-sale
- Headphones: Hygiene concern — all ear tips/pads replaced before resale ($2-8 per unit)
- Smart home devices: Factory reset verified; linked account removal confirmed. A smart lock
  that is still linked to a previous owner's account is unsellable and potentially a safety issue

**Typical processing costs:**
| Action | Cost per Unit | Time per Unit |
|--------|--------------|---------------|
| Visual inspection | $1.50-2.50 | 45-90 seconds |
| Functional test (basic) | $3.00-5.00 | 2-4 minutes |
| Functional test (full diagnostic) | $8.00-15.00 | 10-20 minutes |
| Repackaging | $5.00-12.00 | 3-8 minutes |
| Refurbishment (minor: screen clean, reset) | $15.00-30.00 | 15-30 minutes |
| Refurbishment (moderate: component replacement) | $30.00-80.00 | 30-90 minutes |
| Data wipe (NIST 800-88 compliant) | $5.00-10.00 | 5-15 minutes |

### 1.3 Apparel and Footwear

Apparel returns are high-volume, low-unit-value, and condition-sensitive. Odour, stains,
and stretched fabric are the primary defects. Speed is critical because fashion depreciates
rapidly — a trend item loses 10-20% of sellable value per month.

```
RECEIVE → Scan RMA / order lookup
  └── Visual inspection (30-60 seconds)
        ├── Tags attached, no signs of wear
        │     ├── Original packaging intact → Restock as new
        │     └── Packaging damaged/missing → Repackage, restock as new (tag is key, not box)
        ├── Tags removed but no signs of wear
        │     └── UV light + odour check
        │           ├── Clean → Restock as "like new" or outlet (80-90% of retail)
        │           └── Traces detected → Grade C, route to launder/clean assessment
        │                 ├── Cleaning cost < $5 and item value > $30 → Clean and restock as outlet
        │                 └── Cleaning not viable or cost > value threshold → Liquidate by weight
        ├── Visible wear, stains, or damage
        │     ├── Premium brand (retail > $100) → Assess repair viability
        │     │     ├── Repair cost < 20% of outlet price → Repair and sell through outlet
        │     │     └── Repair not viable → Liquidate (never destroy premium apparel; brand resale exists)
        │     └── Standard brand → Liquidate by weight ($0.50-2.00/lb) or textile recycling
        └── Heavily damaged, soiled, or biohazard
              └── Textile recycling or destroy (biohazard requires specific disposal)
```

**Apparel-specific considerations:**
- Seasonal timing is everything: a winter coat returned in February can restock for next season,
  but the carrying cost of 8 months of storage may exceed liquidation recovery. Decision point:
  if storage cost > (expected recovery next season × probability of sale) - liquidation value now,
  liquidate immediately.
- Footwear: Check sole wear. A shoe worn on carpet for 5 minutes is different from one worn
  on pavement. Sole scuffing = Grade C minimum. Check for orthotics left inside.
- Swimwear and intimate apparel: Once hygienic liner is removed, non-returnable per health code
  in most jurisdictions. If returned, destroy — do not restock or liquidate.
- Designer/luxury: Authenticate before accepting. Counterfeits in the return stream are
  increasing. Compare serial numbers, stitching quality, hardware weight against known
  genuine samples.

### 1.4 Home, Furniture, and Large Goods

Returns of bulky items are expensive — return shipping alone can be $50-200+. The disposition
decision often happens before the item physically returns.

```
CUSTOMER INITIATES RETURN →
  ├── Item value < return shipping cost × 2.5
  │     └── Offer returnless refund (customer keeps item, full refund)
  │           Cost justification: returnless refund costs $X (product value).
  │           Processing the return costs $X (product) + $Y (shipping) + $Z (processing).
  │           If Y + Z > 40% of X, returnless is cheaper.
  ├── Item value > threshold AND item is in original packaging
  │     └── Schedule carrier pickup → Receive → Inspect
  │           ├── Grade A → Restock (furniture typically restock at 85-95% due to assembly/box condition)
  │           ├── Grade B → Sell as "open box" in-store (avoid re-shipping; sell from nearest location)
  │           ├── Grade C → Donate locally (shipping destroyed items is negative ROI)
  │           └── Grade D → Local disposal (donation or recycling based on materials)
  └── Item is assembled
        └── Generally non-returnable once assembled (policy). Exceptions:
              ├── Defective → Offer replacement parts first, full return if unfixable
              ├── Missing parts on arrival → Ship missing parts (cheaper than full return)
              └── Customer insists → Accept but apply 25% restocking fee to cover disassembly/repackaging
```

### 1.5 Health, Beauty, and Personal Care

Regulatory constraints dominate this category. Once opened, most health and beauty products cannot
be legally resold due to FDA and state health department regulations.

```
RECEIVE → Seal integrity check
  ├── Sealed / unopened
  │     ├── Expiration date > 6 months out → Restock as new
  │     ├── Expiration 3-6 months → Restock with markdown or outlet
  │     └── Expiration < 3 months → Donate (tax benefit > markdown recovery)
  ├── Opened but appears unused (seal broken, product visually intact)
  │     └── DESTROY. Cannot verify non-contamination. No restocking of opened health/beauty.
  │           Exception: Hard goods (hair dryers, electric razors) → treat as electronics tree
  └── Used
        └── DESTROY. Biohazard disposal if applicable (used cosmetics applicators, skincare).
```

**Special cases:**
- Prescription items: Cannot accept return under any circumstances (most states). Direct
  customer to pharmacy or manufacturer disposal programme.
- Supplements/vitamins: Same as cosmetics — once opened, destroy. Sealed returns restock
  only with lot number verification.
- Sunscreen: Regulated as OTC drug by FDA. Opened sunscreen is destroyed. Expired sunscreen
  (even sealed) is destroyed — never sell expired OTC.

### 1.6 Books, Media, and Software

High restock rate, low processing cost. The primary fraud vector is digital content extraction
(reading/ripping then returning).

```
RECEIVE → Condition check
  ├── New condition (no creasing, bending, markings)
  │     └── Restock as new. Media: verify disc is present and matches case.
  ├── Minor wear (slight cover bend, shelf wear)
  │     └── Restock at minor discount or sell through marketplace as "very good"
  ├── Moderate wear (highlighting, writing, water damage)
  │     └── Liquidate through bulk book buyers ($0.10-0.50 per book) or donate
  └── Software / digital media
        ├── If activation key is unredeemed → Restock
        ├── If key is redeemed → Cannot resell. Write off. Pursue refund from publisher if within terms.
        └── Physical media with digital code (game + download) → Sell disc only at reduced price
```

---

## 2. Fraud Detection Scoring Model

### 2.1 Scoring Architecture

The fraud scoring model assigns points based on observable signals at the time of return
initiation (pre-receipt signals) and at the time of physical inspection (post-receipt
signals). The two scores are summed for a composite score.

**Thresholds:**
| Composite Score | Action |
|----------------|--------|
| 0-30 | Process normally. No additional review. |
| 31-50 | Flag for passive monitoring. Process refund but add customer to watch list for 90 days. |
| 51-64 | Enhanced inspection. Hold refund until physical inspection is complete and matches RMA description. |
| 65-79 | Supervisor review. Hold refund. Detailed inspection with photo documentation. Supervisor approves or escalates. |
| 80-100 | Fraud review team. Refund on hold. Customer contacted for "verification" (never say "fraud"). LP notified. |

### 2.2 Pre-Receipt Signals (scored at return initiation)

| Signal | Points | Logic |
|--------|--------|-------|
| Customer return rate > 30% (rolling 12 months, ≥ 5 orders) | +15 | High return rate alone isn't fraud, but it is a risk multiplier. Exclude exchanges from rate calculation. |
| Return rate > 50% | +25 | Replaces the +15 above. At this rate, the customer is almost certainly bracket-shopping or abusing policy. |
| Return initiated < 48 hours after delivery confirmation | +5 | Could be legitimate (wrong item, didn't match description) or bracket shopping. Mild signal. |
| Return reason is "defective" but product category has < 2% defect rate | +10 | "Defective" is used to avoid restocking fees. True defect claims on low-defect products are suspicious. |
| Return reason changed between online initiation and customer service contact | +10 | Inconsistency suggests the customer is constructing a narrative. |
| Customer account age < 30 days | +10 | New accounts used for return fraud or testing fraud viability. |
| Multiple returns in same week (3+) | +10 | Cumulative with return rate signal. Suggests bracket shopping or wardrobing batch. |
| Return from an address different than the original shipping address | +10 | Excludes gift returns (flagged as gift at order). Otherwise indicates potential organised activity. |
| Item is in a high-shrink category (electronics, designer, cosmetics) | +5 | These categories have higher fraud incidence. Mild base signal. |
| No-receipt or no-order-match return | +15 | Receipt fraud is the primary risk vector. Match to payment method or loyalty ID. |
| Order was placed with a promotion/coupon > 30% off | +5 | Price-arbitrage returns are more common on heavily discounted purchases. |
| Customer has previously been flagged for fraud review (any outcome) | +15 | Prior flags, even if resolved as legitimate, indicate a pattern worth monitoring. |

### 2.3 Post-Receipt Signals (scored during physical inspection)

| Signal | Points | Logic |
|--------|--------|-------|
| Serial number mismatch (does not match the unit sold to this customer) | +40 | Near-certain swap fraud. Verify against order record before escalating — packing errors at fulfilment can cause legitimate mismatches. |
| Product weight differs > 5% from expected for SKU | +25 | Indicates missing components, swap with lighter/cheaper item, or empty packaging. Weigh before opening. |
| IMEI/MEID on returned device doesn't match sold device | +40 | Definitive swap fraud for mobile devices. Cross-reference IMEI from order with IMEI on returned device. |
| Product shows wear inconsistent with stated return reason | +15 | "Changed my mind" return on a laptop with 200 battery cycles suggests extended use. |
| Tags removed on apparel/footwear with "didn't fit" reason | +10 | Tags removed is consistent with wearing, not just trying on. |
| Cosmetic traces on apparel (makeup, deodorant, perfume) | +15 | Wardrobing indicator. UV light reveals traces invisible to naked eye. |
| Packaging has been repacked (tape over tape, non-original inner packaging) | +10 | Could indicate swap (customer repacked a different item) or simply customer repackaging for return. Context-dependent. |
| Security/RFID tag removed | +20 | Tags that are not customer-removable (hidden tags, sewn-in RFID) should still be present. Removal suggests the item was worn/used in a retail environment. |
| Product firmware/software shows usage history inconsistent with claim | +15 | Laptop claiming "unopened" but with 6 months of OS updates installed. |
| Multiple units of same SKU returned (3+) in single return | +10 | Could be legitimate (sizing across colours) or reseller return. Check original order for bulk discount. |

### 2.4 Score Adjustments and Overrides

| Condition | Adjustment |
|-----------|-----------|
| Customer lifetime value > $10,000 and net LTV positive | -15 points (floor at 0) |
| Customer is a verified loyalty programme member (2+ years) | -10 points |
| Return is an exchange (not refund) | -10 points |
| Return reason is verified fulfilment error (wrong item shipped) | Set score to 0, process immediately |
| Return was pre-approved by customer service with case notes | -10 points |
| Customer has filed a chargeback simultaneously with this return | +20 points (escalate regardless of score) |

### 2.5 False Positive Management

False positives destroy customer relationships. Every customer flagged by the fraud scoring
system who turns out to be legitimate represents a risk of customer attrition. Manage through:

1. **Never communicate "fraud" to the customer.** Use neutral language: "additional processing
   time," "verification of your return," "quality review."
2. **Time-box the review.** Flagged returns must be resolved within 5 business days. If the
   review cannot conclusively determine fraud within 5 days, process the refund. The cost
   of a false positive held for 3 weeks exceeds the cost of most fraudulent returns.
3. **Track false positive rate monthly.** Target: < 3% of total returns flagged are
   confirmed false positives. If rate exceeds 5%, recalibrate the scoring model.
4. **Feedback loop:** Every fraud review outcome (confirmed fraud, confirmed legitimate,
   inconclusive) feeds back into the scoring model calibration. Signals that generate
   high false-positive rates have their point values reduced.

---

## 3. Vendor Recovery Framework

### 3.1 Return-to-Vendor (RTV) Process

RTV is the primary mechanism for recovering costs on defective products. The process:

```
Identify RTV-eligible unit (defective, vendor-caused quality issue, mispick at vendor DC)
  │
  ├── Check vendor agreement for RTV terms
  │     ├── RTV window: Typically 90 days from retailer receipt of return (not customer purchase date)
  │     ├── Minimum shipment value: Usually $200-500 per RTV shipment
  │     ├── Documentation requirements: Varies by vendor (photos, defect codes, customer complaint data)
  │     └── RTV authorisation: Some vendors require pre-approval; others accept "open RTV" under agreement
  │
  ├── Accumulate RTV-eligible units by vendor
  │     ├── Stage in designated RTV area (separate from general returns inventory)
  │     ├── Track aging — units approaching 90-day window need priority shipment
  │     └── Batch by vendor to meet minimum shipment thresholds
  │
  ├── Obtain RTV authorisation (if required)
  │     ├── Submit RTV request with: SKU, quantity, defect description, photos, customer return rate data
  │     └── Vendor has 5-10 business days to approve/deny (per most vendor agreements)
  │
  ├── Ship to vendor return facility
  │     ├── Use vendor-provided shipping label (if applicable — vendor pays)
  │     ├── If retailer pays shipping: deduct from credit claim or use lowest-cost carrier
  │     └── Track shipment and confirm delivery at vendor facility
  │
  └── Track credit issuance
        ├── Vendor credit should appear within 30-45 days of vendor receipt
        ├── If no credit at 30 days: first follow-up (email to vendor returns dept)
        ├── If no credit at 45 days: escalate to vendor account manager
        ├── If no credit at 60 days: debit memo against next PO (per vendor agreement terms)
        └── If vendor disputes: provide defect documentation as evidence. Escalate to vendor management.
```

### 3.2 Defect Rate Monitoring and Claims

Beyond individual RTV, monitor defect rates at the SKU level to identify systemic quality
issues that trigger formal defect claims:

| Defect Rate (per SKU, rolling 90 days) | Action |
|----------------------------------------|--------|
| < 2% | Normal. Process individual RTVs. No escalation. |
| 2-5% | Alert vendor management. Request root cause analysis from vendor. Continue selling but monitor weekly. |
| 5-8% | Formal quality complaint. Demand corrective action plan within 14 days. Consider pull from active sales pending vendor response. |
| 8-15% | Pull from active sales. Formal defect claim for all returns above the 2% baseline. Negotiate credit or replacement. |
| > 15% | Full stop-sale. Vendor compliance violation. Chargebacks for all returns + lost margin + customer service costs. Consider vendor termination. |

**Defect claim calculation:**
```
Total returns for SKU in period: 500 units
Expected baseline return rate (non-defect): 8% of units sold (industry avg for category)
Units sold: 4,000
Expected returns: 320
Excess returns attributable to defect: 500 - 320 = 180 units
Claim = 180 × (wholesale cost + inbound freight per unit + return processing cost per unit)
       = 180 × ($24.00 + $1.80 + $7.50)
       = 180 × $33.30
       = $5,994.00
```

Add consequential costs if the defect caused customer service escalations, negative reviews
that required response, or marketplace listing suppression.

### 3.3 Vendor Chargeback Schedule

For vendor-caused issues beyond defects (packaging failures, mislabelling, wrong items shipped
from vendor DC), apply chargebacks per the vendor compliance programme:

| Violation | Chargeback | Notes |
|-----------|-----------|-------|
| Wrong item shipped from vendor DC | 100% of product cost + return shipping + $25 processing fee | Requires photo evidence of received vs ordered |
| Mislabelled product (UPC doesn't match contents) | $50 per incident + product cost if unsellable | Creates inventory accuracy issues downstream |
| Packaging failure (product damaged due to inadequate packaging) | 100% of product cost + return processing | Requires photos of packaging condition at receipt |
| Missing components (accessory, manual, warranty card) | Cost of sourcing replacement component + $10 processing | If component unavailable, full product cost |
| Counterfeit or unauthorised product | 300% of product cost + $500 penalty per incident | Zero tolerance. Notify brand protection. |
| Late shipment from vendor causing customer-facing delay | Customer credit issued + $15 processing | Must document customer complaint and credit |
| Incorrect hazmat/regulatory documentation | $250 per incident + cost of regulatory remediation | Regulatory liability makes this non-negotiable |

### 3.4 Vendor Recovery ROI Model

Not all vendor recovery is worth pursuing. The ROI model:

```
Recovery ROI = (Expected recovery - Recovery cost) / Recovery cost

Where:
  Expected recovery = Claim amount × Collection probability
  Recovery cost = Labour (documentation, communication, follow-up) + Shipping (if RTV) + Relationship cost

Labour cost estimates:
  - Simple RTV with existing authorisation: $15-25 per batch
  - Defect claim requiring documentation assembly: $75-150 per claim
  - Disputed claim requiring escalation and negotiation: $200-500 per claim

Collection probability by vendor tier:
  - Tier 1 (top 20 vendors, strong relationship): 85-95%
  - Tier 2 (mid-tier, established relationship): 65-80%
  - Tier 3 (small/new vendors): 40-60%
  - International vendors (no US entity): 25-45%
```

**Decision matrix:**
| Claim Amount | Tier 1 Vendor | Tier 2 Vendor | Tier 3 Vendor | International |
|-------------|---------------|---------------|---------------|---------------|
| < $100 | Offset against next PO | Offset against next PO | Write off | Write off |
| $100-500 | Batch RTV | Batch RTV | Batch if > $200 total | Write off, note for contract |
| $500-2,000 | Standard RTV/claim | Standard claim | Standard claim with escalation plan | Claim if > $1,000 |
| $2,000-10,000 | Standard claim | Standard claim + account mgr | Account mgr + formal notice | Pursue with local agent if > $5,000 |
| > $10,000 | VP-level engagement | VP-level + legal review | Legal review | Legal counsel in vendor's jurisdiction |

---

## 4. Return Policy Exception Matrix

### 4.1 Exception Decision Framework

When a return falls outside standard policy, the decision to grant an exception depends on
a structured evaluation, not individual judgment calls. This matrix standardises the
exception decision.

**Step 1: Is the exception request covered by an automatic override?**

| Condition | Action | No Further Analysis Needed |
|-----------|--------|--------------------------|
| Product is defective (verified or reasonably claimed) | Accept return, full refund, no restocking fee | Yes |
| Fulfilment error (wrong item shipped, wrong quantity) | Accept return, full refund, prepaid return label | Yes |
| Product is subject to active recall | Route to recall programme (not returns) | Yes |
| Customer is in top 5% by LTV and request is first exception in 12 months | Grant exception, standard refund | Yes |
| State or federal law requires acceptance (lemon law, cooling-off period) | Comply with applicable law | Yes |

**Step 2: If not an automatic override, score the exception request:**

| Factor | Score Range | Description |
|--------|-----------|-------------|
| Days past policy window | 1-30 days: +2 / 31-60 days: +5 / 61-90 days: +8 / >90 days: +12 | How far outside the standard window |
| Product condition at return | Grade A: 0 / Grade B: +2 / Grade C: +5 / Grade D: +10 | Worse condition = higher cost of exception |
| Customer LTV | Top 20%: -5 / Middle 60%: 0 / Bottom 20%: +3 | Valuable customers get more latitude |
| Return reason credibility | Compelling story with evidence: -3 / Plausible: 0 / Weak: +5 | "My house flooded" with photos vs "I forgot" |
| Precedent risk | Private resolution: 0 / Customer mentioned social media: +5 / Customer has large following: +8 | Public exceptions become policy expectations |
| Product restockability | Restockable as new: -3 / Open box: 0 / Liquidation: +3 / Destroy: +5 | Restockable items cost less to accept |

**Step 3: Interpret the exception score:**

| Score | Decision | Authority Level |
|-------|----------|----------------|
| < 0 | Grant exception. Cost is minimal, customer value is high. | Returns associate |
| 0-5 | Grant exception with standard refund. | Team lead |
| 6-10 | Grant as store credit (not original payment refund). | Team lead |
| 11-15 | Partial credit (50-75% of purchase price) as store credit. | Returns manager |
| 16-20 | Deny with empathetic explanation and alternative offer (exchange, discount on next purchase). | Returns manager |
| > 20 | Deny. Offer to connect with manufacturer warranty if applicable. | Returns manager |

### 4.2 Common Exception Scenarios with Recommended Resolutions

| Scenario | Typical Score | Recommended Resolution |
|----------|--------------|----------------------|
| 5 days past window, Grade A, loyal customer | -3 | Full refund to original payment |
| 45 days past window, Grade B, average customer | +7 | Store credit for purchase price |
| 90 days past window, Grade C, low-value customer | +16 | Deny, offer 15% discount on next purchase |
| 10 days past window, Grade A, customer cited family emergency | -1 | Full refund to original payment |
| Within window, Grade C, customer claims defect but inspection shows user damage | +10 | Store credit at 50% (goodwill), document for fraud scoring |
| 60 days past window, brand-new customer, first order | +13 | Partial credit (50%), welcome them back with incentive |

---

## 5. Grading Standards by Product Category

### 5.1 Universal Grading Criteria

All categories share these baseline grade definitions. Category-specific addenda
follow in §5.2.

#### Grade A — Like New
- Zero signs of use beyond initial unboxing
- All original accessories, manuals, and packaging materials present
- Original packaging in good condition (minor shipping wear acceptable)
- Passes all applicable functional and safety tests
- Can be restocked and sold as new without any additional processing beyond re-shelving

#### Grade B — Good / Open Box
- Minor cosmetic imperfections (light surface scratches, small scuffs) that do not affect function
- Original packaging may be damaged, opened, or missing outer sleeve/shrink wrap
- All essential accessories present (charger, main cable); non-essential items (stickers, pamphlets) may be missing
- Fully functional — passes all applicable tests
- Requires repackaging or "open box" labelling before resale

#### Grade C — Fair
- Visible cosmetic wear, scratches, dents, or staining that are noticeable at arm's length
- Missing accessories that affect the completeness of the product (but not its core function)
- Functional but may have minor performance degradation (battery at 60-80%, worn but operational buttons)
- Not suitable for primary retail channel — routes to outlet, marketplace, or liquidation
- May be viable for refurbishment if cost justifies it

#### Grade D — Salvage / Parts
- Non-functional, heavily damaged, or missing critical components that render the product unusable
- Structural damage (cracked screens, bent frames, water damage indicators triggered)
- May have value for parts harvesting or materials recovery
- Routes to parts extraction, recycling, or destruction

### 5.2 Category-Specific Grading Addenda

**Consumer Electronics:**
- Grade A additional requirement: battery health > 80% of design capacity (measurable via diagnostic)
- Grade B threshold: battery 60-80%, cosmetic scratches visible only under direct light
- Functional test required for all grades: power on, display, connectivity (WiFi/Bluetooth/cellular), speakers, cameras, ports
- Data wipe verification mandatory before any resale disposition

**Apparel:**
- Grade A: tags attached (original retail tags, not just care labels)
- Grade B: tags removed, but no wear indicators; passes UV and odour check
- Grade C: visible wear, minor staining treatable with professional cleaning, or slight fabric stretching
- Grade-reducing odours: tobacco smoke, pet odour, heavy fragrance, body odour
- Automatic Grade D: mould, mildew, pest contamination

**Footwear:**
- Sole inspection is primary grading factor: unworn soles = Grade A, indoor-only wear marks = Grade B, outdoor wear = Grade C
- Grade B requires: no toe box creasing deeper than 2mm, no heel counter collapse
- Include insole inspection: customer orthotics must be removed, original insole must be present

**Home Goods / Small Appliances:**
- Grade A: unused, all packaging foam/wrapping in place
- Functional test: operate through one full cycle (coffee maker: brew cycle, vacuum: run for 60 seconds, blender: blend ice test)
- Missing filters, bags, or consumable accessories: Grade B (replaceable at $3-10 cost)
- Cosmetic damage on surfaces visible during normal use: Grade C

---

## 6. Liquidation Channel Selection

### 6.1 Channel Overview

When product is routed to liquidation, selecting the right channel significantly affects
recovery rates. The wrong channel can mean the difference between 20% recovery and 5%.

| Channel | Best For | Typical Recovery (% of retail) | Fees | Min Lot Size | Speed to Cash |
|---------|----------|-------------------------------|------|-------------|---------------|
| B-Stock (owned auctions) | Electronics, home goods | 12-25% | 10-15% of sale | 1 pallet | 2-4 weeks |
| Direct Liquidation | Mixed general merchandise | 8-18% | 15-20% of sale | 1 pallet | 2-6 weeks |
| Bulq (owned by Optoro) | Small lots, mixed goods | 10-20% | Built into marketplace | 1 box (small lots) | 1-3 weeks |
| Regional liquidators | Bulky/heavy items, furniture | 5-15% | Negotiated | Varies | 1-4 weeks |
| Wholesale to dollar stores | Low-value general merchandise | 3-8% (often per-pound) | None (buy outright) | Truckload preferred | Immediate |
| Online marketplace (eBay, Amazon Warehouse) | Individually valuable items ($50+) | 25-50% | 12-15% + shipping | Single unit | 1-8 weeks |
| Charity donation | Items not worth liquidating, brand-sensitive | $0 (tax deduction at FMV) | None | No minimum | Immediate |

### 6.2 Channel Selection Decision Tree

```
Is the individual unit value > $50?
  ├── Yes → Is the item in Grade B or better condition?
  │     ├── Yes → Sell individually on marketplace (eBay, Amazon Warehouse). Highest recovery.
  │     └── No → Is the brand premium/recognisable?
  │           ├── Yes → Auction on B-Stock (brand buyers pay premium). Recovery 15-25%.
  │           └── No → Direct Liquidation or regional liquidator. Recovery 8-15%.
  └── No → Is there a full pallet of same or similar category?
        ├── Yes → Auction as category-sorted pallet on B-Stock or Direct Liquidation.
        │     Recovery improves 30-50% vs mixed pallets.
        └── No → Accumulate by category until pallet quantity reached.
              If aging > 30 days, mix into general pallet and liquidate.
              Holding cost exceeds sort premium beyond 30 days.
```

**Critical liquidation rules:**
1. Never mix electronics with non-electronics on the same pallet. Electronics buyers won't bid on mixed pallets.
2. Never include recalled products, counterfeit items, or hazmat in liquidation lots. Liability exposure is unlimited.
3. Remove all customer personal data before liquidating electronics. Data breach from a liquidated device creates legal exposure.
4. Photograph every pallet before shipping to liquidation. Disputes about condition are common.
5. Manifest every pallet (list of SKUs, quantities, conditions). Manifested pallets sell for 20-40% more than unmanifested.

---

## 7. Refurbishment ROI Model

### 7.1 When to Refurbish

Refurbishment is only viable when the economics justify it. The decision model:

```
Refurbishment ROI = (Refurbished selling price - Refurbishment cost - Fulfilment cost) / Refurbishment cost

Decision thresholds:
  ROI > 100%: Always refurbish. High-value recovery.
  ROI 50-100%: Refurbish if capacity exists. Good return on investment.
  ROI 25-50%: Refurbish only if liquidation alternative is particularly poor (< 8% recovery).
  ROI < 25%: Liquidate. The refurbishment effort isn't justified.
```

### 7.2 Refurbishment Cost Benchmarks by Category

| Category | Common Defects | Typical Refurb Cost | Typical Refurb Selling Price | Typical ROI |
|----------|---------------|--------------------|-----------------------------|-------------|
| Smartphones (flagship) | Screen scratches, battery degradation | $40-80 (screen polish, battery replace) | $350-550 (65-75% of new) | 300-500% |
| Laptops | Battery, cosmetic damage, slow storage | $50-120 (battery, SSD upgrade, clean) | $400-800 (55-70% of new) | 200-400% |
| Tablets | Screen scratches, battery | $30-60 | $200-400 (60-70% of new) | 200-350% |
| Small appliances | Cosmetic, missing parts | $10-25 (clean, replace accessory) | $30-60 (50-65% of new) | 100-200% |
| Power tools | Battery, switch wear | $20-45 (battery, switch replacement) | $60-120 (55-65% of new) | 100-200% |
| Headphones (premium) | Ear pad wear, cosmetic | $8-15 (new pads, clean) | $80-200 (60-75% of new) | 400-800% |
| Game consoles | Cosmetic, controller wear | $15-30 (clean, replace controller pads) | $150-300 (60-70% of new) | 300-500% |

### 7.3 Refurbishment Capacity Planning

Refurbishment requires dedicated space, trained technicians, and parts inventory. The
capacity model:

- **Space:** 1 refurb station = approximately 80 sq ft (workbench + test equipment + parts storage)
- **Throughput:** 1 technician handles 8-15 units/day for electronics, 20-30 units/day for small appliances
- **Parts inventory:** Maintain 30-day supply of top 20 replacement parts by volume (batteries, screens, cables, ear pads, filters)
- **Break-even:** A refurb station breaks even at approximately 5-8 units per day at average ROI of 150%. Below this volume, outsource to a third-party refurbisher.

### 7.4 Outsource vs In-House Decision

| Factor | In-House | Outsource |
|--------|----------|-----------|
| Volume > 40 units/day | Preferred (economies of scale) | Viable but more expensive |
| Volume < 40 units/day | Only if margin justifies | Preferred (avoid fixed overhead) |
| Brand certification programme exists | Required for "certified refurbished" branding | Must verify third-party is certified |
| Product requires proprietary tools/software | In-house (IP control) | Only with NDA and audited facility |
| Seasonal volume spikes | Core volume in-house, surge outsourced | Flexible capacity |
| Data security requirements | In-house (direct control over data wipe) | Requires NIST 800-88 certification |

---

## 8. Return Processing Workflow by Channel

### 8.1 E-Commerce Returns (Ship-Back)

The standard e-commerce return flow. This is the highest-volume channel for most
retailers and the one with the most automation opportunity.

```
Customer initiates return on website/app
  │
  ├── Automated policy check (within window? excluded category? customer in good standing?)
  │     ├── Auto-approve → Generate RMA + prepaid return label
  │     ├── Auto-deny → Display denial reason + alternatives
  │     └── Manual review queue → Agent reviews within 4 hours
  │
  ├── Customer ships product
  │     └── Tracking monitored for: label scan (confirms customer shipped), delivery to return centre
  │
  ├── Receiving at return centre
  │     ├── Scan RMA barcode → pulls order record, expected product, customer profile
  │     ├── Initial sort: sealed/unopened → express lane (15-second visual, Grade A, restock)
  │     └── Opened/used → standard inspection lane
  │
  ├── Standard inspection (see §5 for grading criteria)
  │     ├── Serial number verification (electronics only, but expanding to luxury goods)
  │     ├── Visual inspection + functional test (category-dependent)
  │     ├── Fraud scoring (post-receipt signals added to pre-receipt score)
  │     └── Grade assignment: A / B / C / D
  │
  ├── Disposition routing (see §1 for category-specific trees)
  │     ├── Grade A → Restock queue
  │     ├── Grade B → Open-box / repackaging queue
  │     ├── Grade C → Liquidation staging or refurbishment assessment
  │     └── Grade D → Parts / recycling / destruction
  │
  └── Refund processing
        ├── Refund triggered upon grade assignment (do not wait for disposition completion)
        ├── Restocking fee applied if applicable (calculated at grading, not at refund)
        └── Refund to original payment method → customer notification sent
```

**Key timing targets:**
| Step | Target | Stretch Goal |
|------|--------|-------------|
| RMA generation (auto-approve) | < 5 minutes | Instant |
| Return label delivery to customer | Immediate (email) | Immediate |
| Customer ship-back | < 7 days from RMA | < 5 days |
| Receiving scan at return centre | Day of delivery | Same as carrier delivery scan |
| Inspection + grading | < 24 hours of receipt | < 4 hours |
| Refund processing | < 24 hours of grading | Same day as grading |
| Refund visible to customer | 3-5 business days | 1-2 business days |
| Total RMA-to-refund cycle | < 14 days | < 7 days |

### 8.2 Buy Online, Return In-Store (BORIS)

Cross-channel returns are operationally more complex but have higher customer satisfaction
and lower total cost (no return shipping). The critical risk is price discrepancy.

```
Customer arrives at store with online-purchased product
  │
  ├── Associate initiates BORIS return in POS
  │     ├── Scan product barcode
  │     ├── Look up online order (by order number, customer email, or loyalty account)
  │     │     ├── Order found → POS displays actual purchase price from online order
  │     │     │     └── CRITICAL: Refund at actual online purchase price, NOT store shelf price
  │     │     └── Order not found → Customer provides order confirmation (email/app)
  │     │           ├── Verified → Manual price entry at confirmed online price
  │     │           └── Cannot verify → Process through online returns channel (mail-back)
  │     │                 Do NOT guess the price. Do NOT use store shelf price.
  │     └── Verify return eligibility (window, excluded categories)
  │
  ├── In-store inspection
  │     ├── Visual + functional check (same criteria as return centre)
  │     ├── For electronics: serial number check against online order
  │     └── Grade assignment
  │
  ├── Refund processing
  │     ├── Refund to original online payment method (not store credit, not cash)
  │     │     Exception: customer paid with a gift card → store credit acceptable
  │     ├── Restocking fee applied if applicable
  │     └── Customer receives refund confirmation email
  │
  └── Inventory disposition
        ├── If Grade A and product is in store assortment → Restock on store shelf
        ├── If Grade A but product is online-only → Ship to return centre or nearest DC
        ├── If Grade B/C → Ship to return centre for open-box/liquidation processing
        └── If Grade D → Local disposal (do not ship non-functional product to return centre)
```

**BORIS-specific risks:**
1. Price discrepancy (online vs store) → Mitigated by mandatory online order lookup
2. Return of promotional/bundled items → Verify if the item was part of a BOGO or bundle; refund the proportional amount
3. Store inventory adjustment → Ensure the store's inventory count correctly reflects the returned unit
4. Different return windows → Online and store may have different windows; honour the more generous one

### 8.3 In-Store Purchase, Return In-Store

The simplest return flow. The POS has the transaction record, pricing is definitive,
and the product doesn't need to be shipped.

```
Customer arrives with product + receipt (or POS lookup via card/loyalty)
  │
  ├── POS transaction lookup → Confirms purchase price, date, payment method
  ├── Window check → Within return policy period?
  ├── Inspection at return counter
  │     ├── Quick visual for obvious damage/use
  │     ├── Electronics: power-on test, serial number check
  │     └── Grade assignment (usually Grade A or B at point of sale)
  │
  └── Refund to original payment method → Receipt printed → Customer exits
```

**Target transaction time:** < 5 minutes for standard returns. This is the benchmark
that drives customer satisfaction — long return lines at the service desk are the
#1 complaint in retail returns.

### 8.4 Returnless Refunds (Customer Keeps Product)

For items where the cost of return exceeds the recovery value. The decision model:

```
Return shipping cost estimate > 40% of product value?
  ├── Yes → Evaluate returnless refund
  │     ├── Product value < $50 → Auto-approve returnless refund
  │     ├── Product value $50-100 → Supervisor auto-approve
  │     ├── Product value $100-200 → Manager review (consider partial return — just the defective component)
  │     └── Product value > $200 → Case-by-case (may justify return shipping for high-value)
  │
  └── No → Standard return process
```

**Returnless refund abuse prevention:**
- Track returnless refunds per customer. More than 3 in 6 months triggers review.
- High-value returnless refunds (> $100) are flagged for post-refund audit.
- Products declared "defective" for returnless refund should still be counted in the
  SKU defect rate, even though the physical product doesn't return.
- Consider asking the customer to send a photo of the defect as lightweight verification.

---

## 9. Seasonal Return Planning

### 9.1 Holiday Return Surge (January)

January is to returns operations what December is to fulfillment. Plan for:

| Metric | Normal Month | January Peak | Multiplier |
|--------|-------------|-------------|-----------|
| Return volume | 100% baseline | 250-350% | 2.5-3.5x |
| Return processing backlog | < 24 hours | 48-96 hours | 2-4x |
| Fraud attempts | Baseline | 180-220% | 1.8-2.2x |
| Customer service contacts about returns | Baseline | 300-400% | 3-4x |
| Gift receipt returns (% of total) | 5-8% | 25-35% | 4-5x |

**Holiday return planning checklist:**
1. Staff: Bring temporary inspection staff online by Dec 26. Target: 2x normal inspection capacity by Jan 2.
2. Space: Reserve additional staging area for the return volume. Last-mile sorting should be simplified (Grade A express lane for sealed/tagged items).
3. Policy: Extended holiday return window (typically Nov 1 - Dec 31 purchases returnable through Jan 31) means that returns trickle in over 4 weeks rather than concentrating in the first week. Model the curve.
4. Gift receipts: Train all associates on gift receipt pricing rules. The #1 January return error is refunding at current price instead of purchase price.
5. Fraud: Increase fraud scoring thresholds by 10% during January (reduce false positives — many legitimate gift returns trigger fraud signals).
6. Liquidation: Pre-negotiate January liquidation capacity with liquidation partners. You'll have 3-4x normal Grade C/D volume, and everyone else will too.

### 9.2 Category-Specific Seasonal Patterns

| Category | Peak Return Period | Key Driver | Planning Action |
|----------|-------------------|-----------|----------------|
| Consumer electronics | Jan 2-15 | Holiday gifts, "not what they wanted" | Pre-stage functional test stations; serial number verification capacity |
| Apparel | Jan 5-31 (extends longer) | Gift sizing, holiday party returns | UV/odour inspection throughput; wardrobing detection focus |
| Fitness equipment | Jan 15 - Mar 1 | New Year's resolution abandonment | Large-item return logistics; returnless refund thresholds |
| Outdoor/sporting goods | Mar-Apr (post-ski), Sep-Oct (post-summer) | Season-end returns | Seasonal markdown timing; storage vs liquidation decision |
| School supplies | Sep 1-15 | Over-purchasing for school | High-volume, low-value; fast processing is key |

### 9.3 Markdown-Driven Returns

When products go on markdown or clearance, returns of the same product purchased at
full price increase. Customers are not returning because of dissatisfaction — they're
returning to repurchase at the lower price (return arbitrage).

**Detection:** Monitor for returns where the same customer repurchases the same SKU within
7 days of the return. If the repurchase price is lower, flag as potential price-match return.

**Preferred handling:** Offer a price-match credit instead of processing a return and
repurchase. The price-match credit costs the markdown difference; the return-and-repurchase
costs the markdown difference plus processing cost plus potential disposition loss.

---

## 10. Data-Driven Return Reduction

### 10.1 Root Cause Analysis by Return Reason

Returns are a symptom. Reducing return rates requires treating the cause:

| Return Reason | Root Cause Investigation | Typical Fix | Expected Reduction |
|--------------|------------------------|------------|-------------------|
| "Didn't fit" (apparel) | Poor size guidance, inconsistent sizing, inadequate photos | Size recommendation engine, fit model photos, detailed measurements | 15-25% reduction in "didn't fit" returns |
| "Not as expected" | Product photo/description doesn't match reality | Lifestyle photos, video demos, customer photos in reviews, AR preview | 10-20% reduction |
| "Defective" | Manufacturing quality, shipping damage, product design flaw | Vendor quality scorecard, packaging improvement, design feedback loop | Variable — depends on root cause |
| "Changed my mind" | Impulse purchase, bracketing | Cooling-off period messaging, wish list instead of cart, fit technology | 5-10% reduction |
| "Better price found" | Competitive pricing, price transparency | Price-match guarantee, automated price alerts | 8-15% reduction |
| "Arrived too late" | Shipping delays, inaccurate ETAs | Improved delivery estimates, proactive delay notifications | 20-30% reduction in lateness returns |

### 10.2 SKU-Level Return Rate Monitoring

| Return Rate (rolling 90 days) | Action |
|-------------------------------|--------|
| < 5% | Normal. No action required. |
| 5-10% | Review product listing for accuracy. Check reviews for recurring complaints. |
| 10-15% | Flag for merchandise review. Audit listing photos/description. Check sizing data. |
| 15-25% | Escalate to category manager. Consider adding warnings to listing. Review vendor quality. |
| > 25% | Stop-sell review. The product may have a systemic issue that no listing fix can solve. |

### 10.3 Return Cost Allocation Model

Allocating return costs to the business units that drive them creates accountability:

| Return Cause | Cost Allocation |
|-------------|----------------|
| Defective product | Vendor (via RTV/defect claim) or Merchandise (if vendor approved) |
| Wrong item shipped | Fulfillment operations |
| Damaged in shipping | Carrier (via shipping claim) or Packaging engineering |
| Poor product description | E-commerce / Content team |
| Sizing issue | Merchandise / Product development |
| Customer changed mind | Cost of doing business (absorbed by margin model) |
| Fraud | Loss prevention budget |
