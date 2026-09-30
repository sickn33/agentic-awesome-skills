---
name: disciplinary-pip-tracker
description: 'Disciplinary and performance-improvement case register: case type, linked review or issue, improvement goals, review dates, outcome and confidentiality. Use for PIP tracking.'
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

# Disciplinary & PIP Tracker

**What it is:** Performance issues.

## Overview

Works out the smallest useful **Disciplinary & PIP Tracker** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 4: Manage. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- performance improvement plan
- pip tracker
- disciplinary record
- misconduct case log

Also use it when the user says "performance issues", or describes the same process happening in a
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

> **Q:** What triggered this conversation?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Case** - What happened? / First case or pattern? / Policy broken which one?
- **Process** - Formal or informal? / Stages? / Who owns the case?
- **Records** - Who is in the loop? / Written record kept? / Evidence stored where?
- **Current process** - How do you handle it now? / Spreadsheet or memory? / What breaks?
- **Outcome** - What do you need? / A case record, a plan or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: disciplinary-pip-tracker
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Case": null
  "Process": null
  "Records": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Run this as a documented case with a start, review dates and an outcome, whatever stage the process is at.

**Why this one:** Disciplinary cases fail on missing dates and missing review points, not on the decision. Store the timeline, not opinions.

**Workflow:** Case opened → Goals and review date → Review → Outcome → Closure and appeal

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
Case Title,Employee Name,Department,Manager,HR Owner,Case Type,Linked Performance Review,Linked Issue,Issue Summary,Improvement Goals,Start Date,Review Date,End Date,Outcome,Confidential,Status,Case ID
Missed handover on Northwind account,Aarav Sharma,Delivery,Sneha Iyer,Ananya Rao,Misconduct,REV-2026-Q1,ISS-2026-021,Client escalation raised after a missed handover milestone.,Close 5 tickets per week,2026-08-03,2026-09-14,2026-10-30,"Confirmed after the 90-day review, with a development plan attached.",Internal,Investigation,
```

```sql
CREATE TABLE disciplinary_pip_tracker (
  case_title VARCHAR(255),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  manager VARCHAR(255),
  hr_owner VARCHAR(255),
  case_type VARCHAR(100) NOT NULL,
  linked_performance_review VARCHAR(255),  -- relation -> target record
  linked_issue VARCHAR(255),  -- relation -> target record
  issue_summary TEXT,
  improvement_goals VARCHAR(255),
  start_date DATE NOT NULL,
  review_date DATE NOT NULL,
  end_date DATE NOT NULL,
  outcome VARCHAR(255),
  confidential VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  case_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disciplinary_pip_tracker_status ON disciplinary_pip_tracker (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Disciplinary & PIP Tracker",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Case Title": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Manager": { "type": "string" },
      "HR Owner": { "type": "string" },
      "Case Type": { "type": "string" },
      "Linked Performance Review": { "type": "string" },
      "Linked Issue": { "type": "string" },
      "Issue Summary": { "type": "string" },
      "Improvement Goals": { "type": "string" },
      "Start Date": { "type": "string", "format": "date" },
      "Review Date": { "type": "string", "format": "date" },
      "End Date": { "type": "string", "format": "date" },
      "Outcome": { "type": "string" },
      "Confidential": { "type": "string" },
      "Status": { "type": "string" },
      "Case ID": { "type": "integer" }
  },
  "required": [
      "Case Type",
      "Start Date",
      "Review Date",
      "End Date",
      "Confidential",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Case Title | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Department | Text | Leave as Text |
| Manager | Text | Leave as Text |
| HR Owner | Text | Leave as Text |
| Case Type | Select (add options after import) | Convert to Select, add options: "Misconduct", "Performance", "Attendance", "Policy Breach", "Grievance" |
| Linked Performance Review | Relation (link to the target database) | Convert to Relation, link to the target database |
| Linked Issue | Relation (link to the target database) | Convert to Relation, link to the target database |
| Issue Summary | Text | Leave as Text |
| Improvement Goals | Text | Leave as Text |
| Start Date | Date | Convert to Date |
| Review Date | Date | Convert to Date |
| End Date | Date | Convert to Date |
| Outcome | Text | Leave as Text |
| Confidential | Select (add options after import) | Convert to Select, add options: "Public", "Internal", "Restricted", "Highly Restricted" |
| Status | Select (add options after import) | Convert to Select, add options: "Opened", "Investigation", "Hearings", "Decision", "Appeals", "Closed" |
| Case ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Case Title | `text` | `VARCHAR(255)` | `string` | Text | `Missed handover on Northwind account` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Manager | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 5 | HR Owner | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 6 | Case Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Misconduct` |
| 7 | Linked Performance Review | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `REV-2026-Q1` |
| 8 | Linked Issue | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `ISS-2026-021` |
| 9 | Issue Summary | `long_text` | `TEXT` | `string` | Text | `Client escalation raised after a missed handover milestone.` |
| 10 | Improvement Goals | `text` | `VARCHAR(255)` | `string` | Text | `Close 5 tickets per week` |
| 11 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-03` |
| 12 | Review Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-14` |
| 13 | End Date | `date` | `DATE` | `string, format: date` | Date | `2026-10-30` |
| 14 | Outcome | `text` | `VARCHAR(255)` | `string` | Text | `Confirmed after the 90-day review, with a development plan attached.` |
| 15 | Confidential | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Internal` |
| 16 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Investigation` |
| 17 | Case ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Case Type**

```
Misconduct | Performance | Attendance | Policy Breach | Grievance
```
**Confidential**

```
Public | Internal | Restricted | Highly Restricted
```
**Status**

```
Opened | Investigation | Hearings | Decision | Appeals | Closed
```

## Relations

Link fields: `Linked Performance Review`, `Linked Issue`

## Examples

**Prompt**

```
We need to run a performance improvement plan and keep it clean.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Formal or informal?
> **A:** Formal PIP.
>
> **Q:** How long?
> **A:** 90 days.
>
> **Q:** Who owns it?
> **A:** HR with the manager.

**Recommended next step** - offered, not built:

> Run this as a documented case with a start, review dates and an outcome, whatever stage the process is at.
>
> Workflow: Case opened → Goals and review date → Review → Outcome → Closure and appeal
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
- Does not give legal advice. Employment law varies and needs a qualified reviewer.
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
I want to set up performance issues for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

