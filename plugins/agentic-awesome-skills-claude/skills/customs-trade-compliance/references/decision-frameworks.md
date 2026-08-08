# Decision Frameworks — Customs & Trade Compliance

This reference provides the detailed decision logic, classification methodology, FTA qualification
decision trees, customs valuation methods, restricted party screening protocols, and penalty risk
assessment frameworks for customs and trade compliance operations.

All thresholds, timelines, and regulatory references reflect multi-jurisdictional trade operations
covering US, EU, UK, and key Asia-Pacific markets. Regulatory citations are current as of 2024
but must be verified against the latest amendments before reliance in specific proceedings.

---

## 1. HS Classification Methodology

### 1.1 Pre-Classification Information Gathering

Before applying the GRIs, assemble the complete technical profile of the product. Classification
errors almost always trace back to insufficient product information, not misapplication of the rules.

**Required Information Checklist:**

| Data Point | Why It Matters | Example Impact |
|---|---|---|
| Material composition (% by weight) | Determines chapter for textiles, plastics, metals, composites | A fabric that is 52% cotton / 48% polyester classifies as cotton (Ch. 52), not synthetic (Ch. 54) |
| Primary function | Determines heading for machines, apparatus, instruments | A device that both weighs and labels classifies by the function giving essential character |
| Dimensions and weight | Determines subheading for many products | Steel tubes above/below 406.4mm OD classify differently |
| Manufacturing process | Determines whether the product is "prepared," "processed," or raw | Green coffee (Ch. 09) vs roasted coffee (Ch. 09) vs coffee extract (Ch. 21) |
| Intended use | Relevant for "for use with" or "suitable for" headings | Automotive glass vs architectural glass — identical product, different classifications |
| Retail packaging | Determines whether GRI 3(b) set rules apply | A first-aid kit in retail packaging is classified as a set; the same items shipped loose are classified individually |
| Country of manufacture | Affects national tariff lines and AD/CVD applicability | Chinese-origin steel faces additional duties that Korean-origin steel does not |
| Technical specifications | Resolves subheading-level distinctions | Voltage, frequency, capacity, resolution, accuracy — all create subheading splits |

**Common Information Failures:**

- Relying on the supplier's suggested HS code without independent verification — suppliers classify for export purposes; the import classification may differ at the national level
- Using a product marketing name instead of a technical description — "SmartWidget Pro" tells you nothing about classification
- Accepting a "parts of" classification without verifying whether the item meets the Section XVI Note 2 test for parts
- Classifying based on the product's industry rather than its physical characteristics — an automotive connector and an industrial connector may have the same HS code

### 1.2 GRI Application Decision Tree

```
START: Product to classify
  │
  ├─ Step 1: Read all candidate heading texts
  │   ├─ Read Section Notes for each candidate Section
  │   ├─ Read Chapter Notes for each candidate Chapter
  │   └─ Do the Section/Chapter Notes explicitly include or exclude the product?
  │       ├─ YES, one heading clearly covers → CLASSIFY (GRI 1). STOP.
  │       └─ NO unique heading, or notes are ambiguous → Continue to Step 2
  │
  ├─ Step 2: Is the product incomplete, unfinished, or unassembled?
  │   ├─ YES → Does it have the essential character of the complete article?
  │   │   ├─ YES → Classify as the complete article (GRI 2(a)). STOP.
  │   │   └─ NO → It may be a "part" — check Section/Chapter notes for parts provisions
  │   └─ NO → Is it a mixture or combination of materials/components?
  │       ├─ YES → GRI 2(b) extends headings to include mixtures. Multiple headings
  │       │         may now apply → Continue to Step 3
  │       └─ NO → Continue to Step 3
  │
  ├─ Step 3: Multiple headings still apply (prima facie classifiable under 2+)
  │   ├─ Step 3(a): Is one heading more specific than the others?
  │   │   ├─ YES → Classify under the most specific heading. STOP.
  │   │   └─ NO (headings are equally specific, or the product is a composite/set) →
  │   │
  │   ├─ Step 3(b): Is the product a composite good, set put up for retail sale,
  │   │              or goods put up in sets for retail sale?
  │   │   ├─ YES → Classify by the material or component giving essential character
  │   │   │   ├─ Essential character determinable → CLASSIFY. STOP.
  │   │   │   └─ Essential character not determinable → Continue to 3(c)
  │   │   └─ NO → Continue to 3(c)
  │   │
  │   └─ Step 3(c): Classify under the heading that occurs LAST in numerical order. STOP.
  │
  ├─ Step 4: No heading covers the product even after Steps 1-3
  │   └─ Classify under the heading for the most ANALOGOUS goods (GRI 4). STOP.
  │
  ├─ Step 5: (Applies to cases, containers, and packing materials)
  │   ├─ GRI 5(a): Cases, boxes, and similar containers specially shaped for a specific
  │   │            article are classified WITH the article when presented together
  │   └─ GRI 5(b): Packing materials are classified with the goods unless they are
  │                 clearly suitable for repetitive use
  │
  └─ Step 6: Subheading-level classification
      ├─ Apply GRI 1-5 within the determined heading
      ├─ Compare subheading texts at the SAME level (one-dash vs one-dash, two-dash vs two-dash)
      └─ Subheading notes take precedence at this level. CLASSIFY. STOP.
```

### 1.3 Essential Character Determination (GRI 3(b))

When a composite good or set must be classified by the component giving essential character,
assess the following factors. No single factor is determinative — weigh them in context:

| Factor | When It Is Decisive | Example |
|---|---|---|
| **Function** | When one component defines what the product does | A flashlight with a built-in radio — if the primary purchase reason is illumination, the flashlight component gives essential character |
| **Value** | When one component represents the dominant cost | A gift set with a $95 watch and $5 pouch — the watch gives essential character by value |
| **Bulk/Weight** | When one component is physically dominant | A concrete-and-steel composite where concrete is 90% by weight |
| **Role in use** | When one component is indispensable | A printer cartridge kit with cartridge + cleaning cloth — the cartridge is indispensable, the cloth is ancillary |
| **Consumer perception** | When the product is marketed for one component | A toy with candy — if marketed as a toy (candy is incidental), the toy gives essential character |

**When essential character cannot be determined:** If the factors conflict or are balanced (e.g., two
components of roughly equal value, bulk, and functional importance), essential character is
"not determinable" and you must proceed to GRI 3(c) — last heading in numerical order.

### 1.4 Section XVI Special Rules (Machines and Mechanical Appliances)

Section XVI (Chapters 84-85) has complex notes that override the general GRI application:

**Note 1 — Exclusions:** Parts of general use (Section XV), belts and hoses (Ch. 39/40/59),
and other specifically excluded articles do not classify in Section XVI regardless of their use
with machines.

**Note 2 — Parts classification hierarchy:**
1. Parts that are goods included in any heading of Chapters 84 or 85 (other than 8409, 8431,
   8448, 8466, 8473, 8503, 8522, 8529, 8538) are classified in their OWN heading, not as parts.
2. Other parts, if suitable for use solely or principally with a particular machine, classify WITH
   that machine.
3. Parts suitable for use with multiple machines classify under the "catch-all" parts headings
   (8409, 8431, etc.) or under heading 8487 (miscellaneous machine parts).

**Note 3 — Composite machines:** A machine that performs two or more complementary functions
classifies under the heading for the function that represents the PRINCIPAL function. If no
principal function is identifiable, Note 3 defers to GRI 3(c).

**Note 4 — Machine units:** A machine consisting of separate components designed to jointly
perform a clearly defined function classifies as the complete machine when the components
are presented together or when the components are designed to be assembled.

**Note 5 — Automatic Data Processing (ADP) machines:** Heading 8471 requires the machine to be
capable of: (a) storing the processing program, (b) being freely programmed by the user,
(c) performing arithmetical computations, and (d) executing a user-modified processing program
without physical intervention. All four criteria must be met. A single-function device
(e.g., a barcode scanner that only scans) does not meet criterion (b) and classifies under its
function-specific heading, not as ADP.

### 1.5 Common Classification Disputes and Resolution

**Dispute: Is it a "part" or an "accessory"?**
- Parts are essential to the functioning of the machine and are consumed in, or physically
  integrated with, the machine during use. Without the part, the machine does not function.
- Accessories enhance or supplement the machine's function but are not essential. The machine
  functions without the accessory.
- Classification impact: Parts often follow the machine's classification. Accessories may classify
  independently under their own material or function heading, often at a different duty rate.

**Dispute: Is the food "prepared" (Chapter 16/19/20/21) or raw (Chapters 2-14)?**
- "Prepared" generally means processed beyond what is necessary for preservation or transport.
  Frozen raw shrimp: Chapter 3. Cooked shrimp: Chapter 16. Shrimp tempura (battered and fried): Chapter 16.
- Simple operations that do NOT constitute "preparation": washing, trimming, freezing, chilling,
  sorting by size, packing. These maintain the product in Chapter 2-14.
- Watch for Chapter notes — Chapter 20 Note 1 excludes vegetables "prepared or preserved by
  vinegar" (heading 2001 is the specific provision) from the general Chapter 7 vegetable headings.

**Dispute: Is it a "set" under GRI 3(b)?**
A "set put up for retail sale" must meet ALL three conditions:
1. Consists of at least two different articles classifiable in different headings
2. Consists of articles put up together to meet a particular need or carry out a specific activity
3. Put up in a manner suitable for sale directly to users without repacking

If any condition fails, the items are classified individually — not as a set. Industrial assortments
(e.g., a box of assorted fasteners) that are not "put up for retail sale" do not qualify.

---

## 2. FTA Qualification Decision Trees

### 2.1 General FTA Qualification Process

```
START: Can this product qualify for preferential treatment?
  │
  ├─ Step 1: Identify ALL potentially applicable FTAs
  │   ├─ Where was the good produced / last substantially transformed?
  │   ├─ Where is it being imported?
  │   └─ Are both countries parties to one or more FTAs?
  │       ├─ YES → List all applicable FTAs → Continue to Step 2
  │       └─ NO → No FTA preference available. Check GSP or other unilateral programmes.
  │
  ├─ Step 2: For each applicable FTA, determine the product-specific rule of origin
  │   ├─ Look up the HS heading (4-digit or 6-digit) in the FTA's product-specific rules annex
  │   ├─ Determine the rule type:
  │   │   ├─ Tariff Shift (change in tariff classification — CTC, CTH, CTSH)
  │   │   ├─ Regional Value Content (RVC) threshold
  │   │   ├─ Specific process requirement
  │   │   └─ Combination of the above
  │   └─ Continue to Step 3
  │
  ├─ Step 3: Trace all materials in the bill of materials (BOM)
  │   ├─ For each input material, determine:
  │   │   ├─ HS classification of the input
  │   │   ├─ Country of origin of the input
  │   │   ├─ Value of the input (for RVC calculations)
  │   │   └─ Whether the input is "originating" under the same FTA (for cumulation)
  │   └─ Continue to Step 4
  │
  ├─ Step 4: Apply the product-specific rule
  │   ├─ Tariff Shift: Has every non-originating material undergone the required tariff shift?
  │   │   ├─ CTC (change in tariff chapter): all non-originating materials must be from a
  │   │   │   different 2-digit chapter than the finished good
  │   │   ├─ CTH (change in tariff heading): different 4-digit heading
  │   │   ├─ CTSH (change in tariff subheading): different 6-digit subheading
  │   │   └─ Check exceptions — many rules list specific headings that are EXCLUDED from the
  │   │       tariff shift (e.g., "a change from any heading except 7208-7212")
  │   ├─ RVC: Does the regional value content meet or exceed the threshold?
  │   │   ├─ Calculate using the permitted method(s)
  │   │   └─ If the FTA offers multiple methods, use the most favourable
  │   └─ Process: Has the required manufacturing process been performed in the territory?
  │
  ├─ Step 5: Apply cumulation (if applicable)
  │   ├─ Materials originating in other FTA partner countries can be treated as originating
  │   ├─ Bilateral cumulation: only between the two parties (EU-UK TCA)
  │   ├─ Diagonal cumulation: among all parties (RCEP, PEM Convention)
  │   └─ Full cumulation: even processing (not just originating materials) in partner countries
  │       counts toward origin (EU Overseas Countries and Territories)
  │
  ├─ Step 6: Apply de minimis / tolerance rules
  │   ├─ Most FTAs allow a small percentage of non-originating materials that don't meet the
  │   │   tariff shift rule (typically 7-10% of the product's value)
  │   ├─ De minimis does NOT apply to materials specifically excluded in the product-specific rule
  │   └─ Textiles have separate de minimis rules (usually weight-based, not value-based)
  │
  └─ Step 7: Verify certification and documentation requirements
      ├─ USMCA: self-certification with nine required data elements
      ├─ EU-UK TCA: origin declaration on the invoice (for consignments under €6,000 any
      │   exporter; above €6,000 requires REX registration)
      ├─ RCEP: certificate of origin (Form RCEP) or origin declaration
      └─ Retain ALL supporting documentation for the FTA's prescribed retention period
```

### 2.2 USMCA Rules of Origin — Detailed Application

**Tariff Shift Rules:**

USMCA Annex 4-B contains product-specific rules for every HS heading. Many rules combine
a tariff shift requirement with an RVC threshold. Common patterns:

- **Pure tariff shift:** "A change to heading 9403 from any other chapter." All non-originating
  materials must come from chapters other than 94 (furniture). If you use non-originating wood
  from Chapter 44 to make a wooden table, the wood satisfies this rule because Chapter 44 ≠ Chapter 94.
  But if you import non-originating table legs already classified in heading 9403, the tariff shift fails.

- **Tariff shift with exceptions:** "A change to heading 6204 from any heading outside the group
  of headings 6201-6212, except from heading 5106-5113 or 5204-5212..." These carve-outs
  are designed to prevent simple assembly operations from conferring origin.

- **Tariff shift OR RVC:** "A change to heading 8471 from any other heading; or No required
  change in tariff classification, provided there is a regional value content of not less than
  45 percent under the transaction-value method or not less than 35 percent under the net cost method."
  The exporter may choose whichever alternative is easier to satisfy.

**Regional Value Content Calculations:**

*Transaction Value Method:*
```
RVC = ((TV - VNM) / TV) × 100
```
Where:
- TV = Transaction Value of the good (adjusted to FOB)
- VNM = Value of Non-originating Materials (including parts, materials consumed in production)

*Net Cost Method:*
```
RVC = ((NC - VNM) / NC) × 100
```
Where:
- NC = Total cost minus sales promotion, marketing, after-sales service, royalties, shipping and
  packing costs, and non-allowable interest
- VNM = same as above

The net cost method typically produces a HIGHER RVC because it removes costs that inflate the
denominator. Use it when margins are thin or when significant royalty/promotion costs are present.

**Automotive Rules (USMCA-specific):**

USMCA introduced the most complex automotive rules of origin ever negotiated:
- Passenger vehicles: 75% RVC using net cost method (phased in from 62.5%)
- Core parts (engines, transmissions, body/chassis): separate 75% RVC requirement
- Principal parts (brakes, axles, suspension): 70% RVC
- Complementary parts (A/C, steering, batteries): 70% RVC
- Steel and aluminium: 70% must be "melted and poured" in North America
- Labour Value Content: 40% of production must be by workers earning ≥ US$16/hour (high-wage)

### 2.3 EU-UK TCA Rules of Origin

**Key Differences from USMCA:**

- No self-certification for high-value consignments without REX registration
- Bilateral cumulation only (UK + EU, not with third countries unless separate agreements exist)
- "Insufficient processing" list: operations that NEVER confer origin regardless of tariff shift
  (e.g., simple assembly, packaging, mixing, ironing of textiles, sharpening/grinding)
- Tolerance: 10% of ex-works price for non-originating materials that don't satisfy the list rule
  (15% for products of Chapters 50-63, textiles — but measured by weight, not value)

**List Rules Structure:**

EU-UK TCA Annex ORIG-2 provides rules in four columns:
1. HS heading of the finished product
2. Description of the product
3. Working or processing on non-originating materials that confers origin
4. Alternative rule (if available)

Example: Heading 8418 (refrigerators)
- Rule: "Manufacture in which all materials used are classified within a heading other than
  that of the product" AND "the value of all non-originating materials used does not exceed
  40% of the ex-works price of the product"
- Both conditions must be met (they are cumulative, not alternative)

### 2.4 RCEP Rules of Origin

**Key Features:**

- 15 member states with diagonal cumulation
- Product-specific rules use both tariff shift and RVC (40% threshold typical)
- RVC can be calculated using either:
  - Build-up: RVC = (VOM / FOB) × 100 ≥ 40%
  - Build-down: RVC = ((FOB - VNM) / FOB) × 100 ≥ 40%
- Certificate of Origin (Form RCEP) or approved exporter origin declaration
- "Back-to-back" certificates allowed for goods transshipped through a non-party (critical for
  Singapore/Hong Kong hub operations)
- Product-specific rules for Chapters 50-63 (textiles) are notably restrictive — many require
  two-step processing (yarn → fabric → garment)

### 2.5 AfCFTA Rules of Origin (Summary)

- General rule: value-added threshold of 40% (or a change in tariff heading)
- Cumulation: up to 60% of materials can originate from other AfCFTA member states
- Simplified rules for LDC member states
- Product-specific rules still being negotiated for many tariff lines — check the latest Protocol
  on Rules of Origin annexes before relying on general rules

---

## 3. Customs Valuation Methods

### 3.1 Method Selection Decision Tree

```
START: Determine the customs value of imported goods
  │
  ├─ Method 1: Transaction Value
  │   ├─ Is there a sale for export to the country of importation?
  │   │   ├─ NO (consignment, loan, free sample, gift, lease) → Skip to Method 2
  │   │   └─ YES → Is the sale between related parties?
  │   │       ├─ NO → Is the sale subject to conditions that cannot be quantified?
  │   │       │   ├─ NO → Are there restrictions on disposition/use (other than legal or geographic)?
  │   │       │   │   ├─ NO → Transaction Value = Price paid or payable + additions - deductions
  │   │       │   │   │   ├─ Additions (19 CFR § 152.103 / UCC Art. 71):
  │   │       │   │   │   │   ├─ Commissions (except buying commissions)
  │   │       │   │   │   │   ├─ Assists (tools, dies, moulds, engineering provided free/at reduced cost)
  │   │       │   │   │   │   ├─ Royalties and licence fees related to the imported goods, payable as
  │   │       │   │   │   │   │   a condition of sale
  │   │       │   │   │   │   ├─ Packing costs
  │   │       │   │   │   │   ├─ Proceeds of subsequent resale accruing to the seller
  │   │       │   │   │   │   └─ US: cost of transport TO the US port (ocean/air freight, insurance)
  │   │       │   │   │   │       EU: transport and insurance to the EU border are INCLUDED
  │   │       │   │   │   │       (CIF basis for EU, FOB+ for US)
  │   │       │   │   │   └─ Deductions (not included in transaction value):
  │   │       │   │   │       ├─ Post-importation transport costs (inland freight)
  │   │       │   │   │       ├─ Import duties and taxes
  │   │       │   │   │       ├─ Construction/installation costs after importation
  │   │       │   │   │       └─ Buying commissions (if clearly identified)
  │   │       │   │   └─ CLASSIFY VALUE. STOP.
  │   │       │   └─ YES → Skip to Method 2
  │   │       └─ YES (related parties) →
  │   │           ├─ Did the relationship influence the price?
  │   │           │   ├─ NO (demonstrate with "circumstances of sale" test or test values) →
  │   │           │   │   Transaction Value is acceptable. Apply additions/deductions above.
  │   │           │   └─ YES or cannot demonstrate → Skip to Method 2
  │   │           └─ OR: Does the transaction value approximate a "test value"?
  │   │               (transaction value of identical/similar goods to unrelated buyers,
  │   │                deductive value, or computed value for identical/similar goods)
  │   │               ├─ YES → Transaction Value acceptable. STOP.
  │   │               └─ NO → Skip to Method 2
  │
  ├─ Method 2: Transaction Value of Identical Goods
  │   ├─ Are there importations of IDENTICAL goods?
  │   │   (same in all respects: physical characteristics, quality, reputation, country of origin)
  │   ├─ Sold for export at the same commercial level and in substantially the same quantity?
  │   │   (Adjustments permitted for quantity differences and transport costs)
  │   ├─ Sold at or about the same time as the goods being valued?
  │   │   ├─ YES to all → Use the transaction value of those identical goods. STOP.
  │   │   └─ NO to any → Skip to Method 3
  │
  ├─ Method 3: Transaction Value of Similar Goods
  │   ├─ Same criteria as Method 2, but for goods that are "similar" —
  │   │   closely resembling in characteristics, components, materials,
  │   │   and capable of performing the same functions and being commercially interchangeable
  │   │   ├─ Available → Use. STOP.
  │   │   └─ Not available → Skip to Method 4 (or Method 5 at importer's request in the US)
  │
  ├─ Method 4: Deductive Value
  │   ├─ Start with the unit price at which the greatest aggregate quantity is sold
  │   │   in the country of importation (within 90 days of import date)
  │   ├─ DEDUCT:
  │   │   ├─ Commissions or profit and general expenses normally earned on sales in the
  │   │   │   importing country for goods of the same class or kind
  │   │   ├─ Transport and insurance costs within the importing country
  │   │   ├─ Customs duties and other national taxes payable on importation
  │   │   └─ If the goods are further processed after importation ("super deductive"):
  │   │       deduct the value added by the processing
  │   └─ Result = Deductive Value. STOP.
  │
  ├─ Method 5: Computed Value
  │   ├─ BUILD UP from:
  │   │   ├─ Cost or value of materials and fabrication/processing in the producing country
  │   │   ├─ Amount for profit and general expenses equal to that usually reflected in sales
  │   │   │   of goods of the same class or kind from the country of exportation
  │   │   └─ Cost of transport and insurance to the importing country (CIF for EU, FOB+ for US)
  │   ├─ This method is only available if the foreign producer is willing to share cost data
  │   │   and submit to verification by the importing country's customs authority
  │   └─ Result = Computed Value. STOP.
  │
  └─ Method 6: Fallback ("Reasonable Means")
      ├─ Flexible application of Methods 1-5 with reasonable adjustments
      ├─ Prohibitions — the value CANNOT be based on:
      │   ├─ Selling price of goods produced in the importing country
      │   ├─ A system providing for use of the higher of two alternative values
      │   ├─ The price of goods in the domestic market of the country of exportation
      │   ├─ Minimum customs values
      │   ├─ Arbitrary or fictitious values
      │   └─ Cost of production other than computed values for identical/similar goods
      └─ Result = Fallback Value. STOP.
```

### 3.2 Related-Party Valuation — Circumstances of Sale Test

When the buyer and seller are related (per 19 USC § 1401a(g) or UCC Art. 127), customs
authorities will scrutinise the transaction value. To demonstrate that the relationship did not
influence the price:

**Evidence that supports acceptance:**

1. The price was settled in a manner consistent with normal pricing practices in the industry
2. The price was settled in a manner consistent with how the seller prices to unrelated buyers
3. The price is adequate to ensure recovery of all costs plus a profit equivalent to the
   firm's overall profit over a representative period in sales of goods of the same class or kind
4. Transfer pricing documentation showing the price was set at arm's length under OECD guidelines

**Test values (alternative to circumstances of sale):**

The transaction value is acceptable if it closely approximates one of:
- Transaction value on identical or similar goods sold to unrelated buyers in the importing country
- Deductive value for identical or similar goods
- Computed value for identical or similar goods

"Closely approximates" means within a reasonable range — CBP and EU customs have discretion here,
but differences under 5% are generally accepted, 5-10% require explanation, and over 10% will
likely trigger rejection of the transaction value.

### 3.3 Assists Valuation

Assists are one of the most frequently overlooked additions to transaction value. An assist is
anything the buyer provides to the seller free of charge or at reduced cost for use in producing
the imported goods:

**Types of assists:**

| Assist Type | Valuation Method | Apportionment |
|---|---|---|
| Materials consumed in production (raw materials, components) | Cost of acquisition or production | Full value added to first shipment, or prorated across all units produced |
| Tools, dies, moulds, and similar items | Cost of acquisition or production; if previously used, current value only | Prorated across the number of units produced using the tool/die/mould |
| Engineering, development, artwork, design, plans, and sketches | Cost if undertaken in the importing country; value if undertaken elsewhere | Prorated across anticipated total production, or first shipment |
| Materials consumed in production provided by related parties | Price paid between related parties if arm's length; otherwise cost of production | Same as unrelated-party assists |

**Critical assist trap:** A US company sends CAD drawings to a Chinese manufacturer at no charge.
The value of producing those drawings (engineering time, software licences) must be added to the
customs value of every import from that manufacturer that uses those drawings. Failure to declare
assists is one of the top findings in CBP Focused Assessments and triggers penalty exposure.

### 3.4 Royalties and Licence Fees

Royalties are dutiable additions to transaction value when they are:
1. Related to the imported goods (not to post-importation activity), AND
2. Paid as a condition of the sale (the buyer cannot buy the goods without paying the royalty)

**Dutiable examples:**
- Royalty paid to the seller (or a related party) for the right to manufacture using a patented
  process — the royalty directly relates to production of the imported goods
- Trademark licence fee paid to the parent company where the manufacturer will only produce
  goods bearing the trademark for the licensed importer
- Technology licence fee where the foreign producer can only access the technology through the
  buyer's licence

**Non-dutiable examples:**
- Royalty for the right to distribute or resell in the importing country (post-importation activity)
- Royalty paid to an unrelated third party where the seller has no knowledge of or interest in
  the royalty arrangement and the royalty is not a condition of the sale

**The "condition of sale" analysis is fact-intensive.** Look at:
- Would the seller sell the goods to the buyer without the royalty being paid?
- Does the seller have any involvement in, or control over, the royalty arrangement?
- Can the buyer source the goods elsewhere if the royalty is not paid?

---

## 4. Restricted Party Screening Protocol

### 4.1 Screening Workflow

```
START: New transaction (sale, purchase, or service)
  │
  ├─ Step 1: Identify ALL parties to the transaction
  │   ├─ Buyer / importer of record
  │   ├─ Seller / exporter
  │   ├─ Ultimate consignee / end user
  │   ├─ Intermediate consignees
  │   ├─ Freight forwarders and customs brokers
  │   ├─ Banks (in letter of credit transactions)
  │   ├─ Ship-to addresses (if different from buyer/consignee)
  │   └─ Any agents, representatives, or beneficial owners
  │
  ├─ Step 2: Screen ALL identified parties against ALL applicable lists
  │   ├─ US Lists (if US nexus exists — US-origin goods, US persons, US financial system):
  │   │   ├─ OFAC SDN List (Specially Designated Nationals and Blocked Persons)
  │   │   ├─ OFAC Sectoral Sanctions Identifications (SSI) List
  │   │   ├─ OFAC Non-SDN Menu-Based Sanctions List (NS-MBS)
  │   │   ├─ BIS Entity List (Supplement No. 4 to Part 744)
  │   │   ├─ BIS Denied Persons List
  │   │   ├─ BIS Unverified List
  │   │   ├─ BIS Military End User (MEU) List
  │   │   ├─ DDTC Debarred Parties (AECA Section 38)
  │   │   └─ Non-Proliferation Sanctions lists
  │   ├─ EU Lists (if EU nexus exists):
  │   │   ├─ EU Consolidated Financial Sanctions List
  │   │   └─ EU Dual-Use Regulation Annex I controlled end-users
  │   ├─ UK Lists (if UK nexus exists):
  │   │   ├─ UK OFSI Consolidated List
  │   │   └─ UK Export Control Joint Unit
  │   ├─ Other Jurisdictions: Australia DFAT, Canada SEMA, Japan METI, etc.
  │   └─ Internal denied/watch lists (prior compliance issues, flagged entities)
  │
  ├─ Step 3: Evaluate screening results
  │   ├─ NO HITS → Document the screening (date, tool, parties screened, result).
  │   │   Proceed with the transaction. STOP.
  │   ├─ HITS RETURNED → Continue to Step 4
  │
  ├─ Step 4: Adjudicate each hit
  │   ├─ For each hit, assess:
  │   │   ├─ Name match quality (exact, near-exact, partial, phonetic)
  │   │   ├─ Address correlation (same country? same city? same street?)
  │   │   ├─ Date of birth / incorporation date (for individuals / entities)
  │   │   ├─ Alias match (is the match against a known alias?)
  │   │   ├─ Additional identifiers (passport #, tax ID, DUNS, vessel IMO#)
  │   │   └─ Prior transaction history (known good customer for 10 years?)
  │   ├─ FALSE POSITIVE (high confidence) → Document adjudication rationale.
  │   │   Record: who adjudicated, date, factors considered, conclusion.
  │   │   Proceed with transaction. STOP.
  │   ├─ POSSIBLE MATCH (ambiguous) → Continue to Step 5
  │   └─ TRUE POSITIVE (confirmed) → Continue to Step 6
  │
  ├─ Step 5: Escalate ambiguous matches
  │   ├─ Request additional identifying information from the customer/counterparty
  │   ├─ Engage compliance counsel
  │   ├─ Do NOT proceed with the transaction until resolved
  │   ├─ Document the hold and all steps taken
  │   └─ If cannot be resolved → Treat as TRUE POSITIVE (Step 6)
  │
  └─ Step 6: True positive — full stop
      ├─ BLOCK the transaction immediately
      ├─ SDN/OFAC match:
      │   ├─ Block and report to OFAC within 10 business days
      │   ├─ Do not release goods, do not process payment, do not communicate
      │   │   the reason to the blocked party
      │   └─ Determine if an OFAC licence is available and warranted
      ├─ Entity List match:
      │   ├─ Determine licence requirement (most are "presumption of denial")
      │   ├─ If a licence exception is available, document the basis
      │   └─ If no exception, apply for a BIS licence (expect 60-90 day processing)
      ├─ Denied Persons List match:
      │   ├─ ABSOLUTE prohibition — no licence available
      │   └─ No exports, re-exports, or in-country transfers to denied persons
      ├─ Notify compliance officer and legal counsel
      ├─ Document EVERYTHING — the hit, the adjudication, the decision, the block
      └─ Retain records indefinitely for DPL; 5 years minimum for others
```

### 4.2 Red Flag Indicators — Enhanced Due Diligence Triggers

When any of the following red flags are present, standard screening is insufficient. Conduct
enhanced due diligence before proceeding:

| Red Flag | What It Suggests | Required Action |
|---|---|---|
| Customer declines to state end use | Diversion risk | Require end-use certificate or decline the transaction |
| Unusual routing (e.g., electronics shipped Lagos→Dubai→Baku) | Sanctions evasion / diversion to embargoed destination | Map the full supply chain; verify the final destination |
| Customer willing to pay cash for high-value capital goods | Money laundering or sanctions circumvention | Enhanced KYC; verify source of funds |
| Delivery to P.O. Box, residential address, or free trade zone | Concealment of true end user | Require physical street address and site visit if >$50K |
| Product capability exceeds stated end use | Military/WMD diversion | Verify end-use statement matches the product specification |
| Customer has no Internet presence or verifiable business history | Shell company or front for sanctioned entity | Company registration check, D&B report, beneficial ownership analysis |
| Order for spare parts inconsistent with installed base | Stockpiling for embargoed destination | Request installed-base details; verify service history |
| Customer requests removal of product labelling or markings | Circumvention of end-use controls or trademark fraud | Decline the request and escalate to compliance |
| Customer or forwarding agent was previously flagged | Repeat compliance risk | Senior compliance review before any transaction |
| Payment from a third party or country not involved in the transaction | Sanctions evasion through financial intermediaries | Verify the commercial rationale for the payment structure |

---

## 5. Penalty Risk Assessment

### 5.1 US Penalty Framework — Detailed Analysis

**19 USC § 1592 — Penalties for Fraud, Gross Negligence, and Negligence:**

| Element | Fraud | Gross Negligence | Negligence |
|---|---|---|---|
| **Mental state** | Intentional and knowing violation with intent to defraud | Conscious disregard of a known duty or gross indifference | Failure to exercise reasonable care |
| **Maximum penalty** | Domestic value of the merchandise | 4× lost revenue, or 40% of dutiable value | 2× lost revenue, or 20% of dutiable value |
| **Criminal referral** | Yes — up to $10K fine and 2 years per count (18 USC § 542) | Rare | No |
| **Proof burden** | CBP must prove fraud by clear and convincing evidence | CBP must prove by preponderance of the evidence | CBP must prove by preponderance; importer must show reasonable care |
| **Mitigation potential** | Limited — requires extraordinary cooperation | Moderate — compliance programme, disclosure, cooperation | Significant — first offence, corrective actions, small scale |
| **Prior disclosure effect** | Caps penalty at 1× lost revenue (if accepted) | Caps penalty at 1× lost revenue | Caps penalty at interest on the unpaid duties |
| **Statute of limitations** | 5 years from date of violation | 5 years | 5 years |

**Penalty Mitigation Factors (per CBP's Mitigation Guidelines):**

1. **Contributory CBP error:** Did CBP accept prior entries with the same error without comment?
2. **Cooperation:** Full cooperation with the investigation, including production of records and
   internal investigation findings
3. **Immediate corrective action:** Did the importer fix the problem as soon as it was discovered?
4. **Prior good record:** Clean compliance history for 5+ years
5. **Inability to pay:** Financial hardship (documented) can reduce monetary penalties
6. **Scale of violation:** Isolated incident vs systemic pattern
7. **Compliance programme:** Existence and effectiveness of an internal compliance programme

### 5.2 Prior Disclosure Decision Framework

```
START: You have discovered a potential customs violation
  │
  ├─ Step 1: Assess — Has CBP already commenced an investigation?
  │   ├─ YES (you've received a CF-28 Request for Information, CF-29 Notice of Action,
  │   │        pre-penalty notice, or Focused Assessment notification) →
  │   │   Prior disclosure is still available UNTIL a formal investigation has commenced.
  │   │   A CF-28/29 alone does not constitute commencement. A pre-penalty notice does.
  │   │   ├─ Pre-penalty notice or formal investigation commenced → Prior disclosure
  │   │   │   is NOT available. Respond to the notice with legal counsel. STOP.
  │   │   └─ Only CF-28/29 → Prior disclosure is still available. Continue.
  │   └─ NO → Prior disclosure is available. Continue to Step 2.
  │
  ├─ Step 2: Determine the nature and scope of the violation
  │   ├─ Classification error → How many entries are affected? Calculate total duty differential.
  │   ├─ Valuation error → Quantify the underdeclared value and the corresponding duty impact.
  │   ├─ Origin misstatement → Identify all affected entries and the correct origin.
  │   ├─ FTA over-claim → Calculate the duty that should have been paid without the preference.
  │   ├─ Record-keeping failure → Identify what records are missing and for which entries.
  │   └─ Other → Define the specific violation and quantify the duty impact.
  │
  ├─ Step 3: Evaluate prior disclosure vs. alternative strategies
  │   ├─ Prior disclosure IS advisable when:
  │   │   ├─ The violation is clear-cut and the duty shortfall is quantifiable
  │   │   ├─ You are confident CBP has not yet begun investigating this issue
  │   │   ├─ The penalty exposure is material (prior disclosure caps it at interest/1×)
  │   │   └─ The violation involves negligence or gross negligence (not fraud)
  │   ├─ Prior disclosure may NOT be advisable when:
  │   │   ├─ The classification or valuation position is defensible and you are prepared to litigate
  │   │   ├─ The amount at issue is de minimis (the administrative cost of disclosure exceeds benefit)
  │   │   ├─ The violation is uncertain — you may be disclosing something that isn't actually wrong
  │   │   └─ The disclosure would reveal other issues CBP is unaware of (consult counsel first)
  │   └─ ALWAYS consult legal counsel before filing. Prior disclosure is an admission of violation.
  │
  ├─ Step 4: Prepare the prior disclosure
  │   ├─ Required elements (19 CFR § 162.74):
  │   │   ├─ Identify the entry numbers and dates of all affected entries
  │   │   ├─ Describe the specific violation (what was wrong)
  │   │   ├─ Provide the correct information (what should have been declared)
  │   │   ├─ Identify the circumstances that led to the violation (how it happened)
  │   │   ├─ Calculate the duty owed with interest
  │   │   └─ Tender the full amount of unpaid duties (or explain why you cannot calculate exactly
  │   │       and provide a good-faith estimate with a commitment to pay the final amount)
  │   ├─ File with the FP&F office at the port of entry (or the CEE with jurisdiction)
  │   └─ Retain a copy with proof of delivery
  │
  └─ Step 5: Post-filing
      ├─ CBP will review the disclosure and may request additional information
      ├─ If accepted, you will receive a penalty notice limited to interest (negligence) or
      │   1× lost revenue (gross negligence)
      ├─ If rejected (disclosure was incomplete, or investigation had already commenced),
      │   full penalty exposure returns
      └─ Implement corrective measures to prevent recurrence — CBP will look at this if
          another violation occurs
```

### 5.3 Export Control Penalty Framework

**BIS (EAR) Penalties:**
- Civil: Up to $330,198 per violation OR twice the value of the transaction, whichever is greater
  (adjusted annually for inflation)
- Criminal: Up to $1,000,000 per violation and 20 years imprisonment
- Denial of export privileges: automatic bar from all exports/re-exports from the US

**DDTC (ITAR) Penalties:**
- Civil: Up to $1,301,256 per violation (adjusted annually)
- Criminal: Up to $1,000,000 per violation and 20 years imprisonment
- Debarment from all ITAR-controlled exports

**OFAC Penalties:**
- Vary by sanctions programme, but civil penalties can exceed $330,000 per violation for
  IEEPA-based sanctions
- Criminal: up to $1,000,000 and 20 years imprisonment under IEEPA
- Strict liability for OFAC violations — no intent required for civil penalties

---

## 6. Post-Entry Audit Preparation

### 6.1 CBP Focused Assessment Preparation Checklist

When a CBP Focused Assessment is announced, the following preparation is critical:

**Documentation to assemble:**
- [ ] Internal compliance manual / SOP documentation
- [ ] Organisational chart showing compliance function reporting lines
- [ ] Training records for all personnel involved in import operations
- [ ] Customs broker power of attorney and instructions
- [ ] Classification decisions with supporting rationale (for sample entries)
- [ ] Valuation documentation including assist calculations and related-party analysis
- [ ] FTA qualification files with supplier certifications
- [ ] Restricted party screening logs with adjudication records
- [ ] Reconciliation entries (if applicable)
- [ ] Prior disclosures filed (if any)
- [ ] Internal audit reports for the past 3 years
- [ ] Record retention policy and evidence of compliance

**Pre-assessment self-audit:**
1. Pull 50 representative entries spanning the audit period
2. Re-classify the top 20 by value — does the classification still hold?
3. Re-value 10 entries including related-party transactions — are assists captured?
4. Verify FTA claims on 10 entries — is the origin documentation complete?
5. Re-screen all parties from 10 entries — any new hits since original screening?
6. Identify and disclose any errors found BEFORE the FA team arrives (prior disclosure still available)

---

## 7. Incoterms Decision Matrix

### 7.1 Selecting the Appropriate Incoterm

| Consideration | Recommended Incoterm | Rationale |
|---|---|---|
| Buyer wants maximum control over logistics | FCA | Buyer chooses carrier, route, and insurance. Seller handles export formalities. |
| Seller has better freight rates (economy of scale) | CIF / CIP | Seller leverages volume contracts. Buyer bears risk from first carrier. |
| Buyer cannot act as exporter in seller's country | FCA, CPT, CIP, DAP, DDP | Avoid EXW — it makes the buyer the exporter of record in the origin country. |
| Buyer lacks import capability in destination | DDP | Seller handles everything including import clearance. Seller must register as IOR. |
| Letter of credit requires on-board BOL | FCA (with 2020 A6/B6 option) | The 2020 revision allows buyer to instruct carrier to issue on-board BOL to seller. |
| High-risk transit (theft, damage, piracy corridor) | CIF / CIP | Seller is responsible for insurance. CIP requires all-risks coverage (ICC A). |
| Containerised ocean freight | FCA, CPT, CIP | FOB is technically incorrect for containers — risk transfers at container yard, not ship's rail. |
| Domestic delivery (same country) | FCA, DAP | Incoterms are not required for domestic; if used, FCA or DAP are appropriate. |

### 7.2 Incoterms and Customs Valuation Impact

The Incoterm affects the customs value because different terms include or exclude freight and
insurance in the invoice price:

| Incoterm | US Customs Value Adjustment | EU Customs Value Adjustment |
|---|---|---|
| EXW | ADD: inland freight to port + international freight + insurance to US port | ADD: inland freight to port + international freight + insurance to EU border |
| FCA | ADD: international freight + insurance from named place to US port | ADD: international freight + insurance from named place to EU border |
| FOB | ADD: ocean freight + insurance to US port (already includes inland to port) | ADD: ocean freight + insurance to EU border |
| CFR/CPT | ADD: insurance (freight already included) | ADD: insurance (freight already included) |
| CIF/CIP | No adjustment (freight and insurance included) | No adjustment (freight and insurance included) |
| DAP | DEDUCT: inland freight from port/airport to final destination in US (if identifiable) | DEDUCT: inland freight from EU border to destination |
| DDP | DEDUCT: inland freight + import duties (duty is never part of customs value) | DEDUCT: inland freight from EU border + import duties |
