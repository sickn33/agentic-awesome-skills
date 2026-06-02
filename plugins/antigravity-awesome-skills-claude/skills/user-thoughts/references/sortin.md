# Sortin and Resort Algorithms

This document describes how raw thoughts become organized mdbase records.

## Commands

| Command | Behavior |
|---|---|
| `/ustht sortin` | Soft maintenance: append new raw entries into mdbase without restructuring existing content. |
| `/ustht resort` | Hard maintenance: review all mdbase content, deduplicate, reclassify, merge, and update indexes. |
| `--dry` | Preview intended changes without writing. |

## Raw Format

Before processing:

```text
- [14:30] Make buttons use 8px radius | suggested-dim:ui/details
- [14:45] Login should use a dark theme | suggested-dim:ui/outline
- [15:10] Use REST APIs, not GraphQL | suggested-dim:dev-stack
```

After processing, the first line of the file becomes:

```text
<!-- processed -->
```

## Soft Append Format

A raw entry is appended under a date heading in the selected dimension file:

```markdown
## 2026-06-01

- Make buttons use 8px radius
```

Rules:

- Preserve original wording.
- Remove only the timestamp and `suggested-dim` suffix.
- Group entries by raw-file date.
- Append to an existing date section when present.
- Create a new date section when needed.

## Dimension Management

Create a new dimension only when the thought does not fit an existing dimension. Dimension names must be kebab-case path segments and must pass safety validation.

When `resort` finds overlapping dimensions, merge them into the clearest target and preserve provenance. When a dimension is no longer useful, mark it with `<!-- deprecated -->` instead of deleting it.

## Classification Priority

1. User-specified dimension.
2. Exact existing dimension match.
3. Closest semantic existing dimension, with a note if the fit is weak.
4. `general.md` fallback.

## Import Algorithm

`/ustht import <path>` scans markdown files under a safe project-local path and extracts project-relevant user decisions, constraints, and requirements. It should not modify source files. Imported entries should include source provenance such as `[source:docs/design.md]`.

Skip ordinary technical docs, generated docs, API reference text, and code comments unless they clearly encode a user decision.

## Summary Output

After `sortin`, report the number of processed entries and destination dimensions, for example:

```text
Soft maintenance complete. Processed 3 thoughts:
  -> ui/details.md: +1
  -> ui/outline.md: +1
  -> dev-stack.md: +1
LAST_SORTIN updated to 2026-06-01 15:30
```
