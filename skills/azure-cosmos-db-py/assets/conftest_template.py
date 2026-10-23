"""
pytest Fixtures Template for Cosmos DB Testing

Application-specific starter test fixtures with:
- Mock Cosmos container
- Async operation mocking
- Sample document factories
- Integration test support

Usage:
    Place in tests/conftest.py or import into test modules.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Generator
from unittest.mock import MagicMock

import pytest


# -----------------------------------------------------------------------------
# Core Cosmos Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def mock_cosmos_container() -> MagicMock:
    """
    Mock Cosmos container with default behaviors.

    Returns:
        MagicMock configured for common Cosmos operations
    """
    container = MagicMock()

    # Default return values
    container.read_item.return_value = None
    container.upsert_item.side_effect = lambda doc: doc  # Return the doc
    container.delete_item.return_value = None
    container.query_items.side_effect = lambda *args, **kwargs: iter([])

    return container


@pytest.fixture
def mock_cosmos(mock_cosmos_container: MagicMock, mocker) -> MagicMock:
    """
    Patch get_container to return mock container.

    Usage:
        def test_something(mock_cosmos):
            mock_cosmos.read_item.return_value = {"id": "123", ...}
            result = await my_service.get_by_id("123", "workspace")
    """
    mocker.patch("app.db.cosmos.get_container", return_value=mock_cosmos_container)
    return mock_cosmos_container


@pytest.fixture
def mock_cosmos_unavailable(mocker) -> None:
    """
    Simulate Cosmos being unavailable.

    Usage:
        def test_graceful_degradation(mock_cosmos_unavailable):
            result = await my_service.list_items("workspace")
            assert result == []
    """
    mocker.patch("app.db.cosmos.get_container", return_value=None)


@pytest.fixture
def mock_cosmos_async(mock_cosmos_container: MagicMock, mocker) -> MagicMock:
    """
    Mock the async wrapper functions (upsert_document, get_document, etc.).

    This is useful when testing service layer directly.
    """
    from azure.cosmos.exceptions import CosmosResourceNotFoundError

    async def mock_upsert(doc: dict, partition_key: str) -> dict:
        return mock_cosmos_container.upsert_item(doc)

    async def mock_get(doc_id: str, partition_key: str) -> dict | None:
        try:
            return mock_cosmos_container.read_item(
                item=doc_id, partition_key=partition_key
            )
        except CosmosResourceNotFoundError:
            return None

    async def mock_delete(doc_id: str, partition_key: str) -> bool:
        try:
            mock_cosmos_container.delete_item(
                item=doc_id, partition_key=partition_key
            )
            return True
        except CosmosResourceNotFoundError:
            return False

    async def mock_query(
        doc_type: str,
        partition_key: str | None = None,
        extra_filter: str | None = None,
        parameters: list | None = None,
    ) -> list[dict]:
        return list(mock_cosmos_container.query_items())

    mocker.patch("app.db.cosmos.upsert_document", side_effect=mock_upsert)
    mocker.patch("app.db.cosmos.get_document", side_effect=mock_get)
    mocker.patch("app.db.cosmos.delete_document", side_effect=mock_delete)
    mocker.patch("app.db.cosmos.query_documents", side_effect=mock_query)
    mocker.patch("app.db.cosmos.get_container", return_value=mock_cosmos_container)

    return mock_cosmos_container


# -----------------------------------------------------------------------------
# Test Data Factories
# -----------------------------------------------------------------------------


@dataclass
class ProjectFactory:
    """
    Factory for creating test project data.

    Usage:
        factory = ProjectFactory(name="Custom Name")
        mock_cosmos.read_item.return_value = factory.to_doc()
    """

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Test Project"
    description: str = "Test description"
    slug: str = "test-project"
    workspace_id: str = "ws-test"
    author_id: str = "user-test"
    visibility: str = "public"
    tags: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = None

    def to_doc(self) -> dict[str, Any]:
        """Convert to Cosmos document format."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "slug": self.slug,
            "workspaceId": self.workspace_id,
            "authorId": self.author_id,
            "visibility": self.visibility,
            "tags": self.tags,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "docType": "project",
        }


@dataclass
class WorkspaceFactory:
    """Factory for creating test workspace data."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Test Workspace"
    description: str = "Test workspace description"
    slug: str = "test-workspace"
    owner_id: str = "user-test"
    visibility: str = "private"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict[str, Any]:
        """Convert to Cosmos document format."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "slug": self.slug,
            "ownerId": self.owner_id,
            "visibility": self.visibility,
            "createdAt": self.created_at.isoformat(),
            "docType": "workspace",
        }


@dataclass
class UserFactory:
    """Factory for creating test user data."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    email: str = "test@example.com"
    name: str = "Test User"
    avatar_url: str | None = None
    role: str = "author"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict[str, Any]:
        """Convert to Cosmos document format."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "avatarUrl": self.avatar_url,
            "role": self.role,
            "createdAt": self.created_at.isoformat(),
            "docType": "user",
        }


# -----------------------------------------------------------------------------
# Sample Document Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def sample_project_doc() -> dict[str, Any]:
    """Sample project document as stored in Cosmos."""
    return ProjectFactory().to_doc()


@pytest.fixture
def sample_workspace_doc() -> dict[str, Any]:
    """Sample workspace document as stored in Cosmos."""
    return WorkspaceFactory().to_doc()


@pytest.fixture
def sample_user_doc() -> dict[str, Any]:
    """Sample user document as stored in Cosmos."""
    return UserFactory().to_doc()


# -----------------------------------------------------------------------------
# Integration Test Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture(scope="module")
def cosmos_container_integration():
    """
    Real Cosmos container for integration tests.

    Requires COSMOS_ENDPOINT environment variable.
    Skipped if not configured.
    """
    import os

    if os.getenv("COSMOS_TEST_DISPOSABLE") != "1":
        pytest.skip("Set COSMOS_TEST_DISPOSABLE=1 only for an isolated test container")

    if not os.getenv("COSMOS_ENDPOINT"):
        pytest.skip("COSMOS_ENDPOINT not configured for integration tests")

    from app.db.cosmos import get_container, reset_connection

    reset_connection()
    container = get_container()

    if container is None:
        pytest.skip("Could not connect to Cosmos DB")

    yield container

    reset_connection()


@pytest.fixture
def cleanup_test_docs(
    cosmos_container_integration,
) -> Generator[list[tuple[str, str]], None, None]:
    """
    Track and clean up test documents after each integration test.

    Usage:
        def test_create(cleanup_test_docs):
            project = await service.create(...)
            cleanup_test_docs.append((project.id, project.workspace_id))
            # Document will be deleted after test
    """
    created: list[tuple[str, str]] = []
    yield created

    # Cleanup
    for doc_id, partition_key in created:
        try:
            cosmos_container_integration.delete_item(
                item=doc_id, partition_key=partition_key
            )
        except Exception as exc:
            pytest.fail(f"Test document cleanup failed: {type(exc).__name__}")


# -----------------------------------------------------------------------------
# Model Fixtures (customize for your models)
# -----------------------------------------------------------------------------


@pytest.fixture
def project_create_data():
    """
    Sample ProjectCreate for testing.

    TODO: Import and use your actual ProjectCreate model.
    """
    # from app.models.project import ProjectCreate
    # return ProjectCreate(
    #     name="New Project",
    #     description="Test description",
    #     workspace_id="ws-test",
    #     visibility="public",
    #     tags=["test"],
    # )
    return {
        "name": "New Project",
        "description": "Test description",
        "workspace_id": "ws-test",
        "visibility": "public",
        "tags": ["test"],
    }


@pytest.fixture
def project_update_data():
    """
    Sample ProjectUpdate for testing.

    TODO: Import and use your actual ProjectUpdate model.
    """
    # from app.models.project import ProjectUpdate
    # return ProjectUpdate(name="Updated Name")
    return {"name": "Updated Name"}
