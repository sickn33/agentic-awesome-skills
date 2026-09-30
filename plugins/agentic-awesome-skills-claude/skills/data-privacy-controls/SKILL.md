---
name: data-privacy-controls
description: 'Data privacy control register: data category, lawful basis, retention period, access roles, encryption and consent requirement per module. Use for GDPR compliance.'
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

# Data Privacy Controls

**What it is:** GDPR/CCPA.

## Overview

Works out the smallest useful **Data Privacy Controls** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 7: Protect. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- gdpr compliance
- data privacy register
- ccpa controls
- data protection tracker

Also use it when the user says "gdpr/ccpa", or describes the same process happening in a
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

> **Q:** What personal data do you hold?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Data** - Which categories? / Employee, customer or both? / How many people affected?
- **Purpose** - Why is it held? / Consent given? / Any special categories?
- **Controls** - Who can access it? / Retention rules? / Deletion process?
- **Current process** - Is it documented? / Any privacy notice? / Has a breach happened?
- **Outcome** - What do you need? / A data inventory, a control list or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: data-privacy-controls
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Data": null
  "Purpose": null
  "Controls": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Start with an inventory of what is held and why, then attach an owner and a retention rule to each item.

**Why this one:** Privacy work fails without an inventory, because you cannot protect data you have not listed. The inventory comes first.

**Workflow:** Data category listed → Purpose recorded → Owner and access → Retention rule → Review

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
Control,Data Category,Module,Legal Basis,Retention Period,Access Roles,Encryption,Consent Required,Owner,Last Reviewed,Status,Control ID
Employee data retention,Personal,Invoices & Billing,Contractual necessity,24 months after last activity,"People team, Finance",At rest and in transit,FALSE,Sneha Iyer,2026-01-15,Implemented,
```

```sql
CREATE TABLE data_privacy_controls (
  control VARCHAR(255),
  data_category VARCHAR(100) NOT NULL,
  module VARCHAR(255),
  legal_basis VARCHAR(255),
  retention_period VARCHAR(255),
  access_roles VARCHAR(255),
  encryption VARCHAR(255),
  consent_required BOOLEAN NOT NULL,
  owner VARCHAR(255),
  last_reviewed DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  control_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_data_privacy_controls_status ON data_privacy_controls (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Data Privacy Controls",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Control": { "type": "string" },
      "Data Category": { "type": "string" },
      "Module": { "type": "string" },
      "Legal Basis": { "type": "string" },
      "Retention Period": { "type": "string" },
      "Access Roles": { "type": "string" },
      "Encryption": { "type": "string" },
      "Consent Required": { "type": "boolean" },
      "Owner": { "type": "string" },
      "Last Reviewed": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Control ID": { "type": "integer" }
  },
  "required": [
      "Data Category",
      "Last Reviewed",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Control | Title | Use as the database title |
| Data Category | Select (add options after import) | Convert to Select, add options: "Personal", "Sensitive", "Financial", "Health", "Biometric", "Location" |
| Module | Text | Leave as Text |
| Legal Basis | Text | Leave as Text |
| Retention Period | Text | Leave as Text |
| Access Roles | Text | Leave as Text |
| Encryption | Text | Leave as Text |
| Consent Required | Checkbox | Convert to Checkbox |
| Owner | Text | Leave as Text |
| Last Reviewed | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In Review", "Approved", "Implemented", "Retired" |
| Control ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Control | `text` | `VARCHAR(255)` | `string` | Text | `Employee data retention` |
| 2 | Data Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Personal` |
| 3 | Module | `text` | `VARCHAR(255)` | `string` | Text | `Invoices & Billing` |
| 4 | Legal Basis | `text` | `VARCHAR(255)` | `string` | Text | `Contractual necessity` |
| 5 | Retention Period | `text` | `VARCHAR(255)` | `string` | Text | `24 months after last activity` |
| 6 | Access Roles | `text` | `VARCHAR(255)` | `string` | Text | `People team, Finance` |
| 7 | Encryption | `text` | `VARCHAR(255)` | `string` | Text | `At rest and in transit` |
| 8 | Consent Required | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 9 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 10 | Last Reviewed | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 11 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Implemented` |
| 12 | Control ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Data Category**

```
Personal | Sensitive | Financial | Health | Biometric | Location
```
**Status**

```
Draft | In Review | Approved | Implemented | Retired
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We hold a lot of employee data and cannot say who owns it.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which categories?
> **A:** Employee and customer contact details.
>
> **Q:** Consent given?
> **A:** For customers, yes.
>
> **Q:** Is it documented?
> **A:** No.

**Recommended next step** - offered, not built:

> Start with an inventory of what is held and why, then attach an owner and a retention rule to each item.
>
> Workflow: Data category listed → Purpose recorded → Owner and access → Retention rule → Review
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
- Does not provide legal advice, and you should involve a qualified reviewer for compliance obligations.
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
I want to set up gdpr/ccpa for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

