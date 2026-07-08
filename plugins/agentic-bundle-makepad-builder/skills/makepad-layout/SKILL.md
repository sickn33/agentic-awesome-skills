---
name: makepad-layout
description: |
  CRITICAL: Use for Makepad layout system. Triggers on:
  makepad layout, makepad width, makepad height, makepad flex,
  makepad padding, makepad margin, makepad flow, makepad align,
  Fit, Fill, Size, Walk, "how to center in makepad",
  makepad 布局, makepad 宽度, makepad 对齐, makepad 居中
risk: safe
source: community
---

# Makepad Layout Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-01-19
>
> Check for updates: https://crates.io/crates/makepad-widgets

You are an expert at Makepad layout system. Help users by:
- **Writing code**: Generate layout code following the patterns below
- **Answering questions**: Explain layout concepts, sizing, flow directions

## When to Use
- You need to size, align, or position widgets in a Makepad UI.
- The task involves `Walk`, `Align`, `Fit`, `Fill`, padding, spacing, or container flow configuration.
- You want Makepad-specific layout solutions for centering, responsiveness, or composition.

## Documentation

Refer to the local files for detailed documentation:
- `./references/layout-system.md` - Complete layout reference
- `./references/core-types.md` - Walk, Align, Margin, Padding types

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "本地文档不完整，建议运行 `/sync-crate-skills makepad --force` 更新文档"
   - Still answer based on SKILL.md patterns + built-in knowledge
3. If reference file exists, incorporate its content into the answer

## Key Patterns

### 1. Basic Layout Container

```rust
<View> {
    width: Fill
    height: Fill
    flow: Down
    padding: 16.0
    spacing: 8.0

    <Label> { text: "Item 1" }
    <Label> { text: "Item 2" }
}
```

### 2. Centering Content

```rust
<View> {
    width: Fill
    height: Fill
    align: { x: 0.5, y: 0.5 }

    <Label> { text: "Centered" }
}
```

### 3. Horizontal Row Layout

```rust
<View> {
    width: Fill
    height: Fit
    flow: Right
    spacing: 10.0
    align: { y: 0.5 }  // Vertically center items

    <Button> { text: "Left" }
    <View> { width: Fill }  // Spacer
    <Button> { text: "Right" }
}
```

### 4. Fixed + Flexible Layout

```rust
<View> {
    width: Fill
    height: Fill
    flow: Down

    // Fixed header
    <View> {
        width: Fill
        height: 60.0
    }

    // Flexible content
    <View> {
        width: Fill
        height: Fill  // Takes remaining space
    }
}
```

## Layout Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `width` | Size | Width of element |
| `height` | Size | Height of element |
| `padding` | Padding | Inner spacing |
| `margin` | Margin | Outer spacing |
| `flow` | Flow | Child layout direction |
| `spacing` | f64 | Gap between children |
| `align` | Align | Child alignment |
| `clip_x` | bool | Clip horizontal overflow |
| `clip_y` | bool | Clip vertical overflow |

## Size Values

| Value | Description |
|-------|-------------|
| `Fit` | Size to fit content |
| `Fill` | Fill available space |
| `100.0` | Fixed size in pixels |
| `Fixed(100.0)` | Explicit fixed size |

## Flow Directions

| Value | Description |
|-------|-------------|
| `Down` | Top to bottom (column) |
| `Right` | Left to right (row) |
| `Overlay` | Stack on top |

## Align Values

| Value | Position |
|-------|----------|
| `{ x: 0.0, y: 0.0 }` | Top-left |
| `{ x: 0.5, y: 0.0 }` | Top-center |
| `{ x: 1.0, y: 0.0 }` | Top-right |
| `{ x: 0.0, y: 0.5 }` | Middle-left |
| `{ x: 0.5, y: 0.5 }` | Center |
| `{ x: 1.0, y: 0.5 }` | Middle-right |
| `{ x: 0.0, y: 1.0 }` | Bottom-left |
| `{ x: 0.5, y: 1.0 }` | Bottom-center |
| `{ x: 1.0, y: 1.0 }` | Bottom-right |

## Box Model

```
+---------------------------+
|         margin            |
|  +---------------------+  |
|  |      padding        |  |
|  |  +---------------+  |  |
|  |  |   content     |  |  |
|  |  +---------------+  |  |
|  +---------------------+  |
+---------------------------+
```

## When Writing Code

1. Use `Fill` for flexible containers, `Fit` for content-sized elements
2. Set `flow: Down` for vertical, `flow: Right` for horizontal
3. Use empty `<View> { width: Fill }` as spacer in row layouts
4. Always set explicit dimensions on fixed-size elements
5. Use `align` to position children within container

## When Answering Questions

1. Makepad uses a "turtle" layout model - elements laid out sequentially
2. `Fill` takes all available space, `Fit` shrinks to content
3. Unlike CSS flexbox, there's no flex-grow/shrink - use Fill/Fit
4. Alignment applies to children, not the element itself

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
