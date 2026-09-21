Use dot notation to access nested widgets:

```rust
self.ui.label(cx, ids!(container.inner.child_label))
self.ui.button(cx, ids!(toolbar.save_button))
```

### Generic widget access

```rust
self.ui.widget(cx, ids!(my_widget))    // -> WidgetRef (untyped)
```

### Common widget setter methods (called from Rust)

```rust
// Label
self.ui.label(cx, ids!(my_label)).set_text(cx, "Hello");

// TextInput
self.ui.text_input(cx, ids!(my_input)).set_text(cx, "default value");

// CheckBox
if let Some(mut inner) = self.ui.check_box(cx, ids!(my_check)).borrow_mut() {
    inner.set_active(cx, true);
}

// DropDown
self.ui.drop_down(cx, ids!(my_dd)).set_selected_item(cx, 2);
self.ui.drop_down(cx, ids!(my_dd)).set_labels(cx, vec!["A".into(), "B".into()]);

// Slider
self.ui.slider(cx, ids!(my_slider)).set_value(cx, 0.5);

// Redraw any widget
self.ui.widget(cx, ids!(my_widget)).redraw(cx);

// Visibility
self.ui.button(cx, ids!(my_button)).set_visible(cx, false);
```

---

## 7. Widget Methods from Splash

Inside `script_mod!` Splash code, access widgets through the `ui` prefix:

```splash
// Trigger a re-render of a view's on_render handler
ui.main_view.render()

// Get text from a TextInput
let text = ui.todo_input.text()

// Set text on a TextInput
ui.todo_input.set_text("")

// Trigger a click on another widget
ui.add_button.on_click()
```

---

## 8. Hit Events (Low-Level)

For custom widgets that need raw input handling, the `Hit` enum provides low-level
events. Access them through `event.hits(cx, area)` in a widget's `handle_event`.

```rust
pub enum Hit {
    // Keyboard focus
    KeyFocus(KeyFocusEvent),
    KeyFocusLost(KeyFocusEvent),

    // Keyboard input
    KeyDown(KeyEvent),
    KeyUp(KeyEvent),

    // Text input
    TextInput(TextInputEvent),
    TextRangeReplace(TextRangeReplaceEvent),
    TextCopy(TextClipboardEvent),
    TextCut(TextClipboardEvent),
    ImeAction(ImeActionEvent),

    // Pointer/finger events
    FingerDown(FingerDownEvent),
    FingerMove(FingerMoveEvent),
    FingerUp(FingerUpEvent),
    FingerScroll(FingerScrollEvent),
    FingerLongPress(FingerLongPressEvent),

    // Hover events
    FingerHoverIn(FingerHoverEvent),
    FingerHoverOver(FingerHoverEvent),
    FingerHoverOut(FingerHoverEvent),

    // Triggers
    Trigger(TriggerHitEvent),

    Nothing,
}
```

### Usage in custom widgets

```rust
impl Widget for MyCustomWidget {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        match event.hits(cx, self.draw_bg.area()) {
            Hit::FingerDown(fd) => {
                cx.set_key_focus(self.draw_bg.area());
                // fd.abs -- absolute position
                // fd.rel -- relative position within widget
                // fd.modifiers -- KeyModifiers
            }
            Hit::FingerUp(fu) => {
                if fu.is_over {
                    // Finger was released inside the widget = click
                    let uid = self.widget_uid();
                    cx.widget_action(uid, MyWidgetAction::Clicked);
                }
            }
            Hit::FingerMove(fm) => {
                // fm.abs, fm.rel -- current position
            }
            Hit::FingerHoverIn(_) => {
                self.animator_play(cx, ids!(hover.on));
            }
            Hit::FingerHoverOut(_) => {
                self.animator_play(cx, ids!(hover.off));
            }
            Hit::KeyDown(ke) => {
                match ke.key_code {
                    KeyCode::ReturnKey => { /* handle enter */ }
                    KeyCode::Escape => { /* handle escape */ }
                    _ => {}
                }
            }
            _ => {}
        }
    }
}
```

---

## 9. Timer Events

Timers are created via `Cx` methods and received in `handle_timer`.

### Creating timers

```rust
// One-shot timer (fires once after delay in seconds)
let timer: Timer = cx.start_timeout(2.0);  // 2 seconds

// Repeating timer (fires every interval seconds)
let timer: Timer = cx.start_interval(0.5); // every 500ms

// Stop a timer
cx.stop_timer(timer);
```

### Handling timer events

```rust
#[derive(Script, ScriptHook)]
pub struct App {
    #[live]
    ui: WidgetRef,
    #[rust]
    poll_timer: Timer,
}

impl MatchEvent for App {
    fn handle_startup(&mut self, cx: &mut Cx) {
        self.poll_timer = cx.start_interval(30.0);
    }

    fn handle_timer(&mut self, cx: &mut Cx, event: &TimerEvent) {
        if self.poll_timer.is_timer(event).is_some() {
            self.do_periodic_work(cx);
        }
    }
}
```

---

## 10. HTTP / Network Events

### Making HTTP requests from Rust

```rust
let request_id = live_id!(my_request);
let mut req = HttpRequest::new(url, HttpMethod::Get);
req.set_header("Content-Type", "application/json");
req.set_body(body_bytes);
cx.http_request(request_id, req);
```

### Handling HTTP responses

```rust
impl MatchEvent for App {
    fn handle_http_response(&mut self, cx: &mut Cx, request_id: LiveId, response: &HttpResponse) {
        if request_id == live_id!(my_request) {
            let body = &response.body;
            // Process response...
        }
    }

    fn handle_http_request_error(&mut self, cx: &mut Cx, request_id: LiveId, err: &HttpError) {
        if request_id == live_id!(my_request) {
            log!("Request failed: {}", err.message);
        }
    }

    fn handle_http_progress(&mut self, cx: &mut Cx, request_id: LiveId, progress: &HttpProgress) {
        if request_id == live_id!(my_request) {
            let pct = progress.loaded as f64 / progress.total as f64;
            // Update progress UI...
        }
    }

    // For streaming responses
    fn handle_http_stream(&mut self, cx: &mut Cx, request_id: LiveId, data: &HttpResponse) {
        // Receive incremental chunks
    }

    fn handle_http_stream_complete(&mut self, cx: &mut Cx, request_id: LiveId, data: &HttpResponse) {
        // Stream finished
    }
}
```

### Making HTTP requests from Splash

```splash
let req = net.HttpRequest{
    url: "https://api.example.com/data"
    method: net.HttpMethod.GET
    headers: {"Content-Type": "application/json"}
}
net.http_request(req) do net.HttpEvents{
    on_response: |res| {
        // handle response
        let data = res.body.to_string().parse_json()
    }
    on_error: |e| {
        // handle error
    }
}

// Streaming HTTP request
let req = net.HttpRequest{
    url: "https://api.openai.com/v1/chat/completions"
    method: net.HttpMethod.POST
    headers: {"Content-Type": "application/json"}
    is_streaming: true
    body: {model: "gpt-4" messages: [{role: "user" content: "Hello"}]}
}
net.http_request(req) do net.HttpEvents{
    on_stream: fn(res){
        // Process each streaming chunk
        let chunk = res.body.to_string()
    }
    on_complete: fn(res){
        // Stream finished
    }
}
```

---

## 11. Event Flow Diagram

```
User Input (click/key/mouse)
    |
    v
Platform Event Loop (Cx)
    |
    v
AppMain::handle_event(&mut self, cx, event)
    |
    +--> self.match_event(cx, event)
    |       |
    |       +--> MatchEvent::handle_startup / handle_shutdown / ...
    |       +--> MatchEvent::handle_actions(cx, actions)
    |       |       |
    |       |       +--> self.ui.button(cx, ids!(name)).clicked(actions)
    |       |       +--> script_eval!(cx, { ... })
    |       |               |
    |       |               v
    |       |           ScriptVm::eval -> updates Splash state
    |       |               |
    |       |               +--> ui.view.render() -> schedules re-draw
    |       |
    |       +--> MatchEvent::handle_timer(cx, event)
    |       +--> MatchEvent::handle_http_response(cx, id, response)
    |       +--> MatchEvent::handle_key_down(cx, event)
    |
    +--> self.ui.handle_event(cx, event, scope)
            |
            +--> Widget tree event propagation
            +--> Hit detection (FingerDown/Up/Move)
            +--> Splash on_click / on_return handlers execute
            +--> on_render handlers execute during draw
            +--> Widget actions emitted -> feed back into Actions
```

---

## 12. Complete Patterns

### Pattern 1: Counter (button click -> state update -> re-render)

```rust
use makepad_widgets::*;

app_main!(App);

script_mod! {
    use mod.prelude.widgets.*
    let state = {
        counter: 0
    }
    mod.state = state
    startup() do #(App::script_component(vm)){
        ui: Root{
            on_startup: ||{
                ui.main_view.render()
            }
            main_window := Window{
                window.inner_size: vec2(420, 220)
                body +: {
                    main_view := View{
                        width: Fill
                        height: Fill
                        flow: Down
                        spacing: 12
                        align: Center
                        on_render: ||{
                            counter_label := Label{
                                text: "Count: " + state.counter
                                draw_text.text_style.font_size: 24
                            }
                        }
                    }
                    increment_button := Button{
                        text: "Increment"
                    }
                }
            }
        }
    }
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
        if self.ui.button(cx, ids!(increment_button)).clicked(actions) {
            script_eval!(cx, {
                mod.state.counter += 1
                ui.main_view.render()
            });
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

### Pattern 2: Form (text input -> validation -> submission)

```splash
// Inside script_mod!

fn submit_form(){
    let name = ui.name_input.text()
    let email = ui.email_input.text()
    if name == "" {
        ui.error_label.set_text("Name is required")
    } else if email == "" {
        ui.error_label.set_text("Email is required")
    } else {
        // Process form...
        ui.error_label.set_text("")
        ui.name_input.set_text("")
        ui.email_input.set_text("")
    }
}

// In the UI tree:
name_input := TextInput{
    empty_text: "Your name"
}
email_input := TextInput{
    empty_text: "your@email.com"
    on_return: || submit_form()
}
submit_button := Button{
    text: "Submit"
    on_click: || submit_form()
}
error_label := Label{
    text: ""
    draw_text.color: #f00
}
```

### Pattern 3: List with per-item events

```splash
let items = []
items.push({name: "Item A", selected: false})
items.push({name: "Item B", selected: false})

fn toggle_item(index, checked){
    items[index].selected = checked
}

fn delete_item(index){
    items.remove(index)
    ui.item_list.render()
}

// In UI:
item_list := ScrollYView{
    width: Fill height: Fill
    new_batch: true
    on_render: ||{
        for i, item in items {
            RoundedView{
                width: Fill height: Fit
                flow: Right
                check := CheckBox{
                    active: item.selected
                    on_click: |checked| toggle_item(i, checked)
                }
                Label{text: item.name}
                Button{
                    text: "Delete"
                    on_click: || delete_item(i)
                }
            }
        }
    }
}
```

### Pattern 4: Cross-layer communication (Splash state + Rust logic)

```rust
// Rust side: handle complex logic, then update Splash state
impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        if self.ui.button(cx, ids!(fetch_button)).clicked(actions) {
            // Rust handles the HTTP request
            let request_id = live_id!(fetch_data);
            let req = HttpRequest::new("https://api.example.com/data", HttpMethod::Get);
            cx.http_request(request_id, req);
        }
    }

    fn handle_http_response(&mut self, cx: &mut Cx, request_id: LiveId, response: &HttpResponse) {
        if request_id == live_id!(fetch_data) {
            let data = String::from_utf8_lossy(&response.body).to_string();
            // Bridge back to Splash to update UI
            script_eval!(cx, {
                mod.state.data = #(data)
                mod.state.loading = false
                ui.results_view.render()
            });
        }
    }
}
```

---

## Source Files Reference

| File | Purpose |
|------|---------|
| `draw/src/match_event.rs` | `MatchEvent` trait definition |
| `widgets/src/widget_match_event.rs` | `WidgetMatchEvent` trait (for custom widgets) |
| `platform/src/event/event.rs` | `Event` enum, `Hit` enum, `Timer` |
| `platform/src/event/finger.rs` | Finger/pointer event types |
| `platform/script/src/lib.rs` | `script_eval!` macro definition |
| `platform/script/derive/src/lib.rs` | `script_apply_eval!` proc macro |
| `widgets/src/button.rs` | Button action API |
| `widgets/src/text_input.rs` | TextInput action API |
| `widgets/src/check_box.rs` | CheckBox action API |
| `widgets/src/drop_down.rs` | DropDown action API |
| `widgets/src/slider.rs` | Slider action API |
| `widgets/src/radio_button.rs` | RadioButton action API |
| `examples/counter/src/app.rs` | Counter example (minimal) |
| `examples/todo/src/app.rs` | Todo example (comprehensive) |
| `examples/git/src/app.rs` | Git example (HTTP, timers) |
| `examples/camera/src/` | Camera example (media events) |
| `examples/text_selection/src/` | Text selection example |

---

## 13. New Events (March 2026)

### Selection & Clipboard Events

New `Hit` variants for text selection and clipboard operations:

```rust
Hit::TextCopy(TextClipboardEvent)  // User copied text (Ctrl+C or native toolbar)
Hit::TextCut(TextClipboardEvent)   // User cut text (Ctrl+X or native toolbar)
```

**Mobile Selection Handles:** Native selection handles on iOS/Android emit:
```rust
Event::SelectionHandleDrag  // User dragging a selection handle
```

Long-press on text selects a word and shows the native clipboard toolbar. TextFlow widget integrates clipboard actions automatically.

### Popup Window Events

For popup windows (context menus, dropdowns):
```rust
Event::WindowClosed    // Popup window was closed
Event::PopupDismissed  // Popup was dismissed by compositor (Wayland) or click-outside
```

`WindowClosed` is always emitted before `PopupDismissed`. Apps must handle `PopupDismissed` for explicit-close semantics.

### IME Events

IME (Input Method Editor) support for CJK text input:
```rust
Hit::ImeAction(ImeActionEvent)     // IME composition committed/cancelled
Hit::TextRangeReplace(TextRangeReplaceEvent)  // IME text replacement
```

**Linux X11 IME:** Full IME support added for X11. IME popup window positioning fixed to avoid appearing without TextInput focus.

### Video & Media Events

```rust
// In MatchEvent trait:
fn handle_video_inputs(&mut self, _cx: &mut Cx, _e: &VideoInputsEvent) {}
```

Video input device enumeration events from the media plugin system. Camera and video playback events route through the media plugin architecture.

### Primary Selection (Linux)

Linux primary selection (middle-click paste):
- **Wayland:** `zwp_primary_selection_device_manager_v1` protocol
- **X11:** PRIMARY atom handling
- Integrated with TextInput and TextFlow widgets automatically


## Examples

```text
User: Apply this skill to my current task.
Assistant: Follow the workflow in this skill, cite limitations, and ask before risky steps.
```

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
