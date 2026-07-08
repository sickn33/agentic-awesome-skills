---
name: azure-resource-manager-cosmosdb-dotnet
description: Azure Resource Manager SDK for Cosmos DB in .NET.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.CosmosDB (.NET)

Management plane SDK for provisioning and managing Azure Cosmos DB resources via Azure Resource Manager.

> **⚠️ Management vs Data Plane**
> - **This SDK (Azure.ResourceManager.CosmosDB)**: Create accounts, databases, containers, configure throughput, manage RBAC
> - **Data Plane SDK (Microsoft.Azure.Cosmos)**: CRUD operations on documents, queries, stored procedures execution

## Installation

```bash
dotnet add package Azure.ResourceManager.CosmosDB
dotnet add package Azure.Identity
```

**Current Versions**: Stable v1.4.0, Preview v1.4.0-beta.13

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
using Azure.ResourceManager.CosmosDB;

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
        └── CosmosDBAccountResource
            ├── CosmosDBSqlDatabaseResource
            │   └── CosmosDBSqlContainerResource
            │       ├── CosmosDBSqlStoredProcedureResource
            │       ├── CosmosDBSqlTriggerResource
            │       └── CosmosDBSqlUserDefinedFunctionResource
            ├── CassandraKeyspaceResource
            ├── GremlinDatabaseResource
            ├── MongoDBDatabaseResource
            └── CosmosDBTableResource
```

## Core Workflow

### 1. Create Cosmos DB Account

```csharp
using Azure.ResourceManager.CosmosDB;
using Azure.ResourceManager.CosmosDB.Models;

// Get resource group
var resourceGroup = await subscription
    .GetResourceGroupAsync("my-resource-group");

// Define account
var accountData = new CosmosDBAccountCreateOrUpdateContent(
    location: AzureLocation.EastUS,
    locations: new[]
    {
        new CosmosDBAccountLocation
        {
            LocationName = AzureLocation.EastUS,
            FailoverPriority = 0,
            IsZoneRedundant = false
        }
    })
{
    Kind = CosmosDBAccountKind.GlobalDocumentDB,
    ConsistencyPolicy = new ConsistencyPolicy(DefaultConsistencyLevel.Session),
    EnableAutomaticFailover = true
};

// Create account (long-running operation)
var accountCollection = resourceGroup.Value.GetCosmosDBAccounts();
var operation = await accountCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-cosmos-account",
    accountData);

CosmosDBAccountResource account = operation.Value;
```

### 2. Create SQL Database

```csharp
var databaseData = new CosmosDBSqlDatabaseCreateOrUpdateContent(
    new CosmosDBSqlDatabaseResourceInfo("my-database"));

var databaseCollection = account.GetCosmosDBSqlDatabases();
var dbOperation = await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-database",
    databaseData);

CosmosDBSqlDatabaseResource database = dbOperation.Value;
```

### 3. Create SQL Container

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
            IndexingMode = CosmosDBIndexingMode.Consistent
        },
        DefaultTtl = 86400 // 24 hours
    });

var containerCollection = database.GetCosmosDBSqlContainers();
var containerOperation = await containerCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-container",
    containerData);

CosmosDBSqlContainerResource container = containerOperation.Value;
```

### 4. Configure Throughput

```csharp
// Manual throughput
var throughputData = new ThroughputSettingsUpdateData(
    new ThroughputSettingsResourceInfo
    {
        Throughput = 400
    });

// Autoscale throughput
var autoscaleData = new ThroughputSettingsUpdateData(
    new ThroughputSettingsResourceInfo
    {
        AutoscaleSettings = new AutoscaleSettingsResourceInfo
        {
            MaxThroughput = 4000
        }
    });

// Apply to database
await database.CreateOrUpdateCosmosDBSqlDatabaseThroughputAsync(
    WaitUntil.Completed,
    throughputData);
```

### 5. Get Connection Information

```csharp
// Get keys
var keys = await account.GetKeysAsync();
Console.WriteLine($"Primary Key: {keys.Value.PrimaryMasterKey}");

// Get connection strings
var connectionStrings = await account.GetConnectionStringsAsync();
foreach (var cs in connectionStrings.Value.ConnectionStrings)
{
    Console.WriteLine($"{cs.Description}: {cs.ConnectionString}");
}
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `ArmClient` | Entry point for all ARM operations |
| `CosmosDBAccountResource` | Represents a Cosmos DB account |
| `CosmosDBAccountCollection` | Collection for account CRUD |
| `CosmosDBSqlDatabaseResource` | SQL API database |
| `CosmosDBSqlContainerResource` | SQL API container |
| `CosmosDBAccountCreateOrUpdateContent` | Account creation payload |
| `CosmosDBSqlDatabaseCreateOrUpdateContent` | Database creation payload |
| `CosmosDBSqlContainerCreateOrUpdateContent` | Container creation payload |
| `ThroughputSettingsUpdateData` | Throughput configuration |

## Best Practices

1. **Use `WaitUntil.Completed`** for operations that must finish before proceeding
2. **Use `WaitUntil.Started`** when you want to poll manually or run operations in parallel
3. **Always use `DefaultAzureCredential`** — never hardcode keys
4. **Handle `RequestFailedException`** for ARM API errors
5. **Use `CreateOrUpdateAsync`** for idempotent operations
6. **Navigate hierarchy** via `Get*` methods (e.g., `account.GetCosmosDBSqlDatabases()`)

## Error Handling

```csharp
using Azure;

try
{
    var operation = await accountCollection.CreateOrUpdateAsync(
        WaitUntil.Completed, accountName, accountData);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("Account already exists");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"ARM Error: {ex.Status} - {ex.ErrorCode}: {ex.Message}");
}
```

## Reference Files

| File | When to Read |
|------|--------------|
| references/account-management.md | Account CRUD, failover, keys, connection strings, networking |
| references/sql-resources.md | SQL databases, containers, stored procedures, triggers, UDFs |
| references/throughput.md | Manual/autoscale throughput, migration between modes |

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Microsoft.Azure.Cosmos` | Data plane (document CRUD, queries) | `dotnet add package Microsoft.Azure.Cosmos` |
| `Azure.ResourceManager.CosmosDB` | Management plane (this SDK) | `dotnet add package Azure.ResourceManager.CosmosDB` |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
