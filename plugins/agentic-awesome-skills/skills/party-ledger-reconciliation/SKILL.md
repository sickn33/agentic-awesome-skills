---
name: party-ledger-reconciliation
description: 'Party ledger reconciliation: party type, name and PAN/VAT, ledger against statement balance, difference and reason, duplicates, confirmation status and adjustment. Use for balance checks.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, reconciliation]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Party / Ledger Reconciliation

**What it is:** Customer and supplier balances proved against statements, differences found and adjustment entries passed.

## Overview

Works out the smallest useful **Party / Ledger Reconciliation** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Run it monthly, or more often for the high-volume and high-value parties. A balance that is
only checked at year end is a balance nobody can prove.

Layer: Layer 7: Reconcile. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- customer balance confirmation
- supplier statement reconciliation
- debtor ledger check
- accounts confirmation

Also use it when the user says "customer and supplier balances proved against statements, differences found and adjustment entries passed", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: posting routine sales or purchase entries, tax filing, or legal advice.
This skill produces empty templates only - it never holds or processes real employee or
customer data.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> the user wants artifacts; go to Step 2.
- "our process is ..." or "it is in a sheet" -> the user wants to move an existing process; capture it, then Step 2.
- "is this right" or "review" or "audit" -> the user wants a check, not a build; answer from what they share.
- "how do I ..." -> advice question; answer directly and offer the build only if it helps.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** How often do you check a customer's balance against their statement?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Parties** - How many customers and suppliers? / Which ones are high value? / Any on credit terms?
- **Balances** - Ledger balances maintained? / Statements received from parties? / Who prepares them?
- **Confirmations** - Do you send balance confirmations? / Who signs off? / How are disputes handled?
- **Adjustments** - Who can pass an adjustment entry? / What needs verification first?
- **Outcome** - What do you need? / A reconciliation record, a confirmation log or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: party-ledger-reconciliation
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Parties": null
  "Balances": null
  "Confirmations": null
  "Adjustments": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One reconciliation record per party per period, holding the ledger balance, the statement balance, the difference, the reason for it and the adjustment entry that clears it.

**Why this one:** Most party disputes are proof problems, not arithmetic problems. Holding both balances and the reason on one record makes the difference explainable instead of arguable.

**Workflow:** Ledger balance agreed → Statement requested → Difference investigated → Confirmation sent → Adjustment passed

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/notion-manual-import/SKILL.md): it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

```csv
Reconciliation Number,Period Start,Period End,Party Type,Party Name,Party PAN/VAT,Ledger Balance,Statement Balance,Difference,Missing Invoices,Missing Receipts/Payments,Duplicate Entries,Credit/Debit Notes,Unadjusted Advances,Confirmation Sent,Confirmation Date,Confirmation Status,Difference Reason,Adjustment Required,Adjustment Entry,Adjustment Date,Adjusted By,Reconciliation Frequency,Reviewed By,Status,Notes,Reconciliation ID
REC-2026-0044,2026-08-01,2026-08-31,Customer/Debtor,Greyson Foods,33CDEFG9012H1Z9,486200.00,471200.00,15000.00,1,2,3,4500.00,15000.00,Yes,2026-09-03,Partially Confirmed,Advance held in our books but not credited by the party,Yes,ADJ-2026-0118,2026-09-05,Sneha Iyer,Monthly,Vikram Singh,In progress,"2 missing receipts, 3 duplicate entries and a 4500.00 credit note cleared on both sides; difference matches the unadjusted advance, adjustment raised and pending review.",
```

```sql
CREATE TABLE party_ledger_reconciliation (
  reconciliation_number VARCHAR(255),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  party_type VARCHAR(100) NOT NULL,
  party_name VARCHAR(255),
  party_pan_vat VARCHAR(255),
  ledger_balance NUMERIC(14,2) NOT NULL,
  statement_balance NUMERIC(14,2) NOT NULL,
  difference NUMERIC(14,2) NOT NULL,
  missing_invoices NUMERIC,
  missing_receipts_payments NUMERIC,
  duplicate_entries NUMERIC,
  credit_debit_notes NUMERIC(14,2),
  unadjusted_advances NUMERIC(14,2),
  confirmation_sent VARCHAR(100),
  confirmation_date DATE,
  confirmation_status VARCHAR(100) NOT NULL,
  difference_reason VARCHAR(255),
  adjustment_required VARCHAR(100) NOT NULL,
  adjustment_entry VARCHAR(255),
  adjustment_date DATE,
  adjusted_by VARCHAR(255),
  reconciliation_frequency VARCHAR(100),
  reviewed_by VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  reconciliation_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_party_ledger_reconciliation_status ON party_ledger_reconciliation (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Party / Ledger Reconciliation",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Reconciliation Number": { "type": "string" },
      "Period Start": { "type": "string", "format": "date" },
      "Period End": { "type": "string", "format": "date" },
      "Party Type": { "type": "string" },
      "Party Name": { "type": "string" },
      "Party PAN/VAT": { "type": "string" },
      "Ledger Balance": { "type": "number" },
      "Statement Balance": { "type": "number" },
      "Difference": { "type": "number" },
      "Missing Invoices": { "type": "number" },
      "Missing Receipts/Payments": { "type": "number" },
      "Duplicate Entries": { "type": "number" },
      "Credit/Debit Notes": { "type": "number" },
      "Unadjusted Advances": { "type": "number" },
      "Confirmation Sent": { "type": "string" },
      "Confirmation Date": { "type": "string", "format": "date" },
      "Confirmation Status": { "type": "string" },
      "Difference Reason": { "type": "string" },
      "Adjustment Required": { "type": "string" },
      "Adjustment Entry": { "type": "string" },
      "Adjustment Date": { "type": "string", "format": "date" },
      "Adjusted By": { "type": "string" },
      "Reconciliation Frequency": { "type": "string" },
      "Reviewed By": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Reconciliation ID": { "type": "integer" }
  },
  "required": [
      "Period Start",
      "Period End",
      "Party Type",
      "Ledger Balance",
      "Statement Balance",
      "Difference",
      "Confirmation Status",
      "Adjustment Required",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Reconciliation Number | Title | Use as the database title |
| Period Start | Date | Convert to Date |
| Period End | Date | Convert to Date |
| Party Type | Select (add options after import) | Convert to Select, add options: "Customer/Debtor", "Supplier/Creditor", "Employee", "Bank", "Other" |
| Party Name | Text | Leave as Text |
| Party PAN/VAT | Text | Leave as Text |
| Ledger Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Statement Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Difference | Number (format: currency) | Convert to Number, set format to Currency |
| Missing Invoices | Number | Convert to Number |
| Missing Receipts/Payments | Number | Convert to Number |
| Duplicate Entries | Number | Convert to Number |
| Credit/Debit Notes | Number (format: currency) | Convert to Number, set format to Currency |
| Unadjusted Advances | Number (format: currency) | Convert to Number, set format to Currency |
| Confirmation Sent | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Not Required" |
| Confirmation Date | Date | Convert to Date |
| Confirmation Status | Select (add options after import) | Convert to Select, add options: "Not Sent", "Sent", "Confirmed", "Partially Confirmed", "Disputed", "No Response" |
| Difference Reason | Text | Leave as Text |
| Adjustment Required | Select (add options after import) | Convert to Select, add options: "Yes", "No" |
| Adjustment Entry | Text | Leave as Text |
| Adjustment Date | Date | Convert to Date |
| Adjusted By | Text | Leave as Text |
| Reconciliation Frequency | Select (add options after import) | Convert to Select, add options: "Monthly", "Quarterly", "Half-Yearly", "Annual" |
| Reviewed By | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Reconciliation ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Reconciliation Number | `text` | `VARCHAR(255)` | `string` | Text | `REC-2026-0044` |
| 2 | Period Start | `date` | `DATE` | `string, format: date` | Date | `2026-08-01` |
| 3 | Period End | `date` | `DATE` | `string, format: date` | Date | `2026-08-31` |
| 4 | Party Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Customer/Debtor` |
| 5 | Party Name | `text` | `VARCHAR(255)` | `string` | Text | `Greyson Foods` |
| 6 | Party PAN/VAT | `text` | `VARCHAR(255)` | `string` | Text | `33CDEFG9012H1Z9` |
| 7 | Ledger Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `486200.00` |
| 8 | Statement Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `471200.00` |
| 9 | Difference | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `15000.00` |
| 10 | Missing Invoices | `number` | `NUMERIC` | `number` | Number | `1` |
| 11 | Missing Receipts/Payments | `number` | `NUMERIC` | `number` | Number | `2` |
| 12 | Duplicate Entries | `number` | `NUMERIC` | `number` | Number | `3` |
| 13 | Credit/Debit Notes | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `4500.00` |
| 14 | Unadjusted Advances | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `15000.00` |
| 15 | Confirmation Sent | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 16 | Confirmation Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-03` |
| 17 | Confirmation Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Partially Confirmed` |
| 18 | Difference Reason | `text` | `VARCHAR(255)` | `string` | Text | `Advance held in our books but not credited by the party` |
| 19 | Adjustment Required | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 20 | Adjustment Entry | `text` | `VARCHAR(255)` | `string` | Text | `ADJ-2026-0118` |
| 21 | Adjustment Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-05` |
| 22 | Adjusted By | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 23 | Reconciliation Frequency | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Monthly` |
| 24 | Reviewed By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 25 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 26 | Notes | `long_text` | `TEXT` | `string` | Text | `2 missing receipts, 3 duplicate entries and a 4500.00 credit note cleared on both sides; difference matches the unadjusted advance, adjustment raised and pending review.` |
| 27 | Reconciliation ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Party Type**

```
Customer/Debtor | Supplier/Creditor | Employee | Bank | Other
```
**Confirmation Sent**

```
Yes | No | Not Required
```
**Confirmation Status**

```
Not Sent | Sent | Confirmed | Partially Confirmed | Disputed | No Response
```
**Adjustment Required**

```
Yes | No
```
**Reconciliation Frequency**

```
Monthly | Quarterly | Half-Yearly | Annual
```
**Status**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Our biggest customer says we owe them less than our books show and we cannot prove either figure.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many parties need this?
> **A:** Four customers and eleven suppliers.
>
> **Q:** Do you get statements from them?
> **A:** Only from the big ones, and they are often months old.
>
> **Q:** Who passes the correction entry?
> **A:** Our accountant, after I send her the working.

**Recommended next step** - offered, not built:

> One reconciliation record per party per period, holding the ledger balance, the statement balance, the difference, the reason for it and the adjustment entry that clears it.
>
> Workflow: Ledger balance agreed → Statement requested → Difference investigated → Confirmation sent → Adjustment passed
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- Never pass an adjustment entry while the difference is still unexplained. Record the reason first.
- Reconcile high-value parties monthly even when the rest can wait a quarter.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not compute balances, post entries or contact parties.
- It does not send balance confirmations and it does not chase a statement. Those are people tasks.
- A clean reconciliation is not proof the party agrees. That is what the confirmation fields are for.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Does not give tax, audit or legal advice.

## Security & Safety Notes

- Never fill in real names, PAN numbers, bank details or customer data. Placeholders only.
- Label example rows as synthetic, and keep party tax identifiers masked until needed.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If the user pastes real customer or supplier data, generate the template and tell them to
  delete the pasted data from the conversation.
- Adjustments and disputed balances need a qualified human reviewer before anything is acted
  on.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** the difference is zero, so the record is marked Done without a review.
  **Solution:** a nil difference still needs a named reviewer and a reason recorded.
- **Problem:** an unexplained difference gets closed by writing off the balance.
  **Solution:** write-offs are adjustments with their own evidence. Record the reason, not just
  the correction.
- **Problem:** built a full system when one table was asked for.
  **Solution:** build what was requested; mention the parent skill separately.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other accounting modules.
- @sales-accounting - raises the invoices that make up the debtor balance.
- @receipt-accounting - records the receipts that should clear that balance.
- @credit-cycle-analysis - reads the aging that tells you which parties to chase first.
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/monthly-closing-statements/SKILL.md) - pulls the ledger totals this reconciliation compares against.

## Reusable Prompt

```
I want to set up customer and supplier balances proved against statements, differences found and adjustment entries passed for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
