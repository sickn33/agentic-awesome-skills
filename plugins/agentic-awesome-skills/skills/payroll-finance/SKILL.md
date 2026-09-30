---
name: payroll-finance
description: 'Payroll register: employee, department and month, basic, DA, HRA and TA, bonus, deductions, net pay, pay period, payment date and method. Use for payroll records.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, manage]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Payroll & Finance

**What it is:** Compensation.

## Overview

Works out the smallest useful **Payroll & Finance** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- payroll tracker
- salary register
- payroll sheet template
- monthly payroll log

Also use it when the user says "compensation", or describes the same process happening in a
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

> **Q:** How many people are on payroll?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Payroll** - How many people? / Monthly payslip? / Variable pay?
- **Components** - Which allowances? / Deductions? / Bonus included?
- **Process** - Who runs it? / Accountant or in-house? / When is cut-off?
- **Current process** - How is payroll done now? / Software or manual? / What gets missed?
- **Outcome** - What do you need? / A register, a calculation or an input feed?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: payroll-finance
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Payroll": null
  "Components": null
  "Process": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Treat payroll as an input record for finance, not a calculator. If you need calculation, use payroll software and record the result.

**Why this one:** Payroll is high-risk to compute by hand and cheap to record. Keep this as the register, and let software do the arithmetic.

**Workflow:** Payroll input → Validation → Payroll run → Register update → Finance and tax

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
Payroll Record,Basic Salary,Bonus,Currency,DA (Dearness Allowance),Deductions,Department,Employee Name,HRA,Month,Net Pay,Notes,Pay Period,Payment Date,Payment Method,Payroll ID,Status,TA (Travel Allowance),Year
PAY-2026-03,650000.00,97500.00,INR,14500.00,82500.00,Delivery,Aarav Sharma,260000.00,2026-03,958700.00,February run reconciled with the accountant; one deduction code was mapped to the wrong head.,2026-03,2026-04-07,Bank Transfer,,Paid,19200.00,2026
```

```sql
CREATE TABLE payroll_finance (
  payroll_record VARCHAR(255),
  basic_salary NUMERIC(14,2) NOT NULL,
  bonus NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  da_dearness_allowance VARCHAR(255),
  deductions NUMERIC(14,2) NOT NULL,
  department VARCHAR(255),
  employee_name VARCHAR(255),
  hra NUMERIC(14,2) NOT NULL,
  month VARCHAR(255),
  net_pay NUMERIC(14,2) NOT NULL,
  notes TEXT,
  pay_period VARCHAR(255),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(100) NOT NULL,
  payroll_id SERIAL PRIMARY KEY,
  status VARCHAR(100) NOT NULL,
  ta_travel_allowance NUMERIC(14,2) NOT NULL,
  year VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payroll_finance_status ON payroll_finance (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Payroll & Finance",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Payroll Record": { "type": "string" },
      "Basic Salary": { "type": "number" },
      "Bonus": { "type": "number" },
      "Currency": { "type": "string" },
      "DA (Dearness Allowance)": { "type": "string" },
      "Deductions": { "type": "number" },
      "Department": { "type": "string" },
      "Employee Name": { "type": "string" },
      "HRA": { "type": "number" },
      "Month": { "type": "string" },
      "Net Pay": { "type": "number" },
      "Notes": { "type": "string" },
      "Pay Period": { "type": "string" },
      "Payment Date": { "type": "string", "format": "date" },
      "Payment Method": { "type": "string" },
      "Payroll ID": { "type": "integer" },
      "Status": { "type": "string" },
      "TA (Travel Allowance)": { "type": "number" },
      "Year": { "type": "string" }
  },
  "required": [
      "Basic Salary",
      "Bonus",
      "Deductions",
      "HRA",
      "Net Pay",
      "Payment Date",
      "Payment Method",
      "Status",
      "TA (Travel Allowance)"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Payroll Record | Title | Use as the database title |
| Basic Salary | Number (format: currency) | Convert to Number, set format to Currency |
| Bonus | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| DA (Dearness Allowance) | Text | Leave as Text |
| Deductions | Number (format: currency) | Convert to Number, set format to Currency |
| Department | Text | Leave as Text |
| Employee Name | Text | Leave as Text |
| HRA | Number (format: currency) | Convert to Number, set format to Currency |
| Month | Text | Leave as Text |
| Net Pay | Number (format: currency) | Convert to Number, set format to Currency |
| Notes | Text | Leave as Text |
| Pay Period | Text | Leave as Text |
| Payment Date | Date | Convert to Date |
| Payment Method | Select (add options after import) | Convert to Select, add options: "Bank Transfer", "UPI", "Card", "Cash", "Cheque", "NEFT/RTGS" |
| Payroll ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Submitted", "Approved", "Paid", "Reconciled" |
| TA (Travel Allowance) | Number (format: currency) | Convert to Number, set format to Currency |
| Year | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Payroll Record | `text` | `VARCHAR(255)` | `string` | Text | `PAY-2026-03` |
| 2 | Basic Salary | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `650000.00` |
| 3 | Bonus | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `97500.00` |
| 4 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 5 | DA (Dearness Allowance) | `text` | `VARCHAR(255)` | `string` | Text | `14500.00` |
| 6 | Deductions | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `82500.00` |
| 7 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 8 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 9 | HRA | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `260000.00` |
| 10 | Month | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 11 | Net Pay | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `958700.00` |
| 12 | Notes | `long_text` | `TEXT` | `string` | Text | `February run reconciled with the accountant; one deduction code was mapped to the wrong head.` |
| 13 | Pay Period | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 14 | Payment Date | `date` | `DATE` | `string, format: date` | Date | `2026-04-07` |
| 15 | Payment Method | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Bank Transfer` |
| 16 | Payroll ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 17 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Paid` |
| 18 | TA (Travel Allowance) | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `19200.00` |
| 19 | Year | `text` | `VARCHAR(255)` | `string` | Text | `2026` |

## Select Options

**Payment Method**

```
Bank Transfer | UPI | Card | Cash | Cheque | NEFT/RTGS
```
**Status**

```
Draft | Submitted | Approved | Paid | Reconciled
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Payroll runs in a spreadsheet and finance re-keys everything.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Who runs it?
> **A:** Our accountant.
>
> **Q:** Variable pay?
> **A:** Yes, bonuses.
>
> **Q:** How many people?
> **A:** Twelve.

**Recommended next step** - offered, not built:

> Treat payroll as an input record for finance, not a calculator. If you need calculation, use payroll software and record the result.
>
> Workflow: Payroll input → Validation → Payroll run → Register update → Finance and tax
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
- Does not calculate pay, deduct tax or transfer money.
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
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/people-directory/SKILL.md) - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up compensation for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

