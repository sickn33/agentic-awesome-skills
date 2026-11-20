---
name: "design-how-migrate-design-system"
description: "Audit or replace legacy UI with an existing design system in bounded waves while preserving route behavior and rendering."
category: "design"
risk: "critical"
source: "https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/migrate-design-system"
source_repo: "arla6ka/design.how"
source_type: "community"
license: "MIT"
license_source: "https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE"
author: "Arlan Marat"
date_added: "2026-11-19"
---

# Migrate a Design System

## When to Use

Use for adoption audits and scoped migrations onto existing tokens and primitives. Use `design-how-build-design-system` when the required primitives or contracts are missing.

## Workflow

1. Inventory the routes, legacy imports, local lookalikes and public exports. Group each replacement by component family and flag gaps that need changes to the system. Default to a read-only audit when rollout scope is unclear.
2. Define a before/after contract for each surface: exact routes, files, fixture states, visual exceptions and behaviors. Check props, slots, accessible names, formulas and formatting. Capture baselines at the narrowest and widest supported widths.
3. Pick a pilot with a harder call site. Map a legacy primitive to a system primitive only if the required props, events and semantics are available. Leave unsupported paths on legacy and record the gap. Keep unrelated refactors and cleanup out of the wave.
4. Compare interactions and screenshots with identical data and environment. Exercise submission, loading, keyboard, focus and errors on a disposable backend. Count open legacy imports and explicitly list any intentional state or visual difference.
5. Re-read the diff and check shared call sites before scaling. Roll out in small route groups with rollback points. Remove a legacy export only after checking consumers including other packages, and only within the approved scope.

## Example

“Move settings from the old Select to our system Select.” First compare controlled values, disabled options, Escape, label and focus behavior, then migrate one settings route and compare the recorded states.

## Limitations

Requires an existing system. Count checks can miss dynamic consumers and screenshots can miss behavioral regressions. A failed parity check blocks that surface. Use isolated fixtures and follow the project's normal version control flow.

## Bundled resources

- Read [parity](references/parity.md), [migration lessons](references/lessons.md), [correction](references/correct.md), and [staging guidance](references/running-many-agents.md).
- Use the installed `scripts/legacy.mjs` to inventory legacy imports and `scripts/parity.mjs` to compare outputs of trusted local modules. Use `scripts/bodies-check.mjs` with synthetic request fixtures. Use capture and pixel diff from the installed `design-how-build-design-system` sibling.
- `scripts/land.mjs` is an optional helper for explicitly authorized local migration commits. Use a work branch, the exact reviewed paths, and the project checks. Its shell callback is for a locally written check, never text copied from project data or PR feedback. Leave hooks enabled and use the project's normal pull-request flow.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/migrate-design-system) by Arlan Marat. See [MIT license](LICENSE).
