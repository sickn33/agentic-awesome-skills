---
name: pre-boarding
description: 'Pre-boarding checklist: task, employee and department, owner, category, joining and due dates, documents received, laptop, email and account-record readiness, status. Use for pre-boarding.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, onboard]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Pre-boarding

**What it is:** Day 1 preparation.

## Overview

Works out the smallest useful **Pre-boarding** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- pre boarding checklist
- before day one prep
- new joiner preparation
- joining day preparation

Also use it when the user says "day 1 preparation", or describes the same process happening in a
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

> **Q:** When does the new joiner start?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Joiner** - Who is joining? / Which role? / Joining date?
- **Before day one** - What must be ready? / Documents or equipment? / Who prepares it?
- **Paperwork** - What is sent when? / Signed before or after joining? / Who tracks it?
- **Current process** - Anything done today? / Email or checklist? / What gets missed?
- **Outcome** - What do you need? / A checklist, a schedule or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: pre-boarding
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Joiner": null
  "Before day one": null
  "Paperwork": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Build a dated checklist that runs backwards from the start date, and mark each item done rather than tracking tasks generically.

**Why this one:** Pre-boarding stalls on the last few days, so a checklist tied to a date is worth more than a task list. Unfinished items are the signal.

**Workflow:** Joiner added → Checklist generated → Items due by date → Day-one handover

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
Pre-boarding Task,Employee Name,Department,Owner,Category,Joining Date,Due Date,Documents Received,Laptop Ready,Email Created,Account Record,Status,Notes,Pre-board ID
Collect laptop and MFA token,Aarav Sharma,Delivery,Sneha Iyer,Equipment,2026-01-15,2026-01-15,FALSE,FALSE,FALSE,ACC-204,In Progress,Sent for the March joiner; laptop delivery is the item most likely to slip.,
```

```sql
CREATE TABLE pre_boarding (
  pre_boarding_task VARCHAR(255),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  owner VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  joining_date DATE NOT NULL,
  due_date DATE NOT NULL,
  documents_received BOOLEAN NOT NULL,
  laptop_ready BOOLEAN NOT NULL,
  email_created BOOLEAN NOT NULL,
  account_record VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  pre_board_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pre_boarding_status ON pre_boarding (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Pre-boarding",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Pre-boarding Task": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Owner": { "type": "string" },
      "Category": { "type": "string" },
      "Joining Date": { "type": "string", "format": "date" },
      "Due Date": { "type": "string", "format": "date" },
      "Documents Received": { "type": "boolean" },
      "Laptop Ready": { "type": "boolean" },
      "Email Created": { "type": "boolean" },
      "Account Record": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Pre-board ID": { "type": "integer" }
  },
  "required": [
      "Category",
      "Joining Date",
      "Due Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Pre-boarding Task | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Department | Text | Leave as Text |
| Owner | Text | Leave as Text |
| Category | Select (add options after import) | Convert to Select, add options: "Equipment", "Accounts", "Access", "Paperwork", "Orientation" |
| Joining Date | Date | Convert to Date |
| Due Date | Date | Convert to Date |
| Documents Received | Checkbox | Convert to Checkbox |
| Laptop Ready | Checkbox | Convert to Checkbox |
| Email Created | Checkbox | Convert to Checkbox |
| Account Record | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Not Started", "In Progress", "Ready", "Complete" |
| Notes | Text | Leave as Text |
| Pre-board ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Pre-boarding Task | `text` | `VARCHAR(255)` | `string` | Text | `Collect laptop and MFA token` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 5 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Equipment` |
| 6 | Joining Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 7 | Due Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Documents Received | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 9 | Laptop Ready | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 10 | Email Created | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 11 | Account Record | `text` | `VARCHAR(255)` | `string` | Text | `ACC-204` |
| 12 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In Progress` |
| 13 | Notes | `long_text` | `TEXT` | `string` | Text | `Sent for the March joiner; laptop delivery is the item most likely to slip.` |
| 14 | Pre-board ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Category**

```
Equipment | Accounts | Access | Paperwork | Orientation
```
**Status**

```
Not Started | In Progress | Ready | Complete
```

## Relations

Link fields: none

## Examples

**Prompt**

```
A new joiner starts on Monday and the laptop was still not ordered on Friday.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Joining date?
> **A:** The 14th.
>
> **Q:** What must be ready?
> **A:** Laptop, email and paperwork.
>
> **Q:** Who prepares it?
> **A:** IT and HR.

**Recommended next step** - offered, not built:

> Build a dated checklist that runs backwards from the start date, and mark each item done rather than tracking tasks generically.
>
> Workflow: Joiner added → Checklist generated → Items due by date → Day-one handover
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
- Does not order equipment, provision accounts or send anything on your behalf.
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
I want to set up day 1 preparation for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

