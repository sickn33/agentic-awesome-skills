---
name: makepad-2.0-events
description: Makepad 2.0 guidance for events; use when building or debugging Makepad UI code.
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

# Makepad 2.0 Event & Action System

## Overview

Makepad 2.0 uses a **two-layer event system**:

1. **Splash Layer** -- Inline event handlers written directly in `script_mod!` Splash code
   (`on_click`, `on_render`, `on_return`, `on_startup`). These handle UI interactions
   declaratively inside the script, close to the widget definitions.

2. **Rust Layer** -- The `MatchEvent` trait with `handle_actions`, `handle_timer`,
   `handle_http_response`, etc. These handle business logic, external I/O, and
   anything that needs full Rust power.

Both layers communicate through two bridge macros:
- `script_eval!(cx, { ... })` -- Execute Splash code from Rust (update state, trigger renders)
- `script_apply_eval!(cx, widget_ref, { ... })` -- Patch widget properties from Rust at runtime

---

## 1. Splash Inline Event Handlers

Event handlers are attached directly to widgets inside `script_mod!` blocks. They use
closure syntax with `||` for no arguments or `|arg|` for callbacks that receive a value.

### on_click -- Button/widget click

Fires when the user clicks a button or clickable widget. No arguments for plain buttons,
or `|checked|` for CheckBox which passes the new boolean state.

```splash
// Plain button click
add_button := Button{
    text: "Add"
    on_click: ||{
        let text = ui.todo_input.text()
        if text != "" {
            add_todo(text, "")
            ui.todo_input.set_text("")
        }
    }
}

// CheckBox click with checked state argument
check.on_click: |checked| toggle_todo(i, checked)

// Inline delete with closure capturing loop variable
delete.on_click: || delete_todo(i)

// Calling another widget's click programmatically
clear_done := ButtonFlatter{
    text: "Clear completed"
    on_click: ||{
        todos.retain(|todo| !todo.done)
        ui.todo_list.render()
    }
}
```

### on_render -- Dynamic rendering

Fires when `.render()` is called on the target view. This is the primary mechanism for
dynamic content. The body replaces the previous draw content of the view.

```splash
main_view := View{
    width: Fill
    height: Fill
    on_render: ||{
        counter_label := Label{
            text: "Count: " + state.counter
            draw_text.text_style.font_size: 24
        }
    }
}

// List rendering with for loop and per-item event handlers
todo_list := ScrollYView{
    width: Fill height: Fill
    new_batch: true
    on_render: ||{
        if todos.len() == 0
            EmptyState{}
        else for i, todo in todos {
            TodoItem{
                label.text: todo.text
                check.active: todo.done
                check.on_click: |checked| toggle_todo(i, checked)
                delete.on_click: || delete_todo(i)
            }
        }
    }
    EmptyState{}
}
```

**Key point**: `on_render` is NOT called automatically. You must call `ui.widget_name.render()`
to trigger it. The `new_batch: true` property on a view tells the system to clear previous
draw content before re-rendering.

### on_return -- TextInput enter key

Fires when the user presses Enter/Return inside a TextInput. Commonly used to submit forms.

```splash
todo_input := TextInput{
    width: Fill height: 9. * theme.space_1
    empty_text: "What needs to be done?"
    on_return: || ui.add_button.on_click()
}
```

### on_startup -- App startup

Fires once when the application starts. Defined at the `Root` level. Commonly used
to trigger initial renders.

```splash
ui: Root{
    on_startup: ||{
        ui.main_view.render()
    }
    main_window := Window{
        // ...
    }
}
```

### Event handler capabilities

Inside event handlers you can:
- Call Splash functions: `add_todo(text, "dev")`
- Read widget values: `let text = ui.todo_input.text()`
- Set widget values: `ui.todo_input.set_text("")`
- Trigger re-renders: `ui.todo_list.render()`
- Trigger other widget clicks: `ui.add_button.on_click()`
- Modify state variables: `state.counter += 1`
- Use array methods: `todos.push({text: "new", done: false})`
- Use control flow: `if text != "" { ... }`

---

## 2. Rust Event Handling -- MatchEvent Trait

The `MatchEvent` trait is the Rust-side event dispatcher. It receives platform events
and widget actions through a set of handler methods.

### Core trait definition (from `draw/src/match_event.rs`)

```rust
pub trait MatchEvent {
    // Lifecycle
    fn handle_startup(&mut self, _cx: &mut Cx) {}
    fn handle_shutdown(&mut self, _cx: &mut Cx) {}
    fn handle_foreground(&mut self, _cx: &mut Cx) {}
    fn handle_background(&mut self, _cx: &mut Cx) {}
    fn handle_pause(&mut self, _cx: &mut Cx) {}
    fn handle_resume(&mut self, _cx: &mut Cx) {}

    // Window focus
    fn handle_window_got_focus(&mut self, _cx: &mut Cx, _window_id: &WindowId) {}
    fn handle_window_lost_focus(&mut self, _cx: &mut Cx, _window_id: &WindowId) {}

    // Frame
    fn handle_next_frame(&mut self, _cx: &mut Cx, _e: &NextFrameEvent) {}

    // Widget actions (most commonly used)
    fn handle_action(&mut self, _cx: &mut Cx, _e: &Action) {}
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        for action in actions {
            self.handle_action(cx, action);
        }
    }

    // Input
    fn handle_key_down(&mut self, _cx: &mut Cx, _e: &KeyEvent) {}
    fn handle_key_up(&mut self, _cx: &mut Cx, _e: &KeyEvent) {}
    fn handle_back_pressed(&mut self, _cx: &mut Cx) -> bool { false }

    // Timer
    fn handle_timer(&mut self, _cx: &mut Cx, _e: &TimerEvent) {}

    // Drawing
    fn handle_draw(&mut self, _cx: &mut Cx, _e: &DrawEvent) {}
    fn handle_draw_2d(&mut self, _cx: &mut Cx2d) {}

    // Network
    fn handle_http_response(&mut self, _cx: &mut Cx, _request_id: LiveId, _response: &HttpResponse) {}
    fn handle_http_request_error(&mut self, _cx: &mut Cx, _request_id: LiveId, _err: &HttpError) {}
    fn handle_http_progress(&mut self, _cx: &mut Cx, _request_id: LiveId, _progress: &HttpProgress) {}
    fn handle_http_stream(&mut self, _cx: &mut Cx, _request_id: LiveId, _data: &HttpResponse) {}
    fn handle_http_stream_complete(&mut self, _cx: &mut Cx, _request_id: LiveId, _data: &HttpResponse) {}

    // Signals
    fn handle_signal(&mut self, _cx: &mut Cx) {}

    // Media devices
    fn handle_audio_devices(&mut self, _cx: &mut Cx, _e: &AudioDevicesEvent) {}
    fn handle_midi_ports(&mut self, _cx: &mut Cx, _e: &MidiPortsEvent) {}
    fn handle_video_inputs(&mut self, _cx: &mut Cx, _e: &VideoInputsEvent) {}
}
```

### Standard App boilerplate (required)

Every Makepad 2.0 app needs this Rust structure:

```rust
use makepad_widgets::*;

app_main!(App);

script_mod! {
    // ... Splash UI code ...
}

impl App {
    fn run(vm: &mut ScriptVm) -> Self {
        crate::makepad_widgets::script_mod(vm);
        App::from_script_mod(vm, self::script_mod)
    }
}

#[derive(Script, ScriptHook)]
pub struct App {
    #[live]
    ui: WidgetRef,
}

impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        // Handle widget actions here
    }
}

impl AppMain for App {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        self.match_event(cx, event);
        self.ui.handle_event(cx, event, &mut Scope::empty());
    }
}
```

**CRITICAL**: `handle_event` must call BOTH `self.match_event(cx, event)` (to dispatch
to the MatchEvent handlers) AND `self.ui.handle_event(cx, event, &mut Scope::empty())`
(to propagate events to widgets).

---

## 3. Widget Action API

Access widgets from Rust using `self.ui.widget_type(cx, ids!(name))`, then query their
action state by passing the `&Actions` reference.

### Button

```rust
// Access: self.ui.button(cx, ids!(my_button))
// Returns ButtonRef

.clicked(actions) -> bool           // Was clicked (finger down + up inside)
.pressed(actions) -> bool           // Was pressed down
.long_pressed(actions) -> bool      // Was long-pressed (not yet released)
.released(actions) -> bool          // Was released (NOT a click)
.clicked_modifiers(actions) -> Option<KeyModifiers>   // Clicked with modifier keys
.pressed_modifiers(actions) -> Option<KeyModifiers>
.released_modifiers(actions) -> Option<KeyModifiers>
```

### TextInput

```rust
// Access: self.ui.text_input(cx, ids!(my_input))
// Returns TextInputRef

.changed(actions) -> Option<String>                    // Text changed, returns new text
.returned(actions) -> Option<(String, KeyModifiers)>   // Enter pressed, returns text + mods
.escaped(actions) -> bool                              // Escape pressed
.key_down_unhandled(actions) -> Option<KeyEvent>       // Unhandled key event
.selected_text() -> String                             // Current selection (no actions needed)
```

### CheckBox

```rust
// Access: self.ui.check_box(cx, ids!(my_check))
// Returns CheckBoxRef

.changed(actions) -> Option<bool>   // Toggled, returns new checked state
```

### DropDown

```rust
// Access: self.ui.drop_down(cx, ids!(my_dropdown))
// Returns DropDownRef

.selected(actions) -> Option<usize>        // Item selected, returns index
.changed(actions) -> Option<usize>         // Same as selected
.changed_label(actions) -> Option<String>  // Item selected, returns label string
.selected_item() -> usize                  // Current selection (no actions needed)
.selected_label() -> String                // Current label (no actions needed)
```

### Slider

```rust
// Access: self.ui.slider(cx, ids!(my_slider))
// Returns SliderRef

.slided(actions) -> Option<f64>     // Value changed during slide or text edit
.end_slide(actions) -> Option<f64>  // Slide ended or text committed
.value() -> Option<f64>             // Current value (no actions needed)
```

### RadioButton / RadioButtonGroup

```rust
// Access: self.ui.radio_button(cx, ids!(my_radio))
// Returns RadioButtonRef

.clicked(actions) -> bool                          // Was clicked
// For groups:
.selected(cx, actions) -> Option<usize>            // Selected index in group
```

### LinkLabel

```rust
// Access: self.ui.link_label(cx, ids!(my_link))
// Returns LinkLabelRef

.clicked(actions) -> bool
.clicked_modifiers(actions) -> Option<KeyModifiers>
```

### Complete example

```rust
impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        if self.ui.button(cx, ids!(increment_button)).clicked(actions) {
            script_eval!(cx, {
                mod.state.counter += 1
                ui.main_view.render()
            });
        }

        if let Some(text) = self.ui.text_input(cx, ids!(search_input)).changed(actions) {
            self.perform_search(cx, &text);
        }

        if let Some(checked) = self.ui.check_box(cx, ids!(dark_mode)).changed(actions) {
            self.set_theme(cx, checked);
        }

        if let Some(index) = self.ui.drop_down(cx, ids!(language)).selected(actions) {
            self.change_language(cx, index);
        }
    }
}
```

---

## 4. script_eval! Macro -- Rust to Splash Communication

`script_eval!` executes Splash code from within Rust handlers. It is the primary
bridge for updating Splash state and triggering UI re-renders from Rust.

**Signature**: `script_eval!(cx_or_vm, { splash_code })`

The first argument can be `&mut Cx` (inside event handlers) or `&mut ScriptVm`
(during initialization).

```rust
// Update Splash state and re-render
if self.ui.button(cx, ids!(increment_button)).clicked(actions) {
    script_eval!(cx, {
        mod.state.counter += 1
        ui.main_view.render()
    });
}

// Pass Rust values into Splash using #(expr) interpolation
let rust_string = "Hello from Rust";
script_eval!(cx, {
    mod.value = #(rust_string)
});

// During init (inside App::run), use vm instead of cx
impl App {
    fn run(vm: &mut ScriptVm) -> Self {
        crate::makepad_widgets::theme_mod(vm);
        script_eval!(vm, {
            mod.theme = mod.themes.light
        });
        crate::makepad_widgets::widgets_mod(vm);
        App::from_script_mod(vm, self::script_mod)
    }
}
```

### Value interpolation with `#(expr)`

Inside `script_eval!`, use `#(rust_expression)` to inject Rust values into Splash:

```rust
let count = 42_u64;
let message = "items found".to_string();
script_eval!(cx, {
    mod.state.count = #(count)
    mod.state.message = #(message)
    ui.results_view.render()
});
```

---

## 5. script_apply_eval! Macro -- Runtime Property Patching

`script_apply_eval!` patches widget properties at runtime from Rust. Unlike
`script_eval!` which runs general Splash code, this targets a specific widget
reference and applies property changes directly.

**Signature**: `script_apply_eval!(cx, widget_ref, { property_patches })`

```rust
// Patch a single property
let height = 500.0_f64;
script_apply_eval!(cx, item, {
    page_view: { height: #(height) }
});

// Patch margin
let margin = Inset { top: 10.0, bottom: 10.0, left: 5.0, right: 5.0 };
script_apply_eval!(cx, content_view, {
    margin: #(margin)
});

// Patch width with a Makepad type
script_apply_eval!(cx, content_view, {
    width: #(Size::fit())
});

// Patch nested draw shader properties
let bg_color = vec4(0.2, 0.3, 0.4, 1.0);
let triangle_height = 8.0_f64;
script_apply_eval!(cx, content, {
    draw_bg +: {
        triangle_height: #(triangle_height)
        background_color: #(bg_color)
    }
});
```

---

## 6. Widget Reference Access from Rust

### Accessing widgets by ID

Use `self.ui.widget_type(cx, ids!(name))` to get a typed reference:

```rust
self.ui.button(cx, ids!(increment_button))       // -> ButtonRef
self.ui.label(cx, ids!(status_label))             // -> LabelRef
self.ui.text_input(cx, ids!(search_input))        // -> TextInputRef
self.ui.check_box(cx, ids!(dark_mode))            // -> CheckBoxRef
self.ui.drop_down(cx, ids!(language))             // -> DropDownRef
self.ui.slider(cx, ids!(volume))                  // -> SliderRef
self.ui.view(cx, ids!(content))                   // -> ViewRef
self.ui.radio_button(cx, ids!(option_a))          // -> RadioButtonRef
```

### Nested widget access with ids!

## Extended reference

See [references/extended-guide.md](references/extended-guide.md) for the full upstream document.

