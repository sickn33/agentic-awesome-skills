# Database Operations

Fragments require reviewed resource IDs, compatible pinned SDK versions and explicit change scope. Define `approvedDroppedDatabaseId`/`approvedRecoverableDatabaseId` from the requested restore selection; never restore an arbitrary first result. Copies/exports expose data and incur costs. Use an authorized storage destination and least-privilege credentials.

Advanced database operations for Azure SQL.

## Create Database with vCore SKU

```csharp
using Azure.ResourceManager.Sql;
using Azure.ResourceManager.Sql.Models;

var databaseData = new SqlDatabaseData(AzureLocation.EastUS)
{
    Sku = new SqlSku("GP_Gen5_2")
    {
        Tier = "GeneralPurpose",
        Family = "Gen5",
        Capacity = 2 // vCores
    },
    MaxSizeBytes = 32L * 1024 * 1024 * 1024, // 32 GB
    ZoneRedundant = false,
    ReadScale = SqlDatabaseReadScale.Disabled,
    RequestedBackupStorageRedundancy = SqlBackupStorageRedundancy.Geo
};

var operation = await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-vcore-database",
    databaseData);
```

## Create Serverless Database

```csharp
var databaseData = new SqlDatabaseData(AzureLocation.EastUS)
{
    Sku = new SqlSku("GP_S_Gen5_2")
    {
        Tier = "GeneralPurpose",
        Family = "Gen5",
        Capacity = 2 // Max vCores
    },
    AutoPauseDelay = 60, // Minutes of inactivity before auto-pause
    MinCapacity = 0.5,   // Minimum vCores (can be fractional)
    MaxSizeBytes = 32L * 1024 * 1024 * 1024
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-serverless-db",
    databaseData);
```

## Scale Database

```csharp
// Get existing database
var database = await databaseCollection.GetAsync("my-database");

// Update SKU
var updateData = new SqlDatabaseData(database.Value.Data.Location)
{
    Sku = new SqlSku("S3") { Tier = "Standard" }
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-database",
    updateData);
```

## Copy Database

```csharp
var copyData = new SqlDatabaseData(AzureLocation.EastUS)
{
    CreateMode = SqlDatabaseCreateMode.Copy,
    SourceDatabaseId = sourceDatabase.Id,
    Sku = new SqlSku("S0") { Tier = "Standard" }
};

await targetDatabaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "database-copy",
    copyData);
```

## Restore Database from Point-in-Time

```csharp
var restoreData = new SqlDatabaseData(AzureLocation.EastUS)
{
    CreateMode = SqlDatabaseCreateMode.PointInTimeRestore,
    SourceDatabaseId = sourceDatabase.Id,
    RestorePointInTime = DateTimeOffset.UtcNow.AddHours(-2), // 2 hours ago
    Sku = new SqlSku("S0") { Tier = "Standard" }
};

await databaseCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "restored-database",
    restoreData);
```

## Restore Deleted Database

```csharp
// List deleted databases
var deletedDatabases = server.GetRestorableDroppedDatabases();

await foreach (var deleted in deletedDatabases)
{
    Console.WriteLine($"Deleted: {deleted.Data.DatabaseName} at {deleted.Data.DeletionOn}");

    if (deleted.Id.ToString() != approvedDroppedDatabaseId) continue; // exact reviewed resource ID
    // Restore only the approved deleted database
    var restoreData = new SqlDatabaseData(AzureLocation.EastUS)
    {
        CreateMode = SqlDatabaseCreateMode.Restore,
        RestorableDroppedDatabaseId = deleted.Id,
        Sku = new SqlSku("S0") { Tier = "Standard" }
    };

    await databaseCollection.CreateOrUpdateAsync(
        WaitUntil.Completed,
        "restored-deleted-db",
        restoreData);

    break; // Restore first one
}
```

## Geo-Restore Database

```csharp
// List recoverable databases (geo-replicated backups)
var recoverableDatabases = server.GetRecoverableDatabases();

await foreach (var recoverable in recoverableDatabases)
{
    if (recoverable.Id.ToString() != approvedRecoverableDatabaseId) continue;
    var restoreData = new SqlDatabaseData(AzureLocation.WestUS) // Different region
    {
        CreateMode = SqlDatabaseCreateMode.Recovery,
        RecoverableDatabaseId = recoverable.Id,
        Sku = new SqlSku("S0") { Tier = "Standard" }
    };

    await targetDatabaseCollection.CreateOrUpdateAsync(
        WaitUntil.Completed,
        "geo-restored-db",
        restoreData);

    break;
}
```

## Configure Long-Term Retention

```csharp
var ltrPolicy = new LongTermRetentionPolicyData
{
    WeeklyRetention = "P4W",  // 4 weeks
    MonthlyRetention = "P12M", // 12 months
    YearlyRetention = "P5Y",   // 5 years
    WeekOfYear = 1 // First week for yearly backup
};

var ltrPolicyResource = database.GetLongTermRetentionPolicy();
await ltrPolicyResource.CreateOrUpdateAsync(
    WaitUntil.Completed,
    ltrPolicy);
```

## Configure Short-Term Retention

```csharp
var strPolicy = new ShortTermRetentionPolicyData
{
    RetentionDays = 14, // 7-35 days
    DiffBackupIntervalInHours = 12 // 12 or 24 hours
};

var strPolicyResource = database.GetShortTermRetentionPolicy();
await strPolicyResource.CreateOrUpdateAsync(
    WaitUntil.Completed,
    strPolicy);
```

## Export Database to Bacpac

```csharp
var exportRequest = new DatabaseExportDefinition
{
    StorageKeyType = StorageKeyType.StorageAccessKey,
    StorageKey = Environment.GetEnvironmentVariable("SQL_EXPORT_STORAGE_KEY") ?? throw new InvalidOperationException("SQL_EXPORT_STORAGE_KEY is required"),
    StorageUri = new Uri("https://mystorageaccount.blob.core.windows.net/backups/mydb.bacpac"),
    AdministratorLogin = "sqladmin",
    AdministratorLoginPassword = Environment.GetEnvironmentVariable("SQL_ADMIN_PASSWORD") ?? throw new InvalidOperationException("SQL_ADMIN_PASSWORD is required")
};

var exportOperation = await database.ExportAsync(WaitUntil.Completed, exportRequest);
```

## Import Database from Bacpac

```csharp
var importRequest = new ImportExistingDatabaseDefinition
{
    StorageKeyType = StorageKeyType.StorageAccessKey,
    StorageKey = Environment.GetEnvironmentVariable("SQL_EXPORT_STORAGE_KEY") ?? throw new InvalidOperationException("SQL_EXPORT_STORAGE_KEY is required"),
    StorageUri = new Uri("https://mystorageaccount.blob.core.windows.net/backups/mydb.bacpac"),
    AdministratorLogin = "sqladmin",
    AdministratorLoginPassword = Environment.GetEnvironmentVariable("SQL_ADMIN_PASSWORD") ?? throw new InvalidOperationException("SQL_ADMIN_PASSWORD is required")
};

// Import into existing database
var importOperation = await database.ImportAsync(WaitUntil.Completed, importRequest);
```

## Rename Database

```csharp
var renameRequest = new ResourceMoveDefinition(
    new ResourceIdentifier($"{server.Id}/databases/new-database-name"));

await database.RenameAsync(renameRequest);
```

## Delete Database

```csharp
var database = await databaseCollection.GetAsync("my-database");
await database.Value.DeleteAsync(WaitUntil.Completed);
```

## Transparent Data Encryption

```csharp
// TDE is enabled by default for new databases
// To check or modify:
var tdeResource = database.GetSqlDatabaseTransparentDataEncryption();
var tde = await tdeResource.GetAsync();

Console.WriteLine($"TDE State: {tde.Value.Data.State}");

// Keep TDE enabled; disabling encryption requires a separately approved change.
var tdeData = new SqlDatabaseTransparentDataEncryptionData
{
    State = TransparentDataEncryptionState.Enabled
};
await tdeResource.CreateOrUpdateAsync(WaitUntil.Completed, tdeData);
```

## Database Threat Detection

```csharp
var threatDetectionData = new SqlDatabaseSecurityAlertPolicyData
{
    State = SecurityAlertsPolicyState.Enabled,
    DisabledAlerts = { }, // Empty = all alerts enabled
    EmailAddresses = { "security@contoso.com" },
    EmailAccountAdmins = true,
    RetentionDays = 30,
    StorageEndpoint = "https://mystorageaccount.blob.core.windows.net",
    StorageAccountAccessKey = "<storage-key>"
};

var securityPolicy = database.GetSqlDatabaseSecurityAlertPolicy();
await securityPolicy.CreateOrUpdateAsync(WaitUntil.Completed, threatDetectionData);
```
