---
name: azure-servicebus-dotnet
description: Azure Service Bus SDK for .NET. Enterprise messaging with queues, topics, subscriptions, and sessions.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.Messaging.ServiceBus (.NET)

Enterprise messaging SDK for reliable message delivery with queues, topics, subscriptions, and sessions.

## Installation

```bash
dotnet add package Azure.Messaging.ServiceBus
dotnet add package Azure.Identity
```

**Current Version**: v7.20.1 (stable)

## Environment Variables

```bash
AZURE_SERVICEBUS_FULLY_QUALIFIED_NAMESPACE=<namespace>.servicebus.windows.net
# Or connection string (less secure)
AZURE_SERVICEBUS_CONNECTION_STRING=Endpoint=sb://...
```

## Authentication

### Microsoft Entra ID (Recommended)

```csharp
using Azure.Identity;
using Azure.Messaging.ServiceBus;

string fullyQualifiedNamespace = "<namespace>.servicebus.windows.net";
await using ServiceBusClient client = new(fullyQualifiedNamespace, new DefaultAzureCredential());
```

### Connection String

```csharp
string connectionString = "<connection_string>";
await using ServiceBusClient client = new(connectionString);
```

### ASP.NET Core Dependency Injection

```csharp
services.AddAzureClients(builder =>
{
    builder.AddServiceBusClientWithNamespace("<namespace>.servicebus.windows.net");
    builder.UseCredential(new DefaultAzureCredential());
});
```

## Client Hierarchy

```
ServiceBusClient
├── CreateSender(queueOrTopicName)      → ServiceBusSender
├── CreateReceiver(queueName)           → ServiceBusReceiver
├── CreateReceiver(topicName, subName)  → ServiceBusReceiver
├── AcceptNextSessionAsync(queueName)   → ServiceBusSessionReceiver
├── CreateProcessor(queueName)          → ServiceBusProcessor
└── CreateSessionProcessor(queueName)   → ServiceBusSessionProcessor

ServiceBusAdministrationClient (separate client for CRUD)
```

## Core Workflows

### 1. Send Messages

```csharp
await using ServiceBusClient client = new(fullyQualifiedNamespace, new DefaultAzureCredential());
ServiceBusSender sender = client.CreateSender("my-queue");

// Single message
ServiceBusMessage message = new("Hello world!");
await sender.SendMessageAsync(message);

// Safe batching (recommended)
using ServiceBusMessageBatch batch = await sender.CreateMessageBatchAsync();
if (batch.TryAddMessage(new ServiceBusMessage("Message 1")))
{
    // Message added successfully
}
if (batch.TryAddMessage(new ServiceBusMessage("Message 2")))
{
    // Message added successfully
}
await sender.SendMessagesAsync(batch);
```

### 2. Receive Messages

```csharp
ServiceBusReceiver receiver = client.CreateReceiver("my-queue");

// Single message
ServiceBusReceivedMessage message = await receiver.ReceiveMessageAsync();
string body = message.Body.ToString();
Console.WriteLine(body);

// Complete the message (removes from queue)
await receiver.CompleteMessageAsync(message);

// Batch receive
IReadOnlyList<ServiceBusReceivedMessage> messages = await receiver.ReceiveMessagesAsync(maxMessages: 10);
foreach (var msg in messages)
{
    Console.WriteLine(msg.Body.ToString());
    await receiver.CompleteMessageAsync(msg);
}
```

### 3. Message Settlement

```csharp
// Complete - removes message from queue
await receiver.CompleteMessageAsync(message);

// Abandon - releases lock, message can be received again
await receiver.AbandonMessageAsync(message);

// Defer - prevents normal receive, use ReceiveDeferredMessageAsync
await receiver.DeferMessageAsync(message);

// Dead Letter - moves to dead letter subqueue
await receiver.DeadLetterMessageAsync(message, "InvalidFormat", "Message body was not valid JSON");
```

### 4. Background Processing with Processor

```csharp
ServiceBusProcessor processor = client.CreateProcessor("my-queue", new ServiceBusProcessorOptions
{
    AutoCompleteMessages = false,
    MaxConcurrentCalls = 2
});

processor.ProcessMessageAsync += async (args) =>
{
    try
    {
        string body = args.Message.Body.ToString();
        Console.WriteLine($"Received: {body}");
        await args.CompleteMessageAsync(args.Message);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error processing: {ex.Message}");
        await args.AbandonMessageAsync(args.Message);
    }
};

processor.ProcessErrorAsync += (args) =>
{
    Console.WriteLine($"Error source: {args.ErrorSource}");
    Console.WriteLine($"Entity: {args.EntityPath}");
    Console.WriteLine($"Exception: {args.Exception}");
    return Task.CompletedTask;
};

await processor.StartProcessingAsync();
// ... application runs
await processor.StopProcessingAsync();
```

### 5. Sessions (Ordered Processing)

```csharp
// Send session message
ServiceBusMessage message = new("Hello")
{
    SessionId = "order-123"
};
await sender.SendMessageAsync(message);

// Receive from next available session
ServiceBusSessionReceiver receiver = await client.AcceptNextSessionAsync("my-queue");

// Or receive from specific session
ServiceBusSessionReceiver receiver = await client.AcceptSessionAsync("my-queue", "order-123");

// Session state management
await receiver.SetSessionStateAsync(new BinaryData("processing"));
BinaryData state = await receiver.GetSessionStateAsync();

// Renew session lock
await receiver.RenewSessionLockAsync();
```

### 6. Dead Letter Queue

```csharp
// Receive from dead letter queue
ServiceBusReceiver dlqReceiver = client.CreateReceiver("my-queue", new ServiceBusReceiverOptions
{
    SubQueue = SubQueue.DeadLetter
});

ServiceBusReceivedMessage dlqMessage = await dlqReceiver.ReceiveMessageAsync();

// Access dead letter metadata
string reason = dlqMessage.DeadLetterReason;
string description = dlqMessage.DeadLetterErrorDescription;
Console.WriteLine($"Dead letter reason: {reason} - {description}");
```

### 7. Topics and Subscriptions

```csharp
// Send to topic
ServiceBusSender topicSender = client.CreateSender("my-topic");
await topicSender.SendMessageAsync(new ServiceBusMessage("Broadcast message"));

// Receive from subscription
ServiceBusReceiver subReceiver = client.CreateReceiver("my-topic", "my-subscription");
var message = await subReceiver.ReceiveMessageAsync();
```

### 8. Administration (CRUD)

```csharp
var adminClient = new ServiceBusAdministrationClient(
    fullyQualifiedNamespace, 
    new DefaultAzureCredential());

// Create queue
var options = new CreateQueueOptions("my-queue")
{
    MaxDeliveryCount = 10,
    LockDuration = TimeSpan.FromSeconds(30),
    RequiresSession = true,
    DeadLetteringOnMessageExpiration = true
};
QueueProperties queue = await adminClient.CreateQueueAsync(options);

// Update queue
queue.LockDuration = TimeSpan.FromSeconds(60);
await adminClient.UpdateQueueAsync(queue);

// Create topic and subscription
await adminClient.CreateTopicAsync(new CreateTopicOptions("my-topic"));
await adminClient.CreateSubscriptionAsync(new CreateSubscriptionOptions("my-topic", "my-subscription"));

// Delete
await adminClient.DeleteQueueAsync("my-queue");
```

### 9. Cross-Entity Transactions

```csharp
var options = new ServiceBusClientOptions { EnableCrossEntityTransactions = true };
await using var client = new ServiceBusClient(connectionString, options);

ServiceBusReceiver receiverA = client.CreateReceiver("queueA");
ServiceBusSender senderB = client.CreateSender("queueB");

ServiceBusReceivedMessage receivedMessage = await receiverA.ReceiveMessageAsync();

using (var ts = new TransactionScope(TransactionScopeAsyncFlowOption.Enabled))
{
    await receiverA.CompleteMessageAsync(receivedMessage);
    await senderB.SendMessageAsync(new ServiceBusMessage("Forwarded"));
    ts.Complete();
}
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `ServiceBusClient` | Main entry point, manages connection |
| `ServiceBusSender` | Sends messages to queues/topics |
| `ServiceBusReceiver` | Receives messages from queues/subscriptions |
| `ServiceBusSessionReceiver` | Receives session messages |
| `ServiceBusProcessor` | Background message processing |
| `ServiceBusSessionProcessor` | Background session processing |
| `ServiceBusAdministrationClient` | CRUD for queues/topics/subscriptions |
| `ServiceBusMessage` | Message to send |
| `ServiceBusReceivedMessage` | Received message with metadata |
| `ServiceBusMessageBatch` | Batch of messages |

## Best Practices

1. **Use singletons** — Clients, senders, receivers, and processors are thread-safe
2. **Always dispose** — Use `await using` or call `DisposeAsync()`
3. **Dispose order** — Close senders/receivers/processors first, then client
4. **Use DefaultAzureCredential** — Prefer over connection strings for production
5. **Use processors for background work** — Handles lock renewal automatically
6. **Use safe batching** — `CreateMessageBatchAsync()` and `TryAddMessage()`
7. **Handle transient errors** — Use `ServiceBusException.Reason`
8. **Configure transport** — Use `AmqpWebSockets` if ports 5671/5672 are blocked
9. **Set appropriate lock duration** — Default is 30 seconds
10. **Use sessions for ordering** — FIFO within a session

## Error Handling

```csharp
try
{
    await sender.SendMessageAsync(message);
}
catch (ServiceBusException ex) when (ex.Reason == ServiceBusFailureReason.ServiceBusy)
{
    // Retry with backoff
}
catch (ServiceBusException ex)
{
    Console.WriteLine($"Service Bus Error: {ex.Reason} - {ex.Message}");
}
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.Messaging.ServiceBus` | Service Bus (this SDK) | `dotnet add package Azure.Messaging.ServiceBus` |
| `Azure.Messaging.EventHubs` | Event streaming | `dotnet add package Azure.Messaging.EventHubs` |
| `Azure.Messaging.EventGrid` | Event routing | `dotnet add package Azure.Messaging.EventGrid` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.Messaging.ServiceBus |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.messaging.servicebus |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/servicebus/Azure.Messaging.ServiceBus |
| Troubleshooting | https://github.com/Azure/azure-sdk-for-net/blob/main/sdk/servicebus/Azure.Messaging.ServiceBus/TROUBLESHOOTING.md |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
