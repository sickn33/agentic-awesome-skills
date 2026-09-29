---
name: audit-log
description: 'Audit trail register: timestamp, user, module, record, action, field changed, old and new value, and the reason for the change. Use for change history and control evidence.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, protect]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Audit Log

**What it is:** Compliance trail.

## Overview

Works out the smallest useful **Audit Log** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 7: Protect. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- audit log
- change history tracker
- activity log database
- compliance trail

Also use it when the user says "compliance trail", or describes the same process happening in a
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

> **Q:** What do you need to be able to prove?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Purpose** - Which decision or process? / Internal or external? / Who asks for it?
- **Events** - What must be recorded? / Approvals or changes? / How far back?
- **Evidence** - Who can read it? / Tamper evidence needed? / Retention period?
- **Current process** - Is anything logged now? / Email or spreadsheet? / Is it complete?
- **Outcome** - What do you need? / A log definition, a register or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: audit-log
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Purpose": null
  "Events": null
  "Evidence": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Define the small set of events worth keeping and record who did what and when. Depth follows the question you need to answer.

**Why this one:** Audit logs become useless when everything is captured. Start from the question you need to answer, then record only what answers it.

**Workflow:** Event recorded → Actor and time → Stored → Periodically reviewed → Evidence produced

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
Log Entry,Date and Time,User,Module,Record,Action,Field Changed,Old Value,New Value,Reason,Log ID
Policy updated,2026-01-15 09:30,Example User,Invoices & Billing,INV-EXAMPLE-001,Update,Status,Draft,Sent,Correction made after a review query,
```

```sql
CREATE TABLE audit_log (
  log_entry VARCHAR(255),
  date_and_time TIMESTAMP NOT NULL,
  user_account VARCHAR(255),
  module VARCHAR(255),
  record VARCHAR(255),
  action VARCHAR(255),
  field_changed VARCHAR(255),
  old_value VARCHAR(255),
  new_value VARCHAR(255),
  reason VARCHAR(255),
  log_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Audit Log",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Log Entry": { "type": "string" },
      "Date and Time": { "type": "string", "format": "date-time" },
      "User": { "type": "string" },
      "Module": { "type": "string" },
      "Record": { "type": "string" },
      "Action": { "type": "string" },
      "Field Changed": { "type": "string" },
      "Old Value": { "type": "string" },
      "New Value": { "type": "string" },
      "Reason": { "type": "string" },
      "Log ID": { "type": "integer" }
  },
  "required": [
      "Date and Time"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Log Entry | Title | Use as the database title |
| Date and Time | Date (include time) | Convert to Date (include time) |
| User | Text | Leave as Text |
| Module | Text | Leave as Text |
| Record | Text | Leave as Text |
| Action | Text | Leave as Text |
| Field Changed | Text | Leave as Text |
| Old Value | Text | Leave as Text |
| New Value | Text | Leave as Text |
| Reason | Text | Leave as Text |
| Log ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Log Entry | `text` | `VARCHAR(255)` | `string` | Text | `Policy updated` |
| 2 | Date and Time | `datetime` | `TIMESTAMP` | `string, format: date-time` | Date (include time) | `2026-01-15 09:30` |
| 3 | User | `text` | `VARCHAR(255)` | `string` | Text | `Example User` |
| 4 | Module | `text` | `VARCHAR(255)` | `string` | Text | `Invoices & Billing` |
| 5 | Record | `text` | `VARCHAR(255)` | `string` | Text | `INV-EXAMPLE-001` |
| 6 | Action | `text` | `VARCHAR(255)` | `string` | Text | `Update` |
| 7 | Field Changed | `text` | `VARCHAR(255)` | `string` | Text | `Status` |
| 8 | Old Value | `text` | `VARCHAR(255)` | `string` | Text | `Draft` |
| 9 | New Value | `text` | `VARCHAR(255)` | `string` | Text | `Sent` |
| 10 | Reason | `text` | `VARCHAR(255)` | `string` | Text | `Correction made after a review query` |
| 11 | Log ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

_No Select fields._

## Relations

Link fields: none

## Examples

**Prompt**

```
When a client questioned an approval we had nothing to show.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which process?
> **A:** Expense approvals.
>
> **Q:** Who asks?
> **A:** Our accountant, at year end.
>
> **Q:** How far back?
> **A:** Three years.

**Recommended next step** - offered, not built:

> Define the small set of events worth keeping and record who did what and when. Depth follows the question you need to answer.
>
> Workflow: Event recorded → Actor and time → Stored → Periodically reviewed → Evidence produced
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
- Does not provide legal assurance of compliance or act as a security control on its own.
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


## Audit Log Review Checklist

Before treating a change record as evidence, verify the event identity, actor, timestamp, target, action, result, and correlation reference as separate values. Preserve the original event text alongside any normalized fields, record the timezone and clock source, and mark missing values as `Unknown`. Group related events by a stable correlation ID, but do not merge distinct actions into one summary row.

For a review export, filter by the requested time window first, then check that the export is complete, ordered deterministically, and scoped to the authorized system. Redact secrets and personal data only after retaining a reversible reference to the source record; never rewrite the underlying audit event. Record retention, deletion, clock drift, failed writes, duplicate events, and any gap in sequence as review findings rather than silently filling them.


## Event Taxonomy

Use a fixed action vocabulary such as `create`, `read`, `update`, `delete`, `export`, `approve`, `reject`, `login`, `permission-change`, and `retention-delete`. Store the resource type and resource identifier separately from the human-readable label. For bulk jobs, record the job identifier, item count, start and finish, partial-failure count, and final status; one bulk event must not be mistaken for one successful change per item.

For investigations, preserve the sequence as observed, then derive a second view grouped by actor, resource, or correlation ID. Mark derived views as derived and keep the query definition with the export. A missing event is a finding only when the expected event boundary and source system are known.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up compliance trail for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

