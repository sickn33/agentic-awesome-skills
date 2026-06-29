# Async Client Usage

Guide for using the Weaviate Python async client in production applications (FastAPI, async frameworks).

## 📚 Official Documentation Reference

**For agents:** If you encounter any issues not covered here, refer to the official Weaviate documentation:

- **Primary Reference**: [Weaviate Async API Documentation](https://docs.weaviate.io/weaviate/client-libraries/python/async)
- **Python Client Reference**: [Weaviate Python Client Docs](https://docs.weaviate.io/weaviate/client-libraries/python)
- **API Reference**: [ReadTheDocs - Python Client](https://weaviate-python-client.readthedocs.io/en/stable/)
- **Troubleshooting**: [Community Forum](https://forum.weaviate.io/) | [GitHub Issues](https://github.com/weaviate/weaviate-python-client/issues)

> **Note**: The async client (`WeaviateAsyncClient`) is available in `weaviate-client` v4.7.0+.

## Connection Methods

Three instantiation helpers are provided ([docs](https://docs.weaviate.io/weaviate/client-libraries/python/async#instantiation)):

### Weaviate Cloud (Recommended)

```python
import weaviate
from weaviate.classes.init import Auth

# Use the official helper function for Weaviate Cloud
client = weaviate.use_async_with_weaviate_cloud(
    cluster_url="your-cluster.weaviate.cloud",  # Accepts hostname with or without https://
    auth_credentials=Auth.api_key("your-api-key"),
    headers={  # Note: parameter is "headers" not "additional_headers"
        "X-OpenAI-Api-Key": "sk-...",
        "X-Anthropic-Api-Key": "sk-ant-...",
    }
)

await client.connect()  # Required! Async helpers don't auto-connect
```

**Reference**: [Weaviate Cloud Setup](https://docs.weaviate.io/weaviate/quickstart)

### Self-Hosted

```python
# For local instances
client = weaviate.use_async_with_local()

# For custom endpoints
client = weaviate.use_async_with_custom(
    http_host="localhost",
    http_port=8080,
    http_secure=False,
    grpc_host="localhost",
    grpc_port=50051,
    grpc_secure=False,
)

await client.connect()
```

**Reference**: [Connection Configuration](https://weaviate-python-client.readthedocs.io/en/stable/weaviate.html)

### Authentication

Multiple authentication modes are supported ([docs](https://docs.weaviate.io/weaviate/client-libraries/python#authentication)):

```python
from weaviate.classes.init import Auth

# API Key (most common for Weaviate Cloud)
auth = Auth.api_key("your-api-key")

# Bearer Token (with optional refresh token)
auth = Auth.bearer_token("access-token", refresh_token="refresh-token")

# Client Credentials (OIDC)
auth = Auth.client_credentials(client_secret="secret")

# Client Password (OIDC Resource Owner Password flow)
auth = Auth.client_password(username="user", password="pass")

# Usage
client = weaviate.use_async_with_weaviate_cloud(
    cluster_url="your-cluster.weaviate.cloud",
    auth_credentials=auth,
)
```

## Critical Patterns

### ⚠️ Connection Lifecycle

**Important**: Unlike synchronous helpers, async helpers **do not connect automatically** ([docs](https://docs.weaviate.io/weaviate/client-libraries/python/async#instantiation)). You must explicitly call `.connect()` and `.close()`:

```python
# ❌ Wrong - client not connected
client = weaviate.use_async_with_weaviate_cloud(...)
collections = await client.collections.list_all()  # Will fail!

# ✅ Correct - explicit connect/close
client = weaviate.use_async_with_weaviate_cloud(...)
await client.connect()
collections = await client.collections.list_all()
await client.close()
```

### ⚠️ Sync vs Async Methods

**Key distinction** ([docs](https://docs.weaviate.io/weaviate/client-libraries/python/async#which-methods-are-async)): Methods involving server requests are async; local operations are synchronous.

```python
# Collection retrieval is SYNC (no await)
collection = client.collections.get("MyCollection")

# Operations on collections are ASYNC (need await)
config = await collection.config.get()
results = await collection.query.fetch_objects()
count = await collection.aggregate.over_all()
```

**Rule:** Getting the collection object is sync; calling methods on it is async.

### ⚠️ Bulk Operations

**Important Note** ([docs](https://docs.weaviate.io/weaviate/client-libraries/python/async#bulk-import-operations)): For large-scale data imports, use the **synchronous client** and its batch operations. The sync client's batch methods already handle concurrency internally and are optimized for bulk operations.

```python
# ✅ For bulk imports, prefer sync client
import weaviate

with weaviate.connect_to_weaviate_cloud(...) as client:
    collection = client.collections.get("MyCollection")

    # Batch insert handles concurrency automatically
    with collection.batch.dynamic() as batch:
        for item in large_dataset:
            batch.add_object(properties=item)
```

Use the async client for:

- Web applications (FastAPI, Starlette)
- Concurrent request handling
- Interactive queries

Don't use the async client for:

- Bulk data imports (use sync client instead)

## Context Manager Pattern (Recommended)

**Best Practice** ([docs](https://docs.weaviate.io/weaviate/client-libraries/python/async#using-the-async-context-manager)): Use `async with` to automatically connect/disconnect:

```python
from contextlib import asynccontextmanager
from typing import AsyncGenerator

@asynccontextmanager
async def get_weaviate_client(
    cluster_url: str,
    api_key: str,
    provider_headers: dict[str, str] | None = None,
) -> AsyncGenerator[weaviate.WeaviateAsyncClient, None]:
    """Connect to Weaviate Cloud with automatic cleanup."""
    # Remove scheme if present
    hostname = cluster_url.replace("https://", "").replace("http://", "")

    client = weaviate.use_async_with_weaviate_cloud(
        cluster_url=hostname,
        auth_credentials=Auth.api_key(api_key),
        headers=provider_headers,
    )

    try:
        await client.connect()
        yield client
    finally:
        await client.close()

# Usage
async def example():
    async with get_weaviate_client(
        cluster_url="your-cluster.weaviate.cloud",
        api_key="your-key",
    ) as client:
        collections = await client.collections.list_all()
```

> **Note**: When using the context manager, `.connect()` and `.close()` are called automatically.

## FastAPI Integration

**Use Case** ([docs](https://docs.weaviate.io/weaviate/client-libraries/python/async#use-cases)): The async client excels in web frameworks like FastAPI for handling concurrent requests.

Use lifespan management for shared client across requests:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: connect to Weaviate
    app.state.weaviate = weaviate.use_async_with_weaviate_cloud(
        cluster_url="your-cluster.weaviate.cloud",
        auth_credentials=Auth.api_key("your-key"),
    )
    await app.state.weaviate.connect()

    yield

    # Shutdown: close connection
    await app.state.weaviate.close()

app = FastAPI(lifespan=lifespan)

@app.get("/collections")
async def list_collections():
    collections = await app.state.weaviate.collections.list_all()
    return {"collections": list(collections.keys())}
```

**Community Discussion**: [FastAPI Best Practices](https://forum.weaviate.io/t/what-is-the-best-practice-to-use-v4-python-client-for-query-with-fastapi-or-other-async-python-framework/1245)

## Common Pitfalls

### 1. Parameter Name Confusion

```python
# ❌ Wrong - WeaviateAsyncClient() constructor uses different param
client = weaviate.use_async_with_weaviate_cloud(
    additional_headers={...}  # Wrong parameter name!
)

# ✅ Correct - use "headers" not "additional_headers"
client = weaviate.use_async_with_weaviate_cloud(
    headers={...}
)
```

### 2. URL Format

Both formats work with helper functions:

```python
# ✅ Both accepted
client = weaviate.use_async_with_weaviate_cloud(
    cluster_url="https://cluster.weaviate.cloud"  # With scheme
)

client = weaviate.use_async_with_weaviate_cloud(
    cluster_url="cluster.weaviate.cloud"  # Without scheme
)
```

### 3. Sync vs Async Function Names

```python
# ❌ Wrong - sync client (cannot use await)
client = weaviate.connect_to_weaviate_cloud(...)
await client.connect()  # TypeError!

# ✅ Correct - async client
client = weaviate.use_async_with_weaviate_cloud(...)
await client.connect()
```

**Naming pattern:**

- Sync: `connect_to_*` (e.g., `connect_to_weaviate_cloud`)
- Async: `use_async_with_*` (e.g., `use_async_with_weaviate_cloud`)

### 4. Port Configuration

```python
# ❌ Wrong - manual port config causes conflicts with Weaviate Cloud
client = WeaviateAsyncClient(
    connection_params=ConnectionParams.from_url(
        url="https://cluster.weaviate.cloud",
        grpc_port=443,  # Conflict!
    )
)

# ✅ Correct - use helper function (handles ports automatically)
client = weaviate.use_async_with_weaviate_cloud(
    cluster_url="cluster.weaviate.cloud"
)
```

**Rule:** For Weaviate Cloud, always use `use_async_with_weaviate_cloud()` — it handles HTTP (443) and gRPC (50051) ports correctly.

## Multi-Cluster Example

Managing connections to multiple Weaviate clusters:

```python
@asynccontextmanager
async def get_multi_cluster_clients(
    clusters: dict[str, dict[str, str]]
) -> AsyncGenerator[dict[str, weaviate.WeaviateAsyncClient], None]:
    """Connect to multiple Weaviate clusters.

    Args:
        clusters: Dict of {cluster_id: {"url": "...", "api_key": "..."}}
    """
    clients = {}

    try:
        # Connect to all clusters
        for cluster_id, config in clusters.items():
            client = weaviate.use_async_with_weaviate_cloud(
                cluster_url=config["url"],
                auth_credentials=Auth.api_key(config["api_key"]),
            )
            await client.connect()
            clients[cluster_id] = client

        yield clients

    finally:
        # Close all connections
        for client in clients.values():
            await client.close()

# Usage
async def example():
    clusters = {
        "prod": {"url": "prod.weaviate.cloud", "api_key": "key1"},
        "dev": {"url": "dev.weaviate.cloud", "api_key": "key2"},
    }

    async with get_multi_cluster_clients(clusters) as clients:
        prod_collections = await clients["prod"].collections.list_all()
        dev_collections = await clients["dev"].collections.list_all()
```

## Environment Variables

See [Environment Requirements](environment_requirements.md) for provider API keys.

```python
import os

# Read from environment
cluster_url = os.environ["WEAVIATE_URL"]
api_key = os.environ["WEAVIATE_API_KEY"]

# Build provider headers
provider_headers = {}
if openai_key := os.getenv("OPENAI_API_KEY"):
    provider_headers["X-OpenAI-Api-Key"] = openai_key
if anthropic_key := os.getenv("ANTHROPIC_API_KEY"):
    provider_headers["X-Anthropic-Api-Key"] = anthropic_key

client = weaviate.use_async_with_weaviate_cloud(
    cluster_url=cluster_url,
    auth_credentials=Auth.api_key(api_key),
    headers=provider_headers or None,
)
```

## Testing Async Code

```python
import pytest

@pytest.mark.asyncio
async def test_weaviate_connection():
    async with get_weaviate_client(
        cluster_url="test-cluster.weaviate.cloud",
        api_key="test-key",
    ) as client:
        collections = await client.collections.list_all()
        assert isinstance(collections, dict)
```

## Quick Reference

| Task             | Pattern                                       | Await?  |
| ---------------- | --------------------------------------------- | ------- |
| Create client    | `weaviate.use_async_with_weaviate_cloud(...)` | No      |
| Connect          | `client.connect()`                            | **Yes** |
| Get collection   | `client.collections.get("Name")`              | No      |
| List collections | `client.collections.list_all()`               | **Yes** |
| Query data       | `collection.query.fetch_objects()`            | **Yes** |
| Get config       | `collection.config.get()`                     | **Yes** |
| Aggregate        | `collection.aggregate.over_all()`             | **Yes** |
| Close            | `client.close()`                              | **Yes** |

## Troubleshooting

### Common Issues

| Issue                                                 | Solution                                            | Reference                                                                         |
| ----------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------- |
| Connection hangs indefinitely                         | Use context manager or ensure proper `.close()`     | [GitHub #753](https://github.com/weaviate/weaviate-python-client/issues/753)      |
| Multi-worker conflicts (Gunicorn)                     | Use lifespan management, not startup hooks          | [GitHub #1292](https://github.com/weaviate/weaviate-python-client/issues/1292)    |
| `TypeError: object NoneType can't be used in 'await'` | Use `use_async_with_*` not `connect_to_*`           | [Async API Docs](https://docs.weaviate.io/weaviate/client-libraries/python/async) |
| Port conflicts with Weaviate Cloud                    | Use helper functions, not manual `ConnectionParams` | See "Common Pitfalls #4" above                                                    |

### Getting Help

**For agents:** When encountering errors:

1. Check the [Common Pitfalls](#common-pitfalls) section above
2. Search [Community Forum](https://forum.weaviate.io/) for similar issues
3. Check [GitHub Issues](https://github.com/weaviate/weaviate-python-client/issues) for known bugs
4. Refer to [official async documentation](https://docs.weaviate.io/weaviate/client-libraries/python/async)
5. Review [Python client best practices](https://docs.weaviate.io/weaviate/client-libraries/python/notes-best-practices)

## Additional Resources

### Official Documentation

- **Primary**: [Weaviate Async API](https://docs.weaviate.io/weaviate/client-libraries/python/async)
- **Python Client**: [Main Documentation](https://docs.weaviate.io/weaviate/client-libraries/python)
- **API Reference**: [ReadTheDocs](https://weaviate-python-client.readthedocs.io/en/stable/)
- **Best Practices**: [Notes and Best Practices](https://docs.weaviate.io/weaviate/client-libraries/python/notes-best-practices)

### Framework Integration

- [FastAPI Lifespan Events](https://fastapi.tiangolo.com/advanced/events/)
- [Python Async Context Managers](https://docs.python.org/3/reference/datamodel.html#asynchronous-context-managers)

### Community

- [Weaviate Community Forum](https://forum.weaviate.io/)
- [Python Client GitHub](https://github.com/weaviate/weaviate-python-client)
- [Weaviate Blog](https://weaviate.io/blog)
