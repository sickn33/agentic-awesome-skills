---
name: esop-equity-tracker
description: 'ESOP and equity grant register: grant date, shares granted, strike price, vesting start, schedule and cliff, plus vested and exercised shares. Use for equity tracking.'
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

# ESOP & Equity Tracker

**What it is:** Equity management.

## Overview

Works out the smallest useful **ESOP & Equity Tracker** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 7: Protect. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- esop tracker
- equity management
- option vesting tracker
- share grant register

Also use it when the user says "equity management", or describes the same process happening in a
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

> **Q:** Does your company have an ESOP or option plan?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Plan** - ESOP, options or RSUs? / How many people? / How many grants?
- **Vesting** - Vesting schedule? / Cliff period? / Acceleration on exit?
- **Valuation** - Latest valuation? / Who provides it? / How often updated?
- **Current process** - Is it tracked now? / Spreadsheets? / What gets missed?
- **Outcome** - What do you need? / A grant register, a vesting view or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: esop-equity-tracker
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Plan": null
  "Vesting": null
  "Valuation": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Track one row per grant with the vesting dates derived, and keep the valuation as a separate dated record.

**Why this one:** Equity records are read far more often than they are written. Getting the vesting schedule right at entry saves the recurring queries.

**Workflow:** Grant issued → Vesting schedule derived → Vesting events recorded → Valuation applied → Payout or lapse

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
Grant Title,Employee Name,Grant Date,Shares Granted,Strike Price,Currency,Vesting Start,Vesting Schedule,Cliff (Months),Shares Vested,Shares Exercised,Confidential,Status,Grant ID
2026 ESOP Grant,Aarav Sharma,2026-01-01,2400,450.00,INR,2026-01-01,"4 years monthly, 12 month cliff, 25% on the first anniversary.",12,600,600,Internal,Granted,
```

```sql
CREATE TABLE esop_equity_tracker (
  grant_title VARCHAR(255),
  employee_name VARCHAR(255),
  grant_date DATE NOT NULL,
  shares_granted NUMERIC NOT NULL,
  strike_price NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  vesting_start DATE NOT NULL,
  vesting_schedule VARCHAR(255),
  cliff_months NUMERIC NOT NULL,
  shares_vested NUMERIC NOT NULL,
  shares_exercised NUMERIC NOT NULL,
  confidential VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  grant_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_esop_equity_tracker_status ON esop_equity_tracker (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ESOP & Equity Tracker",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Grant Title": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Grant Date": { "type": "string", "format": "date" },
      "Shares Granted": { "type": "number" },
      "Strike Price": { "type": "number" },
      "Currency": { "type": "string" },
      "Vesting Start": { "type": "string", "format": "date" },
      "Vesting Schedule": { "type": "string" },
      "Cliff (Months)": { "type": "number" },
      "Shares Vested": { "type": "number" },
      "Shares Exercised": { "type": "number" },
      "Confidential": { "type": "string" },
      "Status": { "type": "string" },
      "Grant ID": { "type": "integer" }
  },
  "required": [
      "Grant Date",
      "Shares Granted",
      "Strike Price",
      "Vesting Start",
      "Cliff (Months)",
      "Shares Vested",
      "Shares Exercised",
      "Confidential",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Grant Title | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Grant Date | Date | Convert to Date |
| Shares Granted | Number | Convert to Number |
| Strike Price | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text |
| Vesting Start | Date | Convert to Date |
| Vesting Schedule | Text | Leave as Text |
| Cliff (Months) | Number | Convert to Number |
| Shares Vested | Number | Convert to Number |
| Shares Exercised | Number | Convert to Number |
| Confidential | Select (add options after import) | Convert to Select, add options: "Public", "Internal", "Restricted", "Highly Restricted" |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Approved", "Granted", "Vested", "Exercised", "Cancelled" |
| Grant ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Grant Title | `text` | `VARCHAR(255)` | `string` | Text | `2026 ESOP Grant` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Grant Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-01` |
| 4 | Shares Granted | `number` | `NUMERIC` | `number` | Number | `2400` |
| 5 | Strike Price | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `450.00` |
| 6 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 7 | Vesting Start | `date` | `DATE` | `string, format: date` | Date | `2026-01-01` |
| 8 | Vesting Schedule | `text` | `VARCHAR(255)` | `string` | Text | `4 years monthly, 12 month cliff, 25% on the first anniversary.` |
| 9 | Cliff (Months) | `number` | `NUMERIC` | `number` | Number | `12` |
| 10 | Shares Vested | `number` | `NUMERIC` | `number` | Number | `600` |
| 11 | Shares Exercised | `number` | `NUMERIC` | `number` | Number | `600` |
| 12 | Confidential | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Internal` |
| 13 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Granted` |
| 14 | Grant ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Confidential**

```
Public | Internal | Restricted | Highly Restricted
```
**Status**

```
Draft | Approved | Granted | Vested | Exercised | Cancelled
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Nobody can answer when a specific grant fully vests.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Plan type?
> **A:** ESOP.
>
> **Q:** How many people?
> **A:** Around 25.
>
> **Q:** How many grants?
> **A:** Two so far.

**Recommended next step** - offered, not built:

> Track one row per grant with the vesting dates derived, and keep the valuation as a separate dated record.
>
> Workflow: Grant issued → Vesting schedule derived → Vesting events recorded → Valuation applied → Payout or lapse
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
- Does not value shares, file documents with authorities or give tax or legal advice.
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
I want to set up equity management for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

