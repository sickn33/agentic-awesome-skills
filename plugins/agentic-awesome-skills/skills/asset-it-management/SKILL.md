---
name: asset-it-management
description: 'Asset and IT register: serial, model, condition, assignee, location, purchase value, warranty expiry and return date, as CSV, SQL, JSON Schema or Notion on request. Use for asset audits.'
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
- onboard
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Asset & IT Management

**What it is:** Equipment tracking.

## Overview

Works out the smallest useful **Asset & IT Management** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- asset tracker
- it asset management
- laptop inventory
- equipment register

Also use it when the user says "equipment tracking", or describes the same process happening in a
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

> **Q:** How many devices does the company own?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Assets** - How many assets? / Laptops, phones or both? / Monitors and other?
- **Assignment** - Who assigns? / Signed for or not? / Shared or personal?
- **Tracking** - Serial numbers tracked? / Warranty dates? / Insurance?
- **Current process** - Where is the list now? / Spreadsheet or none? / What goes missing?
- **Outcome** - What do you need? / An inventory, returns or a spend view?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: asset-it-management
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Assets": null
  "Assignment": null
  "Tracking": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Track assets as rows with a serial number and a named holder. Assign on day one, release on exit, and the list stays true.

**Why this one:** Asset registers fail at handover, not at purchase. Tying every asset to a person and a date is what makes it accurate.

**Workflow:** Purchase → Assign to person → Store location → Return on exit → Write-off

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
Asset Name,Asset ID,Asset Type,Assigned Date,Assigned To,Linked Accounts,Brand/Model,Condition,Current Value,Department,Location,Notes,Purchase Date,Purchase Value,Currency,Return Date,Serial Number,Status,Warranty Expiry
Example Laptop 14,,Laptop,2026-01-15,Example Employee,"Workspace, VPN",Example Laptop 14 (2023),New,800.00,Delivery,Example City,"Warranty runs to December 2027, so the finance depreciation schedule needs to match.",2026-01-15,1000.00,INR,2026-01-15,SN-EXAMPLE-001,In Use,2027-11-14
```

```sql
CREATE TABLE asset_it_management (
  asset_name VARCHAR(255),
  asset_id SERIAL PRIMARY KEY,
  asset_type VARCHAR(100) NOT NULL,
  assigned_date DATE NOT NULL,
  assigned_to VARCHAR(255),
  linked_accounts VARCHAR(255),  -- relation -> target record
  brand_model VARCHAR(255),
  condition VARCHAR(100) NOT NULL,
  current_value NUMERIC(14,2) NOT NULL,
  department VARCHAR(255),
  location VARCHAR(255),
  notes TEXT,
  purchase_date DATE NOT NULL,
  purchase_value NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  return_date DATE,
  serial_number VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  warranty_expiry DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_asset_it_management_status ON asset_it_management (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Asset & IT Management",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "Asset Name": {
      "type": "string"
    },
    "Asset ID": {
      "type": "integer"
    },
    "Asset Type": {
      "type": "string"
    },
    "Assigned Date": {
      "type": "string",
      "format": "date"
    },
    "Assigned To": {
      "type": "string"
    },
    "Linked Accounts": {
      "type": "string"
    },
    "Brand/Model": {
      "type": "string"
    },
    "Condition": {
      "type": "string"
    },
    "Current Value": {
      "type": "number"
    },
    "Department": {
      "type": "string"
    },
    "Location": {
      "type": "string"
    },
    "Notes": {
      "type": "string"
    },
    "Purchase Date": {
      "type": "string",
      "format": "date"
    },
    "Purchase Value": {
      "type": "number"
    },
    "Currency": {
      "type": "string"
    },
    "Return Date": {
      "type": "string",
      "format": "date"
    },
    "Serial Number": {
      "type": "string"
    },
    "Status": {
      "type": "string"
    },
    "Warranty Expiry": {
      "type": "string",
      "format": "date"
    }
  },
  "required": [
    "Asset Type",
    "Assigned Date",
    "Condition",
    "Current Value",
    "Purchase Date",
    "Purchase Value",
    "Status",
    "Warranty Expiry"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Asset Name | Title | Use as the database title |
| Asset ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Asset Type | Select (add options after import) | Convert to Select, add options: "Laptop", "Monitor", "Phone", "Tablet", "Accessory", "Furniture", "Software License" |
| Assigned Date | Date | Convert to Date |
| Assigned To | Text | Leave as Text |
| Linked Accounts | Relation (link to the target database) | Convert to Relation, link to the target database |
| Brand/Model | Text | Leave as Text |
| Condition | Select (add options after import) | Convert to Select, add options: "New", "Good", "Fair", "Needs Repair", "Retired" |
| Current Value | Number (format: currency) | Convert to Number, set format to Currency |
| Department | Text | Leave as Text |
| Location | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Purchase Date | Date | Convert to Date |
| Purchase Value | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Return Date | Date | Convert to Date |
| Serial Number | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "In Use", "In Stock", "In Repair", "Retired", "Lost" |
| Warranty Expiry | Date | Convert to Date |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

`Return Date` may be absent before the relevant lifecycle stage or when no verified source exists. Do not invent values to satisfy a schema.

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Asset Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Laptop 14` |
| 2 | Asset ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 3 | Asset Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Laptop` |
| 4 | Assigned Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 5 | Assigned To | `text` | `VARCHAR(255)` | `string` | Text | `Example Employee` |
| 6 | Linked Accounts | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `Workspace, VPN` |
| 7 | Brand/Model | `text` | `VARCHAR(255)` | `string` | Text | `Example Laptop 14 (2023)` |
| 8 | Condition | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `New` |
| 9 | Current Value | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `800.00` |
| 10 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 11 | Location | `text` | `VARCHAR(255)` | `string` | Text | `Example City` |
| 12 | Notes | `long_text` | `TEXT` | `string` | Text | `Warranty runs to December 2027, so the finance depreciation schedule needs to match.` |
| 13 | Purchase Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 14 | Purchase Value | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1000.00` |
| 15 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 16 | Return Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 17 | Serial Number | `text` | `VARCHAR(255)` | `string` | Text | `SN-EXAMPLE-001` |
| 18 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `In Use` |
| 19 | Warranty Expiry | `date` | `DATE` | `string, format: date` | Date | `2027-11-14` |

## Select Options

**Asset Type**

```
Laptop | Monitor | Phone | Tablet | Accessory | Furniture | Software License
```
**Condition**

```
New | Good | Fair | Needs Repair | Retired
```
**Status**

```
In Use | In Stock | In Repair | Retired | Lost
```

## Relations

Link fields: `Linked Accounts`

## Examples

**Prompt**

```
Laptops keep disappearing after people leave and we cannot find them.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Do you track serial numbers?
> **A:** No.
>
> **Q:** Who assigns?
> **A:** IT, on day one.
>
> **Q:** How many assets?
> **A:** About 40.

**Recommended next step** - offered, not built:

> Track assets as rows with a serial number and a named holder. Assign on day one, release on exit, and the list stays true.
>
> Workflow: Purchase → Assign to person → Store location → Return on exit → Write-off
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
- Does not image devices, wipe them or enforce MDM policy.
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
I want to set up equipment tracking for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

