---
name: azure-storage-blob-ts
description: Azure Blob Storage JavaScript/TypeScript SDK (@azure/storage-blob) for blob operations. Use for uploading, downloading, listing, and managing blobs and containers.
risk: unknown
source: community
date_added: '2026-02-27'
---

# @azure/storage-blob (TypeScript/JavaScript)

SDK for Azure Blob Storage operations — upload, download, list, and manage blobs and containers.

## Installation

```bash
npm install @azure/storage-blob @azure/identity
```

**Current Version**: 12.x  
**Node.js**: >= 18.0.0

## Environment Variables

```bash
AZURE_STORAGE_ACCOUNT_NAME=<account-name>
AZURE_STORAGE_ACCOUNT_KEY=<account-key>
# OR connection string
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
```

## Authentication

### DefaultAzureCredential (Recommended)

```typescript
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const client = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  new DefaultAzureCredential()
);
```

### Connection String

```typescript
import { BlobServiceClient } from "@azure/storage-blob";

const client = BlobServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);
```

### StorageSharedKeyCredential (Node.js only)

```typescript
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const client = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net`,
  sharedKeyCredential
);
```

### SAS Token

```typescript
import { BlobServiceClient } from "@azure/storage-blob";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN!; // starts with "?"

const client = new BlobServiceClient(
  `https://${accountName}.blob.core.windows.net${sasToken}`
);
```

## Client Hierarchy

```
BlobServiceClient (account level)
└── ContainerClient (container level)
    └── BlobClient (blob level)
        ├── BlockBlobClient (block blobs - most common)
        ├── AppendBlobClient (append-only blobs)
        └── PageBlobClient (page blobs - VHDs)
```

## Container Operations

### Create Container

```typescript
const containerClient = client.getContainerClient("my-container");
await containerClient.create();

// Or create if not exists
await containerClient.createIfNotExists();
```

### List Containers

```typescript
for await (const container of client.listContainers()) {
  console.log(container.name);
}

// With prefix filter
for await (const container of client.listContainers({ prefix: "logs-" })) {
  console.log(container.name);
}
```

### Delete Container

```typescript
await containerClient.delete();
// Or delete if exists
await containerClient.deleteIfExists();
```

## Blob Operations

### Upload Blob (Simple)

```typescript
const containerClient = client.getContainerClient("my-container");
const blockBlobClient = containerClient.getBlockBlobClient("my-file.txt");

// Upload string
await blockBlobClient.upload("Hello, World!", 13);

// Upload Buffer
const buffer = Buffer.from("Hello, World!");
await blockBlobClient.upload(buffer, buffer.length);
```

### Upload from File (Node.js only)

```typescript
const blockBlobClient = containerClient.getBlockBlobClient("uploaded-file.txt");
await blockBlobClient.uploadFile("/path/to/local/file.txt");
```

### Upload from Stream (Node.js only)

```typescript
import * as fs from "fs";

const blockBlobClient = containerClient.getBlockBlobClient("streamed-file.txt");
const readStream = fs.createReadStream("/path/to/local/file.txt");

await blockBlobClient.uploadStream(readStream, 4 * 1024 * 1024, 5, {
  // bufferSize: 4MB, maxConcurrency: 5
  onProgress: (progress) => console.log(`Uploaded ${progress.loadedBytes} bytes`),
});
```

### Upload from Browser

```typescript
const blockBlobClient = containerClient.getBlockBlobClient("browser-upload.txt");

// From File input
const fileInput = document.getElementById("fileInput") as HTMLInputElement;
const file = fileInput.files![0];
await blockBlobClient.uploadData(file);

// From Blob/ArrayBuffer
const arrayBuffer = new ArrayBuffer(1024);
await blockBlobClient.uploadData(arrayBuffer);
```

### Download Blob

```typescript
const blobClient = containerClient.getBlobClient("my-file.txt");
const downloadResponse = await blobClient.download();

// Read as string (browser & Node.js)
const downloaded = await streamToText(downloadResponse.readableStreamBody!);

async function streamToText(readable: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of readable) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}
```

### Download to File (Node.js only)

```typescript
const blockBlobClient = containerClient.getBlockBlobClient("my-file.txt");
await blockBlobClient.downloadToFile("/path/to/local/destination.txt");
```

### Download to Buffer (Node.js only)

```typescript
const blockBlobClient = containerClient.getBlockBlobClient("my-file.txt");
const buffer = await blockBlobClient.downloadToBuffer();
console.log(buffer.toString());
```

### List Blobs

```typescript
// List all blobs
for await (const blob of containerClient.listBlobsFlat()) {
  console.log(blob.name, blob.properties.contentLength);
}

// List with prefix
for await (const blob of containerClient.listBlobsFlat({ prefix: "logs/" })) {
  console.log(blob.name);
}

// List by hierarchy (virtual directories)
for await (const item of containerClient.listBlobsByHierarchy("/")) {
  if (item.kind === "prefix") {
    console.log(`Directory: ${item.name}`);
  } else {
    console.log(`Blob: ${item.name}`);
  }
}
```

### Delete Blob

```typescript
const blobClient = containerClient.getBlobClient("my-file.txt");
await blobClient.delete();

// Delete if exists
await blobClient.deleteIfExists();

// Delete with snapshots
await blobClient.delete({ deleteSnapshots: "include" });
```

### Copy Blob

```typescript
const sourceBlobClient = containerClient.getBlobClient("source.txt");
const destBlobClient = containerClient.getBlobClient("destination.txt");

// Start copy operation
const copyPoller = await destBlobClient.beginCopyFromURL(sourceBlobClient.url);
await copyPoller.pollUntilDone();
```

## Blob Properties & Metadata

### Get Properties

```typescript
const blobClient = containerClient.getBlobClient("my-file.txt");
const properties = await blobClient.getProperties();

console.log("Content-Type:", properties.contentType);
console.log("Content-Length:", properties.contentLength);
console.log("Last Modified:", properties.lastModified);
console.log("ETag:", properties.etag);
```

### Set Metadata

```typescript
await blobClient.setMetadata({
  author: "John Doe",
  category: "documents",
});
```

### Set HTTP Headers

```typescript
await blobClient.setHTTPHeaders({
  blobContentType: "text/plain",
  blobCacheControl: "max-age=3600",
  blobContentDisposition: "attachment; filename=download.txt",
});
```

## SAS Token Generation (Node.js only)

### Generate Blob SAS

```typescript
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const sasToken = generateBlobSASQueryParameters(
  {
    containerName: "my-container",
    blobName: "my-file.txt",
    permissions: BlobSASPermissions.parse("r"), // read only
    startsOn: new Date(),
    expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour
  },
  sharedKeyCredential
).toString();

const sasUrl = `https://${accountName}.blob.core.windows.net/my-container/my-file.txt?${sasToken}`;
```

### Generate Container SAS

```typescript
import { ContainerSASPermissions, generateBlobSASQueryParameters } from "@azure/storage-blob";

const sasToken = generateBlobSASQueryParameters(
  {
    containerName: "my-container",
    permissions: ContainerSASPermissions.parse("racwdl"), // read, add, create, write, delete, list
    expiresOn: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours
  },
  sharedKeyCredential
).toString();
```

### Generate Account SAS

```typescript
import {
  AccountSASPermissions,
  AccountSASResourceTypes,
  AccountSASServices,
  generateAccountSASQueryParameters,
} from "@azure/storage-blob";

const sasToken = generateAccountSASQueryParameters(
  {
    services: AccountSASServices.parse("b").toString(), // blob
    resourceTypes: AccountSASResourceTypes.parse("sco").toString(), // service, container, object
    permissions: AccountSASPermissions.parse("rwdlacupi"), // all permissions
    expiresOn: new Date(Date.now() + 24 * 3600 * 1000),
  },
  sharedKeyCredential
).toString();
```

## Blob Types

### Block Blob (Default)

Most common type for text and binary files.

```typescript
const blockBlobClient = containerClient.getBlockBlobClient("document.pdf");
await blockBlobClient.uploadFile("/path/to/document.pdf");
```

### Append Blob

Optimized for append operations (logs, audit trails).

```typescript
const appendBlobClient = containerClient.getAppendBlobClient("app.log");

// Create the append blob
await appendBlobClient.create();

// Append data
await appendBlobClient.appendBlock("Log entry 1\n", 12);
await appendBlobClient.appendBlock("Log entry 2\n", 12);
```

### Page Blob

Fixed-size blobs for random read/write (VHDs).

```typescript
const pageBlobClient = containerClient.getPageBlobClient("disk.vhd");

// Create 512-byte aligned page blob
await pageBlobClient.create(1024 * 1024); // 1MB

// Write pages (must be 512-byte aligned)
const buffer = Buffer.alloc(512);
await pageBlobClient.uploadPages(buffer, 0, 512);
```

## Error Handling

```typescript
import { RestError } from "@azure/storage-blob";

try {
  await containerClient.create();
} catch (error) {
  if (error instanceof RestError) {
    switch (error.statusCode) {
      case 404:
        console.log("Container not found");
        break;
      case 409:
        console.log("Container already exists");
        break;
      case 403:
        console.log("Access denied");
        break;
      default:
        console.error(`Storage error ${error.statusCode}: ${error.message}`);
    }
  }
  throw error;
}
```

## TypeScript Types Reference

```typescript
import {
  // Clients
  BlobServiceClient,
  ContainerClient,
  BlobClient,
  BlockBlobClient,
  AppendBlobClient,
  PageBlobClient,

  // Authentication
  StorageSharedKeyCredential,
  AnonymousCredential,

  // SAS
  BlobSASPermissions,
  ContainerSASPermissions,
  AccountSASPermissions,
  AccountSASServices,
  AccountSASResourceTypes,
  generateBlobSASQueryParameters,
  generateAccountSASQueryParameters,

  // Options & Responses
  BlobDownloadResponseParsed,
  BlobUploadCommonResponse,
  ContainerCreateResponse,
  BlobItem,
  ContainerItem,

  // Errors
  RestError,
} from "@azure/storage-blob";
```

## Best Practices

1. **Use DefaultAzureCredential** — Prefer AAD over connection strings/keys
2. **Use streaming for large files** — `uploadStream`/`downloadToFile` for files > 256MB
3. **Set appropriate content types** — Use `setHTTPHeaders` for correct MIME types
4. **Use SAS tokens for client access** — Generate short-lived tokens for browser uploads
5. **Handle errors gracefully** — Check `RestError.statusCode` for specific handling
6. **Use `*IfNotExists` methods** — For idempotent container/blob creation
7. **Close clients** — Not required but good practice in long-running apps

## Platform Differences

| Feature | Node.js | Browser |
|---------|---------|---------|
| `StorageSharedKeyCredential` | ✅ | ❌ |
| `uploadFile()` | ✅ | ❌ |
| `uploadStream()` | ✅ | ❌ |
| `downloadToFile()` | ✅ | ❌ |
| `downloadToBuffer()` | ✅ | ❌ |
| `uploadData()` | ✅ | ✅ |
| SAS generation | ✅ | ❌ |
| DefaultAzureCredential | ✅ | ❌ |
| Anonymous/SAS access | ✅ | ✅ |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
