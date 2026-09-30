---
name: policy-library
description: 'Policy register: name, version, category, owner and approver, applies to, compliance framework, acknowledgement requirement, effective date and next review. Use for policy management.'
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

# Policy Library

**What it is:** Company policies.

## Overview

Works out the smallest useful **Policy Library** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 1: Foundation. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- company policy template
- policy register
- hr policy database
- policy document library

Also use it when the user says "company policies", or describes the same process happening in a
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

> **Q:** Which policies exist today?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Policies** - Which policies exist? / Which are missing? / Company specific or generic?
- **Ownership** - Who approves each? / Who owns each? / Legal review needed?
- **Lifecycle** - Effective dates? / Review cycle? / Version history kept?
- **Current process** - Where do policies live now? / Shared drive or scattered? / Which are current?
- **Outcome** - What do you need? / A register, templates or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: policy-library
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Policies": null
  "Ownership": null
  "Lifecycle": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Build a register of policies with owner, version and review date. Write the missing policy drafts only for the ones you name.

**Why this one:** Most SMEs have policies in several places and no owner. A register with an owner and a review date makes the gap visible.

**Workflow:** Policy draft → Approve → Publish version → Assign → Review date

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
Policy Name,Acknowledgement Required,Applies To,Approver,Category,Compliance Framework,Effective Date,Next Review,Policy ID,Policy Owner,Status,Summary,Version,Acknowledgements
Code of Conduct,FALSE,All employees,Sneha Iyer,HR,ISO 27001,2026-01-15,2026-01-15,,Sneha Iyer,Published,"Code of conduct, version 2.1, reviewed in January.",v1.0,11
```

```sql
CREATE TABLE policy_library (
  policy_name VARCHAR(255),
  acknowledgement_required BOOLEAN NOT NULL,
  applies_to VARCHAR(255),
  approver VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  compliance_framework VARCHAR(255),
  effective_date DATE NOT NULL,
  next_review DATE NOT NULL,
  policy_id SERIAL PRIMARY KEY,
  policy_owner VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  summary TEXT,
  version VARCHAR(255),
  acknowledgements NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_policy_library_status ON policy_library (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Policy Library",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Policy Name": { "type": "string" },
      "Acknowledgement Required": { "type": "boolean" },
      "Applies To": { "type": "string" },
      "Approver": { "type": "string" },
      "Category": { "type": "string" },
      "Compliance Framework": { "type": "string" },
      "Effective Date": { "type": "string", "format": "date" },
      "Next Review": { "type": "string", "format": "date" },
      "Policy ID": { "type": "integer" },
      "Policy Owner": { "type": "string" },
      "Status": { "type": "string" },
      "Summary": { "type": "string" },
      "Version": { "type": "string" },
      "Acknowledgements": { "type": "number" }
  },
  "required": [
      "Category",
      "Effective Date",
      "Next Review",
      "Status",
      "Acknowledgements"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Policy Name | Title | Use as the database title |
| Acknowledgement Required | Checkbox | Convert to Checkbox |
| Applies To | Text | Leave as Text |
| Approver | Text | Leave as Text |
| Category | Select (add options after import) | Convert to Select, add options: "HR", "Finance", "Security", "Safety", "Legal", "Operations" |
| Compliance Framework | Text | Leave as Text |
| Effective Date | Date | Convert to Date |
| Next Review | Date | Convert to Date |
| Policy ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Policy Owner | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In Review", "Published", "Under Revision", "Retired" |
| Summary | Text | Leave as Text |
| Version | Text | Leave as Text |
| Acknowledgements | Number | Convert to Number |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Policy Name | `text` | `VARCHAR(255)` | `string` | Text | `Code of Conduct` |
| 2 | Acknowledgement Required | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 3 | Applies To | `text` | `VARCHAR(255)` | `string` | Text | `All employees` |
| 4 | Approver | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 5 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `HR` |
| 6 | Compliance Framework | `text` | `VARCHAR(255)` | `string` | Text | `ISO 27001` |
| 7 | Effective Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Next Review | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 9 | Policy ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 10 | Policy Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 11 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Published` |
| 12 | Summary | `long_text` | `TEXT` | `string` | Text | `Code of conduct, version 2.1, reviewed in January.` |
| 13 | Version | `text` | `VARCHAR(255)` | `string` | Text | `v1.0` |
| 14 | Acknowledgements | `number` | `NUMERIC` | `number` | Number | `11` |

## Select Options

**Category**

```
HR | Finance | Security | Safety | Legal | Operations
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
We have some HR policies in a folder and nothing else written down.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which are missing?
> **A:** Leave, expenses and remote work.
>
> **Q:** Who approves?
> **A:** The owner.
>
> **Q:** Review cycle?
> **A:** Every year.

**Recommended next step** - offered, not built:

> Build a register of policies with owner, version and review date. Write the missing policy drafts only for the ones you name.
>
> Workflow: Policy draft → Approve → Publish version → Assign → Review date
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
- Does not provide legal templates or jurisdiction-specific wording.
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
I want to set up company policies for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

