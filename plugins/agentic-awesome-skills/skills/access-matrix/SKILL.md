---
name: access-matrix
description: 'Access matrix of role-by-module permissions, with per-role scope, confidentiality level and SME tier, as CSV, SQL, JSON Schema or Notion on request. Use for access reviews.'
category: business
risk: safe
source: self
source_type: self
date_added: '2026-09-26'
author: WHOISABHISHEKADHIKARI
tags:
- sme
- business
- operations
- database
- csv
- notion
- sql
- foundation
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Access Matrix

**What it is:** What each role can see and change.

## Overview

Works out the smallest useful **Access Matrix** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 1: Foundation. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- who can access what matrix
- role permission matrix
- access control spreadsheet
- who sees which data

Also use it when the user says "what each role can see and change", or describes the same process happening in a
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

> **Q:** How many roles exist in the company?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Scope** - Which system or data? / How many roles? / Any external people?
- **Roles** - Who is owner or CEO? / Who is admin? / Who is line manager?
- **Rules** - View only or edit? / Any confidential areas? / Reviewed how often?
- **Current process** - How do you track access now? / Spreadsheet or none? / Any known gaps?
- **Outcome** - What should this produce? / An access list or a review cycle?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: access-matrix
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Scope": null
  "Roles": null
  "Rules": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Keep the matrix in the tool the team already reviews in, and treat it as a recurring review rather than a one-time document.

**Why this one:** Access problems are rarely about storage. They are about nobody re-checking who still needs what, so a review cycle matters more than the matrix itself.

**Workflow:** Role list → System inventory → Access rows → Quarterly review → Removal

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
Module,Module ID,Layer,SME Tier,Owner / CEO,Board,Finance,Tax,HR,IT & Admin,Department Head,Line Manager,Employee,Intern,Client,Confidential
Invoices & Billing,,Layer 8: Operate,Small,Full - all modules,Read - board pack only,"Read, add, edit - payroll and invoices","Read, add, edit - tax register",Full - people and compliance modules,"Read, add, edit - assets and access",Example Reviewer,"Read, add, edit - own team",Read - own records,Read - onboarding only,Example Customer,Internal
```

```sql
CREATE TABLE access_matrix (
  module VARCHAR(255),
  module_id SERIAL PRIMARY KEY,
  layer VARCHAR(255),
  sme_tier VARCHAR(100) NOT NULL,
  owner_ceo VARCHAR(255),
  board VARCHAR(255),
  finance VARCHAR(255),
  tax VARCHAR(255),
  hr VARCHAR(255),
  it_admin VARCHAR(255),
  department_head VARCHAR(255),
  line_manager VARCHAR(255),
  employee VARCHAR(255),
  intern VARCHAR(255),
  client VARCHAR(255),
  confidential VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Access Matrix",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Module": { "type": "string" },
      "Module ID": { "type": "integer" },
      "Layer": { "type": "string" },
      "SME Tier": { "type": "string" },
      "Owner / CEO": { "type": "string" },
      "Board": { "type": "string" },
      "Finance": { "type": "string" },
      "Tax": { "type": "string" },
      "HR": { "type": "string" },
      "IT & Admin": { "type": "string" },
      "Department Head": { "type": "string" },
      "Line Manager": { "type": "string" },
      "Employee": { "type": "string" },
      "Intern": { "type": "string" },
      "Client": { "type": "string" },
      "Confidential": { "type": "string" }
  },
  "required": [
      "SME Tier",
      "Confidential"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Module | Title | Use as the database title |
| Module ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Layer | Text | Leave as Text |
| SME Tier | Select (add options after import) | Convert to Select, add options: "Micro", "Small", "Medium", "Large", "Enterprise" |
| Owner / CEO | Text | Leave as Text |
| Board | Text | Leave as Text |
| Finance | Text | Leave as Text |
| Tax | Text | Leave as Text |
| HR | Text | Leave as Text |
| IT & Admin | Text | Leave as Text |
| Department Head | Text | Leave as Text |
| Line Manager | Text | Leave as Text |
| Employee | Text | Leave as Text |
| Intern | Text | Leave as Text |
| Client | Text | Leave as Text |
| Confidential | Select (add options after import) | Convert to Select, add options: "Public", "Internal", "Restricted", "Highly Restricted" |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Module | `text` | `VARCHAR(255)` | `string` | Text | `Invoices & Billing` |
| 2 | Module ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 3 | Layer | `text` | `VARCHAR(255)` | `string` | Text | `Layer 8: Operate` |
| 4 | SME Tier | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Small` |
| 5 | Owner / CEO | `text` | `VARCHAR(255)` | `string` | Text | `Full - all modules` |
| 6 | Board | `text` | `VARCHAR(255)` | `string` | Text | `Read - board pack only` |
| 7 | Finance | `text` | `VARCHAR(255)` | `string` | Text | `Read, add, edit - payroll and invoices` |
| 8 | Tax | `text` | `VARCHAR(255)` | `string` | Text | `Read, add, edit - tax register` |
| 9 | HR | `text` | `VARCHAR(255)` | `string` | Text | `Full - people and compliance modules` |
| 10 | IT & Admin | `text` | `VARCHAR(255)` | `string` | Text | `Read, add, edit - assets and access` |
| 11 | Department Head | `text` | `VARCHAR(255)` | `string` | Text | `Example Reviewer` |
| 12 | Line Manager | `text` | `VARCHAR(255)` | `string` | Text | `Read, add, edit - own team` |
| 13 | Employee | `text` | `VARCHAR(255)` | `string` | Text | `Read - own records` |
| 14 | Intern | `text` | `VARCHAR(255)` | `string` | Text | `Read - onboarding only` |
| 15 | Client | `text` | `VARCHAR(255)` | `string` | Text | `Example Customer` |
| 16 | Confidential | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Internal` |

## Select Options

**SME Tier**

```
Micro | Small | Medium | Large | Enterprise
```
**Confidential**

```
Public | Internal | Restricted | Highly Restricted
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We have 6 roles and want to know who can see payroll and bank details.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which system?
> **A:** Payroll, bank details and HR records.
>
> **Q:** How often should it be reviewed?
> **A:** Every quarter.
>
> **Q:** What do you use today?
> **A:** Nothing tracked.

**Recommended next step** - offered, not built:

> Keep the matrix in the tool the team already reviews in, and treat it as a recurring review rather than a one-time document.
>
> Workflow: Role list → System inventory → Access rows → Quarterly review → Removal
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
- Does not provision or revoke access. It only records who should have what.
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
I want to set up what each role can see and change for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

