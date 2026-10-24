"""
Cosmos DB Client Module Template

Application-specific starter Azure Cosmos DB NoSQL client with:
- Dual authentication (DefaultAzureCredential for Azure, key for emulator)
- Singleton pattern for connection reuse
- Async wrapping via run_in_threadpool
- Graceful error handling

Usage:
    from app.db.cosmos import get_container, upsert_document, get_document
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from azure.cosmos import ContainerProxy, CosmosClient
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from azure.identity import DefaultAzureCredential
from starlette.concurrency import run_in_threadpool

from app.config import settings

logger = logging.getLogger(__name__)

# Module-level singleton state
_cosmos_container: Optional[ContainerProxy] = None
_credential: Optional[DefaultAzureCredential] = None
_init_attempted: bool = False


def _is_emulator_endpoint(endpoint: str) -> bool:
    """Detect if endpoint is Cosmos emulator."""
    from urllib.parse import urlsplit
    parsed = urlsplit(endpoint)
    return (parsed.scheme == "https" and parsed.username is None
            and parsed.password is None
            and parsed.hostname in {"localhost", "127.0.0.1", "::1"})


def _create_client() -> CosmosClient:
    """Create Cosmos client with appropriate authentication."""
    global _credential

    if _is_emulator_endpoint(settings.cosmos_endpoint):
        logger.info("Using Cosmos emulator with key authentication")
        return CosmosClient(
            url=settings.cosmos_endpoint,
            credential=settings.cosmos_key,
            connection_verify=False,  # Emulator uses self-signed cert
        )
    else:
        logger.info("Using Azure Cosmos with DefaultAzureCredential (RBAC)")
        _credential = DefaultAzureCredential()
        return CosmosClient(
            url=settings.cosmos_endpoint,
            credential=_credential,
        )


def get_container() -> Optional[ContainerProxy]:
    """
    Get Cosmos container proxy, initializing on first call.

    Returns:
        ContainerProxy if connection successful, None otherwise.
    """
    global _cosmos_container, _init_attempted

    if _init_attempted:
        return _cosmos_container

    _init_attempted = True

    try:
        client = _create_client()
        database = client.get_database_client(settings.cosmos_database_name)
        _cosmos_container = database.get_container_client(settings.cosmos_container_id)

        # Verify connection with lightweight operation
        _cosmos_container.read()

        logger.info(
            f"✅ Cosmos DB connected: {settings.cosmos_database_name}/{settings.cosmos_container_id}"
        )

    except Exception as e:
        logger.error(f"❌ Cosmos DB connection failed: {type(e).__name__}: {e}")
        import traceback

        logger.error(traceback.format_exc())
        _cosmos_container = None

    return _cosmos_container


def reset_connection() -> None:
    """Reset connection for testing or environment switching."""
    global _cosmos_container, _credential, _init_attempted
    _cosmos_container = None
    _credential = None
    _init_attempted = False


# -----------------------------------------------------------------------------
# Async CRUD Operations
# -----------------------------------------------------------------------------


async def upsert_document(doc: dict[str, Any], partition_key: str) -> dict[str, Any]:
    """
    Insert or update a document.

    Args:
        doc: Document to upsert (must include 'id' field)
        partition_key: Partition key value

    Returns:
        The upserted document

    Raises:
        RuntimeError: If Cosmos is not initialized
    """
    container = await run_in_threadpool(get_container)
    if container is None:
        raise RuntimeError("Cosmos DB not initialized")

    # This template assumes a container partitioned on /workspaceId.
    if doc.get("workspaceId") != partition_key:
        raise ValueError("Document workspaceId does not match authorized partition")
    result = await run_in_threadpool(container.upsert_item, doc)
    return result


async def get_document(doc_id: str, partition_key: str) -> Optional[dict[str, Any]]:
    """
    Read a document by ID.

    Args:
        doc_id: Document ID
        partition_key: Partition key value

    Returns:
        Document dict if found, None otherwise
    """
    container = await run_in_threadpool(get_container)
    if container is None:
        raise RuntimeError("Cosmos DB unavailable")

    try:
        result = await run_in_threadpool(
            container.read_item,
            item=doc_id,
            partition_key=partition_key,
        )
        return result
    except CosmosResourceNotFoundError:
        return None


async def delete_document(doc_id: str, partition_key: str) -> bool:
    """
    Delete a document.

    Args:
        doc_id: Document ID
        partition_key: Partition key value

    Returns:
        True if deleted, False if not found
    """
    container = await run_in_threadpool(get_container)
    if container is None:
        raise RuntimeError("Cosmos DB unavailable")

    try:
        await run_in_threadpool(
            container.delete_item,
            item=doc_id,
            partition_key=partition_key,
        )
        return True
    except CosmosResourceNotFoundError:
        return False


async def query_documents(
    doc_type: str,
    partition_key: Optional[str] = None,
    extra_filter: Optional[str] = None,
    parameters: Optional[list[dict[str, Any]]] = None,
) -> list[dict[str, Any]]:
    """
    Query documents by type with optional filters.

    Args:
        doc_type: Document type to filter by (docType field)
        partition_key: Partition key for efficient query (None for cross-partition)
        extra_filter: Additional SQL WHERE clause (e.g., "AND c.slug = @slug")
        parameters: Query parameters list (e.g., [{"name": "@slug", "value": "my-slug"}])

    Returns:
        List of matching documents
    """
    container = await run_in_threadpool(get_container)
    if container is None:
        raise RuntimeError("Cosmos DB unavailable")

    # Build parameterized query
    query = "SELECT * FROM c WHERE c.docType = @docType"
    query_params: list[dict[str, Any]] = [{"name": "@docType", "value": doc_type}]

    # extra_filter must be an application-owned SQL fragment, never request text.
    if extra_filter:
        query += f" {extra_filter}"
        query_params.extend(parameters or [])

    # Execute query
    if partition_key is not None:
        items = container.query_items(
            query=query,
            parameters=query_params,
            partition_key=partition_key,
        )
    else:
        items = container.query_items(
            query=query,
            parameters=query_params,
            enable_cross_partition_query=True,
        )

    return await run_in_threadpool(list, items)
