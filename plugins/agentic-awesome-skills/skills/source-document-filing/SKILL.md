---
name: source-document-filing
description: 'Source document register: document type and number, party, amount, index key, storage location, retention period and verification. Use for document filing.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, filing]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Source Document & Filing

**What it is:** Indexed register of every supporting document, linked to the entry it supports.

## Overview

Works out the smallest useful **Source Document & Filing** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 2: Document. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- source document filing
- document index register
- bill and voucher filing tracker
- supporting document audit trail

Also use it when the user says "indexed register of every supporting document, linked to the entry it supports", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: day-to-day bookkeeping, tax filing, or legal advice. This skill produces
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

> **Q:** Which document types do you currently file?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Documents** - Which types? / Purchase, sales, payroll? / How many a month?
- **Filing** - Physical, digital or both? / How are files named and sorted?
- **Indexing** - Any index or reference in use? / By period, by party or both?
- **Retention** - How long to keep? / Any legal retention rules? / Who disposes?
- **Outcome** - What do you need? / A register, a reindex plan or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: source-document-filing
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Documents": null
  "Filing": null
  "Indexing": null
  "Retention": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One register row per document, with a reference key built as `period/party` (for example `2026/08/BLUEPEAK`) so retrieval is by month and by party, and relation links to the voucher and the transaction it supports.

**Why this one:** Audits and assessments fail on missing support, not on missing entries. A document register with a fixed index key and a link back to the entry is what makes an entry traceable in seconds.

**Workflow:** Document received → Referenced and indexed → Filed → Linked to entry → Verified

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
Document Reference,Document Type,Document Number,Document Date,Party Name,Party PAN/VAT,Amount,Currency,Tax Amount,TDS Amount,Source Department,Index Key,Storage Location,Retention Period,Linked Voucher,Linked Transaction,Document Availability,Verification Status,Verified By,Verified Date,Notes,Document Filing ID
DOC-2026-0442,Purchase Invoice,INV-8841,2026-08-14,Bluepeak Supplies,29ABCDE1234F1Z5,84500.00,INR,15210.00,2112.50,Purchase,2026/08/BLUEPEAK,Rack B / Folder 7,8 years,VCH-2026-0912,PUR-2026-0041,Original on file,In progress,Sneha Iyer,2026-08-15,Challan and PO filed together with the invoice.,
```

```sql
CREATE TABLE source_document_filing (
  document_reference VARCHAR(255),
  document_type VARCHAR(100) NOT NULL,
  document_number VARCHAR(255),
  document_date DATE NOT NULL,
  party_name VARCHAR(255),
  party_pan_vat VARCHAR(255),
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  tax_amount NUMERIC(14,2),
  tds_amount NUMERIC(14,2),
  source_department VARCHAR(100) NOT NULL,
  index_key VARCHAR(255),
  storage_location VARCHAR(255),
  retention_period VARCHAR(255),
  linked_voucher VARCHAR(255),  -- relation -> target record
  linked_transaction VARCHAR(255),  -- relation -> target record
  document_availability VARCHAR(100) NOT NULL,
  verification_status VARCHAR(100) NOT NULL,
  verified_by VARCHAR(255),
  verified_date DATE,
  notes TEXT,
  document_filing_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Source Document & Filing",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Document Reference": { "type": "string" },
      "Document Type": { "type": "string" },
      "Document Number": { "type": "string" },
      "Document Date": { "type": "string", "format": "date" },
      "Party Name": { "type": "string" },
      "Party PAN/VAT": { "type": "string" },
      "Amount": { "type": "number" },
      "Currency": { "type": "string" },
      "Tax Amount": { "type": "number" },
      "TDS Amount": { "type": "number" },
      "Source Department": { "type": "string" },
      "Index Key": { "type": "string" },
      "Storage Location": { "type": "string" },
      "Retention Period": { "type": "string" },
      "Linked Voucher": { "type": "string" },
      "Linked Transaction": { "type": "string" },
      "Document Availability": { "type": "string" },
      "Verification Status": { "type": "string" },
      "Verified By": { "type": "string" },
      "Verified Date": { "type": "string", "format": "date" },
      "Notes": { "type": "string" },
      "Document Filing ID": { "type": "integer" }
  },
  "required": [
      "Document Type",
      "Document Date",
      "Amount",
      "Source Department",
      "Document Availability",
      "Verification Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Document Reference | Title | Use as the database title |
| Document Type | Select (add options after import) | Convert to Select, add options: "Purchase Invoice", "Sales Invoice", "Purchase Order", "Sales Order", "Delivery Challan", "Receipt", "Payment Voucher", "Bank Statement", "Cheque Record", "Expense Bill", "Contract/Agreement", "Salary Sheet", "Wage Sheet", "Tax Document", "TDS Document", "Import Document", "Fixed Asset Invoice", "Other" |
| Document Number | Text | Leave as Text |
| Document Date | Date | Convert to Date |
| Party Name | Text | Leave as Text |
| Party PAN/VAT | Text | Leave as Text |
| Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Tax Amount | Number (format: currency) | Convert to Number, set format to Currency |
| TDS Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Source Department | Select (add options after import) | Convert to Select, add options: "Sales", "Purchase", "Accounts", "Payroll", "Admin", "Finance" |
| Index Key | Text | Leave as Text |
| Storage Location | Text | Leave as Text |
| Retention Period | Text | Leave as Text |
| Linked Voucher | Relation (link to the target database) | Convert to Relation, link to the target database |
| Linked Transaction | Relation (link to the target database) | Convert to Relation, link to the target database |
| Document Availability | Select (add options after import) | Convert to Select, add options: "Original on file", "Copy on file", "Awaiting from party", "Not available", "Duplicate" |
| Verification Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Verified By | Text | Leave as Text |
| Verified Date | Date | Convert to Date |
| Notes | Text | Leave as Text |
| Document Filing ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Document Reference | `text` | `VARCHAR(255)` | `string` | Text | `DOC-2026-0442` |
| 2 | Document Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Purchase Invoice` |
| 3 | Document Number | `text` | `VARCHAR(255)` | `string` | Text | `INV-8841` |
| 4 | Document Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-14` |
| 5 | Party Name | `text` | `VARCHAR(255)` | `string` | Text | `Bluepeak Supplies` |
| 6 | Party PAN/VAT | `text` | `VARCHAR(255)` | `string` | Text | `29ABCDE1234F1Z5` |
| 7 | Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `84500.00` |
| 8 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 9 | Tax Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `15210.00` |
| 10 | TDS Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2112.50` |
| 11 | Source Department | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Purchase` |
| 12 | Index Key | `text` | `VARCHAR(255)` | `string` | Text | `2026/08/BLUEPEAK` |
| 13 | Storage Location | `text` | `VARCHAR(255)` | `string` | Text | `Rack B / Folder 7` |
| 14 | Retention Period | `text` | `VARCHAR(255)` | `string` | Text | `8 years` |
| 15 | Linked Voucher | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `VCH-2026-0912` |
| 16 | Linked Transaction | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `PUR-2026-0041` |
| 17 | Document Availability | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Original on file` |
| 18 | Verification Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 19 | Verified By | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 20 | Verified Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-15` |
| 21 | Notes | `long_text` | `TEXT` | `string` | Text | `Challan and PO filed together with the invoice.` |
| 22 | Document Filing ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Document Type**

```
Purchase Invoice | Sales Invoice | Purchase Order | Sales Order | Delivery Challan | Receipt | Payment Voucher | Bank Statement | Cheque Record | Expense Bill | Contract/Agreement | Salary Sheet | Wage Sheet | Tax Document | TDS Document | Import Document | Fixed Asset Invoice | Other
```
**Source Department**

```
Sales | Purchase | Accounts | Payroll | Admin | Finance
```
**Document Availability**

```
Original on file | Copy on file | Awaiting from party | Not available | Duplicate
```
**Verification Status**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: `Linked Voucher`, `Linked Transaction`

- `Linked Voucher` -> the accounting voucher the document supports.
- `Linked Transaction` -> the purchase, sales or payment record the document supports.

## Examples

**Prompt**

```
Our accountant keeps asking for supporting documents and nobody can find them.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is filed today?
> **A:** Invoices and challans, mostly paper.
>
> **Q:** How are they sorted?
> **A:** By month, in separate folders.
>
> **Q:** How long do you keep them?
> **A:** Eight years, the accountant said.

**Recommended next step** - offered, not built:

> One register row per document, with a reference key built as `period/party` (for example `2026/08/BLUEPEAK`) so retrieval is by month and by party, and relation links to the voucher and the transaction it supports.
>
> Workflow: Document received → Referenced and indexed → Filed → Linked to entry → Verified
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
- Does not scan, store or digitise documents, and does not set retention policy for the business.
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

- @accounting-audit-system-builder - routes to this skill and the other accounting modules.
- @purchase-accounting - the purchase entries these documents support.
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/sales-accounting/SKILL.md) - the sales entries these documents support.
- @payment-accounting - the payment entries these documents support.
- @audit-preparation - reads this register to answer evidence requests.

## Reusable Prompt

```
I want to set up an indexed register of every supporting document, linked to the entry it supports for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
