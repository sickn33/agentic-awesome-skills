# Communication Templates — Returns & Reverse Logistics

> **Reference Type:** Tier 3 — Load on demand when composing or reviewing returns-related communications.
>
> **Usage:** Each template includes variable placeholders in `{{double_braces}}` for direct substitution. Templates are organized by audience and stage. Select the template matching your scenario, substitute variables, review tone guidance, and send.

---

## Table of Contents

1. [RMA Approval Notification](#1-rma-approval-notification)
2. [RMA Denial Notification](#2-rma-denial-notification)
3. [Fraud Investigation Hold Notice](#3-fraud-investigation-hold-notice)
4. [Vendor RTV Claim Submission](#4-vendor-rtv-claim-submission)
5. [Customer Refund Confirmation](#5-customer-refund-confirmation)
6. [Restocking Fee Explanation](#6-restocking-fee-explanation)
7. [Warranty Claim Filing to Manufacturer](#7-warranty-claim-filing-to-manufacturer)
8. [Disposition Report (Internal)](#8-disposition-report-internal)
9. [Return Policy Exception Approval](#9-return-policy-exception-approval)

---

## Variable Reference

Common variables used across templates:

| Variable | Description | Example |
|---|---|---|
| `{{customer_name}}` | Customer's full name | `Sarah Chen` |
| `{{customer_email}}` | Customer's email | `schen@email.com` |
| `{{order_number}}` | Original order number | `ORD-2025-88431` |
| `{{rma_number}}` | Return merchandise authorisation number | `RMA-2025-04872` |
| `{{product_name}}` | Product name/description | `Sony WH-1000XM5 Wireless Headphones` |
| `{{product_sku}}` | Product SKU | `SNY-WH1000XM5-BLK` |
| `{{serial_number}}` | Product serial number | `SN-8834201` |
| `{{purchase_date}}` | Original purchase date | `2025-09-14` |
| `{{purchase_price}}` | Original purchase price | `$349.99` |
| `{{refund_amount}}` | Refund amount to be issued | `$349.99` |
| `{{restocking_fee}}` | Restocking fee amount | `$52.50` |
| `{{payment_method}}` | Original payment method (masked) | `Visa ending in 4821` |
| `{{return_reason}}` | Customer-stated return reason | `Product not as described` |
| `{{return_window_end}}` | Last day for standard return | `2025-10-14` |
| `{{rma_expiry}}` | RMA label/authorisation expiry date | `2025-10-28` |
| `{{our_company}}` | Our company name | `Apex Commerce Inc.` |
| `{{our_contact_name}}` | Returns team contact name | `Maria Gonzalez` |
| `{{our_contact_title}}` | Contact's title | `Returns Operations Supervisor` |
| `{{our_contact_email}}` | Contact email | `returns@apexcommerce.com` |
| `{{our_contact_phone}}` | Contact phone | `(800) 555-0199` |
| `{{vendor_name}}` | Vendor / manufacturer name | `Bose Corporation` |
| `{{vendor_contact}}` | Vendor returns contact | `James Park, RTV Coordinator` |
| `{{vendor_account}}` | Vendor account number | `APEX-VND-00342` |
| `{{defect_description}}` | Description of the defect | `Left ear cup intermittent audio dropout` |
| `{{inspection_grade}}` | Assigned condition grade | `Grade B` |
| `{{disposition_route}}` | Disposition decision | `Open box resale` |
| `{{business_days}}` | Processing time in business days | `5-7` |
| `{{carrier_name}}` | Return shipping carrier | `UPS Ground` |
| `{{tracking_number}}` | Return shipment tracking | `1Z999AA10123456784` |
| `{{warranty_end_date}}` | Warranty expiration date | `2027-09-14` |
| `{{claim_number}}` | Warranty or vendor claim reference | `WC-2025-11294` |

---

## 1. RMA Approval Notification

### When to Use
- Customer has initiated a return request and it has been approved under standard policy or an authorised exception.
- Send immediately upon RMA approval to minimise the time the customer holds the product.

### Tone Guidance
Warm and efficient. The customer made a decision to return — make it easy. Lead with the actionable information (RMA number, shipping instructions), not the policy.

### What NOT to Say
- Do not ask "are you sure?" or attempt to dissuade the return at this stage.
- Do not include language that implies the customer did something wrong.
- Do not bury the shipping instructions below marketing content.

### Template

**Subject:** Your Return Has Been Approved — RMA# {{rma_number}}

---

Hi {{customer_name}},

Your return for **{{product_name}}** (Order {{order_number}}) has been approved.

**Your RMA Number:** {{rma_number}}

**How to Return Your Item:**

1. Pack the product in its original packaging with all accessories included.
2. Print the prepaid return label attached to this email.
3. Attach the label to the outside of the package.
4. Drop off the package at any {{carrier_name}} location.

**Important Details:**
- Please ship your return by **{{rma_expiry}}** — the RMA expires after this date.
- Once we receive and inspect your return, your refund of **{{refund_amount}}** will be processed to your {{payment_method}} within {{business_days}} business days.

If you have any questions, reply to this email or call us at {{our_contact_phone}}.

Best regards,
{{our_company}} Returns Team

---

## 2. RMA Denial Notification

### When to Use
- The return request does not meet policy requirements (outside window, excluded category, condition not met).
- Always provide specific reasons and alternative options.

### Tone Guidance
Empathetic but clear. The customer will be disappointed. Acknowledge their situation, explain the specific reason (not generic "per our policy"), and always offer at least one alternative path forward.

### What NOT to Say
- Do not use "unfortunately" more than once.
- Do not cite policy section numbers or legalistic language.
- Do not close the door completely — always provide an alternative or escalation path.
- Never say "there's nothing we can do."

### Template

**Subject:** Regarding Your Return Request — Order {{order_number}}

---

Hi {{customer_name}},

Thank you for contacting us about returning your **{{product_name}}** (Order {{order_number}}, purchased {{purchase_date}}).

After reviewing your request, we're unable to process a standard return because **{{denial_reason}}**.

**We understand this is frustrating, and we want to help. Here are your options:**

{{#if warranty_eligible}}
- **Warranty claim:** Your product is still covered under the manufacturer's warranty through {{warranty_end_date}}. We can help you file a warranty claim for repair or replacement. Just reply to this email and we'll get that started.
{{/if}}

{{#if exchange_eligible}}
- **Exchange:** While we can't offer a refund, we can arrange an exchange for the same product or a similar item. A {{restocking_fee_pct}}% restocking fee would apply.
{{/if}}

- **Store credit:** We may be able to offer store credit on a case-by-case basis. If you'd like us to review this option, please reply with any additional details about your situation.

- **Speak with a supervisor:** If you feel your situation warrants an exception, we're happy to have a supervisor review your case. Call us at {{our_contact_phone}} and ask for a returns supervisor.

We value your business and want to find a solution that works for you.

Sincerely,
{{our_contact_name}}
{{our_company}} Returns Team
{{our_contact_email}} | {{our_contact_phone}}

---

## 3. Fraud Investigation Hold Notice

### When to Use
- A return has been flagged by the fraud scoring system (score ≥ 65) and requires review before the refund is processed.
- The customer must be informed of the delay without revealing the fraud investigation.

### Tone Guidance
Neutral and professional. This is a "processing delay" notification. NEVER use the words "fraud," "suspicious," "investigation," or "flagged." The customer may be entirely legitimate — the hold is precautionary.

### What NOT to Say
- Never say "your return has been flagged."
- Never reference fraud, theft, or abuse.
- Never imply the customer has done something wrong.
- Do not give an indefinite timeline — always commit to a specific review window.

### Template

**Subject:** Your Return is Being Processed — Order {{order_number}}

---

Hi {{customer_name}},

Thank you for your return of **{{product_name}}** (RMA# {{rma_number}}).

We've received your returned item and it is currently undergoing our quality review process. This review ensures we accurately assess the product's condition and process your refund correctly.

**We expect to complete this review within {{review_days}} business days.**

You don't need to do anything at this time. We'll send you a confirmation email once your refund has been processed.

If you have questions in the meantime, you can reach us at {{our_contact_phone}} or reply to this email.

Thank you for your patience,
{{our_company}} Returns Team

---

### Internal Companion Note (Not Sent to Customer)

**Fraud Review — RMA# {{rma_number}}**

| Field | Detail |
|---|---|
| Customer | {{customer_name}} ({{customer_email}}) |
| Fraud Score | {{fraud_score}} |
| Primary Signals | {{fraud_signals}} |
| Product | {{product_name}} ({{product_sku}}) |
| Return Value | {{purchase_price}} |
| Customer LTV | {{customer_ltv}} |
| Action Required | {{review_action}} |
| Review Deadline | {{review_deadline}} |
| Assigned To | {{reviewer_name}} |

**Review Instructions:** Complete inspection with photo documentation. Verify serial number against order record. Check product weight against expected weight. Compare physical product against product listing. Document findings in the fraud case management system. Recommend: process refund / partial refund / deny with escalation.

---

## 4. Vendor RTV Claim Submission

### When to Use
- Submitting a return-to-vendor claim for defective products, vendor-caused quality issues, or vendor compliance violations.
- Attach all supporting documentation (photos, inspection reports, customer complaint data).

### Tone Guidance
Professional and evidence-based. Vendors respond to data, not complaints. Lead with the facts: SKU, quantity, defect description, return rate data. Reference the vendor agreement section that covers defect claims.

### Template

**Subject:** RTV Claim — {{vendor_account}} — {{claim_number}}

---

{{vendor_contact}},

Please find below our return-to-vendor claim for defective merchandise received under account {{vendor_account}}.

**Claim Reference:** {{claim_number}}
**Date Submitted:** {{claim_date}}
**RTV Authorisation #:** {{rtv_auth_number}} (if applicable)

**Claim Details:**

| SKU | Product Name | Qty Defective | Defect Description | Unit Cost | Extended |
|---|---|---|---|---|---|
| {{sku_1}} | {{product_1}} | {{qty_1}} | {{defect_1}} | {{cost_1}} | {{ext_1}} |
| {{sku_2}} | {{product_2}} | {{qty_2}} | {{defect_2}} | {{cost_2}} | {{ext_2}} |

**Total Claim Amount:** {{total_claim_amount}}

**Supporting Documentation (attached):**
- Defect photographs ({{photo_count}} images)
- Inspection reports for each SKU
- Customer return data by SKU (return rate, complaint summary)
- Original purchase order(s): {{po_numbers}}

**Defect Rate Analysis:**
- SKU {{sku_1}}: {{defect_rate_1}}% return rate ({{period}}), versus category baseline of {{baseline_rate}}%
- Excess returns above baseline: {{excess_units}} units

Per Section {{agreement_section}} of our Vendor Agreement dated {{agreement_date}}, defective merchandise exceeding the {{defect_threshold}}% defect rate threshold is eligible for full credit including inbound freight and return processing costs.

**Requested Resolution:** Full merchandise credit of {{total_claim_amount}} plus return processing costs of {{processing_costs}} and inbound freight of {{freight_costs}}, for a total claim of {{grand_total}}.

Please confirm receipt and provide expected credit timeline. Per our agreement, vendor credits are due within {{credit_days}} days of claim submission.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 5. Customer Refund Confirmation

### When to Use
- Refund has been processed. This is the final communication for a standard return.
- Send immediately when the refund is initiated (not when it clears the customer's bank).

### Tone Guidance
Warm and concise. Lead with the refund amount and timeline. The customer wants to know: how much and when.

### Template

**Subject:** Your Refund Has Been Processed — {{refund_amount}}

---

Hi {{customer_name}},

Your refund for **{{product_name}}** (Order {{order_number}}) has been processed.

**Refund Details:**
- **Amount:** {{refund_amount}}
- **Refunded to:** {{payment_method}}
- **Expected arrival:** {{refund_timeline}}

{{#if restocking_fee_applied}}
A restocking fee of {{restocking_fee}} was applied per our return policy for opened {{product_category}} items. Your original purchase price was {{purchase_price}}.
{{/if}}

{{#if store_credit}}
Your store credit of {{store_credit_amount}} has been added to your account and is available immediately.
{{/if}}

Thank you for shopping with us. If there's anything else we can help with, we're here.

Best,
{{our_company}} Customer Care

---

## 6. Restocking Fee Explanation

### When to Use
- When a restocking fee is applied and the customer questions it (either proactively at the time of return or in response to a complaint).

### Tone Guidance
Transparent and factual. Explain what the fee covers. Do not be apologetic about the policy, but do be clear about the specific dollar amounts.

### Template

**Subject:** Re: Your Return — Restocking Fee Details

---

Hi {{customer_name}},

I understand you have a question about the restocking fee on your return of **{{product_name}}**.

Here's a breakdown:

| Item | Amount |
|---|---|
| Original purchase price | {{purchase_price}} |
| Restocking fee ({{restocking_fee_pct}}%) | -{{restocking_fee}} |
| **Your refund** | **{{refund_amount}}** |

**Why a restocking fee is applied:**

Our return policy includes a {{restocking_fee_pct}}% restocking fee for opened {{product_category}} products. This fee covers the cost of inspecting, testing, and repackaging the product so it can be offered to the next customer at a reduced "open box" price. Once an item has been opened and used, it can no longer be sold as new, and the restocking fee helps offset this value difference.

**Please note:** Restocking fees are waived for defective products and fulfilment errors. If you believe your product was defective, please let us know and we'll review — if a defect is confirmed, we'll refund the restocking fee.

If you'd like to discuss further, please call us at {{our_contact_phone}} or reply to this email.

Regards,
{{our_contact_name}}
{{our_company}} Returns Team

---

## 7. Warranty Claim Filing to Manufacturer

### When to Use
- Filing a warranty claim with the manufacturer on behalf of the customer or for retailer-held defective inventory.

### Tone Guidance
Formal and thorough. Manufacturers process warranty claims based on documentation quality. Include everything upfront to avoid back-and-forth.

### Template

**Subject:** Warranty Claim — {{claim_number}} — {{product_name}}

---

To: {{manufacturer_warranty_dept}}

**Warranty Claim Submission**

| Field | Detail |
|---|---|
| Claim Reference | {{claim_number}} |
| Retailer Account | {{retailer_account_number}} |
| Product | {{product_name}} ({{product_sku}}) |
| Serial Number | {{serial_number}} |
| Purchase Date | {{purchase_date}} |
| Warranty Expiration | {{warranty_end_date}} |
| Defect Description | {{defect_description}} |
| Date Defect Reported | {{defect_report_date}} |

**Customer Information:**
- Name: {{customer_name}}
- Original Order: {{order_number}}
- Customer has been provided interim resolution: {{interim_resolution}}

**Defect Documentation:**
- Photographs of defect: attached ({{photo_count}} images)
- Functional test results: {{test_results}}
- Customer description of defect: "{{customer_defect_statement}}"

**Product Condition:**
- Physical condition: {{physical_condition}}
- Modifications: {{modifications_noted}}
- Accessories present: {{accessories_status}}

**Requested Resolution:** {{requested_resolution}} (repair / replacement / credit)

Please confirm receipt and provide claim processing timeline. The customer is awaiting resolution.

Regards,
{{our_contact_name}}
{{our_contact_title}}
{{our_company}}
{{our_contact_email}} | {{our_contact_phone}}

---

## 8. Disposition Report (Internal)

### When to Use
- Weekly or monthly summary of returns disposition outcomes for management review.
- Used to track recovery rates, identify disposition efficiency opportunities, and monitor fraud trends.

### Tone Guidance
Data-first, concise. Management reads these for trends and exceptions, not prose.

### Template

**Subject:** Returns Disposition Report — {{report_period}}

---

## Summary

| Metric | This Period | Prior Period | Trend |
|---|---|---|---|
| Total returns received | {{total_returns}} | {{prior_total}} | {{trend_total}} |
| Total return value | {{total_value}} | {{prior_value}} | {{trend_value}} |
| Average return value | {{avg_value}} | {{prior_avg}} | {{trend_avg}} |
| Restock rate (Grade A) | {{restock_pct}}% | {{prior_restock}}% | {{trend_restock}} |
| Open box / renewed rate (Grade B) | {{open_box_pct}}% | {{prior_open_box}}% | {{trend_ob}} |
| Liquidation rate (Grade C) | {{liquidation_pct}}% | {{prior_liq}}% | {{trend_liq}} |
| Destroy / recycle rate (Grade D) | {{destroy_pct}}% | {{prior_destroy}}% | {{trend_destroy}} |
| Net recovery rate | {{recovery_pct}}% | {{prior_recovery}}% | {{trend_recovery}} |
| Fraud flags triggered | {{fraud_flags}} | {{prior_fraud}} | {{trend_fraud}} |
| Confirmed fraud cases | {{confirmed_fraud}} | {{prior_confirmed}} | {{trend_confirmed}} |
| Vendor RTV claims filed | {{rtv_count}} ({{rtv_value}}) | {{prior_rtv}} | {{trend_rtv}} |

## Top Return Reasons

| Reason | Count | % of Total | Avg Value |
|---|---|---|---|
| {{reason_1}} | {{count_1}} | {{pct_1}}% | {{avg_1}} |
| {{reason_2}} | {{count_2}} | {{pct_2}}% | {{avg_2}} |
| {{reason_3}} | {{count_3}} | {{pct_3}}% | {{avg_3}} |
| {{reason_4}} | {{count_4}} | {{pct_4}}% | {{avg_4}} |
| {{reason_5}} | {{count_5}} | {{pct_5}}% | {{avg_5}} |

## Top SKUs by Return Volume

| SKU | Product | Returns | Return Rate | Primary Reason | Action |
|---|---|---|---|---|---|
| {{sku_1}} | {{prod_1}} | {{ret_1}} | {{rate_1}}% | {{reason_sku_1}} | {{action_1}} |
| {{sku_2}} | {{prod_2}} | {{ret_2}} | {{rate_2}}% | {{reason_sku_2}} | {{action_2}} |
| {{sku_3}} | {{prod_3}} | {{ret_3}} | {{rate_3}}% | {{reason_sku_3}} | {{action_3}} |

## Exceptions and Escalations

- {{exception_summary_1}}
- {{exception_summary_2}}
- {{exception_summary_3}}

## Recommendations

- {{recommendation_1}}
- {{recommendation_2}}
- {{recommendation_3}}

---

Prepared by: {{our_contact_name}}, {{our_contact_title}}
Distribution: {{distribution_list}}

---

## 9. Return Policy Exception Approval

### When to Use
- When an exception to standard return policy has been approved (outside window, missing receipt, condition outside standard acceptance criteria).
- Documents the exception for audit trail and communicates the decision to the customer.

### Tone Guidance
Customer-facing version: warm, conveys that you went above and beyond. Internal version: factual, documents the business justification.

### Customer-Facing Template

**Subject:** Good News — Your Return Has Been Approved

---

Hi {{customer_name}},

We've reviewed your return request for **{{product_name}}** (Order {{order_number}}) and we're happy to let you know that we've approved it as a one-time exception.

**Here's what you need to know:**

- **Refund amount:** {{refund_amount}} as {{refund_type}}
- **How to return:** {{return_instructions}}
- **RMA Number:** {{rma_number}} (valid through {{rma_expiry}})

{{#if conditions}}
**Please note:** {{exception_conditions}}
{{/if}}

We appreciate your loyalty and hope this helps. If you need anything else, we're here.

Best,
{{our_contact_name}}
{{our_company}} Customer Care

---

### Internal Approval Record

**Policy Exception Approval**

| Field | Detail |
|---|---|
| RMA | {{rma_number}} |
| Customer | {{customer_name}} ({{customer_email}}) |
| Order | {{order_number}} |
| Product | {{product_name}} ({{product_sku}}) |
| Purchase Price | {{purchase_price}} |
| Refund Amount | {{refund_amount}} |
| Refund Type | {{refund_type}} |
| Standard Policy Violation | {{policy_violation}} |
| Exception Score | {{exception_score}} (per Exception Matrix) |
| Customer LTV | {{customer_ltv}} |
| Customer Return Rate | {{customer_return_rate}}% |
| Business Justification | {{business_justification}} |
| Approved By | {{approver_name}} ({{approver_title}}) |
| Approval Date | {{approval_date}} |
| Precedent Risk | {{precedent_risk}} |
| Notes | {{approval_notes}} |
