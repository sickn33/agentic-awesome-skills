# Testing Cosmos DB Services


Review corrections (2026-10-23): these snippets are incomplete application starters. Initialize the synchronous client during startup outside the event loop, serialize initialization and close client/credential on shutdown. A cached failed initialization needs an explicit bounded recovery path. `azure.cosmos.aio` is also available; the SDK is not synchronous-only. Enforce tenant authorization independently of partition routing; the bundled client assumes `/workspaceId`. Never accept caller SQL fragments. Distinguish unavailable storage (503) from not-found (404) and empty data; the older graceful-default examples below illustrate a policy to avoid for authoritative reads. Use ETag conditional writes to prevent lost updates, enforce uniqueness atomically, and implement cross-partition moves with conflict-aware compensation; read-then-upsert/delete is not atomic. No live Cosmos behavior is verified by these templates.


## Table of Contents

1. [Test-Driven Development Workflow](#test-driven-development-workflow)
2. [Test File Structure](#test-file-structure)
3. [Fixtures and Mocking](#fixtures-and-mocking)
4. [Unit Test Patterns](#unit-test-patterns)
5. [Integration Test Patterns](#integration-test-patterns)
6. [Test Data Factories](#test-data-factories)

---

## Test-Driven Development Workflow

Follow Red-Green-Refactor:

1. **Red**: Write a failing test for the behavior you want
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Clean up while keeping tests green

### Example TDD Cycle

```python
# Step 1: RED - Write failing test
@pytest.mark.asyncio
async def test_create_project_generates_unique_id(mock_cosmos, project_create_data):
    result = await project_service.create(project_create_data, author_id="user-1")

    assert result.id is not None
    assert len(result.id) == 36  # UUID format

# Step 2: GREEN - Implement minimal code
async def create(self, data: ProjectCreate, author_id: str) -> Project:
    project_id = str(uuid.uuid4())
    # ... rest of implementation

# Step 3: REFACTOR - Clean up if needed
```

---

## Test File Structure

Organize tests to mirror source structure:

```
tests/
├── conftest.py              # Shared fixtures
├── unit/
│   ├── services/
│   │   ├── test_project_service.py
│   │   ├── test_workspace_service.py
│   │   └── test_flow_service.py
│   └── db/
│       └── test_cosmos.py
└── integration/
    └── test_cosmos_integration.py
```

### Test File Template

```python
"""Tests for ProjectService."""
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock

from app.services.project_service import project_service
from app.models.project import ProjectCreate, ProjectUpdate


class TestProjectServiceCreate:
    """Tests for ProjectService.create()"""

    @pytest.mark.asyncio
    async def test_create_returns_project_with_generated_id(self, mock_cosmos):
        ...

    @pytest.mark.asyncio
    async def test_create_sets_timestamps(self, mock_cosmos):
        ...

    @pytest.mark.asyncio
    async def test_create_generates_unique_slug(self, mock_cosmos):
        ...


class TestProjectServiceGetById:
    """Tests for ProjectService.get_by_id()"""

    @pytest.mark.asyncio
    async def test_get_by_id_returns_project_when_found(self, mock_cosmos):
        ...

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_when_not_found(self, mock_cosmos):
        ...

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_when_cosmos_unavailable(self):
        ...
```

---

## Fixtures and Mocking

### Core Fixtures (conftest.py)

```python
import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from datetime import datetime, timezone


@pytest.fixture
def mock_cosmos_container():
    """Mock Cosmos container with common operations."""
    container = MagicMock()

    # Default behaviors
    container.read_item.return_value = None
    container.upsert_item.return_value = {}
    container.delete_item.return_value = None
    container.query_items.return_value = iter([])

    return container


@pytest.fixture
def mock_cosmos(mock_cosmos_container, mocker):
    """Patch get_container to return mock."""
    mocker.patch(
        "app.db.cosmos.get_container",
        return_value=mock_cosmos_container
    )
    return mock_cosmos_container


@pytest.fixture
def mock_cosmos_unavailable(mocker):
    """Simulate Cosmos being unavailable."""
    mocker.patch(
        "app.db.cosmos.get_container",
        return_value=None
    )


@pytest.fixture
def sample_project_doc():
    """Sample project document as stored in Cosmos."""
    return {
        "id": "proj-123",
        "name": "Test Project",
        "description": "A test project",
        "slug": "test-project",
        "workspaceId": "ws-456",
        "authorId": "user-789",
        "visibility": "public",
        "tags": ["test", "sample"],
        "createdAt": "2024-01-15T10:30:00+00:00",
        "updatedAt": None,
        "docType": "project",
    }


@pytest.fixture
def project_create_data():
    """Sample ProjectCreate for testing."""
    return ProjectCreate(
        name="New Project",
        description="Description",
        workspace_id="ws-456",
        visibility="public",
        tags=["new"],
    )
```

### Mocking Async Operations

```python
@pytest.fixture
def mock_cosmos_async(mock_cosmos_container, mocker):
    """Mock the async wrapper functions."""
    async def mock_upsert(doc, partition_key):
        return mock_cosmos_container.upsert_item(doc)

    async def mock_get(doc_id, partition_key):
        return mock_cosmos_container.read_item(item=doc_id, partition_key=partition_key)

    async def mock_delete(doc_id, partition_key):
        mock_cosmos_container.delete_item(item=doc_id, partition_key=partition_key)
        return True

    async def mock_query(doc_type, partition_key=None, extra_filter=None, parameters=None):
        return list(mock_cosmos_container.query_items())

    mocker.patch("app.db.cosmos.upsert_document", side_effect=mock_upsert)
    mocker.patch("app.db.cosmos.get_document", side_effect=mock_get)
    mocker.patch("app.db.cosmos.delete_document", side_effect=mock_delete)
    mocker.patch("app.db.cosmos.query_documents", side_effect=mock_query)
    mocker.patch("app.db.cosmos.get_container", return_value=mock_cosmos_container)

    return mock_cosmos_container
```

---

## Unit Test Patterns

### Testing Create Operations

```python
class TestProjectServiceCreate:

    @pytest.mark.asyncio
    async def test_create_persists_document_with_correct_structure(
        self, mock_cosmos_async, project_create_data
    ):
        # Act
        result = await project_service.create(project_create_data, author_id="user-1")

        # Assert - verify upsert was called
        mock_cosmos_async.upsert_item.assert_called_once()
        persisted_doc = mock_cosmos_async.upsert_item.call_args[0][0]

        assert persisted_doc["name"] == "New Project"
        assert persisted_doc["workspaceId"] == "ws-456"
        assert persisted_doc["authorId"] == "user-1"
        assert persisted_doc["docType"] == "project"

    @pytest.mark.asyncio
    async def test_create_generates_uuid_id(self, mock_cosmos_async, project_create_data):
        result = await project_service.create(project_create_data, author_id="user-1")

        # UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        assert len(result.id) == 36
        assert result.id.count("-") == 4

    @pytest.mark.asyncio
    async def test_create_sets_created_at_to_now(self, mock_cosmos_async, project_create_data):
        before = datetime.now(timezone.utc)
        result = await project_service.create(project_create_data, author_id="user-1")
        after = datetime.now(timezone.utc)

        assert before <= result.created_at <= after
```

### Testing Read Operations

```python
class TestProjectServiceGetById:

    @pytest.mark.asyncio
    async def test_get_by_id_returns_project_when_found(
        self, mock_cosmos_async, sample_project_doc
    ):
        mock_cosmos_async.read_item.return_value = sample_project_doc

        result = await project_service.get_by_id("proj-123", workspace_id="ws-456")

        assert result is not None
        assert result.id == "proj-123"
        assert result.name == "Test Project"

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_when_not_found(self, mock_cosmos_async):
        from azure.cosmos.exceptions import CosmosResourceNotFoundError
        mock_cosmos_async.read_item.side_effect = CosmosResourceNotFoundError(
            status_code=404, message="Not found"
        )

        result = await project_service.get_by_id("nonexistent", workspace_id="ws-456")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_by_id_returns_none_when_cosmos_unavailable(
        self, mock_cosmos_unavailable
    ):
        result = await project_service.get_by_id("proj-123", workspace_id="ws-456")

        assert result is None
```

### Testing Update Operations

```python
class TestProjectServiceUpdate:

    @pytest.mark.asyncio
    async def test_update_modifies_only_provided_fields(
        self, mock_cosmos_async, sample_project_doc
    ):
        mock_cosmos_async.read_item.return_value = sample_project_doc

        update_data = ProjectUpdate(name="Updated Name")
        result = await project_service.update("proj-123", "ws-456", update_data)

        assert result.name == "Updated Name"
        assert result.description == "A test project"  # Unchanged

    @pytest.mark.asyncio
    async def test_update_sets_updated_at(self, mock_cosmos_async, sample_project_doc):
        mock_cosmos_async.read_item.return_value = sample_project_doc

        before = datetime.now(timezone.utc)
        result = await project_service.update(
            "proj-123", "ws-456", ProjectUpdate(name="New")
        )
        after = datetime.now(timezone.utc)

        assert result.updated_at is not None
        assert before <= result.updated_at <= after
```

### Testing Delete Operations

```python
class TestProjectServiceDelete:

    @pytest.mark.asyncio
    async def test_delete_returns_true_on_success(self, mock_cosmos_async):
        result = await project_service.delete("proj-123", workspace_id="ws-456")

        assert result is True
        mock_cosmos_async.delete_item.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_returns_false_when_not_found(self, mock_cosmos_async):
        from azure.cosmos.exceptions import CosmosResourceNotFoundError
        mock_cosmos_async.delete_item.side_effect = CosmosResourceNotFoundError(
            status_code=404, message="Not found"
        )

        result = await project_service.delete("nonexistent", workspace_id="ws-456")

        assert result is False
```

### Testing List/Query Operations

```python
class TestProjectServiceList:

    @pytest.mark.asyncio
    async def test_list_returns_all_projects_in_workspace(
        self, mock_cosmos_async, sample_project_doc
    ):
        mock_cosmos_async.query_items.return_value = iter([
            sample_project_doc,
            {**sample_project_doc, "id": "proj-456", "name": "Second Project"},
        ])

        results = await project_service.list_by_workspace("ws-456")

        assert len(results) == 2
        assert results[0].id == "proj-123"
        assert results[1].id == "proj-456"

    @pytest.mark.asyncio
    async def test_list_returns_empty_when_no_projects(self, mock_cosmos_async):
        mock_cosmos_async.query_items.return_value = iter([])

        results = await project_service.list_by_workspace("ws-456")

        assert results == []
```

---

## Integration Test Patterns

For tests against real Cosmos (emulator or dev instance):

```python
import pytest
import os

# Skip if no emulator configured
pytestmark = pytest.mark.skipif(
    os.getenv("COSMOS_ENDPOINT") is None,
    reason="COSMOS_ENDPOINT not configured"
)


@pytest.fixture(scope="module")
def cosmos_container():
    """Real Cosmos container for integration tests."""
    from app.db.cosmos import get_container, reset_connection
    reset_connection()
    container = get_container()
    yield container
    reset_connection()


@pytest.fixture
def cleanup_test_docs(cosmos_container):
    """Clean up test documents after each test."""
    created_ids = []
    yield created_ids
    for doc_id, partition_key in created_ids:
        try:
            cosmos_container.delete_item(item=doc_id, partition_key=partition_key)
        except Exception:
            pass


class TestProjectServiceIntegration:

    @pytest.mark.asyncio
    async def test_create_and_retrieve_roundtrip(self, cleanup_test_docs):
        # Create
        data = ProjectCreate(
            name="Integration Test Project",
            workspace_id="test-workspace",
        )
        project = await project_service.create(data, author_id="test-user")
        cleanup_test_docs.append((project.id, "test-workspace"))

        # Retrieve
        retrieved = await project_service.get_by_id(project.id, "test-workspace")

        assert retrieved is not None
        assert retrieved.name == "Integration Test Project"
```

---

## Test Data Factories

For complex test scenarios, use factories:

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid


@dataclass
class ProjectFactory:
    """Factory for creating test project data."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Test Project"
    description: str = "Test description"
    slug: str = "test-project"
    workspace_id: str = "ws-test"
    author_id: str = "user-test"
    visibility: str = "public"
    tags: list = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_doc(self) -> dict:
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
            "updatedAt": None,
            "docType": "project",
        }

    def to_create(self) -> ProjectCreate:
        """Convert to ProjectCreate model."""
        return ProjectCreate(
            name=self.name,
            description=self.description,
            workspace_id=self.workspace_id,
            visibility=self.visibility,
            tags=self.tags,
        )


# Usage in tests
@pytest.mark.asyncio
async def test_with_factory(mock_cosmos_async):
    factory = ProjectFactory(name="Custom Name", tags=["important"])
    mock_cosmos_async.read_item.return_value = factory.to_doc()

    result = await project_service.get_by_id(factory.id, factory.workspace_id)
    assert result.name == "Custom Name"
```

---

## Complete Fixture File

See [assets/conftest_template.py](../assets/conftest_template.py) for a application-specific starter conftest.py.
