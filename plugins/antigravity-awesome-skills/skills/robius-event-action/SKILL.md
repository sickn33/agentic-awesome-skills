---
name: robius-event-action
description: |
  CRITICAL: Use for Robius event and action patterns. Triggers on:
  custom action, MatchEvent, post_action, cx.widget_action,
  handle_actions, DefaultNone, widget action, event handling,
  事件处理, 自定义动作
risk: unknown
source: community
---

# Robius Event and Action Patterns Skill

Best practices for event handling and action patterns in Makepad applications based on Robrix and Moly codebases.

**Source codebases:**
- **Robrix**: Matrix chat client - MessageAction, RoomsListAction, AppStateAction
- **Moly**: AI chat application - StoreAction, ChatAction, NavigationAction, Timer patterns

## When to Use
Use this skill when:
- Implementing custom actions in Makepad
- Handling events in widgets
- Centralizing action handling in App
- Widget-to-widget communication
- Keywords: makepad action, makepad event, widget action, handle_actions, cx.widget_action

## Custom Action Pattern

### Defining Domain-Specific Actions

```rust
use makepad_widgets::*;

/// Actions emitted by the Message widget
#[derive(Clone, DefaultNone, Debug)]
pub enum MessageAction {
    /// User wants to react to a message
    React { details: MessageDetails, reaction: String },
    /// User wants to reply to a message
    Reply(MessageDetails),
    /// User wants to edit a message
    Edit(MessageDetails),
    /// User wants to delete a message
    Delete(MessageDetails),
    /// User requested to open context menu
    OpenContextMenu { details: MessageDetails, abs_pos: DVec2 },
    /// Required default variant
    None,
}

/// Data associated with a message action
#[derive(Clone, Debug)]
pub struct MessageDetails {
    pub room_id: OwnedRoomId,
    pub event_id: OwnedEventId,
    pub content: String,
    pub sender_id: OwnedUserId,
}
```

### Emitting Actions from Widgets

```rust
impl Widget for Message {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        self.view.handle_event(cx, event, scope);

        let area = self.view.area();
        match event.hits(cx, area) {
            Hit::FingerDown(_fe) => {
                cx.set_key_focus(area);
            }
            Hit::FingerUp(fe) => {
                if fe.is_over && fe.is_primary_hit() && fe.was_tap() {
                    // Emit widget action
                    cx.widget_action(
                        self.widget_uid(),
                        &scope.path,
                        MessageAction::Reply(self.get_details()),
                    );
                }
            }
            Hit::FingerLongPress(lpe) => {
                cx.widget_action(
                    self.widget_uid(),
                    &scope.path,
                    MessageAction::OpenContextMenu {
                        details: self.get_details(),
                        abs_pos: lpe.abs,
                    },
                );
            }
            _ => {}
        }
    }
}
```

## Centralized Action Handling in App

### Using MatchEvent Trait

```rust
impl MatchEvent for App {
    fn handle_startup(&mut self, cx: &mut Cx) {
        // Called once on app startup
        self.initialize(cx);
    }

    fn handle_actions(&mut self, cx: &mut Cx, actions: &Actions) {
        for action in actions {
            // Pattern 1: Direct downcast for non-widget actions
            if let Some(action) = action.downcast_ref::<LoginAction>() {
                match action {
                    LoginAction::LoginSuccess => {
                        self.app_state.logged_in = true;
                        self.update_ui_visibility(cx);
                    }
                    LoginAction::LoginFailure(error) => {
                        self.show_error(cx, error);
                    }
                }
                continue;  // Action handled
            }

            // Pattern 2: Widget action cast
            if let MessageAction::OpenContextMenu { details, abs_pos } =
                action.as_widget_action().cast()
            {
                self.show_context_menu(cx, details, abs_pos);
                continue;
            }

            // Pattern 3: Match on downcast_ref for enum variants
            match action.downcast_ref() {
                Some(AppStateAction::RoomFocused(room)) => {
                    self.app_state.selected_room = Some(room.clone());
                    continue;
                }
                Some(AppStateAction::NavigateToRoom { destination }) => {
                    self.navigate_to_room(cx, destination);
                    continue;
                }
                _ => {}
            }

            // Pattern 4: Modal actions
            match action.downcast_ref() {
                Some(ModalAction::Open { kind }) => {
                    self.ui.modal(ids!(my_modal)).open(cx);
                    continue;
                }
                Some(ModalAction::Close { was_internal }) => {
                    if *was_internal {
                        self.ui.modal(ids!(my_modal)).close(cx);
                    }
                    continue;
                }
                _ => {}
            }
        }
    }
}

impl AppMain for App {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event) {
        // Forward to MatchEvent
        self.match_event(cx, event);

        // Pass events to widget tree
        let scope = &mut Scope::with_data(&mut self.app_state);
        self.ui.handle_event(cx, event, scope);
    }
}
```

## Action Types

### Widget Actions (UI Thread)

Emitted by widgets, handled in the same frame:

```rust
// Emitting
cx.widget_action(
    self.widget_uid(),
    &scope.path,
    MyAction::Something,
);

// Handling (two patterns)
// Pattern A: Direct cast for widget actions
if let MyAction::Something = action.as_widget_action().cast() {
    // handle...
}

// Pattern B: With widget UID matching
if let Some(uid) = action.as_widget_action().widget_uid() {
    if uid == my_expected_uid {
        if let MyAction::Something = action.as_widget_action().cast() {
            // handle...
        }
    }
}
```

### Posted Actions (From Async)

Posted from async tasks, received in next event cycle:

```rust
// In async task
Cx::post_action(DataFetchedAction { data });
SignalToUI::set_ui_signal();  // Wake UI thread

// Handling in App (NOT widget actions)
if let Some(action) = action.downcast_ref::<DataFetchedAction>() {
    self.process_data(&action.data);
}
```

### Global Actions

For app-wide state changes:

```rust
// Using cx.action() for global actions
cx.action(NavigationAction::GoBack);

// Handling
if let Some(NavigationAction::GoBack) = action.downcast_ref() {
    self.navigate_back(cx);
}
```

## Event Handling Patterns

### Hit Testing

```rust
impl Widget for MyWidget {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        let area = self.view.area();
        match event.hits(cx, area) {
            Hit::FingerDown(fe) => {
                cx.set_key_focus(area);
                // Start drag, capture, etc.
            }
            Hit::FingerUp(fe) => {
                if fe.is_over && fe.is_primary_hit() {
                    if fe.was_tap() {
                        // Single tap
                    }
                    if fe.was_long_press() {
                        // Long press
                    }
                }
            }
            Hit::FingerMove(fe) => {
                // Drag handling
            }
            Hit::FingerHoverIn(_) => {
                self.animator_play(cx, id!(hover.on));
            }
            Hit::FingerHoverOut(_) => {
                self.animator_play(cx, id!(hover.off));
            }
            Hit::FingerScroll(se) => {
                // Scroll handling
            }
            _ => {}
        }
    }
}
```

### Keyboard Events

```rust
fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
    if let Event::KeyDown(ke) = event {
        match ke.key_code {
            KeyCode::Return if !ke.modifiers.shift => {
                self.submit(cx);
            }
            KeyCode::Escape => {
                self.cancel(cx);
            }
            KeyCode::KeyC if ke.modifiers.control || ke.modifiers.logo => {
                self.copy_to_clipboard(cx);
            }
            _ => {}
        }
    }
}
```

### Signal Events

For handling async updates:

```rust
fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
    if let Event::Signal = event {
        // Poll update queues
        while let Some(update) = PENDING_UPDATES.pop() {
            self.apply_update(cx, update);
        }
    }
}
```

## Action Chaining Pattern

Widget emits action → Parent catches and re-emits with more context:

```rust
// In child widget
cx.widget_action(
    self.widget_uid(),
    &scope.path,
    ItemAction::Selected(item_id),
);

// In parent widget's handle_event
if let ItemAction::Selected(item_id) = action.as_widget_action().cast() {
    // Add context and forward to App
    cx.widget_action(
        self.widget_uid(),
        &scope.path,
        ListAction::ItemSelected {
            list_id: self.list_id.clone(),
            item_id,
        },
    );
}
```

## Best Practices

1. **Use `DefaultNone` derive**: All action enums must have a `None` variant
2. **Use `continue` after handling**: Prevents unnecessary processing
3. **Downcast pattern for async actions**: Posted actions are not widget actions
4. **Widget action cast for UI actions**: Use `as_widget_action().cast()`
5. **Always call `SignalToUI::set_ui_signal()`**: After posting actions from async
6. **Centralize in App::handle_actions**: Keep action handling in one place
7. **Use descriptive action names**: `MessageAction::Reply` not `MessageAction::Action1`

## Reference Files

- `references/action-patterns.md` - Additional action patterns (Robrix)
- `references/event-handling.md` - Event handling reference (Robrix)
- `references/moly-action-patterns.md` - Moly-specific patterns
  - Store-based action forwarding
  - Timer-based retry pattern
  - Radio button navigation
  - External link handling
  - Platform-conditional actions (#[cfg])
  - UiRunner event handling

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
