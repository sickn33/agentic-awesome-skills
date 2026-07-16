---
name: azure-resource-manager-redis-dotnet
description: Azure Resource Manager SDK for Redis in .NET.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.Redis (.NET)

Management plane SDK for provisioning and managing Azure Cache for Redis resources via Azure Resource Manager.

> **⚠️ Management vs Data Plane**
> - **This SDK (Azure.ResourceManager.Redis)**: Create caches, configure firewall rules, manage access keys, set up geo-replication
> - **Data Plane SDK (StackExchange.Redis)**: Get/set keys, pub/sub, streams, Lua scripts

## Installation

```bash
dotnet add package Azure.ResourceManager.Redis
dotnet add package Azure.Identity
```

**Current Version**: 1.5.1 (Stable)  
**API Version**: 2024-11-01  
**Target Frameworks**: .NET 8.0, .NET Standard 2.0

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
using Azure.ResourceManager.Redis;

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
        └── RedisResource
            ├── RedisFirewallRuleResource
            ├── RedisPatchScheduleResource
            ├── RedisLinkedServerWithPropertyResource
            ├── RedisPrivateEndpointConnectionResource
            └── RedisCacheAccessPolicyResource
```

## Core Workflows

### 1. Create Redis Cache

```csharp
using Azure.ResourceManager.Redis;
using Azure.ResourceManager.Redis.Models;

// Get resource group
var resourceGroup = await subscription
    .GetResourceGroupAsync("my-resource-group");

// Define cache configuration
var cacheData = new RedisCreateOrUpdateContent(
    location: AzureLocation.EastUS,
    sku: new RedisSku(RedisSkuName.Standard, RedisSkuFamily.BasicOrStandard, 1))
{
    EnableNonSslPort = false,
    MinimumTlsVersion = RedisTlsVersion.Tls1_2,
    RedisConfiguration = new RedisCommonConfiguration
    {
        MaxMemoryPolicy = "volatile-lru"
    },
    Tags =
    {
        ["environment"] = "production"
    }
};

// Create cache (long-running operation)
var cacheCollection = resourceGroup.Value.GetAllRedis();
var operation = await cacheCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-redis-cache",
    cacheData);

RedisResource cache = operation.Value;
Console.WriteLine($"Cache created: {cache.Data.HostName}");
```

### 2. Get Redis Cache

```csharp
// Get existing cache
var cache = await resourceGroup.Value
    .GetRedisAsync("my-redis-cache");

Console.WriteLine($"Host: {cache.Value.Data.HostName}");
Console.WriteLine($"Port: {cache.Value.Data.Port}");
Console.WriteLine($"SSL Port: {cache.Value.Data.SslPort}");
Console.WriteLine($"Provisioning State: {cache.Value.Data.ProvisioningState}");
```

### 3. Update Redis Cache

```csharp
var patchData = new RedisPatch
{
    Sku = new RedisSku(RedisSkuName.Standard, RedisSkuFamily.BasicOrStandard, 2),
    RedisConfiguration = new RedisCommonConfiguration
    {
        MaxMemoryPolicy = "allkeys-lru"
    }
};

var updateOperation = await cache.Value.UpdateAsync(
    WaitUntil.Completed,
    patchData);
```

### 4. Delete Redis Cache

```csharp
await cache.Value.DeleteAsync(WaitUntil.Completed);
```

### 5. Get Access Keys

```csharp
var keys = await cache.Value.GetKeysAsync();
Console.WriteLine($"Primary Key: {keys.Value.PrimaryKey}");
Console.WriteLine($"Secondary Key: {keys.Value.SecondaryKey}");
```

### 6. Regenerate Access Keys

```csharp
var regenerateContent = new RedisRegenerateKeyContent(RedisRegenerateKeyType.Primary);
var newKeys = await cache.Value.RegenerateKeyAsync(regenerateContent);
Console.WriteLine($"New Primary Key: {newKeys.Value.PrimaryKey}");
```

### 7. Manage Firewall Rules

```csharp
// Create firewall rule
var firewallData = new RedisFirewallRuleData(
    startIP: System.Net.IPAddress.Parse("10.0.0.1"),
    endIP: System.Net.IPAddress.Parse("10.0.0.255"));

var firewallCollection = cache.Value.GetRedisFirewallRules();
var firewallOperation = await firewallCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "allow-internal-network",
    firewallData);

// List all firewall rules
await foreach (var rule in firewallCollection.GetAllAsync())
{
    Console.WriteLine($"Rule: {rule.Data.Name} ({rule.Data.StartIP} - {rule.Data.EndIP})");
}

// Delete firewall rule
var ruleToDelete = await firewallCollection.GetAsync("allow-internal-network");
await ruleToDelete.Value.DeleteAsync(WaitUntil.Completed);
```

### 8. Configure Patch Schedule (Premium SKU)

```csharp
// Patch schedules require Premium SKU
var scheduleData = new RedisPatchScheduleData(
    new[]
    {
        new RedisPatchScheduleSetting(RedisDayOfWeek.Saturday, 2) // 2 AM Saturday
        {
            MaintenanceWindow = TimeSpan.FromHours(5)
        },
        new RedisPatchScheduleSetting(RedisDayOfWeek.Sunday, 2) // 2 AM Sunday
        {
            MaintenanceWindow = TimeSpan.FromHours(5)
        }
    });

var scheduleCollection = cache.Value.GetRedisPatchSchedules();
await scheduleCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    RedisPatchScheduleDefaultName.Default,
    scheduleData);
```

### 9. Import/Export Data (Premium SKU)

```csharp
// Import data from blob storage
var importContent = new ImportRdbContent(
    files: new[] { "https://mystorageaccount.blob.core.windows.net/container/dump.rdb" },
    format: "RDB");

await cache.Value.ImportDataAsync(WaitUntil.Completed, importContent);

// Export data to blob storage
var exportContent = new ExportRdbContent(
    prefix: "backup",
    container: "https://mystorageaccount.blob.core.windows.net/container?sastoken",
    format: "RDB");

await cache.Value.ExportDataAsync(WaitUntil.Completed, exportContent);
```

### 10. Force Reboot

```csharp
var rebootContent = new RedisRebootContent
{
    RebootType = RedisRebootType.AllNodes,
    ShardId = 0 // For clustered caches
};

await cache.Value.ForceRebootAsync(rebootContent);
```

## SKU Reference

| SKU | Family | Capacity | Features |
|-----|--------|----------|----------|
| Basic | C | 0-6 | Single node, no SLA, dev/test only |
| Standard | C | 0-6 | Two nodes (primary/replica), SLA |
| Premium | P | 1-5 | Clustering, geo-replication, VNet, persistence |

**Capacity Sizes (Family C - Basic/Standard)**:
- C0: 250 MB
- C1: 1 GB
- C2: 2.5 GB
- C3: 6 GB
- C4: 13 GB
- C5: 26 GB
- C6: 53 GB

**Capacity Sizes (Family P - Premium)**:
- P1: 6 GB per shard
- P2: 13 GB per shard
- P3: 26 GB per shard
- P4: 53 GB per shard
- P5: 120 GB per shard

## Key Types Reference

| Type | Purpose |
|------|---------|
| `ArmClient` | Entry point for all ARM operations |
| `RedisResource` | Represents a Redis cache instance |
| `RedisCollection` | Collection for cache CRUD operations |
| `RedisFirewallRuleResource` | Firewall rule for IP filtering |
| `RedisPatchScheduleResource` | Maintenance window configuration |
| `RedisLinkedServerWithPropertyResource` | Geo-replication linked server |
| `RedisPrivateEndpointConnectionResource` | Private endpoint connection |
| `RedisCacheAccessPolicyResource` | RBAC access policy |
| `RedisCreateOrUpdateContent` | Cache creation payload |
| `RedisPatch` | Cache update payload |
| `RedisSku` | SKU configuration (name, family, capacity) |
| `RedisAccessKeys` | Primary and secondary access keys |
| `RedisRegenerateKeyContent` | Key regeneration request |

## Best Practices

1. **Use `WaitUntil.Completed`** for operations that must finish before proceeding
2. **Use `WaitUntil.Started`** when you want to poll manually or run operations in parallel
3. **Always use `DefaultAzureCredential`** — never hardcode keys
4. **Handle `RequestFailedException`** for ARM API errors
5. **Use `CreateOrUpdateAsync`** for idempotent operations
6. **Navigate hierarchy** via `Get*` methods (e.g., `cache.GetRedisFirewallRules()`)
7. **Use Premium SKU** for production workloads requiring geo-replication, clustering, or persistence
8. **Enable TLS 1.2 minimum** — set `MinimumTlsVersion = RedisTlsVersion.Tls1_2`
9. **Disable non-SSL port** — set `EnableNonSslPort = false` for security
10. **Rotate keys regularly** — use `RegenerateKeyAsync` and update connection strings

## Error Handling

```csharp
using Azure;

try
{
    var operation = await cacheCollection.CreateOrUpdateAsync(
        WaitUntil.Completed, cacheName, cacheData);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("Cache already exists");
}
catch (RequestFailedException ex) when (ex.Status == 400)
{
    Console.WriteLine($"Invalid configuration: {ex.Message}");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"ARM Error: {ex.Status} - {ex.ErrorCode}: {ex.Message}");
}
```

## Common Pitfalls

1. **SKU downgrades not allowed** — You cannot downgrade from Premium to Standard/Basic
2. **Clustering requires Premium** — Shard configuration only available on Premium SKU
3. **Geo-replication requires Premium** — Linked servers only work with Premium caches
4. **VNet injection requires Premium** — Virtual network support is Premium-only
5. **Patch schedules require Premium** — Maintenance windows only configurable on Premium
6. **Cache name globally unique** — Redis cache names must be unique across all Azure subscriptions
7. **Long provisioning times** — Cache creation can take 15-20 minutes; use `WaitUntil.Started` for async patterns

## Connecting with StackExchange.Redis (Data Plane)

After creating the cache with this management SDK, use StackExchange.Redis for data operations:

```csharp
using StackExchange.Redis;

// Get connection info from management SDK
var cache = await resourceGroup.Value.GetRedisAsync("my-redis-cache");
var keys = await cache.Value.GetKeysAsync();

// Connect with StackExchange.Redis
var connectionString = $"{cache.Value.Data.HostName}:{cache.Value.Data.SslPort},password={keys.Value.PrimaryKey},ssl=True,abortConnect=False";
var connection = ConnectionMultiplexer.Connect(connectionString);
var db = connection.GetDatabase();

// Data operations
await db.StringSetAsync("key", "value");
var value = await db.StringGetAsync("key");
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `StackExchange.Redis` | Data plane (get/set, pub/sub, streams) | `dotnet add package StackExchange.Redis` |
| `Azure.ResourceManager.Redis` | Management plane (this SDK) | `dotnet add package Azure.ResourceManager.Redis` |
| `Microsoft.Azure.StackExchangeRedis` | Azure-specific Redis extensions | `dotnet add package Microsoft.Azure.StackExchangeRedis` |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
