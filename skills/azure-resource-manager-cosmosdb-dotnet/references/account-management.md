# Account Management

Detailed patterns for managing Cosmos DB accounts via Azure Resource Manager. Modified: secret redaction, SDK property names and closed-public-network example. Private endpoint/DNS connectivity must be provisioned and verified separately. Delete, key rotation and failover examples require exact-resource authorization and a recovery plan. Documentation IPs below are placeholders, not service allowlists.

## Create Account with Full Configuration

```csharp
using Azure.ResourceManager.CosmosDB;
using Azure.ResourceManager.CosmosDB.Models;
using Azure.Core;

var accountData = new CosmosDBAccountCreateOrUpdateContent(
    location: AzureLocation.EastUS,
    locations: new[]
    {
        new CosmosDBAccountLocation
        {
            LocationName = AzureLocation.EastUS,
            FailoverPriority = 0,
            IsZoneRedundant = true
        },
        new CosmosDBAccountLocation
        {
            LocationName = AzureLocation.WestUS,
            FailoverPriority = 1,
            IsZoneRedundant = false
        }
    })
{
    Kind = CosmosDBAccountKind.GlobalDocumentDB,

    // Consistency
    ConsistencyPolicy = new ConsistencyPolicy(DefaultConsistencyLevel.BoundedStaleness)
    {
        MaxStalenessPrefix = 100000,
        MaxIntervalInSeconds = 300
    },

    // High availability
    EnableAutomaticFailover = true,
    EnableMultipleWriteLocations = false,

    // Backup
    BackupPolicy = new ContinuousModeBackupPolicy
    {
        ContinuousModeTier = ContinuousModeTier.Continuous7Days
    },

    // Networking
    PublicNetworkAccess = CosmosDBPublicNetworkAccess.Disabled,
    IsVirtualNetworkFilterEnabled = false,

    // Features
    IsFreeTierEnabled = false,
    IsAnalyticalStorageEnabled = true,
    AnalyticalStorageSchemaType = AnalyticalStorageSchemaType.WellDefined,

    // Tags
    Tags =
    {
        ["Environment"] = "Production",
        ["CostCenter"] = "Engineering"
    }
};

var operation = await accountCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-cosmos-account",
    accountData);
```

## Get Existing Account

```csharp
// By name from resource group
var account = await resourceGroup.GetCosmosDBAccountAsync("my-cosmos-account");

// By resource ID
var accountId = CosmosDBAccountResource.CreateResourceIdentifier(
    subscriptionId, resourceGroupName, accountName);
var account = armClient.GetCosmosDBAccountResource(accountId);
await account.GetAsync(); // Fetch latest data
```

## Update Account

```csharp
// Get current account
var account = await resourceGroup.GetCosmosDBAccountAsync("my-cosmos-account");

// Create patch data
var patchData = new CosmosDBAccountPatch
{
    EnableAutomaticFailover = true,
    ConsistencyPolicy = new ConsistencyPolicy(DefaultConsistencyLevel.Session)
};
patchData.Tags.Add("UpdatedBy", "Automation");

// Apply update
var operation = await account.Value.UpdateAsync(WaitUntil.Completed, patchData);
```

## Delete Account

```csharp
var account = await resourceGroup.GetCosmosDBAccountAsync("my-cosmos-account");
await account.Value.DeleteAsync(WaitUntil.Completed);
```

## List Accounts

```csharp
// In resource group
await foreach (var account in resourceGroup.GetCosmosDBAccounts())
{
    Console.WriteLine($"Account: {account.Data.Name}");
    Console.WriteLine($"  Location: {account.Data.Location}");
    Console.WriteLine($"  Kind: {account.Data.Kind}");
}

// In subscription
await foreach (var account in subscription.GetCosmosDBAccountsAsync())
{
    Console.WriteLine($"{account.Data.Name} in {account.Data.ResourceGroupName}");
}
```

## Get Keys and Connection Strings

```csharp
// Get keys
var keys = await account.GetKeysAsync();
// Pass the key directly to an approved secret store; never print it.
// Do not log secondary keys.
// Read-only keys are still secrets.
// Do not log read-only keys.

// Get connection strings
var connectionStrings = await account.GetConnectionStringsAsync();
foreach (var cs in connectionStrings.Value.ConnectionStrings)
{
    Console.WriteLine($"{cs.Description}:");
    // Connection-string value omitted.
}

// Regenerate key
await account.RegenerateKeyAsync(
    WaitUntil.Completed,
    new CosmosDBAccountRegenerateKeyContent(CosmosDBAccountKeyKind.Primary));
```

## Failover Operations

```csharp
// Manual failover (for testing)
var failoverContent = new CosmosDBFailoverPolicies(new[]
{
    new CosmosDBFailoverPolicy
    {
        LocationName = AzureLocation.WestUS,
        FailoverPriority = 0
    },
    new CosmosDBFailoverPolicy
    {
        LocationName = AzureLocation.EastUS,
        FailoverPriority = 1
    }
});

await account.FailoverPriorityChangeAsync(WaitUntil.Completed, failoverContent);
```

## Network Configuration

### Private Endpoint

```csharp
// Note: Private endpoints are typically created via Azure.ResourceManager.Network
// The Cosmos account needs to be configured to accept private endpoint connections

var accountData = new CosmosDBAccountCreateOrUpdateContent(location, locations)
{
    PublicNetworkAccess = CosmosDBPublicNetworkAccess.Disabled,
    IsVirtualNetworkFilterEnabled = true
};
```

### IP Firewall Rules

```csharp
var accountData = new CosmosDBAccountCreateOrUpdateContent(location, locations)
{
    IPRules =
    {
        new CosmosDBIPAddressOrRange { IPAddressOrRange = "192.0.2.10" },
        new CosmosDBIPAddressOrRange { IPAddressOrRange = "198.51.100.20" },
        new CosmosDBIPAddressOrRange { IPAddressOrRange = "203.0.113.30/32" }
    }
};
```

### Virtual Network Rules

```csharp
var accountData = new CosmosDBAccountCreateOrUpdateContent(location, locations)
{
    IsVirtualNetworkFilterEnabled = true,
    VirtualNetworkRules =
    {
        new CosmosDBVirtualNetworkRule
        {
            Id = new ResourceIdentifier(
                "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}"),
            IgnoreMissingVnetServiceEndpoint = false
        }
    }
};
```

## Consistency Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `Strong` | Linearizable reads | Financial transactions |
| `BoundedStaleness` | Reads lag by K versions or T time | Gaming leaderboards |
| `Session` | Read your own writes | User sessions (default) |
| `ConsistentPrefix` | Reads never see out-of-order writes | Social feeds |
| `Eventual` | No ordering guarantee | Analytics, non-critical reads |

```csharp
// Bounded Staleness example
ConsistencyPolicy = new ConsistencyPolicy(DefaultConsistencyLevel.BoundedStaleness)
{
    MaxStalenessPrefix = 100000,  // Max versions behind
    MaxIntervalInSeconds = 300    // Max time behind (5 min)
}
```

## Backup Policies

### Periodic Backup

```csharp
BackupPolicy = new PeriodicModeBackupPolicy
{
    PeriodicModeProperties = new PeriodicModeProperties
    {
        BackupIntervalInMinutes = 240,  // 4 hours
        BackupRetentionIntervalInHours = 720,  // 30 days
        BackupStorageRedundancy = BackupStorageRedundancy.Geo
    }
}
```

### Continuous Backup

```csharp
BackupPolicy = new ContinuousModeBackupPolicy
{
    ContinuousModeTier = ContinuousModeTier.Continuous30Days
}
```

## Account Kinds

| Kind | API | Description |
|------|-----|-------------|
| `GlobalDocumentDB` | SQL (Core) | Default, most common |
| `MongoDB` | MongoDB | MongoDB wire protocol |
| `Parse` | SQL | Parse Server compatibility |

```csharp
// MongoDB account
var accountData = new CosmosDBAccountCreateOrUpdateContent(location, locations)
{
    Kind = CosmosDBAccountKind.MongoDB,
    ApiServerVersion = CosmosDBServerVersion.V4_2
};
```
