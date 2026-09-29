---
name: reports-analytics
description: 'Report register: type, source modules, owner, audience, frequency, last and next run and report link. Use for reporting governance.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, analyze]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Reports & Analytics

**What it is:** Insights hub.

## Overview

Works out the smallest useful **Reports & Analytics** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 9: Analyze. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- report builder
- analytics report template
- periodic report tracker
- insight reports

Also use it when the user says "insights hub", or describes the same process happening in a
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

> **Q:** Who reads the reports you produce now?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Readers** - Who reads them? / How often? / Monthly or weekly?
- **Content** - Which numbers? / Comparisons included? / Any narrative?
- **Data** - Sources available? / Who prepares it? / How long does it take?
- **Current process** - How produced now? / Manual effort? / Is it trusted?
- **Outcome** - What do you need? / A report set, a template or the underlying data?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: reports-analytics
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Readers": null
  "Content": null
  "Data": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Build a fixed monthly pack with a small set of numbers and one comment per number, and stop producing reports nobody reads.

**Why this one:** Reporting effort goes into formatting, not analysis. A fixed template plus a comment per metric is the smallest useful version.

**Workflow:** Data gathered → Metric calculated → Comment written → Circulated → Action noted

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
Report Name,Report Type,Source Modules,Owner,Audience,Frequency,Last Run,Next Run,Report Link,Status,Report ID
Monthly Delivery Report,Operational,"Payments Received, Invoices & Billing",Sneha Iyer,All employees,Daily,2026-01-15 09:30,2026-01-15 09:30,https://example.com/reports/monthly-ops,Published,
```

```sql
CREATE TABLE reports_analytics (
  report_name VARCHAR(255),
  report_type VARCHAR(100) NOT NULL,
  source_modules VARCHAR(255),
  owner VARCHAR(255),
  audience VARCHAR(255),
  frequency VARCHAR(100) NOT NULL,
  last_run TIMESTAMP NOT NULL,
  next_run TIMESTAMP NOT NULL,
  report_link TEXT,
  status VARCHAR(100) NOT NULL,
  report_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_analytics_status ON reports_analytics (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Reports & Analytics",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Report Name": { "type": "string" },
      "Report Type": { "type": "string" },
      "Source Modules": { "type": "string" },
      "Owner": { "type": "string" },
      "Audience": { "type": "string" },
      "Frequency": { "type": "string" },
      "Last Run": { "type": "string", "format": "date-time" },
      "Next Run": { "type": "string", "format": "date-time" },
      "Report Link": { "type": "string", "format": "uri" },
      "Status": { "type": "string" },
      "Report ID": { "type": "integer" }
  },
  "required": [
      "Report Type",
      "Frequency",
      "Last Run",
      "Next Run",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Report Name | Title | Use as the database title |
| Report Type | Select (add options after import) | Convert to Select, add options: "Operational", "Financial", "Management", "Compliance", "Custom" |
| Source Modules | Text | Leave as Text |
| Owner | Text | Leave as Text |
| Audience | Text | Leave as Text |
| Frequency | Select (add options after import) | Convert to Select, add options: "Daily", "Weekly", "Monthly", "Quarterly", "Half Yearly", "Annual" |
| Last Run | Date (include time) | Convert to Date (include time) |
| Next Run | Date (include time) | Convert to Date (include time) |
| Report Link | URL | Convert to URL |
| Status | Select (add options after import) | Convert to Select, add options: "Scheduled", "Running", "Published", "Failed" |
| Report ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Report Name | `text` | `VARCHAR(255)` | `string` | Text | `Monthly Delivery Report` |
| 2 | Report Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Operational` |
| 3 | Source Modules | `text` | `VARCHAR(255)` | `string` | Text | `Payments Received, Invoices & Billing` |
| 4 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 5 | Audience | `text` | `VARCHAR(255)` | `string` | Text | `All employees` |
| 6 | Frequency | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Daily` |
| 7 | Last Run | `datetime` | `TIMESTAMP` | `string, format: date-time` | Date (include time) | `2026-01-15 09:30` |
| 8 | Next Run | `datetime` | `TIMESTAMP` | `string, format: date-time` | Date (include time) | `2026-01-15 09:30` |
| 9 | Report Link | `url` | `TEXT` | `string, format: uri` | URL | `https://example.com/reports/monthly-ops` |
| 10 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Published` |
| 11 | Report ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Report Type**

```
Operational | Financial | Management | Compliance | Custom
```
**Frequency**

```
Daily | Weekly | Monthly | Quarterly | Half Yearly | Annual
```
**Status**

```
Scheduled | Running | Published | Failed
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We spend two days a month assembling reports nobody comments on.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Who reads them?
> **A:** Directors.
>
> **Q:** How often?
> **A:** Monthly.
>
> **Q:** How produced?
> **A:** Manually, from accounting exports.

**Recommended next step** - offered, not built:

> Build a fixed monthly pack with a small set of numbers and one comment per number, and stop producing reports nobody reads.
>
> Workflow: Data gathered → Metric calculated → Comment written → Circulated → Action noted
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
- Does not gather data from source systems or verify accuracy.
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
I want to set up insights hub for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

