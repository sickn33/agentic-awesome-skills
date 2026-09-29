---
name: admin-access-register
description: 'Admin account register: system, main and backup admin, seats, plan, 2FA, shared logins and access-review dates, as CSV, SQL, JSON Schema or Notion on request. Use for access reviews.'
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
- protect
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Admin Access Register

**What it is:** Who holds admin rights on each system, with a backup admin and review dates.

## Overview

Works out the smallest useful **Admin Access Register** setup for the business in front of it, then
builds it only when asked. The default output is a short recommendation, not a
spreadsheet. Artifacts - CSV, SQL DDL, JSON Schema, Notion mapping - are produced on
request, from one field list so they cannot drift apart.

Layer: Layer 7: Protect. Fits: Growth stage. Table code: n/a.

## When to Use This Skill

- admin access register
- system access review
- privileged account list
- quarterly access review

Also use it when the user says "who holds admin rights on each system, with a backup admin and review dates", or describes the same process happening in a
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

> **Q:** How many admin accounts exist?

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message. Ask the rest one at a
time, and stop as soon as the remaining answers would not change the output.

- **Scope** - Which systems? / How many admins? / Vendor or employee admins?
- **Ownership** - Who approves access? / Named owner per account? / Any shared logins?
- **Review** - How often reviewed? / What happens on leaving? / Evidence kept?
- **Current process** - Is it recorded now? / IT ticket or nothing? / Is it current?
- **Outcome** - What do you need? / A register, a review cycle or both?

Never invent an answer. If the user does not know, record it as unknown and carry on.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: admin-access-register
intent: null            # setup | advice | review | fix | build | convert | export
scale: null             # Starter | Growth | Scale, only if the answer changes it
areas:
  "Scope": null
  "Ownership": null
  "Review": null
  "Current process": null
  "Outcome": null
requested_outputs: []   # csv | sql | json | notion | xlsx - requested formats only
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

### Step 4 - Recommend the smallest workflow

If an artifact was requested, build it after resolving essential missing facts. Otherwise give a short recommendation and offer the relevant artifact.

**Recommended approach:** Keep one row per named admin account with a system, an owner and a last-reviewed date. Shared logins are the first thing to fix.

**Why this one:** Privileged accounts are the ones that matter after someone leaves. Naming an owner per account is what makes removal possible.

**Workflow:** System listed → Admin account → Owner and approver → Periodic review → Removal

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
System or Tool,Category,Main Admin,Backup Admin,Department,Access Level,Number of Admin Users,Billing Owner,Plan,Seats,Renewal Date,Company Owned Account,Shared Login,Password Manager Entry,Two Factor On,Last Access Review,Next Access Review,Offboarding Checklist Item,Risk Level,Status,Notes,Admin ID
Example Product,General,Example Admin,Example Backup Admin,Delivery,Full,3,Example Owner,Business,5,2026-01-15,TRUE,FALSE,Shared vault - Finance,TRUE,2026-01-15,2026-01-15,"Remove from payroll, revoke accounts, collect laptop",Low,Provisioned,Shared logins retired after the February access review; two orphaned accounts still need an owner.,
```

```sql
CREATE TABLE admin_access_register (
  system_or_tool VARCHAR(255),
  category VARCHAR(100) NOT NULL,
  main_admin VARCHAR(255),
  backup_admin VARCHAR(255),
  department VARCHAR(255),
  access_level VARCHAR(100) NOT NULL,
  number_of_admin_users NUMERIC NOT NULL,
  billing_owner VARCHAR(255),
  plan VARCHAR(255),
  seats NUMERIC NOT NULL,
  renewal_date DATE NOT NULL,
  company_owned_account BOOLEAN NOT NULL,
  shared_login BOOLEAN NOT NULL,
  password_manager_entry VARCHAR(255),
  two_factor_on BOOLEAN NOT NULL,
  last_access_review DATE NOT NULL,
  next_access_review DATE NOT NULL,
  offboarding_checklist_item VARCHAR(255),
  risk_level VARCHAR(100) NOT NULL,
  status VARCHAR(100) NOT NULL,
  notes TEXT,
  admin_id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_admin_access_register_status ON admin_access_register (status);
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Admin Access Register",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "System or Tool": { "type": "string" },
      "Category": { "type": "string" },
      "Main Admin": { "type": "string" },
      "Backup Admin": { "type": "string" },
      "Department": { "type": "string" },
      "Access Level": { "type": "string" },
      "Number of Admin Users": { "type": "number" },
      "Billing Owner": { "type": "string" },
      "Plan": { "type": "string" },
      "Seats": { "type": "number" },
      "Renewal Date": { "type": "string", "format": "date" },
      "Company Owned Account": { "type": "boolean" },
      "Shared Login": { "type": "boolean" },
      "Password Manager Entry": { "type": "string" },
      "Two Factor On": { "type": "boolean" },
      "Last Access Review": { "type": "string", "format": "date" },
      "Next Access Review": { "type": "string", "format": "date" },
      "Offboarding Checklist Item": { "type": "string" },
      "Risk Level": { "type": "string" },
      "Status": { "type": "string" },
      "Notes": { "type": "string" },
      "Admin ID": { "type": "integer" }
  },
  "required": [
      "Category",
      "Access Level",
      "Number of Admin Users",
      "Seats",
      "Renewal Date",
      "Last Access Review",
      "Next Access Review",
      "Risk Level",
      "Status"
  ]
}
```

```markdown
| CSV column | Notion property | Set after import |
|---|---|---|
| System or Tool | Title | Use as the database title |
| Category | Select (add options after import) | Convert to Select, add options: "General", "Operations", "Finance", "People", "Compliance" |
| Main Admin | Text | Leave as Text |
| Backup Admin | Text | Leave as Text |
| Department | Text | Leave as Text |
| Access Level | Select (add options after import) | Convert to Select, add options: "Full", "Write", "Read", "No Access" |
| Number of Admin Users | Number | Convert to Number |
| Billing Owner | Text | Leave as Text |
| Plan | Text | Leave as Text |
| Seats | Number | Convert to Number |
| Renewal Date | Date | Convert to Date |
| Company Owned Account | Checkbox | Convert to Checkbox |
| Shared Login | Checkbox | Convert to Checkbox |
| Password Manager Entry | Text | Leave as Text |
| Two Factor On | Checkbox | Convert to Checkbox |
| Last Access Review | Date | Convert to Date |
| Next Access Review | Date | Convert to Date |
| Offboarding Checklist Item | Text | Leave as Text |
| Risk Level | Select (add options after import) | Convert to Select, add options: "Low", "Medium", "High", "Critical" |
| Status | Select (add options after import) | Convert to Select, add options: "Requested", "Approved", "Provisioned", "Review Due", "Revoked" |
| Notes | Text | Leave as Text |
| Admin ID | Text (preserve source ID) | Keep imported IDs as Text; optionally add a separate Unique ID property |
```

The rows above are documentation examples only. Emit empty templates unless the user explicitly requests examples. Money stays `currency`, dates stay `date`,
and anything pointing at another table stays `relation`.

## Field Reference

| # | Field | Type | SQL | JSON Schema | Notion | CSV example |
|---:|---|---|---|---|---|---|
| 1 | System or Tool | `text` | `VARCHAR(255)` | `string` | Text | `Example Product` |
| 2 | Category | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `General` |
| 3 | Main Admin | `text` | `VARCHAR(255)` | `string` | Text | `Example Admin` |
| 4 | Backup Admin | `text` | `VARCHAR(255)` | `string` | Text | `Example Backup Admin` |
| 5 | Department | `text` | `VARCHAR(255)` | `string` | Text | `Delivery` |
| 6 | Access Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Full` |
| 7 | Number of Admin Users | `number` | `NUMERIC` | `number` | Number | `3` |
| 8 | Billing Owner | `text` | `VARCHAR(255)` | `string` | Text | `Example Owner` |
| 9 | Plan | `text` | `VARCHAR(255)` | `string` | Text | `Business` |
| 10 | Seats | `number` | `NUMERIC` | `number` | Number | `5` |
| 11 | Renewal Date | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 12 | Company Owned Account | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `TRUE` |
| 13 | Shared Login | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `FALSE` |
| 14 | Password Manager Entry | `text` | `VARCHAR(255)` | `string` | Text | `Shared vault - Finance` |
| 15 | Two Factor On | `checkbox` | `BOOLEAN` | `boolean` | Checkbox | `TRUE` |
| 16 | Last Access Review | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 17 | Next Access Review | `date` | `DATE` | `string, format: date` | Date | `2026-01-15` |
| 18 | Offboarding Checklist Item | `text` | `VARCHAR(255)` | `string` | Text | `Remove from payroll, revoke accounts, collect laptop` |
| 19 | Risk Level | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Low` |
| 20 | Status | `select` | `VARCHAR(100)` | `string` | Select (add options after import) | `Provisioned` |
| 21 | Notes | `long_text` | `TEXT` | `string` | Text | `Shared logins retired after the February access review; two orphaned accounts still need an owner.` |
| 22 | Admin ID | `id` | `SERIAL PRIMARY KEY` | `integer` | Text (preserve source ID) | `(blank)` |

## Select Options

**Category**

```
General | Operations | Finance | People | Compliance
```
**Access Level**

```
Full | Write | Read | No Access
```
**Risk Level**

```
Low | Medium | High | Critical
```
**Status**

```
Requested | Approved | Provisioned | Review Due | Revoked
```

## Relations

Link fields: none

## Examples

**Prompt**

```
We have admin accounts for people who left two years ago.
```

**Context first** - one question per message, nothing already answered:

> **Q:** Which systems?
> **A:** Accounting, CRM and email.
>
> **Q:** Named owner each?
> **A:** Not always.
>
> **Q:** Shared logins?
> **A:** Yes, one or two.

**Recommended next step** - offered, not built:

> Keep one row per named admin account with a system, an owner and a last-reviewed date. Shared logins are the first thing to fix.
>
> Workflow: System listed → Admin account → Owner and approver → Periodic review → Removal
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
- Does not grant, change or revoke access on any system.
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
I want to set up who holds admin rights on each system, with a backup admin and review dates for my company.
Ask me one short question at a time, and only about what I have not already told you.
Then recommend the smallest setup that fits, and wait for me to ask before you build it.
When I ask, output CSV, SQL DDL, JSON Schema, a Notion property mapping or an Excel workbook. Data only.
```

