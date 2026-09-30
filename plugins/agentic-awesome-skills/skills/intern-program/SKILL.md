---
name: intern-program
description: 'Internship register: intern and department, supervisor and mentor, institution, start and end dates, stipend, learning goals, mid-term and final scores, conversion flags. Use for intern tracking.'
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

# Intern Program

**What it is:** Interns from start to certificate or full-time offer.

## Overview

Works out the smallest useful **Intern Program** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- intern tracker
- internship management
- intern program database
- intern onboarding and conversion

Also use it when the user says "interns from start to certificate or full-time offer", or describes the same process happening in a
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

> **Q:** How many interns do you take at a time?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Volume** - How many interns? / Any time of year? / Paid or unpaid?
- **Programme** - Duration? / Mentor assigned? / Certificate needed?
- **Conversion** - Any full-time offers? / Criteria? / Who decides?
- **Current process** - How is it tracked now? / Spreadsheet or nothing? / What gets missed?
- **Outcome** - What do you need? / Records, progress tracking or conversion?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: intern-program
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Volume": null
  "Programme": null
  "Conversion": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Treat the intern as a light employee record plus a progress log, and only build conversion tracking if interns actually convert.

**Why this one:** Most intern programmes need three things: dates, a supervisor, and a mid and final score. Everything else is optional.

**Workflow:** Offer → Intern record → Mid review → Final review → Certificate or offer

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
Intern Name,Department,Supervisor,Mentor,School or University,Program Type,Start Date,End Date,Duration (Days),Stipend,Currency,Learning Goals,Weekly Log Link,Mid-term Score,Final Score,Certificate Issued,Offer for Full-Time,Converted to Employee,Status,Intern ID
Karan Malhotra,Delivery,Sneha Iyer,Rohit Verma,Anna University,Internship,2026-06-01,2026-11-30,30,25000.00,INR,Ship one feature end to end,https://example.com/log,4,4.2,FALSE,FALSE,Aarav Sharma,In Progress,
```

```sql
CREATE TABLE intern_program (
  intern_name VARCHAR(255),
  department VARCHAR(255),
  supervisor VARCHAR(255),
  mentor VARCHAR(255),
  school_or_university VARCHAR(255),
  program_type VARCHAR(100) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days NUMERIC NOT NULL,
  stipend NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  learning_goals VARCHAR(255),
  weekly_log_link TEXT,
  mid_term_score NUMERIC NOT NULL,
  final_score NUMERIC NOT NULL,
  certificate_issued BOOLEAN NOT NULL,
  offer_for_full_time BOOLEAN NOT NULL,
  converted_to_employee VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  intern_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_intern_program_status ON intern_program (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Intern Program",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Intern Name": { "type": "string" },
      "Department": { "type": "string" },
      "Supervisor": { "type": "string" },
      "Mentor": { "type": "string" },
      "School or University": { "type": "string" },
      "Program Type": { "type": "string" },
      "Start Date": { "type": "string", "format": "date" },
      "End Date": { "type": "string", "format": "date" },
      "Duration (Days)": { "type": "number" },
      "Stipend": { "type": "number" },
      "Currency": { "type": "string" },
      "Learning Goals": { "type": "string" },
      "Weekly Log Link": { "type": "string", "format": "uri" },
      "Mid-term Score": { "type": "number" },
      "Final Score": { "type": "number" },
      "Certificate Issued": { "type": "boolean" },
      "Offer for Full-Time": { "type": "boolean" },
      "Converted to Employee": { "type": "string" },
      "Status": { "type": "string" },
      "Intern ID": { "type": "integer" }
  },
  "required": [
      "Program Type",
      "Start Date",
      "End Date",
      "Duration (Days)",
      "Stipend",
      "Mid-term Score",
      "Final Score",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Intern Name | Title | Use as the database title |
| Department | Text | Leave as Text |
| Supervisor | Text | Leave as Text |
| Mentor | Text | Leave as Text |
| School or University | Text | Leave as Text |
| Program Type | Select (add options after import) | Convert to Select, add options: "Internship", "Apprenticeship", "Graduate Program", "Returnship" |
| Start Date | Date | Convert to Date |
| End Date | Date | Convert to Date |
| Duration (Days) | Number | Convert to Number |
| Stipend | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Learning Goals | Text | Leave as Text |
| Weekly Log Link | URL | Convert to URL |
| Mid-term Score | Number | Convert to Number |
| Final Score | Number | Convert to Number |
| Certificate Issued | Checkbox | Convert to Checkbox |
| Offer for Full-Time | Checkbox | Convert to Checkbox |
| Converted to Employee | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Onboarding", "In Progress", "Completed", "Terminated" |
| Intern ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Intern Name | `text` | `VARCHAR(255)` | `string` | Text | `Karan Malhotra` |
| 2 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 3 | Supervisor | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 4 | Mentor | `text` | `VARCHAR(255)` | `string` | Text | `Rohit Verma` |
| 5 | School or University | `text` | `VARCHAR(255)` | `string` | Text | `Anna University` |
| 6 | Program Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Internship` |
| 7 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-06-01` |
| 8 | End Date | `date` | `DATE` | `string, format: date` | Date | `2026-11-30` |
| 9 | Duration (Days) | `number` | `NUMERIC` | `number` | Number | `30` |
| 10 | Stipend | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `25000.00` |
| 11 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 12 | Learning Goals | `text` | `VARCHAR(255)` | `string` | Text | `Ship one feature end to end` |
| 13 | Weekly Log Link | `url` | `TEXT` | `string, format: uri` | URL | `https://example.com/log` |
| 14 | Mid-term Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 15 | Final Score | `number` | `NUMERIC` | `number` | Number | `4.2` |
| 16 | Certificate Issued | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 17 | Offer for Full-Time | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 18 | Converted to Employee | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 19 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In Progress` |
| 20 | Intern ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Program Type**

```
Internship | Apprenticeship | Graduate Program | Returnship
```
**Status**

```
Onboarding | In Progress | Completed | Terminated
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We take 5 interns each summer and track everything in a notebook.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How long?
> **A:** 3 months.
>
> **Q:** Mentor assigned?
> **A:** Yes.
>
> **Q:** Do interns convert?
> **A:** Sometimes, two last year.

**Recommended next step** - offered, not built:

> Treat the intern as a light employee record plus a progress log, and only build conversion tracking if interns actually convert.
>
> Workflow: Offer → Intern record → Mid review → Final review → Certificate or offer
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
- Does not run the internship or assess intern performance on its own.
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
I want to set up interns from start to certificate or full-time offer for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

