# Credit Cycle Analysis: Common Pitfalls

- Contractual terms are not observed collection/payment delays.
- Final settlement date overstates weighted delay when earlier partial payments occurred; unpaid portions need separate aging.
- A missing due date prevents aging classification, but does not by itself prevent credit utilisation when a reconciled outstanding balance and positive limit exist.
- Reconcile signed adjustments and bucket totals without overwriting source components. Show unknown-due-date outstanding amounts separately rather than forcing them into known buckets.
- Do not average per-invoice weighted days and call the result amount-weighted without specifying cohort and weights.
- A single daily-movement proxy omits inventory and differing sales/purchase bases; it is not actual financing need or interest cost.
- Missing required data remains an incomplete draft. Optional JSON numbers are omitted, not populated with the string Unknown.
