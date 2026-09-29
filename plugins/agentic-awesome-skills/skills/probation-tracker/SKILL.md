---
name: probation-tracker
description: 'Probation register: employee, start and end dates, 30, 60 and 90-day review scores, overall score and confirmation letter. Use for probation tracking.'
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

# Probation Tracker

**What it is:** New hire evaluation.

## Overview

Works out the smallest useful **Probation Tracker** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- probation tracker
- new hire probation review
- 30 60 90 evaluation
- probation confirmation

Also use it when the user says "new hire evaluation", or describes the same process happening in a
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

> **Q:** How long is the probation period?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Who** - How many people on probation? / Which roles? / Any extensions?
- **Period** - Probation length? / Review points? / Confirmation criteria?
- **Process** - Who reviews? / Who confirms? / Feedback recorded where?
- **Current process** - How is it tracked now? / Email or memory? / What gets missed?
- **Outcome** - What do you need? / A tracker, a review form or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: probation-tracker
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Who": null
  "Period": null
  "Process": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** One record per person with the start date, review dates and the confirmation decision. Keep the criteria attached to the record.

**Why this one:** Probation reviews get missed because nobody owns the date. A tracker that surfaces the next review is the whole control.

**Workflow:** Enrolment → First review → Mid review → Final review → Confirmed or extended

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
Probation Record,30-Day Review Date,30-Day Score,60-Day Review Date,60-Day Score,90-Day Review Date,90-Day Score,Confirmation Letter Issued,Department,Employee Name,End Date,Manager,Mentor / Buddy,Milestones Met,Notes,Overall Score,Probation ID,Start Date,Status
PROB-2026-014,2026-07-01,4,2026-07-31,4,2026-08-30,5,FALSE,Delivery,Aarav Sharma,2026-08-31,Sneha Iyer,Priya Nair + Rohit Verma,FALSE,First review passed in February; the second is scheduled once the handover is complete.,4.2,,2026-06-01,In Progress
```

```sql
CREATE TABLE probation_tracker (
  probation_record VARCHAR(255),
  "30_day_review_date" DATE NOT NULL,
  "30_day_score" NUMERIC NOT NULL,
  "60_day_review_date" DATE NOT NULL,
  "60_day_score" NUMERIC NOT NULL,
  "90_day_review_date" DATE NOT NULL,
  "90_day_score" NUMERIC NOT NULL,
  confirmation_letter_issued BOOLEAN NOT NULL,
  department VARCHAR(255),
  employee_name VARCHAR(255),
  end_date DATE NOT NULL,
  manager VARCHAR(255),
  mentor_buddy VARCHAR(255),  -- relation -> target record
  milestones_met BOOLEAN NOT NULL,
  notes TEXT,
  overall_score NUMERIC NOT NULL,
  probation_id SERIAL PRIMARY KEY,
  start_date DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_probation_tracker_status ON probation_tracker (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Probation Tracker",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Probation Record": { "type": "string" },
      "30-Day Review Date": { "type": "string", "format": "date" },
      "30-Day Score": { "type": "number" },
      "60-Day Review Date": { "type": "string", "format": "date" },
      "60-Day Score": { "type": "number" },
      "90-Day Review Date": { "type": "string", "format": "date" },
      "90-Day Score": { "type": "number" },
      "Confirmation Letter Issued": { "type": "boolean" },
      "Department": { "type": "string" },
      "Employee Name": { "type": "string" },
      "End Date": { "type": "string", "format": "date" },
      "Manager": { "type": "string" },
      "Mentor / Buddy": { "type": "string" },
      "Milestones Met": { "type": "boolean" },
      "Notes": { "type": "string" },
      "Overall Score": { "type": "number" },
      "Probation ID": { "type": "integer" },
      "Start Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" }
  },
  "required": [
      "30-Day Review Date",
      "30-Day Score",
      "60-Day Review Date",
      "60-Day Score",
      "90-Day Review Date",
      "90-Day Score",
      "End Date",
      "Overall Score",
      "Start Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Probation Record | Title | Use as the database title |
| 30-Day Review Date | Date | Convert to Date |
| 30-Day Score | Number | Convert to Number |
| 60-Day Review Date | Date | Convert to Date |
| 60-Day Score | Number | Convert to Number |
| 90-Day Review Date | Date | Convert to Date |
| 90-Day Score | Number | Convert to Number |
| Confirmation Letter Issued | Checkbox | Convert to Checkbox |
| Department | Text | Leave as Text |
| Employee Name | Text | Leave as Text |
| End Date | Date | Convert to Date |
| Manager | Text | Leave as Text |
| Mentor / Buddy | Relation (link to the target database) | Convert to Relation, link to the target database |
| Milestones Met | Checkbox | Convert to Checkbox |
| Notes | Text | Leave as Text |
| Overall Score | Number | Convert to Number |
| Probation ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Start Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Not Started", "In Progress", "Passed", "Failed", "Extended" |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Probation Record | `text` | `VARCHAR(255)` | `string` | Text | `PROB-2026-014` |
| 2 | 30-Day Review Date | `date` | `DATE` | `string, format: date` | Date | `2026-07-01` |
| 3 | 30-Day Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 4 | 60-Day Review Date | `date` | `DATE` | `string, format: date` | Date | `2026-07-31` |
| 5 | 60-Day Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 6 | 90-Day Review Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-30` |
| 7 | 90-Day Score | `number` | `NUMERIC` | `number` | Number | `5` |
| 8 | Confirmation Letter Issued | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 9 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 10 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 11 | End Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-31` |
| 12 | Manager | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 13 | Mentor / Buddy | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Priya Nair + Rohit Verma` |
| 14 | Milestones Met | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 15 | Notes | `long_text` | `TEXT` | `string` | Text | `First review passed in February; the second is scheduled once the handover is complete.` |
| 16 | Overall Score | `number` | `NUMERIC` | `number` | Number | `4.2` |
| 17 | Probation ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 18 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-06-01` |
| 19 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In Progress` |

## Select Options

**Status**

```
Not Started | In Progress | Passed | Failed | Extended
```

## Relations

Link fields: `Mentor / Buddy`

## Examples

**Prompt**

```
We have 6 people on probation and one review was missed entirely.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Probation length?
> **A:** 90 days.
>
> **Q:** Review points?
> **A:** At 30, 60 and 90 days.
>
> **Q:** Who confirms?
> **A:** The department head.

**Recommended next step** - offered, not built:

> One record per person with the start date, review dates and the confirmation decision. Keep the criteria attached to the record.
>
> Workflow: Enrolment → First review → Mid review → Final review → Confirmed or extended
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
- Does not decide employment outcomes or provide legal guidance.
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
I want to set up new hire evaluation for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

