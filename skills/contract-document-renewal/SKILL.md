---
name: contract-document-renewal
description: 'Contract register: counterparty, owner, start and end dates, auto-renewal flag, renewal notice deadline, value and tax basis. Use for renewal tracking and notice deadlines.'
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

# Contract & Document Renewal

**What it is:** Renewal management.

## Overview

Works out the smallest useful **Contract & Document Renewal** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 7: Protect. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- contract tracker
- renewal calendar
- contract expiry alerts
- vendor agreement register

Also use it when the user says "renewal management", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: payroll calculation, tax filing, or legal advice. This skill produces
empty templates only - it never holds or processes real employee or customer data.

## How It Works

The upstream shared execution contract is not bundled; follow this file's
intent, placeholder-only output and target-specific external-write rules. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "set up" or "build" or "create" -> the user wants artifacts; go to Step 2.
- "our process is ..." or "it is in a sheet" -> the user wants to move an existing process; capture it, then Step 2.
- "is this right" or "review" or "audit" -> the user wants a check, not a build; answer from what they share.
- "how do I ..." -> advice question; answer directly and offer the build only if it helps.

Ask only if this is the highest-value missing fact; otherwise proceed without an opener:

> **Q:** When is your next renewal?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Documents** - How many contracts? / Which types? / Customers or vendors?
- **Dates** - Renewal date known? / Notice period? / Auto-renew or manual?
- **Ownership** - Who owns each? / Who signs? / Where stored?
- **Current process** - Is it tracked now? / Calendar or reminders? / What gets missed?
- **Outcome** - What do you need? / A renewal calendar, an owner list or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: contract-document-renewal
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Documents": null
  "Dates": null
  "Ownership": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Track the renewal date, the notice deadline and the owner as one record. Set the notice date as the trigger, not the renewal date.

**Why this one:** Renewals are missed because the notice deadline is earlier than the renewal date. Record both and act on the earlier one.

**Workflow:** Contract recorded → Notice window → Reminder → Review → Renewed, amended or ended

**The notice deadline is the trigger, so it has to exist as a date.** This module exists because the notice
deadline falls *before* the renewal date, and `Renewal Notice (Days)` alone cannot be watched - a number of days
never goes red. Store the deadline in `Notice Deadline` and calculate it, never accept it as typed:

```
Notice Deadline = End Date - Renewal Notice (Days)
```

This subtraction is a planning example only for an explicitly confirmed calendar-
day clause. Do not count the deadline day again: subtraction already defines the
date arithmetic (2027-03-31 minus 60 days = 2027-01-30). Actual deadlines may depend
on business days, receipt/service rules, timezone, holidays, contract amendments
and jurisdiction. Record a professionally verified deadline rather than overruling
it with a generic formula; if the clause/basis is unknown, leave the deadline blank
and flag review required. Do not infer that passing a date alone legally renewed
or terminated a contract. `Auto-Renew` records a clause, not proof of its operation.

**Status definitions must be agreed.** `Expiring Soon` is an owner-chosen review
window, preferably before the verified notice deadline; after that deadline,
permitted action is uncertain and needs review. `In Renewal` means a documented
ongoing renewal process, not an executed renewal. Only set `Renewed`/`Terminated`
with confirmed evidence. The schema has no Notes field: report unresolved issues
separately or add an explicit notes field consistently when requested.

**Money basis:** this module does not assume that `Contract Value` is tax-inclusive or tax-exclusive. Record the
basis in `Tax Basis` and leave it `Not confirmed` until the user says, rather than deducing it from the currency
or the size of the number. Do not add tax rate or tax amount fields unless the user asks for tax tracking.

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
Contract Title,Counterparty,Contract Type,Owner,Department,Start Date,End Date,Renewal Notice (Days),Notice Deadline,Auto-Renew,Contract Value,Tax Basis,Currency,Linked Legal Record,Status,Contract ID
Example Master Services Agreement,Example Customer Ltd,Customer,Example Owner,Delivery,2026-04-01,2027-03-31,60,2027-01-30,FALSE,120000.00,Not confirmed,INR,DOC-EXAMPLE-001,Active,CONTRACT-EXAMPLE-001

```

```sql
CREATE TABLE contract_document_renewal (
  contract_title VARCHAR(255),
  counterparty VARCHAR(255),
  contract_type VARCHAR(100) NOT NULL,
  owner VARCHAR(255),
  department VARCHAR(255),
  start_date DATE,
  end_date DATE,
  renewal_notice_days INTEGER,
  notice_deadline DATE,
  auto_renew BOOLEAN,
  contract_value NUMERIC(14,2),
  tax_basis VARCHAR(100) NOT NULL,
  currency VARCHAR(255),
  linked_legal_record VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  contract_id VARCHAR(100) PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- The notice window is the whole point of this register, so the two dates must be in order.
  CHECK (end_date > start_date),
  CHECK (renewal_notice_days >= 0),
  CHECK (status IN ('Active', 'Expiring Soon', 'In Renewal', 'Renewed', 'Expired', 'Terminated')),
  CHECK (tax_basis IN ('Not confirmed', 'Tax-inclusive', 'Tax-exclusive')),
  -- Allow a verified contract-specific deadline; generic subtraction is not legal validation.
  CHECK (notice_deadline IS NULL OR notice_deadline <= end_date)
  -- Renaming a relation to text is a data decision, not a formatting one:
  -- Linked Legal Record is VARCHAR(255) naming a document reference. If the signed-document
  -- library is ever added to this build, it becomes a real foreign key then, not before.
);

CREATE INDEX idx_contract_document_renewal_status ON contract_document_renewal (status);
CREATE INDEX idx_contract_document_renewal_notice ON contract_document_renewal (notice_deadline);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Contract Document Renewal",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Contract Title": { "type": "string" },
      "Counterparty": { "type": "string" },
      "Contract Type": { "type": "string" },
      "Owner": { "type": "string" },
      "Department": { "type": "string" },
      "Start Date": { "type": "string", "format": "date" },
      "End Date": { "type": "string", "format": "date" },
      "Renewal Notice (Days)": { "type": "integer", "minimum": 0 },
      "Notice Deadline": { "type": "string", "format": "date" },
      "Auto-Renew": { "type": "boolean" },
      "Contract Value": { "type": "number" },
      "Tax Basis": { "type": "string" },
      "Currency": { "type": "string" },
      "Linked Legal Record": { "type": "string" },
      "Status": { "type": "string" },
      "Contract ID": { "type": "string", "minLength": 1 }
  },
  "required": [
    "Contract ID",
    "Contract Type",
    "Tax Basis",
    "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Contract Title | Title | Use as the database title |
| Counterparty | Text | Leave as Text. Record the legal entity name the user gives, and keep the registered name and the trading name apart if they differ |
| Contract Type | Select | Add options: "Customer", "Vendor", "Employment", "Lease", "Service", "NDA" |
| Owner | Text | Leave as Text. A person, so a name and not a relation; the directory owns the person record |
| Department | Text | Leave as Text |
| Start Date | Date | Convert to Date |
| End Date | Date | Convert to Date |
| Renewal Notice (Days) | Number | Convert to Number. A whole number of days, never a date; the date is derived |
| Notice Deadline | Date | Convert to Date. Use verified clause-specific deadline; plain Date imports do not recalculate automatically |
| Auto-Renew | Checkbox | Convert to Checkbox |
| Contract Value | Number (format: currency) | Convert to Number, set format to Currency |
| Tax Basis | Select | Add options: "Not confirmed", "Tax-inclusive", "Tax-exclusive" |
| Currency | Text | Leave as Text. ISO 4217 code, for example INR, not "Rupees" |
| Linked Legal Record | Text | Leave as Text, NOT a Relation. The signed document library is not part of this build, so no target database exists to link to |
| Status | Select | Add options: "Active", "Expiring Soon", "In Renewal", "Renewed", "Expired", "Terminated" |
| Contract ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
the documented Linked Legal Record remains a text reference until its target exists.

## Artifact limitations

SQL is PostgreSQL-specific; its checks validate shape/order only, not legal dates.
`updated_at DEFAULT NOW()` does not update automatically. Text IDs are preserved
across formats; JSON Schema `format` needs an enforcing validator. No reminder or
Notion formula is created by a static Date mapping. Confirm currency precision and
contract-value period; restrict confidential documents and prevent spreadsheet
formula injection in text cells. Do not send renewal/termination notices without
authorization for the exact recipient and approved wording/delivery method.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Contract Title | `text` | `VARCHAR(255)` | `string` | Title | `Example Master Services Agreement` |
| 2 | Counterparty | `text` | `VARCHAR(255)` | `string` | Text | `Example Customer Ltd` |
| 3 | Contract Type | `select` | `VARCHAR(100)` | `string` | Select | `Customer` |
| 4 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Example Owner` |
| 5 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 6 | Start Date | `date` | `DATE` | `string, format: date` | Date | `2026-04-01` |
| 7 | End Date | `date` | `DATE` | `string, format: date` | Date | `2027-03-31` |
| 8 | Renewal Notice (Days) | `integer` | `INTEGER` | `integer` | Number | `60` |
| 9 | Notice Deadline | `date` | `DATE` | `string, format: date` | Date | `2027-01-30` |
| 10 | Auto-Renew | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 11 | Contract Value | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `120000.00` |
| 12 | Tax Basis | `select` | `VARCHAR(100)` | `string` | Select | `Not confirmed` |
| 13 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 14 | Linked Legal Record | `text` | `VARCHAR(255)` | `string` | Text | `DOC-EXAMPLE-001` |
| 15 | Status | `select` | `VARCHAR(100)` | `string` | Select | `Active` |
| 16 | Contract ID | `id` | `VARCHAR(100) PRIMARY KEY` | `string` | Text (preserve source ID) | CONTRACT-EXAMPLE-001 |

## Select Options

**Contract Type**

```
Customer | Vendor | Employment | Lease | Service | NDA
```

**Tax Basis**

```
Not confirmed | Tax-inclusive | Tax-exclusive
```

A starting set, not a tax conclusion. `Not confirmed` is correct until the user states their basis; do not deduce it, and do not add a rate field, because a rate is a fact about the user that this module cannot know.
**Status**

```
Active | Expiring Soon | In Renewal | Renewed | Expired | Terminated
```

## Relations

Link fields: none

`Linked Legal Record` is **not** a relation and is deliberately not typed `relation`. It holds a document
reference such as `DOC-EXAMPLE-001`. The signed-document library is not part of this build, so the target
database does not exist, and §8 forbids inventing one or creating a Notion `Relation` to nowhere. It stays
`Text` in every artifact, with a SQL comment saying what it is, and becomes a real foreign key only if that
database is ever built. Naming the intended target is what makes that upgrade possible later.

`Owner` is likewise a name, not a foreign key: the directory table is not part of this build, so a person is
recorded by name and the reference will drift from the directory.

## Examples

**Prompt**

```
A vendor contract renewed automatically at a higher price because nobody tracked it.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many contracts?
> **A:** Around fifteen.
>
> **Q:** Notice period?
> **A:** Thirty days on most.
>
> **Q:** Tracked today?
> **A:** In a spreadsheet, partly.

**Recommended next step** - offered, not built:

> Track the renewal date, the notice deadline and the owner as one record. Set the notice date as the trigger, not the renewal date.
>
> Workflow: Contract recorded → Notice window → Reminder → Review → Renewed, amended or ended
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use real relations only when the target exists; preserve this document-reference field as text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.

## Limitations

- Empty template only. It does not compute payroll, tax, leave balances or KPIs.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
- Does not review contract terms or provide legal advice.
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
- **Problem:** a renewal was missed even though the notice period was recorded.
  **Solution:** `Renewal Notice (Days)` is an input that never goes red on its own. `Notice Deadline` is the date to watch; if it is unknown, flag owner review rather than inventing a deadline.
- **Problem:** a contract reads `In Renewal` with no renewal agreed.
  **Solution:** Use the agreed status meanings and documented evidence. A passed notice deadline needs review; it does not prove there is still time to act or that renewal occurred.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up renewal management for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

