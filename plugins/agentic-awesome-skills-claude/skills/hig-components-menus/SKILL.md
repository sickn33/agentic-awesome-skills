---
name: hig-components-menus
description: "Check for .claude/apple-design-context.md before asking questions. Use existing context and only ask for information not already covered."
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: Menus and Buttons

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

1. **Menus should be contextual and predictable.** Standard items in standard locations. Follow platform conventions for ordering and grouping.

2. **Use standard button styles.** System-defined styles communicate affordance and maintain visual consistency. Prefer them over custom designs.

3. **Toolbars for frequent actions.** Most commonly used commands in the toolbar. Rarely used actions belong in menus.

4. **Menu bar is the primary command interface on macOS.** Every command reachable from the menu bar. Toolbars and context menus supplement, not replace.

5. **Context menus for secondary actions.** Right-click or long-press, relevant to the item under the pointer. Never put a command only in a context menu.

6. **Pop-up buttons for mutually exclusive choices.** Select exactly one option from a set.

7. **Pull-down buttons for action lists.** No current selection; they offer a set of commands.

8. **Action buttons consolidate related actions** behind a single icon in toolbars or title bars.

9. **Disclosure controls for progressive disclosure.** Show or hide additional content.

10. **Dock menus: short and focused** on the most useful actions when the app is running.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [menus.md](references/menus.md) | General menu design | Item ordering, grouping, shortcuts |
| [context-menus.md](references/context-menus.md) | Context menus | Right-click, long press, secondary actions |
| [dock-menus.md](references/dock-menus.md) | Dock menus | macOS app-level actions, running state |
| [edit-menus.md](references/edit-menus.md) | Edit menus | Undo, copy, paste, standard items |
| [the-menu-bar.md](references/the-menu-bar.md) | Menu bar | macOS primary command interface, structure |
| [toolbars.md](references/toolbars.md) | Toolbars | Frequent actions, customization, placement |
| [buttons.md](references/buttons.md) | Buttons | System styles, sizing, affordance |
| [action-button.md](references/action-button.md) | Action button | Grouped secondary actions, toolbar use |
| [pop-up-buttons.md](references/pop-up-buttons.md) | Pop-up buttons | Mutually exclusive choice selection |
| [pull-down-buttons.md](references/pull-down-buttons.md) | Pull-down buttons | Action lists, no current selection |
| [disclosure-controls.md](references/disclosure-controls.md) | Disclosure controls | Progressive disclosure, show/hide |

## Output Format

1. **Component recommendation** -- which menu or button type and why.
2. **Visual hierarchy** -- placement, sizing, grouping within the interface.
3. **Platform-specific behavior** across iOS, iPadOS, macOS, visionOS.
4. **Keyboard shortcuts** (macOS) -- standard and custom shortcuts for menu items and toolbar actions.

## Questions to Ask

1. Which platforms?
2. Primary or secondary action?
3. How many actions need to be available?
4. macOS menu bar app?

## Related Skills

- **hig-components-search** -- Search fields, page controls alongside toolbars and menus
- **hig-components-controls** -- Toggles, pickers, segmented controls complementing buttons
- **hig-components-dialogs** -- Alerts, sheets, popovers triggered by menu items or buttons
- **hig-inputs** -- Keyboard shortcuts and pointer interactions with menus and toolbars

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
