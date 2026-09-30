---
name: expense-accounting
description: 'Expense accounting register: expense number and date, payee with PAN and VAT, bill reference, document type, amount with VAT, ledger account, approver and status. Use for expense bookkeeping.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, expenses]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Expense Accounting

**What it is:** One row per bill or valid supporting document, carrying the nature of the expense, the document behind it, the applicable tax information and the ledger account together.

## Overview

Works out the smallest useful **Expense Accounting** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Three guardrails shape the whole table.

**Tax is recorded, never assumed.** Being VAT-registered does not tell you the rate, whether
the expense is taxable, whether input tax is recoverable, whether the amount is
tax-inclusive, or whether a reverse charge or another treatment applies. TDS is not part of
an expense entry at all unless the business actually deducts it. Every tax field in the
minimum schema is optional until a rate *and* a treatment have been supplied by the user.

**An expense entry is not a payment.** Payment mode, payment date, payment reference, net
payable, TDS and department are payment-stage facts. They do not appear in an expense-only
setup. If the user asks for payment tracking, that is a deliberate scope change and the
fields are added then, not by default.

**The document must be the real document.** Where no formal invoice exists, an internal
supporting document is defensible only where the transaction would not normally produce
one - purchases from farmers and individual suppliers, wage sheets, rent agreements and
rent records. The absence of an invoice does **not** automatically justify raising a
purchase "Kharche/Kharpai". `Document Type`, `Internal Support Justified` and
`Justification` exist to hold that decision, and a reviewer holds it, not this skill. No
label in the `Document Type` list makes any document legally sufficient.

Layer: Layer 5: Expense & Payroll. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- expense register
- petty expense sheet
- expense book with tax
- bill and voucher log
- expenses booked to the right account

Also use it when the user describes the same process happening in a spreadsheet, on paper,
or in someone's inbox.

Do not use it for: payroll calculation, tax filing, tax-return preparation, legal advice,
deciding whether a transaction is legally deductible, deciding which tax rate applies,
deciding whether a supporting document is legally sufficient, or processing real employee,
customer, supplier, PAN, VAT or banking data. This skill produces templates only.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" / "build" / "create" -> a new structure; go to Step 2.
- "our expenses are in a sheet" / "we currently record ..." -> capture the existing
  process first, then Step 2.
- "is this right" / "review this" / "audit this" -> a check, not a build; answer from what
  they share and do not rebuild.
- "how do I ..." -> advice; answer directly and offer a build only if it helps.

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

One message, one question, no batching. Skip anything the user already answered, in any
earlier message. Ask only questions whose answer would change the recommended structure or
the requested artifact. Stop as soon as the remaining unknowns would not change the output.
Record `Unknown` and move on when the user does not know, and never ask the same unknown
twice.

The opening question targets the highest-value missing fact. Do not ask for the largest
expense category as a warm-up because it does not change the table structure.

For a new setup the usual first question is:

> **Q:** What do you want to record: expense entries only, payments too, or both?

Then, only as needed:

- **Existing process** - Are you starting from scratch, or replacing an existing sheet or
  book?
- **Categories** - What expense categories do you actually use? If the user does not
  know, keep `Category` configurable. Do not impose a standard category list as though it
  were confirmed.
- **Documents** - Do you normally receive a bill or invoice for each expense? If not,
  what do you keep when there is no formal bill? Record the actual document type.
- **Tax** - Which tax information do you need on each expense? If VAT/GST: do you need the
  rate and the amount recorded separately? If TDS/withholding is not used, TDS fields are
  absent from the schema rather than optional-but-present.
- **Accounting** - Do you assign each expense to a ledger account? Who decides the account?
- **Approval** - Does someone approve or review each entry? Who performs it? Add only the
  approval fields the process needs - `Approved By` alone may be enough.
- **Payment** - Ask payment questions only if payment tracking is in scope.
- **Outcome** - An expense register, a payment file, or both? Which artifacts do you want?

**Ambiguous answers are not answers.** `yes`, `no`, `maybe`, `same`, `okay` and `fine` do
not resolve a multiple-choice question. Re-ask as an explicit choice rather than guessing.

**Partial answers keep only the answered part.** If a question has two parts and the user
answers one, record that one and leave the other `Unknown`.

Never invent an answer. If the user does not know, record it as `Unknown` and carry on.
Never turn Unknown into 0, and never treat a blank as a confirmed zero. A rate the user
has not supplied stays blank until they supply it.

### Step 3 - Hold the internal context

Keep the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: expense-accounting
intent: null            # set in Step 1: set up | fix | review | report | import
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  # Scope is the first area: expense entries only | payments too | both
  "Scope": null
  "Documents": null
  "Tax": null
  "Accounting": null
  "Approvals": null
  # Tracked with the same discipline, recorded only when the answer changes the build:
  #   "Categories"       - the user's own category list, or configurable
  #   "Existing Process" - from scratch, or replacing an existing sheet or book
  #   "Outcome"          - the artifacts actually requested
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
unknowns: []            # asked and not answered
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One expense row per bill or valid supporting document, carrying the expense nature, document information, applicable tax information, ledger account and approval/review status on the same row.

**Why this one:** An expense is only auditable if the document behind it and the tax treatment on it travel together. Splitting them into two registers is what causes the mismatch at year end.

**Workflow:** Nature identified → Supporting document recorded → Payee verified → Tax treatment recorded → Ledger account assigned → Approved/reviewed → Entry verified

Payment and TDS steps are added only when the confirmed process requires them.

If no artifact was requested, offer the relevant format. Otherwise continue the build.

### Step 5 - Build only on request

Once the user asks, derive the fields from the confirmed context and emit **only the
artifacts that were requested**. No preamble, no summary, no closing line, no unrequested
artifact.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

The shapes below show the documented default for an expense-only setup. Drop any field the
confirmed process does not justify; add a field only when a confirmed requirement does.
The four blocks are one canonical field list rendered four ways - never edit one by hand.

Percentage convention for this module: `18` means 18%, never `0.18`. Money is numeric with
no currency symbol in the cell. Dates are ISO `YYYY-MM-DD`. Round once, at the end, and
say that you have done it.

**Money basis must be stated, not assumed.** `Amount` is the figure the user records. Ask
whether it is tax-inclusive or tax-exclusive; do not pick one. The illustrative row below
uses a tax-inclusive basis: the `1000.00` contains `152.54` of VAT (1000 × 18 / 118, rounded to two decimals), and both VAT
figures are present only because the example user supplied a rate and that basis. With no
supplied rate, `VAT Rate %` and `VAT Amount` stay blank. When the distinction matters,
replace the single `Amount` with `Amount Before Tax`, `VAT Amount` and `Gross Amount` and
state the basis in the field list.

```csv
Expense Number,Expense Date,Category,Payee,Payee PAN,Payee VAT Number,Bill/Invoice Number,Bill Date,Document Type,Internal Support Justified,Justification,Amount,VAT Status,VAT Rate %,VAT Amount,Ledger Account,Approved By,Source Document,Entry Verified,Prepared By,Notes,Expense ID
EXP-EXAMPLE-001,2026-01-15,Professional Fees,Example Supplier,PAN-EXAMPLE-001,VAT-EXAMPLE-001,INV-EXAMPLE-001,2026-01-10,Tax Invoice,Not Applicable,Illustrative row only - a tax invoice is available so no internal support is relied on.,1000.00,Registered,18,152.54,Professional Fees,Example Approver,DOC-EXAMPLE-001,Done,Example Preparer,Illustrative row only - the VAT figures appear only because the example user supplied a rate and a tax-inclusive basis and no payment is recorded in an expense-only setup.,
```

```sql
-- PostgreSQL example DDL; substitute an equivalent identity or
-- auto-increment column on MySQL, SQL Server or SQLite.
CREATE TABLE expense_accounting (
  expense_number VARCHAR(255),
  expense_date DATE NOT NULL,
  category VARCHAR(100),
  payee VARCHAR(255),
  payee_pan VARCHAR(255),
  payee_vat_number VARCHAR(255),
  bill_invoice_number VARCHAR(255),
  bill_date DATE,
  document_type VARCHAR(100) NOT NULL,
  internal_support_justified VARCHAR(100),
  justification TEXT,
  amount NUMERIC(14,2) NOT NULL,
  vat_status VARCHAR(100),
  vat_rate_pct NUMERIC,
  vat_amount NUMERIC(14,2),
  ledger_account VARCHAR(255),
  approved_by VARCHAR(255),
  source_document VARCHAR(255),  -- relation -> source-document-filing record
  entry_verified VARCHAR(100) NOT NULL,
  prepared_by VARCHAR(255),
  notes TEXT,
  expense_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_bill_after_expense CHECK (bill_date IS NULL OR expense_date IS NULL OR bill_date <= expense_date),
  CONSTRAINT chk_expense_amount_non_negative CHECK (amount >= 0)
);
```

`created_at`, `updated_at` and the primary key are technical metadata, not business fields.
No `FOREIGN KEY` is declared because the target table is not part of this artifact set.
The month-end review filters on `expense_date` and the review queue filters on
`entry_verified`; add an index on each column in the target database once the engine and
its index syntax are known.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Expense Accounting",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "Expense Number": { "type": "string" },
    "Expense Date": { "type": "string", "format": "date" },
    "Category": { "type": "string" },
    "Payee": { "type": "string" },
    "Payee PAN": { "type": "string" },
    "Payee VAT Number": { "type": "string" },
    "Bill/Invoice Number": { "type": "string" },
    "Bill Date": { "type": "string", "format": "date" },
    "Document Type": { "type": "string" },
    "Internal Support Justified": { "type": "string" },
    "Justification": { "type": "string" },
    "Amount": { "type": "number" },
    "VAT Status": { "type": "string" },
    "VAT Rate %": { "type": "number" },
    "VAT Amount": { "type": "number" },
    "Ledger Account": { "type": "string" },
    "Approved By": { "type": "string" },
    "Source Document": { "type": "string" },
    "Entry Verified": { "type": "string" },
    "Prepared By": { "type": "string" },
    "Notes": { "type": "string" },
    "Expense ID": { "type": "integer" }
  },
  "required": ["Expense Date", "Document Type", "Amount", "Entry Verified"]
}
```

`required` is justified field by field. `Expense Date` is needed or the row is not an
expense record. `Document Type` is needed or the evidence behind the row is unstated.
`Amount` is needed or there is no expense. `Entry Verified` is the state of the record, so
it must always be explicit. `VAT Rate %` and `VAT Amount` are optional because a user may
not know the rate or the treatment; they become required only after a rate and a treatment
are confirmed - never before. `VAT Status`, `Internal Support Justified`, `Counted`-
equivalent flags and any calculated value stay optional while their source may be missing.

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Expense Number | Title | Use as the database title |
| Expense Date | Date | Convert to Date |
| Category | Select | Convert to Select, add options after import: "Rent", "Utilities", "Travel", "Professional Fees", "Marketing", "Repairs", "Insurance", "Subscriptions", "Bank Charges", "Office Supplies", "Salaries & Wages", "Other" |
| Payee | Text | Leave as Text |
| Payee PAN | Text | Leave as Text |
| Payee VAT Number | Text | Leave as Text |
| Bill/Invoice Number | Text | Leave as Text |
| Bill Date | Date | Convert to Date |
| Document Type | Select | Convert to Select, add options after import: "Tax Invoice", "Bill", "Receipt", "Internal Supporting Document", "Wage Sheet", "Rent Agreement/Record", "Bank Statement", "Other" |
| Internal Support Justified | Select | Convert to Select, add options after import: "Yes", "No", "Not Applicable" |
| Justification | Text | Leave as Text |
| Amount | Number (format: currency) | Convert to Number, set format to Currency |
| VAT Status | Select | Convert to Select, add options after import: "Registered", "Unregistered", "Exempt", "Unknown" |
| VAT Rate % | Number | Convert to Number |
| VAT Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Ledger Account | Text | Leave as Text |
| Approved By | Text | Leave as Text |
| Source Document | Relation | Convert to Relation only after `source-document-filing` is imported as its own database, or keep it as Text until then |
| Entry Verified | Select | Convert to Select, add options after import: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Prepared By | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Expense ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

**Out of scope for an expense-only build.** These appear only if the user asked for payment
or withholding tracking, and the basis must be defined before they are added:

```text
Payment Mode | Payment Date | Payment Reference | Net Payable | TDS Rate % | TDS Amount | Department
```

`Net Payable` is never added on the assumption that it equals `Amount + VAT - TDS`. Define
the basis first, or leave it out. Where TDS/withholding is not used at all, the TDS fields
are absent from the minimum schema - not present and optional - and no TDS workflow is
created.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Expense Number | `text` | `VARCHAR(255)` | `string` | Text | `EXP-EXAMPLE-001` |
| 2 | Expense Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 3 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Professional Fees` |
| 4 | Payee | `text` | `VARCHAR(255)` | `string` | Text | `Example Supplier` |
| 5 | Payee PAN | `text` | `VARCHAR(255)` | `string` | Text | `PAN-EXAMPLE-001` |
| 6 | Payee VAT Number | `text` | `VARCHAR(255)` | `string` | Text | `VAT-EXAMPLE-001` |
| 7 | Bill/Invoice Number | `text` | `VARCHAR(255)` | `string` | Text | `INV-EXAMPLE-001` |
| 8 | Bill Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-10` |
| 9 | Document Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Tax Invoice` |
| 10 | Internal Support Justified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Not Applicable` |
| 11 | Justification | `long_text` | `TEXT` | `string` | Text | `Illustrative row only - a tax invoice is available so no internal support is relied on.` |
| 12 | Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1000.00` |
| 13 | VAT Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Registered` |
| 14 | VAT Rate % | `number` | `NUMERIC` | `number` | Number | `18` |
| 15 | VAT Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `152.54` |
| 16 | Ledger Account | `text` | `VARCHAR(255)` | `string` | Text | `Professional Fees` |
| 17 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | `Example Approver` |
| 18 | Source Document | `relation` | `VARCHAR(255)` | `string` | Relation (only once the target database exists) | `DOC-EXAMPLE-001` |
| 19 | Entry Verified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Done` |
| 20 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Example Preparer` |
| 21 | Notes | `long_text` | `TEXT` | `string` | Text | `Illustrative row only - the VAT figures appear only because the example user supplied a rate and a tax-inclusive basis and no payment is recorded in an expense-only setup.` |
| 22 | Expense ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

Percentage convention for this module: `18` means 18%, never `0.18`. Money is numeric with
no currency symbol in the cell. Dates are ISO `YYYY-MM-DD` in real date fields. Round once,
at the end, and say so.

`Entry Verified` carries the module's status set, so a record must not be `Done` while a
required check is outstanding - an unsupported document, an unset money basis, or an
unconfirmed tax treatment all hold it at `In progress`.

## Select Options

**Category**

```
Rent | Utilities | Travel | Professional Fees | Marketing | Repairs | Insurance | Subscriptions | Bank Charges | Office Supplies | Salaries & Wages | Other
```

**Document Type**

```
Tax Invoice | Bill | Receipt | Internal Supporting Document | Wage Sheet | Rent Agreement/Record | Bank Statement | Other
```

**Internal Support Justified**

```
Yes | No | Not Applicable
```

**VAT Status**

```
Registered | Unregistered | Exempt | Unknown
```

**Entry Verified**

```
Not started | In progress | Blocked | Done | Cancelled
```

Every list above is a starting set, not a confirmed business taxonomy. Do not impose
`Category` on a business that has not confirmed its categories - keep the field configurable
until it does. `Document Type` values are document names, not legal conclusions: a label
here does not make a document legally sufficient, and the tax authority's position is what
settles that. `VAT Status` records what the user said about registration, which is not the
rate and not the treatment. Notion columns say *add options after import* for exactly this
reason. If the user supplied their own values, the user's values win.

## Relations

Link fields: `Source Document` -> `source-document-filing`.

In SQL that is `VARCHAR(255)` with a comment naming the intended target. In Notion it is
declared as `Relation` but resolves only once `source-document-filing` is imported as its
own database; until then keep the imported column as `Text`. No `FOREIGN KEY` is declared,
because the target table is not part of this artifact set.

## Examples

**Prompt**

```
We keep expenses in a notebook and at year end nobody can say which bill is missing.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What do you want to record: expense entries only, payments too, or both?
> **A:** Entries only for now.
>
> **Q:** Do you normally get a bill for every expense?
> **A:** Not for the farm suppliers and not for the rent.
>
> **Q:** What do you keep when there is no formal bill?
> **A:** A payment voucher.
>
> **Q:** Is VAT charged on anything you record here?
> **A:** Yes.
>
> **Q:** Do you know the rate?
> **A:** No.

Recorded: `VAT Rate %` stays `Unknown`. It is not filled with a default, and `VAT Amount`
is not computed from a guessed rate. `Payment Mode`, `Payment Date`, `Payment Reference`,
`Net Payable`, `TDS Rate %`, `TDS Amount` and `Department` are absent, because the user
asked for entries only.

**Recommended next step** - offered, not built:

> One expense row per bill or valid supporting document, carrying the nature of the expense, the document type, the account and the tax information on the same row.
>
> Workflow: Nature identified → Supporting document recorded → Payee verified → Tax treatment recorded → Ledger account assigned → Reviewed → Entry verified
>
> Want the CSV, SQL, JSON Schema and Notion mapping?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep every field name identical, and in the same order, across all four artifacts.
- Use `relation` for anything that points at another record, `text` for free text.
- Money is `currency`, never `text`. Dates are `date`, never free text.
- State the money basis in words before you build. An unstated basis is an assumed basis.
- Record the real document type every time. A payment voucher standing in for a bill is
  only correct where a bill would not exist anyway.
- Set `Internal Support Justified` to `No` and write the reason in `Justification` when you
  cannot explain why internal evidence is acceptable for that expense.
- Keep `Payee PAN` and `Payee VAT Number` as separate fields. Do not merge them into one
  `Payee PAN/VAT` column to save a column - two identifiers in one cell cannot be validated.
- `Approved By` and `Prepared By` are two people doing two jobs. Never fill one from the
  other. If the business also separates verification from approval, add `Verified By` as a
  deliberate field rather than borrowing a name from a neighbouring column.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not compute tax, post entries, or approve anything.
- It does not decide whether a Kharche/Kharpai is acceptable in your case. Internal support
  is only defensible where the transaction does not normally produce a formal invoice, and
  the tax authority's position is what settles it. No document type here is declared legally
  sufficient.
- It does not determine tax liability, deductibility, or which rate applies.
- It does not file returns, pay taxes, or give tax, legal or audit advice.
- It does not create the target database for `Source Document`, so the Notion link does not
  resolve until that database is imported.
- Notion relations need the target database imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Legal, tax and audit review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real names, payee details, PAN or VAT numbers, or banking data.
  Placeholders only: `PAN-EXAMPLE-001`, `VAT-EXAMPLE-001`, `INV-EXAMPLE-001`.
- Never populate a real identifier from memory or pattern. A realistic-looking PAN or
  GSTIN is a real-identifier risk, not a formatting nicety.
- Label example rows as synthetic, and keep any tax identifier masked.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If the user pastes real employee or supplier data, generate the template and tell them to
  delete the pasted data from the conversation.
- Expense approvals and any tax treatment decision need a qualified human reviewer before
  anything is acted on.


See the [Common Pitfalls](references/common-pitfalls.md) reference for the full guidance.

