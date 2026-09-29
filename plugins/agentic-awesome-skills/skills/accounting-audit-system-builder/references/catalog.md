# Accounting & Audit Module Catalog

16 accounting and audit skills, one per stage of the accounting cycle. Each one
identifies intent, asks only what is missing, recommends the smallest workflow, and
builds CSV + SQL DDL + JSON Schema + Notion template only when asked.

Route from `accounting-audit-system-builder`; do not load this file at runtime unless
the user asks what is available.

These 16 modules were promoted into the flat layout in 158fc1e and are listed in
`../../references/catalog.md` with the rest; what stayed behind is the router and this
catalog, so a request can still be placed on the accounting cycle stage by stage. Where a
module exists in both views, use this pack when the question is about the entry, the
reconciliation or the audit trail, and the flat catalog when the question is about the
ongoing process.

## Layer 1: Foundation

Choosing and setting up the system the entries will live in.

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Accounting Software Selection | - | Growth | 57 | `skills/accounting-software-selection/SKILL.md` |

## Layer 2: Document

The evidence every entry is traced back to.

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Source Document & Filing | - | Growth | 22 | `skills/source-document-filing/SKILL.md` |

## Layer 3: Record

The four transaction books. Every one of them carries the receipt-versus-income
distinction and the mode-of-payment distinction explicitly.

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Purchase Accounting | - | Growth | 29 | `skills/purchase-accounting/SKILL.md` |
| Sales Accounting | - | Starter | 33 | `skills/sales-accounting/SKILL.md` |
| Receipt Accounting | - | Starter | 23 | `skills/receipt-accounting/SKILL.md` |
| Payment Accounting | - | Starter | 24 | `skills/payment-accounting/SKILL.md` |

## Layer 4: Cash

Day-to-day cash position, counted and reconciled.

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Petty Cash Management | - | Starter | 24 | `skills/petty-cash-management/SKILL.md` |
| Day Book | - | Starter | 31 | `skills/day-book/SKILL.md` |

## Layer 5: Expense & Payroll

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Expense Accounting | - | Starter | 22 | `skills/expense-accounting/SKILL.md` |
| Salary & Wage Accounting | - | Growth | 27 | `skills/salary-wage-accounting/SKILL.md` |

## Layer 6: Statutory

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| TDS Booking & Payment | - | Starter | 25 | `skills/tds-booking-payment/SKILL.md` |

## Layer 7: Reconcile

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Party / Ledger Reconciliation | - | Growth | 27 | `skills/party-ledger-reconciliation/SKILL.md` |
| Inventory / Stock Reconciliation | - | Growth | 28 | `skills/inventory-stock-reconciliation/SKILL.md` |

## Layer 8: Close & Analyse

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Monthly Closing & Statements | - | Growth | 32 | `skills/monthly-closing-statements/SKILL.md` |
| Debtor & Creditor Credit-Cycle Analysis | - | Growth | 33 | `skills/credit-cycle-analysis/SKILL.md` |

## Layer 9: Audit

| Module | Code | Fits | Fields | Skill |
|---|---|---|---:|---|
| Audit Preparation | - | Growth | 19 | `skills/audit-preparation/SKILL.md` |

## Totals

- Modules: 16
- Fields: 446
- Starter: 7
- Growth: 9

## Traceability to the accounting SOP

| SOP section | Module |
|---|---|
| 1. Accounting Software Selection | Accounting Software Selection |
| 2. Source Document & Filing System | Source Document & Filing |
| 3. Purchase Accounting | Purchase Accounting |
| 4. Sales Accounting | Sales Accounting |
| 5. Receipt Accounting | Receipt Accounting |
| 6. Payment Accounting | Payment Accounting |
| 7. Petty Cash Management | Petty Cash Management |
| 8. Day Book | Day Book |
| 9. Party / Ledger Reconciliation | Party / Ledger Reconciliation |
| 10. Expense Accounting | Expense Accounting |
| 11. Salary & Wage Accounting | Salary & Wage Accounting |
| 12. TDS Booking, Reconciliation & Payment | TDS Booking & Payment |
| 13. Inventory / Stock Verification & Reconciliation | Inventory / Stock Reconciliation |
| 14. Monthly Closing & Financial Statements | Monthly Closing & Statements |
| 15. Debtor & Creditor Credit-Cycle Analysis | Debtor & Creditor Credit-Cycle Analysis |
| 16. Audit Preparation | Audit Preparation |
| 17. Overall Accounting Flow | this router, `accounting-audit-system-builder` |
