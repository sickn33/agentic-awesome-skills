---
name: invoices-billing
description: 'Invoice and billing register: invoice number, client, project, issue and due dates, subtotal, discount, tax and withholding, total, payments, balance and aging. Use for billing follow-up.'
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

# Invoices & Billing

**What it is:** Invoices from billable time or fixed fees, with tax, due dates and aging.

## Overview

Works out the smallest useful **Invoices & Billing** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 8: Operate. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- invoice tracker
- billing spreadsheet
- invoice register
- accounts receivable aging

Also use it when the user says "invoices from billable time or fixed fees, with tax, due dates and aging", or describes the same process happening in a
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

> **Q:** How do you bill clients today?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Billing** - How many clients? / Monthly, milestone or hourly? / Invoices raised by whom?
- **Terms** - Payment terms? / Retainer or one-off? / Any late fees?
- **Tracking** - How is status tracked? / Sent, due or overdue? / Who chases?
- **Current process** - What tool today? / Accounting package or sheet? / What gets missed?
- **Outcome** - What do you need? / An invoice record, a template or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: invoices-billing
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Billing": null
  "Terms": null
  "Tracking": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** One invoice record with the client, the amount, the due date and the status, and let the accounting package handle the actual invoice document.

**Why this one:** Billing problems are chasing problems. A due date and a status per invoice is the minimum that makes chasing possible.

**Workflow:** Work recorded → Invoice raised → Status tracked → Chased → Paid or overdue

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
Invoice Number,Client,Project,Issue Date,Payment Terms (Days),Due Date,Currency,Time Entries,Subtotal,Discount,Tax Rate %,Tax Amount,Withholding Tax,Total,Payments,Amount Paid,Balance,Days Overdue,Aging,Payment Status,Status,Sent Date,Prepared By,Approved By,Notes,Invoice ID
INV-1041,Northwind Traders,Website Redesign,2026-08-15,30,2026-09-14,INR,"TIME-2026-011, TIME-2026-012",118000.00,4720.00,18,21240.00,20000.00,134520.00,PAY-2210,120000.00,14520.00,12,0-30 days,Part Paid,Issued,2026-08-15,Ananya Rao,Vikram Singh,"Follow-up sent in February; the client queried the retainer line, not the hours.",
```

```sql
CREATE TABLE invoices_billing (
  invoice_number VARCHAR(255),
  client VARCHAR(255),
  project VARCHAR(255),
  issue_date DATE NOT NULL,
  payment_terms_days NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  currency VARCHAR(255),
  time_entries VARCHAR(255),  -- relation -> target record
  subtotal NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL,
  tax_rate_pct NUMERIC NOT NULL,
  tax_amount NUMERIC(14,2) NOT NULL,
  withholding_tax NUMERIC(14,2) NOT NULL,
  total NUMERIC(14,2) NOT NULL,
  payments VARCHAR(255),  -- relation -> target record
  amount_paid NUMERIC(14,2) NOT NULL,
  balance NUMERIC(14,2) NOT NULL,
  days_overdue NUMERIC NOT NULL,
  aging VARCHAR(255),
  payment_status VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  sent_date DATE NOT NULL,
  prepared_by VARCHAR(255),
  approved_by VARCHAR(255),
  notes TEXT,
  invoice_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_billing_status ON invoices_billing (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Invoices & Billing",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Invoice Number": { "type": "string" },
      "Client": { "type": "string" },
      "Project": { "type": "string" },
      "Issue Date": { "type": "string", "format": "date" },
      "Payment Terms (Days)": { "type": "number" },
      "Due Date": { "type": "string", "format": "date" },
      "Currency": { "type": "string" },
      "Time Entries": { "type": "string" },
      "Subtotal": { "type": "number" },
      "Discount": { "type": "number" },
      "Tax Rate %": { "type": "number" },
      "Tax Amount": { "type": "number" },
      "Withholding Tax": { "type": "number" },
      "Total": { "type": "number" },
      "Payments": { "type": "string" },
      "Amount Paid": { "type": "number" },
      "Balance": { "type": "number" },
      "Days Overdue": { "type": "number" },
      "Aging": { "type": "string" },
      "Payment Status": { "type": "string" },
      "Status": { "type": "string" },
      "Sent Date": { "type": "string", "format": "date" },
      "Prepared By": { "type": "string" },
      "Approved By": { "type": "string" },
      "Notes": { "type": "string" },
      "Invoice ID": { "type": "integer" }
  },
  "required": [
      "Issue Date",
      "Payment Terms (Days)",
      "Due Date",
      "Subtotal",
      "Discount",
      "Tax Rate %",
      "Tax Amount",
      "Withholding Tax",
      "Total",
      "Amount Paid",
      "Balance",
      "Days Overdue",
      "Payment Status",
      "Status",
      "Sent Date"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Invoice Number | Title | Use as the database title |
| Client | Text | Leave as Text |
| Project | Text | Leave as Text |
| Issue Date | Date | Convert to Date |
| Payment Terms (Days) | Number | Convert to Number |
| Due Date | Date | Convert to Date |
| Currency | Text | Leave as Text |
| Time Entries | Relation (link to the target database) | Convert to Relation, link to the target database |
| Subtotal | Number (format: currency) | Convert to Number, set format to Currency |
| Discount | Number (format: currency) | Convert to Number, set format to Currency |
| Tax Rate % | Number | Convert to Number |
| Tax Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Withholding Tax | Number (format: currency) | Convert to Number, set format to Currency |
| Total | Number (format: currency) | Convert to Number, set format to Currency |
| Payments | Relation (link to the target database) | Convert to Relation, link to the target database |
| Amount Paid | Number (format: currency) | Convert to Number, set format to Currency |
| Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Days Overdue | Number | Convert to Number |
| Aging | Text | Leave as Text |
| Payment Status | Select (add options after import) | Convert to Select, add options: "Draft", "Sent", "Part Paid", "Paid", "Overdue", "Cancelled" |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Issued", "Sent", "Part Paid", "Paid", "Void" |
| Sent Date | Date | Convert to Date |
| Prepared By | Text | Leave as Text |
| Approved By | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Invoice ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Invoice Number | `text` | `VARCHAR(255)` | `string` | Text | `INV-1041` |
| 2 | Client | `text` | `VARCHAR(255)` | `string` | Text | `Northwind Traders` |
| 3 | Project | `text` | `VARCHAR(255)` | `string` | Text | `Website Redesign` |
| 4 | Issue Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-15` |
| 5 | Payment Terms (Days) | `number` | `NUMERIC` | `number` | Number | `30` |
| 6 | Due Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-14` |
| 7 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 8 | Time Entries | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `TIME-2026-011, TIME-2026-012` |
| 9 | Subtotal | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `118000.00` |
| 10 | Discount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `4720.00` |
| 11 | Tax Rate % | `number` | `NUMERIC` | `number` | Number | `18` |
| 12 | Tax Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `21240.00` |
| 13 | Withholding Tax | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `20000.00` |
| 14 | Total | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `134520.00` |
| 15 | Payments | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `PAY-2210` |
| 16 | Amount Paid | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `120000.00` |
| 17 | Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `14520.00` |
| 18 | Days Overdue | `number` | `NUMERIC` | `number` | Number | `12` |
| 19 | Aging | `text` | `VARCHAR(255)` | `string` | Text | `0-30 days` |
| 20 | Payment Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Part Paid` |
| 21 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Issued` |
| 22 | Sent Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-15` |
| 23 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 24 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 25 | Notes | `long_text` | `TEXT` | `string` | Text | `Follow-up sent in February; the client queried the retainer line, not the hours.` |
| 26 | Invoice ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Payment Status**

```
Draft | Sent | Part Paid | Paid | Overdue | Cancelled
```
**Status**

```
Draft | Issued | Sent | Part Paid | Paid | Void
```

## Relations

Link fields: `Time Entries`, `Payments`

## Examples

**Prompt**

```
We invoice from three places and cannot tell what is overdue.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many clients?
> **A:** Fifteen.
>
> **Q:** Billing type?
> **A:** Monthly retainer, mostly.
>
> **Q:** Payment terms?
> **A:** Net 30.

**Recommended next step** - offered, not built:

> One invoice record with the client, the amount, the due date and the status, and let the accounting package handle the actual invoice document.
>
> Workflow: Work recorded → Invoice raised → Status tracked → Chased → Paid or overdue
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
- Does not raise, send or collect any money.
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
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up invoices from billable time or fixed fees, with tax, due dates and aging for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

