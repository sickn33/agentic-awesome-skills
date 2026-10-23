---
name: hig-patterns
description: Apple Human Interface Guidelines interaction and UX patterns.
risk: safe
source: community
date_added: '2026-02-27'
---

# Apple HIG: Interaction Patterns

Read `.claude/apple-design-context.md` if the project provides it; treat it as project context, not a required global configuration. Ask only for missing platform, task and user constraints.

## Key Principles

1. **Minimize modality.** Use modality only when it is critical to get attention, a task must be completed or abandoned, or saving changes is essential. Prefer non-modal alternatives.

2. **Provide clear feedback.** Important state changes need perceivable feedback; combine accessible visual/status text with optional sound or haptics, without announcing every incidental interaction. Activity indicators for indeterminate waits, progress bars for determinate, haptics for physical confirmation.

3. **Support undo over confirmation dialogs.** Destructive actions should be reversible when possible. Prefer undo when an action is genuinely reversible. Irreversible deletion, payments or external sharing may still need clear scope and confirmation.

4. **Launch quickly.** Display a launch screen that transitions seamlessly into the first screen. Avoid branding-only launch screens; a brief optional splash after launch can be appropriate if it does not obstruct the task. Restore previous state.

5. **Defer sign-in.** Let users explore before requiring account creation. Support Sign in with Apple and passkeys.

6. **Keep onboarding brief.** Keep the flow as short as the task permits; three screens is a heuristic, not an Apple requirement. Let users skip. Teach through progressive disclosure and contextual hints.

7. **Use progressive disclosure.** Show essentials first, let users drill into details. Don't overwhelm with every option on one screen.

8. **Respect user attention.** Consolidate notifications, minimize interruptions, give users control over alerts. Marketing notifications require explicit opt-in and an easy opt-out; never mark them Time Sensitive.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [charting-data.md](references/charting-data.md) | Charting Data | Data visualization patterns, accessible charts, interactive elements |
| [collaboration-and-sharing.md](references/collaboration-and-sharing.md) | Collaboration & Sharing | Share sheets, activity views, collaborative editing, SharePlay |
| [drag-and-drop.md](references/drag-and-drop.md) | Drag and Drop | Drag sources, drop targets, spring loading, multi-item drag, visual feedback |
| [entering-data.md](references/entering-data.md) | Entering Data | Text fields, pickers, steppers, input validation, keyboard types, autofill |
| [feedback.md](references/feedback.md) | Feedback | Alerts, action sheets, haptic patterns, sound feedback, visual indicators |
| [file-management.md](references/file-management.md) | File Management | Document browser, file providers, iCloud integration, document lifecycle |
| [going-full-screen.md](references/going-full-screen.md) | Going Full Screen | Full-screen transitions, immersive content, exiting full screen |
| [launching.md](references/launching.md) | Launching | Launch screens, state restoration, cold vs warm launch |
| [live-viewing-apps.md](references/live-viewing-apps.md) | Live Viewing Apps | Live television/video playback, channel browsing, EPG, cloud DVR |
| [loading.md](references/loading.md) | Loading | Activity indicators, progress views, skeleton screens, lazy loading, placeholders |
| [managing-accounts.md](references/managing-accounts.md) | Managing Accounts | Sign in with Apple, passkeys, account creation, credential autofill, account deletion |
| [managing-notifications.md](references/managing-notifications.md) | Managing Notifications | Permission requests, grouping, actionable notifications, provisional delivery |
| [modality.md](references/modality.md) | Modality | Sheets, alerts, popovers, full-screen modals, when to use each |
| [multitasking.md](references/multitasking.md) | Multitasking | iPad Split View, Slide Over, Stage Manager, responsive layout, size class transitions |
| [offering-help.md](references/offering-help.md) | Offering Help | Contextual tips, onboarding hints, help menus, support links |
| [onboarding.md](references/onboarding.md) | Onboarding | Welcome screens, feature highlights, progressive onboarding, skip options |
| [playing-audio.md](references/playing-audio.md) | Playing Audio | Audio sessions, background audio, Now Playing, audio routing, interruptions |
| [playing-haptics.md](references/playing-haptics.md) | Playing Haptics | Core Haptics, UIFeedbackGenerator, haptic patterns, custom haptics |
| [playing-video.md](references/playing-video.md) | Playing Video | Video player controls, picture-in-picture, AirPlay, full-screen video |
| [printing.md](references/printing.md) | Printing | Print dialogs, page setup, AirPrint integration |
| [ratings-and-reviews.md](references/ratings-and-reviews.md) | Ratings & Reviews | SKStoreReviewController, timing, frequency limits, in-app feedback |
| [searching.md](references/searching.md) | Searching | Search bars, suggestions, scoped search, results display, recents |
| [settings.md](references/settings.md) | Settings | In-app vs Settings app, preference organization, toggles, defaults |
| [undo-and-redo.md](references/undo-and-redo.md) | Undo and Redo | Shake to undo, undo/redo stack, multi-level undo |
| [workouts.md](references/workouts.md) | Workouts | Workout sessions, live metrics, Always On display, summaries, HealthKit |

## Pattern Selection Guide

| User Goal | Recommended Pattern | Avoid |
|---|---|---|
| First app experience | Brief optional onboarding + progressive disclosure | Long tutorials, mandatory sign-up |
| Waiting for content | Skeleton screens or progress indicators | Blocking spinners with no context |
| Destructive action | Undo if reversible; clear scoped confirmation if irreversible | Claiming undo can reverse external or permanent effects |
| Collecting user input | Inline validation, smart defaults, autofill | Modal forms for simple inputs |
| Requesting permissions | Contextual, just-in-time with explanation | Requesting all permissions at launch |
| Providing feedback | Haptics + visual indicator | Silent actions with no confirmation |
| Organizing preferences | In-app settings for frequent items | Burying all settings in system Settings app |

## Output Format

1. **Recommended pattern with rationale**, citing the relevant reference file.
2. **Step-by-step implementation** covering each screen or state.
3. **Platform variations** for targeted platforms.
4. **Common pitfalls** that violate HIG for this pattern.

## Questions to Ask

1. Where in the app does this pattern appear? What comes before and after?
2. Which platforms?
3. Designing from scratch or improving an existing flow?
4. Does this involve sensitive actions? (Destructive operations, payments, permissions)

## Related Skills

- **hig-foundations** -- Accessibility, color, typography, and privacy principles underlying every pattern
- **hig-platforms** -- Platform-specific pattern implementations
- **hig-components-layout** -- Structural components (tab bars, sidebars, split views) for navigation patterns
- **hig-components-content** -- Content display within patterns (charts, collections, search results)

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
Use to design or review Apple interaction flows such as onboarding, data entry, document handling, search, media playback, account management or undo. Choose the target platform and OS release before applying a reference.

## Example

**User request:**

> Review an iPad document editor’s autosave, background interruption and undo flow.

Describe recoverable edits, visible save failures, a safe conflict state and accessible actions. Cite the relevant local references and state which behaviors still need a native test.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Implementation boundaries

HIG design guidance is not proof of API availability or security. Validate external drag/drop files and URLs, enforce account/tenant authorization on sharing and deep links, and keep sensitive content out of search indexes, previews and logs. A masked field does not encrypt data; client-side format validation is not server validation.

Background work, notifications, audio and haptics depend on OS capabilities, user settings and system budgets. Do not promise completion, uninterrupted playback or notification delivery. Preserve work and show retry/offline/failure states. An agent must not send notifications, delete accounts, share files, record audio or alter device settings merely because the design reference describes that feature; those actions need the user task scope.
