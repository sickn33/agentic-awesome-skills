---
name: "design-how-build-design-system"
description: "Extract semantic tokens and reusable components from an existing app, check behavior and visual parity, and validate one pilot flow."
category: "design"
risk: "critical"
source: "https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/build-design-system"
source_repo: "arla6ka/design.how"
source_type: "community"
license: "MIT"
license_source: "https://github.com/arla6ka/design.how/blob/1ce5304466db2ba47a7a7524603e86df77c702bd/LICENSE"
author: "Arlan Marat"
date_added: "2026-11-19"
---

# Build a Design System

## When to Use

Use when an existing app needs tokens, component contracts, or a first design-system pilot. Use `design-how-migrate-design-system` to adopt an existing system across consumers.

## Workflow

1. Inventory routes, raw values, component families, and width, theme and state combinations. Capture a representative flow before edits. Use local fixture data, recording empty, loading, error, disabled and long-text states when present.
2. Group raw values by purpose rather than by hex or pixel count. Pair semantic foreground and surface roles. Use `design-how-token-mapping` or a manual mapping table. Record intentional exceptions and test contrast before consolidating visually similar values.
3. Build the most-used family first. Preserve public APIs or document migration gaps, including labels, slots, keyboard behavior, disabled semantics and error feedback. Add a showcase with realistic content and document the component with `design-how-component-docs` or a local story.
4. Add a targeted lint rule or test with one deliberate failing fixture and a passing case. Baseline existing violations where necessary and require new code to avoid adding them.
5. Move the pilot flow, then compare the same widths, themes and fixture states. Review unexplained visual differences and test keyboard navigation and the hardest call site. Before handing off, report prop gaps, event differences, missing tone combinations and changed accessible names.

## Example

“Replace hardcoded foreground and surface colors in checkout with semantic tokens.” Inventory their uses by role, map them to paired tokens, swap the values and compare checkout screenshots and contrast in both themes.

## Limitations

A screenshot checks a rendered state. It cannot establish event or accessibility parity by itself. Use the app's own tools and disposable fixtures. Confirm scope before deleting public exports or rolling the system out widely.

## Bundled resources

Resolve `SKILL_DIR` to the directory of this installed skill, independent of the project working directory.

- Use [tokens](references/tokens.md), [components](references/components.md), [glossary](references/glossary.md), [taste](references/taste.md), and [traps](references/traps.md) for inventory and design decisions.
- Run `node "$SKILL_DIR/scripts/check-system.mjs" --self-test` for the bundled checker fixtures. Use `--help` for scanning the target project and configuring rules. If installing the checker into the target repository, copy it together with its `oklch.mjs` dependency. The checker matches JSX names literally and keeps pipes and backslashes in reported values inside their Markdown table cells.
- Use `scripts/capture.mjs` and `scripts/pixdiff.mjs` for before/after images. Use Node and Playwright with a supported Chromium or Chrome. Read the help and use disposable local fixtures with the bundled guard. Never name a real write endpoint as a read procedure. Select a writable output directory in the project workspace.

## Source

Adapted from [design.how](https://github.com/arla6ka/design.how/tree/1ce5304466db2ba47a7a7524603e86df77c702bd/skills/build-design-system) by Arlan Marat. See [MIT license](LICENSE).
