# Communication Templates — Carrier Relationship Management

> **Reference Type:** Tier 3 — Load on demand when composing or reviewing carrier communications.
>
> **Usage:** Each template includes variable placeholders in `{{double_braces}}` for direct substitution. Templates are organized by communication type and business context. Select the template matching your scenario, substitute variables, review tone guidance, and send.

---

## Table of Contents

1. [RFP Invitation Letter](#1-rfp-invitation-letter)
2. [Rate Negotiation Opening](#2-rate-negotiation-opening)
3. [Rate Counter-Offer](#3-rate-counter-offer)
4. [Carrier Performance Review — Positive](#4-carrier-performance-review--positive)
5. [Carrier Performance Review — Corrective](#5-carrier-performance-review--corrective)
6. [Carrier Onboarding Welcome](#6-carrier-onboarding-welcome)
7. [Carrier Warning Letter](#7-carrier-warning-letter)
8. [Carrier Exit Notification](#8-carrier-exit-notification)
9. [Market Rate Discussion](#9-market-rate-discussion)
10. [Partnership Proposal](#10-partnership-proposal)
11. [Detention Dispute Communication](#11-detention-dispute-communication)
12. [Accessorial Challenge](#12-accessorial-challenge)

---

## Variable Reference

Common variables used across templates:

| Variable | Description | Example |
|---|---|---|
| `{{carrier_name}}` | Carrier legal or DBA name | `Ridgeline Transport, Inc.` |
| `{{carrier_contact}}` | Carrier contact name | `Mike Patterson` |
| `{{carrier_contact_title}}` | Carrier contact title | `VP of Sales` |
| `{{carrier_mc}}` | Carrier MC number | `MC-498132` |
| `{{our_company}}` | Our company name | `Consolidated Manufacturing LLC` |
| `{{our_contact_name}}` | Our representative name | `Sarah Chen` |
| `{{our_contact_title}}` | Our representative title | `Director of Transportation` |
| `{{our_contact_email}}` | Our representative email | `schen@company.com` |
| `{{our_contact_phone}}` | Our representative phone | `(312) 555-0189` |
| `{{lane_origin}}` | Lane origin city/state | `Chicago, IL` |
| `{{lane_destination}}` | Lane destination city/state | `Dallas, TX` |
| `{{current_rate}}` | Current contract rate per mile | `$2.45/mile` |
| `{{proposed_rate}}` | Proposed new rate | `$2.28/mile` |
| `{{market_rate}}` | DAT/benchmark market rate | `$2.18/mile` |
| `{{volume_loads_week}}` | Weekly load volume | `8 loads/week` |
| `{{annual_spend}}` | Annual freight spend with carrier | `$2.4M` |
| `{{contract_start}}` | Contract effective date | `2026-04-01` |
| `{{contract_end}}` | Contract expiration date | `2027-03-31` |
| `{{rfp_deadline}}` | RFP response deadline | `2026-03-15` |
| `{{otd_percentage}}` | Carrier's on-time delivery rate | `96.2%` |
| `{{tender_acceptance}}` | Carrier's tender acceptance rate | `91.4%` |
| `{{claims_ratio}}` | Carrier's claims ratio | `0.3%` |
| `{{invoice_accuracy}}` | Carrier's invoice accuracy rate | `97.8%` |
| `{{review_period}}` | Performance review time period | `Q3 2025 (Jul-Sep)` |
| `{{detention_amount}}` | Disputed detention charge amount | `$4,275` |
| `{{accessorial_type}}` | Specific accessorial charge type | `liftgate delivery` |

---

## 1. RFP Invitation Letter

**Channel:** Email
**Audience:** Carrier sales / pricing leadership
**Tone:** Professional, opportunity-oriented. You're inviting them to compete for business, not demanding concessions.

---

**Subject:** `Invitation to Bid — {{our_company}} Freight RFP — {{contract_start}} Award`

{{carrier_contact}},

{{our_company}} is conducting our annual freight RFP process and we're inviting {{carrier_name}} to participate as a bidding carrier. Based on our analysis of market capabilities and your operational profile, we believe there may be strong alignment between your network and our shipping requirements.

**RFP Overview:**
- **Scope:** {{lane_count}} lanes across TL, LTL, and intermodal modes
- **Total annual freight spend:** Approximately {{total_annual_spend}}
- **Contract period:** {{contract_start}} through {{contract_end}}
- **Bid deadline:** {{rfp_deadline}} at 5:00 PM CT

**What We're Looking For:**
We evaluate bids on a weighted scorecard: rate competitiveness (40%), service history and reliability (25%), capacity commitment (20%), and operational fit including technology integration (15%). We value carriers who bring consistent service and a commitment to partnership over the lowest possible rate.

**Enclosed with this letter:**
1. Lane-level bid package with volume ranges, equipment requirements, and transit expectations
2. Accessorial schedule with standard rates and negotiable items
3. Insurance and compliance requirements
4. Service-level expectations (OTD, tender acceptance, claims thresholds)
5. Contract terms summary

**Next Steps:**
Please confirm your intent to bid by {{rfp_confirm_date}}. A Q&A webinar for all participating carriers is scheduled for {{qa_date}} at {{qa_time}} CT. All questions must be submitted in writing through the RFP portal; responses will be shared with all bidders.

We look forward to your participation.

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 2. Rate Negotiation Opening

**Channel:** Email followed by phone call
**Audience:** Carrier account manager or VP of Sales
**Tone:** Data-driven, collaborative. Lead with market data, not demands. Frame as aligning rates with market reality, not squeezing the carrier.

---

**Subject:** `Rate Review Discussion — {{lane_origin}} to {{lane_destination}} | {{our_company}}`

{{carrier_contact}},

I'd like to schedule a call to discuss rate alignment on our {{lane_origin}} to {{lane_destination}} lane. As part of our quarterly rate benchmarking process, we've identified an opportunity to ensure our pricing on this lane reflects current market conditions.

**Our Current Situation:**
- **Current contract rate:** {{current_rate}} (effective since {{contract_start}})
- **DAT 90-day contract average for this lane:** {{market_rate}}
- **Your current volume on this lane:** {{volume_loads_week}}
- **Your performance:** {{otd_percentage}} OTD, {{tender_acceptance}} tender acceptance

We recognize that {{carrier_name}} has delivered strong service on this lane, and our goal is to find a rate that keeps this lane attractive for both of us. We're not looking to drive rates to a level that compromises your service or driver compensation — we are looking for alignment with where the market has moved.

Could you check availability for a 30-minute call this week? I'd like to walk through the data together and explore options.

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 3. Rate Counter-Offer

**Channel:** Email
**Audience:** Carrier account manager or pricing team
**Tone:** Firm but respectful. Acknowledge the carrier's position while advancing yours. Always justify with data.

---

**Subject:** `Re: Rate Proposal — {{lane_origin}} to {{lane_destination}}`

{{carrier_contact}},

Thank you for the rate proposal on our {{lane_origin}} to {{lane_destination}} lane. I appreciate the detail and the time your team invested.

After reviewing your proposal against our market data and total cost model, I'd like to share our counter-position:

**Your Proposal:** {{carrier_proposed_rate}}
**Our Counter:** {{our_counter_rate}}

**Rationale:**
- DAT 90-day contract average for this lane is {{market_rate}}, which puts your proposal {{percentage_above_market}}% above the current market benchmark.
- We modeled total cost including your proposed fuel surcharge schedule at diesel prices of $3.25, $3.85, and $4.50/gal. At current diesel ({{current_diesel}}), your total cost per mile is {{total_cost_per_mile}}, which is {{total_cost_vs_market}}% above our benchmark total cost.
- Our counter rate of {{our_counter_rate}} reflects the market benchmark plus a {{premium_percentage}}% premium for your service quality — which we genuinely value. Your {{otd_percentage}} OTD is among the best in our portfolio.

**What We're Offering in Return:**
- Volume commitment: {{volume_commitment}} loads/week guaranteed (vs. your current {{current_volume}} loads/week)
- Payment terms: Net {{payment_days}} (vs. our standard Net 30)
- Drop-trailer program at our {{facility_name}} facility (eliminating an average of {{detention_hours}} hours detention per load)

I believe we can find alignment here. Would a call on {{proposed_call_date}} work to discuss?

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 4. Carrier Performance Review — Positive

**Channel:** Email + formal quarterly business review meeting
**Audience:** Carrier account manager, VP of Sales, and operations leadership
**Tone:** Celebratory and specific. Name the metrics, quantify the impact, and reward with tangible actions (more volume, longer contract, public recognition). Generic praise is worse than no praise.

---

**Subject:** `Q{{quarter}} Performance Review — {{carrier_name}} | Outstanding Results`

{{carrier_contact}},

I want to formally recognize {{carrier_name}}'s performance during {{review_period}}. Your team has been exceptional across every metric we track, and we want to make sure you know it — and that we're backing up that recognition with action.

**Performance Summary — {{review_period}}:**

| Metric | Target | Your Performance | Portfolio Average |
|--------|--------|-----------------|-------------------|
| On-Time Delivery | ≥95% | {{otd_percentage}} | {{portfolio_avg_otd}} |
| Tender Acceptance | ≥90% | {{tender_acceptance}} | {{portfolio_avg_tender}} |
| Claims Ratio | <0.5% | {{claims_ratio}} | {{portfolio_avg_claims}} |
| Invoice Accuracy | ≥97% | {{invoice_accuracy}} | {{portfolio_avg_invoice}} |

**Specific Highlights:**
- Your team's performance on the {{highlight_lane}} lane was particularly strong — {{highlight_detail}}.
- Driver {{driver_name}} received compliments from our {{facility_name}} receiving team for consistent professionalism and efficient dock operations.
- Your operations team's proactive communication during {{event}} prevented what could have been a significant service disruption.

**What This Means for Our Partnership:**
Based on this performance, we're making the following allocation changes effective {{effective_date}}:
- **{{lane_1}}:** Increasing your allocation from {{old_allocation_1}}% to {{new_allocation_1}}%
- **{{lane_2}}:** Adding you as primary carrier (new lane award — {{volume_2}} loads/week)
- **Contract extension:** We'd like to discuss extending our agreement through {{extended_end_date}} at current terms

Thank you for making our operation better. We value this partnership and look forward to continuing to grow together.

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 5. Carrier Performance Review — Corrective

**Channel:** Email followed by in-person or video meeting
**Audience:** Carrier account manager and operations leadership
**Tone:** Professional, direct, data-driven. Not punitive — corrective. Present the data, state the impact, set clear expectations with a timeline, and define the consequence. Avoid emotional language.

---

**Subject:** `Performance Review — {{carrier_name}} | Corrective Action Required`

{{carrier_contact}},

I'm reaching out regarding {{carrier_name}}'s performance during {{review_period}} on lanes serviced for {{our_company}}. Several metrics have fallen below our minimum standards, and I want to address this directly so we can work together on a resolution.

**Performance Summary — {{review_period}}:**

| Metric | Our Standard | Your Performance | Gap |
|--------|-------------|-----------------|-----|
| On-Time Delivery | ≥95% | {{otd_percentage}} | {{otd_gap}} below standard |
| Tender Acceptance | ≥90% | {{tender_acceptance}} | {{tender_gap}} below standard |
| Claims Ratio | <0.5% | {{claims_ratio}} | {{claims_gap}} above standard |
| Invoice Accuracy | ≥97% | {{invoice_accuracy}} | {{invoice_gap}} below standard |

**Business Impact:**
- Tender rejections on the {{problem_lane}} lane forced {{spot_loads}} loads to the spot market at an average premium of {{spot_premium}}%, costing us approximately ${{incremental_cost}} in incremental freight spend.
- Late deliveries resulted in {{penalty_count}} customer penalty events totaling ${{penalty_total}}.

**What We Need:**
We value our relationship with {{carrier_name}} and want to find a path forward. We're requesting a Corrective Action Plan that addresses the following within the timelines indicated:

| Metric | Target | 30-Day Checkpoint | 60-Day Checkpoint |
|--------|--------|-------------------|-------------------|
| OTD | ≥{{otd_target}}% | ≥{{otd_30day}}% | ≥{{otd_60day}}% |
| Tender Acceptance | ≥{{tender_target}}% | ≥{{tender_30day}}% | ≥{{tender_60day}}% |

Please send your CAP document by {{cap_due_date}} outlining the root causes you've identified and the specific operational changes you're implementing.

**If Targets Are Not Met:**
If the 60-day checkpoint targets are not achieved, we will need to reduce your allocation on affected lanes by 50% and reassign volume to alternate carriers. This is not our preferred outcome — we'd much rather see improvement and continue building this partnership.

I'd like to schedule a call for {{proposed_call_date}} to discuss your initial assessment. Please let me know your availability.

Regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 6. Carrier Onboarding Welcome

**Channel:** Email
**Audience:** Carrier's assigned account manager and operations contact
**Tone:** Welcoming, organized, and clear about expectations. First impressions set the relationship trajectory.

---

**Subject:** `Welcome to {{our_company}}'s Carrier Network — Onboarding Information`

{{carrier_contact}},

Welcome to {{our_company}}'s carrier network. We're pleased to have {{carrier_name}} as a transportation partner and look forward to a productive relationship.

This email contains everything you need to get started. Please review carefully and let me know if you have questions.

**Your Awarded Lanes:**

| Lane | Volume | Equipment | Transit Requirement |
|------|--------|-----------|-------------------|
| {{lane_1_origin}} → {{lane_1_dest}} | {{lane_1_volume}}/week | {{lane_1_equip}} | {{lane_1_transit}} |
| {{lane_2_origin}} → {{lane_2_dest}} | {{lane_2_volume}}/week | {{lane_2_equip}} | {{lane_2_transit}} |

**Onboarding Checklist (please complete by {{onboarding_deadline}}):**

- [ ] Return signed Carrier Transportation Agreement (attached)
- [ ] Provide current Certificate of Insurance meeting our minimums ($1M auto liability, $100K cargo)
- [ ] Complete W-9 form (attached)
- [ ] Provide EDI/API contact for system integration setup (if applicable)
- [ ] Confirm operational contact for daily dispatching (name, phone, email)
- [ ] Confirm after-hours emergency contact (name, phone)

**What to Expect:**
- **First 30 days:** We'll run trial loads on your awarded lanes. Our minimum standards during trial: ≥93% OTD, ≥85% tender acceptance, ≥95% invoice accuracy.
- **Day 30 review:** We'll review trial performance together. If targets are met, you'll move to full allocation. If not, we'll discuss what adjustments are needed.
- **Ongoing:** Quarterly performance reviews, annual rate review aligned with our RFP cycle.

**Our Facilities — Key Operational Notes:**

| Facility | Dock Hours | Appointment Required? | Avg Load/Unload Time | Detention Policy |
|----------|-----------|----------------------|---------------------|-----------------|
| {{facility_1}} | {{hours_1}} | {{appt_1}} | {{avg_time_1}} | {{detention_1}} |
| {{facility_2}} | {{hours_2}} | {{appt_2}} | {{avg_time_2}} | {{detention_2}} |

**Your Primary Contacts at {{our_company}}:**
- **Relationship management:** {{our_contact_name}}, {{our_contact_title}} ({{our_contact_email}}, {{our_contact_phone}})
- **Daily operations / tendering:** {{ops_contact_name}}, {{ops_contact_title}} ({{ops_contact_email}}, {{ops_contact_phone}})
- **Accounts payable / invoicing:** {{ap_contact_name}} ({{ap_contact_email}})

Welcome aboard. We believe in rewarding performance — carriers who deliver consistent, high-quality service earn more volume, longer contracts, and priority consideration for new lanes.

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}

---

## 7. Carrier Warning Letter

**Channel:** Formal email with read receipt requested; copy to carrier's VP of Sales
**Audience:** Carrier account manager + carrier senior leadership
**Tone:** Formal and serious. This is a documentation event as much as a communication — it creates the paper trail for a potential exit decision. Factual, not emotional. Cite specific contract provisions.

---

**Subject:** `FORMAL NOTICE: Performance Deficiency — {{carrier_name}} / {{our_company}} Account`

{{carrier_contact}},

This letter serves as formal notice that {{carrier_name}}'s performance on {{our_company}}'s account has fallen below contractual standards for a sustained period, and continued non-compliance will result in volume reduction and potential removal from our routing guide.

**Deficiency Summary:**
Per Section {{contract_section}} of our Transportation Agreement dated {{agreement_date}}, the following minimum standards apply:

| Metric | Contractual Minimum | {{carrier_name}}'s Performance ({{deficiency_period}}) |
|--------|--------------------|----------------------------------------------------|
| {{metric_1}} | {{standard_1}} | {{actual_1}} |
| {{metric_2}} | {{standard_2}} | {{actual_2}} |

**Prior Communication:**
- {{prior_comm_date_1}}: {{prior_comm_description_1}}
- {{prior_comm_date_2}}: {{prior_comm_description_2}}
- {{cap_date}}: Corrective Action Plan submitted, targeting improvement by {{cap_target_date}}
- As of {{current_date}}, targets have not been met.

**Consequences:**
Effective {{consequence_date}}, we will reduce {{carrier_name}}'s allocation on the following lanes by {{reduction_percentage}}%:
{{affected_lanes_list}}

If performance does not reach contractual minimums by {{final_deadline}}, {{carrier_name}} will be removed from our active routing guide on all affected lanes.

**Path to Resolution:**
We would prefer to resolve this cooperatively. If {{carrier_name}} can provide an updated remediation plan addressing the specific root causes and committing to measurable improvement targets, we are willing to extend the review period by 30 days.

Please respond in writing by {{response_deadline}}.

Regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

CC: {{carrier_vp_name}}, {{carrier_vp_title}}, {{carrier_name}}
CC: {{our_director_name}}, {{our_director_title}}, {{our_company}}

---

## 8. Carrier Exit Notification

**Channel:** Formal email followed by phone call
**Audience:** Carrier account manager and carrier senior leadership
**Tone:** Respectful and final. This is a business decision, not a punishment. Leave the door open for future consideration. Avoid burning bridges — the carrier community is smaller than you think.

---

**Subject:** `Notice of Routing Guide Removal — {{carrier_name}} / {{our_company}}`

{{carrier_contact}},

After careful consideration and review of {{carrier_name}}'s performance over the past {{review_months}} months, we have made the decision to remove {{carrier_name}} from {{our_company}}'s active routing guide effective {{exit_date}}.

**Reason for Decision:**
{{exit_reason_summary}}

**Transition Plan:**
- **{{exit_date}} through {{transition_end_date}}:** We will reduce tender volume by approximately {{reduction_percent}}% per week during this transition period to allow both organizations to adjust.
- **Open invoices:** All outstanding invoices will be processed per standard payment terms. Please ensure all invoices are submitted by {{invoice_deadline}}.
- **Open claims:** Any pending claims will continue through their normal resolution process. This decision does not affect the adjudication of open claims.

**What This Means Going Forward:**
This is not necessarily a permanent decision. We review our carrier portfolio annually during our RFP process. If {{carrier_name}} addresses the issues noted above and would like to re-engage, we welcome your participation in future RFP cycles.

I'm available to discuss this decision directly if you'd like to connect. I respect the work your team has done for our account and want to ensure this transition is handled professionally.

Regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 9. Market Rate Discussion

**Channel:** Email or phone, depending on relationship depth
**Audience:** Carrier account manager
**Tone:** Collegial and transparent. This is a market discussion, not a negotiation — you're sharing data and inviting dialogue. Use when market conditions have shifted and you want to proactively discuss alignment before it becomes a formal renegotiation.

---

**Subject:** `Market Check-In — {{lane_origin}} to {{lane_destination}} Corridor`

{{carrier_contact}},

I wanted to reach out proactively about what we're seeing in the {{lane_origin}} to {{lane_destination}} market. As you know, we track lane-level benchmarks quarterly, and the latest data suggests some movement worth discussing.

**What We're Seeing:**
- DAT contract average for this lane has moved from {{old_benchmark}} to {{new_benchmark}} over the last {{timeframe}} — a {{percentage_change}} {{direction}} shift.
- Our spot procurement on overflow loads in this corridor has averaged {{spot_average}} over the last 30 days.
- Load-to-truck ratios in the {{region}} region are currently {{ltt_ratio}}, compared to {{ltt_previous}} last quarter.

**Our Perspective:**
We're not sending this as a formal rate request — it's a market conversation. We want to understand how you're seeing the same data and whether there's an opportunity to align proactively rather than waiting for contract renewal.

If the market has moved in a way that affects our lane economics, I'd rather discuss it now and find a mutually workable solution than have it surface as a surprise during our annual review.

Would you have 20 minutes this week to discuss?

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 10. Partnership Proposal

**Channel:** Formal letter or meeting presentation
**Audience:** Carrier CEO, President, or SVP of Sales
**Tone:** Strategic and forward-looking. This is a business partnership proposal, not a procurement transaction. Emphasize mutual benefit, growth potential, and commitment.

---

**Subject:** `Strategic Partnership Proposal — {{our_company}} and {{carrier_name}}`

{{carrier_contact}},

I'd like to propose elevating the relationship between {{our_company}} and {{carrier_name}} from a standard carrier-shipper arrangement to a strategic partnership. Our analysis suggests significant mutual benefit in a deeper, more integrated collaboration.

**Why {{carrier_name}}:**
Over the past {{relationship_years}} years, {{carrier_name}} has consistently performed in the top tier of our carrier portfolio. Specifically:
- {{otd_percentage}} OTD (vs. portfolio average of {{portfolio_avg}}%)
- {{tender_acceptance}} tender acceptance (vs. {{portfolio_avg_tender}}% average)
- Exceptional communication and problem-resolution responsiveness

**What We're Proposing:**
1. **Volume commitment:** Increase {{carrier_name}}'s share of our total freight from {{current_share}}% to {{proposed_share}}%, representing approximately {{proposed_spend}} in annual freight spend.
2. **Multi-year agreement:** 24-month contract with pre-agreed annual escalators tied to {{escalator_index}}, replacing the annual RFP cycle for your lanes.
3. **Operational integration:** Implement real-time tracking integration (API), shared KPI dashboard, and quarterly executive business reviews.
4. **Growth collaboration:** As {{our_company}} expands into {{growth_markets}}, {{carrier_name}} would be our first-call carrier for new lanes in your network.

**What We'd Need in Return:**
1. Rate alignment: Competitive pricing reflecting the volume commitment and multi-year certainty (we're targeting rates within {{target_range}}% of DAT contract benchmark).
2. Service guarantee: {{otd_target}}% OTD and {{tender_target}}% tender acceptance with quarterly review.
3. Dedicated account management: A named contact who knows our operations, our customers, and our seasonal patterns.
4. Capacity priority: During peak season or disruption events, {{our_company}} freight receives priority dispatch from your operations team.

I'd welcome the opportunity to discuss this in a meeting with your leadership team. Would {{proposed_meeting_date}} work for an in-person session at {{proposed_location}}?

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 11. Detention Dispute Communication

**Channel:** Email with supporting documentation attached
**Audience:** Carrier billing / accounts receivable team, cc carrier account manager
**Tone:** Factual and cooperative. Detention disputes get adversarial quickly — lead with data and a willingness to pay what's legitimate while disputing what's not.

---

**Subject:** `Detention Invoice Dispute — PRO# {{pro_number}} / {{dispute_date}}`

{{carrier_contact}},

We've reviewed the detention invoice for PRO# {{pro_number}} ({{lane_origin}} to {{lane_destination}}, delivered {{delivery_date}}) and have identified discrepancies between the invoiced detention and our facility records.

**Your Invoice:**
- Driver arrival: {{carrier_arrival_time}}
- Departure: {{carrier_departure_time}}
- Total detention billed: {{billed_detention_hours}} hours at ${{detention_rate}}/hr = {{detention_amount}}

**Our Records:**
- Driver check-in at guard shack: {{our_checkin_time}}
- Dock door assigned: {{dock_assign_time}}
- Loading/unloading complete (BOL signed): {{bol_sign_time}}
- Free time: {{free_time_hours}} hours per contract Section {{contract_section}}

**Discrepancy Analysis:**
- The driver arrived {{early_minutes}} minutes before the scheduled appointment of {{appointment_time}}. Per our contract, detention begins at the later of appointment time or arrival time — not early arrival time.
- Our records show actual dock dwell time (from check-in to BOL signature) of {{actual_dwell}} hours, of which {{free_time_hours}} hours is free time. Billable detention per our records: {{adjusted_detention}} hours.

**Our Proposed Resolution:**
We'll pay {{adjusted_amount}} ({{adjusted_detention}} hours × ${{detention_rate}}/hr) against this invoice. If you believe our records are inaccurate, please provide driver GPS or ELD data showing dock arrival and departure times, and we'll reconcile.

We want to get this right for both of us. If detention on this lane is a recurring issue, I'd welcome a discussion about adjusting appointment scheduling or implementing a drop-trailer program to address the root cause.

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 12. Accessorial Challenge

**Channel:** Email
**Audience:** Carrier billing / pricing team, cc carrier account manager
**Tone:** Measured and evidence-based. Accessorial disputes are high-volume, low-dollar events that can poison a relationship if handled aggressively. Focus on accuracy, not accusation.

---

**Subject:** `Accessorial Charge Review — {{accessorial_type}} | PRO# {{pro_number}}`

{{carrier_contact}},

We're reviewing an accessorial charge on PRO# {{pro_number}} ({{lane_origin}} to {{lane_destination}}, {{delivery_date}}) and need clarification before processing payment.

**Charge in Question:**
- Accessorial type: {{accessorial_type}}
- Amount: ${{accessorial_amount}}
- Invoice reference: {{invoice_number}}

**Our Concern:**
{{concern_detail}}

Per our Transportation Agreement (Section {{contract_section}}, Accessorial Schedule Item {{schedule_item}}), {{accessorial_type}} charges apply when {{contract_condition}}. Based on the BOL and delivery receipt for this shipment, {{evidence_detail}}.

**Supporting Documentation (attached):**
- BOL showing {{bol_detail}}
- Delivery receipt showing {{pod_detail}}
- Rate confirmation with accessorial schedule reference

**Requested Action:**
Please review the charge against the attached documentation and either (a) confirm the charge with additional supporting evidence we may not have, or (b) issue a credit memo for ${{accessorial_amount}} against invoice {{invoice_number}}.

If this accessorial category is becoming a recurring issue on this lane, I'd like to discuss whether there's an operational adjustment (at either end) that could prevent these charges from accruing.

Thank you for your prompt review.

Best regards,
{{our_contact_name}}
{{our_contact_title}} | {{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## Usage Guidelines

### Tone Calibration by Relationship Status

| Relationship Status | Appropriate Templates | Tone Adjustment |
|--------------------|----------------------|-----------------|
| New carrier (< 6 months) | Onboarding welcome, rate negotiation opening, market rate discussion | More formal, set clear expectations, be specific about standards |
| Established carrier (6-24 months) | All templates | Standard professional tone, data-driven, collaborative |
| Strategic partner (2+ years, top tier) | Performance review positive, partnership proposal, market rate discussion | More collegial, emphasize growth opportunity, share more operational context |
| Underperforming carrier | Performance review corrective, warning letter, exit notification | Strictly professional, document everything, focus on facts and data |
| Carrier in dispute | Detention dispute, accessorial challenge, warning letter | Factual and neutral, avoid emotional language, always propose a resolution path |

### Communication Channel Selection

| Situation | Primary Channel | When to Escalate Channel |
|-----------|----------------|------------------------|
| Rate discussion (routine) | Email → phone follow-up | If email exchange exceeds 3 rounds without resolution |
| Performance review (positive) | Email + QBR meeting | N/A — always share good news broadly |
| Performance review (corrective) | Email first (documentation), then phone/meeting | If carrier doesn't respond within 5 business days |
| Warning letter | Formal email with read receipt | If carrier doesn't respond within 3 business days, follow up via carrier VP phone call |
| Exit notification | Formal email + same-day phone call | N/A — always deliver exit decisions via both channels |
| Detention/accessorial dispute | Email with documentation | If not resolved in 15 business days, escalate to carrier account manager |
| Partnership proposal | Formal letter/email → in-person meeting | N/A — partnership proposals require in-person discussion |
