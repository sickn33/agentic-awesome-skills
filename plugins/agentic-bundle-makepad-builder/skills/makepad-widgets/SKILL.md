---
name: makepad-widgets
description: "Version: makepad-widgets (dev branch) | Last Updated: 2026-01-19 > > Check for updates: https://crates.io/crates/makepad-widgets"
risk: safe
source: community
---

# Makepad Widgets Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-01-19
>
> Check for updates: https://crates.io/crates/makepad-widgets

You are an expert at Makepad widgets. Help users by:
- **Writing code**: Generate widget code following the patterns below
- **Answering questions**: Explain widget properties, variants, and usage

## When to Use
- You need to work with core or advanced widgets in Makepad.
- The task involves widget selection, properties, variants, composition, or widget-specific behavior.
- You want examples for `View`, `Button`, labels, rich text, or other `makepad-widgets` building blocks.

## Documentation

Refer to the local files for detailed documentation:
- `./references/widgets-core.md` - Core widgets (View, Button, Label, etc.)
- `./references/widgets-advanced.md` - Helper and advanced widgets
- `./references/widgets-richtext.md` - Rich text widgets (Markdown, Html, TextFlow)

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**

1. Read the relevant reference file(s) listed above
2. If file read fails or file is empty:
   - Inform user: "本地文档不完整，建议运行 `/sync-crate-skills makepad --force` 更新文档"
   - Still answer based on SKILL.md patterns + built-in knowledge
3. If reference file exists, incorporate its content into the answer

## Key Patterns

### 1. View (Basic Container)

```rust
<View> {
    width: Fill
    height: Fill
    flow: Down
    padding: 16.0
    show_bg: true
    draw_bg: { color: #1A1A1A }

    <Label> { text: "Content" }
}
```

### 2. Button

```rust
<Button> {
    text: "Click Me"
    draw_bg: {
        color: #0066CC
        color_hover: #0088FF
        border_radius: 4.0
    }
    draw_text: {
        color: #FFFFFF
        text_style: { font_size: 14.0 }
    }
}
```

### 3. Label with Styling

```rust
<Label> {
    width: Fit
    height: Fit
    text: "Hello World"
    draw_text: {
        color: #FFFFFF
        text_style: {
            font_size: 16.0
            line_spacing: 1.4
        }
    }
}
```

### 4. Image

```rust
<Image> {
    width: 200.0
    height: 150.0
    source: dep("crate://self/resources/photo.png")
    fit: Contain
}
```

### 5. TextInput

```rust
<TextInput> {
    width: Fill
    height: Fit
    text: "Default value"
    draw_text: {
        text_style: { font_size: 14.0 }
    }
}
```

## Widget Traits (from source)

```rust
pub trait WidgetNode: LiveApply {
    fn find_widgets(&self, path: &[LiveId], cached: WidgetCache, results: &mut WidgetSet);
    fn walk(&mut self, cx: &mut Cx) -> Walk;
    fn area(&self) -> Area;
    fn redraw(&mut self, cx: &mut Cx);
}

pub trait Widget: WidgetNode {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {}
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep;
    fn draw(&mut self, cx: &mut Cx2d, scope: &mut Scope) -> DrawStep;
    fn widget(&self, path: &[LiveId]) -> WidgetRef;
}
```

## All Built-in Widgets (84 files in widgets/src/)

| Category | Widgets |
|----------|---------|
| **Basic** | `View`, `Label`, `Button`, `Icon`, `Image` |
| **Input** | `TextInput`, `CheckBox`, `RadioButton`, `Slider`, `DropDown`, `ColorPicker` |
| **Container** | `ScrollBars`, `PortalList`, `FlatList`, `StackNavigation`, `Dock`, `Splitter` |
| **Navigation** | `TabBar`, `Tab`, `FoldHeader`, `FoldButton`, `ExpandablePanel` |
| **Overlay** | `Modal`, `Tooltip`, `PopupMenu`, `PopupNotification` |
| **Media** | `Video`, `RotatedImage`, `ImageBlend`, `MultiImage` |
| **Layout** | `AdaptiveView`, `SlidePanel`, `PageFlip`, `SlidesView` |
| **Special** | `Markdown`, `Html`, `TextFlow`, `WebView`, `KeyboardView` |
| **Utility** | `LoadingSpinner`, `DesktopButton`, `LinkLabel`, `ScrollShadow` |

## Core Widgets Reference

| Widget | Purpose | Key Properties |
|--------|---------|----------------|
| `View` | Container | `flow`, `align`, `show_bg`, `draw_bg`, `optimize` |
| `Button` | Clickable | `text`, `draw_bg`, `draw_text`, `draw_icon` |
| `Label` | Text display | `text`, `draw_text` |
| `Image` | Image display | `source`, `fit` |
| `TextInput` | Text entry | `text`, `draw_text`, `draw_cursor`, `draw_selection` |
| `CheckBox` | Toggle | `text`, `selected` |
| `RadioButton` | Selection | `text`, `selected` |
| `Slider` | Value slider | `min`, `max`, `step` |
| `DropDown` | Select menu | `labels`, `selected` |
| `PortalList` | Virtual list | Efficient scrolling for large lists |
| `Modal` | Dialog | Overlay dialog boxes |
| `Tooltip` | Hint | Hover tooltips |

## View Variants

| Variant | Description |
|---------|-------------|
| `SolidView` | Solid background color |
| `RoundedView` | Rounded corners |
| `RoundedAllView` | Individual corner control |
| `RectView` | Rectangle with border/gradient |
| `CircleView` | Circle/ellipse shape |
| `GradientXView` | Horizontal gradient |
| `GradientYView` | Vertical gradient |
| `RoundedShadowView` | Rounded with shadow |
| `ScrollXView` | Horizontal scroll |
| `ScrollYView` | Vertical scroll |
| `ScrollXYView` | Both directions scroll |
| `CachedView` | Texture-cached |

## Button Variants

| Variant | Description |
|---------|-------------|
| `ButtonFlat` | Flat style |
| `ButtonFlatIcon` | Flat with icon |
| `ButtonFlatter` | No background |
| `ButtonGradientX` | Horizontal gradient |
| `ButtonGradientY` | Vertical gradient |
| `ButtonIcon` | Standard with icon |

## ImageFit Values

| Value | Description |
|-------|-------------|
| `Stretch` | Stretch to fill |
| `Contain` | Fit within, preserve ratio |
| `Cover` | Cover area, may crop |
| `Fill` | Fill without ratio |

## When Writing Code

1. Always set `width` and `height` on widgets
2. Use `show_bg: true` to enable background rendering
3. Access `draw_bg`, `draw_text`, `draw_icon` for shader uniforms
4. Use `dep("crate://self/...")` for resource paths
5. Choose appropriate View variant for visual needs

## When Answering Questions

1. Recommend UI Zoo example for widget exploration
2. View is the base container - most visual widgets inherit from it
3. Draw shaders (`draw_bg`, `draw_text`) control appearance
4. All widgets support animation through `animator` property

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
