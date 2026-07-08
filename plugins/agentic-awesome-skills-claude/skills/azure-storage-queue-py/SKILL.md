---
name: azure-storage-queue-py
description: Azure Queue Storage SDK for Python. Use for reliable message queuing, task distribution, and asynchronous processing.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Queue Storage SDK for Python

Simple, cost-effective message queuing for asynchronous communication.

## Installation

```bash
pip install azure-storage-queue azure-identity
```

## Environment Variables

```bash
AZURE_STORAGE_ACCOUNT_URL=https://<account>.queue.core.windows.net
```

## Authentication

```python
from azure.identity import DefaultAzureCredential
from azure.storage.queue import QueueServiceClient, QueueClient

credential = DefaultAzureCredential()
account_url = "https://<account>.queue.core.windows.net"

# Service client
service_client = QueueServiceClient(account_url=account_url, credential=credential)

# Queue client
queue_client = QueueClient(account_url=account_url, queue_name="myqueue", credential=credential)
```

## Queue Operations

```python
# Create queue
service_client.create_queue("myqueue")

# Get queue client
queue_client = service_client.get_queue_client("myqueue")

# Delete queue
service_client.delete_queue("myqueue")

# List queues
for queue in service_client.list_queues():
    print(queue.name)
```

## Send Messages

```python
# Send message (string)
queue_client.send_message("Hello, Queue!")

# Send with options
queue_client.send_message(
    content="Delayed message",
    visibility_timeout=60,  # Hidden for 60 seconds
    time_to_live=3600       # Expires in 1 hour
)

# Send JSON
import json
data = {"task": "process", "id": 123}
queue_client.send_message(json.dumps(data))
```

## Receive Messages

```python
# Receive messages (makes them invisible temporarily)
messages = queue_client.receive_messages(
    messages_per_page=10,
    visibility_timeout=30  # 30 seconds to process
)

for message in messages:
    print(f"ID: {message.id}")
    print(f"Content: {message.content}")
    print(f"Dequeue count: {message.dequeue_count}")
    
    # Process message...
    
    # Delete after processing
    queue_client.delete_message(message)
```

## Peek Messages

```python
# Peek without hiding (doesn't affect visibility)
messages = queue_client.peek_messages(max_messages=5)

for message in messages:
    print(message.content)
```

## Update Message

```python
# Extend visibility or update content
messages = queue_client.receive_messages()
for message in messages:
    # Extend timeout (need more time)
    queue_client.update_message(
        message,
        visibility_timeout=60
    )
    
    # Update content and timeout
    queue_client.update_message(
        message,
        content="Updated content",
        visibility_timeout=60
    )
```

## Delete Message

```python
# Delete after successful processing
messages = queue_client.receive_messages()
for message in messages:
    try:
        # Process...
        queue_client.delete_message(message)
    except Exception:
        # Message becomes visible again after timeout
        pass
```

## Clear Queue

```python
# Delete all messages
queue_client.clear_messages()
```

## Queue Properties

```python
# Get queue properties
properties = queue_client.get_queue_properties()
print(f"Approximate message count: {properties.approximate_message_count}")

# Set/get metadata
queue_client.set_queue_metadata(metadata={"environment": "production"})
properties = queue_client.get_queue_properties()
print(properties.metadata)
```

## Async Client

```python
from azure.storage.queue.aio import QueueServiceClient, QueueClient
from azure.identity.aio import DefaultAzureCredential

async def queue_operations():
    credential = DefaultAzureCredential()
    
    async with QueueClient(
        account_url="https://<account>.queue.core.windows.net",
        queue_name="myqueue",
        credential=credential
    ) as client:
        # Send
        await client.send_message("Async message")
        
        # Receive
        async for message in client.receive_messages():
            print(message.content)
            await client.delete_message(message)

import asyncio
asyncio.run(queue_operations())
```

## Base64 Encoding

```python
from azure.storage.queue import QueueClient, BinaryBase64EncodePolicy, BinaryBase64DecodePolicy

# For binary data
queue_client = QueueClient(
    account_url=account_url,
    queue_name="myqueue",
    credential=credential,
    message_encode_policy=BinaryBase64EncodePolicy(),
    message_decode_policy=BinaryBase64DecodePolicy()
)

# Send bytes
queue_client.send_message(b"Binary content")
```

## Best Practices

1. **Delete messages after processing** to prevent reprocessing
2. **Set appropriate visibility timeout** based on processing time
3. **Handle `dequeue_count`** for poison message detection
4. **Use async client** for high-throughput scenarios
5. **Use `peek_messages`** for monitoring without affecting queue
6. **Set `time_to_live`** to prevent stale messages
7. **Consider Service Bus** for advanced features (sessions, topics)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
