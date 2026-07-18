---
name: azure-cosmos-py
description: Azure Cosmos DB SDK for Python (NoSQL API). Use for document CRUD, queries, containers, and globally distributed data.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Cosmos DB SDK for Python

Client library for Azure Cosmos DB NoSQL API — globally distributed, multi-model database.

## Installation

```bash
pip install azure-cosmos azure-identity
```

## Environment Variables

```bash
COSMOS_ENDPOINT=https://<account>.documents.azure.com:443/
COSMOS_DATABASE=mydb
COSMOS_CONTAINER=mycontainer
```

## Authentication

```python
from azure.identity import DefaultAzureCredential
from azure.cosmos import CosmosClient

credential = DefaultAzureCredential()
endpoint = "https://<account>.documents.azure.com:443/"

client = CosmosClient(url=endpoint, credential=credential)
```

## Client Hierarchy

| Client | Purpose | Get From |
|--------|---------|----------|
| `CosmosClient` | Account-level operations | Direct instantiation |
| `DatabaseProxy` | Database operations | `client.get_database_client()` |
| `ContainerProxy` | Container/item operations | `database.get_container_client()` |

## Core Workflow

Before any create or throughput update, confirm the intended Azure account/endpoint, database and container names, throughput mode and RU/s, expected cost impact, and authorization to modify those resources. Immediately before a replace, upsert, or delete, re-display the exact account, database, container, item ID, and partition-key value; require explicit approval for that operation and target. Do not infer destructive approval from an earlier setup confirmation.

### Setup Database and Container

```python
from azure.cosmos import PartitionKey

# Get or create database
database = client.create_database_if_not_exists(id="mydb")

# Get or create container with partition key
container = database.create_container_if_not_exists(
    id="mycontainer",
    partition_key=PartitionKey(path="/category")
)

# Get existing
database = client.get_database_client("mydb")
container = database.get_container_client("mycontainer")
```

### Create Item

```python
item = {
    "id": "item-001",           # Required: unique within partition
    "category": "electronics",   # Partition key value
    "name": "Laptop",
    "price": 999.99,
    "tags": ["computer", "portable"]
}

created = container.create_item(body=item)
print(f"Created: {created['id']}")
```

### Read Item

```python
# Read requires id AND partition key
item = container.read_item(
    item="item-001",
    partition_key="electronics"
)
print(f"Name: {item['name']}")
```

### Update Item (Replace)

After reading the current item, show the proposed field-level diff and obtain the
target-bound replace approval described above before calling `replace_item`.

```python
item = container.read_item(item="item-001", partition_key="electronics")
item["price"] = 899.99
item["on_sale"] = True

updated = container.replace_item(item=item["id"], body=item)
```

### Upsert Item

Resolve whether the target ID already exists. If it exists, treat the upsert as a
replace and obtain immediate approval for the displayed diff and exact partition.

```python
# Create if not exists, replace if exists
item = {
    "id": "item-002",
    "category": "electronics",
    "name": "Tablet",
    "price": 499.99
}

result = container.upsert_item(body=item)
```

### Delete Item

Read and display the exact item ID and partition-key value first. Require a fresh,
explicit delete approval, confirm any retention or recovery requirement, and only
then call `delete_item`.

```python
container.delete_item(
    item="item-001",
    partition_key="electronics"
)
```

## Queries

### Basic Query

```python
# Query within a partition (efficient)
query = "SELECT * FROM c WHERE c.price < @max_price"
items = container.query_items(
    query=query,
    parameters=[{"name": "@max_price", "value": 500}],
    partition_key="electronics"
)

for item in items:
    print(f"{item['name']}: ${item['price']}")
```

### Cross-Partition Query

```python
# Cross-partition (more expensive, use sparingly)
query = "SELECT * FROM c WHERE c.price < @max_price"
items = container.query_items(
    query=query,
    parameters=[{"name": "@max_price", "value": 500}],
    enable_cross_partition_query=True
)

for item in items:
    print(item)
```

### Query with Projection

```python
query = "SELECT c.id, c.name, c.price FROM c WHERE c.category = @category"
items = container.query_items(
    query=query,
    parameters=[{"name": "@category", "value": "electronics"}],
    partition_key="electronics"
)
```

### Read All Items

```python
# Read all in a partition
items = container.read_all_items()  # Cross-partition
# Or with partition key
items = container.query_items(
    query="SELECT * FROM c",
    partition_key="electronics"
)
```

## Partition Keys

**Critical**: Always include partition key for efficient operations.

```python
from azure.cosmos import PartitionKey

# Single partition key
container = database.create_container_if_not_exists(
    id="orders",
    partition_key=PartitionKey(path="/customer_id")
)

# Hierarchical partition key
container = database.create_container_if_not_exists(
    id="events",
    partition_key=PartitionKey(path=["/tenant_id", "/user_id"])
)
```

## Throughput

```python
# Create container with provisioned throughput
container = database.create_container_if_not_exists(
    id="mycontainer",
    partition_key=PartitionKey(path="/pk"),
    offer_throughput=400  # RU/s
)

# Read current throughput
offer = container.read_offer()
print(f"Throughput: {offer.offer_throughput} RU/s")

# Update throughput
container.replace_throughput(throughput=1000)
```

## Async Client

```python
from azure.cosmos.aio import CosmosClient
from azure.identity.aio import DefaultAzureCredential

async def cosmos_operations():
    credential = DefaultAzureCredential()
    
    async with CosmosClient(endpoint, credential=credential) as client:
        database = client.get_database_client("mydb")
        container = database.get_container_client("mycontainer")
        
        # Create
        await container.create_item(body={"id": "1", "pk": "test"})
        
        # Read
        item = await container.read_item(item="1", partition_key="test")
        
        # Query
        async for item in container.query_items(
            query="SELECT * FROM c",
            partition_key="test"
        ):
            print(item)

import asyncio
asyncio.run(cosmos_operations())
```

## Error Handling

```python
from azure.cosmos.exceptions import CosmosHttpResponseError

try:
    item = container.read_item(item="nonexistent", partition_key="pk")
except CosmosHttpResponseError as e:
    if e.status_code == 404:
        print("Item not found")
    elif e.status_code == 429:
        print(f"Rate limited. Retry after: {e.headers.get('x-ms-retry-after-ms')}ms")
    else:
        raise
```

## Best Practices

1. **Always specify partition key** for point reads and queries
2. **Use parameterized queries** to prevent injection and improve caching
3. **Avoid cross-partition queries** when possible
4. **Use `upsert_item`** for idempotent writes
5. **Use async client** for high-throughput scenarios
6. **Design partition key** for even data distribution
7. **Use `read_item`** instead of query for single document retrieval

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
