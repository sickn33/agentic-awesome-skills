---
name: promotion-upgrade-requests
description: 'Promotion register: current and requested role and grade, justification, OKR and behaviour scores, time in role, salary proposal and decision. Use for upgrade requests.'
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

# Promotion & Upgrade Requests

**What it is:** Promotion, grade upgrade, role change and salary revision requests.

## Overview

Works out the smallest useful **Promotion & Upgrade Requests** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- promotion request
- grade upgrade tracker
- salary revision request
- internal mobility tracker

Also use it when the user says "promotion, grade upgrade, role change and salary revision requests", or describes the same process happening in a
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

> **Q:** Who can request a promotion?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Requests** - ask these as separate messages, in this order when still material: who
  requests; how often; whether the request includes a grade or role change. Never combine
  two of them into one clarification. For an ambiguous Requests answer, clarify who may
  request first, then wait.
- **Criteria** - Fixed criteria? / Performance score needed? / Time in role?
- **Approval** - Who approves? / One or two levels? / Effective date set by?
- **Current process** - How do you handle it now? / Email or nothing? / What gets delayed?
- **Outcome** - What do you need? / A request form, approvals or a record?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: promotion-upgrade-requests
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Requests": null
  "Criteria": null
  "Approval": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Require a written request with evidence, route it by grade, and record the decision and effective date as one object.

**Why this one:** Promotion decisions drift when the request, the evidence and the decision live in different places. One record with a decision field fixes the trail.

**Workflow:** Request submitted → Criteria check → Approval → Decision → People and payroll update

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
Request Title,Employee Name,Department,Request Type,Current Job Title,Current Grade,Requested Job Title,Requested Grade,Requested By,Justification,Linked Performance Review,OKR Score,Behaviour Score,Courses Completed,Time in Role (Months),Criteria Met,Current Salary,Proposed Salary,Currency,Increase %,Approver,Decision,Effective Date,Status,Upgrade ID
Promotion to L3,Aarav Sharma,Delivery,Promotion,HR Executive,L2,Finance Analyst,L3,Rohit Verma,Consistent delivery over 12 months,REV-2026-Q1,0.7,4,"Advanced SQL, Workplace Safety",18,FALSE,1450000.00,1624000.00,INR,12,Sneha Iyer,Approved,2026-01-15,Under Review,
```

```sql
CREATE TABLE promotion_upgrade_requests (
  request_title VARCHAR(255),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  request_type VARCHAR(100) NOT NULL,
  current_job_title VARCHAR(255),
  current_grade VARCHAR(255),
  requested_job_title VARCHAR(255),
  requested_grade VARCHAR(255),
  requested_by VARCHAR(255),
  justification VARCHAR(255),
  linked_performance_review VARCHAR(255),  -- relation -> target record
  okr_score NUMERIC NOT NULL,
  behaviour_score NUMERIC NOT NULL,
  courses_completed VARCHAR(255),
  time_in_role_months NUMERIC NOT NULL,
  criteria_met BOOLEAN NOT NULL,
  current_salary NUMERIC(14,2) NOT NULL,
  proposed_salary NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  increase_pct NUMERIC NOT NULL,
  approver VARCHAR(255),
  decision VARCHAR(255),
  effective_date DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  upgrade_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_promotion_upgrade_requests_status ON promotion_upgrade_requests (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Promotion & Upgrade Requests",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Request Title": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Request Type": { "type": "string" },
      "Current Job Title": { "type": "string" },
      "Current Grade": { "type": "string" },
      "Requested Job Title": { "type": "string" },
      "Requested Grade": { "type": "string" },
      "Requested By": { "type": "string" },
      "Justification": { "type": "string" },
      "Linked Performance Review": { "type": "string" },
      "OKR Score": { "type": "number" },
      "Behaviour Score": { "type": "number" },
      "Courses Completed": { "type": "string" },
      "Time in Role (Months)": { "type": "number" },
      "Criteria Met": { "type": "boolean" },
      "Current Salary": { "type": "number" },
      "Proposed Salary": { "type": "number" },
      "Currency": { "type": "string" },
      "Increase %": { "type": "number" },
      "Approver": { "type": "string" },
      "Decision": { "type": "string" },
      "Effective Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Upgrade ID": { "type": "integer" }
  },
  "required": [
      "Request Type",
      "OKR Score",
      "Behaviour Score",
      "Time in Role (Months)",
      "Current Salary",
      "Proposed Salary",
      "Increase %",
      "Effective Date",
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
| Request Type | Select (add options after import) | Convert to Select, add options: "Promotion", "Grade Upgrade", "Role Change", "Salary Revision" |
| Current Job Title | Text | Leave as Text |
| Current Grade | Text | Leave as Text |
| Requested Job Title | Text | Leave as Text |
| Requested Grade | Text | Leave as Text |
| Requested By | Text | Leave as Text |
| Justification | Text | Leave as Text |
| Linked Performance Review | Relation (link to the target database) | Convert to Relation, link to the target database |
| OKR Score | Number | Convert to Number |
| Behaviour Score | Number | Convert to Number |
| Courses Completed | Text | Leave as Text |
| Time in Role (Months) | Number | Convert to Number |
| Criteria Met | Checkbox | Convert to Checkbox |
| Current Salary | Number (format: currency) | Convert to Number, set format to Currency |
| Proposed Salary | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Increase % | Number | Convert to Number |
| Approver | Text | Leave as Text |
| Decision | Text | Leave as Text |
| Effective Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Submitted", "Under Review", "Approved", "Declined", "Implemented" |
| Upgrade ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Request Title | `text` | `VARCHAR(255)` | `string` | Text | `Promotion to L3` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Request Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Promotion` |
| 5 | Current Job Title | `text` | `VARCHAR(255)` | `string` | Text | `HR Executive` |
| 6 | Current Grade | `text` | `VARCHAR(255)` | `string` | Text | `L2` |
| 7 | Requested Job Title | `text` | `VARCHAR(255)` | `string` | Text | `Finance Analyst` |
| 8 | Requested Grade | `text` | `VARCHAR(255)` | `string` | Text | `L3` |
| 9 | Requested By | `text` | `VARCHAR(255)` | `string` | Text | `Rohit Verma` |
| 10 | Justification | `text` | `VARCHAR(255)` | `string` | Text | `Consistent delivery over 12 months` |
| 11 | Linked Performance Review | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `REV-2026-Q1` |
| 12 | OKR Score | `number` | `NUMERIC` | `number` | Number | `0.7` |
| 13 | Behaviour Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 14 | Courses Completed | `text` | `VARCHAR(255)` | `string` | Text | `Advanced SQL, Workplace Safety` |
| 15 | Time in Role (Months) | `number` | `NUMERIC` | `number` | Number | `18` |
| 16 | Criteria Met | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 17 | Current Salary | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1450000.00` |
| 18 | Proposed Salary | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1624000.00` |
| 19 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 20 | Increase % | `number` | `NUMERIC` | `number` | Number | `12` |
| 21 | Approver | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 22 | Decision | `text` | `VARCHAR(255)` | `string` | Text | `Approved` |
| 23 | Effective Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 24 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Under Review` |
| 25 | Upgrade ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Request Type**

```
Promotion | Grade Upgrade | Role Change | Salary Revision
```
**Status**

```
Submitted | Under Review | Approved | Declined | Implemented
```

## Relations

Link fields: `Linked Performance Review`

## Examples

**Prompt**

```
Promotions happen over email and the reasoning is lost.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Who can request?
> **A:** Line managers.
>
> **Q:** Criteria?
> **A:** Performance and time in role.
>
> **Q:** How often?
> **A:** Twice a year.

**Recommended next step** - offered, not built:

> Require a written request with evidence, route it by grade, and record the decision and effective date as one object.
>
> Workflow: Request submitted → Criteria check → Approval → Decision → People and payroll update
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
- Does not decide promotions or change pay. It records and routes the request.
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
I want to set up promotion, grade upgrade, role change and salary revision requests for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```
