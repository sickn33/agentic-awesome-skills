---
name: returns-reverse-logistics
description: Codified expertise for returns authorisation, receipt and inspection, disposition decisions, refund processing, fraud detection, and warranty claims management.
risk: safe
source: https://github.com/ai-evos/agent-skills
date_added: '2026-02-27'
---

# Returns & Reverse Logistics

## When to Use

Use for drafting return authorisation, receiving, inspection, disposition, refund,
fraud-review, vendor recovery and warranty workflows across retail channels.

## Operating Boundaries

Act as an operations planning assistant. Obtain the merchant, product/category,
jurisdiction, purchase/delivery dates, applicable policy version, contract and
requested remedy. Distinguish voluntary change-of-mind policies from statutory
consumer remedies, manufacturer warranties and service contracts. A merchant's
30-day window, packaging rule or score cannot extinguish statutory rights.

Draft recommendations and communications; do not issue refunds, deny claims,
change inventory, debit vendors, contact customers or purchase shipping without
task-specific authority. Preserve the upstream attribution in frontmatter.

## Workflow

1. Match the order and actual amount paid, including discounts, tax, freight,
   previous refunds and any active payment dispute. Use approved masked lookup;
   do not collect full card numbers or identity documents by default.
2. Identify the requested remedy and applicable deadlines. Record policy text,
   legal requirements and unknowns separately. Refer uncertain legal questions to
   the responsible compliance owner before denial or fee application.
3. Screen for recalls, damaged batteries, chemicals, contamination, counterfeit
   suspicion and personal data before normal shipping or powered testing. Route
   hazardous goods through trained staff and the applicable recall/transport plan.
4. Receive into a non-sellable status. Record serial/lot, accessories, condition,
   inspection results and chain of custody. Check fulfilment errors before
   interpreting an item/serial mismatch as deliberate misconduct.
5. Grade against product-specific criteria; then apply independent safety,
   authenticity, sanitation, data-erasure and channel-eligibility checks. An A
   grade, sealed box or battery-health percentage does not establish that a used
   product can be advertised as new.
6. Compare eligible disposition paths using incremental net recovery. Obtain
   approval for the chosen route and track actual receipts, costs and exceptions.
7. Calculate and reconcile the refund or remedy. Honour legal deadlines and
   coordinate with payments to prevent duplicate credits. A customer's promise
   to withdraw a chargeback is not confirmation that the acquirer closed it.
8. Submit vendor claims only under the actual agreement, preserving evidence,
   authorisations, claim windows and credit reconciliation. Do not offset an
   invoice or next purchase order unilaterally.

## Decision Rules

- A fraud signal requests an evidence-based human review; it is not a finding of
  fraud or automatic authority to delay a refund. Avoid uncalibrated additive
  scores, correlated-signal double counting and self-reinforcing prior flags.
  High spending does not prove honesty, and net revenue is not lifetime profit.
- Restock as new only when actual use, product law, channel rules and documented
  inspection support that description. Otherwise use an accurately described
  open-box/refurbished route, subject to all release checks.
- A locked device remains non-sellable until legitimate unlock and verified data
  sanitisation. Never bypass an account lock or inspect customer files.
- Recall instructions determine the remedy and physical route. Do not assume
  every recall requires destruction or that every retailer may promise a refund.
- Donation deductions are not cash proceeds. Tax eligibility and limits depend on
  donor, inventory basis, recipient and law; a tax specialist must assess them.
- Returnless refunds compare the net recovery from taking back the goods with
  their incremental collection/handling costs. They must also satisfy safety,
  recall, evidence and customer-rights requirements; no universal price threshold.

## Example

Assume the same $80 refund in both options. A safe returned product could yield
$30 net sales proceeds before collection, with $12 freight and $8 inspection.
Taking it back adds $10 ($30 - $12 - $8) versus a returnless refund. If proceeds
were $15, it would add a $5 loss. The original product cost and common refund
cancel in this comparison; do not count them twice. Actual policy, fraud evidence
and safety constraints may still determine the route.

## Required Output

Provide an order/units reconciliation, applicable policy and remedy, deadlines,
inspection evidence, approved disposition with net economics, refund calculation,
owner/approval status and draft customer message. Label unverified assumptions
and unresolved compliance questions. Confirm an action only from system evidence.

## Metrics

Use comparable cohorts and explicit denominators: returned units / delivered units
for a stated cohort and horizon; legitimate returns flagged / all legitimate
returns for false-positive rate; confirmed fraud detected / all confirmed fraud
for recall, only where ground truth is available. Report sample size, unresolved
cases and reporting lag. Separate predicted from realised recovery and customer
revenue from contribution profit. Set local targets from measured operations.

## References

- [Decision frameworks](references/decision-frameworks.md)
- [Twenty edge cases](references/edge-cases.md)
- [Draft communication templates](references/communication-templates.md)

## Limitations

This is planning guidance, not a jurisdiction-specific legal determination,
carrier approval, tax calculation, safety inspection or sanitisation certificate.
No merchant integration or current policy database is bundled. Verify applicable
primary rules and product instructions for each case; do not invent fees,
benchmarks, certification, vendor reimbursement or regulatory deadlines.
