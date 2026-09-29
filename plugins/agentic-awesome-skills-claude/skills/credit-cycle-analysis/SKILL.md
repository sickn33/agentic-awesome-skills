---
name: credit-cycle-analysis
description: 'Debtor and creditor credit-cycle analysis: weighted collection or payment days, ageing buckets, credit limit utilisation and gap against benchmark. Use for working-capital review.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, working-capital, receivables, payables, aging]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Debtor & Creditor Credit-Cycle Analysis

**What it is:** How long the business actually waits to be paid and how long it actually takes to pay, measured per party and per period.

## Overview

Works out the smallest useful **Debtor & Creditor Credit-Cycle Analysis** setup for the business in
front of it, then builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on request, from
one field list so they cannot drift apart.

Layer: Layer 8: Close & Analyse. Fits: Growth stage. Table code: n/a.

**The SOP rule this skill is built around:** analyse debtors on the average collection period,
outstanding invoices, overdue receivables and the aging of receivables; analyse creditors on the
average payment period, outstanding supplier balances, overdue payables and supplier aging; then
compare the debtor collection cycle with the creditor payment cycle. The comparison is the point.
Two cycles measured the same way can be read against each other, and the day-to-day pressure of
waiting longer than you take is invisible as a line on the balance sheet. That pressure is
measured in **days** here. Turning it into money is a separate calculation with its own basis,
below.

**Six concepts that never stand in for each other.** This table exists to keep them apart, and
most of the wrong answers come from swapping one for another:

| Concept | What it answers | Field that carries it |
|---|---|---|
| Contractual terms | What was agreed | `Contractual Terms Days` |
| Actual cycle | What actually happened | `Actual Collection/Payment Days`, `Weighted Days` |
| Benchmark | What to compare against | `Benchmark Days`, `Gap vs Benchmark` |
| Aging | How old the unpaid items are | bucket amounts, and `Aging Bucket` on the invoice/bill detail |
| Debtor-vs-creditor timing | Which side of the cycle is longer | `Cycle Gap Days` on the comparison record |
| Working-capital funding | What the timing difference costs in money | `Estimated Working-Capital Funding`, `Calculation Basis` |

Conflating them is the defect this module is built to prevent. Contractual terms of 30 days and
an actual collection cycle of 42 days are two facts about the same party, and the 42 is the one
that reaches the bank account. Writing the 30 into `Actual Collection/Payment Days` because it is
the number in the contract is a substituted value, not a measurement.

**Aging lives on the invoice, not on the party.** One party can hold open invoices in several
aging buckets on the same day. So the party-period record carries the bucket **amounts**
(`Current Amount`, `Aging 0-30 Amount`, `Aging 31-60 Amount`, `Aging 61-90 Amount`, `Aging 91-180 Amount`, `Aging Over 180 Amount`)
and the single `Aging Bucket` belongs to one invoice or one bill on the aging-detail record. A
party row carrying one `Aging Bucket` cannot describe a real aging position and is replaced by
the bucket amounts.

**Neutral field names.** The two movement fields are `Credit Movement` and `Settlement`, for
customers and for suppliers alike. `Credit Movement` is the credit-side activity that created the
balance in the period - customer invoices on the debtor side, supplier bills on the creditor
side. `Settlement` is what closed it - customer collections, supplier payments. A name like
`Total Billed` describes only the debtor side and quietly makes the creditor side unreadable.

**The balance identity, and what happens when it fails.**

```
Closing Balance = Opening Balance + Credit Movement - Settlement +/- Adjustments
```

Check it on every row. If it does not hold, the difference is **recorded and marked**, never
repaired by editing a component. A silently balanced row is worse than an unbalanced one,
because the next period inherits it.

**The cycle gap is descriptive, not a verdict.**

```
Cycle Gap Days = Debtor Collection Days - Creditor Payment Days
```

Positive means customers take longer to pay than the business takes to pay suppliers. Zero means
the two measured cycles are equal. Negative means suppliers are paid later than customers are
collected. A positive gap is not automatically bad - it is often the ordinary consequence of
selling on credit to a customer base and buying on shorter terms. The module states the
difference and leaves the judgement to the business.

**Working-capital funding needs a monetary basis, and the basis is always written down.**

```
Estimated Working-Capital Funding = Cycle Gap Days x Relevant Daily Credit Movement
```

This is only computed when the relevant monetary basis exists, and `Calculation Basis` always
records how that basis was built. A plausible daily figure is:

```
Relevant Daily Credit Movement = Relevant annual credit movement / 365
```

and it is only used when the selected annual movement is appropriate for the analysis. Where the
monetary basis is missing, `Estimated Working-Capital Funding` is `Unknown` and the record says so.
Never invent a monetary impact, and never divide a period's movement by 365 without checking that
the period is the year the analysis is about.

**Benchmarks are the user's, not the module's.** `Gap vs Benchmark` is `Actual Collection/Payment
Days - Benchmark Days`. A benchmark must be supplied by the user, explicitly selected by the
user, or clearly labelled a proposed default. It is never presented as a business target, and
never as an industry figure unless the user supplied that figure.

**Due dates are recorded, never derived.** `Days Overdue = Period End - Due Date`. Where a due date
is not recorded, the aging is `Unknown` - a due date is never reconstructed from payment terms,
because terms are an agreement and the due date is a fact about one invoice.

**Percentages, money and rounding.** A percentage is stored as `97` for 97%, never `0.97`, and the
convention is never mixed inside the table. Money is a bare number with no currency symbol in the
cell, and the currency itself is `Unknown` until the user states it. Amounts are the gross ledger
amounts as posted to the party's account, tax-inclusive; this module does not split tax out of a
balance. Every figure is rounded once, at the end, to two decimal places, so the components can be
re-derived from the row.

## When to Use This Skill

- debtor collection analysis
- creditor payment analysis
- receivables aging and payables aging
- average collection period or average payment period
- customer payment behaviour and supplier payment behaviour
- working-capital cycle review
- converting an existing credit-cycle spreadsheet or process

Also use it when the user says "how long the business actually waits to be paid and how long it
actually takes to pay, measured per party", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: collections chasing, credit-control action plans, payment execution, banking
operations, employee analysis, disciplinary decisions, or legal advice. This skill designs
templates and analysis structures. It does not execute financial transactions, and it produces
empty templates only - it never holds or processes real customer or supplier data.

## How It Works

Follow the shared execution contract and the detailed domain workflow in [the bundled how-it-works reference](references/how-it-works.md). Keep unknown values explicit and derive every output from confirmed fields.

## Field Reference

The canonical fields and export mappings are maintained in [the bundled field-reference document](references/field-reference.md).

## Select Options

See the [bundled select-options reference](references/select-options.md).

## Relations

No relation fields. This table is standalone: `Party Name` is free text because no party master
table is created by this build, and inventing a link to a database that does not exist would give
a column that never resolves. Where the business later wants a live party link, add it once the
party database actually exists.

## Examples

Worked examples are maintained in [the bundled examples reference](references/examples.md); keep identifiers fictional and preserve the evidence boundaries.

## Best Practices

See the [bundled best-practices reference](references/best-practices.md).

## Limitations

- Empty templates only. It does not calculate collection periods, chase anyone, set a credit limit
  or recommend a change of terms. The days and the money on each row are the ones the business
  entered.
- It measures the gap; it does not close it and it does not judge it. Whether a positive gap is
  worth fixing is a commercial decision, not a record.
- A cycle measured from a ledger is only as good as the ledger. Reconcile the party balances
  first, or the days will be precise and wrong.
- Overdue amounts depend on due dates being recorded against every invoice. Where they are not,
  the aging bucket is `Unknown` and the row is not aged - a guessed due date is worse than none.
- `Estimated Working-Capital Funding` is an estimate on a stated basis, not a cash-flow forecast.
  It excludes retention, factoring, bill discounting, foreign currency settlement timing and any
  seasonality the annualised basis does not carry.
- Averages hide concentration. A party-period row is not evidence about how the total is
  distributed across parties; read the detail dataset for that.
- `Data Quality Status` is a judgement the module cannot make for you. It records the checks that
  were run and what they returned.
- Notion relations need both databases imported before a link column resolves; this module has no
  relation columns to worry about.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

See the [bundled security-notes reference](references/security-notes.md).

## Common Pitfalls

See the [bundled common-pitfalls reference](references/common-pitfalls.md) for review guidance.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other 15 modules.
- @party-ledger-reconciliation - agree the balances before measuring the cycle.
- @sales-accounting - where the credit movement on the debtor side is recorded.
- @purchase-accounting - where the credit movement on the creditor side is recorded.
- @receipt-accounting - the collections that shorten the debtor cycle.
- @payment-accounting - the payments that set the creditor cycle.
- @day-book - the cash movement behind both cycles.
- @monthly-closing-statements - the receivables and payables review this measures.
- @source-document-filing - where the invoice or bill behind an aging line is filed.
- @tds-booking-payment - deductions taken on collection, which change the settled amount.
- @petty-cash-management - the small working-capital swings this sits alongside.
- @expense-accounting - the expense detail behind a payment cycle.
- @inventory-stock-reconciliation - the same count discipline applied to stock.

## Reusable Prompt

```
I want to set up a system for measuring how long my business waits to be paid by customers and
how long it takes to pay suppliers, measured per party and per period.

Ask me one short question per message, and only about what I have not already told you. Do not
assume that contractual payment terms are the same as actual payment behaviour, and never batch
two questions into one message.

First understand: whether customers and suppliers are both included and how many parties; the
contractual payment terms and the actual cycle measured separately for customers and for
suppliers; the measurement basis (invoice or bill date to settlement date, to first settlement
date, due date to settlement date, or a weighted settlement date); whether due dates are recorded
and whether aging is possible at invoice or bill level; which aging buckets are already in use;
whether part-payments occur; the current process and how it is reconciled; and whether I need
cycle measurement, aging, the debtor-versus-creditor comparison, working-capital analysis, or all
of them.

Then recommend the smallest setup that fits, explain briefly why the layers are needed, and wait
for me to ask before you build anything.

Use three logical datasets, and do not force them into one table:
  party-period credit-cycle summary
  invoice/bill aging detail
  per-period debtor-versus-creditor working-capital comparison

Keep these six concepts separate, and never substitute one for another:
  contractual terms
  actual cycle
  benchmark
  aging
  debtor-creditor cycle gap
  working-capital funding

The party-period summary uses: Analysis Number, Period Start, Period End, Party Type, Party Name,
Opening Balance, Credit Movement, Settlement, Adjustments, Closing Balance, Average Balance,
Measurement Basis, Contractual Terms Days, Actual Collection/Payment Days, Weighted Days, Overdue
Amount, Current Amount, Aging 0-30 Amount, Aging 31-60 Amount, Aging 61-90 Amount, Aging 91-180 Amount, Aging Over 180 Amount,
Customer Credit Limit, Customer Credit Utilisation %, Benchmark Days, Gap vs Benchmark, Cycle
Trend, Reconciliation Status, Data Quality Status, Reviewed By, Status, Notes, Cycle Analysis ID.
Customer Credit Limit and Customer Credit Utilisation % are customer-only and are never applied
to a supplier.

The invoice/bill aging detail uses: Aging Detail ID, Party Type, Party Name, Invoice/Bill Number,
Invoice/Bill Date, Due Date, Original Amount, Settled Amount, Outstanding Amount, Settlement Date,
Days Overdue, Aging Bucket, Period End, Notes. A party can hold several aging buckets at the same
time, so a single Aging Bucket never sits on a party-period row.

The working-capital comparison uses: Comparison ID, Period Start, Period End, Debtor Collection
Days, Creditor Payment Days, Cycle Gap Days, Relevant Daily Credit Movement, Estimated
Working-Capital Funding, Calculation Basis, Data Quality Status, Cycle Trend, Reviewed By, Status,
Notes.

Use these calculations:
  Closing Balance = Opening Balance + Credit Movement - Settlement +/- Adjustments
  Cycle Gap Days = Debtor Collection Days - Creditor Payment Days
  Gap vs Benchmark = Actual Collection/Payment Days - Benchmark Days
  Days Overdue = Period End - Due Date
  Customer Credit Utilisation % = Outstanding Customer Balance / Customer Credit Limit x 100
  Estimated Working-Capital Funding = Cycle Gap Days x Relevant Daily Credit Movement
  Weighted Settlement Date = SUM (Settled Amount x Settlement Date) / SUM (Settled Amount)

Calculate actual collection and payment days from documented invoice/bill and settlement dates.
Support partial payments with the weighted settlement calculation and record that it was used. Do
not use contractual terms as actual cycle days. Interpret the cycle gap descriptively - a
positive gap is not automatically bad. Do not guess a due date from payment terms. Compute
working-capital funding only when a monetary basis exists, and always record Calculation Basis
alongside it.

A benchmark must be supplied by me, explicitly selected by me, or clearly labelled a proposed
default - never presented as a business target.

Before a record is complete, validate the balance reconciliation and the data quality, and record
Reconciliation Status and Data Quality Status. Never silently correct an inconsistent balance.
Never invent a missing value, benchmark, currency, date, payment behaviour, credit limit or
financial impact. Unknown is a correct answer and is never turned into zero.

When I explicitly ask for artifacts, build one canonical field dictionary first and derive every
requested artifact from it. If I ask for all four, produce CSV, SQL DDL, JSON Schema and the
Notion property mapping, with identical field names, types, order and required status across all
four. Use obviously fake example data only.

If I ask for a review, review the existing design instead of rebuilding it. If I ask for a fix,
preserve the valid information I supplied and correct only the structural, calculation,
data-quality and consistency problems.
```
