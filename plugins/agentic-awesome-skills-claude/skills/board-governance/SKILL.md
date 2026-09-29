---
name: board-governance
description: 'Board and governance register: meeting date, agenda, decision, resolution number, vote result, action owner and due date. Use for board packs and action tracking.'
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

# Board & Governance

**What it is:** Board meetings, resolutions, action items and risk register.

## Overview

Works out the smallest useful **Board & Governance** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 7: Protect. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- board meeting tracker
- governance log
- board resolutions register
- risk register for board

Also use it when the user says "board meetings, resolutions, action items and risk register", or describes the same process happening in a
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

> **Q:** How often does the board meet?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Body** - Board, investors or both? / How many members? / Any committees?
- **Cadence** - How often? / Papers in advance? / Any formal minutes?
- **Decisions** - What gets recorded? / Actions assigned? / Followed up?
- **Current process** - How is it managed now? / Documents or memory? / Where stored?
- **Outcome** - What do you need? / A meeting record, an action log or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: board-governance
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Body": null
  "Cadence": null
  "Decisions": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Keep meetings, papers and decisions as separate records joined by the meeting, and track actions to a due date and an owner.

**Why this one:** Governance records fail on lost actions rather than missing minutes. The action log is what the board actually needs.

**Workflow:** Meeting scheduled → Papers circulated → Meeting held → Minutes recorded → Actions tracked

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
Board Item,Item Type,Meeting Date,Agenda,Presented By,Decision,Resolution Number,Vote Result,Action Owner,Due Date,Risk Level,Linked Report,Documents,Confidential,Status,Board Item ID
Approve FY27 budget,Resolution,2026-01-15,1. Q1 budget 2. Audit scope 3. Hiring freeze,Example Presenter,Approved,BR-EXAMPLE-001,Unanimous,Example Owner,2026-01-15,Low,RPT-EXAMPLE-001,"Board pack, FY27 budget",Internal,Actioned,
```

```sql
CREATE TABLE board_governance (
  board_item VARCHAR(255),
  item_type VARCHAR(100) NOT NULL,
  meeting_date DATE NOT NULL,
  agenda VARCHAR(255),
  presented_by VARCHAR(255),
  decision VARCHAR(255),
  resolution_number VARCHAR(255),
  vote_result VARCHAR(255),
  action_owner VARCHAR(255),
  due_date DATE NOT NULL,
  risk_level VARCHAR(100) NOT NULL,
  linked_report VARCHAR(255),  -- relation -> target record
  documents VARCHAR(255),
  confidential VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  board_item_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_board_governance_status ON board_governance (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Board & Governance",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Board Item": { "type": "string" },
      "Item Type": { "type": "string" },
      "Meeting Date": { "type": "string", "format": "date" },
      "Agenda": { "type": "string" },
      "Presented By": { "type": "string" },
      "Decision": { "type": "string" },
      "Resolution Number": { "type": "string" },
      "Vote Result": { "type": "string" },
      "Action Owner": { "type": "string" },
      "Due Date": { "type": "string", "format": "date" },
      "Risk Level": { "type": "string" },
      "Linked Report": { "type": "string" },
      "Documents": { "type": "string" },
      "Confidential": { "type": "string" },
      "Status": { "type": "string" },
      "Board Item ID": { "type": "integer" }
  },
  "required": [
      "Item Type",
      "Meeting Date",
      "Due Date",
      "Risk Level",
      "Confidential",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Board Item | Title | Use as the database title |
| Item Type | Select (add options after import) | Convert to Select, add options: "Resolution", "Action Item", "Risk", "Agenda", "Minutes", "Update" |
| Meeting Date | Date | Convert to Date |
| Agenda | Text | Leave as Text |
| Presented By | Text | Leave as Text |
| Decision | Text | Leave as Text |
| Resolution Number | Text | Leave as Text |
| Vote Result | Text | Leave as Text |
| Action Owner | Text | Leave as Text |
| Due Date | Date | Convert to Date |
| Risk Level | Select (add options after import) | Convert to Select, add options: "Low", "Medium", "High", "Critical" |
| Linked Report | Relation (link to the target database) | Convert to Relation, link to the target database |
| Documents | Text | Leave as Text |
| Confidential | Select (add options after import) | Convert to Select, add options: "Public", "Internal", "Restricted", "Highly Restricted" |
| Status | Select (add options after import) | Convert to Select, add options: "Proposed", "Discussed", "Approved", "Actioned", "Closed" |
| Board Item ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Board Item | `text` | `VARCHAR(255)` | `string` | Text | `Approve FY27 budget` |
| 2 | Item Type | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Resolution` |
| 3 | Meeting Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 4 | Agenda | `text` | `VARCHAR(255)` | `string` | Text | `1. Q1 budget 2. Audit scope 3. Hiring freeze` |
| 5 | Presented By | `text` | `VARCHAR(255)` | `string` | Text | `Example Presenter` |
| 6 | Decision | `text` | `VARCHAR(255)` | `string` | Text | `Approved` |
| 7 | Resolution Number | `text` | `VARCHAR(255)` | `string` | Text | `BR-EXAMPLE-001` |
| 8 | Vote Result | `text` | `VARCHAR(255)` | `string` | Text | `Unanimous` |
| 9 | Action Owner | `text` | `VARCHAR(255)` | `string` | Text | `Example Owner` |
| 10 | Due Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 11 | Risk Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Low` |
| 12 | Linked Report | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `RPT-EXAMPLE-001` |
| 13 | Documents | `text` | `VARCHAR(255)` | `string` | Text | `Board pack, FY27 budget` |
| 14 | Confidential | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Internal` |
| 15 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Actioned` |
| 16 | Board Item ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Item Type**

```
Resolution | Action Item | Risk | Agenda | Minutes | Update
```
**Risk Level**

```
Low | Medium | High | Critical
```
**Confidential**

```
Public | Internal | Restricted | Highly Restricted
```
**Status**

```
Proposed | Discussed | Approved | Actioned | Closed
```

## Relations

Link fields: `Linked Report`

## Examples

**Prompt**

```
Board actions from last year were never followed up.
```

**Context first** - one question per message, nothing already answered:

> **Q:** How often?
> **A:** Quarterly.
>
> **Q:** Any committees?
> **A:** One audit committee.
>
> **Q:** How are minutes handled?
> **A:** Typed up afterwards, filed on a drive.

**Recommended next step** - offered, not built:

> Keep meetings, papers and decisions as separate records joined by the meeting, and track actions to a due date and an owner.
>
> Workflow: Meeting scheduled → Papers circulated → Meeting held → Minutes recorded → Actions tracked
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
- Does not provide legal or governance advice, and cannot replace company secretarial duties.
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


## Board Governance Decision Rules

Keep agenda items, resolutions, votes, conflicts, and follow-up actions as separate records or fields. A quorum result is a fact about the meeting, while a recommendation is an opinion; never infer approval from attendance or from a majority that was not explicitly recorded. Capture the motion wording, proposer, seconder when applicable, voting method, abstentions, recusals, result, and effective date exactly as confirmed.

When preparing a board pack, label draft, circulated, approved, and superseded versions. Link every action to the resolution that created it, assign one accountable owner, and leave due dates empty when the board did not set them. Do not expose confidential papers to a wider audience merely because they appear in the same meeting folder.


## Board Pack Controls

Use a pack index with document title, owner, version, confidentiality, circulation date, and approval state. Distinguish an information paper, a decision paper, a resolution draft, and a post-meeting action log. For each decision paper, capture the decision requested, options considered, material assumptions, conflicts declared, and the exact resolution adopted.

Minutes should record who chaired, who attended, quorum, apologies, declarations, motions, vote counts, recusals, and close time. If a correction is made after circulation, issue a new version and retain the prior version as superseded evidence. Never overwrite an approved minute with a draft.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up board meetings, resolutions, action items and risk register for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

