---
name: knowledge-base
description: 'Knowledge base register: article title, category, department, owner, tags, summary, linked SOP, audience, last and next review dates and status. Use for documentation management.'
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

# Knowledge Base

**What it is:** Searchable repository.

## Overview

Works out the smallest useful **Knowledge Base** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 5: Develop. Fits: Scale stage. Table code: n/a.

## When to Use This Skill

- knowledge base
- company wiki articles
- help center database
- internal documentation index

Also use it when the user says "searchable repository", or describes the same process happening in a
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

> **Q:** What is hardest to find today?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Content** - What documents? / How many? / Who writes them?
- **Findability** - How do people search now? / Tags or folders? / Internal only?
- **Ownership** - Who reviews? / Review cycle? / Outdated content removed?
- **Current process** - Where does content live now? / Drive, Notion or wiki? / What is missing?
- **Outcome** - What do you need? / An index, a structure or authoring rules?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: knowledge-base
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Content": null
  "Findability": null
  "Ownership": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Start with an index of what exists and who owns it, then fix findability. Writing missing content comes after.

**Why this one:** Knowledge bases die from unclear ownership, not from missing articles. A named owner and a review date per page is the minimum.

**Workflow:** Content capture → Owner → Tag and structure → Search → Review cycle

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
Article Title,Category,Department,Owner,Tags,Summary,Linked SOP,Audience,Last Reviewed,Next Review,Status,Article ID
How we raise an invoice,Process,Delivery,Sneha Iyer,"process, finance","How we raise an invoice, reviewed in January.",SOP-ONB-001,All employees,2026-01-15,2026-01-15,Published,
```

```sql
CREATE TABLE knowledge_base (
  article_title VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  department VARCHAR(255),
  owner VARCHAR(255),
  tags VARCHAR(255),
  summary TEXT,
  linked_sop VARCHAR(255),  -- relation -> target record
  audience VARCHAR(255),
  last_reviewed DATE NOT NULL,
  next_review DATE NOT NULL,
  status VARCHAR(100) NOT NULL,
  article_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_knowledge_base_status ON knowledge_base (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Knowledge Base",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Article Title": { "type": "string" },
      "Category": { "type": "string" },
      "Department": { "type": "string" },
      "Owner": { "type": "string" },
      "Tags": { "type": "string" },
      "Summary": { "type": "string" },
      "Linked SOP": { "type": "string" },
      "Audience": { "type": "string" },
      "Last Reviewed": { "type": "string", "format": "date" },
      "Next Review": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Article ID": { "type": "integer" }
  },
  "required": [
      "Category",
      "Last Reviewed",
      "Next Review",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Article Title | Title | Use as the database title |
| Category | Select (add options after import) | Convert to Select, add options: "Process", "How To", "Policy", "Template", "Reference", "FAQ" |
| Department | Text | Leave as Text |
| Owner | Text | Leave as Text |
| Tags | Text | Leave as Text |
| Summary | Text | Leave as Text |
| Linked SOP | Relation (link to the target database) | Convert to Relation, link to the target database |
| Audience | Text | Leave as Text |
| Last Reviewed | Date | Convert to Date |
| Next Review | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Draft", "In Review", "Published", "Archived" |
| Article ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Article Title | `text` | `VARCHAR(255)` | `string` | Text | `How we raise an invoice` |
| 2 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Process` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Owner | `text` | `VARCHAR(255)` | `string` | Text | `Sneha Iyer` |
| 5 | Tags | `text` | `VARCHAR(255)` | `string` | Text | `process, finance` |
| 6 | Summary | `long_text` | `TEXT` | `string` | Text | `How we raise an invoice, reviewed in January.` |
| 7 | Linked SOP | `relation` | `VARCHAR(255)` | `string` | Relation (link to the target database) | `SOP-ONB-001` |
| 8 | Audience | `text` | `VARCHAR(255)` | `string` | Text | `All employees` |
| 9 | Last Reviewed | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 10 | Next Review | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 11 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Published` |
| 12 | Article ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Category**

```
Process | How To | Policy | Template | Reference | FAQ
```
**Status**

```
Draft | In Review | Published | Archived
```

## Relations

Link fields: `Linked SOP`

## Examples

**Prompt**

```
Nobody can find our client onboarding documents.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Where do they live now?
> **A:** A shared drive.
>
> **Q:** Who owns them?
> **A:** Unclear.
>
> **Q:** How many?
> **A:** Maybe 40.

**Recommended next step** - offered, not built:

> Start with an index of what exists and who owns it, then fix findability. Writing missing content comes after.
>
> Workflow: Content capture → Owner → Tag and structure → Search → Review cycle
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
- Does not write the content or replace a full wiki platform.
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
I want to set up searchable repository for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

