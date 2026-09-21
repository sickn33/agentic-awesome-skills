# Makepad 2.0 Layout Patterns Reference

Complete, working layout examples using Makepad 2.0 Splash syntax. Every example
starts with `use mod.prelude.widgets.*` and uses correct syntax (no commas, no semicolons,
colon for property assignment).

---

## 1. Simple Vertical Stack

A basic top-to-bottom layout with spacing between items.

```
use mod.prelude.widgets.*

View{
    width: Fill height: Fit
    flow: Down spacing: 8 padding: 16

    Label{text: "First item" draw_text.color: #fff}
    Label{text: "Second item" draw_text.color: #ddd}
    Label{text: "Third item" draw_text.color: #bbb}
}
```

**Key points:**
- `flow: Down` stacks children vertically
- `spacing: 8` adds 8px between each child
- `height: Fit` makes the container shrink to its content

---

## 2. Horizontal Row with Spacing

Items laid out left-to-right with vertical centering.

```
use mod.prelude.widgets.*

View{
    width: Fill height: Fit
    flow: Right spacing: 12 padding: 10
    align: Align{y: 0.5}

    RoundedView{
        width: 40 height: 40
        draw_bg.color: #4a9eff
        draw_bg.border_radius: 20.0
        align: Center
        Label{text: "A" draw_text.color: #fff}
    }
    View{
        width: Fit height: Fit
        flow: Down spacing: 2
        Label{text: "Alice Johnson" draw_text.color: #fff draw_text.text_style.font_size: 12}
        Label{text: "Online" draw_text.color: #6f6 draw_text.text_style.font_size: 9}
    }
    Filler{}
    ButtonFlatter{text: "Message"}
}
```

**Key points:**
- `flow: Right` lays children out horizontally
- `align: Align{y: 0.5}` vertically centers all children
- `Filler{}` pushes the button to the far right (used between Fit siblings)

---

## 3. Card Layout (RoundedView with Padding)

A styled card container with title and body text.

```
use mod.prelude.widgets.*

let InfoCard = RoundedView{
    width: Fill height: Fit
    padding: 16 flow: Down spacing: 8
    draw_bg.color: #2a2a3d
    draw_bg.border_radius: 10.0
    new_batch: true
    title := Label{text: "Title" draw_text.color: #fff draw_text.text_style.font_size: 14}
    body := Label{text: "Body" draw_text.color: #aaa draw_text.text_style.font_size: 11}
}

View{
    width: Fill height: Fit
    flow: Down spacing: 12 padding: 20
    InfoCard{title.text: "Getting Started" body.text: "Learn how to build your first Makepad app."}
    InfoCard{title.text: "Components" body.text: "Explore the built-in widget library."}
    InfoCard{title.text: "Deployment" body.text: "Ship to desktop, mobile, and web."}
}
```

**Key points:**
- `let InfoCard` defines a reusable template
- `title :=` and `body :=` create named children that can be overridden
- `new_batch: true` ensures text renders on top of the background
- Override children with `InfoCard{title.text: "New Title"}`

---

## 4. Responsive Wrap Layout

A tag cloud or card grid that wraps to the next line when the container is full.

```
use mod.prelude.widgets.*

let Tag = RoundedView{
    width: Fit height: Fit
    padding: Inset{top: 4 bottom: 4 left: 10 right: 10}
    draw_bg.color: #335
    draw_bg.border_radius: 12.0
    new_batch: true
    label := Label{text: "tag" draw_text.color: #8af draw_text.text_style.font_size: 10}
}

View{
    width: Fill height: Fit
    flow: Flow.Right{wrap: true}
    spacing: 8 padding: 12

    Tag{label.text: "Rust"}
    Tag{label.text: "Makepad"}
    Tag{label.text: "UI"}
    Tag{label.text: "Layout"}
    Tag{label.text: "Splash"}
    Tag{label.text: "GPU"}
    Tag{label.text: "Shaders"}
    Tag{label.text: "Cross-platform"}
    Tag{label.text: "Hot reload"}
    Tag{label.text: "Streaming"}
}
```

**Key points:**
- `flow: Flow.Right{wrap: true}` wraps children to the next line
- Each tag uses `width: Fit` so it sizes to its content
- Tags automatically wrap when the row is full

---

## 5. Sidebar + Main Content

A two-column layout with a fixed-width sidebar and a flexible main area.

```
use mod.prelude.widgets.*

let NavItem = View{
    width: Fill height: Fit
    padding: Inset{top: 8 bottom: 8 left: 16 right: 16}
    label := Label{text: "Item" draw_text.color: #aaa draw_text.text_style.font_size: 11}
}

View{
    width: Fill height: Fill
    flow: Right

    // Sidebar: fixed width, fills height
    SolidView{
        width: 220 height: Fill
        draw_bg.color: #1a1a2e
        flow: Down spacing: 2 padding: Inset{top: 16 bottom: 16}

        Label{
            text: "Navigation"
            draw_text.color: #fff
            draw_text.text_style.font_size: 13
            margin: Inset{left: 16 bottom: 12}
        }
        Hr{}
        NavItem{label.text: "Dashboard"}
        NavItem{label.text: "Projects"}
        NavItem{label.text: "Settings"}
        NavItem{label.text: "Help"}
    }

    // Main content: fills remaining width
    ScrollYView{
        width: Fill height: Fill
        flow: Down padding: 24 spacing: 16

        Label{text: "Dashboard" draw_text.color: #fff draw_text.text_style.font_size: 20}
        Label{text: "Welcome to your workspace." draw_text.color: #aaa draw_text.text_style.font_size: 12}

        RoundedView{
            width: Fill height: Fit
            padding: 16 flow: Down spacing: 8
            draw_bg.color: #2a2a3d
            draw_bg.border_radius: 8.0
            new_batch: true
            Label{text: "Recent Activity" draw_text.color: #fff draw_text.text_style.font_size: 14}
            Label{text: "No recent activity." draw_text.color: #888}
        }
    }
}
```

**Key points:**
- Sidebar has `width: 220` (fixed) and `height: Fill`
- Main content has `width: Fill` to take remaining space
- ScrollYView wraps the main content for scrolling

---

## 6. Header / Body / Footer with ScrollYView

A common app layout: fixed header, scrollable body, fixed footer.

```
use mod.prelude.widgets.*

let ListItem = RoundedView{
    width: Fill height: Fit
    padding: Inset{top: 10 bottom: 10 left: 14 right: 14}
    margin: Inset{top: 2 bottom: 2 left: 8 right: 8}
    draw_bg.color: #2a2a3d
    draw_bg.border_radius: 6.0
    flow: Right spacing: 10
    align: Align{y: 0.5}
    new_batch: true
    label := Label{text: "Item" draw_text.color: #ddd draw_text.text_style.font_size: 11}
    Filler{}
    tag := Label{text: "" draw_text.color: #888 draw_text.text_style.font_size: 9}
}

View{
    width: Fill height: Fill
    flow: Down

    // Header (fixed)
    SolidView{
        width: Fill height: Fit
        padding: Inset{top: 14 bottom: 14 left: 20 right: 20}
        draw_bg.color: #1e1e2e
        flow: Right
        align: Align{y: 0.5}
        new_batch: true
        Label{text: "My App" draw_text.color: #fff draw_text.text_style.font_size: 16}
        Filler{}
        ButtonFlatter{text: "Help"}
    }

    // Body (scrollable, fills remaining space)
    ScrollYView{
        width: Fill height: Fill
        flow: Down spacing: 4 padding: Inset{top: 8 bottom: 8}

        ListItem{label.text: "Set up development environment" tag.text: "dev"}
        ListItem{label.text: "Design landing page" tag.text: "design"}
        ListItem{label.text: "Write documentation" tag.text: "docs"}
        ListItem{label.text: "Review pull requests" tag.text: "dev"}
        ListItem{label.text: "Plan sprint retrospective" tag.text: "team"}
        ListItem{label.text: "Update dependencies" tag.text: "maintenance"}
        ListItem{label.text: "Deploy to staging" tag.text: "ops"}
        ListItem{label.text: "User interview prep" tag.text: "research"}
    }

    // Footer (fixed)
    SolidView{
        width: Fill height: Fit
        padding: Inset{top: 8 bottom: 8 left: 20 right: 20}
        draw_bg.color: #1a1a28
        new_batch: true
        Label{text: "8 items" draw_text.color: #666 draw_text.text_style.font_size: 9}
    }
}
```

**Key points:**
- Header and footer use `height: Fit` to shrink to content
- ScrollYView uses `height: Fill` to take all remaining vertical space
- The scroll viewport is automatically the space between header and footer

---

## 7. Centered Dialog

A dialog box centered in the viewport with a dimmed background.

```
use mod.prelude.widgets.*

View{
    width: Fill height: Fill
    flow: Overlay

    // Dimmed background layer
    SolidView{
        width: Fill height: Fill
        draw_bg.color: #0008
    }

    // Centered dialog
    View{
        width: Fill height: Fill
        align: Center

        RoundedView{
            width: 360 height: Fit
            padding: 24 flow: Down spacing: 16
            draw_bg.color: #2c2c40
            draw_bg.border_radius: 12.0
            new_batch: true

            Label{text: "Delete Project?" draw_text.color: #fff draw_text.text_style.font_size: 16}
            Label{
                width: Fill
                text: "This action cannot be undone. All project data will be permanently removed."
                draw_text.color: #aaa draw_text.text_style.font_size: 11
            }
            Hr{}
            View{
                width: Fill height: Fit
                flow: Right spacing: 8
                align: Align{x: 1.0 y: 0.5}
                ButtonFlat{text: "Cancel"}
                Button{text: "Delete"}
            }
        }
    }
}
```

**Key points:**
- `flow: Overlay` stacks the dim background behind the dialog
- The inner View with `align: Center` positions the dialog in the center
- Dialog itself uses `width: 360` (fixed) with `height: Fit`

---

## 8. Grid-like Layout Using Nested Flows

Makepad has no CSS grid. Simulate a grid with nested flow: Right rows inside a flow: Down column.

```
use mod.prelude.widgets.*

let Cell = RoundedView{
    width: Fill height: 80
    padding: 10 flow: Down spacing: 4
    draw_bg.color: #334
    draw_bg.border_radius: 6.0
    align: Center
    new_batch: true
    value := Label{text: "0" draw_text.color: #fff draw_text.text_style.font_size: 20}
    label := Label{text: "Metric" draw_text.color: #888 draw_text.text_style.font_size: 9}
}

View{
    width: Fill height: Fit
    flow: Down spacing: 8 padding: 16

    // Row 1
    View{
        width: Fill height: Fit
        flow: Right spacing: 8
        Cell{value.text: "142" label.text: "Users"}
        Cell{value.text: "38" label.text: "Active"}
        Cell{value.text: "97%" label.text: "Uptime"}
    }

    // Row 2
    View{
        width: Fill height: Fit
        flow: Right spacing: 8
        Cell{value.text: "2.4k" label.text: "Requests"}
        Cell{value.text: "12ms" label.text: "Latency"}
        Cell{value.text: "0" label.text: "Errors"}
    }
}
```

**Key points:**
- Each row is a `flow: Right` container
- Cells use `width: Fill` to distribute evenly across the row
- Rows are stacked vertically with `flow: Down`
- This gives a 3-column, 2-row grid appearance

---

## 9. Navigation Bar Pattern

A horizontal navigation bar with logo, links, and action button.

```
use mod.prelude.widgets.*

SolidView{
    width: Fill height: 48
    flow: Right spacing: 0
    padding: Inset{left: 16 right: 16}
    align: Align{y: 0.5}
    draw_bg.color: #1a1a2e
    new_batch: true

    // Logo / brand
    Label{
        text: "Makepad"
        draw_text.color: #4a9eff
        draw_text.text_style.font_size: 15
        margin: Inset{right: 24}
    }

    // Navigation links
    ButtonFlatter{text: "Home" margin: Inset{left: 4 right: 4}}
    ButtonFlatter{text: "Docs" margin: Inset{left: 4 right: 4}}
    ButtonFlatter{text: "Examples" margin: Inset{left: 4 right: 4}}
    ButtonFlatter{text: "Community" margin: Inset{left: 4 right: 4}}

    Filler{}

    // Right-side action
    Button{text: "Sign In"}
}
```

**Key points:**
- `height: 48` gives a fixed nav bar height
- `align: Align{y: 0.5}` vertically centers all children
- `Filler{}` pushes the Sign In button to the right
- All nav items use `width: Fit` (default for ButtonFlatter)

---

## 10. Tab-style Layout with PageFlip

PageFlip shows one page at a time based on `active_page`. Combine with buttons
for tab-style navigation.

```
use mod.prelude.widgets.*

View{
    width: Fill height: Fill
    flow: Down

    // Tab bar
    SolidView{
        width: Fill height: Fit
        flow: Right spacing: 0
        draw_bg.color: #222
        padding: Inset{left: 8 right: 8 top: 4 bottom: 0}

        tab_home := ButtonFlatter{text: "Home" margin: Inset{right: 4}}
        tab_settings := ButtonFlatter{text: "Settings" margin: Inset{right: 4}}
        tab_about := ButtonFlatter{text: "About"}
    }

    // Page content
    pages := PageFlip{
        active_page := home_page
        width: Fill height: Fill

        home_page := ScrollYView{
            width: Fill height: Fill
            flow: Down padding: 20 spacing: 12
            Label{text: "Home Page" draw_text.color: #fff draw_text.text_style.font_size: 18}
            Label{text: "Welcome to the home page content." draw_text.color: #aaa}
        }

        settings_page := ScrollYView{
            width: Fill height: Fill
            flow: Down padding: 20 spacing: 12
            Label{text: "Settings" draw_text.color: #fff draw_text.text_style.font_size: 18}
            Label{text: "Configure your preferences here." draw_text.color: #aaa}
        }

        about_page := View{
            width: Fill height: Fill
            flow: Down padding: 20 spacing: 12
            Label{text: "About" draw_text.color: #fff draw_text.text_style.font_size: 18}
            Label{text: "Version 2.0" draw_text.color: #aaa}
        }
    }
}
```

**Key points:**
- `PageFlip` shows only one child at a time
- `active_page := home_page` sets the initially visible page
- Each page is a named child with `:=`
- Tab switching is done programmatically by changing `active_page`

---

## 11. Todo-style List Item with Right-aligned Tag

A pattern from the official Makepad Todo example: horizontal row with label, filler, and tag.

```
use mod.prelude.widgets.*

let TodoItem = RoundedView{
    width: Fill height: Fit
    padding: Inset{top: 8 bottom: 8 left: 12 right: 12}
    flow: Right spacing: 10
    align: Align{y: 0.5}
    draw_bg.color: #2a2a3d
    draw_bg.border_radius: 8.0
    new_batch: true

    check := CheckBox{text: ""}
    label := Label{
        width: Fill
        text: "task"
        draw_text.color: #ddd
        draw_text.text_style.font_size: 11
    }
    tag := RoundedView{
        width: Fit height: Fit
        padding: Inset{top: 2 bottom: 2 left: 8 right: 8}
        draw_bg.color: #335
        draw_bg.border_radius: 4.0
        new_batch: true
        tag_label := Label{text: "" draw_text.color: #8af draw_text.text_style.font_size: 9}
    }
}

View{
    width: Fill height: Fit
    flow: Down spacing: 4 padding: 12
    TodoItem{label.text: "Walk the dog" tag.tag_label.text: "personal"}
    TodoItem{label.text: "Fix login bug" tag.tag_label.text: "urgent"}
    TodoItem{label.text: "Write unit tests" tag.tag_label.text: "dev"}
}
```

**Key points:**
- Label uses `width: Fill` to take remaining space, pushing tag to the right
- No Filler needed because `width: Fill` on the label does the job
- Tag has `width: Fit` so it shrinks to its content
- Nested override path: `tag.tag_label.text` reaches into the tag's inner label

---

## 12. Profile Card with Avatar and Stats Row

Combining horizontal and vertical layouts in a card.

```
use mod.prelude.widgets.*

let StatItem = View{
    width: Fill height: Fit
    flow: Down spacing: 2
    align: HCenter
    value := Label{text: "0" draw_text.color: #fff draw_text.text_style.font_size: 16}
    label := Label{text: "Stat" draw_text.color: #888 draw_text.text_style.font_size: 9}
}

RoundedView{
    width: Fill height: Fit
    padding: 20 flow: Down spacing: 16
    draw_bg.color: #2a2a3d
    draw_bg.border_radius: 12.0
    align: HCenter
    new_batch: true

    // Avatar placeholder
    CircleView{
        width: 64 height: 64
        draw_bg.color: #4a9eff
        align: Center
        Label{text: "JD" draw_text.color: #fff draw_text.text_style.font_size: 18}
    }

    Label{text: "Jane Doe" draw_text.color: #fff draw_text.text_style.font_size: 16}
    Label{text: "Software Engineer" draw_text.color: #888 draw_text.text_style.font_size: 11}

    Hr{}

    // Stats row
    View{
        width: Fill height: Fit
        flow: Right spacing: 0
        StatItem{value.text: "142" label.text: "Posts"}
        StatItem{value.text: "1.2k" label.text: "Followers"}
        StatItem{value.text: "89" label.text: "Following"}
    }
}
```

---

## 13. Form Layout with Labels and Inputs

A vertical form with left-aligned labels and full-width inputs.

```
use mod.prelude.widgets.*

let FormField = View{
    width: Fill height: Fit
    flow: Down spacing: 4
    label := Label{text: "Label" draw_text.color: #aaa draw_text.text_style.font_size: 10}
    input := TextInput{width: Fill height: Fit empty_text: "Enter value"}
}

RoundedView{
    width: Fill height: Fit
    padding: 24 flow: Down spacing: 16
    draw_bg.color: #2a2a3d
    draw_bg.border_radius: 10.0
    new_batch: true

    Label{text: "Create Account" draw_text.color: #fff draw_text.text_style.font_size: 18}

    FormField{label.text: "Full Name" input.empty_text: "John Doe"}
    FormField{label.text: "Email" input.empty_text: "john@example.com"}
    FormField{label.text: "Password" input.empty_text: "********" input.is_password: true}

    View{
        width: Fill height: Fit
        flow: Right spacing: 10
        align: Align{x: 1.0}
        ButtonFlat{text: "Cancel"}
        Button{text: "Sign Up"}
    }
}
```

---

## Sizing Cheat Sheet

Quick reference for all sizing values.

### Width / Height Values

| Value | Behavior | Use When |
|-------|----------|----------|
| `Fill` | Take all remaining space | Main content areas, stretchy containers |
| `Fit` | Shrink to content size | Buttons, labels, cards, most containers |
| `200` | Fixed 200 pixels | Avatars, icons, sidebars, known dimensions |
| `Fill{min: 100 max: 500}` | Fill with constraints | Responsive containers |
| `Fit{max: Abs(300)}` | Fit with max cap | Text that should not exceed a width |

### Container Defaults

| Scenario | width | height |
|----------|-------|--------|
| Root container | `Fill` | `Fit` |
| Inner card | `Fill` | `Fit` |
| Sidebar | `220` (fixed) | `Fill` |
| ScrollYView | `Fill` | `Fill` |
| Button | `Fit` (default) | `Fit` (default) |
| Label | `Fit` (default) | `Fit` (default) |
| Avatar / Icon | fixed px | fixed px |
| Grid cell | `Fill` | fixed px or `Fit` |

### Flow Quick Reference

| Flow | Direction | Wrap | CSS Equivalent |
|------|-----------|------|----------------|
| `Right` | Horizontal | No | `flex-direction: row` |
| `Down` | Vertical | No | `flex-direction: column` |
| `Overlay` | Stacked (z-axis) | N/A | `position: absolute` stacking |
| `Flow.Right{wrap: true}` | Horizontal | Yes | `flex-direction: row; flex-wrap: wrap` |
| `Flow.Down{wrap: true}` | Vertical | Yes | Column wrap |

### Alignment Quick Reference

| Shorthand | x | y | CSS Equivalent |
|-----------|---|---|----------------|
| `Center` | 0.5 | 0.5 | `justify-content: center; align-items: center` |
| `HCenter` | 0.5 | 0.0 | `justify-content: center; align-items: flex-start` |
| `VCenter` | 0.0 | 0.5 | `justify-content: flex-start; align-items: center` |
| `TopLeft` | 0.0 | 0.0 | Default (no alignment) |
| `Align{x: 1.0 y: 0.0}` | 1.0 | 0.0 | Top-right |
| `Align{x: 1.0 y: 1.0}` | 1.0 | 1.0 | Bottom-right |
| `Align{x: 0.5 y: 1.0}` | 0.5 | 1.0 | Bottom-center |

---

## Troubleshooting

### UI is completely invisible (0px height)

**Cause:** Container is missing `height: Fit`.

**Fix:** Add `height: Fit` to every View, SolidView, RoundedView.

```
// BEFORE (invisible)
View{
    width: Fill
    flow: Down
    Label{text: "Cannot see me"}
}

// AFTER (visible)
View{
    width: Fill height: Fit
    flow: Down
    Label{text: "Now visible"}
}
```

### Text is invisible on a colored background

**Cause:** Missing `new_batch: true`. Text is drawn behind the background due to GPU draw batching.

**Fix:** Add `new_batch: true` to any container with `show_bg: true` (SolidView, RoundedView, etc.) that has text children.

```
// BEFORE (text behind background)
RoundedView{
    width: Fill height: Fit
    draw_bg.color: #334
    Label{text: "Hidden" draw_text.color: #fff}
}

// AFTER (text on top)
RoundedView{
    width: Fill height: Fit
    draw_bg.color: #334
    new_batch: true
    Label{text: "Visible" draw_text.color: #fff}
}
```

### Text is clipped halfway in a horizontal row

**Cause:** Using `Filler{}` next to a `width: Fill` sibling. They split remaining space 50/50.

**Fix:** Remove the Filler. Use `width: Fill` on the text container instead -- it naturally takes remaining space.

```
// BEFORE (text clipped at 50%)
View{
    flow: Right height: Fit
    Label{width: Fill text: "Long title text"}
    Filler{}
    Label{text: "tag"}
}

// AFTER (text takes all remaining space)
View{
    flow: Right height: Fit
    Label{width: Fill text: "Long title text"}
    Label{text: "tag"}
}
```

### Scrollable area does not scroll

**Cause:** ScrollYView has `height: Fit` instead of `height: Fill`. It expands to fit
all content, so there is nothing to scroll.

**Fix:** Use `height: Fill` on ScrollYView so it has a fixed viewport.

```
// BEFORE (no scrolling, expands to full content height)
ScrollYView{
    width: Fill height: Fit
    flow: Down
    Label{text: "Item 1"}
    Label{text: "Item 2"}
}

// AFTER (scrolls within the available space)
ScrollYView{
    width: Fill height: Fill
    flow: Down
    Label{text: "Item 1"}
    Label{text: "Item 2"}
}
```

### Root container is too narrow / does not fill the window

**Cause:** Using a fixed pixel width on the root container (e.g., `width: 400`).

**Fix:** Always use `width: Fill` on the outermost container.

```
// BEFORE (400px sliver)
RoundedView{
    width: 400 height: Fit
    Label{text: "Narrow"}
}

// AFTER (fills available width)
RoundedView{
    width: Fill height: Fit
    Label{text: "Full width"}
}
```

### Children are all stacked on top of each other

**Cause:** Using `flow: Overlay` unintentionally, or forgetting to set `flow` at all
and having children with `width: Fill height: Fill`.

**Fix:** Set `flow: Down` for vertical stacking or `flow: Right` for horizontal layout.

```
// Children stacked on top (Overlay behavior)
View{
    width: Fill height: Fit
    flow: Overlay
    Label{text: "First"}
    Label{text: "Second"}
}

// Children stacked vertically (correct)
View{
    width: Fill height: Fit
    flow: Down spacing: 8
    Label{text: "First"}
    Label{text: "Second"}
}
```

### Override text on a template child does not work

**Cause:** The child was declared with `:` instead of `:=`, or it is inside an
anonymous (unnamed) container.

**Fix:** Use `:=` for named children. Ensure every container in the override path
has a `:=` name.

```
// WRONG: label is unreachable (inside anonymous View)
let Item = View{
    flow: Right
    View{
        flow: Down
        label := Label{text: "default"}
    }
}
Item{label.text: "new"}  // Fails silently

// CORRECT: all containers in path are named with :=
let Item = View{
    flow: Right
    texts := View{
        flow: Down
        label := Label{text: "default"}
    }
}
Item{texts.label.text: "new"}  // Works
```

### Spacing appears between container edge and first child

**Cause:** `spacing` applies between ALL children, but you may be seeing `padding` issues.

**Fix:** `spacing` only creates gaps between siblings, not before the first or after the
last. If you see unwanted space at edges, check `padding` values.

```
// padding: 0 removes edge space, spacing: 10 only between children
View{
    width: Fill height: Fit
    flow: Down spacing: 10 padding: 0.
    Label{text: "First (flush with container edge)"}
    Label{text: "Second (10px gap above)"}
}
```

---

## Layout Decision Tree

Use this to pick the right layout approach:

1. **Need vertical stacking?** -> `flow: Down`
2. **Need horizontal row?** -> `flow: Right`
3. **Need children stacked on z-axis?** -> `flow: Overlay`
4. **Need wrapping tags/cards?** -> `flow: Flow.Right{wrap: true}`
5. **Need scrolling?** -> Wrap in `ScrollYView` (vertical) or `ScrollXView` (horizontal)
6. **Need resizable panels?** -> Use `Splitter` with `a :=` and `b :=`
7. **Need tab switching?** -> Use `PageFlip` with `active_page :=`
8. **Need grid?** -> Nest `flow: Right` rows inside a `flow: Down` container
9. **Need centering?** -> `align: Center` on the parent
10. **Need push-to-opposite-ends?** -> `Filler{}` between `width: Fit` siblings
