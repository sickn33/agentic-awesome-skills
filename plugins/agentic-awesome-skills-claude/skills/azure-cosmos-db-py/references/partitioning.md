# Partition Key Strategies


Review corrections (2026-10-23): these snippets are incomplete application starters. Initialize the synchronous client during startup outside the event loop, serialize initialization and close client/credential on shutdown. A cached failed initialization needs an explicit bounded recovery path. `azure.cosmos.aio` is also available; the SDK is not synchronous-only. Enforce tenant authorization independently of partition routing; the bundled client assumes `/workspaceId`. Never accept caller SQL fragments. Distinguish unavailable storage (503) from not-found (404) and empty data; the older graceful-default examples below illustrate a policy to avoid for authoritative reads. Use ETag conditional writes to prevent lost updates, enforce uniqueness atomically, and implement cross-partition moves with conflict-aware compensation; read-then-upsert/delete is not atomic. No live Cosmos behavior is verified by these templates.


## Table of Contents

1. [Partition Key Fundamentals](#partition-key-fundamentals)
2. [Common Strategies](#common-strategies)
3. [Cross-Partition Queries](#cross-partition-queries)
4. [Move Operations](#move-operations)
5. [Query Optimization](#query-optimization)

---

## Partition Key Fundamentals

### What is a Partition Key?

The partition key determines data distribution and query efficiency:

- **Same partition key** → Data co-located → Fast queries, transactional writes
- **Different partition keys** → Data distributed → Cross-partition queries required

### Choosing a Partition Key

Good partition keys have:

1. **High cardinality** — Many distinct values to distribute load
2. **Even distribution** — No single value dominates storage/throughput
3. **Query alignment** — Most queries filter by partition key

---

## Common Strategies

### Strategy 1: Self-Partitioned Entities

Use the entity's own ID when entities are accessed individually:

```python
# Workspaces partition by their own ID
class WorkspaceInDB(BaseModel):
    id: str                    # Also used as partition key
    name: str
    doc_type: str = "workspace"

# Query always includes the workspace ID
doc = await get_document(workspace_id, partition_key=workspace_id)
```

**Use for**: Top-level entities with no parent (workspaces, users)

### Strategy 2: Parent-Scoped Partitioning

Use parent entity ID for child entities accessed together:

```python
# Projects partition by workspace_id
class ProjectInDB(BaseModel):
    id: str
    workspace_id: str          # Partition key
    name: str
    doc_type: str = "project"

# All projects in a workspace are co-located
projects = await query_documents(
    doc_type="project",
    partition_key=workspace_id,  # Efficient single-partition query
)
```

**Use for**: Child entities frequently queried with parent (projects→workspace, flows→workspace)

### Strategy 3: Global Partition

Use a constant for cross-cutting entities:

```python
# Users and groups use "global" partition
GLOBAL_PARTITION = "global"

class UserInDB(BaseModel):
    id: str
    email: str
    doc_type: str = "user"

# Users are queried by email across all partitions
user = await query_documents(
    doc_type="user",
    partition_key=GLOBAL_PARTITION,
    extra_filter="AND c.email = @email",
    parameters=[{"name": "@email", "value": email}],
)
```

**Use only for**: deliberately small bounded datasets. A constant key creates a hot logical partition and does not scale cross-workspace authorization. Every document must actually contain the configured partition property (for example `partitionKey: "global"`).

### Strategy Summary

| Entity Type | Partition Key | Rationale |
|-------------|---------------|-----------|
| **Workspace** | `workspace.id` (self) | Independent top-level entity |
| **User** | `"global"` | Accessed by email across workspaces |
| **Group** | `"global"` | Cross-workspace access control |
| **Project** | `workspace_id` | Always accessed within workspace context |
| **Flow** | `workspace_id` | Co-located with parent project |
| **Asset** | `owner_id` | User-scoped media assets |

---

## Cross-Partition Queries

When partition key is unknown, enable cross-partition queries:

```python
async def query_documents(
    doc_type: str,
    partition_key: str | None = None,
    extra_filter: str | None = None,
    parameters: list[dict] | None = None,
) -> list[dict]:
    """Query documents, optionally across partitions."""
    container = get_container()

    query = "SELECT * FROM c WHERE c.docType = @docType"
    query_params = [{"name": "@docType", "value": doc_type}]

    if extra_filter:
        query += f" {extra_filter}"
        query_params.extend(parameters or [])

    if partition_key is not None:
        # Efficient single-partition query
        items = container.query_items(
            query=query,
            parameters=query_params,
            partition_key=partition_key,
        )
    else:
        # Cross-partition query (slower, higher RU cost)
        items = container.query_items(
            query=query,
            parameters=query_params,
            enable_cross_partition_query=True,
        )

    return await run_in_threadpool(list, items)
```

### When to Use Cross-Partition Queries

| Scenario | Approach |
|----------|----------|
| Search by email | Cross-partition (email not in partition key) |
| List user's workspaces | Cross-partition (user owns multiple workspaces) |
| Admin dashboard | Cross-partition (aggregate across all) |
| Project by ID in workspace | Single-partition (workspace_id known) |

### Performance Considerations

- **Single-partition**: measure request charge for the actual query; no fixed 1–5 RU guarantee
- **Cross-partition**: fan-out can increase RU; measure query metrics rather than assuming a linear multiplier
- Index cross-partition query fields for better performance

---

## Move Operations

Moving entities between partitions requires delete + insert:

```python
async def move_project_to_workspace(
    self,
    project_id: str,
    old_workspace_id: str,
    new_workspace_id: str,
) -> Project | None:
    """Move project to a different workspace."""
    # 1. Read from old partition
    doc = await get_document(project_id, partition_key=old_workspace_id)
    if doc is None:
        return None

    # 2. Update partition key value
    model_in_db = self._doc_to_model_in_db(doc)
    model_in_db.workspace_id = new_workspace_id
    model_in_db.updated_at = datetime.now(timezone.utc)

    # 3. Insert into new partition
    new_doc = self._model_in_db_to_doc(model_in_db)
    await upsert_document(new_doc, partition_key=new_workspace_id)

    # 4. Delete from old partition
    await delete_document(project_id, partition_key=old_workspace_id)

    return self._model_in_db_to_model(model_in_db)
```

### Atomic Move with Transaction

For critical moves, use transactional batch (same partition only):

```python
# Note: Batch only works within single partition
# For cross-partition moves, implement saga pattern with compensation
```

---

## Query Optimization

### Index Policy Configuration

Ensure frequently queried fields are indexed:

```json
{
  "indexingMode": "consistent",
  "includedPaths": [
    { "path": "/docType/?" },
    { "path": "/workspaceId/?" },
    { "path": "/authorId/?" },
    { "path": "/slug/?" },
    { "path": "/email/?" },
    { "path": "/tags/[]" }
  ],
  "excludedPaths": [
    { "path": "/content/*" },
    { "path": "/nodes/*" }
  ]
}
```

### Composite Indexes

For queries with multiple filters and ORDER BY:

```json
{
  "compositeIndexes": [
    [
      { "path": "/docType", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ],
    [
      { "path": "/workspaceId", "order": "ascending" },
      { "path": "/docType", "order": "ascending" },
      { "path": "/name", "order": "ascending" }
    ]
  ]
}
```

### Query Patterns

```python
# Efficient: Uses partition key + indexed field
docs = await query_documents(
    doc_type="project",
    partition_key=workspace_id,
    extra_filter="AND c.visibility = @visibility ORDER BY c.createdAt DESC",
    parameters=[{"name": "@visibility", "value": "public"}],
)

# Less efficient: Cross-partition with unindexed field
docs = await query_documents(
    doc_type="project",
    partition_key=None,  # Cross-partition
    extra_filter="AND CONTAINS(c.description, @search)",  # Unindexed scan
    parameters=[{"name": "@search", "value": "keyword"}],
)
```
