---
name: azure-storage-blob-rust
description: Azure Blob Storage SDK for Rust. Use for uploading, downloading, and managing blobs and containers.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Blob Storage SDK for Rust

Client library for Azure Blob Storage — Microsoft's object storage solution for the cloud.

## Installation

```sh
cargo add azure_storage_blob azure_identity
```

## Environment Variables

```bash
AZURE_STORAGE_ACCOUNT_NAME=<storage-account-name>
# Endpoint: https://<account>.blob.core.windows.net/
```

## Authentication

```rust
use azure_identity::DeveloperToolsCredential;
use azure_storage_blob::{BlobClient, BlobClientOptions};

let credential = DeveloperToolsCredential::new(None)?;
let blob_client = BlobClient::new(
    "https://<account>.blob.core.windows.net/",
    "container-name",
    "blob-name",
    Some(credential),
    Some(BlobClientOptions::default()),
)?;
```

## Client Types

| Client | Purpose |
|--------|---------|
| `BlobServiceClient` | Account-level operations, list containers |
| `BlobContainerClient` | Container operations, list blobs |
| `BlobClient` | Individual blob operations |

## Core Operations

### Upload Blob

```rust
use azure_core::http::RequestContent;

let data = b"hello world";
blob_client
    .upload(
        RequestContent::from(data.to_vec()),
        false,  // overwrite
        u64::try_from(data.len())?,
        None,
    )
    .await?;
```

### Download Blob

```rust
let response = blob_client.download(None).await?;
let content = response.into_body().collect_bytes().await?;
println!("Content: {:?}", content);
```

### Get Blob Properties

```rust
let properties = blob_client.get_properties(None).await?;
println!("Content-Length: {:?}", properties.content_length);
```

### Delete Blob

```rust
blob_client.delete(None).await?;
```

## Container Operations

```rust
use azure_storage_blob::BlobContainerClient;

let container_client = BlobContainerClient::new(
    "https://<account>.blob.core.windows.net/",
    "container-name",
    Some(credential),
    None,
)?;

// Create container
container_client.create(None).await?;

// List blobs
let mut pager = container_client.list_blobs(None)?;
while let Some(blob) = pager.try_next().await? {
    println!("Blob: {}", blob.name);
}
```

## Best Practices

1. **Use Entra ID auth** — `DeveloperToolsCredential` for dev, `ManagedIdentityCredential` for production
2. **Specify content length** — required for uploads
3. **Use `RequestContent::from()`** — to wrap upload data
4. **Handle async operations** — use `tokio` runtime
5. **Check RBAC permissions** — ensure "Storage Blob Data Contributor" role

## RBAC Permissions

For Entra ID auth, assign one of these roles:
- `Storage Blob Data Reader` — read-only
- `Storage Blob Data Contributor` — read/write
- `Storage Blob Data Owner` — full access including RBAC

## Reference Links

| Resource | Link |
|----------|------|
| API Reference | https://docs.rs/azure_storage_blob |
| Source Code | https://github.com/Azure/azure-sdk-for-rust/tree/main/sdk/storage/azure_storage_blob |
| crates.io | https://crates.io/crates/azure_storage_blob |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
