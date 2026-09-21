# Makepad 2.0 DSL Syntax Reference

## Syntax Grammar

### Fundamental Rules

1. **Colon syntax for properties**: `key: value` (never `key = value`)
2. **Whitespace/newline separated**: No commas between sibling properties
3. **Named instances**: `name := Widget{...}` (addressable via `:=`)
4. **Merge operator**: `key +: {...}` (extends parent, does not replace)
5. **Dot-path shorthand**: `draw_bg.color: #f00` equals `draw_bg +: { color: #f00 }`
6. **Let bindings**: `let Name = Widget{...}` (local template)
7. **Rust integration**: `#(Struct::register_widget(vm))` (Rust struct binding)
8. **Spread operator**: `..mod.draw.DrawQuad` (inherit all properties)
9. **Debug logging**: `~expression` (log value during evaluation)

### Property Assignment

```
// Simple values
width: Fill
height: 200
color: #ff0000
visible: true
text: "Hello world"

// Nested objects
draw_bg: DrawQuad{
    color: #f00
}

// Merge (extend parent)
draw_bg +: {
    color: #f00
}

// Dot-path shorthand (equivalent to merge)
draw_bg.color: #f00
draw_text.text_style.font_size: 14
window.inner_size: vec2(800, 600)
```

### Widget Instantiation

```
// Anonymous widget
Label{ text: "Hello" }

// Named instance (addressable)
my_label := Label{ text: "Hello" }

// Inheriting from a registered type
mod.widgets.MyButton = mod.widgets.Button{
    draw_bg +: { color: #f00 }
}

// Let binding template
let MyCard = RoundedView{
    width: Fill height: Fit
    title := Label{ text: "default" }
}

// Instantiation with overrides
MyCard{ title.text: "Custom Title" }
```

### Value Types

#### Numbers
```
width: 200          // integer (treated as Fixed size)
opacity: 0.5        // float
spacing: 10         // integer
margin: 0.          // explicit float zero
```

#### Strings
```
text: "Hello world"
body: "Line 1\nLine 2"
empty_text: "Placeholder"
```

#### Colors
```
#f00                // RGB short (3 hex digits)
#ff0000             // RGB full (6 hex digits)
#ff0000ff           // RGBA (8 hex digits)
#0000               // transparent black (4 hex digits)
#x2ecc71            // #x prefix for hex containing 'e' (avoids Rust parser error)
#x1e1e2e            // REQUIRED when digit precedes 'e'
vec4(1.0 0.0 0.0 1.0)  // explicit RGBA as vec4
```

**Hex color 'e' rule**: When a digit immediately precedes `e` or `E` in a hex color, the Rust tokenizer misparses it as scientific notation. Use `#x` prefix to escape.

#### Booleans
```
visible: true
show_bg: true
clip_x: false
grab_key_focus: true
```

#### Enums
```
default: @off            // @ prefix for enum defaults in animators
default: @on
flow: Down               // bare enum variant name
flow: Right
flow: Overlay
flow: Flow.Right{wrap: true}   // enum variant with fields
axis: SplitterAxis.Horizontal
cursor: MouseCursor.Hand       // Enum.Variant (NOT @Hand, NOT just Hand)
fit: ImageFit.Stretch
side: SlideSide.Left
```

#### Vectors
```
vec2(800, 600)          // 2D vector
vec2(0.0 0.0)           // spaces also work (no comma)
vec4(1.0 0.0 0.0 1.0)  // 4D vector (RGBA)
vec4(-1.0, -1.0, -1.0, -1.0)  // sentinel value
```

#### Constructors
```
Inset{ top: 5 bottom: 5 left: 10 right: 10 }   // padding/margin
Align{ x: 0.5 y: 0.5 }                          // alignment
Walk{ width: 16 height: 16 }                     // icon sizing
```

#### Alignment Presets
```
align: Center        // Align{x: 0.5 y: 0.5}
align: HCenter       // Align{x: 0.5 y: 0.0}
align: VCenter       // Align{x: 0.0 y: 0.5}
align: TopLeft       // Align{x: 0.0 y: 0.0}
```

#### Size Values
```
width: Fill                      // fill available space (default)
width: Fit                       // shrink to content
width: 200                       // fixed 200px
width: Fill{min: 100 max: 500}   // constrained fill
width: Fit{max: Abs(300)}        // constrained fit
```

#### Resources
```
crate_resource("self://resources/icons/icon.svg")   // CORRECT
// dep("crate://self/resources/icon.svg")            // WRONG - old syntax
```

### Script Module Structure

```rust
script_mod!{
    // 1. Imports (MUST come first - no comments before this!)
    use mod.prelude.widgets.*        // App development
    use mod.prelude.widgets_internal.*  // Widget library development
    use mod.widgets.*                // Access registered widgets

    // 2. Widget registration
    mod.widgets.MyWidgetBase = #(MyWidget::register_widget(vm))

    // 3. Styled defaults
    mod.widgets.MyWidget = set_type_default() do mod.widgets.MyWidgetBase{
        width: Fill height: Fit
        draw_bg +: { color: theme.color_bg_app }
    }

    // 4. Local templates (let bindings)
    let MyCard = RoundedView{
        width: Fill height: Fit
        padding: 16 flow: Down
        title := Label{ text: "Title" }
    }

    // 5. App component (with load_all_resources)
    load_all_resources() do #(App::script_component(vm)){
        ui: Root{
            main_window := Window{
                body +: {
                    MyCard{ title.text: "Hello" }
                }
            }
        }
    }
}
```

### Registration Patterns

#### Widget (implements Widget trait)
```
mod.widgets.MyWidgetBase = #(MyWidget::register_widget(vm))
```

#### Component (non-widget, e.g., App)
```
load_all_resources() do #(App::script_component(vm)){ ... }
// or without load_all_resources:
mod.widgets.MyComponentBase = #(MyComponent::script_component(vm))
```

#### Draw Shader (custom draw type)
```
set_type_default() do #(DrawMyShader::script_shader(vm)){
    ..mod.draw.DrawQuad    // inherit from base shader
}
```

#### Setting Type Defaults
```
mod.widgets.MyWidget = set_type_default() do mod.widgets.MyWidgetBase{
    width: Fill height: Fit
    draw_bg +: { color: #334 }
}
```

### Template System

#### Let Binding (local to script_mod block)
```
let MyRow = View{
    flow: Right height: Fit spacing: 8 align: Align{y: 0.5}
    icon := Icon{}
    label := Label{ text: "default" }
}

// Use:
MyRow{ label.text: "Custom text" }
```

#### Named Children and Overrides
```
let TodoItem = View{
    width: Fill height: Fit flow: Right spacing: 10
    check := CheckBox{ text: "" }
    label := Label{ text: "task" draw_text.color: #ddd }
    Filler{}
    tag := Label{ text: "" draw_text.color: #888 }
}

// Override named children via dot-path:
TodoItem{ label.text: "Buy groceries" tag.text: "errands" }
TodoItem{ label.text: "Fix bug" tag.text: "urgent" check.text: "" }
```

#### Named Containers Must Form Complete Path
```
// WRONG - label inside anonymous View is unreachable
let Item = View{
    View{                                // anonymous - no :=
        label := Label{ text: "x" }     // unreachable!
    }
}
Item{ label.text: "fails silently" }

// CORRECT - every container in path is named
let Item = View{
    texts := View{                       // named with :=
        flow: Down
        label := Label{ text: "x" }
    }
}
Item{ texts.label.text: "works" }        // full dot-path
```

### Templates in List Widgets

Named IDs (`:=`) inside PortalList/FlatList define **templates**, not regular properties:

```
list := PortalList{
    width: Fill height: Fill
    flow: Down
    scroll_bar: ScrollBar{}              // regular property -> struct field

    // Templates (stored in templates HashMap via on_after_apply)
    Item := View{
        height: 40
        title := Label{ text: "Default" }
    }
    Header := View{
        draw_bg.color: #333
    }
}
```

Used in Rust draw code:
```rust
while let Some(item_id) = list.next_visible_item(cx) {
    let item = list.item(cx, item_id, id!(Item));
    item.label(ids!(title)).set_text(cx, &format!("Item {}", item_id));
    item.draw_all(cx, &mut Scope::empty());
}
```

### Dock Templates

Three sections in a Dock:
1. `tab_bar +:` -- tab header templates (how tab buttons look)
2. `root :=` -- layout tree of DockSplitter/DockTabs
3. Content templates -- `Name := Widget{}` for tab content

```
Dock{
    width: Fill height: Fill

    tab_bar +: {
        FilesTab := IconTab{
            draw_icon +: { color: #80FFBF svg: crate_resource("self://icons/file.svg") }
        }
    }

    root := DockSplitter{
        axis: SplitterAxis.Horizontal
        align: SplitterAlign.FromA(250.0)
        a := left_tabs
        b := center_tabs
    }

    left_tabs := DockTabs{ tabs: [@files_tab] selected: 0 }
    center_tabs := DockTabs{ tabs: [@edit_tab] selected: 0 }

    files_tab := DockTab{ name: "Files" template := FilesTab kind := FilesContent }
    edit_tab := DockTab{ name: "Edit" template := EditTab kind := EditContent }

    FilesContent := View{ width: Fill height: Fill Label{text: "Files"} }
    EditContent := View{ width: Fill height: Fill Label{text: "Editor"} }
}
```

### Animator Definition

```
animator: Animator{
    hover: {
        default: @off                     // @ prefix required for enum defaults
        off: AnimatorState{
            from: {all: Forward {duration: 0.1}}
            apply: {
                draw_bg: {hover: 0.0}
                draw_text: {hover: 0.0}
            }
        }
        on: AnimatorState{
            from: {
                all: Forward {duration: 0.1}
                down: Forward {duration: 0.01}   // faster from "down" state
            }
            apply: {
                draw_bg: {hover: snap(1.0)}       // snap() = instant jump
                draw_text: {hover: snap(1.0)}
            }
        }
        down: AnimatorState{
            from: {all: Forward {duration: 0.2}}
            apply: {
                draw_bg: {down: snap(1.0) hover: 1.0}
                draw_text: {down: snap(1.0) hover: 1.0}
            }
        }
    }
    focus: {
        default: @off
        off: AnimatorState{
            from: {all: Snap}                     // instant transition
            apply: { draw_bg: {focus: 0.0} }
        }
        on: AnimatorState{
            from: {all: Snap}
            apply: { draw_bg: {focus: 1.0} }
        }
    }
    time: {
        default: @off
        off: AnimatorState{
            from: {all: Forward {duration: 0.}}
            apply: {}
        }
        on: AnimatorState{
            from: {all: Loop {duration: 1.0 end: 1000000000.0}}
            apply: {
                draw_bg: {anim_time: timeline(0.0 0.0  1.0 1.0)}
            }
        }
    }
}
```

### Play Types (Transition Modes)
```
Forward {duration: 0.2}                          // play once forward
Snap                                              // instant
Reverse {duration: 0.2 end: 1.0}                // play once in reverse
Loop {duration: 1.0 end: 1000000000.0}           // repeat forward
ReverseLoop {duration: 1.0 end: 1.0}            // repeat in reverse
BounceLoop {duration: 1.0 end: 1.0}             // bounce back and forth
```

### Ease Functions
```
Linear
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
ExpDecay {d1: 0.82 d2: 0.97 max: 100}
Pow {begin: 0.0 end: 1.0}
Bezier {cp0: 0.0 cp1: 0.0 cp2: 1.0 cp3: 1.0}
```

### Shader Functions

```
draw_bg +: {
    // Custom named function
    get_color: fn() {
        return self.color
            .mix(self.color_hover, self.hover)
            .mix(self.color_down, self.down)
    }

    // Function with parameters
    get_color_at: fn(scale: vec2, pan: vec2) {
        return self.my_texture.sample(self.pos * scale + pan)
    }

    // Pixel shader (fragment shader)
    pixel: fn() {
        let sdf = Sdf2d.viewport(self.pos * self.rect_size)
        sdf.box(0. 0. self.rect_size.x self.rect_size.y 4.0)
        sdf.fill(self.get_color())
        return sdf.result
    }

    // Vertex shader (rarely overridden)
    vertex: fn() {
        return self.clip_and_transform_vertex(self.rect_pos self.rect_size)
    }
}
```

### Cross-Module Sharing

```rust
// widget_module.rs - exports to mod.widgets
script_mod!{
    use mod.prelude.widgets_internal.*
    mod.widgets.MyWidget = set_type_default() do ...
}

// app_ui.rs - imports from mod.widgets
script_mod!{
    use mod.prelude.widgets.*
    use mod.widgets.*          // MyWidget is now available
    mod.widgets.AppUI = Window{ body +: { MyWidget{} } }
}

// app.rs - uses mod.widgets.AppUI
script_mod!{
    use mod.prelude.widgets.*
    use mod.widgets.*
    load_all_resources() do #(App::script_component(vm)){
        ui: Root{ AppUI{} }
    }
}
```

**NOTE**: `use crate.module.*` does NOT work. Only `mod.*` paths are valid.

### Available Widget Types

**Core Containers**: `View`, `SolidView`, `RoundedView`, `RoundedAllView`, `RoundedXView`, `RoundedYView`, `RectView`, `RectShadowView`, `RoundedShadowView`, `CircleView`, `HexagonView`, `GradientXView`, `GradientYView`, `CachedView`, `CachedRoundedView`

**Scrollable**: `ScrollXView`, `ScrollYView`, `ScrollXYView`

**Text**: `Label`, `Labelbold`, `LabelGradientX`, `LabelGradientY`, `TextBox`, `P`, `Pbold`, `H1`, `H2`, `H3`, `H4`, `TextInput`, `TextInputFlat`, `LinkLabel`

**Rich Text**: `TextFlow`, `Markdown`, `Html` (feature-gated)

**Buttons**: `Button`, `ButtonFlat`, `ButtonFlatter`

**Toggles**: `CheckBox`, `CheckBoxFlat`, `CheckBoxCustom`, `Toggle`, `ToggleFlat`, `RadioButton`, `RadioButtonFlat`

**Input**: `Slider`, `SliderMinimal`, `DropDown`, `DropDownFlat`

**Layout**: `Splitter`, `FoldButton`, `FoldHeader`, `Hr`, `Vr`, `Filler`

**Lists**: `PortalList`, `FlatList`, `ScrollBar`

**Navigation**: `StackNavigation`, `ExpandablePanel`, `SlidePanel`, `Modal`, `Tooltip`, `PopupNotification`, `PageFlip`, `SlidesView`

**Dock**: `Dock`, `DockFlat`, `DockSplitter`, `DockTabs`, `DockTab`

**Media**: `Image`, `Icon`, `LoadingSpinner`

**Special**: `FileTree`, `CachedWidget`

**Window**: `Window`, `Root`
