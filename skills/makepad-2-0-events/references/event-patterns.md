# Makepad 2.0 Event Patterns -- Working Examples

This reference contains complete working patterns extracted from the Makepad 2.0 codebase.
All Splash code uses Makepad 2.0 syntax (no commas, no semicolons, colon properties).
All Rust code uses `makepad_widgets::*` imports.

---

## 1. Counter App -- Button Click -> State Update -> Re-render

The simplest complete event flow. A button click in Rust triggers `script_eval!`
which updates Splash state and calls `.render()` to refresh the view.

**Source**: `examples/counter/src/app.rs`

### Splash side (inside script_mod!)

```splash
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
```

### Rust side

```rust
use makepad_widgets::*;

app_main!(App);

// script_mod! { ... } (Splash code above)

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

### Event flow

1. User clicks the "Increment" button
2. Button widget emits `ButtonAction::Clicked` into `Actions`
3. `AppMain::handle_event` calls `self.match_event(cx, event)`
4. `MatchEvent::match_event` dispatches `Event::Actions` to `handle_actions`
5. `self.ui.button(cx, ids!(increment_button)).clicked(actions)` returns `true`
6. `script_eval!` runs Splash code: increments `state.counter`, calls `render()`
7. `render()` schedules `main_view` for redraw
8. On next draw pass, `on_render` fires, creating a Label with the new count

---

## 2. Todo App -- List Rendering with Per-Item Events

Demonstrates dynamic list rendering with `for` loops, per-item click handlers,
and multiple Splash functions coordinating state.

**Source**: `examples/todo/src/app.rs`

### State and functions

```splash
let todos = []

// Seed sample data
todos.push({text: "Get AI to control UI", tag: "dev", done: true})

fn add_todo(text, tag){
    todos.push({text: text, tag: tag, done: false})
    ui.todo_list.render()
}

fn toggle_todo(index, checked){
    todos[index].done = checked
}

fn delete_todo(index){
    todos.remove(index)
    ui.todo_list.render()
}

fn count_remaining(){
    let n = 0
    for todo in todos {
        if !todo.done { n = n + 1 }
    }
    n
}
```

### Template definition

```splash
let TodoItem = RoundedView{
    width: Fill height: Fit
    padding: theme.mspace_2{left: theme.space_3, right: theme.space_3}
    flow: Right spacing: theme.space_2
    align: Align{y: 0.5}
    draw_bg.color: theme.color_bg_container
    draw_bg.border_radius: 10.0

    check := CheckBox{text: ""}
    label := Label{
        width: Fill
        text: "task"
        draw_text.color: theme.color_label_inner
    }
    delete := ButtonFlatter{
        text: "x"
        width: 28 height: 28
    }
}
```

### Input bar with on_return and on_click

```splash
todo_input := TextInput{
    width: Fill height: 9. * theme.space_1
    empty_text: "What needs to be done?"
    on_return: || ui.add_button.on_click()
}
add_button := Button{
    text: "+"
    width: 40 height: 34
    on_click: ||{
        let text = ui.todo_input.text()
        if text != "" {
            add_todo(text, "")
            ui.todo_input.set_text("")
        }
    }
}
```

### Dynamic list with on_render

```splash
todo_list := ScrollYView{
    width: Fill height: Fill
    padding: theme.mspace_2{left: theme.space_3, right: theme.space_3}
    flow: Down spacing: theme.space_1
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

### Clear completed with array retain

```splash
clear_done := ButtonFlatter{
    text: "Clear completed"
    on_click: ||{
        todos.retain(|todo| !todo.done)
        ui.todo_list.render()
    }
}
```

### Key patterns demonstrated

- `on_return` on TextInput delegates to another widget's `on_click`
- `on_render` with `for i, todo in todos` creates per-item UI with closures
- Each closure captures the loop variable `i` for per-item actions
- `CheckBox.on_click: |checked|` receives the new boolean state
- `todos.retain(|todo| !todo.done)` filters the array using a predicate
- `ui.todo_list.render()` triggers re-render after any state mutation

---

## 3. Form Validation Pattern

A pattern for input validation before submission, using Splash-only event handlers.

```splash
let form_errors = {
    name: ""
    email: ""
}

fn validate_email(email){
    // Simple check -- Splash does not have regex by default
    if email == "" "Email is required"
    else if !email.contains("@") "Invalid email address"
    else ""
}

fn validate_name(name){
    if name == "" "Name is required"
    else if name.len() < 2 "Name too short"
    else ""
}

fn submit_form(){
    let name = ui.name_input.text()
    let email = ui.email_input.text()

    form_errors.name = validate_name(name)
    form_errors.email = validate_email(email)

    ui.error_view.render()

    if form_errors.name == "" && form_errors.email == "" {
        // All valid -- process submission
        ui.name_input.set_text("")
        ui.email_input.set_text("")
        ui.success_view.render()
    }
}

// UI definition
View{
    width: Fill height: Fit
    flow: Down spacing: theme.space_2

    name_input := TextInput{
        width: Fill
        empty_text: "Your name"
    }

    email_input := TextInput{
        width: Fill
        empty_text: "your@email.com"
        on_return: || submit_form()
    }

    error_view := View{
        width: Fill height: Fit
        flow: Down
        on_render: ||{
            if form_errors.name != "" {
                Label{text: form_errors.name draw_text.color: #f44}
            }
            if form_errors.email != "" {
                Label{text: form_errors.email draw_text.color: #f44}
            }
        }
    }

    submit_button := Button{
        text: "Submit"
        on_click: || submit_form()
    }

    success_view := View{
        width: Fill height: Fit
        on_render: ||{
            Label{text: "Submitted!" draw_text.color: #4f4}
        }
    }
}
```

---

## 4. Custom Widget Event Handling

When building a custom widget in Rust, use the `Hit` enum to handle raw input events
and emit widget-specific actions.

```rust
use makepad_widgets::*;

// Define custom action
#[derive(Clone, Debug, DefaultNone)]
pub enum ColorPickerAction {
    Changed(Vec4),
    DragStart,
    DragEnd,
    None,
}

#[derive(Script, ScriptHook, Widget)]
pub struct ColorPicker {
    #[deref]
    view: View,
    #[live]
    draw_bg: DrawQuad,
    #[rust]
    current_color: Vec4,
    #[rust]
    dragging: bool,
}

impl Widget for ColorPicker {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        let uid = self.widget_uid();

        match event.hits(cx, self.draw_bg.area()) {
            Hit::FingerDown(fd) => {
                self.dragging = true;
                cx.set_key_focus(self.draw_bg.area());
                self.update_color_from_pos(fd.rel);
                cx.widget_action(uid, ColorPickerAction::DragStart);
                cx.widget_action(uid, ColorPickerAction::Changed(self.current_color));
                self.draw_bg.redraw(cx);
            }
            Hit::FingerMove(fm) => {
                if self.dragging {
                    self.update_color_from_pos(fm.rel);
                    cx.widget_action(uid, ColorPickerAction::Changed(self.current_color));
                    self.draw_bg.redraw(cx);
                }
            }
            Hit::FingerUp(_fu) => {
                if self.dragging {
                    self.dragging = false;
                    cx.widget_action(uid, ColorPickerAction::DragEnd);
                }
            }
            Hit::FingerHoverIn(_) => {
                cx.set_cursor(MouseCursor::Crosshair);
            }
            Hit::FingerHoverOut(_) => {
                cx.set_cursor(MouseCursor::Default);
            }
            _ => {}
        }
    }

    fn draw_walk(&mut self, cx: &mut Cx2d, _scope: &mut Scope, walk: Walk) -> DrawStep {
        self.draw_bg.begin(cx, walk, Layout::default());
        self.draw_bg.end(cx);
        DrawStep::done()
    }
}

impl ColorPicker {
    fn update_color_from_pos(&mut self, pos: DVec2) {
        // Convert position to color...
        self.current_color = vec4(pos.x as f32, pos.y as f32, 0.5, 1.0);
    }
}

// Consuming the custom action from the App
impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        if let Some(item) = actions.find_widget_action(
            self.ui.widget(cx, ids!(color_picker)).widget_uid()
        ) {
            if let ColorPickerAction::Changed(color) = item.cast() {
                // Use the selected color
                script_eval!(cx, {
                    mod.state.selected_color = #(color)
                    ui.preview.render()
                });
            }
        }
    }
}
```

---

## 5. Keyboard Shortcut Handling

Global keyboard shortcuts are handled through `handle_key_down` on the `MatchEvent` trait.

```rust
impl MatchEvent for App {
    fn handle_key_down(&mut self, cx: &mut Cx, event: &KeyEvent) {
        // Ctrl+S / Cmd+S -- Save
        if event.modifiers.control || event.modifiers.logo {
            match event.key_code {
                KeyCode::KeyS => {
                    self.save_document(cx);
                }
                KeyCode::KeyZ => {
                    if event.modifiers.shift {
                        self.redo(cx);
                    } else {
                        self.undo(cx);
                    }
                }
                KeyCode::KeyN => {
                    self.new_document(cx);
                }
                _ => {}
            }
        }

        // Plain keys
        match event.key_code {
            KeyCode::Escape => {
                self.cancel_current_operation(cx);
            }
            KeyCode::F5 => {
                self.refresh(cx);
            }
            _ => {}
        }
    }
}
```

### Widget-level key handling (inside a custom widget)

```rust
impl Widget for MyEditor {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, _scope: &mut Scope) {
        match event.hits(cx, self.draw_bg.area()) {
            Hit::KeyDown(ke) => {
                match ke.key_code {
                    KeyCode::ReturnKey => {
                        let uid = self.widget_uid();
                        cx.widget_action(uid, EditorAction::Submit);
                    }
                    KeyCode::Escape => {
                        let uid = self.widget_uid();
                        cx.widget_action(uid, EditorAction::Cancel);
                    }
                    KeyCode::Tab => {
                        // Insert tab or move focus
                    }
                    _ => {}
                }
            }
            Hit::KeyFocus(_) => {
                self.animator_play(cx, ids!(focus.on));
            }
            Hit::KeyFocusLost(_) => {
                self.animator_play(cx, ids!(focus.off));
            }
            _ => {}
        }
    }
}
```

---

## 6. Timer and Animation Events

### Polling timer (from Git example)

**Source**: `examples/git/src/app.rs`

```rust
#[derive(Script, ScriptHook)]
pub struct App {
    #[live]
    ui: WidgetRef,
    #[rust]
    poll_timer: Timer,
    #[rust]
    active_request_id: Option<LiveId>,
}

impl MatchEvent for App {
    fn handle_startup(&mut self, cx: &mut Cx) {
        // Start polling every 30 seconds
        self.poll_timer = cx.start_interval(30.0);
        self.poll_remote(cx);
    }

    fn handle_timer(&mut self, cx: &mut Cx, event: &TimerEvent) {
        if self.poll_timer.is_timer(event).is_some() {
            self.poll_remote(cx);
        }
    }
}
```

### One-shot delay timer

```rust
#[derive(Script, ScriptHook)]
pub struct App {
    #[live]
    ui: WidgetRef,
    #[rust]
    debounce_timer: Timer,
    #[rust]
    pending_search: String,
}

impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        // Debounce text input -- wait 300ms after last keystroke
        if let Some(text) = self.ui.text_input(cx, ids!(search_input)).changed(actions) {
            self.pending_search = text;
            // Cancel previous timer, start new one
            cx.stop_timer(self.debounce_timer);
            self.debounce_timer = cx.start_timeout(0.3);
        }
    }

    fn handle_timer(&mut self, cx: &mut Cx, event: &TimerEvent) {
        if self.debounce_timer.is_timer(event).is_some() {
            // Timer fired -- execute the search
            self.execute_search(cx, &self.pending_search.clone());
        }
    }
}
```

### NextFrame animation

For smooth per-frame animations, use `handle_next_frame`:

```rust
#[derive(Script, ScriptHook)]
pub struct App {
    #[live]
    ui: WidgetRef,
    #[rust]
    animating: bool,
    #[rust]
    animation_progress: f64,
}

impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        if self.ui.button(cx, ids!(animate_button)).clicked(actions) {
            self.animating = true;
            self.animation_progress = 0.0;
            cx.request_next_frame();
        }
    }

    fn handle_next_frame(&mut self, cx: &mut Cx, _event: &NextFrameEvent) {
        if self.animating {
            self.animation_progress += 0.016; // ~60fps
            if self.animation_progress >= 1.0 {
                self.animation_progress = 1.0;
                self.animating = false;
            } else {
                cx.request_next_frame(); // Request another frame
            }

            let progress = self.animation_progress;
            script_eval!(cx, {
                mod.state.progress = #(progress)
                ui.animated_view.render()
            });
        }
    }
}
```

---

## 7. Network Response Handling (Full Pattern)

Complete pattern showing HTTP requests initiated from Rust, with response handling
that updates Splash UI state.

**Source**: adapted from `examples/git/src/app.rs`

```rust
use makepad_widgets::*;

app_main!(App);

script_mod! {
    use mod.prelude.widgets.*

    let state = {
        loading: false
        data: ""
        error: ""
    }
    mod.state = state

    startup() do #(App::script_component(vm)){
        ui: Root{
            on_startup: ||{
                ui.content_view.render()
            }
            main_window := Window{
                window.inner_size: vec2(600, 400)
                body +: {
                    width: Fill height: Fill
                    flow: Down spacing: 12
                    padding: 20

                    fetch_button := Button{
                        text: "Fetch Data"
                    }

                    content_view := View{
                        width: Fill height: Fill
                        flow: Down
                        on_render: ||{
                            if state.loading {
                                Label{text: "Loading..." draw_text.color: #888}
                            } else if state.error != "" {
                                Label{text: "Error: " + state.error draw_text.color: #f44}
                            } else if state.data != "" {
                                Label{text: state.data}
                            } else {
                                Label{text: "Click Fetch to load data" draw_text.color: #888}
                            }
                        }
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
    #[rust]
    active_request: Option<LiveId>,
}

impl MatchEvent for App {
    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        if self.ui.button(cx, ids!(fetch_button)).clicked(actions) {
            // Show loading state
            script_eval!(cx, {
                mod.state.loading = true
                mod.state.error = ""
                ui.content_view.render()
            });

            // Fire HTTP request
            let request_id = live_id!(fetch_data);
            let req = HttpRequest::new(
                "https://api.example.com/data",
                HttpMethod::Get,
            );
            cx.http_request(request_id, req);
            self.active_request = Some(request_id);
        }
    }

    fn handle_http_response(
        &mut self,
        cx: &mut Cx,
        request_id: LiveId,
        response: &HttpResponse,
    ) {
        if Some(request_id) != self.active_request {
            return;
        }
        self.active_request = None;

        let body = String::from_utf8_lossy(&response.body).to_string();
        script_eval!(cx, {
            mod.state.loading = false
            mod.state.data = #(body)
            ui.content_view.render()
        });
    }

    fn handle_http_request_error(
        &mut self,
        cx: &mut Cx,
        request_id: LiveId,
        err: &HttpError,
    ) {
        if Some(request_id) != self.active_request {
            return;
        }
        self.active_request = None;

        let message = err.message.clone();
        script_eval!(cx, {
            mod.state.loading = false
            mod.state.error = #(message)
            ui.content_view.render()
        });
    }

    fn handle_http_progress(
        &mut self,
        cx: &mut Cx,
        request_id: LiveId,
        progress: &HttpProgress,
    ) {
        if Some(request_id) != self.active_request {
            return;
        }
        let loaded = progress.loaded;
        let total = progress.total;
        log!("Download progress: {} / {} bytes", loaded, total);
    }
}

impl AppMain for App {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        self.match_event(cx, event);
        self.ui.handle_event(cx, event, &mut Scope::empty());
    }
}
```

---

## Summary of Key Rules

1. **Splash handlers** (`on_click`, `on_render`, `on_return`, `on_startup`) are
   written inline in `script_mod!` and handle UI-level interactions.

2. **Rust handlers** (`handle_actions`, `handle_timer`, `handle_http_response`, etc.)
   handle business logic, I/O, and anything that needs typed Rust code.

3. **Bridge macros**: Use `script_eval!(cx, { ... })` to push state changes from
   Rust into Splash and trigger re-renders.

4. **Widget actions**: Access widgets with `self.ui.widget_type(cx, ids!(name))`
   and query actions with `.clicked(actions)`, `.changed(actions)`, etc.

5. **on_render is not automatic**: You must call `ui.widget_name.render()` to
   trigger a view's `on_render` handler. Set `new_batch: true` to clear old content.

6. **Closures capture loop variables**: In `for i, item in list { ... }`, event
   handlers like `on_click: || delete(i)` correctly capture the current `i`.

7. **AppMain::handle_event must call both**:
   - `self.match_event(cx, event)` -- dispatches to MatchEvent handlers
   - `self.ui.handle_event(cx, event, &mut Scope::empty())` -- propagates to widgets

8. **`fn tick()` auto-timer**: Define `fn tick()` in Splash code and the Splash widget
   automatically starts a 1-second interval timer that calls it. No setup needed.

9. **`fn on_audio()` callback**: Canvas injects audio state globals (`_playing`, `_pos`,
   `_dur`, `_amp`, `_b0`–`_b15`) and calls `fn on_audio()` ~10Hz during playback.
   Use this for real-time audio-reactive UI updates.

10. **Splash button events don't reach `handle_actions`**: Dynamically created Splash
    buttons (via `POST /splash`) have unstable UIDs. The `uid_map` may not rebuild
    in time. Always use `on_click:` handlers inside Splash for button interactions.
    The HTTP `GET /event` bridge is unreliable for this reason.
