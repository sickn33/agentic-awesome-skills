---
name: notion-manual-import
description: 'Notion Manual Import: the Notion step for any module - CSV, property mapping, import steps and verification for the field list the active module confirmed. Use whenever the user picks Notion.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-28"
author: WHOISABHISHEKADHIKARI
tags: [notion, csv, import, manual, operations, template, helper]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# Notion Manual Import

**What it is:** the Notion step for every module - a CSV, a property mapping and the
click-path to import, for a user who will upload the database themselves. Any module that
gets a selected Notion output routes that step here, so the mapping and the import steps
exist in exactly one place.

## Overview

Prepares a database so the user can upload it into Notion by hand. It handles the
confirmed fields, the CSV, the Notion property mapping, select and status options, the
manual import steps, and the post-import verification.

This is a helper: it defines no table of its own and renders whatever field list the
active module already confirmed, so its CSV and mapping are derived, never re-invented.
It is the Notion workflow, not a consolation prize - the module confirms the fields and
hands the Notion step to this file.

Manual outputs need no workspace connection. A requested live build uses the shared
contract to verify available tools and the destination before making changes.

Layer: n/a. Fits: every stage. Table code: n/a - it renders the active module's table.

## When to Use This Skill

- upload this to Notion
- give me a Notion template
- I will upload it manually
- create a CSV for Notion
- give me Notion import instructions
- Notion is not connected
- set this up in Notion
- make this Notion-ready
- show me how to create this database manually

Use it whenever the user selects Notion as an output, whatever module is active. Also use
it when another skill produces a database structure but direct Notion creation is
unavailable, or whenever the user requests a manual route.

This helper owns the mapping for both manual output and an authorized connected build.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "I will upload it myself", "Notion is not connected", "show me how" -> manual setup; go
  to Step 2.
- "just give me the CSV" -> import file only. Output: CSV alone.
- "I already have the CSV, what do I set" -> mapping only. Output: property mapping alone.
- "it imported but everything is Text" -> fix existing import. Output: correction
  instructions for the properties that are wrong, and nothing else unless asked.
- "Notion connected" -> verify tool access. Continue a previously requested workspace
  build only if the required tools and destination are available; otherwise explain the blocker.

Never rebuild everything when a correction is what was asked for.

### Step 2 - Ask only what is missing

Skip anything the user already answered, in any earlier message, including answers given
to the module skill that owns the field list. Reuse the database name, the field names and
types, the select options, the statuses, the relations, the currency fields, the date
fields and the IDs. Never ask for information the user has already provided.

Ask one short question per message, and only when the answer changes the output:

> **Q:** Do you want an empty template or example rows?

If it does not materially change the requested output, do not ask, and default to no
example rows:

```yaml
example_rows: false
```

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: notion-manual-import
intent: null              # set in Step 1, one of: manual setup, import file, mapping, fix
source_module: null       # the module whose field list this renders
notion_connected: null    # true | false | unknown - never assumed either way
requested_outputs: []     # csv | mapping | instructions | verification
example_rows: false
confirmed_facts: []       # only what the user actually said
open_questions: []        # the unanswered ones, in the order worth asking
```

`source_module` is the only field this skill needs that a module skill does not have. If
it is unknown, ask which database to prepare, because a CSV without a confirmed field list
is a guess.

### Step 4 - Recommend the smallest workflow

Produce an already requested output without asking again. For advice-only requests, give a short recommendation and offer the relevant output.

**Recommended approach:** One CSV with a header of the exact field names, one property
mapping table beside it, and the import click-path. Nothing else is needed to get a
working database.

**Why this one:** a CSV carries no types, so the import is the easy half and the property
configuration is the half that silently goes wrong. Doing the mapping up front is the
difference between a database that filters and one that is a wall of Text.

**Workflow:** Field list confirmed -> CSV exported -> Database created -> CSV imported ->
Properties converted -> Verified

Never force a connected integration and never force automation. For a requested connected build, use available tools under the shared contract.

### Step 5 - Build only on request

Once the user asks, emit only the pieces they requested, as data only. Keep prose outside machine-readable data; provide file links and material limitations separately. Every column name comes from the source module's field list, in
the same order, in the CSV and in the mapping.

For a manual request, emit the requested files or mapping directly. For a live request,
verify tools and destination, apply this mapping, and report only confirmed changes.

#### CSV

UTF-8, with a byte order mark so Excel opens the text correctly. The first row holds the
exact field names. Do not add fake records.

```csv
Field 1,Field 2,Field 3
```

Example rows only when the user explicitly asked for them, and then obviously fake.

#### Property mapping

CSV cannot preserve Notion property types, so the mapping is always emitted separately,
in this shape:

| CSV column | Notion property | After import |
|---|---|---|
| Name | Title | Set as database title |
| Description | Text | Leave as Text |
| Status | Select | Convert to Select |
| Due Date | Date | Convert to Date |
| Amount | Number | Set number format |
| Notes | Text | Leave as Text |

Use the actual confirmed fields, not this illustration.

#### Property type rules

| Canonical type | Notion property |
|---|---|
| id | Text to preserve source IDs; separate Unique ID only if requested |
| title | Title |
| text | Text |
| long_text | Text |
| number | Number |
| currency | Number with currency format |
| percentage | Number; convert 0–100 to a fraction before percent formatting |
| date | Date |
| datetime | Date |
| checkbox | Checkbox |
| select | Select |
| multi_select | Multi-select |
| url | URL |
| email | Email |
| phone | Phone |
| person | Person |
| relation | Relation |
| files | Files |

Never map money to Text. Never map dates to Text unless the source explicitly requires
it. A currency format is a format choice, never a currency assumption: do not pick the
currency for the user.

#### Manual import steps

Give the shortest click-path that works. Notion's labels move between versions, so name
the action and say the label may differ rather than claiming a button exists.

1. Use Notion’s CSV import action to create a database from the file.
2. Confirm the destination and imported column mapping; do not first create a duplicate database.
3. For an existing database, use its CSV merge/import action only when intended and check for duplicates.
4. Verify the properties below. For a header-only file that the importer rejects, create
   the properties manually instead of adding fake business records.

Check [Notion’s import guidance](https://www.notion.com/help/import-data-into-notion)
for the current UI and supported relation mapping.

#### Property configuration order

After import, tell the user to convert properties in this order, and only the ones that
exist:

```text
Title
→ Dates
→ Numbers
→ Currency
→ Select fields
→ Status fields
→ IDs
→ Relations
```

#### Select options

For every `select` or `multi_select` field, list only the confirmed options, as
suggestions the user adds after import. Do not invent statuses.

#### IDs

Preserve imported identifiers as Text. A Notion Unique ID is a separate generated
property, not a replacement for external IDs or the required Title property. Use it only
when requested, and never invent a prefix. Map exactly one suitable existing field to
Title; if none is suitable, disclose the technical title field needed for Notion.

#### Relations

A CSV import does not create a working relation. If a field is a relation:

1. import the base database first
2. import the related database
3. convert the field to Relation
4. select the target database
5. verify the linked records by hand

Never pretend a text column became a working relation automatically.

#### Calculations

Do not place business calculations inside the CSV unless explicitly requested. For a
value such as `Net Tax Payable`, `Days to Due`, `Balance`, `Variance` or `Total`, decide
first whether the source module defines it as an entered value, a formula, or something
computed elsewhere, and preserve that. Never invent a formula. If the parent skill says a
calculation belongs in accounting or tax software, that rule stands.

#### Output modes

| The user asks for | Emit |
|---|---|
| the CSV | the CSV alone |
| the mapping | the mapping alone |
| instructions | the shortest useful manual setup steps |
| everything | CSV, mapping, options, import steps, verification checklist |

#### Verification

After the import, ask the user to verify the database name, the field names, the property
types, the date and currency formatting, the select and status options, the ID setup and
the relations. The imported database is not verified until those match the source schema.

## Field Reference

This skill has no Field Reference of its own, and it must not grow one. The active
module's Field Reference is the single source: its CSV header, its SQL, its JSON Schema
and its Notion mapping are the four artifacts, and this skill reformats the same field
list for a manual import rather than defining a fifth.

If the source module's field list is not in front of you, read `skills/<slug>/SKILL.md`
for the module in play. If it is missing or ambiguous, ask which database to prepare and
stop - a header built from a guess imports as a wall of Text that the user then has to
fix by hand.


See the [Input Modules](references/input-modules.md) reference for the full guidance.

## Select Options

Option lists belong to the source module, not to this skill. Emit them as a starting set
to add after import, and never as a confirmed taxonomy. Where the user has supplied their
own values, the user's values win.

## Relations

Relations are configured after both databases exist, in the order above. In a manual
import the target database has to exist first, so a relation column arrives as Text and
is converted by hand. Say so rather than promising a working link.

## Examples

**Prompt**

```
Notion is not connected. I want to build my tax register myself - what do I do?
```

**Answered in one message, no intake needed** - the module and the route were both named:

```
Read skills/tax-register/SKILL.md for the field list, then emit the header-only CSV, the
property mapping and the import steps.
```

**Prompt**

```
I already imported my tax register but every column came in as Text.
```

**Mapping only** - correction instructions, no rebuild:

> Convert `Tax Period Start` and `Tax Period End` to Date, `Tax Collected on Sales`,
> `Tax Paid on Purchases`, `Withholding Tax Deducted`, `Withholding Tax Paid to Us` and
> `Net Tax Payable` to Number and set the currency format to the currency your business
> uses, `Status` and `Tax Type` to Select, and `Tax ID` to Unique ID with the prefix from
> the source schema. Leave `Tax Period`, `Tax Filing Reference` and `Notes` as Text.

**Documented shape** - a tax register field list, header-only CSV and mapping. The rows
below are documentation examples only. Emit empty templates unless the user explicitly
requests examples.

```csv
Tax Record,Tax Type,Tax Period,Tax Period Start,Tax Period End,Tax Collected on Sales,Tax Paid on Purchases,Withholding Tax Deducted,Withholding Tax Paid to Us,Net Tax Payable,Currency,Tax Filing Due Date,Filed Date,Payment Date,Tax Filing Reference,Prepared By,Reviewed By,Days to Due,Status,Notes,Tax ID
```

| CSV column | Notion property | After import |
|---|---|---|
| Tax Record | Title | Use as database title |
| Tax Type | Select | Add confirmed tax types |
| Tax Period | Text | Leave as Text |
| Tax Period Start | Date | Convert to Date |
| Tax Period End | Date | Convert to Date |
| Tax Collected on Sales | Number | Set currency format |
| Tax Paid on Purchases | Number | Set currency format |
| Withholding Tax Deducted | Number | Set currency format |
| Withholding Tax Paid to Us | Number | Set currency format |
| Net Tax Payable | Number | Set currency format |
| Currency | Text | Leave as Text |
| Tax Filing Due Date | Date | Convert to Date |
| Filed Date | Date | Convert to Date |
| Payment Date | Date | Convert to Date |
| Tax Filing Reference | Text | Leave as Text |
| Prepared By | Text | Leave as Text |
| Reviewed By | Text | Leave as Text |
| Days to Due | Number | Convert to Number |
| Status | Select | Add confirmed statuses |
| Notes | Text | Leave as Text |
| Tax ID | Unique ID | Prefer automatic ID |


See the [Best Practices](references/best-practices.md) reference for the full guidance.

## Limitations

- It formats another module's schema. It never decides the schema, and it does not create
  the database.
- Everything here is text. Nothing is uploaded, created, converted or connected by this
  skill, and no claim of a completed Notion action may be made on its behalf.
- Property names in the Notion UI change between versions. The click-path is described by
  action, and the user verifies the label.
- Relations, rollups, formulas, permissions and sharing are configured by hand afterwards.
- Select options are a starting set, not the business's confirmed taxonomy.
- A currency format is not a currency. The user names the currency.
- Legal, tax and payroll review is still required before the imported database drives
  real decisions.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

