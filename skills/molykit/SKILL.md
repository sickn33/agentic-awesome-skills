---
name: molykit
description: |
  CRITICAL: Use for MolyKit AI chat toolkit. Triggers on:
  BotClient, OpenAI, SSE streaming, AI chat, molykit,
  PlatformSend, spawn(), ThreadToken, cross-platform async,
  Chat widget, Messages, PromptInput, Avatar, LLM
risk: unknown
source: community
---

# MolyKit Skill

Best practices for building AI chat interfaces with Makepad using MolyKit - a toolkit for cross-platform AI chat applications.

**Source codebase**: `/Users/zhangalex/Work/Projects/FW/robius/moly/moly-kit`

## When to Use
Use this skill when:
- Building AI chat interfaces with Makepad
- Integrating OpenAI or other LLM APIs
- Implementing cross-platform async for native and WASM
- Creating chat widgets (messages, prompts, avatars)
- Handling SSE streaming responses
- Keywords: molykit, moly-kit, ai chat, bot client, openai makepad, chat widget, sse streaming

## Overview

MolyKit provides:
- Cross-platform async utilities (PlatformSend, spawn(), ThreadToken)
- Ready-to-use chat widgets (Chat, Messages, PromptInput, Avatar)
- BotClient trait for AI provider integration
- OpenAI-compatible client with SSE streaming
- Protocol types for messages, bots, and tool calls
- MCP (Model Context Protocol) support

## Cross-Platform Async Patterns

### PlatformSend - Send Only on Native

```rust
/// Implies Send only on native platforms, not on WASM
/// - On native: implemented by types that implement Send
/// - On WASM: implemented by ALL types
pub trait PlatformSend: PlatformSendInner {}

/// Boxed future type for cross-platform use
pub type BoxPlatformSendFuture<'a, T> = Pin<Box<dyn PlatformSendFuture<Output = T> + 'a>>;

/// Boxed stream type for cross-platform use
pub type BoxPlatformSendStream<'a, T> = Pin<Box<dyn PlatformSendStream<Item = T> + 'a>>;
```

### Platform-Agnostic Spawning

```rust
/// Runs a future independently
/// - Uses tokio on native (requires Send)
/// - Uses wasm-bindgen-futures on WASM (no Send required)
pub fn spawn(fut: impl PlatformSendFuture<Output = ()> + 'static);

// Usage
spawn(async move {
    let result = fetch_data().await;
    Cx::post_action(DataReady(result));
    SignalToUI::set_ui_signal();
});
```

### Task Cancellation with AbortOnDropHandle

```rust
/// Handle that aborts its future when dropped
pub struct AbortOnDropHandle(AbortHandle);

// Usage - task cancelled when widget dropped
#[rust]
task_handle: Option<AbortOnDropHandle>,

fn start_task(&mut self) {
    let (future, handle) = abort_on_drop(async move {
        // async work...
    });
    self.task_handle = Some(handle);
    spawn(async move { let _ = future.await; });
}
```

### ThreadToken for Non-Send Types on WASM

```rust
/// Store non-Send value in thread-local, access via token
pub struct ThreadToken<T: 'static>;

impl<T> ThreadToken<T> {
    pub fn new(value: T) -> Self;
    pub fn peek<R>(&self, f: impl FnOnce(&T) -> R) -> R;
    pub fn peek_mut<R>(&self, f: impl FnOnce(&mut T) -> R) -> R;
}

// Usage - wrap non-Send type for use across Send boundaries
let token = ThreadToken::new(non_send_value);
spawn(async move {
    token.peek(|value| {
        // use value...
    });
});
```

## BotClient Trait

### Implementing AI Provider Integration

```rust
pub trait BotClient: Send {
    /// Send message with streamed response
    fn send(
        &mut self,
        bot_id: &BotId,
        messages: &[Message],
        tools: &[Tool],
    ) -> BoxPlatformSendStream<'static, ClientResult<MessageContent>>;

    /// Get available bots/models
    fn bots(&self) -> BoxPlatformSendFuture<'static, ClientResult<Vec<Bot>>>;

    /// Clone for passing around
    fn clone_box(&self) -> Box<dyn BotClient>;
}

// Usage
let client = OpenAIClient::new("https://api.openai.com/v1".into());
client.set_key("sk-...")?;
let context = BotContext::from(client);
```

### BotContext - Sharable Wrapper

```rust
/// Sharable wrapper with loaded bots for sync UI access
pub struct BotContext(Arc<Mutex<InnerBotContext>>);

impl BotContext {
    pub fn load(&mut self) -> BoxPlatformSendFuture<ClientResult<()>>;
    pub fn bots(&self) -> Vec<Bot>;
    pub fn get_bot(&self, id: &BotId) -> Option<Bot>;
    pub fn client(&self) -> Box<dyn BotClient>;
}

// Usage
let mut context = BotContext::from(client);
spawn(async move {
    if let Err(errors) = context.load().await.into_result() {
        // handle errors
    }
    Cx::post_action(BotsLoaded);
});
```

## Protocol Types

### Message Structure

```rust
pub struct Message {
    pub from: EntityId,         // User, System, Bot(BotId), App
    pub metadata: MessageMetadata,
    pub content: MessageContent,
}

pub struct MessageContent {
    pub text: String,           // Main content (markdown)
    pub reasoning: String,      // AI reasoning/thinking
    pub citations: Vec<String>, // Source URLs
    pub attachments: Vec<Attachment>,
    pub tool_calls: Vec<ToolCall>,
    pub tool_results: Vec<ToolResult>,
}

pub struct MessageMetadata {
    pub is_writing: bool,       // Still being streamed
    pub created_at: DateTime<Utc>,
}
```

### Bot Identification

```rust
/// Globally unique bot ID: <len>;<id>@<provider>
pub struct BotId(Arc<str>);

impl BotId {
    pub fn new(id: &str, provider: &str) -> Self;
    pub fn id(&self) -> &str;       // provider-local id
    pub fn provider(&self) -> &str; // provider domain
}

// Example: BotId::new("gpt-4", "api.openai.com")
// -> "5;gpt-4@api.openai.com"
```

## Widget Patterns

### Slot Widget - Runtime Content Replacement

```rust
live_design! {
    pub Slot = {{Slot}} {
        width: Fill, height: Fit,
        slot = <View> {}  // default content
    }
}

// Usage - replace content at runtime
let mut slot = widget.slot(id!(content));
if let Some(custom) = client.content_widget(cx, ...) {
    slot.replace(custom);
} else {
    slot.restore();  // back to default
    slot.default().as_standard_message_content().set_content(cx, &content);
}
```

### Avatar Widget - Text/Image Toggle

```rust
live_design! {
    pub Avatar = {{Avatar}} <View> {
        grapheme = <RoundedView> {
            visible: false,
            label = <Label> { text: "P" }
        }
        dependency = <RoundedView> {
            visible: false,
            image = <Image> {}
        }
    }
}

impl Widget for Avatar {
    fn draw_walk(&mut self, cx: &mut Cx2d, ...) -> DrawStep {
        if let Some(avatar) = &self.avatar {
            match avatar {
                Picture::Grapheme(g) => {
                    self.view(id!(grapheme)).set_visible(cx, true);
                    self.view(id!(dependency)).set_visible(cx, false);
                    self.label(id!(label)).set_text(cx, &g);
                }
                Picture::Dependency(d) => {
                    self.view(id!(dependency)).set_visible(cx, true);
                    self.view(id!(grapheme)).set_visible(cx, false);
                    self.image(id!(image)).load_image_dep_by_path(cx, d.as_str());
                }
            }
        }
        self.deref.draw_walk(cx, scope, walk)
    }
}
```

### PromptInput Widget

```rust
#[derive(Live, Widget)]
pub struct PromptInput {
    #[deref] deref: CommandTextInput,
    #[live] pub send_icon: LiveValue,
    #[live] pub stop_icon: LiveValue,
    #[rust] pub task: Task,           // Send or Stop
    #[rust] pub interactivity: Interactivity,
}

impl PromptInput {
    pub fn submitted(&self, actions: &Actions) -> bool;
    pub fn reset(&mut self, cx: &mut Cx);
    pub fn set_send(&mut self);
    pub fn set_stop(&mut self);
    pub fn enable(&mut self);
    pub fn disable(&mut self);
}
```

### Messages Widget - Conversation View

```rust
#[derive(Live, Widget)]
pub struct Messages {
    #[deref] deref: View,
    #[rust] pub messages: Vec<Message>,
    #[rust] pub bot_context: Option<BotContext>,
}

impl Messages {
    pub fn set_messages(&mut self, messages: Vec<Message>, scroll_to_bottom: bool);
    pub fn scroll_to_bottom(&mut self, cx: &mut Cx, triggered_by_stream: bool);
    pub fn is_at_bottom(&self) -> bool;
}
```

## UiRunner Pattern for Async-to-UI

```rust
impl Widget for PromptInput {
    fn handle_event(&mut self, cx: &mut Cx, event: &Event, scope: &mut Scope) {
        self.deref.handle_event(cx, event, scope);
        self.ui_runner().handle(cx, event, scope, self);

        if self.button(id!(attach)).clicked(event.actions()) {
            let ui = self.ui_runner();
            Attachment::pick_multiple(move |result| match result {
                Ok(attachments) => {
                    ui.defer_with_redraw(move |me, cx, _| {
                        me.attachment_list_ref().write().attachments.extend(attachments);
                    });
                }
                Err(_) => {}
            });
        }
    }
}
```

## SSE Streaming

```rust
/// Parse SSE byte stream into message stream
pub fn parse_sse<S, B, E>(s: S) -> impl Stream<Item = Result<String, E>>
where
    S: Stream<Item = Result<B, E>>,
    B: AsRef<[u8]>,
{
    // Split on "\n\n", extract "data:" content
    // Filter comments and [DONE] messages
}

// Usage in BotClient::send
fn send(&mut self, ...) -> BoxPlatformSendStream<...> {
    let stream = stream! {
        let response = client.post(url).send().await?;
        let events = parse_sse(response.bytes_stream());

        for await event in events {
            let completion: Completion = serde_json::from_str(&event)?;
            content.text.push_str(&completion.delta.content);
            yield ClientResult::new_ok(content.clone());
        }
    };
    Box::pin(stream)
}
```

## Best Practices

1. **Use PlatformSend for cross-platform**: Same code works on native and WASM
2. **Use spawn() not tokio::spawn**: Platform-agnostic task spawning
3. **Use AbortOnDropHandle**: Cancel tasks when widget drops
4. **Use ThreadToken for non-Send on WASM**: Thread-local storage with token access
5. **Use Slot for custom content**: Allow BotClient to provide custom widgets
6. **Use read()/write() pattern**: Safe borrow access via WidgetRef
7. **Use UiRunner::defer_with_redraw**: Update widget from async context
8. **Handle ClientResult partial success**: May have value AND errors

## Reference Files

- `llms.txt` - Complete MolyKit API reference

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
