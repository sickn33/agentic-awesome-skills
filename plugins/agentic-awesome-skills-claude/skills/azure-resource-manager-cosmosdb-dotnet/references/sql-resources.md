# SQL API Resources

Patterns for managing SQL (Core) API databases, containers, and programmability objects. Modified: TTL semantics, blocked incomplete destructive procedure and partition-key caveats. A 24-hour TTL deletes eligible existing/new items based on last modification; confirm retention before enabling. Creating a trigger does not invoke it automatically: data-plane requests must explicitly request it. Unique keys apply within a logical partition.

## SQL Database Operations

### Create Database

```csharp
using Azure.ResourceManager.CosmosDB;
using Azure.ResourceManager.CosmosDB.Models;

var databaseData = new CosmosDBSqlDatabaseCreateOrUpdateContent(
    new CosmosDBSqlDatabaseResourceInfo("my-database"));

var databaseCollection = account.GetCosmosDBSqlDatabases();
var operation = await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-database",
    databaseData);

CosmosDBSqlDatabaseResource database = operation.Value;
```

### Create Database with Shared Throughput

```csharp
var databaseData = new CosmosDBSqlDatabaseCreateOrUpdateContent(
    new CosmosDBSqlDatabaseResourceInfo("my-database"))
{
    Options = new CosmosDBCreateUpdateConfig
    {
        Throughput = 400  // Shared across containers
    }
};

// Or with autoscale
var databaseData = new CosmosDBSqlDatabaseCreateOrUpdateContent(
    new CosmosDBSqlDatabaseResourceInfo("my-database"))
{
    Options = new CosmosDBCreateUpdateConfig
    {
        AutoscaleSettings = new AutoscaleSettings
        {
            MaxThroughput = 4000
        }
    }
};
```

### List Databases

```csharp
await foreach (var db in account.GetCosmosDBSqlDatabases())
{
    Console.WriteLine($"Database: {db.Data.Name}");
    Console.WriteLine($"  Resource ID: {db.Data.Resource.DatabaseName}");
}
```

### Delete Database

```csharp
var database = await account.GetCosmosDBSqlDatabaseAsync("my-database");
await database.Value.DeleteAsync(WaitUntil.Completed);
```

## SQL Container Operations

### Create Container with Partition Key

```csharp
var containerData = new CosmosDBSqlContainerCreateOrUpdateContent(
    new CosmosDBSqlContainerResourceInfo("my-container")
    {
        PartitionKey = new CosmosDBContainerPartitionKey
        {
            Paths = { "/tenantId" },
            Kind = CosmosDBPartitionKind.Hash,
            Version = 2  // Hash V2; hierarchical keys additionally require MultiHash and multiple paths
        }
    });

var containerCollection = database.GetCosmosDBSqlContainers();
var operation = await containerCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-container",
    containerData);
```

### Hierarchical Partition Key (V2)

```csharp
var containerData = new CosmosDBSqlContainerCreateOrUpdateContent(
    new CosmosDBSqlContainerResourceInfo("my-container")
    {
        PartitionKey = new CosmosDBContainerPartitionKey
        {
            Paths = { "/tenantId", "/userId", "/sessionId" },
            Kind = CosmosDBPartitionKind.MultiHash,
            Version = 2
        }
    });
```

### Create Container with Indexing Policy

```csharp
var containerData = new CosmosDBSqlContainerCreateOrUpdateContent(
    new CosmosDBSqlContainerResourceInfo("my-container")
    {
        PartitionKey = new CosmosDBContainerPartitionKey
        {
            Paths = { "/partitionKey" },
            Kind = CosmosDBPartitionKind.Hash
        },
        IndexingPolicy = new CosmosDBIndexingPolicy
        {
            Automatic = true,
            IndexingMode = CosmosDBIndexingMode.Consistent,

            // Include paths
            IncludedPaths =
            {
                new CosmosDBIncludedPath { Path = "/*" }
            },

            // Exclude paths
            ExcludedPaths =
            {
                new CosmosDBExcludedPath { Path = "/largeTextField/*" },
                new CosmosDBExcludedPath { Path = "/_etag/?" }
            },

            // Composite indexes for ORDER BY on multiple fields
            CompositeIndexes =
            {
                new CosmosDBCompositePath[]
                {
                    new() { Path = "/name", Order = CompositePathSortOrder.Ascending },
                    new() { Path = "/timestamp", Order = CompositePathSortOrder.Descending }
                }
            },

            // Spatial indexes
            SpatialIndexes =
            {
                new SpatialSpec
                {
                    Path = "/location/*",
                    Types = { SpatialType.Point, SpatialType.Polygon }
                }
            }
        }
    });
```

### Create Container with TTL

```csharp
var containerData = new CosmosDBSqlContainerCreateOrUpdateContent(
    new CosmosDBSqlContainerResourceInfo("my-container")
    {
        PartitionKey = new CosmosDBContainerPartitionKey
        {
            Paths = { "/partitionKey" },
            Kind = CosmosDBPartitionKind.Hash
        },
        // Default TTL: null = off; -1 = enabled with no default expiration; >0 = seconds; 0 is invalid
        DefaultTtl = 86400  // 24 hours
    });
```

### Create Container with Unique Keys

```csharp
var containerData = new CosmosDBSqlContainerCreateOrUpdateContent(
    new CosmosDBSqlContainerResourceInfo("my-container")
    {
        PartitionKey = new CosmosDBContainerPartitionKey
        {
            Paths = { "/tenantId" },
            Kind = CosmosDBPartitionKind.Hash
        },
        UniqueKeys = new CosmosDBUniqueKeyPolicy
        {
            UniqueKeys =
            {
                new CosmosDBUniqueKey
                {
                    Paths = { "/email" }
                },
                new CosmosDBUniqueKey
                {
                    Paths = { "/department", "/employeeId" }
                }
            }
        }
    });
```

### Create Container with Dedicated Throughput

```csharp
var containerData = new CosmosDBSqlContainerCreateOrUpdateContent(
    new CosmosDBSqlContainerResourceInfo("my-container")
    {
        PartitionKey = new CosmosDBContainerPartitionKey
        {
            Paths = { "/partitionKey" },
            Kind = CosmosDBPartitionKind.Hash
        }
    })
{
    Options = new CosmosDBCreateUpdateConfig
    {
        Throughput = 1000  // Dedicated to this container
    }
};
```

### List Containers

```csharp
await foreach (var container in database.GetCosmosDBSqlContainers())
{
    Console.WriteLine($"Container: {container.Data.Name}");
    Console.WriteLine($"  Partition Key: {string.Join(", ", container.Data.Resource.PartitionKey.Paths)}");
    Console.WriteLine($"  Default TTL: {container.Data.Resource.DefaultTtl}");
}
```

### Delete Container

```csharp
var container = await database.GetCosmosDBSqlContainerAsync("my-container");
await container.Value.DeleteAsync(WaitUntil.Completed);
```

## Stored Procedures

### Create Stored Procedure

```csharp
var sprocData = new CosmosDBSqlStoredProcedureCreateOrUpdateContent(
    new CosmosDBSqlStoredProcedureResourceInfo("bulkDelete")
    {
        Body = @"
function bulkDelete(query) {
    // Deliberately blocked: the previous sketch counted unaccepted/asynchronous
    // deletes and ignored query pagination. Supply a reviewed bounded procedure
    // that checks every callback/acceptance and returns resumable continuation.
    throw new Error('Bulk deletion requires a reviewed implementation');
}"
    });

var sprocCollection = container.GetCosmosDBSqlStoredProcedures();
await sprocCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "bulkDelete",
    sprocData);
```

### List Stored Procedures

```csharp
await foreach (var sproc in container.GetCosmosDBSqlStoredProcedures())
{
    Console.WriteLine($"Stored Procedure: {sproc.Data.Name}");
}
```

## Triggers

### Create Trigger

```csharp
var triggerData = new CosmosDBSqlTriggerCreateOrUpdateContent(
    new CosmosDBSqlTriggerResourceInfo("validateDocument")
    {
        Body = @"
function validateDocument() {
    var context = getContext();
    var request = context.getRequest();
    var doc = request.getBody();

    if (!doc.createdAt) {
        doc.createdAt = new Date().toISOString();
    }

    request.setBody(doc);
}",
        TriggerType = CosmosDBSqlTriggerType.Pre,
        TriggerOperation = CosmosDBSqlTriggerOperation.Create
    });

var triggerCollection = container.GetCosmosDBSqlTriggers();
await triggerCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "validateDocument",
    triggerData);
```

### Trigger Types

| Type | When |
|------|------|
| `Pre` | Before the operation |
| `Post` | After the operation |

### Trigger Operations

| Operation | Applies To |
|-----------|------------|
| `All` | All operations |
| `Create` | Document creation |
| `Delete` | Document deletion |
| `Replace` | Document replacement |

## User Defined Functions (UDFs)

### Create UDF

```csharp
var udfData = new CosmosDBSqlUserDefinedFunctionCreateOrUpdateContent(
    new CosmosDBSqlUserDefinedFunctionResourceInfo("formatCurrency")
    {
        Body = @"
function formatCurrency(amount, currency) {
    return currency + ' ' + amount.toFixed(2);
}"
    });

var udfCollection = container.GetCosmosDBSqlUserDefinedFunctions();
await udfCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "formatCurrency",
    udfData);
```

## Partition Key Strategies

| Strategy | Path Example | Use Case |
|----------|--------------|----------|
| Single property | `/tenantId` | Multi-tenant apps |
| Synthetic key | `/partitionKey` | Computed from multiple fields |
| Hierarchical | `/tenantId`, `/userId` | Large tenants with sub-partitioning |
| ID-based | `/id` | Can distribute by ID; queries lacking the ID partition key still fan out |

### Choosing Partition Key

1. **High cardinality** — Many distinct values
2. **Even distribution** — No hot partitions
3. **Query alignment** — Most queries include partition key
4. **Immutable** — Cannot change after document creation
