# Partition Key Strategies

Comprehensive guide to partition key design and optimization for Azure Cosmos DB.

## Partition Key Fundamentals

### What is a Partition Key?

A partition key determines how data is distributed across physical partitions:

- **Logical partition**: All items with the same partition key value
- **Physical partition**: Storage unit that holds one or more logical partitions
- **Maximum logical partition size**: 20 GB

```python
from azure.cosmos import PartitionKey

# Define partition key at container creation
container = database.create_container_if_not_exists(
    id="orders",
    partition_key=PartitionKey(path="/customer_id")
)
```

## Choosing a Partition Key

### Good Partition Key Characteristics

| Characteristic | Why It Matters |
|---------------|----------------|
| High cardinality | Many unique values = even distribution |
| Even distribution | Prevents hot partitions |
| Frequently used in queries | Enables efficient single-partition queries |
| Immutable | Partition key cannot be changed after item creation |

### Common Partition Key Patterns

```python
# E-commerce orders - partition by customer
container = database.create_container_if_not_exists(
    id="orders",
    partition_key=PartitionKey(path="/customer_id")
)
# Query: "Get all orders for customer X" - efficient single partition

# IoT telemetry - partition by device
container = database.create_container_if_not_exists(
    id="telemetry",
    partition_key=PartitionKey(path="/device_id")
)
# Query: "Get recent readings for device X" - efficient

# Multi-tenant SaaS - partition by tenant
container = database.create_container_if_not_exists(
    id="data",
    partition_key=PartitionKey(path="/tenant_id")
)
# Query: "Get all data for tenant X" - efficient, isolated
```

### Anti-Patterns to Avoid

```python
# BAD: Low cardinality partition key
# Only 2 values = all data in 2 partitions
partition_key=PartitionKey(path="/status")  # "active" or "inactive"

# BAD: Timestamp as partition key (unless with synthetic key)
# Creates write-only partitions, recent partition is always hot
partition_key=PartitionKey(path="/created_date")

# Workload-dependent: monotonically increasing ID
# Cosmos hashes keys: monotonic unique values do not by themselves concentrate writes; evaluate actual cardinality and access skew.
partition_key=PartitionKey(path="/auto_increment_id")
```

## Hierarchical Partition Keys

For workloads needing multi-level distribution:

```python
from azure.cosmos import PartitionKey

# Two-level hierarchy: tenant → user
container = database.create_container_if_not_exists(
    id="user_events",
    partition_key=PartitionKey(path=["/tenant_id", "/user_id"])
)

# Three-level hierarchy: tenant → department → user
container = database.create_container_if_not_exists(
    id="enterprise_data",
    partition_key=PartitionKey(path=["/tenant_id", "/department", "/user_id"])
)
```

### Querying with Hierarchical Keys

```python
# Full key path - most efficient
items = container.query_items(
    query="SELECT * FROM c WHERE c.status = 'active'",
    partition_key=["tenant-123", "user-456"]  # List for hierarchical
)

# Partial key path - queries within tenant
items = container.query_items(
    query="SELECT * FROM c WHERE c.department = 'engineering'",
    partition_key=["tenant-123"]  # Queries all users in tenant
)
```

### Hierarchical Key Benefits

| Scenario | Single Key | Hierarchical Key |
|----------|------------|------------------|
| Multi-tenant with user isolation | Cross-partition for tenant-wide queries | Single partition for tenant, sub-partitions for users |
| Geographic + temporal data | Choose one dimension | Partition by region, then by date |
| Hot partition mitigation | Limited options | Add synthetic suffix as sub-key |

## Synthetic Partition Keys

When natural keys have poor distribution:

```python
import hashlib

def create_item_with_synthetic_key(container, item: dict, num_buckets: int = 10):
    """Add synthetic partition key for better distribution."""
    # Generate bucket from item ID
    bucket = int(hashlib.md5(item["id"].encode()).hexdigest(), 16) % num_buckets

    # Combine natural key with bucket
    item["pk"] = f"{item['category']}_{bucket}"

    return container.create_item(body=item)

# Example: Distribute "electronics" category across 10 partitions
item = {
    "id": "item-001",
    "category": "electronics",
    "name": "Laptop"
}
create_item_with_synthetic_key(container, item)
# Results in pk: "electronics_7" (depending on hash)
```

### Time-Based Synthetic Keys

```python
from datetime import datetime

def create_event_with_time_bucket(container, event: dict):
    """Partition by device with hourly buckets."""
    timestamp = event.get("timestamp", datetime.utcnow())
    event["timestamp"] = timestamp.isoformat() + "Z"  # JSON serializable UTC text
    hour_bucket = timestamp.strftime("%Y%m%d%H")

    event["pk"] = f"{event['device_id']}_{hour_bucket}"

    return container.create_item(body=event)

# Distributes writes across time-based partitions
event = {
    "id": "event-001",
    "device_id": "device-123",
    "timestamp": datetime.utcnow(),
    "value": 42.5
}
create_event_with_time_bucket(container, event)
# Results in pk: "device-123_2025012812"
```

## Hot Partition Detection

### Monitoring Partition Metrics

```python
from azure.cosmos import CosmosClient

def check_partition_metrics(container):
    """Check container throughput and partition distribution."""
    # Get container properties
    properties = container.read()
    print(f"Container ID: {properties['id']}")

    # Get current throughput
    try:
        offer = container.read_offer()
        print(f"Provisioned throughput: {offer.offer_throughput} RU/s")
    except Exception:
        raise  # auth/network/API failures do not prove serverless throughput

    # Query to check partition key distribution
    query = """
    SELECT COUNT(1) as count, c.pk
    FROM c
    GROUP BY c.pk
    """

    partition_counts = list(container.query_items(
        query=query,
        enable_cross_partition_query=True
    ))

    if partition_counts:
        total = sum(p['count'] for p in partition_counts)
        print(f"\nPartition distribution ({len(partition_counts)} partitions):")
        for p in sorted(partition_counts, key=lambda x: x['count'], reverse=True)[:10]:
            pct = (p['count'] / total) * 100
            print(f"  {p['pk']}: {p['count']} items ({pct:.1f}%)")
            if pct > 20:
                print(f"    ⚠️  High item-count share; measure RU/latency before calling it hot")
```

### Identifying Hot Partitions via Azure Portal

Key metrics to monitor:
- **Normalized RU Consumption**: >70% indicates potential hot partition
- **Partition Key Range Statistics**: Uneven distribution warnings
- **Throttled Requests (429s)**: May indicate hot partition

### Mitigation Strategies

```python
# Strategy 1: Add randomized suffix
def add_random_suffix(pk: str, num_suffixes: int = 5) -> str:
    """Distribute writes across multiple logical partitions."""
    import random
    suffix = random.randint(0, num_suffixes - 1)
    return f"{pk}_{suffix}"

# Strategy 2: Time-based bucketing
def add_time_bucket(pk: str, bucket_minutes: int = 60) -> str:
    """Create time-based sub-partitions."""
    from datetime import datetime
    if bucket_minutes <= 0:
        raise ValueError("bucket_minutes must be positive")
    import time
    bucket = int(time.time()) // (bucket_minutes * 60)
    return f"{pk}_{bucket}"

# Strategy 3: Hash-based distribution
def add_hash_bucket(pk: str, item_id: str, num_buckets: int = 10) -> str:
    """Deterministic distribution based on item ID."""
    import hashlib
    bucket = int(hashlib.sha256(item_id.encode()).hexdigest(), 16) % num_buckets
    return f"{pk}_{bucket}"
```

## Partition Key Design Patterns by Use Case

### E-commerce

```python
# Orders container: partition by customer for order history queries
orders_container = database.create_container_if_not_exists(
    id="orders",
    partition_key=PartitionKey(path="/customer_id")
)

# Products container: partition by category for browsing
products_container = database.create_container_if_not_exists(
    id="products",
    partition_key=PartitionKey(path="/category")
)

# Cart container: partition by session for cart operations
cart_container = database.create_container_if_not_exists(
    id="carts",
    partition_key=PartitionKey(path="/session_id")
)
```

### Multi-tenant SaaS

```python
# Hierarchical: tenant → resource type for isolation + efficient queries
container = database.create_container_if_not_exists(
    id="tenant_data",
    partition_key=PartitionKey(path=["/tenant_id", "/resource_type"])
)

# Document structure
document = {
    "id": "doc-001",
    "tenant_id": "tenant-abc",
    "resource_type": "project",
    "name": "My Project",
    "data": {...}
}
```

### IoT / Time Series

```python
# Hierarchical: device → time bucket for efficient range queries
container = database.create_container_if_not_exists(
    id="telemetry",
    partition_key=PartitionKey(path=["/device_id", "/day"])
)

# Document structure
telemetry = {
    "id": "reading-001",
    "device_id": "sensor-123",
    "day": "2025-01-28",  # Daily bucket
    "timestamp": "2025-01-28T12:30:00Z",
    "temperature": 22.5,
    "humidity": 45.2
}
```

### Social / Activity Feeds

```python
# Partition by user for personal feed queries
container = database.create_container_if_not_exists(
    id="activity_feed",
    partition_key=PartitionKey(path="/user_id")
)

# With write amplification for follower feeds
# Store activity in both author and follower partitions
async def post_activity(container, author_id: str, follower_ids: list[str], activity: dict):
    """Fan-out activity to author and all followers."""
    import asyncio
    tasks = []  # illustration: bound concurrency and add retry/idempotency in real fan-out

    # Author's partition
    author_activity = {**activity, "user_id": author_id, "id": f"{activity['id']}_author"}
    tasks.append(container.create_item(body=author_activity))

    # Each follower's partition
    for follower_id in follower_ids:
        follower_activity = {**activity, "user_id": follower_id, "id": f"{activity['id']}_{follower_id}"}
        tasks.append(container.create_item(body=follower_activity))

    await asyncio.gather(*tasks)
```

## Best Practices Summary

| Practice | Recommendation |
|----------|----------------|
| Cardinality | Aim for thousands+ unique values |
| Distribution | Monitor and rebalance if >20% in single partition |
| Query alignment | Partition key should match most frequent query filter |
| Size monitoring | Keep logical partitions under 15GB (20GB limit) |
| Throughput | Consider hierarchical keys for mixed workloads |
| Immutability | Plan partition key carefully - cannot change later |
