---
name: robius-app-architecture
description: |
  CRITICAL: Use for Robius app architecture patterns. Triggers on:
  Tokio, async, submit_async_request, 异步, 架构,
  SignalToUI, Cx::post_action, worker task,
  app structure, MatchEvent, handle_startup
risk: unknown
source: community
---

# Robius App Architecture Skill

Best practices for structuring Makepad applications based on the Robrix and Moly codebases - production applications built with Makepad and Robius framework.

**Source codebases:**
- **Robrix**: Matrix chat client - complex sync/async with background subscriptions
- **Moly**: AI chat application - cross-platform (native + WASM) with streaming APIs

## When to Use
Use this skill when:
- Building a Makepad application with async backend integration
- Designing sync/async communication patterns in Makepad
- Structuring a Robius-style application
- Keywords: robrix, robius, makepad app structure, async makepad, tokio makepad

## Production Patterns

For production-ready async patterns, see the `_base/` directory:

| Pattern | Description |
|---------|-------------|
| 08-async-loading | Async data loading with loading states |
| 09-streaming-results | Incremental results with SignalToUI |
| 13-tokio-integration | Full tokio runtime integration |

## Core Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Thread (Makepad)                     │
│  ┌─────────┐     ┌──────────┐     ┌──────────────────────┐ │
│  │   App   │────▶│ WidgetRef │────▶│ Widget Tree (View)  │ │
│  │ State   │     │    ui     │     │ Scope::with_data()  │ │
│  └────┬────┘     └──────────┘     └──────────────────────┘ │
│       │                                                     │
│       │ submit_async_request()                              │
│       ▼                                                     │
│  ┌─────────────────┐          ┌─────────────────────────┐  │
│  │ REQUEST_SENDER  │─────────▶│  Crossbeam SegQueue     │  │
│  │ (MPSC Channel)  │          │  (Lock-free Updates)    │  │
│  └─────────────────┘          └─────────────────────────┘  │
└───────────────────────────────────┬─────────────────────────┘
                                    │
                    SignalToUI::set_ui_signal()
                                    │
┌───────────────────────────────────┴─────────────────────────┐
│                   Tokio Runtime (Async)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           worker_task (Request Handler)               │   │
│  │  - Receives Request from UI                           │   │
│  │  - Spawns async tasks per request                     │   │
│  │  - Posts actions back via Cx::post_action()           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Per-Item Subscriber Tasks                     │   │
│  │  - Listens to external data stream                    │   │
│  │  - Sends Update via crossbeam channel                 │   │
│  │  - Calls SignalToUI::set_ui_signal() to wake UI       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## App Structure

### Top-Level App Definition

```rust
use makepad_widgets::*;

live_design! {
    use link::theme::*;
    use link::widgets::*;

    App = {{App}} {
        ui: <Root>{
            main_window = <Window> {
                window: {inner_size: vec2(1280, 800), title: "MyApp"},
                body = {
                    // Main content here
                }
            }
        }
    }
}

app_main!(App);

#[derive(Live)]
pub struct App {
    #[live] ui: WidgetRef,
    #[rust] app_state: AppState,
}

impl LiveRegister for App {
    fn live_register(cx: &mut Cx) {
        // Order matters: register base widgets first
        makepad_widgets::live_design(cx);
        // Then shared/common widgets
        crate::shared::live_design(cx);
        // Then feature modules
        crate::home::live_design(cx);
    }
}

impl LiveHook for App {
    fn after_new_from_doc(&mut self, cx: &mut Cx) {
        // One-time initialization after widget tree is created
    }
}
```

### AppMain Implementation

```rust
impl AppMain for App {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        // Forward to MatchEvent trait
        self.match_event(cx, event);

        // Pass AppState through widget tree via Scope
        let scope = &mut Scope::with_data(&mut self.app_state);
        self.ui.handle_event(cx, event, scope);
    }
}
```

## Tokio Runtime Integration

### Static Runtime Initialization

```rust
use std::sync::Mutex;
use tokio::sync::mpsc::{UnboundedReceiver, UnboundedSender};

static TOKIO_RUNTIME: Mutex<Option<tokio::runtime::Runtime>> = Mutex::new(None);
static REQUEST_SENDER: Mutex<Option<UnboundedSender<AppRequest>>> = Mutex::new(None);

pub fn start_async_runtime() -> Result<tokio::runtime::Handle> {
    let (request_sender, request_receiver) = tokio::sync::mpsc::unbounded_channel();

    let rt_handle = TOKIO_RUNTIME.lock().unwrap()
        .get_or_insert_with(|| {
            tokio::runtime::Runtime::new()
                .expect("Failed to create Tokio runtime")
        })
        .handle()
        .clone();

    // Store sender for UI thread to use
    *REQUEST_SENDER.lock().unwrap() = Some(request_sender);

    // Spawn the main worker task
    rt_handle.spawn(worker_task(request_receiver));

    Ok(rt_handle)
}
```

### Request Submission Pattern

```rust
pub enum AppRequest {
    FetchData { id: String },
    SendMessage { content: String },
    // ... other request types
}

/// Submit a request from UI thread to async runtime
pub fn submit_async_request(req: AppRequest) {
    if let Some(sender) = REQUEST_SENDER.lock().unwrap().as_ref() {
        sender.send(req)
            .expect("BUG: worker task receiver has died!");
    }
}
```

### Worker Task Pattern

```rust
async fn worker_task(mut request_receiver: UnboundedReceiver<AppRequest>) -> Result<()> {
    while let Some(request) = request_receiver.recv().await {
        match request {
            AppRequest::FetchData { id } => {
                // Spawn a new task for each request
                let _task = tokio::spawn(async move {
                    let result = fetch_data(&id).await;
                    // Post result back to UI thread
                    Cx::post_action(DataFetchedAction { id, result });
                });
            }
            AppRequest::SendMessage { content } => {
                let _task = tokio::spawn(async move {
                    match send_message(&content).await {
                        Ok(()) => Cx::post_action(MessageSentAction::Success),
                        Err(e) => Cx::post_action(MessageSentAction::Failed(e)),
                    }
                });
            }
        }
    }
    Ok(())
}
```

## Lock-Free Update Queue Pattern

For high-frequency updates from background tasks:

```rust
use crossbeam_queue::SegQueue;
use makepad_widgets::SignalToUI;

pub enum DataUpdate {
    NewItem { item: Item },
    ItemChanged { id: String, changes: Changes },
    Status { message: String },
}

static PENDING_UPDATES: SegQueue<DataUpdate> = SegQueue::new();

/// Called from background async tasks
pub fn enqueue_update(update: DataUpdate) {
    PENDING_UPDATES.push(update);
    SignalToUI::set_ui_signal();  // Wake UI thread
}

// In widget's handle_event:
impl Widget for MyWidget {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        // Poll for updates on Signal events
        if let Event::Signal = event {
            while let Some(update) = PENDING_UPDATES.pop() {
                match update {
                    DataUpdate::NewItem { item } => {
                        self.items.push(item);
                        self.redraw(cx);
                    }
                    // ... handle other updates
                }
            }
        }
    }
}
```

## Startup Sequence

```rust
impl MatchEvent for App {
    fn handle_startup(&mut self, cx: &mut Cx) {
        // 1. Initialize logging
        let _ = tracing_subscriber::fmt::try_init();

        // 2. Initialize app data directory
        let _app_data_dir = crate::app_data_dir();

        // 3. Load persisted state
        if let Err(e) = persistence::load_window_state(
            self.ui.window(ids!(main_window)), cx
        ) {
            error!("Failed to load window state: {}", e);
        }

        // 4. Update UI based on loaded state
        self.update_ui_visibility(cx);

        // 5. Start async runtime
        let _rt_handle = crate::start_async_runtime().unwrap();
    }
}
```

## Shutdown Sequence

```rust
impl AppMain for App {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        if let Event::Shutdown = event {
            // Save window geometry
            let window_ref = self.ui.window(ids!(main_window));
            if let Err(e) = persistence::save_window_state(window_ref, cx) {
                error!("Failed to save window state: {e}");
            }

            // Save app state
            if let Some(user_id) = current_user_id() {
                if let Err(e) = persistence::save_app_state(
                    self.app_state.clone(), user_id
                ) {
                    error!("Failed to save app state: {e}");
                }
            }
        }
        // ... rest of event handling
    }
}
```

## Best Practices

1. **Separation of Concerns**: Keep UI logic on the main thread, async operations in Tokio runtime
2. **Request/Response Pattern**: Use typed enums for requests and actions
3. **Lock-Free Updates**: Use `crossbeam::SegQueue` for high-frequency background updates
4. **SignalToUI**: Always call `SignalToUI::set_ui_signal()` after enqueueing updates
5. **Cx::post_action()**: Use for async task results that need action handling
6. **Scope::with_data()**: Pass shared state through widget tree
7. **Module Registration Order**: Register base widgets before dependent modules in `live_register()`

## Reference Files

- `references/tokio-integration.md` - Detailed Tokio runtime patterns (Robrix)
- `references/channel-patterns.md` - Channel communication patterns (Robrix)
- `references/moly-async-patterns.md` - Cross-platform async patterns (Moly)
  - `PlatformSend` trait for native/WASM compatibility
  - `UiRunner` for async defer operations
  - `AbortOnDropHandle` for task cancellation
  - `ThreadToken` for non-Send types on WASM
  - `spawn()` platform-agnostic function

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
