---
name: design-how-component-docs
description: Write one component entry from implementation, stories and real call sites, including states, behavior and usage constraints.
license: MIT
metadata:
  aas-category: design
  aas-risk: critical
  aas-source: https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/component-docs
  aas-source-repo: arla6ka/design.how
  aas-source-type: community
  aas-license-source: https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE
  aas-author: Arlan Marat
  aas-date-added: '2026-11-19'
---

# Document a Design-System Component

## When to Use

Use for one existing component whose consumers need a dependable entry. Read its public types, implementation, stories, tests and representative call sites.

## Workflow

1. Identify the canonical import, variants, props, required labels or slots, defaults and supported environments. Compare docs with code and list disagreements as questions for the component owner.
2. For each important state, name how it is reached, what renders, what events fire and which keys or focus transitions matter. Include only states the implementation supports. Map any meaningful layout or theme dependency.
3. Write one minimal example and one real-world composition based on actual APIs. Use the project's documentation conventions. Include when to use the component, when to choose another, accessibility obligations and usage pitfalls.
4. Check the examples against local stories or tests and point to the code that backs the claims. If the request is a draft, return the entry without editing the repo. For a requested update, write only the relevant documentation entry.

## Example

“Document our Toast.” Check durations and pause behavior in its code, confirm which notifications use live regions, and show a dismissal example with the actual callback.

## Limitations

Covers a single component. Missing examples, tests or behavior stay visible as gaps. Component fixes require a separately scoped implementation change.

## Bundled resources

Use the bundled [component-entry format](references/doc-format.md) for the anatomy, usage and behavior table.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/component-docs) by Arlan Marat. See [MIT license](LICENSE).
