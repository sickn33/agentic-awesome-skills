---
name: hig-inputs
description: "Check for .claude/apple-design-context.md before asking questions. Use existing context and only ask for information not already covered."
risk: unknown
source: community
date_added: '2026-02-27'
---

# Apple HIG: Inputs

Check for `.claude/apple-design-context.md` before asking questions. Use existing context and only ask for information not already covered.

## Key Principles

### General

1. **Support multiple input methods.** Touch, pointer, keyboard, pencil, voice, eyes, hands, controllers. Design for the inputs available on each platform. On iPadOS, support both touch and pointer; on macOS, both pointer and keyboard.

2. **Consistent feedback for every input action.** Visible, audible, or haptic response.

### Gestures

3. **Standard gestures must behave consistently.** Tap to activate, swipe to scroll/navigate, pinch to zoom, long press for context menus, drag to move. Don't override system gestures (edge swipes for back, Home, notifications).

4. **Use standard recognizers; keep custom gestures discoverable.** Apple's built-in recognizers handle edge cases and accessibility. If you add non-standard gestures, provide hints or coaching to teach them.

### Apple Pencil

5. **Precision drawing, markup, and selection.** Support pressure, tilt, and hover. Distinguish finger from Pencil when appropriate (finger pans, Pencil draws).

6. **Support Scribble in text fields.** Users expect to write with Pencil in any text input.

### Keyboards

7. **Keyboard shortcuts and full navigation.** Standard shortcuts (Cmd+C/V/Z) plus custom ones visible in the iPadOS Command key overlay. Logical tab order.

8. **Respect the software keyboard.** Adjust layout when keyboard appears. Use keyboard-avoidance APIs.

### Game Controllers

9. **MFi controllers with on-screen fallbacks.** Map to extended gamepad profile, sensible defaults, remappable. Always offer touch or keyboard alternatives.

### Pointer and Trackpad

10. **Native feel.** Hover effects, pointer shape adaptation, standard cursor behaviors. Two-finger scroll, pinch to zoom, swipe to navigate.

### Digital Crown

11. **Primary scrolling and value-adjustment input on watchOS.** Scrolling lists, adjusting values, navigating views. Haptic feedback at detents.

### Eyes and Spatial (visionOS)

12. **Look and pinch.** Generous hit targets (eye tracking is less precise than touch). Avoid sustained gaze for activation. Direct hand manipulation in immersive experiences.

### Focus System

13. **Critical for tvOS and visionOS.** Predictable focus movement. Every interactive element focusable. Clear visual indicators (scale, highlight, elevation). Logical focus groups.

### Remotes

14. **Siri Remote: limited surface.** Touch area for swiping, clickpad for selection, few physical buttons. Keep interactions simple.

### Motion and Nearby

15. **Gyroscope, accelerometer, UWB: use judiciously.** Suits gaming, fitness, AR. Not for essential tasks. Provide calibration and reset. For UWB, communicate distance and direction with visual or haptic cues.

## Reference Index

| Reference | Topic | Key content |
|---|---|---|
| [gestures.md](references/gestures.md) | Touch gestures | Tap, swipe, pinch, long press, drag, system gestures |
| [apple-pencil-and-scribble.md](references/apple-pencil-and-scribble.md) | Apple Pencil | Precision, pressure, tilt, hover, handwriting |
| [keyboards.md](references/keyboards.md) | Keyboards | Shortcuts, navigation, software keyboard, Command key |
| [game-controls.md](references/game-controls.md) | Game controllers | MFi, extended gamepad, remapping, fallbacks |
| [pointing-devices.md](references/pointing-devices.md) | Pointer/trackpad | Hover, cursor morphing, trackpad gestures |
| [digital-crown.md](references/digital-crown.md) | Digital Crown | Scrolling, value adjustment, haptic detents |
| [eyes.md](references/eyes.md) | Eye tracking | Look and tap, gaze targeting, hit target sizing |
| [spatial-interactions.md](references/spatial-interactions.md) | Spatial input | Hand gestures, direct manipulation, immersive input |
| [focus-and-selection.md](references/focus-and-selection.md) | Focus system | tvOS/visionOS navigation, focus indicators, groups |
| [remotes.md](references/remotes.md) | Remotes | Touch surface, clickpad, simple interactions |
| [gyro-and-accelerometer.md](references/gyro-and-accelerometer.md) | Motion sensors | Gyroscope, accelerometer, calibration, gaming |
| [nearby-interactions.md](references/nearby-interactions.md) | Nearby interactions | U1 chip, directional finding, proximity triggers |
| [camera-control.md](references/camera-control.md) | Camera Control | iPhone camera hardware button, quick launch |

## Output Format

1. **Input method recommendations by platform** and how they interact.
2. **Gesture specification table** -- standard and custom gestures with expected behaviors.
3. **Keyboard shortcut recommendations** following system conventions.
4. **Accessibility input alternatives** for VoiceOver, Switch Control, etc.

## Questions to Ask

1. Which platforms and input devices?
2. Productivity or casual app?
3. Custom gestures in the design?
4. Game controller support needed?

## Related Skills

- **hig-components-status** -- Progress indicators responding to input (pull-to-refresh)
- **hig-components-system** -- System experiences with unique input constraints
- **hig-technologies** -- VoiceOver, Siri voice input, ARKit spatial gesture context

---

*Built by [Raintree Technology](https://raintree.technology) · [More developer tools](https://raintree.technology)*

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
