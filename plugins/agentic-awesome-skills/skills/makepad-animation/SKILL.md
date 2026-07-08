---
name: makepad-animation
description: |
  CRITICAL: Use for Makepad animation system. Triggers on:
  makepad animation, makepad animator, makepad hover, makepad state,
  makepad transition, "from: { all: Forward", makepad pressed,
  makepad 动画, makepad 状态, makepad 过渡, makepad 悬停效果
risk: safe
source: community
---

# Makepad Animation Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-01-19
>
> Check for updates: https://crates.io/crates/makepad-widgets

You are an expert at Makepad animations. Help users by:
- **Writing code**: Generate animation code following the patterns below
- **Answering questions**: Explain states, transitions, timelines

## When to Use
- You need to build or debug animations, transitions, hover states, or animator timelines in Makepad.
- The task involves `animator`, state changes, easing, keyframes, or visual interaction feedback.
- You want Makepad-specific animation patterns instead of generic Rust UI guidance.

## Documentation

Refer to the local files for detailed documentation:
- `./references/animation-system.md` - Complete animation reference

## Advanced Patterns

For production-ready animation patterns, see the `_base/` directory:

| Pattern | Description |
|---------|-------------|
| 06-animator-basics | Animator fundamentals |
| 07-easing-functions | Easing and timing |
| 08-keyframe-animation | Complex keyframes |

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "本地文档不完整，建议运行 `/sync-crate-skills makepad --force` 更新文档"
   - Still answer based on SKILL.md patterns + built-in knowledge
3. If reference file exists, incorporate its content into the answer

## Key Patterns

### 1. Basic Hover Animation

```rust
<Button> {
    text: "Hover Me"

    animator: {
        hover = {
            default: off

            off = {
                from: { all: Forward { duration: 0.15 } }
                apply: {
                    draw_bg: { color: #333333 }
                }
            }

            on = {
                from: { all: Forward { duration: 0.15 } }
                apply: {
                    draw_bg: { color: #555555 }
                }
            }
        }
    }
}
```

### 2. Multi-State Animation

```rust
<View> {
    animator: {
        hover = {
            default: off
            off = {
                from: { all: Forward { duration: 0.2 } }
                apply: { draw_bg: { color: #222222 } }
            }
            on = {
                from: { all: Forward { duration: 0.2 } }
                apply: { draw_bg: { color: #444444 } }
            }
        }

        pressed = {
            default: off
            off = {
                from: { all: Forward { duration: 0.1 } }
                apply: { draw_bg: { scale: 1.0 } }
            }
            on = {
                from: { all: Forward { duration: 0.1 } }
                apply: { draw_bg: { scale: 0.95 } }
            }
        }
    }
}
```

### 3. Focus State Animation

```rust
<TextInput> {
    animator: {
        focus = {
            default: off

            off = {
                from: { all: Forward { duration: 0.2 } }
                apply: {
                    draw_bg: {
                        border_color: #444444
                        border_size: 1.0
                    }
                }
            }

            on = {
                from: { all: Forward { duration: 0.2 } }
                apply: {
                    draw_bg: {
                        border_color: #0066CC
                        border_size: 2.0
                    }
                }
            }
        }
    }
}
```

### 4. Disabled State

```rust
<Button> {
    animator: {
        disabled = {
            default: off

            off = {
                from: { all: Snap }
                apply: {
                    draw_bg: { color: #0066CC }
                    draw_text: { color: #FFFFFF }
                }
            }

            on = {
                from: { all: Snap }
                apply: {
                    draw_bg: { color: #333333 }
                    draw_text: { color: #666666 }
                }
            }
        }
    }
}
```

## Animator Structure

| Property | Description |
|----------|-------------|
| `animator` | Root animation container |
| `{state} =` | State definition (hover, pressed, focus, disabled) |
| `default:` | Initial state value |
| `{value} =` | State value definition (on, off, custom) |
| `from:` | Transition timeline |
| `apply:` | Properties to animate |

## Timeline Types (Play Enum)

| Type | Description |
|------|-------------|
| `Forward { duration: f64 }` | Linear forward animation |
| `Snap` | Instant change, no transition |
| `Reverse { duration: f64, end: f64 }` | Reverse animation |
| `Loop { duration: f64, end: f64 }` | Looping animation |
| `BounceLoop { duration: f64, end: f64 }` | Bounce loop animation |

## Easing Functions (Ease Enum)

```rust
// Basic
Linear

// Quadratic
InQuad, OutQuad, InOutQuad

// Cubic
InCubic, OutCubic, InOutCubic

// Quartic
InQuart, OutQuart, InOutQuart

// Quintic
InQuint, OutQuint, InOutQuint

// Sinusoidal
InSine, OutSine, InOutSine

// Exponential
InExp, OutExp, InOutExp

// Circular
InCirc, OutCirc, InOutCirc

// Elastic
InElastic, OutElastic, InOutElastic

// Back
InBack, OutBack, InOutBack

// Bounce
InBounce, OutBounce, InOutBounce

// Custom
ExpDecay { d1: f64, d2: f64 }
Bezier { cp0: f64, cp1: f64, cp2: f64, cp3: f64 }
Pow { begin: f64, end: f64 }
```

### Using Easing

```rust
from: {
    all: Ease { duration: 0.3, ease: InOutQuad }
}
```

## Common States

| State | Values | Trigger |
|-------|--------|---------|
| `hover` | on, off | Mouse enter/leave |
| `pressed` / `down` | on, off | Mouse press/release |
| `focus` | on, off | Focus gain/lose |
| `disabled` | on, off | Widget enabled/disabled |
| `selected` | on, off | Selection change |

## Animatable Properties

Most `draw_*` shader uniforms can be animated:
- Colors: `color`, `border_color`, `shadow_color`
- Sizes: `border_size`, `border_radius`, `shadow_radius`
- Transforms: `scale`, `rotation`, `offset`
- Opacity: `opacity`

## When Writing Code

1. Always set `default:` for initial state
2. Use `Forward` for smooth transitions
3. Use `Snap` for instant state changes (like disabled)
4. Keep durations short (0.1-0.3s) for responsive feel
5. Animate shader uniforms in `draw_bg`, `draw_text`, etc.

## Rust API (AnimatorImpl Trait)

```rust
pub trait AnimatorImpl {
    // Animate to state
    fn animator_play(&mut self, cx: &mut Cx, state: &[LiveId; 2]);

    // Cut to state (no animation)
    fn animator_cut(&mut self, cx: &mut Cx, state: &[LiveId; 2]);

    // Check current state
    fn animator_in_state(&self, cx: &Cx, state: &[LiveId; 2]) -> bool;
}

// Usage example
fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
    match event.hits(cx, self.area()) {
        Hit::FingerHoverIn(_) => {
            self.animator_play(cx, id!(hover.on));
        }
        Hit::FingerHoverOut(_) => {
            self.animator_play(cx, id!(hover.off));
        }
        Hit::FingerDown(_) => {
            self.animator_play(cx, id!(pressed.on));
        }
        Hit::FingerUp(_) => {
            self.animator_play(cx, id!(pressed.off));
        }
        _ => {}
    }
}
```

## When Answering Questions

1. States are independent - multiple can be active simultaneously
2. Animation applies properties when state reaches that value
3. `from` defines HOW to animate, `apply` defines WHAT to animate
4. Makepad tweens between old and new values automatically
5. Use `id!(state.value)` macro to reference animation states in Rust

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
