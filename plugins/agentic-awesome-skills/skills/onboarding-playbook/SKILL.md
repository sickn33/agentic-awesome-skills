---
name: onboarding-playbook
description: 'Onboarding checklist: step, phase and order, department, owner, linked SOP and required flag. Use for joiner onboarding.'
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

# Onboarding Playbook

**What it is:** Structured onboarding.

## Overview

Works out the smallest useful **Onboarding Playbook** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- onboarding checklist
- onboarding playbook
- new hire 30 60 90 plan
- onboarding steps tracker

Also use it when the user says "structured onboarding", or describes the same process happening in a
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

> **Q:** When does a new joiner start?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Journey** - How long is onboarding? / Same for everyone? / By role or by person?
- **Steps** - Day one tasks? / Week one? / 30, 60, 90 day?
- **Ownership** - Who owns each step? / Manager or HR? / Who signs off?
- **Current process** - Is it written down? / Checklist used? / What gets skipped?
- **Outcome** - What do you need? / A checklist, a schedule or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: onboarding-playbook
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Journey": null
  "Steps": null
  "Ownership": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Build a checklist with an owner and a due offset from the joining date, so the same plan applies to every new joiner.

**Why this one:** Onboarding plans fail when they are per-person documents. One plan with day offsets is reusable and keeps a 30 percent no-show from being missed.

**Workflow:** Offer accepted → Pre-boarding → Day one → Week one → 30, 60, 90 day

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
Onboarding Step,Phase,Order,Department,Owner,Linked SOP,Required,Notes,Step ID
Day 1 - Welcome and accounts,Week 1,1,Delivery,Sneha Iyer,SOP-ONB-001,TRUE,"Ran it for the February joiner; the equipment step needs a named owner, not a checklist.",
```

```sql
CREATE TABLE onboarding_playbook (
  onboarding_step VARCHAR(255),
  phase VARCHAR(255),
  sort_order NUMERIC NOT NULL,
  department VARCHAR(255),
  owner VARCHAR(255),
  linked_sop VARCHAR(255),  -- relation -> target record
  required BOOLEAN NOT NULL,
  notes TEXT,
  step_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Onboarding Playbook",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Onboarding Step": { "type": "string" },
      "Phase": { "type": "string" },
      "Order": { "type": "number" },
      "Department": { "type": "string" },
      "Owner": { "type": "string" },
      "Linked SOP": { "type": "string" },
      "Required": { "type": "boolean" },
      "Notes": { "type": "string" },
      "Step ID": { "type": "integer" }
  },
  "required": [
      "Order"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Onboarding Step | Title | Use as the database title |
| Phase | Text | Leave as Text |
| Order | Number | Convert to Number |
| Department | Text | Leave as Text |
| Owner | Text | Leave as Text |
| Linked SOP | Relation (link to the target database) | Convert to Relation, link to the target database |
| Required | Checkbox | Convert to Checkbox |
| Notes | Text | Leave as Text |
| Step ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Onboarding Step | `text` | `VARCHAR(255)` | `string` | Text | `Day 1 - Welcome and accounts` |
| 2 | Phase | `text` | `VARCHAR(255)` | `string` | Text | `Week 1` |
| 3 | Order | `number` | `NUMERIC` | `number` | Number | `1` |
| 4 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 5 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 6 | Linked SOP | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `SOP-ONB-001` |
| 7 | Required | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `TRUE` |
| 8 | Notes | `long_text` | `TEXT` | `string` | Text | `Ran it for the February joiner; the equipment step needs a named owner, not a checklist.` |
| 9 | Step ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

_No Select fields._

## Relations

Link fields: `Linked SOP`

## Examples

**Prompt**

```
New joiners ask the same setup questions every time and answers differ.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How long?
> **A:** 90 days.
>
> **Q:** Owner of the steps?
> **A:** HR, with manager input.
>
> **Q:** Written down?
> **A:** Only informally.

**Recommended next step** - offered, not built:

> Build a checklist with an owner and a due offset from the joining date, so the same plan applies to every new joiner.
>
> Workflow: Offer accepted → Pre-boarding → Day one → Week one → 30, 60, 90 day
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
- Does not chase tasks or notify owners on their own.
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
I want to set up structured onboarding for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

