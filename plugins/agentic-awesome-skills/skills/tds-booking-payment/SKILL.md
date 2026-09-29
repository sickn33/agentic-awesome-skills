---
name: tds-booking-payment
description: 'TDS register: payee PAN, payment nature, rate and amount deducted, deposit date and challan reference, return filing and ledger variance. Use for TDS compliance.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, tds]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# TDS Booking & Payment

**What it is:** Tax deducted at source, deposited on time, filed and reconciled to the ledger.

## Overview

Works out the smallest useful **TDS Booking & Payment** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Reconcile at least monthly. A deduction that is recorded at the time of payment and left
unreconciled until the return is due is how a liability drifts away from the challan.

This skill does not determine the rate that applies, does not file returns, and is not tax
advice. Rates and deadlines vary by country and change. The rate and the deadline come from
a qualified tax professional; this only holds the record.

Layer: Layer 6: Statutory. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- tds register
- tds deposit tracker
- withholding tax log
- tds return working

Also use it when the user says "tax deducted at source, deposited on time, filed and reconciled to the ledger", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: payroll calculation, tax filing, or legal advice. This skill produces
empty templates only - it never holds or processes real employee or customer data.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> the user wants artifacts; go to Step 2.
- "our process is ..." or "it is in a sheet" -> the user wants to move an existing process; capture it, then Step 2.
- "is this right" or "review" or "audit" -> the user wants a check, not a build; answer from what they share.
- "how do I ..." -> advice question; answer directly and offer the build only if it helps.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** Which payments are you deducting TDS on today?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Nature of payment** - Which payment types are in scope? / How many vendors are affected? / Any thresholds?
- **Rates** - Where do the rates come from? / Are PANs collected? / Who confirms the rate?
- **Deposits** - How are you depositing? / Which account? / When is the next deadline?
- **Returns** - Who files? / Which periods? / Is it monthly or quarterly?
- **Outcome** - What do you need? / A deduction register, a deposit tracker or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: tds-booking-payment
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Nature of payment": null
  "Rates": null
  "Deposits": null
  "Returns": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One record per deduction and payee, carrying the gross, the rate applied, the tax deducted, the deposit, the return and the reconciliation result for the period.

**Why this one:** TDS is four separate obligations - deduct, deposit, file, reconcile - and they fail in different places. One record per deduction keeps all four on the same row so a missed deposit shows up as a status, not as a surprise at filing time.

**Workflow:** Transaction identified → Rate applied → TDS deducted → Ledger updated → Deposited before the deadline → Return filed → Ledger reconciled at least monthly

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

```csv
TDS Record Number,Tax Period,Nature of Payment,Payee Name,Payee PAN,Transaction Reference,Payment Date,Gross Payment/Base,TDS Rate %,TDS Deducted,Deducted On,TDS Payable Ledger,Deposit Date,Challan/Bank Reference,Amount Deposited,Return Filed Date,Return Reference,Ledger Reconciliation,Variance Amount,Reconciliation Frequency,Prepared By,Reviewed By,Status,Notes,TDS ID
TDS-2026-0194,2026-08,Professional Fees,Pixelworks Studio,29ABCDE1234F1Z5,EXP-2026-0338,2026-08-18,32500.00,10,3250.00,2026-08-18,TDS Payable - Professional Fees,2026-09-15,CHL-2026-0912,48200.00,2026-10-15,TDS-Q2-2026-PF,Variance,325.00,Monthly,Sneha Iyer,Vikram Singh,In progress,Deposit and return agree to the challan; ledger short by 325.00 and under investigation.,
```

```sql
CREATE TABLE tds_booking_payment (
  tds_record_number VARCHAR(255),
  tax_period VARCHAR(255),
  nature_of_payment VARCHAR(100) NOT NULL,
  payee_name VARCHAR(255),
  payee_pan VARCHAR(255),
  transaction_reference VARCHAR(255),  -- relation -> target record
  payment_date DATE NOT NULL,
  gross_payment_base NUMERIC(14,2) NOT NULL,
  tds_rate_pct NUMERIC NOT NULL,
  tds_deducted NUMERIC(14,2) NOT NULL,
  deducted_on DATE,
  tds_payable_ledger VARCHAR(255),
  deposit_date DATE,
  challan_bank_reference VARCHAR(255),
  amount_deposited NUMERIC(14,2) NOT NULL,
  return_filed_date DATE,
  return_reference VARCHAR(255),
  ledger_reconciliation VARCHAR(100) NOT NULL,
  variance_amount NUMERIC(14,2) NOT NULL,
  reconciliation_frequency VARCHAR(100) NOT NULL,
  prepared_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  tds_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tds_booking_payment_status ON tds_booking_payment (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "TDS Booking & Payment",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "TDS Record Number": { "type": "string" },
      "Tax Period": { "type": "string" },
      "Nature of Payment": { "type": "string" },
      "Payee Name": { "type": "string" },
      "Payee PAN": { "type": "string" },
      "Transaction Reference": { "type": "string" },
      "Payment Date": { "type": "string", "format": "date" },
      "Gross Payment/Base": { "type": "number" },
      "TDS Rate %": { "type": "number" },
      "TDS Deducted": { "type": "number" },
      "Deducted On": { "type": "string", "format": "date" },
      "TDS Payable Ledger": { "type": "string" },
      "Deposit Date": { "type": "string", "format": "date" },
      "Challan/Bank Reference": { "type": "string" },
      "Amount Deposited": { "type": "number" },
      "Return Filed Date": { "type": "string", "format": "date" },
      "Return Reference": { "type": "string" },
      "Ledger Reconciliation": { "type": "string" },
      "Variance Amount": { "type": "number" },
      "Reconciliation Frequency": { "type": "string" },
      "Prepared By": { "type": "string" },
      "Reviewed By": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "TDS ID": { "type": "integer" }
  },
  "required": [
      "Nature of Payment",
      "Payment Date",
      "Gross Payment/Base",
      "TDS Rate %",
      "TDS Deducted",
      "Amount Deposited",
      "Ledger Reconciliation",
      "Variance Amount",
      "Reconciliation Frequency",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| TDS Record Number | Title | Use as the database title |
| Tax Period | Text | Leave as Text |
| Nature of Payment | Select (add options after import) | Convert to Select, add options: "Professional Fees", "Contractor Payment", "Rent", "Salary", "Commission", "Interest", "Contract Payment", "Other" |
| Payee Name | Text | Leave as Text |
| Payee PAN | Text | Leave as Text |
| Transaction Reference | Relation (link to the target database) | Convert to Relation, link to the target database |
| Payment Date | Date | Convert to Date |
| Gross Payment/Base | Number (format: currency) | Convert to Number, set format to Currency |
| TDS Rate % | Number | Convert to Number |
| TDS Deducted | Number (format: currency) | Convert to Number, set format to Currency |
| Deducted On | Date | Convert to Date |
| TDS Payable Ledger | Text | Leave as Text |
| Deposit Date | Date | Convert to Date |
| Challan/Bank Reference | Text | Leave as Text |
| Amount Deposited | Number (format: currency) | Convert to Number, set format to Currency |
| Return Filed Date | Date | Convert to Date |
| Return Reference | Text | Leave as Text |
| Ledger Reconciliation | Select (add options after import) | Convert to Select, add options: "Reconciled", "Variance", "Pending" |
| Variance Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Reconciliation Frequency | Select (add options after import) | Convert to Select, add options: "Monthly", "Quarterly" |
| Prepared By | Text | Leave as Text |
| Reviewed By | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| TDS ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | TDS Record Number | `text` | `VARCHAR(255)` | `string` | Text | `TDS-2026-0194` |
| 2 | Tax Period | `text` | `VARCHAR(255)` | `string` | Text | `2026-08` |
| 3 | Nature of Payment | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Professional Fees` |
| 4 | Payee Name | `text` | `VARCHAR(255)` | `string` | Text | `Pixelworks Studio` |
| 5 | Payee PAN | `text` | `VARCHAR(255)` | `string` | Text | `29ABCDE1234F1Z5` |
| 6 | Transaction Reference | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `EXP-2026-0338` |
| 7 | Payment Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-18` |
| 8 | Gross Payment/Base | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `32500.00` |
| 9 | TDS Rate % | `number` | `NUMERIC` | `number` | Number | `10` |
| 10 | TDS Deducted | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `3250.00` |
| 11 | Deducted On | `date` | `DATE` | `string, format: date` | Date | `2026-08-18` |
| 12 | TDS Payable Ledger | `text` | `VARCHAR(255)` | `string` | Text | `TDS Payable - Professional Fees` |
| 13 | Deposit Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-15` |
| 14 | Challan/Bank Reference | `text` | `VARCHAR(255)` | `string` | Text | `CHL-2026-0912` |
| 15 | Amount Deposited | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `48200.00` |
| 16 | Return Filed Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-15` |
| 17 | Return Reference | `text` | `VARCHAR(255)` | `string` | Text | `TDS-Q2-2026-PF` |
| 18 | Ledger Reconciliation | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Variance` |
| 19 | Variance Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `325.00` |
| 20 | Reconciliation Frequency | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Monthly` |
| 21 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 22 | Reviewed By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 23 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 24 | Notes | `long_text` | `TEXT` | `string` | Text | `Deposit and return agree to the challan; ledger short by 325.00 and under investigation.` |
| 25 | TDS ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Nature of Payment**

```
Professional Fees | Contractor Payment | Rent | Salary | Commission | Interest | Contract Payment | Other
```
**Ledger Reconciliation**

```
Reconciled | Variance | Pending
```
**Reconciliation Frequency**

```
Monthly | Quarterly
```
**Status**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: `Transaction Reference`

## Examples

**Prompt**

```
We deduct TDS on a few vendor payments and only find out at filing that the deposit is short.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which payments are in scope?
> **A:** Professional fees and rent, mostly.
>
> **Q:** Where do the rates come from?
> **A:** Our accountant sends them each year.
>
> **Q:** Who files the return?
> **A:** The same accountant, quarterly.

**Recommended next step** - offered, not built:

> One record per deduction and payee, carrying the gross, the rate applied, the tax deducted, the deposit, the return and the reconciliation result for the period.
>
> Workflow: Transaction identified → Rate applied → TDS deducted → Ledger updated → Deposited before the deadline → Return filed → Ledger reconciled at least monthly
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- Record the rate that was actually applied, not the rate you expected. They are not always
  the same.
- Link `Transaction Reference` to the expense or payment that carried the deduction. An
  unlinked deduction is the first thing a reviewer asks about.
- Reconcile at least monthly, even when the return is quarterly. The monthly check is what
  makes the quarterly filing boring.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not compute TDS, deposit anything or file anything.
- It does not determine the applicable rate, does not file returns, and it is not tax advice.
  Rates and deadlines vary by country and change.
- It does not know the payment thresholds, the higher-rate conditions or the PAN exceptions.
  Those come from a qualified tax professional.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real names, payee PANs, bank details or challan data. Placeholders only.
- Payee PAN data is sensitive. Collect only what the return needs, and mask it elsewhere.
- Label example rows as synthetic, and keep account numbers masked.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If the user pastes real payee or employee data, generate the template and tell them to
  delete the pasted data from the conversation.
- A missed deposit or a wrong rate needs a qualified tax professional before anything is
  filed or paid.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** the deduction was recorded but the deposit challan never attached.
  **Solution:** leave `Deposit Date` empty rather than guessing it, and set `Status` to
  `Blocked` until the challan exists.
- **Problem:** `Amount Deposited` is copied from the challan for one payee onto several rows.
  **Solution:** deposited amounts are period totals. Keep them on the summary row, not
  repeated on every deduction.
- **Problem:** the ledger reconciliation is marked `Reconciled` with a variance amount.
  **Solution:** a non-zero variance is `Variance`, not `Reconciled`, until it is explained.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other accounting modules.
- @expense-accounting - the expense and payment rows that carry the deduction.
- @salary-wage-accounting - the source of salary TDS for the period.
- @payment-accounting - the net payment actually released after the deduction.
- @monthly-closing-statements - closes the payable account the deposit clears.

## Reusable Prompt

```
I want to set up tax deducted at source, deposited on time, filed and reconciled to the ledger for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
