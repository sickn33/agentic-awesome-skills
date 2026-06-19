---
name: azure-resource-manager-mysql-dotnet
description: Azure MySQL Flexible Server SDK for .NET. Database management for MySQL Flexible Server deployments.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.MySql (.NET)

Azure Resource Manager SDK for managing MySQL Flexible Server deployments.

## Installation

```bash
dotnet add package Azure.ResourceManager.MySql
dotnet add package Azure.Identity
```

**Current Version**: v1.2.0 (GA)  
**API Version**: 2023-12-30

> **Note**: This skill focuses on MySQL Flexible Server. Single Server is deprecated and scheduled for retirement.

## Environment Variables

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=<your-resource-group>
AZURE_MYSQL_SERVER_NAME=<your-mysql-server>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.MySql;
using Azure.ResourceManager.MySql.FlexibleServers;

ArmClient client = new ArmClient(new DefaultAzureCredential());
```

## Resource Hierarchy

```
Subscription
└── ResourceGroup
    └── MySqlFlexibleServer                 # MySQL Flexible Server instance
        ├── MySqlFlexibleServerDatabase     # Database within the server
        ├── MySqlFlexibleServerFirewallRule # IP firewall rules
        ├── MySqlFlexibleServerConfiguration # Server parameters
        ├── MySqlFlexibleServerBackup       # Backup information
        ├── MySqlFlexibleServerMaintenanceWindow # Maintenance schedule
        └── MySqlFlexibleServerAadAdministrator # Entra ID admin
```

## Core Workflows

### 1. Create MySQL Flexible Server

```csharp
using Azure.ResourceManager.MySql.FlexibleServers;
using Azure.ResourceManager.MySql.FlexibleServers.Models;

ResourceGroupResource resourceGroup = await client
    .GetDefaultSubscriptionAsync()
    .Result
    .GetResourceGroupAsync("my-resource-group");

MySqlFlexibleServerCollection servers = resourceGroup.GetMySqlFlexibleServers();

MySqlFlexibleServerData data = new MySqlFlexibleServerData(AzureLocation.EastUS)
{
    Sku = new MySqlFlexibleServerSku("Standard_D2ds_v4", MySqlFlexibleServerSkuTier.GeneralPurpose),
    AdministratorLogin = "mysqladmin",
    AdministratorLoginPassword = "YourSecurePassword123!",
    Version = MySqlFlexibleServerVersion.Ver8_0_21,
    Storage = new MySqlFlexibleServerStorage
    {
        StorageSizeInGB = 128,
        AutoGrow = MySqlFlexibleServerEnableStatusEnum.Enabled,
        Iops = 3000
    },
    Backup = new MySqlFlexibleServerBackupProperties
    {
        BackupRetentionDays = 7,
        GeoRedundantBackup = MySqlFlexibleServerEnableStatusEnum.Disabled
    },
    HighAvailability = new MySqlFlexibleServerHighAvailability
    {
        Mode = MySqlFlexibleServerHighAvailabilityMode.ZoneRedundant,
        StandbyAvailabilityZone = "2"
    },
    AvailabilityZone = "1"
};

ArmOperation<MySqlFlexibleServerResource> operation = await servers
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-mysql-server", data);

MySqlFlexibleServerResource server = operation.Value;
Console.WriteLine($"Server created: {server.Data.FullyQualifiedDomainName}");
```

### 2. Create Database

```csharp
MySqlFlexibleServerResource server = await resourceGroup
    .GetMySqlFlexibleServerAsync("my-mysql-server");

MySqlFlexibleServerDatabaseCollection databases = server.GetMySqlFlexibleServerDatabases();

MySqlFlexibleServerDatabaseData dbData = new MySqlFlexibleServerDatabaseData
{
    Charset = "utf8mb4",
    Collation = "utf8mb4_unicode_ci"
};

ArmOperation<MySqlFlexibleServerDatabaseResource> operation = await databases
    .CreateOrUpdateAsync(WaitUntil.Completed, "myappdb", dbData);

MySqlFlexibleServerDatabaseResource database = operation.Value;
Console.WriteLine($"Database created: {database.Data.Name}");
```

### 3. Configure Firewall Rules

```csharp
MySqlFlexibleServerFirewallRuleCollection firewallRules = server.GetMySqlFlexibleServerFirewallRules();

// Allow specific IP range
MySqlFlexibleServerFirewallRuleData ruleData = new MySqlFlexibleServerFirewallRuleData
{
    StartIPAddress = System.Net.IPAddress.Parse("10.0.0.1"),
    EndIPAddress = System.Net.IPAddress.Parse("10.0.0.255")
};

ArmOperation<MySqlFlexibleServerFirewallRuleResource> operation = await firewallRules
    .CreateOrUpdateAsync(WaitUntil.Completed, "allow-internal", ruleData);

// Allow Azure services
MySqlFlexibleServerFirewallRuleData azureServicesRule = new MySqlFlexibleServerFirewallRuleData
{
    StartIPAddress = System.Net.IPAddress.Parse("0.0.0.0"),
    EndIPAddress = System.Net.IPAddress.Parse("0.0.0.0")
};

await firewallRules.CreateOrUpdateAsync(WaitUntil.Completed, "AllowAllAzureServicesAndResourcesWithinAzureIps", azureServicesRule);
```

### 4. Update Server Configuration

```csharp
MySqlFlexibleServerConfigurationCollection configurations = server.GetMySqlFlexibleServerConfigurations();

// Get current configuration
MySqlFlexibleServerConfigurationResource config = await configurations
    .GetAsync("max_connections");

// Update configuration
MySqlFlexibleServerConfigurationData configData = new MySqlFlexibleServerConfigurationData
{
    Value = "500",
    Source = MySqlFlexibleServerConfigurationSource.UserOverride
};

ArmOperation<MySqlFlexibleServerConfigurationResource> operation = await configurations
    .CreateOrUpdateAsync(WaitUntil.Completed, "max_connections", configData);

// Common configurations to tune
string[] commonParams = { "max_connections", "innodb_buffer_pool_size", "slow_query_log", "long_query_time" };
```

### 5. Configure Entra ID Administrator

```csharp
MySqlFlexibleServerAadAdministratorCollection admins = server.GetMySqlFlexibleServerAadAdministrators();

MySqlFlexibleServerAadAdministratorData adminData = new MySqlFlexibleServerAadAdministratorData
{
    AdministratorType = MySqlFlexibleServerAdministratorType.ActiveDirectory,
    Login = "aad-admin@contoso.com",
    Sid = Guid.Parse("<entra-object-id>"),
    TenantId = Guid.Parse("<tenant-id>"),
    IdentityResourceId = new ResourceIdentifier("/subscriptions/.../userAssignedIdentities/mysql-identity")
};

ArmOperation<MySqlFlexibleServerAadAdministratorResource> operation = await admins
    .CreateOrUpdateAsync(WaitUntil.Completed, "ActiveDirectory", adminData);
```

### 6. List and Manage Servers

```csharp
// List servers in resource group
await foreach (MySqlFlexibleServerResource server in resourceGroup.GetMySqlFlexibleServers())
{
    Console.WriteLine($"Server: {server.Data.Name}");
    Console.WriteLine($"  FQDN: {server.Data.FullyQualifiedDomainName}");
    Console.WriteLine($"  Version: {server.Data.Version}");
    Console.WriteLine($"  State: {server.Data.State}");
    Console.WriteLine($"  SKU: {server.Data.Sku.Name} ({server.Data.Sku.Tier})");
}

// List databases in server
await foreach (MySqlFlexibleServerDatabaseResource db in server.GetMySqlFlexibleServerDatabases())
{
    Console.WriteLine($"Database: {db.Data.Name}");
}
```

### 7. Backup and Restore

```csharp
// List available backups
await foreach (MySqlFlexibleServerBackupResource backup in server.GetMySqlFlexibleServerBackups())
{
    Console.WriteLine($"Backup: {backup.Data.Name}");
    Console.WriteLine($"  Type: {backup.Data.BackupType}");
    Console.WriteLine($"  Completed: {backup.Data.CompletedOn}");
}

// Point-in-time restore
MySqlFlexibleServerData restoreData = new MySqlFlexibleServerData(AzureLocation.EastUS)
{
    CreateMode = MySqlFlexibleServerCreateMode.PointInTimeRestore,
    SourceServerResourceId = server.Id,
    RestorePointInTime = DateTimeOffset.UtcNow.AddHours(-2)
};

ArmOperation<MySqlFlexibleServerResource> operation = await servers
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-mysql-restored", restoreData);
```

### 8. Stop and Start Server

```csharp
MySqlFlexibleServerResource server = await resourceGroup
    .GetMySqlFlexibleServerAsync("my-mysql-server");

// Stop server (saves costs when not in use)
await server.StopAsync(WaitUntil.Completed);

// Start server
await server.StartAsync(WaitUntil.Completed);

// Restart server
await server.RestartAsync(WaitUntil.Completed, new MySqlFlexibleServerRestartParameter
{
    RestartWithFailover = MySqlFlexibleServerEnableStatusEnum.Enabled,
    MaxFailoverSeconds = 60
});
```

### 9. Update Server (Scale)

```csharp
MySqlFlexibleServerResource server = await resourceGroup
    .GetMySqlFlexibleServerAsync("my-mysql-server");

MySqlFlexibleServerPatch patch = new MySqlFlexibleServerPatch
{
    Sku = new MySqlFlexibleServerSku("Standard_D4ds_v4", MySqlFlexibleServerSkuTier.GeneralPurpose),
    Storage = new MySqlFlexibleServerStorage
    {
        StorageSizeInGB = 256,
        Iops = 6000
    }
};

ArmOperation<MySqlFlexibleServerResource> operation = await server
    .UpdateAsync(WaitUntil.Completed, patch);
```

### 10. Delete Server

```csharp
MySqlFlexibleServerResource server = await resourceGroup
    .GetMySqlFlexibleServerAsync("my-mysql-server");

await server.DeleteAsync(WaitUntil.Completed);
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `MySqlFlexibleServerResource` | Flexible Server instance |
| `MySqlFlexibleServerData` | Server configuration data |
| `MySqlFlexibleServerCollection` | Collection of servers |
| `MySqlFlexibleServerDatabaseResource` | Database within server |
| `MySqlFlexibleServerFirewallRuleResource` | IP firewall rule |
| `MySqlFlexibleServerConfigurationResource` | Server parameter |
| `MySqlFlexibleServerBackupResource` | Backup metadata |
| `MySqlFlexibleServerAadAdministratorResource` | Entra ID admin |
| `MySqlFlexibleServerSku` | SKU (compute tier + size) |
| `MySqlFlexibleServerStorage` | Storage configuration |
| `MySqlFlexibleServerHighAvailability` | HA configuration |
| `MySqlFlexibleServerBackupProperties` | Backup settings |

## SKU Tiers

| Tier | Use Case | SKU Examples |
|------|----------|--------------|
| `Burstable` | Dev/test, light workloads | Standard_B1ms, Standard_B2s |
| `GeneralPurpose` | Production workloads | Standard_D2ds_v4, Standard_D4ds_v4 |
| `MemoryOptimized` | High memory requirements | Standard_E2ds_v4, Standard_E4ds_v4 |

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
4. **Configure Entra ID authentication** — More secure than SQL auth
5. **Enable auto-grow storage** — Prevents out-of-space issues
6. **Set appropriate backup retention** — 7-35 days based on compliance
7. **Use private endpoints** — For secure network access
8. **Tune server parameters** — Based on workload characteristics
9. **Monitor with Azure Monitor** — Enable metrics and logs
10. **Stop dev/test servers** — Save costs when not in use

## Error Handling

```csharp
using Azure;

try
{
    ArmOperation<MySqlFlexibleServerResource> operation = await servers
        .CreateOrUpdateAsync(WaitUntil.Completed, "my-mysql", data);
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
// ADO.NET connection string
string connectionString = $"Server={server.Data.FullyQualifiedDomainName};" +
    "Database=myappdb;" +
    "User Id=mysqladmin;" +
    "Password=YourSecurePassword123!;" +
    "SslMode=Required;";

// With Entra ID token (recommended)
var credential = new DefaultAzureCredential();
var token = await credential.GetTokenAsync(
    new TokenRequestContext(new[] { "https://ossrdbms-aad.database.windows.net/.default" }));

string connectionString = $"Server={server.Data.FullyQualifiedDomainName};" +
    "Database=myappdb;" +
    $"User Id=aad-admin@contoso.com;" +
    $"Password={token.Token};" +
    "SslMode=Required;";
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.ResourceManager.MySql` | MySQL management (this SDK) | `dotnet add package Azure.ResourceManager.MySql` |
| `Azure.ResourceManager.PostgreSql` | PostgreSQL management | `dotnet add package Azure.ResourceManager.PostgreSql` |
| `MySqlConnector` | MySQL data access | `dotnet add package MySqlConnector` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.ResourceManager.MySql |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.resourcemanager.mysql |
| Product Documentation | https://learn.microsoft.com/azure/mysql/flexible-server/ |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/mysql/Azure.ResourceManager.MySql |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
