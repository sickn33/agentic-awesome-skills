---
name: hig-components-dialogs
description: Apple HIG guidance for presentation components including alerts, action sheets, popovers, sheets, and digit entry views.
risk: none
source: community
date_added: '2026-02-27'
---

# Apple HIG: Presentation Components

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

1. **Alerts: sparingly, for critical situations.** Errors needing attention, destructive action confirmations, or information requiring acknowledgment. They interrupt flow and demand a response.

2. **Sheets: focused tasks that maintain context.** Presentation varies by platform. Prefer a window, full-screen flow or other suitable presentation for complex or prolonged work; iOS and iPadOS also support nonmodal sheets.

3. **Popovers: transient contextual content.** Anchor them to the trigger in wide layouts; dismissal and modality depend on platform and configuration. Preserve edits when automatically dismissing a nonmodal popover. Adapt compact layouts to a suitable sheet.

4. **Action sheets: choosing among actions.** Present when picking from multiple actions, especially if one is destructive. iPhone: slide up from bottom. iPad: appear as popovers.

5. **Minimize interruptions.** Before reaching for a modal, consider inline presentation or making the action undoable instead.

6. **Concise, actionable alert text.** Short descriptive title. Brief message body if needed. Button labels should be specific verbs ("Delete", "Save"), not "OK".

7. **Mark destructive actions according to the component.** Action sheets place destructive choices prominently at the top. Alerts distinguish an unexpected destructive choice from confirmation of an explicitly initiated destructive action; follow the platform default and Cancel behavior in the alert reference.

8. **Provide a cancel option** for alerts and action sheets with multiple actions. On action sheets, cancel appears at the bottom, separated.

9. **Digit entry views: tvOS-specific.** The bundled reference describes `TVDigitEntryViewController`, not a cross-platform OTP component. Use secure digit fields for sensitive values. For other platforms, design and test a suitable accessible text-input flow, including paste and autofill where supported.

10. **Adapt presentation to platform.** The same interaction may use different components on iPhone, iPad, Mac, and visionOS.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [alerts.md](references/alerts.md) | Alerts | Button ordering, title/message text, confirmation, destructive actions |
| [action-sheets.md](references/action-sheets.md) | Action sheets | Multiple actions, cancel option, destructive handling |
| [popovers.md](references/popovers.md) | Popovers | Non-modal, dismiss on tap outside, iPad/Mac |
| [sheets.md](references/sheets.md) | Sheets | Modal task, context preservation |
| [digit-entry-views.md](references/digit-entry-views.md) | Digit entry | PIN input, autofill, auto-advance |

## Output Format

1. **Recommended presentation type with rationale** and why alternatives are less suitable.
2. **Content guidelines** -- title, message, button labels per Apple's tone and brevity rules.
3. **Dismiss behavior** -- how the user dismisses and what happens (save, discard, cancel).
4. **Alternatives** -- when the scenario might not need a modal at all (inline feedback, undo, progressive disclosure).

## Questions to Ask

1. What information or action does the presentation need?
2. Blocking or non-blocking?
3. Which platforms?
4. How often does this appear?

## Related Skills

- **hig-components-menus** -- Buttons and toolbar items triggering presentations
- **hig-components-controls** -- Input controls within sheets and popovers
- **hig-components-search** -- Search and navigation within presented views
- **hig-patterns** -- Modality, interruptions, user flow management
- **hig-foundations** -- Color, typography, layout for presentation components

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
Use when choosing Apple presentation components or reviewing their dismissal, destructive-action and platform behavior.

## Example

**User request:**

> Review an iPad note-formatting panel: recommend a nonmodal presentation, preserve edits on outside dismissal, and describe compact-width adaptation and VoiceOver checks.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
