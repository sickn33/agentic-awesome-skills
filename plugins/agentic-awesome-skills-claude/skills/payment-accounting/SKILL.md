---
name: payment-accounting
description: 'Payment voucher register: payment number and date, paid to and purpose, mode, gross amount, TDS rate and deducted, net paid, invoice allocation, ledger and reconciliation status. Use for vouchers.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, payments, tds]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Payment Accounting

**What it is:** Money paid out, with TDS applied where applicable and every payment evidenced.

## Overview

Works out the smallest useful **Payment Accounting** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Record. Fits: Starter stage. Table code: n/a.

**The rule this table exists to enforce:** a payment voucher is **not** a universal
substitute for a receipt note. Where no formal voucher exists, the evidence is the
recipient's own acknowledgement - an email, a signed payment advice, a stamped receipt -
captured as such. That is what `Voucher Type` and `Recipient Acknowledgement Ref` are for.
A payment with no voucher type recorded is a payment nobody can evidence later.

## When to Use This Skill

- payment register
- payment voucher book
- money paid out log
- vendor payment tracker
- tds on payments sheet

Also use it when the user says "money paid out, with TDS applied where applicable and every payment evidenced", or describes the same process happening in a
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

> **Q:** How do you record money paid out today?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Payments** - How many in a month? / Cash, bank, cheque or digital? / Any advances given?
- **Approval** - Who approves? / Voucher always raised? / Any paid without a voucher?
- **TDS** - TDS applicable? / Rate and sections used? / Filed monthly or quarterly?
- **Evidence** - Bill attached to every payment? / Recipient acknowledgement kept? / Filed where?
- **Outcome** - What do you need? / A payments register, a TDS record or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: payment-accounting
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Payments": null
  "Approval": null
  "TDS": null
  "Evidence": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One payment record carrying the payee, the purpose, the mode, gross less TDS as the net paid, the invoice it clears and the evidence reference - and where no voucher exists, record the recipient's acknowledgement instead of leaving the evidence blank.

**Why this one:** Money out is where the evidence gap hurts. The arithmetic is easy; proving later that the payment was approved, evidenced and correctly net of TDS is the part that fails an audit.

**Workflow:** Bill or bill received → Purpose and approval confirmed → TDS applied → Voucher or recipient acknowledgement recorded → Payment made and reconciled to bank

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
Payment Number,Payment Date,Paid To,Purpose,Payment Mode,Cash/Bank Account,Reference (Cheque/UTR/ID),Gross Amount,TDS Rate %,TDS Deducted,Net Amount Paid,TDS Payable Ledger,Purchase Invoice Allocated,Advance Adjusted,Voucher Number,Voucher Type,Recipient Acknowledgement Ref,Approved By,Ledger Account,Source Document,Reconciliation Status,Entry Verified,Notes,Payment ID
PAY-2026-0288,2026-08-20,Bluepeak Supplies,Settlement of INV-8841,Bank Transfer,HDFC Current ****0042,UTR-2026-0912,97597.50,2.5,2112.50,95485.00,TDS Payable - Contractors,PUR-2026-0041,12000.00,VCH-2026-1031,Payment Voucher,ACK-BPS-8841,Vikram Singh,Bank - HDFC Current,DOC-2026-0442,Reconciled,Done,"TDS deducted at 2.5% and carried to the TDS register; 12000.00 of the settlement adjusts the earlier advance.",
```

```sql
CREATE TABLE payment_accounting (
  payment_number VARCHAR(255),
  payment_date DATE NOT NULL,
  paid_to VARCHAR(255),
  purpose VARCHAR(255),
  payment_mode VARCHAR(100) NOT NULL,
  cash_bank_account VARCHAR(255),
  reference_cheque_utr_id VARCHAR(255),
  gross_amount NUMERIC(14,2) NOT NULL,
  tds_rate_pct NUMERIC NOT NULL,
  tds_deducted NUMERIC(14,2) NOT NULL,
  net_amount_paid NUMERIC(14,2) NOT NULL,
  tds_payable_ledger VARCHAR(255),
  purchase_invoice_allocated VARCHAR(255),  -- relation -> target record
  advance_adjusted NUMERIC(14,2) NOT NULL,
  voucher_number VARCHAR(255),
  voucher_type VARCHAR(100) NOT NULL,
  recipient_acknowledgement_ref VARCHAR(255),
  approved_by VARCHAR(255),
  ledger_account VARCHAR(255),
  source_document VARCHAR(255),  -- relation -> target record
  reconciliation_status VARCHAR(100) NOT NULL,
  entry_verified VARCHAR(100) NOT NULL,
  notes TEXT,
  payment_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Payment Accounting",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Payment Number": { "type": "string" },
      "Payment Date": { "type": "string", "format": "date" },
      "Paid To": { "type": "string" },
      "Purpose": { "type": "string" },
      "Payment Mode": { "type": "string" },
      "Cash/Bank Account": { "type": "string" },
      "Reference (Cheque/UTR/ID)": { "type": "string" },
      "Gross Amount": { "type": "number" },
      "TDS Rate %": { "type": "number" },
      "TDS Deducted": { "type": "number" },
      "Net Amount Paid": { "type": "number" },
      "TDS Payable Ledger": { "type": "string" },
      "Purchase Invoice Allocated": { "type": "string" },
      "Advance Adjusted": { "type": "number" },
      "Voucher Number": { "type": "string" },
      "Voucher Type": { "type": "string" },
      "Recipient Acknowledgement Ref": { "type": "string" },
      "Approved By": { "type": "string" },
      "Ledger Account": { "type": "string" },
      "Source Document": { "type": "string" },
      "Reconciliation Status": { "type": "string" },
      "Entry Verified": { "type": "string" },
      "Notes": { "type": "string" },
      "Payment ID": { "type": "integer" }
  },
  "required": [
      "Payment Date",
      "Payment Mode",
      "Gross Amount",
      "TDS Rate %",
      "TDS Deducted",
      "Net Amount Paid",
      "Advance Adjusted",
      "Voucher Type",
      "Reconciliation Status",
      "Entry Verified"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Payment Number | Title | Use as the database title |
| Payment Date | Date | Convert to Date |
| Paid To | Text | Leave as Text |
| Purpose | Text | Leave as Text |
| Payment Mode | Select (add options after import) | Convert to Select, add options: "Cash", "Bank Transfer", "Cheque", "Digital Payment" |
| Cash/Bank Account | Text | Leave as Text |
| Reference (Cheque/UTR/ID) | Text | Leave as Text |
| Gross Amount | Number (format: currency) | Convert to Number, set format to Currency |
| TDS Rate % | Number | Convert to Number |
| TDS Deducted | Number (format: currency) | Convert to Number, set format to Currency |
| Net Amount Paid | Number (format: currency) | Convert to Number, set format to Currency |
| TDS Payable Ledger | Text | Leave as Text |
| Purchase Invoice Allocated | Relation (link to the target database) | Convert to Relation, link to the target database |
| Advance Adjusted | Number (format: currency) | Convert to Number, set format to Currency |
| Voucher Number | Text | Leave as Text |
| Voucher Type | Select (add options after import) | Convert to Select, add options: "Payment Voucher", "Recipient Acknowledgement", "Bank Advice", "None Available" |
| Recipient Acknowledgement Ref | Text | Leave as Text |
| Approved By | Text | Leave as Text |
| Ledger Account | Text | Leave as Text |
| Source Document | Relation (link to the target database) | Convert to Relation, link to the target database |
| Reconciliation Status | Select (add options after import) | Convert to Select, add options: "Unreconciled", "Reconciled", "Difference" |
| Entry Verified | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Payment ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`, and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Payment Number | `text` | `VARCHAR(255)` | `string` | Text | `PAY-2026-0288` |
| 2 | Payment Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-20` |
| 3 | Paid To | `text` | `VARCHAR(255)` | `string` | Text | `Bluepeak Supplies` |
| 4 | Purpose | `text` | `VARCHAR(255)` | `string` | Text | `Settlement of INV-8841` |
| 5 | Payment Mode | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Bank Transfer` |
| 6 | Cash/Bank Account | `text` | `VARCHAR(255)` | `string` | Text | `HDFC Current ****0042` |
| 7 | Reference (Cheque/UTR/ID) | `text` | `VARCHAR(255)` | `string` | Text | `UTR-2026-0912` |
| 8 | Gross Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `97597.50` |
| 9 | TDS Rate % | `number` | `NUMERIC` | `number` | Number | `2.5` |
| 10 | TDS Deducted | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2112.50` |
| 11 | Net Amount Paid | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `95485.00` |
| 12 | TDS Payable Ledger | `text` | `VARCHAR(255)` | `string` | Text | `TDS Payable - Contractors` |
| 13 | Purchase Invoice Allocated | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `PUR-2026-0041` |
| 14 | Advance Adjusted | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `12000.00` |
| 15 | Voucher Number | `text` | `VARCHAR(255)` | `string` | Text | `VCH-2026-1031` |
| 16 | Voucher Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Payment Voucher` |
| 17 | Recipient Acknowledgement Ref | `text` | `VARCHAR(255)` | `string` | Text | `ACK-BPS-8841` |
| 18 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 19 | Ledger Account | `text` | `VARCHAR(255)` | `string` | Text | `Bank - HDFC Current` |
| 20 | Source Document | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `DOC-2026-0442` |
| 21 | Reconciliation Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Reconciled` |
| 22 | Entry Verified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Done` |
| 23 | Notes | `long_text` | `TEXT` | `string` | Text | `TDS deducted at 2.5% and carried to the TDS register; 12000.00 of the settlement adjusts the earlier advance.` |
| 24 | Payment ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Payment Mode**

```
Cash | Bank Transfer | Cheque | Digital Payment
```
**Voucher Type**

```
Payment Voucher | Recipient Acknowledgement | Bank Advice | None Available
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

Link fields: `Purchase Invoice Allocated`, `Source Document`

`Purchase Invoice Allocated` points at the purchase book, so the payment and the bill it
settles sit on one row. `Source Document` points at the filing register, so the invoice or
bill behind the payment is retrievable. A payment allocated to an invoice still needs
`Voucher Type` - allocation proves what it was for, not that it was evidenced.

## Examples

**Prompt**

```
We pay suppliers on the last day of the month and nobody can show the TDS we deducted.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many payments in a month?
> **A:** Sixty, maybe seventy.
>
> **Q:** Is a voucher always raised?
> **A:** No. For a few we just have an email saying the money went.
>
> **Q:** TDS - filed how often?
> **A:** Once a quarter, at the end.

**Recommended next step** - offered, not built:

> One payment record carrying the payee, the purpose, the mode, gross less TDS as the net paid, the invoice it clears and the evidence reference - and where no voucher exists, record the recipient's acknowledgement instead of leaving the evidence blank.
>
> Workflow: Bill or bill received → Purpose and approval confirmed → TDS applied → Voucher or recipient acknowledgement recorded → Payment made and reconciled to bank
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep the arithmetic visible: gross amount - TDS deducted = net amount paid, every row.
  Where it does not hold, the row is still open.
- `Advance Adjusted` is a reclassification, not a second deduction. It is the part of the
  settlement that comes off an advance already carried in the books, so net amount paid is
  still gross amount less TDS deducted.
- Set `Voucher Type` on every payment. `None Available` is a legitimate answer; a blank is
  not. If it is an acknowledgement, put its reference in
  `Recipient Acknowledgement Ref`.
- Deduct TDS before the money leaves, not at filing time. Carry it to a named payable
  ledger so the TDS return can be built from the register.
- Record the payment mode and the bank reference on every row. That pair is what
  reconciliation is run on.
- Record `Cash/Bank Account` masked - the bank and the last four digits is all a register
  needs, and the full number is what turns a register into a target.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not move money, approve payments or file returns.
- The TDS rate and section are the user's call and change with the law. Nothing here is tax
  advice; a qualified accountant confirms the rate, the base and the due date.
- Recipient acknowledgements are weaker evidence than a voucher. Record them honestly
  rather than presenting one as the other.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Does not connect to a bank feed or initiate a payment.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real payee bank details, PAN numbers or vendor financials. Placeholders only.
- Label example rows as synthetic, and keep bank details masked.
- A payments register is sensitive. Do not paste live UTR references, cheque images or
  recipient bank details into a chat.
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
- **Problem:** a receipt note is used as the voucher for every payment.
  **Solution:** that is not evidence of payment. Capture the recipient's acknowledgement
  as its own `Voucher Type` with its own reference.
- **Problem:** TDS is worked out at filing time, so the payable never ties to the register.
  **Solution:** deduct at the payment, name the payable ledger, reconcile monthly.
- **Problem:** net paid does not equal gross less TDS.
  **Solution:** the payment is unreconciled. Fix it before the row is marked `Done`.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other 15 modules.
- @purchase-accounting - the invoice side of `Purchase Invoice Allocated`.
- @receipt-accounting - the other half of the cash and bank movement.
- @tds-booking-payment - takes the deducted TDS through to the return.
- @source-document-filing - holds the `Source Document` target.
- @expense-accounting - the payments with no supplier invoice behind them.
- @salary-wage-accounting - the other recurring payment run, with its own evidence rules.
- @day-book - the daily book these payments land in.
- @party-ledger-reconciliation - proves the supplier balance after allocation.
- @monthly-closing-statements - where the TDS payable and the vendor balances are proved.
- @audit-preparation - the payment register is a primary audit-trail item.
- @accounting-software-selection - decides which voucher formats the software accepts.

## Reusable Prompt

```
I want to set up payment accounting - every payment, its purpose, its mode, the TDS
deducted, the evidence behind it and its reconciliation to bank - for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
