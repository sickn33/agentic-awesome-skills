---
name: purchase-accounting
description: 'Purchase register: supplier, invoice, gross amount, VAT and TDS, net payable, ledger account and payment balance. Use for purchase accounting.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, purchase]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Purchase Accounting

**What it is:** Verified purchase invoices, booked and traceable to their PO and challan.

## Overview

Works out the smallest useful **Purchase Accounting** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Record. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- purchase accounting
- purchase invoice register
- supplier bill entry tracker
- purchase vat and tds log

Also use it when the user says "verified purchase invoices, booked and traceable to their PO and challan", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: supplier payment runs, tax filing, or legal advice. This skill produces
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

> **Q:** How are supplier bills captured today?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Volume** - How many supplier bills a month? / How many suppliers?
- **Verification** - PO and challan always available? / Who checks the invoice?
- **Taxes and classification** - VAT charged? / TDS deducted? / Which sections apply? / Inventory, expense or fixed asset? / Who decides the ledger?
- **Current process** - Tracked now? / Software or sheet? / What gets missed?
- **Outcome** - What do you need? / A purchase register, a VAT input log or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: purchase-accounting
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Volume": null
  "Verification": null
  "Taxes and classification": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One purchase record per verified invoice, carrying the PO, challan and source document as relations, the VAT and TDS figures, the classification, and a review status - five steps: verify, file, update the Purchase VAT Register, record in software, review against the originals.

**Why this one:** Purchase errors are verification errors. A record that holds the linked documents and a review status is what makes a misclassified or untaxed bill visible before the return is filed.

**Workflow:** Invoice verified → Documents filed → VAT register updated → Booked and classified → Reviewed

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
Purchase Number,Supplier,Supplier PAN/VAT,Purchase Order,Delivery Challan,Supplier Invoice Number,Invoice Date,Item/Expense Description,Quantity,UOM,Rate,Gross Amount,VAT Rate %,VAT Amount,TDS Rate %,TDS Amount,Net Payable,Classification,Ledger Account,Source Document,Payment Status,Amount Paid,Balance,VAT Register Updated,Entry Verified,Prepared By,Verified By,Notes,Purchase ID
PUR-2026-0041,Bluepeak Supplies,29ABCDE1234F1Z5,PO-2026-0187,DC-2026-0902,INV-8841,2026-08-14,Corrugated cartons 3 ply,500,Nos,169.00,84500.00,18,15210.00,2.5,2112.50,97597.50,Inventory/Purchase,Purchases - Cartons,DOC-2026-0442,Part Paid,50000.00,47597.50,Done,In progress,Ananya Rao,Vikram Singh,Rate compared against PO-2026-0187; quantity matched with DC-2026-0902.,
```

```sql
CREATE TABLE purchase_accounting (
  purchase_number VARCHAR(255),
  supplier VARCHAR(255),
  supplier_pan_vat VARCHAR(255),
  purchase_order VARCHAR(255),  -- relation -> target record
  delivery_challan VARCHAR(255),  -- relation -> target record
  supplier_invoice_number VARCHAR(255),
  invoice_date DATE NOT NULL,
  item_expense_description VARCHAR(255),
  quantity NUMERIC NOT NULL,
  uom VARCHAR(100) NOT NULL,
  rate NUMERIC(14,2) NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL,
  vat_rate_pct NUMERIC NOT NULL,
  vat_amount NUMERIC(14,2) NOT NULL,
  tds_rate_pct NUMERIC NOT NULL,
  tds_amount NUMERIC(14,2) NOT NULL,
  net_payable NUMERIC(14,2) NOT NULL,
  classification VARCHAR(100) NOT NULL,
  ledger_account VARCHAR(255),
  source_document VARCHAR(255),  -- relation -> target record
  payment_status VARCHAR(100) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL,
  balance NUMERIC(14,2) NOT NULL,
  vat_register_updated VARCHAR(100) NOT NULL,
  entry_verified VARCHAR(100) NOT NULL,
  prepared_by VARCHAR(255),
  verified_by VARCHAR(255),
  notes TEXT,
  purchase_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Purchase Accounting",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Purchase Number": { "type": "string" },
      "Supplier": { "type": "string" },
      "Supplier PAN/VAT": { "type": "string" },
      "Purchase Order": { "type": "string" },
      "Delivery Challan": { "type": "string" },
      "Supplier Invoice Number": { "type": "string" },
      "Invoice Date": { "type": "string", "format": "date" },
      "Item/Expense Description": { "type": "string" },
      "Quantity": { "type": "number" },
      "UOM": { "type": "string" },
      "Rate": { "type": "number" },
      "Gross Amount": { "type": "number" },
      "VAT Rate %": { "type": "number" },
      "VAT Amount": { "type": "number" },
      "TDS Rate %": { "type": "number" },
      "TDS Amount": { "type": "number" },
      "Net Payable": { "type": "number" },
      "Classification": { "type": "string" },
      "Ledger Account": { "type": "string" },
      "Source Document": { "type": "string" },
      "Payment Status": { "type": "string" },
      "Amount Paid": { "type": "number" },
      "Balance": { "type": "number" },
      "VAT Register Updated": { "type": "string" },
      "Entry Verified": { "type": "string" },
      "Prepared By": { "type": "string" },
      "Verified By": { "type": "string" },
      "Notes": { "type": "string" },
      "Purchase ID": { "type": "integer" }
  },
  "required": [
      "Invoice Date",
      "Quantity",
      "UOM",
      "Rate",
      "Gross Amount",
      "VAT Rate %",
      "VAT Amount",
      "TDS Rate %",
      "TDS Amount",
      "Net Payable",
      "Classification",
      "Payment Status",
      "Amount Paid",
      "Balance",
      "VAT Register Updated",
      "Entry Verified"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Purchase Number | Title | Use as the database title |
| Supplier | Text | Leave as Text |
| Supplier PAN/VAT | Text | Leave as Text |
| Purchase Order | Relation (link to the target database) | Convert to Relation, link to the target database |
| Delivery Challan | Relation (link to the target database) | Convert to Relation, link to the target database |
| Supplier Invoice Number | Text | Leave as Text |
| Invoice Date | Date | Convert to Date |
| Item/Expense Description | Text | Leave as Text |
| Quantity | Number | Convert to Number |
| UOM | Select (add options after import) | Convert to Select, add options: "Nos", "Kg", "Litre", "Metre", "Set", "Hour", "Box", "Packet" |
| Rate | Number (format: currency) | Convert to Number, set format to Currency |
| Gross Amount | Number (format: currency) | Convert to Number, set format to Currency |
| VAT Rate % | Number | Convert to Number |
| VAT Amount | Number (format: currency) | Convert to Number, set format to Currency |
| TDS Rate % | Number | Convert to Number |
| TDS Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Net Payable | Number (format: currency) | Convert to Number, set format to Currency |
| Classification | Select (add options after import) | Convert to Select, add options: "Inventory/Purchase", "Expense", "Fixed Asset", "Other" |
| Ledger Account | Text | Leave as Text |
| Source Document | Relation (link to the target database) | Convert to Relation, link to the target database |
| Payment Status | Select (add options after import) | Convert to Select, add options: "Unpaid", "Part Paid", "Paid", "Overdue" |
| Amount Paid | Number (format: currency) | Convert to Number, set format to Currency |
| Balance | Number (format: currency) | Convert to Number, set format to Currency |
| VAT Register Updated | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Entry Verified | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Prepared By | Text | Leave as Text |
| Verified By | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Purchase ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Purchase Number | `text` | `VARCHAR(255)` | `string` | Text | `PUR-2026-0041` |
| 2 | Supplier | `text` | `VARCHAR(255)` | `string` | Text | `Bluepeak Supplies` |
| 3 | Supplier PAN/VAT | `text` | `VARCHAR(255)` | `string` | Text | `29ABCDE1234F1Z5` |
| 4 | Purchase Order | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `PO-2026-0187` |
| 5 | Delivery Challan | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `DC-2026-0902` |
| 6 | Supplier Invoice Number | `text` | `VARCHAR(255)` | `string` | Text | `INV-8841` |
| 7 | Invoice Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-14` |
| 8 | Item/Expense Description | `text` | `VARCHAR(255)` | `string` | Text | `Corrugated cartons 3 ply` |
| 9 | Quantity | `number` | `NUMERIC` | `number` | Number | `500` |
| 10 | UOM | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Nos` |
| 11 | Rate | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `169.00` |
| 12 | Gross Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `84500.00` |
| 13 | VAT Rate % | `number` | `NUMERIC` | `number` | Number | `18` |
| 14 | VAT Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `15210.00` |
| 15 | TDS Rate % | `number` | `NUMERIC` | `number` | Number | `2.5` |
| 16 | TDS Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2112.50` |
| 17 | Net Payable | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `97597.50` |
| 18 | Classification | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Inventory/Purchase` |
| 19 | Ledger Account | `text` | `VARCHAR(255)` | `string` | Text | `Purchases - Cartons` |
| 20 | Source Document | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `DOC-2026-0442` |
| 21 | Payment Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Part Paid` |
| 22 | Amount Paid | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `50000.00` |
| 23 | Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `47597.50` |
| 24 | VAT Register Updated | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Done` |
| 25 | Entry Verified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 26 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 27 | Verified By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 28 | Notes | `long_text` | `TEXT` | `string` | Text | `Rate compared against PO-2026-0187; quantity matched with DC-2026-0902.` |
| 29 | Purchase ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**UOM**

```
Nos | Kg | Litre | Metre | Set | Hour | Box | Packet
```
**Classification**

```
Inventory/Purchase | Expense | Fixed Asset | Other
```
**Payment Status**

```
Unpaid | Part Paid | Paid | Overdue
```
**VAT Register Updated**

```
Not started | In progress | Blocked | Done | Cancelled
```
**Entry Verified**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: `Purchase Order`, `Delivery Challan`, `Source Document`

- `Purchase Order` -> the purchase order the invoice was booked against.
- `Delivery Challan` -> the delivery challan that evidences receipt of goods.
- `Source Document` -> the filed document register row for the invoice and its support.

## Examples

**Prompt**

```
Supplier bills pile up for a week before anyone checks the VAT on them.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many supplier bills a month?
> **A:** Around forty.
>
> **Q:** Do you always have the PO and challan?
> **A:** Usually, not always.
>
> **Q:** Is TDS deducted on any of them?
> **A:** Yes, on a few.

**Recommended next step** - offered, not built:

> One purchase record per verified invoice, carrying the PO, challan and source document as relations, the VAT and TDS figures, the classification, and a review status - five steps: verify, file, update the Purchase VAT Register, record in software, review against the originals.
>
> Workflow: Invoice verified → Documents filed → VAT register updated → Booked and classified → Reviewed
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
- Does not post to the accounting package, pay suppliers, or file the VAT return.
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
- @source-document-filing - files the invoice with its PO, challan and other support.
- @tds-booking-payment - books and pays the withholding deducted here.
- @payment-accounting - clears the payable carried in Net Payable and Balance.
- @expense-accounting - the same flow for bills booked as expense rather than stock.
- @inventory-stock-reconciliation - checks the stock side of Inventory/Purchase entries.
- @party-ledger-reconciliation - reconciles the supplier balance against this register.

## Reusable Prompt

```
I want to set up verified purchase invoices, booked and traceable to their PO and challan for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
