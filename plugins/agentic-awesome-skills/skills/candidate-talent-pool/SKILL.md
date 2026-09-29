---
name: candidate-talent-pool
description: 'Candidate and prospect pool: contact details, experience, skills, consent status and date, referral source and last contact. Use for talent pipelines and re-engagement.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, acquire]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Candidate Talent Pool

**What it is:** Prospect database.

## Overview

Works out the smallest useful **Candidate Talent Pool** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 2: Acquire. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- talent pool database
- candidate tracker
- recruiter pipeline spreadsheet
- keep candidates warm

Also use it when the user says "prospect database", or describes the same process happening in a
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

> **Q:** Which roles do you hire for?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Roles** - Which roles? / How many open? / Any hard-to-fill roles?
- **Pipeline** - How do you find people now? / Referrals or inbound? / Keep rejects warm?
- **Pool** - How long to keep? / Contact allowed? / Consent to re-engage?
- **Current process** - Where do CVs sit now? / Spreadsheet or inbox? / How many in the pool?
- **Outcome** - What do you need? / A pool, a tracker or alerts?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: candidate-talent-pool
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Roles": null
  "Pipeline": null
  "Pool": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Keep a warm pool with consent and a re-engage date. It is a contact list with a purpose, not a resume archive.

**Why this one:** Rejected candidates are the cheapest hiring source you have, and the most commonly thrown away. Consent and a re-engage date are what make it reusable.

**Workflow:** Candidate added → Consent → Re-engage date → Reminder → Reopen role

**Re-engagement gate:** a candidate may carry a `Re-engage Date` only when `Consent Status` is `Granted`. If consent was never recorded, leave `Re-engage Date` empty, set `Consent Status` to `Not recorded`, and tell the user how many candidates are blocked on it. Do not infer consent from a role being open, from the candidate replying once, or from their CV being on file. `Declined` is final: never re-contact, and never quietly reset it to `Not recorded` to make a re-engagement list longer.

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
Candidate Name,Candidate ID,Department,Email,Experience (Years),Last Contact,LinkedIn URL,Notes,Phone,Consent Status,Consent Date,Re-engage Date,Referred By,Skills,Source,Status,Target Role
Example Person,,Delivery,person@example.com,6,2026-01-20,https://example.com/in/example-person,Went cold in February after a counter-offer; worth re-approaching in six months.,+91 98xxxxxx21,Granted,2026-01-05,2026-07-01,Example Referrer,"Python, SQL, Stakeholder Management",Referral,Active,Delivery Manager
```

```sql
CREATE TABLE candidate_talent_pool (
  candidate_name VARCHAR(255),
  candidate_id SERIAL PRIMARY KEY,
  department VARCHAR(255),
  email VARCHAR(255),
  experience_years NUMERIC NOT NULL,
  last_contact DATE NOT NULL,
  linkedin_url TEXT,
  notes TEXT,
  phone VARCHAR(255),
  consent_status VARCHAR(100) NOT NULL,
  consent_date DATE,
  re_engage_date DATE,
  referred_by VARCHAR(255),
  skills VARCHAR(255),
  source VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  target_role VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  -- Re-engage lists are only lawful for recorded consent.
  CHECK (consent_status IN ('Not recorded', 'Granted', 'Declined')),
  CHECK (consent_status = 'Granted' OR re_engage_date IS NULL)
);

CREATE INDEX idx_candidate_talent_pool_status ON candidate_talent_pool (status);
CREATE INDEX idx_candidate_talent_pool_re_engage_date ON candidate_talent_pool (re_engage_date);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Candidate Talent Pool",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Candidate Name": { "type": "string" },
      "Candidate ID": { "type": "integer" },
      "Department": { "type": "string" },
      "Email": { "type": "string", "format": "email" },
      "Experience (Years)": { "type": "number" },
      "Last Contact": { "type": "string", "format": "date" },
      "LinkedIn URL": { "type": "string", "format": "uri" },
      "Notes": { "type": "string" },
      "Phone": { "type": "string" },
      "Consent Status": { "type": "string" },
      "Consent Date": { "type": "string", "format": "date" },
      "Re-engage Date": { "type": "string", "format": "date" },
      "Referred By": { "type": "string" },
      "Skills": { "type": "string" },
      "Source": { "type": "string" },
      "Status": { "type": "string" },
      "Target Role": { "type": "string" }
  },
  "required": [
      "Experience (Years)",
      "Last Contact",
      "Consent Status",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Candidate Name | Title | Use as the database title |
| Candidate ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
| Department | Text | Leave as Text |
| Email | Email | Convert to Email |
| Experience (Years) | Number | Convert to Number |
| Last Contact | Date | Convert to Date |
| LinkedIn URL | URL | Convert to URL |
| Notes | Text | Leave as Text |
| Phone | Text | Leave as Text |
| Consent Status | Select (add options after import) | Convert to Select, add options: "Not recorded", "Granted", "Declined" |
| Consent Date | Date | Convert to Date |
| Re-engage Date | Date | Convert to Date, but only for rows where Consent Status is "Granted" |
| Referred By | Text | Leave as Text |
| Skills | Text | Leave as Text |
| Source | Text | Leave as Text |
| Status | Select (add options after import) | Convert to Select, add options: "Active", "Contacted", "Interested", "Not Now", "Closed" |
| Target Role | Text | Leave as Text |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Candidate Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Person` |
| 2 | Candidate ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Email | `email` | `VARCHAR(255)` | `string, format: email` | Email | `person@example.com` |
| 5 | Experience (Years) | `number` | `NUMERIC` | `number` | Number | `6` |
| 6 | Last Contact | `date` | `DATE` | `string, format: date` | Date | `2026-01-20` |
| 7 | LinkedIn URL | `url` | `TEXT` | `string, format: uri` | URL | `https://example.com/in/example-person` |
| 8 | Notes | `long_text` | `TEXT` | `string` | Text | `Went cold in February after a counter-offer; worth re-approaching in six months.` |
| 9 | Phone | `text` | `VARCHAR(255)` | `string` | Text | `+91 98xxxxxx21` |
| 10 | Consent Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Granted` |
| 11 | Consent Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-05` |
| 12 | Re-engage Date | `date` | `DATE` | `string, format: date` | Date | `2026-07-01` |
| 13 | Referred By | `text` | `VARCHAR(255)` | `string` | Text | `Example Referrer` |
| 14 | Skills | `text` | `VARCHAR(255)` | `string` | Text | `Python, SQL, Stakeholder Management` |
| 15 | Source | `text` | `VARCHAR(255)` | `string` | Text | `Referral` |
| 16 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Active` |
| 17 | Target Role | `text` | `VARCHAR(255)` | `string` | Text | `Delivery Manager` |

## Select Options

**Consent Status**

```
Not recorded | Granted | Declined
```

Only `Granted` unlocks a `Re-engage Date`. A verbal yes on a call is not recorded consent — record `Not recorded` and say why, so the gap stays visible instead of becoming a silent yes.

**Status**

```
Active | Contacted | Interested | Not Now | Closed
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We keep losing good candidates we rejected 6 months ago.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which roles?
> **A:** Delivery and support.
>
> **Q:** How long to keep?
> **A:** 12 months.
>
> **Q:** Do you have consent?
> **A:** Not written down.

**Recommended next step** - offered, not built:

> Keep a warm pool with consent and a re-engage date. It is a contact list with a purpose, not a resume archive.
>
> Workflow: Candidate added → Consent → Re-engage date → Reminder → Reopen role
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
- Does not source candidates or send outreach on your behalf.
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
- Consent to re-contact a rejected candidate is a legal question, not a data field you
  can infer. Record only what the candidate actually agreed to, and route the decision to
  a human.

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
- **Problem:** a re-engagement list built from a pool with no recorded consent.
  **Solution:** the list is unlawful, not just untidy. Block on `Consent Status` and report the count instead of emitting dates.


## Candidate Pool Consent Rules

Store only the candidate information needed for the stated recruiting purpose. Record consent source, scope, date, expiry or review date, communication preference, and lawful retention basis separately from skills and stage. A referral or public profile is not blanket consent for every future role; ask before re-engaging outside the confirmed scope.

Restrict access by recruiting need, keep rejection reasons factual and job-related, and never encode protected characteristics or inferred health, family, or immigration details. When a candidate asks to withdraw, mark the request and stop outreach while preserving only the minimum audit evidence required by policy. A pool status is administrative metadata, not a quality or employability score.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up prospect database for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

