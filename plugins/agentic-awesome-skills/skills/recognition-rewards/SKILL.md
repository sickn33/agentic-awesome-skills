---
name: recognition-rewards
description: 'Recognition register: employee, reward type, category, visibility, message and points awarded. Use for employee recognition programs.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, develop]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Recognition & Rewards

**What it is:** Celebrating excellence.

## Overview

Works out the smallest useful **Recognition & Rewards** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- employee recognition
- kudos board
- reward tracker
- employee appreciation log

Also use it when the user says "celebrating excellence", or describes the same process happening in a
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

> **Q:** How often do you recognise people?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Cadence** - Spot or monthly? / Who gives it? / Anyone or managers?
- **Reward** - Points, gift or cash? / Budget? / Extra time off?
- **Visibility** - Public or private? / Whole company or team? / Named or anonymous?
- **Current process** - Anything now? / Where is it captured? / Does anyone see it?
- **Outcome** - What do you need? / A log, a wall or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: recognition-rewards
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Cadence": null
  "Reward": null
  "Visibility": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Capture recognition as it happens, with a category so you can see what is being valued over time.

**Why this one:** Recognition programmes fail when entry is effortful. One line at the time of the event is enough; monthly retrospectives are never filled in.

**Workflow:** Recognition given → Category → Wall or summary → Monthly review

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
Recognition Title,Category,Date,Department,Given By,Message,Month,Notes,Points Awarded,Rec-Rwd ID,Recognised Employee,Reward Type,Visibility,Year
Won the Northwind pitch,Team,2026-01-15,Delivery,Karan Malhotra,Your probation review is due on 28 Feb. Book a slot with your manager.,2026-03,February awards sent; two nominations were duplicates of the same contribution.,50,,Aarav Sharma,Spot Award,Company-wide,2026
```

```sql
CREATE TABLE recognition_rewards (
  recognition_title VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  department VARCHAR(255),
  given_by VARCHAR(255),
  message VARCHAR(255),
  month VARCHAR(255),
  notes TEXT,
  points_awarded NUMERIC NOT NULL,
  rec_rwd_id SERIAL PRIMARY KEY,
  recognised_employee VARCHAR(255),
  reward_type VARCHAR(100) NOT NULL,
  visibility VARCHAR(255),
  year VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Recognition & Rewards",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Recognition Title": { "type": "string" },
      "Category": { "type": "string" },
      "Date": { "type": "string", "format": "date" },
      "Department": { "type": "string" },
      "Given By": { "type": "string" },
      "Message": { "type": "string" },
      "Month": { "type": "string" },
      "Notes": { "type": "string" },
      "Points Awarded": { "type": "number" },
      "Rec-Rwd ID": { "type": "integer" },
      "Recognised Employee": { "type": "string" },
      "Reward Type": { "type": "string" },
      "Visibility": { "type": "string" },
      "Year": { "type": "string" }
  },
  "required": [
      "Category",
      "Date",
      "Points Awarded",
      "Reward Type"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Recognition Title | Title | Use as the database title |
| Category | Select (add options after import) | Convert to Select, add options: "Team", "Individual", "Department", "Company", "Values" |
| Date | Date | Convert to Date |
| Department | Text | Leave as Text |
| Given By | Text | Leave as Text |
| Message | Text | Leave as Text |
| Month | Text | Leave as Text |
| Notes | Text | Leave as Text |
| Points Awarded | Number | Convert to Number |
| Rec-Rwd ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Recognised Employee | Text | Leave as Text |
| Reward Type | Select (add options after import) | Convert to Select, add options: "Spot Award", "Gift", "Voucher", "Cash", "Time Off", "Recognition" |
| Visibility | Text | Leave as Text |
| Year | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Recognition Title | `text` | `VARCHAR(255)` | `string` | Text | `Won the Northwind pitch` |
| 2 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Team` |
| 3 | Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 4 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 5 | Given By | `text` | `VARCHAR(255)` | `string` | Text | `Karan Malhotra` |
| 6 | Message | `text` | `VARCHAR(255)` | `string` | Text | `Your probation review is due on 28 Feb. Book a slot with your manager.` |
| 7 | Month | `text` | `VARCHAR(255)` | `string` | Text | `2026-03` |
| 8 | Notes | `long_text` | `TEXT` | `string` | Text | `February awards sent; two nominations were duplicates of the same contribution.` |
| 9 | Points Awarded | `number` | `NUMERIC` | `number` | Number | `50` |
| 10 | Rec-Rwd ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 11 | Recognised Employee | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 12 | Reward Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Spot Award` |
| 13 | Visibility | `text` | `VARCHAR(255)` | `string` | Text | `Company-wide` |
| 14 | Year | `text` | `VARCHAR(255)` | `string` | Text | `2026` |

## Select Options

**Category**

```
Team | Individual | Department | Company | Values
```
**Reward Type**

```
Spot Award | Gift | Voucher | Cash | Time Off | Recognition
```

## Relations

Link fields: none

## Examples

**Prompt**

```
Good work gets noticed but never written down.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Spot or monthly?
> **A:** Spot.
>
> **Q:** Who gives it?
> **A:** Anyone.
>
> **Q:** Public?
> **A:** Yes.

**Recommended next step** - offered, not built:

> Capture recognition as it happens, with a category so you can see what is being valued over time.
>
> Workflow: Recognition given → Category → Wall or summary → Monthly review
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
- Does not deliver rewards or pay anything.
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
I want to set up celebrating excellence for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

