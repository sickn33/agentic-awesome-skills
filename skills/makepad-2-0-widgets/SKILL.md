---
name: makepad-2-0-widgets
description: Makepad 2.0 guidance for widgets; use when building or debugging Makepad UI code.
source_repo: zhanghandong/makepad-skills
source_type: community
source: community
date_added: '2026-09-21'
risk: unknown
---
## When to Use
- Choose Makepad widgets or diagnose widget properties, list virtualization, dialogs or custom drawing in an existing Makepad project.
- Establish the exact dependency revision and DSL first; these imported dev-branch notes are not a stable 2.0 API contract or a compiled example suite. Check the matching [official Makepad source](https://github.com/makepad/makepad) before changing a working project.

# Makepad 2.0 Widget Catalog Skill

> **Version:** makepad-widgets (dev branch) | **Last Updated:** 2026-03-03

## Overview

Makepad 2.0 provides a rich set of built-in widgets for building UIs. These notes describe a Splash/script_mod-style project; do not assume they apply to every released or older Live DSL project.

## Documentation

Refer to the local files for detailed documentation:
- `./references/widget-catalog.md` - Complete widget list with properties
- `./references/widget-advanced.md` - Advanced patterns: PortalList, Dock, custom widgets, MapView

## IMPORTANT: Documentation Completeness Check

**Before answering questions, Claude MUST:**
1. Read the relevant reference file(s) listed above
2. Incorporate reference content into the answer

---

## Widget Categories Quick Reference

### Containers (Layout)

| Widget | Description | Key Properties |
|--------|-------------|----------------|
| `View` | Basic container (transparent) | width, height, flow, spacing, padding, align |
| `SolidView` | View with solid background | + show_bg: true, draw_bg.color |
| `RoundedView` | View with rounded corners | + draw_bg.border_radius |
| `RoundedAllView` | Per-corner radii | Check the vec4 draw_bg.border_radius API in the installed revision |
| `GradientXView` | Horizontal gradient bg | + draw_bg colors |
| `GradientYView` | Vertical gradient bg | + draw_bg colors |
| `ScrollXView` | Horizontal scrolling | scroll property |
| `ScrollYView` | Vertical scrolling | scroll property |
| `ScrollXYView` | Both-axis scrolling | scroll property |

### Text Widgets

| Widget | Description | Key Properties |
|--------|-------------|----------------|
| `Label` | Single/multi-line text | text, draw_text.color, draw_text.text_style.font_size |
| `H1` - `H4` | Heading levels | text (pre-styled) |
| `P` | Paragraph text | text |
| `TextInput` | Editable text field | text, empty_text, is_password, is_read_only, is_numeric_only |
| `Markdown` | Markdown renderer | body |
| `Html` | HTML renderer | body |
| `LinkLabel` | Clickable link text | text, url |

### Buttons

| Widget | Description | Key Properties |
|--------|-------------|----------------|
| `Button` | Standard button | text |
| `ButtonFlat` | Flat style button | text |
| `ButtonFlatter` | Minimal button | text |

### Toggles

| Widget | Description | Key Properties |
|--------|-------------|----------------|
| `CheckBox` | Check box | text, active |
| `Toggle` | Toggle switch | text, active |
| `RadioButton` | Radio button | text, active |

### Input Widgets

| Widget | Description | Key Properties |
|--------|-------------|----------------|
| `Slider` | Horizontal slider | min, max, step, default, precision |
| `DropDown` | Dropdown select | labels: ["a", "b", "c"] |

### Media

| Widget | Description | Key Properties |
|--------|-------------|----------------|
| `Image` | Image display | src, fit (Stretch/Horizontal/Vertical/Smallest/Biggest/Size) |
| `Svg` | External SVG file renderer | draw_svg.svg (crate_resource/http_resource), animating, draw_svg.color |
| `Icon` | SVG icon (tinted) | draw_icon.svg, draw_icon.color, icon_walk |
| `Vector` | Inline vector graphics | viewbox, Path{d: "..."} |
| `LoadingSpinner` | Loading indicator | color, rotation_speed |
| `MapView` | Map widget | center_lon, center_lat, zoom (MUST use fixed height!) |

### Layout Helpers

| Widget | Description | Usage |
|--------|-------------|-------|
| `Hr` | Horizontal rule | Divider line |
| `Vr` | Vertical rule | Vertical divider |
| `Filler` | Flexible space | Push siblings apart (use between Fit siblings only!) |
| `Splitter` | Resizable split | axis: Horizontal/Vertical, a/b children |
| `FoldHeader` | Collapsible section | header + body children |

### Lists

| Widget | Description | Usage |
|--------|-------------|-------|
| `PortalList` | Virtualized list | For large lists (100+ items), only renders visible items |
| `FlatList` | Simple list | For small lists, renders all items |

### Navigation

| Widget | Description | Control |
|--------|-------------|---------|
| `Modal` | Modal dialog | .open(cx) / .close(cx) from Rust |
| `Tooltip` | Tooltip popup | Hover-triggered |
| `PopupNotification` | Toast notification | Timed display |
| `SlidePanel` | Sliding panel | side (verify installed API) |
| `ExpandablePanel` | Expandable area | open/close |
| `PageFlip` | Page switcher | active_page: page_name |
| `StackNavigation` | Stack nav | push/pop pages |

### Dock System

| Widget | Description |
|--------|-------------|
| `Dock` | Tab container system |
| `DockSplitter` | Dock split panels |
| `DockTabs` | Tab bar |
| `DockTab` | Individual tab |

---

The snippets are illustrative and omit app registration/event wiring. Numeric input and password masking are presentation controls, not validation, encryption or authorization. Treat external Markdown/HTML, SVG, image URLs and map tiles as untrusted resources; restrict allowed schemes/hosts, bound decoding, honor asset licenses/attribution and verify privacy before enabling network fetches. Do not log text-input contents. Test keyboard navigation, focus return/trapping for modals, readable contrast and touch behavior.

## Critical Rules

### 1. height: Fit on Containers
```
// Possible Fill/Fit constraint mismatch; inspect the parent chain
View{ flow: Down Label{text: "Invisible"} }

// CORRECT
View{ height: Fit flow: Down Label{text: "Visible"} }
```

### 2. new_batch for Colored Containers with Text
```
// WRONG - text behind background
RoundedView{ draw_bg.color: #333 Label{text: "Invisible"} }

// CORRECT
RoundedView{ new_batch: true draw_bg.color: #333 Label{text: "Visible"} }
```

### 3. Named Children with :=
```
// Named (addressable, overridable)
title := Label{text: "Hello"}

// Static (not addressable)
Label{text: "Hello"}
```

### 4. Label Default Color is White
```
// Default text is white (#fff) - set color for light backgrounds
Label{text: "Dark text" draw_text.color: #333}
```

### 5. MapView MUST Have Fixed Height
```
// WRONG
MapView{ width: Fill height: Fill }

// CORRECT
View{ new_batch: true width: Fill height: 400
    MapView{ width: Fill height: 400 center_lat: 40.7 center_lon: -73.9 zoom: 14.0 }
}
```

### 6. Label Does NOT Support Animator
```
// WRONG (silently ignored)
Label{ animator: Animator{...} }

// CORRECT - wrap in View
View{ animator: Animator{...} Label{text: "Animated"} }
```

---

## Common Widget Patterns

### Card
```
RoundedView{
    width: Fill height: Fit
    padding: 16
    new_batch: true
    draw_bg.color: #2a2a3d
    draw_bg.border_radius: 8.0
    flow: Down spacing: 8
    title := Label{text: "Title" draw_text.color: #fff draw_text.text_style.font_size: 16}
    body := Label{text: "Content" draw_text.color: #aaa}
}
```

### Form Input
```
View{
    width: Fill height: Fit
    flow: Down spacing: 4
    Label{text: "Email" draw_text.color: #aaa draw_text.text_style.font_size: 11}
    email_input := TextInput{
        width: Fill height: 36
        empty_text: "Enter email..."
    }
}
```

### Scrollable List
```
ScrollYView{
    width: Fill height: Fill
    flow: Down spacing: 4
    new_batch: true
    on_render: || {
        for i, item in items {
            ItemTemplate{label.text: item.name}
        }
    }
}
```

---

## Best Practices

1. **Use `height: Fit`** on every container unless you want Fill or fixed pixels
2. **Use `new_batch: true`** on any View with background color + text children
3. **Use `:=`** for children you need to reference or override
4. **Use theme colors** (`theme.color_*`) instead of hardcoded colors
5. **Use `PortalList`** for large lists (virtualizes rendering)
6. **Use `ScrollYView`** for scrollable content areas
7. **Use `RoundedView`** for cards and containers (has border_radius)


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
