---
name: vendor-contractor-management
description: 'Vendor register: name, type, services, contact, linked contract dates, payment terms and rating. Use for vendor and contractor management.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, operate]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Vendor & Contractor Management

**What it is:** External management.

## Overview

Works out the smallest useful **Vendor & Contractor Management** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 8: Operate. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- vendor management
- supplier tracker
- contractor register
- vendor database

Also use it when the user says "external management", or describes the same process happening in a
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

> **Q:** How many vendors or contractors do you work with?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Vendors** - How many active? / What do they supply? / Any single point of failure?
- **Commercials** - Cost or rate? / Fixed or recurring? / Renewal dates?
- **Risk** - Any compliance or security check? / Owner per vendor? / Data shared with them?
- **Current process** - Is it recorded now? / Accounts payable or nothing? / What gets missed?
- **Outcome** - What do you need? / A vendor register, a review cycle or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: vendor-contractor-management
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Vendors": null
  "Commercials": null
  "Risk": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** One record per vendor with an owner, the renewal date and what they can access, and review the ones with data or system access more often.

**Why this one:** Vendor risk concentrates in the few vendors with access. Tag those and review them; the rest need a register, not a process.

**Workflow:** Vendor recorded → Owner assigned → Due diligence → Review → Renewed or ended

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
Vendor Name,Vendor Type,Services,Contact Person,Email,Phone,Department,Linked Contract,Contract Start,Contract End,Payment Terms,Rating,Status,Vendor ID
Acme Corp,SaaS,"Cloud hosting, support",Rahul Mehta,rahul.mehta@example.com,+91 98xxxxxx21,Delivery,CON-2026-009,2026-01-01,2026-12-31,30 days,4,Active,
```

```sql
CREATE TABLE vendor_contractor_management (
  vendor_name VARCHAR(255),
  vendor_type VARCHAR(100) NOT NULL,
  services VARCHAR(255),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  department VARCHAR(255),
  linked_contract VARCHAR(255),  -- relation -> target record
  contract_start DATE NOT NULL,
  contract_end DATE NOT NULL,
  payment_terms VARCHAR(255),
  rating NUMERIC NOT NULL,
  status VARCHAR(100) NOT NULL,
  vendor_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vendor_contractor_management_status ON vendor_contractor_management (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Vendor & Contractor Management",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Vendor Name": { "type": "string" },
      "Vendor Type": { "type": "string" },
      "Services": { "type": "string" },
      "Contact Person": { "type": "string" },
      "Email": { "type": "string", "format": "email" },
      "Phone": { "type": "string" },
      "Department": { "type": "string" },
      "Linked Contract": { "type": "string" },
      "Contract Start": { "type": "string", "format": "date" },
      "Contract End": { "type": "string", "format": "date" },
      "Payment Terms": { "type": "string" },
      "Rating": { "type": "number" },
      "Status": { "type": "string" },
      "Vendor ID": { "type": "integer" }
  },
  "required": [
      "Vendor Type",
      "Contract Start",
      "Contract End",
      "Rating",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Vendor Name | Title | Use as the database title |
| Vendor Type | Select (add options after import) | Convert to Select, add options: "SaaS", "Service", "Contractor", "Consultant", "Landlord" |
| Services | Text | Leave as Text |
| Contact Person | Text | Leave as Text |
| Email | Email | Convert to Email |
| Phone | Text | Leave as Text |
| Department | Text | Leave as Text |
| Linked Contract | Relation (link to the target database) | Convert to Relation, link to the target database |
| Contract Start | Date | Convert to Date |
| Contract End | Date | Convert to Date |
| Payment Terms | Text | Leave as Text |
| Rating | Number | Convert to Number |
| Status | Select (add options after import) | Convert to Select, add options: "Prospect", "Onboarding", "Active", "Under Review", "Offboarding", "Terminated" |
| Vendor ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Vendor Name | `text` | `VARCHAR(255)` | `string` | Text | `Acme Corp` |
| 2 | Vendor Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `SaaS` |
| 3 | Services | `text` | `VARCHAR(255)` | `string` | Text | `Cloud hosting, support` |
| 4 | Contact Person | `text` | `VARCHAR(255)` | `string` | Text | `Rahul Mehta` |
| 5 | Email | `email` | `VARCHAR(255)` | `string, format: email` | Email | `rahul.mehta@example.com` |
| 6 | Phone | `text` | `VARCHAR(255)` | `string` | Text | `+91 98xxxxxx21` |
| 7 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 8 | Linked Contract | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `CON-2026-009` |
| 9 | Contract Start | `date` | `DATE` | `string, format: date` | Date | `2026-01-01` |
| 10 | Contract End | `date` | `DATE` | `string, format: date` | Date | `2026-12-31` |
| 11 | Payment Terms | `text` | `VARCHAR(255)` | `string` | Text | `30 days` |
| 12 | Rating | `number` | `NUMERIC` | `number` | Number | `4` |
| 13 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |
| 14 | Vendor ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Vendor Type**

```
SaaS | Service | Contractor | Consultant | Landlord
```
**Status**

```
Prospect | Onboarding | Active | Under Review | Offboarding | Terminated
```

## Relations

Link fields: `Linked Contract`

## Examples

**Prompt**

```
Two vendors have access to our systems and nobody reviews it.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many vendors?
> **A:** Twelve.
>
> **Q:** Any with system access?
> **A:** Two.
>
> **Q:** Recorded where?
> **A:** Accounting package only.

**Recommended next step** - offered, not built:

> One record per vendor with an owner, the renewal date and what they can access, and review the ones with data or system access more often.
>
> Workflow: Vendor recorded → Owner assigned → Due diligence → Review → Renewed or ended
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
- Does not assess vendors, sign anything or manage payments.
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
I want to set up external management for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

