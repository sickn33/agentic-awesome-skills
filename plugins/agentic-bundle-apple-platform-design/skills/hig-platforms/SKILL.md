---
name: hig-platforms
description: Apple Human Interface Guidelines for platform-specific design.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: Platform Design

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

1. **Each platform has a distinct identity.** Do not port designs between platforms. Respect each platform's conventions, interaction models, and user expectations.

2. **iOS: touch-first.** Direct manipulation on a handheld screen. Optimize for one-handed use. Navigation uses tab bars and push/pop stacks.

3. **iPadOS: expanded canvas.** Support Split View, Slide Over, and Stage Manager. Use sidebars and multi-column layouts. Support pointer and keyboard alongside touch.

4. **macOS: pointer and keyboard.** Dense information display is acceptable. Use menu bars, toolbars, and keyboard shortcuts extensively. Windows are resizable with precise control.

5. **tvOS: remote and focus.** Viewed from a distance. Design for the Siri Remote with focus-based navigation. Large text, simple layouts, linear navigation.

6. **visionOS: spatial interaction.** 3D environment using windows, volumes, and spaces. Eye tracking for targeting, indirect gestures for interaction. Respect ergonomic comfort zones.

7. **watchOS: glanceable and brief.** Information consumable at a glance. Brief interactions. Digital Crown, haptics, and complications for timely content.

8. **Games: own paradigm.** Free to define in-game interaction models, but still respect platform conventions for system interactions (notifications, accessibility, controllers).

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [designing-for-ios.md](references/designing-for-ios.md) | iOS | Touch, tab bars, navigation stacks, gestures, screen sizes, safe areas |
| [designing-for-ipados.md](references/designing-for-ipados.md) | iPadOS | Multitasking, sidebars, pointer, keyboard, Apple Pencil, Stage Manager |
| [designing-for-macos.md](references/designing-for-macos.md) | macOS | Menu bars, toolbars, window management, keyboard shortcuts, dense layouts, Dock |
| [designing-for-tvos.md](references/designing-for-tvos.md) | tvOS | Focus engine, Siri Remote, lean-back experience, content-forward, parallax |
| [designing-for-visionos.md](references/designing-for-visionos.md) | visionOS | Spatial computing, windows/volumes/spaces, eye tracking, hand gestures, depth |
| [designing-for-watchos.md](references/designing-for-watchos.md) | watchOS | Glanceable UI, Digital Crown, complications, notifications, haptics |
| [designing-for-games.md](references/designing-for-games.md) | Games | Controllers, immersive experiences, platform-specific conventions, accessibility |

## Decision Framework

1. **Identify the primary use context.** On the go (iOS/watchOS), at a desk (macOS), on the couch (tvOS), spatial environment (visionOS)?

2. **Match input to interaction.** Touch for direct manipulation, pointer for precision, gaze+gesture for spatial, Digital Crown for quick scrolling, remote for focus navigation.

3. **Adapt, don't replicate.** A macOS sidebar becomes a tab bar on iPhone. A visionOS volume has no equivalent on watchOS. Translate intent, not implementation.

4. **Leverage platform strengths.** Live Activities on iOS, Desktop Widgets on macOS, complications on watchOS, immersive spaces on visionOS.

5. **Maintain brand consistency** while respecting each platform's visual language and interaction patterns.

## Output Format

1. **Platform-specific recommendations** citing relevant HIG sections.
2. **Platform differences table** comparing navigation, input, layout, and conventions.
3. **Implementation notes** per platform including recommended APIs and adaptation strategies.

## Questions to Ask

1. Which platforms are you targeting?
2. New app or adapting an existing one? If existing, which platform is the base?
3. SwiftUI or UIKit/AppKit?
4. Need to support older OS versions?
5. Primary use context? (On the go, desk, couch, spatial, glanceable?)

## Related Skills

- **hig-foundations** -- Shared principles (color, typography, accessibility, layout) across platforms
- **hig-patterns** -- Interaction patterns that manifest differently per platform
- **hig-components-layout** -- Navigation structures (tab bars, sidebars, split views) that vary by platform
- **hig-components-content** -- Content display that adapts across platforms

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
