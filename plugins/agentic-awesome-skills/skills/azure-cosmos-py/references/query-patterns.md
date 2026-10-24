# Query Patterns Reference

Advanced query patterns for Azure Cosmos DB NoSQL API.

## Parameterized Queries

Always use parameters to prevent injection and enable query plan caching:

```python
# GOOD: Parameterized query
query = "SELECT * FROM c WHERE c.category = @category AND c.price < @max_price"
items = container.query_items(
    query=query,
    parameters=[
        {"name": "@category", "value": "electronics"},
        {"name": "@max_price", "value": 500}
    ],
    partition_key="electronics"
)

# BAD: String interpolation (injection risk, no caching)
category = "electronics"
query = f"SELECT * FROM c WHERE c.category = '{category}'"  # Never do this!
```

## Query Optimization

### Single Partition vs Cross-Partition

```python
# EFFICIENT: Single partition query (always preferred)
items = container.query_items(
    query="SELECT * FROM c WHERE c.status = 'active'",
    partition_key="tenant-123"
)

# EXPENSIVE: Cross-partition query (use sparingly)
items = container.query_items(
    query="SELECT * FROM c WHERE c.status = 'active'",
    enable_cross_partition_query=True  # Fans out to all partitions
)
```

### Point Reads vs Queries

```python
# MOST EFFICIENT: Point read (1 RU for 1KB document)
item = container.read_item(
    item="doc-123",
    partition_key="tenant-abc"
)

# LESS EFFICIENT: Query for single document (higher RU)
items = list(container.query_items(
    query="SELECT * FROM c WHERE c.id = @id",
    parameters=[{"name": "@id", "value": "doc-123"}],
    partition_key="tenant-abc"
))
item = items[0] if items else None
```

### Projection for Efficiency

```python
# GOOD: Select only needed fields (less RU, less bandwidth)
query = "SELECT c.id, c.name, c.price FROM c WHERE c.category = @category"
items = container.query_items(
    query=query,
    parameters=[{"name": "@category", "value": "electronics"}],
    partition_key="electronics"
)

# EXPENSIVE: Select all fields when you only need a few
query = "SELECT * FROM c WHERE c.category = @category"
```

## Pagination

### Continuation Token Pagination

```python
def paginated_query(
    container,
    query: str,
    partition_key: str,
    page_size: int = 100,
    parameters: list | None = None
):
    """Paginate through query results using continuation tokens."""
    if page_size < 1:
        raise ValueError("page_size must be positive")
    results = container.query_items(query=query, parameters=parameters or [],
                                    partition_key=partition_key, max_item_count=page_size)
    for page in results.by_page():
        yield list(page)

# Usage
for page in paginated_query(
    container,
    query="SELECT * FROM c WHERE c.status = 'active'",
    partition_key="tenant-123",
    page_size=50
):
    process_page(page)
```

### Offset-Limit Pagination (Not Recommended for Large Datasets)

```python
# Works but inefficient for large offsets (still reads skipped items)
query = "SELECT * FROM c ORDER BY c.created_at DESC OFFSET @offset LIMIT @limit"
items = container.query_items(
    query=query,
    parameters=[
        {"name": "@offset", "value": 100},
        {"name": "@limit", "value": 10}
    ],
    partition_key="tenant-123"
)
```

## Aggregations

### COUNT, SUM, AVG, MIN, MAX

```python
# Count items in partition
query = "SELECT VALUE COUNT(1) FROM c WHERE c.status = 'active'"
result = list(container.query_items(
    query=query,
    partition_key="tenant-123"
))
count = result[0]  # Returns integer directly with VALUE

# Sum with grouping
query = """
SELECT c.category, SUM(c.quantity) as total_quantity, AVG(c.price) as avg_price
FROM c
WHERE c.order_date >= @start_date
GROUP BY c.category
"""
results = container.query_items(
    query=query,
    parameters=[{"name": "@start_date", "value": "2025-01-01"}],
    partition_key="tenant-123"
)

for result in results:
    print(f"{result['category']}: {result['total_quantity']} items, ${result['avg_price']:.2f} avg")
```

### Aggregate Functions Reference

| Function | Description | Example |
|----------|-------------|---------|
| `COUNT(expr)` | Count non-null values | `COUNT(c.id)` |
| `COUNT(1)` | Count all documents | `COUNT(1)` |
| `SUM(expr)` | Sum numeric values | `SUM(c.quantity)` |
| `AVG(expr)` | Average of numeric values | `AVG(c.price)` |
| `MIN(expr)` | Minimum value | `MIN(c.created_at)` |
| `MAX(expr)` | Maximum value | `MAX(c.price)` |

## Advanced Query Patterns

### Array Operations

```python
# Check if array contains value
query = "SELECT * FROM c WHERE ARRAY_CONTAINS(c.tags, 'urgent')"

# Check if array contains object with property
query = """
SELECT * FROM c
WHERE ARRAY_CONTAINS(c.items, {'product_id': @product_id}, true)
"""

# Flatten array with JOIN
query = """
SELECT c.id, c.order_id, item.product_name, item.quantity
FROM c
JOIN item IN c.items
WHERE item.quantity > @min_quantity
"""

# Array length
query = "SELECT * FROM c WHERE ARRAY_LENGTH(c.tags) > 3"
```

### String Functions

```python
# Case-insensitive search (expensive - no index)
query = "SELECT * FROM c WHERE LOWER(c.name) = LOWER(@search_name)"

# Index behavior depends on function and query plan; measure request charge
query = "SELECT * FROM c WHERE STARTSWITH(c.name, @prefix)"  # Uses index
query = "SELECT * FROM c WHERE CONTAINS(c.name, @substring)"  # May use an index scan; inspect metrics

# String manipulation
query = """
SELECT
    c.id,
    CONCAT(c.first_name, ' ', c.last_name) as full_name,
    LENGTH(c.description) as desc_length
FROM c
"""
```

### Subqueries

```python
# EXISTS subquery
query = """
SELECT * FROM c
WHERE EXISTS(
    SELECT VALUE item FROM item IN c.items WHERE item.status = 'pending'
)
"""

# Scalar subquery
query = """
SELECT
    c.id,
    c.name,
    (SELECT VALUE COUNT(1) FROM item IN c.items) as item_count
FROM c
"""
```

### Ordering and Distinct

```python
# Order by (requires composite index for multiple fields)
query = "SELECT * FROM c ORDER BY c.created_at DESC, c.priority ASC"

# Distinct values
query = "SELECT DISTINCT VALUE c.category FROM c"

# Top N
query = "SELECT TOP 10 * FROM c ORDER BY c.score DESC"
```

## Transactions (Transactional Batch)

Execute multiple operations atomically within a single partition:

```python
def transfer_funds(container, from_account_id, to_account_id, amount_minor, partition_key):
    """Illustration only: amounts stored as integer minor units in one partition.
    Caller must add a unique durable operation ID for ambiguous-response retries.
    """
    if not isinstance(amount_minor, int) or isinstance(amount_minor, bool) or amount_minor <= 0:
        raise ValueError("positive integer minor units required")
    if from_account_id == to_account_id:
        raise ValueError("distinct accounts required")
    source = container.read_item(item=from_account_id, partition_key=partition_key)
    target = container.read_item(item=to_account_id, partition_key=partition_key)
    if source["balance_minor"] < amount_minor:
        raise ValueError("Insufficient funds")
    source["balance_minor"] -= amount_minor
    target["balance_minor"] += amount_minor
    operations = [
        ("replace", (source["id"], source), {"if_match_etag": source["_etag"]}),
        ("replace", (target["id"], target), {"if_match_etag": target["_etag"]}),
    ]
    return container.execute_item_batch(batch_operations=operations, partition_key=partition_key)
```

### Batch Operations

```python
def batch_create_items(container, items, partition_key):
    # Do not silently discard items after the first hundred. Request-size/time
    # limits also apply; one batch is atomic only inside one logical partition.
    if not 1 <= len(items) <= 100:
        raise ValueError("one batch requires 1..100 items")
    return container.execute_item_batch(
        batch_operations=[("create", (item,), {}) for item in items],
        partition_key=partition_key,
    )
```

## Change Feed

Process changes to documents in order:

```python
def process_change_feed(container, partition_key: str | None = None):
    """Process change feed for a container."""

    # Start from beginning
    change_feed = container.query_items_change_feed(
        partition_key=partition_key,  # None for all partitions
        is_start_from_beginning=True
    )

    for change in change_feed:
        print(f"Changed document: {change['id']}")
        # Process the change
        process_document(change)

    # Get continuation token for next run
    raise NotImplementedError("Add a reviewed page-iterator checkpoint implementation for the pinned SDK before using this worker")

def process_change_feed_incremental(container, continuation_token: str):
    """Resume change feed from continuation token."""
    change_feed = container.query_items_change_feed(
        continuation_token=continuation_token
    )

    for change in change_feed:
        process_document(change)

    raise NotImplementedError("Persist a verified change-feed continuation token after processing; do not substitute an item ETag")
```

## Query Best Practices

| Practice | Recommendation |
|----------|----------------|
| Always use partition key | Avoid cross-partition queries when possible |
| Use parameters | Enable query plan caching, prevent injection |
| Project only needed fields | Reduces RU cost and bandwidth |
| Use point reads | For single document by ID, use `read_item` not query |
| Index strategy | Create composite indexes for ORDER BY on multiple fields |
| Pagination | Use continuation tokens for large result sets |
| Aggregations | Prefer single-partition aggregations |
| Avoid OFFSET | Use continuation tokens instead for large datasets |

## RU Estimation

```python
def estimate_query_cost(container, query: str, partition_key: str, parameters: list | None = None):
    """Execute query and return RU cost."""

    charges = []
    def on_response(headers, _result):
        if "x-ms-request-charge" in headers:
            charges.append(float(headers["x-ms-request-charge"]))
    results = container.query_items(query=query, parameters=parameters or [],
        partition_key=partition_key, response_hook=on_response)
    items = list(results)
    total = sum(charges) if charges else None
    print(f"Returned {len(items)} items; observed RU charge: {total}")
    return items, total
```
