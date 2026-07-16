---
name: azure-data-tables-py
description: Azure Tables SDK for Python (Storage and Cosmos DB). Use for NoSQL key-value storage, entity CRUD, and batch operations.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Tables SDK for Python

NoSQL key-value store for structured data (Azure Storage Tables or Cosmos DB Table API).

## Installation

```bash
pip install azure-data-tables azure-identity
```

## Environment Variables

```bash
# Azure Storage Tables
AZURE_STORAGE_ACCOUNT_URL=https://<account>.table.core.windows.net

# Cosmos DB Table API
COSMOS_TABLE_ENDPOINT=https://<account>.table.cosmos.azure.com
```

## Authentication

```python
from azure.identity import DefaultAzureCredential
from azure.data.tables import TableServiceClient, TableClient

credential = DefaultAzureCredential()
endpoint = "https://<account>.table.core.windows.net"

# Service client (manage tables)
service_client = TableServiceClient(endpoint=endpoint, credential=credential)

# Table client (work with entities)
table_client = TableClient(endpoint=endpoint, table_name="mytable", credential=credential)
```

## Client Types

| Client | Purpose |
|--------|---------|
| `TableServiceClient` | Create/delete tables, list tables |
| `TableClient` | Entity CRUD, queries |

## Table Operations

```python
# Create table
service_client.create_table("mytable")

# Create if not exists
service_client.create_table_if_not_exists("mytable")

# Delete table
service_client.delete_table("mytable")

# List tables
for table in service_client.list_tables():
    print(table.name)

# Get table client
table_client = service_client.get_table_client("mytable")
```

## Entity Operations

**Important**: Every entity requires `PartitionKey` and `RowKey` (together form unique ID).

### Create Entity

```python
entity = {
    "PartitionKey": "sales",
    "RowKey": "order-001",
    "product": "Widget",
    "quantity": 5,
    "price": 9.99,
    "shipped": False
}

# Create (fails if exists)
table_client.create_entity(entity=entity)

# Upsert (create or replace)
table_client.upsert_entity(entity=entity)
```

### Get Entity

```python
# Get by key (fastest)
entity = table_client.get_entity(
    partition_key="sales",
    row_key="order-001"
)
print(f"Product: {entity['product']}")
```

### Update Entity

```python
# Replace entire entity
entity["quantity"] = 10
table_client.update_entity(entity=entity, mode="replace")

# Merge (update specific fields only)
update = {
    "PartitionKey": "sales",
    "RowKey": "order-001",
    "shipped": True
}
table_client.update_entity(entity=update, mode="merge")
```

### Delete Entity

```python
table_client.delete_entity(
    partition_key="sales",
    row_key="order-001"
)
```

## Query Entities

### Query Within Partition

```python
# Query by partition (efficient)
entities = table_client.query_entities(
    query_filter="PartitionKey eq 'sales'"
)
for entity in entities:
    print(entity)
```

### Query with Filters

```python
# Filter by properties
entities = table_client.query_entities(
    query_filter="PartitionKey eq 'sales' and quantity gt 3"
)

# With parameters (safer)
entities = table_client.query_entities(
    query_filter="PartitionKey eq @pk and price lt @max_price",
    parameters={"pk": "sales", "max_price": 50.0}
)
```

### Select Specific Properties

```python
entities = table_client.query_entities(
    query_filter="PartitionKey eq 'sales'",
    select=["RowKey", "product", "price"]
)
```

### List All Entities

```python
# List all (cross-partition - use sparingly)
for entity in table_client.list_entities():
    print(entity)
```

## Batch Operations

```python
from azure.data.tables import TableTransactionError

# Batch operations (same partition only!)
operations = [
    ("create", {"PartitionKey": "batch", "RowKey": "1", "data": "first"}),
    ("create", {"PartitionKey": "batch", "RowKey": "2", "data": "second"}),
    ("upsert", {"PartitionKey": "batch", "RowKey": "3", "data": "third"}),
]

try:
    table_client.submit_transaction(operations)
except TableTransactionError as e:
    print(f"Transaction failed: {e}")
```

## Async Client

```python
from azure.data.tables.aio import TableServiceClient, TableClient
from azure.identity.aio import DefaultAzureCredential

async def table_operations():
    credential = DefaultAzureCredential()
    
    async with TableClient(
        endpoint="https://<account>.table.core.windows.net",
        table_name="mytable",
        credential=credential
    ) as client:
        # Create
        await client.create_entity(entity={
            "PartitionKey": "async",
            "RowKey": "1",
            "data": "test"
        })
        
        # Query
        async for entity in client.query_entities("PartitionKey eq 'async'"):
            print(entity)

import asyncio
asyncio.run(table_operations())
```

## Data Types

| Python Type | Table Storage Type |
|-------------|-------------------|
| `str` | String |
| `int` | Int64 |
| `float` | Double |
| `bool` | Boolean |
| `datetime` | DateTime |
| `bytes` | Binary |
| `UUID` | Guid |

## Best Practices

1. **Design partition keys** for query patterns and even distribution
2. **Query within partitions** whenever possible (cross-partition is expensive)
3. **Use batch operations** for multiple entities in same partition
4. **Use `upsert_entity`** for idempotent writes
5. **Use parameterized queries** to prevent injection
6. **Keep entities small** — max 1MB per entity
7. **Use async client** for high-throughput scenarios

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
