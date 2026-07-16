---
name: azure-eventgrid-java
description: "Build event-driven applications with Azure Event Grid SDK for Java. Use when publishing events, implementing pub/sub patterns, or integrating with Azure services via events."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure Event Grid SDK for Java

Build event-driven applications using the Azure Event Grid SDK for Java.

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-messaging-eventgrid</artifactId>
    <version>4.27.0</version>
</dependency>
```

## Client Creation

### EventGridPublisherClient

```java
import com.azure.messaging.eventgrid.EventGridPublisherClient;
import com.azure.messaging.eventgrid.EventGridPublisherClientBuilder;
import com.azure.core.credential.AzureKeyCredential;

// With API Key
EventGridPublisherClient<EventGridEvent> client = new EventGridPublisherClientBuilder()
    .endpoint("<topic-endpoint>")
    .credential(new AzureKeyCredential("<access-key>"))
    .buildEventGridEventPublisherClient();

// For CloudEvents
EventGridPublisherClient<CloudEvent> cloudClient = new EventGridPublisherClientBuilder()
    .endpoint("<topic-endpoint>")
    .credential(new AzureKeyCredential("<access-key>"))
    .buildCloudEventPublisherClient();
```

### With DefaultAzureCredential

```java
import com.azure.identity.DefaultAzureCredentialBuilder;

EventGridPublisherClient<EventGridEvent> client = new EventGridPublisherClientBuilder()
    .endpoint("<topic-endpoint>")
    .credential(new DefaultAzureCredentialBuilder().build())
    .buildEventGridEventPublisherClient();
```

### Async Client

```java
import com.azure.messaging.eventgrid.EventGridPublisherAsyncClient;

EventGridPublisherAsyncClient<EventGridEvent> asyncClient = new EventGridPublisherClientBuilder()
    .endpoint("<topic-endpoint>")
    .credential(new AzureKeyCredential("<access-key>"))
    .buildEventGridEventPublisherAsyncClient();
```

## Event Types

| Type | Description |
|------|-------------|
| `EventGridEvent` | Azure Event Grid native schema |
| `CloudEvent` | CNCF CloudEvents 1.0 specification |
| `BinaryData` | Custom schema events |

## Core Patterns

### Publish EventGridEvent

```java
import com.azure.messaging.eventgrid.EventGridEvent;
import com.azure.core.util.BinaryData;

EventGridEvent event = new EventGridEvent(
    "resource/path",           // subject
    "MyApp.Events.OrderCreated", // eventType
    BinaryData.fromObject(new OrderData("order-123", 99.99)), // data
    "1.0"                      // dataVersion
);

client.sendEvent(event);
```

### Publish Multiple Events

```java
List<EventGridEvent> events = Arrays.asList(
    new EventGridEvent("orders/1", "Order.Created", 
        BinaryData.fromObject(order1), "1.0"),
    new EventGridEvent("orders/2", "Order.Created", 
        BinaryData.fromObject(order2), "1.0")
);

client.sendEvents(events);
```

### Publish CloudEvent

```java
import com.azure.core.models.CloudEvent;
import com.azure.core.models.CloudEventDataFormat;

CloudEvent cloudEvent = new CloudEvent(
    "/myapp/orders",           // source
    "order.created",           // type
    BinaryData.fromObject(orderData), // data
    CloudEventDataFormat.JSON  // dataFormat
);
cloudEvent.setSubject("orders/12345");
cloudEvent.setId(UUID.randomUUID().toString());

cloudClient.sendEvent(cloudEvent);
```

### Publish CloudEvents Batch

```java
List<CloudEvent> cloudEvents = Arrays.asList(
    new CloudEvent("/app", "event.type1", BinaryData.fromString("data1"), CloudEventDataFormat.JSON),
    new CloudEvent("/app", "event.type2", BinaryData.fromString("data2"), CloudEventDataFormat.JSON)
);

cloudClient.sendEvents(cloudEvents);
```

### Async Publishing

```java
asyncClient.sendEvent(event)
    .subscribe(
        unused -> System.out.println("Event sent successfully"),
        error -> System.err.println("Error: " + error.getMessage())
    );

// With multiple events
asyncClient.sendEvents(events)
    .doOnSuccess(unused -> System.out.println("All events sent"))
    .doOnError(error -> System.err.println("Failed: " + error))
    .block(); // Block if needed
```

### Custom Event Data Class

```java
public class OrderData {
    private String orderId;
    private double amount;
    private String customerId;
    
    public OrderData(String orderId, double amount) {
        this.orderId = orderId;
        this.amount = amount;
    }
    
    // Getters and setters
}

// Usage
OrderData order = new OrderData("ORD-123", 150.00);
EventGridEvent event = new EventGridEvent(
    "orders/" + order.getOrderId(),
    "MyApp.Order.Created",
    BinaryData.fromObject(order),
    "1.0"
);
```

## Receiving Events

### Parse EventGridEvent

```java
import com.azure.messaging.eventgrid.EventGridEvent;

// From JSON string (e.g., webhook payload)
String jsonPayload = "[{\"id\": \"...\", ...}]";
List<EventGridEvent> events = EventGridEvent.fromString(jsonPayload);

for (EventGridEvent event : events) {
    System.out.println("Event Type: " + event.getEventType());
    System.out.println("Subject: " + event.getSubject());
    System.out.println("Event Time: " + event.getEventTime());
    
    // Get data
    BinaryData data = event.getData();
    OrderData orderData = data.toObject(OrderData.class);
}
```

### Parse CloudEvent

```java
import com.azure.core.models.CloudEvent;

String cloudEventJson = "[{\"specversion\": \"1.0\", ...}]";
List<CloudEvent> cloudEvents = CloudEvent.fromString(cloudEventJson);

for (CloudEvent event : cloudEvents) {
    System.out.println("Type: " + event.getType());
    System.out.println("Source: " + event.getSource());
    System.out.println("ID: " + event.getId());
    
    MyEventData data = event.getData().toObject(MyEventData.class);
}
```

### Handle System Events

```java
import com.azure.messaging.eventgrid.systemevents.*;

for (EventGridEvent event : events) {
    if (event.getEventType().equals("Microsoft.Storage.BlobCreated")) {
        StorageBlobCreatedEventData blobData = 
            event.getData().toObject(StorageBlobCreatedEventData.class);
        System.out.println("Blob URL: " + blobData.getUrl());
    }
}
```

## Event Grid Namespaces (MQTT/Pull)

### Receive from Namespace Topic

```java
import com.azure.messaging.eventgrid.namespaces.EventGridReceiverClient;
import com.azure.messaging.eventgrid.namespaces.EventGridReceiverClientBuilder;
import com.azure.messaging.eventgrid.namespaces.models.*;

EventGridReceiverClient receiverClient = new EventGridReceiverClientBuilder()
    .endpoint("<namespace-endpoint>")
    .credential(new AzureKeyCredential("<key>"))
    .topicName("my-topic")
    .subscriptionName("my-subscription")
    .buildClient();

// Receive events
ReceiveResult result = receiverClient.receive(10, Duration.ofSeconds(30));

for (ReceiveDetails detail : result.getValue()) {
    CloudEvent event = detail.getEvent();
    System.out.println("Event: " + event.getType());
    
    // Acknowledge the event
    receiverClient.acknowledge(Arrays.asList(detail.getBrokerProperties().getLockToken()));
}
```

### Reject or Release Events

```java
// Reject (don't retry)
receiverClient.reject(Arrays.asList(lockToken));

// Release (retry later)
receiverClient.release(Arrays.asList(lockToken));

// Release with delay
receiverClient.release(Arrays.asList(lockToken), 
    new ReleaseOptions().setDelay(ReleaseDelay.BY_60_SECONDS));
```

## Error Handling

```java
import com.azure.core.exception.HttpResponseException;

try {
    client.sendEvent(event);
} catch (HttpResponseException e) {
    System.out.println("Status: " + e.getResponse().getStatusCode());
    System.out.println("Error: " + e.getMessage());
}
```

## Environment Variables

```bash
EVENT_GRID_TOPIC_ENDPOINT=https://<topic-name>.<region>.eventgrid.azure.net/api/events
EVENT_GRID_ACCESS_KEY=<your-access-key>
```

## Best Practices

1. **Batch Events**: Send multiple events in one call when possible
2. **Idempotency**: Include unique event IDs for deduplication
3. **Schema Validation**: Use strongly-typed event data classes
4. **Retry Logic**: Built-in, but consider dead-letter for failures
5. **Event Size**: Keep events under 1MB (64KB for basic tier)

## Trigger Phrases

- "Event Grid Java"
- "publish events Azure"
- "CloudEvent SDK"
- "event-driven messaging"
- "pub/sub Azure"
- "webhook events"

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
