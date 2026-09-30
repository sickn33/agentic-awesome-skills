---
name: performance-management
description: 'Performance review register: review type, period, employee and reviewer, KPI, OKR and behaviour scores, overall rating, PIP and promotion flags, development plan. Use for performance reviews.'
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

# Performance Management

**What it is:** Structured reviews.

## Overview

Works out the smallest useful **Performance Management** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- performance review
- appraisal template
- performance review cycle
- employee review tracker

Also use it when the user says "structured reviews", or describes the same process happening in a
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

> **Q:** How often do you review people?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Cycle** - How often? / Probation too? / Who reviews whom?
- **Content** - Ratings or scores? / Goals plus feedback? / Development plan?
- **Process** - Who signs off? / Shared with the person? / Appeals?
- **Current process** - How do you review now? / Forms or documents? / Where stored?
- **Outcome** - What do you need? / Forms, records or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: performance-management
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Cycle": null
  "Content": null
  "Process": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Build the review form around goals and behaviours already tracked elsewhere, and store the record per cycle.

**Why this one:** Reviews become paperwork when the review duplicates data you already track. Reference the KPI and OKR records instead of re-entering them.

**Workflow:** Review cycle → Self input → Manager review → Discussion → Record and actions

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
Review Title,Areas for Improvement,Behaviour Score,Department,Development Plan,Due Date,Employee Name,Increment Recommended,KPI Score,Notes,OKR Score,Overall Rating,PIP Required,Promotion Eligible,Rating Label,Review Date,Review ID,Review Period,Review Type,Reviewer,Status,Strengths
Q1 review - Aarav Sharma,Delegation,4,Delivery,Lead one workstream,2026-01-15,Aarav Sharma,FALSE,82,Cycle opened in February; two reviewers have not submitted their notes yet.,0.7,4 - Exceeds Expectations,FALSE,FALSE,Strong,2026-01-15,,Q1 2026,Probation,Sneha Iyer,Manager Review,Reliable under pressure
```

```sql
CREATE TABLE performance_management (
  review_title VARCHAR(255),
  areas_for_improvement VARCHAR(255),
  behaviour_score NUMERIC NOT NULL,
  department VARCHAR(255),
  development_plan VARCHAR(255),
  due_date DATE NOT NULL,
  employee_name VARCHAR(255),
  increment_recommended BOOLEAN NOT NULL,
  kpi_score NUMERIC NOT NULL,
  notes TEXT,
  okr_score NUMERIC NOT NULL,
  overall_rating VARCHAR(100) NOT NULL,
  pip_required BOOLEAN NOT NULL,
  promotion_eligible BOOLEAN NOT NULL,
  rating_label VARCHAR(255),
  review_date DATE NOT NULL,
  review_id SERIAL PRIMARY KEY,
  review_period VARCHAR(255),
  review_type VARCHAR(100) NOT NULL,
  reviewer VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  strengths VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_performance_management_status ON performance_management (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Performance Management",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Review Title": { "type": "string" },
      "Areas for Improvement": { "type": "string" },
      "Behaviour Score": { "type": "number" },
      "Department": { "type": "string" },
      "Development Plan": { "type": "string" },
      "Due Date": { "type": "string", "format": "date" },
      "Employee Name": { "type": "string" },
      "Increment Recommended": { "type": "boolean" },
      "KPI Score": { "type": "number" },
      "Notes": { "type": "string" },
      "OKR Score": { "type": "number" },
      "Overall Rating": { "type": "string" },
      "PIP Required": { "type": "boolean" },
      "Promotion Eligible": { "type": "boolean" },
      "Rating Label": { "type": "string" },
      "Review Date": { "type": "string", "format": "date" },
      "Review ID": { "type": "integer" },
      "Review Period": { "type": "string" },
      "Review Type": { "type": "string" },
      "Reviewer": { "type": "string" },
      "Status": { "type": "string" },
      "Strengths": { "type": "string" }
  },
  "required": [
      "Behaviour Score",
      "Due Date",
      "KPI Score",
      "OKR Score",
      "Overall Rating",
      "Review Date",
      "Review Type",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Review Title | Title | Use as the database title |
| Areas for Improvement | Text | Leave as Text |
| Behaviour Score | Number | Convert to Number |
| Department | Text | Leave as Text |
| Development Plan | Text | Leave as Text |
| Due Date | Date | Convert to Date |
| Employee Name | Text | Leave as Text |
| Increment Recommended | Checkbox | Convert to Checkbox |
| KPI Score | Number | Convert to Number |
| Notes | Text | Leave as Text |
| OKR Score | Number | Convert to Number |
| Overall Rating | Select (add options after import) | Convert to Select, add options: "1 - Needs Improvement", "2 - Developing", "3 - Meets Expectations", "4 - Exceeds Expectations", "5 - Outstanding" |
| PIP Required | Checkbox | Convert to Checkbox |
| Promotion Eligible | Checkbox | Convert to Checkbox |
| Rating Label | Text | Leave as Text |
| Review Date | Date | Convert to Date |
| Review ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Review Period | Text | Leave as Text |
| Review Type | Select (add options after import) | Convert to Select, add options: "Probation", "Quarterly", "Half Yearly", "Annual", "Mid Term" |
| Reviewer | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Not Started", "Self Review", "Manager Review", "Calibration", "Finalised" |
| Strengths | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Review Title | `text` | `VARCHAR(255)` | `string` | Text | `Q1 review - Aarav Sharma` |
| 2 | Areas for Improvement | `text` | `VARCHAR(255)` | `string` | Text | `Delegation` |
| 3 | Behaviour Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 4 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 5 | Development Plan | `text` | `VARCHAR(255)` | `string` | Text | `Lead one workstream` |
| 6 | Due Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 7 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 8 | Increment Recommended | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 9 | KPI Score | `number` | `NUMERIC` | `number` | Number | `82` |
| 10 | Notes | `long_text` | `TEXT` | `string` | Text | `Cycle opened in February; two reviewers have not submitted their notes yet.` |
| 11 | OKR Score | `number` | `NUMERIC` | `number` | Number | `0.7` |
| 12 | Overall Rating | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `4 - Exceeds Expectations` |
| 13 | PIP Required | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 14 | Promotion Eligible | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 15 | Rating Label | `text` | `VARCHAR(255)` | `string` | Text | `Strong` |
| 16 | Review Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 17 | Review ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 18 | Review Period | `text` | `VARCHAR(255)` | `string` | Text | `Q1 2026` |
| 19 | Review Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Probation` |
| 20 | Reviewer | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 21 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Manager Review` |
| 22 | Strengths | `text` | `VARCHAR(255)` | `string` | Text | `Reliable under pressure` |

## Select Options

**Overall Rating**

```
1 - Needs Improvement | 2 - Developing | 3 - Meets Expectations | 4 - Exceeds Expectations | 5 - Outstanding
```
**Review Type**

```
Probation | Quarterly | Half Yearly | Annual | Mid Term
```
**Status**

```
Not Started | Self Review | Manager Review | Calibration | Finalised
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Reviews are done on forms nobody can find a year later.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How often?
> **A:** Half yearly.
>
> **Q:** Ratings or scores?
> **A:** Both, 1 to 5.
>
> **Q:** Where stored?
> **A:** Email.

**Recommended next step** - offered, not built:

> Build the review form around goals and behaviours already tracked elsewhere, and store the record per cycle.
>
> Workflow: Review cycle → Self input → Manager review → Discussion → Record and actions
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
- Does not make promotion or pay decisions, and carries no legal standing on its own.
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
I want to set up structured reviews for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

