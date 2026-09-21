---
name: apify-generate-output-schema
description: Generate output schemas (dataset_schema.json, output_schema.json, key_value_store_schema.json)
  for an Apify Actor by analyzing its source code. Use when creating or updating Actor
  output schemas.
source_repo: apify/agent-skills
source_type: official
source: apify
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Generate Actor output schema

You are generating output schema files for an Apify Actor. The output schema tells Apify Console how to display run results. You will analyze the Actor's source code, create `dataset_schema.json`, `output_schema.json`, and `key_value_store_schema.json` (if the Actor uses key-value store), and update `actor.json`.

## Core principles

- **Analyze code first**: Read the Actor's source to understand what data it actually pushes to the dataset — never guess
- **Every field is nullable**: APIs and websites are unpredictable — always set `"nullable": true`
- **Anonymize examples**: Never use real user IDs, usernames, or personal data in examples
- **Verify against code**: If TypeScript types exist, cross-check the schema against both the type definition AND the code that produces the values
- **Reuse existing patterns**: Before generating schemas, check if other Actors in the same repository already have output schemas — match their structure, naming conventions, description style, and formatting
- **Don't reinvent the wheel**: Reuse existing type definitions, interfaces, and utilities from the codebase instead of creating duplicate definitions

---

## Phase 1: Discover Actor structure

**Goal**: Locate the Actor and understand its output

Initial request: $ARGUMENTS

**Actions**:
1. Create todo list with all phases
2. Find the `.actor/` directory containing `actor.json`
3. Read `actor.json` to understand the Actor's configuration
4. Check if `dataset_schema.json`, `output_schema.json`, and `key_value_store_schema.json` already exist
5. **Search for existing schemas in the repository**: Look for other `.actor/` directories or schema files (e.g., `**/dataset_schema.json`, `**/output_schema.json`, `**/key_value_store_schema.json`) to learn the repo's conventions — match their description style, field naming, example formatting, and overall structure
6. Find all places where data is pushed to the dataset:
   - **JavaScript/TypeScript**: Search for `Actor.pushData(`, `dataset.pushData(`, `Dataset.pushData(`
   - **Python**: Search for `Actor.push_data(`, `dataset.push_data(`, `Dataset.push_data(`
7. Find all places where data is stored in the key-value store:
   - **JavaScript/TypeScript**: Search for `Actor.setValue(`, `keyValueStore.setValue(`, `KeyValueStore.setValue(`
   - **Python**: Search for `Actor.set_value(`, `key_value_store.set_value(`, `KeyValueStore.set_value(`
8. Find output type definitions — **reuse them directly** instead of recreating from scratch:
   - **TypeScript**: Look for output type interfaces/types (e.g., in `src/types/`, `src/types/output.ts`). If an interface or type already defines the output shape, derive the schema fields from it — do not create a parallel definition
   - **Python**: Look for TypedDict, dataclass, or Pydantic model definitions. Use the existing field names, types, and docstrings as the source of truth
9. Check for existing shared schema utilities or helper functions in the codebase that handle schema generation or validation — reuse them rather than creating new logic
10. If inline `storages.dataset` or `storages.keyValueStore` config exists in `actor.json`, note it for migration

Present findings to user: list all discovered dataset output fields, key-value store keys, their types, and where they come from.

---

## Phase 2: Generate `dataset_schema.json`

**Goal**: Create a complete dataset schema with field definitions and display views

### File structure

```json
{
    "actorSpecification": 1,
    "fields": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {
            // ALL output fields here — every field the Actor can produce,
            // not just the ones shown in the overview view
        },
        "required": [],
        "additionalProperties": true
    },
    "views": {
        "overview": {
            "title": "Overview",
            "description": "Most important fields at a glance",
            "transformation": {
                "fields": [
                    // 8-12 most important field names
                ]
            },
            "display": {
                "component": "table",
                "properties": {
                    // Display config for each overview field
                }
            }
        }
    }
}
```

### Consistency with existing schemas

If existing output schemas were found in the repository during Phase 1 (step 5), follow their conventions:
- Match the **description writing style** (sentence case vs. lowercase, period vs. no period, etc.)
- Match the **field naming convention** (camelCase vs. snake_case) — this must also match the actual keys produced by the Actor code
- Match the **example value style** (e.g., date formats, URL patterns, placeholder names)
- Match the **view structure** (number of fields in overview, display format choices)
- Match the **JSON formatting** (indentation, property ordering, spacing) — all schemas in the same repository must use identical formatting, including standalone Actors

When the Actor code already has well-defined TypeScript interfaces or Python type classes, derive fields directly from those types rather than re-analyzing pushData/push_data calls from scratch. The type definition is the canonical source.

### Hard rules (no exceptions)

| Rule | Detail |
|------|--------|
| **All fields in `properties`** | The `fields.properties` object must contain **every** field the Actor can output, not just the fields shown in the overview view. The views section selects a subset for display — the `properties` section must be the complete superset |
| `"nullable": true` | On **every** field — APIs are unpredictable |
| `"additionalProperties": true` | On the **top-level `fields` object** AND on **every nested object** within `properties`. This is the most commonly missed rule — it must appear at both levels |
| `"required": []` | Always empty array — on the **top-level `fields` object** AND on **every nested object** within `properties` |
| Anonymized examples | No real user IDs, usernames, or content |
| `"type"` required with `"nullable"` | AJV rejects `nullable` without a `type` on the same field |

> **Warning — most common mistakes**:
> 1. Only including fields that appear in the overview view. The `fields.properties` must list ALL output fields, even if they are not in the `views` section.
> 2. Only adding `"required": []` and `"additionalProperties": true` on nested object-type properties but forgetting them on the top-level `fields` object. Both levels need them.

> **Note**: `nullable` is an Apify-specific extension to JSON Schema draft-07. It is intentional and correct.

### Field type patterns

**String field:**
```json
"title": {
    "type": "string",
    "description": "Title of the scraped item",
    "nullable": true,
    "example": "Example Item Title"
}
```

**Number field:**
```json
"viewCount": {
    "type": "number",
    "description": "Number of views",
    "nullable": true,
    "example": 15000
}
```

**Boolean field:**
```json
"isVerified": {
    "type": "boolean",
    "description": "Whether the account is verified",
    "nullable": true,
    "example": true
}
```

**Array field:**
```json
"hashtags": {
    "type": "array",
    "description": "Hashtags associated with the item",
    "items": { "type": "string" },
    "nullable": true,
    "example": ["#example", "#demo"]
}
```

**Nested object field:**
```json
"authorInfo": {
    "type": "object",
    "description": "Information about the author",
    "properties": {
        "name": { "type": "string", "nullable": true },
        "url": { "type": "string", "nullable": true }
    },
    "required": [],
    "additionalProperties": true,
    "nullable": true,
    "example": { "name": "Example Author", "url": "https://example.com/author" }
}
```

**Enum field:**
```json
"contentType": {
    "type": "string",
    "description": "Type of content",
    "enum": ["article", "video", "image"],
    "nullable": true,
    "example": "article"
}
```

**Union type (e.g., TypeScript `ObjectType | string`):**
```json
"metadata": {
    "type": ["object", "string"],
    "description": "Structured metadata object, or error string if unavailable",
    "nullable": true,
    "example": { "key": "value" }
}
```

### Anonymized example values

Use realistic but generic values. Follow platform ID format conventions:

| Field type | Example approach |
|---|---|
| IDs | Match platform format and length (e.g., 11 chars for YouTube video IDs) |
| Usernames | `"exampleuser"`, `"sampleuser123"` |
| Display names | `"Example Channel"`, `"Sample Author"` |
| URLs | Use platform's standard URL format with fake IDs |
| Dates | `"2025-01-15T12:00:00.000Z"` (ISO 8601) |
| Text content | Generic descriptive text, e.g., `"This is an example description."` |

### Views section

- `transformation.fields`: List 8–12 most important field names (order = column order in UI)
- `display.properties`: One entry per overview field with `label` and `format`
- Available formats: `"text"`, `"number"`, `"date"`, `"link"`, `"boolean"`, `"image"`, `"array"`, `"object"`

Pick fields that give users the most useful at-a-glance summary of the data.

---

## Phase 3: Generate `key_value_store_schema.json` (if applicable)

**Goal**: Define key-value store collections if the Actor stores data in the key-value store

> **Skip this phase** if no `Actor.setValue()` / `Actor.set_value()` calls were found in Phase 1 (beyond the default `INPUT` key).

### File structure

```json
{
    "actorKeyValueStoreSchemaVersion": 1,
    "title": "<Descriptive title — what the key-value store contains>",
    "description": "<One sentence describing the stored data>",
    "collections": {
        "<collectionName>": {
            "title": "<Human-readable title>",
            "description": "<What this collection contains>",
            "keyPrefix": "<prefix->"
        }
    }
}
```

### How to identify collections

Group the discovered `setValue` / `set_value` calls by key pattern:

1. **Fixed keys** (e.g., `"RESULTS"`, `"summary"`) — use `"key"` (exact match)
2. **Dynamic keys with a prefix** (e.g., `"screenshot-${id}"`, `f"image-{name}"`) — use `"keyPrefix"`

Each group becomes a collection.

### Collection properties

| Property | Required | Description |
|----------|----------|-------------|
| `title` | Yes | Shown in UI tabs |
| `description` | No | Shown in UI tooltips |
| `key` | Conditional | Exact key for single-key collections (use `key` OR `keyPrefix`, not both) |
| `keyPrefix` | Conditional | Prefix for multi-key collections (use `key` OR `keyPrefix`, not both) |
| `contentTypes` | No | Restrict allowed MIME types (e.g., `["image/jpeg"]`, `["application/json"]`) |
| `jsonSchema` | No | JSON Schema draft-07 for validating `application/json` content |

### Examples

**Single file output (e.g., a report):**
```json
{
    "actorKeyValueStoreSchemaVersion": 1,
    "title": "Analysis Results",
    "description": "Key-value store containing analysis output",
    "collections": {
        "report": {
            "title": "Report",
            "description": "Final analysis report",
            "key": "REPORT",
            "contentTypes": ["application/json"]
        }
    }
}
```

**Multiple files with prefix (e.g., screenshots):**
```json
{
    "actorKeyValueStoreSchemaVersion": 1,
    "title": "Scraped Files",
    "description": "Key-value store containing downloaded files and screenshots",
    "collections": {
        "screenshots": {
            "title": "Screenshots",
            "description": "Page screenshots captured during scraping",
            "keyPrefix": "screenshot-",
            "contentTypes": ["image/png", "image/jpeg"]
        },
        "documents": {
            "title": "Documents",
            "description": "Downloaded document files",
            "keyPrefix": "doc-",
            "contentTypes": ["application/pdf", "text/html"]
        }
    }
}
```

---

## Phase 4: Generate `output_schema.json`

**Goal**: Create the output schema that tells Apify Console where to find results

For most Actors that push data to a dataset, this is a minimal file:

```json
{
    "actorOutputSchemaVersion": 1,
    "title": "<Descriptive title — what the Actor returns>",
    "description": "<One sentence describing the output data>",
    "properties": {
        "dataset": {
            "type": "string",
            "title": "Results",
            "description": "Dataset containing all scraped data",
            "template": "{{links.apiDefaultDatasetUrl}}/items"
        }
    }
}
```

> **Critical**: Each property entry **must** include `"type": "string"` — this is an Apify-specific convention. The Apify meta-validator rejects properties without it (and rejects `"type": "object"` — only `"string"` is valid here).

If `key_value_store_schema.json` was generated in Phase 3, add a second property:
```json
"files": {
    "type": "string",
    "title": "Files",
    "description": "Key-value store containing downloaded files",
    "template": "{{links.apiDefaultKeyValueStoreUrl}}/keys"
}
```

### Available template variables

- `{{links.apiDefaultDatasetUrl}}` — API URL of default dataset
- `{{links.apiDefaultKeyValueStoreUrl}}` — API URL of default key-value store
- `{{links.publicRunUrl}}` — Public run URL
- `{{links.consoleRunUrl}}` — Console run URL
- `{{links.apiRunUrl}}` — API run URL
- `{{links.containerRunUrl}}` — URL of webserver running inside the run
- `{{run.defaultDatasetId}}` — ID of the default dataset
- `{{run.defaultKeyValueStoreId}}` — ID of the default key-value store

---

## Phase 5: Update `actor.json`

**Goal**: Wire the schema files into the Actor configuration

**Actions**:
1. Read the current `actor.json`
2. Add or update the `storages.dataset` reference:
   ```json
   "storages": {
       "dataset": "./dataset_schema.json"
   }
   ```
3. If `key_value_store_schema.json` was generated, add the reference:
   ```json
   "storages": {
       "dataset": "./dataset_schema.json",
       "keyValueStore": "./key_value_store_schema.json"
   }
   ```
4. Add or update the `output` reference:
   ```json
   "output": "./output_schema.json"
   ```
5. If `actor.json` had inline `storages.dataset` or `storages.keyValueStore` objects (not string paths), migrate their content into the respective schema files and replace the inline objects with file path strings

---

## Phase 6: Review and validate

**Goal**: Ensure correctness and completeness

**Checklist**:
- [ ] **Every** output field from the source code is in `dataset_schema.json` `fields.properties` — not just the overview view fields but ALL fields the Actor can produce
- [ ] Every field has `"nullable": true`
- [ ] The **top-level `fields` object** has both `"additionalProperties": true` and `"required": []`
- [ ] Every **nested object** within `properties` also has `"additionalProperties": true` and `"required": []`
- [ ] Every field has a `"description"` and an `"example"`
- [ ] All example values are anonymized
- [ ] `"type"` is present on every field that has `"nullable"`
- [ ] Views list 8–12 most useful fields with correct display formats
- [ ] `output_schema.json` has `"type": "string"` on every property
- [ ] If key-value store is used: `key_value_store_schema.json` has collections matching all `setValue`/`set_value` calls
- [ ] If key-value store is used: each collection uses either `key` or `keyPrefix` (not both)
- [ ] `actor.json` references all generated schema files
- [ ] Schema field names match the actual keys in the code (camelCase/snake_case consistency)
- [ ] If existing schemas were found in the repo, the new schema follows their conventions (description style, example format, view structure)
- [ ] Schema fields are derived from existing type definitions (interfaces, TypedDicts, dataclasses) where available — no duplicated or divergent field definitions

Present the generated schemas to the user for review before writing them.

---

## Phase 7: Summary

**Goal**: Document what was created

Report:
- Files created or updated
- Number of fields in the dataset schema
- Number of collections in the key-value store schema (if generated)
- Fields selected for the overview view
- Any fields that need user clarification (ambiguous types, unclear nullability)
- Suggested next steps (test locally with `apify run --user-agent apify-agent-skills/apify-generate-output-schema`, verify output tab in Console)


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
