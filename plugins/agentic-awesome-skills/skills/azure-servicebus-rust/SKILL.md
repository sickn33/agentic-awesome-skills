---
name: azure-servicebus-rust
description: 'Azure Service Bus library for Rust. Send and receive messages using queues, topics, and subscriptions. Triggers: "service bus rust", "ServiceBusClient rust", "send message servicebus rust", "receive message servicebus rust", "queue rust messaging", "topic subscription rust".'
risk: unknown
source: https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-rust/skills/azure-servicebus-rust
source_repo: microsoft/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/microsoft/skills/blob/main/LICENSE
---

# Azure Service Bus library for Rust
## When to Use

Use this skill when you need azure Service Bus library for Rust. Send and receive messages using queues, topics, and subscriptions. Triggers: "service bus rust", "ServiceBusClient rust", "send message servicebus rust", "receive message servicebus rust", "queue rust messaging", "topic subscription rust".


Client library for Azure Service Bus — enterprise message broker with queues and publish-subscribe topics.

> **⚠️ WARNING:** This crate is in early development and **SHOULD NOT** be used in production. APIs may change without notice.

Use this skill when:

- An app needs to send or receive messages via Azure Service Bus from Rust
- You need queue-based messaging with competing consumers
- You need publish-subscribe messaging with topics and subscriptions
- You need reliable message delivery with completion semantics

> **IMPORTANT:** Only use the official `azure_messaging_servicebus` crate published by the [azure-sdk](https://crates.io/users/azure-sdk) crates.io user. Do NOT use unofficial or community crates. Official crates use underscores in names and none have version 0.21.0.

## Installation

```sh
cargo add azure_messaging_servicebus azure_identity tokio
```

> If your code uses `azure_core` types directly, add `azure_core` to `Cargo.toml`. If you only use `azure_messaging_servicebus` re-exports, direct `azure_core` dependency is optional.

## Environment Variables

```bash
SERVICEBUS_NAMESPACE=<namespace>.servicebus.windows.net # Required — fully qualified namespace
```

## Key Concepts

| Concept          | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| **Namespace**    | Container for all messaging components                          |
| **Queue**        | Point-to-point messaging with competing consumers               |
| **Topic**        | Publish-subscribe messaging — one sender, many subscribers      |
| **Subscription** | Receives messages from a topic                                  |
| **Message**      | Package of data and metadata, with completion/abandon semantics |

## Authentication

```rust
use azure_identity::DeveloperToolsCredential;
use azure_messaging_servicebus::ServiceBusClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Local dev: DeveloperToolsCredential. Production: use ManagedIdentityCredential.
    let credential = DeveloperToolsCredential::new(None)?;
    let client = ServiceBusClient::builder()
        .open("your_namespace.servicebus.windows.net", credential.clone())
        .await?;
    Ok(())
}
```

## Core Workflow

### Send a Message to a Queue

```rust
use azure_identity::DeveloperToolsCredential;
use azure_messaging_servicebus::{ServiceBusClient, Message};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let credential = DeveloperToolsCredential::new(None)?;
    let client = ServiceBusClient::builder()
        .open("your_namespace.servicebus.windows.net", credential.clone())
        .await?;
    let sender = client.create_sender("my_queue", None).await?;

    let message = Message::from("Hello, Service Bus!");
    sender.send_message(message, None).await?;
    Ok(())
}
```

### Receive Messages from a Queue

```rust
use azure_identity::DeveloperToolsCredential;
use azure_messaging_servicebus::ServiceBusClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let credential = DeveloperToolsCredential::new(None)?;
    let client = ServiceBusClient::builder()
        .open("your_namespace.servicebus.windows.net", credential.clone())
        .await?;
    let receiver = client.create_receiver("my_queue", None).await?;

    let messages = receiver.receive_messages(5, None).await?;
    for message in messages {
        println!("Received: {}", message.body_as_string()?);
        receiver.complete_message(&message, None).await?;
    }
    Ok(())
}
```

### Send a Message to a Topic

```rust
let sender = client.create_sender("my_topic", None).await?;
let message = Message::from("Hello, Topic subscribers!");
sender.send_message(message, None).await?;
```

### Receive Messages from a Subscription

```rust
let receiver = client
    .create_receiver_for_subscription("my_topic", "my_subscription", None)
    .await?;

let messages = receiver.receive_messages(5, None).await?;
for message in messages {
    println!("Received: {}", message.body_as_string()?);
    receiver.complete_message(&message, None).await?;
}
```

## Message Settlement

| Action     | Purpose                                            |
| ---------- | -------------------------------------------------- |
| `complete` | Remove message from queue — processing succeeded   |
| `abandon`  | Release lock — message becomes available for retry |

Always complete messages after successful processing to prevent redelivery.

## RBAC Roles

For Entra ID auth, assign one of these roles:

| Role                              | Access           |
| --------------------------------- | ---------------- |
| `Azure Service Bus Data Sender`   | Send messages    |
| `Azure Service Bus Data Receiver` | Receive messages |
| `Azure Service Bus Data Owner`    | Full access      |

## Best Practices

1. **Use `cargo add` to manage dependencies, never edit `Cargo.toml` directly.** Add and remove Rust SDK dependencies with cargo commands instead of manual manifest edits.
2. **Add `azure_core` only when importing `azure_core` types directly.** If your code imports `azure_core::http::Url`, `azure_core::http::RequestContent`, or `azure_core::error::ErrorKind`, include `azure_core`; otherwise a direct dependency is optional.
3. **Use `DeveloperToolsCredential`** for local dev, **`ManagedIdentityCredential`** for production — Rust does not provide a single `DefaultAzureCredential` type
4. **Never hardcode credentials** — use environment variables or managed identity
5. **Assign RBAC roles** — ensure the identity has appropriate Service Bus data roles
6. **Always complete messages** — call `complete_message` after processing to remove from queue
7. **Use topics for fan-out** — when multiple consumers need the same messages, use topics with subscriptions
8. **This crate is pre-production** — APIs may change; pin your dependency version with cargo commands in your dependency workflow

## Reference Links

| Resource      | Link                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------- |
| API Reference | https://docs.rs/azure_messaging_servicebus/latest/azure_messaging_servicebus                    |
| crates.io     | https://crates.io/crates/azure_messaging_servicebus                                             |
| Source Code   | https://github.com/Azure/azure-sdk-for-rust/tree/main/sdk/servicebus/azure_messaging_servicebus |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
