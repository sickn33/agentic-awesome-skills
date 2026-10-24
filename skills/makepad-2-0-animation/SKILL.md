---
name: makepad-2-0-animation
description: Makepad 2.0 guidance for animation; use when building or debugging Makepad UI code.
source_repo: zhanghandong/makepad-skills
source_type: community
source: community
date_added: '2026-09-21'
risk: safe
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Makepad 2.0 Animation Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-03-03

## Version and validation contract

These historical dev-branch notes are not a pinned Makepad release or a complete API guarantee. Inspect Cargo.lock/the chosen Makepad commit, actual widget fields, Animator implementation and event handlers before using a snippet. Widget support, parser errors, shader declarations and timeline/ease syntax can change. Unsupported fields are not guaranteed to be silently ignored in every release. The example lists below are historical candidates to verify, not exhaustive current compatibility tables.

A declared animator does not by itself prove that pointer/focus events transition it or that a shader reads the field. Show the actual event-to-state wiring or verify the base widget provides it. Animating a parent background does not animate a child label color. Respect reduced motion and keyboard/touch feedback; stop continuous animations when hidden/removed and verify redraw/CPU behavior. No code in this bundle has been compiled by this document.

## Overview

The Animator system drives `instance()` shader variables over time, enabling hover effects, transitions, and looping animations. It uses independent animation tracks called "groups" that run simultaneously.

## Documentation

Refer to the local files for detailed documentation:
- `./references/animator-reference.md` - Complete Animator API, play types, ease functions, examples

## IMPORTANT: Documentation Completeness Check

**Before answering questions:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "Reference docs incomplete. Still answering based on SKILL.md patterns."
   - State which target-version details remain unverified; do not invent missing APIs from memory
3. If reference file exists, incorporate its content into the answer

---

## Critical: Widget Animator Support

**NOT all widgets support `animator`!** Adding `animator: Animator{...}` to an unsupported widget is **silently ignored** - no error, no animation, nothing happens.

### Widgets that SUPPORT Animator
`View`, `SolidView`, `RoundedView`, `ScrollXView`, `ScrollYView`, `ScrollXYView`, `Button`, `ButtonFlat`, `ButtonFlatter`, `CheckBox`, `Toggle`, `RadioButton`, `LinkLabel`, `TextInput`

### Widgets that DO NOT Support Animator
`Label`, `H1`-`H4`, `P`, `TextBox`, `Image`, `Icon`, `Markdown`, `Html`, `Slider`, `DropDown`, `Splitter`, `Hr`, `Filler`

**To animate a Label:** Wrap it in a View with the animator:
```
View{
    width: Fit height: Fit
    animator: Animator{
        hover: {
            default: @off
            off: AnimatorState{ from: {all: Forward {duration: 0.15}} apply: {draw_bg: {hover: 0.0}} }
            on: AnimatorState{ from: {all: Forward {duration: 0.15}} apply: {draw_bg: {hover: 1.0}} }
        }
    }
    label := Label{text: "Animated via parent"}
}
```

---

## Animator Structure

```
animator: Animator{
    <group_name>: {
        default: @<state_name>
        <state_name>: AnimatorState{
            from: { ... }
            ease: <EaseFunction>
            redraw: true
            apply: { ... }
        }
        <state_name>: AnimatorState{ ... }
    }
    <group_name>: { ... }
}
```

---

## Groups

Each group is an independent animation track. Common groups:

| Group | Purpose | Typical States |
|-------|---------|----------------|
| `hover` | Mouse hover in/out | `off`, `on` |
| `focus` | Keyboard focus | `off`, `on` |
| `active` | Toggled/checked state | `off`, `on` |
| `disabled` | Disabled state | `off`, `on` |
| `time` | Continuous looping | `off`, `on` |

Groups may advance simultaneously; avoid multiple tracks writing the same property unless the pinned implementation defines their arbitration.

---

## The `from` Block

Controls transition timing. Keys are states being transitioned FROM, or `all` as catch-all.

```
// From any state, animate over 0.2 seconds
from: {all: Forward {duration: 0.2}}

// Instant from any state
from: {all: Snap}

// Different timing depending on origin
from: {
    all: Forward {duration: 0.1}
    down: Forward {duration: 0.01}
}
```

---

## Play Types

| Type | Description | Example |
|------|-------------|---------|
| `Forward {duration: 0.2}` | One-shot forward | Hover transitions |
| `Snap` | Instant jump, no animation | Default state initialization |
| `Loop {duration: 1.0}` | Looping animation | Loading spinners |
| `ReverseLoop {duration: 1.0}` | Repeated reverse traversal; verify pinned implementation | Pulsing effects |
| `BounceLoop {duration: 1.0}` | Bounce back and forth | Bouncing animations |

---

## Ease Functions

| Function | Description |
|----------|-------------|
| `Linear` | Constant speed |
| `InQuad` / `OutQuad` / `InOutQuad` | Quadratic easing |
| `InCubic` / `OutCubic` / `InOutCubic` | Cubic easing |
| `InQuart` / `OutQuart` / `InOutQuart` | Quartic easing |
| `InQuint` / `OutQuint` / `InOutQuint` | Quintic easing |
| `InSine` / `OutSine` / `InOutSine` | Sine easing |
| `InExp` / `OutExp` / `InOutExp` | Exponential easing |
| `InCirc` / `OutCirc` / `InOutCirc` | Circular easing |
| `InElastic` / `OutElastic` / `InOutElastic` | Elastic spring |
| `InBack` / `OutBack` / `InOutBack` | Overshoot |
| `InBounce` / `OutBounce` / `InOutBounce` | Bounce |

Usage: `ease: OutCubic` in the AnimatorState (optional, defaults to Linear).

---

## The `apply` Block

Target values to animate TO. Structure mirrors the widget's shader properties.

```
// Animate single properties
apply: {
    draw_bg: {hover: 1.0}
}

// Animate multiple properties
apply: {
    draw_bg: {hover: 1.0 color: #f00}
    draw_text: {color: #fff}
}
```

**CRITICAL:** For per-widget shader animation use per-instance fields; shared uniform state is not an independent per-widget track. Animator can also apply supported widget fields (such as opened), so this is not a universal shader-only restriction.

---

## Complete Hover Button Example

```
use mod.prelude.widgets.*

let HoverCard = RoundedView{
    width: Fill height: Fit
    padding: 16
    new_batch: true
    cursor: MouseCursor.Hand
    draw_bg +: {
        hover: instance(0.0)
        color: mix(#2a2a3d, #3a3a5d, self.hover)
        border_radius: 8.0
    }
    animator: Animator{
        hover: {
            default: @off
            off: AnimatorState{
                from: {all: Forward {duration: 0.15}}
                apply: {draw_bg: {hover: 0.0}}
            }
            on: AnimatorState{
                from: {all: Forward {duration: 0.15}}
                apply: {draw_bg: {hover: 1.0}}
            }
        }
    }
    title := Label{text: "Hover me" draw_text.color: #fff}
}
```

**Key points:**
- `new_batch: true` is a historical draw-order workaround to verify in the target widget
- `cursor: MouseCursor.Hand` shows pointer cursor on hover
- `hover: instance(0.0)` declares the animatable variable
- `mix(color1, color2, self.hover)` interpolates between colors

---

## Timeline Animation (Keyframes)

For multi-step animations use `timeline()`:

```
animator: Animator{
    time: {
        default: @off
        on: AnimatorState{
            from: {all: Loop {duration: 2.0}}
            apply: {
                draw_bg: {
                    rotation: timeline(0.0 0.0  1.0 6.28)
                }
            }
        }
    }
}
```

---

## Loading Spinner Pattern

```
let Spinner = View{
    width: 40 height: 40
    draw_bg +: {
        rotation: instance(0.0)
        pixel: fn() {
            let sdf = Sdf2d.viewport(self.pos * self.rect_size)
            let cx = self.rect_size.x * 0.5
            let cy = self.rect_size.y * 0.5
            let r = min(cx, cy) * 0.8
            sdf.arc(cx, cy, r, self.rotation, self.rotation + 4.5, 3.0)
            sdf.stroke(#4488ff, 2.5)
            return sdf.result
        }
    }
    animator: Animator{
        time: {
            default: @on
            on: AnimatorState{
                from: {all: Loop {duration: 1.0}}
                apply: {
                    draw_bg: {
                        rotation: timeline(0.0 0.0  1.0 6.28318)
                    }
                }
            }
        }
    }
}
```

---

## Animator vs Vector Tween

Makepad has **two separate animation systems**:

| Feature | `Animator` (this skill) | `Tween` (see makepad-2.0-vector) |
|---------|------------------------|----------------------------------|
| Target | Widget shader `instance` vars | SVG shape properties (fill, cx, opacity...) |
| Syntax | `animator: Animator{...}` block | Property value: `opacity:Tween{...}` |
| Triggers | State transitions (hover, focus) | Automatic on render |
| Loop | `Loop {duration: 1.0}` in `from` | `loop_:true` (bool, NOT string!) |
| Use for | UI interactions (hover, click) | SVG/Vector graphic animations |

**Use Animator for:** Button hover effects, toggle states, loading spinners (shader-based)
**Use Vector Tween for:** SVG path animations, pulsing indicators, moving dots, color transitions

See the `makepad-2.0-vector` skill for Tween details.

---

## Best Practices

1. **Consider `new_batch: true` where draw ordering requires a separate batch** to Views with backgrounds that have hover animations
2. **Use `instance` variables** for anything you want to animate
3. **Match group names** to semantic purposes (hover, focus, active)
4. **Use Forward for transitions**, Snap for instant state changes
5. **Set `default: @off`** for states that start inactive
6. **Check Label support**; a wrapping View only animates properties it actually controls
7. **Keep durations short** (0.1-0.3s) for hover, longer (0.5-2.0s) for time-based


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
