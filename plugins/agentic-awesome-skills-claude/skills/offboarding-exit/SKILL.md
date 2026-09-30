---
name: offboarding-exit
description: 'Offboarding register: exit type, employee and manager, notice and final day, reason, handover owner, and done flags for knowledge transfer, assets, access and settlement. Use for exit tracking.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, exit]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Offboarding & Exit

**What it is:** Structured departure.

## Overview

Works out the smallest useful **Offboarding & Exit** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 10: Exit. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- offboarding checklist
- exit interview tracker
- employee exit process
- departure checklist

Also use it when the user says "structured departure", or describes the same process happening in a
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

> **Q:** What is the most recent exit?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Exit** - How many people? / Last day known? / Resignation or termination?
- **Process** - Who owns it? / Which steps? / Any interview?
- **Access** - Accounts cut when? / Equipment returned? / Final pay handled?
- **Current process** - Is it tracked now? / Checklist or memory? / What gets missed?
- **Outcome** - What do you need? / A checklist, a record or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: offboarding-exit
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Exit": null
  "Process": null
  "Access": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Run a dated checklist from the agreed last day, and record the exit reason while the person can still be asked for feedback.

**Why this one:** Offboarding is the step everyone drops. A dated checklist with a named owner is what stops access, equipment and pay being left open.

**Workflow:** Exit agreed → Checklist started → Access and equipment closed → Final pay confirmed → Exit recorded and reviewed

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

For an Excel-compatible CSV, use UTF-8 with a byte order mark so Excel opens the
text correctly. A CSV is not an `.xlsx` workbook; create `.xlsx` only when the user
requests a workbook.
A CSV carries no types, so after it, name the columns
that need a number, date or currency format applied.

```csv
Exit Record,Employee Name,Department,Manager,Exit Type,Notice Date,Last Working Day,Reason,Handover Owner,Knowledge Transfer Done,Assets Returned,Access Removed,Accounts to Close,Final Settlement Done,Exit Interview Done,Rehire Eligible,Status,Exit ID
EXIT-2026-002,Aarav Sharma,Delivery,Sneha Iyer,Resignation,2026-01-15,2026-03-31,Relocating to a new city,Sneha Iyer,FALSE,FALSE,FALSE,6,FALSE,FALSE,TRUE,In Progress,
```

```sql
CREATE TABLE offboarding_exit (
  exit_record VARCHAR(255),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  manager VARCHAR(255),
  exit_type VARCHAR(100) NOT NULL,
  notice_date DATE NOT NULL,
  last_working_day DATE NOT NULL,
  reason VARCHAR(255),
  handover_owner VARCHAR(255),
  knowledge_transfer_done BOOLEAN NOT NULL,
  assets_returned BOOLEAN NOT NULL,
  access_removed BOOLEAN NOT NULL,
  accounts_to_close NUMERIC NOT NULL,
  final_settlement_done BOOLEAN NOT NULL,
  exit_interview_done BOOLEAN NOT NULL,
  rehire_eligible BOOLEAN NOT NULL,
  status VARCHAR(100) NOT NULL,
  exit_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_offboarding_exit_status ON offboarding_exit (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Offboarding & Exit",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Exit Record": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Manager": { "type": "string" },
      "Exit Type": { "type": "string" },
      "Notice Date": { "type": "string", "format": "date" },
      "Last Working Day": { "type": "string", "format": "date" },
      "Reason": { "type": "string" },
      "Handover Owner": { "type": "string" },
      "Knowledge Transfer Done": { "type": "boolean" },
      "Assets Returned": { "type": "boolean" },
      "Access Removed": { "type": "boolean" },
      "Accounts to Close": { "type": "number" },
      "Final Settlement Done": { "type": "boolean" },
      "Exit Interview Done": { "type": "boolean" },
      "Rehire Eligible": { "type": "boolean" },
      "Status": { "type": "string" },
      "Exit ID": { "type": "integer" }
  },
  "required": [
      "Exit Type",
      "Notice Date",
      "Last Working Day",
      "Accounts to Close",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Exit Record | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Department | Text | Leave as Text |
| Manager | Text | Leave as Text |
| Exit Type | Select (add options after import) | Convert to Select, add options: "Resignation", "Termination", "Retirement", "End of Contract", "Other" |
| Notice Date | Date | Convert to Date |
| Last Working Day | Date | Convert to Date |
| Reason | Text | Leave as Text |
| Handover Owner | Text | Leave as Text |
| Knowledge Transfer Done | Checkbox | Convert to Checkbox |
| Assets Returned | Checkbox | Convert to Checkbox |
| Access Removed | Checkbox | Convert to Checkbox |
| Accounts to Close | Number | Convert to Number |
| Final Settlement Done | Checkbox | Convert to Checkbox |
| Exit Interview Done | Checkbox | Convert to Checkbox |
| Rehire Eligible | Checkbox | Convert to Checkbox |
| Status | Select (add options after import) | Convert to Select, add options: "Initiated", "In Progress", "Completed", "Cancelled" |
| Exit ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Exit Record | `text` | `VARCHAR(255)` | `string` | Text | `EXIT-2026-002` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Manager | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 5 | Exit Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Resignation` |
| 6 | Notice Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 7 | Last Working Day | `date` | `DATE` | `string, format: date` | Date | `2026-03-31` |
| 8 | Reason | `text` | `VARCHAR(255)` | `string` | Text | `Relocating to a new city` |
| 9 | Handover Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 10 | Knowledge Transfer Done | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 11 | Assets Returned | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 12 | Access Removed | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 13 | Accounts to Close | `number` | `NUMERIC` | `number` | Number | `6` |
| 14 | Final Settlement Done | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 15 | Exit Interview Done | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 16 | Rehire Eligible | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `TRUE` |
| 17 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In Progress` |
| 18 | Exit ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Exit Type**

```
Resignation | Termination | Retirement | End of Contract | Other
```
**Status**

```
Initiated | In Progress | Completed | Cancelled
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Our last three exits were handled differently by three different people.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many people?
> **A:** Three this year.
>
> **Q:** Any checklist?
> **A:** Not a written one.
>
> **Q:** Who owns it?
> **A:** Whoever noticed first.

**Recommended next step** - offered, not built:

> Run a dated checklist from the agreed last day, and record the exit reason while the person can still be asked for feedback.
>
> Workflow: Exit agreed → Checklist started → Access and equipment closed → Final pay confirmed → Exit recorded and reviewed
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
- Does not revoke access itself, terminate employment or provide legal advice on the exit.
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
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/notification-reminder-hub/SKILL.md) - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up structured departure for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

