---
name: time-tracking
description: 'Time entry register: employee, project, client, task, hours, billable flag, rate and amount, invoice and approver. Use for time tracking.'
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

# Time Tracking

**What it is:** Hour logging.

## Overview

Works out the smallest useful **Time Tracking** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- time tracker
- timesheet template
- hour logging
- billable hours tracker

Also use it when the user says "hour logging", or describes the same process happening in a
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

> **Q:** Do you bill by the hour?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Purpose** - Billable or internal? / Client billing? / Productivity?
- **Granularity** - Daily or weekly? / Project or task? / Minimum entry?
- **Process** - Who approves? / Lock period? / Corrections allowed?
- **Current process** - How do you log time now? / Tool or sheet? / Is it complete?
- **Outcome** - What do you need? / A log, invoices or payroll input?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: time-tracking
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Purpose": null
  "Granularity": null
  "Process": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Collect time by project, and connect billing to it only if you bill by the hour. Lock the period once it is invoiced.

**Why this one:** Time data is only worth collecting if something uses it. Billing is the strongest reason; if there is none, keep the entry minimal.

**Workflow:** Entry → Approval → Lock period → Invoice or cost view

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
Time Entry,Approver,Billable,Billable Rate (per hour),Currency,Billable Amount,Invoice,Date,Department,Employee Name,Hours Logged,Month,Notes,Project,Client,Status,Task Description,Time ID,Type,Week Number
2026-01-12 Client call - 2.5h,Sneha Iyer,TRUE,4500.00,INR,5625.00,INV-1041,2026-01-15,Delivery,Aarav Sharma,38.5,2026-03,"Timesheets for February were submitted late by two people, which skewed the billable ratio.",Website Redesign,Northwind Traders,Approved,Client call and follow-up notes,,Billable,7
```

```sql
CREATE TABLE time_tracking (
  time_entry VARCHAR(255),
  approver VARCHAR(255),
  billable VARCHAR(255),  -- relation -> target record
  billable_rate_per_hour NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  billable_amount NUMERIC(14,2) NOT NULL,
  invoice VARCHAR(255),
  date DATE NOT NULL,
  department VARCHAR(255),
  employee_name VARCHAR(255),
  hours_logged NUMERIC NOT NULL,
  month VARCHAR(255),
  notes TEXT,
  project VARCHAR(255),
  client VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  task_description TEXT,
  time_id SERIAL PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  week_number NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_time_tracking_status ON time_tracking (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Time Tracking",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Time Entry": { "type": "string" },
      "Approver": { "type": "string" },
      "Billable": { "type": "string" },
      "Billable Rate (per hour)": { "type": "number" },
      "Currency": { "type": "string" },
      "Billable Amount": { "type": "number" },
      "Invoice": { "type": "string" },
      "Date": { "type": "string", "format": "date" },
      "Department": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Hours Logged": { "type": "number" },
      "Month": { "type": "string" },
      "Notes": { "type": "string" },
      "Project": { "type": "string" },
      "Client": { "type": "string" },
      "Status": { "type": "string" },
      "Task Description": { "type": "string" },
      "Time ID": { "type": "integer" },
      "Type": { "type": "string" },
      "Week Number": { "type": "number" }
  },
  "required": [
      "Billable Rate (per hour)",
      "Billable Amount",
      "Date",
      "Hours Logged",
      "Status",
      "Type",
      "Week Number"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Time Entry | Title | Use as the database title |
| Approver | Text | Leave as Text |
| Billable | Relation (link to the target database) | Convert to Relation, link to the target database |
| Billable Rate (per hour) | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Billable Amount | Number (format: currency) | Convert to Number, set format to Currency |
| Invoice | Text | Leave as Text |
| Date | Date | Convert to Date |
| Department | Text | Leave as Text |
| Employee Name | Text | Leave as Text |
| Hours Logged | Number | Convert to Number |
| Month | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Project | Text | Leave as Text |
| Client | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Submitted", "Approved", "Rejected", "Invoiced" |
| Task Description | Text | Leave as Text |
| Time ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Type | Select (add options after import) | Convert to Select, add options: "Billable", "Internal", "Training", "Leave", "Admin" |
| Week Number | Number | Convert to Number |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Time Entry | `text` | `VARCHAR(255)` | `string` | Text | `2026-01-12 Client call - 2.5h` |
| 2 | Approver | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 3 | Billable | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `TRUE` |
| 4 | Billable Rate (per hour) | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `4500.00` |
| 5 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 6 | Billable Amount | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `5625.00` |
| 7 | Invoice | `text` | `VARCHAR(255)` | `string` | Text | `INV-1041` |
| 8 | Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 9 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 10 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 11 | Hours Logged | `number` | `NUMERIC` | `number` | Number | `38.5` |
| 12 | Month | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 13 | Notes | `long_text` | `TEXT` | `string` | Text | `Timesheets for February were submitted late by two people, which skewed the billable ratio.` |
| 14 | Project | `text` | `VARCHAR(255)` | `string` | Text | `Website Redesign` |
| 15 | Client | `text` | `VARCHAR(255)` | `string` | Text | `Northwind Traders` |
| 16 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Approved` |
| 17 | Task Description | `long_text` | `TEXT` | `string` | Text | `Client call and follow-up notes` |
| 18 | Time ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 19 | Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Billable` |
| 20 | Week Number | `number` | `NUMERIC` | `number` | Number | `7` |

## Select Options

**Status**

```
Draft | Submitted | Approved | Rejected | Invoiced
```
**Type**

```
Billable | Internal | Training | Leave | Admin
```

## Relations

Link fields: `Billable`

## Examples

**Prompt**

```
We bill clients by the hour but nobody logs time.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Bill by the hour?
> **A:** Yes, some clients.
>
> **Q:** Daily or weekly?
> **A:** Daily.
>
> **Q:** Who approves?
> **A:** The project manager.

**Recommended next step** - offered, not built:

> Collect time by project, and connect billing to it only if you bill by the hour. Lock the period once it is invoiced.
>
> Workflow: Entry → Approval → Lock period → Invoice or cost view
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
- Does not send invoices, pay people or monitor anyone continuously.
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

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up hour logging for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

