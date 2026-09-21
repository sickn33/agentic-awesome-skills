---
name: makepad-2.0-dsl
description: Makepad 2.0 guidance for dsl; use when building or debugging Makepad UI code.
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

# Makepad 2.0 DSL Syntax Skill

## Overview

Makepad 2.0 replaced the compile-time `live_design!` macro with the runtime `script_mod!` macro, powered by the Splash scripting language. This skill covers the complete DSL syntax, property system, registration patterns, and common pitfalls.

## Key Syntax Rules

### Property Assignment: Colon, NOT Equals

```
key: value          // CORRECT - colon syntax
key = value         // WRONG - old 1.x syntax, no longer works
```

Properties are whitespace/newline separated. No commas between siblings.

```
View{
    width: Fill
    height: Fit
    flow: Down
    spacing: 10
    padding: 15
}
```

### Named Instances: `:=` Operator

Use `:=` to create addressable, named widget instances:

```
my_button := Button{ text: "Click me" }
title := Label{ text: "Hello" }
```

Named instances are:
- Addressable from Rust code via `id!(my_button)` or `ids!(my_button)`
- Overridable via dot-path syntax: `MyTemplate{ title.text: "New text" }`
- Stored in the script object's `vec` (not `map`)

Regular properties use `:` and go into `map`:
```
width: Fill       // regular property -> map
label := Label{}  // named child -> vec
```

### Merge Operator: `+:`

The `+:` operator extends/merges with the parent instead of replacing:

```
draw_bg +: {
    color: #f00    // Only overrides color, keeps all other draw_bg properties
}
```

Without `+:`, you REPLACE the entire property:
```
draw_bg: { color: #f00 }    // REPLACES all of draw_bg - loses hover, border, etc.
draw_bg +: { color: #f00 }  // MERGES - only changes color, keeps everything else
```

### Dot-Path Shorthand

Dot-path is syntactic sugar for merge:

```
draw_bg.color: #f00
// is equivalent to:
draw_bg +: { color: #f00 }

draw_text.text_style.font_size: 14
// is equivalent to:
draw_text +: { text_style +: { font_size: 14 } }
```

### Let Bindings: Local Templates

`let` creates local, reusable templates within a `script_mod!` block:

```
let MyCard = RoundedView{
    width: Fill height: Fit
    padding: 16 flow: Down spacing: 8
    draw_bg.color: #2a2a3d
    draw_bg.border_radius: 8.0
    title := Label{ text: "Default Title" draw_text.color: #fff }
    body := Label{ text: "" draw_text.color: #aaa }
}

// Instantiate and override:
MyCard{ title.text: "Card 1" body.text: "Content here" }
MyCard{ title.text: "Card 2" body.text: "More content" }
```

**IMPORTANT**: `let` bindings are LOCAL to the `script_mod!` block. They cannot be accessed from other `script_mod!` blocks. To share across modules, store in `mod.widgets.*`.

### Spread Operator: `..`

Inherit all properties from another definition:

```
set_type_default() do #(DrawMyShader::script_shader(vm)){
    ..mod.draw.DrawQuad   // Inherit from DrawQuad
}
```

## Script Module Structure

### Basic App Structure

```rust
use makepad_widgets::*;

app_main!(App);

script_mod!{
    use mod.prelude.widgets.*

    load_all_resources() do #(App::script_component(vm)){
        ui: Root{
            main_window := Window{
                window.inner_size: vec2(800, 600)
                body +: {
                    // UI content here
                    my_button := Button{ text: "Click" }
                }
            }
        }
    }
}

impl App {
    fn run(vm: &mut ScriptVm) -> Self {
        crate::makepad_widgets::script_mod(vm);  // 1. Register base widgets
        App::from_script_mod(vm, self::script_mod)
    }
}

#[derive(Script, ScriptHook)]
pub struct App {
    #[source] source: ScriptObjectRef,   // REQUIRED for Script-derived structs
    #[live] ui: WidgetRef,
}

impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        if self.ui.button(ids!(my_button)).clicked(actions) {
            log!("Button clicked!");
        }
    }
}

impl AppMain for App {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        self.match_event(cx, event);
        self.ui.handle_event(cx, event, &mut Scope::empty());
    }
}
```

### Widget Definition Module

```rust
script_mod!{
    use mod.prelude.widgets_internal.*   // For widget library internals
    use mod.widgets.*                     // Access other registered widgets

    // Step 1: Register the Rust struct as a widget base
    mod.widgets.MyWidgetBase = #(MyWidget::register_widget(vm))

    // Step 2: Create a styled variant with default properties
    mod.widgets.MyWidget = set_type_default() do mod.widgets.MyWidgetBase{
        width: Fill
        height: Fit
        padding: theme.space_2

        draw_bg +: {
            color: theme.color_bg_app
        }
    }
}
```

## Registration Patterns

### Widget Registration

For structs that implement the `Widget` trait:

```rust
mod.widgets.MyWidgetBase = #(MyWidget::register_widget(vm))
```

Rust side:
```rust
#[derive(Script, ScriptHook, Widget)]
pub struct MyWidget {
    #[source] source: ScriptObjectRef,  // REQUIRED
    #[walk] walk: Walk,
    #[layout] layout: Layout,
    #[redraw] #[live] draw_bg: DrawQuad,
    #[live] draw_text: DrawText,
    #[rust] my_state: i32,  // Runtime-only, not exposed to script
}
```

### Component Registration

For non-widget structs that need script integration:

```rust
mod.widgets.MyComponentBase = #(MyComponent::script_component(vm))
```

### Draw Shader Registration

For custom draw types with shader fields:

```rust
set_type_default() do #(DrawMyShader::script_shader(vm)){
    ..mod.draw.DrawQuad   // Inherit from DrawQuad
}
```

Rust side:
```rust
#[derive(Script, ScriptHook)]
#[repr(C)]
pub struct DrawMyShader {
    #[deref] draw_super: DrawQuad,
    #[live] my_param: f32,
}
```

### Setting Type Defaults

```rust
mod.widgets.MyWidget = set_type_default() do mod.widgets.MyWidgetBase{
    width: Fill height: Fit
    draw_bg +: { color: theme.color_bg_app }
}
```

## Registration Order (CRITICAL)

Widget modules MUST be registered BEFORE UI modules that use them:

```rust
impl App {
    fn run(vm: &mut ScriptVm) -> Self {
        crate::makepad_widgets::script_mod(vm);   // 1. Base widgets FIRST
        crate::my_widgets::script_mod(vm);         // 2. Custom widgets SECOND
        crate::app_ui::script_mod(vm);             // 3. UI using widgets THIRD
        App::from_script_mod(vm, self::script_mod) // 4. App component LAST
    }
}
```

### Multi-Module Aggregation (lib.rs pattern)

```rust
pub fn script_mod(vm: &mut ScriptVm) {
    crate::module_a::script_mod(vm);
    crate::module_b::script_mod(vm);
    // ... all widget modules
}
```

## Prelude System

### Available Preludes

| Prelude | Use Case |
|---------|----------|
| `mod.prelude.widgets.*` | App development - includes all standard widgets |
| `mod.prelude.widgets_internal.*` | Widget library internal development |

### Prelude Alias Syntax

```rust
mod.prelude.widgets = {
    ..mod.std,            // Spread all of mod.std into scope
    theme:mod.theme,      // Create 'theme' as alias for mod.theme
    draw:mod.draw,        // Create 'draw' as alias for mod.draw
}
```

Without the alias (`mod.theme,` without `theme:`), the module is included but has no accessible name.

## Cross-Module Sharing

### The `mod` Object is the ONLY Way to Share

```rust
// In widget_module.rs - export to mod.widgets namespace
script_mod!{
    use mod.prelude.widgets_internal.*
    mod.widgets.MyWidget = set_type_default() do mod.widgets.MyWidgetBase{ ... }
}

// In app_ui.rs - import via mod.widgets
script_mod!{
    use mod.prelude.widgets.*
    use mod.widgets.*   // Now MyWidget is in scope
    // ...
    MyWidget{}
}
```

**`use crate.module.*` does NOT work** - the `crate.` prefix is not available in script_mod.

## Runtime Property Updates

Use `script_apply_eval!` instead of the old `apply_over` + `live!`:

```rust
// Old system
item.apply_over(cx, live!{ height: (height) });

// New system - use #(expr) for Rust expression interpolation
script_apply_eval!(cx, item, {
    height: #(height)
    draw_bg: { is_even: #(if is_even { 1.0 } else { 0.0 }) }
});
```

## Debug Logging

Use `~expression` to log values during script evaluation:

```rust
script_mod!{
    ~mod.theme           // Logs the theme object
    ~mod.prelude.widgets // Logs what's in the prelude
    ~some_variable       // Logs a variable's value
}
```

## Common Pitfalls

### 1. Missing `#[source] source: ScriptObjectRef`

All `Script`-derived structs MUST have this field:

```rust
#[derive(Script, ScriptHook)]
pub struct MyStruct {
    #[source] source: ScriptObjectRef,  // REQUIRED - will fail without it
    // ...
}
```

### 2. Missing `height: Fit` on Containers

Default height is `Fill`. In a `Fit` parent, `Fill` creates a circular dependency = 0 height = invisible:

```
// WRONG - invisible!
View{ flow: Down
    Label{ text: "You can't see me" }
}

// CORRECT
View{ height: Fit flow: Down
    Label{ text: "Visible!" }
}
```

### 3. Confusing `:` vs `:=`

- `key: value` -- sets a property (stored in map)
- `name := Widget{}` -- creates a named, addressable child (stored in vec)
- `label := Label{ text: "x" }` -- named, overridable via `Template{ label.text: "y" }`
- `label: Label{ text: "x" }` -- anonymous, NOT addressable, overrides fail silently

### 4. Forgetting `+:` Merge Operator

```
// WRONG - replaces ALL of draw_bg (loses hover, border, animations)
draw_bg: { color: #f00 }

// CORRECT - merges, only changes color
draw_bg +: { color: #f00 }
```

### 5. Wrong Theme Access

```
// WRONG
color: THEME_COLOR_BG     // old 1.x constant syntax
color: (THEME_COLOR_BG)   // old 1.x parenthesized reference

// CORRECT
color: theme.color_bg_app
padding: theme.space_2
font_size: theme.font_size_p
```

### 6. Hex Colors Containing 'e' Need `#x` Prefix

The Rust tokenizer interprets `e`/`E` in hex literals as scientific notation exponent:

```
// WRONG - Rust parse error: "expected at least one digit in exponent"
color: #2ecc71
color: #1e1e2e

// CORRECT - use #x prefix
color: #x2ecc71
color: #x1e1e2e

// Colors without 'e' work fine with plain #
color: #ff4444    // OK
color: #44cc44    // OK
```

### 7. `pub` Keyword Invalid in script_mod

```
// WRONG
pub mod.widgets.MyWidget = ...

// CORRECT - visibility is controlled by Rust module system
mod.widgets.MyWidget = ...
```

### 8. `Inset{...}` Constructor Syntax for Margins/Padding

```
// WRONG
margin: { left: 10 }
align: { x: 0.5 y: 0.5 }

// CORRECT - use constructor syntax
margin: Inset{ left: 10 }
align: Align{ x: 0.5 y: 0.5 }
padding: Inset{ top: 5 bottom: 5 left: 10 right: 10 }

// Bare number for uniform values is OK
padding: 15
margin: 0.
```

### 9. Draw Shader Struct Field Ordering with `#[repr(C)]`

Non-instance data (`#[rust]`, non-instance `#[live]` fields) MUST go BEFORE `#[deref]`. Only instance fields (shader inputs) go AFTER:

```rust
// CORRECT
#[derive(Script, ScriptHook)]
#[repr(C)]
pub struct MyDrawShader {
    #[live] pub svg: Option<ScriptHandleRef>,  // non-instance, BEFORE deref
    #[rust] my_state: bool,                     // non-instance, BEFORE deref
    #[deref] pub draw_super: DrawQuad,          // contains DrawVars + base instances
    #[live] pub tint: Vec4f,                    // instance field, AFTER deref - OK
}

// WRONG - #[rust] after instance fields corrupts GPU buffer
#[derive(Script, ScriptHook)]
#[repr(C)]
pub struct MyDrawShader {
    #[deref] pub draw_super: DrawQuad,
    #[live] pub tint: Vec4f,
    #[rust] my_state: bool,      // BAD: between instance fields
}
```

### 10. No Comments Before First Code in script_mod!

Rust proc macro token stream strips comments, which shifts error positions:

```rust
// WRONG

## Extended reference

See [references/extended-guide.md](references/extended-guide.md) for the full upstream document.

