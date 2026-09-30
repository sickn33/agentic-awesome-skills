---
name: sales-accounting
description: 'Sales register: customer, invoice, gross amount, discount, VAT and TDS, net receivable, credit terms and balance. Use for sales accounting.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, sales]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Sales Accounting

**What it is:** Sales invoices, the receivables they create, and the documents that support them.

## Overview

Works out the smallest useful **Sales Accounting** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

**Scope of one row.** This is a single-table skill and one row is one invoice carrying
**one line item**. It is deliberately not a multi-line billing engine. An invoice with
several items either becomes several rows that repeat the same `Invoice Number`, or is
kept in a separate line table alongside this one - whichever the business actually needs.
Decide that in Step 2, do not assume it.

**Everything is conditional.** Not every sale is on credit, not every invoice has an order
or a challan, not every sale attracts VAT, and not every customer deducts TDS. Those fields
exist to record what was confirmed; they are left unset when the answer is "not applicable"
or "not known". Never fill them with a default to make the row look complete.

Layer: Layer 3: Record. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- sales accounting
- sales invoice register
- customer billing and receivable tracker
- sales vat register log

Also use it when the user describes invoicing, billing or tracking who has paid, or the same
process happening in a spreadsheet, a document or someone's inbox.

Do not use it for: customer collections, tax filing, or legal advice. This skill produces
empty templates only - it never holds or processes real customer or financial data.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> the user wants artifacts; go to Step 2.
- "our process is ..." or "it is in a sheet" -> the user wants to move an existing process; capture it, then Step 2.
- "is this right" or "review" or "audit" -> the user wants a check, not a build; answer from what they share.
- "how do I ..." -> advice question; answer directly and offer the build only if it helps.

Then read everything the user has already said and work out which single missing answer
would actually change the recommendation. If the request already contains enough to
recommend, do not ask anything yet - go to Step 4. If the user is describing a problem
rather than requesting a build, answer it first; a question is not owed.

Never open with a fixed question such as "How are sales invoices raised today?" when the
request has already answered it.

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Volume** - How many invoices a month? / Roughly how many lines per invoice?
- **Documents** - Is there a sales order every time, or only for some customers? / Is a delivery challan used at all?
- **Taxes and credit** - Is VAT charged, and at what rate? / Do any customers deduct TDS, and at what rate? / How many sales are on credit? / Standard credit period? / Who follows up?
- **Current process** - Tracked now? / Software or sheet? / What gets missed?
- **Outcome** - What do you need? / A sales register, an aging view or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: sales-accounting
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Volume": null
  "Documents": null
  "Taxes and credit": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact. Use
conditional language and name what is conditional.

**Recommended approach:** One invoice register, one row per invoice with a single line item.
Link the sales order, delivery challan and source document only where the business actually
raises them. Record VAT and TDS rates only where they were confirmed. For credit sales, add
the credit terms, due date, amount received, balance, a payment status and an aging status;
leave those unset for cash sales.

**Why this one:** A sales register that stops at the invoice total loses the receivable.
Splitting payment state from aging state is what turns billing into a collections list -
"paid" and "overdue" are different questions and one field cannot answer both.

**Workflow:** Documents prepared (where used) → Invoice issued → VAT register updated (where VAT applies) → Recorded → Receivable confirmed against the debtor ledger

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

The SQL below is written in PostgreSQL-flavoured DDL. `SERIAL PRIMARY KEY` and
`TIMESTAMP DEFAULT NOW()` are PostgreSQL-specific; on another engine use that engine's
identity column and default-timestamp syntax. `created_at` and `updated_at` are maintained
by the database and are not business fields - leave them out of the CSV, JSON Schema and
Notion mapping.

```csv
Sales Number,Customer,Customer PAN/VAT,Sales Order,Delivery Challan,Invoice Number,Invoice Date,Item Description,Quantity,UOM,Rate,Gross Amount,Discount,Taxable Value,VAT Rate %,VAT Amount,TDS Rate %,TDS Amount,Invoice Total,Net Receivable,Credit Terms (Days),Due Date,Payment Status,Aging Status,Amount Received,Balance,Ledger Account,Source Document,VAT Register Updated,Entry Verified,Prepared By,Notes,Sales ID
SAL-2026-0033,Example Customer Ltd,ZZZZZ0000Z,SO-2026-0094,DC-2026-0911,INV-2026-0733,2026-08-16,Corrugated carton packs printed,800,Nos,142.50,114000.00,2280.00,111720.00,18,20109.60,2,2234.40,131829.60,129595.20,30,2026-09-15,Part Paid,Overdue,50000.00,79595.20,Sales - Cartons,DOC-2026-0455,Done,In progress,Example Preparer,Credit sale net 30; order raised for this customer only.,
```

```sql
-- PostgreSQL-flavoured DDL. See the note above for other engines.
CREATE TABLE sales_accounting (
  sales_number VARCHAR(255),
  customer VARCHAR(255),
  customer_pan_vat VARCHAR(255),
  sales_order VARCHAR(255),  -- relation -> sales order database
  delivery_challan VARCHAR(255),  -- relation -> delivery challan database
  invoice_number VARCHAR(255),
  invoice_date DATE NOT NULL,
  item_description VARCHAR(255),
  quantity NUMERIC NOT NULL,
  uom VARCHAR(100) NOT NULL,
  rate NUMERIC(14,2) NOT NULL,
  gross_amount NUMERIC(14,2) NOT NULL,
  discount NUMERIC(14,2) NOT NULL,
  taxable_value NUMERIC(14,2) NOT NULL,
  vat_rate_pct NUMERIC,
  vat_amount NUMERIC(14,2),
  tds_rate_pct NUMERIC,
  tds_amount NUMERIC(14,2),
  invoice_total NUMERIC(14,2) NOT NULL,
  net_receivable NUMERIC(14,2) NOT NULL,
  credit_terms_days NUMERIC,
  due_date DATE,
  payment_status VARCHAR(100) NOT NULL,
  aging_status VARCHAR(100) NOT NULL,
  amount_received NUMERIC(14,2) NOT NULL,
  balance NUMERIC(14,2) NOT NULL,
  ledger_account VARCHAR(255),
  source_document VARCHAR(255),  -- relation -> source document register
  vat_register_updated VARCHAR(100) NOT NULL,
  entry_verified VARCHAR(100) NOT NULL,
  prepared_by VARCHAR(255),
  notes TEXT,
  sales_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Sales Accounting",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Sales Number": { "type": "string" },
      "Customer": { "type": "string" },
      "Customer PAN/VAT": { "type": "string" },
      "Sales Order": { "type": "string" },
      "Delivery Challan": { "type": "string" },
      "Invoice Number": { "type": "string" },
      "Invoice Date": { "type": "string", "format": "date" },
      "Item Description": { "type": "string" },
      "Quantity": { "type": "number" },
      "UOM": { "type": "string" },
      "Rate": { "type": "number" },
      "Gross Amount": { "type": "number" },
      "Discount": { "type": "number" },
      "Taxable Value": { "type": "number" },
      "VAT Rate %": { "type": "number" },
      "VAT Amount": { "type": "number" },
      "TDS Rate %": { "type": "number" },
      "TDS Amount": { "type": "number" },
      "Invoice Total": { "type": "number" },
      "Net Receivable": { "type": "number" },
      "Credit Terms (Days)": { "type": "number" },
      "Due Date": { "type": "string", "format": "date" },
      "Payment Status": { "type": "string" },
      "Aging Status": { "type": "string" },
      "Amount Received": { "type": "number" },
      "Balance": { "type": "number" },
      "Ledger Account": { "type": "string" },
      "Source Document": { "type": "string" },
      "VAT Register Updated": { "type": "string" },
      "Entry Verified": { "type": "string" },
      "Prepared By": { "type": "string" },
      "Notes": { "type": "string" },
      "Sales ID": { "type": "integer" }
  },
  "required": [
      "Invoice Date",
      "Quantity",
      "UOM",
      "Rate",
      "Gross Amount",
      "Discount",
      "Taxable Value",
      "Invoice Total",
      "Net Receivable",
      "Payment Status",
      "Aging Status",
      "Amount Received",
      "Balance",
      "VAT Register Updated",
      "Entry Verified"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Sales Number | Title | Use as the database title |
| Customer | Text | Leave as Text |
| Customer PAN/VAT | Text | Leave as Text |
| Sales Order | Relation (link to the sales order database) | Convert to Relation, link to the sales order database |
| Delivery Challan | Relation (link to the delivery challan database) | Convert to Relation, link to the delivery challan database |
| Invoice Number | Text | Leave as Text |
| Invoice Date | Date | Convert to Date |
| Item Description | Text | Leave as Text |
| Quantity | Number | Convert to Number |
| UOM | Select (add options after import) | Convert to Select, add options: "Nos", "Kg", "Litre", "Metre", "Set", "Hour", "Box", "Packet" |
| Rate | Number (format: currency) | Convert to Number, set format to Currency |
| Gross Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Discount | Number (format: currency) | Convert to Number, set format to Currency |
| Taxable Value | Number (format: currency) | Convert to Number, set format to Currency |
| VAT Rate % | Number | Convert to Number |
| VAT Amount | Number (format: currency) | Convert to Number, set format to Currency |
| TDS Rate % | Number | Convert to Number |
| TDS Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Invoice Total | Number (format: currency) | Convert to Number, set format to Currency |
| Net Receivable | Number (format: currency) | Convert to Number, set format to Currency |
| Credit Terms (Days) | Number | Convert to Number |
| Due Date | Date | Convert to Date |
| Payment Status | Select (add options after import) | Convert to Select, add options: "Unpaid", "Part Paid", "Paid", "Written Off" |
| Aging Status | Select (add options after import) | Convert to Select, add options: "Current", "Due Soon", "Overdue" |
| Amount Received | Number (format: currency) | Convert to Number, set format to Currency |
| Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Ledger Account | Text | Leave as Text |
| Source Document | Relation (link to the source document register) | Convert to Relation, link to the source document register |
| VAT Register Updated | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Entry Verified | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Prepared By | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Sales ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Sales Number | `text` | `VARCHAR(255)` | `string` | Text | `SAL-2026-0033` |
| 2 | Customer | `text` | `VARCHAR(255)` | `string` | Text | `Example Customer Ltd` |
| 3 | Customer PAN/VAT | `text` | `VARCHAR(255)` | `string` | Text | `ZZZZZ0000Z` |
| 4 | Sales Order | `relation` | `VARCHAR(255)` | `string` | Relation (link to the sales order database) | `SO-2026-0094` |
| 5 | Delivery Challan | `relation` | `VARCHAR(255)` | `string` | Relation (link to the delivery challan database) | `DC-2026-0911` |
| 6 | Invoice Number | `text` | `VARCHAR(255)` | `string` | Text | `INV-2026-0733` |
| 7 | Invoice Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-16` |
| 8 | Item Description | `text` | `VARCHAR(255)` | `string` | Text | `Corrugated carton packs printed` |
| 9 | Quantity | `number` | `NUMERIC` | `number` | Number | `800` |
| 10 | UOM | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Nos` |
| 11 | Rate | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `142.50` |
| 12 | Gross Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `114000.00` |
| 13 | Discount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2280.00` |
| 14 | Taxable Value | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `111720.00` |
| 15 | VAT Rate % | `number` | `NUMERIC` | `number` | Number | `18` |
| 16 | VAT Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `20109.60` |
| 17 | TDS Rate % | `number` | `NUMERIC` | `number` | Number | `2` |
| 18 | TDS Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2234.40` |
| 19 | Invoice Total | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `131829.60` |
| 20 | Net Receivable | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `129595.20` |
| 21 | Credit Terms (Days) | `number` | `NUMERIC` | `number` | Number | `30` |
| 22 | Due Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-15` |
| 23 | Payment Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Part Paid` |
| 24 | Aging Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Overdue` |
| 25 | Amount Received | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `50000.00` |
| 26 | Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `79595.20` |
| 27 | Ledger Account | `text` | `VARCHAR(255)` | `string` | Text | `Sales - Cartons` |
| 28 | Source Document | `relation` | `VARCHAR(255)` | `string` | Relation (link to the source document register) | `DOC-2026-0455` |
| 29 | VAT Register Updated | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Done` |
| 30 | Entry Verified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 31 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Example Preparer` |
| 32 | Notes | `long_text` | `TEXT` | `string` | Text | `Credit sale net 30; order raised for this customer only.` |
| 33 | Sales ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

The table above is the single source of truth. The CSV, SQL, JSON Schema and Notion mapping
are all derived from it - never edit one without the others.

How the amounts relate, so a reviewer can check any row:

- `Gross Amount` = `Quantity` x `Rate`
- `Taxable Value` = `Gross Amount` - `Discount`
- `Invoice Total` = `Taxable Value` + `VAT Amount` (equals `Taxable Value` when no VAT applies)
- `Net Receivable` = `Invoice Total` - `TDS Amount` (equals `Invoice Total` when no TDS applies)
- `Balance` = `Net Receivable` - `Amount Received`
- `Due Date` = `Invoice Date` + `Credit Terms (Days)`; both stay unset on a cash sale

`VAT Rate %`, `VAT Amount`, `TDS Rate %`, `TDS Amount`, `Credit Terms (Days)` and
`Due Date` are optional. Set them only from a confirmed answer, and never carry a rate as a
universal default - a TDS rate belongs to a specific customer, contract and jurisdiction,
and VAT applicability is a fact about the business and the supply.

`Payment Status` is what has been received: `Unpaid`, `Part Paid`, `Paid`, `Written Off`.
`Aging Status` is how late it is against `Due Date`: `Current`, `Due Soon`, `Overdue`,
assessed as at the reporting date. They are separate because an invoice can be fully paid
and no longer aging, or unpaid and long overdue.

`Sales Number` is the internal reference used inside the business; `Invoice Number` is the
number the customer is given. They are different things and both are useful, so both are
kept - but if the business only has one, drop `Sales Number` and keep the invoice number.
`Sales ID` is an internal database identifier only. It exists so the target database can
address a row, it is left blank in the example, and it is not a business reference - do not
print it on an invoice or quote it to a customer.

## Select Options

**UOM**

```
Nos | Kg | Litre | Metre | Set | Hour | Box | Packet
```
**Payment Status**

```
Unpaid | Part Paid | Paid | Written Off
```
**Aging Status**

```
Current | Due Soon | Overdue
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

Link fields: `Sales Order`, `Delivery Challan`, `Source Document`

All three are optional. Many invoices carry none of them, and a cash sale usually carries
none. Leave the cell unset rather than inventing a reference.

- `Sales Order` -> the sales order database. Links to the order this invoice was raised
  against, where the business raises orders at all.
- `Delivery Challan` -> the delivery challan database. Links to the challan evidencing
  despatch, where the business issues them at all.
- `Source Document` -> the source document filing register (`source-document-filing`).
  Links to the filed invoice and its supporting papers.

Each is a genuine link to a named database, not a typed reference. If the business does not
run that register, keep the field as `text` and say so, rather than labelling plain text a
relation.

## Examples

**Prompt**

```
We issue credit invoices and nobody can tell which customers have actually paid.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Roughly how many lines does one invoice usually carry?
> **A:** Usually one, sometimes two.
>
> **Q:** Do you always raise an order and a challan?
> **A:** Order only for bigger customers. No challan at all.
>
> **Q:** Is VAT charged, and do any customers deduct TDS?
> **A:** VAT yes. TDS only two customers, different rates.

**Recommended next step** - offered, not built:

> Based on what you have confirmed: one invoice register, one row per invoice. Because most
> of your invoices carry a single line, this stays a single table; for the two-item invoices,
> either add a second row repeating the invoice number or keep a separate line table - tell me
> which, and the build follows that choice.
>
> Sales order links only where you raise one, so that field is optional. No challan field is
> worth carrying since you do not issue them - say the word and it comes out.
>
> VAT applies, so the rate and amount are recorded. TDS stays optional, recorded per customer
> at whatever rate that customer actually deducts, rather than a fixed rate.
>
> For your credit sales, credit terms, due date, amount received and balance, plus a payment
> status and a separate aging status - paid and overdue are different questions.
>
> Workflow: Order raised where needed → Invoice issued → VAT register updated → Recorded → Receivable confirmed against the debtor ledger
>
> Want the CSV, SQL DDL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Skip any question the request has already answered. Asking it anyway costs trust.
- Keep payment state and aging state in separate fields. Collapsing them loses the
  collections view.
- Leave conditional fields unset when the answer is "not applicable" or "not known". A
  plausible default is worse than an empty cell, because nobody can tell it apart from fact.
- Record a tax rate only when it was confirmed for that customer or supply, never as a
  standing default.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that genuinely points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- One row is one invoice with a single line item. Multi-line invoices need repeated invoice
  numbers or a separate line table; this skill does not model line-level tax or discounts.
- Empty template only. It does not compute tax, file returns or keep ledgers.
- Does not raise or send invoices, collect money, execute accounting entries, or call any
  external API. The surrounding platform decides whether such tools exist.
- Not legal or tax advice, and not a substitute for it. Confirm applicability with a
  qualified adviser for the jurisdiction in question.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- `Sales ID` is a database identifier, not a business reference.

## Security & Safety Notes

- Never fill in real customer names, tax identifiers, bank details or any real financial
  data. Placeholders only.
- This is a sales and receivables skill: it has no employee, payroll, leave or medical data
  and should not be asked to hold any.
- Keep bank details masked and never mark an example row `Confidential`.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If sensitive data is supplied, avoid repeating unnecessary identifiers. Use only what
  the requested review needs; keep generated templates empty. Do not claim deletion
  from the conversation or service storage.
- Anything that becomes a tax or legal filing needs a qualified human reviewer.


See the [Common Pitfalls](references/common-pitfalls.md) reference for the full guidance.

