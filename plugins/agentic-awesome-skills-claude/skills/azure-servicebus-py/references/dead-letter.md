# Dead-Letter Queue Reference

Handling poison messages and dead-letter queue processing in Azure Service Bus. These sketches require application handlers/imports and type-aware body serialization. Peek before replay/discard, redact payloads and exception details, preserve session/identity properties, bound replays and implement idempotency: send plus complete is not atomic. Close async credentials. A failed send or settlement with unknown outcome requires reconciliation before retry. Counts from peek are sample counts, not total queue counts.

## Dead-Letter Queue Overview

The dead-letter queue (DLQ) is a secondary sub-queue for messages that cannot be processed:

```
Main Queue: myqueue
   └── Dead-Letter Queue: myqueue/$deadletterqueue
```

## Why Messages Get Dead-Lettered

| Reason | Description |
|--------|-------------|
| `MaxDeliveryCountExceeded` | Message abandoned too many times |
| `HeaderSizeExceeded` | Message headers too large |
| `TTLExpiration` | Message expired before delivery |
| `SessionIdMismatch` | Session ID doesn't match |
| `MessageSizeExceeded` | Message body too large |
| Custom reason | Explicitly dead-lettered by application |

## Receiving from Dead-Letter Queue

```python
from azure.servicebus import ServiceBusSubQueue
from azure.servicebus.aio import ServiceBusClient
from azure.identity.aio import DefaultAzureCredential

async def receive_dead_letters(namespace: str, queue_name: str):
    """Receive messages from dead-letter queue."""
    credential = DefaultAzureCredential()

    async with ServiceBusClient(
        fully_qualified_namespace=namespace,
        credential=credential
    ) as client:
        # Get dead-letter queue receiver
        dlq_receiver = client.get_queue_receiver(
            queue_name=queue_name,
            sub_queue=ServiceBusSubQueue.DEAD_LETTER
        )

        async with dlq_receiver:
            messages = await dlq_receiver.receive_messages(
                max_message_count=10,
                max_wait_time=5
            )

            for msg in messages:
                print(f"Dead-letter message: {str(msg)}")
                print(f"  Reason: {msg.dead_letter_reason}")
                print(f"  Description: {msg.dead_letter_error_description}")
                print(f"  Enqueued: {msg.enqueued_time_utc}")
                print(f"  Delivery count: {msg.delivery_count}")

                # Inspect only: leave unprocessed messages in the DLQ.
                await dlq_receiver.abandon_message(msg)
```

## Explicit Dead-Lettering

Dead-letter messages programmatically for non-retryable errors:

```python
async def process_with_dead_letter(receiver, msg):
    """Process message and dead-letter on permanent failures."""
    try:
        result = await process_message(msg)
        await receiver.complete_message(msg)
        return result

    except ValidationError as e:
        # Invalid message format - don't retry
        await receiver.dead_letter_message(
            msg,
            reason="ValidationFailed",
            error_description=f"Invalid format: {e}"
        )

    except DuplicateError as e:
        # Already processed - dead-letter with context
        await receiver.dead_letter_message(
            msg,
            reason="DuplicateDetected",
            error_description=f"Message already processed: {e}"
        )

    except ExternalServiceUnavailable:
        # Temporary - abandon for retry
        await receiver.abandon_message(msg)

    except Exception as e:
        # Unknown error - dead-letter with full context
        await receiver.dead_letter_message(
            msg,
            reason="UnhandledException",
            error_description=f"{type(e).__name__}: {str(e)}"
        )
```

## Dead-Letter Queue Processor

Automated processing of dead-lettered messages:

```python
import json
from datetime import datetime, timezone

class DeadLetterProcessor:
    """Process and analyze dead-lettered messages."""

    def __init__(self, client, queue_name: str):
        self.client = client
        self.queue_name = queue_name

    async def process_dlq(self, handler_map: dict = None):
        """Process DLQ messages with reason-specific handlers."""
        handler_map = handler_map or {}

        receiver = self.client.get_queue_receiver(
            queue_name=self.queue_name,
            sub_queue=ServiceBusSubQueue.DEAD_LETTER
        )

        async with receiver:
            while True:
                messages = await receiver.receive_messages(
                    max_message_count=10,
                    max_wait_time=5
                )

                if not messages:
                    break

                for msg in messages:
                    reason = msg.dead_letter_reason or "Unknown"
                    handler = handler_map.get(reason, self.default_handler)

                    try:
                        await handler(msg, receiver)
                    except Exception as e:
                        print(f"Error handling DLQ message: {e}")
                        # Leave message in DLQ; stop instead of immediately receiving it forever.
                        raise

    async def default_handler(self, msg, receiver):
        """Default: retain for manual review, then stop this run."""
        print(f"DLQ Message: {msg.message_id}")
        print(f"  Reason: {msg.dead_letter_reason}")
        print(f"  Body: {str(msg.body)[:100]}...")
        raise RuntimeError("No authorized handler; retain message and stop the processor")

    async def retry_handler(self, msg, receiver):
        """Retry message by sending back to main queue."""
        sender = self.client.get_queue_sender(queue_name=self.queue_name)

        async with sender:
            # Create new message from DLQ message
            retry_msg = ServiceBusMessage(
                body=msg.body,
                application_properties={
                    **(msg.application_properties or {}),
                    "dlq_retry": True,
                    "dlq_reason": msg.dead_letter_reason,
                    "dlq_retry_time": datetime.now(timezone.utc).isoformat()
                }
            )
            await sender.send_messages(retry_msg)

        await receiver.complete_message(msg)
        print(f"Retried message: {msg.message_id}")

    async def archive_handler(self, msg, receiver):
        """Archive message to storage for analysis."""
        archive_data = {
            "message_id": msg.message_id,
            "body": str(msg.body),
            "dead_letter_reason": msg.dead_letter_reason,
            "dead_letter_error_description": msg.dead_letter_error_description,
            "enqueued_time": str(msg.enqueued_time_utc),
            "delivery_count": msg.delivery_count,
            "application_properties": dict(msg.application_properties or {})
        }

        # Save to blob storage, database, etc.
        await archive_to_storage(archive_data)
        await receiver.complete_message(msg)

# Usage
processor = DeadLetterProcessor(client, "myqueue")
await processor.process_dlq({
    "MaxDeliveryCountExceeded": processor.retry_handler,
    "ValidationFailed": processor.archive_handler,
})
```

## Reprocessing Strategies

### Selective Retry Based on Age

```python
from datetime import datetime, timedelta, timezone

async def retry_recent_messages(client, queue_name: str, max_age_hours: int = 24):
    """Retry only recently dead-lettered messages."""
    cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)

    dlq_receiver = client.get_queue_receiver(
        queue_name=queue_name,
        sub_queue=ServiceBusSubQueue.DEAD_LETTER
    )
    sender = client.get_queue_sender(queue_name=queue_name)

    retried = 0
    expired = 0

    async with dlq_receiver, sender:
        while True:
            messages = await dlq_receiver.receive_messages(
                max_message_count=50,
                max_wait_time=5
            )

            if not messages:
                break

            for msg in messages:
                if msg.enqueued_time_utc > cutoff_time:
                    # Recent enough to retry
                    retry_msg = ServiceBusMessage(body=msg.body)
                    await sender.send_messages(retry_msg)
                    retried += 1
                else:
                    # Retain old messages unless a separate discard policy is authorized.
                    expired += 1
                    await dlq_receiver.abandon_message(msg)
                    return

                await dlq_receiver.complete_message(msg)

    print(f"Retried: {retried}, Expired: {expired}")
```

### Retry with Fix

```python
async def retry_with_transform(client, queue_name: str, transformer):
    """Retry messages after applying a fix/transformation."""
    dlq_receiver = client.get_queue_receiver(
        queue_name=queue_name,
        sub_queue=ServiceBusSubQueue.DEAD_LETTER
    )
    sender = client.get_queue_sender(queue_name=queue_name)

    async with dlq_receiver, sender:
        messages = await dlq_receiver.receive_messages(max_message_count=100)

        for msg in messages:
            try:
                # Transform/fix the message
                fixed_body = transformer(msg.body)

                retry_msg = ServiceBusMessage(
                    body=fixed_body,
                    application_properties={
                        "retried_from_dlq": True,
                        "original_message_id": msg.message_id
                    }
                )
                await sender.send_messages(retry_msg)
                await dlq_receiver.complete_message(msg)

            except Exception as e:
                print(f"Could not fix message {msg.message_id}: {e}")
                # Leave in DLQ

# Example transformer: fix JSON encoding issue
def fix_json_encoding(body: bytes) -> bytes:
    text = body.decode('utf-8', errors='replace')
    data = json.loads(text)
    return json.dumps(data).encode('utf-8')

await retry_with_transform(client, "myqueue", fix_json_encoding)
```

## Monitoring Dead-Letter Queues

### Count Dead-Lettered Messages

```python
from azure.servicebus.management.aio import ServiceBusAdministrationClient

async def get_dlq_count(namespace: str, queue_name: str) -> int:
    """Get count of messages in dead-letter queue."""
    admin_client = ServiceBusAdministrationClient(
        fully_qualified_namespace=namespace,
        credential=DefaultAzureCredential()
    )

    async with admin_client:
        runtime_props = await admin_client.get_queue_runtime_properties(queue_name)
        return runtime_props.dead_letter_message_count

# Alert if DLQ has messages
dlq_count = await get_dlq_count("myns.servicebus.windows.net", "myqueue")
if dlq_count > 0:
    print(f"ALERT: {dlq_count} messages in DLQ!")
```

### DLQ Analysis Report

```python
async def analyze_dlq(client, queue_name: str) -> dict:
    """Analyze DLQ contents by reason."""
    analysis = {
        "total": 0,
        "by_reason": {},
        "oldest": None,
        "newest": None
    }

    dlq_receiver = client.get_queue_receiver(
        queue_name=queue_name,
        sub_queue=ServiceBusSubQueue.DEAD_LETTER,
        receive_mode=ServiceBusReceiveMode.PEEK_LOCK
    )

    async with dlq_receiver:
        # Peek without removing
        messages = await dlq_receiver.peek_messages(max_message_count=1000)

        for msg in messages:
            analysis["total"] += 1

            reason = msg.dead_letter_reason or "Unknown"
            analysis["by_reason"][reason] = analysis["by_reason"].get(reason, 0) + 1

            if analysis["oldest"] is None or msg.enqueued_time_utc < analysis["oldest"]:
                analysis["oldest"] = msg.enqueued_time_utc
            if analysis["newest"] is None or msg.enqueued_time_utc > analysis["newest"]:
                analysis["newest"] = msg.enqueued_time_utc

    return analysis

# Generate report
report = await analyze_dlq(client, "myqueue")
print(f"DLQ Analysis for 'myqueue':")
print(f"  Total messages: {report['total']}")
print(f"  Oldest: {report['oldest']}")
print(f"  Newest: {report['newest']}")
print(f"  By reason:")
for reason, count in report['by_reason'].items():
    print(f"    {reason}: {count}")
```

## Preventing Dead-Letters

### Increase Max Delivery Count

```python
from azure.servicebus.management.aio import ServiceBusAdministrationClient

async def increase_max_delivery(namespace: str, queue_name: str, max_count: int):
    """Increase max delivery count for a queue."""
    admin_client = ServiceBusAdministrationClient(
        fully_qualified_namespace=namespace,
        credential=DefaultAzureCredential()
    )

    async with admin_client:
        queue = await admin_client.get_queue(queue_name)
        queue.max_delivery_count = max_count
        await admin_client.update_queue(queue)
        print(f"Updated max delivery count to {max_count}")
```

### Implement Proper Error Handling

```python
async def resilient_processor(receiver, msg):
    """Process with proper error categorization."""
    try:
        await process_message(msg)
        await receiver.complete_message(msg)

    except (ConnectionError, TimeoutError):
        # Transient - safe to retry
        await receiver.abandon_message(msg)

    except ValidationError:
        # Bad data - don't retry, dead-letter
        await receiver.dead_letter_message(msg, reason="ValidationError")

    except Exception as e:
        # Unknown - check delivery count
        if msg.delivery_count >= 3:
            # Enough retries, dead-letter with context
            await receiver.dead_letter_message(
                msg,
                reason="ProcessingFailed",
                error_description=f"Failed after {msg.delivery_count} attempts: {e}"
            )
        else:
            # Still have retries left
            await receiver.abandon_message(msg)
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Monitor DLQ counts | Alert when messages appear in DLQ |
| Set appropriate max delivery | Balance between retries and DLQ accumulation |
| Include context | Always provide reason and description when dead-lettering |
| Regular cleanup | Process or archive old DLQ messages |
| Categorize errors | Distinguish retryable vs permanent failures |
| Implement retry handlers | Automate reprocessing where safe |
| Archive for analysis | Keep DLQ data for debugging patterns |
