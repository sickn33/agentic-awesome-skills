# @azure/storage-queue (TypeScript/JavaScript) - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Installation

```bash
npm install @azure/storage-queue @azure/identity
```

Examples target the v12 SDK API; pin a tested release and use its supported Node.js LTS runtime.


## Environment Variables

```bash
# Provide AZURE_STORAGE_ACCOUNT_NAME via deployment configuration.
# Inject keys, SAS or connection strings through a secret manager; never paste them in shell history.
```


## Authentication

### DefaultAzureCredential (Recommended)

```typescript
import { QueueServiceClient } from "@azure/storage-queue";
import { DefaultAzureCredential } from "@azure/identity";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const client = new QueueServiceClient(
  `https://${accountName}.queue.core.windows.net`,
  new DefaultAzureCredential()
);
```

### Connection String

```typescript
import { QueueServiceClient } from "@azure/storage-queue";

const client = QueueServiceClient.fromConnectionString(
  process.env.AZURE_STORAGE_CONNECTION_STRING!
);
```

### StorageSharedKeyCredential (Node.js only)

```typescript
import { QueueServiceClient, StorageSharedKeyCredential } from "@azure/storage-queue";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY!;

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
const client = new QueueServiceClient(
  `https://${accountName}.queue.core.windows.net`,
  sharedKeyCredential
);
```

### SAS Token

```typescript
import { QueueServiceClient } from "@azure/storage-queue";

const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME!;
const sasToken = process.env.AZURE_STORAGE_SAS_TOKEN!;

const client = new QueueServiceClient(
  `https://${accountName}.queue.core.windows.net?${sasToken.replace(/^\?/, "")}`
);
```


## Client Hierarchy

```
QueueServiceClient (account level)
└── QueueClient (queue level)
    └── Messages (send, receive, peek, delete)
```


Confirm account/queue and authorization before creating, clearing, deleting, receiving or sending. Receive changes visibility; peek is the nonmutating inspection path. Use least-privilege data RBAC and keep credentials, SAS URLs, bodies and pop receipts out of logs. Worker functions are fragments; supply QueueClient imports and validated application adapters.

## Queue Operations

### Create Queue

```typescript
const queueClient = client.getQueueClient("my-queue");
await queueClient.create();

// Or create if not exists
await queueClient.createIfNotExists();
```

### List Queues

```typescript
for await (const queue of client.listQueues()) {
  console.log(queue.name);
}

// With prefix filter
for await (const queue of client.listQueues({ prefix: "task-" })) {
  console.log(queue.name);
}
```

### Delete Queue

```typescript
await queueClient.delete();

// Or delete if exists
await queueClient.deleteIfExists();
```

### Get Queue Properties

```typescript
const properties = await queueClient.getProperties();
console.log("Approximate message count:", properties.approximateMessagesCount);
console.log("Metadata:", properties.metadata);
```

### Set Queue Metadata

```typescript
await queueClient.setMetadata({
  department: "engineering",
  priority: "high",
});
```


## Message Operations

### Send Message

```typescript
const queueClient = client.getQueueClient("my-queue");

// Simple message
await queueClient.sendMessage("Hello, World!");

// With options
await queueClient.sendMessage("Delayed message", {
  visibilityTimeout: 60, // Hidden for 60 seconds
  messageTimeToLive: 3600, // Expires in 1 hour
});

// JSON message (must be string)
const task = { type: "process", data: { id: 123 } };
await queueClient.sendMessage(JSON.stringify(task));
```

### Receive Messages

```typescript
// Receive up to 32 messages (default: 1)
const response = await queueClient.receiveMessages({
  numberOfMessages: 1,
  visibilityTimeout: 30, // 30 seconds to process
});

for (const message of response.receivedMessageItems) {
  console.log("Message ID:", message.messageId);
  // Do not log message bodies; they may contain personal data.
  console.log("Dequeue Count:", message.dequeueCount);
  // Keep pop receipts private.

  // Process the message...

  // Delete after processing
  await queueClient.deleteMessage(message.messageId, message.popReceipt);
}
```

### Peek Messages

Peek without removing from queue (no visibility timeout).

```typescript
const response = await queueClient.peekMessages({
  numberOfMessages: 5,
});

for (const message of response.peekedMessageItems) {
  console.log("Message ID:", message.messageId);
  // Do not log message bodies; they may contain personal data.
  // Note: No popReceipt - cannot delete peeked messages
}
```

### Update Message

Extend visibility timeout or update content.

```typescript
// Receive a message
const response = await queueClient.receiveMessages();
const message = response.receivedMessageItems[0];

if (message) {
  // Update content and extend visibility
  const updateResponse = await queueClient.updateMessage(
    message.messageId,
    message.popReceipt,
    "Updated content",
    60 // New visibility timeout in seconds
  );

  // Use new popReceipt for subsequent operations
  // Retain updateResponse.popReceipt privately for the next operation.
}
```

### Delete Message

```typescript
// After receiving
const response = await queueClient.receiveMessages();
const message = response.receivedMessageItems[0];

if (message) {
  await queueClient.deleteMessage(message.messageId, message.popReceipt);
}
```

### Clear All Messages

```typescript
await queueClient.clearMessages();
```


## Message Processing Patterns

### Basic Worker Pattern

```typescript
async function processQueue(queueClient: QueueClient): Promise<void> {
  while (true) {
    const response = await queueClient.receiveMessages({
      numberOfMessages: 1,
      visibilityTimeout: 30,
    });

    if (response.receivedMessageItems.length === 0) {
      // No messages, wait before polling again
      await sleep(5000);
      continue;
    }

    for (const message of response.receivedMessageItems) {
      try {
        await processMessage(message.messageText);
        await queueClient.deleteMessage(message.messageId, message.popReceipt);
      } catch (error) {
        console.error("Message processing failed");
        // Message will become visible again after timeout
      }
    }
  }
}

async function processMessage(content: string): Promise<void> {
  const task = JSON.parse(content);
  // Process task...
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Poison Message Handling

```typescript
const MAX_DEQUEUE_COUNT = 5;

async function processWithPoisonHandling(
  queueClient: QueueClient,
  poisonQueueClient: QueueClient
): Promise<void> {
  const response = await queueClient.receiveMessages({
    numberOfMessages: 1,
    visibilityTimeout: 30,
  });

  for (const message of response.receivedMessageItems) {
    if (message.dequeueCount > MAX_DEQUEUE_COUNT) {
      // Move to poison queue
      await poisonQueueClient.sendMessage(message.messageText);
      await queueClient.deleteMessage(message.messageId, message.popReceipt);
      console.log(`Moved message ${message.messageId} to poison queue`);
      continue;
    }

    try {
      await processMessage(message.messageText);
      await queueClient.deleteMessage(message.messageId, message.popReceipt);
    } catch (error) {
      console.error(`Processing failed (attempt ${message.dequeueCount})`);
    }
  }
}
```

### Batch Processing with Visibility Extension

```typescript
async function processBatchWithExtension(queueClient: QueueClient): Promise<void> {
  const response = await queueClient.receiveMessages({
    numberOfMessages: 1,
    visibilityTimeout: 60,
  });

  const message = response.receivedMessageItems[0];
  if (!message) return;

  let popReceipt = message.popReceipt;

  // Application-owned adapter yields only after bounded (<30s) idempotent chunks.
  // Await renewal serially: overlapping callbacks can rotate receipts during delete.
  for await (const chunk of processInChunks(message.messageText)) {
    const updated = await queueClient.updateMessage(
      message.messageId, popReceipt, message.messageText, 60
    );
    popReceipt = updated.popReceipt;
    // On renewal failure, stop and do not delete; processing must tolerate redelivery.
  }
  await queueClient.deleteMessage(message.messageId, popReceipt);
}
```


## Message Encoding

The JavaScript SDK sends strings; it does not provide the `messageEncoding` client option shown in some other Azure language SDKs. Agree the wire format with every producer/consumer. For Base64, encode/decode explicitly (Node.js):

```typescript
const payload = Buffer.from(JSON.stringify(task), "utf8").toString("base64");
await queueClient.sendMessage(payload);
// At the consumer, decode before parsing, and validate the resulting schema.
const decoded = Buffer.from(message.messageText, "base64").toString("utf8");
```

Base64 increases size; the service message limit applies to the encoded content. Encoding is not encryption.

## SAS Token Generation (Node.js only)

### Generate Queue SAS

```typescript
import {
  QueueSASPermissions,
  generateQueueSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-queue";

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const sasToken = generateQueueSASQueryParameters(
  {
    queueName: "my-queue",
    permissions: QueueSASPermissions.parse("raup"), // read, add, update, process
    startsOn: new Date(),
    expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour
  },
  sharedKeyCredential
).toString();

const sasUrl = `https://${accountName}.queue.core.windows.net/my-queue?${sasToken}`;
```

### Generate Account SAS

```typescript
import {
  AccountSASPermissions,
  AccountSASResourceTypes,
  AccountSASServices,
  generateAccountSASQueryParameters,
} from "@azure/storage-queue";

const sasToken = generateAccountSASQueryParameters(
  {
    services: AccountSASServices.parse("q").toString(), // queue
    resourceTypes: AccountSASResourceTypes.parse("sco").toString(),
    permissions: AccountSASPermissions.parse("rwdlacupi"),
    expiresOn: new Date(Date.now() + 24 * 3600 * 1000),
  },
  sharedKeyCredential
).toString();
```


## Error Handling

```typescript
import { RestError } from "@azure/storage-queue";

try {
  await queueClient.sendMessage("test");
} catch (error) {
  if (error instanceof RestError) {
    switch (error.statusCode) {
      case 404:
        console.log("Queue not found");
        break;
      case 400:
        console.log("Bad request - message too large or invalid");
        break;
      case 403:
        console.log("Access denied");
        break;
      case 409:
        console.log("Queue already exists or being deleted");
        break;
      default:
        console.error(`Storage error ${error.statusCode}`);
    }
  }
  throw error;
}
```


## TypeScript Types Reference

```typescript
import {
  // Clients
  QueueServiceClient,
  QueueClient,

  // Authentication
  StorageSharedKeyCredential,
  AnonymousCredential,

  // SAS
  QueueSASPermissions,
  AccountSASPermissions,
  AccountSASServices,
  AccountSASResourceTypes,
  generateQueueSASQueryParameters,
  generateAccountSASQueryParameters,

  // Messages
  DequeuedMessageItem,
  PeekedMessageItem,
  QueueSendMessageResponse,
  QueueReceiveMessageResponse,
  QueueUpdateMessageResponse,

  // Queue
  QueueItem,
  QueueGetPropertiesResponse,

  // Errors
  RestError,
} from "@azure/storage-queue";
```


## Message Limits

| Limit | Value |
|-------|-------|
| Max message size | 64 KB |
| Max visibility timeout | 7 days |
| Time-to-live | Default7 days; supported service versions allow a positive duration or -1 (nonexpiring) |
| Max messages per receive | 32 |
| Default visibility timeout | 30 seconds |


## Best Practices

1. **Use DefaultAzureCredential** — Prefer AAD over connection strings/keys
2. **Delete only after successful processing** — Delivery is at least once; make effects idempotent
3. **Handle poison messages** — Application-managed poison queue; send+delete is not atomic and may duplicate
4. **Use appropriate visibility timeout** — Set based on expected processing time
5. **Extend visibility for long tasks** — Update message to prevent timeout
6. **Use JSON for structured data** — Serialize objects to JSON strings
7. **Check dequeueCount** — Detect repeatedly failing messages
8. **Use batch receive** — Receive multiple messages for efficiency


## Platform Differences

| Feature | Node.js | Browser |
|---------|---------|---------|
| `StorageSharedKeyCredential` | ✅ | ❌ |
| SAS generation | ✅ | ❌ |
| DefaultAzureCredential | ✅ | ❌ |
| Anonymous/SAS access | ✅ | ✅ |
| All message operations | ✅ | ✅ |
