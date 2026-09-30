---
name: json-schema-manual
description: 'JSON Schema Manual: draft 2020-12 validation schema from a confirmed field list, with required and enum values only where confirmed. Use for an API or import contract.'
category: business
risk: safe
source: self
source_type: self
date_added: "2026-09-28"
author: WHOISABHISHEKADHIKARI
tags: [json, json-schema, validation, schema, operations, data, helper]
tools: []
source_repo: WHOISABHISHEKADHIKARI/sme-ops-system-builder
---

# JSON Schema Manual

**What it is:** a draft 2020-12 schema over a field list someone already confirmed -
validating structure, never inventing business rules.

## Overview

Produces JSON Schema from a confirmed canonical field list, for validation, API
contracts, import and export structures, form generation, and schema documentation.

JSON Schema validates structure. It does not compute, decide or imply. This is a helper:
it defines no table of its own and renders whatever field list the active module already
confirmed, so the property names here are the names that module uses in its CSV, SQL,
spreadsheet and Notion mapping.

Layer: n/a. Fits: every stage. Table code: n/a - it renders the active module's table.

## When to Use This Skill

- I need a JSON Schema
- validate this payload before it goes in
- make an API contract for this table
- document the shape of this import file
- generate a form from this schema
- turn the agreed fields into a schema

Also use it when a module has confirmed a field list and the user wants the contract for
the system that will read it, rather than the table itself.

Do not use it to add validation the business has not asked for. A schema is a promise
about what a payload may contain, and every restriction in it rejects real data.

## How It Works

Follow the shared execution contract. The module-specific rules below define only domain fields, decisions, calculations, and safety constraints.

### Step 1 - Identify intent

Read the request and pick the intent before asking anything.

- "I need a schema" -> a strict or permissive schema, per Step 5.
- "something rejected my payload" -> review or fix: only the rule that caused it.
- "which fields are required" -> advice: answer from the confirmed field list, and offer
  the schema rather than emitting one.

Build only what was requested. A fix does not become a rewrite, and advice does not become
a file.

### Step 2 - Ask only what is missing

Reuse everything already confirmed, including by the module that owns the field list: the
property names and types, the select options, the date and currency fields, the
calculated fields, the statuses and the IDs. Never ask again for information the user has
already supplied.

Ask one short question per message, and only when the answer changes the schema:

> **Q:** Should the schema reject unknown fields, or allow them?

Nothing else is worth a question. Requiredness, options and formats come from the
confirmed field list, not from a new round of asking.

### Step 3 - Hold the internal context

Hold the answers in this shape. It stays internal - it is not shown to the user unless
they ask, and it never carries a value the user did not give.

```yaml
module: json-schema-manual
intent: null            # set in Step 1, one of: schema, review, fix, advice
source_module: null     # the module whose field list this renders
draft: "https://json-schema.org/draft/2020-12/schema"
additional_properties: null   # false | true - asked once, then held
example_instances: false
confirmed_facts: []     # only what the user actually said
open_questions: []      # the unanswered ones, in the order worth asking
```

`source_module` is the one field this skill needs that a module skill does not have. If it
is unknown, ask which table the contract is for, because a schema built from a guess
rejects the real data.

### Step 4 - Recommend the smallest workflow

Build an already requested artifact without asking again. For advice-only requests, give a short recommendation and offer the relevant artifact.

**Recommended approach:** one object schema, one property per confirmed field, no
`required` entry the field list does not mark as required, and no `enum` the field list
does not define. Strictness only where the contract is closed.

**Why this one:** a schema's damage is asymmetric. A property it omits passes data nobody
reviewed; a property it marks required, or an `enum` it invents, rejects data that was
perfectly valid. Confirm the closed rules and stay silent on the rest.

**Workflow:** Field list confirmed -> Properties typed -> Requiredness applied from the
source -> (validated) -> Published as the contract

### Step 5 - Build only on request

Once the user asks, emit the schema as data only. Keep prose outside machine-readable data; provide file links and material limitations separately. Property names come from the confirmed field list, identical to the CSV, SQL,
spreadsheet and Notion names, in the same order. Never rename a property independently.

Default draft:

```text
https://json-schema.org/draft/2020-12/schema
```

#### Type mapping

| Canonical type | JSON Schema |
|---|---|
| id | `integer` or `string`, matching the confirmed source |
| title | `string` |
| text | `string` |
| long_text | `string` |
| number | `number` |
| currency | `number` |
| percentage | `number` |
| date | `string`, `format: date` |
| datetime | `string`, `format: date-time` |
| checkbox | `boolean` |
| select | `string` |
| multi_select | `array` of `string` |
| url | `string`, `format: uri` |
| email | `string`, `format: email` |
| phone | `string` |
| relation | `string` or `integer`, matching the confirmed reference key |
| files | `array` or `string`, only when the source structure defines it |

#### Required

A property goes in `required` only when the parent skill marks it required, or the user
explicitly confirms it. Unknown requiredness means optional, and requiredness is never
inferred from what a business obviously needs - a calculated value is never required when
its source may legitimately be missing.

#### Select options

`enum` only for confirmed options:

```json
{
  "Status": {
    "type": "string",
    "enum": ["Draft", "Filed", "Paid"]
  }
}
```

Never invent an enum value. Where options are a starting set rather than a confirmed
taxonomy, leave the property a plain `string` and say the options are not yet fixed.

#### Additional properties

`"additionalProperties": false` only when the contract is meant to be strict:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "...",
  "type": "object",
  "properties": {},
  "required": []
}
```

If strictness is unknown and it matters, ask the one question in Step 2. Otherwise follow
the parent skill's convention.

#### Null handling

Do not add `null` to a type automatically. Allow it only where the parent schema
explicitly distinguishes null from missing. For unknown or optional data, prefer omission
over invented null semantics - a validator that accepts `null` where the data model has no
such value is a rule nobody agreed to.

#### Examples and descriptions

No `examples`, no instance data, and no `description` beyond what the source field
definition supports. Examples only when the user asks for them, and then obviously fake.
A description that invents meaning becomes the spec, and the spec then rejects real data.

#### Calculated fields

A calculated output field is represented by its data type and nothing else. The schema
does not carry the calculation, and a consumer that reads the field gets the value the
producing system computed - never one this schema invents.

#### Before you hand it over

```
Property names exactly match the canonical fields?
Types aligned with the source?
Every `required` entry supported by the source?
Every `enum` confirmed?
No invented formats?
No fake examples?
No schema drift against the other artifacts?
```

## Field Reference

This skill has no Field Reference of its own, and it must not grow one. The active
module's Field Reference is the single source: its property names here, its CSV columns,
its SQL columns and its Notion properties are the same field list, so a payload that
validates is a payload the module can read.

If the field list is not in front of you, read `skills/<slug>/SKILL.md` for the module in
play. If it is missing or ambiguous, ask which table the contract is for and stop.


See the [Input Modules](references/input-modules.md) reference for the full guidance.

## Select Options

`enum` values are the confirmed taxonomy, never a starting set presented as final. Where
the business has not settled its options, the property stays a `string` and the mapping
notes that the options are open - a schema is a contract, and an unconfirmed list becomes
a rejection waiting for a real record.

## Relations

A relation is a reference key: `string` or `integer`, matching whatever the source uses
as the key. The schema does not describe the target table, does not check that the target
exists, and cannot express the link as a reference. Do not add a property for the target's
fields; that is a second schema, and the user has not asked for one.

## Examples

**Prompt**

```
Give me a JSON Schema for the invoices table so our API can validate a payload.
```

**Answered in one message, no intake needed** - the field list was already confirmed:

```
Read skills/invoices-billing/SKILL.md for the field list, then emit the draft 2020-12
object schema with those properties in that order, `required` carrying only the fields the
module marks required, and `additionalProperties: false` only if the payload is closed.
```

**Prompt**

```
The API rejected a payload because Amount was a string.
```

**Fix only** - one rule, no rewrite:

> `Amount` is `number` in the schema, so `"1250.50"` fails. Send it unquoted. The same
> applies to every numeric field, and dates stay ISO strings in `format: date`.

**Documented shape** - a strict schema over a confirmed field list. The properties below
are a documentation example: emit the real field list, not this one.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Invoice Register",
  "type": "object",
  "additionalProperties": false,
  "properties": {
      "Invoice ID": { "type": "string" },
      "Client": { "type": "string" },
      "Invoice Date": { "type": "string", "format": "date" },
      "Total": { "type": "number" },
      "Status": { "type": "string", "enum": ["Draft", "Sent", "Paid", "Overdue"] }
  },
  "required": ["Client", "Total", "Status"]
}
```


See the [Best Practices](references/best-practices.md) reference for the full guidance.

## Limitations

- It validates structure. It does not check a value against a database, confirm that a
  client exists, or compute anything.
- A schema is only as good as the field list behind it, and it cannot repair a list that
  was never confirmed.
- Formats such as `date` and `email` are annotations: many validators treat them as
  advisory, so a payload that validates may still be wrong.
- No versioning, no publication, no registry, and no CI wiring. That is the consuming
  system's job.
- Cross-field rules - a due date after an invoice date, a total equal to a sum - are not
  expressible here and are not checked.
- Nothing is verified until the user validates a real payload against it.


See the [Security & Safety Notes](references/security-safety-notes.md) reference for the full guidance.

