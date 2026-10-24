---
name: azure-storage-blob-rust
description: Azure Blob Storage SDK for Rust. Use for uploading, downloading, and managing blobs and containers.
risk: critical
source: community
date_added: '2026-02-27'
---

# Azure Blob Storage SDK for Rust

Client library for Azure Blob Storage — Microsoft's object storage solution for the cloud.

The examples below require a reviewed compatible crate set and replacement of every resource placeholder. Do not use production data for demonstration writes.

## Installation

```sh
cargo add azure_storage_blob@=1.1.0 azure_identity@=1.0.0 azure_core@=1.1.0
```

## Environment Variables

```bash
export AZURE_STORAGE_ACCOUNT_NAME="<storage-account-name>"
# Endpoint: https://<account>.blob.core.windows.net/
```

## Authentication

```rust
use azure_identity::DeveloperToolsCredential;
use azure_core::http::Url;
use azure_storage_blob::clients::{BlobClient, BlobClientOptions};

let credential = DeveloperToolsCredential::new(None)?;
let blob_client = BlobClient::new(
    Url::parse("https://<account>.blob.core.windows.net/container-name/blob-name")?,
    Some(credential.clone()),
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
use azure_storage_blob::models::BlobClientUploadOptions;

let data = b"hello world";
blob_client
    .upload(
        RequestContent::from(data.to_vec()),
        Some(BlobClientUploadOptions::if_not_exists()), // fail rather than overwrite an existing blob
    )
    .await?;
```

### Download Blob

```rust
let response = blob_client.download(None).await?;
// Check the approved size before fetching; use download_into with a bounded buffer for large data.
let content = response.body.collect().await?;
// Process authorized bytes; do not log the payload.
```

### Get Blob Properties

```rust
let properties = blob_client.get_properties(None).await?;
// Read the version-specific response header trait; properties is a response, not a content_length field.
// Do not infer a body/size limit from successful metadata access alone.
```

### Delete Blob

```rust
blob_client.delete(None).await?;
```

## Container Operations

```rust
use azure_storage_blob::clients::BlobContainerClient;
use futures::TryStreamExt;

let container_client = BlobContainerClient::new(
    Url::parse("https://<account>.blob.core.windows.net/container-name")?,
    Some(credential),
    None,
)?;

// Create container
container_client.create(None).await?;

// List blobs
let mut pager = container_client.list_blobs(None)?;
while let Some(page) = pager.try_next().await? {
    let listing = page.into_model()?;
    // Process this listing page; apply an explicit maximum-page budget.
}
```

## Best Practices

1. **Use Entra ID auth** — `DeveloperToolsCredential` for dev, `ManagedIdentityCredential` for production
2. **Review overwrite behavior** — the reviewed upload API uses options; if_not_exists prevents unintended replacement
3. **Use `RequestContent::from()`** — to wrap upload data
4. **Handle async operations** — use `tokio` runtime
5. **Check RBAC permissions** — ensure "Storage Blob Data Contributor" role

## RBAC Permissions

For Entra ID auth, assign one of these roles:
- `Storage Blob Data Reader` — read-only
- `Storage Blob Data Contributor` — read/write
- `Storage Blob Data Owner` — blob-data access and supported ownership/ACL management; it does not grant general Azure RBAC role-assignment authority

The example API follows [BlobClient 1.1.0](https://docs.rs/azure_storage_blob/1.1.0/azure_storage_blob/clients/struct.BlobClient.html); earlier releases used different constructor/upload signatures. Use the project’s compatible Azure crate versions rather than mixing them.

The reviewed example set uses `azure_storage_blob 1.1.0` and compatible Azure core/credential crates. Record and commit Cargo.lock; source/API review is not a compiler or live-service test.

## Reference Links

| Resource | Link |
|----------|------|
| API Reference | https://docs.rs/azure_storage_blob |
| Source Code | https://github.com/Azure/azure-sdk-for-rust/tree/main/sdk/storage/azure_storage_blob |
| crates.io | https://crates.io/crates/azure_storage_blob |

## When to Use
Use when a Rust application uploads/downloads a specified Azure blob, reads its properties or manages an authorized container.

## Limitations
- Examples are fragments inside async application code, with compatible pinned Azure crates and the required Tokio/Serde/Futures dependencies; verify the selected version’s API before use. They were reviewed against official source/reference, not compiled or run against a cloud account here.
- Use an authorized tenant, resource and identity with least privilege. Writes, overwrites, deletes, backup retrieval and account changes require the corresponding scope; cleanup may remove only explicitly identified disposable resources. Bound requests, retries and downloaded bytes, and do not log payloads, credentials or secret values.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
