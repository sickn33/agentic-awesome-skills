---
name: recruitment-pipeline
description: 'Recruitment pipeline: candidate, position, stage, source, applied and interview dates, interview score, notice period and offer. Use for hiring tracking.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, acquire]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Recruitment Pipeline

**What it is:** Full hiring process.

## Overview

Works out the smallest useful **Recruitment Pipeline** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 2: Acquire. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- recruitment pipeline
- hiring tracker
- applicant tracking spreadsheet
- interview scorecard

Also use it when the user says "full hiring process", or describes the same process happening in a
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

> **Q:** How many roles are open right now?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Roles** - How many open? / Which departments? / How many applicants each?
- **Process** - How many interview rounds? / Who interviews? / Who decides?
- **Data** - Scores or comments? / CVs stored where? / Timeline tracked?
- **Current process** - How do you track it today? / Spreadsheet or ATS? / What is slow?
- **Outcome** - What do you need? / Pipeline view, time-to-hire or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: recruitment-pipeline
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Roles": null
  "Process": null
  "Data": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** A pipeline works as stages with a clear exit criterion. Add scoring only if two interviewers need to compare on the same scale.

**Why this one:** The value of a pipeline is knowing where candidates stall. That needs stage transitions with dates, not a CV folder.

**Workflow:** Apply → Screening → Interview → Offer → Hired

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
Candidate Name,AI Match Score,Department,Email,Experience (Years),Hired Employee,Interview Date,Interview Score,Interviewer,Notes,Notice Period,Offered Salary,Currency,Phone,Position,Applied Date,Rec ID,Resume URL,Salary Expectation,Source,Stage
Karan Malhotra,0.82,Delivery,aarav.sharma@example.com,6,Priya Nair,2026-01-15,4,Sneha Iyer,"Candidate asked about the timeline in February and has not heard back since.",60 days,1450000.00,INR,+91 98xxxxxx21,Delivery Manager,2026-01-15,,https://example.com/cv.pdf,1500000.00,Referral,Applied
```

```sql
CREATE TABLE recruitment_pipeline (
  candidate_name VARCHAR(255),
  ai_match_score NUMERIC,
  department VARCHAR(255),
  email VARCHAR(255),
  experience_years NUMERIC NOT NULL,
  hired_employee VARCHAR(255),  -- relation -> target record
  interview_date DATE,
  interview_score NUMERIC,
  interviewer VARCHAR(255),
  notes TEXT,
  notice_period VARCHAR(255),
  offered_salary NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  phone VARCHAR(255),
  position VARCHAR(255),
  applied_date DATE NOT NULL,
  rec_id SERIAL PRIMARY KEY,
  resume_url TEXT,
  salary_expectation NUMERIC(14,2) NOT NULL,
  source VARCHAR(255),
  stage VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Recruitment Pipeline",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "Candidate Name": {
      "type": "string"
    },
    "AI Match Score": {
      "type": "number"
    },
    "Department": {
      "type": "string"
    },
    "Email": {
      "type": "string",
      "format": "email"
    },
    "Experience (Years)": {
      "type": "number"
    },
    "Hired Employee": {
      "type": "string"
    },
    "Interview Date": {
      "type": "string",
      "format": "date"
    },
    "Interview Score": {
      "type": "number"
    },
    "Interviewer": {
      "type": "string"
    },
    "Notes": {
      "type": "string"
    },
    "Notice Period": {
      "type": "string"
    },
    "Offered Salary": {
      "type": "number"
    },
    "Currency": {
      "type": "string"
    },
    "Phone": {
      "type": "string"
    },
    "Position": {
      "type": "string"
    },
    "Applied Date": {
      "type": "string",
      "format": "date"
    },
    "Rec ID": {
      "type": "integer"
    },
    "Resume URL": {
      "type": "string",
      "format": "uri"
    },
    "Salary Expectation": {
      "type": "number"
    },
    "Source": {
      "type": "string"
    },
    "Stage": {
      "type": "string"
    }
  },
  "required": [
    "Experience (Years)",
    "Applied Date",
    "Salary Expectation",
    "Stage"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Candidate Name | Title | Use as the database title |
| AI Match Score | Number | Convert to Number |
| Department | Text | Leave as Text |
| Email | Email | Convert to Email |
| Experience (Years) | Number | Convert to Number |
| Hired Employee | Relation (link to the target database) | Convert to Relation, link to the target database |
| Interview Date | Date | Convert to Date |
| Interview Score | Number | Convert to Number |
| Interviewer | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Notice Period | Text | Leave as Text |
| Offered Salary | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Phone | Text | Leave as Text |
| Position | Text | Leave as Text |
| Applied Date | Date | Convert to Date |
| Rec ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Resume URL | URL | Convert to URL |
| Salary Expectation | Number (format: currency) | Convert to Number, set format to Currency |
| Source | Text | Leave as Text |
| Stage | Select (add options after import) | Convert to Select, add options: "Applied", "Screening", "Interview", "Offer", "Hired", "Rejected", "Withdrawn" |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

`AI Match Score`, `Interview Date`, `Interview Score`, `Offered Salary` may be absent before the relevant lifecycle stage or when no verified source exists. Do not invent values to satisfy a schema.

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Candidate Name | `text` | `VARCHAR(255)` | `string` | Text | `Karan Malhotra` |
| 2 | AI Match Score | `number` | `NUMERIC` | `number` | Number | `0.82` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Email | `email` | `VARCHAR(255)` | `string, format: email` | Email | `aarav.sharma@example.com` |
| 5 | Experience (Years) | `number` | `NUMERIC` | `number` | Number | `6` |
| 6 | Hired Employee | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Priya Nair` |
| 7 | Interview Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Interview Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 9 | Interviewer | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 10 | Notes | `long_text` | `TEXT` | `string` | Text | `Candidate asked about the timeline in February and has not heard back since.` |
| 11 | Notice Period | `text` | `VARCHAR(255)` | `string` | Text | `60 days` |
| 12 | Offered Salary | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1450000.00` |
| 13 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 14 | Phone | `text` | `VARCHAR(255)` | `string` | Text | `+91 98xxxxxx21` |
| 15 | Position | `text` | `VARCHAR(255)` | `string` | Text | `Delivery Manager` |
| 16 | Applied Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 17 | Rec ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 18 | Resume URL | `url` | `TEXT` | `string, format: uri` | URL | `https://example.com/cv.pdf` |
| 19 | Salary Expectation | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1500000.00` |
| 20 | Source | `text` | `VARCHAR(255)` | `string` | Text | `Referral` |
| 21 | Stage | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Applied` |

## Select Options

**Stage**

```
Applied | Screening | Interview | Offer | Hired | Rejected | Withdrawn
```

## Relations

Link fields: `Hired Employee`

## Examples

**Prompt**

```
We have 3 open roles and no idea where candidates are getting stuck.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many rounds?
> **A:** Two rounds.
>
> **Q:** Do you score?
> **A:** Yes, 1 to 5.
>
> **Q:** What do you use today?
> **A:** A shared spreadsheet.

**Recommended next step** - offered, not built:

> A pipeline works as stages with a clear exit criterion. Add scoring only if two interviewers need to compare on the same scale.
>
> Workflow: Apply → Screening → Interview → Offer → Hired
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
- Does not send emails, schedule interviews or parse resumes.
- Legal, tax and HR review is still required before this drives real decisions.

## Security & Safety Notes

`AI Match Score` is optional source data, not a request to score applicants. Record it
only with a supplied method, scale and provenance; leave it blank otherwise. Do not
infer suitability from protected traits or proxies. Hiring decisions require human review.

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
I want to set up full hiring process for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

