---
name: clients-accounts
description: 'Client and account register: contacts, billing address, tax ID and basis, payment terms, invoice totals, amounts paid and outstanding balance. Use for account tracking.'
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

# Clients & Accounts

**What it is:** Every client with contacts, terms and what they owe.

## Overview

Works out the smallest useful **Clients & Accounts** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 8: Operate. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- client database
- customer records
- client account tracker
- accounts receivable list

Also use it when the user says "every client with contacts, terms and what they owe", or describes the same process happening in a
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

> **Q:** How many active clients do you have?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Clients** - How many active? / Who owns each relationship? / Any churn risk?
- **Details** - Billing details needed? / Contacts per client? / Contract linked?
- **Activity** - How often do you speak? / Meetings logged? / Any health score?
- **Current process** - Where are clients recorded? / CRM or spreadsheet? / What is missing?
- **Outcome** - What do you need? / A client register, a pipeline or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: clients-accounts
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Clients": null
  "Details": null
  "Activity": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** One record per client with a named owner and next action, and keep activity notes on that record rather than in a separate log.

**Why this one:** Client records go stale when contact details change. A named owner and a next-action date keep the register usable.

**Workflow:** Client recorded → Owner assigned → Activity logged → Next action → Review

**Money basis:** this module does not assume that an amount is tax-inclusive or tax-exclusive. Record the
basis in `Tax Basis` before the money columns mean anything, and if the user has not said, it stays
`Not confirmed` - do not deduce it from the currency, the country, or the size of the number. A registration
number says a business is registered; it never says which tax rate applies or whether the amount includes tax,
so do not add tax rate or tax amount fields to the schema unless the user asks for tax tracking.

**Derived values - calculate, never accept as typed:**

```
Outstanding = Total Invoiced - Total Paid
```

Round once, at the end, to 2 decimal places, and use the rounded figure everywhere. When credits, write-offs
or a part payment mean the two totals do not explain the difference, record why in `Notes` and leave
`Outstanding` as the arithmetic result - do not adjust `Total Paid` to force a tie-out. If the user has
not supplied either total, leave `Outstanding` empty rather than defaulting it to 0.

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
Client Name,Client Type,Industry,Contact Person,Email,Phone,Billing Address,Tax ID,Currency,Tax Basis,Payment Terms (Days),Account Manager,Projects,Invoices,Total Invoiced,Total Paid,Outstanding,Client Portal Access,Status,Notes,Client ID
Example Customer,Retainer,Professional services,Example Contact,contact@example.com,+91 98xxxxxx21,"Example Address, Example City 000000",PAN-EXAMPLE-001,INR,Not confirmed,30,Example Account Manager,"Website Redesign, Data Migration","INV-EXAMPLE-001, INV-EXAMPLE-002",100000.00,90000.00,10000.00,"Read-only portal, expires 2026-03-31",Active,Account review set for March once the quarterly numbers are signed off.,(blank)

```

```sql
CREATE TABLE clients_accounts (
  client_name VARCHAR(255),
  client_type VARCHAR(100) NOT NULL,
  industry VARCHAR(255),
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(255),
  billing_address VARCHAR(255),
  tax_id VARCHAR(255),
  currency VARCHAR(255),
  tax_basis VARCHAR(100) NOT NULL,
  payment_terms_days NUMERIC,
  account_manager VARCHAR(255),
  projects VARCHAR(255),
  invoices VARCHAR(255),
  total_invoiced NUMERIC(14,2) NOT NULL,
  total_paid NUMERIC(14,2) NOT NULL,
  outstanding NUMERIC(14,2),
  client_portal_access VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  client_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (tax_basis IN ('Not confirmed', 'Tax-inclusive', 'Tax-exclusive')),
  -- Non-negative money. Outstanding is derived, so it is never typed and never NOT NULL.
  CHECK (total_invoiced >= 0 AND total_paid >= 0)
);

CREATE INDEX idx_clients_accounts_status ON clients_accounts (status);
```
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Clients and Accounts",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Client Name": { "type": "string" },
      "Client Type": { "type": "string" },
      "Industry": { "type": "string" },
      "Contact Person": { "type": "string" },
      "Email": { "type": "string", "format": "email" },
      "Phone": { "type": "string" },
      "Billing Address": { "type": "string" },
      "Tax ID": { "type": "string" },
      "Currency": { "type": "string" },
      "Tax Basis": { "type": "string" },
      "Payment Terms (Days)": { "type": "number" },
      "Account Manager": { "type": "string" },
      "Projects": { "type": "string" },
      "Invoices": { "type": "string" },
      "Total Invoiced": { "type": "number" },
      "Total Paid": { "type": "number" },
      "Outstanding": { "type": "number" },
      "Client Portal Access": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Client ID": { "type": "integer" }
  },
  "required": [
    "Client Type",
    "Tax Basis",
    "Payment Terms (Days)",
    "Total Invoiced",
    "Total Paid",
    "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Client Name | Title | Use as the database title |
| Client Type | Select | Add options: "Retainer", "Project", "One Off", "Enterprise", "SME" |
| Industry | Text | Leave as Text |
| Contact Person | Text | Leave as Text |
| Email | Email | Convert to Email |
| Phone | Text | Leave as Text |
| Billing Address | Text | Leave as Text |
| Tax ID | Text | Leave as Text. Store a registration number as text, never as a number: the leading zeros and the letters are part of the value |
| Currency | Text | Leave as Text. ISO 4217 code, for example INR, not "Rupees" |
| Tax Basis | Select | Add options: "Not confirmed", "Tax-inclusive", "Tax-exclusive" |
| Payment Terms (Days) | Number | Convert to Number |
| Account Manager | Text | Leave as Text. This is a person, so it stays a name and not a relation; the directory owns the person record |
| Projects | Text | Leave as Text. Denormalised list, not a Notion Relation: the project table is not part of this build |
| Invoices | Text | Leave as Text. Denormalised list, not a Notion Relation: the invoice table is not part of this build |
| Total Invoiced | Number (format: currency) | Convert to Number, set format to Currency |
| Total Paid | Number (format: currency) | Convert to Number, set format to Currency |
| Outstanding | Number (format: currency) | Convert to Number, set format to Currency, and do not type it: it is calculated from Total Invoiced - Total Paid |
| Client Portal Access | Text | Leave as Text |
| Status | Select | Add options: "Prospect", "Active", "Onboarding", "At Risk", "Closed", "Lost" |
| Notes | Text | Leave as Text |
| Client ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Client Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Customer` |
| 2 | Client Type | `select` | `VARCHAR(100)` | `string` | Select | `Retainer` |
| 3 | Industry | `text` | `VARCHAR(255)` | `string` | Text | `Professional services` |
| 4 | Contact Person | `text` | `VARCHAR(255)` | `string` | Text | `Example Contact` |
| 5 | Email | `email` | `VARCHAR(255)` | `string, format: email` | Email | `contact@example.com` |
| 6 | Phone | `text` | `VARCHAR(255)` | `string` | Text | `+91 98xxxxxx21` |
| 7 | Billing Address | `text` | `VARCHAR(255)` | `string` | Text | `Example Address, Example City 000000` |
| 8 | Tax ID | `text` | `VARCHAR(255)` | `string` | Text | `PAN-EXAMPLE-001` |
| 9 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 10 | Tax Basis | `select` | `VARCHAR(100)` | `string` | Select | `Not confirmed` |
| 11 | Payment Terms (Days) | `number` | `NUMERIC` | `number` | Number | `30` |
| 12 | Account Manager | `text` | `VARCHAR(255)` | `string` | Text | `Example Account Manager` |
| 13 | Projects | `text` | `VARCHAR(255)` | `string` | Text | `Website Redesign, Data Migration` |
| 14 | Invoices | `text` | `VARCHAR(255)` | `string` | Text | `INV-EXAMPLE-001, INV-EXAMPLE-002` |
| 15 | Total Invoiced | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `100000.00` |
| 16 | Total Paid | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `90000.00` |
| 17 | Outstanding | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `10000.00` |
| 18 | Client Portal Access | `text` | `VARCHAR(255)` | `string` | Text | `Read-only portal, expires 2026-03-31` |
| 19 | Status | `select` | `VARCHAR(100)` | `string` | Select | `Active` |
| 20 | Notes | `long_text` | `TEXT` | `string` | Text | `Account review set for March once the quarterly numbers are signed off.` |
| 21 | Client ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | (blank) |

## Select Options

**Tax Basis**

```
Not confirmed | Tax-inclusive | Tax-exclusive
```

A starting set, not a tax conclusion. `Not confirmed` is the correct value until the user says which basis their amounts use; do not deduce it. The options are deliberately not a tax rate, because a rate is a fact about the user that this module cannot know.

**Client Type**

```
Retainer | Project | One Off | Enterprise | SME
```
**Status**

```
Prospect | Active | Onboarding | At Risk | Closed | Lost
```

## Relations

Link fields: none

`Projects` and `Invoices` are **not** relations. They hold a denormalised, comma-separated list of records that
live in their own tables, which are not part of this build. They stay `Text`, and no Notion `Relation` is
created, because the target database does not exist here and inventing one is forbidden. A list written on the
client row will drift from the real records, so treat these as a convenience label, not a source of truth; the
invoice and project tables own that data.

**Link fields: none** is not the same as "no linkage exists". It means this table has no column that holds a
foreign key. The two list fields are the linkage, and they are text on purpose.

## Examples

**Prompt**

```
Client details live in three people inboxes.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many active?
> **A:** About fifteen.
>
> **Q:** Where recorded?
> **A:** One shared spreadsheet.
>
> **Q:** Billing details?
> **A:** In an accounting package.

**Recommended next step** - offered, not built:

> One record per client with a named owner and next action, and keep activity notes on that record rather than in a separate log.
>
> Workflow: Client recorded → Owner assigned → Activity logged → Next action → Review
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
- Does not contact clients, send invoices or manage the relationship for you.
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
- **Problem:** `Outstanding` stops matching `Total Invoiced - Total Paid`.
  **Solution:** one of the three was typed rather than calculated. Recalculate the difference every time, and when a credit or write-off explains the gap, say so in `Notes` instead of adjusting a total to force agreement.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up every client with contacts, terms and what they owe for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

