---
name: company-email-accounts
description: 'Mailbox and licence register: employee, account type, aliases, groups, tool, licence cost, 2FA and password policy state, and access-review dates. Use for account provisioning.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-26"
author: WHOISABHISHEKADHIKARI
tags: [sme, business, operations, database, csv, notion, sql, onboard]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Company Email & Accounts

**What it is:** Work email, groups and tool accounts for every person.

## Overview

Works out the smallest useful **Company Email & Accounts** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 3: Onboard. Fits: Starter stage. Table code: n/a.

## When to Use This Skill

- company email accounts
- work account register
- google workspace account list
- tool account tracker

Also use it when the user says "work email, groups and tool accounts for every person", or describes the same process happening in a
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

> **Q:** Which tools need an account per person?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Tools** - Which systems? / Google Workspace? / Any paid tools?
- **Accounts** - Who is admin? / Backup admin? / Per user or per device?
- **Security** - Two-factor required? / Password manager? / Shared logins in use?
- **Current process** - Where is the list now? / Admin console or nothing? / Orphaned accounts?
- **Outcome** - What do you need? / An account register, provisioning or removal?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: company-email-accounts
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Tools": null
  "Accounts": null
  "Security": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Build an account register tied to people records, then provision and remove from that one list.

**Why this one:** Account sprawl is a security problem, not an admin problem. One register per person, with join and leave dates, is the whole fix.

**Workflow:** Joiner → Create accounts → Assign tools → Leave → Remove access → Log

**The one rule that makes this register mean anything:** `Access Removed Date` is empty for as long as the
account is live, and is set on the day access is actually removed. Never pre-fill it with a planned or
probable leaver date, because a removal date that was only a forecast is indistinguishable from one that
happened, and the register is read to answer "does this person still have access". A record that is `Active`
with a removal date is a contradiction: fix the status or clear the date, never leave both. `Closed` and
`Pending Offboarding` must carry the date, or the offboarding is not finished.

**Security columns are facts, not targets.** `Two Factor On`, `Recovery Email Set` and `Password Policy Met`
record what is true now. They are not a to-do list and must never be pre-set to TRUE to close a ticket. When
one is FALSE, `Status` may be `Active` - the account genuinely exists - and the fix is the review, not a
reclassification. Never disable a control in order to make a record look compliant.

**Recurring review needs a due date.** `Last Access Review` alone cannot go stale, because it always shows the
most recent review and never says the next one is late. `Next Review Due` carries the deadline; a review is
overdue when the due date has passed and `Last Access Review` is still earlier than it. Do not add a `Review
Frequency` field unless the user states one - the cadence is theirs, not this module's to invent.

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
Account Record,Employee Name,Department,Account Type,Work Email,Aliases,Email Groups,Tool or System,Licence Type,Licence Cost,Currency,Created Date,Created By,Two Factor On,Recovery Email Set,Password Policy Met,Last Access Review,Next Review Due,Access Removed Date,Handover To,Status,Notes,Account ID
ACC-EXAMPLE-001,Example Employee,Delivery,Work Email,employee@example.com,"employee, e.surname","all-staff, delivery-team",Example Mail Service,Per User,1200.00,INR,2026-01-15,Example Requester,TRUE,FALSE,FALSE,2026-02-28,2026-02-28,2026-02-28,Example Successor,Closed,Contract ended 2026-02-28. Access removed and mailbox handed to the Example Successor; licences not reassigned.,(blank)

```

```sql
CREATE TABLE company_email_accounts (
  account_record VARCHAR(255),
  employee_name VARCHAR(255),
  department VARCHAR(255),
  account_type VARCHAR(100) NOT NULL,
  work_email VARCHAR(255),
  aliases VARCHAR(255),
  email_groups VARCHAR(255),
  tool_or_system VARCHAR(255),
  licence_type VARCHAR(100) NOT NULL,
  licence_cost NUMERIC(14,2) NOT NULL,
  currency VARCHAR(255),
  created_date DATE NOT NULL,
  created_by VARCHAR(255),
  two_factor_on BOOLEAN,
  recovery_email_set BOOLEAN,
  password_policy_met BOOLEAN,
  last_access_review DATE,
  next_review_due DATE,
  access_removed_date DATE NOT NULL,
  handover_to VARCHAR(255),
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  account_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (status IN ('Active', 'Suspended', 'Pending Offboarding', 'Closed')),
  -- The core integrity rule: access that has been removed is dated, and live access is not.
  CHECK ((status IN ('Closed', 'Pending Offboarding')) = (access_removed_date IS NOT NULL)),
  -- A review cannot be recorded after the date it was due.
  CHECK (last_access_review IS NULL OR next_review_due IS NULL
         OR last_access_review <= next_review_due)
);

CREATE INDEX idx_company_email_accounts_status ON company_email_accounts (status);
```
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Company Email Accounts",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Account Record": { "type": "string" },
      "Employee Name": { "type": "string" },
      "Department": { "type": "string" },
      "Account Type": { "type": "string" },
      "Work Email": { "type": "string", "format": "email" },
      "Aliases": { "type": "string" },
      "Email Groups": { "type": "string" },
      "Tool or System": { "type": "string" },
      "Licence Type": { "type": "string" },
      "Licence Cost": { "type": "number" },
      "Currency": { "type": "string" },
      "Created Date": { "type": "string", "format": "date" },
      "Created By": { "type": "string" },
      "Two Factor On": { "type": "boolean" },
      "Recovery Email Set": { "type": "boolean" },
      "Password Policy Met": { "type": "boolean" },
      "Last Access Review": { "type": "string", "format": "date" },
      "Next Review Due": { "type": "string", "format": "date" },
      "Access Removed Date": { "type": "string", "format": "date" },
      "Handover To": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Account ID": { "type": "integer" }
  },
  "required": [
    "Account Type",
    "Licence Type",
    "Licence Cost",
    "Created Date",
    "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| Account Record | Text | Leave as Text. A human-readable reference you choose, not a generated number, so it stays reproducible |
| Employee Name | Title | Use as the database title |
| Department | Text | Leave as Text |
| Account Type | Select | Add options: "Work Email", "Shared Mailbox", "Tool Account", "Group Address" |
| Work Email | Email | Convert to Email |
| Aliases | Text | Leave as Text |
| Email Groups | Text | Leave as Text. Denormalised list, not a Notion Relation: the directory table is not part of this build |
| Tool or System | Text | Leave as Text. Record the vendor the user named, or a generic value if they did not |
| Licence Type | Select | Add options: "Per User", "Per Team", "Shared" |
| Licence Cost | Number (format: currency) | Convert to Number, set format to Currency |
| Currency | Text | Leave as Text. ISO 4217 code, for example INR, not "Rupees" |
| Created Date | Date | Convert to Date |
| Created By | Text | Leave as Text |
| Two Factor On | Checkbox | Convert to Checkbox |
| Recovery Email Set | Checkbox | Convert to Checkbox |
| Password Policy Met | Checkbox | Convert to Checkbox |
| Last Access Review | Date | Convert to Date |
| Next Review Due | Date | Convert to Date. A recurring review needs a due date, otherwise nothing is ever overdue and the cadence cannot be measured |
| Access Removed Date | Date | Convert to Date. Leave EMPTY while the account is live; set it on the day access is actually removed, never as a forecast |
| Handover To | Text | Leave as Text. A person, so a name and not a relation; the directory owns the person record |
| Status | Select | Add options: "Active", "Suspended", "Pending Offboarding", "Closed" |
| Notes | Text | Leave as Text |
| Account ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | Account Record | `text` | `VARCHAR(255)` | `string` | Text | `ACC-EXAMPLE-001` |
| 2 | Employee Name | `text` | `VARCHAR(255)` | `string` | Text | `Example Employee` |
| 3 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 4 | Account Type | `select` | `VARCHAR(100)` | `string` | Select | `Work Email` |
| 5 | Work Email | `email` | `VARCHAR(255)` | `string, format: email` | Email | `employee@example.com` |
| 6 | Aliases | `text` | `VARCHAR(255)` | `string` | Text | `employee, e.surname` |
| 7 | Email Groups | `text` | `VARCHAR(255)` | `string` | Text | `all-staff, delivery-team` |
| 8 | Tool or System | `text` | `VARCHAR(255)` | `string` | Text | `Example Mail Service` |
| 9 | Licence Type | `select` | `VARCHAR(100)` | `string` | Select | `Per User` |
| 10 | Licence Cost | `currency` | `NUMERIC(14,2)` | `number` | Number (format: currency) | `1200.00` |
| 11 | Currency | `text` | `VARCHAR(255)` | `string` | Text | `INR` |
| 12 | Created Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 13 | Created By | `text` | `VARCHAR(255)` | `string` | Text | `Example Requester` |
| 14 | Two Factor On | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `TRUE` |
| 15 | Recovery Email Set | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 16 | Password Policy Met | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 17 | Last Access Review | `date` | `DATE` | `string, format: date` | Date | `2026-02-28` |
| 18 | Next Review Due | `date` | `DATE` | `string, format: date` | Date | `2026-02-28` |
| 19 | Access Removed Date | `date` | `DATE` | `string, format: date` | Date | `2026-02-28` |
| 20 | Handover To | `text` | `VARCHAR(255)` | `string` | Text | `Example Successor` |
| 21 | Status | `select` | `VARCHAR(100)` | `string` | Select | `Closed` |
| 22 | Notes | `long_text` | `TEXT` | `string` | Text | `Contract ended 2026-02-28. Access removed and mailbox handed to the Example Successor; licences not reassigned.` |
| 23 | Account ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | (blank) |

## Select Options

**Account Type**

```
Work Email | Shared Mailbox | Tool Account | Group Address
```
**Licence Type**

```
Per User | Per Team | Shared
```
**Status**

```
Active | Suspended | Pending Offboarding | Closed
```

## Relations

Link fields: none

`Email Groups` and `Handover To` are **not** relations. `Email Groups` is a denormalised comma-separated list of
group addresses, and `Handover To` is a person named inline rather than a foreign key. The directory table that
owns people is not part of this build, so no Notion `Relation` is created here and inventing a target database is
forbidden. `Link fields: none` therefore means this table holds no foreign key, not that the register has no
linkage to people - the linkage is by name, and it will drift from the directory.

## Examples

**Prompt**

```
People leave and their tool logins stay active for months.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which tools?
> **A:** Google, Slack and the CRM.
>
> **Q:** Who is admin?
> **A:** One person, no backup.
>
> **Q:** How do you track it?
> **A:** Nowhere.

**Recommended next step** - offered, not built:

> Build an account register tied to people records, then provision and remove from that one list.
>
> Workflow: Joiner → Create accounts → Assign tools → Leave → Remove access → Log
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
- Does not create or delete accounts. It only records what should exist.
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
- **Problem:** an account reads `Active` but has an `Access Removed Date`.
  **Solution:** one of the two is wrong. Never pre-fill the removal date with a forecast, and fix the pair rather than leaving them to disagree; the SQL CHECK refuses both the contradiction and an undated `Closed` record.
- **Problem:** a review is overdue but nothing is flagged.
  **Solution:** `Last Access Review` is a history field and never goes stale on its own. `Next Review Due` is the deadline; compare the two instead of reading the last date as the current state.
- **Problem:** Notion import shows every column as Text.
  **Solution:** that is expected. Apply the property mapping table once, after import.

## Related Skills

- [Module Catalog](https://github.com/sickn33/agentic-awesome-skills/blob/main/CATALOG.md) - find the relevant module, then read its skill.
- @people-directory - the employee master record most modules link to.
- @notification-reminder-hub - turns due dates in this module into reminders.

## Reusable Prompt

```
I want to set up work email, groups and tool accounts for every person for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

