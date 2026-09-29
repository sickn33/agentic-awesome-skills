---
name: culture-retention
description: 'Employee survey and retention register: engagement, growth, happiness, work-life balance and manager-relationship scores, key concern and retention risk. Use for culture surveys.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, engage]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Culture & Retention

**What it is:** Culture management.

## Overview

Works out the smallest useful **Culture & Retention** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 6: Engage. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- employee survey
- culture tracker
- retention risk tracker
- engagement survey results

Also use it when the user says "culture management", or describes the same process happening in a
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

> **Q:** What makes people leave?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **People** - How many people? / Tenure under a year? / Any recent exits?
- **Signals** - What do you track now? / Engagement or exit data? / Who owns it?
- **Cadence** - How often reviewed? / Who reviews? / Any survey?
- **Current process** - Is this captured anywhere? / Survey or conversation? / Is it used?
- **Outcome** - What do you need? / A signal tracker, a survey or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: culture-retention
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "People": null
  "Signals": null
  "Cadence": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Collect a small set of signals on a fixed cadence and review them together, rather than trying to measure culture continuously.

**Why this one:** Retention data is only useful if it is reviewed. A quarterly review of a few signals beats a dashboard nobody opens.

**Workflow:** Signal captured → Cadence review → Theme identified → Action → Follow-up check

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
Survey Title,Action Plan,Anonymous,Culture ID,Department,Employee Name,Engagement Score,Growth Opportunity Score,Happiness Score,Key Concern,Manager Relationship Score,Notes,Responsible,Retention Risk,Status,Survey Date,Survey Type,Work-Life Balance Score
Q1 Engagement Pulse,Publish scores in March,FALSE,,Delivery,Aarav Sharma,4,3,4,Two seniors are on the same account at the same time.,4,"Survey closed in February; the anonymity threshold hid two teams, so it will run again.",Sneha Iyer,Low,Live,2026-03-31,Pulse,3
```

```sql
CREATE TABLE culture_retention (
  survey_title VARCHAR(255),
  action_plan VARCHAR(255),
  anonymous BOOLEAN NOT NULL,
  culture_id SERIAL PRIMARY KEY,
  department VARCHAR(255),
  employee_name VARCHAR(255),
  engagement_score NUMERIC NOT NULL,
  growth_opportunity_score NUMERIC NOT NULL,
  happiness_score NUMERIC NOT NULL,
  key_concern VARCHAR(255),
  manager_relationship_score NUMERIC NOT NULL,
  notes TEXT,
  responsible VARCHAR(255),
  retention_risk VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  survey_date DATE NOT NULL,
  survey_type VARCHAR(100) NOT NULL,
  work_life_balance_score NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_culture_retention_status ON culture_retention (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Culture & Retention",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Survey Title": { "type": "string" },
      "Action Plan": { "type": "string" },
      "Anonymous": { "type": "boolean" },
      "Culture ID": { "type": "integer" },
      "Department": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Engagement Score": { "type": "number" },
      "Growth Opportunity Score": { "type": "number" },
      "Happiness Score": { "type": "number" },
      "Key Concern": { "type": "string" },
      "Manager Relationship Score": { "type": "number" },
      "Notes": { "type": "string" },
      "Responsible": { "type": "string" },
      "Retention Risk": { "type": "string" },
      "Status": { "type": "string" },
      "Survey Date": { "type": "string", "format": "date" },
      "Survey Type": { "type": "string" },
      "Work-Life Balance Score": { "type": "number" }
  },
  "required": [
      "Engagement Score",
      "Growth Opportunity Score",
      "Happiness Score",
      "Manager Relationship Score",
      "Status",
      "Survey Date",
      "Survey Type",
      "Work-Life Balance Score"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Survey Title | Title | Use as the database title |
| Action Plan | Text | Leave as Text |
| Anonymous | Checkbox | Convert to Checkbox |
| Culture ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Department | Text | Leave as Text |
| Employee Name | Text | Leave as Text |
| Engagement Score | Number | Convert to Number |
| Growth Opportunity Score | Number | Convert to Number |
| Happiness Score | Number | Convert to Number |
| Key Concern | Text | Leave as Text |
| Manager Relationship Score | Number | Convert to Number |
| Notes | Text | Leave as Text |
| Responsible | Text | Leave as Text |
| Retention Risk | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Live", "Closed", "Archived" |
| Survey Date | Date | Convert to Date |
| Survey Type | Select (add options after import) | Convert to Select, add options: "Pulse", "Quarterly", "Half Yearly", "Annual", "Exit" |
| Work-Life Balance Score | Number | Convert to Number |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Survey Title | `text` | `VARCHAR(255)` | `string` | Text | `Q1 Engagement Pulse` |
| 2 | Action Plan | `text` | `VARCHAR(255)` | `string` | Text | `Publish scores in March` |
| 3 | Anonymous | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 4 | Culture ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 5 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 6 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 7 | Engagement Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 8 | Growth Opportunity Score | `number` | `NUMERIC` | `number` | Number | `3` |
| 9 | Happiness Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 10 | Key Concern | `text` | `VARCHAR(255)` | `string` | Text | `Two seniors are on the same account at the same time.` |
| 11 | Manager Relationship Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 12 | Notes | `long_text` | `TEXT` | `string` | Text | `Survey closed in February; the anonymity threshold hid two teams, so it will run again.` |
| 13 | Responsible | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 14 | Retention Risk | `text` | `VARCHAR(255)` | `string` | Text | `Low` |
| 15 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Live` |
| 16 | Survey Date | `date` | `DATE` | `string, format: date` | Date | `2026-03-31` |
| 17 | Survey Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Pulse` |
| 18 | Work-Life Balance Score | `number` | `NUMERIC` | `number` | Number | `3` |

## Select Options

**Status**

```
Draft | Live | Closed | Archived
```
**Survey Type**

```
Pulse | Quarterly | Half Yearly | Annual | Exit
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We lost two people last quarter and did not notice the pattern until after.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many people?
> **A:** Forty.
>
> **Q:** What do you track?
> **A:** Exit reasons only.
>
> **Q:** How often reviewed?
> **A:** Never.

**Recommended next step** - offered, not built:

> Collect a small set of signals on a fixed cadence and review them together, rather than trying to measure culture continuously.
>
> Workflow: Signal captured → Cadence review → Theme identified → Action → Follow-up check
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
- Does not predict attrition or run engagement surveys for you.
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
I want to set up culture management for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

