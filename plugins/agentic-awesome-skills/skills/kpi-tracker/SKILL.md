---
name: kpi-tracker
description: 'KPI register: metric by level, department, job title and employee, linked OKR, unit and direction, target against actual, achievement and weight percentages, period and owner. Use for scorecards.'
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

# KPI Tracker

**What it is:** KPIs by company, department, role and person with targets and actuals.

## Overview

Works out the smallest useful **KPI Tracker** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- kpi tracker
- kpi dashboard spreadsheet
- target vs actual
- performance metrics tracker

Also use it when the user says "kpis by company, department, role and person with targets and actuals", or describes the same process happening in a
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

> **Q:** Which KPIs matter most?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Metrics** - Which KPIs? / Company or team level? / How many to start?
- **Shape** - Target and actual? / Unit and direction? / Weight or equal?
- **Cadence** - How often reviewed? / Who reviews? / Data source?
- **Current process** - How do you track today? / Spreadsheet or dashboard? / Is it trusted?
- **Outcome** - What do you need? / A tracker, a dashboard or scoring?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: kpi-tracker
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Metrics": null
  "Shape": null
  "Cadence": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Start with three to five metrics per level and a fixed review cadence. Weighting only matters when scores are compared across people.

**Why this one:** KPI trackers fail from volume, not from schema. Fewer metrics reviewed on a schedule beats a full scorecard nobody opens.

**Workflow:** KPI definition → Target → Actual entry → Achievement → Review meeting

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
KPI Name,KPI Level,Department,Job Title,Employee Name,Linked OKR,Unit,Direction,Target,Actual,Achievement %,Weight %,Weighted Score,Period,Data Source,Owner,Status,KPI ID
On-time delivery,Company,Delivery,Delivery Manager,Aarav Sharma,OKR-2026-Q1-02,Percent,Higher is better,95,88,93,30,4.1,2026-03,Manual,Sneha Iyer,Active,
```

```sql
CREATE TABLE kpi_tracker (
  kpi_name VARCHAR(255),
  kpi_level VARCHAR(100) NOT NULL,
  department VARCHAR(255),
  job_title VARCHAR(255),
  employee_name VARCHAR(255),
  linked_okr VARCHAR(255),  -- relation -> target record
  unit VARCHAR(255),
  direction VARCHAR(255),
  target NUMERIC NOT NULL,
  actual NUMERIC NOT NULL,
  achievement_pct NUMERIC NOT NULL,
  weight_pct NUMERIC NOT NULL,
  weighted_score NUMERIC NOT NULL,
  period VARCHAR(255),
  data_source VARCHAR(255),
  owner VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  kpi_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kpi_tracker_status ON kpi_tracker (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "KPI Tracker",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "KPI Name": { "type": "string" },
      "KPI Level": { "type": "string" },
      "Department": { "type": "string" },
      "Job Title": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Linked OKR": { "type": "string" },
      "Unit": { "type": "string" },
      "Direction": { "type": "string" },
      "Target": { "type": "number" },
      "Actual": { "type": "number" },
      "Achievement %": { "type": "number" },
      "Weight %": { "type": "number" },
      "Weighted Score": { "type": "number" },
      "Period": { "type": "string" },
      "Data Source": { "type": "string" },
      "Owner": { "type": "string" },
      "Status": { "type": "string" },
      "KPI ID": { "type": "integer" }
  },
  "required": [
      "KPI Level",
      "Target",
      "Actual",
      "Achievement %",
      "Weight %",
      "Weighted Score",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| KPI Name | Title | Use as the database title |
| KPI Level | Select (add options after import) | Convert to Select, add options: "Company", "Department", "Role", "Individual" |
| Department | Text | Leave as Text |
| Job Title | Text | Leave as Text |
| Employee Name | Text | Leave as Text |
| Linked OKR | Relation (link to the target database) | Convert to Relation, link to the target database |
| Unit | Text | Leave as Text |
| Direction | Text | Leave as Text |
| Target | Number | Convert to Number |
| Actual | Number | Convert to Number |
| Achievement % | Number | Convert to Number |
| Weight % | Number | Convert to Number |
| Weighted Score | Number | Convert to Number |
| Period | Text | Leave as Text |
| Data Source | Text | Leave as Text |
| Owner | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Active", "At Risk", "Retired" |
| KPI ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | KPI Name | `text` | `VARCHAR(255)` | `string` | Text | `On-time delivery` |
| 2 | KPI Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Company` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Job Title | `text` | `VARCHAR(255)` | `string` | Text | `Delivery Manager` |
| 5 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 6 | Linked OKR | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `OKR-2026-Q1-02` |
| 7 | Unit | `text` | `VARCHAR(255)` | `string` | Text | `Percent` |
| 8 | Direction | `text` | `VARCHAR(255)` | `string` | Text | `Higher is better` |
| 9 | Target | `number` | `NUMERIC` | `number` | Number | `95` |
| 10 | Actual | `number` | `NUMERIC` | `number` | Number | `88` |
| 11 | Achievement % | `number` | `NUMERIC` | `number` | Number | `93` |
| 12 | Weight % | `number` | `NUMERIC` | `number` | Number | `30` |
| 13 | Weighted Score | `number` | `NUMERIC` | `number` | Number | `4.1` |
| 14 | Period | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 15 | Data Source | `text` | `VARCHAR(255)` | `string` | Text | `Manual` |
| 16 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 17 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |
| 18 | KPI ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**KPI Level**

```
Company | Department | Role | Individual
```
**Status**

```
Draft | Active | At Risk | Retired
```

## Relations

Link fields: `Linked OKR`

## Examples

**Prompt**

```
We have 20 KPIs in a sheet and nobody reviews them.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which KPIs?
> **A:** Delivery on time and CSAT.
>
> **Q:** How often?
> **A:** Monthly.
>
> **Q:** Who reviews?
> **A:** Department heads.

**Recommended next step** - offered, not built:

> Start with three to five metrics per level and a fixed review cadence. Weighting only matters when scores are compared across people.
>
> Workflow: KPI definition → Target → Actual entry → Achievement → Review meeting
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
- Does not collect data automatically or connect to a source system.
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
I want to set up kpis by company, department, role and person with targets and actuals for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

