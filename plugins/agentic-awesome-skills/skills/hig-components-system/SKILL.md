---
name: hig-components-system
description: 'Apple HIG guidance for system experience components: widgets, live activities, notifications, complications, home screen quick actions, top shelf, watch faces, app clips, and app shortcuts.'
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: System Experiences

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

### General

1. **Glanceable, immediate value.** System experiences bring your app's most important content to surfaces the user sees without launching your app. Design for seconds of attention.

2. **Respect platform context.** A Lock Screen widget has different constraints than a Home Screen widget. A complication is far smaller than a top shelf item.

### Widgets

3. **Show relevant information, not everything.** Display the most useful subset, updated appropriately.

4. **Support multiple sizes with distinct layouts.** Each size should be a thoughtful design, not a scaled version of another.

5. **Deep-link on tap.** Take users to the relevant content, not the app's root screen.

### Live Activities

6. **Track events with a clear start and end.** Deliveries, scores, timers, rides. Design for both Dynamic Island and Lock Screen.

7. **Stay updated and timely.** Stale data undermines trust. End promptly when the event concludes.

### Notifications

8. **Respect user attention.** Only send notifications for information users genuinely care about. No promotional or low-value notifications.

9. **Actionable and self-contained.** Include enough context to understand and act without opening the app. Support notification actions. Use threading and grouping.

### Complications

10. **Focused data on the watch face.** Design for the smallest useful representation. Support multiple families. Budget updates wisely.

### Home Screen Quick Actions

11. **3-4 most common tasks.** Short titles, optional subtitles, relevant SF Symbol icons.

### Top Shelf

12. **tvOS showcase.** Feature content that entices: new episodes, featured items, recent content.

### App Clips

13. **Instant, focused functionality within a strict size budget.** Load quickly without App Store download. Only what's needed for the immediate task, then offer full app install.

### App Shortcuts

14. **Surface key actions to Siri and Spotlight.** Define shortcuts for frequent tasks. Use natural, conversational trigger phrases.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [widgets.md](references/widgets.md) | Widgets | Glanceable info, sizes, deep linking, timeline |
| [live-activities.md](references/live-activities.md) | Live Activities | Real-time tracking, Dynamic Island, Lock Screen |
| [notifications.md](references/notifications.md) | Notifications | Attention, actions, grouping, content |
| [complications.md](references/complications.md) | Complications | Watch face data, families, budgeted updates |
| [home-screen-quick-actions.md](references/home-screen-quick-actions.md) | Quick actions | Haptic Touch, common tasks, SF Symbols |
| [top-shelf.md](references/top-shelf.md) | Top shelf | Featured content, showcase |
| [app-clips.md](references/app-clips.md) | App Clips | Instant use, lightweight, focused task, NFC/QR |
| [watch-faces.md](references/watch-faces.md) | Watch faces | Custom complications, face sharing |
| [app-shortcuts.md](references/app-shortcuts.md) | App Shortcuts | Siri, Spotlight, voice triggers |

## Output Format

1. **System experience recommendation** -- which surface best fits the use case.
2. **Content strategy** -- what to display, priority, what to omit.
3. **Update frequency** -- refresh rate including system budget constraints.
4. **Size/family variants** -- which to support and how layout adapts.
5. **Deep link behavior** -- where tapping takes the user.

## Questions to Ask

1. What information needs to surface outside the app?
2. Which platform?
3. How frequently does the data update?
4. What is the primary glanceable need?

## Related Skills

- **hig-components-status** -- Progress indicators in widgets or Live Activities
- **hig-inputs** -- Interaction patterns for system experiences (Digital Crown for complications)
- **hig-technologies** -- Siri for App Shortcuts, HealthKit for complications, NFC for App Clips

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
