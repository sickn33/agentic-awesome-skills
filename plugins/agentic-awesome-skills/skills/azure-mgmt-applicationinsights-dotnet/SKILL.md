---
name: azure-mgmt-applicationinsights-dotnet
description: Azure Application Insights SDK for .NET. Application performance monitoring and observability resource management.
risk: critical
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.ApplicationInsights (.NET)

Azure Resource Manager SDK for managing Application Insights resources for application performance monitoring.

## Installation

```bash
dotnet add package Azure.ResourceManager.ApplicationInsights
dotnet add package Azure.Identity
```

Pin a supported tested SDK version and verify each operation against its API reference; package and ARM API versions differ. These independent fragments are not a single compiled program.

## Environment Variables

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=<your-resource-group>
AZURE_APPINSIGHTS_NAME=<your-appinsights-component>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.ApplicationInsights;

ArmClient client = new ArmClient(new DefaultAzureCredential());
```

## Resource Hierarchy

```
Subscription
└── ResourceGroup
    └── ApplicationInsightsComponent          # App Insights resource
        ├── ApplicationInsightsComponentApiKey  # API keys for programmatic access
        ├── ComponentLinkedStorageAccount      # Linked storage for data export
        └── (via component ID)
            ├── WebTest                        # Availability tests
            ├── Workbook                       # Workbooks for analysis
            ├── WorkbookTemplate               # Workbook templates
            └── MyWorkbook                     # Private workbooks
```

Select the intended tenant/subscription and verify the credential/roles. Create/update/delete operations and scheduled tests require target-specific authorization, cost review and rollback/retention planning. Avoid logging telemetry content or keys. Workspace-based retention is governed by the linked workspace/table configuration; component fields alone do not establish effective retention or application SDK sampling. Private Link requires the complete scope, DNS and access policy setup.

## Core Workflows

### 1. Create Application Insights Component (Workspace-based)

```csharp
using Azure.ResourceManager.ApplicationInsights;
using Azure.ResourceManager.ApplicationInsights.Models;

using Azure;
using Azure.Core;
using Azure.ResourceManager.Resources;

string subscriptionId = Environment.GetEnvironmentVariable("AZURE_SUBSCRIPTION_ID")
    ?? throw new InvalidOperationException("Missing subscription");
SubscriptionResource subscription = client.GetSubscriptionResource(
    new ResourceIdentifier($"/subscriptions/{subscriptionId}"));
ResourceGroupResource resourceGroup = (await subscription
    .GetResourceGroupAsync("my-resource-group")).Value;

ApplicationInsightsComponentCollection components = resourceGroup.GetApplicationInsightsComponents();

// Workspace-based Application Insights (recommended)
ApplicationInsightsComponentData data = new ApplicationInsightsComponentData(
    AzureLocation.EastUS,
    ApplicationInsightsApplicationType.Web)
{
    Kind = "web",
    WorkspaceResourceId = new ResourceIdentifier(
        "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.OperationalInsights/workspaces/<workspace-name>"),
    IngestionMode = IngestionMode.LogAnalytics,
    PublicNetworkAccessForIngestion = PublicNetworkAccessType.Enabled,
    PublicNetworkAccessForQuery = PublicNetworkAccessType.Enabled,
    RetentionInDays = 90,
    SamplingPercentage = 100,
    DisableIPMasking = false,
    ImmediatePurgeDataOn30Days = false,
    Tags =
    {
        { "environment", "production" },
        { "application", "mywebapp" }
    }
};

ArmOperation<ApplicationInsightsComponentResource> operation = await components
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-appinsights", data);

ApplicationInsightsComponentResource component = operation.Value;

Console.WriteLine($"Component created: {component.Data.Name}");
// Keep ingestion identifiers in approved configuration; do not log them.
// Pass the connection string to approved configuration without logging.
```

### 2. Get Connection String and Keys

```csharp
ApplicationInsightsComponentResource component = await resourceGroup
    .GetApplicationInsightsComponentAsync("my-appinsights");

// Get connection string for SDK configuration
string connectionString = component.Data.ConnectionString;
string instrumentationKey = component.Data.InstrumentationKey;
string appId = component.Data.AppId;

// Do not print connectionString.
// Do not print instrumentationKey.
Console.WriteLine($"App ID: {appId}");
```

### 3. Telemetry Query Authentication

Prefer supported Microsoft Entra authentication and least-privilege query roles. Do not create or log legacy telemetry-query API keys; verify the current query API/authentication lifecycle before migrating existing clients. Management-plane credentials are separate from ingestion and query access.

### 4. Availability Monitoring

Use supported Standard availability tests for new deployments. The former URL Ping XML example was deprecated, and multi-step `.webtest` tests retired in2024. Inspect current region/location identifiers, pricing, request/response validation, retry policy and TLS settings before enabling a scheduled test. For a multi-request journey, choose an explicitly supported synthetic runner with test-only credentials; this skill does not supply one. Never assume `{{TestPassword}}` interpolation is provided by the ARM SDK.

### 6. Create Workbook

```csharp
WorkbookCollection workbooks = resourceGroup.GetWorkbooks();

WorkbookData workbookData = new WorkbookData(AzureLocation.EastUS)
{
    DisplayName = "Application Performance Dashboard",
    Category = "workbook",
    Kind = WorkbookSharedTypeKind.Shared,
    SerializedData = """
    {
        "version": "Notebook/1.0",
        "items": [
            {
                "type": 1,
                "content": {
                    "json": "# Application Performance\n\nThis workbook shows application performance metrics."
                },
                "name": "header"
            },
            {
                "type": 3,
                "content": {
                    "version": "KqlItem/1.0",
                    "query": "requests\n| summarize count() by bin(timestamp, 1h)\n| render timechart",
                    "size": 0,
                    "title": "Requests per Hour",
                    "timeContext": {
                        "durationMs": 86400000
                    },
                    "queryType": 0,
                    "resourceType": "microsoft.insights/components"
                },
                "name": "requestsChart"
            }
        ],
        "isLocked": false
    }
    """,
    SourceId = component.Id,
    Tags =
    {
        { "environment", "production" }
    }
};

// Note: Workbook ID should be a new GUID
string workbookId = Guid.NewGuid().ToString();

ArmOperation<WorkbookResource> operation = await workbooks
    .CreateOrUpdateAsync(WaitUntil.Completed, workbookId, workbookData);

WorkbookResource workbook = operation.Value;
Console.WriteLine($"Workbook created: {workbook.Data.DisplayName}");
```

### 7. Link Storage Account

```csharp
ApplicationInsightsComponentResource component = await resourceGroup
    .GetApplicationInsightsComponentAsync("my-appinsights");

ComponentLinkedStorageAccountCollection linkedStorage = component.GetComponentLinkedStorageAccounts();

ComponentLinkedStorageAccountData storageData = new ComponentLinkedStorageAccountData
{
    LinkedStorageAccount = new ResourceIdentifier(
        "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>")
};

ArmOperation<ComponentLinkedStorageAccountResource> operation = await linkedStorage
    .CreateOrUpdateAsync(WaitUntil.Completed, StorageType.ServiceProfiler, storageData);
```

### 8. List and Manage Components

```csharp
// List all Application Insights components in resource group
await foreach (ApplicationInsightsComponentResource component in 
    resourceGroup.GetApplicationInsightsComponents())
{
    Console.WriteLine($"Component: {component.Data.Name}");
    Console.WriteLine($"  App ID: {component.Data.AppId}");
    Console.WriteLine($"  Type: {component.Data.ApplicationType}");
    Console.WriteLine($"  Ingestion Mode: {component.Data.IngestionMode}");
    Console.WriteLine($"  Retention: {component.Data.RetentionInDays} days");
}

// List web tests
await foreach (WebTestResource webTest in resourceGroup.GetWebTests())
{
    Console.WriteLine($"Web Test: {webTest.Data.WebTestName}");
    Console.WriteLine($"  Enabled: {webTest.Data.IsEnabled}");
    Console.WriteLine($"  Frequency: {webTest.Data.Frequency}s");
}

// List workbooks
await foreach (WorkbookResource workbook in resourceGroup.GetWorkbooks())
{
    Console.WriteLine($"Workbook: {workbook.Data.DisplayName}");
}
```

### 9. Update Component

```csharp
ApplicationInsightsComponentResource component = await resourceGroup
    .GetApplicationInsightsComponentAsync("my-appinsights");

// Update using full data (PUT operation)
ApplicationInsightsComponentData updateData = component.Data;
updateData.RetentionInDays = 180;
updateData.SamplingPercentage = 50;
updateData.Tags["updated"] = "true";

ArmOperation<ApplicationInsightsComponentResource> operation = await resourceGroup
    .GetApplicationInsightsComponents()
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-appinsights", updateData);
```

### 10. Delete Resources

```csharp
// Delete Application Insights component
ApplicationInsightsComponentResource component = await resourceGroup
    .GetApplicationInsightsComponentAsync("my-appinsights");
await component.DeleteAsync(WaitUntil.Completed);

// Delete web test
WebTestResource webTest = await resourceGroup.GetWebTestAsync("webtest-homepage");
await webTest.DeleteAsync(WaitUntil.Completed);
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `ApplicationInsightsComponentResource` | App Insights component |
| `ApplicationInsightsComponentData` | Component configuration |
| `ApplicationInsightsComponentCollection` | Collection of components |
| `ApplicationInsightsComponentApiKeyResource` | API key for programmatic access |
| `WebTestResource` | Availability/web test |
| `WebTestData` | Web test configuration |
| `WorkbookResource` | Analysis workbook |
| `WorkbookData` | Workbook configuration |
| `ComponentLinkedStorageAccountResource` | Linked storage for exports |

## Application Types

| Type | Enum Value |
|------|------------|
| Web Application | `Web` |
| iOS Application | `iOS` |
| Java Application | `Java` |
| Node.js Application | `NodeJS` |
| .NET Application | `MRT` |
| Other | `Other` |

## Web Test Locations

| Location ID | Region |
|-------------|--------|
| `us-ca-sjc-azr` | West US |
| `us-tx-sn1-azr` | South Central US |
| `us-il-ch1-azr` | North Central US |
| `us-va-ash-azr` | East US |
| `emea-gb-db3-azr` | UK South |
| `emea-nl-ams-azr` | West Europe |
| `emea-fr-pra-edge` | France Central |
| `apac-sg-sin-azr` | Southeast Asia |
| `apac-hk-hkn-azr` | East Asia |
| `apac-jp-kaw-edge` | Japan East |
| `latam-br-gru-edge` | Brazil South |
| `emea-au-syd-edge` | Australia East |

## Best Practices

1. **Use workspace-based** — Workspace-based App Insights is the current standard
2. **Link to Log Analytics** — Store data in Log Analytics for better querying
3. **Set appropriate retention** — Balance cost vs. data availability
4. **Use sampling** — Reduce costs for high-volume applications
5. **Store connection string securely** — Use Key Vault or managed identity
6. **Enable multiple test locations** — For accurate availability monitoring
7. **Use workbooks** — For custom dashboards and analysis
8. **Set up alerts** — Based on availability tests and metrics
9. **Tag resources** — For cost allocation and organization
10. **Use private endpoints** — For secure data ingestion

## Error Handling

```csharp
using Azure;

try
{
    ArmOperation<ApplicationInsightsComponentResource> operation = await components
        .CreateOrUpdateAsync(WaitUntil.Completed, "my-appinsights", data);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("Conflict: inspect structured error/code and current resource state; do not assume existence is the cause.");
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

## SDK Integration

Use the connection string with Application Insights SDK:

```csharp
// Program.cs in ASP.NET Core
builder.Services.AddApplicationInsightsTelemetry(options =>
{
    options.ConnectionString = configuration["ApplicationInsights:ConnectionString"];
});

// Or set via environment variable
// APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.ResourceManager.ApplicationInsights` | Resource management (this SDK) | `dotnet add package Azure.ResourceManager.ApplicationInsights` |
| `Microsoft.ApplicationInsights` | Telemetry SDK | `dotnet add package Microsoft.ApplicationInsights` |
| `Microsoft.ApplicationInsights.AspNetCore` | ASP.NET Core integration | `dotnet add package Microsoft.ApplicationInsights.AspNetCore` |
| `Azure.Monitor.OpenTelemetry.Exporter` | OpenTelemetry export | `dotnet add package Azure.Monitor.OpenTelemetry.Exporter` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.ResourceManager.ApplicationInsights |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.resourcemanager.applicationinsights |
| Product Documentation | https://learn.microsoft.com/azure/azure-monitor/app/app-insights-overview |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/applicationinsights/Azure.ResourceManager.ApplicationInsights |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
