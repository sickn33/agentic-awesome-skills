# Partition Management with Azure Event Hubs

Patterns for working with partitions, load balancing, and event ordering.

## Understanding Partitions

Partitions enable:
- **Parallel processing** — Multiple consumers process different partitions
- **Ordered delivery** — Events within a partition maintain order
- **Scalability** — More partitions = higher throughput

## Get Partition Information

```python
from azure.eventhub import EventHubProducerClient
from azure.identity import DefaultAzureCredential

producer = EventHubProducerClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    eventhub_name="my-eventhub",
    credential=DefaultAzureCredential()
)

with producer:
    # Get Event Hub properties
    eh_props = producer.get_eventhub_properties()
    print(f"Event Hub: {eh_props['name']}")
    print(f"Partitions: {eh_props['partition_ids']}")
    print(f"Created: {eh_props['created_at']}")

    # Get individual partition properties
    for partition_id in eh_props['partition_ids']:
        props = producer.get_partition_properties(partition_id)
        print(f"\nPartition {partition_id}:")
        print(f"  First sequence: {props['beginning_sequence_number']}")
        print(f"  Last sequence: {props['last_enqueued_sequence_number']}")
        print(f"  Last offset: {props['last_enqueued_offset']}")
        print(f"  Last enqueued: {props['last_enqueued_time_utc']}")
        print(f"  Is empty: {props['is_empty']}")
```

## Sending to Specific Partitions

### By Partition ID (Direct)

```python
# Send to specific partition
batch = producer.create_batch(partition_id="0")
batch.add(EventData("Goes to partition 0"))
producer.send_batch(batch)
```

### By Partition Key (Consistent Hashing)

```python
# Same key maps consistently while partition topology remains unchanged
batch = producer.create_batch(partition_key="user-123")
batch.add(EventData("All user-123 events in same partition"))
producer.send_batch(batch)

# Different keys may go to different partitions
for user_id in ["user-1", "user-2", "user-3"]:
    batch = producer.create_batch(partition_key=user_id)
    batch.add(EventData(f"Event for {user_id}"))
    producer.send_batch(batch)
```

### Automatic routing (default)

```python
# No explicit targeting: service/SDK chooses routing; do not assume strict per-event round-robin
batch = producer.create_batch()
batch.add(EventData("Distributed across partitions"))
producer.send_batch(batch)
```

## Partition Selection Strategies

| Strategy | Use Case | Code |
|----------|----------|------|
| Round-robin | Even distribution, no ordering needs | `create_batch()` |
| Partition key | Related events in same partition | `create_batch(partition_key="...")` |
| Explicit partition | Direct control | `create_batch(partition_id="0")` |

## Receiving from Partitions

### All Partitions (Load Balanced)

```python
from azure.eventhub.aio import EventHubConsumerClient
from azure.eventhub.extensions.checkpointstoreblob.aio import BlobCheckpointStore
from azure.identity.aio import DefaultAzureCredential

checkpoint_store = BlobCheckpointStore(...)

consumer = EventHubConsumerClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    eventhub_name="my-eventhub",
    consumer_group="$Default",
    credential=DefaultAzureCredential(),
    checkpoint_store=checkpoint_store  # Required for load balancing
)

async def on_event(partition_context, event):
    print(f"Partition {partition_context.partition_id}: {event.body_as_str()}")
    await partition_context.update_checkpoint(event)

async with consumer:
    # Automatically distributes partitions across consumers
    await consumer.receive(on_event=on_event)
```

### Specific Partition

```python
async with consumer:
    await consumer.receive(
        on_event=on_event,
        partition_id="0"  # Only receive from partition 0
    )
```

## Load Balancing Multiple Consumers

When multiple consumers share a consumer group with a checkpoint store, partitions are automatically distributed.

### Example: 3 Consumers, 8 Partitions

```
Consumer 1: Partitions 0, 1, 2
Consumer 2: Partitions 3, 4, 5
Consumer 3: Partitions 6, 7
```

### Partition Ownership Events

```python
async def on_partition_initialize(partition_context):
    """Called when consumer claims a partition."""
    print(f"Initialized partition {partition_context.partition_id}")

async def on_partition_close(partition_context, reason):
    """Called when consumer releases a partition."""
    print(f"Closed partition {partition_context.partition_id}: {reason}")

async with consumer:
    await consumer.receive(
        on_event=on_event,
        on_partition_initialize=on_partition_initialize,
        on_partition_close=on_partition_close
    )
```

### Close Reasons

| Reason | Description |
|--------|-------------|
| `SHUTDOWN` | Consumer is closing normally |
| `OWNERSHIP_LOST` | Another consumer claimed this partition |

## Partition Context Properties

```python
async def on_event(partition_context, event):
    # Partition info
    print(f"Partition ID: {partition_context.partition_id}")
    print(f"Consumer Group: {partition_context.consumer_group}")
    print(f"Event Hub: {partition_context.eventhub_name}")
    print(f"Namespace: {partition_context.fully_qualified_namespace}")

    # Last enqueued event (if tracking enabled)
    if partition_context.last_enqueued_event_properties:
        props = partition_context.last_enqueued_event_properties
        print(f"Last sequence: {props['sequence_number']}")
        print(f"Last offset: {props['offset']}")
        print(f"Last enqueued: {props['enqueued_time']}")
```

## Track Partition Health

```python
async def on_event(partition_context, event):
    props = partition_context.last_enqueued_event_properties

    if props:
        # Calculate lag
        current_seq = event.sequence_number
        last_seq = props['sequence_number']
        lag = last_seq - current_seq

        if lag > 1000:
            print(f"WARNING: Partition {partition_context.partition_id} lag: {lag}")
```

## Parallel Partition Processing

```python
import asyncio
from azure.eventhub.aio import EventHubConsumerClient

async def process_partition(consumer, partition_id: str):
    """Process a single partition."""
    async def on_event(partition_context, event):
        await process_event(event)
        await partition_context.update_checkpoint(event)

    await consumer.receive(
        on_event=on_event,
        partition_id=partition_id
    )

async def parallel_consume():
    consumer = EventHubConsumerClient(...)

    async with consumer:
        # Get all partitions
        props = await consumer.get_eventhub_properties()

        # Start parallel tasks for each partition
        tasks = [
            process_partition(consumer, pid)
            for pid in props['partition_ids']
        ]

        await asyncio.gather(*tasks)
```

## Partition-Aware Batching

```python
class PartitionBatcher:
    """Batch by key; bound key cardinality/bytes and serialize add/flush externally."""

    def __init__(self, producer):
        self.producer = producer
        self.batches: dict[str, any] = {}

    async def add(self, event: EventData, partition_key: str):
        if partition_key not in self.batches:
            self.batches[partition_key] = await self.producer.create_batch(
                partition_key=partition_key
            )

        try:
            self.batches[partition_key].add(event)
        except ValueError:
            # Batch full, send and create new
            await self.producer.send_batch(self.batches[partition_key])
            self.batches[partition_key] = await self.producer.create_batch(
                partition_key=partition_key
            )
            self.batches[partition_key].add(event)

    async def flush(self):
        for batch in self.batches.values():
            if batch:
                await self.producer.send_batch(batch)
        self.batches.clear()
```

## Starting Positions

```python
from azure.eventhub import EventHubConsumerClient

# From beginning
await consumer.receive(
    on_event=on_event,
    starting_position="-1"  # Beginning of stream
)

# From end (new events only)
await consumer.receive(
    on_event=on_event,
    starting_position="@latest"
)

# From specific offset
await consumer.receive(
    on_event=on_event,
    starting_position="12345"  # Specific offset
)

# From specific time
from datetime import datetime, timezone
start_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
await consumer.receive(
    on_event=on_event,
    starting_position=start_time
)

# Different positions per partition
await consumer.receive(
    on_event=on_event,
    starting_position={
        "0": "-1",      # Partition 0 from beginning
        "1": "@latest", # Partition 1 from end
        "2": "5000"     # Partition 2 from offset 5000
    }
)
```

## Monitoring Partition Distribution

```python
class PartitionMonitor:
    def __init__(self):
        self.owned_partitions: set[str] = set()
        self.event_counts: dict[str, int] = {}

    async def on_partition_initialize(self, partition_context):
        self.owned_partitions.add(partition_context.partition_id)
        print(f"Now own partitions: {self.owned_partitions}")

    async def on_partition_close(self, partition_context, reason):
        self.owned_partitions.discard(partition_context.partition_id)
        print(f"Released {partition_context.partition_id}: {reason}")

    async def on_event(self, partition_context, event):
        pid = partition_context.partition_id
        self.event_counts[pid] = self.event_counts.get(pid, 0) + 1

        # Log distribution every 1000 events
        total = sum(self.event_counts.values())
        if total % 1000 == 0:
            print(f"Event distribution: {self.event_counts}")
```

## Best Practices

1. **Use partition keys** for related events that need ordering
2. **Avoid explicit partition IDs** unless you have a specific reason
3. **Scale consumers** with partitions — aim for 1 consumer per partition max
4. **Monitor lag** — track difference between enqueued and processed events
5. **Handle ownership changes** — design for partitions moving between consumers
6. **Use checkpoint stores** for automatic load balancing
7. **Start from checkpoint** — let checkpoint store manage starting position
8. **Partition count depends on tier** — Premium/Dedicated can increase but not decrease; repartitioning changes key mapping and may affect ordering

## Partition Limits

Historical planning figures only; verify [current tier limits and partition guidance](https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-features) before provisioning. Do not treat these figures as a throughput guarantee.

| Limit | Value |
|-------|-------|
| Min partitions | 1 |
| Max partitions (Standard) | 32 |
| Max partitions (Premium/Dedicated) | 100+ |
| Max throughput per partition | ~1 MB/s or ~1000 events/s |
