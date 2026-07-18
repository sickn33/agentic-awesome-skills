---
name: azure-eventhub-py
description: Azure Event Hubs SDK for Python streaming. Use for high-throughput event ingestion, producers, consumers, and checkpointing.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Event Hubs SDK for Python

Big data streaming platform for high-throughput event ingestion.

## Installation

```bash
pip install azure-eventhub azure-identity
# For checkpointing with blob storage
pip install azure-eventhub-checkpointstoreblob-aio
```

## Environment Variables

```bash
EVENT_HUB_FULLY_QUALIFIED_NAMESPACE=<namespace>.servicebus.windows.net
EVENT_HUB_NAME=my-eventhub
STORAGE_ACCOUNT_URL=https://<account>.blob.core.windows.net
CHECKPOINT_CONTAINER=checkpoints
```

## Authentication

```python
from azure.identity import DefaultAzureCredential
from azure.eventhub import EventHubProducerClient, EventHubConsumerClient

credential = DefaultAzureCredential()
namespace = "<namespace>.servicebus.windows.net"
eventhub_name = "my-eventhub"

# Producer
producer = EventHubProducerClient(
    fully_qualified_namespace=namespace,
    eventhub_name=eventhub_name,
    credential=credential
)

# Consumer
consumer = EventHubConsumerClient(
    fully_qualified_namespace=namespace,
    eventhub_name=eventhub_name,
    consumer_group="$Default",
    credential=credential
)
```

## Client Types

| Client | Purpose |
|--------|---------|
| `EventHubProducerClient` | Send events to Event Hub |
| `EventHubConsumerClient` | Receive events from Event Hub |
| `BlobCheckpointStore` | Track consumer progress |

## Send Events

```python
from azure.eventhub import EventHubProducerClient, EventData
from azure.identity import DefaultAzureCredential

producer = EventHubProducerClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    eventhub_name="my-eventhub",
    credential=DefaultAzureCredential()
)

with producer:
    # Create batch (handles size limits)
    event_data_batch = producer.create_batch()
    
    for i in range(10):
        try:
            event_data_batch.add(EventData(f"Event {i}"))
        except ValueError:
            # Batch is full, send and create new one
            producer.send_batch(event_data_batch)
            event_data_batch = producer.create_batch()
            event_data_batch.add(EventData(f"Event {i}"))
    
    # Send remaining
    producer.send_batch(event_data_batch)
```

### Send to Specific Partition

```python
# By partition ID
event_data_batch = producer.create_batch(partition_id="0")

# By partition key (consistent hashing)
event_data_batch = producer.create_batch(partition_key="user-123")
```

## Receive Events

### Simple Receive

```python
from azure.eventhub import EventHubConsumerClient

def on_event(partition_context, event):
    print(f"Partition: {partition_context.partition_id}")
    print(f"Data: {event.body_as_str()}")
    partition_context.update_checkpoint(event)

consumer = EventHubConsumerClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    eventhub_name="my-eventhub",
    consumer_group="$Default",
    credential=DefaultAzureCredential()
)

with consumer:
    consumer.receive(
        on_event=on_event,
        starting_position="-1",  # Beginning of stream
    )
```

### With Blob Checkpoint Store (Production)

```python
from azure.eventhub import EventHubConsumerClient
from azure.eventhub.extensions.checkpointstoreblob import BlobCheckpointStore
from azure.identity import DefaultAzureCredential

checkpoint_store = BlobCheckpointStore(
    blob_account_url="https://<account>.blob.core.windows.net",
    container_name="checkpoints",
    credential=DefaultAzureCredential()
)

consumer = EventHubConsumerClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    eventhub_name="my-eventhub",
    consumer_group="$Default",
    credential=DefaultAzureCredential(),
    checkpoint_store=checkpoint_store
)

def on_event(partition_context, event):
    print(f"Received: {event.body_as_str()}")
    # Checkpoint after processing
    partition_context.update_checkpoint(event)

with consumer:
    consumer.receive(on_event=on_event)
```

## Async Client

```python
from azure.eventhub.aio import EventHubProducerClient, EventHubConsumerClient
from azure.identity.aio import DefaultAzureCredential
import asyncio

async def send_events():
    credential = DefaultAzureCredential()
    
    async with EventHubProducerClient(
        fully_qualified_namespace="<namespace>.servicebus.windows.net",
        eventhub_name="my-eventhub",
        credential=credential
    ) as producer:
        batch = await producer.create_batch()
        batch.add(EventData("Async event"))
        await producer.send_batch(batch)

async def receive_events():
    async def on_event(partition_context, event):
        print(event.body_as_str())
        await partition_context.update_checkpoint(event)
    
    async with EventHubConsumerClient(
        fully_qualified_namespace="<namespace>.servicebus.windows.net",
        eventhub_name="my-eventhub",
        consumer_group="$Default",
        credential=DefaultAzureCredential()
    ) as consumer:
        await consumer.receive(on_event=on_event)

asyncio.run(send_events())
```

## Event Properties

```python
event = EventData("My event body")

# Set properties
event.properties = {"custom_property": "value"}
event.content_type = "application/json"

# Read properties (on receive)
print(event.body_as_str())
print(event.sequence_number)
print(event.offset)
print(event.enqueued_time)
print(event.partition_key)
```

## Get Event Hub Info

```python
with producer:
    info = producer.get_eventhub_properties()
    print(f"Name: {info['name']}")
    print(f"Partitions: {info['partition_ids']}")
    
    for partition_id in info['partition_ids']:
        partition_info = producer.get_partition_properties(partition_id)
        print(f"Partition {partition_id}: {partition_info['last_enqueued_sequence_number']}")
```

## Best Practices

1. **Use batches** for sending multiple events
2. **Use checkpoint store** in production for reliable processing
3. **Use async client** for high-throughput scenarios
4. **Use partition keys** for ordered delivery within a partition
5. **Handle batch size limits** — catch ValueError when batch is full
6. **Use context managers** (`with`/`async with`) for proper cleanup
7. **Set appropriate consumer groups** for different applications

## Reference Files

| File | Contents |
|------|----------|
| references/checkpointing.md | Checkpoint store patterns, blob checkpointing, checkpoint strategies |
| references/partitions.md | Partition management, load balancing, starting positions |
| scripts/setup_consumer.py | CLI for Event Hub info, consumer setup, and event sending/receiving |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
