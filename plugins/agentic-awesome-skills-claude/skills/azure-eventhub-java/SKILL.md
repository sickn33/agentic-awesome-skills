---
name: azure-eventhub-java
description: "Build real-time streaming applications with Azure Event Hubs SDK for Java. Use when implementing event streaming, high-throughput data ingestion, or building event-driven architectures."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure Event Hubs SDK for Java

Build real-time streaming applications using the Azure Event Hubs SDK for Java.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-messaging-eventhubs</artifactId>
    <version>5.19.0</version>
</dependency>

<!-- For checkpoint store (production) -->
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-messaging-eventhubs-checkpointstore-blob</artifactId>
    <version>1.20.0</version>
</dependency>
```

## Client Creation

### EventHubProducerClient

```java
import com.azure.messaging.eventhubs.EventHubProducerClient;
import com.azure.messaging.eventhubs.EventHubClientBuilder;

// With connection string
EventHubProducerClient producer = new EventHubClientBuilder()
    .connectionString("<connection-string>", "<event-hub-name>")
    .buildProducerClient();

// Full connection string with EntityPath
EventHubProducerClient producer = new EventHubClientBuilder()
    .connectionString("<connection-string-with-entity-path>")
    .buildProducerClient();
```

### With DefaultAzureCredential

```java
import com.azure.identity.DefaultAzureCredentialBuilder;

EventHubProducerClient producer = new EventHubClientBuilder()
    .fullyQualifiedNamespace("<namespace>.servicebus.windows.net")
    .eventHubName("<event-hub-name>")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildProducerClient();
```

### EventHubConsumerClient

```java
import com.azure.messaging.eventhubs.EventHubConsumerClient;

EventHubConsumerClient consumer = new EventHubClientBuilder()
    .connectionString("<connection-string>", "<event-hub-name>")
    .consumerGroup(EventHubClientBuilder.DEFAULT_CONSUMER_GROUP_NAME)
    .buildConsumerClient();
```

### Async Clients

```java
import com.azure.messaging.eventhubs.EventHubProducerAsyncClient;
import com.azure.messaging.eventhubs.EventHubConsumerAsyncClient;

EventHubProducerAsyncClient asyncProducer = new EventHubClientBuilder()
    .connectionString("<connection-string>", "<event-hub-name>")
    .buildAsyncProducerClient();

EventHubConsumerAsyncClient asyncConsumer = new EventHubClientBuilder()
    .connectionString("<connection-string>", "<event-hub-name>")
    .consumerGroup("$Default")
    .buildAsyncConsumerClient();
```

## Core Patterns

### Send Single Event

```java
import com.azure.messaging.eventhubs.EventData;

EventData eventData = new EventData("Hello, Event Hubs!");
producer.send(Collections.singletonList(eventData));
```

### Send Event Batch

```java
import com.azure.messaging.eventhubs.EventDataBatch;
import com.azure.messaging.eventhubs.models.CreateBatchOptions;

// Create batch
EventDataBatch batch = producer.createBatch();

// Add events (returns false if batch is full)
for (int i = 0; i < 100; i++) {
    EventData event = new EventData("Event " + i);
    if (!batch.tryAdd(event)) {
        // Batch is full, send and create new batch
        producer.send(batch);
        batch = producer.createBatch();
        batch.tryAdd(event);
    }
}

// Send remaining events
if (batch.getCount() > 0) {
    producer.send(batch);
}
```

### Send to Specific Partition

```java
CreateBatchOptions options = new CreateBatchOptions()
    .setPartitionId("0");

EventDataBatch batch = producer.createBatch(options);
batch.tryAdd(new EventData("Partition 0 event"));
producer.send(batch);
```

### Send with Partition Key

```java
CreateBatchOptions options = new CreateBatchOptions()
    .setPartitionKey("customer-123");

EventDataBatch batch = producer.createBatch(options);
batch.tryAdd(new EventData("Customer event"));
producer.send(batch);
```

### Event with Properties

```java
EventData event = new EventData("Order created");
event.getProperties().put("orderId", "ORD-123");
event.getProperties().put("customerId", "CUST-456");
event.getProperties().put("priority", 1);

producer.send(Collections.singletonList(event));
```

### Receive Events (Simple)

```java
import com.azure.messaging.eventhubs.models.EventPosition;
import com.azure.messaging.eventhubs.models.PartitionEvent;

// Receive from specific partition
Iterable<PartitionEvent> events = consumer.receiveFromPartition(
    "0",                           // partitionId
    10,                            // maxEvents
    EventPosition.earliest(),      // startingPosition
    Duration.ofSeconds(30)         // timeout
);

for (PartitionEvent partitionEvent : events) {
    EventData event = partitionEvent.getData();
    System.out.println("Body: " + event.getBodyAsString());
    System.out.println("Sequence: " + event.getSequenceNumber());
    System.out.println("Offset: " + event.getOffset());
}
```

### EventProcessorClient (Production)

```java
import com.azure.messaging.eventhubs.EventProcessorClient;
import com.azure.messaging.eventhubs.EventProcessorClientBuilder;
import com.azure.messaging.eventhubs.checkpointstore.blob.BlobCheckpointStore;
import com.azure.storage.blob.BlobContainerAsyncClient;
import com.azure.storage.blob.BlobContainerClientBuilder;

// Create checkpoint store
BlobContainerAsyncClient blobClient = new BlobContainerClientBuilder()
    .connectionString("<storage-connection-string>")
    .containerName("checkpoints")
    .buildAsyncClient();

// Create processor
EventProcessorClient processor = new EventProcessorClientBuilder()
    .connectionString("<eventhub-connection-string>", "<event-hub-name>")
    .consumerGroup("$Default")
    .checkpointStore(new BlobCheckpointStore(blobClient))
    .processEvent(eventContext -> {
        EventData event = eventContext.getEventData();
        System.out.println("Processing: " + event.getBodyAsString());
        
        // Checkpoint after processing
        eventContext.updateCheckpoint();
    })
    .processError(errorContext -> {
        System.err.println("Error: " + errorContext.getThrowable().getMessage());
        System.err.println("Partition: " + errorContext.getPartitionContext().getPartitionId());
    })
    .buildEventProcessorClient();

// Start processing
processor.start();

// Keep running...
Thread.sleep(Duration.ofMinutes(5).toMillis());

// Stop gracefully
processor.stop();
```

### Batch Processing

```java
EventProcessorClient processor = new EventProcessorClientBuilder()
    .connectionString("<connection-string>", "<event-hub-name>")
    .consumerGroup("$Default")
    .checkpointStore(new BlobCheckpointStore(blobClient))
    .processEventBatch(eventBatchContext -> {
        List<EventData> events = eventBatchContext.getEvents();
        System.out.printf("Received %d events%n", events.size());
        
        for (EventData event : events) {
            // Process each event
            System.out.println(event.getBodyAsString());
        }
        
        // Checkpoint after batch
        eventBatchContext.updateCheckpoint();
    }, 50) // maxBatchSize
    .processError(errorContext -> {
        System.err.println("Error: " + errorContext.getThrowable());
    })
    .buildEventProcessorClient();
```

### Async Receiving

```java
asyncConsumer.receiveFromPartition("0", EventPosition.latest())
    .subscribe(
        partitionEvent -> {
            EventData event = partitionEvent.getData();
            System.out.println("Received: " + event.getBodyAsString());
        },
        error -> System.err.println("Error: " + error),
        () -> System.out.println("Complete")
    );
```

### Get Event Hub Properties

```java
// Get hub info
EventHubProperties hubProps = producer.getEventHubProperties();
System.out.println("Hub: " + hubProps.getName());
System.out.println("Partitions: " + hubProps.getPartitionIds());

// Get partition info
PartitionProperties partitionProps = producer.getPartitionProperties("0");
System.out.println("Begin sequence: " + partitionProps.getBeginningSequenceNumber());
System.out.println("Last sequence: " + partitionProps.getLastEnqueuedSequenceNumber());
System.out.println("Last offset: " + partitionProps.getLastEnqueuedOffset());
```

## Event Positions

```java
// Start from beginning
EventPosition.earliest()

// Start from end (new events only)
EventPosition.latest()

// From specific offset
EventPosition.fromOffset(12345L)

// From specific sequence number
EventPosition.fromSequenceNumber(100L)

// From specific time
EventPosition.fromEnqueuedTime(Instant.now().minus(Duration.ofHours(1)))
```

## Error Handling

```java
import com.azure.messaging.eventhubs.models.ErrorContext;

.processError(errorContext -> {
    Throwable error = errorContext.getThrowable();
    String partitionId = errorContext.getPartitionContext().getPartitionId();
    
    if (error instanceof AmqpException) {
        AmqpException amqpError = (AmqpException) error;
        if (amqpError.isTransient()) {
            System.out.println("Transient error, will retry");
        }
    }
    
    System.err.printf("Error on partition %s: %s%n", partitionId, error.getMessage());
})
```

## Resource Cleanup

```java
// Always close clients
try {
    producer.send(batch);
} finally {
    producer.close();
}

// Or use try-with-resources
try (EventHubProducerClient producer = new EventHubClientBuilder()
        .connectionString(connectionString, eventHubName)
        .buildProducerClient()) {
    producer.send(events);
}
```

## Environment Variables

```bash
EVENT_HUBS_CONNECTION_STRING=Endpoint=sb://<namespace>.servicebus.windows.net/;SharedAccessKeyName=...
EVENT_HUBS_NAME=<event-hub-name>
STORAGE_CONNECTION_STRING=<for-checkpointing>
```

## Best Practices

1. **Use EventProcessorClient**: For production, provides load balancing and checkpointing
2. **Batch Events**: Use `EventDataBatch` for efficient sending
3. **Partition Keys**: Use for ordering guarantees within a partition
4. **Checkpointing**: Checkpoint after processing to avoid reprocessing
5. **Error Handling**: Handle transient errors with retries
6. **Close Clients**: Always close producer/consumer when done

## Trigger Phrases

- "Event Hubs Java"
- "event streaming Azure"
- "real-time data ingestion"
- "EventProcessorClient"
- "event hub producer consumer"
- "partition processing"

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
