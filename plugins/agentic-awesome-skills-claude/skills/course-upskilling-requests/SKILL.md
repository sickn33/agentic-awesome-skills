---
name: course-upskilling-requests
description: 'Training request register: course, provider, cost, duration, budget line, the three approval steps, service bond and completion evidence. Use for upskilling approvals.'
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

# Course & Upskilling Requests

**What it is:** Staff ask for a course, managers and finance approve, LMS tracks it.

## Overview

Works out the smallest useful **Course & Upskilling Requests** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- training request form
- upskilling request tracker
- staff training request

Also use it when the user says "staff ask for a course, managers and finance approve, lms tracks it", or describes the same process happening in a
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

> **Q:** What is the training budget per person?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Budget** - Budget per person? / Annual pool or per request? / Currency?
- **Approval** - Who approves? / Manager then finance? / Fast track under what amount?
- **After approval** - Bond needed? / LMS or external? / Certificate tracked?
- **Current process** - How do people ask now? / Email or form? / What gets lost?
- **Outcome** - What do you need? / A request form, approvals or tracking?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: course-upskilling-requests
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Budget": null
  "Approval": null
  "After approval": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Route by cost, and record the decision. Tracking completion only matters if completion affects something.

**Why this one:** Training requests stall at approval, not at enrolment. A cost threshold with a named approver removes the bottleneck.

**Workflow:** Request → Manager approval → Finance approval → Enrolment → Completion and certificate

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
Request Title,Employee Name,Department,Course Name,Provider,Course Link,Linked Skill Gap,Reason,Cost,Currency,Duration (Hours),Start Date,Manager Approval,HR Approval,Finance Approval,Budget Line,Service Bond (Months),Enrolled in LMS,Completion Date,Certificate Received,Status,Course Request ID
Promotion to L3,Aarav Sharma,Delivery,Advanced SQL, Udemy,https://example.com/courses/safety,GAP-2026-003,Skill gap identified in the quarterly review,98000.00,INR,2.5,2026-01-15,FALSE,FALSE,FALSE,BL-114 Travel,12,FALSE,2026-01-15,FALSE,Approved,
```

```sql
CREATE TABLE course_upskilling_requests (
  request_title VARCHAR(255),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  course_name VARCHAR(255),
  provider VARCHAR(255),
  course_link TEXT,
  linked_skill_gap VARCHAR(255),  -- relation -> target record
  reason VARCHAR(255),
  cost NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  duration_hours NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  manager_approval BOOLEAN NOT NULL,
  hr_approval BOOLEAN NOT NULL,
  finance_approval BOOLEAN NOT NULL,
  budget_line VARCHAR(255),
  service_bond_months NUMERIC NOT NULL,
  enrolled_in_lms BOOLEAN NOT NULL,
  completion_date DATE NOT NULL,
  certificate_received BOOLEAN NOT NULL,
  status VARCHAR(100) NOT NULL,
  course_request_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_course_upskilling_requests_status ON course_upskilling_requests (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Course & Upskilling Requests",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Request Title": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Course Name": { "type": "string" },
      "Provider": { "type": "string" },
      "Course Link": { "type": "string", "format": "uri" },
      "Linked Skill Gap": { "type": "string" },
      "Reason": { "type": "string" },
      "Cost": { "type": "number" },
      "Currency": { "type": "string" },
      "Duration (Hours)": { "type": "number" },
      "Start Date": { "type": "string", "format": "date" },
      "Manager Approval": { "type": "boolean" },
      "HR Approval": { "type": "boolean" },
      "Finance Approval": { "type": "boolean" },
      "Budget Line": { "type": "string" },
      "Service Bond (Months)": { "type": "number" },
      "Enrolled in LMS": { "type": "boolean" },
      "Completion Date": { "type": "string", "format": "date" },
      "Certificate Received": { "type": "boolean" },
      "Status": { "type": "string" },
      "Course Request ID": { "type": "integer" }
  },
  "required": [
      "Cost",
      "Duration (Hours)",
      "Start Date",
      "Service Bond (Months)",
      "Completion Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Request Title | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Department | Text | Leave as Text |
| Course Name | Text | Leave as Text |
| Provider | Text | Leave as Text |
| Course Link | URL | Convert to URL |
| Linked Skill Gap | Relation (link to the target database) | Convert to Relation, link to the target database |
| Reason | Text | Leave as Text |
| Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Duration (Hours) | Number | Convert to Number |
| Start Date | Date | Convert to Date |
| Manager Approval | Checkbox | Convert to Checkbox |
| HR Approval | Checkbox | Convert to Checkbox |
| Finance Approval | Checkbox | Convert to Checkbox |
| Budget Line | Text | Leave as Text |
| Service Bond (Months) | Number | Convert to Number |
| Enrolled in LMS | Checkbox | Convert to Checkbox |
| Completion Date | Date | Convert to Date |
| Certificate Received | Checkbox | Convert to Checkbox |
| Status | Select (add options after import) | Convert to Select, add options: "Requested", "Approved", "Scheduled", "In Progress", "Completed", "Rejected" |
| Course Request ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Request Title | `text` | `VARCHAR(255)` | `string` | Text | `Promotion to L3` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Course Name | `text` | `VARCHAR(255)` | `string` | Text | `Advanced SQL` |
| 5 | Provider | `text` | `VARCHAR(255)` | `string` | Text | ` Udemy` |
| 6 | Course Link | `url` | `TEXT` | `string, format: uri` | URL | `https://example.com/courses/safety` |
| 7 | Linked Skill Gap | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `GAP-2026-003` |
| 8 | Reason | `text` | `VARCHAR(255)` | `string` | Text | `Skill gap identified in the quarterly review` |
| 9 | Cost | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `98000.00` |
| 10 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 11 | Duration (Hours) | `number` | `NUMERIC` | `number` | Number | `2.5` |
| 12 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 13 | Manager Approval | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 14 | HR Approval | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 15 | Finance Approval | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 16 | Budget Line | `text` | `VARCHAR(255)` | `string` | Text | `BL-114 Travel` |
| 17 | Service Bond (Months) | `number` | `NUMERIC` | `number` | Number | `12` |
| 18 | Enrolled in LMS | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 19 | Completion Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 20 | Certificate Received | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 21 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Approved` |
| 22 | Course Request ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Status**

```
Requested | Approved | Scheduled | In Progress | Completed | Rejected
```

## Relations

Link fields: `Linked Skill Gap`

## Examples

**Prompt**

```
Course requests come by email and get lost in the thread.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Budget per person?
> **A:** Around 2,000 a year.
>
> **Q:** Who approves?
> **A:** Manager and finance.
>
> **Q:** Tracked now?
> **A:** Only in email.

**Recommended next step** - offered, not built:

> Route by cost, and record the decision. Tracking completion only matters if completion affects something.
>
> Workflow: Request → Manager approval → Finance approval → Enrolment → Completion and certificate
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
- Does not deliver courses or manage an LMS.
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

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up staff ask for a course, managers and finance approve, lms tracks it for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

