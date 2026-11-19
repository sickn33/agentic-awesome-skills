---
name: "design-how-design-system-boss"
description: "Route a whole-app UI consistency request to a design-system build or adoption audit, then verify a representative flow."
category: "design"
risk: "critical"
source: "https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/design-system-boss"
source_repo: "arla6ka/design.how"
source_type: "community"
license: "MIT"
license_source: "https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE"
author: "Arlan Marat"
date_added: "2026-11-19"
---

# Design System Boss

## When to Use

Use when an existing app has broad UI drift and the user has not named a single screen, component, or migration. Read the project's design rules, route tree, available primitives and recent complaints before picking a route.

| Evidence | Route |
| --- | --- |
| Named screen or flow | `design-how-ui-review` |
| One named component | `design-how-component-docs` |
| Raw styling inventory | `design-how-token-mapping` |
| Missing tokens or primitives | `design-how-build-design-system` |
| System exists, adoption is unclear | `design-how-migrate-design-system` in audit mode |
| Explicit request to move screens onto an existing system | `design-how-migrate-design-system` in rollout mode |

## Workflow

1. State the complaint, the representative flow, the current system and the acceptance checks. Respect the installed system as the source for tokens and primitives. When none exists, preserve the product's current design direction by default.
2. Pick one route. For a build, inventory current values and states, establish tokens and a first component family, then verify one pilot. For migration, check readiness before touching consumers. If the sibling skill is unavailable, describe the missing workflow and complete only the scoped inventory or review the available evidence supports.
3. Begin with the smallest change that answers the complaint. Use a separate branch or worktree for isolated implementation when needed. Preserve unrelated edits. Keep working notes in the agreed workspace and use local fixtures for visual and behavioral checks.
4. Report what changed, the evidence gathered, skipped checks and any remaining work in priority order. Ask for rollout scope before moving beyond the approved pilot.

## Example

“Buttons and fields look inconsistent across our billing app.” Identify the current primitives and their variants, select a billing flow with a form error, and route to a system build or an adoption audit depending on what exists.

## Limitations

Requires an existing UI. A broad cleanup request carries no permission for a whole-app migration, external pushes or deployment.

## Bundled resources

Read a bundled playbook before routing: [build](playbooks/build.md), [migrate](playbooks/migrate.md), [component](playbooks/component.md), or [review](playbooks/review.md). Playbooks refer to the AAS sibling IDs installed with the Design.how pack. For shared definitions and taste settings, use the copies shipped with `design-how-build-design-system`. Use delegation only when the current host and user authorize it.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/design-system-boss) by Arlan Marat. See [MIT license](LICENSE).
