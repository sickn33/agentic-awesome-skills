---
name: azure-mgmt-arizeaiobservabilityeval-dotnet
description: Azure Resource Manager SDK for Arize AI Observability and Evaluation (.NET).
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.ArizeAIObservabilityEval

.NET SDK for managing Arize AI Observability and Evaluation resources on Azure.

## Installation

```bash
dotnet add package Azure.ResourceManager.ArizeAIObservabilityEval --version 1.0.0
```

## Package Info

| Property | Value |
|----------|-------|
| Package | `Azure.ResourceManager.ArizeAIObservabilityEval` |
| Version | `1.0.0` (GA) |
| API Version | `2024-10-01` |
| ARM Type | `ArizeAi.ObservabilityEval/organizations` |
| Dependencies | `Azure.Core` >= 1.46.2, `Azure.ResourceManager` >= 1.13.1 |

## Environment Variables

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.ArizeAIObservabilityEval;

// Always use DefaultAzureCredential
var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);
```

## Core Workflow

### Create an Arize AI Organization

```csharp
using Azure.Core;
using Azure.ResourceManager.Resources;
using Azure.ResourceManager.ArizeAIObservabilityEval;
using Azure.ResourceManager.ArizeAIObservabilityEval.Models;

// Get subscription and resource group
var subscriptionId = Environment.GetEnvironmentVariable("AZURE_SUBSCRIPTION_ID");
var subscription = await armClient.GetSubscriptionResource(
    SubscriptionResource.CreateResourceIdentifier(subscriptionId)).GetAsync();
var resourceGroup = await subscription.Value.GetResourceGroupAsync("my-resource-group");

// Get the organization collection
var collection = resourceGroup.Value.GetArizeAIObservabilityEvalOrganizations();

// Create organization data
var data = new ArizeAIObservabilityEvalOrganizationData(AzureLocation.EastUS)
{
    Properties = new ArizeAIObservabilityEvalOrganizationProperties
    {
        Marketplace = new ArizeAIObservabilityEvalMarketplaceDetails
        {
            SubscriptionId = "marketplace-subscription-id",
            OfferDetails = new ArizeAIObservabilityEvalOfferDetails
            {
                PublisherId = "arikimlabs1649082416596",
                OfferId = "arize-liftr-1",
                PlanId = "arize-liftr-1-plan",
                PlanName = "Arize AI Plan",
                TermUnit = "P1M",
                TermId = "term-id"
            }
        },
        User = new ArizeAIObservabilityEvalUserDetails
        {
            FirstName = "John",
            LastName = "Doe",
            EmailAddress = "john.doe@example.com"
        }
    },
    Tags = { ["environment"] = "production" }
};

// Create (long-running operation)
var operation = await collection.CreateOrUpdateAsync(
    WaitUntil.Completed,
    "my-arize-org",
    data);

var organization = operation.Value;
Console.WriteLine($"Created: {organization.Data.Name}");
```

### Get an Organization

```csharp
// Option 1: From collection
var org = await collection.GetAsync("my-arize-org");

// Option 2: Check if exists first
var exists = await collection.ExistsAsync("my-arize-org");
if (exists.Value)
{
    var org = await collection.GetAsync("my-arize-org");
}

// Option 3: GetIfExists (returns null if not found)
var response = await collection.GetIfExistsAsync("my-arize-org");
if (response.HasValue)
{
    var org = response.Value;
}
```

### List Organizations

```csharp
// List in resource group
await foreach (var org in collection.GetAllAsync())
{
    Console.WriteLine($"Org: {org.Data.Name}, State: {org.Data.Properties?.ProvisioningState}");
}

// List in subscription
await foreach (var org in subscription.Value.GetArizeAIObservabilityEvalOrganizationsAsync())
{
    Console.WriteLine($"Org: {org.Data.Name}");
}
```

### Update an Organization

```csharp
// Update tags
var org = await collection.GetAsync("my-arize-org");
var updateData = new ArizeAIObservabilityEvalOrganizationPatch
{
    Tags = { ["environment"] = "staging", ["team"] = "ml-ops" }
};
var updated = await org.Value.UpdateAsync(updateData);
```

### Delete an Organization

```csharp
var org = await collection.GetAsync("my-arize-org");
await org.Value.DeleteAsync(WaitUntil.Completed);
```

## Key Types

| Type | Purpose |
|------|---------|
| `ArizeAIObservabilityEvalOrganizationResource` | Main ARM resource for Arize organizations |
| `ArizeAIObservabilityEvalOrganizationCollection` | Collection for CRUD operations |
| `ArizeAIObservabilityEvalOrganizationData` | Resource data model |
| `ArizeAIObservabilityEvalOrganizationProperties` | Organization properties |
| `ArizeAIObservabilityEvalMarketplaceDetails` | Azure Marketplace subscription info |
| `ArizeAIObservabilityEvalOfferDetails` | Marketplace offer configuration |
| `ArizeAIObservabilityEvalUserDetails` | User contact information |
| `ArizeAIObservabilityEvalOrganizationPatch` | Patch model for updates |
| `ArizeAIObservabilityEvalSingleSignOnPropertiesV2` | SSO configuration |

## Enums

| Enum | Values |
|------|--------|
| `ArizeAIObservabilityEvalOfferProvisioningState` | `Succeeded`, `Failed`, `Canceled`, `Provisioning`, `Updating`, `Deleting`, `Accepted` |
| `ArizeAIObservabilityEvalMarketplaceSubscriptionStatus` | `PendingFulfillmentStart`, `Subscribed`, `Suspended`, `Unsubscribed` |
| `ArizeAIObservabilityEvalSingleSignOnState` | `Initial`, `Enable`, `Disable` |
| `ArizeAIObservabilityEvalSingleSignOnType` | `Saml`, `OpenId` |

## Best Practices

1. **Use async methods** — All operations support async/await
2. **Handle long-running operations** — Use `WaitUntil.Completed` or poll manually
3. **Use GetIfExistsAsync** — Avoid exceptions for conditional logic
4. **Implement retry policies** — Configure via `ArmClientOptions`
5. **Use resource identifiers** — For direct resource access without listing
6. **Close clients properly** — Use `using` statements or dispose explicitly

## Error Handling

```csharp
try
{
    var org = await collection.GetAsync("my-arize-org");
}
catch (Azure.RequestFailedException ex) when (ex.Status == 404)
{
    Console.WriteLine("Organization not found");
}
catch (Azure.RequestFailedException ex)
{
    Console.WriteLine($"Azure error: {ex.Message}");
}
```

## Direct Resource Access

```csharp
// Access resource directly by ID (without listing)
var resourceId = ArizeAIObservabilityEvalOrganizationResource.CreateResourceIdentifier(
    subscriptionId,
    "my-resource-group",
    "my-arize-org");

var org = armClient.GetArizeAIObservabilityEvalOrganizationResource(resourceId);
var data = await org.GetAsync();
```

## Links

- [NuGet Package](https://www.nuget.org/packages/Azure.ResourceManager.ArizeAIObservabilityEval)
- [Azure SDK for .NET](https://github.com/Azure/azure-sdk-for-net)
- [Arize AI](https://arize.com/)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
