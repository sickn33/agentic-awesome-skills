---
name: buddy-program-manager
description: 'Buddy programme register: new hire, assigned buddy, department, start and end dates, check-ins planned and done, and feedback score. Use for onboarding buddy schemes.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, onboard]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Buddy Program Manager

**What it is:** Peer support.

## Overview

Works out the smallest useful **Buddy Program Manager** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- buddy program
- new hire buddy
- peer onboarding tracker
- onboarding buddy manager

Also use it when the user says "peer support", or describes the same process happening in a
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

> **Q:** How many new joiners do you onboard a month?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Volume** - New joiners per month? / One buddy each? / Same team or cross-team?
- **Programme** - How long? / Check-in cadence? / Feedback captured?
- **People** - Who can be a buddy? / Time allocated? / Recognition for buddies?
- **Current process** - Anything informal today? / How is it tracked? / What fails?
- **Outcome** - What do you need? / Matching, check-ins or feedback?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: buddy-program-manager
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Volume": null
  "Programme": null
  "People": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Match buddies by department and timezone, then track a small number of check-ins. Do not build a scoring system for it.

**Why this one:** Buddy programmes fail on load, not on matching. Three check-ins over 30 days is enough signal; more is admin nobody does.

**Workflow:** New joiner → Buddy match → Check-ins → Feedback → Buddy recognition

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
Buddy Pair,New Hire,Buddy,Department,Start Date,End Date,Check-ins Planned,Check-ins Done,Feedback Score,Status,Notes,Buddy ID
Example New Hire + Example Buddy,Example New Hire,Example Buddy,Delivery,2026-01-05,2026-12-19,6,3,4,Active,First-week check-in done; the buddy asked for a narrower first assignment.,
```

```sql
CREATE TABLE buddy_program_manager (
  buddy_pair VARCHAR(255),
  new_hire VARCHAR(255),  -- relation -> target record
  buddy VARCHAR(255),  -- relation -> target record
  department VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  check_ins_planned NUMERIC NOT NULL,
  check_ins_done NUMERIC NOT NULL,
  feedback_score NUMERIC NOT NULL,
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  buddy_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_buddy_program_manager_status ON buddy_program_manager (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Buddy Program Manager",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Buddy Pair": { "type": "string" },
      "New Hire": { "type": "string" },
      "Buddy": { "type": "string" },
      "Department": { "type": "string" },
      "Start Date": { "type": "string", "format": "date" },
      "End Date": { "type": "string", "format": "date" },
      "Check-ins Planned": { "type": "number" },
      "Check-ins Done": { "type": "number" },
      "Feedback Score": { "type": "number" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Buddy ID": { "type": "integer" }
  },
  "required": [
      "Start Date",
      "End Date",
      "Check-ins Planned",
      "Check-ins Done",
      "Feedback Score",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Buddy Pair | Title | Use as the database title |
| New Hire | Relation (link to the target database) | Convert to Relation, link to the target database |
| Buddy | Relation (link to the target database) | Convert to Relation, link to the target database |
| Department | Text | Leave as Text |
| Start Date | Date | Convert to Date |
| End Date | Date | Convert to Date |
| Check-ins Planned | Number | Convert to Number |
| Check-ins Done | Number | Convert to Number |
| Feedback Score | Number | Convert to Number |
| Status | Select (add options after import) | Convert to Select, add options: "Not Started", "Active", "Paused", "Completed" |
| Notes | Text | Leave as Text |
| Buddy ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Buddy Pair | `text` | `VARCHAR(255)` | `string` | Text | `Example New Hire + Example Buddy` |
| 2 | New Hire | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Example New Hire` |
| 3 | Buddy | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Example Buddy` |
| 4 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 5 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-05` |
| 6 | End Date | `date` | `DATE` | `string, format: date` | Date | `2026-12-19` |
| 7 | Check-ins Planned | `number` | `NUMERIC` | `number` | Number | `6` |
| 8 | Check-ins Done | `number` | `NUMERIC` | `number` | Number | `3` |
| 9 | Feedback Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 10 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |
| 11 | Notes | `long_text` | `TEXT` | `string` | Text | `First-week check-in done; the buddy asked for a narrower first assignment.` |
| 12 | Buddy ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Status**

```
Not Started | Active | Paused | Completed
```

## Relations

Link fields: `New Hire`, `Buddy`

## Examples

**Prompt**

```
New joiners feel lost in week one and nobody notices.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many new joiners?
> **A:** Two or three a month.
>
> **Q:** How long should it run?
> **A:** 30 days.
>
> **Q:** Do you track it now?
> **A:** No.

**Recommended next step** - offered, not built:

> Match buddies by department and timezone, then track a small number of check-ins. Do not build a scoring system for it.
>
> Workflow: New joiner → Buddy match → Check-ins → Feedback → Buddy recognition
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
- Does not assign buddies automatically or send reminders without a connected tool.
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


## Buddy Programme Matching Rules

Treat a buddy match as a supported assignment, not as a performance judgement. Confirm the participant consent, start date, time zone, language, accessibility needs, manager boundary, and preferred contact cadence before proposing a match. Keep the rationale for a match separate from personal data, and never infer compatibility from protected characteristics.

Track each check-in as an event with date, channel, attendance, topics raised, agreed next step, and escalation owner. A missed check-in is not evidence of disengagement; record the attempt and ask the participant what support is needed. Close a match only after both participants have a documented end date or an approved reassignment.


## Check-in Conversation Guide

A first check-in confirms role context, onboarding goals, boundaries, preferred channels, accessibility needs, and what must remain private. A later check-in records what was tried, what blocked progress, what support the participant requested, and the next mutually agreed action. Avoid collecting sensitive personal stories when a simple support status is enough.

Use a neutral status vocabulary: `planned`, `scheduled`, `held`, `rescheduled`, `missed`, `escalated`, and `closed`. A manager escalation requires the participant's permission unless an explicit safety or policy exception applies; record the exception and the minimum necessary detail.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up peer support for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

