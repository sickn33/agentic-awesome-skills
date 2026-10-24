# Error Handling Patterns


Review corrections (2026-10-23): these snippets are incomplete application starters. Initialize the synchronous client during startup outside the event loop, serialize initialization and close client/credential on shutdown. A cached failed initialization needs an explicit bounded recovery path. `azure.cosmos.aio` is also available; the SDK is not synchronous-only. Enforce tenant authorization independently of partition routing; the bundled client assumes `/workspaceId`. Never accept caller SQL fragments. Distinguish unavailable storage (503) from not-found (404) and empty data; the older graceful-default examples below illustrate a policy to avoid for authoritative reads. Use ETag conditional writes to prevent lost updates, enforce uniqueness atomically, and implement cross-partition moves with conflict-aware compensation; read-then-upsert/delete is not atomic. No live Cosmos behavior is verified by these templates.


## Table of Contents

1. [Cosmos Exception Types](#cosmos-exception-types)
2. [Client-Level Error Handling](#client-level-error-handling)
3. [Service-Level Error Handling](#service-level-error-handling)
4. [Router-Level Error Mapping](#router-level-error-mapping)
5. [Logging Patterns](#logging-patterns)
6. [Retry Strategies](#retry-strategies)

---

## Cosmos Exception Types

### Common Exceptions

```python
from azure.cosmos.exceptions import (
    CosmosResourceNotFoundError,    # 404 - Document not found
    CosmosResourceExistsError,      # 409 - Conflict (duplicate ID)
    CosmosHttpResponseError,        # Base class for HTTP errors
)
```

| Exception | HTTP Status | Common Cause |
|-----------|-------------|--------------|
| `CosmosResourceNotFoundError` | 404 | Document/container doesn't exist |
| `CosmosResourceExistsError` | 409 | Document with ID already exists |
| `CosmosHttpResponseError` | 429 | Rate limiting (too many RU) |
| `CosmosHttpResponseError` | 503 | Service unavailable |

---

## Client-Level Error Handling

Handle exceptions in the Cosmos client module:

```python
from azure.cosmos.exceptions import CosmosResourceNotFoundError, CosmosHttpResponseError
import logging

logger = logging.getLogger(__name__)


async def get_document(doc_id: str, partition_key: str) -> dict | None:
    """Read a document. Returns None if not found."""
    container = get_container()
    if container is None:
        return None

    try:
        result = await run_in_threadpool(
            container.read_item,
            item=doc_id,
            partition_key=partition_key,
        )
        return result
    except CosmosResourceNotFoundError:
        # Expected case: document doesn't exist
        return None
    except CosmosHttpResponseError as e:
        # Log unexpected errors but don't crash
        logger.error(f"Cosmos error reading {doc_id}: {e.status_code} - {e.message}")
        raise


async def delete_document(doc_id: str, partition_key: str) -> bool:
    """Delete a document. Returns True if deleted, False if not found."""
    container = get_container()
    if container is None:
        return False

    try:
        await run_in_threadpool(
            container.delete_item,
            item=doc_id,
            partition_key=partition_key,
        )
        return True
    except CosmosResourceNotFoundError:
        # Already deleted or never existed
        return False


async def upsert_document(doc: dict, partition_key: str) -> dict:
    """Insert or update a document."""
    container = get_container()
    if container is None:
        raise RuntimeError("Cosmos DB not initialized")

    try:
        result = await run_in_threadpool(container.upsert_item, doc)
        return result
    except CosmosResourceExistsError:
        # Shouldn't happen with upsert, but handle just in case
        logger.warning(f"Unexpected conflict upserting {doc.get('id')}")
        raise
```

### Return Value Conventions

| Scenario | Return Value |
|----------|--------------|
| Document found | `dict` (the document) |
| Document not found | `None` |
| Delete succeeded | `True` |
| Delete target not found | `False` |
| Cosmos unavailable | `None` or `False` (graceful) |
| Unexpected error | Raise exception |

---

## Service-Level Error Handling

Services interpret client results and apply business logic:

```python
class ProjectService:

    async def get_by_id(self, project_id: str, workspace_id: str) -> Project | None:
        """Get project. Returns None if not found or unavailable."""
        if not self._use_cosmos():
            return None

        doc = await get_document(project_id, partition_key=workspace_id)
        if doc is None:
            return None

        return self._doc_to_model(doc)

    async def create(self, data: ProjectCreate, author_id: str) -> Project:
        """Create project. Raises RuntimeError if Cosmos unavailable."""
        if not self._use_cosmos():
            raise RuntimeError("Database unavailable")

        # ... create logic ...

    async def update(
        self, project_id: str, workspace_id: str, data: ProjectUpdate
    ) -> Project | None:
        """Update project. Returns None if not found."""
        if not self._use_cosmos():
            return None

        doc = await get_document(project_id, partition_key=workspace_id)
        if doc is None:
            return None  # Not found

        # ... update logic ...
```

### Graceful Degradation Pattern

```python
def _use_cosmos(self) -> bool:
    """Check if Cosmos is available for use."""
    return get_container() is not None

async def list_projects(self, workspace_id: str) -> list[Project]:
    """List projects. Returns empty list if unavailable."""
    if not self._use_cosmos():
        return []  # Graceful empty response

    docs = await query_documents(
        doc_type="project",
        partition_key=workspace_id,
    )
    return [self._doc_to_model(doc) for doc in docs]
```

---

## Router-Level Error Mapping

Convert service results to HTTP responses:

```python
from fastapi import APIRouter, HTTPException, status, Depends

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/{project_id}")
async def get_project(
    project_id: str,
    workspace_id: str,
    current_user: User = Depends(get_current_user_required),
) -> Project:
    """Get project by ID."""
    project = await project_service.get_by_id(project_id, workspace_id)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user_required),
) -> Project:
    """Create a new project."""
    try:
        return await project_service.create(data, author_id=current_user.id)
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


@router.put("/{project_id}")
async def update_project(
    project_id: str,
    workspace_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user_required),
) -> Project:
    """Update project."""
    project = await project_service.update(project_id, workspace_id, data)

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    workspace_id: str,
    current_user: User = Depends(get_current_user_required),
) -> None:
    """Delete project."""
    deleted = await project_service.delete(project_id, workspace_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
```

### HTTP Status Code Mapping

| Service Result | HTTP Status | Response |
|----------------|-------------|----------|
| Success with data | 200 OK | JSON body |
| Created | 201 Created | JSON body |
| Deleted | 204 No Content | Empty |
| Not found (`None`) | 404 Not Found | Error detail |
| Validation error | 422 Unprocessable | Pydantic errors |
| Database unavailable | 503 Service Unavailable | Error detail |

---

## Logging Patterns

### Structured Logging

```python
import logging
import traceback

logger = logging.getLogger(__name__)


def get_container() -> ContainerProxy | None:
    global _cosmos_container, _init_attempted

    if _init_attempted:
        return _cosmos_container

    _init_attempted = True

    try:
        client = _create_client(settings)
        database = client.get_database_client(settings.cosmos_database_name)
        _cosmos_container = database.get_container_client(settings.cosmos_container_id)
        _cosmos_container.read()  # Verify connection

        logger.info(
            "Cosmos DB connected",
            extra={
                "database": settings.cosmos_database_name,
                "container": settings.cosmos_container_id,
                "endpoint": settings.cosmos_endpoint[:30] + "...",
            }
        )

    except Exception as e:
        logger.error(
            "Cosmos DB connection failed",
            extra={
                "error_type": type(e).__name__,
                "error_message": str(e),
                "endpoint": settings.cosmos_endpoint[:30] + "...",
            },
            exc_info=True,  # Include stack trace
        )
        _cosmos_container = None

    return _cosmos_container
```

### Log Levels

| Scenario | Level | Example |
|----------|-------|---------|
| Connection established | INFO | "Cosmos DB connected" |
| Document not found | DEBUG | "Project proj-123 not found" |
| Validation error | WARNING | "Invalid partition key" |
| Connection failed | ERROR | "Cosmos DB connection failed" |
| Unexpected exception | ERROR | Full traceback |

---

## Retry Strategies

### Azure SDK Built-in Retry

The Cosmos SDK has built-in retry for transient errors (429, 503):

```python
from azure.cosmos import CosmosClient

# Use retry_total / retry_backoff_factor only when supported by the pinned SDK.
# Cosmos-specific 429 retry settings and non-idempotent writes need separate review.
client = CosmosClient(url=endpoint, credential=credential, retry_total=3)
```

### Custom Retry for Application Logic

```python
import asyncio
from typing import TypeVar, Callable, Awaitable

T = TypeVar("T")


async def with_retry(
    operation: Callable[[], Awaitable[T]],
    max_retries: int = 3,
    base_delay: float = 0.5,
) -> T:
    """Execute operation with exponential backoff retry."""
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            return await operation()
        except CosmosHttpResponseError as e:
            if e.status_code == 429 and attempt < max_retries:  # Bound retries; SDK may already retry
                last_error = e
                delay = base_delay * (2 ** attempt)
                logger.warning(f"Rate limited, retrying in {delay}s (attempt {attempt + 1})")
                await asyncio.sleep(delay)
            else:
                raise

    raise last_error


# Usage
result = await with_retry(
    lambda: upsert_document(doc, partition_key),
    max_retries=3,
)
```
