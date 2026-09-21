---
name: makepad-2.0-animation
description: 'CRITICAL: Use for Makepad 2.0 animation system. Triggers on:

  makepad animation, makepad animator, Animator, AnimatorState, hover effect,

  makepad transition, animation state, Forward, Snap, Loop, ease…'
source_repo: zhanghandong/makepad-skills
source_type: community
source: community
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Makepad 2.0 Animation Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-03-03

## Overview

The Animator system drives `instance()` shader variables over time, enabling hover effects, transitions, and looping animations. It uses independent animation tracks called "groups" that run simultaneously.

## Documentation

Refer to the local files for detailed documentation:
- `./references/animator-reference.md` - Complete Animator API, play types, ease functions, examples

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "Reference docs incomplete. Still answering based on SKILL.md patterns."
   - Still answer based on SKILL.md patterns + built-in knowledge
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

Multiple groups animate simultaneously without interfering.

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
| `ReverseLoop {duration: 1.0}` | Ping-pong loop | Pulsing effects |
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

**CRITICAL:** Only `instance()` shader variables can be animated. `uniform()` variables cannot.

---

## Complete Hover Button Example

```
use mod.prelude.widgets.*

let HoverCard = RoundedView{
    width: Fill height: Fit
    padding: 16
    new_batch: true
    cursor: Hand
    draw_bg +: {
        instance hover: 0.0
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
- `new_batch: true` is REQUIRED for hoverable items with backgrounds
- `cursor: Hand` shows pointer cursor on hover
- `instance hover: 0.0` declares the animatable variable
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
                    rotation: timeline(){
                        snap(0.0)
                        snap(6.28)
                    }
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
        instance rotation: 0.0
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
                        rotation: timeline(){
                            snap(0.0)
                            snap(6.28318)
                        }
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

1. **Always add `new_batch: true`** to Views with backgrounds that have hover animations
2. **Use `instance` variables** for anything you want to animate
3. **Match group names** to semantic purposes (hover, focus, active)
4. **Use Forward for transitions**, Snap for instant state changes
5. **Set `default: @off`** for states that start inactive
6. **Label cannot animate** - wrap in View if you need animation on text
7. **Keep durations short** (0.1-0.3s) for hover, longer (0.5-2.0s) for time-based


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
