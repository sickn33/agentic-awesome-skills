---
name: makepad-2.0-layout
description: Makepad 2.0 guidance for layout; use when building or debugging Makepad UI code.
source_repo: zhanghandong/makepad-skills
source_type: community
source: community
date_added: '2026-09-21'
risk: unknown
---

## Limitations

- Verify against current Makepad 2.0 docs; upstream APIs change frequently.
- Do not run bundled scripts without explicit user approval.

## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# Makepad 2.0 Layout System

Makepad uses a **layout turtle** system -- not CSS flexbox, not CSS grid. The turtle walks
through children one by one, placing each widget according to two core concepts:

- **Walk** -- how a widget sizes itself (width, height, margin)
- **Layout** -- how a container arranges its children (flow, spacing, padding, align)

Every container widget (View, SolidView, RoundedView, ScrollYView, etc.) has both Walk
properties (its own size) and Layout properties (how it lays out children).

---

## Walk System (Widget Sizing)

Walk controls how an individual widget claims space inside its parent.

### width / height

| Syntax | Meaning |
|--------|---------|
| `width: Fill` | Fill all remaining horizontal space (default) |
| `width: Fit` | Shrink to fit content |
| `width: 200` | Fixed 200 pixels |
| `width: Fill{min: 100 max: 500}` | Fill with constraints |
| `width: Fit{max: Abs(300)}` | Fit content, capped at 300px |
| `height: Fill` | Fill all remaining vertical space (default) |
| `height: Fit` | Shrink to fit content |
| `height: 100` | Fixed 100 pixels |

```
use mod.prelude.widgets.*

// Fill: takes all available width
View{
    width: Fill height: Fit
    flow: Down
    Label{text: "I stretch to fill the width"}
}

// Fit: shrinks to content
View{
    width: Fit height: Fit
    padding: 10
    Label{text: "I am only as wide as this text"}
}

// Fixed: exact pixel size
View{
    width: 300 height: 200
    Label{text: "I am exactly 300x200 pixels"}
}

// Constrained Fill: fills but within bounds
View{
    width: Fill{min: 200 max: 600} height: Fit
    flow: Down padding: 16
    Label{text: "I fill available space but stay between 200-600px"}
}
```

### CRITICAL: height: Fit on Containers

**This is the number one layout bug in Makepad.**

The default height is `Fill`. When your output renders inside a `Fit` container,
`Fill` inside `Fit` creates a circular dependency and resolves to **0 pixels**.
Your entire UI becomes invisible.

**Rule: ALWAYS set `height: Fit` on every View, SolidView, RoundedView, and similar
container unless the parent has a fixed or Fill height.**

```
// CORRECT -- height: Fit makes the container visible
View{
    width: Fill height: Fit
    flow: Down padding: 10
    Label{text: "I am visible"}
}

// WRONG -- defaults to height: Fill, resolves to 0px, invisible
View{
    width: Fill
    flow: Down padding: 10
    Label{text: "I am invisible (0px tall)"}
}
```

**Exceptions where height: Fill is acceptable:**
1. Inside a fixed-height parent:
```
View{
    height: 400
    View{
        height: Fill
        Label{text: "I fill the 400px parent"}
    }
}
```
2. Inside a `height: Fill` chain that ultimately reaches a known size (e.g., Window body).
3. ScrollYView always uses `height: Fill` because it must fill its parent to scroll.

### margin

Margin adds space around the outside of a widget.

```
// Uniform margin on all sides
Label{text: "Hello" margin: 10}

// Selective margin with Inset
Label{
    text: "Indented"
    margin: Inset{top: 5 bottom: 5 left: 20 right: 20}
}

// Zero margin (note the trailing dot for float literal)
Label{text: "Flush" margin: 0.}
```

---

## Layout System (Child Arrangement)

Layout controls how a container positions its children.

### flow (Direction)

| Syntax | Meaning | CSS Equivalent |
|--------|---------|----------------|
| `flow: Right` | Left-to-right, single line (default) | `flex-direction: row` |
| `flow: Down` | Top-to-bottom, single column | `flex-direction: column` |
| `flow: Overlay` | Stack children on top of each other | `position: absolute` stacking |
| `flow: Flow.Right{wrap: true}` | Left-to-right with wrapping | `flex-wrap: wrap` |
| `flow: Flow.Down{wrap: true}` | Top-to-bottom with wrapping | column wrap |

```
use mod.prelude.widgets.*

// Vertical stack (most common)
View{
    width: Fill height: Fit
    flow: Down spacing: 10
    Label{text: "First"}
    Label{text: "Second"}
    Label{text: "Third"}
}

// Horizontal row
View{
    width: Fill height: Fit
    flow: Right spacing: 10
    Label{text: "Left"}
    Label{text: "Center"}
    Label{text: "Right"}
}

// Overlay -- children stacked on top of each other
View{
    width: Fill height: 200
    flow: Overlay
    Image{width: Fill height: Fill fit: ImageFit.Biggest}
    View{
        width: Fill height: Fit
        align: Align{x: 0.5 y: 1.0}
        padding: 10
        Label{text: "Caption overlay" draw_text.color: #fff}
    }
}

// Wrapping flow -- like a tag cloud or grid of cards
View{
    width: Fill height: Fit
    flow: Flow.Right{wrap: true}
    spacing: 8
    padding: 10
    Label{text: "Tag 1" margin: 4}
    Label{text: "Tag 2" margin: 4}
    Label{text: "Tag 3" margin: 4}
    Label{text: "Tag 4" margin: 4}
}
```

### spacing

Gap between children. A single number applies uniformly.

```
View{
    flow: Down spacing: 12
    Label{text: "12px gap below me"}
    Label{text: "12px gap above and below me"}
    Label{text: "12px gap above me"}
}
```

### padding

Inner space between the container edge and its children.

```
// Uniform padding
View{
    width: Fill height: Fit
    padding: 20
    Label{text: "20px padding on all sides"}
}

// Selective padding with Inset
View{
    width: Fill height: Fit
    padding: Inset{top: 10 bottom: 10 left: 24 right: 24}
    Label{text: "Different padding per side"}
}
```

### align (Child Alignment)

Alignment positions children within the remaining space of the container.
Values range from 0.0 (start) to 1.0 (end) on each axis.

#### Alignment Reference Table

| Shorthand | Equivalent | Description |
|-----------|-----------|-------------|
| `Center` | `Align{x: 0.5 y: 0.5}` | Center on both axes |
| `HCenter` | `Align{x: 0.5 y: 0.0}` | Horizontal center, top-aligned |
| `VCenter` | `Align{x: 0.0 y: 0.5}` | Left-aligned, vertical center |
| `TopLeft` | `Align{x: 0.0 y: 0.0}` | Top-left corner (default) |
| `Align{x: 1.0 y: 0.0}` | -- | Top-right corner |
| `Align{x: 0.0 y: 1.0}` | -- | Bottom-left corner |
| `Align{x: 1.0 y: 1.0}` | -- | Bottom-right corner |
| `Align{x: 0.5 y: 1.0}` | -- | Bottom center |

```
use mod.prelude.widgets.*

// Center everything
View{
    width: Fill height: 300
    align: Center
    Label{text: "I am centered"}
}

// Horizontal center only (children flow from top)
View{
    width: Fill height: Fit
    flow: Down
    align: HCenter
    Label{text: "I am horizontally centered"}
}

// Vertically center children in a horizontal row
View{
    width: Fill height: 60
    flow: Right spacing: 10
    align: Align{y: 0.5}
    Label{text: "Vertically centered" draw_text.text_style.font_size: 14}
    Label{text: "Small text" draw_text.text_style.font_size: 9}
}
```

### clip_x / clip_y

Controls whether overflowing content is clipped.

```
// Clip overflow (default behavior)
View{
    width: 200 height: 100
    clip_x: true
    clip_y: true
    Label{text: "Very long text that will be clipped at the container boundary"}
}

// Allow overflow to be visible
View{
    width: 200 height: 100
    clip_x: false
    clip_y: false
    Label{text: "This text can overflow beyond the container"}
}
```

**Important boundary:** `clip_x: false` / `clip_y: false` only allow a local child to
paint outside its parent. They do NOT turn that child into a true window-level overlay.
If the UI element is a popup/menu/tooltip that should float independently of the local
layout tree, use a top-level `Modal`/overlay owner instead of relying on local overflow.

### Overlay Popups: `walk.abs_pos` vs `margin`

For popup-style positioning inside an overlay (`Modal`, tooltip layer, popup owner),
prefer `walk.abs_pos` over runtime `margin` tweaks.

- `margin` is layout spacing. It is best for nudging normal flow children.
- `walk.abs_pos` is an explicit turtle anchor for overlay-style placement.
- `button.area().clipped_rect(cx)` gives you the trigger's actual screen-space rect,
  including `view_shift` and clipping.
- For overlay content, compute the popup's absolute screen-space target, then write
  that into `popup.walk.abs_pos = Some(dvec2(x, y))`.

```rust
let button_rect = button.area().clipped_rect(cx);
let popup_pos = dvec2(button_rect.pos.x, button_rect.pos.y - 294.0);

if let Some(mut popup) = self.view(cx, ids!(popup)).borrow_mut() {
    popup.walk.abs_pos = Some(popup_pos);
}
```

**Rule of thumb:**
- Popup inside normal layout tree, only slight overflow needed: local child + `clip_x/clip_y: false`
- Popup anchored to a button but visually outside the component: top-level overlay + `walk.abs_pos`

**Common mistake:** Using `script_apply_eval!` to push `margin.top` / `margin.left` on
overlay content and expecting stable popup coordinates. That often produces misleading
results because you are still negotiating with layout, not explicitly anchoring the popup.

---

## Inset Syntax

The `Inset` type is used for both `padding` and `margin`. It supports two forms:

```
// Bare number -- uniform on all four sides
padding: 10
margin: 5

// Inset struct -- specify individual sides
padding: Inset{top: 10 bottom: 10 left: 20 right: 20}
margin: Inset{top: 0 bottom: 8 left: 0 right: 0}

// Zero (use trailing dot for float literal)
margin: 0.

// You can omit sides you do not need -- they default to 0
padding: Inset{left: 16 right: 16}
```

Both `padding` and `margin` accept the same Inset syntax. Padding is inside the
container, margin is outside.

---

## Scrollable Containers

Makepad provides three scrollable view variants. They inherit all View properties
and add scrollbar behavior.

| Widget | Scroll Direction | Typical Use |
|--------|-----------------|-------------|
| `ScrollYView` | Vertical only | Long lists, page content |
| `ScrollXView` | Horizontal only | Wide tables, timelines |
| `ScrollXYView` | Both axes | Maps, canvases, large content |

```
use mod.prelude.widgets.*

// Vertical scrolling -- the most common pattern
// Note: ScrollYView uses height: Fill (not Fit) to define the scroll viewport
ScrollYView{
    width: Fill height: Fill
    flow: Down padding: 10 spacing: 8
    Label{text: "Item 1"}
    Label{text: "Item 2"}
    Label{text: "Item 3"}
    Label{text: "Item 4"}
    Label{text: "Item 5"}
    Label{text: "Item 6"}
}

// Horizontal scrolling
ScrollXView{
    width: Fill height: 60
    flow: Right spacing: 10 padding: 10
    align: Align{y: 0.5}
    Label{text: "Tab 1"}
    Label{text: "Tab 2"}
    Label{text: "Tab 3"}
    Label{text: "Tab 4"}
}

// Both-axis scrolling
ScrollXYView{
    width: Fill height: Fill
    Label{text: "Large content that can be scrolled in both directions"}
}
```

**When to use which:**
- `ScrollYView` -- page body, lists, vertical content. **This is what you need 90% of the time.**
- `ScrollXView` -- horizontal tab bars, code scrolling, timeline views.
- `ScrollXYView` -- 2D canvases, maps, spreadsheet-style content.

**Important:** Scrollable views use `height: Fill` (not `height: Fit`) because they
need a fixed viewport to scroll within. The content inside grows beyond the viewport.

---

## Filler (Spacer Widget)

`Filler{}` is equivalent to `View{width: Fill height: Fill}`. It pushes siblings apart.

**Critical rule: Only use Filler between `width: Fit` siblings.**

Do NOT use `Filler{}` next to a `width: Fill` sibling. Both compete for remaining space,
splitting it 50/50 and clipping text.

```
use mod.prelude.widgets.*

// CORRECT: Filler between Fit siblings
View{
    width: Fill height: Fit
    flow: Right
    align: Align{y: 0.5}
    Label{text: "Left side"}
    Filler{}
    Label{text: "Right side"}
}

// WRONG: Filler next to a Fill sibling -- text gets clipped
View{
    width: Fill height: Fit
    flow: Right
    Label{width: Fill text: "This gets clipped to half width"}
    Filler{}
    Label{text: "Tag"}
}

// CORRECT alternative: width: Fill naturally pushes Fit siblings
View{
    width: Fill height: Fit
    flow: Right
    View{
        width: Fill height: Fit
        flow: Down
        Label{text: "Title takes remaining space"}
        Label{text: "Subtitle"}
    }
    Label{text: "Tag"}
}
```

---

## Common Layout Patterns

### Vertical Page Layout

```
use mod.prelude.widgets.*

View{
    width: Fill height: Fit
    flow: Down spacing: 16 padding: 20
    Label{text: "Page Title" draw_text.color: #fff draw_text.text_style.font_size: 18}
    Label{text: "Subtitle text" draw_text.color: #aaa draw_text.text_style.font_size: 12}
    Hr{}
    Label{text: "Body content goes here" draw_text.color: #ddd}
}
```

### Horizontal Toolbar

```
use mod.prelude.widgets.*

SolidView{
    width: Fill height: 44
    flow: Right spacing: 8
    padding: Inset{left: 12 right: 12}
    align: Align{y: 0.5}
    draw_bg.color: #2a2a3d

## Extended reference

See [references/extended-guide.md](references/extended-guide.md) for the full upstream document.

