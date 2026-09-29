---
name: competency-matrix
description: 'Competency matrix of expected proficiency by job title and grade, with assessment method and linked skill area. Use for role frameworks and hiring bars.'
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

# Competency Matrix

**What it is:** Skill levels.

## Overview

Works out the smallest useful **Competency Matrix** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- competency matrix
- skills framework
- role competency model
- capability matrix

Also use it when the user says "skill levels" for **roles** (what each role must show), or
describes the same process happening in a spreadsheet, a document or someone's inbox.

Do not use it for: payroll calculation, tax filing, or legal advice; assessing named people
against expected levels (that is `skill-gap-analysis`); or certifying competence. This skill
produces empty templates only - it never holds or processes real employee or customer data.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> `set up`; go to Step 2.
- "our process is ..." or "it is in a sheet" -> `import`; capture it, then Step 2.
- "is this right" or "review" or "audit" -> `review`; answer from what they share. Do not open an intake question.
- "how do I ..." -> `report`; answer directly and offer the build only if it helps.
- "fix" -> `fix`; correct confirmed defects in the supplied material.

One message, one question, no batching. If intent is `set up` or `import` and the user has
not named the roles, open with:

> **Q:** Which roles need a competency model?

If they already named roles, ask the next missing fact that would change the recommendation
or the requested artifact. Never ask a question whose answer would not change the result.

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Roles** - Which roles? Skip if already named. This table also stores two different
  "level" facts. Do not ask "How many levels?" until you know which: **Grade Level**
  (job grade) or **Expected Level** (proficiency). First ask which they mean, using those
  two names. After that answer, ask how many and what they are called.
- **Competencies** - Which competencies? / Derived from what?
- **Assessment** - Who assesses? / Self or manager? / How often?
- **Current process** - Is anything documented? / Training linked? / What is missing?
- **Outcome** - What do you need? A matrix, an assessment sheet, or a link to a gap record?
  Do not assume a skill-gap table unless they asked for that link.

Never invent an answer. If the user does not know, record it as unknown and carry on.
Country and software are not required inputs for a country-neutral, tool-neutral
competency-matrix review. Ask for either only when the user supplied country- or
tool-specific requirements that materially change the requested result.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: competency-matrix
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Roles": null
  "Competencies": null
  "Assessment": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Give a short recommendation from confirmed facts only, then ask whether to build it. Do not
build unprompted. Ask: "Want me to build the CSV, SQL DDL, JSON Schema, Notion mapping, or an
Excel workbook from these confirmed rules?"

**Recommended approach:** Define a small set of proficiency levels and attach each competency
to the confirmed roles. Include grades only when the user named them. Mention a gap or
training link only when the user confirmed they need one.

**Why this one:** A matrix that is not attached to roles (and, when confirmed, to a later
assessment or gap record) does not change any decision.

**Workflow:** Roles → Competencies → Level expectations → Assessment. Add a gap and training
link only when that outcome was confirmed.

### Step 5 - Build only on request

Once the user asks for it, emit the artifacts as data only. No preamble, no summary, no
closing line. The Field Reference is the documented starting shape. If the user confirmed
different grade names, proficiency labels, or category names, emit those as the select
options instead of the starting set. Do not keep a five-level proficiency list when they
confirmed four. Do not invent competencies, roles, or grades they did not supply.

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
A CSV carries no types. This shape has no number, date, or currency columns to format after import.

```csv
Competency,Category,Job Title,Grade Level,Expected Level,Description,Assessment Method,Linked Skill Area,Competency ID
Example Competency,General,Example Role,L1,1 - Beginner,"States the expected stakeholder work at this grade.",Manager observation plus a practical task,SKL-EXAMPLE-001,
```

```sql
CREATE TABLE competency_matrix (
  competency VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  job_title VARCHAR(255),
  grade_level VARCHAR(100) NOT NULL,
  expected_level VARCHAR(100) NOT NULL,
  description TEXT,
  assessment_method VARCHAR(255),
  linked_skill_area VARCHAR(255),  -- text reference; not a foreign key in this build
  competency_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Competency Matrix",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Competency": { "type": "string" },
      "Category": { "type": "string" },
      "Job Title": { "type": "string" },
      "Grade Level": { "type": "string" },
      "Expected Level": { "type": "string" },
      "Description": { "type": "string" },
      "Assessment Method": { "type": "string" },
      "Linked Skill Area": { "type": "string" },
      "Competency ID": { "type": "integer" }
  },
  "required": [
      "Category",
      "Grade Level",
      "Expected Level"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Competency | Title | Use as the database title |
| Category | Select (add options after import) | Convert to Select, add options: "General", "Operations", "Finance", "People", "Compliance" |
| Job Title | Text | Leave as Text |
| Grade Level | Select (add options after import) | Convert to Select, add options: "L1", "L2", "L3", "L4", "L5", "M1", "M2" |
| Expected Level | Select (add options after import) | Convert to Select, add options: "1 - Beginner", "2 - Basic", "3 - Proficient", "4 - Advanced", "5 - Expert" |
| Description | Text | Leave as Text |
| Assessment Method | Text | Leave as Text |
| Linked Skill Area | Text | Leave as Text, NOT a Relation. The skill-gap table is not part of this build, so no target database exists to link to |
| Competency ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly
requests examples. This module has no money, date, or relation fields.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Competency | `text` | `VARCHAR(255)` | `string` | Text | `Example Competency` |
| 2 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `General` |
| 3 | Job Title | `text` | `VARCHAR(255)` | `string` | Text | `Example Role` |
| 4 | Grade Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `L1` |
| 5 | Expected Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `1 - Beginner` |
| 6 | Description | `long_text` | `TEXT` | `string` | Text | `States the expected stakeholder work at this grade.` |
| 7 | Assessment Method | `text` | `VARCHAR(255)` | `string` | Text | `Manager observation plus a practical task` |
| 8 | Linked Skill Area | `text` | `VARCHAR(255)` | `string` | Text | `SKL-EXAMPLE-001` |
| 9 | Competency ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

Starting set only. If the user supplied their own values, the user's values win.

**Category**

```
General | Operations | Finance | People | Compliance
```
**Grade Level**

```
L1 | L2 | L3 | L4 | L5 | M1 | M2
```
**Expected Level**

```
1 - Beginner | 2 - Basic | 3 - Proficient | 4 - Advanced | 5 - Expert
```

## Relations

Link fields: none

`Linked Skill Area` is text, not a relation. It holds a reference such as `SKL-EXAMPLE-001`.
The `skill-gap-analysis` table is a separate skill and is not created by this build, so there
is no target database to link to. It becomes a real foreign key only if that table is built in
the same artifact set.

## Examples

**Prompt**

```
We want a consistent way to describe what good looks like per role.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which roles need a competency model?
> **A:** Delivery and support.
>
> **Q:** Do you mean job grades (Grade Level) or proficiency (Expected Level)?
> **A:** Proficiency.
>
> **Q:** Who assesses?
> **A:** The manager.

**Recommended next step** - offered, not built:

> Define a small set of proficiency levels and attach each competency to Delivery and support.
> Assessment is by the manager. Proficiency labels are Unknown until named.
>
> Workflow: Roles → Competencies → Level expectations → Assessment
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Do not type `Linked Skill Area` as a Notion Relation; the target table is not in this build.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.
- Do not treat Grade Level and Expected Level as the same question.

## Limitations

- Empty template only. It does not compute payroll, tax, leave balances or KPIs.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Does not assess or certify competence.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

- Never fill in real names, salaries, medical or banking data. Placeholders only.
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
- **Problem:** "How many levels?" was answered as four, then the five-level starting set was emitted.
  **Solution:** emit the confirmed labels; keep the starting set only when the user did not name theirs.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @skill-gap-analysis - actual vs expected for a named person; this skill stores expected
  levels per role, not a person's gap.

## Reusable Prompt

```
I want to set up skill levels for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```
