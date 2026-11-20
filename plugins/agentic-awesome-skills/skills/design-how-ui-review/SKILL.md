---
name: "design-how-ui-review"
description: "Review a rendered screen or flow and rank reproducible usability, accessibility and responsive defects with evidence."
category: "design"
risk: "safe"
source: "https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/ui-review"
source_repo: "arla6ka/design.how"
source_type: "community"
license: "MIT"
license_source: "https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE"
author: "Arlan Marat"
date_added: "2026-11-19"
---

# Review a Design-System Screen

## When to Use

Use for a screen, prototype or short flow that needs a pre-ship review. For token compliance use `design-how-token-mapping`. This review grounds each finding in the rendered experience or explicitly labels an inference.

## Workflow

1. Record the route, tested build, device width, theme, and state. Ask for fixture data only if a material state cannot be reproduced safely. Start with narrow and wide supported widths.
2. Walk the primary action and recovery path. Check for clipped controls, unclear status, scrolling and resizing, loading and error recovery. On a running fixture, test Tab, Shift-Tab, activation and Escape where applicable. Observe focus visibility and return, accessible names, roles and announcements.
3. Rank issues by impact: blocked completion, major friction, or minor defect. For each include location, steps, expected behavior, observed behavior, evidence and a targeted fix. Cite viewport and state for screenshots or measurements.
4. If you only have screenshots, provide visual findings and list which interactions and assistive-technology checks remain unverified.

## Example

“Review the invite dialog on mobile.” Open the local fixture at 390 px, tab through it, submit invalid data if backed by a disposable fixture, and report clipping and focus problems in priority order.

## Limitations

A scoped audit gives no accessibility certification. Stay read-only on real accounts. Use a test environment for write paths, and keep captured private data out of the report.

## Bundled resources

Use the [bundled review criteria](references/criteria.md) for the visual, interaction, accessibility and responsive checks.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/ui-review) by Arlan Marat. See [MIT license](LICENSE).
