# Service Layer Pattern


Review corrections (2026-10-23): these snippets are incomplete application starters. Initialize the synchronous client during startup outside the event loop, serialize initialization and close client/credential on shutdown. A cached failed initialization needs an explicit bounded recovery path. `azure.cosmos.aio` is also available; the SDK is not synchronous-only. Enforce tenant authorization independently of partition routing; the bundled client assumes `/workspaceId`. Never accept caller SQL fragments. Distinguish unavailable storage (503) from not-found (404) and empty data; the older graceful-default examples below illustrate a policy to avoid for authoritative reads. Use ETag conditional writes to prevent lost updates, enforce uniqueness atomically, and implement cross-partition moves with conflict-aware compensation; read-then-upsert/delete is not atomic. No live Cosmos behavior is verified by these templates.


## Table of Contents

1. [Service Class Structure](#service-class-structure)
2. [Document Conversion Methods](#document-conversion-methods)
3. [CRUD Operations](#crud-operations)
4. [Query Patterns](#query-patterns)
5. [Graceful Degradation](#graceful-degradation)
6. [Complete Example](#complete-example)

---

## Service Class Structure

Every service follows this pattern:

```python
from typing import Optional
from app.db.cosmos import get_container, upsert_document, get_document, delete_document, query_documents
from app.models.project import Project, ProjectCreate, ProjectUpdate, ProjectInDB

class ProjectService:
    """Service for project CRUD operations."""

    def _use_cosmos(self) -> bool:
        """Check if Cosmos is available."""
        return get_container() is not None

    # Document conversion methods
    def _doc_to_model_in_db(self, doc: dict) -> ProjectInDB:
        """Convert Cosmos document to internal model."""
        ...

    def _model_in_db_to_doc(self, model: ProjectInDB) -> dict:
        """Convert internal model to Cosmos document."""
        ...

    def _model_in_db_to_model(self, model_in_db: ProjectInDB) -> Project:
        """Convert internal model to API response model."""
        ...

    # CRUD operations
    async def create(self, data: ProjectCreate, author_id: str) -> Project:
        ...

    async def get_by_id(self, project_id: str, workspace_id: str) -> Optional[Project]:
        ...

    async def update(self, project_id: str, workspace_id: str, data: ProjectUpdate) -> Optional[Project]:
        ...

    async def delete(self, project_id: str, workspace_id: str) -> bool:
        ...

    async def list_by_workspace(self, workspace_id: str) -> list[Project]:
        ...

# Singleton instance
project_service = ProjectService()
```

---

## Document Conversion Methods

### Document → Model (from Cosmos)

```python
def _doc_to_model_in_db(self, doc: dict) -> ProjectInDB:
    """Convert Cosmos document to ProjectInDB."""
    return ProjectInDB(
        id=doc["id"],
        name=doc["name"],
        description=doc.get("description"),
        slug=doc["slug"],
        workspace_id=doc["workspaceId"],
        author_id=doc["authorId"],
        visibility=doc.get("visibility", "public"),
        tags=doc.get("tags", []),
        created_at=datetime.fromisoformat(doc["createdAt"]),
        updated_at=datetime.fromisoformat(doc["updatedAt"]) if doc.get("updatedAt") else None,
        doc_type=doc.get("docType", "project"),
    )
```

### Model → Document (to Cosmos)

```python
def _model_in_db_to_doc(self, model: ProjectInDB) -> dict:
    """Convert ProjectInDB to Cosmos document."""
    return {
        "id": model.id,
        "name": model.name,
        "description": model.description,
        "slug": model.slug,
        "workspaceId": model.workspace_id,  # Partition key
        "authorId": model.author_id,
        "visibility": model.visibility,
        "tags": model.tags,
        "createdAt": model.created_at.isoformat(),
        "updatedAt": model.updated_at.isoformat() if model.updated_at else None,
        "docType": model.doc_type,
    }
```

### InDB → Response (strip internal fields)

```python
def _model_in_db_to_model(self, model_in_db: ProjectInDB) -> Project:
    """Convert ProjectInDB to API response model."""
    return Project(
        id=model_in_db.id,
        name=model_in_db.name,
        description=model_in_db.description,
        slug=model_in_db.slug,
        workspace_id=model_in_db.workspace_id,
        author_id=model_in_db.author_id,
        visibility=model_in_db.visibility,
        tags=model_in_db.tags,
        created_at=model_in_db.created_at,
        updated_at=model_in_db.updated_at,
    )
```

---

## CRUD Operations

### Create

```python
async def create(self, data: ProjectCreate, author_id: str) -> Project:
    """Create a new project."""
    if not self._use_cosmos():
        raise RuntimeError("Database unavailable")

    now = datetime.now(timezone.utc)
    slug = await self._generate_unique_slug(data.name, data.workspace_id)

    project_in_db = ProjectInDB(
        id=str(uuid.uuid4()),
        name=data.name,
        description=data.description,
        slug=slug,
        workspace_id=data.workspace_id,
        author_id=author_id,
        visibility=data.visibility,
        tags=data.tags,
        created_at=now,
        updated_at=None,
        doc_type="project",
    )

    doc = self._model_in_db_to_doc(project_in_db)
    await upsert_document(doc, partition_key=data.workspace_id)

    return self._model_in_db_to_model(project_in_db)
```

### Read (Get by ID)

```python
async def get_by_id(self, project_id: str, workspace_id: str) -> Optional[Project]:
    """Get project by ID. Returns None if not found."""
    if not self._use_cosmos():
        return None

    doc = await get_document(project_id, partition_key=workspace_id)
    if doc is None:
        return None

    model_in_db = self._doc_to_model_in_db(doc)
    return self._model_in_db_to_model(model_in_db)
```

### Update

```python
async def update(
    self, project_id: str, workspace_id: str, data: ProjectUpdate
) -> Optional[Project]:
    """Update project. Returns None if not found."""
    if not self._use_cosmos():
        return None

    doc = await get_document(project_id, partition_key=workspace_id)
    if doc is None:
        return None

    model_in_db = self._doc_to_model_in_db(doc)

    # Apply updates (only non-None fields)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(model_in_db, field):
            setattr(model_in_db, field, value)

    model_in_db.updated_at = datetime.now(timezone.utc)

    updated_doc = self._model_in_db_to_doc(model_in_db)
    await upsert_document(updated_doc, partition_key=workspace_id)

    return self._model_in_db_to_model(model_in_db)
```

### Delete

```python
async def delete(self, project_id: str, workspace_id: str) -> bool:
    """Delete project. Returns True if deleted."""
    if not self._use_cosmos():
        return False

    return await delete_document(project_id, partition_key=workspace_id)
```

### List

```python
async def list_by_workspace(self, workspace_id: str) -> list[Project]:
    """List all projects in a workspace."""
    if not self._use_cosmos():
        return []

    docs = await query_documents(
        doc_type="project",
        partition_key=workspace_id,
    )

    return [
        self._model_in_db_to_model(self._doc_to_model_in_db(doc))
        for doc in docs
    ]
```

---

## Query Patterns

### Basic Query with Filter

```python
async def get_by_slug(self, slug: str, workspace_id: str) -> Optional[Project]:
    """Get project by slug within a workspace."""
    docs = await query_documents(
        doc_type="project",
        partition_key=workspace_id,
        extra_filter="AND c.slug = @slug",
        parameters=[{"name": "@slug", "value": slug}],
    )

    if not docs:
        return None

    return self._model_in_db_to_model(self._doc_to_model_in_db(docs[0]))
```

### Unique Slug Generation

```python
async def _generate_unique_slug(self, name: str, workspace_id: str) -> str:
    """Generate unique slug from name."""
    base_slug = slugify(name)
    slug = base_slug
    counter = 1

    while True:
        existing = await query_documents(
            doc_type="project",
            partition_key=workspace_id,
            extra_filter="AND c.slug = @slug",
            parameters=[{"name": "@slug", "value": slug}],
        )
        if not existing:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1
```

---

## Graceful Degradation

Every public method checks `_use_cosmos()` and returns safe defaults:

| Return Type | Default |
|-------------|---------|
| `Optional[Model]` | `None` |
| `list[Model]` | `[]` |
| `bool` | `False` |
| Required create | `raise RuntimeError` |

```python
async def get_by_id(self, project_id: str, workspace_id: str) -> Optional[Project]:
    if not self._use_cosmos():
        return None  # Graceful None instead of exception
    ...
```

---

## Complete Example

See [assets/service_template.py](../assets/service_template.py) for a application-specific starter service implementation.
