---
name: capacity-workload-planner
description: 'Weekly capacity and workload register: available and allocated hours, utilisation percentage, over-allocation check and leave days. Use for resource planning.'
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

# Capacity & Workload Planner

**What it is:** Resource management.

## Overview

Works out the smallest useful **Capacity & Workload Planner** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- capacity planning
- workload planner
- resource allocation sheet
- utilization tracker

Also use it when the user says "resource management", or describes the same process happening in a
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

> **Q:** How many people are billable?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Capacity** - How many people? / Billable or not? / Weekly hours?
- **Demand** - How many live projects? / Who allocates? / Fixed dates?
- **Method** - Weekly or daily? / Utilisation target? / Overtime allowed?
- **Current process** - How do you plan now? / Spreadsheet or guess? / When is it too late?
- **Outcome** - What do you need? / A plan, alerts or a forecast?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: capacity-workload-planner
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Capacity": null
  "Demand": null
  "Method": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Plan by week, not by day, and flag over-allocation rather than trying to optimise it. Nobody acts on a daily capacity model.

**Why this one:** Weekly capacity is the smallest unit people actually plan in. If the model is daily it will be ignored within a fortnight.

**Workflow:** People → Available hours → Allocation by week → Over-allocation flag → Rebalance

**Derived values - calculate, never ask for and never accept as typed:**

```
Utilisation %    = Allocated Hours / Available Hours x 100, rounded once to the nearest whole number
Allocation Check = Over-allocated  when Utilisation % > 100
                   Within capacity when Utilisation % is 100 or less
                   Under-allocated when Utilisation % < 100
```

The percentage is stored as a whole number: `80` means 80%, never `0.8`. Round once, at this
step, and use the rounded value everywhere so the stored number and the flag can never
disagree. If `Available Hours` is `0` the ratio is undefined: leave `Utilisation %` and
`Allocation Check` empty and flag the row for a human rather than dividing by zero or
defaulting to 0. A person on full leave has no capacity, which is not the same as having
spare capacity.

**Approval gate:** a week may only be `Approved` when `Allocation Check` is `Within capacity`.
An over-allocated week is a real finding, not a rounding error - raise it, do not approve it,
and do not quietly trim `Allocated Hours` to make it fit. Reallocate with the people affected,
or record why the over-allocation is accepted.

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
Employee Name,Department,Project,Week Start,Available Hours,Allocated Hours,Utilisation %,Allocation Check,Leave Days,Status,Notes,Capacity ID
Example Employee,Delivery,Website Redesign,2026-01-05,32,38,119,Over-allocated,3,Draft,"Allocated 38 hours against 32 available, so this week needs a trade before it can be approved.",
```

```sql
CREATE TABLE capacity_workload_planner (
  employee_name VARCHAR(255),
  department VARCHAR(255),
  project VARCHAR(255),
  week_start DATE NOT NULL,
  available_hours NUMERIC NOT NULL,
  allocated_hours NUMERIC NOT NULL,
  utilisation_pct NUMERIC,
  allocation_check VARCHAR(100),
  leave_days NUMERIC NOT NULL,
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  capacity_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Utilisation and the check are derived, so they stay nullable: zero capacity is undefined, not zero.
  CHECK (allocation_check IS NULL OR allocation_check IN ('Over-allocated', 'Within capacity', 'Under-allocated')),
  -- An over-allocated week is a finding to escalate, not a plan to sign off.
  CHECK (status <> 'Approved' OR allocation_check = 'Within capacity')
);

CREATE INDEX idx_capacity_workload_planner_status ON capacity_workload_planner (status);
CREATE INDEX idx_capacity_workload_planner_week_start ON capacity_workload_planner (week_start);
```
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Capacity Workload Planner",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Project": { "type": "string" },
      "Week Start": { "type": "string", "format": "date" },
      "Available Hours": { "type": "number" },
      "Allocated Hours": { "type": "number" },
      "Utilisation %": { "type": "number" },
      "Allocation Check": { "type": "string" },
      "Leave Days": { "type": "number" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Capacity ID": { "type": "integer" }
  },
  "required": [
      "Week Start",
      "Available Hours",
      "Allocated Hours",
      "Leave Days",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Employee Name | Title | Use as the database title |
| Department | Text | Leave as Text |
| Project | Text | Leave as Text |
| Week Start | Date | Convert to Date |
| Available Hours | Number | Convert to Number |
| Allocated Hours | Number | Convert to Number |
| Utilisation % | Number | Convert to Number, and do not type it - it is calculated from Allocated Hours / Available Hours |
| Allocation Check | Select (add options after import) | Convert to Select, add options: "Over-allocated", "Within capacity", "Under-allocated" |
| Leave Days | Number | Convert to Number |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Approved", "Active", "Revised", "Closed". Approved is blocked while Allocation Check is Over-allocated |
| Notes | Text | Leave as Text |
| Capacity ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Employee` |
| 2 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 3 | Project | `text` | `VARCHAR(255)` | `string` | Text | `Website Redesign` |
| 4 | Week Start | `date` | `DATE` | `string, format: date` | Date | `2026-01-05` |
| 5 | Available Hours | `number` | `NUMERIC` | `number` | Number | `32` |
| 6 | Allocated Hours | `number` | `NUMERIC` | `number` | Number | `38` |
| 7 | Utilisation % | `number` | `NUMERIC` | `number` | Number | `119` |
| 8 | Allocation Check | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Over-allocated` |
| 9 | Leave Days | `number` | `NUMERIC` | `number` | Number | `3` |
| 10 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Draft` |
| 11 | Notes | `long_text` | `TEXT` | `string` | Text | `Allocated 38 hours against 32 available, so this week needs a trade before it can be approved.` |
| 12 | Capacity ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Allocation Check**

```
Over-allocated | Within capacity | Under-allocated
```

Calculated from `Utilisation %`, not chosen. Leave empty when `Available Hours` is 0.

**Status**

```
Draft | Approved | Active | Revised | Closed
```

`Approved` is blocked while `Allocation Check` is `Over-allocated`.

## Relations

Link fields: none

## Examples

**Prompt**

```
We keep overcommitting and miss delivery dates.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Weekly hours?
> **A:** 40.
>
> **Q:** How many live projects?
> **A:** Six.
>
> **Q:** Do you plan weekly?
> **A:** No, we guess.

**Recommended next step** - offered, not built:

> Plan by week, not by day, and flag over-allocation rather than trying to optimise it. Nobody acts on a daily capacity model.
>
> Workflow: People → Available hours → Allocation by week → Over-allocation flag → Rebalance
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
- Does not schedule people or forecast revenue.
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
- **Problem:** a week reads 80% utilisation while 38 hours sit against 32 available.
  **Solution:** a typed number disagreed with its own arithmetic, so an over-allocated week looked safe. Calculate `Utilisation %` and `Allocation Check` from the hours every time and let the approval gate block the week.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up resource management for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

