---
name: azure-cosmos-rust
description: Azure Cosmos DB SDK for Rust (NoSQL API). Use for document CRUD, queries, containers, and globally distributed data.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Cosmos DB SDK for Rust

Client library for Azure Cosmos DB NoSQL API — globally distributed, multi-model database.

## Installation

```sh
cargo add azure_data_cosmos azure_identity
```

## Environment Variables

```bash
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_DATABASE=mydb
COSMOS_CONTAINER=mycontainer
```

## Authentication

```rust
use azure_identity::DeveloperToolsCredential;
use azure_data_cosmos::CosmosClient;

let credential = DeveloperToolsCredential::new(None)?;
let client = CosmosClient::new(
    "https://<account>.documents.azure.com:443/",
    credential.clone(),
    None,
)?;
```

## Client Hierarchy

| Client | Purpose | Get From |
|--------|---------|----------|
| `CosmosClient` | Account-level operations | Direct instantiation |
| `DatabaseClient` | Database operations | `client.database_client()` |
| `ContainerClient` | Container/item operations | `database.container_client()` |

## Core Workflow

### Get Database and Container Clients

```rust
let database = client.database_client("myDatabase");
let container = database.container_client("myContainer");
```

### Create Item

```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct Item {
    pub id: String,
    pub partition_key: String,
    pub value: String,
}

let item = Item {
    id: "1".into(),
    partition_key: "partition1".into(),
    value: "hello".into(),
};

container.create_item("partition1", item, None).await?;
```

### Read Item

```rust
let response = container.read_item("partition1", "1", None).await?;
let item: Item = response.into_model()?;
```

### Replace Item

```rust
let mut item: Item = container.read_item("partition1", "1", None).await?.into_model()?;
item.value = "updated".into();

container.replace_item("partition1", "1", item, None).await?;
```

### Patch Item

```rust
use azure_data_cosmos::models::PatchDocument;

let patch = PatchDocument::default()
    .with_add("/newField", "newValue")?
    .with_remove("/oldField")?;

container.patch_item("partition1", "1", patch, None).await?;
```

### Delete Item

```rust
container.delete_item("partition1", "1", None).await?;
```

## Key Auth (Optional)

Enable key-based authentication with feature flag:

```sh
cargo add azure_data_cosmos --features key_auth
```

## Best Practices

1. **Always specify partition key** — required for point reads and writes
2. **Use `into_model()?`** — to deserialize responses into your types
3. **Derive `Serialize` and `Deserialize`** — for all document types
4. **Use Entra ID auth** — prefer `DeveloperToolsCredential` over key auth
5. **Reuse client instances** — clients are thread-safe and reusable

## Reference Links

| Resource | Link |
|----------|------|
| API Reference | https://docs.rs/azure_data_cosmos |
| Source Code | https://github.com/Azure/azure-sdk-for-rust/tree/main/sdk/cosmos/azure_data_cosmos |
| crates.io | https://crates.io/crates/azure_data_cosmos |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
