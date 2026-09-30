---
name: organization-design
description: 'Org structure register: department, type, parent, head, location, approved against actual headcount, annual budget, cost centre code and establishment date. Use for org design.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, foundation]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Organization Design

**What it is:** Org structure & planning.

## Overview

Works out the smallest useful **Organization Design** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 1: Foundation. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- org chart template
- department structure planner
- headcount and budget planning
- org design spreadsheet

Also use it when the user says "org structure & planning", or describes the same process happening in a
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

> **Q:** How many departments does the company have?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Shape** - How many departments? / Any business units? / Remote or on-site?
- **Ownership** - Who heads each one? / Reporting lines? / Matrix or simple?
- **Numbers** - Headcount per team? / Budget per team? / Cost centres used?
- **Current process** - Is the org chart current? / Drawn where? / What is stale?
- **Outcome** - What do you need it for? / Planning, hiring or budget?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: organization-design
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Shape": null
  "Ownership": null
  "Numbers": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Model departments as data with a head and an owner, not as a drawing. The chart becomes a view, not the source.

**Why this one:** Org charts rot because they are maintained as pictures. Storing departments as rows with an owner and a headcount keeps the chart regenerable.

**Workflow:** Departments → Owners → Headcount and budget → Chart view → Quarterly refresh

### Step 5 - Build only on request

Once the user asks for it, derive the fields from the confirmed context and emit the
requested artifacts. For machine-readable text, keep prose outside the data; for files,
provide a usable link. Report material validation failures or limitations separately.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/notion-manual-import/SKILL.md): it holds the CSV, the property
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
Department Name,Approved Headcount,Budget (Annual),Cost Center Code,Department Head,Department Type,Dept ID,Established Date,Headcount,Location,Notes,Parent Department,Status
Delivery,14,4800000.00,CC-100,Sneha Iyer,Revenue,,2026-01-15,12,Bengaluru,Drafted after the February leadership offsite; spans are still contested.,Operations,Live
```

```sql
CREATE TABLE organization_design (
  department_name VARCHAR(255),
  approved_headcount NUMERIC NOT NULL,
  budget_annual NUMERIC(14,2) NOT NULL,
  cost_center_code VARCHAR(255),
  department_head VARCHAR(255),
  department_type VARCHAR(100) NOT NULL,
  dept_id SERIAL PRIMARY KEY,
  established_date DATE NOT NULL,
  headcount NUMERIC NOT NULL,
  location VARCHAR(255),
  notes TEXT,
  parent_department VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_organization_design_status ON organization_design (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Organization Design",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Department Name": { "type": "string" },
      "Approved Headcount": { "type": "number" },
      "Budget (Annual)": { "type": "number" },
      "Cost Center Code": { "type": "string" },
      "Department Head": { "type": "string" },
      "Department Type": { "type": "string" },
      "Dept ID": { "type": "integer" },
      "Established Date": { "type": "string", "format": "date" },
      "Headcount": { "type": "number" },
      "Location": { "type": "string" },
      "Notes": { "type": "string" },
      "Parent Department": { "type": "string" },
      "Status": { "type": "string" }
  },
  "required": [
      "Approved Headcount",
      "Budget (Annual)",
      "Department Type",
      "Established Date",
      "Headcount",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Department Name | Title | Use as the database title |
| Approved Headcount | Number | Convert to Number |
| Budget (Annual) | Number (format: currency) | Convert to Number, set format to Currency |
| Cost Center Code | Text | Leave as Text |
| Department Head | Text | Leave as Text |
| Department Type | Select (add options after import) | Convert to Select, add options: "Revenue", "Delivery", "Support", "Finance", "People", "Admin", "Engineering" |
| Dept ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Established Date | Date | Convert to Date |
| Headcount | Number | Convert to Number |
| Location | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Parent Department | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Proposed", "Under Review", "Approved", "Implementing", "Live", "Superseded" |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Department Name | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 2 | Approved Headcount | `number` | `NUMERIC` | `number` | Number | `14` |
| 3 | Budget (Annual) | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `4800000.00` |
| 4 | Cost Center Code | `text` | `VARCHAR(255)` | `string` | Text | `CC-100` |
| 5 | Department Head | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 6 | Department Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Revenue` |
| 7 | Dept ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 8 | Established Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 9 | Headcount | `number` | `NUMERIC` | `number` | Number | `12` |
| 10 | Location | `text` | `VARCHAR(255)` | `string` | Text | `Bengaluru` |
| 11 | Notes | `long_text` | `TEXT` | `string` | Text | `Drafted after the February leadership offsite; spans are still contested.` |
| 12 | Parent Department | `text` | `VARCHAR(255)` | `string` | Text | `Operations` |
| 13 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Live` |

## Select Options

**Department Type**

```
Revenue | Delivery | Support | Finance | People | Admin | Engineering
```
**Status**

```
Proposed | Under Review | Approved | Implementing | Live | Superseded
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We are 14 people across sales and delivery and want to plan hiring.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many departments?
> **A:** Sales, delivery and finance.
>
> **Q:** Do you have cost centres?
> **A:** No.
>
> **Q:** What is it for?
> **A:** Hiring plan and budget.

**Recommended next step** - offered, not built:

> Model departments as data with a head and an owner, not as a drawing. The chart becomes a view, not the source.
>
> Workflow: Departments → Owners → Headcount and budget → Chart view → Quarterly refresh
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
- Does not handle detailed reporting lines or dotted-line matrix structures.
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
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/notification-reminder-hub/SKILL.md) - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up org structure & planning for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

