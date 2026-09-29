---
name: accounting-audit-system-builder
description: 'Routes an accounting or audit request to the right module skill, from software selection through monthly closing, asking only what is missing. Use for books of accounts or audit files.'
category: business
risk: safe
source: self
source_type: self
date_added: '2026-09-26'
author: WHOISABHISHEKADHIKARI
tags:
- sme
- accounting
- audit
- bookkeeping
- finance
- database
- csv
- sql
- router
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Accounting & Audit System Builder

Router for 16 accounting and audit skills, one per stage of the accounting cycle. It
works out where in the cycle the user actually is, then hands off to that one module
skill. It never builds anything itself.

## Overview

A business does not need 100 databases. It needs the two or three it will keep current
for the stage it is at. This skill identifies the stage, asks only what is still missing
one question at a time, stops as soon as the remaining answers stop changing the route,
then recommends two or three modules and waits for the user to pick.

The cycle it routes along:

```
Software selected
  -> Source document filed
    -> Transaction recorded (purchase | sales)
      -> Cash or bank movement recorded (receipt | payment)
        -> Cash counted and day book closed
          -> Ledgers, stock and statutory balances reconciled
            -> Month closed and statements produced
              -> Credit cycle analysed
                -> Audit file assembled
```

Each module skill runs the same contract: context first, a recommendation, and artifacts
only on request. This skill never emits a schema, a CSV or a Notion template.

## When to Use This Skill

- "Set up our accounting system"
- "We need books of accounts for the business"
- "Help us prepare for the auditor"
- "Our accountant asks for things every month and we assemble them manually"
- "Turn our tally process into a proper system"

Do not use it when the user has already named one specific book or report and just wants
the file - go straight to that module skill.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify the stage, not the tool

Read the request and place it on the cycle before asking anything. The stage is the
route.

- "which software", "new system", "migrate" -> Software Selection
- "where do we file invoices", "track documents" -> Source Document & Filing
- "purchases", "supplier bills" -> Purchase Accounting
- "sales", "invoices we raise", "receivables" -> Sales Accounting
- "money received", "collections" -> Receipt Accounting
- "money paid out", "vendor payments" -> Payment Accounting
- "petty cash", "small cash" -> Petty Cash Management
- "daily cash and bank", "day book" -> Day Book
- "party balances differ", "debtor statement mismatch" -> Party / Ledger Reconciliation
- "expenses", "bills without invoices" -> Expense Accounting
- "salary", "wages", "payroll entries" -> Salary & Wage Accounting
- "TDS", "withholding" -> TDS Booking & Payment
- "stock count", "shortage", "inventory match" -> Inventory / Stock Reconciliation
- "month end", "trial balance", "financial statements" -> Monthly Closing & Statements
- "collection period", "who owes us longest" -> Credit-Cycle Analysis
- "audit file", "auditor checklist", "year-end papers" -> Audit Preparation

"how do I ..." is an advice question. Answer it, and offer the build only if it helps.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** Where in the accounting cycle is the business right now?

If the user requests an artifact, route to the matching module and continue the build.
A routing step does not require separate permission. Never label a failed check `Done`.

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output. Never
invent an answer - if the user does not know, record it as unknown and carry on.

- **Business** - What does the business do? / Trading, service or both? / Approximate
  monthly transaction count?
- **Systems** - Which accounting software today? / Is anything in a spreadsheet? /
  Who does the entries - internal or an accountant?
- **Compliance** - Which taxes are registered? / VAT or GST? / TDS, payroll and
  statutory obligations?
- **Position** - Is anything outstanding or unreconciled? / Any known differences?
- **Outcome** - What do you need? / Ongoing books, a month-end pack or an audit file?

### Step 3 - Recommend the smallest workflow

Match on what the user named, not on what the tier allows. Present two or three modules,
one line of reason each, and ask which to start. A list of 100 is not a recommendation.
Full index: `catalog.md`.

**Starter** - 7 modules, the usual starting set: Sales Accounting, Purchase Accounting,
Receipt Accounting, Payment Accounting, Petty Cash Management, Day Book, Expense
Accounting. Add TDS Booking & Payment once the business is registered and deducting.

**Growth** - Starter plus Accounting Software Selection, Source Document & Filing, Party /
Ledger Reconciliation, Inventory / Stock Reconciliation, Salary & Wage Accounting and
Monthly Closing & Statements.

**Scale** - select additional modules from this 16-module accounting pack only as needed.

### Step 4 - Hand off

Read `../<slug>/SKILL.md` relative to this skill directory for the module the user picks and let that file run its own
intake from there. For an advisory shortlist, stop for the user’s choice. For an explicit build or chosen
module, continue under that module; do not repeat answered intake questions. Never
merge two modules into one questionnaire.

For Notion, read the selected module and then the Notion helper. Manual artifacts need
no connection; live workspace changes follow the shared execution contract.

### Step 5 - Output

One line per module in the shortlist: the slug and the path to its skill. That line list
is the whole data output. No schemas, no CSV, no field lists.

A one-line reason per module and a closing question are framing, not output.

## The accounting flow this pack encodes

1. **Business transaction** - something happens that has a value.
2. **Source document** - the evidence it happened, indexed and retrievable.
3. **Document verification** - party, number, date, description, rate, amount, tax.
4. **Classification** - inventory, expense, fixed asset or other account.
5. **Tax assessment** - VAT and TDS determined before the entry, not after.
6. **Accounting entry** - recorded in the software, once.
7. **Filing** - the entry is linked back to its supporting document.
8. **Ledger review** - the entry is checked against the original document.
9. **Reconciliation** - cash, bank, parties, stock, TDS.
10. **Monthly closing** - adjustments, depreciation, trial balance.
11. **Financial statements** - produced from the closed period.
12. **Financial analysis** - revenue, margin, working capital.
13. **Year-end adjustments** - closing entries.
14. **Audit file preparation** - the evidence, indexed.
15. **Audit** - by a qualified auditor, not by this pack.

## Rules the modules hold to

These are the traps the SOP calls out, and every module enforces them on its own table.

- A receipt is **not** sales income. It may be collection of a receivable, an advance,
  a loan or capital. `receipt-accounting` carries a `Receipt Type` field for exactly this.
- A payment voucher is not a universal substitute for a receipt note. Where no formal
  voucher exists, capture the recipient's acknowledgement instead.
- A day book's debit/credit presentation depends on the software's format. Do not
  hardcode "all receipts are debit, all payments are credit".
- The absence of an invoice does **not** justify creating a purchase "Kharche/Kharpai"
  document. Documentation must reflect the real nature of the transaction.
- Internal supporting documents - farmer/individual purchases, wage sheets, rent records -
  are acceptable where the tax rules allow. They are not a workaround for a missing bill.
- TDS is reconciled **at least monthly**, not at year end.
- Physical cash counts are periodic by design, not optional.

## Examples

**Prompt**

```
We are a 9 person trading business. Accountant asks for a month-end pack and we
assemble it by hand every month.
```

**Answered in one message, no intake needed** - the stage was named:

```
monthly-closing-statements -> skills/monthly-closing-statements/SKILL.md
```

**Prompt**

```
Set up accounting for our business
```

> **Q:** Where in the accounting cycle is the business right now?

**User**

```
Nothing in place. We sell online and buy from three suppliers. Cash sales mostly.
```

**Recommended**

```
source-document-filing    -> skills/source-document-filing/SKILL.md     nothing is filed, so nothing is traceable
sales-accounting         -> skills/sales-accounting/SKILL.md          online sales are the main entry stream
purchase-accounting      -> skills/purchase-accounting/SKILL.md       three suppliers, so purchases need a book
```

**Which one should we start with?**

**Prompt**

```
Help us get ready for the statutory audit
```

> **Q:** Where in the accounting cycle is the business right now?

**User**

```
Books are fine. The auditor wants last year's working papers and we do not have them.
```

**Recommended**

```
audit-preparation            -> skills/audit-preparation/SKILL.md             the ask is the file itself
monthly-closing-statements   -> skills/monthly-closing-statements/SKILL.md    the statements the file hangs off
```

## Best Practices

- Route on the cycle stage the user described, not on the module you expect them to want.
- One question per message. A batched intake reads as a form and gets guessed at.
- Recommend at most three modules, each with a one-line reason.
- Keep each module intake separate - do not merge two modules into one questionnaire.
- Let the module skill own its schema. Never restate a field list here.
- Say plainly when a step is a qualified auditor's job, a chartered accountant's job, or
  a tax decision the user has to make.

## Limitations

- Routing only. It does not build, compare or merge schemas, and it does not post entries.
- It cannot judge local compliance. VAT, TDS, payroll and audit rules vary by country and
  change. Nothing here is tax or legal advice.
- It does not do the audit. Audit preparation is document assembly; only a qualified
  auditor opines on the financials.
- It cannot pick software for you. It structures the evaluation; the decision and the
  cost sit with the business.
- 100 near-identical skills is a lot of catalog surface. Prefer this router.

## Security & Safety Notes

- Ask for transaction counts, tax registrations and software names only. Never ask for
  bank account numbers, PAN copies, salary figures or customer contact details.
- This skill runs no commands, calls no APIs, and writes no files.
- Documentation examples use fictional rows, never real records. Emitted templates
  stay empty unless the user requests examples; real data is the user to enter.
- Audit files, tax filings and statutory records are sensitive. Modules touching them
  carry an explicit human-review requirement in their own skill file.
- Anything reaching a tax authority or an auditor needs a qualified human sign-off before
  it is submitted.

## Common Pitfalls

- **Problem:** it recommends a module the user never asked about, with no reason given.
  **Solution:** every recommended module carries a one-line reason tied to what the user
  said, and anything ungrounded is offered as a question rather than a finding.
- **Problem:** it treats an unstated answer as fact.
  **Solution:** record it as unknown and keep going; never fill a gap with a guess.
- **Problem:** it treats a receipt as income because money arrived.
  **Solution:** the route goes to `receipt-accounting`, which forces receipt type and
  invoice allocation before anything reaches the sales book.
- **Problem:** a module is generated with real party names or bank details in it.
  **Solution:** placeholders only - `Northwind Traders`, `2026-01-15`, masked accounts.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @expense-management - operational expense claims, upstream of `expense-accounting`.
- @tax-register - the tax filing calendar, upstream of `tds-booking-payment`.
- @notification-reminder-hub - turns due dates across these modules into reminders.

## Reusable Prompt

```
I run a [size] [trading/service] business and need help with [accounting stage].
Ask me up to 4 short questions, one at a time, and only about what I have not said.
Then recommend the 2 or 3 modules that fit, and wait for me to pick before building.
```
