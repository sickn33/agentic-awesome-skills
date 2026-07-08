---
name: azure-eventgrid-py
description: Azure Event Grid SDK for Python. Use for publishing events, handling CloudEvents, and event-driven architectures.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Event Grid SDK for Python

Event routing service for building event-driven applications with pub/sub semantics.

## Installation

```bash
pip install azure-eventgrid azure-identity
```

## Environment Variables

```bash
EVENTGRID_TOPIC_ENDPOINT=https://<topic-name>.<region>.eventgrid.azure.net/api/events
EVENTGRID_NAMESPACE_ENDPOINT=https://<namespace>.<region>.eventgrid.azure.net
```

## Authentication

```python
from azure.identity import DefaultAzureCredential
from azure.eventgrid import EventGridPublisherClient

credential = DefaultAzureCredential()
endpoint = "https://<topic-name>.<region>.eventgrid.azure.net/api/events"

client = EventGridPublisherClient(endpoint, credential)
```

## Event Types

| Format | Class | Use Case |
|--------|-------|----------|
| Cloud Events 1.0 | `CloudEvent` | Standard, interoperable (recommended) |
| Event Grid Schema | `EventGridEvent` | Azure-native format |

## Publish CloudEvents

```python
from azure.eventgrid import EventGridPublisherClient, CloudEvent
from azure.identity import DefaultAzureCredential

client = EventGridPublisherClient(endpoint, DefaultAzureCredential())

# Single event
event = CloudEvent(
    type="MyApp.Events.OrderCreated",
    source="/myapp/orders",
    data={"order_id": "12345", "amount": 99.99}
)
client.send(event)

# Multiple events
events = [
    CloudEvent(
        type="MyApp.Events.OrderCreated",
        source="/myapp/orders",
        data={"order_id": f"order-{i}"}
    )
    for i in range(10)
]
client.send(events)
```

## Publish EventGridEvents

```python
from azure.eventgrid import EventGridEvent
from datetime import datetime, timezone

event = EventGridEvent(
    subject="/myapp/orders/12345",
    event_type="MyApp.Events.OrderCreated",
    data={"order_id": "12345", "amount": 99.99},
    data_version="1.0"
)

client.send(event)
```

## Event Properties

### CloudEvent Properties

```python
event = CloudEvent(
    type="MyApp.Events.ItemCreated",      # Required: event type
    source="/myapp/items",                 # Required: event source
    data={"key": "value"},                 # Event payload
    subject="items/123",                   # Optional: subject/path
    datacontenttype="application/json",   # Optional: content type
    dataschema="https://schema.example",  # Optional: schema URL
    time=datetime.now(timezone.utc),      # Optional: timestamp
    extensions={"custom": "value"}         # Optional: custom attributes
)
```

### EventGridEvent Properties

```python
event = EventGridEvent(
    subject="/myapp/items/123",            # Required: subject
    event_type="MyApp.ItemCreated",        # Required: event type
    data={"key": "value"},                 # Required: event payload
    data_version="1.0",                    # Required: schema version
    topic="/subscriptions/.../topics/...", # Optional: auto-set
    event_time=datetime.now(timezone.utc)  # Optional: timestamp
)
```

## Async Client

```python
from azure.eventgrid.aio import EventGridPublisherClient
from azure.identity.aio import DefaultAzureCredential

async def publish_events():
    credential = DefaultAzureCredential()
    
    async with EventGridPublisherClient(endpoint, credential) as client:
        event = CloudEvent(
            type="MyApp.Events.Test",
            source="/myapp",
            data={"message": "hello"}
        )
        await client.send(event)

import asyncio
asyncio.run(publish_events())
```

## Namespace Topics (Event Grid Namespaces)

For Event Grid Namespaces (pull delivery):

```python
from azure.eventgrid.aio import EventGridPublisherClient

# Namespace endpoint (different from custom topic)
namespace_endpoint = "https://<namespace>.<region>.eventgrid.azure.net"
topic_name = "my-topic"

async with EventGridPublisherClient(
    endpoint=namespace_endpoint,
    credential=DefaultAzureCredential()
) as client:
    await client.send(
        event,
        namespace_topic=topic_name
    )
```

## Best Practices

1. **Use CloudEvents** for new applications (industry standard)
2. **Batch events** when publishing multiple events
3. **Include meaningful subjects** for filtering
4. **Use async client** for high-throughput scenarios
5. **Handle retries** — Event Grid has built-in retry
6. **Set appropriate event types** for routing and filtering

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
