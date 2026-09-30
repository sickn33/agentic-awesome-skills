---
name: offer-appointment
description: 'Offer register: candidate, position, department, employment type, offered salary and currency, offer date and expiry, joining date, probation, approver and sign-off. Use for offer tracking.'
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

# Offer & Appointment

**What it is:** Formal hiring record.

## Overview

Works out the smallest useful **Offer & Appointment** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- offer letter tracker
- appointment letter record
- hiring offer database
- new hire offer log

Also use it when the user says "formal hiring record", or describes the same process happening in a
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

> **Q:** How many offers do you make a month?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Offer** - How many offers? / Fixed or variable pay? / Any equity?
- **Terms** - Probation length? / Notice period? / Joining date fixed?
- **Process** - Who approves? / Signed how? / Template or custom?
- **Current process** - How are offers sent? / Docs or email? / Where stored?
- **Outcome** - What do you need? / A record, a template or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: offer-appointment
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Offer": null
  "Terms": null
  "Process": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Store the offer as a record with version, approver and expiry. The template is secondary; the record is what you lose today.

**Why this one:** Offer data is the bridge between recruiting and payroll. Capturing it once, at offer stage, prevents re-keying at joining.

**Workflow:** Approved offer → Offer sent → Candidate accepts → Record created → Onboarding started

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
Offer Title,Candidate Name,Recruitment Record,Position,Department,Grade Level,Employment Type,Offered Salary,Currency,Offer Date,Offer Expiry,Joining Date,Probation Period (Days),Approver,Signed Via,Status,Notes,Offer ID
Delivery Manager,Karan Malhotra,REC-2026-031,Delivery Manager,Delivery,L1,Full Time,1450000.00,INR,2026-01-15,2026-02-01,2026-01-15,90,Sneha Iyer,DocuSign,Offered,Offer discussed in February and accepted; the start date depends on the notice period.,
```

```sql
CREATE TABLE offer_appointment (
  offer_title VARCHAR(255),
  candidate_name VARCHAR(255),
  recruitment_record VARCHAR(255),  -- relation -> target record
  position VARCHAR(255),
  department VARCHAR(255),
  grade_level VARCHAR(100) NOT NULL,
  employment_type VARCHAR(100) NOT NULL,
  offered_salary NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  offer_date DATE NOT NULL,
  offer_expiry DATE NOT NULL,
  joining_date DATE NOT NULL,
  probation_period_days NUMERIC NOT NULL,
  approver VARCHAR(255),
  signed_via VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  offer_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_offer_appointment_status ON offer_appointment (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Offer & Appointment",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Offer Title": { "type": "string" },
      "Candidate Name": { "type": "string" },
      "Recruitment Record": { "type": "string" },
      "Position": { "type": "string" },
      "Department": { "type": "string" },
      "Grade Level": { "type": "string" },
      "Employment Type": { "type": "string" },
      "Offered Salary": { "type": "number" },
      "Currency": { "type": "string" },
      "Offer Date": { "type": "string", "format": "date" },
      "Offer Expiry": { "type": "string", "format": "date" },
      "Joining Date": { "type": "string", "format": "date" },
      "Probation Period (Days)": { "type": "number" },
      "Approver": { "type": "string" },
      "Signed Via": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Offer ID": { "type": "integer" }
  },
  "required": [
      "Grade Level",
      "Employment Type",
      "Offered Salary",
      "Offer Date",
      "Offer Expiry",
      "Joining Date",
      "Probation Period (Days)",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Offer Title | Title | Use as the database title |
| Candidate Name | Text | Leave as Text |
| Recruitment Record | Relation (link to the target database) | Convert to Relation, link to the target database |
| Position | Text | Leave as Text |
| Department | Text | Leave as Text |
| Grade Level | Select (add options after import) | Convert to Select, add options: "L1", "L2", "L3", "L4", "L5", "M1", "M2" |
| Employment Type | Select (add options after import) | Convert to Select, add options: "Full Time", "Part Time", "Contract", "Intern", "Consultant" |
| Offered Salary | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Offer Date | Date | Convert to Date |
| Offer Expiry | Date | Convert to Date |
| Joining Date | Date | Convert to Date |
| Probation Period (Days) | Number | Convert to Number |
| Approver | Text | Leave as Text |
| Signed Via | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Offered", "Negotiation", "Accepted", "Declined", "Withdrawn", "Joined" |
| Notes | Text | Leave as Text |
| Offer ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Offer Title | `text` | `VARCHAR(255)` | `string` | Text | `Delivery Manager` |
| 2 | Candidate Name | `text` | `VARCHAR(255)` | `string` | Text | `Karan Malhotra` |
| 3 | Recruitment Record | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `REC-2026-031` |
| 4 | Position | `text` | `VARCHAR(255)` | `string` | Text | `Delivery Manager` |
| 5 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 6 | Grade Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `L1` |
| 7 | Employment Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Full Time` |
| 8 | Offered Salary | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1450000.00` |
| 9 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 10 | Offer Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 11 | Offer Expiry | `date` | `DATE` | `string, format: date` | Date | `2026-02-01` |
| 12 | Joining Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 13 | Probation Period (Days) | `number` | `NUMERIC` | `number` | Number | `90` |
| 14 | Approver | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 15 | Signed Via | `text` | `VARCHAR(255)` | `string` | Text | `DocuSign` |
| 16 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Offered` |
| 17 | Notes | `long_text` | `TEXT` | `string` | Text | `Offer discussed in February and accepted; the start date depends on the notice period.` |
| 18 | Offer ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Grade Level**

```
L1 | L2 | L3 | L4 | L5 | M1 | M2
```
**Employment Type**

```
Full Time | Part Time | Contract | Intern | Consultant
```
**Status**

```
Draft | Offered | Negotiation | Accepted | Declined | Withdrawn | Joined
```

## Relations

Link fields: `Recruitment Record`

## Examples

**Prompt**

```
We make offers over email and then re-type everything into payroll.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Probation length?
> **A:** 6 months.
>
> **Q:** Who approves?
> **A:** The owner.
>
> **Q:** How many offers?
> **A:** Two or three a month.

**Recommended next step** - offered, not built:

> Store the offer as a record with version, approver and expiry. The template is secondary; the record is what you lose today.
>
> Workflow: Approved offer → Offer sent → Candidate accepts → Record created → Onboarding started
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
- Does not generate contracts or send legally binding documents.
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
I want to set up formal hiring record for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

