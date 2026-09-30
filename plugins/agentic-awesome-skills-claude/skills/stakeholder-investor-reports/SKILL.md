---
name: stakeholder-investor-reports
description: 'Stakeholder report register: stakeholder, period, key metrics, preparer, approver, send date and report link. Use for investor and board reporting.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, analyze]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Stakeholder & Investor Reports

**What it is:** External reporting.

## Overview

Works out the smallest useful **Stakeholder & Investor Reports** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 9: Analyze. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- investor report
- board report pack
- stakeholder update
- monthly report template

Also use it when the user says "external reporting", or describes the same process happening in a
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

> **Q:** Who needs the next stakeholder update?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Audience** - Who reads it? / Investors, board or both? / How often?
- **Content** - Which numbers matter? / Narrative included? / Any confidential detail?
- **Data** - Sources? / Who verifies? / How is it approved?
- **Current process** - How produced now? / How long does it take? / What gets missed?
- **Outcome** - What do you need? / A report structure or the data behind it?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: stakeholder-investor-reports
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Audience": null
  "Content": null
  "Data": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Agree the sections once, then reuse them each period, and keep a check on who verified each number before it goes out.

**Why this one:** Investor reporting fails on version drift and unverified numbers. A fixed section list and a named verifier solve both.

**Workflow:** Data gathered → Verified → Section drafted → Approved → Sent with a version marker

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
Report Title,Stakeholder,Period,Prepared By,Approved By,Key Metrics,Send Date,Report Link,Status,Report ID
Q1 delivery review,Board,2026-03,Ananya Rao,Vikram Singh,"On-time delivery, gross margin, churn",2026-01-15,https://example.com/reports/q1-board-pack,Circulated,
```

```sql
CREATE TABLE stakeholder_investor_reports (
  report_title VARCHAR(255),
  stakeholder VARCHAR(255),
  period VARCHAR(255),
  prepared_by VARCHAR(255),
  approved_by VARCHAR(255),
  key_metrics VARCHAR(255),
  send_date DATE NOT NULL,
  report_link TEXT,
  status VARCHAR(100) NOT NULL,
  report_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stakeholder_investor_reports_status ON stakeholder_investor_reports (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Stakeholder & Investor Reports",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Report Title": { "type": "string" },
      "Stakeholder": { "type": "string" },
      "Period": { "type": "string" },
      "Prepared By": { "type": "string" },
      "Approved By": { "type": "string" },
      "Key Metrics": { "type": "string" },
      "Send Date": { "type": "string", "format": "date" },
      "Report Link": { "type": "string", "format": "uri" },
      "Status": { "type": "string" },
      "Report ID": { "type": "integer" }
  },
  "required": [
      "Send Date",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Report Title | Title | Use as the database title |
| Stakeholder | Text | Leave as Text |
| Period | Text | Leave as Text |
| Prepared By | Text | Leave as Text |
| Approved By | Text | Leave as Text |
| Key Metrics | Text | Leave as Text |
| Send Date | Date | Convert to Date |
| Report Link | URL | Convert to URL |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "Circulated", "Reviewed", "Published" |
| Report ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Report Title | `text` | `VARCHAR(255)` | `string` | Text | `Q1 delivery review` |
| 2 | Stakeholder | `text` | `VARCHAR(255)` | `string` | Text | `Board` |
| 3 | Period | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 4 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Ananya Rao` |
| 5 | Approved By | `text` | `VARCHAR(255)` | `string` | Text | `Vikram Singh` |
| 6 | Key Metrics | `text` | `VARCHAR(255)` | `string` | Text | `On-time delivery, gross margin, churn` |
| 7 | Send Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Report Link | `url` | `TEXT` | `string, format: uri` | URL | `https://example.com/reports/q1-board-pack` |
| 9 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Circulated` |
| 10 | Report ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Status**

```
Draft | Circulated | Reviewed | Published
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Each investor report is rebuilt from scratch and the numbers differ from the last one.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Audience?
> **A:** Two investors and the board.
>
> **Q:** How often?
> **A:** Quarterly.
>
> **Q:** Who verifies?
> **A:** Whoever is doing the report.

**Recommended next step** - offered, not built:

> Agree the sections once, then reuse them each period, and keep a check on who verified each number before it goes out.
>
> Workflow: Data gathered → Verified → Section drafted → Approved → Sent with a version marker
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
- Does not produce audited figures or provide investor or legal advice.
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
I want to set up external reporting for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

