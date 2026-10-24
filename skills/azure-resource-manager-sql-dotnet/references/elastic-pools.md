# Elastic Pools

Elastic pool management for Azure SQL.

## Create DTU-Based Elastic Pool

```csharp
using Azure.ResourceManager.Sql;
using Azure.ResourceManager.Sql.Models;

var poolData = new ElasticPoolData(AzureLocation.EastUS)
{
    Sku = new SqlSku("StandardPool")
    {
        Tier = "Standard",
        Capacity = 100 // 100 eDTUs
    },
    PerDatabaseSettings = new ElasticPoolPerDatabaseSettings
    {
        MinCapacity = 0,   // Min eDTUs per database
        MaxCapacity = 100  // Max eDTUs per database
    }
};

var poolCollection = server.GetElasticPools();
var operation = await poolCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-standard-pool",
    poolData);

ElasticPoolResource pool = operation.Value;
```

## Create vCore-Based Elastic Pool

```csharp
var poolData = new ElasticPoolData(AzureLocation.EastUS)
{
    Sku = new SqlSku("GP_Gen5_2")
    {
        Tier = "GeneralPurpose",
        Family = "Gen5",
        Capacity = 2 // vCores
    },
    PerDatabaseSettings = new ElasticPoolPerDatabaseSettings
    {
        MinCapacity = 0,
        MaxCapacity = 2
    },
    ZoneRedundant = false,
    LicenseType = DatabaseLicenseType.LicenseIncluded // or BasePrice for Azure Hybrid Benefit
};

await poolCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-vcore-pool",
    poolData);
```

## Create Premium Elastic Pool with Zone Redundancy

```csharp
var poolData = new ElasticPoolData(AzureLocation.EastUS)
{
    Sku = new SqlSku("PremiumPool")
    {
        Tier = "Premium",
        Capacity = 125 // 125 eDTUs
    },
    PerDatabaseSettings = new ElasticPoolPerDatabaseSettings
    {
        MinCapacity = 0,
        MaxCapacity = 125
    },
    ZoneRedundant = true
};

await poolCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-premium-pool",
    poolData);
```

## Add Database to Elastic Pool

```csharp
// Create new database in pool
var databaseData = new SqlDatabaseData(AzureLocation.EastUS)
{
    ElasticPoolId = pool.Id
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "pooled-database",
    databaseData);
```

## Move Existing Database to Elastic Pool

```csharp
// Get existing database
var database = await databaseCollection.GetAsync("standalone-database");

// Update to use elastic pool
var updateData = new SqlDatabaseData(database.Value.Data.Location)
{
    ElasticPoolId = pool.Id
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "standalone-database",
    updateData);
```

## Remove Database from Elastic Pool

```csharp
// Move database out of pool by assigning a standalone SKU
var updateData = new SqlDatabaseData(database.Value.Data.Location)
{
    Sku = new SqlSku("S0") { Tier = "Standard" },
    ElasticPoolId = null
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "pooled-database",
    updateData);
```

## Scale Elastic Pool

```csharp
var pool = await poolCollection.GetAsync("my-elastic-pool");

var updateData = new ElasticPoolData(pool.Value.Data.Location)
{
    Sku = new SqlSku("StandardPool")
    {
        Tier = "Standard",
        Capacity = 200 // Scale up to 200 eDTUs
    },
    PerDatabaseSettings = new ElasticPoolPerDatabaseSettings
    {
        MinCapacity = 10,
        MaxCapacity = 100
    }
};

await poolCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-elastic-pool",
    updateData);
```

## List Databases in Elastic Pool

```csharp
var pool = await poolCollection.GetAsync("my-elastic-pool");

// Get databases in this pool
var poolDatabases = pool.Value.GetElasticPoolDatabases();

await foreach (var db in poolDatabases)
{
    Console.WriteLine($"Database: {db.Data.Name}");
    Console.WriteLine($"  Current SKU: {db.Data.CurrentSku?.Name}");
    Console.WriteLine($"  Max Size: {db.Data.MaxSizeBytes / (1024 * 1024 * 1024)} GB");
}
```

## Monitor Elastic Pool Metrics

```csharp
// Get pool resource utilization
var pool = await poolCollection.GetAsync("my-elastic-pool");

// Pool metrics are available via Azure Monitor
// Use Azure.ResourceManager.Monitor for detailed metrics

Console.WriteLine($"Pool: {pool.Value.Data.Name}");
Console.WriteLine($"State: {pool.Value.Data.State}");
Console.WriteLine($"Max Size: {pool.Value.Data.MaxSizeBytes / (1024 * 1024 * 1024)} GB");
Console.WriteLine($"DTU Capacity: {pool.Value.Data.Sku?.Capacity}");
```

## Delete Elastic Pool

```csharp
// First move databases to approved target pools/standalone SKUs in a separate
// reviewed migration; do not delete databases as a pool cleanup shortcut.
var pool = await poolCollection.GetAsync("my-elastic-pool");
await foreach (var db in pool.Value.GetElasticPoolDatabases())
{
    throw new InvalidOperationException("Pool contains databases; migration required before deletion");
}
await pool.Value.DeleteAsync(WaitUntil.Completed);
```

## Elastic Pool SKU Reference

### DTU-Based Pools

| SKU Name | Tier | eDTU Range | Max DBs |
|----------|------|------------|---------|
| `BasicPool` | Basic | 50-1600 | 500 |
| `StandardPool` | Standard | 50-3000 | 500 |
| `PremiumPool` | Premium | 125-4000 | 100 |

### vCore-Based Pools

| SKU Pattern | Tier | vCore Range |
|-------------|------|-------------|
| `GP_Gen5_{n}` | GeneralPurpose | 2-80 |
| `GP_Fsv2_{n}` | GeneralPurpose | 8-72 |
| `GP_DC_{n}` | GeneralPurpose | 2-8 |
| `BC_Gen5_{n}` | BusinessCritical | 2-80 |
| `BC_DC_{n}` | BusinessCritical | 2-8 |

## Best Practices

1. **Right-size pools**: Start with estimated total DTU/vCore needs, monitor, and adjust
2. **Set per-database limits**: Prevent a single database from consuming all resources
3. **Use zone redundancy** for production Premium/BusinessCritical pools
4. **Monitor utilization**: Scale up when consistently above 80% utilization
5. **Consider Hyperscale**: For databases > 4TB or needing rapid scale
6. **Use Azure Hybrid Benefit**: Set `LicenseType = BasePrice` only after confirming the licenses meet Azure Hybrid Benefit eligibility requirements
