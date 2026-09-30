---
name: payments-received
description: 'Payments received log: reference, client and invoice, amount and currency, payment date and method, withholding tax, bank account, received-by and receipt-sent status. Use for incoming payments.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, operate]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Payments Received

**What it is:** Money received against invoices.

## Overview

Works out the smallest useful **Payments Received** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 8: Operate. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- payments received log
- payment tracker
- money received register
- receipts log

Also use it when the user says "money received against invoices", or describes the same process happening in a
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

> **Q:** How do you receive payments today?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Receipts** - How many per month? / Bank transfer mostly? / Anything else?
- **Matching** - How matched to invoices? / Bank feed or manual? / Who does it?
- **Reconciliation** - How often reconciled? / Accounts receivable or not? / Disputes handled how?
- **Current process** - What is in place? / Accounting package? / Is it reconciled monthly?
- **Outcome** - What do you need? / A receipts log, a reconciliation view or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: payments-received
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Receipts": null
  "Matching": null
  "Reconciliation": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Keep a receipts log matched to an invoice, and treat the bank statement as the source rather than re-keying both sides.

**Why this one:** Reconciliation is the control that matters. If every payment is matched to an invoice number, the rest is reporting.

**Workflow:** Payment received → Matched to invoice → Recorded → Reconciled → Disputed if unmatched

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

For an Excel-compatible CSV, use UTF-8 with a byte order mark so Excel opens the
text correctly. A CSV is not an `.xlsx` workbook; create `.xlsx` only when the user
requests a workbook.
A CSV carries no types, so after it, name the columns
that need a number, date or currency format applied.

```csv
Payment Reference,Client,Invoice,Amount,Currency,Payment Date,Payment Method,Withholding Tax Deducted,Bank Account,Received By,Receipt Sent,Notes,Payment ID
PAY-2210,Northwind Traders,INV-1041,45000.00,INR,2026-01-15,Bank Transfer,2700.00,HDFC ****4412,Sneha Iyer,FALSE,"February receipts posted late because the client paid in the wrong month.",
```

```sql
CREATE TABLE payments_received (
  payment_reference VARCHAR(255),
  client VARCHAR(255),
  invoice VARCHAR(255),  -- relation -> target record
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  withholding_tax_deducted NUMERIC(14,2) NOT NULL,
  bank_account VARCHAR(255),
  received_by VARCHAR(255),
  receipt_sent BOOLEAN NOT NULL,
  notes TEXT,
  payment_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Payments Received",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Payment Reference": { "type": "string" },
      "Client": { "type": "string" },
      "Invoice": { "type": "string" },
      "Amount": { "type": "number" },
      "Currency": { "type": "string" },
      "Payment Date": { "type": "string", "format": "date" },
      "Payment Method": { "type": "string" },
      "Withholding Tax Deducted": { "type": "number" },
      "Bank Account": { "type": "string" },
      "Received By": { "type": "string" },
      "Receipt Sent": { "type": "boolean" },
      "Notes": { "type": "string" },
      "Payment ID": { "type": "integer" }
  },
  "required": [
      "Amount",
      "Payment Date",
      "Payment Method",
      "Withholding Tax Deducted"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Payment Reference | Title | Use as the database title |
| Client | Text | Leave as Text |
| Invoice | Relation (link to the target database) | Convert to Relation, link to the target database |
| Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Payment Date | Date | Convert to Date |
| Payment Method | Select (add options after import) | Convert to Select, add options: "Bank Transfer", "UPI", "Card", "Cash", "Cheque", "NEFT/RTGS" |
| Withholding Tax Deducted | Number (format: currency) | Convert to Number, set format to Currency |
| Bank Account | Text | Leave as Text |
| Received By | Text | Leave as Text |
| Receipt Sent | Checkbox | Convert to Checkbox |
| Notes | Text | Leave as Text |
| Payment ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Payment Reference | `text` | `VARCHAR(255)` | `string` | Text | `PAY-2210` |
| 2 | Client | `text` | `VARCHAR(255)` | `string` | Text | `Northwind Traders` |
| 3 | Invoice | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `INV-1041` |
| 4 | Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `45000.00` |
| 5 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 6 | Payment Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 7 | Payment Method | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Bank Transfer` |
| 8 | Withholding Tax Deducted | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2700.00` |
| 9 | Bank Account | `text` | `VARCHAR(255)` | `string` | Text | `HDFC ****4412` |
| 10 | Received By | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 11 | Receipt Sent | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 12 | Notes | `long_text` | `TEXT` | `string` | Text | `February receipts posted late because the client paid in the wrong month.` |
| 13 | Payment ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Payment Method**

```
Bank Transfer | UPI | Card | Cash | Cheque | NEFT/RTGS
```

## Relations

Link fields: `Invoice`

## Examples

**Prompt**

```
Nobody knows which invoices are still unpaid.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Receipts per month?
> **A:** Around fifteen.
>
> **Q:** How matched?
> **A:** Manually, by eye.
>
> **Q:** Reconciled monthly?
> **A:** Not really.

**Recommended next step** - offered, not built:

> Keep a receipts log matched to an invoice, and treat the bank statement as the source rather than re-keying both sides.
>
> Workflow: Payment received → Matched to invoice → Recorded → Reconciled → Disputed if unmatched
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not compute payroll, tax, leave balances or KPIs.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Does not move money or connect to a bank feed.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real names, salaries, medical or banking data. Placeholders only.
- Label example rows as synthetic, and keep bank details masked.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If sensitive data is supplied, avoid repeating unnecessary identifiers. Use only what
  the requested review needs; keep generated templates empty. Do not claim deletion
  from the conversation or service storage.
- Privacy, legal and disciplinary cases need a qualified human reviewer before anything
  is acted on.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** built a full system when one table was asked for.
  **Solution:** build what was requested; mention the parent skill separately.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/people-directory/SKILL.md) - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up money received against invoices for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

