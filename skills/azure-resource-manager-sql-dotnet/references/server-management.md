# Server Management

`approvedPrivateEndpointConnectionId` below must come from a reviewed expected endpoint request (tenant, subscription, network and requester), not simply the first pending request. Server deletion also deletes hosted databases; confirm target and recovery evidence before executing.

Advanced server operations for Azure SQL.

## Create Server with Azure AD Authentication

```csharp
using Azure.ResourceManager.Sql;
using Azure.ResourceManager.Sql.Models;

var serverData = new SqlServerData(AzureLocation.EastUS)
{
    // SQL authentication (optional, can be disabled)
    AdministratorLogin = "sqladmin",
    AdministratorLoginPassword = Environment.GetEnvironmentVariable("SQL_ADMIN_PASSWORD") ?? throw new InvalidOperationException("SQL_ADMIN_PASSWORD is required"),

    // Azure AD authentication
    Administrators = new ServerExternalAdministrator
    {
        AdministratorType = SqlAdministratorType.ActiveDirectory,
        Login = "admin@contoso.com",
        Sid = Guid.Parse("<azure-ad-user-object-id>"),
        TenantId = Guid.Parse("<azure-ad-tenant-id>"),
        AzureADOnlyAuthentication = false // Set true to disable SQL auth
    },

    Version = "12.0",
    MinimalTlsVersion = SqlMinimalTlsVersion.Tls1_2
};

var operation = await serverCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-sql-server",
    serverData);
```

## Update Server Administrator Password

```csharp
// Get existing server
var server = await serverCollection.GetAsync("my-sql-server");

// Update password (requires full server data)
var updateData = server.Value.Data;
// Note: Password cannot be read, only set
// You need to create new SqlServerData with the new password

var newServerData = new SqlServerData(server.Value.Data.Location)
{
    AdministratorLogin = server.Value.Data.AdministratorLogin,
    AdministratorLoginPassword = Environment.GetEnvironmentVariable("SQL_ADMIN_PASSWORD") ?? throw new InvalidOperationException("SQL_ADMIN_PASSWORD is required")
};

await serverCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-sql-server",
    newServerData);
```

## Configure Public Network Access

```csharp
var serverData = new SqlServerData(AzureLocation.EastUS)
{
    AdministratorLogin = "sqladmin",
    AdministratorLoginPassword = Environment.GetEnvironmentVariable("SQL_ADMIN_PASSWORD") ?? throw new InvalidOperationException("SQL_ADMIN_PASSWORD is required"),

    // Disable public access (use private endpoints only)
    PublicNetworkAccess = ServerNetworkAccessFlag.Disabled,

    // Or enable with restrictions
    // PublicNetworkAccess = ServerNetworkAccessFlag.Enabled,
    // RestrictOutboundNetworkAccess = ServerNetworkAccessFlag.Enabled
};
```

## Get Server by Resource ID

```csharp
var resourceId = SqlServerResource.CreateResourceIdentifier(
    subscriptionId,
    "my-resource-group",
    "my-sql-server");

var server = armClient.GetSqlServerResource(resourceId);
var serverData = await server.GetAsync();
```

## Delete Server

```csharp
var server = await serverCollection.GetAsync("my-sql-server");
await server.Value.DeleteAsync(WaitUntil.Completed);
```

## Check Server Name Availability

```csharp
var checkRequest = new SqlNameAvailabilityContent
{
    Name = "proposed-server-name",
    ResourceType = "Microsoft.Sql/servers"
};

var result = await subscription.CheckSqlNameAvailabilityAsync(checkRequest);

if (result.Value.IsAvailable == true)
{
    Console.WriteLine("Name is available");
}
else
{
    Console.WriteLine($"Name unavailable: {result.Value.Reason}");
}
```

## Virtual Network Rules

```csharp
// Allow access from a specific subnet
var vnetRuleData = new SqlServerVirtualNetworkRuleData
{
    VirtualNetworkSubnetId = new ResourceIdentifier(
        "/subscriptions/{sub}/resourceGroups/{rg}/providers/" +
        "Microsoft.Network/virtualNetworks/{vnet}/subnets/{subnet}"),
    IgnoreMissingVnetServiceEndpoint = false
};

var vnetRuleCollection = server.GetSqlServerVirtualNetworkRules();
await vnetRuleCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "allow-app-subnet",
    vnetRuleData);
```

## Private Endpoints

```csharp
// Private endpoints are created via Microsoft.Network, not SQL SDK
// The SQL server just needs PublicNetworkAccess = Disabled

// After creating private endpoint, approve the connection:
var privateEndpointConnections = server.GetSqlServerPrivateEndpointConnections();

await foreach (var connection in privateEndpointConnections)
{
    if (connection.Id.ToString() == approvedPrivateEndpointConnectionId &&
        connection.Data.PrivateLinkServiceConnectionState.Status == "Pending")
    {
        // Approve the connection
        var approvalData = connection.Data;
        approvalData.PrivateLinkServiceConnectionState.Status = "Approved";
        approvalData.PrivateLinkServiceConnectionState.Description = "Approved by admin";

        await privateEndpointConnections.CreateOrUpdateAsync(
            WaitUntil.Completed,
            connection.Data.Name,
            approvalData);
    }
}
```

## Server Auditing

```csharp
var auditingData = new SqlServerBlobAuditingPolicyData
{
    State = BlobAuditingPolicyState.Enabled,
    StorageEndpoint = "https://mystorageaccount.blob.core.windows.net",
    StorageAccountAccessKey = "<storage-account-key>",
    RetentionDays = 90,
    IsStorageSecondaryKeyInUse = false,
    IsAzureMonitorTargetEnabled = true
};

var auditingPolicy = server.GetSqlServerBlobAuditingPolicy();
await auditingPolicy.CreateOrUpdateAsync(WaitUntil.Completed, auditingData);
```

## Transparent Data Encryption (Server-Level Key)

```csharp
// Configure customer-managed key for TDE
var protectorData = new EncryptionProtectorData
{
    ServerKeyType = SqlServerKeyType.AzureKeyVault,
    ServerKeyName = "mykeyvault_mykey_abc123",
    AutoRotationEnabled = true
};

var protector = server.GetEncryptionProtector();
await protector.CreateOrUpdateAsync(WaitUntil.Completed, protectorData);
```
