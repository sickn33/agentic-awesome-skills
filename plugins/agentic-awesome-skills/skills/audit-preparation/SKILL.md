---
name: audit-preparation
description: 'Audit preparation register: required document, period covered, request and receipt dates, preparer and reviewer, auditor queries and adjustments. Use for assembling an audit file.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, accounting, audit, finance, database, csv, notion, sql, audit-file]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Audit Preparation

**What it is:** The audit file checklist, so nothing the auditor asks for has to be hunted for at year end.

## Overview

Works out the smallest useful **Audit Preparation** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Be clear about what this is. It assembles the file. It does not perform the audit, it
does not test anything, and it produces no opinion on the financial statements - only a
qualified auditor can do that, and only after doing work this skill has no part in. What
it does is make sure the ten sections of the audit file exist, that each document is
requested, received, tracked and filed in one place, and that every query and adjustment
raised along the way has a visible answer.

One rule that causes most of the trouble at year end: permanent documents and tax filings
need current originals, not copies of copies. A registration certificate that lapsed, a
licence that was never renewed, a return filed only as a screenshot of a portal - each one
turns into an avoidable exception. Current originals, verified and dated, or the document
is not there.

Layer: Layer 9: Audit. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- audit file checklist
- audit document request tracker
- audit query log
- year-end document collection
- audit handover register

Also use it when the user says "the audit file checklist, so nothing the auditor asks for has to be hunted for at year end", or describes the same process happening in a
spreadsheet, a document or someone inboxes.

Do not use it for: the audit itself, assurance on the financial statements, or legal advice. This skill produces
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

> **Q:** When did the auditor last ask you for something, and how long did it take to find?

### Step 2 - Ask only what is missing

Treat ambiguous replies as unanswered and ask which explicit option the user means. Record unknown values as `Unknown`; `Unknown` is not zero. A record must not be `Done` when a required check fails.

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Audit** - Internal, statutory or both? / Is an auditor appointed? / First audit or a repeat?
- **Period** - Which financial year? / Year end date? / Single entity or group?
- **File** - What exists today? / Where is it kept? / How is it handed over?
- **Requests** - Requests in writing? / Who tracks them? / How long do they take to close?
- **Outcome** - What do you need? / A checklist, a request tracker or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: audit-preparation
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Audit": null
  "Period": null
  "File": null
  "Requests": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** One audit file record per document, tagged to the section of the file it belongs to, carrying the request date, the received date, days pending and any query or adjustment, so the file is assembled continuously instead of hunted for in the last week of the year.

**Why this one:** The ten sections of the audit file are fixed from year to year, so a checklist is the whole job - the failure is never that nobody knows what an auditor wants, it is that nobody tracked whether it arrived. One record per document, with the section as a select, turns a folder into something a reviewer can navigate and something the business can hand over without a fortnight of searching.

**Workflow:** Section listed → Document identified → Request logged → Document prepared → Handover and receipt → Query or adjustment tracked → File closed

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

```csv
Audit Item,Section,Document Required,Reference/Location,Period Covered,Requested Date,Received Date,Days Pending,Prepared By,Reviewed By,Query Raised,Query Detail,Auditor Note,Adjustment Required,Adjustment Reference,Adjusted,Status,Notes,Audit File ID
Bank reconciliation statement,Banking & Financing,"Bank reconciliation statements for all accounts, for the period",Audit File 2026 / Section E,FY 2025-26,2026-08-05,2026-08-09,4,Example Preparer,Example Reviewer,No,None raised,No query this cycle,No,Not applicable,Not Required,Done,Filed with the reconciliation pack; no query raised.,
```

```sql
CREATE TABLE audit_preparation (
  audit_item VARCHAR(255),
  section VARCHAR(100) NOT NULL,
  document_required VARCHAR(255),
  reference_location VARCHAR(255),
  period_covered VARCHAR(255),
  requested_date DATE NOT NULL,
  received_date DATE,
  days_pending NUMERIC,
  prepared_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  query_raised VARCHAR(100) NOT NULL,
  query_detail TEXT,
  auditor_note TEXT,
  adjustment_required VARCHAR(100) NOT NULL,
  adjustment_reference VARCHAR(255),
  adjusted VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  audit_file_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_preparation_status ON audit_preparation (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Audit Preparation",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Audit Item": { "type": "string" },
      "Section": { "type": "string" },
      "Document Required": { "type": "string" },
      "Reference/Location": { "type": "string" },
      "Period Covered": { "type": "string" },
      "Requested Date": { "type": "string", "format": "date" },
      "Received Date": { "type": "string", "format": "date" },
      "Days Pending": { "type": "number" },
      "Prepared By": { "type": "string" },
      "Reviewed By": { "type": "string" },
      "Query Raised": { "type": "string" },
      "Query Detail": { "type": "string" },
      "Auditor Note": { "type": "string" },
      "Adjustment Required": { "type": "string" },
      "Adjustment Reference": { "type": "string" },
      "Adjusted": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Audit File ID": { "type": "integer" }
  },
  "required": [
      "Section",
      "Requested Date",
      "Query Raised",
      "Adjustment Required",
      "Adjusted",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Audit Item | Title | Use as the database title |
| Section | Select (add options after import) | Convert to Select, add options: "Financial Information", "Permanent Company Documents", "Revenue & Receivable Documents", "Purchase & Payable Documents", "Banking & Financing", "Payroll", "Fixed Assets", "Tax & Statutory Documents", "Other Supporting Documents", "Audit Working Papers" |
| Document Required | Text | Leave as Text |
| Reference/Location | Text | Leave as Text |
| Period Covered | Text | Leave as Text |
| Requested Date | Date | Convert to Date |
| Received Date | Date | Convert to Date |
| Days Pending | Number | Convert to Number |
| Prepared By | Text | Leave as Text |
| Reviewed By | Text | Leave as Text |
| Query Raised | Select (add options after import) | Convert to Select, add options: "Yes", "No" |
| Query Detail | Text | Leave as Text |
| Auditor Note | Text | Leave as Text |
| Adjustment Required | Select (add options after import) | Convert to Select, add options: "Yes", "No" |
| Adjustment Reference | Text | Leave as Text |
| Adjusted | Select (add options after import) | Convert to Select, add options: "Yes", "No", "Not Required" |
| Status | Select (add options after import) | Convert to Select, add options: "Not started", "In progress", "Blocked", "Done", "Cancelled" |
| Notes | Text | Leave as Text |
| Audit File ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Audit Item | `text` | `VARCHAR(255)` | `string` | Text | `Bank reconciliation statement` |
| 2 | Section | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Banking & Financing` |
| 3 | Document Required | `text` | `VARCHAR(255)` | `string` | Text | `Bank reconciliation statements for all accounts, for the period` |
| 4 | Reference/Location | `text` | `VARCHAR(255)` | `string` | Text | `Audit File 2026 / Section E` |
| 5 | Period Covered | `text` | `VARCHAR(255)` | `string` | Text | `FY 2025-26` |
| 6 | Requested Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-05` |
| 7 | Received Date | `date` | `DATE` | `string, format: date` | Date | `2026-08-09` |
| 8 | Days Pending | `number` | `NUMERIC` | `number` | Number | `4` |
| 9 | Prepared By | `text` | `VARCHAR(255)` | `string` | Text | `Example Preparer` |
| 10 | Reviewed By | `text` | `VARCHAR(255)` | `string` | Text | `Example Reviewer` |
| 11 | Query Raised | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `No` |
| 12 | Query Detail | `long_text` | `TEXT` | `string` | Text | `None raised` |
| 13 | Auditor Note | `long_text` | `TEXT` | `string` | Text | `No query this cycle` |
| 14 | Adjustment Required | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `No` |
| 15 | Adjustment Reference | `text` | `VARCHAR(255)` | `string` | Text | `Not applicable` |
| 16 | Adjusted | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Not Required` |
| 17 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Done` |
| 18 | Notes | `long_text` | `TEXT` | `string` | Text | `Filed with the reconciliation pack; no query raised.` |
| 19 | Audit File ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Section**

```
Financial Information | Permanent Company Documents | Revenue & Receivable Documents | Purchase & Payable Documents | Banking & Financing | Payroll | Fixed Assets | Tax & Statutory Documents | Other Supporting Documents | Audit Working Papers
```
**Query Raised**

```
Yes | No
```
**Adjustment Required**

```
Yes | No
```
**Adjusted**

```
Yes | No | Not Required
```
**Status**

```
Not started | In progress | Blocked | Done | Cancelled
```

## Relations

Link fields: none

## Examples

**Prompt**

```
The auditor asked for twelve documents in one email and we found seven of them.
```

**Context first** - one question per message, nothing already answered:

> **Q:** What sort of audit is it?
> **A:** Statutory, by a firm in the city. Our first one, actually - we registered in March.
>
> **Q:** What exists today?
> **A:** Bank statements and invoices. The registration papers are in a folder somewhere.
>
> **Q:** Who tracks requests when they come in?
> **A:** Nobody. They come to me and I forward them on to the accountant.

**Recommended next step** - offered, not built:

> One audit file record per document, tagged to the section of the file it belongs to, carrying the request date, the received date, days pending and any query or adjustment, so the file is assembled continuously instead of hunted for in the last week of the year.
>
> Workflow: Section listed → Document identified → Request logged → Document prepared → Handover and receipt → Query or adjustment tracked → File closed
>
> Want the CSV, SQL, JSON Schema and Notion mapping for this?

## Best Practices

- Build when requested; recommend and offer a build for advice-only requests.
- One question per message. A batched intake reads as a form and gets guessed at.
- Keep display names identical across CSV and JSON; document normalized SQL identifiers.
- Use `relation` for anything that points at another table, `text` only for free text.
- Money fields are `currency`, never `text`. Dates are `date`, never free text.
- If the user requests an example row, keep it obviously fake so nobody imports it as real data.
- Build the file across the year, not in the last week. Every record created after the
  request date was already late.
- Hold current originals for permanent documents and tax filings - a registration
  certificate, a licence, a filed return with its acknowledgement. A copy of a copy is
  not a document, and "we could probably get it" is not an audit trail.
- Record the query and the answer on the same row as the document. A query answered
  somewhere else is a query that gets raised again next year.
- Use `Not Required` on `Adjusted` where no adjustment was needed, and leave it blank
  nowhere - the difference between "no adjustment needed" and "not looked at" matters.

## Limitations

- Empty template only. It does not perform the audit, test balances, sample transactions,
  verify existence or assess internal control.
- It does not give assurance on the financial statements and expresses no opinion on
  them. Only a qualified auditor, appointed and working independently, can do that. This
  record says a document was received; it says nothing about whether the document supports
  the numbers.
- The ten sections are a checklist of what is usually asked for, not a guarantee. An
  auditor may ask for more, and a first audit usually does.
- It does not chase the auditor, negotiate scope or manage the engagement.
- A row marked `Done` means the document was handed over. It does not mean the document
  was correct, current or accepted.
- It does not verify originals against an issuing authority. Someone has to check that
  the registration is live and the filing was actually made.
- Notion relations need both databases imported before the link column resolves.
- Select options are a starting set. Rename them to match how the business talks.
- No automation, reminders or sync. Those need the integration layer.
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
- An audit file is the most sensitive document set a business holds: bank statements,
  salary registers, registration papers, tax filings. Keep the file access-limited to
  those who need it, keep originals in a secure place, and do not paste live account
  numbers, PAN numbers or employee details into a shared chat.
- Never enter an auditor's personal details, signature or registration as example data.
  Use placeholders.

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
- **Problem:** file assembled the week the auditor arrives, half of it missing.
  **Solution:** build the section list at the start of the year and open a record per
  document then, not when the request lands.
- **Problem:** a permanent document filed as a photocopy of a photocopy of a scan.
  **Solution:** get the current original, check the registration or licence is live, and
  record where the original is held.
- **Problem:** a query was answered but the record still reads `No`.
  **Solution:** close the loop on the same row - query, answer, and the adjustment
  reference if one followed.

## Related Skills

- @accounting-audit-system-builder - routes to this skill and the other accounting modules.
- @source-document-filing - where the documents collected here are stored day to day.
- @party-ledger-reconciliation - the reconciliations that form the working papers.
- @inventory-stock-reconciliation - the stock working papers the auditor will ask for.
- @monthly-closing-statements - the statements and the trial balance in section A.
- @day-book - the cash book and day book in section A.
- @salary-wage-accounting - the payroll records behind section F.
- @tds-booking-payment - the withholding returns and vouchers behind section H.
- @expense-accounting - the expense detail supporting the profit and loss account.
- @receipt-accounting - the receipt trail behind the cash book.
- @payment-accounting - the payment trail behind the cash book.
- @credit-cycle-analysis - the receivables and payables analysis the auditor reads.

## Reusable Prompt

```
I want to set up the audit file checklist, so nothing the auditor asks for has to be hunted for at year end, for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema and a Notion property mapping. Data only.
```
