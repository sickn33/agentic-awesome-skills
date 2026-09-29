---
name: receipt-accounting
description: 'Receipt register: payer, mode, gross amount received, invoice allocation, unapplied amount and TDS collected. Use for receipt and sales-income accounting.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, receipts, reconciliation]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Receipt Accounting

**What it is:** Money received, allocated to the right account, and reconciled to cash or bank.

## Overview

Works out the smallest useful **Receipt Accounting** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Record. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a receipt is **not** sales income. Money can
arrive as collection of an existing receivable, as an advance from a customer, as a loan
received, or as capital contribution. Each of those lands in a different ledger, and only
one of them is income. This is why `Receipt Type` and `Treats as Sale Income` are fields and
not conventions, and why `Amount Allocated` and `Unapplied Amount` are both captured - the
difference between the gross received and the part that clears an invoice stays visible
instead of quietly inflating revenue.

## When to Use This Skill

- receipt register
- receipt voucher book
- money received log
- collections tracker
- bank receipt reconciliation sheet

Also use it when the user says "money received, allocated to the right account, and reconciled to cash or bank", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: raising sales invoices, making payments, tax filing, or legal advice. This skill produces
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

> **Q:** How do you record money received today?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Receipts** - How many in a month? / Cash, bank, cheque or digital? / Any part-payments?
- **Allocation** - Allocated to invoices? / Advances or loans mixed in? / Who allocates it?
- **Evidence** - Receipt voucher or bank advice? / Issued to the customer? / Filed where?
- **Reconciliation** - Bank reconciled how often? / Cash counted? / Differences handled how?
- **Outcome** - What do you need? / A receipts register, a reconciliation view or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: receipt-accounting
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Receipts": null
  "Allocation": null
  "Evidence": null
  "Reconciliation": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One receipt record carrying the mode, the gross received, the receipt type, the invoice it clears and the unapplied balance, and post it to income only when the type says it is a sale.

**Why this one:** The trap on this table is that money in gets treated as revenue out. Forcing the type and the allocation before the entry closes is what keeps an advance or a loan out of the sales book.

**Workflow:** Money received → Mode and source recorded → Typed as collection, advance, loan or capital → Allocated to an invoice or held unapplied → Reconciled to bank or cash

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
Receipt Number,Receipt Date,Received From,Receipt Mode,Cash/Bank Account,Reference (Cheque/UTR/ID),Gross Amount Received,Receipt Type,Treats as Sale Income,Sales Invoice Allocated,Amount Allocated,Unapplied Amount,Adjust Against,TDS Collected on Receipt,Voucher Number,Ledger Account,Source Document,Reconciliation Status,Prepared By,Verified By,Entry Verified,Notes,Receipt ID
RCP-2026-0312,2026-08-19,Greyson Foods,Bank,HDFC Current ****0042,UTR-2026-0819,140000.00,Receivable Collection,No,SAL-2026-0033,130712.40,9287.60,Customer Advance - Greyson Foods,1307.12,VCH-2026-1027,Bank - HDFC Current,DOC-2026-0461,Unreconciled,Ananya Rao,Sneha Iyer,In progress,"Part collected against INV-2026-0733; TDS of 1307.12 remitted from this receipt; balance held as advance, not income.",
```

```sql
CREATE TABLE receipt_accounting (
  receipt_number VARCHAR(255),
  receipt_date DATE NOT NULL,
  received_from VARCHAR(255),
  receipt_mode VARCHAR(100) NOT NULL,
  cash_bank_account VARCHAR(255),
  reference_cheque_utr_id VARCHAR(255),
  gross_amount_received NUMERIC(14,2) NOT NULL,
  receipt_type VARCHAR(100) NOT NULL,
  treats_as_sale_income VARCHAR(100) NOT NULL,
  sales_invoice_allocated VARCHAR(255),  -- relation -> target record
  amount_allocated NUMERIC(14,2) NOT NULL,
  unapplied_amount NUMERIC(14,2) NOT NULL,
  adjust_against VARCHAR(255),
  tds_collected_on_receipt NUMERIC(14,2) NOT NULL,
  voucher_number VARCHAR(255),
  ledger_account VARCHAR(255),
  source_document VARCHAR(255),  -- relation -> target record
  reconciliation_status VARCHAR(100) NOT NULL,
  prepared_by VARCHAR(255),
  verified_by VARCHAR(255),
  entry_verified VARCHAR(100) NOT NULL,
  notes TEXT,
  receipt_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Receipt Accounting",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Receipt Number": { "type": "string" },
      "Receipt Date": { "type": "string", "format": "date" },
      "Received From": { "type": "string" },
      "Receipt Mode": { "type": "string" },
      "Cash/Bank Account": { "type": "string" },
      "Reference (Cheque/UTR/ID)": { "type": "string" },
      "Gross Amount Received": { "type": "number" },
      "Receipt Type": { "type": "string" },
      "Treats as Sale Income": { "type": "string" },
      "Sales Invoice Allocated": { "type": "string" },
      "Amount Allocated": { "type": "number" },
      "Unapplied Amount": { "type": "number" },
      "Adjust Against": { "type": "string" },
      "TDS Collected on Receipt": { "type": "number" },
      "Voucher Number": { "type": "string" },
      "Ledger Account": { "type": "string" },
      "Source Document": { "type": "string" },
      "Reconciliation Status": { "type": "string" },
      "Prepared By": { "type": "string" },
      "Verified By": { "type": "string" },
      "Entry Verified": { "type": "string" },
      "Notes": { "type": "string" },
      "Receipt ID": { "type": "integer" }
  },
  "required": [
      "Receipt Date",
      "Receipt Mode",
      "Gross Amount Received",
      "Receipt Type",
      "Treats as Sale Income",
      "Amount Allocated",
      "Unapplied Amount",
      "TDS Collected on Receipt",
      "Reconciliation Status",
      "Entry Verified"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Receipt Number | Title | Use as the database title |
| Receipt Date | Date | Convert to Date |
| Received From | Text | Leave as Text |
| Receipt Mode | Select (add options after import) | Convert to Select, add options: "Cash", "Bank", "Cheque", "Fonepay/QR", "Other Digital Payment" |
| Cash/Bank Account | Text | Leave as Text |
| Reference (Cheque/UTR/ID) | Text | Leave as Text |
| Gross Amount Received | Number (format: currency) | Convert to Number, set format to Currency |
| Receipt Type | Select (add options after import) | Convert to Select, add options: "Sale Collection", "Receivable Collection", "Advance from Customer", "Loan Received", "Capital Contribution", "Other" |
| Treats as Sale Income | Select (add options after import) | Convert to Select, add options: "Yes", "No" |
| Sales Invoice Allocated | Relation (link to the target database) | Convert to Relation, link to the target database |
| Amount Allocated | Number (format: currency) | Convert to Number, set format to Currency |
| Unapplied Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Adjust Against | Text | Leave as Text |
| TDS Collected on Receipt | Number (format: currency) | Convert to Number, set format to Currency |
| Voucher Number | Text | Leave as Text |
| Ledger Account | Text | Leave as Text |
| Source Document | Relation (link to the target database) | Convert to Relation, link to the target database |
| Reconciliation Status | Select (add options after import) | Convert to Select, add options: "Unreconciled", "Reconciled", "Difference" |
| Prepared By | Text | Leave as Text |
| Verified By | Text | Leave as Text |
| Entry Verified | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Receipt ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`, and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Receipt Number | `text` | `VARCHAR(255)` | `string` | Text | `RCP-2026-0312` |
| 2 | Receipt Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-19` |
| 3 | Received From | `text` | `VARCHAR(255)` | `string` | Text | `Greyson Foods` |
| 4 | Receipt Mode | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Bank` |
| 5 | Cash/Bank Account | `text` | `VARCHAR(255)` | `string` | Text | `HDFC Current ****0042` |
| 6 | Reference (Cheque/UTR/ID) | `text` | `VARCHAR(255)` | `string` | Text | `UTR-2026-0819` |
| 7 | Gross Amount Received | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `140000.00` |
| 8 | Receipt Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Receivable Collection` |
| 9 | Treats as Sale Income | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `No` |
| 10 | Sales Invoice Allocated | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `SAL-2026-0033` |
| 11 | Amount Allocated | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `130712.40` |
| 12 | Unapplied Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `9287.60` |
| 13 | Adjust Against | `text` | `VARCHAR(255)` | `string` | Text | `Customer Advance - Greyson Foods` |
| 14 | TDS Collected on Receipt | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1307.12` |
| 15 | Voucher Number | `text` | `VARCHAR(255)` | `string` | Text | `VCH-2026-1027` |
| 16 | Ledger Account | `text` | `VARCHAR(255)` | `string` | Text | `Bank - HDFC Current` |
| 17 | Source Document | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `DOC-2026-0461` |
| 18 | Reconciliation Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Unreconciled` |
| 19 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 20 | Verified By | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 21 | Entry Verified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 22 | Notes | `long_text` | `TEXT` | `string` | Text | `Part collected against INV-2026-0733; TDS of 1307.12 remitted from this receipt; balance held as advance, not income.` |
| 23 | Receipt ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Receipt Mode**

```
Cash | Bank | Cheque | Fonepay/QR | Other Digital Payment
```
**Receipt Type**

```
Sale Collection | Receivable Collection | Advance from Customer | Loan Received | Capital Contribution | Other
```
**Treats as Sale Income**

```
Yes | No
```
**Reconciliation Status**

```
Unreconciled | Reconciled | Difference
```
**Entry Verified**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: `Sales Invoice Allocated`, `Source Document`

`Sales Invoice Allocated` points at the sales book, so the receipt and the invoice it
clears can be read side by side. `Source Document` points at the filing register, so the
bank advice or receipt voucher is one lookup away. Neither link substitutes for
`Receipt Type` - a receipt can be fully allocated and still be an advance.

## Examples

**Prompt**

```
Money comes in and we post all of it as sales. At month end the numbers never agree
with the bank.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many receipts in a month?
> **A:** About forty.
>
> **Q:** Cash, bank, digital?
> **A:** Mostly bank. Some Fonepay.
>
> **Q:** Do you allocate receipts to invoices?
> **A:** Sometimes. The rest we just leave.

**Recommended next step** - offered, not built:

> One receipt record carrying the mode, the gross received, the receipt type, the invoice it clears and the unapplied balance, and post it to income only when the type says it is a sale.
>
> Workflow: Money received → Mode and source recorded → Typed as collection, advance, loan or capital → Allocated to an invoice or held unapplied → Reconciled to bank or cash
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Never let a receipt become income on the strength of money arriving. Set `Receipt Type`
  first, then `Treats as Sale Income`, then allocate.
- Keep the arithmetic visible: gross received = amount allocated + unapplied amount, every
  row. A row that will not balance means the allocation is still open.
- `TDS Collected on Receipt` is a slice of the money received, not an addition to it. It is
  the part of the allocation that is remitted to the government, so gross received still
  equals amount allocated plus unapplied amount.
- An unapplied amount is a live question, not a rounding item. Carry it forward until it is
  identified as an advance, a loan, capital or an error.
- Record the mode on every receipt. Cash, bank, cheque and digital reconcile through
  different routes and a mixed-up mode is the most common source of differences.
- Record `Cash/Bank Account` masked - the bank and the last four digits is all a register
  needs, and the full number is what turns a register into a target.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not post entries, raise invoices or compute tax.
- The type fields do not decide the accounting treatment for you. The ledger, the tax
  position and the period all matter, and a qualified accountant confirms that.
- Unapplied amounts need a follow-up process. This table records them; it does not chase
  them.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Does not connect to a bank feed or move money.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real names, bank details or customer financials. Placeholders only.
- Label example rows as synthetic, and keep bank details masked.
- A receipt register is a target for fraud and for someone asking for a copy of a
  customer's bank reference. Do not paste live UTR or cheque images into a chat.
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
- **Problem:** every receipt posted as sales because the money arrived.
  **Solution:** `Receipt Type` and `Treats as Sale Income` are fields, not assumptions. Fill
  them before the entry, not at month end.
- **Problem:** the unapplied balance is quietly dropped so the row balances.
  **Solution:** hold it in `Unapplied Amount` and carry it forward until it is identified.
- **Problem:** the mode is left blank, so cash and bank never reconcile separately.
  **Solution:** `Receipt Mode` is required; a receipt with no mode cannot be reconciled.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other 15 modules.
- @sales-accounting - the invoice side of `Sales Invoice Allocated`.
- @payment-accounting - the other half of the cash and bank movement.
- @source-document-filing - holds the `Source Document` target.
- @party-ledger-reconciliation - proves the debtor balance after allocation.
- @day-book - the daily book these receipts land in.
- @tds-booking-payment - carries `TDS Collected on Receipt` through to the return.
- @petty-cash-management - the same receipt-versus-income question in cash.
- @monthly-closing-statements - where the unapplied balance either clears or gets written off.
- @credit-cycle-analysis - uses the unallocated balance to age the debtors.
- @audit-preparation - the receipt register is an audit-trail item.
- @expense-accounting - the receipt side that is not income at all.

## Reusable Prompt

```
I want to set up receipt accounting - every rupee received, its mode, its type, its
allocation against an invoice and its reconciliation to cash or bank - for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
