---
name: data-export-engine
description: 'Data export log: source module, purpose, format, requester and approver, delivery dates, personal-data flag and status. Use for export audit trails.'
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

# Data Export Engine

**What it is:** Data extraction.

## Overview

Works out the smallest useful **Data Export Engine** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 9: Analyze. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- data export log
- data request tracker
- export register
- data extraction record

Also use it when the user says "data extraction", or describes the same process happening in a
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

> **Q:** Where does the data need to go?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Sources** - Which systems? / How many? / What format today?
- **Destination** - Where is it going? / Who consumes it? / How often?
- **Scope** - All records or a subset? / Any sensitive data? / Filtering needed?
- **Current process** - How exported now? / Manual or automated? / What breaks?
- **Outcome** - What do you need? / A one-off export or a repeating feed?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: data-export-engine
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Sources": null
  "Destination": null
  "Scope": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** For a one-off export, use a generated CSV. Only build a repeating feed when the consumer needs it on a schedule.

**Why this one:** Most export requests are one-off. A manual CSV generated from a view solves them; automation is worth it only for a fixed schedule.

**Workflow:** Scope defined → Exported → Delivered → Consumed or archived

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
Export Name,Source Module,Requested By,Purpose,Format,Date Requested,Date Delivered,Contains Personal Data,Approved By,Status,Export ID
Payroll export Feb,Invoices & Billing,Rohit Verma,Payroll audit,CSV,2026-01-15,2026-01-15,FALSE,Vikram Singh,Completed,
```

```sql
CREATE TABLE data_export_engine (
  export_name VARCHAR(255),
  source_module VARCHAR(255),
  requested_by VARCHAR(255),
  purpose VARCHAR(255),
  format VARCHAR(255),
  date_requested DATE NOT NULL,
  date_delivered DATE NOT NULL,
  contains_personal_data BOOLEAN NOT NULL,
  approved_by VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  export_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_export_engine_status ON data_export_engine (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Data Export Engine",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Export Name": { "type": "string" },
      "Source Module": { "type": "string" },
      "Requested By": { "type": "string" },
      "Purpose": { "type": "string" },
      "Format": { "type": "string" },
      "Date Requested": { "type": "string", "format": "date" },
      "Date Delivered": { "type": "string", "format": "date" },
      "Contains Personal Data": { "type": "boolean" },
      "Approved By": { "type": "string" },
      "Status": { "type": "string" },
      "Export ID": { "type": "integer" }
  },
  "required": [
      "Date Requested",
      "Date Delivered",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Export Name | Title | Use as the database title |
| Source Module | Text | Leave as Text |
| Requested By | Text | Leave as Text |
| Purpose | Text | Leave as Text |
| Format | Text | Leave as Text |
| Date Requested | Date | Convert to Date |
| Date Delivered | Date | Convert to Date |
| Contains Personal Data | Checkbox | Convert to Checkbox |
| Approved By | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Requested", "Approved", "Running", "Completed", "Failed" |
| Export ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Export Name | `text` | `VARCHAR(255)` | `string` | Text | `Payroll export Feb` |
| 2 | Source Module | `text` | `VARCHAR(255)` | `string` | Text | `Invoices & Billing` |
| 3 | Requested By | `text` | `VARCHAR(255)` | `string` | Text | `Rohit Verma` |
| 4 | Purpose | `text` | `VARCHAR(255)` | `string` | Text | `Payroll audit` |
| 5 | Format | `text` | `VARCHAR(255)` | `string` | Text | `CSV` |
| 6 | Date Requested | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 7 | Date Delivered | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Contains Personal Data | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 9 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 10 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Completed` |
| 11 | Export ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Status**

```
Requested | Approved | Running | Completed | Failed
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We copy data out of two systems by hand every month.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Where does it go?
> **A:** A reporting spreadsheet.
>
> **Q:** How often?
> **A:** Monthly.
>
> **Q:** Manual today?
> **A:** Yes, copy and paste.

**Recommended next step** - offered, not built:

> For a one-off export, use a generated CSV. Only build a repeating feed when the consumer needs it on a schedule.
>
> Workflow: Scope defined → Exported → Delivered → Consumed or archived
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
- Does not connect to any system or run on a schedule without a tool.
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
I want to set up data extraction for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

