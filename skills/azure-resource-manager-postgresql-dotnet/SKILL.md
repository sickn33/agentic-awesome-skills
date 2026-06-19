---
name: azure-resource-manager-postgresql-dotnet
description: Azure PostgreSQL Flexible Server SDK for .NET. Database management for PostgreSQL Flexible Server deployments.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.PostgreSql (.NET)

Azure Resource Manager SDK for managing PostgreSQL Flexible Server deployments.

## Installation

```bash
dotnet add package Azure.ResourceManager.PostgreSql
dotnet add package Azure.Identity
```

**Current Version**: v1.2.0 (GA)  
**API Version**: 2023-12-01-preview

> **Note**: This skill focuses on PostgreSQL Flexible Server. Single Server is deprecated and scheduled for retirement.

## Environment Variables

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=<your-resource-group>
AZURE_POSTGRESQL_SERVER_NAME=<your-postgresql-server>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.PostgreSql;
using Azure.ResourceManager.PostgreSql.FlexibleServers;

ArmClient client = new ArmClient(new DefaultAzureCredential());
```

## Resource Hierarchy

```
Subscription
└── ResourceGroup
    └── PostgreSqlFlexibleServer              # PostgreSQL Flexible Server instance
        ├── PostgreSqlFlexibleServerDatabase  # Database within the server
        ├── PostgreSqlFlexibleServerFirewallRule # IP firewall rules
        ├── PostgreSqlFlexibleServerConfiguration # Server parameters
        ├── PostgreSqlFlexibleServerBackup    # Backup information
        ├── PostgreSqlFlexibleServerActiveDirectoryAdministrator # Entra ID admin
        └── PostgreSqlFlexibleServerVirtualEndpoint # Read replica endpoints
```

## Core Workflows

### 1. Create PostgreSQL Flexible Server

```csharp
using Azure.ResourceManager.PostgreSql.FlexibleServers;
using Azure.ResourceManager.PostgreSql.FlexibleServers.Models;

ResourceGroupResource resourceGroup = await client
    .GetDefaultSubscriptionAsync()
    .Result
    .GetResourceGroupAsync("my-resource-group");

PostgreSqlFlexibleServerCollection servers = resourceGroup.GetPostgreSqlFlexibleServers();

PostgreSqlFlexibleServerData data = new PostgreSqlFlexibleServerData(AzureLocation.EastUS)
{
    Sku = new PostgreSqlFlexibleServerSku("Standard_D2ds_v4", PostgreSqlFlexibleServerSkuTier.GeneralPurpose),
    AdministratorLogin = "pgadmin",
    AdministratorLoginPassword = "YourSecurePassword123!",
    Version = PostgreSqlFlexibleServerVersion.Ver16,
    Storage = new PostgreSqlFlexibleServerStorage
    {
        StorageSizeInGB = 128,
        AutoGrow = StorageAutoGrow.Enabled,
        Tier = PostgreSqlStorageTierName.P30
    },
    Backup = new PostgreSqlFlexibleServerBackupProperties
    {
        BackupRetentionDays = 7,
        GeoRedundantBackup = PostgreSqlFlexibleServerGeoRedundantBackupEnum.Disabled
    },
    HighAvailability = new PostgreSqlFlexibleServerHighAvailability
    {
        Mode = PostgreSqlFlexibleServerHighAvailabilityMode.ZoneRedundant,
        StandbyAvailabilityZone = "2"
    },
    AvailabilityZone = "1",
    AuthConfig = new PostgreSqlFlexibleServerAuthConfig
    {
        ActiveDirectoryAuth = PostgreSqlFlexibleServerActiveDirectoryAuthEnum.Enabled,
        PasswordAuth = PostgreSqlFlexibleServerPasswordAuthEnum.Enabled
    }
};

ArmOperation<PostgreSqlFlexibleServerResource> operation = await servers
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-postgresql-server", data);

PostgreSqlFlexibleServerResource server = operation.Value;
Console.WriteLine($"Server created: {server.Data.FullyQualifiedDomainName}");
```

### 2. Create Database

```csharp
PostgreSqlFlexibleServerResource server = await resourceGroup
    .GetPostgreSqlFlexibleServerAsync("my-postgresql-server");

PostgreSqlFlexibleServerDatabaseCollection databases = server.GetPostgreSqlFlexibleServerDatabases();

PostgreSqlFlexibleServerDatabaseData dbData = new PostgreSqlFlexibleServerDatabaseData
{
    Charset = "UTF8",
    Collation = "en_US.utf8"
};

ArmOperation<PostgreSqlFlexibleServerDatabaseResource> operation = await databases
    .CreateOrUpdateAsync(WaitUntil.Completed, "myappdb", dbData);

PostgreSqlFlexibleServerDatabaseResource database = operation.Value;
Console.WriteLine($"Database created: {database.Data.Name}");
```

### 3. Configure Firewall Rules

```csharp
PostgreSqlFlexibleServerFirewallRuleCollection firewallRules = server.GetPostgreSqlFlexibleServerFirewallRules();

// Allow specific IP range
PostgreSqlFlexibleServerFirewallRuleData ruleData = new PostgreSqlFlexibleServerFirewallRuleData
{
    StartIPAddress = System.Net.IPAddress.Parse("10.0.0.1"),
    EndIPAddress = System.Net.IPAddress.Parse("10.0.0.255")
};

ArmOperation<PostgreSqlFlexibleServerFirewallRuleResource> operation = await firewallRules
    .CreateOrUpdateAsync(WaitUntil.Completed, "allow-internal", ruleData);

// Allow Azure services
PostgreSqlFlexibleServerFirewallRuleData azureServicesRule = new PostgreSqlFlexibleServerFirewallRuleData
{
    StartIPAddress = System.Net.IPAddress.Parse("0.0.0.0"),
    EndIPAddress = System.Net.IPAddress.Parse("0.0.0.0")
};

await firewallRules.CreateOrUpdateAsync(WaitUntil.Completed, "AllowAllAzureServicesAndResourcesWithinAzureIps", azureServicesRule);
```

### 4. Update Server Configuration

```csharp
PostgreSqlFlexibleServerConfigurationCollection configurations = server.GetPostgreSqlFlexibleServerConfigurations();

// Get current configuration
PostgreSqlFlexibleServerConfigurationResource config = await configurations
    .GetAsync("max_connections");

// Update configuration
PostgreSqlFlexibleServerConfigurationData configData = new PostgreSqlFlexibleServerConfigurationData
{
    Value = "500",
    Source = "user-override"
};

ArmOperation<PostgreSqlFlexibleServerConfigurationResource> operation = await configurations
    .CreateOrUpdateAsync(WaitUntil.Completed, "max_connections", configData);

// Common PostgreSQL configurations to tune
string[] commonParams = { 
    "max_connections", 
    "shared_buffers", 
    "work_mem", 
    "maintenance_work_mem",
    "effective_cache_size",
    "log_min_duration_statement"
};
```

### 5. Configure Entra ID Administrator

```csharp
PostgreSqlFlexibleServerActiveDirectoryAdministratorCollection admins = 
    server.GetPostgreSqlFlexibleServerActiveDirectoryAdministrators();

PostgreSqlFlexibleServerActiveDirectoryAdministratorData adminData = 
    new PostgreSqlFlexibleServerActiveDirectoryAdministratorData
{
    PrincipalType = PostgreSqlFlexibleServerPrincipalType.User,
    PrincipalName = "aad-admin@contoso.com",
    TenantId = Guid.Parse("<tenant-id>")
};

ArmOperation<PostgreSqlFlexibleServerActiveDirectoryAdministratorResource> operation = await admins
    .CreateOrUpdateAsync(WaitUntil.Completed, "<entra-object-id>", adminData);
```

### 6. List and Manage Servers

```csharp
// List servers in resource group
await foreach (PostgreSqlFlexibleServerResource server in resourceGroup.GetPostgreSqlFlexibleServers())
{
    Console.WriteLine($"Server: {server.Data.Name}");
    Console.WriteLine($"  FQDN: {server.Data.FullyQualifiedDomainName}");
    Console.WriteLine($"  Version: {server.Data.Version}");
    Console.WriteLine($"  State: {server.Data.State}");
    Console.WriteLine($"  SKU: {server.Data.Sku.Name} ({server.Data.Sku.Tier})");
    Console.WriteLine($"  HA: {server.Data.HighAvailability?.Mode}");
}

// List databases in server
await foreach (PostgreSqlFlexibleServerDatabaseResource db in server.GetPostgreSqlFlexibleServerDatabases())
{
    Console.WriteLine($"Database: {db.Data.Name}");
}
```

### 7. Backup and Point-in-Time Restore

```csharp
// List available backups
await foreach (PostgreSqlFlexibleServerBackupResource backup in server.GetPostgreSqlFlexibleServerBackups())
{
    Console.WriteLine($"Backup: {backup.Data.Name}");
    Console.WriteLine($"  Type: {backup.Data.BackupType}");
    Console.WriteLine($"  Completed: {backup.Data.CompletedOn}");
}

// Point-in-time restore
PostgreSqlFlexibleServerData restoreData = new PostgreSqlFlexibleServerData(AzureLocation.EastUS)
{
    CreateMode = PostgreSqlFlexibleServerCreateMode.PointInTimeRestore,
    SourceServerResourceId = server.Id,
    PointInTimeUtc = DateTimeOffset.UtcNow.AddHours(-2)
};

ArmOperation<PostgreSqlFlexibleServerResource> operation = await servers
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-postgresql-restored", restoreData);
```

### 8. Create Read Replica

```csharp
PostgreSqlFlexibleServerData replicaData = new PostgreSqlFlexibleServerData(AzureLocation.WestUS)
{
    CreateMode = PostgreSqlFlexibleServerCreateMode.Replica,
    SourceServerResourceId = server.Id,
    Sku = new PostgreSqlFlexibleServerSku("Standard_D2ds_v4", PostgreSqlFlexibleServerSkuTier.GeneralPurpose)
};

ArmOperation<PostgreSqlFlexibleServerResource> operation = await servers
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-postgresql-replica", replicaData);
```

### 9. Stop and Start Server

```csharp
PostgreSqlFlexibleServerResource server = await resourceGroup
    .GetPostgreSqlFlexibleServerAsync("my-postgresql-server");

// Stop server (saves costs when not in use)
await server.StopAsync(WaitUntil.Completed);

// Start server
await server.StartAsync(WaitUntil.Completed);

// Restart server
await server.RestartAsync(WaitUntil.Completed, new PostgreSqlFlexibleServerRestartParameter
{
    RestartWithFailover = true,
    FailoverMode = PostgreSqlFlexibleServerFailoverMode.PlannedFailover
});
```

### 10. Update Server (Scale)

```csharp
PostgreSqlFlexibleServerResource server = await resourceGroup
    .GetPostgreSqlFlexibleServerAsync("my-postgresql-server");

PostgreSqlFlexibleServerPatch patch = new PostgreSqlFlexibleServerPatch
{
    Sku = new PostgreSqlFlexibleServerSku("Standard_D4ds_v4", PostgreSqlFlexibleServerSkuTier.GeneralPurpose),
    Storage = new PostgreSqlFlexibleServerStorage
    {
        StorageSizeInGB = 256,
        Tier = PostgreSqlStorageTierName.P40
    }
};

ArmOperation<PostgreSqlFlexibleServerResource> operation = await server
    .UpdateAsync(WaitUntil.Completed, patch);
```

### 11. Delete Server

```csharp
PostgreSqlFlexibleServerResource server = await resourceGroup
    .GetPostgreSqlFlexibleServerAsync("my-postgresql-server");

await server.DeleteAsync(WaitUntil.Completed);
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `PostgreSqlFlexibleServerResource` | Flexible Server instance |
| `PostgreSqlFlexibleServerData` | Server configuration data |
| `PostgreSqlFlexibleServerCollection` | Collection of servers |
| `PostgreSqlFlexibleServerDatabaseResource` | Database within server |
| `PostgreSqlFlexibleServerFirewallRuleResource` | IP firewall rule |
| `PostgreSqlFlexibleServerConfigurationResource` | Server parameter |
| `PostgreSqlFlexibleServerBackupResource` | Backup metadata |
| `PostgreSqlFlexibleServerActiveDirectoryAdministratorResource` | Entra ID admin |
| `PostgreSqlFlexibleServerSku` | SKU (compute tier + size) |
| `PostgreSqlFlexibleServerStorage` | Storage configuration |
| `PostgreSqlFlexibleServerHighAvailability` | HA configuration |
| `PostgreSqlFlexibleServerBackupProperties` | Backup settings |
| `PostgreSqlFlexibleServerAuthConfig` | Authentication settings |

## SKU Tiers

| Tier | Use Case | SKU Examples |
|------|----------|--------------|
| `Burstable` | Dev/test, light workloads | Standard_B1ms, Standard_B2s |
| `GeneralPurpose` | Production workloads | Standard_D2ds_v4, Standard_D4ds_v4 |
| `MemoryOptimized` | High memory requirements | Standard_E2ds_v4, Standard_E4ds_v4 |

## PostgreSQL Versions

| Version | Enum Value |
|---------|------------|
| PostgreSQL 11 | `Ver11` |
| PostgreSQL 12 | `Ver12` |
| PostgreSQL 13 | `Ver13` |
| PostgreSQL 14 | `Ver14` |
| PostgreSQL 15 | `Ver15` |
| PostgreSQL 16 | `Ver16` |

## High Availability Modes

| Mode | Description |
|------|-------------|
| `Disabled` | No HA (single server) |
| `SameZone` | HA within same availability zone |
| `ZoneRedundant` | HA across availability zones |

## Best Practices

1. **Use Flexible Server** — Single Server is deprecated
2. **Enable zone-redundant HA** — For production workloads
3. **Use DefaultAzureCredential** — Prefer over connection strings
4. **Configure Entra ID authentication** — More secure than SQL auth alone
5. **Enable both auth methods** — Entra ID + password for flexibility
6. **Set appropriate backup retention** — 7-35 days based on compliance
7. **Use private endpoints** — For secure network access
8. **Tune server parameters** — Based on workload characteristics
9. **Use read replicas** — For read-heavy workloads
10. **Stop dev/test servers** — Save costs when not in use

## Error Handling

```csharp
using Azure;

try
{
    ArmOperation<PostgreSqlFlexibleServerResource> operation = await servers
        .CreateOrUpdateAsync(WaitUntil.Completed, "my-postgresql", data);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("Server already exists");
}
catch (RequestFailedException ex) when (ex.Status == 400)
{
    Console.WriteLine($"Invalid configuration: {ex.Message}");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"Azure error: {ex.Status} - {ex.Message}");
}
```

## Connection String

After creating the server, connect using:

```csharp
// Npgsql connection string
string connectionString = $"Host={server.Data.FullyQualifiedDomainName};" +
    "Database=myappdb;" +
    "Username=pgadmin;" +
    "Password=YourSecurePassword123!;" +
    "SSL Mode=Require;Trust Server Certificate=true;";

// With Entra ID token (recommended)
var credential = new DefaultAzureCredential();
var token = await credential.GetTokenAsync(
    new TokenRequestContext(new[] { "https://ossrdbms-aad.database.windows.net/.default" }));

string connectionString = $"Host={server.Data.FullyQualifiedDomainName};" +
    "Database=myappdb;" +
    $"Username=aad-admin@contoso.com;" +
    $"Password={token.Token};" +
    "SSL Mode=Require;";
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.ResourceManager.PostgreSql` | PostgreSQL management (this SDK) | `dotnet add package Azure.ResourceManager.PostgreSql` |
| `Azure.ResourceManager.MySql` | MySQL management | `dotnet add package Azure.ResourceManager.MySql` |
| `Npgsql` | PostgreSQL data access | `dotnet add package Npgsql` |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | EF Core provider | `dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.ResourceManager.PostgreSql |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.resourcemanager.postgresql |
| Product Documentation | https://learn.microsoft.com/azure/postgresql/flexible-server/ |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/postgresql/Azure.ResourceManager.PostgreSql |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
