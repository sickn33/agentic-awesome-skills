---
name: sop-company-wiki
description: 'SOP and company wiki register: title, category, department, owner, version, priority and review dates. Use for process documentation.'
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

# SOP & Company Wiki

**What it is:** Process documentation.

## Overview

Works out the smallest useful **SOP & Company Wiki** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 1: Foundation. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- sop template
- company wiki
- process documentation
- standard operating procedure tracker

Also use it when the user says "process documentation", or describes the same process happening in a
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

> **Q:** Which process hurts most to run?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Processes** - Which processes? / Written already? / How many?
- **Ownership** - Who owns each? / Who does the work? / Used by new hires?
- **Detail** - Step by step or checklist? / Tools involved? / Decision points?
- **Current process** - How is it done today? / In someone's head? / What breaks?
- **Outcome** - What do you need it for? / Onboarding, handover or audit?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: sop-company-wiki
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Processes": null
  "Ownership": null
  "Detail": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Write one page per process with owner, trigger and steps. Publish them where the team already works.

**Why this one:** An SOP nobody opens is worse than none. Start from the process that causes the most rework, and keep it short enough to be read.

**Workflow:** Trigger → Steps → Owner → Checklist → Review after each run

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
SOP Title,Category,Department,Description,Last Reviewed,Next Review,Owner,Priority,SOP ID,Status,Tags,Version
Client Onboarding Runbook,Process,Delivery,"The written procedure for one recurring task, with the steps in the order they are done.",2026-01-15,2026-01-15,Sneha Iyer,Low,,Published,"process, finance",v1.0
```

```sql
CREATE TABLE sop_company_wiki (
  sop_title VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  department VARCHAR(255),
  description TEXT,
  last_reviewed DATE NOT NULL,
  next_review DATE NOT NULL,
  owner VARCHAR(255),
  priority VARCHAR(100) NOT NULL,
  sop_id SERIAL PRIMARY KEY,
  status VARCHAR(100) NOT NULL,
  tags VARCHAR(255),
  version VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sop_company_wiki_status ON sop_company_wiki (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "SOP & Company Wiki",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "SOP Title": { "type": "string" },
      "Category": { "type": "string" },
      "Department": { "type": "string" },
      "Description": { "type": "string" },
      "Last Reviewed": { "type": "string", "format": "date" },
      "Next Review": { "type": "string", "format": "date" },
      "Owner": { "type": "string" },
      "Priority": { "type": "string" },
      "SOP ID": { "type": "integer" },
      "Status": { "type": "string" },
      "Tags": { "type": "string" },
      "Version": { "type": "string" }
  },
  "required": [
      "Category",
      "Last Reviewed",
      "Next Review",
      "Priority",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| SOP Title | Title | Use as the database title |
| Category | Select (add options after import) | Convert to Select, add options: "Process", "How To", "Checklist", "Reference", "Template" |
| Department | Text | Leave as Text |
| Description | Text | Leave as Text |
| Last Reviewed | Date | Convert to Date |
| Next Review | Date | Convert to Date |
| Owner | Text | Leave as Text |
| Priority | Select (add options after import) | Convert to Select, add options: "Low", "Medium", "High", "Urgent" |
| SOP ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In Review", "Published", "Under Revision", "Retired" |
| Tags | Text | Leave as Text |
| Version | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | SOP Title | `text` | `VARCHAR(255)` | `string` | Text | `Client Onboarding Runbook` |
| 2 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Process` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Description | `long_text` | `TEXT` | `string` | Text | `The written procedure for one recurring task, with the steps in the order they are done.` |
| 5 | Last Reviewed | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 6 | Next Review | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 7 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 8 | Priority | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Low` |
| 9 | SOP ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 10 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Published` |
| 11 | Tags | `text` | `VARCHAR(255)` | `string` | Text | `process, finance` |
| 12 | Version | `text` | `VARCHAR(255)` | `string` | Text | `v1.0` |

## Select Options

**Category**

```
Process | How To | Checklist | Reference | Template
```
**Priority**

```
Low | Medium | High | Urgent
```
**Status**

```
Draft | In Review | Published | Under Revision | Retired
```

## Relations

Link fields: none

## Examples

**Prompt**

```
New joiners keep asking how to do client onboarding and nobody answers the same way.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Is it written down?
> **A:** No, it is in one head.
>
> **Q:** Who owns it?
> **A:** The delivery lead.
>
> **Q:** What is it for?
> **A:** Onboarding new joiners.

**Recommended next step** - offered, not built:

> Write one page per process with owner, trigger and steps. Publish them where the team already works.
>
> Workflow: Trigger → Steps → Owner → Checklist → Review after each run
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
- Does not version-control changes or notify readers when a process changes.
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
I want to set up process documentation for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

