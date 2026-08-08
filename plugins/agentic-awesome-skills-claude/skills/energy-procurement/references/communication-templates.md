# Communication Templates — Energy Procurement

> **Reference Type:** Tier 3 — Load on demand when composing or reviewing energy procurement communications.
>
> **Usage:** Each template includes variable placeholders in `{{double_braces}}` for direct substitution. Templates are organized by communication type and business context. Select the template matching your scenario, substitute variables, review tone guidance, and send.

---

## Table of Contents

1. [RFP to Energy Suppliers](#1-rfp-to-energy-suppliers)
2. [PPA Term Sheet Response](#2-ppa-term-sheet-response)
3. [Utility Rate Case Intervention Comment](#3-utility-rate-case-intervention-comment)
4. [Demand Response Program Enrollment](#4-demand-response-program-enrollment)
5. [Budget Forecast Presentation](#5-budget-forecast-presentation)
6. [Sustainability Report — Energy Section](#6-sustainability-report--energy-section)
7. [Internal Energy Cost Variance Analysis](#7-internal-energy-cost-variance-analysis)
8. [Supplier Contract Renewal Negotiation](#8-supplier-contract-renewal-negotiation)
9. [Regulatory Filing Comment](#9-regulatory-filing-comment)
10. [Board-Level Energy Strategy Summary](#10-board-level-energy-strategy-summary)

---

## Variable Reference

Common variables used across templates:

| Variable | Description | Example |
|---|---|---|
| `{{our_company}}` | Our company legal name | `Meridian Manufacturing Corp.` |
| `{{our_contact_name}}` | Our representative name | `Jennifer Walsh` |
| `{{our_contact_title}}` | Our representative title | `Director of Energy Procurement` |
| `{{our_contact_email}}` | Our representative email | `jwalsh@meridian.com` |
| `{{our_contact_phone}}` | Our representative phone | `(614) 555-0247` |
| `{{supplier_name}}` | Energy supplier name | `NorthStar Energy Solutions` |
| `{{supplier_contact}}` | Supplier contact name | `David Chen` |
| `{{supplier_contact_title}}` | Supplier contact title | `VP, Commercial Sales` |
| `{{utility_name}}` | Utility company name | `AEP Ohio` |
| `{{iso_name}}` | ISO/RTO name | `PJM Interconnection` |
| `{{facility_name}}` | Facility name | `Columbus Manufacturing Plant` |
| `{{facility_address}}` | Facility address | `4500 Industrial Parkway, Columbus, OH 43228` |
| `{{account_number}}` | Utility account number | `110-485-7723` |
| `{{annual_consumption_mwh}}` | Annual electricity consumption | `42,000 MWh` |
| `{{peak_demand_kw}}` | Peak demand in kW | `6,200 kW` |
| `{{current_rate}}` | Current contract rate | `$0.058/kWh` |
| `{{proposed_rate}}` | Proposed new rate | `$0.054/kWh` |
| `{{market_rate}}` | Market benchmark rate | `$0.062/kWh` |
| `{{contract_start}}` | Contract start date | `2027-01-01` |
| `{{contract_end}}` | Contract end date | `2029-12-31` |
| `{{rfp_deadline}}` | RFP response deadline | `2026-05-15` |
| `{{ppa_project_name}}` | Renewable project name | `Prairie Wind Farm II` |
| `{{ppa_capacity_mw}}` | PPA project capacity | `150 MW` |
| `{{ppa_strike_price}}` | PPA strike price | `$34/MWh` |
| `{{ppa_term_years}}` | PPA contract term | `15 years` |
| `{{re_percentage}}` | Current renewable energy percentage | `38%` |
| `{{re_target}}` | RE100 target year | `2030` |
| `{{docket_number}}` | Regulatory docket number | `Case No. 26-1234-EL-AIR` |
| `{{budget_year}}` | Budget forecast year | `2027` |
| `{{total_energy_spend}}` | Total annual energy spend | `$14.2M` |
| `{{num_facilities}}` | Number of facilities | `18` |

---

## 1. RFP to Energy Suppliers

**Channel:** Email with attached RFP document
**Audience:** Retail energy provider sales/pricing team
**Tone:** Professional, data-rich, competitive. You're offering a significant commercial opportunity — present it as such.

---

**Subject:** `Invitation to Bid — {{our_company}} Electricity Supply RFP — {{contract_start}} Start`

{{supplier_contact}},

{{our_company}} is conducting a competitive electricity supply procurement for {{num_facilities}} facilities across {{iso_name}} territory. We are inviting {{supplier_name}} to participate based on your market position and capabilities in our service territory.

**RFP Summary:**
- **Scope:** {{num_facilities}} commercial and industrial facilities
- **Total annual consumption:** {{annual_consumption_mwh}}
- **Aggregate peak demand:** {{peak_demand_kw}}
- **Contract period:** {{contract_start}} through {{contract_end}}
- **Product structures requested:** Fixed-price full requirements, block-and-index, and index with price cap
- **Bid deadline:** {{rfp_deadline}}, 5:00 PM ET

**Included with this invitation:**
1. RFP response template (Excel) with site-level detail
2. 36 months of 15-minute interval data for each facility (CSV)
3. Current tariff information and utility account numbers
4. Evaluation criteria and weighting

**Evaluation criteria:**
- Total cost across three price scenarios (40%)
- Supplier credit quality and financial stability (20%)
- Contract flexibility including volume tolerance and early termination provisions (15%)
- Sustainability services — REC sourcing, carbon reporting, PPA advisory (15%)
- Market intelligence and advisory capabilities (10%)

**Key requirements:**
- All bids must include volume tolerance of ±10% minimum
- Pricing must be provided for all three product structures independently
- Supplier must demonstrate minimum BBB credit rating or equivalent
- RECs must be sourced from projects within the {{iso_name}} footprint

Please confirm your intent to participate by {{rfp_confirmation_date}}. Clarification questions will be accepted through {{rfp_questions_deadline}} via email to {{our_contact_email}}.

We look forward to {{supplier_name}}'s participation.

{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

**Tone Notes:**
- Do not share current pricing with bidders. "Current contract details are confidential" is the standard response.
- Do not disclose the number of bidders. "We have invited a competitive field" is sufficient.
- Respond to all clarification questions in a consolidated Q&A sent to all bidders simultaneously to maintain fairness.

---

## 2. PPA Term Sheet Response

**Channel:** Email to developer's commercial team
**Audience:** Renewable energy project developer
**Tone:** Collaborative but commercially rigorous. PPAs are 10-25 year commitments — every term matters.

---

**Subject:** `{{our_company}} Response to {{ppa_project_name}} Term Sheet — Commercial Feedback`

{{developer_contact}},

Thank you for the term sheet for {{ppa_project_name}} ({{ppa_capacity_mw}}). We've completed our initial review and have the following feedback organized by commercial, financial, and operational terms.

**Commercial Terms:**
- **Strike price:** The proposed {{ppa_strike_price}} is within our target range based on current forward curves. We would like to discuss a price escalator structure — 0% escalation for years 1-5 with a [CPI-linked / fixed 1.5%] escalator beginning year 6.
- **Settlement point:** We request settlement at the {{iso_name}} [load zone / hub] rather than the project node, to reduce our basis risk exposure. We understand this may require a price adjustment and are prepared to discuss.
- **Contract volume:** We would like to discuss a partial offtake ({{our_offtake_mw}} MW of the {{ppa_capacity_mw}} project) with right of first refusal on additional capacity.

**Risk Allocation:**
- **Curtailment:** We request that the developer bear curtailment risk for the first 5% annually, with shared risk (50/50) for curtailment between 5-10%, and developer risk above 10%. The current term sheet allocates all curtailment risk to the offtaker, which is not acceptable for a {{ppa_term_years}}-year commitment.
- **Negative pricing:** We require a negative price floor provision: during intervals when the settlement point LMP is negative, no settlement occurs (neither party pays). This protects both parties from volatile negative pricing hours.
- **Change of law:** The term sheet's change-of-law provision is one-sided. We propose mutual termination rights if a regulatory change materially affects the economics for either party, with a defined materiality threshold of {{materiality_threshold}}.

**Financial and Credit:**
- **Credit support:** We are prepared to provide [a parent guarantee / an LC] for an amount equal to {{credit_support_amount}}, sized to 2 years of potential negative mark-to-market exposure under our stress scenario.
- **Accounting treatment:** We require confirmation that the PPA structure qualifies for normal purchases and normal sales (NPNS) exception under ASC 815, or alternatively that hedge accounting is achievable. Our treasury team will need to review the final contract with our auditors.

**REC Provisions:**
- **Vintage delivery:** RECs must be delivered within 12 months of generation to maintain RE100 compliance.
- **Replacement RECs:** If the project underdelivers RECs by more than 10% in any year, the developer provides replacement RECs from a comparable facility at no additional cost.

We would welcome a call this week to discuss these points. Please suggest availability.

{{our_contact_name}}
{{our_contact_title}}

---

**Tone Notes:**
- PPA negotiations are multi-round. The first response should establish your key positions without ultimatums.
- Always frame risk allocation as "fair to both parties" rather than "we won't accept your risk."
- Developers receive dozens of term sheet responses — be specific and organized to stand out as a serious offtaker.

---

## 3. Utility Rate Case Intervention Comment

**Channel:** Formal filing with state Public Utility Commission
**Audience:** PUC commissioners, administrative law judge, utility regulatory staff
**Tone:** Formal, data-driven, legally precise. This is a regulatory proceeding — opinions must be supported by evidence.

---

**Re:** {{docket_number}} — {{utility_name}} Application for Rate Increase

**Before the {{state}} Public Utilities Commission**

**Comments of {{our_company}}**

{{our_company}} respectfully submits these comments regarding {{utility_name}}'s application for a general rate increase filed on {{filing_date}}.

**I. Interest of {{our_company}}**

{{our_company}} operates {{num_facilities}} facilities in {{utility_name}}'s service territory, consuming approximately {{annual_consumption_mwh}} annually under rate schedule {{rate_schedule}}. The proposed rate increase would impose an estimated additional cost of ${{annual_impact}} per year on {{our_company}}'s operations.

**II. Summary of Concerns**

{{our_company}} does not oppose {{utility_name}}'s right to recover prudently incurred costs and earn a fair return. However, we raise the following concerns regarding the application as filed:

1. **Requested return on equity (ROE):** {{utility_name}} requests a {{requested_roe}}% ROE. Recent commission decisions in comparable proceedings in {{comparable_states}} have authorized ROEs of {{comparable_roe_range}}%. We respectfully submit that the requested ROE exceeds the range supported by current capital market conditions.

2. **Rate design:** The proposed rate design increases the volumetric energy charge by {{energy_increase_pct}}% while reducing the demand charge by only {{demand_decrease_pct}}%. This cost allocation methodology disadvantages high-load-factor industrial customers who contribute less to system peak on a per-kWh basis. We recommend cost allocation based on demonstrated cost causation, using a coincident peak methodology for demand-related costs.

3. **Rider pass-through timing:** The proposed infrastructure improvement rider allows for quarterly rate adjustments without commission review. We request that any rider mechanism include an annual true-up with commission review and a cumulative cap of {{rider_cap_pct}}% to prevent rate shock.

**III. Requested Relief**

{{our_company}} requests that the Commission:
- Set ROE at the midpoint of comparable authorized returns (approximately {{recommended_roe}}%)
- Adopt a coincident-peak cost allocation methodology for the {{rate_schedule}} rate class
- Include annual commission review and a cumulative cap on the proposed infrastructure rider

{{our_contact_name}}
{{our_contact_title}}, {{our_company}}

---

## 4. Demand Response Program Enrollment

**Channel:** Formal enrollment application
**Audience:** Utility or ISO demand response program administrator
**Tone:** Technical, precise. DR enrollment documents are contractual — accuracy matters.

---

**Subject:** `Demand Response Program Enrollment Application — {{facility_name}}`

To: {{dr_program_administrator}}

{{our_company}} hereby applies to enroll {{facility_name}} in the {{dr_program_name}} for the {{delivery_year}} delivery year.

**Facility Information:**
- **Facility:** {{facility_name}}
- **Address:** {{facility_address}}
- **Utility account:** {{account_number}}
- **Meter ID:** {{meter_id}}
- **Service voltage:** {{service_voltage}}
- **Current peak demand:** {{peak_demand_kw}}

**Curtailment Capability:**
- **Committed curtailment capacity:** {{dr_commitment_kw}} kW
- **Minimum notification time required:** {{notification_minutes}} minutes
- **Maximum curtailment duration:** {{max_duration_hours}} hours
- **Curtailment method:** [Load shedding via BAS / Backup generation / Battery discharge / Combination]
- **Loads available for curtailment:** {{curtailable_loads}}
- **Loads NOT available for curtailment (critical process):** {{non_curtailable_loads}}

**Baseline Methodology:**
We request the {{baseline_method}} baseline calculation methodology. Attached is a 12-month interval data file demonstrating our typical load profile during the DR event window ({{event_window}}).

**Testing:**
We are available for an enrollment verification test during the week of {{test_week}}. We can demonstrate the full {{dr_commitment_kw}} kW curtailment within {{notification_minutes}} minutes of notification.

{{our_contact_name}}
{{our_contact_title}}

---

## 5. Budget Forecast Presentation

**Channel:** Internal presentation (PowerPoint / memo)
**Audience:** CFO, VP Finance, Budget Committee
**Tone:** Precise, scenario-based, action-oriented. Finance wants numbers, ranges, and decision points — not energy market tutorials.

---

### {{budget_year}} Energy Cost Forecast — {{our_company}}

**Prepared by:** {{our_contact_name}}, {{our_contact_title}}
**Date:** {{forecast_date}}
**Scope:** {{num_facilities}} facilities, all electricity and natural gas

**Executive Summary:**
The {{budget_year}} total energy spend is forecast at **${{base_case_total}}** under base case assumptions, representing a {{yoy_change_pct}}% [increase/decrease] from {{prior_year}} actuals of ${{prior_year_total}}. The forecast range under stress scenarios is **${{low_case_total}}** to **${{high_case_total}}**.

| Component | {{prior_year}} Actual | {{budget_year}} Base Case | Change |
|-----------|---------------------|--------------------------|--------|
| Electricity — supply | ${{elec_supply_prior}} | ${{elec_supply_forecast}} | {{elec_supply_change}} |
| Electricity — delivery (T&D) | ${{elec_delivery_prior}} | ${{elec_delivery_forecast}} | {{elec_delivery_change}} |
| Electricity — demand charges | ${{demand_charges_prior}} | ${{demand_charges_forecast}} | {{demand_change}} |
| Electricity — capacity charges | ${{capacity_prior}} | ${{capacity_forecast}} | {{capacity_change}} |
| Natural gas | ${{gas_prior}} | ${{gas_forecast}} | {{gas_change}} |
| RECs / sustainability | ${{rec_prior}} | ${{rec_forecast}} | {{rec_change}} |
| **Total** | **${{prior_year_total}}** | **${{base_case_total}}** | **{{total_change}}** |

**Key Assumptions:**
- Electricity forward curve: {{forward_curve_source}} as of {{curve_date}}
- Natural gas: Henry Hub {{gas_assumption}} + basis of {{basis_assumption}}
- Weather: 10-year normal HDD/CDD
- Production volume: [flat / {{production_change}}% change] vs. prior year
- Hedged position: {{hedge_pct}}% of electricity volume locked at ${{hedged_rate}}/MWh

**Scenario Analysis:**

| Scenario | Electricity Cost | Gas Cost | Total | vs. Base Case |
|----------|-----------------|----------|-------|---------------|
| Base case | ${{elec_base}} | ${{gas_base}} | ${{base_case_total}} | — |
| Mild winter / cool summer | ${{elec_low}} | ${{gas_low}} | ${{low_case_total}} | {{low_delta}} |
| Severe winter / hot summer | ${{elec_high}} | ${{gas_high}} | ${{high_case_total}} | {{high_delta}} |
| Market stress (2× forward) | ${{elec_stress}} | ${{gas_stress}} | ${{stress_total}} | {{stress_delta}} |

**Decisions Requested:**
1. Approve the base case budget of ${{base_case_total}}
2. Authorize procurement of an additional {{additional_hedge_pct}}% hedge to bring total hedged position to {{target_hedge_pct}}%
3. Approve ${{capex_amount}} capital budget for demand charge mitigation at {{capex_facilities}}

---

## 6. Sustainability Report — Energy Section

**Channel:** Annual sustainability / ESG report
**Audience:** Investors, customers, ESG rating agencies, RE100, CDP
**Tone:** Transparent, data-backed, forward-looking. Avoid greenwashing — ESG audiences are sophisticated.

---

### Energy and Climate — {{report_year}}

**Scope 2 Emissions:**

| Metric | {{prior_year}} | {{report_year}} | Change |
|--------|---------------|-----------------|--------|
| Total electricity consumed (MWh) | {{elec_prior_mwh}} | {{elec_current_mwh}} | {{elec_change_pct}} |
| Scope 2 — Location-based (MT CO₂e) | {{scope2_loc_prior}} | {{scope2_loc_current}} | {{scope2_loc_change}} |
| Scope 2 — Market-based (MT CO₂e) | {{scope2_mkt_prior}} | {{scope2_mkt_current}} | {{scope2_mkt_change}} |
| Renewable electricity (%) | {{re_pct_prior}} | {{re_pct_current}} | {{re_change}} |

**Renewable Energy Procurement:**

| Instrument | Volume (MWh) | Source | Additionality |
|-----------|-------------|--------|---------------|
| Physical PPA | {{phys_ppa_mwh}} | {{phys_ppa_project}} | New project, operational {{ppa_cod}} |
| Virtual PPA (RECs) | {{vppa_rec_mwh}} | {{vppa_project}} | New project, {{vppa_location}} |
| Utility green tariff | {{green_tariff_mwh}} | {{green_tariff_utility}} | Program-dependent |
| Unbundled RECs | {{unbundled_rec_mwh}} | National wind | Market RECs |
| On-site solar | {{onsite_mwh}} | {{onsite_locations}} | Direct generation |

**RE100 Progress:** {{our_company}} has achieved {{re_pct_current}}% renewable electricity in {{report_year}}, on track for our commitment of 100% by {{re_target}}.

**Forward-Looking Targets:**
- {{re_target_next_year}}% renewable electricity by end of {{next_year}}
- Execute additional {{next_ppa_mw}} MW of renewable procurement by Q2 {{next_year}}
- Reduce Scope 2 market-based emissions by {{scope2_reduction_target}}% by {{target_year}} (vs. {{baseline_year}} baseline)

---

## 7. Internal Energy Cost Variance Analysis

**Channel:** Monthly internal memo
**Audience:** Finance controller, plant managers, VP Operations
**Tone:** Analytical, action-oriented. Explain the "why" behind variances and what's being done about them.

---

**Subject:** `Energy Cost Variance Report — {{month}} {{year}}`

**Summary:** Total energy cost of ${{actual_total}} vs. budget of ${{budget_total}} — variance of ${{variance}} ({{variance_pct}}).

**Variance Decomposition:**

| Driver | Impact | Explanation |
|--------|--------|-------------|
| Weather (HDD/CDD vs. normal) | ${{weather_impact}} | {{month}} was {{weather_description}} — {{hdd_cdd_actual}} vs. {{hdd_cdd_budget}} budgeted HDD/CDD |
| Market price (index exposure) | ${{market_impact}} | Day-ahead LMP averaged ${{actual_lmp}}/MWh vs. budget assumption of ${{budget_lmp}}/MWh |
| Demand charges | ${{demand_impact}} | Peak demand of {{actual_peak_kw}} kW vs. budget of {{budget_peak_kw}} kW at {{facility_name}} |
| Production volume | ${{volume_impact}} | Production hours {{production_description}} vs. plan |
| Rate/tariff changes | ${{tariff_impact}} | {{tariff_description}} |

**Actions Taken:**
1. {{action_1}}
2. {{action_2}}
3. {{action_3}}

**Forecast Revision:** Based on YTD actuals, the full-year energy cost forecast is revised to ${{revised_forecast}} (previously ${{prior_forecast}}). Primary driver: {{revision_driver}}.

---

## 8. Supplier Contract Renewal Negotiation

**Channel:** Email
**Audience:** Incumbent energy supplier's commercial team
**Tone:** Relationship-forward, data-informed. You want to renew if terms are fair — make that clear while establishing competitive tension.

---

**Subject:** `Contract Renewal Discussion — {{our_company}} / {{supplier_name}} — {{contract_end}} Expiration`

{{supplier_contact}},

Our current supply agreement expires {{contract_end}}, and we'd like to discuss renewal terms. {{supplier_name}} has been a valued partner for the past {{contract_duration}}, and we'd like to continue the relationship under commercially competitive terms.

To frame the discussion, here is our perspective on renewal:

**What's worked well:**
- Billing accuracy and operational execution have been excellent
- Market intelligence updates have been valuable for our procurement planning
- The account management team has been responsive and proactive

**Where we'd like to see improvement:**
- Our current rate of {{current_rate}} was competitive at signing but the forward curve for the renewal period ({{contract_start}} through {{new_contract_end}}) is currently {{market_rate}} — we need renewal pricing that reflects current market conditions
- We'd like to discuss [block-and-index structure / increased volume tolerance / REC bundling] for the renewal term

**Our process:**
We are conducting a competitive evaluation for this renewal. We've invited {{num_bidders}} suppliers to provide indicative pricing. Our decision timeline:
- Indicative pricing review: {{pricing_review_date}}
- Shortlist and final negotiation: {{negotiation_date}}
- Contract execution: {{execution_date}}

We would welcome a call on {{proposed_call_date}} to discuss {{supplier_name}}'s renewal offer. Please send indicative pricing for the structures outlined above by {{pricing_deadline}}.

{{our_contact_name}}
{{our_contact_title}}

---

**Tone Notes:**
- Name the competitive process but don't bluff about the number of bidders.
- Lead with what's worked well — the incumbent relationship has value and you should acknowledge it.
- Be transparent about timeline so the supplier can allocate pricing resources.

---

## 9. Regulatory Filing Comment

**Channel:** Written comment to regulatory body (FERC, state PUC, ISO stakeholder process)
**Audience:** Regulatory commissioners, ISO market design team
**Tone:** Policy-oriented, evidence-based. Regulators respect commenters who understand the market mechanics.

---

**Re:** {{docket_number}} — Proposed Modifications to {{program_or_rule}}

{{our_company}} appreciates the opportunity to comment on the proposed modifications to {{program_or_rule}}.

As a large commercial and industrial electricity consumer in {{iso_name}} territory with {{annual_consumption_mwh}} of annual consumption, {{our_company}} has a direct interest in market designs that promote efficient price formation, reliable capacity procurement, and equitable cost allocation.

**Support / Concern:**
{{our_company}} [supports / has concerns regarding] the proposed modifications, specifically:

1. **{{provision_1}}:** [Position and rationale with specific reference to the proposal's impact on C&I consumers]
2. **{{provision_2}}:** [Position with quantitative impact estimate if available]
3. **{{provision_3}}:** [Position with alternative proposal if opposing]

**Recommendation:**
{{our_company}} recommends that the Commission [approve with modifications / reject / defer pending further analysis] the proposed {{program_or_rule}} changes, specifically incorporating the following modifications:
- {{recommendation_1}}
- {{recommendation_2}}

Respectfully submitted,

{{our_contact_name}}
{{our_contact_title}}, {{our_company}}

---

## 10. Board-Level Energy Strategy Summary

**Channel:** Board meeting memo / presentation
**Audience:** Board of Directors, CEO, CFO
**Tone:** Strategic, concise, decision-focused. The board cares about risk, cost trajectory, sustainability commitments, and capital allocation — not market mechanics.

---

### Energy Strategy Update — {{quarter}} {{year}}

**For the Board of Directors, {{our_company}}**

**Key Metrics:**

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Annual energy spend | ${{current_spend}} | ${{target_spend}} | {{spend_status}} |
| Energy cost as % of revenue | {{energy_pct_revenue}}% | {{target_pct}}% | {{pct_status}} |
| Renewable electricity (RE100) | {{re_pct_current}}% | 100% by {{re_target}} | {{re_status}} |
| Scope 2 emissions (market-based) | {{current_emissions}} MT CO₂e | {{target_emissions}} MT | {{emissions_status}} |

**Strategic Priorities:**
1. **Cost management:** [1-2 sentence summary of procurement strategy and results]
2. **Sustainability:** [1-2 sentence summary of RE100 progress and next milestones]
3. **Risk management:** [1-2 sentence summary of hedge position and market outlook]

**Decisions Requested:**
1. Approve execution of a {{ppa_term_years}}-year virtual PPA with {{ppa_project_name}} at {{ppa_strike_price}} for {{ppa_capacity_mw}} MW — projected NPV of ${{ppa_npv}} over the contract term, delivering {{ppa_annual_recs}} RECs annually toward our RE100 commitment.
2. Authorize ${{capex_amount}} in capital expenditure for battery energy storage at {{capex_facilities}} — projected {{payback_years}}-year payback with stacked value of ${{annual_savings}}/year in demand charge and capacity cost reduction.

**Risk Summary:**
- Market risk: {{hedge_pct}}% hedged through {{hedge_end}}. Unhedged exposure: ${{unhedged_exposure}} at current forwards.
- Regulatory risk: {{regulatory_summary}}
- Supplier risk: All supply contracts with investment-grade counterparties. No credit concerns.

**Next Update:** {{next_update_date}}

---

**Tone Notes:**
- Board communication must be under 2 pages. Provide appendices for detail.
- Lead with the "ask" — if you need board approval for a PPA or capital project, put it in the executive summary.
- Quantify everything. "Good progress on sustainability" means nothing. "38% RE, on track for 50% by year-end" means everything.
- Acknowledge risks explicitly. A board that discovers unmentioned risks loses trust in management.
