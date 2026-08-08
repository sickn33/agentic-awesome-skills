# Communication Templates — Logistics Exception Management

> **Reference Type:** Tier 3 — Load on demand when composing or reviewing exception communications.
>
> **Usage:** Each template includes variable placeholders in `{{double_braces}}` for direct substitution. Templates are organized by audience and escalation stage. Select the template matching your scenario, substitute variables, review tone guidance, and send.

---

## Table of Contents

1. [Initial Exception Notification to Carrier (Standard)](#1-initial-exception-notification-to-carrier-standard)
2. [Initial Exception Notification to Carrier (Urgent)](#2-initial-exception-notification-to-carrier-urgent)
3. [Customer Proactive Update — Delay](#3-customer-proactive-update--delay)
4. [Customer Proactive Update — Damage](#4-customer-proactive-update--damage)
5. [Customer Proactive Update — Loss](#5-customer-proactive-update--loss)
6. [Escalation to Carrier Account Manager](#6-escalation-to-carrier-account-manager)
7. [Escalation to Carrier VP/Director](#7-escalation-to-carrier-vpdirector)
8. [Internal Escalation to VP Supply Chain](#8-internal-escalation-to-vp-supply-chain)
9. [Claims Filing Cover Letter](#9-claims-filing-cover-letter)
10. [Settlement Negotiation Response (Accepting)](#10-settlement-negotiation-response-accepting)
11. [Settlement Negotiation Response (Rejecting)](#11-settlement-negotiation-response-rejecting)
12. [Post-Resolution Summary](#12-post-resolution-summary)
13. [Carrier Performance Warning](#13-carrier-performance-warning)
14. [Customer Apology with Resolution](#14-customer-apology-with-resolution)

---

## Variable Reference

Common variables used across templates:

| Variable | Description | Example |
|---|---|---|
| `{{pro_number}}` | Carrier PRO / tracking number | `PRO 1234-5678-90` |
| `{{bol_number}}` | Bill of Lading number | `BOL-2025-04872` |
| `{{po_number}}` | Customer purchase order number | `PO-88431` |
| `{{shipment_id}}` | Internal shipment reference | `SHP-2025-11049` |
| `{{carrier_name}}` | Carrier legal or DBA name | `Acme Freight, Inc.` |
| `{{carrier_mc}}` | Carrier MC/DOT number | `MC-345678` |
| `{{carrier_scac}}` | Carrier SCAC code | `ACMF` |
| `{{origin_city_state}}` | Origin city and state | `Dallas, TX` |
| `{{dest_city_state}}` | Destination city and state | `Columbus, OH` |
| `{{ship_date}}` | Original ship date | `2025-09-14` |
| `{{original_eta}}` | Original estimated delivery | `2025-09-17` |
| `{{revised_eta}}` | Revised estimated delivery | `2025-09-19` |
| `{{customer_name}}` | Customer company name | `Midwest Distribution Co.` |
| `{{customer_contact}}` | Customer contact name | `Sarah Chen` |
| `{{our_contact_name}}` | Our representative name | `James Petrovic` |
| `{{our_contact_title}}` | Our representative title | `Transportation Manager` |
| `{{our_contact_email}}` | Our representative email | `jpetrovic@company.com` |
| `{{our_contact_phone}}` | Our representative phone | `(312) 555-0147` |
| `{{our_company}}` | Our company name | `Consolidated Shippers LLC` |
| `{{exception_date}}` | Date exception was identified | `2025-09-16` |
| `{{commodity}}` | Freight commodity description | `Automotive brake assemblies` |
| `{{weight}}` | Shipment weight | `12,400 lbs` |
| `{{piece_count}}` | Piece/pallet count | `14 pallets` |
| `{{freight_charge}}` | Freight charge amount | `$3,840.00` |
| `{{cargo_value}}` | Declared cargo value | `$47,200.00` |
| `{{claim_amount}}` | Claim dollar amount | `$47,200.00` |
| `{{claim_number}}` | Carrier-assigned claim number | `CLM-2025-0398` |
| `{{our_claim_ref}}` | Internal claim reference | `EXC-2025-1104` |
| `{{deadline_date}}` | Response or action deadline | `2025-09-18 by 14:00 CT` |
| `{{days_in_transit}}` | Days shipment has been moving | `5` |
| `{{last_known_location}}` | Last scan or check-call location | `Indianapolis, IN terminal` |

---

## 1. Initial Exception Notification to Carrier (Standard)

### When to Use
- Exception identified through tracking, check-call miss, or OS&D report.
- Severity is moderate — the shipment is delayed or has a discrepancy but is not in immediate jeopardy.
- First outreach to carrier operations or dispatch regarding this specific issue.

### Tone Guidance
Keep this factual and collaborative. You are a professional notifying a partner of a discrepancy, not accusing anyone of failure. Assume good intent — the goal is to get information and a corrective plan, not to assign blame at this stage.

### What NOT to Say
- Do not threaten claims or contract consequences in the first contact.
- Do not speculate on what caused the exception.
- Do not use language like "you failed to" or "your driver caused" — you do not yet have confirmed root cause.
- Do not copy the customer on carrier operational communications.

### Subject Line

```
Exception Notice — PRO {{pro_number}} | {{origin_city_state}} to {{dest_city_state}} | BOL {{bol_number}}
```

### Body

```
Team,

We are writing regarding a shipment exception on the following load:

  PRO:            {{pro_number}}
  BOL:            {{bol_number}}
  PO:             {{po_number}}
  Origin:         {{origin_city_state}}
  Destination:    {{dest_city_state}}
  Ship Date:      {{ship_date}}
  Original ETA:   {{original_eta}}
  Commodity:      {{commodity}}
  Weight/Count:   {{weight}} / {{piece_count}}

EXCEPTION DETAILS:
{{exception_description}}

We identified this exception on {{exception_date}} at approximately {{exception_time}}.
The last confirmed status was {{last_known_status}} at {{last_known_location}} on
{{last_scan_date}}.

We need the following from your team:

  1. Current physical location of the freight
  2. Updated ETA to the consignee
  3. Root cause of the delay or discrepancy
  4. Corrective action being taken

Please respond by {{deadline_date}} so we can update our customer accordingly.

If you have questions or need additional shipment details, contact me directly at
{{our_contact_phone}} or {{our_contact_email}}.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}}
```

---

## 2. Initial Exception Notification to Carrier (Urgent)

### When to Use
- Shipment is critical: production-down, store-opening, perishable, or high-value.
- Exception creates immediate financial exposure (e.g., production line stoppage, contract penalty window).
- Customer has already escalated or SLA breach is imminent (within 24 hours).

### Tone Guidance
Direct and time-bound. This is not hostile, but it communicates that the situation requires immediate action, not a callback tomorrow. Every sentence should drive toward a concrete next step. Use specific deadlines, not "as soon as possible."

### What NOT to Say
- Do not soften the urgency — "when you get a chance" undermines the entire message.
- Do not issue ultimatums you cannot enforce at this stage.
- Do not reference other shipments or unrelated performance issues — stay on this load.
- Do not leave out the financial exposure figure; it justifies the urgency.

### Subject Line

```
URGENT — Immediate Response Required | PRO {{pro_number}} | {{dest_city_state}} | ETA Miss
```

### Body

```
URGENT — IMMEDIATE RESPONSE REQUIRED

This shipment requires your immediate attention. We need a substantive response
by {{deadline_date}} — not an acknowledgment, but confirmed status and a recovery plan.

SHIPMENT DETAILS:
  PRO:            {{pro_number}}
  BOL:            {{bol_number}}
  PO:             {{po_number}}
  Origin:         {{origin_city_state}}
  Destination:    {{dest_city_state}}
  Ship Date:      {{ship_date}}
  Original ETA:   {{original_eta}}
  Commodity:      {{commodity}}
  Weight/Count:   {{weight}} / {{piece_count}}
  Declared Value: {{cargo_value}}

EXCEPTION:
{{exception_description}}

BUSINESS IMPACT:
{{business_impact_description}}

Estimated financial exposure if not resolved by {{resolution_deadline}}: {{financial_exposure}}.

REQUIRED BY {{deadline_date}}:
  1. Confirmed physical location of the freight — verified, not last-scan
  2. Firm revised delivery date and time
  3. Name and direct phone number of the person managing recovery
  4. Written recovery plan

If I do not have a response by the deadline above, I will escalate to your account
management team and begin contingency planning, which may include diversion or
re-tender.

Contact me directly:
{{our_contact_name}} | {{our_contact_phone}} | {{our_contact_email}}

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
```

---

## 3. Customer Proactive Update — Delay

### When to Use
- Transit delay confirmed or highly probable (revised ETA is beyond the committed window).
- Send this before the customer discovers the delay on their own. Proactive communication preserves trust; reactive communication erodes it.
- You have a revised ETA — even if approximate. If you have no ETA at all, say so and commit to a follow-up time.

### Tone Guidance
Honest and solution-forward. Acknowledge the delay plainly — do not bury it in qualifiers. Lead with the revised timeline, then explain briefly. The customer wants to know "when will I get my freight" before they want to know "what happened." Do not name the carrier or assign blame to any specific party.

### What NOT to Say
- Do not blame the carrier by name — say "our carrier partner," not "XYZ Trucking messed up."
- Do not say "unforeseen circumstances" — be specific about the cause category (weather, equipment, routing).
- Do not promise a revised ETA you cannot support. If uncertain, give a range.
- Do not use "we apologize for any inconvenience" — it reads as form language. Be specific about the impact you understand.

### Subject Line

```
Shipment Update — PO {{po_number}} | Revised ETA {{revised_eta}}
```

### Body

```
{{customer_contact}},

I want to update you on PO {{po_number}} (our reference {{shipment_id}}) shipping
from {{origin_city_state}} to {{dest_city_state}}.

This shipment is experiencing a transit delay. The original estimated delivery was
{{original_eta}}. Based on current status, the revised delivery estimate is
{{revised_eta}}.

CAUSE: {{delay_cause_customer_facing}}

HERE IS WHAT WE ARE DOING:
  - {{action_item_1}}
  - {{action_item_2}}
  - {{action_item_3}}

I will send you another update by {{next_update_time}} with confirmed delivery
details. If the timeline shifts further in either direction, you will hear from me
immediately.

If this delay impacts your operations and you need us to evaluate expedited
alternatives, please let me know and I will have options to you within
{{expedite_response_window}}.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

### Variant — Delay with No ETA Yet

When you cannot provide a revised ETA, replace the ETA section:

```
This shipment is experiencing a transit delay. The original estimated delivery was
{{original_eta}}. We do not yet have a confirmed revised delivery time, but I am
working to get one and will update you by {{next_update_time}} today.
```

---

## 4. Customer Proactive Update — Damage

### When to Use
- Carrier or consignee has reported visible damage at delivery or in transit.
- Damage is confirmed or strongly suspected (e.g., photos from driver, consignee notation on POD).
- Send before the customer calls you. If they are the consignee, send before they have to chase you for next steps.

### Tone Guidance
Lead with the resolution, not the problem. The customer's first question is "what are you going to do about it" — answer that before describing the damage. Be specific about the remediation path (replacement, credit, re-ship) and timeline. Express genuine concern for the business impact without being dramatic.

### What NOT to Say
- Do not lead with the damage description. The opening paragraph should be about the resolution path.
- Do not say "these things happen in transit" — it minimizes the customer's loss.
- Do not speculate on cause (packaging, handling, weather) until investigation is complete.
- Do not ask the customer to file a claim — that is your job.

### Subject Line

```
PO {{po_number}} — Delivery Update and Resolution Plan
```

### Body

```
{{customer_contact}},

I am reaching out regarding PO {{po_number}} (our reference {{shipment_id}})
delivered to {{dest_city_state}} on {{delivery_date}}.

We have identified damage to a portion of this shipment and I want to walk you
through the resolution we are putting in place.

RESOLUTION:
  {{resolution_description}}

  Timeline: {{resolution_timeline}}

DAMAGE DETAILS:
  Items Affected:   {{damaged_items_description}}
  Extent:           {{damage_extent}}
  Pieces Affected:  {{damaged_piece_count}} of {{piece_count}} total

We are handling the carrier claim and investigation on our end — no action is
needed from your team on that front.

What we do need from you:
  - Confirmation of the affected quantities once your receiving team completes
    inspection
  - Direction on whether you want us to {{resolution_option_a}} or
    {{resolution_option_b}}

I understand this impacts your {{customer_impact_area}} and I take that seriously.
I will stay on this personally until it is fully resolved.

Next update from me: {{next_update_time}}.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

---

## 5. Customer Proactive Update — Loss

### When to Use
- Shipment is confirmed lost — not just delayed or unlocated. A shipment is "lost" when the carrier has confirmed they cannot locate the freight after a thorough trace, OR when {{days_without_scan}} days have passed with no carrier response to trace requests.
- This is the most sensitive exception communication. The customer is learning that their goods are gone. Do not send this template for a shipment that is merely late or temporarily unlocated.

### Tone Guidance
Empathetic, direct, and action-oriented. Do not hedge or use passive constructions — "your shipment has been lost" is clearer than "there appears to be a situation involving the non-delivery of your order." Immediately establish the action plan. The customer needs to know three things: (1) what happened, (2) what you are doing right now, and (3) when they will have resolution. Convey that you understand the severity.

### What NOT to Say
- Do not say "misplaced" or "misrouted" if the shipment is confirmed lost — it sounds like you are minimizing.
- Do not say "we are still looking into it" without a concrete next step and deadline.
- Do not blame the carrier by name.
- Do not lead with the claims process — lead with the replacement or remediation plan. The customer needs their goods, not a claims education.
- Do not use "unfortunately" more than once.

### Subject Line

```
PO {{po_number}} — Shipment Status and Immediate Action Plan
```

### Body

```
{{customer_contact}},

I need to share a difficult update on PO {{po_number}} (our reference
{{shipment_id}}), originally shipping {{origin_city_state}} to
{{dest_city_state}} on {{ship_date}}.

After an extensive trace with our carrier partner, we have confirmed that this
shipment — {{piece_count}} of {{commodity}}, valued at {{cargo_value}} — has
been lost in transit. I know this creates a real problem for your team and I want
to lay out exactly what we are doing about it.

IMMEDIATE ACTION PLAN:

  1. REPLACEMENT / RE-SHIP:
     {{replacement_plan}}
     Expected availability: {{replacement_date}}

  2. FINANCIAL REMEDIATION:
     {{financial_remediation_plan}}
     Timeline: {{financial_remediation_timeline}}

  3. CARRIER CLAIM:
     We have filed a formal cargo claim against the carrier. This is our
     responsibility to manage — you do not need to take any action on the
     claim.
     Claim reference: {{our_claim_ref}}

  4. PREVENTION:
     {{prevention_steps}}

I will call you at {{follow_up_call_time}} to discuss this directly and answer
any questions. If you need to reach me before then, my cell is
{{our_contact_phone}}.

I take full ownership of making this right.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

---

## 6. Escalation to Carrier Account Manager

### When to Use
- Initial contact to carrier dispatch or operations has gone unanswered for 4+ hours on a standard exception, or 2+ hours on an urgent exception.
- You have documented at least two prior outreach attempts (email, phone, or both) to the frontline contact.
- The account manager is the next level of the carrier's organization who can apply internal pressure.

### Tone Guidance
Professional but firm. You are not angry — you are a business partner whose reasonable requests have been ignored, and you need the account manager to intervene. State the timeline of your attempts factually. Make the ask concrete. The account manager needs to know exactly what you need and by when so they can push their operations team.

### What NOT to Say
- Do not trash the frontline contact by name — say "your operations team" or "your dispatch."
- Do not threaten to pull freight at this stage unless you mean it and have authority.
- Do not pile on unrelated issues — stay on this shipment.

### Subject Line

```
Escalation — No Response on PRO {{pro_number}} | Requires Your Intervention
```

### Body

```
{{carrier_account_manager_name}},

I am escalating to you because I have been unable to get a substantive response
from your operations team on a shipment exception that requires immediate
attention.

SHIPMENT:
  PRO:          {{pro_number}}
  BOL:          {{bol_number}}
  PO:           {{po_number}}
  Route:        {{origin_city_state}} → {{dest_city_state}}
  Ship Date:    {{ship_date}}
  Original ETA: {{original_eta}}

EXCEPTION:
{{exception_description}}

OUTREACH TIMELINE:
  {{attempt_1_date_time}} — {{attempt_1_method}}: {{attempt_1_summary}}
  {{attempt_2_date_time}} — {{attempt_2_method}}: {{attempt_2_summary}}
  {{attempt_3_date_time}} — {{attempt_3_method}}: {{attempt_3_summary}}

It has been {{hours_since_first_contact}} hours since our first outreach with no
confirmed status or recovery plan.

I need the following by {{deadline_date}}:
  1. Confirmed current location of the freight
  2. Firm revised ETA
  3. A direct contact managing the recovery who I can reach by phone

My customer is waiting on this update and I cannot continue to respond with "we
are working on it" without specifics.

Please call me at {{our_contact_phone}} or reply to this email by the deadline
above.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

---

## 7. Escalation to Carrier VP/Director

### When to Use
- Account manager has failed to resolve or respond within a reasonable window (typically 12–24 hours after account manager escalation).
- The exception has significant financial exposure, or a pattern of similar failures exists.
- You are prepared to reference contract terms, volume commitments, or documented performance history.
- This is a formal escalation — send it knowing it may be shared with carrier executive leadership.

### Tone Guidance
Formal and data-driven. This is a business communication between senior professionals. No emotion, no sarcasm, no threats — but clear consequences stated as business realities. Reference specific contract provisions, dollar figures, and incident history. The VP needs to understand that this is not a one-off complaint; it is a business risk they need to manage.

### What NOT to Say
- Do not be sarcastic or condescending — "I'm sure you're very busy" undermines your credibility.
- Do not make threats you cannot follow through on (e.g., "we will never use you again" when they are your only option for a lane).
- Do not reference verbal promises or informal agreements — stick to what is documented.
- Do not CC your customer. This is a carrier management conversation.

### Subject Line

```
Executive Escalation — Unresolved Exception PRO {{pro_number}} | {{our_company}} Account
```

### Body

```
{{carrier_vp_name}},
{{carrier_vp_title}}
{{carrier_name}}

I am writing to escalate a shipment exception that has not been resolved despite
repeated engagement with your operations and account management teams.

SHIPMENT DETAILS:
  PRO:            {{pro_number}}
  BOL:            {{bol_number}}
  Route:          {{origin_city_state}} → {{dest_city_state}}
  Ship Date:      {{ship_date}}
  Commodity:      {{commodity}}
  Shipment Value: {{cargo_value}}

EXCEPTION SUMMARY:
{{exception_description}}

ESCALATION HISTORY:
  {{escalation_timeline_summary}}

  Total time without resolution: {{total_hours_unresolved}} hours.

FINANCIAL EXPOSURE:
  Direct cargo exposure:    {{cargo_value}}
  Customer penalty risk:    {{customer_penalty_amount}}
  Expedite/recovery costs:  {{recovery_cost_estimate}}
  Total potential exposure:  {{total_financial_exposure}}

CONTRACT REFERENCE:
Per Section {{contract_section}} of our transportation agreement dated
{{contract_date}}, {{relevant_contract_provision}}.

{{#if pattern_exists}}
PERFORMANCE PATTERN:
This is not an isolated incident. Over the past {{pattern_period}}, we have
logged {{incident_count}} exceptions on your loads, resulting in
{{total_pattern_cost}} in direct costs. Specific incidents:
  {{pattern_incident_list}}
{{/if}}

I need the following from your team by {{deadline_date}}:
  1. Full resolution of this specific shipment
  2. Written root cause analysis
  3. Corrective action plan to prevent recurrence

I value the partnership between {{our_company}} and {{carrier_name}}, and I want
to resolve this collaboratively. However, continued non-responsiveness will
require us to reassess our routing and volume commitments on the
{{origin_city_state}}–{{dest_city_state}} lane.

I am available to discuss at {{our_contact_phone}}.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

---

## 8. Internal Escalation to VP Supply Chain

### When to Use
- Financial exposure exceeds your authority threshold (typically $25,000+ or customer-specific triggers).
- Customer relationship is at risk and executive-to-executive communication may be required.
- A decision is needed that is above your pay grade: re-tender, expedite at premium cost, authorize production-down recovery, or waive contractual terms.
- You need VP awareness even if you do not need VP action — significant exceptions should not be surprises.

### Tone Guidance
Brief and structured. Your VP does not need the narrative — they need the numbers, the exposure, what you have already done, and what you need from them. Lead with the decision or awareness item. Use bullet points. This is an internal operational brief, not a customer communication.

### What NOT to Say
- Do not editorialize — "the carrier is terrible" adds nothing. State the facts.
- Do not bury the financial number. It should be in the first three lines.
- Do not present problems without proposed solutions.
- Do not send this without having already exhausted the escalation steps within your authority.

### Subject Line

```
[ACTION REQUIRED] Exception — {{customer_name}} PO {{po_number}} | ${{financial_exposure}} Exposure
```

### Body

```
{{vp_name}},

Flagging an active exception that requires {{your_awareness / your_decision}}.

BOTTOM LINE:
  Customer:          {{customer_name}}
  Shipment:          PO {{po_number}} / PRO {{pro_number}}
  Exception Type:    {{exception_type}}
  Financial Exposure: ${{financial_exposure}}
  Customer Risk:     {{customer_risk_level}} — {{customer_risk_description}}

SITUATION:
  {{two_to_three_sentence_summary}}

WHAT I HAVE DONE:
  - {{action_taken_1}}
  - {{action_taken_2}}
  - {{action_taken_3}}

WHAT I NEED FROM YOU:
  {{decision_or_action_needed}}

  Options:
    A. {{option_a}} — Cost: ${{option_a_cost}} | Timeline: {{option_a_timeline}}
    B. {{option_b}} — Cost: ${{option_b_cost}} | Timeline: {{option_b_timeline}}

  My recommendation: Option {{recommended_option}} because {{rationale}}.

I need a decision by {{decision_deadline}} to execute the recovery plan.

—{{our_contact_name}}
```

---

## 9. Claims Filing Cover Letter

### When to Use
- Decision has been made to file a formal freight claim against the carrier.
- All supporting documentation has been gathered (BOL, POD, inspection reports, photos, invoice, packing list).
- Claim is being sent within the filing window (9 months under Carmack Amendment for interstate; check state law or contract for intrastate or brokered freight).

### Tone Guidance
Formal and precise. This is a legal document. No emotion, no narrative, no relationship language. State the facts, cite the applicable law, list the enclosed documents, and demand payment. Every statement should be supportable with evidence. Use the carrier's legal name and MC number, not their DBA or sales contact's name.

### What NOT to Say
- Do not editorialize about the carrier's service or your frustration.
- Do not include demands beyond the provable loss amount — consequential damages require separate analysis and legal review.
- Do not omit the filing date or claim amount — these are jurisdictional requirements.
- Do not reference settlement discussions or verbal admissions of fault.

### Subject Line

```
Formal Freight Claim — PRO {{pro_number}} | Claim Amount: ${{claim_amount}}
```

### Body

```
                                              {{current_date}}

VIA EMAIL AND CERTIFIED MAIL

{{carrier_legal_name}}
{{carrier_claims_address}}
MC-{{carrier_mc}} / DOT-{{carrier_dot}}

Attn: Claims Department

RE:   Formal Freight Claim
      PRO Number:       {{pro_number}}
      BOL Number:       {{bol_number}}
      Ship Date:        {{ship_date}}
      Origin:           {{origin_city_state}}
      Destination:      {{dest_city_state}}
      Our Reference:    {{our_claim_ref}}
      Claim Amount:     ${{claim_amount}}

Dear Claims Department:

{{our_company}} hereby files this formal claim for {{claim_type}} against
{{carrier_legal_name}} pursuant to the Carmack Amendment, 49 U.S.C. § 14706,
and applicable regulations at 49 C.F.R. Part 370.

FACTS:

On {{ship_date}}, {{our_company}} tendered {{piece_count}} of {{commodity}},
weighing {{weight}}, to {{carrier_legal_name}} at {{origin_facility}},
{{origin_city_state}}, for transportation to {{dest_facility}},
{{dest_city_state}}, under BOL {{bol_number}}.

{{claim_facts_paragraph}}

CLAIMED AMOUNT:

The total claimed amount is ${{claim_amount}}, computed as follows:

  {{claim_calculation_line_items}}

  Total: ${{claim_amount}}

This amount represents the {{value_basis}} of the goods at the time and place
of shipment, supported by the enclosed invoice documentation.

ENCLOSED DOCUMENTATION:

  1. Bill of Lading (BOL {{bol_number}})
  2. Delivery receipt / Proof of Delivery with consignee notations
  3. {{inspection_report_description}}
  4. Photographs of {{photo_description}}
  5. Commercial invoice(s) — Invoice No. {{invoice_numbers}}
  6. Packing list
  7. Shipper's certificate of value / weight
  {{#if additional_documents}}
  8. {{additional_documents}}
  {{/if}}

DEMAND:

{{our_company}} demands payment of ${{claim_amount}} within thirty (30) days
of receipt of this claim, per 49 C.F.R. § 370.9. In the alternative, we
request written acknowledgment within thirty (30) days and final disposition
within one hundred twenty (120) days, as required by regulation.

Please direct all claim correspondence to:

  {{our_contact_name}}
  {{our_contact_title}}
  {{our_company}}
  {{our_claims_address}}
  {{our_contact_email}}
  {{our_contact_phone}}

  Claim Reference: {{our_claim_ref}}

{{our_company}} reserves all rights and remedies available under applicable
law, including the right to pursue this claim in a court of competent
jurisdiction if not resolved within the regulatory timeframe.

Respectfully,


{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
```

---

## 10. Settlement Negotiation Response (Accepting)

### When to Use
- Carrier has offered a settlement amount and you have decided to accept it.
- The settlement amount has been approved internally (check your authority level — partial settlements often require management sign-off).
- You are ready to close the claim and release the carrier from further liability on this shipment.

### Tone Guidance
Professional and conclusive. You are closing a business matter, not doing the carrier a favor. Confirm the exact terms clearly — amount, payment method, timeline, and scope of release. Do not express gratitude for the settlement or suggest the amount was generous. It is a business resolution.

### What NOT to Say
- Do not say "thank you for your generous offer" — you are accepting fair compensation, not a gift.
- Do not leave any ambiguity about what is being released — specify the PRO, BOL, and claim reference.
- Do not agree to confidentiality clauses or broad releases without legal review.
- Do not accept verbally — always confirm in writing.

### Subject Line

```
Claim Settlement Acceptance — PRO {{pro_number}} | Claim {{our_claim_ref}}
```

### Body

```
{{carrier_claims_contact}},

This letter confirms {{our_company}}'s acceptance of the settlement offer
received on {{offer_date}} regarding the following claim:

  PRO Number:     {{pro_number}}
  BOL Number:     {{bol_number}}
  Our Reference:  {{our_claim_ref}}
  Your Reference: {{claim_number}}

SETTLEMENT TERMS:

  Settlement Amount: ${{settlement_amount}}
  Payment Method:    {{payment_method}}
  Payment Due:       Within {{payment_days}} business days of this acceptance
  Scope of Release:  Full and final settlement of all claims arising from PRO
                     {{pro_number}} / BOL {{bol_number}} for the shipment of
                     {{commodity}} from {{origin_city_state}} to
                     {{dest_city_state}} on {{ship_date}}

Upon receipt of ${{settlement_amount}}, {{our_company}} releases
{{carrier_legal_name}} (MC-{{carrier_mc}}) from any further liability related
to the above-referenced shipment.

This release does not extend to any other shipments, claims, or obligations
between the parties.

Please remit payment to:

  {{our_company}}
  {{our_remittance_address}}
  {{our_payment_details}}

  Reference: {{our_claim_ref}}

Please confirm receipt of this acceptance and expected payment date.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

---

## 11. Settlement Negotiation Response (Rejecting)

### When to Use
- Carrier's settlement offer is below your documented loss amount and you have evidence to support a higher claim.
- You are prepared to counter-offer with a specific amount backed by documentation.
- You have reviewed the carrier's stated basis for the reduced offer and can address their objections.

### Tone Guidance
Firm and evidence-based. You are not offended by a low offer — you are correcting an inaccurate valuation. Walk through their reasoning, point out where it is wrong, and anchor your counter to specific evidence. Keep the door open for resolution but make clear that the documented loss supports your position.

### What NOT to Say
- Do not say "this is insulting" or express emotion about the offer amount.
- Do not threaten litigation in the same sentence as a counter-offer — it contradicts the settlement posture.
- Do not accept their framing if it is incorrect (e.g., if they depreciated new goods or excluded documented items).
- Do not counter without supporting documentation — attach the evidence.

### Subject Line

```
Claim {{our_claim_ref}} — Settlement Offer Declined | Counter-Offer Enclosed
```

### Body

```
{{carrier_claims_contact}},

We have reviewed your settlement offer of ${{offered_amount}} dated
{{offer_date}} for the following claim:

  PRO Number:     {{pro_number}}
  BOL Number:     {{bol_number}}
  Our Reference:  {{our_claim_ref}}
  Your Reference: {{claim_number}}
  Original Claim: ${{claim_amount}}

We are unable to accept this offer. Our original claim of ${{claim_amount}} is
supported by documented evidence, and the offered amount does not adequately
compensate for the loss.

RESPONSE TO YOUR STATED BASIS FOR REDUCTION:

{{carrier_reduction_reason_1}}:
  Our response: {{our_response_1}}
  Supporting documentation: {{supporting_doc_1}}

{{carrier_reduction_reason_2}}:
  Our response: {{our_response_2}}
  Supporting documentation: {{supporting_doc_2}}

{{#if carrier_reduction_reason_3}}
{{carrier_reduction_reason_3}}:
  Our response: {{our_response_3}}
  Supporting documentation: {{supporting_doc_3}}
{{/if}}

COUNTER-OFFER:

{{our_company}} is willing to settle this claim for ${{counter_offer_amount}},
which reflects {{counter_offer_basis}}.

This counter-offer is supported by the following enclosed documentation:
  {{counter_offer_documentation_list}}

We request your response within {{response_days}} business days. We remain open
to resolving this matter directly and would welcome a call to discuss if that
would be productive.

If we are unable to reach a fair resolution, we will need to evaluate our
options under 49 U.S.C. § 14706, which provides a two-year statute of
limitations from the date of claim denial.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

---

## 12. Post-Resolution Summary

### When to Use
- Exception has been fully resolved — freight delivered, claim settled, or loss remediated.
- Distribute to internal stakeholders: operations, account management, finance, and carrier procurement.
- This becomes the permanent record of the exception and feeds carrier scorecard reviews.

### Tone Guidance
Neutral and analytical. This is a post-mortem, not a complaint. State what happened, what it cost, what was done, and what should change. Be specific about lessons learned — vague statements like "we need to communicate better" are worthless. Recommend concrete process changes.

### What NOT to Say
- Do not assign personal blame to individuals — focus on process and system failures.
- Do not omit the financial impact even if the claim was settled favorably — the true cost includes staff time, expedite charges, and customer goodwill.
- Do not skip the "prevention" section. If you cannot recommend a prevention step, say so and explain why.

### Subject Line

```
[CLOSED] Exception Summary — {{customer_name}} / PRO {{pro_number}} | {{exception_type}}
```

### Body

```
EXCEPTION POST-RESOLUTION SUMMARY
====================================

Exception Reference:  {{our_claim_ref}}
Status:               CLOSED — {{closure_date}}
Prepared by:          {{our_contact_name}}
Distribution:         {{distribution_list}}

1. SHIPMENT DETAILS
   Customer:       {{customer_name}}
   PO:             {{po_number}}
   PRO:            {{pro_number}}
   BOL:            {{bol_number}}
   Carrier:        {{carrier_name}} (MC-{{carrier_mc}} / SCAC: {{carrier_scac}})
   Route:          {{origin_city_state}} → {{dest_city_state}}
   Ship Date:      {{ship_date}}
   Commodity:      {{commodity}}
   Weight/Pieces:  {{weight}} / {{piece_count}}

2. EXCEPTION SUMMARY
   Type:            {{exception_type}}
   Discovered:      {{exception_date}}
   Root Cause:      {{confirmed_root_cause}}
   Description:     {{exception_narrative}}

3. TIMELINE
   {{exception_timeline}}

4. FINANCIAL IMPACT
   Cargo Loss/Damage:              ${{cargo_loss_amount}}
   Freight Charges (original):     ${{freight_charge}}
   Expedite / Recovery Costs:      ${{recovery_costs}}
   Customer Penalties / Credits:   ${{customer_penalties}}
   Internal Labor (est.):          ${{internal_labor_cost}}
   ─────────────────────────────────
   Total Cost of Exception:        ${{total_exception_cost}}

   Claim Filed:                    ${{claim_amount}}
   Settlement Received:            ${{settlement_amount}}
   Net Unrecovered Loss:           ${{net_loss}}

5. CUSTOMER IMPACT
   {{customer_impact_summary}}
   Customer Satisfaction Status:   {{csat_status}}
   Relationship Risk:              {{relationship_risk_level}}

6. CARRIER SCORECARD IMPACT
   Carrier:                {{carrier_name}}
   Incidents (trailing 12 months): {{trailing_12_incident_count}}
   On-Time Rate Impact:            {{ot_rate_impact}}
   Claims Ratio Impact:            {{claims_ratio_impact}}
   Recommended Action:             {{carrier_recommended_action}}

7. LESSONS LEARNED
   {{lesson_1}}
   {{lesson_2}}
   {{lesson_3}}

8. PROCESS IMPROVEMENTS
   {{improvement_1}} — Owner: {{owner_1}} — Due: {{due_date_1}}
   {{improvement_2}} — Owner: {{owner_2}} — Due: {{due_date_2}}
   {{improvement_3}} — Owner: {{owner_3}} — Due: {{due_date_3}}

====================================
Filed in: {{document_management_location}}
```

---

## 13. Carrier Performance Warning

### When to Use
- Carrier has a documented pattern of exceptions exceeding acceptable thresholds (e.g., on-time below 90%, claims ratio above 2%, multiple OS&D incidents in a quarter).
- You have data from your TMS or scorecard to support the warning.
- This is a formal notice — not a casual heads-up on a call. It creates a paper trail that supports future routing decisions or contract renegotiation.
- Send after the pattern is established (typically 3+ incidents or a quarter of below-threshold performance), not after a single bad load.

### Tone Guidance
Data-first and dispassionate. Let the numbers make the case. You are not angry — you are a supply chain professional managing vendor performance. State the expectation, show where they fall short, and define the consequences clearly. Leave room for corrective action — you want them to improve, not just feel punished.

### What NOT to Say
- Do not make it personal — "your drivers don't care" is not professional.
- Do not issue an ultimatum you are not prepared to enforce.
- Do not send this during an active exception — wait until the current issue is resolved, then address the pattern.
- Do not combine this with a new load tender or positive feedback — it dilutes the message.

### Subject Line

```
Carrier Performance Notice — {{carrier_name}} (MC-{{carrier_mc}}) | {{performance_period}}
```

### Body

```
{{carrier_contact_name}},
{{carrier_contact_title}}
{{carrier_name}}

This letter serves as a formal performance notice regarding {{carrier_name}}'s
service on {{our_company}} freight during the period {{performance_period}}.

PERFORMANCE SUMMARY:

  Metric                  Target     Actual     Variance
  ─────────────────────   ────────   ────────   ────────
  On-Time Delivery        {{ot_target}}   {{ot_actual}}   {{ot_variance}}
  Claims Ratio            {{claims_target}}   {{claims_actual}}   {{claims_variance}}
  Tender Acceptance       {{ta_target}}   {{ta_actual}}   {{ta_variance}}
  Check-Call Compliance   {{cc_target}}   {{cc_actual}}   {{cc_variance}}
  OS&D Incidents          {{osd_target}}   {{osd_actual}}   {{osd_variance}}

SPECIFIC INCIDENTS:

  {{incident_date_1}} | PRO {{incident_pro_1}} | {{incident_type_1}} | ${{incident_cost_1}}
  {{incident_date_2}} | PRO {{incident_pro_2}} | {{incident_type_2}} | ${{incident_cost_2}}
  {{incident_date_3}} | PRO {{incident_pro_3}} | {{incident_type_3}} | ${{incident_cost_3}}
  {{#if more_incidents}}
  ({{additional_incident_count}} additional incidents detailed in attachment)
  {{/if}}

  Total Exception Cost ({{performance_period}}): ${{total_period_exception_cost}}

VOLUME CONTEXT:

During this period, {{carrier_name}} handled {{total_loads}} loads for
{{our_company}} representing ${{total_freight_spend}} in freight spend. You are
currently ranked {{carrier_rank}} of {{total_carriers}} carriers in our network
for the lanes you serve.

EXPECTATIONS:

To maintain current volume and lane assignments, we require:
  1. {{expectation_1}}
  2. {{expectation_2}}
  3. {{expectation_3}}

We require a written corrective action plan within {{corrective_plan_days}}
business days of this notice.

CONSEQUENCES:

If performance does not improve to target levels within {{improvement_period}}:
  - {{consequence_1}}
  - {{consequence_2}}
  - {{consequence_3}}

We are committed to working with carrier partners who meet our service
standards. I welcome a call to discuss this notice and develop a corrective plan
together.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}

CC: {{internal_cc_list}}
```

---

## 14. Customer Apology with Resolution

### When to Use
- A significant exception has been fully resolved and the customer has received their freight, replacement, or credit.
- The exception was severe enough to warrant a formal acknowledgment beyond the operational updates already sent.
- You want to reinforce the relationship and demonstrate that systemic improvements are being made — not just a one-time fix.

### Tone Guidance
Genuine and specific. A good apology names the specific impact, describes what was done, and commits to specific prevention steps. It does not grovel or over-apologize — the customer is a business partner, not a victim. It should feel like it was written by a senior professional who understands their business, not a customer service script. End on a forward-looking note.

### What NOT to Say
- Do not use "we apologize for any inconvenience" — name the actual impact. "I know the two-day delay forced your team to reschedule the retail reset" is ten times more effective.
- Do not blame the carrier or any third party. You own the customer relationship.
- Do not make promises you cannot keep. "This will never happen again" is not credible. "Here are the three specific steps we are implementing" is.
- Do not make this a sales pitch or segue into new services. Stay focused on the resolution.
- Do not send this the same day as the resolution — wait 1–2 business days so the customer has confirmed the resolution is satisfactory.

### Subject Line

```
PO {{po_number}} — Resolution Confirmed and Path Forward
```

### Body

```
{{customer_contact}},

Now that PO {{po_number}} has been fully resolved, I want to close the loop
personally.

WHAT HAPPENED:
On {{exception_date}}, {{exception_summary_one_sentence}}. This resulted in
{{specific_customer_impact}}.

WHAT WE DID:
  - {{resolution_action_1}}
  - {{resolution_action_2}}
  - {{resolution_action_3}}
  - Final resolution: {{final_resolution_summary}}

WHAT WE ARE CHANGING:
I do not want to repeat what you experienced. Here are the specific steps we
are putting in place:

  1. {{prevention_step_1}}
  2. {{prevention_step_2}}
  3. {{prevention_step_3}}

{{#if financial_goodwill}}
GOODWILL:
{{financial_goodwill_description}}
{{/if}}

I value your business and I value the trust your team places in us. I take it
personally when we fall short of the standard you expect.

If you have any remaining concerns about this shipment or anything else, I am
always available at {{our_contact_phone}}.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_phone}} | {{our_contact_email}}
```

---

## Usage Notes for AI Agents

**Template Selection:** Match the template to the audience (carrier ops, carrier executive, customer, internal) and the stage of the exception lifecycle (detection, escalation, claims, resolution, post-mortem). When in doubt, start with the lowest-escalation template appropriate for the elapsed time and severity.

**Variable Substitution:** All `{{variables}}` must be replaced before sending. If a value is unknown, do not leave the placeholder — either obtain the information or remove the section with a note that it will follow.

**Conditional Sections:** Sections wrapped in `{{#if}}...{{/if}}` are optional and should be included only when the condition applies (e.g., `{{#if pattern_exists}}` in the VP escalation template).

**Tone Calibration:** The tone guidance for each template reflects the appropriate register for that audience and situation. Do not soften escalation templates to be "nicer" or harden customer templates to be "tougher" — the calibration is deliberate.

**Legal Disclaimers:** The claims filing cover letter references the Carmack Amendment (49 U.S.C. § 14706), which applies to interstate motor carrier shipments. For brokered freight, international shipments, or intrastate moves, verify the applicable legal framework before sending. When in doubt, route through legal review.

**Timing:**
- Initial carrier notification: within 1 hour of exception discovery.
- Customer proactive update: within 2 hours of confirmed impact, or before the customer's next business-day start — whichever comes first.
- Escalation to account manager: after 4 hours without response (2 hours for urgent).
- Escalation to VP/Director: after 12–24 hours without account manager resolution.
- Claims filing: as soon as documentation is assembled, within the 9-month statutory window.
- Post-resolution summary: within 5 business days of closure.
- Performance warning: after pattern is documented, not during an active exception.
- Customer apology: 1–2 business days after resolution is confirmed.