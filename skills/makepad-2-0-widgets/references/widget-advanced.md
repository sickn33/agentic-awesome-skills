# Makepad 2.0 Advanced Widget Patterns

---

## PortalList Usage Pattern

PortalList is a virtualized list widget that only renders visible items. It requires a Rust-side draw loop to populate items.

### DSL Definition (in script_mod!)

```
list := PortalList{
    width: Fill
    height: Fill
    flow: Down
    scroll_bar: ScrollBar{}

    // Templates are defined with := syntax
    // These become entries in the templates HashMap
    Item := View{
        width: Fill
        height: Fit
        padding: 10

        title := Label{
            text: ""
            draw_text.color: #fff
        }
    }

    Header := View{
        width: Fill
        height: 40
        show_bg: true
        draw_bg.color: #333

        label := Label{
            text: "Section Header"
            draw_text.color: #aaa
        }
    }
}
```

### Rust Draw Loop

```rust
// In your Widget's draw_walk implementation
while let Some(item) = self.view.draw_walk(cx, scope, walk).step() {
    if let Some(mut list) = item.borrow_mut::<PortalList>() {
        // Tell the list how many total items exist
        list.set_item_range(cx, 0, count);

        // Iterate over visible items only
        while let Some(item_id) = list.next_visible_item(cx) {
            // Create/reuse a widget from a template by LiveId
            let item = list.item(cx, item_id, id!(Item));

            // Populate the item's children
            item.label(ids!(title)).set_text(cx, &format!("Item {}", item_id));

            // Draw the item
            item.draw_all(cx, &mut Scope::empty());
        }
    }
}
```

### Templates in PortalList

- Named IDs using `:=` define templates stored in the widget's `templates` HashMap
- Regular properties (like `flow`, `scroll_bar`) go into struct fields
- Templates are collected during `on_after_apply` via `vm.vec_with()`
- Multiple template types can be used: select which template to instantiate based on `item_id`

```rust
// Using different templates for different item types
while let Some(item_id) = list.next_visible_item(cx) {
    let template = if item_id == 0 { id!(Header) } else { id!(Item) };
    let item = list.item(cx, item_id, template);
    // ... populate and draw
    item.draw_all(cx, &mut Scope::empty());
}
```

### PortalList Scrolling API

```rust
// Scroll to specific item
list.scroll_to_item(cx, item_index);

// Smooth scroll to item
list.smooth_scroll_to_item(cx, item_index);

// Get scroll position
let pos = list.scroll_position();

// Enable tail mode (auto-scroll to bottom)
list.set_tail(cx, true);
```

---

## Dock System Complete Example

The Dock widget provides a tabbed, splittable panel layout system.

### 1. Dock Definition

```
dock := Dock{
    width: Fill
    height: Fill

    // Override tab bar template
    tab_bar +: {
        TabTemplate := IconTab{
            // custom tab appearance
        }
    }

    // Root layout structure
    root := DockSplitter{
        axis: Horizontal
        align: Weighted(0.3)

        // Left panel: tabs
        a: DockTabs{
            tabs: [
                DockTab{name: "Files" template: FilesView}
                DockTab{name: "Search" template: SearchView}
            ]
            selected: 0
            closable: false
        }

        // Right panel: further split
        b: DockSplitter{
            axis: Vertical
            align: Weighted(0.7)

            a: DockTabs{
                tabs: [
                    DockTab{name: "Editor" template: EditorView}
                ]
                selected: 0
            }
            b: DockTabs{
                tabs: [
                    DockTab{name: "Console" template: ConsoleView}
                ]
                selected: 0
            }
        }
    }

    // 2. Content templates (matched by DockTab.template)
    FilesView := View{
        width: Fill height: Fill
        flow: Down
        Label{text: "File list here"}
    }

    EditorView := View{
        width: Fill height: Fill
        Label{text: "Editor content"}
    }

    SearchView := View{
        width: Fill height: Fill
        Label{text: "Search panel"}
    }

    ConsoleView := View{
        width: Fill height: Fill
        Label{text: "Console output"}
    }
}
```

### Dock Sub-Types Reference

**DockSplitter:**
- `axis` - `Horizontal` or `Vertical`
- `align` - `Weighted(ratio)`, `FromA(pixels)`, `FromB(pixels)`
- `a` - First pane content (DockTabs or DockSplitter)
- `b` - Second pane content (DockTabs or DockSplitter)

**DockTabs:**
- `tabs` - Array of DockTab definitions
- `selected` - Index of selected tab
- `closable` - Whether tabs can be closed (bool)

**DockTab:**
- `name` - Tab display text
- `template` - LiveId matching a content template defined in the Dock
- `kind` - Tab kind identifier

---

## Custom Widget Creation

### Basic Custom Widget

To create a custom widget in Makepad 2.0, derive the required traits:

```rust
#[derive(Script, ScriptHook, Widget)]
pub struct MyWidget {
    #[uid]
    uid: WidgetUid,
    #[source]
    source: ScriptObjectRef,   // REQUIRED: links to DSL definition
    #[walk]
    walk: Walk,                // Size and position
    #[layout]
    layout: Layout,            // Child layout rules
    #[redraw]
    #[live]
    draw_bg: DrawQuad,         // Background draw primitive
    #[live]
    draw_text: DrawText,       // Text draw primitive
    #[live]
    text: String,              // A DSL-settable property
    #[rust]
    my_state: i32,             // Rust-only state (not settable from DSL)
    #[rust]
    area: Area,                // Widget area for hit testing
}
```

**Key derive macros:**
- `Script` - Enables Splash script integration
- `ScriptHook` - Enables lifecycle hooks (on_before_apply, on_after_apply)
- `Widget` - Implements the Widget trait
- `Animator` - Adds animation support (optional)
- `WidgetRef` - Generates the WidgetRef wrapper type
- `WidgetSet` - Generates the WidgetSet type
- `WidgetRegister` - Enables widget registration

**Field attributes:**
- `#[source]` - ScriptObjectRef linking to DSL (REQUIRED)
- `#[uid]` - Unique widget identifier
- `#[walk]` - Walk (width, height, margin)
- `#[layout]` - Layout (flow, spacing, padding, align)
- `#[redraw]` - Mark field as triggering redraw when changed
- `#[live]` - DSL-settable field with default
- `#[live(default_value)]` - DSL-settable with explicit default
- `#[rust]` - Rust-only field, not settable from DSL
- `#[apply_default]` - Apply default values from DSL
- `#[deref]` - Delegate to inner widget (for wrapper widgets)
- `#[visible]` - Widget visibility field

### Register Widget in script_mod!

```rust
script_mod! {
    use mod.prelude.widgets_internal.*
    use mod.widgets.*

    mod.widgets.MyWidgetBase = #(MyWidget::register_widget(vm))

    mod.widgets.MyWidget = set_type_default() do mod.widgets.MyWidgetBase{
        width: Fit
        height: Fit
        // default property values
        draw_bg +: {
            color: #333
        }
    }
}
```

### Custom Draw Widget

For widgets that need custom drawing logic:

```rust
impl Widget for CustomDraw {
    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        // Begin layout turtle
        cx.begin_turtle(walk, self.layout);

        // Get the computed rect
        let rect = cx.turtle().rect();

        // Draw custom shapes
        self.draw_bg.draw_abs(cx, rect);

        // Draw text at specific position
        // self.draw_text.draw_walk(cx, walk, align, text);

        // End turtle and capture area
        cx.end_turtle_with_area(&mut self.area);
        DrawStep::done()
    }

    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        // Handle hit events
        match event.hits(cx, self.area) {
            Hit::FingerDown(_fe) => {
                // Handle touch/click down
            }
            Hit::FingerUp(_fe) => {
                // Handle touch/click up
            }
            Hit::FingerHoverIn(_) => {
                // Handle hover enter
            }
            Hit::FingerHoverOut(_) => {
                // Handle hover leave
            }
            _ => ()
        }
    }
}
```

### Widget with Children (Container)

For container widgets that hold child widgets:

```rust
impl Widget for MyContainer {
    fn draw_walk(&mut self, cx: &mut Cx2d, scope: &mut Scope, walk: Walk) -> DrawStep {
        cx.begin_turtle(walk, self.layout);

        // Draw background if enabled
        if self.show_bg {
            self.draw_bg.begin(cx, walk, self.layout);
        }

        // Draw children
        for (_id, child) in &self.children {
            child.draw_all(cx, scope);
        }

        if self.show_bg {
            self.draw_bg.end(cx);
        }

        cx.end_turtle_with_area(&mut self.area);
        DrawStep::done()
    }
}
```

---

## MapView Critical Rules

MapView renders vector tile-based geographic maps. It has strict requirements:

### MUST use fixed pixel height

```
// CORRECT: fixed pixel height
MapView{
    width: Fill
    height: 400
}

// WRONG: will cause rendering issues
MapView{
    width: Fill
    height: Fill   // NEVER use Fill
}

// WRONG: will cause rendering issues
MapView{
    width: Fill
    height: Fit    // NEVER use Fit
}
```

### MUST wrap in container with new_batch

```
map_container := View{
    new_batch: true   // REQUIRED for MapView
    width: Fill
    height: 400

    map := MapView{
        width: Fill
        height: 400
        center_lon: -73.9857
        center_lat: 40.7484
        zoom: 14.0
        dark_theme: true
    }
}
```

### MapView Data Sources
- `use_local_mbtiles: true` - Load tiles from local `.mbtiles` file (default, offline)
- `use_network: true` - Fetch tiles from network (online mode)
- If both are enabled, offline mode takes priority
- `style_light` / `style_dark` - Theme style configurations with map rendering rules

---

## Draw Batching (new_batch) - Detailed Rules

### How Batching Works

Makepad batches consecutive draw calls using the same shader into a single GPU draw call for performance. The draw order follows the widget tree order.

### The Text Visibility Problem

When a View with `show_bg: true` contains text widgets, the background quad and text quads may be batched into the same draw call. Since the background quad covers the entire view area, text drawn in the same batch appears behind the background, making it invisible.

### Setting new_batch

```
// Pattern: colored container with text
card := RoundedView{
    new_batch: true      // Forces a new GPU draw batch
    show_bg: true
    draw_bg.color: #2a2a3a

    title := Label{
        text: "Card Title"
        draw_text.color: #fff
    }
}
```

### When new_batch is CRITICAL

1. **Any View with show_bg containing text children:**
```
SolidView{
    new_batch: true
    show_bg: true
    draw_bg.color: #444
    Label{text: "Must be visible"}
}
```

2. **Views with hover/press effects containing text:**
Without `new_batch`, text vanishes during hover because the draw_bg shader re-renders with different instance values, pushing text behind the background.

3. **MapView containers:**
```
View{
    new_batch: true
    MapView{...}
}
```

### When new_batch is NOT needed

- `View{}` without `show_bg` (invisible layout only)
- Views containing only other Views (no direct text widgets)
- Text widgets themselves (Label, H1, etc.)
- Widgets that already force their own batch internally

---

## Splitter Usage Pattern

```
content := Splitter{
    axis: Horizontal
    align: Weighted(0.3)

    a := View{
        width: Fill
        height: Fill
        // Left/top panel content
        Label{text: "Panel A"}
    }

    b := View{
        width: Fill
        height: Fill
        // Right/bottom panel content
        Label{text: "Panel B"}
    }
}
```

### Splitter Axis Values
- `SplitterAxis.Horizontal` - Left/right split (default)
- `SplitterAxis.Vertical` - Top/bottom split

### Splitter Align Values
- `SplitterAlign.Weighted(0.5)` - Proportional split (0.0 to 1.0)
- `SplitterAlign.FromA(200.0)` - Fixed pixels from left/top
- `SplitterAlign.FromB(200.0)` - Fixed pixels from right/bottom

---

## FoldHeader Usage Pattern

```
FoldHeader{
    header := View{
        width: Fill
        height: Fit
        padding: 10

        FoldButton{}
        Label{text: "Section Title"}
    }

    body := View{
        width: Fill
        height: Fit
        padding: Inset{left: 20}

        Label{text: "Collapsible content here"}
    }
}
```

The `opened` value animates between 0.0 (closed) and 1.0 (open). The body's height is interpolated based on this value.

---

## Modal Usage Pattern

```
modal := Modal{
    // Override the content slot
    content +:  {
        width: 400
        height: Fit
        padding: 20
        flow: Down
        spacing: 10

        show_bg: true
        draw_bg.color: #333

        H3{text: "Dialog Title"}
        P{text: "Dialog message content"}

        View{
            width: Fill
            height: Fit
            flow: Right
            align: Align{x: 1.0}
            spacing: 10

            Button{text: "Cancel"}
            Button{text: "OK"}
        }
    }
}
```

### Modal Control (from Rust)

```rust
// Open modal
self.modal(id!(modal)).open(cx);

// Close modal
self.modal(id!(modal)).close(cx);
```

---

## PageFlip Usage Pattern

```
page_flip := PageFlip{
    active_page: page_one

    page_one := View{
        width: Fill height: Fill
        Label{text: "Page One"}
    }

    page_two := View{
        width: Fill height: Fill
        Label{text: "Page Two"}
    }
}
```

### Switching Pages (from Rust)

```rust
self.page_flip(id!(page_flip)).set_active_page(cx, id!(page_two));
```

---

## Common Widget Access Patterns (Rust)

### Accessing Child Widgets

```rust
// Access a specific child by id path
self.view.label(ids!(title)).set_text(cx, "New Title");
self.view.button(ids!(submit_btn)).set_text(cx, "Submit");
self.view.text_input(ids!(name_input)).set_text(cx, "default");

// Access nested children
self.view.label(ids!(container.inner.title)).set_text(cx, "Nested");

// Read text input value
let text = self.view.text_input(ids!(name_input)).text();

// Get/set slider value
let val = self.view.slider(ids!(volume)).value();

// Get selected dropdown item
let idx = self.view.drop_down(ids!(selector)).selected_item();
```

### Handling Widget Actions

```rust
fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
    self.view.handle_event(cx, event, scope);

    for action in cx.actions() {
        // Button clicked
        if self.view.button(ids!(my_btn)).clicked(action) {
            // handle click
        }

        // Text input changed
        if let Some(text) = self.view.text_input(ids!(my_input)).changed(action) {
            log!("Text changed: {}", text);
        }

        // Slider changed
        if let Some(val) = self.view.slider(ids!(my_slider)).changed(action) {
            log!("Slider: {}", val);
        }

        // CheckBox/Toggle toggled
        if let Some(active) = self.view.check_box(ids!(my_check)).changed(action) {
            log!("Active: {}", active);
        }

        // DropDown selected
        if let Some(item) = self.view.drop_down(ids!(my_dd)).selected(action) {
            log!("Selected: {}", item);
        }
    }
}
```
