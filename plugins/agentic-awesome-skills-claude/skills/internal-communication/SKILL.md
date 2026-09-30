---
name: internal-communication
description: 'Internal communication log: title, type, date, department, host and attendees, agenda, action items, follow-up date, meeting link and delivery status. Use for internal comms tracking.'
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

# Internal Communication

**What it is:** Structured comms.

## Overview

Works out the smallest useful **Internal Communication** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 6: Engage. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- internal comms log
- meeting tracker
- town hall minutes
- communication record

Also use it when the user says "structured comms", or describes the same process happening in a
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

> **Q:** How do people get company news today?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Channels** - Which channels? / How many groups? / Email included?
- **Cadence** - Daily digest or weekly? / Who writes it? / Any standing sections?
- **Ownership** - Who owns each channel? / Moderation? / What gets removed?
- **Current process** - How is it done now? / Scattered or one place? / What gets missed?
- **Outcome** - What do you need? / A channel list, a cadence or templates?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: internal-communication
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Channels": null
  "Cadence": null
  "Ownership": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Fix the ownership and the cadence first. Channels follow from that, and consolidating channels is usually the useful change.

**Why this one:** Internal comms rarely fail for lack of channels. They fail because nobody owns one and the format is inconsistent.

**Workflow:** Channel owned → Cadence set → Message drafted → Published → Read or acknowledged

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
Communication Title,Type,Date,Department,Host,Attendees,Agenda,Action Items,Follow-up Date,Meeting Link,Status,Communication ID
March All Hands,Announcement,2026-01-15,Delivery,Karan Malhotra,All employees,1. All-hands 2. Policy change 3. New joiners,Confirm budget with finance; circulate the revised scope.,2026-01-15,https://meet.example.com/abc,Sent,
```

```sql
CREATE TABLE internal_communication (
  communication_title VARCHAR(255),
  type VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  department VARCHAR(255),
  host VARCHAR(255),
  attendees VARCHAR(255),
  agenda VARCHAR(255),
  action_items VARCHAR(255),
  follow_up_date DATE NOT NULL,
  meeting_link TEXT,
  status VARCHAR(100) NOT NULL,
  communication_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_internal_communication_status ON internal_communication (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Internal Communication",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Communication Title": { "type": "string" },
      "Type": { "type": "string" },
      "Date": { "type": "string", "format": "date" },
      "Department": { "type": "string" },
      "Host": { "type": "string" },
      "Attendees": { "type": "string" },
      "Agenda": { "type": "string" },
      "Action Items": { "type": "string" },
      "Follow-up Date": { "type": "string", "format": "date" },
      "Meeting Link": { "type": "string", "format": "uri" },
      "Status": { "type": "string" },
      "Communication ID": { "type": "integer" }
  },
  "required": [
      "Type",
      "Date",
      "Follow-up Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Communication Title | Title | Use as the database title |
| Type | Select (add options after import) | Convert to Select, add options: "Announcement", "Update", "Policy", "Newsletter", "Escalation" |
| Date | Date | Convert to Date |
| Department | Text | Leave as Text |
| Host | Text | Leave as Text |
| Attendees | Text | Leave as Text |
| Agenda | Text | Leave as Text |
| Action Items | Text | Leave as Text |
| Follow-up Date | Date | Convert to Date |
| Meeting Link | URL | Convert to URL |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Scheduled", "Sent", "Acknowledged", "Archived" |
| Communication ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Communication Title | `text` | `VARCHAR(255)` | `string` | Text | `March All Hands` |
| 2 | Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Announcement` |
| 3 | Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 4 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 5 | Host | `text` | `VARCHAR(255)` | `string` | Text | `Karan Malhotra` |
| 6 | Attendees | `text` | `VARCHAR(255)` | `string` | Text | `All employees` |
| 7 | Agenda | `text` | `VARCHAR(255)` | `string` | Text | `1. All-hands 2. Policy change 3. New joiners` |
| 8 | Action Items | `text` | `VARCHAR(255)` | `string` | Text | `Confirm budget with finance; circulate the revised scope.` |
| 9 | Follow-up Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 10 | Meeting Link | `url` | `TEXT` | `string, format: uri` | URL | `https://meet.example.com/abc` |
| 11 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Sent` |
| 12 | Communication ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Type**

```
Announcement | Update | Policy | Newsletter | Escalation
```
**Status**

```
Draft | Scheduled | Sent | Acknowledged | Archived
```

## Relations

Link fields: none

## Examples

**Prompt**

```
News is scattered across five chats and nobody knows what is official.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which channels?
> **A:** Two chats and email.
>
> **Q:** Cadence?
> **A:** No set cadence.
>
> **Q:** Who owns them?
> **A:** Nobody specific.

**Recommended next step** - offered, not built:

> Fix the ownership and the cadence first. Channels follow from that, and consolidating channels is usually the useful change.
>
> Workflow: Channel owned → Cadence set → Message drafted → Published → Read or acknowledged
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
- Does not send messages or connect to chat platforms.
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
I want to set up structured comms for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

