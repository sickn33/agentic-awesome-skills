---
name: salary-wage-accounting
description: 'Payroll register: gross, allowances, TDS and provident fund deductions, net pay, payment date and statutory reconciliation. Use for salary accounting.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, payroll]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Salary & Wage Accounting

**What it is:** Payroll booked, paid and reconciled against attendance and statutory liabilities.

## Overview

Works out the smallest useful **Salary & Wage Accounting** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

This skill produces an empty template only. It never holds or processes real salary or
employee data. Payroll calculation and statutory filing stay with a qualified person -
this holds what was paid, what was deducted and what is still owed.

Layer: Layer 5: Expense & Payroll. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- payroll register
- salary book
- wage sheet record
- payroll liability tracker

Also use it when the user says "payroll booked, paid and reconciled against attendance and statutory liabilities", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: payroll calculation, statutory filing, or tax advice. This skill produces
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

> **Q:** How many people are on the payroll each month?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Workforce** - How many employees? / Salaried or hourly? / Where is attendance recorded?
- **Pay cycle** - When is the run cut? / Who prepares the wage sheet? / Who approves payment?
- **Deductions** - TDS? / SSF/PF or equivalent? / Any advance recovery or other deductions?
- **Statutory** - Who deposits and files? / How often is it reconciled? / Is a liability carried?
- **Outcome** - What do you need? / A payroll record, a liability tracker or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: salary-wage-accounting
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Workforce": null
  "Pay cycle": null
  "Deductions": null
  "Statutory": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One record per employee per pay run holding the period, the days, the gross, the deductions and the net, and let the payroll package do the calculation.

**Why this one:** The arithmetic belongs in payroll software. This holds what was paid, what was deducted and what is still owed, so a reviewer can check the sheet without redoing it.

**Workflow:** Attendance recorded → Wage sheet prepared → Approved → Paid → Liability carried → Statutory reconciled

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
Payroll Run,Employee,Employee ID,Department,Period Start,Period End,Attendance Days,Paid Days,Gross Salary/Wages,Allowances,Deductions,TDS,SSF/PF Contribution,Other Deductions,Net Salary/Wages,Payment Date,Payment Mode,Ledger Account,Approval Reference,Payroll Liability Balance,Statutory Reconciliation Status,Source Document,Prepared By,Reviewed By,Status,Notes,Salary Record ID
PAYRUN-2026-08,Rohit Menon,EMP-0114,Operations,2026-08-01,2026-08-31,26,26,96000.00,8400.00,1600.00,3600.00,7680.00,500.00,91020.00,2026-08-28,Bank Transfer,Salaries & Wages,APR-PR-2026-08,7680.00,Pending,DOC-2026-0470,Sneha Iyer,Ananya Rao,In progress,"Deductions of 1600.00 and other deductions of 500.00 total 2100.00; PF contribution carried as a liability until deposited.",
```

```sql
CREATE TABLE salary_wage_accounting (
  payroll_run VARCHAR(255),
  employee VARCHAR(255),
  employee_id VARCHAR(255),
  department VARCHAR(100) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  attendance_days NUMERIC,
  paid_days NUMERIC,
  gross_salary_wages NUMERIC(14,2) NOT NULL,
  allowances NUMERIC(14,2) NOT NULL,
  deductions NUMERIC(14,2) NOT NULL,
  tds NUMERIC(14,2) NOT NULL,
  ssf_pf_contribution NUMERIC(14,2) NOT NULL,
  other_deductions NUMERIC(14,2) NOT NULL,
  net_salary_wages NUMERIC(14,2) NOT NULL,
  payment_date DATE,
  payment_mode VARCHAR(100) NOT NULL,
  ledger_account VARCHAR(255),
  approval_reference VARCHAR(255),
  payroll_liability_balance NUMERIC(14,2) NOT NULL,
  statutory_reconciliation_status VARCHAR(100) NOT NULL,
  source_document VARCHAR(255),  -- relation -> target record
  prepared_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  salary_record_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_salary_wage_accounting_status ON salary_wage_accounting (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Salary & Wage Accounting",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Payroll Run": { "type": "string" },
      "Employee": { "type": "string" },
      "Employee ID": { "type": "string" },
      "Department": { "type": "string" },
      "Period Start": { "type": "string", "format": "date" },
      "Period End": { "type": "string", "format": "date" },
      "Attendance Days": { "type": "number" },
      "Paid Days": { "type": "number" },
      "Gross Salary/Wages": { "type": "number" },
      "Allowances": { "type": "number" },
      "Deductions": { "type": "number" },
      "TDS": { "type": "number" },
      "SSF/PF Contribution": { "type": "number" },
      "Other Deductions": { "type": "number" },
      "Net Salary/Wages": { "type": "number" },
      "Payment Date": { "type": "string", "format": "date" },
      "Payment Mode": { "type": "string" },
      "Ledger Account": { "type": "string" },
      "Approval Reference": { "type": "string" },
      "Payroll Liability Balance": { "type": "number" },
      "Statutory Reconciliation Status": { "type": "string" },
      "Source Document": { "type": "string" },
      "Prepared By": { "type": "string" },
      "Reviewed By": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Salary Record ID": { "type": "integer" }
  },
  "required": [
      "Department",
      "Period Start",
      "Period End",
      "Gross Salary/Wages",
      "Allowances",
      "Deductions",
      "TDS",
      "SSF/PF Contribution",
      "Other Deductions",
      "Net Salary/Wages",
      "Payment Mode",
      "Payroll Liability Balance",
      "Statutory Reconciliation Status",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Payroll Run | Title | Use as the database title |
| Employee | Text | Leave as Text |
| Employee ID | Text | Leave as Text |
| Department | Select (add options after import) | Convert to Select, add options: "Sales", "Purchase", "Accounts", "Payroll", "Admin", "Finance", "Operations" |
| Period Start | Date | Convert to Date |
| Period End | Date | Convert to Date |
| Attendance Days | Number | Convert to Number |
| Paid Days | Number | Convert to Number |
| Gross Salary/Wages | Number (format: currency) | Convert to Number, set format to Currency |
| Allowances | Number (format: currency) | Convert to Number, set format to Currency |
| Deductions | Number (format: currency) | Convert to Number, set format to Currency |
| TDS | Number (format: currency) | Convert to Number, set format to Currency |
| SSF/PF Contribution | Number (format: currency) | Convert to Number, set format to Currency |
| Other Deductions | Number (format: currency) | Convert to Number, set format to Currency |
| Net Salary/Wages | Number (format: currency) | Convert to Number, set format to Currency |
| Payment Date | Date | Convert to Date |
| Payment Mode | Select (add options after import) | Convert to Select, add options: "Bank Transfer", "Cash", "Cheque", "Digital Payment" |
| Ledger Account | Text | Leave as Text |
| Approval Reference | Text | Leave as Text |
| Payroll Liability Balance | Number (format: currency) | Convert to Number, set format to Currency |
| Statutory Reconciliation Status | Select (add options after import) | Convert to Select, add options: "Reconciled", "Pending", "Variance" |
| Source Document | Relation (link to the target database) | Convert to Relation, link to the target database |
| Prepared By | Text | Leave as Text |
| Reviewed By | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Salary Record ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Payroll Run | `text` | `VARCHAR(255)` | `string` | Text | `PAYRUN-2026-08` |
| 2 | Employee | `text` | `VARCHAR(255)` | `string` | Text | `Rohit Menon` |
| 3 | Employee ID | `text` | `VARCHAR(255)` | `string` | Text | `EMP-0114` |
| 4 | Department | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Operations` |
| 5 | Period Start | `date` | `DATE` | `string, format: date` | Date | `2026-08-01` |
| 6 | Period End | `date` | `DATE` | `string, format: date` | Date | `2026-08-31` |
| 7 | Attendance Days | `number` | `NUMERIC` | `number` | Number | `26` |
| 8 | Paid Days | `number` | `NUMERIC` | `number` | Number | `26` |
| 9 | Gross Salary/Wages | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `96000.00` |
| 10 | Allowances | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `8400.00` |
| 11 | Deductions | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1600.00` |
| 12 | TDS | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `3600.00` |
| 13 | SSF/PF Contribution | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `7680.00` |
| 14 | Other Deductions | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `500.00` |
| 15 | Net Salary/Wages | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `91020.00` |
| 16 | Payment Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-28` |
| 17 | Payment Mode | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Bank Transfer` |
| 18 | Ledger Account | `text` | `VARCHAR(255)` | `string` | Text | `Salaries & Wages` |
| 19 | Approval Reference | `text` | `VARCHAR(255)` | `string` | Text | `APR-PR-2026-08` |
| 20 | Payroll Liability Balance | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `7680.00` |
| 21 | Statutory Reconciliation Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Pending` |
| 22 | Source Document | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `DOC-2026-0470` |
| 23 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 24 | Reviewed By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 25 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In progress` |
| 26 | Notes | `long_text` | `TEXT` | `string` | Text | `Deductions of 1600.00 and other deductions of 500.00 total 2100.00; PF contribution carried as a liability until deposited.` |
| 27 | Salary Record ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Department**

```
Sales | Purchase | Accounts | Payroll | Admin | Finance | Operations
```
**Payment Mode**

```
Bank Transfer | Cash | Cheque | Digital Payment
```
**Statutory Reconciliation Status**

```
Reconciled | Pending | Variance
```
**Status**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: `Source Document`

## Examples

**Prompt**

```
Payroll runs on a sheet and at month end we cannot tell what is still owed as PF.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many people on the payroll?
> **A:** Nine, all salaried.
>
> **Q:** Who prepares the wage sheet?
> **A:** Our bookkeeper, from the attendance sheet.
>
> **Q:** Who deposits the PF and TDS?
> **A:** Our accountant, monthly.

**Recommended next step** - offered, not built:

> One record per employee per pay run holding the period, the days, the gross, the deductions and the net, and let the payroll package do the calculation.
>
> Workflow: Attendance recorded → Wage sheet prepared → Approved → Paid → Liability carried → Statutory reconciled
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- One record per employee per run. A run-level row hides the person who caused the variance.
- Carry the statutory contribution as a liability until the deposit is actually made.
- Have a named reviewer sign the run before payment is released.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not calculate payroll, compute TDS or PF, or pay anyone.
- It does not file statutory returns or make deposits, and it gives no payroll or tax advice.
- Payroll calculation and statutory filing stay with a qualified person. This only holds the
  record of what they decided.
- It never holds real salary or employee data. Anyone who needs that uses the payroll system.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real names, salaries, bank details, ID numbers or health information.
  Placeholders only.
- Payroll data is sensitive personal data. Keep it in the payroll system, not in a template.
- Label example rows as synthetic, and keep account numbers masked.
- Local reads, generation commands, and validation are part of a requested artifact build.
  External writes, messages, provisioning, and publication require authorization for that
  action and target; existing explicit authorization does not need to be repeated.
- If sensitive data is supplied, avoid repeating unnecessary identifiers. Use only what
  the requested review needs; keep generated templates empty. Do not claim deletion
  from the conversation or service storage.
- Pay, disciplinary and grievance decisions need a qualified human reviewer. Never let this
  output drive one on its own.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** asked all six questions in one message.
  **Solution:** ask one, wait, and drop any the first answer already covered.
- **Problem:** one row for the whole month, not per employee.
  **Solution:** split it. A run-level total cannot be reconciled to a person's deduction.
- **Problem:** the PF contribution is expensed and forgotten.
  **Solution:** carry it in `Payroll Liability Balance` until the deposit is made, then
  reconcile it.
- **Problem:** `Statutory Reconciliation Status` is left on `Pending` for months.
  **Solution:** close it against the deposit challan, not against the payroll sheet.
- **Problem:** all four artifacts drift apart.
  **Solution:** derive all four from the field list in this file, never by hand.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other accounting modules.
- @expense-accounting - books the salary and wage lines into the expense register.
- @payment-accounting - records the bank or cash payment that settles the net figure.
- @tds-booking-payment - carries the salary TDS into the statutory register and return.
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/source-document-filing/SKILL.md) - stores the signed wage sheet and the deposit challan.

## Reusable Prompt

```
I want to set up payroll booked, paid and reconciled against attendance and statutory liabilities for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
