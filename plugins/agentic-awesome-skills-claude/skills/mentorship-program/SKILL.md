---
name: mentorship-program
description: 'Mentorship register: mentor and mentee pair, department, focus area, mentee goal, session counts, last and next session, overall rating, progress notes and status. Use for mentorship tracking.'
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

# Mentorship Program

**What it is:** Internal mentoring.

## Overview

Works out the smallest useful **Mentorship Program** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- mentorship program
- mentor matching
- internal mentoring tracker
- mentor mentee pairs

Also use it when the user says "internal mentoring", or describes the same process happening in a
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

> **Q:** How many people want to be mentored?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **People** - Mentees and mentors? / How many pairs? / Same team or cross-team?
- **Programme** - How long? / Session cadence? / Structured or informal?
- **Matching** - How matched today? / By skill or interest? / Who approves?
- **Current process** - Anything running now? / How tracked? / What failed before?
- **Outcome** - What do you need? / Matching, session tracking or feedback?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: mentorship-program
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "People": null
  "Programme": null
  "Matching": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Match on a stated goal rather than availability, and track only sessions and a closing rating.

**Why this one:** Mentorship fails when pairs are assigned by convenience and never meet. A stated goal for the mentee is what makes a pair worth recording.

**Workflow:** Mentee goal → Match → Sessions → Mid review → Close with rating

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
Mentorship Pair,Department,End Date,Focus Area,Last Session,Mentee Goal,Mentee Name,Mentor Name,Mentorship ID,Next Session,Overall Rating,Progress Notes,Sessions Completed,Sessions Planned,Start Date,Status
Priya Nair + Rohit Verma,Delivery,2026-11-27,Stakeholder management and commercial conversations.,2026-01-08,Lead two client calls end to end this quarter.,Priya Nair,Rohit Verma,,2026-01-22,4,Two of four goals on track. Delegation still needs work.,5,12,2026-02-02,Active
```

```sql
CREATE TABLE mentorship_program (
  mentorship_pair VARCHAR(255),
  department VARCHAR(255),
  end_date DATE NOT NULL,
  focus_area VARCHAR(255),
  last_session DATE NOT NULL,
  mentee_goal VARCHAR(255),
  mentee_name VARCHAR(255),  -- relation -> target record
  mentor_name VARCHAR(255),  -- relation -> target record
  mentorship_id SERIAL PRIMARY KEY,
  next_session DATE NOT NULL,
  overall_rating VARCHAR(255),
  progress_notes TEXT,
  sessions_completed NUMERIC NOT NULL,
  sessions_planned NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mentorship_program_status ON mentorship_program (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Mentorship Program",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Mentorship Pair": { "type": "string" },
      "Department": { "type": "string" },
      "End Date": { "type": "string", "format": "date" },
      "Focus Area": { "type": "string" },
      "Last Session": { "type": "string", "format": "date" },
      "Mentee Goal": { "type": "string" },
      "Mentee Name": { "type": "string" },
      "Mentor Name": { "type": "string" },
      "Mentorship ID": { "type": "integer" },
      "Next Session": { "type": "string", "format": "date" },
      "Overall Rating": { "type": "string" },
      "Progress Notes": { "type": "string" },
      "Sessions Completed": { "type": "number" },
      "Sessions Planned": { "type": "number" },
      "Start Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" }
  },
  "required": [
      "End Date",
      "Last Session",
      "Next Session",
      "Sessions Completed",
      "Sessions Planned",
      "Start Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Mentorship Pair | Title | Use as the database title |
| Department | Text | Leave as Text |
| End Date | Date | Convert to Date |
| Focus Area | Text | Leave as Text |
| Last Session | Date | Convert to Date |
| Mentee Goal | Text | Leave as Text |
| Mentee Name | Relation (link to the target database) | Convert to Relation, link to the target database |
| Mentor Name | Relation (link to the target database) | Convert to Relation, link to the target database |
| Mentorship ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Next Session | Date | Convert to Date |
| Overall Rating | Text | Leave as Text |
| Progress Notes | Text | Leave as Text |
| Sessions Completed | Number | Convert to Number |
| Sessions Planned | Number | Convert to Number |
| Start Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Proposed", "Active", "Paused", "Completed", "Ended" |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Mentorship Pair | `text` | `VARCHAR(255)` | `string` | Text | `Priya Nair + Rohit Verma` |
| 2 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 3 | End Date | `date` | `DATE` | `string, format: date` | Date | `2026-11-27` |
| 4 | Focus Area | `text` | `VARCHAR(255)` | `string` | Text | `Stakeholder management and commercial conversations.` |
| 5 | Last Session | `date` | `DATE` | `string, format: date` | Date | `2026-01-08` |
| 6 | Mentee Goal | `text` | `VARCHAR(255)` | `string` | Text | `Lead two client calls end to end this quarter.` |
| 7 | Mentee Name | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Priya Nair` |
| 8 | Mentor Name | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Rohit Verma` |
| 9 | Mentorship ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 10 | Next Session | `date` | `DATE` | `string, format: date` | Date | `2026-01-22` |
| 11 | Overall Rating | `text` | `VARCHAR(255)` | `string` | Text | `4` |
| 12 | Progress Notes | `long_text` | `TEXT` | `string` | Text | `Two of four goals on track. Delegation still needs work.` |
| 13 | Sessions Completed | `number` | `NUMERIC` | `number` | Number | `5` |
| 14 | Sessions Planned | `number` | `NUMERIC` | `number` | Number | `12` |
| 15 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-02-02` |
| 16 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |

## Select Options

**Status**

```
Proposed | Active | Paused | Completed | Ended
```

## Relations

Link fields: `Mentee Name`, `Mentor Name`

## Examples

**Prompt**

```
We want to run mentoring for people joining the delivery team.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many pairs?
> **A:** Six.
>
> **Q:** How long?
> **A:** Six months.
>
> **Q:** How matched now?
> **A:** Not at all.

**Recommended next step** - offered, not built:

> Match on a stated goal rather than availability, and track only sessions and a closing rating.
>
> Workflow: Mentee goal → Match → Sessions → Mid review → Close with rating
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
- Does not match people automatically or send session reminders.
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
I want to set up internal mentoring for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

