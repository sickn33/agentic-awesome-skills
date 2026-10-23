# Cosmos DB Client Setup


Review corrections (2026-10-23): these snippets are incomplete application starters. Initialize the synchronous client during startup outside the event loop, serialize initialization and close client/credential on shutdown. A cached failed initialization needs an explicit bounded recovery path. `azure.cosmos.aio` is also available; the SDK is not synchronous-only. Enforce tenant authorization independently of partition routing; the bundled client assumes `/workspaceId`. Never accept caller SQL fragments. Distinguish unavailable storage (503) from not-found (404) and empty data; the older graceful-default examples below illustrate a policy to avoid for authoritative reads. Use ETag conditional writes to prevent lost updates, enforce uniqueness atomically, and implement cross-partition moves with conflict-aware compensation; read-then-upsert/delete is not atomic. No live Cosmos behavior is verified by these templates.


## Table of Contents

1. [Dual Authentication Strategy](#dual-authentication-strategy)
2. [Singleton Pattern](#singleton-pattern)
3. [Async Wrapping](#async-wrapping)
4. [Configuration Management](#configuration-management)
5. [Connection Reset](#connection-reset)
6. [Complete Implementation](#complete-implementation)

---

## Dual Authentication Strategy

Use `DefaultAzureCredential` for Azure deployments and key-based auth only for the local emulator:

```python
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential

def _is_emulator_endpoint(endpoint: str) -> bool:
    """Detect Cosmos emulator by endpoint URL."""
    from urllib.parse import urlsplit
    parsed = urlsplit(endpoint)
    return (parsed.scheme == "https" and parsed.username is None
            and parsed.password is None
            and parsed.hostname in {"localhost", "127.0.0.1", "::1"})

def _create_client(settings) -> CosmosClient:
    if _is_emulator_endpoint(settings.cosmos_endpoint):
        # Emulator: use well-known key, disable SSL verification
        return CosmosClient(
            url=settings.cosmos_endpoint,
            credential=settings.cosmos_key,
            connection_verify=False  # Emulator uses self-signed cert
        )
    else:
        # Azure: use RBAC via DefaultAzureCredential
        credential = DefaultAzureCredential()
        return CosmosClient(
            url=settings.cosmos_endpoint,
            credential=credential
        )
```

### Security Notes

- **Never** store production keys in code or config files
- The emulator key (`C2y6yDjf5/R+ob0N8A7Cgv...`) is publicly documented and safe to hardcode
- Requires "Cosmos DB Built-in Data Contributor" role for RBAC auth
- Run `az login` before local development against Azure Cosmos

---

## Singleton Pattern

Initialize container once at module level to reuse connections:

```python
import logging
from typing import Optional
from azure.cosmos import ContainerProxy

logger = logging.getLogger(__name__)

_cosmos_container: Optional[ContainerProxy] = None
_init_attempted: bool = False

def get_container() -> Optional[ContainerProxy]:
    """Get Cosmos container, initializing on first call."""
    global _cosmos_container, _init_attempted

    if _init_attempted:
        return _cosmos_container

    _init_attempted = True

    try:
        client = _create_client(settings)
        database = client.get_database_client(settings.cosmos_database_name)
        _cosmos_container = database.get_container_client(settings.cosmos_container_id)

        # Verify connection with a lightweight operation
        _cosmos_container.read()
        logger.info(f"✅ Connected to Cosmos DB: {settings.cosmos_database_name}/{settings.cosmos_container_id}")

    except Exception as e:
        logger.error(f"❌ Failed to initialize Cosmos DB: {type(e).__name__}: {e}")
        import traceback
        logger.error(traceback.format_exc())
        _cosmos_container = None

    return _cosmos_container
```

### Why Singleton?

1. **Connection Reuse**: Cosmos SDK manages connection pooling internally
2. **Startup Validation**: Fail fast if Cosmos is misconfigured
3. **Graceful Degradation**: Services check `get_container() is not None`

---

## Async Wrapping

This example uses the synchronous Cosmos client; an asynchronous client is available in `azure.cosmos.aio`. Wrap calls with `run_in_threadpool` to avoid blocking FastAPI:

```python
from starlette.concurrency import run_in_threadpool

async def upsert_document(doc: dict, partition_key: str) -> dict:
    """Insert or update a document."""
    container = get_container()
    if container is None:
        raise RuntimeError("Cosmos DB not initialized")

    result = await run_in_threadpool(
        container.upsert_item,
        doc
    )
    return result

async def get_document(doc_id: str, partition_key: str) -> Optional[dict]:
    """Read a document by ID."""
    container = get_container()
    if container is None:
        return None

    try:
        result = await run_in_threadpool(
            container.read_item,
            item=doc_id,
            partition_key=partition_key
        )
        return result
    except CosmosResourceNotFoundError:
        return None

async def delete_document(doc_id: str, partition_key: str) -> bool:
    """Delete a document. Returns True if deleted."""
    container = get_container()
    if container is None:
        return False

    try:
        await run_in_threadpool(
            container.delete_item,
            item=doc_id,
            partition_key=partition_key
        )
        return True
    except CosmosResourceNotFoundError:
        return False
```

---

## Configuration Management

Use Pydantic Settings with environment-aware defaults:

```python
from pydantic_settings import BaseSettings
from pydantic import model_validator

class Settings(BaseSettings):
    environment: str = "local"

    cosmos_endpoint: str = ""
    cosmos_key: str = ""  # Only for emulator
    cosmos_database_name: str = "my-database"
    cosmos_container_id: str = "my-container"

    class Config:
        env_file = ".env"
        extra = "ignore"

    @model_validator(mode="after")
    def configure_for_environment(self) -> "Settings":
        """Set defaults based on environment."""
        if self.environment == "local" and not self.cosmos_endpoint:
            # Default to emulator
            self.cosmos_endpoint = "https://localhost:8081"
            self.cosmos_key = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4GUg9jsLAi7dnvNdc0SKFO+GRNpsq24UdBkbFCL/6C+iW9zQ=="
        return self

settings = Settings()
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `COSMOS_ENDPOINT` | Cosmos account URL | Yes |
| `COSMOS_KEY` | Account key (emulator only) | No |
| `COSMOS_DATABASE_NAME` | Database name | Yes |
| `COSMOS_CONTAINER_ID` | Container name | Yes |

---

## Connection Reset

For testing or environment switching:

```python
def reset_connection() -> None:
    """Reset Cosmos connection. Call between tests or after config changes."""
    global _cosmos_container, _init_attempted
    _cosmos_container = None
    _init_attempted = False
```

---

## Complete Implementation

See [assets/cosmos_client_template.py](../assets/cosmos_client_template.py) for a application-specific starter implementation.
