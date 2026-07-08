---
name: azure-messaging-webpubsubservice-py
description: Azure Web PubSub Service SDK for Python. Use for real-time messaging, WebSocket connections, and pub/sub patterns.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Web PubSub Service SDK for Python

Real-time messaging with WebSocket connections at scale.

## Installation

```bash
# Service SDK (server-side)
pip install azure-messaging-webpubsubservice

# Client SDK (for Python WebSocket clients)
pip install azure-messaging-webpubsubclient
```

## Environment Variables

```bash
AZURE_WEBPUBSUB_CONNECTION_STRING=Endpoint=https://<name>.webpubsub.azure.com;AccessKey=...
AZURE_WEBPUBSUB_HUB=my-hub
```

## Service Client (Server-Side)

### Authentication

```python
from azure.messaging.webpubsubservice import WebPubSubServiceClient

# Connection string
client = WebPubSubServiceClient.from_connection_string(
    connection_string=os.environ["AZURE_WEBPUBSUB_CONNECTION_STRING"],
    hub="my-hub"
)

# Entra ID
from azure.identity import DefaultAzureCredential

client = WebPubSubServiceClient(
    endpoint="https://<name>.webpubsub.azure.com",
    hub="my-hub",
    credential=DefaultAzureCredential()
)
```

### Generate Client Access Token

```python
# Token for anonymous user
token = client.get_client_access_token()
print(f"URL: {token['url']}")

# Token with user ID
token = client.get_client_access_token(
    user_id="user123",
    roles=["webpubsub.sendToGroup", "webpubsub.joinLeaveGroup"]
)

# Token with groups
token = client.get_client_access_token(
    user_id="user123",
    groups=["group1", "group2"]
)
```

### Send to All Clients

```python
# Send text
client.send_to_all(message="Hello everyone!", content_type="text/plain")

# Send JSON
client.send_to_all(
    message={"type": "notification", "data": "Hello"},
    content_type="application/json"
)
```

### Send to User

```python
client.send_to_user(
    user_id="user123",
    message="Hello user!",
    content_type="text/plain"
)
```

### Send to Group

```python
client.send_to_group(
    group="my-group",
    message="Hello group!",
    content_type="text/plain"
)
```

### Send to Connection

```python
client.send_to_connection(
    connection_id="abc123",
    message="Hello connection!",
    content_type="text/plain"
)
```

### Group Management

```python
# Add user to group
client.add_user_to_group(group="my-group", user_id="user123")

# Remove user from group
client.remove_user_from_group(group="my-group", user_id="user123")

# Add connection to group
client.add_connection_to_group(group="my-group", connection_id="abc123")

# Remove connection from group
client.remove_connection_from_group(group="my-group", connection_id="abc123")
```

### Connection Management

```python
# Check if connection exists
exists = client.connection_exists(connection_id="abc123")

# Check if user has connections
exists = client.user_exists(user_id="user123")

# Check if group has connections
exists = client.group_exists(group="my-group")

# Close connection
client.close_connection(connection_id="abc123", reason="Session ended")

# Close all connections for user
client.close_all_connections(user_id="user123")
```

### Grant/Revoke Permissions

```python
from azure.messaging.webpubsubservice import WebPubSubServiceClient

# Grant permission
client.grant_permission(
    permission="joinLeaveGroup",
    connection_id="abc123",
    target_name="my-group"
)

# Revoke permission
client.revoke_permission(
    permission="joinLeaveGroup",
    connection_id="abc123",
    target_name="my-group"
)

# Check permission
has_permission = client.check_permission(
    permission="joinLeaveGroup",
    connection_id="abc123",
    target_name="my-group"
)
```

## Client SDK (Python WebSocket Client)

```python
from azure.messaging.webpubsubclient import WebPubSubClient

client = WebPubSubClient(credential=token["url"])

# Event handlers
@client.on("connected")
def on_connected(e):
    print(f"Connected: {e.connection_id}")

@client.on("server-message")
def on_message(e):
    print(f"Message: {e.data}")

@client.on("group-message")
def on_group_message(e):
    print(f"Group {e.group}: {e.data}")

# Connect and send
client.open()
client.send_to_group("my-group", "Hello from Python!")
```

## Async Service Client

```python
from azure.messaging.webpubsubservice.aio import WebPubSubServiceClient
from azure.identity.aio import DefaultAzureCredential

async def broadcast():
    credential = DefaultAzureCredential()
    client = WebPubSubServiceClient(
        endpoint="https://<name>.webpubsub.azure.com",
        hub="my-hub",
        credential=credential
    )
    
    await client.send_to_all("Hello async!", content_type="text/plain")
    
    await client.close()
    await credential.close()
```

## Client Operations

| Operation | Description |
|-----------|-------------|
| `get_client_access_token` | Generate WebSocket connection URL |
| `send_to_all` | Broadcast to all connections |
| `send_to_user` | Send to specific user |
| `send_to_group` | Send to group members |
| `send_to_connection` | Send to specific connection |
| `add_user_to_group` | Add user to group |
| `remove_user_from_group` | Remove user from group |
| `close_connection` | Disconnect client |
| `connection_exists` | Check connection status |

## Best Practices

1. **Use roles** to limit client permissions
2. **Use groups** for targeted messaging
3. **Generate short-lived tokens** for security
4. **Use user IDs** to send to users across connections
5. **Handle reconnection** in client applications
6. **Use JSON** content type for structured data
7. **Close connections** gracefully with reasons

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
