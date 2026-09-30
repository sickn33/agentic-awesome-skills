---
name: employee-suggestion-hub
description: 'Suggestion register: submitter or anonymous flag, category, votes, reviewer, decision and response status. Use for employee feedback programs.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, engage]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Employee Suggestion Hub

**What it is:** Feedback loop.

## Overview

Works out the smallest useful **Employee Suggestion Hub** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 6: Engage. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- suggestion box
- employee feedback portal
- idea submission tracker
- staff suggestions

Also use it when the user says "feedback loop", or describes the same process happening in a
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

> **Q:** How many suggestions do you get in a month?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Submissions** - How many people? / How many ideas a month? / Anonymous allowed?
- **Process** - Who triages? / Who responds? / SLA days?
- **Follow-up** - Are decisions shared? / Implemented ideas credited? / Closed or open?
- **Current process** - How do people share ideas now? / Form, chat or meeting? / What happens to them?
- **Outcome** - What do you need? / A submission form, a review queue or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: employee-suggestion-hub
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Submissions": null
  "Process": null
  "Follow-up": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Collect, triage, decide and respond. The response step is the one that determines whether people submit again.

**Why this one:** Suggestion schemes die from silence, not from a lack of ideas. Recording the response is what keeps submissions coming.

**Workflow:** Submitted → Triaged → Decided → Responded → Implemented or closed

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
Suggestion Title,Submitted By,Anonymous,Department,Category,Description,Date Submitted,Votes,Reviewer,Decision,Response,Status,Suggestion ID
Add a second parking bay,Ananya Rao,FALSE,Delivery,Process,"Anonymous idea from staff, routed to the owner who can actually act on it.",2026-01-15,14,Sneha Iyer,Approved,"Short, specific and actionable feedback only.",Under Review,
```

```sql
CREATE TABLE employee_suggestion_hub (
  suggestion_title VARCHAR(255),
  submitted_by VARCHAR(255),
  anonymous BOOLEAN NOT NULL,
  department VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  description TEXT,
  date_submitted DATE NOT NULL,
  votes NUMERIC NOT NULL,
  reviewer VARCHAR(255),
  decision VARCHAR(255),
  response VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  suggestion_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employee_suggestion_hub_status ON employee_suggestion_hub (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Employee Suggestion Hub",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Suggestion Title": { "type": "string" },
      "Submitted By": { "type": "string" },
      "Anonymous": { "type": "boolean" },
      "Department": { "type": "string" },
      "Category": { "type": "string" },
      "Description": { "type": "string" },
      "Date Submitted": { "type": "string", "format": "date" },
      "Votes": { "type": "number" },
      "Reviewer": { "type": "string" },
      "Decision": { "type": "string" },
      "Response": { "type": "string" },
      "Status": { "type": "string" },
      "Suggestion ID": { "type": "integer" }
  },
  "required": [
      "Category",
      "Date Submitted",
      "Votes",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Suggestion Title | Title | Use as the database title |
| Submitted By | Text | Leave as Text |
| Anonymous | Checkbox | Convert to Checkbox |
| Department | Text | Leave as Text |
| Category | Select (add options after import) | Convert to Select, add options: "Process", "Tooling", "Workload", "Culture", "Facilities" |
| Description | Text | Leave as Text |
| Date Submitted | Date | Convert to Date |
| Votes | Number | Convert to Number |
| Reviewer | Text | Leave as Text |
| Decision | Text | Leave as Text |
| Response | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Submitted", "Under Review", "Accepted", "In Progress", "Closed", "Declined" |
| Suggestion ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Suggestion Title | `text` | `VARCHAR(255)` | `string` | Text | `Add a second parking bay` |
| 2 | Submitted By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 3 | Anonymous | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 4 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 5 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Process` |
| 6 | Description | `long_text` | `TEXT` | `string` | Text | `Anonymous idea from staff, routed to the owner who can actually act on it.` |
| 7 | Date Submitted | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Votes | `number` | `NUMERIC` | `number` | Number | `14` |
| 9 | Reviewer | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 10 | Decision | `text` | `VARCHAR(255)` | `string` | Text | `Approved` |
| 11 | Response | `text` | `VARCHAR(255)` | `string` | Text | `Short, specific and actionable feedback only.` |
| 12 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Under Review` |
| 13 | Suggestion ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Category**

```
Process | Tooling | Workload | Culture | Facilities
```
**Status**

```
Submitted | Under Review | Accepted | In Progress | Closed | Declined
```

## Relations

Link fields: none

## Examples

**Prompt**

```
People suggest improvements and never hear anything back.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Ideas per month?
> **A:** Maybe five.
>
> **Q:** Anonymous?
> **A:** Yes.
>
> **Q:** Who responds?
> **A:** Nobody formally.

**Recommended next step** - offered, not built:

> Collect, triage, decide and respond. The response step is the one that determines whether people submit again.
>
> Workflow: Submitted → Triaged → Decided → Responded → Implemented or closed
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
- Does not implement changes or promise any suggestion will be adopted.
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
I want to set up feedback loop for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

