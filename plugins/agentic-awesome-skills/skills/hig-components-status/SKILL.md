---
name: hig-components-status
description: Apple HIG guidance for status and progress UI components including progress indicators, status bars, and activity rings.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: Status Components

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

### Progress Indicators

1. **Show progress for operations longer than a second or two.**

2. **Determinate when duration/percentage is known.** A filling progress bar gives users a clear sense of remaining work. Use for downloads, uploads, or any measurable process.

3. **Indeterminate when duration is unknown.** A spinner communicates work is happening without promising a timeframe. Use for unpredictable network requests.

4. **Prefer progress bars over spinners.** Determinate progress feels faster and more trustworthy.

5. **Place indicators where content will appear.** Inline progress near the content area, not modal or distant.

6. **Don't stack multiple indicators.** Aggregate simultaneous operations into one representation or show the most relevant.

### Status Bars

7. **Don't hide the status bar without good reason.** Reserve hiding for immersive experiences (full-screen media, games, AR).

8. **Match status bar style to your content.** Light or dark for adequate contrast.

9. **Respect safe areas.** No interactive content behind the status bar.

10. **Restore promptly** when exiting immersive contexts.

### Activity Rings

11. **Activity rings are for Move, Exercise, and Stand goals.** Don't repurpose the ring metaphor for unrelated data.

12. **Respect ring color conventions.** Red (Move), green (Exercise), blue (Stand) are strongly associated with Apple Fitness.

13. **Use HealthKit APIs** for activity data rather than manual tracking.

14. **Celebrate completions** with animation and haptics when rings close.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [progress-indicators.md](references/progress-indicators.md) | Progress bars and spinners | Determinate, indeterminate, inline placement, duration |
| [status-bars.md](references/status-bars.md) | iOS/iPadOS status bar | System info, visibility, style, safe areas |
| [activity-rings.md](references/activity-rings.md) | watchOS activity rings | Move/Exercise/Stand, HealthKit, fitness tracking, color |

## Output Format

1. **Indicator type recommendation** with rationale (determinate vs indeterminate).
2. **Timing and animation guidance** -- duration thresholds, animation style, transitions.
3. **Accessibility** -- VoiceOver progress announcements, live region updates.
4. **Platform-specific behavior** across targeted platforms.

## Questions to Ask

1. Is the duration known or unknown?
2. Which platforms?
3. How long does the operation typically take?
4. System-level or in-app indicator?

## Related Skills

- **hig-components-system** -- Widgets and complications displaying progress or status
- **hig-inputs** -- Gestures triggering progress states (pull-to-refresh)
- **hig-technologies** -- HealthKit for activity ring data; VoiceOver for progress announcements

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
