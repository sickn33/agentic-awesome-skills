---
name: azure-storage-queue-rust
description: 'Azure Queue Storage library for Rust. Send, receive, and manage queue messages. Triggers: "queue storage rust", "QueueClient rust", "send message rust", "receive messages rust", "QueueServiceClient rust", "queue rust".'
risk: unknown
source: https://github.com/microsoft/skills/tree/main/.github/plugins/azure-sdk-rust/skills/azure-storage-queue-rust
source_repo: microsoft/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/microsoft/skills/blob/main/LICENSE
---

# Azure Queue Storage library for Rust
## When to Use

Use this skill when you need azure Queue Storage library for Rust. Send, receive, and manage queue messages. Triggers: "queue storage rust", "QueueClient rust", "send message rust", "receive messages rust", "QueueServiceClient rust", "queue rust".


Client library for Azure Queue Storage — send, receive, and manage queue messages.

Use this skill when:

- An app needs to send or receive messages from Azure Queue Storage in Rust
- You need to create or manage queues
- You need to peek, receive, or delete queue messages
- You need RBAC-based auth for queue operations

> **IMPORTANT:** Only use the official `azure_storage_queue` crate published by the [azure-sdk](https://crates.io/users/azure-sdk) crates.io user. Do NOT use unofficial or community crates. Official crates use underscores in names and none have version 0.21.0.

## Installation

```sh
cargo add azure_storage_queue azure_identity azure_core tokio
```

> If your code uses `azure_core` types directly, add `azure_core` to `Cargo.toml`. If you only use `azure_storage_queue` re-exports, direct `azure_core` dependency is optional.

## Environment Variables

```bash
AZURE_STORAGE_QUEUE_ENDPOINT=https://<account>.queue.core.windows.net/ # Required for all operations
```

## Authentication

```rust
use azure_core::http::Url;
use azure_identity::DeveloperToolsCredential;
use azure_storage_queue::QueueServiceClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Local dev: DeveloperToolsCredential. Production: use ManagedIdentityCredential.
    let credential = DeveloperToolsCredential::new(None)?;
    let service_url = Url::parse("https://<storage_account_name>.queue.core.windows.net/")?;
    let service_client = QueueServiceClient::new(service_url, Some(credential), None)?;

    // Derive a queue client by name.
    let queue_client = service_client.queue_client("<queue_name>")?;
    Ok(())
}
```

## Client Types

| Client               | Purpose                               | Access                                   |
| -------------------- | ------------------------------------- | ---------------------------------------- |
| `QueueServiceClient` | Account-level operations, list queues | `QueueServiceClient::new()`              |
| `QueueClient`        | Queue operations, send/receive/delete | `service_client.queue_client("<name>")?` |

## Core Workflow

### Send a Message

```rust
use azure_core::http::Url;
use azure_identity::DeveloperToolsCredential;
use azure_storage_queue::{models::QueueMessage, QueueServiceClient};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let credential = DeveloperToolsCredential::new(None)?;
    let service_url = Url::parse("https://<storage_account_name>.queue.core.windows.net/")?;
    let service_client = QueueServiceClient::new(service_url, Some(credential), None)?;
    let queue_client = service_client.queue_client("<queue_name>")?;

    let message = QueueMessage {
        message_text: Some("hello world".to_string()),
    };
    queue_client.send_message(message.try_into()?, None).await?;
    Ok(())
}
```

### Receive Messages

```rust
use azure_core::http::Url;
use azure_identity::DeveloperToolsCredential;
use azure_storage_queue::QueueServiceClient;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let credential = DeveloperToolsCredential::new(None)?;
    let service_url = Url::parse("https://<storage_account_name>.queue.core.windows.net/")?;
    let service_client = QueueServiceClient::new(service_url, Some(credential), None)?;
    let queue_client = service_client.queue_client("<queue_name>")?;

    let response = queue_client.receive_messages(None).await?;
    let messages = response.into_model()?;
    for msg in messages.items.unwrap_or_default() {
        println!("{}", msg.message_text.as_deref().unwrap_or("<empty>"));
    }
    Ok(())
}
```

### Delete a Message

After receiving a message, delete it using the message ID and pop receipt:

```rust
let response = queue_client.receive_messages(None).await?;
let messages = response.into_model()?;
for msg in messages.items.unwrap_or_default() {
    if let (Some(id), Some(pop_receipt)) = (&msg.message_id, &msg.pop_receipt) {
        queue_client.delete_message(id, pop_receipt, None).await?;
    }
}
```

### Peek Messages

Peek at messages without removing them from the queue:

```rust
let response = queue_client.peek_messages(None).await?;
let messages = response.into_model()?;
for msg in messages.items.unwrap_or_default() {
    println!("Peeked: {}", msg.message_text.as_deref().unwrap_or("<empty>"));
}
```

## RBAC Roles

For Entra ID auth, assign one of these roles to the identity:

| Role                                   | Access                 |
| -------------------------------------- | ---------------------- |
| `Storage Queue Data Reader`            | Read and peek messages |
| `Storage Queue Data Contributor`       | Read/write messages    |
| `Storage Queue Data Message Sender`    | Send messages only     |
| `Storage Queue Data Message Processor` | Receive and delete     |

## Best Practices

1. **Use `cargo add` to manage dependencies, never edit `Cargo.toml` directly.** Add and remove Rust SDK dependencies with cargo commands instead of manual manifest edits.
2. **Add `azure_core` only when importing `azure_core` types directly.** If your code imports `azure_core::http::Url`, `azure_core::http::RequestContent`, or `azure_core::error::ErrorKind`, include `azure_core`; otherwise a direct dependency is optional.
3. **Use `DeveloperToolsCredential`** for local dev, **`ManagedIdentityCredential`** for production — Rust does not provide a single `DefaultAzureCredential` type
4. **Never hardcode credentials** — use environment variables or managed identity
5. **Assign RBAC roles** — ensure appropriate queue data roles for the identity
6. **Use `QueueServiceClient` as the entry point** and derive `QueueClient` from it via `queue_client()`
7. **Delete messages after processing** — use the message ID and pop receipt from `receive_messages`
8. **Reuse clients** — clients are thread-safe; create once, share across tasks

## Reference Links

| Resource      | Link                                                                                  |
| ------------- | ------------------------------------------------------------------------------------- |
| API Reference | https://docs.rs/crate/azure_storage_queue/latest                                      |
| crates.io     | https://crates.io/crates/azure_storage_queue                                          |
| Source Code   | https://github.com/Azure/azure-sdk-for-rust/tree/main/sdk/storage/azure_storage_queue |

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
