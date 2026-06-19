---
name: azure-resource-manager-sql-dotnet
description: Azure Resource Manager SDK for Azure SQL in .NET.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.Sql (.NET)

Management plane SDK for provisioning and managing Azure SQL resources via Azure Resource Manager.

> **⚠️ Management vs Data Plane**
> - **This SDK (Azure.ResourceManager.Sql)**: Create servers, databases, elastic pools, configure firewall rules, manage failover groups
> - **Data Plane SDK (Microsoft.Data.SqlClient)**: Execute queries, stored procedures, manage connections

## Installation

```bash
dotnet add package Azure.ResourceManager.Sql
dotnet add package Azure.Identity
```

**Current Versions**: Stable v1.3.0, Preview v1.4.0-beta.3

## Environment Variables

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
# For service principal auth (optional)
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.Sql;

// Always use DefaultAzureCredential
var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);

// Get subscription
var subscriptionId = Environment.GetEnvironmentVariable("AZURE_SUBSCRIPTION_ID");
var subscription = armClient.GetSubscriptionResource(
    new ResourceIdentifier($"/subscriptions/{subscriptionId}"));
```

## Resource Hierarchy

```
ArmClient
└── SubscriptionResource
    └── ResourceGroupResource
        └── SqlServerResource
            ├── SqlDatabaseResource
            ├── ElasticPoolResource
            │   └── ElasticPoolDatabaseResource
            ├── SqlFirewallRuleResource
            ├── FailoverGroupResource
            ├── ServerBlobAuditingPolicyResource
            ├── EncryptionProtectorResource
            └── VirtualNetworkRuleResource
```

## Core Workflow

### 1. Create SQL Server

```csharp
using Azure.ResourceManager.Sql;
using Azure.ResourceManager.Sql.Models;

// Get resource group
var resourceGroup = await subscription
    .GetResourceGroupAsync("my-resource-group");

// Define server
var serverData = new SqlServerData(AzureLocation.EastUS)
{
    AdministratorLogin = "sqladmin",
    AdministratorLoginPassword = "YourSecurePassword123!",
    Version = "12.0",
    MinimalTlsVersion = SqlMinimalTlsVersion.Tls1_2,
    PublicNetworkAccess = ServerNetworkAccessFlag.Enabled
};

// Create server (long-running operation)
var serverCollection = resourceGroup.Value.GetSqlServers();
var operation = await serverCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-sql-server",
    serverData);

SqlServerResource server = operation.Value;
```

### 2. Create SQL Database

```csharp
var databaseData = new SqlDatabaseData(AzureLocation.EastUS)
{
    Sku = new SqlSku("S0") { Tier = "Standard" },
    MaxSizeBytes = 2L * 1024 * 1024 * 1024, // 2 GB
    Collation = "SQL_Latin1_General_CP1_CI_AS",
    RequestedBackupStorageRedundancy = SqlBackupStorageRedundancy.Local
};

var databaseCollection = server.GetSqlDatabases();
var dbOperation = await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-database",
    databaseData);

SqlDatabaseResource database = dbOperation.Value;
```

### 3. Create Elastic Pool

```csharp
var poolData = new ElasticPoolData(AzureLocation.EastUS)
{
    Sku = new SqlSku("StandardPool")
    {
        Tier = "Standard",
        Capacity = 100 // 100 eDTUs
    },
    PerDatabaseSettings = new ElasticPoolPerDatabaseSettings
    {
        MinCapacity = 0,
        MaxCapacity = 100
    }
};

var poolCollection = server.GetElasticPools();
var poolOperation = await poolCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-elastic-pool",
    poolData);

ElasticPoolResource pool = poolOperation.Value;
```

### 4. Add Database to Elastic Pool

```csharp
var databaseData = new SqlDatabaseData(AzureLocation.EastUS)
{
    ElasticPoolId = pool.Id
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "pooled-database",
    databaseData);
```

### 5. Configure Firewall Rules

```csharp
// Allow Azure services
var azureServicesRule = new SqlFirewallRuleData
{
    StartIPAddress = "0.0.0.0",
    EndIPAddress = "0.0.0.0"
};

var firewallCollection = server.GetSqlFirewallRules();
await firewallCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "AllowAzureServices",
    azureServicesRule);

// Allow specific IP range
var clientRule = new SqlFirewallRuleData
{
    StartIPAddress = "203.0.113.0",
    EndIPAddress = "203.0.113.255"
};

await firewallCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "AllowClientIPs",
    clientRule);
```

### 6. List Resources

```csharp
// List all servers in subscription
await foreach (var srv in subscription.GetSqlServersAsync())
{
    Console.WriteLine($"Server: {srv.Data.Name} in {srv.Data.Location}");
}

// List databases in a server
await foreach (var db in server.GetSqlDatabases())
{
    Console.WriteLine($"Database: {db.Data.Name}, SKU: {db.Data.Sku?.Name}");
}

// List elastic pools
await foreach (var ep in server.GetElasticPools())
{
    Console.WriteLine($"Pool: {ep.Data.Name}, DTU: {ep.Data.Sku?.Capacity}");
}
```

### 7. Get Connection String

```csharp
// Build connection string (server FQDN is predictable)
var serverFqdn = $"{server.Data.Name}.database.windows.net";
var connectionString = $"Server=tcp:{serverFqdn},1433;" +
    $"Initial Catalog={database.Data.Name};" +
    "Persist Security Info=False;" +
    $"User ID={server.Data.AdministratorLogin};" +
    "Password=<your-password>;" +
    "MultipleActiveResultSets=False;" +
    "Encrypt=True;" +
    "TrustServerCertificate=False;" +
    "Connection Timeout=30;";
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `ArmClient` | Entry point for all ARM operations |
| `SqlServerResource` | Represents an Azure SQL server |
| `SqlServerCollection` | Collection for server CRUD |
| `SqlDatabaseResource` | Represents a SQL database |
| `SqlDatabaseCollection` | Collection for database CRUD |
| `ElasticPoolResource` | Represents an elastic pool |
| `ElasticPoolCollection` | Collection for elastic pool CRUD |
| `SqlFirewallRuleResource` | Represents a firewall rule |
| `SqlFirewallRuleCollection` | Collection for firewall rule CRUD |
| `SqlServerData` | Server creation/update payload |
| `SqlDatabaseData` | Database creation/update payload |
| `ElasticPoolData` | Elastic pool creation/update payload |
| `SqlFirewallRuleData` | Firewall rule creation/update payload |
| `SqlSku` | SKU configuration (tier, capacity) |

## Common SKUs

### Database SKUs

| SKU Name | Tier | Description |
|----------|------|-------------|
| `Basic` | Basic | 5 DTUs, 2 GB max |
| `S0`-`S12` | Standard | 10-3000 DTUs |
| `P1`-`P15` | Premium | 125-4000 DTUs |
| `GP_Gen5_2` | GeneralPurpose | vCore-based, 2 vCores |
| `BC_Gen5_2` | BusinessCritical | vCore-based, 2 vCores |
| `HS_Gen5_2` | Hyperscale | vCore-based, 2 vCores |

### Elastic Pool SKUs

| SKU Name | Tier | Description |
|----------|------|-------------|
| `BasicPool` | Basic | 50-1600 eDTUs |
| `StandardPool` | Standard | 50-3000 eDTUs |
| `PremiumPool` | Premium | 125-4000 eDTUs |
| `GP_Gen5_2` | GeneralPurpose | vCore-based |
| `BC_Gen5_2` | BusinessCritical | vCore-based |

## Best Practices

1. **Use `WaitUntil.Completed`** for operations that must finish before proceeding
2. **Use `WaitUntil.Started`** when you want to poll manually or run operations in parallel
3. **Always use `DefaultAzureCredential`** — never hardcode passwords in production
4. **Handle `RequestFailedException`** for ARM API errors
5. **Use `CreateOrUpdateAsync`** for idempotent operations
6. **Navigate hierarchy** via `Get*` methods (e.g., `server.GetSqlDatabases()`)
7. **Use elastic pools** for cost optimization when managing multiple databases
8. **Configure firewall rules** before attempting connections

## Error Handling

```csharp
using Azure;

try
{
    var operation = await serverCollection.CreateOrUpdateAsync(
        WaitUntil.Completed, serverName, serverData);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("Server already exists");
}
catch (RequestFailedException ex) when (ex.Status == 400)
{
    Console.WriteLine($"Invalid request: {ex.Message}");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"ARM Error: {ex.Status} - {ex.ErrorCode}: {ex.Message}");
}
```

## Reference Files

| File | When to Read |
|------|--------------|
| references/server-management.md | Server CRUD, admin credentials, Azure AD auth, networking |
| references/database-operations.md | Database CRUD, scaling, backup, restore, copy |
| references/elastic-pools.md | Pool management, adding/removing databases, scaling |

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Microsoft.Data.SqlClient` | Data plane (execute queries, stored procedures) | `dotnet add package Microsoft.Data.SqlClient` |
| `Azure.ResourceManager.Sql` | Management plane (this SDK) | `dotnet add package Azure.ResourceManager.Sql` |
| `Microsoft.EntityFrameworkCore.SqlServer` | ORM for SQL Server | `dotnet add package Microsoft.EntityFrameworkCore.SqlServer` |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
