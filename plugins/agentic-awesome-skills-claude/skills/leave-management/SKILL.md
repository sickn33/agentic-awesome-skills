---
name: leave-management
description: 'Leave register: request, leave type, employee and department, manager and approver, start and end dates, days requested, leave balances, handover notes and status. Use for leave tracking.'
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

# Leave Management

**What it is:** Leave tracking.

## Overview

Works out the smallest useful **Leave Management** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- leave tracker
- leave management system
- vacation tracker
- absence register

Also use it when the user says "leave tracking", or describes the same process happening in a
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

> **Q:** How many people need leave tracking?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Scope** - How many people? / Who applies for leave? / Full time or part time?
- **Rules** - Which leave types? / Who approves? / Track balances or days?
- **Process** - Notice needed? / Handover required? / Carry over allowed?
- **Current process** - How do you track leave today? / Sheet, app or nothing? / What breaks?
- **Outcome** - What do you need? / Approvals, balances or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: leave-management
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Scope": null
  "Rules": null
  "Process": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Keep leave in the tool people already use and add the missing approval and balance steps, not a new system.

**Why this one:** Leave records go stale when balances and requests live apart. One place for both, with an approval state, keeps them consistent.

**Workflow:** Request → Manager approval → Calendar entry → Balance update → Report

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
Leave Request,Annual Leave Balance,Approver,Days Requested,Department,Emergency Contact,Employee Name,End Date,Handover Notes,Leave ID,Leave Type,Manager,Notes,Reason,Sick Leave Balance,Start Date,Status
2026-02-10 to 2026-02-12,14,Sneha Iyer,3,Delivery,Anil Sharma,Aarav Sharma,2026-02-12,Client handover to Rohit Verma,,Annual,Sneha Iyer,Approved by the reporting manager; handover agreed with the team.,Family commitment,8,2026-02-10,Taken
```

```sql
CREATE TABLE leave_management (
  leave_request VARCHAR(255),
  annual_leave_balance NUMERIC NOT NULL,
  approver VARCHAR(255),
  days_requested NUMERIC NOT NULL,
  department VARCHAR(255),
  emergency_contact VARCHAR(255),
  employee_name VARCHAR(255),
  end_date DATE NOT NULL,
  handover_notes TEXT,
  leave_id SERIAL PRIMARY KEY,
  leave_type VARCHAR(100) NOT NULL,
  manager VARCHAR(255),
  notes TEXT,
  reason VARCHAR(255),
  sick_leave_balance NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_leave_management_status ON leave_management (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Leave Management",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Leave Request": { "type": "string" },
      "Annual Leave Balance": { "type": "number" },
      "Approver": { "type": "string" },
      "Days Requested": { "type": "number" },
      "Department": { "type": "string" },
      "Emergency Contact": { "type": "string" },
      "Employee Name": { "type": "string" },
      "End Date": { "type": "string", "format": "date" },
      "Handover Notes": { "type": "string" },
      "Leave ID": { "type": "integer" },
      "Leave Type": { "type": "string" },
      "Manager": { "type": "string" },
      "Notes": { "type": "string" },
      "Reason": { "type": "string" },
      "Sick Leave Balance": { "type": "number" },
      "Start Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" }
  },
  "required": [
      "Annual Leave Balance",
      "Days Requested",
      "End Date",
      "Leave Type",
      "Sick Leave Balance",
      "Start Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Leave Request | Title | Use as the database title |
| Annual Leave Balance | Number | Convert to Number |
| Approver | Text | Leave as Text |
| Days Requested | Number | Convert to Number |
| Department | Text | Leave as Text |
| Emergency Contact | Text | Leave as Text |
| Employee Name | Text | Leave as Text |
| End Date | Date | Convert to Date |
| Handover Notes | Text | Leave as Text |
| Leave ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Leave Type | Select (add options after import) | Convert to Select, add options: "Annual", "Sick", "Casual", "Unpaid", "Maternity", "Paternity", "Comp Off" |
| Manager | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Reason | Text | Leave as Text |
| Sick Leave Balance | Number | Convert to Number |
| Start Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Pending", "Approved", "Declined", "Cancelled", "Taken" |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Leave Request | `text` | `VARCHAR(255)` | `string` | Text | `2026-02-10 to 2026-02-12` |
| 2 | Annual Leave Balance | `number` | `NUMERIC` | `number` | Number | `14` |
| 3 | Approver | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 4 | Days Requested | `number` | `NUMERIC` | `number` | Number | `3` |
| 5 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 6 | Emergency Contact | `text` | `VARCHAR(255)` | `string` | Text | `Anil Sharma` |
| 7 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 8 | End Date | `date` | `DATE` | `string, format: date` | Date | `2026-02-12` |
| 9 | Handover Notes | `long_text` | `TEXT` | `string` | Text | `Client handover to Rohit Verma` |
| 10 | Leave ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 11 | Leave Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Annual` |
| 12 | Manager | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 13 | Notes | `long_text` | `TEXT` | `string` | Text | `Approved by the reporting manager; handover agreed with the team.` |
| 14 | Reason | `text` | `VARCHAR(255)` | `string` | Text | `Family commitment` |
| 15 | Sick Leave Balance | `number` | `NUMERIC` | `number` | Number | `8` |
| 16 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-02-10` |
| 17 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Taken` |

## Select Options

**Leave Type**

```
Annual | Sick | Casual | Unpaid | Maternity | Paternity | Comp Off
```
**Status**

```
Pending | Approved | Declined | Cancelled | Taken
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We are 12 people and want leave requests approved in one place.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which leave types?
> **A:** Annual, sick and casual.
>
> **Q:** Who approves?
> **A:** The reporting manager.
>
> **Q:** What do you use today?
> **A:** Google Sheets.

**Recommended next step** - offered, not built:

> Keep leave in the tool people already use and add the missing approval and balance steps, not a new system.
>
> Workflow: Request → Manager approval → Calendar entry → Balance update → Report
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
- Does not calculate country-specific leave entitlement or accrual rules.
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
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up leave tracking for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

