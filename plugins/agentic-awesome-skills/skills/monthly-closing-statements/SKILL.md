---
name: monthly-closing-statements
description: 'Monthly closing register: period dates, cash/bank/party/inventory/TDS reconciliation flags, profit, receivables, payables, working capital, open adjustments and reviewer. Use for period close.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, closing]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Monthly Closing & Statements

**What it is:** The month-end checklist, the reconciliations it depends on, and the statements it produces.

## Overview

Works out the smallest useful **Monthly Closing & Statements** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Say this plainly at the start: the reconciliations are the hard part and the statements
follow them, never the other way round. Cash, bank, party ledgers, inventory, withholding
tax and every other statutory liability have to be agreed before a trial balance means
anything. The profit and loss account and the balance sheet are then a formatting job on
figures that are already proven - and a period cannot be closed while a reconciliation is
outstanding, no matter how complete the reporting pack looks.

This skill produces an empty template. It does not close your books, does not calculate
your trial balance and does not draw a balance sheet. It records the checklist, the
answers and the period figures so the close is repeatable and the next person can see
what was still open.

Layer: Layer 8: Close & Analyse. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- monthly closing checklist
- month-end reconciliation tracker
- trial balance preparation record
- monthly financial statements pack
- month-end analysis record

Also use it when the user says "the month-end checklist, the reconciliations it depends on, and the statements it produces", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: statutory filing, tax computation, or legal advice. This skill produces
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

> **Q:** What does your month-end close involve today, and how long does it take?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Close** - Who prepares and who reviews? / How long does it take? / Fixed target date?
- **Reconciliations** - Cash, bank, parties, inventory, TDS, VAT? / Which is the hard part?
- **Adjustments** - Depreciation? / Accruals and prepayments? / Provisions in use?
- **Output** - Trial balance, profit and loss, balance sheet? / Management reporting? / Any filing?
- **Outcome** - What do you need? / A closing checklist, a template or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: monthly-closing-statements
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Close": null
  "Reconciliations": null
  "Adjustments": null
  "Output": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One closing record per month that carries every reconciliation as an explicit answer before any statement is drawn, then the period figures and a short written read on the position, so the close is repeatable and the next person can see what was still open.

**Why this one:** The statements are the easy part. They are a formatting job on numbers the reconciliations have already proven, and a trial balance built on unreconciled balances is just arithmetic on top of errors. Putting the gates in the record is what stops a month being reported while cash, inventory or tax is still unagreed.

**Workflow:** Sales and purchase entries completed → Receipts and payments completed → Cash and bank reconciled → Party ledgers reconciled → Inventory reconciled → Statutory liabilities reconciled → Receivables and payables reviewed → Depreciation and adjustments recorded → Trial balance prepared → Statements prepared → Period analysed

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
Closing Number,Period Start,Period End,Entries Completed,Cash Reconciled,Bank Reconciled,Party Ledgers Reconciled,Inventory Reconciled,TDS Reconciled,Other Statutory Liabilities Reconciled,Receivables Reviewed,Payables Reviewed,Depreciation Recorded,Accruals & Prepayments Reviewed,VAT/Tax Account Reviewed,Trial Balance Prepared,Financial Statements Prepared,Revenue,Gross Profit,Net Profit/Loss,Receivables Outstanding,Payables Outstanding,Working Capital,Cash Flow Position,Financial Position,Open Adjustments,Closing Date,Prepared By,Reviewed By,Status,Notes,Closing ID
CL-2026-08,2026-08-01,2026-08-31,Complete,Yes,Yes,Yes,Yes,Yes,Yes,Yes,Yes,48200.00,Yes,Yes,Yes,Yes,4820000.00,1542400.00,612000.00,486200.00,394800.00,91400.00,1284500.00,"Solvent, working capital thin against a 42 day collection cycle.",3,2026-09-05,Ananya Rao,Vikram Singh,Done,Three accruals still open; statements marked draft until cleared.,
```

```sql
CREATE TABLE monthly_closing_statements (
  closing_number VARCHAR(255),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  entries_completed VARCHAR(100) NOT NULL,
  cash_reconciled VARCHAR(100) NOT NULL,
  bank_reconciled VARCHAR(100) NOT NULL,
  party_ledgers_reconciled VARCHAR(100) NOT NULL,
  inventory_reconciled VARCHAR(100) NOT NULL,
  tds_reconciled VARCHAR(100) NOT NULL,
  other_statutory_liabilities_reconciled VARCHAR(100) NOT NULL,
  receivables_reviewed VARCHAR(100) NOT NULL,
  payables_reviewed VARCHAR(100) NOT NULL,
  depreciation_recorded NUMERIC(14,2),
  accruals_prepayments_reviewed VARCHAR(100) NOT NULL,
  vat_tax_account_reviewed VARCHAR(100) NOT NULL,
  trial_balance_prepared VARCHAR(100) NOT NULL,
  financial_statements_prepared VARCHAR(100) NOT NULL,
  revenue NUMERIC(14,2) NOT NULL,
  gross_profit NUMERIC(14,2) NOT NULL,
  net_profit_loss NUMERIC(14,2) NOT NULL,
  receivables_outstanding NUMERIC(14,2),
  payables_outstanding NUMERIC(14,2),
  working_capital NUMERIC(14,2),
  cash_flow_position NUMERIC(14,2),
  financial_position TEXT,
  open_adjustments NUMERIC,
  closing_date DATE,
  prepared_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  closing_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_monthly_closing_statements_status ON monthly_closing_statements (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Monthly Closing & Statements",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Closing Number": { "type": "string" },
      "Period Start": { "type": "string", "format": "date" },
      "Period End": { "type": "string", "format": "date" },
      "Entries Completed": { "type": "string" },
      "Cash Reconciled": { "type": "string" },
      "Bank Reconciled": { "type": "string" },
      "Party Ledgers Reconciled": { "type": "string" },
      "Inventory Reconciled": { "type": "string" },
      "TDS Reconciled": { "type": "string" },
      "Other Statutory Liabilities Reconciled": { "type": "string" },
      "Receivables Reviewed": { "type": "string" },
      "Payables Reviewed": { "type": "string" },
      "Depreciation Recorded": { "type": "number" },
      "Accruals & Prepayments Reviewed": { "type": "string" },
      "VAT/Tax Account Reviewed": { "type": "string" },
      "Trial Balance Prepared": { "type": "string" },
      "Financial Statements Prepared": { "type": "string" },
      "Revenue": { "type": "number" },
      "Gross Profit": { "type": "number" },
      "Net Profit/Loss": { "type": "number" },
      "Receivables Outstanding": { "type": "number" },
      "Payables Outstanding": { "type": "number" },
      "Working Capital": { "type": "number" },
      "Cash Flow Position": { "type": "number" },
      "Financial Position": { "type": "string" },
      "Open Adjustments": { "type": "number" },
      "Closing Date": { "type": "string", "format": "date" },
      "Prepared By": { "type": "string" },
      "Reviewed By": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Closing ID": { "type": "integer" }
  },
  "required": [
      "Period Start",
      "Period End",
      "Entries Completed",
      "Cash Reconciled",
      "Bank Reconciled",
      "Party Ledgers Reconciled",
      "Inventory Reconciled",
      "TDS Reconciled",
      "Other Statutory Liabilities Reconciled",
      "Receivables Reviewed",
      "Payables Reviewed",
      "Accruals & Prepayments Reviewed",
      "VAT/Tax Account Reviewed",
      "Trial Balance Prepared",
      "Financial Statements Prepared",
      "Revenue",
      "Gross Profit",
      "Net Profit/Loss",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Closing Number | Title | Use as the database title |
| Period Start | Date | Convert to Date |
| Period End | Date | Convert to Date |
| Entries Completed | Select (add options after import) | Convert to Select, add options: "Complete", "Incomplete", "Blocked" |
| Cash Reconciled | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Bank Reconciled | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Party Ledgers Reconciled | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Inventory Reconciled | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| TDS Reconciled | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Other Statutory Liabilities Reconciled | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Receivables Reviewed | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Payables Reviewed | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Depreciation Recorded | Number (format: currency) | Convert to Number, set format to Currency |
| Accruals & Prepayments Reviewed | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| VAT/Tax Account Reviewed | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Trial Balance Prepared | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Financial Statements Prepared | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Pending" |
| Revenue | Number (format: currency) | Convert to Number, set format to Currency |
| Gross Profit | Number (format: currency) | Convert to Number, set format to Currency |
| Net Profit/Loss | Number (format: currency) | Convert to Number, set format to Currency |
| Receivables Outstanding | Number (format: currency) | Convert to Number, set format to Currency |
| Payables Outstanding | Number (format: currency) | Convert to Number, set format to Currency |
| Working Capital | Number (format: currency) | Convert to Number, set format to Currency |
| Cash Flow Position | Number (format: currency) | Convert to Number, set format to Currency |
| Financial Position | Text | Leave as Text |
| Open Adjustments | Number | Convert to Number |
| Closing Date | Date | Convert to Date |
| Prepared By | Text | Leave as Text |
| Reviewed By | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Closing ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Closing Number | `text` | `VARCHAR(255)` | `string` | Text | `CL-2026-08` |
| 2 | Period Start | `date` | `DATE` | `string, format: date` | Date | `2026-08-01` |
| 3 | Period End | `date` | `DATE` | `string, format: date` | Date | `2026-08-31` |
| 4 | Entries Completed | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Complete` |
| 5 | Cash Reconciled | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 6 | Bank Reconciled | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 7 | Party Ledgers Reconciled | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 8 | Inventory Reconciled | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 9 | TDS Reconciled | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 10 | Other Statutory Liabilities Reconciled | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 11 | Receivables Reviewed | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 12 | Payables Reviewed | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 13 | Depreciation Recorded | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `48200.00` |
| 14 | Accruals & Prepayments Reviewed | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 15 | VAT/Tax Account Reviewed | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 16 | Trial Balance Prepared | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 17 | Financial Statements Prepared | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Yes` |
| 18 | Revenue | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `4820000.00` |
| 19 | Gross Profit | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1542400.00` |
| 20 | Net Profit/Loss | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `612000.00` |
| 21 | Receivables Outstanding | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `486200.00` |
| 22 | Payables Outstanding | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `394800.00` |
| 23 | Working Capital | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `91400.00` |
| 24 | Cash Flow Position | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1284500.00` |
| 25 | Financial Position | `long_text` | `TEXT` | `string` | Text | `Solvent, working capital thin against a 42 day collection cycle.` |
| 26 | Open Adjustments | `number` | `NUMERIC` | `number` | Number | `3` |
| 27 | Closing Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-05` |
| 28 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 29 | Reviewed By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 30 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Done` |
| 31 | Notes | `long_text` | `TEXT` | `string` | Text | `Three accruals still open; statements marked draft until cleared.` |
| 32 | Closing ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Entries Completed**

```
Complete | Incomplete | Blocked
```
**Cash Reconciled**

```
Yes | No | Pending
```
**Bank Reconciled**

```
Yes | No | Pending
```
**Party Ledgers Reconciled**

```
Yes | No | Pending
```
**Inventory Reconciled**

```
Yes | No | Pending
```
**TDS Reconciled**

```
Yes | No | Pending
```
**Other Statutory Liabilities Reconciled**

```
Yes | No | Pending
```
**Receivables Reviewed**

```
Yes | No | Pending
```
**Payables Reviewed**

```
Yes | No | Pending
```
**Accruals & Prepayments Reviewed**

```
Yes | No | Pending
```
**VAT/Tax Account Reviewed**

```
Yes | No | Pending
```
**Trial Balance Prepared**

```
Yes | No | Pending
```
**Financial Statements Prepared**

```
Yes | No | Pending
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
Month-end takes us ten days and we still find mistakes in the numbers afterwards.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What does the close involve today?
> **A:** Sales and purchase entries, then a trial balance and a profit and loss statement.
>
> **Q:** Which part takes the time?
> **A:** Reconciling the bank and chasing the party balances.
>
> **Q:** Who reviews the finished pack?
> **A:** Nobody. It goes to the accountant and he sends it back a week later.

**Recommended next step** - offered, not built:

> One closing record per month that carries every reconciliation as an explicit answer before any statement is drawn, then the period figures and a short written read on the position, so the close is repeatable and the next person can see what was still open.
>
> Workflow: Sales and purchase entries completed → Receipts and payments completed → Cash and bank reconciled → Party ledgers reconciled → Inventory reconciled → Statutory liabilities reconciled → Receivables and payables reviewed → Depreciation and adjustments recorded → Trial balance prepared → Statements prepared → Period analysed
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.
- Answer the reconciliation gates in order and leave anything unproven at `Pending`.
  A month that closes on a pending reconciliation is a month that gets reopened.
- Keep the analysis in words as well as numbers. Revenue and profit are already in the
  trial balance; the value is in the one sentence on the position that follows from them.
- Compare the month's figures with the previous one before signing off. A movement with
  no explanation is a question, not a result.

## Limitations

- Empty template only. It does not post entries, reconcile accounts, or produce a trial
  balance, profit and loss account or balance sheet. The accounting package does that.
- The reconciliations are the substance and they happen in the books, not in this record.
  What this tracks is whether each one was done, by when, and what was still open.
- The template cannot enforce gates by itself. Treat every pending required gate as
  blocking and keep the record out of `Done` until the gate passes.
- A period cannot be closed while a reconciliation is outstanding - but this skill does
  not close periods, file returns or sign anything.
- It does not compute tax, and the amounts it holds are the ones the business enters.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
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
- A closing record carries the whole financial position of the business. Treat it as
  sensitive, keep it access-limited, and never paste live balances into a shared chat.

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
- **Problem:** statements marked done while the bank is unreconciled.
  **Solution:** a period is not closed until every gate reads `Yes`. Draft the statements
  if you must, but keep the record open.


See the [Related Skills](references/related-skills.md) reference for the full guidance.

