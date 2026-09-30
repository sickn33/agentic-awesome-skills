---
name: gamification-engine
description: 'Gamification points register: player and department, points balance and points earned this month, level, badges, source module and last-updated date. Use for points and badge tracking.'
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

# Gamification Engine

**What it is:** Engagement.

## Overview

Works out the smallest useful **Gamification Engine** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- employee gamification
- points and badges
- engagement points system
- reward points tracker

Also use it when the user says "engagement", or describes the same process happening in a
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

> **Q:** What behaviour are you trying to change?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Behaviour** - What should increase? / Who takes part? / All staff or a team?
- **Mechanic** - Points, badges or leaderboard? / Monthly reset? / Public or private?
- **Rules** - Point values? / What is excluded? / Who can award?
- **Current process** - Anything in place now? / Tool or manual? / Does it get ignored?
- **Outcome** - What do you need? / Points, a leaderboard or reporting?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: gamification-engine
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Behaviour": null
  "Mechanic": null
  "Rules": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Use points for the behaviour you want and nothing else. A leaderboard only works if most people can appear on it.

**Why this one:** Gamification fails when the points do not connect to something people care about. Start with one behaviour and a monthly reset.

**Workflow:** Behaviour → Award points → Balance → Leaderboard or summary → Review

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
Player,Employee Name,Department,Points Balance,Points This Month,Level,Badges,Source Module,Last Updated,Notes,Player ID
Aarav Sharma,Aarav Sharma,Delivery,340,120,L1,First responder,Invoices & Billing,2026-01-15,"Points rules changed in February, so the leaderboard reset and nobody has hit a badge yet.",
```

```sql
CREATE TABLE gamification_engine (
  player VARCHAR(255),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  points_balance NUMERIC NOT NULL,
  points_this_month NUMERIC NOT NULL,
  level VARCHAR(100) NOT NULL,
  badges VARCHAR(255),
  source_module VARCHAR(255),
  last_updated DATE NOT NULL,
  notes TEXT,
  player_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Gamification Engine",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Player": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Points Balance": { "type": "number" },
      "Points This Month": { "type": "number" },
      "Level": { "type": "string" },
      "Badges": { "type": "string" },
      "Source Module": { "type": "string" },
      "Last Updated": { "type": "string", "format": "date" },
      "Notes": { "type": "string" },
      "Player ID": { "type": "integer" }
  },
  "required": [
      "Points Balance",
      "Points This Month",
      "Level",
      "Last Updated"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Player | Title | Use as the database title |
| Employee Name | Text | Leave as Text |
| Department | Text | Leave as Text |
| Points Balance | Number | Convert to Number |
| Points This Month | Number | Convert to Number |
| Level | Select (add options after import) | Convert to Select, add options: "L1", "L2", "L3", "L4", "L5", "M1", "M2" |
| Badges | Text | Leave as Text |
| Source Module | Text | Leave as Text |
| Last Updated | Date | Convert to Date |
| Notes | Text | Leave as Text |
| Player ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Player | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Aarav Sharma` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Points Balance | `number` | `NUMERIC` | `number` | Number | `340` |
| 5 | Points This Month | `number` | `NUMERIC` | `number` | Number | `120` |
| 6 | Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `L1` |
| 7 | Badges | `text` | `VARCHAR(255)` | `string` | Text | `First responder` |
| 8 | Source Module | `text` | `VARCHAR(255)` | `string` | Text | `Invoices & Billing` |
| 9 | Last Updated | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 10 | Notes | `long_text` | `TEXT` | `string` | Text | `Points rules changed in February, so the leaderboard reset and nobody has hit a badge yet.` |
| 11 | Player ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Level**

```
L1 | L2 | L3 | L4 | L5 | M1 | M2
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We want more people to share knowledge internally.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How many people?
> **A:** Around 30.
>
> **Q:** Points or badges?
> **A:** Points.
>
> **Q:** Leaderboard?
> **A:** No, too small a team.

**Recommended next step** - offered, not built:

> Use points for the behaviour you want and nothing else. A leaderboard only works if most people can appear on it.
>
> Workflow: Behaviour → Award points → Balance → Leaderboard or summary → Review
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
- Does not run recognition programmes or deliver rewards.
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
I want to set up engagement for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

