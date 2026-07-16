---
name: azure-eventhub-dotnet
description: Azure Event Hubs SDK for .NET.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.Messaging.EventHubs (.NET)

High-throughput event streaming SDK for sending and receiving events via Azure Event Hubs.

## Installation

```bash
# Core package (sending and simple receiving)
dotnet add package Azure.Messaging.EventHubs

# Processor package (production receiving with checkpointing)
dotnet add package Azure.Messaging.EventHubs.Processor

# Authentication
dotnet add package Azure.Identity

# For checkpointing (required by EventProcessorClient)
dotnet add package Azure.Storage.Blobs
```

**Current Versions**: Azure.Messaging.EventHubs v5.12.2, Azure.Messaging.EventHubs.Processor v5.12.2

## Environment Variables

```bash
EVENTHUB_FULLY_QUALIFIED_NAMESPACE=<namespace>.servicebus.windows.net
EVENTHUB_NAME=<event-hub-name>

# For checkpointing (EventProcessorClient)
BLOB_STORAGE_CONNECTION_STRING=<storage-connection-string>
BLOB_CONTAINER_NAME=<checkpoint-container>

# Alternative: Connection string auth (not recommended for production)
EVENTHUB_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=...
```

## Authentication

```csharp
using Azure.Identity;
using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Producer;

// Always use DefaultAzureCredential for production
var credential = new DefaultAzureCredential();

var fullyQualifiedNamespace = Environment.GetEnvironmentVariable("EVENTHUB_FULLY_QUALIFIED_NAMESPACE");
var eventHubName = Environment.GetEnvironmentVariable("EVENTHUB_NAME");

var producer = new EventHubProducerClient(
    fullyQualifiedNamespace,
    eventHubName,
    credential);
```

**Required RBAC Roles**:
- **Sending**: `Azure Event Hubs Data Sender`
- **Receiving**: `Azure Event Hubs Data Receiver`
- **Both**: `Azure Event Hubs Data Owner`

## Client Types

| Client | Purpose | When to Use |
|--------|---------|-------------|
| `EventHubProducerClient` | Send events immediately in batches | Real-time sending, full control over batching |
| `EventHubBufferedProducerClient` | Automatic batching with background sending | High-volume, fire-and-forget scenarios |
| `EventHubConsumerClient` | Simple event reading | Prototyping only, NOT for production |
| `EventProcessorClient` | Production event processing | **Always use this for receiving in production** |

## Core Workflow

### 1. Send Events (Batch)

```csharp
using Azure.Identity;
using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Producer;

await using var producer = new EventHubProducerClient(
    fullyQualifiedNamespace,
    eventHubName,
    new DefaultAzureCredential());

// Create a batch (respects size limits automatically)
using EventDataBatch batch = await producer.CreateBatchAsync();

// Add events to batch
var events = new[]
{
    new EventData(BinaryData.FromString("{\"id\": 1, \"message\": \"Hello\"}")),
    new EventData(BinaryData.FromString("{\"id\": 2, \"message\": \"World\"}"))
};

foreach (var eventData in events)
{
    if (!batch.TryAdd(eventData))
    {
        // Batch is full - send it and create a new one
        await producer.SendAsync(batch);
        batch = await producer.CreateBatchAsync();
        
        if (!batch.TryAdd(eventData))
        {
            throw new Exception("Event too large for empty batch");
        }
    }
}

// Send remaining events
if (batch.Count > 0)
{
    await producer.SendAsync(batch);
}
```

### 2. Send Events (Buffered - High Volume)

```csharp
using Azure.Messaging.EventHubs.Producer;

var options = new EventHubBufferedProducerClientOptions
{
    MaximumWaitTime = TimeSpan.FromSeconds(1)
};

await using var producer = new EventHubBufferedProducerClient(
    fullyQualifiedNamespace,
    eventHubName,
    new DefaultAzureCredential(),
    options);

// Handle send success/failure
producer.SendEventBatchSucceededAsync += args =>
{
    Console.WriteLine($"Batch sent: {args.EventBatch.Count} events");
    return Task.CompletedTask;
};

producer.SendEventBatchFailedAsync += args =>
{
    Console.WriteLine($"Batch failed: {args.Exception.Message}");
    return Task.CompletedTask;
};

// Enqueue events (sent automatically in background)
for (int i = 0; i < 1000; i++)
{
    await producer.EnqueueEventAsync(new EventData($"Event {i}"));
}

// Flush remaining events before disposing
await producer.FlushAsync();
```

### 3. Receive Events (Production - EventProcessorClient)

```csharp
using Azure.Identity;
using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Consumer;
using Azure.Messaging.EventHubs.Processor;
using Azure.Storage.Blobs;

// Blob container for checkpointing
var blobClient = new BlobContainerClient(
    Environment.GetEnvironmentVariable("BLOB_STORAGE_CONNECTION_STRING"),
    Environment.GetEnvironmentVariable("BLOB_CONTAINER_NAME"));

await blobClient.CreateIfNotExistsAsync();

// Create processor
var processor = new EventProcessorClient(
    blobClient,
    EventHubConsumerClient.DefaultConsumerGroup,
    fullyQualifiedNamespace,
    eventHubName,
    new DefaultAzureCredential());

// Handle events
processor.ProcessEventAsync += async args =>
{
    Console.WriteLine($"Partition: {args.Partition.PartitionId}");
    Console.WriteLine($"Data: {args.Data.EventBody}");
    
    // Checkpoint after processing (or batch checkpoints)
    await args.UpdateCheckpointAsync();
};

// Handle errors
processor.ProcessErrorAsync += args =>
{
    Console.WriteLine($"Error: {args.Exception.Message}");
    Console.WriteLine($"Partition: {args.PartitionId}");
    return Task.CompletedTask;
};

// Start processing
await processor.StartProcessingAsync();

// Run until cancelled
await Task.Delay(Timeout.Infinite, cancellationToken);

// Stop gracefully
await processor.StopProcessingAsync();
```

### 4. Partition Operations

```csharp
// Get partition IDs
string[] partitionIds = await producer.GetPartitionIdsAsync();

// Send to specific partition (use sparingly)
var options = new SendEventOptions
{
    PartitionId = "0"
};
await producer.SendAsync(events, options);

// Use partition key (recommended for ordering)
var batchOptions = new CreateBatchOptions
{
    PartitionKey = "customer-123"  // Events with same key go to same partition
};
using var batch = await producer.CreateBatchAsync(batchOptions);
```

## EventPosition Options

Control where to start reading:

```csharp
// Start from beginning
EventPosition.Earliest

// Start from end (new events only)
EventPosition.Latest

// Start from specific offset
EventPosition.FromOffset(12345)

// Start from specific sequence number
EventPosition.FromSequenceNumber(100)

// Start from specific time
EventPosition.FromEnqueuedTime(DateTimeOffset.UtcNow.AddHours(-1))
```

## ASP.NET Core Integration

```csharp
// Program.cs
using Azure.Identity;
using Azure.Messaging.EventHubs.Producer;
using Microsoft.Extensions.Azure;

builder.Services.AddAzureClients(clientBuilder =>
{
    clientBuilder.AddEventHubProducerClient(
        builder.Configuration["EventHub:FullyQualifiedNamespace"],
        builder.Configuration["EventHub:Name"]);
    
    clientBuilder.UseCredential(new DefaultAzureCredential());
});

// Inject in controller/service
public class EventService
{
    private readonly EventHubProducerClient _producer;
    
    public EventService(EventHubProducerClient producer)
    {
        _producer = producer;
    }
    
    public async Task SendAsync(string message)
    {
        using var batch = await _producer.CreateBatchAsync();
        batch.TryAdd(new EventData(message));
        await _producer.SendAsync(batch);
    }
}
```

## Best Practices

1. **Use `EventProcessorClient` for receiving** — Never use `EventHubConsumerClient` in production
2. **Checkpoint strategically** — After N events or time interval, not every event
3. **Use partition keys** — For ordering guarantees within a partition
4. **Reuse clients** — Create once, use as singleton (thread-safe)
5. **Use `await using`** — Ensures proper disposal
6. **Handle `ProcessErrorAsync`** — Always register error handler
7. **Batch events** — Use `CreateBatchAsync()` to respect size limits
8. **Use buffered producer** — For high-volume scenarios with automatic batching

## Error Handling

```csharp
using Azure.Messaging.EventHubs;

try
{
    await producer.SendAsync(batch);
}
catch (EventHubsException ex) when (ex.Reason == EventHubsException.FailureReason.ServiceBusy)
{
    // Retry with backoff
    await Task.Delay(TimeSpan.FromSeconds(5));
}
catch (EventHubsException ex) when (ex.IsTransient)
{
    // Transient error - safe to retry
    Console.WriteLine($"Transient error: {ex.Message}");
}
catch (EventHubsException ex)
{
    // Non-transient error
    Console.WriteLine($"Error: {ex.Reason} - {ex.Message}");
}
```

## Checkpointing Strategies

| Strategy | When to Use |
|----------|-------------|
| Every event | Low volume, critical data |
| Every N events | Balanced throughput/reliability |
| Time-based | Consistent checkpoint intervals |
| Batch completion | After processing a logical batch |

```csharp
// Checkpoint every 100 events
private int _eventCount = 0;

processor.ProcessEventAsync += async args =>
{
    // Process event...
    
    _eventCount++;
    if (_eventCount >= 100)
    {
        await args.UpdateCheckpointAsync();
        _eventCount = 0;
    }
};
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.Messaging.EventHubs` | Core sending/receiving | `dotnet add package Azure.Messaging.EventHubs` |
| `Azure.Messaging.EventHubs.Processor` | Production processing | `dotnet add package Azure.Messaging.EventHubs.Processor` |
| `Azure.ResourceManager.EventHubs` | Management plane (create hubs) | `dotnet add package Azure.ResourceManager.EventHubs` |
| `Microsoft.Azure.WebJobs.Extensions.EventHubs` | Azure Functions binding | `dotnet add package Microsoft.Azure.WebJobs.Extensions.EventHubs` |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
