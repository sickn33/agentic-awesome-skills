---
name: petty-cash-management
description: 'Petty cash register: entry number, date and type, payee and purpose, cash in and out, running balance, cash limit flag, custodian, physical count and variance. Use for petty cash.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, petty-cash, cash-control]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Petty Cash Management

**What it is:** Imprest cash, every movement supported, and the physical count reconciled to the register.

## Overview

Works out the smallest useful **Petty Cash Management** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Cash. Fits: Starter stage. Table code: n/a.

**The control this table exists to enforce:** petty cash is only controlled by two things -
a fixed limit and a periodic count. The limit is on the float, not on each payment, and
every payment carries a supporting document and a voucher. The reconciliation identity is
fixed and is checked at every count:

```
Opening Cash + Receipts and Replenishment - Payments = Closing Cash
```

The physical count must equal closing cash. Any difference is recorded as a variance, an
investigation and a status, not absorbed quietly.

The identity is computed on a `Count` entry row, not on a payment row: `Cash In` and
`Cash Out` hold the period's replenishment and payments, `Running Cash Balance` is the
closing balance per the register, and `Physical Count` is the money actually in the box.

## When to Use This Skill

- petty cash register
- imprest cash book
- small cash payments log
- cash box count sheet
- petty cash replenishment tracker

Also use it when the user says "imprest cash, every movement supported, and the physical count reconciled to the register", or describes the same process happening in a
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

> **Q:** Who holds your petty cash today, and is there a limit on it?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Limit** - Float amount agreed? / Reset by replenishment or topped up? / Can it go over?
- **Custodian** - One named person? / Approver separate from holder? / Left on holiday?
- **Payments and counting** - What gets paid from it? / Voucher raised each time? /
  Supporting document? / How often counted? / Who counts - custodian or someone else? /
  Last difference?
- **Current process** - Register today? / Envelope, box or ledger? / What goes missing?
- **Outcome** - What do you need? / A register, a count sheet or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: petty-cash-management
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Limit": null
  "Custodian": null
  "Payments and counting": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One imprest register with a named custodian, a fixed float, a running balance on every entry, a supporting document type on every payment, and a count line that closes the register against the physical money.

**Why this one:** A petty cash float leaks slowly and is only ever caught by counting it. The register without the count is a diary; the count without the register is an argument.

**Workflow:** Payment made against a document → Voucher raised and approved → Running balance updated → Replenishment raised separately → Physical count → Variance recorded and investigated

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
Entry Number,Entry Date,Entry Type,Payee,Purpose,Cash Out,Cash In,Running Cash Balance,Cash Limit,Within Limit,Custodian,Supporting Document,Document Reference,Voucher Number,Approved By,Physical Count Date,Physical Count,Count Variance,Variance Status,Investigation Notes,Ledger Account,Entry Verified,Notes,Petty Cash ID
PC-2026-0188,2026-08-31,Count,Several payees,Courier and postage paid from the float during August,7250.00,7000.00,2250.00,10000.00,Yes,Rohit Menon,Bill/Invoice,BILL-4471,VCH-2026-1044,Ananya Rao,2026-08-31,2100.00,150.00,Short,Count 150.00 short of the register; a courier bill of that amount may have been entered but not paid. Under investigation with the approver.,Petty Cash,In progress,Count sheet CNT-2026-08-31 signed by custodian and approver; replenishment drawn from bank on 01 Aug.,
```

```sql
CREATE TABLE petty_cash_management (
  entry_number VARCHAR(255),
  entry_date DATE NOT NULL,
  entry_type VARCHAR(100) NOT NULL,
  payee VARCHAR(255),
  purpose VARCHAR(255),
  cash_out NUMERIC(14,2) NOT NULL,
  cash_in NUMERIC(14,2) NOT NULL,
  running_cash_balance NUMERIC(14,2) NOT NULL,
  cash_limit NUMERIC(14,2) NOT NULL,
  within_limit VARCHAR(100) NOT NULL,
  custodian VARCHAR(255),
  supporting_document VARCHAR(100) NOT NULL,
  document_reference VARCHAR(255),
  voucher_number VARCHAR(255),
  approved_by VARCHAR(255),
  physical_count_date DATE,
  physical_count NUMERIC(14,2),
  count_variance NUMERIC(14,2),
  variance_status VARCHAR(100) NOT NULL,
  investigation_notes TEXT,
  ledger_account VARCHAR(255),
  entry_verified VARCHAR(100) NOT NULL,
  notes TEXT,
  petty_cash_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```


```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Petty Cash Management",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Entry Number": { "type": "string" },
      "Entry Date": { "type": "string", "format": "date" },
      "Entry Type": { "type": "string" },
      "Payee": { "type": "string" },
      "Purpose": { "type": "string" },
      "Cash Out": { "type": "number" },
      "Cash In": { "type": "number" },
      "Running Cash Balance": { "type": "number" },
      "Cash Limit": { "type": "number" },
      "Within Limit": { "type": "string" },
      "Custodian": { "type": "string" },
      "Supporting Document": { "type": "string" },
      "Document Reference": { "type": "string" },
      "Voucher Number": { "type": "string" },
      "Approved By": { "type": "string" },
      "Physical Count Date": { "type": "string", "format": "date" },
      "Physical Count": { "type": "number" },
      "Count Variance": { "type": "number" },
      "Variance Status": { "type": "string" },
      "Investigation Notes": { "type": "string" },
      "Ledger Account": { "type": "string" },
      "Entry Verified": { "type": "string" },
      "Notes": { "type": "string" },
      "Petty Cash ID": { "type": "integer" }
  },
  "required": [
      "Entry Date",
      "Entry Type",
      "Cash Out",
      "Cash In",
      "Running Cash Balance",
      "Cash Limit",
      "Within Limit",
      "Supporting Document",
      "Variance Status",
      "Entry Verified"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Entry Number | Title | Use as the database title |
| Entry Date | Date | Convert to Date |
| Entry Type | Select (add options after import) | Convert to Select, add options: "Payment", "Replenishment", "Receipt", "Count" |
| Payee | Text | Leave as Text |
| Purpose | Text | Leave as Text |
| Cash Out | Number (format: currency) | Convert to Number, set format to Currency |
| Cash In | Number (format: currency) | Convert to Number, set format to Currency |
| Running Cash Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Cash Limit | Number (format: currency) | Convert to Number, set format to Currency |
| Within Limit | Select (add options after import) | Convert to Select, add options: "Yes", "No" |
| Custodian | Text | Leave as Text |
| Supporting Document | Select (add options after import) | Convert to Select, add options: "Bill/Invoice", "Receipt Note", "Wage Sheet", "Rent Record", "Payment Voucher", "Other" |
| Document Reference | Text | Leave as Text |
| Voucher Number | Text | Leave as Text |
| Approved By | Text | Leave as Text |
| Physical Count Date | Date | Convert to Date |
| Physical Count | Number (format: currency) | Convert to Number, set format to Currency |
| Count Variance | Number (format: currency) | Convert to Number, set format to Currency |
| Variance Status | Select (add options after import) | Convert to Select, add options: "Not counted", "Matched", "Short", "Over", "Under Investigation" |
| Investigation Notes | Text | Leave as Text |
| Ledger Account | Text | Leave as Text |
| Entry Verified | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Petty Cash ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`, and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Entry Number | `text` | `VARCHAR(255)` | `string` | Text | `PC-2026-0188` |
| 2 | Entry Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-31` |
| 3 | Entry Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Count` |
| 4 | Payee | `text` | `VARCHAR(255)` | `string` | Text | `Several payees` |
| 5 | Purpose | `text` | `VARCHAR(255)` | `string` | Text | `Courier and postage paid from the float during August` |
| 6 | Cash Out | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `7250.00` |
| 7 | Cash In | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `7000.00` |
| 8 | Running Cash Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2250.00` |
| 9 | Cash Limit | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `10000.00` |
| 10 | Within Limit | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 11 | Custodian | `text` | `VARCHAR(255)` | `string` | Text | `Rohit Menon` |
| 12 | Supporting Document | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Bill/Invoice` |
| 13 | Document Reference | `text` | `VARCHAR(255)` | `string` | Text | `BILL-4471` |
| 14 | Voucher Number | `text` | `VARCHAR(255)` | `string` | Text | `VCH-2026-1044` |
| 15 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 16 | Physical Count Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-31` |
| 17 | Physical Count | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `2100.00` |
| 18 | Count Variance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `150.00` |
| 19 | Variance Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Short` |
| 20 | Investigation Notes | `long_text` | `TEXT` | `string` | Text | `Count 150.00 short of the register; a courier bill of that amount may have been entered but not paid. Under investigation with the approver.` |
| 21 | Ledger Account | `text` | `VARCHAR(255)` | `string` | Text | `Petty Cash` |
| 22 | Entry Verified | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 23 | Notes | `long_text` | `TEXT` | `string` | Text | `Count sheet CNT-2026-08-31 signed by custodian and approver; replenishment drawn from bank on 01 Aug.` |
| 24 | Petty Cash ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Entry Type**

```
Payment | Replenishment | Receipt | Count
```
**Within Limit**

```
Yes | No
```
**Supporting Document**

```
Bill/Invoice | Receipt Note | Wage Sheet | Rent Record | Payment Voucher | Other
```
**Variance Status**

```
Not counted | Matched | Short | Over | Under Investigation
```
**Entry Verified**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: none

`Custodian`, `Payee` and `Document Reference` are free text. The petty cash register is
deliberately standalone; it is the cash side of `day-book` and the evidence side of
`expense-accounting`, and both of those reference it rather than the other way round.

## Examples

**Prompt**

```
Petty cash keeps running out before the month ends and we never know by how much.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Who holds it, and is there a limit?
> **A:** Our admin. There is a limit, I think, but nobody checks it.
>
> **Q:** How often is it counted?
> **A:** At month end, by me.
>
> **Q:** Voucher each time?
> **A:** For most of it. Some are just small.

**Recommended next step** - offered, not built:

> One imprest register with a named custodian, a fixed float, a running balance on every entry, a supporting document type on every payment, and a count line that closes the register against the physical money.
>
> Workflow: Payment made against a document → Voucher raised and approved → Running balance updated → Replenishment raised separately → Physical count → Variance recorded and investigated
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Reconcile on the fixed identity: opening cash + receipts and replenishment - payments =
  closing cash. Compute it at every count, not at year end.
- Keep the running balance under the limit. A float that is topped up only when it is empty
  is a float that is out of control; `Within Limit` = `No` means raise the replenishment.
- The limit is on the float. `Within Limit` is a warning to replenish, not a reason to
  stop recording the payment.
- Record replenishments as their own entry type. A replenishment mixed into a payment
  hides the expense.
- Never adjust the register to match the money. Record the variance, set the status, and
  write the investigation down in `Investigation Notes`.
- Count the cash with someone other than the custodian where you can. It costs nothing and
  it changes the conversation.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not hold, disburse or approve cash, and it does not connect
  to a till or a bank.
- The count is periodic by design, not optional. A register with no count is a diary, and
  the day the count is skipped is the day a shortage becomes invisible.
- The count fields stay empty until the count happens; `Variance Status` is what carries the
  state in the meantime. Do not fill a count in advance to make the row look complete.
- A variance is a record, not a conclusion. Only a human can decide whether it is a
  counting error, a timing difference or a loss.
- Where the tax rules do not allow a particular internal document, an internal document is
  not acceptable evidence. Check the local position.
- Notion relations do not apply here - there are no relations to set up.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real custodian names, salary figures or cash amounts. Placeholders only.
- Label example rows as synthetic.
- Petty cash is the highest-risk line in a small business for skimming. Do not paste real
  count sheets, custodian details or incident notes into a chat.
- A shortage is a matter for a human conversation, not a spreadsheet correction. Never
  suggest adjusting the register to make a variance disappear.
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
- **Problem:** the custodian counts their own cash and signs it off.
  **Solution:** a second person at the count. The limit and the count are the only two
  controls this float has.
- **Problem:** a shortage is fixed by editing the running balance.
  **Solution:** record the variance, set `Short` or `Under Investigation`, and document it.
- **Problem:** replenishments are entered as payments.
  **Solution:** use `Replenishment` as the entry type so the expense stays visible.
- **Problem:** a payment is recorded with no supporting document type.
  **Solution:** `Supporting Document` is required - the options exist because these
  documents are acceptable where the tax rules allow, and only there.
- **Problem:** the count is compared against a payment row instead of a count row.
  **Solution:** put the period's totals on a `Count` row and compare the register there, or
  the two sides of the identity are measured on different rows.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other 15 modules.
- @day-book - the daily cash book the float is counted into.
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/payment-accounting/SKILL.md) - the replenishment, when it is made from bank.
- @expense-accounting - where the expenses paid from the float are classified.
- @source-document-filing - where the supporting documents behind each entry are held.
- @salary-wage-accounting - wage sheets are one of the acceptable petty cash documents.
- @receipt-accounting - cash received into the float, if the business does that.
- @monthly-closing-statements - where the counted balance is proved at period end.
- @audit-preparation - count sheets and custodian sign-off are audit-trail items.
- @inventory-stock-reconciliation - the same count-and-investigate discipline applied to stock.
- @party-ledger-reconciliation - proves payee balances where the float paid a supplier.

## Reusable Prompt

```
I want to set up petty cash management for my company - a fixed imprest float, a named
custodian, a supporting document on every payment, and a physical count reconciled to the
register.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
