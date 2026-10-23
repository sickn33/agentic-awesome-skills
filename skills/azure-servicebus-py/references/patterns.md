# Messaging Patterns Reference

Advanced messaging sketches for Azure Service Bus. Use an explicitly supplied destination rather than trusting reply_to from a message. Validate body type before copying: DATA bodies may need b"".join(msg.body), while VALUE/SEQUENCE bodies require type-specific handling. Preserve IDs, sessions and required properties explicitly, bound retries, close credentials, and protect sensitive logs. Request/response listener concurrency and shared-client use need application-level coordination.

## Competing Consumers

Multiple receivers processing messages from the same queue in parallel:

```python
import asyncio
from azure.servicebus.aio import ServiceBusClient
from azure.identity.aio import DefaultAzureCredential

async def worker(worker_id: int, namespace: str, queue_name: str):
    """Worker that processes messages from a shared queue."""
    credential = DefaultAzureCredential()

    async with ServiceBusClient(
        fully_qualified_namespace=namespace,
        credential=credential
    ) as client:
        receiver = client.get_queue_receiver(queue_name=queue_name)

        async with receiver:
            while True:
                messages = await receiver.receive_messages(
                    max_message_count=10,
                    max_wait_time=5
                )

                if not messages:
                    continue

                for msg in messages:
                    try:
                        print(f"Worker {worker_id}: Processing {str(msg)}")
                        await process_message(msg)
                        await receiver.complete_message(msg)
                    except Exception as e:
                        print(f"Worker {worker_id}: Error - {e}")
                        await receiver.abandon_message(msg)

async def run_workers(num_workers: int, namespace: str, queue_name: str):
    """Run multiple workers concurrently."""
    workers = [
        worker(i, namespace, queue_name)
        for i in range(num_workers)
    ]
    await asyncio.gather(*workers)

# Run 5 competing consumers
asyncio.run(run_workers(5, "myns.servicebus.windows.net", "work-queue"))
```

## Message Sessions (Ordered Processing)

Sessions ensure FIFO ordering for related messages:

```python
from azure.servicebus import ServiceBusMessage, NEXT_AVAILABLE_SESSION
from azure.servicebus.aio import ServiceBusClient

async def send_order_messages(sender, order_id: str, items: list[str]):
    """Send order items as session messages (processed in order)."""
    for i, item in enumerate(items):
        message = ServiceBusMessage(
            body=item,
            session_id=order_id,
            message_id=f"{order_id}-{i}"
        )
        # Messages with same session_id processed in send order
        await sender.send_messages(message)

async def process_order_session(client, queue_name: str):
    """Process one session's messages in order."""
    # Get next available session
    receiver = client.get_queue_receiver(
        queue_name=queue_name,
        session_id=NEXT_AVAILABLE_SESSION,
        max_wait_time=30
    )

    async with receiver:
        session = receiver.session
        print(f"Processing session: {session.session_id}")

        # Set session state (for checkpointing)
        await session.set_state(b"processing")

        async for msg in receiver:
            print(f"  Item: {str(msg)}")
            await receiver.complete_message(msg)

        # Mark session complete
        await session.set_state(b"completed")
        print(f"Session {session.session_id} completed")

async def session_worker(client, queue_name: str):
    """Continuously process sessions."""
    while True:
        try:
            await process_order_session(client, queue_name)
        except Exception as e:
            if "No session available" in str(e):
                await asyncio.sleep(1)  # Wait for new sessions
            else:
                raise
```

## Retry Patterns

### Automatic Retry with Max Delivery Count

Service Bus automatically retries abandoned messages up to `maxDeliveryCount`:

```python
async def process_with_retry_tracking(receiver, msg):
    """Process message with delivery count awareness."""
    delivery_count = msg.delivery_count
    max_retries = 5  # Should match queue's maxDeliveryCount

    print(f"Processing message (attempt {delivery_count}/{max_retries})")

    try:
        await process_message(msg)
        await receiver.complete_message(msg)
    except TransientError:
        if delivery_count >= max_retries - 1:
            # Last retry - dead-letter with context
            await receiver.dead_letter_message(
                msg,
                reason="MaxRetriesExceeded",
                error_description=f"Failed after {delivery_count} attempts"
            )
        else:
            # Abandon for automatic retry
            await receiver.abandon_message(msg)
    except PermanentError as e:
        # Immediate dead-letter for non-retryable errors
        await receiver.dead_letter_message(
            msg,
            reason="PermanentFailure",
            error_description=str(e)
        )
```

### Exponential Backoff with Scheduled Retry

```python
from datetime import datetime, timedelta, timezone

async def process_with_backoff(client, receiver, msg):
    """Retry with exponential backoff using scheduled messages."""
    retry_count = int((msg.application_properties or {}).get("retry_count", 0))
    max_retries = 5

    try:
        await process_message(msg)
        await receiver.complete_message(msg)
    except TransientError:
        if retry_count >= max_retries:
            await receiver.dead_letter_message(
                msg,
                reason="MaxRetriesExceeded",
                error_description=f"Failed after {retry_count} retries"
            )
            return

        # Calculate backoff: 2^retry seconds (1, 2, 4, 8, 16 seconds)
        backoff_seconds = 2 ** retry_count
        retry_time = datetime.now(timezone.utc) + timedelta(seconds=backoff_seconds)

        # Create retry message with incremented count
        retry_message = ServiceBusMessage(
            body=msg.body,
            application_properties={
                **dict(msg.application_properties or {}),
                "retry_count": retry_count + 1,
                "original_enqueue_time": str(msg.enqueued_time_utc)
            }
        )

        # Schedule before completing to avoid loss; duplicates remain possible.
        sender = client.get_queue_sender(queue_name=receiver.entity_path)
        async with sender:
            await sender.schedule_messages(retry_message, retry_time)
        await receiver.complete_message(msg)

        print(f"Scheduled retry {retry_count + 1} for {retry_time}")
```

## Request-Response Pattern

Using reply queues for synchronous-style communication:

```python
import uuid
from asyncio import Event, wait_for

class RequestResponseClient:
    """Send requests and wait for correlated responses."""

    def __init__(self, client, request_queue: str, response_queue: str):
        self.client = client
        self.request_queue = request_queue
        self.response_queue = response_queue
        self.pending_requests: dict[str, tuple[Event, dict]] = {}

    async def start_response_listener(self):
        """Background task to receive responses."""
        receiver = self.client.get_queue_receiver(
            queue_name=self.response_queue
        )

        async with receiver:
            async for msg in receiver:
                correlation_id = msg.correlation_id
                if correlation_id in self.pending_requests:
                    event, result = self.pending_requests[correlation_id]
                    result["response"] = msg.body
                    event.set()
                await receiver.complete_message(msg)

    async def send_request(self, body: str, timeout: float = 30.0) -> bytes:
        """Send request and wait for response."""
        message_id = str(uuid.uuid4())
        event = Event()
        result = {}
        self.pending_requests[message_id] = (event, result)

        try:
            # Send request with reply-to
            message = ServiceBusMessage(
                body=body,
                message_id=message_id,
                reply_to=self.response_queue
            )

            sender = self.client.get_queue_sender(self.request_queue)
            async with sender:
                await sender.send_messages(message)

            # Wait for response
            await wait_for(event.wait(), timeout=timeout)
            return result["response"]
        finally:
            del self.pending_requests[message_id]

# Request processor (server side)
async def process_requests(client, request_queue: str):
    """Process requests and send responses."""
    receiver = client.get_queue_receiver(queue_name=request_queue)

    async with receiver:
        async for msg in receiver:
            # Process request
            response_body = f"Processed: {str(msg.body)}"

            # Send response to reply_to queue
            if msg.reply_to:
                response = ServiceBusMessage(
                    body=response_body,
                    correlation_id=msg.message_id
                )

                sender = client.get_queue_sender(queue_name=msg.reply_to)
                async with sender:
                    await sender.send_messages(response)

            await receiver.complete_message(msg)
```

## Pub/Sub with Filters

Topics with filtered subscriptions:

```python
# Publisher sends messages with properties
async def publish_events(sender, events: list[dict]):
    """Publish events with filterable properties."""
    for event in events:
        message = ServiceBusMessage(
            body=json.dumps(event["data"]),
            application_properties={
                "event_type": event["type"],
                "priority": event["priority"],
                "region": event["region"]
            }
        )
        await sender.send_messages(message)

# Subscribers receive filtered messages
# (Filters configured via Azure Portal or Management SDK)
#
# Subscription "high-priority": SqlFilter("priority = 'high'")
# Subscription "us-region": SqlFilter("region = 'us'")
# Subscription "orders": CorrelationFilter(label='order')

async def subscribe_high_priority(client, topic: str):
    """Receive only high-priority messages."""
    receiver = client.get_subscription_receiver(
        topic_name=topic,
        subscription_name="high-priority"
    )

    async with receiver:
        async for msg in receiver:
            print(f"High priority: {str(msg)}")
            await receiver.complete_message(msg)
```

## Forwarding and transaction boundaries

Do not infer an atomic transaction API from service-level transaction support. Verify the installed Python SDK's documented methods; this guide does not provide a verified transaction implementation. Sending and then completing in separate calls can duplicate delivery after a crash; completing first can lose a message. Use an idempotent outbox/inbox strategy or an explicitly supported transaction client when atomicity is required.

## Batch Processing with Prefetch

Optimize throughput with prefetching:

```python
async def batch_processor(client, queue_name: str, batch_size: int = 100):
    """Process messages in batches with prefetch."""
    receiver = client.get_queue_receiver(
        queue_name=queue_name,
        prefetch_count=batch_size * 2  # Prefetch 2x batch size
    )

    async with receiver:
        while True:
            messages = await receiver.receive_messages(
                max_message_count=batch_size,
                max_wait_time=5
            )

            if not messages:
                continue

            # Process batch
            results = await process_batch([str(m.body) for m in messages])

            # Complete successful, abandon failed
            for msg, success in zip(messages, results):
                if success:
                    await receiver.complete_message(msg)
                else:
                    await receiver.abandon_message(msg)
```

## Message Properties Reference

| Property | Type | Description |
|----------|------|-------------|
| `message_id` | str | Unique message identifier |
| `session_id` | str | Session identifier for FIFO |
| `correlation_id` | str | For request-response correlation |
| `reply_to` | str | Queue for responses |
| `reply_to_session_id` | str | Session ID for responses |
| `subject` | str | Message label/type |
| `to` | str | Destination hint |
| `content_type` | str | MIME type (e.g., "application/json") |
| `time_to_live` | timedelta | Message expiration |
| `scheduled_enqueue_time_utc` | datetime | Scheduled delivery time |
| `application_properties` | dict | Custom key-value pairs |

## Best Practices Summary

| Pattern | When to Use |
|---------|-------------|
| Competing Consumers | Scale message processing horizontally |
| Sessions | Ordered processing for related messages |
| Scheduled Messages | Delayed delivery, exponential backoff |
| Request-Response | Synchronous-style communication |
| Topics/Filters | Pub/sub with selective routing |
| Transactions | Verify SDK support and use a tested transactional design |
| Prefetch | High-throughput batch processing |
