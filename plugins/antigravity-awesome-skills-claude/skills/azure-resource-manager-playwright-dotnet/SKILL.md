---
name: azure-resource-manager-playwright-dotnet
description: Azure Resource Manager SDK for Microsoft Playwright Testing in .NET.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.Playwright (.NET)

Management plane SDK for provisioning and managing Microsoft Playwright Testing workspaces via Azure Resource Manager.

> **⚠️ Management vs Test Execution**
> - **This SDK (Azure.ResourceManager.Playwright)**: Create workspaces, manage quotas, check name availability
> - **Test Execution SDK (Azure.Developer.MicrosoftPlaywrightTesting.NUnit)**: Run Playwright tests at scale on cloud browsers

## Installation

```bash
dotnet add package Azure.ResourceManager.Playwright
dotnet add package Azure.Identity
```

**Current Versions**: Stable v1.0.0, Preview v1.0.0-beta.1

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
using Azure.ResourceManager.Playwright;

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
    ├── PlaywrightQuotaResource (subscription-level quotas)
    └── ResourceGroupResource
        └── PlaywrightWorkspaceResource
            └── PlaywrightWorkspaceQuotaResource (workspace-level quotas)
```

## Core Workflow

### 1. Create Playwright Workspace

```csharp
using Azure.ResourceManager.Playwright;
using Azure.ResourceManager.Playwright.Models;

// Get resource group
var resourceGroup = await subscription
    .GetResourceGroupAsync("my-resource-group");

// Define workspace
var workspaceData = new PlaywrightWorkspaceData(AzureLocation.WestUS3)
{
    // Optional: Configure regional affinity and local auth
    RegionalAffinity = PlaywrightRegionalAffinity.Enabled,
    LocalAuth = PlaywrightLocalAuth.Enabled,
    Tags =
    {
        ["Team"] = "Dev Exp",
        ["Environment"] = "Production"
    }
};

// Create workspace (long-running operation)
var workspaceCollection = resourceGroup.Value.GetPlaywrightWorkspaces();
var operation = await workspaceCollection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-playwright-workspace",
    workspaceData);

PlaywrightWorkspaceResource workspace = operation.Value;

// Get the data plane URI for running tests
Console.WriteLine($"Data Plane URI: {workspace.Data.DataplaneUri}");
Console.WriteLine($"Workspace ID: {workspace.Data.WorkspaceId}");
```

### 2. Get Existing Workspace

```csharp
// Get by name
var workspace = await workspaceCollection.GetAsync("my-playwright-workspace");

// Or check if exists first
bool exists = await workspaceCollection.ExistsAsync("my-playwright-workspace");
if (exists)
{
    var existingWorkspace = await workspaceCollection.GetAsync("my-playwright-workspace");
    Console.WriteLine($"Workspace found: {existingWorkspace.Value.Data.Name}");
}
```

### 3. List Workspaces

```csharp
// List in resource group
await foreach (var workspace in workspaceCollection.GetAllAsync())
{
    Console.WriteLine($"Workspace: {workspace.Data.Name}");
    Console.WriteLine($"  Location: {workspace.Data.Location}");
    Console.WriteLine($"  State: {workspace.Data.ProvisioningState}");
    Console.WriteLine($"  Data Plane URI: {workspace.Data.DataplaneUri}");
}

// List across subscription
await foreach (var workspace in subscription.GetPlaywrightWorkspacesAsync())
{
    Console.WriteLine($"Workspace: {workspace.Data.Name}");
}
```

### 4. Update Workspace

```csharp
var patch = new PlaywrightWorkspacePatch
{
    Tags =
    {
        ["Team"] = "Dev Exp",
        ["Environment"] = "Staging",
        ["UpdatedAt"] = DateTime.UtcNow.ToString("o")
    }
};

var updatedWorkspace = await workspace.Value.UpdateAsync(patch);
```

### 5. Check Name Availability

```csharp
using Azure.ResourceManager.Playwright.Models;

var checkRequest = new PlaywrightCheckNameAvailabilityContent
{
    Name = "my-new-workspace",
    ResourceType = "Microsoft.LoadTestService/playwrightWorkspaces"
};

var result = await subscription.CheckPlaywrightNameAvailabilityAsync(checkRequest);

if (result.Value.IsNameAvailable == true)
{
    Console.WriteLine("Name is available!");
}
else
{
    Console.WriteLine($"Name unavailable: {result.Value.Message}");
    Console.WriteLine($"Reason: {result.Value.Reason}");
}
```

### 6. Get Quota Information

```csharp
// Subscription-level quotas
await foreach (var quota in subscription.GetPlaywrightQuotasAsync(AzureLocation.WestUS3))
{
    Console.WriteLine($"Quota: {quota.Data.Name}");
    Console.WriteLine($"  Limit: {quota.Data.Limit}");
    Console.WriteLine($"  Used: {quota.Data.Used}");
}

// Workspace-level quotas
var workspaceQuotas = workspace.Value.GetAllPlaywrightWorkspaceQuota();
await foreach (var quota in workspaceQuotas.GetAllAsync())
{
    Console.WriteLine($"Workspace Quota: {quota.Data.Name}");
}
```

### 7. Delete Workspace

```csharp
// Delete (long-running operation)
await workspace.Value.DeleteAsync(WaitUntil.Completed);
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `ArmClient` | Entry point for all ARM operations |
| `PlaywrightWorkspaceResource` | Represents a Playwright Testing workspace |
| `PlaywrightWorkspaceCollection` | Collection for workspace CRUD |
| `PlaywrightWorkspaceData` | Workspace creation/response payload |
| `PlaywrightWorkspacePatch` | Workspace update payload |
| `PlaywrightQuotaResource` | Subscription-level quota information |
| `PlaywrightWorkspaceQuotaResource` | Workspace-level quota information |
| `PlaywrightExtensions` | Extension methods for ARM resources |
| `PlaywrightCheckNameAvailabilityContent` | Name availability check request |

## Workspace Properties

| Property | Description |
|----------|-------------|
| `DataplaneUri` | URI for running tests (e.g., `https://api.dataplane.{guid}.domain.com`) |
| `WorkspaceId` | Unique workspace identifier (GUID) |
| `RegionalAffinity` | Enable/disable regional affinity for test execution |
| `LocalAuth` | Enable/disable local authentication (access tokens) |
| `ProvisioningState` | Current provisioning state (Succeeded, Failed, etc.) |

## Best Practices

1. **Use `WaitUntil.Completed`** for operations that must finish before proceeding
2. **Use `WaitUntil.Started`** when you want to poll manually or run operations in parallel
3. **Always use `DefaultAzureCredential`** — never hardcode keys
4. **Handle `RequestFailedException`** for ARM API errors
5. **Use `CreateOrUpdateAsync`** for idempotent operations
6. **Navigate hierarchy** via `Get*` methods (e.g., `resourceGroup.GetPlaywrightWorkspaces()`)
7. **Store the DataplaneUri** after workspace creation for test execution configuration

## Error Handling

```csharp
using Azure;

try
{
    var operation = await workspaceCollection.CreateOrUpdateAsync(
        WaitUntil.Completed, workspaceName, workspaceData);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("Workspace already exists");
}
catch (RequestFailedException ex) when (ex.Status == 400)
{
    Console.WriteLine($"Bad request: {ex.Message}");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"ARM Error: {ex.Status} - {ex.ErrorCode}: {ex.Message}");
}
```

## Integration with Test Execution

After creating a workspace, use the `DataplaneUri` to configure your Playwright tests:

```csharp
// 1. Create workspace (this SDK)
var workspace = await workspaceCollection.CreateOrUpdateAsync(
    WaitUntil.Completed, "my-workspace", workspaceData);

// 2. Get the service URL
var serviceUrl = workspace.Value.Data.DataplaneUri;

// 3. Set environment variable for test execution
Environment.SetEnvironmentVariable("PLAYWRIGHT_SERVICE_URL", serviceUrl.ToString());

// 4. Run tests using Azure.Developer.MicrosoftPlaywrightTesting.NUnit
// (separate package for test execution)
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.ResourceManager.Playwright` | Management plane (this SDK) | `dotnet add package Azure.ResourceManager.Playwright` |
| `Azure.Developer.MicrosoftPlaywrightTesting.NUnit` | Run NUnit Playwright tests at scale | `dotnet add package Azure.Developer.MicrosoftPlaywrightTesting.NUnit --prerelease` |
| `Azure.Developer.Playwright` | Playwright client library | `dotnet add package Azure.Developer.Playwright` |

## API Information

- **Resource Provider**: `Microsoft.LoadTestService`
- **Default API Version**: `2025-09-01`
- **Resource Type**: `Microsoft.LoadTestService/playwrightWorkspaces`

## Documentation Links

- [Azure.ResourceManager.Playwright API Reference](https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.playwright)
- [Microsoft Playwright Testing Overview](https://learn.microsoft.com/en-us/azure/playwright-testing/overview-what-is-microsoft-playwright-testing)
- [Quickstart: Run Playwright Tests at Scale](https://learn.microsoft.com/en-us/azure/playwright-testing/quickstart-run-end-to-end-tests)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
