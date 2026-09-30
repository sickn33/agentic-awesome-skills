---
name: issue-grievance-tracker
description: 'Grievance register: issue type, raised by or anonymous, person or team concerned, department, date raised, policy reference, severity, assignee, action taken and status. Use for complaint handling.'
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

# Issue & Grievance Tracker

**What it is:** Code of Conduct issues, internal complaints and workplace problems.

## Overview

Works out the smallest useful **Issue & Grievance Tracker** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- grievance tracker
- workplace complaint log
- code of conduct case
- anonymous complaint box

Also use it when the user says "code of conduct issues, internal complaints and workplace problems", or describes the same process happening in a
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

> **Q:** Is this an anonymous complaint?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Type** - Conduct, safety or pay? / One person or a team? / First or repeat?
- **Process** - Who triages? / Investigation owner? / SLA days?
- **Privacy** - Anonymous allowed? / Who can see it? / Confidentiality level?
- **Current process** - How are complaints handled now? / Verbal or written? / What gets missed?
- **Outcome** - What do you need? / A log, an investigation record or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: issue-grievance-tracker
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Type": null
  "Process": null
  "Privacy": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Log the complaint first with a severity and an owner, then decide if a linked disciplinary case is needed.

**Why this one:** Grievances are missed when they arrive verbally. Capturing them with a date and a triage owner is the whole control.

**Workflow:** Complaint raised → Triage → Investigation → Action taken → Closure

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
Issue Title,Issue Type,Raised By,Anonymous,Against (Person or Team),Department,Date Raised,Related Policy,Severity,Description,Assigned To,Investigation Notes,Action Taken,Linked Disciplinary Case,Resolution Date,Days Open,Confidential,Status,Issue ID
Client escalation after missed milestone,Conduct,Ananya Rao,FALSE,Vikram Singh,Delivery,2026-01-15,Code of Conduct,Medium,"Repeated late status updates to the client after a missed milestone, raised by the account team.",Aarav Sharma,Witness statements collected. Meeting held with both parties.,Written warning issued and a one-to-one scheduled for next week.,PIP-2026-004,2026-01-19,4,Internal,Resolved,
```

```sql
CREATE TABLE issue_grievance_tracker (
  issue_title VARCHAR(255),
  issue_type VARCHAR(100) NOT NULL,
  raised_by VARCHAR(255),
  anonymous BOOLEAN NOT NULL,
  against_person_or_team VARCHAR(255),
  department VARCHAR(255),
  date_raised DATE NOT NULL,
  related_policy VARCHAR(255),
  severity VARCHAR(100) NOT NULL,
  description TEXT,
  assigned_to VARCHAR(255),
  investigation_notes TEXT,
  action_taken VARCHAR(255),
  linked_disciplinary_case VARCHAR(255),  -- relation -> target record
  resolution_date DATE,
  days_open NUMERIC NOT NULL,
  confidential VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  issue_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_issue_grievance_tracker_status ON issue_grievance_tracker (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Issue & Grievance Tracker",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "Issue Title": {
      "type": "string"
    },
    "Issue Type": {
      "type": "string"
    },
    "Raised By": {
      "type": "string"
    },
    "Anonymous": {
      "type": "boolean"
    },
    "Against (Person or Team)": {
      "type": "string"
    },
    "Department": {
      "type": "string"
    },
    "Date Raised": {
      "type": "string",
      "format": "date"
    },
    "Related Policy": {
      "type": "string"
    },
    "Severity": {
      "type": "string"
    },
    "Description": {
      "type": "string"
    },
    "Assigned To": {
      "type": "string"
    },
    "Investigation Notes": {
      "type": "string"
    },
    "Action Taken": {
      "type": "string"
    },
    "Linked Disciplinary Case": {
      "type": "string"
    },
    "Resolution Date": {
      "type": "string",
      "format": "date"
    },
    "Days Open": {
      "type": "number"
    },
    "Confidential": {
      "type": "string"
    },
    "Status": {
      "type": "string"
    },
    "Issue ID": {
      "type": "integer"
    }
  },
  "required": [
    "Issue Type",
    "Date Raised",
    "Severity",
    "Days Open",
    "Confidential",
    "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Issue Title | Title | Use as the database title |
| Issue Type | Select (add options after import) | Convert to Select, add options: "Conduct", "Harassment", "Discrimination", "Safety", "Pay", "Workplace", "Other" |
| Raised By | Text | Leave as Text |
| Anonymous | Checkbox | Convert to Checkbox |
| Against (Person or Team) | Text | Leave as Text |
| Department | Text | Leave as Text |
| Date Raised | Date | Convert to Date |
| Related Policy | Text | Leave as Text |
| Severity | Select (add options after import) | Convert to Select, add options: "Low", "Medium", "High", "Critical" |
| Description | Text | Leave as Text |
| Assigned To | Text | Leave as Text |
| Investigation Notes | Text | Leave as Text |
| Action Taken | Text | Leave as Text |
| Linked Disciplinary Case | Relation (link to the target database) | Convert to Relation, link to the target database |
| Resolution Date | Date | Convert to Date |
| Days Open | Number | Convert to Number |
| Confidential | Select (add options after import) | Convert to Select, add options: "Public", "Internal", "Restricted", "Highly Restricted" |
| Status | Select (add options after import) | Convert to Select, add options: "Logged", "Under Review", "Investigating", "Resolved", "Escalated", "Closed" |
| Issue ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

`Resolution Date` may be absent before the relevant lifecycle stage or when no verified source exists. Do not invent values to satisfy a schema.

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Issue Title | `text` | `VARCHAR(255)` | `string` | Text | `Client escalation after missed milestone` |
| 2 | Issue Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Conduct` |
| 3 | Raised By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 4 | Anonymous | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 5 | Against (Person or Team) | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 6 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 7 | Date Raised | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Related Policy | `text` | `VARCHAR(255)` | `string` | Text | `Code of Conduct` |
| 9 | Severity | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Medium` |
| 10 | Description | `long_text` | `TEXT` | `string` | Text | `Repeated late status updates to the client after a missed milestone, raised by the account team.` |
| 11 | Assigned To | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 12 | Investigation Notes | `long_text` | `TEXT` | `string` | Text | `Witness statements collected. Meeting held with both parties.` |
| 13 | Action Taken | `text` | `VARCHAR(255)` | `string` | Text | `Written warning issued and a one-to-one scheduled for next week.` |
| 14 | Linked Disciplinary Case | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `PIP-2026-004` |
| 15 | Resolution Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-19` |
| 16 | Days Open | `number` | `NUMERIC` | `number` | Number | `4` |
| 17 | Confidential | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Internal` |
| 18 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Resolved` |
| 19 | Issue ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Issue Type**

```
Conduct | Harassment | Discrimination | Safety | Pay | Workplace | Other
```
**Severity**

```
Low | Medium | High | Critical
```
**Confidential**

```
Public | Internal | Restricted | Highly Restricted
```
**Status**

```
Logged | Under Review | Investigating | Resolved | Escalated | Closed
```

## Relations

Link fields: `Linked Disciplinary Case`

## Examples

**Prompt**

```
A complaint came in verbally and we handled it without a record.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Anonymous?
> **A:** Yes, it must be.
>
> **Q:** Who investigates?
> **A:** HR.
>
> **Q:** SLA days?
> **A:** Two days to triage.

**Recommended next step** - offered, not built:

> Log the complaint first with a severity and an owner, then decide if a linked disciplinary case is needed.
>
> Workflow: Complaint raised → Triage → Investigation → Action taken → Closure
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
- Does not investigate, adjudicate or notify anyone. It records the process.
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
I want to set up code of conduct issues, internal complaints and workplace problems for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

