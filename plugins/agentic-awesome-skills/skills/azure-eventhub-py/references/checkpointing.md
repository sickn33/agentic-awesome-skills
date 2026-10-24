# Checkpointing with Azure Event Hubs

Patterns for reliable event processing with checkpoint stores.

## Why Checkpointing?

A checkpoint records progress, not an atomic transaction with application side effects. Retention can expire events; failover can replay them. Do not checkpoint beyond an unprocessed failure in the same partition: stop/retry that partition or durably quarantine the event under an explicit policy. Swallowing one failure and checkpointing a later event skips it.

Checkpointing tracks which events have been processed, enabling:
- **Resume after failure** — Pick up where you left off
- **Scalable consumers** — Multiple consumers share partition ownership; replay still requires idempotency
- **At-least-once delivery** — Resume from retained events after failure; not an unlimited no-loss guarantee

## Blob Checkpoint Store (Recommended)

```python
from azure.eventhub.aio import EventHubConsumerClient
from azure.eventhub.extensions.checkpointstoreblob.aio import BlobCheckpointStore
from azure.identity.aio import DefaultAzureCredential
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()

# Create checkpoint store
checkpoint_store = BlobCheckpointStore(
    blob_account_url="https://<account>.blob.core.windows.net",
    container_name="checkpoints",
    credential=credential
)

# Consumer with checkpoint store
consumer = EventHubConsumerClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    eventhub_name="my-eventhub",
    consumer_group="$Default",
    credential=credential,
    checkpoint_store=checkpoint_store
)
```

## Async Blob Checkpoint Store

```python
from azure.eventhub.aio import EventHubConsumerClient
from azure.eventhub.extensions.checkpointstoreblob.aio import BlobCheckpointStore
from azure.identity.aio import DefaultAzureCredential

async def create_consumer():
    credential = DefaultAzureCredential()

    checkpoint_store = BlobCheckpointStore(
        blob_account_url="https://<account>.blob.core.windows.net",
        container_name="checkpoints",
        credential=credential
    )

    consumer = EventHubConsumerClient(
        fully_qualified_namespace="<namespace>.servicebus.windows.net",
        eventhub_name="my-eventhub",
        consumer_group="$Default",
        credential=credential,
        checkpoint_store=checkpoint_store
    )

    return consumer
```

## Checkpoint Strategies

### After Every Event (Most Reliable)

```python
async def on_event(partition_context, event):
    """Checkpoint after every event - highest reliability, highest overhead."""
    try:
        await process_event(event)
        await partition_context.update_checkpoint(event)
    except Exception as e:
        # Don't checkpoint on failure - event will be reprocessed
        raise # stop/retry under application policy; do not checkpoint later events past this failure
```

### Batch Checkpointing (Balanced)

```python
class BatchCheckpointer:
    def __init__(self, batch_size: int = 100):
        self.batch_size = batch_size
        self.counts: dict[str, int] = {}

    async def on_event(self, partition_context, event):
        partition_id = partition_context.partition_id

        await process_event(event)

        self.counts[partition_id] = self.counts.get(partition_id, 0) + 1

        if self.counts[partition_id] >= self.batch_size:
            await partition_context.update_checkpoint(event)
            self.counts[partition_id] = 0
            print(f"Checkpointed partition {partition_id}")
```

### Time-Based Checkpointing

```python
import asyncio
from datetime import datetime, timedelta

class TimedCheckpointer:
    def __init__(self, interval_seconds: float = 30.0):
        self.interval = interval_seconds
        self.last_checkpoint: dict[str, datetime] = {}
        self.last_event: dict[str, any] = {}

    async def on_event(self, partition_context, event):
        partition_id = partition_context.partition_id
        now = datetime.utcnow()

        await process_event(event)
        self.last_event[partition_id] = event

        last = self.last_checkpoint.get(partition_id)
        if not last or (now - last).total_seconds() >= self.interval:
            await partition_context.update_checkpoint(event)
            self.last_checkpoint[partition_id] = now
            print(f"Timed checkpoint for partition {partition_id}")
```

### Hybrid Checkpointing (Batch + Time)

```python
class HybridCheckpointer:
    def __init__(self, batch_size: int = 100, interval_seconds: float = 30.0):
        self.batch_size = batch_size
        self.interval = interval_seconds
        self.counts: dict[str, int] = {}
        self.last_checkpoint: dict[str, datetime] = {}

    async def on_event(self, partition_context, event):
        partition_id = partition_context.partition_id
        now = datetime.utcnow()

        await process_event(event)

        self.counts[partition_id] = self.counts.get(partition_id, 0) + 1
        last = self.last_checkpoint.get(partition_id)

        should_checkpoint = (
            self.counts[partition_id] >= self.batch_size or
            (last is None or (now - last).total_seconds() >= self.interval)
        )

        if should_checkpoint:
            await partition_context.update_checkpoint(event)
            self.counts[partition_id] = 0
            self.last_checkpoint[partition_id] = now
```

## Checkpoint on Batch Complete

```python
async def on_event_batch(partition_context, events):
    """Process batch and checkpoint once at the end."""
    if not events:
        return

    for event in events:
        await process_event(event)

    # Checkpoint only the last event
    await partition_context.update_checkpoint(events[-1])
    print(f"Processed {len(events)} events, checkpointed partition {partition_context.partition_id}")

async with consumer:
    await consumer.receive_batch(
        on_event_batch=on_event_batch,
        max_batch_size=100,
        max_wait_time=5.0
    )
```

## Manual Checkpoint Management

```python
from azure.eventhub.extensions.checkpointstoreblob.aio import BlobCheckpointStore

async def inspect_checkpoints(checkpoint_store: BlobCheckpointStore):
    """List all checkpoints for debugging."""
    checkpoints = await checkpoint_store.list_checkpoints(
        fully_qualified_namespace="<namespace>.servicebus.windows.net",
        eventhub_name="my-eventhub",
        consumer_group="$Default"
    )

    for cp in checkpoints:
        print(f"Partition: {cp['partition_id']}")
        print(f"  Offset: {cp['offset']}")
        print(f"  Sequence: {cp['sequence_number']}")
```

## Checkpoint Data Structure

Blob checkpoint stores data in this format:

```
Container: checkpoints
└── <namespace>/<eventhub>/<consumer-group>/checkpoint/
    ├── 0  (partition 0 checkpoint)
    ├── 1  (partition 1 checkpoint)
    └── 2  (partition 2 checkpoint)
```

Each checkpoint blob contains:
```json
{
    "offset": "12345",
    "sequence_number": 100
}
```

## Graceful Shutdown with Final Checkpoint

```python
import signal
import asyncio

class GracefulConsumer:
    def __init__(self, consumer):
        self.consumer = consumer
        self.running = True
        self.last_events: dict[str, any] = {}
        self.partition_contexts: dict[str, any] = {}

    async def on_event(self, partition_context, event):
        if not self.running:
            return

        await process_event(event)

        # Track for final checkpoint
        self.last_events[partition_context.partition_id] = event
        self.partition_contexts[partition_context.partition_id] = partition_context

    async def shutdown(self):
        """Checkpoint all partitions before stopping."""
        self.running = False

        for partition_id, event in self.last_events.items():
            context = self.partition_contexts[partition_id]
            await context.update_checkpoint(event)
            print(f"Final checkpoint for partition {partition_id}")

        await self.consumer.close()

# Usage
consumer = GracefulConsumer(client)

def signal_handler(sig, frame):
    asyncio.create_task(consumer.shutdown())

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)
```

## Error Handling and Retry

```python
async def on_event_with_retry(partition_context, event, max_retries: int = 3):
    """Process with retries, only checkpoint on success."""
    for attempt in range(max_retries):
        try:
            await process_event(event)
            await partition_context.update_checkpoint(event)
            return
        except TransientError as e:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise
        except PermanentError as e:
            # Durably quarantine under an approved policy before any skip; otherwise stop.
            raise
```

## Checkpoint Store Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `blob_account_url` | Storage account URL | Required |
| `container_name` | Blob container for checkpoints | Required |
| `credential` | Auth credential | Required |
| `api_version` | Blob storage API version | Latest |

## Best Practices

1. **Use dedicated container** — Separate checkpoint data from application data
2. **Match consumer groups** — Each consumer group needs its own checkpoints
3. **Balance frequency** — Too frequent = overhead, too rare = reprocessing on failure
4. **Handle idempotency** — Design for at-least-once delivery (events may replay)
5. **Monitor checkpoint lag** — Track time between event enqueue and checkpoint
6. **Test failure scenarios** — Verify resume works correctly after crashes
7. **Use async store** — The async BlobCheckpointStore is more performant
8. **Checkpoint on success only** — Don't checkpoint failed events

## Checkpoint Frequency Guidelines

| Scenario | Strategy | Trade-off |
|----------|----------|-----------|
| Critical data, low volume | Every event | Max reliability, higher latency |
| Normal processing | Every 100 events | Good balance |
| High throughput | Every 30 seconds | Lower overhead, more reprocessing |
| Batch processing | End of batch | Natural fit for batch workloads |
