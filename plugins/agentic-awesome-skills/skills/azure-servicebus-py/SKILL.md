---
name: azure-servicebus-py
description: Azure Service Bus SDK for Python messaging. Use for queues, topics, subscriptions, and enterprise messaging patterns.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Service Bus SDK for Python

Enterprise messaging for reliable cloud communication with queues and pub/sub topics.

## Installation

```bash
pip install azure-servicebus azure-identity
```

## Environment Variables

```bash
SERVICEBUS_FULLY_QUALIFIED_NAMESPACE=<namespace>.servicebus.windows.net
SERVICEBUS_QUEUE_NAME=myqueue
SERVICEBUS_TOPIC_NAME=mytopic
SERVICEBUS_SUBSCRIPTION_NAME=mysubscription
```

## Authentication

```python
from azure.identity import DefaultAzureCredential
from azure.servicebus import ServiceBusClient

credential = DefaultAzureCredential()
namespace = "<namespace>.servicebus.windows.net"

client = ServiceBusClient(
    fully_qualified_namespace=namespace,
    credential=credential
)
```

## Client Types

| Client | Purpose | Get From |
|--------|---------|----------|
| `ServiceBusClient` | Connection management | Direct instantiation |
| `ServiceBusSender` | Send messages | `client.get_queue_sender()` / `get_topic_sender()` |
| `ServiceBusReceiver` | Receive messages | `client.get_queue_receiver()` / `get_subscription_receiver()` |

## Send Messages (Async)

```python
import asyncio
from azure.servicebus.aio import ServiceBusClient
from azure.servicebus import ServiceBusMessage
from azure.identity.aio import DefaultAzureCredential

async def send_messages():
    credential = DefaultAzureCredential()
    
    async with ServiceBusClient(
        fully_qualified_namespace="<namespace>.servicebus.windows.net",
        credential=credential
    ) as client:
        sender = client.get_queue_sender(queue_name="myqueue")
        
        async with sender:
            # Single message
            message = ServiceBusMessage("Hello, Service Bus!")
            await sender.send_messages(message)
            
            # Batch of messages
            messages = [ServiceBusMessage(f"Message {i}") for i in range(10)]
            await sender.send_messages(messages)
            
            # Message batch (for size control)
            batch = await sender.create_message_batch()
            for i in range(100):
                try:
                    batch.add_message(ServiceBusMessage(f"Batch message {i}"))
                except ValueError:  # Batch full
                    await sender.send_messages(batch)
                    batch = await sender.create_message_batch()
                    batch.add_message(ServiceBusMessage(f"Batch message {i}"))
            await sender.send_messages(batch)

asyncio.run(send_messages())
```

## Receive Messages (Async)

```python
async def receive_messages():
    credential = DefaultAzureCredential()
    
    async with ServiceBusClient(
        fully_qualified_namespace="<namespace>.servicebus.windows.net",
        credential=credential
    ) as client:
        receiver = client.get_queue_receiver(queue_name="myqueue")
        
        async with receiver:
            # Receive batch
            messages = await receiver.receive_messages(
                max_message_count=10,
                max_wait_time=5  # seconds
            )
            
            for msg in messages:
                print(f"Received: {str(msg)}")
                await receiver.complete_message(msg)  # Remove from queue

asyncio.run(receive_messages())
```

## Receive Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `PEEK_LOCK` (default) | Message locked, must complete/abandon | Reliable processing |
| `RECEIVE_AND_DELETE` | Removed immediately on receive | At-most-once delivery |

```python
from azure.servicebus import ServiceBusReceiveMode

receiver = client.get_queue_receiver(
    queue_name="myqueue",
    receive_mode=ServiceBusReceiveMode.RECEIVE_AND_DELETE
)
```

## Message Settlement

```python
async with receiver:
    messages = await receiver.receive_messages(max_message_count=1)
    
    for msg in messages:
        try:
            # Process message...
            await receiver.complete_message(msg)  # Success - remove from queue
        except ProcessingError:
            await receiver.abandon_message(msg)  # Retry later
        except PermanentError:
            await receiver.dead_letter_message(
                msg,
                reason="ProcessingFailed",
                error_description="Could not process"
            )
```

| Action | Effect |
|--------|--------|
| `complete_message()` | Remove from queue (success) |
| `abandon_message()` | Release lock, retry immediately |
| `dead_letter_message()` | Move to dead-letter queue |
| `defer_message()` | Set aside, receive by sequence number |

## Topics and Subscriptions

```python
# Send to topic
sender = client.get_topic_sender(topic_name="mytopic")
async with sender:
    await sender.send_messages(ServiceBusMessage("Topic message"))

# Receive from subscription
receiver = client.get_subscription_receiver(
    topic_name="mytopic",
    subscription_name="mysubscription"
)
async with receiver:
    messages = await receiver.receive_messages(max_message_count=10)
```

## Sessions (FIFO)

```python
# Send with session
message = ServiceBusMessage("Session message")
message.session_id = "order-123"
await sender.send_messages(message)

# Receive from specific session
receiver = client.get_queue_receiver(
    queue_name="session-queue",
    session_id="order-123"
)

# Receive from next available session
from azure.servicebus import NEXT_AVAILABLE_SESSION
receiver = client.get_queue_receiver(
    queue_name="session-queue",
    session_id=NEXT_AVAILABLE_SESSION
)
```

## Scheduled Messages

```python
from datetime import datetime, timedelta, timezone

message = ServiceBusMessage("Scheduled message")
scheduled_time = datetime.now(timezone.utc) + timedelta(minutes=10)

# Schedule message
sequence_number = await sender.schedule_messages(message, scheduled_time)

# Cancel scheduled message
await sender.cancel_scheduled_messages(sequence_number)
```

## Dead-Letter Queue

```python
from azure.servicebus import ServiceBusSubQueue

# Receive from dead-letter queue
dlq_receiver = client.get_queue_receiver(
    queue_name="myqueue",
    sub_queue=ServiceBusSubQueue.DEAD_LETTER
)

async with dlq_receiver:
    messages = await dlq_receiver.receive_messages(max_message_count=10)
    for msg in messages:
        print(f"Dead-lettered: {msg.dead_letter_reason}")
        await dlq_receiver.complete_message(msg)
```

## Sync Client (for simple scripts)

```python
from azure.servicebus import ServiceBusClient, ServiceBusMessage
from azure.identity import DefaultAzureCredential

with ServiceBusClient(
    fully_qualified_namespace="<namespace>.servicebus.windows.net",
    credential=DefaultAzureCredential()
) as client:
    with client.get_queue_sender("myqueue") as sender:
        sender.send_messages(ServiceBusMessage("Sync message"))
    
    with client.get_queue_receiver("myqueue") as receiver:
        for msg in receiver:
            print(str(msg))
            receiver.complete_message(msg)
```

## Best Practices

1. **Use async client** for production workloads
2. **Use context managers** (`async with`) for proper cleanup
3. **Complete messages** after successful processing
4. **Use dead-letter queue** for poison messages
5. **Use sessions** for ordered, FIFO processing
6. **Use message batches** for high-throughput scenarios
7. **Set `max_wait_time`** to avoid infinite blocking

## Reference Files

| File | Contents |
|------|----------|
| references/patterns.md | Competing consumers, sessions, retry patterns, request-response, transactions |
| references/dead-letter.md | DLQ handling, poison messages, reprocessing strategies |
| scripts/setup_servicebus.py | CLI for queue/topic/subscription management and DLQ monitoring |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
