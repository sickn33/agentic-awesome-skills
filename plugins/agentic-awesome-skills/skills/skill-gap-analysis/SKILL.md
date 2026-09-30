---
name: skill-gap-analysis
description: 'Skill gap register: employee, skill area, current against required level, gap severity and recommended training. Use for capability planning.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, develop]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Skill Gap Analysis

**What it is:** Skill identification.

## Overview

Works out the smallest useful **Skill Gap Analysis** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- skill gap analysis
- training needs analysis
- capability gap tracker
- skills assessment

Also use it when the user says "skill identification", or describes the same process happening in a
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

> **Q:** Which roles have the biggest gaps?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Scope** - Team or individual? / Which roles? / How many people?
- **Baseline** - Current level known? / Target level? / Who assessed?
- **Action** - Training or reassignment? / Who pays? / By when?
- **Current process** - Is this captured now? / In reviews? / Linked to training?
- **Outcome** - What do you need? / A gap register, a plan or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: skill-gap-analysis
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Scope": null
  "Baseline": null
  "Action": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Record the gap, the target and a date, then link it to a training request. Severity only matters if it drives priority.

**Why this one:** Gaps without an owner and a date become a spreadsheet nobody acts on. Force an owner and a target date at entry.

**Workflow:** Assess → Gap → Severity → Owner and target date → Training request

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
Skill Gap Record,Assessment Date,Current Level,Department,Employee Name,Gap Severity,Notes,Recommended Training,Course Requests,Required Level,Skill Area,Skill ID,Status,Target Date
Advanced SQL,2026-01-15,1 - Beginner,Delivery,Aarav Sharma,Low,Gap list agreed with the team in February; the training budget does not yet cover it.,"Advanced SQL for analysts, six hours self-paced.",CRS-2026-018,1 - Beginner,SQL,,Planned,2026-01-15
```

```sql
CREATE TABLE skill_gap_analysis (
  skill_gap_record VARCHAR(255),
  assessment_date DATE NOT NULL,
  current_level VARCHAR(100) NOT NULL,
  department VARCHAR(255),
  employee_name VARCHAR(255),
  gap_severity VARCHAR(100) NOT NULL,
  notes TEXT,
  recommended_training VARCHAR(255),
  course_requests VARCHAR(255),
  required_level VARCHAR(100) NOT NULL,
  skill_area VARCHAR(255),
  skill_id SERIAL PRIMARY KEY,
  status VARCHAR(100) NOT NULL,
  target_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_skill_gap_analysis_status ON skill_gap_analysis (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Skill Gap Analysis",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Skill Gap Record": { "type": "string" },
      "Assessment Date": { "type": "string", "format": "date" },
      "Current Level": { "type": "string" },
      "Department": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Gap Severity": { "type": "string" },
      "Notes": { "type": "string" },
      "Recommended Training": { "type": "string" },
      "Course Requests": { "type": "string" },
      "Required Level": { "type": "string" },
      "Skill Area": { "type": "string" },
      "Skill ID": { "type": "integer" },
      "Status": { "type": "string" },
      "Target Date": { "type": "string", "format": "date" }
  },
  "required": [
      "Assessment Date",
      "Current Level",
      "Gap Severity",
      "Required Level",
      "Status",
      "Target Date"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Skill Gap Record | Title | Use as the database title |
| Assessment Date | Date | Convert to Date |
| Current Level | Select (add options after import) | Convert to Select, add options: "1 - Beginner", "2 - Basic", "3 - Proficient", "4 - Advanced", "5 - Expert" |
| Department | Text | Leave as Text |
| Employee Name | Text | Leave as Text |
| Gap Severity | Select (add options after import) | Convert to Select, add options: "Low", "Medium", "High", "Critical" |
| Notes | Text | Leave as Text |
| Recommended Training | Text | Leave as Text |
| Course Requests | Text | Leave as Text |
| Required Level | Select (add options after import) | Convert to Select, add options: "1 - Beginner", "2 - Basic", "3 - Proficient", "4 - Advanced", "5 - Expert" |
| Skill Area | Text | Leave as Text |
| Skill ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Status | Select (add options after import) | Convert to Select, add options: "Identified", "Planned", "In Training", "Closed" |
| Target Date | Date | Convert to Date |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Skill Gap Record | `text` | `VARCHAR(255)` | `string` | Text | `Advanced SQL` |
| 2 | Assessment Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 3 | Current Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `1 - Beginner` |
| 4 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 5 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 6 | Gap Severity | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Low` |
| 7 | Notes | `long_text` | `TEXT` | `string` | Text | `Gap list agreed with the team in February; the training budget does not yet cover it.` |
| 8 | Recommended Training | `text` | `VARCHAR(255)` | `string` | Text | `Advanced SQL for analysts, six hours self-paced.` |
| 9 | Course Requests | `text` | `VARCHAR(255)` | `string` | Text | `CRS-2026-018` |
| 10 | Required Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `1 - Beginner` |
| 11 | Skill Area | `text` | `VARCHAR(255)` | `string` | Text | `SQL` |
| 12 | Skill ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 13 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Planned` |
| 14 | Target Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |

## Select Options

**Current Level**

```
1 - Beginner | 2 - Basic | 3 - Proficient | 4 - Advanced | 5 - Expert
```
**Gap Severity**

```
Low | Medium | High | Critical
```
**Required Level**

```
1 - Beginner | 2 - Basic | 3 - Proficient | 4 - Advanced | 5 - Expert
```
**Status**

```
Identified | Planned | In Training | Closed
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We know delivery is weak on SQL but have not prioritised training.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Team or individual?
> **A:** Team.
>
> **Q:** Target level?
> **A:** Advanced.
>
> **Q:** Do you have a plan?
> **A:** No.

**Recommended next step** - offered, not built:

> Record the gap, the target and a date, then link it to a training request. Severity only matters if it drives priority.
>
> Workflow: Assess → Gap → Severity → Owner and target date → Training request
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
- Does not assess skills or deliver training.
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
I want to set up skill identification for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

