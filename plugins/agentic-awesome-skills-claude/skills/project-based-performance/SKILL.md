---
name: project-based-performance
description: 'Project performance review: role, project and manager, delivery, quality and collaboration scores, overall score and feedback. Use for project appraisals.'
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

# Project-Based Performance

**What it is:** Per-project reviews.

## Overview

Works out the smallest useful **Project-Based Performance** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 8: Operate. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- project performance review
- project feedback
- delivery scorecard
- project review tracker

Also use it when the user says "per-project reviews", or describes the same process happening in a
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

> **Q:** How many live projects do you have?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Projects** - How many live? / How long each? / Who owns delivery?
- **Measures** - Delivered on time? / Budget or effort? / Client satisfaction?
- **Cadence** - How often reviewed? / Who reviews? / Team or individual?
- **Current process** - Is it captured now? / Status report or a sheet? / Is it comparable?
- **Outcome** - What do you need? / A project scorecard or a status tracker?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: project-based-performance
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Projects": null
  "Measures": null
  "Cadence": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Score a project at completion against three or four fixed measures, and keep a close reason code so the data improves over time.

**Why this one:** Project performance needs a consistent denominator to be comparable. Fix the measures and the close reason, and the comparison works.

**Workflow:** Project delivered → Measures scored → Close reason recorded → Review across projects

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
Project Review Title,Employee Name,Project,Project Manager,Role on Project,Review Date,Delivery Score,Quality Score,Collaboration Score,Overall Score,Feedback,Linked Performance Review,Status,Project Review ID
Northwind handover review,Aarav Sharma,Website Redesign,Sneha Iyer,Delivery Lead,2026-01-15,5,4,5,4.2,Clearer deadlines would help. Handovers went well this quarter.,REV-2026-Q1,In Progress,
```

```sql
CREATE TABLE project_based_performance (
  project_review_title VARCHAR(255),
  employee_name VARCHAR(255),
  project VARCHAR(255),
  project_manager VARCHAR(255),
  role_on_project VARCHAR(255),
  review_date DATE NOT NULL,
  delivery_score NUMERIC NOT NULL,
  quality_score NUMERIC NOT NULL,
  collaboration_score NUMERIC NOT NULL,
  overall_score NUMERIC NOT NULL,
  feedback TEXT,
  linked_performance_review VARCHAR(255),  -- relation -> target record
  status VARCHAR(100) NOT NULL,
  project_review_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_project_based_performance_status ON project_based_performance (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Project-Based Performance",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Project Review Title": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Project": { "type": "string" },
      "Project Manager": { "type": "string" },
      "Role on Project": { "type": "string" },
      "Review Date": { "type": "string", "format": "date" },
      "Delivery Score": { "type": "number" },
      "Quality Score": { "type": "number" },
      "Collaboration Score": { "type": "number" },
      "Overall Score": { "type": "number" },
      "Feedback": { "type": "string" },
      "Linked Performance Review": { "type": "string" },
      "Status": { "type": "string" },
      "Project Review ID": { "type": "integer" }
  },
  "required": [
      "Review Date",
      "Delivery Score",
      "Quality Score",
      "Collaboration Score",
      "Overall Score",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Project Review Title | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Project | Text | Leave as Text |
| Project Manager | Text | Leave as Text |
| Role on Project | Text | Leave as Text |
| Review Date | Date | Convert to Date |
| Delivery Score | Number | Convert to Number |
| Quality Score | Number | Convert to Number |
| Collaboration Score | Number | Convert to Number |
| Overall Score | Number | Convert to Number |
| Feedback | Text | Leave as Text |
| Linked Performance Review | Relation (link to the target database) | Convert to Relation, link to the target database |
| Status | Select (add options after import) | Convert to Select, add options: "Not Started", "In Progress", "Submitted", "Assessed", "Closed" |
| Project Review ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Project Review Title | `text` | `VARCHAR(255)` | `string` | Text | `Northwind handover review` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Project | `text` | `VARCHAR(255)` | `string` | Text | `Website Redesign` |
| 4 | Project Manager | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 5 | Role on Project | `text` | `VARCHAR(255)` | `string` | Text | `Delivery Lead` |
| 6 | Review Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 7 | Delivery Score | `number` | `NUMERIC` | `number` | Number | `5` |
| 8 | Quality Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 9 | Collaboration Score | `number` | `NUMERIC` | `number` | Number | `5` |
| 10 | Overall Score | `number` | `NUMERIC` | `number` | Number | `4.2` |
| 11 | Feedback | `long_text` | `TEXT` | `string` | Text | `Clearer deadlines would help. Handovers went well this quarter.` |
| 12 | Linked Performance Review | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `REV-2026-Q1` |
| 13 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In Progress` |
| 14 | Project Review ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Status**

```
Not Started | In Progress | Submitted | Assessed | Closed
```

## Relations

Link fields: `Linked Performance Review`

## Examples

**Prompt**

```
We know some projects overrun but cannot show the pattern.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many live?
> **A:** Six at a time.
>
> **Q:** Measures?
> **A:** On time and budget.
>
> **Q:** How often reviewed?
> **A:** At the end, if at all.

**Recommended next step** - offered, not built:

> Score a project at completion against three or four fixed measures, and keep a close reason code so the data improves over time.
>
> Workflow: Project delivered → Measures scored → Close reason recorded → Review across projects
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
- Does not assess individuals or report on company-wide performance.
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
I want to set up per-project reviews for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

