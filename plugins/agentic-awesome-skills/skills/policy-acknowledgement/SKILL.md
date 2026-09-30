---
name: policy-acknowledgement
description: 'Policy acknowledgement register: employee, policy and version, sent and due dates, acknowledged date and flag, days overdue, reminder sent and status. Use for policy sign-off tracking.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, foundation]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Policy Acknowledgement

**What it is:** Who has read and signed each policy and the Code of Conduct.

## Overview

Works out the smallest useful **Policy Acknowledgement** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 1: Foundation. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- policy sign off tracker
- policy acknowledgement log
- code of conduct sign off
- policy compliance tracker

Also use it when the user says "who has read and signed each policy and the code of conduct", or describes the same process happening in a
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

> **Q:** How many policies need to be signed?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Policies** - Which policies? / Code of conduct included? / Versioned or single?
- **People** - Who must sign? / All staff or some? / Contractors too?
- **Process** - Sign or just read? / Reminder schedule? / Deadline after issue?
- **Current process** - How do you chase sign-off now? / Email or nothing? / What gets missed?
- **Outcome** - What do you need to prove? / An audit trail or a tracker?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: policy-acknowledgement
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Policies": null
  "People": null
  "Process": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Issue the policy once, then track acknowledgement per person per version. A shared sign-off sheet beats individual emails.

**Why this one:** The failure mode is not missing policies, it is not knowing who has read the current version. Tracking by version fixes that.

**Workflow:** Policy issue → Assign to people → Reminder → Sign-off record → Overdue report

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
Acknowledgement,Employee Name,Policy,Policy Version,Sent Date,Due Date,Acknowledged Date,Acknowledged,Days Overdue,Reminder Sent,Status,Acknowledgement ID
Signed,Aarav Sharma,Code of Conduct,v2.1,2026-08-14,2026-08-28,2026-09-02,TRUE,5,TRUE,Acknowledged,
```

```sql
CREATE TABLE policy_acknowledgement (
  acknowledgement VARCHAR(255),
  employee_name VARCHAR(255),
  policy VARCHAR(255),
  policy_version VARCHAR(255),
  sent_date DATE NOT NULL,
  due_date DATE NOT NULL,
  acknowledged_date DATE NOT NULL,
  acknowledged BOOLEAN NOT NULL,
  days_overdue NUMERIC NOT NULL,
  reminder_sent BOOLEAN NOT NULL,
  status VARCHAR(100) NOT NULL,
  acknowledgement_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_policy_acknowledgement_status ON policy_acknowledgement (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Policy Acknowledgement",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Acknowledgement": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Policy": { "type": "string" },
      "Policy Version": { "type": "string" },
      "Sent Date": { "type": "string", "format": "date" },
      "Due Date": { "type": "string", "format": "date" },
      "Acknowledged Date": { "type": "string", "format": "date" },
      "Acknowledged": { "type": "boolean" },
      "Days Overdue": { "type": "number" },
      "Reminder Sent": { "type": "boolean" },
      "Status": { "type": "string" },
      "Acknowledgement ID": { "type": "integer" }
  },
  "required": [
      "Sent Date",
      "Due Date",
      "Acknowledged Date",
      "Days Overdue",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Acknowledgement | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Policy | Text | Leave as Text |
| Policy Version | Text | Leave as Text |
| Sent Date | Date | Convert to Date |
| Due Date | Date | Convert to Date |
| Acknowledged Date | Date | Convert to Date |
| Acknowledged | Checkbox | Convert to Checkbox |
| Days Overdue | Number | Convert to Number |
| Reminder Sent | Checkbox | Convert to Checkbox |
| Status | Select (add options after import) | Convert to Select, add options: "Sent", "Viewed", "Acknowledged", "Overdue", "Waived" |
| Acknowledgement ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Acknowledgement | `text` | `VARCHAR(255)` | `string` | Text | `Signed` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Policy | `text` | `VARCHAR(255)` | `string` | Text | `Code of Conduct` |
| 4 | Policy Version | `text` | `VARCHAR(255)` | `string` | Text | `v2.1` |
| 5 | Sent Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-14` |
| 6 | Due Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-28` |
| 7 | Acknowledged Date | `date` | `DATE` | `string, format: date` | Date | `2026-09-02` |
| 8 | Acknowledged | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `TRUE` |
| 9 | Days Overdue | `number` | `NUMERIC` | `number` | Number | `5` |
| 10 | Reminder Sent | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `TRUE` |
| 11 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Acknowledged` |
| 12 | Acknowledgement ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Status**

```
Sent | Viewed | Acknowledged | Overdue | Waived
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We have 6 policies and no idea who signed the latest code of conduct.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Who must sign?
> **A:** Everyone, including contractors.
>
> **Q:** Do you need a reminder?
> **A:** Yes, weekly.
>
> **Q:** What do you use?
> **A:** Google Drive.

**Recommended next step** - offered, not built:

> Issue the policy once, then track acknowledgement per person per version. A shared sign-off sheet beats individual emails.
>
> Workflow: Policy issue → Assign to people → Reminder → Sign-off record → Overdue report
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
- Does not host documents or capture legally binding e-signatures.
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
- ](https://github.com/sickn33/agentic-awesome-skills/blob/main/skills/people-directory/SKILL.md) - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up who has read and signed each policy and the code of conduct for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

