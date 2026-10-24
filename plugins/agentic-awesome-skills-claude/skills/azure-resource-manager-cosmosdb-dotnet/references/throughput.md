# Throughput Configuration

Patterns for configuring and managing throughput (RU/s) for Cosmos DB resources. Modified: qualified historical sizing/costs. Minimums depend on stored data, peak historical throughput and container counts; use the resource-reported minimum. Dollar estimates below are unverified historical illustrations, not current quotes. Shared database throughput cannot be applied to a database created without it by this update call; choose a supported migration/recreation plan. Serverless does not use provisioned-throughput update operations.

## Throughput Concepts

| Type | Description | Min RU/s | Use Case |
|------|-------------|----------|----------|
| **Manual** | Fixed provisioned throughput | 400 | Predictable workloads |
| **Autoscale** | Scales between 10% and max | 1000 (max) | Variable workloads |
| **Serverless** | Pay per request | N/A | Dev/test, sporadic traffic |

## Database-Level Throughput (Shared)

Throughput shared across all containers in the database.

### Set Manual Throughput

```csharp
using Azure.ResourceManager.CosmosDB;
using Azure.ResourceManager.CosmosDB.Models;

// Create database with shared throughput
var databaseData = new CosmosDBSqlDatabaseCreateOrUpdateContent(
    new CosmosDBSqlDatabaseResourceInfo("my-database"))
{
    Options = new CosmosDBCreateUpdateConfig
    {
        Throughput = 400
    }
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-database",
    databaseData);
```

### Set Autoscale Throughput

```csharp
var databaseData = new CosmosDBSqlDatabaseCreateOrUpdateContent(
    new CosmosDBSqlDatabaseResourceInfo("my-database"))
{
    Options = new CosmosDBCreateUpdateConfig
    {
        AutoscaleSettings = new AutoscaleSettings
        {
            MaxThroughput = 4000  // Scales between 400-4000 RU/s
        }
    }
};
```

### Update Database Throughput

```csharp
var database = await account.GetCosmosDBSqlDatabaseAsync("my-database");

// Update to manual throughput
var throughputData = new ThroughputSettingsUpdateData(
    new ThroughputSettingsResourceInfo
    {
        Throughput = 800
    });

await database.Value.CreateOrUpdateCosmosDBSqlDatabaseThroughputAsync(
    WaitUntil.Completed,
    throughputData);
```

### Get Database Throughput

```csharp
var database = await account.GetCosmosDBSqlDatabaseAsync("my-database");
var throughput = await database.Value.GetCosmosDBSqlDatabaseThroughputAsync();

Console.WriteLine($"Throughput: {throughput.Value.Data.Resource.Throughput}");
Console.WriteLine($"Min Throughput: {throughput.Value.Data.Resource.MinimumThroughput}");

if (throughput.Value.Data.Resource.AutoscaleSettings != null)
{
    Console.WriteLine($"Autoscale Max: {throughput.Value.Data.Resource.AutoscaleSettings.MaxThroughput}");
}
```

## Container-Level Throughput (Dedicated)

Throughput dedicated to a single container.

### Set Manual Throughput

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
        Throughput = 1000
    }
};

await containerCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-container",
    containerData);
```

### Set Autoscale Throughput

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
        AutoscaleSettings = new AutoscaleSettings
        {
            MaxThroughput = 10000  // Scales between 1000-10000 RU/s
        }
    }
};
```

### Update Container Throughput

```csharp
var container = await database.GetCosmosDBSqlContainerAsync("my-container");

// Update to new throughput
var throughputData = new ThroughputSettingsUpdateData(
    new ThroughputSettingsResourceInfo
    {
        Throughput = 2000
    });

await container.Value.CreateOrUpdateCosmosDBSqlContainerThroughputAsync(
    WaitUntil.Completed,
    throughputData);
```

### Get Container Throughput

```csharp
var container = await database.GetCosmosDBSqlContainerAsync("my-container");
var throughput = await container.Value.GetCosmosDBSqlContainerThroughputAsync();

Console.WriteLine($"Throughput: {throughput.Value.Data.Resource.Throughput}");
```

## Migrate Between Throughput Modes

### Manual to Autoscale

```csharp
var container = await database.GetCosmosDBSqlContainerAsync("my-container");

// Migrate to autoscale
await container.Value.MigrateCosmosDBSqlContainerToAutoscaleAsync(WaitUntil.Completed);
```

### Autoscale to Manual

```csharp
var container = await database.GetCosmosDBSqlContainerAsync("my-container");

// Migrate to manual (uses current autoscale throughput as manual value)
await container.Value.MigrateCosmosDBSqlContainerToManualThroughputAsync(WaitUntil.Completed);
```

### Database-Level Migration

```csharp
var database = await account.GetCosmosDBSqlDatabaseAsync("my-database");

// To autoscale
await database.Value.MigrateCosmosDBSqlDatabaseToAutoscaleAsync(WaitUntil.Completed);

// To manual
await database.Value.MigrateCosmosDBSqlDatabaseToManualThroughputAsync(WaitUntil.Completed);
```

## Throughput Calculation Guidelines

### Estimating RU/s

| Operation | Approximate RU Cost |
|-----------|---------------------|
| Point read (1KB doc by ID + partition key) | 1 RU |
| Write (1KB doc) | 5-10 RU |
| Query (simple, single partition) | 2-5 RU |
| Query (complex, cross-partition) | 10-100+ RU |

### Sizing Formula

```
Required RU/s = (Reads/sec × RU per read) + (Writes/sec × RU per write) + (Queries/sec × RU per query)
```

### Autoscale Tiers

| Max Throughput | Min Throughput (10%) | Monthly Cost Estimate |
|----------------|----------------------|----------------------|
| 1,000 RU/s | 100 RU/s | ~$58 |
| 4,000 RU/s | 400 RU/s | ~$233 |
| 10,000 RU/s | 1,000 RU/s | ~$584 |
| 100,000 RU/s | 10,000 RU/s | ~$5,840 |

## Best Practices

1. **Start with autoscale** for new workloads until you understand traffic patterns
2. **Use database-level throughput** when containers have similar access patterns
3. **Use container-level throughput** for containers with distinct performance needs
4. **Monitor RU consumption** via Azure Monitor to right-size throughput
5. **Set alerts** for 429 (rate limiting) errors
6. **Consider serverless** for dev/test or sporadic workloads

## Error Handling

```csharp
try
{
    await container.Value.CreateOrUpdateCosmosDBSqlContainerThroughputAsync(
        WaitUntil.Completed,
        throughputData);
}
catch (RequestFailedException ex) when (ex.Status == 400)
{
    // Common: throughput below minimum or invalid autoscale settings
    Console.WriteLine($"Invalid throughput configuration: {ex.Message}");
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    // Conflict: migration already in progress
    Console.WriteLine($"Throughput migration in progress: {ex.Message}");
}
```

## Throughput for Other APIs

### Cassandra Keyspace

```csharp
var keyspaceData = new CassandraKeyspaceCreateOrUpdateContent(
    new CassandraKeyspaceResourceInfo("my-keyspace"))
{
    Options = new CosmosDBCreateUpdateConfig
    {
        Throughput = 400
    }
};
```

### MongoDB Database

```csharp
var mongoDbData = new MongoDBDatabaseCreateOrUpdateContent(
    new MongoDBDatabaseResourceInfo("my-mongodb"))
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

### Gremlin Database

```csharp
var gremlinData = new GremlinDatabaseCreateOrUpdateContent(
    new GremlinDatabaseResourceInfo("my-gremlin"))
{
    Options = new CosmosDBCreateUpdateConfig
    {
        Throughput = 400
    }
};
```

### Table API

```csharp
var tableData = new CosmosDBTableCreateOrUpdateContent(
    new CosmosDBTableResourceInfo("my-table"))
{
    Options = new CosmosDBCreateUpdateConfig
    {
        Throughput = 400
    }
};
```
