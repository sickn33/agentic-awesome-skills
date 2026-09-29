---
name: 360-feedback-system
description: '360 feedback register: reviewer, subject, review cycle, visibility, due date and score, as CSV, SQL, JSON Schema or Notion on request. Use for 360 reviews or peer feedback cycles.'
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
- manage
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# 360° Feedback System

**What it is:** Records one feedback response per row, with the field list built only from what the user confirms.

## Overview

Works out the smallest useful 360° feedback setup for the business in front of it, then builds
it only when asked. The default output is a short recommendation, not a spreadsheet. CSV, SQL
DDL, JSON Schema and the Notion mapping are derived from the one Field Reference below, so they
cannot drift apart.

Three conceptual models are kept separate, because merging them is what forces fields to be
invented:

- **Response** - one row per feedback response. The only model with a table in this skill.
- **Scoring Configuration** - scale, weights, missing and not-applicable handling, rounding.
  Configuration, never a column on the response row.
- **Questions** - the question set and its version, held only when questions change between
  cycles. A question ID is a column on Response only once that requirement is confirmed.

Artifacts are empty templates by default. The single illustrative row is a shape placeholder
carrying `Example` / `-EXAMPLE-` values, never business data.

Layer: Layer 4: Manage. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- 360 feedback
- feedback system
- peer review tool
- 360 degree feedback tracker

Also use it when the user says "holistic feedback", or describes the same process happening in a
spreadsheet, a document or someone's inbox.

Not for payroll, tax, legal, or employment-decision work. This skill does not automate those.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

The rules below stand on their own. If the shared execution contract at
`../../references/execution-contract.md` is unavailable, follow this file directly; a missing
reference never blocks basic execution.

### Step 1 - Identify intent

Read the request and pick one intent before asking anything. This is the canonical set, used
here and in the context block with the same spelling:

| Intent | Trigger | Go to |
|---|---|---|
| `advice` | "how do I ...", "what should we" | Answer, offer the build only if it helps |
| `review` | "is this right", "review", "audit" | Check what they share |
| `build` | "set up", "build", "create" | Step 2 |
| `convert` | "move it from our sheet/forms" | Capture their process, then Step 2 |
| `export` | "give me the CSV / SQL / JSON / Notion" for confirmed rules | Step 5 |

One message, one question, no batching. Never ask a question whose answer would not change the
recommendation or the requested artifact.

### Scope boundary

Decline only the specific high-risk action that is out of scope, and continue with the rest of
the request. Example: for a request that mixes feedback capture with payroll, decline the payroll
calculation and proceed with the feedback setup.

### Step 2 - Ask only what is missing

Skip anything already answered in any earlier message. Ask the rest one at a time, and stop as
soon as the remaining answers would not change the output.

Decide fields from the answers, not from habit. The only fields that need no confirmation are the
ones in the minimum core below. Each optional field needs a confirmed requirement behind it:

| Candidate field | Only add when the user confirms |
|---|---|
| `Score` | A scoring mode on a defined scale |
| Additional score fields | Named competency areas, one per confirmed area |
| `Due Date` | Deadlines are part of their process |
| `Reviewer` | Responses are identified or confidential, not anonymous |
| `Review Cycle` | Feedback runs in more than one cycle |
| `Submitted Date` | Submission is timestamped in their process |
| `Question ID` | The question set changes between cycles |
| `Feedback Subject` | A subject is recorded at all |

`Feedback Subject` stays a generic label. The subject may be a person, a project, a customer or
a team, so take the type from the user rather than assuming an employee.

Never invent an answer. Record it as unknown and carry on. `Unknown` is a real value meaning not
yet supplied. Never turn Unknown into zero, and never turn a blank into a zero. Never re-ask an
unknown already recorded.

Answers like `yes`, `no`, `maybe`, `same`, `okay` or `fine` are not an answer to a
multiple-choice question. Re-ask as an explicit choice:

> **Q:** Which do you mean: **identified** or **anonymous** feedback?
>
> **A:** maybe

Keep only the answered part of a partial answer, and leave the rest `Unknown`.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal, is not shown unless asked, and never carries a
value the user did not give.

```yaml
module: 360-feedback-system
intent: null            # advice | review | build | convert | export
scale: null             # only when the answer changes the recommendation
areas:
  "Subject": null
  "Relationships": null
  "Visibility": null
  "Scoring": null
  "Follow-up": null
requested_outputs: []   # csv | sql | json | notion | xlsx - only what was explicitly asked
confirmed_facts: []     # only what the user actually said
unknowns: []            # asked and not answered
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Give the smallest recommendation: one approach sentence, one workflow line, and only the
unresolved facts that matter. Generate the approach and the workflow from confirmed context. Do
not carry a canned approach, a canned rationale, or a fixed step list across requests.

Build the workflow line from the collection, review and follow-up process the user described. If
they described none, say the workflow is `Unknown` and ask. Do not assume a review role, an
automated analysis step, or a specific tool.

Do not enumerate fields, statuses or schema mappings unless the user asks for a schema or
artifact. Follow-up and completion are process steps, not fields in this module.

When scoring is mentioned but its policy is incomplete, label each missing input explicitly:
`Scale: Unknown`, `Included scores: Unknown`, `Weights: Unknown`,
`Missing-score behavior: Unknown`, `Not-applicable handling: Unknown`, `Rounding: Unknown`. Do not
compute an overall figure until all six are resolved.

Do not build unprompted. End with an offer naming the artifacts not yet requested.

### Step 5 - Build only on request

Once asked, derive the fields from the confirmed context and emit only the requested artifacts.
When more than one is requested, generate every one of them from the same Field Reference, in one
pass, so they cannot disagree.

**A selected Notion output is rendered by `notion-manual-import`, so route the
Notion step there.** When the user selects Notion, hand that step to
@notion-manual-import: it holds the CSV, the property
mapping, the import steps and the verification checklist, and it renders the Field
Reference below instead of defining a table of its own. Do not restate the mapping
here and do not improvise the import steps. Manual CSV and mapping outputs need no
connection. For requested workspace changes, follow the shared contract: verify actual
tool access and the target before writing. A user saying "connected" is not tool evidence.
Never ask for a Notion password or token.

Validate before replying, then check cross-format consistency: same field names, same spelling,
same order, same required set in all artifacts.

Reply with the artifact or link, plus a short note only when there is an error, a limitation, or
an unresolved unknown to surface. Do not append column counts, validation claims or closing text
to an otherwise clean artifact request.

If artifact generation or validation fails, return the error in one line naming the field or
format that failed, emit the artifacts that did succeed, and say which one is missing. Never
substitute a plausible value to make a build pass.

The examples below show a documented shape. They are not this business's schema.

**CSV.** UTF-8 with a byte order mark so Excel opens the text correctly. A CSV is not an
`.xlsx` workbook; create one only when the user asks. A CSV carries no types, so when import
guidance is requested, name the columns needing a number, date or currency format applied.

```csv
Feedback ID,Feedback Type,Feedback Subject,Reviewer,Visibility Mode,Review Cycle,Submitted Date,Status,Due Date,Score,Comments
,Peer,Example Subject 01,Example Reviewer,Identified,Example Cycle 2026-Q1,2026-01-15,Collecting,2026-01-22,4,Example comment recorded to show free text.
```

**SQL.** Portable types. The engine is not known, so `SERIAL PRIMARY KEY` is shown as the
PostgreSQL form; on an unconfirmed engine use a portable `feedback_id <int type> PRIMARY KEY` and
state the engine in one line. No `CHECK` is emitted against a Select column here, because the
option list is not yet a confirmed taxonomy. Once the user confirms options for a Select field,
generate the constraint from that confirmed set:

```text
ALTER TABLE feedback_cycle_responses ADD CONSTRAINT chk_feedback_type CHECK (feedback_type IN (<confirmed options>));
```

```sql
CREATE TABLE feedback_cycle_responses (
  feedback_id SERIAL PRIMARY KEY,
  feedback_type VARCHAR(100) NOT NULL,
  feedback_subject VARCHAR(255),
  reviewer VARCHAR(255),
  visibility_mode VARCHAR(100) NOT NULL,
  review_cycle VARCHAR(255),
  submitted_date DATE,
  status VARCHAR(100) NOT NULL,
  due_date DATE,
  score NUMERIC,
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_cycle_responses_status ON feedback_cycle_responses (status);
```

**JSON Schema.** `required` is derived from business necessity, not from what data happens to
exist. The three required fields are the ones without which a response cannot be interpreted.
`Reviewer` and `Due Date` are absent from `required` because a legitimate response may omit them.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "360 Feedback Response",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Feedback ID": { "type": "integer" },
      "Feedback Type": { "type": "string" },
      "Feedback Subject": { "type": "string" },
      "Reviewer": { "type": "string" },
      "Visibility Mode": { "type": "string" },
      "Review Cycle": { "type": "string" },
      "Submitted Date": { "type": "string", "format": "date" },
      "Status": { "type": "string" },
      "Due Date": { "type": "string", "format": "date" },
      "Score": { "type": "number" },
      "Comments": { "type": "string" }
  },
  "required": [
      "Feedback Type",
      "Visibility Mode",
      "Status"
  ]
}
```

**Notion.** A mapping table, not a build. Convert properties after import.

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Feedback ID | Title | Use as the database title |
| Feedback Type | Select (add options after import) | Convert to Select, add options: "Self", "Peer", "Manager", "Direct Report", "Cross Functional" |
| Feedback Subject | Text | Leave as Text |
| Reviewer | Text | Leave as Text |
| Visibility Mode | Select (add options after import) | Convert to Select, add options: "Identified", "Confidential", "Anonymous" |
| Review Cycle | Text | Leave as Text |
| Submitted Date | Date | Convert to Date |
| Status | Select (add options after import) | Convert to Select, add options: "Not Launched", "Collecting", "Consolidated", "Shared", "Closed" |
| Due Date | Date | Convert to Date |
| Score | Number | Convert to Number |
| Comments | Text | Leave as Text |
```

Notion's own auto-ID is platform-specific and does not replace the canonical `Feedback ID`. Use
one as the Notion primary column and the other as a business reference, and say which is which.

**Inline versus file.** Inline output returns the artifact in the message. File output returns the
link. Do not mix: never return a link when inline data was requested, or inline data when a file
was requested.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Feedback ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text | `(blank)` |
| 2 | Feedback Type | `select` | `VARCHAR(100) NOT NULL` | `string` | Select (add options after import) | `Peer` |
| 3 | Feedback Subject | `text` | `VARCHAR(255)` | `string` | Text | `Example Subject 01` |
| 4 | Reviewer | `text` | `VARCHAR(255)` | `string` | Text | `Example Reviewer` |
| 5 | Visibility Mode | `select` | `VARCHAR(100) NOT NULL` | `string` | Select (add options after import) | `Identified` |
| 6 | Review Cycle | `text` | `VARCHAR(255)` | `string` | Text | `Example Cycle 2026-Q1` |
| 7 | Submitted Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 8 | Status | `select` | `VARCHAR(100) NOT NULL` | `string` | Select (add options after import) | `Collecting` |
| 9 | Due Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-22` |
| 10 | Score | `number` | `NUMERIC` | `number` | Number | `4` |
| 11 | Comments | `long_text` | `TEXT` | `string` | Text | `Example comment recorded to show free text.` |

This table is the single source. CSV header, SQL columns, JSON Schema properties and the Notion
mapping are generated from it, never written by hand.

Three rules govern it:

- **Naming.** One human label plus a machine-safe key, defined once and reused everywhere. The
  key is the label lowercased with non-alphanumerics replaced by `_`.
- **Inclusion.** A field exists only when a confirmed requirement justifies it. This is why the
  list is short.
- **Deduplication.** Before emitting any artifact, collapse semantically equivalent fields. One
  identity, one field. A second identifier for the same record is a duplicate unless the user
  asked for a human-readable reference alongside the system key.

`created_at` and `updated_at` are the only artifact-only additions. They are technical metadata,
not business fields, and are labelled as such.

## Select Options

These lists are a documented shape, not a confirmed taxonomy. The Notion column always says
"add options after import". If the user supplied their own values, theirs win and these are
replaced. Never present them as the business's confirmed options.

**Feedback Type**

```
Self | Peer | Manager | Direct Report | Cross Functional
```

**Visibility Mode**

```
Identified | Confidential | Anonymous
```

**Status**

```
Not Launched | Collecting | Consolidated | Shared | Closed
```

The Status list is a minimal default lifecycle. Use it only when the user confirms a cycle with
those stages; otherwise derive the statuses from the process they described, or omit the field
when nothing needs tracking.

## Relations

No relation fields. `Feedback Subject` is text, not a relation, because the subject type is
whatever the user says it is and no target database is guaranteed to exist. If the user confirms
a subject directory in the same artifact set, model it as a relation then, and keep the target
`VARCHAR(255)` with a comment in SQL.

## Scoring Configuration

Not a table. It is configuration, stored outside the response row. Hold it only when the user
confirms scoring, and report each unset input as `Unknown` rather than assuming a default:

| Setting | Needed before any overall figure exists |
|---|---|
| Scale | The permitted values and their meaning |
| Included scores | Which fields are counted |
| Weights | Per-field weights, or explicit `equal` |
| Missing-score behavior | Exclude, or count as zero |
| Not-applicable handling | Distinct from missing: `N/A` is a deliberate answer |
| Rounding | Decimal places, and whether it rounds at the end only |

`Not Applicable` is a value the reviewer chose. Keep it distinct from a missing or unanswered
score; a missing score and a deliberate `N/A` must never collapse into the same result.

An overall figure is computed from these settings, never stored on the response row. Do not show
a worked example overall figure unless the formula, the inputs and the rounding are all shown
beside it and reconcile exactly.

## Examples

**Prompt**

```
We have 12 people and want managers and peers to give anonymous feedback.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What is the feedback for?
> **A:** Performance and team improvement.
>
> **Q:** How do you collect it today?
> **A:** Google Forms and Sheets.
>
> **Q:** Scores, comments or both?
> **A:** Both.
>
> **Q:** The scale and the weighting are not set yet. What values do reviewers pick from, and do
> the areas weigh equally?
> **A:** Five point scale, all equal.
>
> **Q:** What happens after collection closes?
> **A:** A manager reads the summary, then we discuss it.

**Recommended next step** - offered, not built. The workflow below is generated from the two
process facts supplied, not carried over from a template:

> Keep the existing collection tool and add an analysis layer, since collection already works.
> Scores only become useful once the scale is set, which it now is: five points, areas weighted
> equally.
>
> Workflow: Google Form to Sheet, manager reads the summary, team discussion
>
> Rounding is still `Unknown`. Tell me the decimal places and I can build the CSV, SQL DDL, JSON
> Schema and Notion mapping.

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Generate every artifact from the Field Reference, then confirm they agree.
- Ask which field each optional one replaces, and drop the rest.
- Keep an overall figure out of the response row.
- If the user asks for an example row, keep every value obviously fake so nobody imports it.

## Limitations

- Emits empty templates. It does not run collection, reminders, sync or scheduling.
- Does not compute payroll, tax, leave balances, tax treatment or employment decisions.
- Scoring is configuration, not automation: this skill does not calculate, aggregate or rank
  reviewers.
- Notion mapping assumes properties are converted after import.
- Select options are a shape. They do not become the business's taxonomy until confirmed.
- Does not replace HR or legal review, and makes no employment decision.

## Security & Safety Notes

- Never supply a real name, contact detail, identifier, amount or date as an example. Example
  values only, and identifiers use the `-EXAMPLE-` pattern.
- Artifacts are templates by default and carry no real person data. If the user pastes real
  feedback data, build the template and do not retain or reproduce unnecessary sensitive content
  from it.
- Where a user holds a stored copy of pasted data, suggest they remove sensitive information from
  their own records and settings where appropriate. Do not claim to have deleted anything.
- In `Anonymous` mode, leave `Reviewer` blank. Never infer or reconstruct identity.
- Warn that free-text comments can identify a reviewer through content, in any visibility mode.
- Suppress an aggregated result when the number of contributing responses is below a
  configurable minimum. Ask for that minimum; do not pick one silently.
- Human review is required before feedback affects any real person's employment, pay, promotion
  or performance record.

## Common Pitfalls

- **Problem:** a static mapping is described as a completed workspace build.
  **Solution:** deliver manual mappings without a connection; claim a live change only
  after the authorized tool operation succeeds.
- **Problem:** the response row ends up carrying configuration.
  **Solution:** weights, rounding and scale live in Scoring Configuration.
- **Problem:** a field appears because a similar module has it.
  **Solution:** no confirmed requirement, no field.
- **Problem:** a total-like value appears that nobody can reproduce.
  **Solution:** show the formula and the inputs, or show nothing.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping once, after import.

## Related Skills

Informational only. None is required for this skill to run, and a missing one never blocks
execution.

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - a possible subject source, if the user chooses to model one.
- @notification-reminder-hub - optional, if the user wants due dates turned into reminders.

## Reusable Prompt

```
I want to set up holistic feedback for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, derive every requested format from one field list, and give me the data or the link.
```
