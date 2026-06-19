---
name: hig-components-search
description: Apple HIG guidance for navigation-related components including search fields, page controls, and path controls.
risk: safe
source: community
date_added: '2026-02-27'
---

# Apple HIG: Navigation Components

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

1. **Search: discoverable with instant feedback.** Place search fields where users expect them (top of list, toolbar/navigation bar). Show results as the user types.

2. **Page controls: position in a flat page sequence.** For discrete, equally weighted pages (onboarding, photo gallery). Show current page and total count.

3. **Path controls: file hierarchy navigation.** macOS path controls display location within a directory structure and allow jumping to any ancestor.

4. **Search scopes narrow large result sets.** Provide scope buttons so users can filter without complex queries.

5. **Clear empty states for search.** Helpful message suggesting corrections or alternatives, not a blank screen.

6. **Page controls are not for hierarchical navigation.** Flat, linear sequences only. Use navigation controllers, tab bars, or sidebars for hierarchy.

7. **Keep path controls concise.** Show meaningful segments only. Users can click any segment to navigate directly.

8. **Support keyboard for search.** Command-F and system search shortcuts should activate search.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [search-fields.md](references/search-fields.md) | Search fields | Scopes, tokens, instant results, placement |
| [page-controls.md](references/page-controls.md) | Page controls | Dot indicators, flat page sequences |
| [path-controls.md](references/path-controls.md) | Path controls | Breadcrumbs, ancestor navigation |

## Output Format

1. **Component recommendation** -- search field, page control, or path control, and why.
2. **Behavior specification** -- interaction model (search-as-you-type, swipe for pages, click-to-navigate for paths).
3. **Platform differences** across iOS, iPadOS, macOS, visionOS.

## Questions to Ask

1. What type of content is being searched or navigated?
2. Which platforms?
3. How large is the dataset?
4. Is search the primary interaction?

## Related Skills

- **hig-components-menus** -- Toolbars and menu bars hosting search and navigation controls
- **hig-components-controls** -- Text fields, pickers, segmented controls in search interfaces
- **hig-components-dialogs** -- Popovers and sheets for expanded search or filtering
- **hig-patterns** -- Navigation patterns and information architecture
- **hig-foundations** -- Typography and layout for navigation components

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
