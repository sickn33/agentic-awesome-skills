---
name: people-directory
description: 'Employee master record: name, employee id, department, job title, grade, manager, employment type, contact and emergency details, access role, start and end dates, status. Use for people records.'
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

# People Directory

**What it is:** Employee master data.

## Overview

Works out the smallest useful **People Directory** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- employee directory
- people directory template
- employee master data
- staff database

Also use it when the user says "employee master data", or describes the same process happening in a
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

> **Q:** How many people are in the company today?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **People** - How many people? / Full time, part time, contractors? / Any remote?
- **Data** - Store salary on it? / Store emergency contacts? / What is sensitive?
- **Structure** - Reporting lines? / Grades or bands? / Locations?
- **Current process** - Where is the list now? / HR system or spreadsheet? / How stale is it?
- **Outcome** - What do you need? / A directory, a master record or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: people-directory
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "People": null
  "Data": null
  "Structure": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** One person record per human, with the sensitive fields separated out. Most modules should link to it, not duplicate it.

**Why this one:** A people directory is the root record. If it is wrong, leave, assets, payroll and reviews are all wrong, so it is worth doing properly once.

**Workflow:** Joiner → Person record → Links to other modules → Change → Exit record

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
Full Name,Annual CTC,Currency,Date of Birth,Department,Email,Accounts,Emergency Contact,Emergency Phone,Employee ID,Employment Type,End Date,Grade Level,KPIs,Job Title,Access Role,LinkedIn,Manager,Nationality,Notes,Phone,Probation Status,Profile Photo URL,Skills,Start Date,Status,Time Zone,Work Location
Aarav Sharma,1200000.00,INR,1991-04-18,Delivery,aarav.sharma@example.com,"Payroll portal, HRIS",Anil Sharma,+91 98xxxxxx34,,Full Time,2027-03-31,L1,On-time delivery %,Delivery Manager,Line manager,https://linkedin.com/in/aarav-sharma-example,Sneha Iyer,Indian,Joined from a competitor; notice period is one month.,+91 98xxxxxx21,Passed,https://example.com/photo.jpg,"Excel, SQL, Client Handling",2021-03-08,Active,IST (UTC+5:30),Bengaluru
```

```sql
CREATE TABLE people_directory (
  full_name VARCHAR(255),
  annual_ctc NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  date_of_birth DATE NOT NULL,
  department VARCHAR(255),
  email VARCHAR(255),
  accounts VARCHAR(255),
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(255),
  employee_id SERIAL PRIMARY KEY,
  employment_type VARCHAR(100) NOT NULL,
  end_date DATE,
  grade_level VARCHAR(100) NOT NULL,
  kpis VARCHAR(255),
  job_title VARCHAR(255),
  access_role VARCHAR(255),
  linkedin TEXT,
  manager VARCHAR(255),
  nationality VARCHAR(255),
  notes TEXT,
  phone VARCHAR(255),
  probation_status VARCHAR(100) NOT NULL,
  profile_photo_url TEXT,
  skills VARCHAR(255),
  start_date DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  time_zone VARCHAR(255),
  work_location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_people_directory_status ON people_directory (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "People Directory",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "Full Name": {
      "type": "string"
    },
    "Annual CTC": {
      "type": "number"
    },
    "Currency": {
      "type": "string"
    },
    "Date of Birth": {
      "type": "string",
      "format": "date"
    },
    "Department": {
      "type": "string"
    },
    "Email": {
      "type": "string",
      "format": "email"
    },
    "Accounts": {
      "type": "string"
    },
    "Emergency Contact": {
      "type": "string"
    },
    "Emergency Phone": {
      "type": "string"
    },
    "Employee ID": {
      "type": "integer"
    },
    "Employment Type": {
      "type": "string"
    },
    "End Date": {
      "type": "string",
      "format": "date"
    },
    "Grade Level": {
      "type": "string"
    },
    "KPIs": {
      "type": "string"
    },
    "Job Title": {
      "type": "string"
    },
    "Access Role": {
      "type": "string"
    },
    "LinkedIn": {
      "type": "string",
      "format": "uri"
    },
    "Manager": {
      "type": "string"
    },
    "Nationality": {
      "type": "string"
    },
    "Notes": {
      "type": "string"
    },
    "Phone": {
      "type": "string"
    },
    "Probation Status": {
      "type": "string"
    },
    "Profile Photo URL": {
      "type": "string",
      "format": "uri"
    },
    "Skills": {
      "type": "string"
    },
    "Start Date": {
      "type": "string",
      "format": "date"
    },
    "Status": {
      "type": "string"
    },
    "Time Zone": {
      "type": "string"
    },
    "Work Location": {
      "type": "string"
    }
  },
  "required": [
    "Annual CTC",
    "Date of Birth",
    "Employment Type",
    "Grade Level",
    "Probation Status",
    "Start Date",
    "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Full Name | Title | Use as the database title |
| Annual CTC | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Date of Birth | Date | Convert to Date |
| Department | Text | Leave as Text |
| Email | Email | Convert to Email |
| Accounts | Text | Leave as Text |
| Emergency Contact | Text | Leave as Text |
| Emergency Phone | Text | Leave as Text |
| Employee ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Employment Type | Select (add options after import) | Convert to Select, add options: "Full Time", "Part Time", "Contract", "Intern", "Consultant" |
| End Date | Date | Convert to Date |
| Grade Level | Select (add options after import) | Convert to Select, add options: "L1", "L2", "L3", "L4", "L5", "M1", "M2" |
| KPIs | Text | Leave as Text |
| Job Title | Text | Leave as Text |
| Access Role | Text | Leave as Text |
| LinkedIn | URL | Convert to URL |
| Manager | Text | Leave as Text |
| Nationality | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Phone | Text | Leave as Text |
| Probation Status | Select (add options after import) | Convert to Select, add options: "Not Started", "In Progress", "Passed", "Failed", "Extended" |
| Profile Photo URL | URL | Convert to URL |
| Skills | Text | Leave as Text |
| Start Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Active", "On Leave", "Notice Period", "Exited" |
| Time Zone | Text | Leave as Text |
| Work Location | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

`End Date` may be absent before the relevant lifecycle stage or when no verified source exists. Do not invent values to satisfy a schema.

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Full Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 2 | Annual CTC | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1200000.00` |
| 3 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 4 | Date of Birth | `date` | `DATE` | `string, format: date` | Date | `1991-04-18` |
| 5 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 6 | Email | `email` | `VARCHAR(255)` | `string, format: email` | Email | `aarav.sharma@example.com` |
| 7 | Accounts | `text` | `VARCHAR(255)` | `string` | Text | `Payroll portal, HRIS` |
| 8 | Emergency Contact | `text` | `VARCHAR(255)` | `string` | Text | `Anil Sharma` |
| 9 | Emergency Phone | `text` | `VARCHAR(255)` | `string` | Text | `+91 98xxxxxx34` |
| 10 | Employee ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 11 | Employment Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Full Time` |
| 12 | End Date | `date` | `DATE` | `string, format: date` | Date | `2027-03-31` |
| 13 | Grade Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `L1` |
| 14 | KPIs | `text` | `VARCHAR(255)` | `string` | Text | `On-time delivery %` |
| 15 | Job Title | `text` | `VARCHAR(255)` | `string` | Text | `Delivery Manager` |
| 16 | Access Role | `text` | `VARCHAR(255)` | `string` | Text | `Line manager` |
| 17 | LinkedIn | `url` | `TEXT` | `string, format: uri` | URL | `https://linkedin.com/in/aarav-sharma-example` |
| 18 | Manager | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 19 | Nationality | `text` | `VARCHAR(255)` | `string` | Text | `Indian` |
| 20 | Notes | `long_text` | `TEXT` | `string` | Text | `Joined from a competitor; notice period is one month.` |
| 21 | Phone | `text` | `VARCHAR(255)` | `string` | Text | `+91 98xxxxxx21` |
| 22 | Probation Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Passed` |
| 23 | Profile Photo URL | `url` | `TEXT` | `string, format: uri` | URL | `https://example.com/photo.jpg` |
| 24 | Skills | `text` | `VARCHAR(255)` | `string` | Text | `Excel, SQL, Client Handling` |
| 25 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2021-03-08` |
| 26 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |
| 27 | Time Zone | `text` | `VARCHAR(255)` | `string` | Text | `IST (UTC+5:30)` |
| 28 | Work Location | `text` | `VARCHAR(255)` | `string` | Text | `Bengaluru` |

## Select Options

**Employment Type**

```
Full Time | Part Time | Contract | Intern | Consultant
```
**Grade Level**

```
L1 | L2 | L3 | L4 | L5 | M1 | M2
```
**Probation Status**

```
Not Started | In Progress | Passed | Failed | Extended
```
**Status**

```
Active | On Leave | Notice Period | Exited
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Our employee list lives in three spreadsheets and none agree.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Store salary on it?
> **A:** Yes, HR only.
>
> **Q:** Remote?
> **A:** Half the team.
>
> **Q:** Where is it now?
> **A:** Three spreadsheets.

**Recommended next step** - offered, not built:

> One person record per human, with the sensitive fields separated out. Most modules should link to it, not duplicate it.
>
> Workflow: Joiner → Person record → Links to other modules → Change → Exit record
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
- Does not hold payroll, tax or banking data. It references those, it does not own them.
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
I want to set up employee master data for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

