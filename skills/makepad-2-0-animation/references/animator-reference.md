# Makepad 2.0 Animator Reference

## Overview

The Animator system drives `instance()` variables on draw shaders over time, enabling hover effects, transitions, and looping animations. It operates on independent animation tracks called "groups" that run simultaneously without interfering.

---

## Animator Structure

```
animator: Animator{
    <group_name>: {
        default: @<state_name>       // initial state (@ prefix required)
        <state_name>: AnimatorState{
            from: { ... }            // transition timing
            ease: <EaseFunction>     // optional ease override
            redraw: true             // optional: force redraw each frame
            apply: { ... }           // target values
        }
        <state_name>: AnimatorState{ ... }
    }
    <group_name>: { ... }           // multiple groups allowed
}
```

---

## CRITICAL: Widget Animator Support

NOT all widgets have an `animator` field. If you add `animator: Animator{...}` to a widget that doesn't support it, the definition is **silently ignored** -- no error, no hover, nothing happens.

### Widgets that SUPPORT Animator
`View`, `SolidView`, `RoundedView`, `ScrollXView`, `ScrollYView`, `ScrollXYView`, `Button`, `ButtonFlat`, `ButtonFlatter`, `CheckBox`, `Toggle`, `RadioButton`, `LinkLabel`, `TextInput`

### Widgets that DO NOT Support Animator
`Label`, `H1`-`H4`, `P`, `TextBox`, `Image`, `Icon`, `Markdown`, `Html`, `Slider`, `DropDown`, `Splitter`, `Hr`, `Filler`

---

## Groups

Each group is an independent animation track. Common groups:
- `hover` -- mouse hover in/out
- `focus` -- keyboard focus
- `active` -- toggled/checked state (CheckBox, Toggle, RadioButton)
- `disabled` -- disabled state
- `time` -- continuous/looping time-based animation

Multiple groups animate simultaneously without interfering with each other.

---

## The `from` Block

Controls when and how the transition plays. Keys are state names being transitioned FROM, or `all` as a catch-all.

```
// From any state, animate over 0.2 seconds
from: {all: Forward {duration: 0.2}}

// Instant from any state
from: {all: Snap}

// Different timing depending on origin state
from: {
    all: Forward {duration: 0.1}                // default
    down: Forward {duration: 0.01}              // faster when coming from "down"
}
```

---

## The `apply` Block

Target values to animate TO. The structure mirrors the widget's property tree. Keys are the widget's sub-objects (like `draw_bg`, `draw_text`), values are the shader instance variables to animate.

```
// Animate single properties
apply: {
    draw_bg: {hover: 1.0}
    draw_text: {hover: 1.0}
}

// Multiple properties in one block
apply: {
    draw_bg: {down: 1.0, hover: 0.5}
    draw_text: {down: 1.0, hover: 0.5}
}

// Non-draw properties (widget's own fields)
apply: {
    opened: 1.0
    active: 0.0
}
```

---

## snap() -- Instant Jump

Wrapping a value in `snap()` makes it jump instantly instead of interpolating:

```
apply: {
    draw_bg: {down: snap(1.0), hover: 1.0}     // down jumps, hover interpolates
}
```

---

## timeline() -- Keyframes

Animate through multiple values over the duration using time/value pairs (times 0.0-1.0):

```
apply: {
    draw_bg: {anim_time: timeline(0.0 0.0  1.0 1.0)}   // linear 0 to 1
}
```

---

## Play Types (Transition Modes)

| Type | Syntax | Description |
|------|--------|-------------|
| Forward | `Forward {duration: 0.2}` | Play once forward |
| Snap | `Snap` | Instant, no interpolation |
| Reverse | `Reverse {duration: 0.2, end: 1.0}` | Play in reverse |
| Loop | `Loop {duration: 1.0, end: 1000000000.0}` | Repeat forward |
| ReverseLoop | `ReverseLoop {duration: 1.0, end: 1.0}` | Repeat in reverse |
| BounceLoop | `BounceLoop {duration: 1.0, end: 1.0}` | Bounce back and forth |

---

## Ease Functions

### Standard Easing
```
Linear                  // default
InQuad  OutQuad  InOutQuad
InCubic OutCubic InOutCubic
InQuart OutQuart InOutQuart
InQuint OutQuint InOutQuint
InSine  OutSine  InOutSine
InExp   OutExp   InOutExp
InCirc  OutCirc  InOutCirc
InElastic  OutElastic  InOutElastic
InBack     OutBack     InOutBack
InBounce   OutBounce   InOutBounce
```

### Parametric Easing
```
ExpDecay {d1: 0.82, d2: 0.97, max: 100}
Pow {begin: 0.0, end: 1.0}
Bezier {cp0: 0.0, cp1: 0.0, cp2: 1.0, cp3: 1.0}
```

Usage:
```
off: AnimatorState{
    from: {all: Forward {duration: 0.3}}
    ease: OutCubic
    apply: {draw_bg: {hover: 0.0}}
}
```

---

## Hoverable Label Pattern

Label does NOT support Animator. To make hoverable/clickable text, wrap a Label inside a View with animator + cursor.

CRITICAL: Always set `new_batch: true` on any View that has `show_bg: true` AND contains text children. Without it, when the hover activates and the background becomes opaque, it covers the text -- making text disappear on hover.

```
View{
    width: Fill height: Fit
    cursor: MouseCursor.Hand
    new_batch: true
    show_bg: true
    draw_bg +: {
        color: uniform(#0000)
        color_hover: uniform(#fff2)
        hover: instance(0.0)
        pixel: fn(){
            return Pal.premul(self.color.mix(self.color_hover, self.hover))
        }
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
    label := Label{text: "hoverable item" draw_text.color: #fff}
}
```

---

## Hoverable List Item Pattern

For list items, use `label :=` to declare the inner Label so each instance can override its text:

```
let HoverItem = View{
    width: Fill height: Fit
    padding: theme.mspace_2
    cursor: MouseCursor.Hand
    new_batch: true
    show_bg: true
    draw_bg +: {
        color: uniform(#0000)
        color_hover: uniform(#fff2)
        hover: instance(0.0)
        pixel: fn(){
            return self.color.mix(self.color_hover, self.hover)
        }
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
    label := Label{text: "item" draw_text.color: #fff}
}
```

---

## Complete Button Animator Example

This example shows all four standard animation groups (disabled, hover, focus, time) plus a three-state hover group (off/on/down):

```
animator: Animator{
    disabled: {
        default: @off
        off: AnimatorState{
            from: {all: Forward {duration: 0.}}
            apply: {
                draw_bg: {disabled: 0.0}
                draw_text: {disabled: 0.0}
            }
        }
        on: AnimatorState{
            from: {all: Forward {duration: 0.2}}
            apply: {
                draw_bg: {disabled: 1.0}
                draw_text: {disabled: 1.0}
            }
        }
    }
    hover: {
        default: @off
        off: AnimatorState{
            from: {all: Forward {duration: 0.1}}
            apply: {
                draw_bg: {down: 0.0, hover: 0.0}
                draw_text: {down: 0.0, hover: 0.0}
            }
        }
        on: AnimatorState{
            from: {
                all: Forward {duration: 0.1}
                down: Forward {duration: 0.01}
            }
            apply: {
                draw_bg: {down: 0.0, hover: snap(1.0)}
                draw_text: {down: 0.0, hover: snap(1.0)}
            }
        }
        down: AnimatorState{
            from: {all: Forward {duration: 0.2}}
            apply: {
                draw_bg: {down: snap(1.0), hover: 1.0}
                draw_text: {down: snap(1.0), hover: 1.0}
            }
        }
    }
    focus: {
        default: @off
        off: AnimatorState{
            from: {all: Snap}
            apply: {
                draw_bg: {focus: 0.0}
                draw_text: {focus: 0.0}
            }
        }
        on: AnimatorState{
            from: {all: Snap}
            apply: {
                draw_bg: {focus: 1.0}
                draw_text: {focus: 1.0}
            }
        }
    }
    time: {
        default: @off
        off: AnimatorState{
            from: {all: Forward {duration: 0.}}
            apply: {}
        }
        on: AnimatorState{
            from: {all: Loop {duration: 1.0, end: 1000000000.0}}
            apply: {
                draw_bg: {anim_time: timeline(0.0 0.0  1.0 1.0)}
            }
        }
    }
}
```

---

## Button draw_bg Instance Variables

These are per-instance floats driven by the Animator:
- `hover`, `down`, `focus`, `disabled`

Color uniforms (each with `_hover`, `_down`, `_focus`, `_disabled` variants):
- `color`, `border_color`, `icon_color`

---

## CheckBox/Toggle draw_bg Instance Variables

Animator-driven: `hover`, `down`, `focus`, `active`, `disabled`

Uniforms: `size`, `border_size`, `border_radius`

Color uniforms (each with `_hover`, `_down`, `_active`, `_focus`, `_disabled` variants):
- `color`, `border_color`, `mark_color`
- Also: `mark_size`

---

## Rust Struct Setup for Animated Widgets

```rust
// The widget struct needs Animator derive
#[derive(Script, ScriptHook, Widget, Animator)]
pub struct MyAnimatedWidget {
    #[source] source: ScriptObjectRef,
    #[apply_default] animator: Animator,
    #[walk] walk: Walk,
    #[layout] layout: Layout,
    #[redraw] #[live] draw_bg: DrawQuad,
    #[live] draw_text: DrawText,
}
```

---

## Continuous Time Animation

Use the `time` group with `Loop` play type for continuous shader animations. Access the animated value in shaders via `self.draw_pass.time` for elapsed time, or use the `anim_time` instance variable driven by `timeline()`.

```
time: {
    default: @off
    off: AnimatorState{
        from: {all: Forward {duration: 0.}}
        apply: {}
    }
    on: AnimatorState{
        from: {all: Loop {duration: 1.0, end: 1000000000.0}}
        apply: {
            draw_bg: {anim_time: timeline(0.0 0.0  1.0 1.0)}
        }
    }
}
```

---

## Instance vs Uniform for Animation

- `instance()` -- per-draw-call value, varies per widget instance, animatable by Animator. Use for: hover, down, focus, active, disabled, per-widget colors, scale/pan.
- `uniform()` -- shared across all instances of the same shader variant. Cannot be animated. Use for: theme constants, border_size, border_radius, base theme colors.

```
draw_bg +: {
    hover: instance(0.0)           // each button has its own hover state
    color: uniform(theme.color_x)  // shared base color for all instances
    color_hover: instance(theme.color_y)  // per-instance if color varies
}
```

---

## FoldHeader Animation

FoldHeader has a built-in `active` animation group that drives an `opened` float:

```
FoldHeader{
    body_walk: Walk{...}
    animator: Animator{
        active: {
            default: @on
            off: AnimatorState{
                from: {all: Forward {duration: 0.2}}
                apply: {opened: 0.0}
            }
            on: AnimatorState{
                from: {all: Forward {duration: 0.2}}
                apply: {opened: 1.0}
            }
        }
    }
    header: View{ height: Fit ... }
    body: View{ ... }
}
```
