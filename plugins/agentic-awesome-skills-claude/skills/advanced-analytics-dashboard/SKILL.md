---
name: advanced-analytics-dashboard
description: 'Dashboard metric register: metric, source module, formula, period, value, target, trend, owner and last-updated, as CSV, SQL, JSON Schema or Notion on request. Use for KPI dashboards.'
category: business
risk: safe
source: self
source_type: self
date_added: '2026-09-26'
author: WHOISABHISHEKADHIKARI
tags:
- sme
- business
- operations
- database
- csv
- notion
- sql
- analyze
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Advanced Analytics Dashboard

**What it is:** A register for analytics metrics and their sources; it does not train or run predictive models.

## Overview

Works out the smallest useful **Advanced Analytics Dashboard** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 9: Analyze. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- analytics dashboard
- predictive metrics
- kpi dashboard template
- business metrics dashboard

Also use it when the user says "predictive insights", or describes the same process happening in a
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

> **Q:** Which decision is the dashboard meant to support?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Decision** - Which decision? / Who makes it? / How often?
- **Data** - Which sources? / How many rows? / How fresh does it need to be?
- **Measures** - Which metrics? / How many? / Compared against what?
- **Current process** - Do you have a dashboard? / Manual or tool-based? / Is it trusted?
- **Outcome** - What do you need? / A metric set, a layout or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: advanced-analytics-dashboard
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Decision": null
  "Data": null
  "Measures": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Start with the decision, then add one metric per part of it. Layout is a late decision and rarely the problem.

**Why this one:** Dashboards fail from metric sprawl, not from design. Fix the decision and the metric count first, and the layout follows.

**Workflow:** Metric defined → Source data → Calculation → Refresh → Decision review

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
Metric,Category,Source Module,Formula or Method,Period,Value,Target,Trend,Owner,Last Updated,Metric ID
Net revenue,General,Invoices & Billing,"Revenue invoiced minus credits, divided by active clients.",2026-03,1000,100,Up 3 months running,Example Owner,2026-01-15,
```

```sql
CREATE TABLE advanced_analytics_dashboard (
  metric VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  source_module VARCHAR(255),
  formula_or_method VARCHAR(255),
  period VARCHAR(255),
  value NUMERIC NOT NULL,
  target NUMERIC NOT NULL,
  trend VARCHAR(255),
  owner VARCHAR(255),
  last_updated DATE NOT NULL,
  metric_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Advanced Analytics Dashboard",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Metric": { "type": "string" },
      "Category": { "type": "string" },
      "Source Module": { "type": "string" },
      "Formula or Method": { "type": "string" },
      "Period": { "type": "string" },
      "Value": { "type": "number" },
      "Target": { "type": "number" },
      "Trend": { "type": "string" },
      "Owner": { "type": "string" },
      "Last Updated": { "type": "string", "format": "date" },
      "Metric ID": { "type": "integer" }
  },
  "required": [
      "Category",
      "Value",
      "Target",
      "Last Updated"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Metric | Title | Use as the database title |
| Category | Select (add options after import) | Convert to Select, add options: "General", "Operations", "Finance", "People", "Compliance" |
| Source Module | Text | Leave as Text |
| Formula or Method | Text | Leave as Text |
| Period | Text | Leave as Text |
| Value | Number | Convert to Number |
| Target | Number | Convert to Number |
| Trend | Text | Leave as Text |
| Owner | Text | Leave as Text |
| Last Updated | Date | Convert to Date |
| Metric ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Metric | `text` | `VARCHAR(255)` | `string` | Text | `Net revenue` |
| 2 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `General` |
| 3 | Source Module | `text` | `VARCHAR(255)` | `string` | Text | `Invoices & Billing` |
| 4 | Formula or Method | `text` | `VARCHAR(255)` | `string` | Text | `Revenue invoiced minus credits, divided by active clients.` |
| 5 | Period | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 6 | Value | `number` | `NUMERIC` | `number` | Number | `1000` |
| 7 | Target | `number` | `NUMERIC` | `number` | Number | `100` |
| 8 | Trend | `text` | `VARCHAR(255)` | `string` | Text | `Up 3 months running` |
| 9 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Example Owner` |
| 10 | Last Updated | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 11 | Metric ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Category**

```
General | Operations | Finance | People | Compliance
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We have a dashboard with 30 tiles that nobody uses.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which decision?
> **A:** Which projects need attention.
>
> **Q:** Data sources?
> **A:** Project tracker and accounting.
>
> **Q:** How often?
> **A:** Weekly.

**Recommended next step** - offered, not built:

> Start with the decision, then add one metric per part of it. Layout is a late decision and rarely the problem.
>
> Workflow: Metric defined → Source data → Calculation → Refresh → Decision review
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

- Forecasts require supplied data, a specified model, evaluation evidence and uncertainty.
  This template alone produces no predictions or verified insights.

- Empty template only. It does not compute payroll, tax, leave balances or KPIs.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Does not connect to source systems, clean data or guarantee metric accuracy.
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
I want to set up predictive insights for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

