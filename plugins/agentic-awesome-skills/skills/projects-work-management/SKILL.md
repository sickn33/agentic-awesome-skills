---
name: projects-work-management
description: 'Project register: owner, team, priority, progress percentage, milestones, deliverables and budget against actual cost. Use for project tracking.'
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

# Projects & Work Management

**What it is:** Work delivery.

## Overview

Works out the smallest useful **Projects & Work Management** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 8: Operate. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- project tracker
- work management sheet
- milestone tracker
- project database

Also use it when the user says "work delivery", or describes the same process happening in a
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

> **Q:** How are projects tracked right now?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Projects** - How many active? / How long? / Who owns each?
- **Work** - Tasks or milestones? / Dependencies tracked? / Estimates used?
- **Team** - How many people per project? / Allocated by percentage? / Changing often?
- **Current process** - What tool today? / Board or spreadsheet? / What is missing?
- **Outcome** - What do you need? / A project register, a task view or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: projects-work-management
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Projects": null
  "Work": null
  "Team": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Use the project tool people already update for tasks, and keep this as the register of projects, owners, dates and health.

**Why this one:** Two systems fail at the boundary. If tasks live in a tool, the register should hold only what the tool cannot: ownership, dates and health.

**Workflow:** Project created → Owner and dates → Tasks tracked → Status review → Closed

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
Project Name,Actual Cost,Budget,Currency,Invoices,Client / Stakeholder,Client Account,Client Satisfaction Score,Deliverables,Department,End Date,Milestones,Notes,Priority,Progress %,Project ID,Project Manager,Project Type,Sprint,Start Date,Status,Team Members
Website Redesign,98000.00,250000.00,INR,"INV-1041, INV-1042",Northwind Traders,Northwind Traders,4,"Wireframes, Build, Launch",Delivery,2026-04-30,"Wireframes, Build, Launch",Client check-in on 12 Feb; scope revisit agreed for March.,Low,60,,Sneha Iyer,Fixed Price,Sprint 3,2026-01-05,Active,"Priya Nair, Rohit Verma"
```

```sql
CREATE TABLE projects_work_management (
  project_name VARCHAR(255),
  actual_cost NUMERIC(14,2) NOT NULL,
  budget NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  invoices VARCHAR(255),  -- relation -> target record
  client_stakeholder VARCHAR(255),
  client_account VARCHAR(255),  -- relation -> target record
  client_satisfaction_score NUMERIC NOT NULL,
  deliverables VARCHAR(255),
  department VARCHAR(255),
  end_date DATE NOT NULL,
  milestones VARCHAR(255),
  notes TEXT,
  priority VARCHAR(100) NOT NULL,
  progress_pct NUMERIC NOT NULL,
  project_id SERIAL PRIMARY KEY,
  project_manager VARCHAR(255),
  project_type VARCHAR(100) NOT NULL,
  sprint VARCHAR(255),
  start_date DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  team_members VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_projects_work_management_status ON projects_work_management (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Projects & Work Management",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Project Name": { "type": "string" },
      "Actual Cost": { "type": "number" },
      "Budget": { "type": "number" },
      "Currency": { "type": "string" },
      "Invoices": { "type": "string" },
      "Client / Stakeholder": { "type": "string" },
      "Client Account": { "type": "string" },
      "Client Satisfaction Score": { "type": "number" },
      "Deliverables": { "type": "string" },
      "Department": { "type": "string" },
      "End Date": { "type": "string", "format": "date" },
      "Milestones": { "type": "string" },
      "Notes": { "type": "string" },
      "Priority": { "type": "string" },
      "Progress %": { "type": "number" },
      "Project ID": { "type": "integer" },
      "Project Manager": { "type": "string" },
      "Project Type": { "type": "string" },
      "Sprint": { "type": "string" },
      "Start Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Team Members": { "type": "string" }
  },
  "required": [
      "Actual Cost",
      "Budget",
      "Client Satisfaction Score",
      "End Date",
      "Priority",
      "Progress %",
      "Project Type",
      "Start Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Project Name | Title | Use as the database title |
| Actual Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Budget | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Invoices | Relation (link to the target database) | Convert to Relation, link to the target database |
| Client / Stakeholder | Text | Leave as Text |
| Client Account | Relation (link to the target database) | Convert to Relation, link to the target database |
| Client Satisfaction Score | Number | Convert to Number |
| Deliverables | Text | Leave as Text |
| Department | Text | Leave as Text |
| End Date | Date | Convert to Date |
| Milestones | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Priority | Select (add options after import) | Convert to Select, add options: "Low", "Medium", "High", "Urgent" |
| Progress % | Number | Convert to Number |
| Project ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Project Manager | Text | Leave as Text |
| Project Type | Select (add options after import) | Convert to Select, add options: "Fixed Price", "Time and Material", "Retainer", "Internal" |
| Sprint | Text | Leave as Text |
| Start Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Planning", "Active", "On Hold", "Completed", "Cancelled" |
| Team Members | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Project Name | `text` | `VARCHAR(255)` | `string` | Text | `Website Redesign` |
| 2 | Actual Cost | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `98000.00` |
| 3 | Budget | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `250000.00` |
| 4 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 5 | Invoices | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `INV-1041, INV-1042` |
| 6 | Client / Stakeholder | `text` | `VARCHAR(255)` | `string` | Text | `Northwind Traders` |
| 7 | Client Account | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Northwind Traders` |
| 8 | Client Satisfaction Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 9 | Deliverables | `text` | `VARCHAR(255)` | `string` | Text | `Wireframes, Build, Launch` |
| 10 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 11 | End Date | `date` | `DATE` | `string, format: date` | Date | `2026-04-30` |
| 12 | Milestones | `text` | `VARCHAR(255)` | `string` | Text | `Wireframes, Build, Launch` |
| 13 | Notes | `long_text` | `TEXT` | `string` | Text | `Client check-in on 12 Feb; scope revisit agreed for March.` |
| 14 | Priority | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Low` |
| 15 | Progress % | `number` | `NUMERIC` | `number` | Number | `60` |
| 16 | Project ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 17 | Project Manager | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 18 | Project Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Fixed Price` |
| 19 | Sprint | `text` | `VARCHAR(255)` | `string` | Text | `Sprint 3` |
| 20 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-05` |
| 21 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |
| 22 | Team Members | `text` | `VARCHAR(255)` | `string` | Text | `Priya Nair, Rohit Verma` |

## Select Options

**Priority**

```
Low | Medium | High | Urgent
```
**Project Type**

```
Fixed Price | Time and Material | Retainer | Internal
```
**Status**

```
Planning | Active | On Hold | Completed | Cancelled
```

## Relations

Link fields: `Invoices`, `Client Account`

## Examples

**Prompt**

```
Project status is asked for in chat every week.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many active?
> **A:** Six.
>
> **Q:** Tool today?
> **A:** A task board, used inconsistently.
>
> **Q:** Estimates?
> **A:** Rarely.

**Recommended next step** - offered, not built:

> Use the project tool people already update for tasks, and keep this as the register of projects, owners, dates and health.
>
> Workflow: Project created → Owner and dates → Tasks tracked → Status review → Closed
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
- Does not schedule people, replace a project tool or manage dependencies automatically.
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
I want to set up work delivery for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

