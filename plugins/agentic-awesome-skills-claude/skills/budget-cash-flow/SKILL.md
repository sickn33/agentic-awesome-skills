---
name: budget-cash-flow
description: 'Budget against actual by department, category and period, with budget and actual amounts, variance, percentage used and linked expenses. Use for budget tracking or cash-flow reviews.'
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

# Budget & Cash Flow

**What it is:** Budget against actual by department and month, plus cash in and out.

## Overview

Works out the smallest useful **Budget & Cash Flow** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 8: Operate. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- budget tracker
- cash flow forecast
- budget vs actual
- department budget sheet

Also use it when the user says "budget against actual by department and month, plus cash in and out", or describes the same process happening in a
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

> **Q:** How far ahead do you budget?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Horizon** - How many months or years? / Monthly or annual? / By department or whole?
- **Inputs** - Actual numbers available? / Payroll and rent known? / Forecast confidence?
- **Ownership** - Who owns the budget? / Who updates it? / How often revised?
- **Current process** - Is it a spreadsheet? / How often updated? / Is it current?
- **Outcome** - What do you need? / A budget template, a cash view or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: budget-cash-flow
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Horizon": null
  "Inputs": null
  "Ownership": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Build the budget once per year and the cash view monthly, and record the variance rather than rewriting the whole forecast.

**Why this one:** Cash flow fails from stale forecasts, not from a missing template. A monthly refresh of a small model beats a detailed annual plan nobody updates.

**Workflow:** Budget set → Monthly actuals entered → Variance calculated → Cash position → Forecast revised

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
Budget Line,Line Type,Department,Category,Period,Fiscal Year,Budget Amount,Actual Amount,Variance,Used %,Linked Expenses,Owner,Status,Notes,Budget ID
1000.00,Income,Delivery,General,2026-03,FY2026-27,600.00,400.00,-200.00,67,EXP-EXAMPLE-001,Example Owner,Active,Forecast refreshed after the February numbers; the delivery line is still optimistic.,
```

```sql
CREATE TABLE budget_cash_flow (
  budget_line NUMERIC(14,2) NOT NULL,
  line_type VARCHAR(100) NOT NULL,
  department VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  period VARCHAR(255),
  fiscal_year VARCHAR(255),
  budget_amount NUMERIC(14,2) NOT NULL,
  actual_amount NUMERIC(14,2) NOT NULL,
  variance VARCHAR(255),
  used_pct NUMERIC NOT NULL,
  linked_expenses VARCHAR(255),  -- relation -> target record
  owner VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  budget_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_budget_cash_flow_status ON budget_cash_flow (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Budget & Cash Flow",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Budget Line": { "type": "number" },
      "Line Type": { "type": "string" },
      "Department": { "type": "string" },
      "Category": { "type": "string" },
      "Period": { "type": "string" },
      "Fiscal Year": { "type": "string" },
      "Budget Amount": { "type": "number" },
      "Actual Amount": { "type": "number" },
      "Variance": { "type": "string" },
      "Used %": { "type": "number" },
      "Linked Expenses": { "type": "string" },
      "Owner": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Budget ID": { "type": "integer" }
  },
  "required": [
      "Budget Line",
      "Line Type",
      "Category",
      "Budget Amount",
      "Actual Amount",
      "Used %",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Budget Line | Number (format: currency) | Convert to Number, set format to Currency |
| Line Type | Select (add options after import) | Convert to Select, add options: "Income", "Expense", "Cash In", "Cash Out" |
| Department | Title | Use as the database title |
| Category | Select (add options after import) | Convert to Select, add options: "General", "Operations", "Finance", "People", "Compliance" |
| Period | Text | Leave as Text |
| Fiscal Year | Text | Leave as Text |
| Budget Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Actual Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Variance | Text | Leave as Text |
| Used % | Number | Convert to Number |
| Linked Expenses | Relation (link to the target database) | Convert to Relation, link to the target database |
| Owner | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Approved", "Active", "Revised", "Closed" |
| Notes | Text | Leave as Text |
| Budget ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Budget Line | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1000.00` |
| 2 | Line Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Income` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `General` |
| 5 | Period | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 6 | Fiscal Year | `text` | `VARCHAR(255)` | `string` | Text | `FY2026-27` |
| 7 | Budget Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `600.00` |
| 8 | Actual Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `400.00` |
| 9 | Variance | `text` | `VARCHAR(255)` | `string` | Text | `-200.00` |
| 10 | Used % | `number` | `NUMERIC` | `number` | Number | `67` |
| 11 | Linked Expenses | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `EXP-EXAMPLE-001` |
| 12 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Example Owner` |
| 13 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |
| 14 | Notes | `long_text` | `TEXT` | `string` | Text | `Forecast refreshed after the February numbers; the delivery line is still optimistic.` |
| 15 | Budget ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Line Type**

```
Income | Expense | Cash In | Cash Out
```
**Category**

```
General | Operations | Finance | People | Compliance
```
**Status**

```
Draft | Approved | Active | Revised | Closed
```

## Relations

Link fields: `Linked Expenses`

## Examples

**Prompt**

```
We set a budget once and lost track of the actual position by month three.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Horizon?
> **A:** Twelve months.
>
> **Q:** Numbers available?
> **A:** From accounting, monthly.
>
> **Q:** How often updated?
> **A:** Rarely.

**Recommended next step** - offered, not built:

> Build the budget once per year and the cash view monthly, and record the variance rather than rewriting the whole forecast.
>
> Workflow: Budget set → Monthly actuals entered → Variance calculated → Cash position → Forecast revised
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
- Does not move money, book transactions or give financial advice.
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


## Budget and Cash Flow Control Rules

Keep budget, committed spend, actual spend, forecast, and cash movement as distinct measures. Record the period, department, currency, source, and approval state for every amount; never compare values from different periods or currencies without an explicit conversion basis. A variance is a calculation from confirmed inputs, not an explanation of why it happened.

For each material variance, capture the owner, evidence, expected timing, confidence, and next review date. Separate timing differences from permanent changes, and keep one-off items visible rather than smoothing them into a recurring run rate. Cash availability is not the same as profit: identify opening balance, inflows, outflows, restricted funds, and minimum reserve before presenting a runway figure.


## Forecast Reconciliation

At each close, reconcile opening cash plus inflows minus outflows to the closing bank or treasury balance, then explain approved timing differences separately. Keep accrual budget, invoice commitments, paid cash, and forecast revisions as different columns. Do not use a favorable cash variance to hide an unpaid commitment or a delayed invoice.

For scenario planning, name the scenario, effective date, assumptions, sensitivity drivers, and approval owner. A runway estimate must state the balance source, burn definition, horizon, and excluded restricted cash. When a forecast changes, preserve the prior version and record the reason for the change.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up budget against actual by department and month, plus cash in and out for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

