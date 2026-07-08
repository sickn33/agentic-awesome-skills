---
name: azure-mgmt-mongodbatlas-dotnet
description: "Manage MongoDB Atlas Organizations as Azure ARM resources with unified billing through Azure Marketplace."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure.ResourceManager.MongoDBAtlas SDK

Manage MongoDB Atlas Organizations as Azure ARM resources with unified billing through Azure Marketplace.

## Package Information

| Property | Value |
|----------|-------|
| Package | `Azure.ResourceManager.MongoDBAtlas` |
| Version | 1.0.0 (GA) |
| API Version | 2025-06-01 |
| Resource Type | `MongoDB.Atlas/organizations` |
| NuGet | [Azure.ResourceManager.MongoDBAtlas](https://www.nuget.org/packages/Azure.ResourceManager.MongoDBAtlas) |

## Installation

```bash
dotnet add package Azure.ResourceManager.MongoDBAtlas
dotnet add package Azure.Identity
dotnet add package Azure.ResourceManager
```

## Important Scope Limitation

This SDK manages **MongoDB Atlas Organizations as Azure ARM resources** for marketplace integration. It does NOT directly manage:
- Atlas clusters
- Databases
- Collections
- Users/roles

For cluster management, use the MongoDB Atlas API directly after creating the organization.

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.MongoDBAtlas;
using Azure.ResourceManager.MongoDBAtlas.Models;

// Create ARM client with DefaultAzureCredential
var credential = new DefaultAzureCredential();
var armClient = new ArmClient(credential);
```

## Core Types

| Type | Purpose |
|------|---------|
| `MongoDBAtlasOrganizationResource` | ARM resource representing an Atlas organization |
| `MongoDBAtlasOrganizationCollection` | Collection of organizations in a resource group |
| `MongoDBAtlasOrganizationData` | Data model for organization resource |
| `MongoDBAtlasOrganizationProperties` | Organization-specific properties |
| `MongoDBAtlasMarketplaceDetails` | Azure Marketplace subscription details |
| `MongoDBAtlasOfferDetails` | Marketplace offer configuration |
| `MongoDBAtlasUserDetails` | User information for the organization |
| `MongoDBAtlasPartnerProperties` | MongoDB-specific properties (org name, ID) |

## Workflows

### Get Organization Collection

```csharp
// Get resource group
var subscription = await armClient.GetDefaultSubscriptionAsync();
var resourceGroup = await subscription.GetResourceGroupAsync("my-resource-group");

// Get organizations collection
MongoDBAtlasOrganizationCollection organizations = 
    resourceGroup.Value.GetMongoDBAtlasOrganizations();
```

### Create Organization

```csharp
var organizationName = "my-atlas-org";
var location = AzureLocation.EastUS2;

// Build organization data
var organizationData = new MongoDBAtlasOrganizationData(location)
{
    Properties = new MongoDBAtlasOrganizationProperties(
        marketplace: new MongoDBAtlasMarketplaceDetails(
            subscriptionId: "your-azure-subscription-id",
            offerDetails: new MongoDBAtlasOfferDetails(
                publisherId: "mongodb",
                offerId: "mongodb_atlas_azure_native_prod",
                planId: "private_plan",
                planName: "Pay as You Go (Free) (Private)",
                termUnit: "P1M",
                termId: "gmz7xq9ge3py"
            )
        ),
        user: new MongoDBAtlasUserDetails(
            emailAddress: "admin@example.com",
            upn: "admin@example.com"
        )
        {
            FirstName = "Admin",
            LastName = "User"
        }
    )
    {
        PartnerProperties = new MongoDBAtlasPartnerProperties
        {
            OrganizationName = organizationName
        }
    },
    Tags = { ["Environment"] = "Production" }
};

// Create the organization (long-running operation)
var operation = await organizations.CreateOrUpdateAsync(
    WaitUntil.Completed,
    organizationName,
    organizationData
);

MongoDBAtlasOrganizationResource organization = operation.Value;
Console.WriteLine($"Created: {organization.Id}");
```

### Get Existing Organization

```csharp
// Option 1: From collection
MongoDBAtlasOrganizationResource org = 
    await organizations.GetAsync("my-atlas-org");

// Option 2: From resource identifier
var resourceId = MongoDBAtlasOrganizationResource.CreateResourceIdentifier(
    subscriptionId: "subscription-id",
    resourceGroupName: "my-resource-group",
    organizationName: "my-atlas-org"
);
MongoDBAtlasOrganizationResource org2 = 
    armClient.GetMongoDBAtlasOrganizationResource(resourceId);
await org2.GetAsync(); // Fetch data
```

### List Organizations

```csharp
// List in resource group
await foreach (var org in organizations.GetAllAsync())
{
    Console.WriteLine($"Org: {org.Data.Name}");
    Console.WriteLine($"  Location: {org.Data.Location}");
    Console.WriteLine($"  State: {org.Data.Properties?.ProvisioningState}");
}

// List across subscription
await foreach (var org in subscription.GetMongoDBAtlasOrganizationsAsync())
{
    Console.WriteLine($"Org: {org.Data.Name} in {org.Data.Id}");
}
```

### Update Tags

```csharp
// Add a single tag
await organization.AddTagAsync("CostCenter", "12345");

// Replace all tags
await organization.SetTagsAsync(new Dictionary<string, string>
{
    ["Environment"] = "Production",
    ["Team"] = "Platform"
});

// Remove a tag
await organization.RemoveTagAsync("OldTag");
```

### Update Organization Properties

```csharp
var patch = new MongoDBAtlasOrganizationPatch
{
    Tags = { ["UpdatedAt"] = DateTime.UtcNow.ToString("o") },
    Properties = new MongoDBAtlasOrganizationUpdateProperties
    {
        // Update user details if needed
        User = new MongoDBAtlasUserDetails(
            emailAddress: "newadmin@example.com",
            upn: "newadmin@example.com"
        )
    }
};

var updateOperation = await organization.UpdateAsync(
    WaitUntil.Completed,
    patch
);
```

### Delete Organization

```csharp
// Delete (long-running operation)
await organization.DeleteAsync(WaitUntil.Completed);
```

## Model Properties Reference

### MongoDBAtlasOrganizationProperties

| Property | Type | Description |
|----------|------|-------------|
| `Marketplace` | `MongoDBAtlasMarketplaceDetails` | Required. Marketplace subscription details |
| `User` | `MongoDBAtlasUserDetails` | Required. Organization admin user |
| `PartnerProperties` | `MongoDBAtlasPartnerProperties` | MongoDB-specific properties |
| `ProvisioningState` | `MongoDBAtlasResourceProvisioningState` | Read-only. Current provisioning state |

### MongoDBAtlasMarketplaceDetails

| Property | Type | Description |
|----------|------|-------------|
| `SubscriptionId` | `string` | Required. Azure subscription ID for billing |
| `OfferDetails` | `MongoDBAtlasOfferDetails` | Required. Marketplace offer configuration |
| `SubscriptionStatus` | `MarketplaceSubscriptionStatus` | Read-only. Subscription status |

### MongoDBAtlasOfferDetails

| Property | Type | Description |
|----------|------|-------------|
| `PublisherId` | `string` | Required. Publisher ID (typically "mongodb") |
| `OfferId` | `string` | Required. Offer ID |
| `PlanId` | `string` | Required. Plan ID |
| `PlanName` | `string` | Required. Display name of the plan |
| `TermUnit` | `string` | Required. Billing term unit (e.g., "P1M") |
| `TermId` | `string` | Required. Term identifier |

### MongoDBAtlasUserDetails

| Property | Type | Description |
|----------|------|-------------|
| `EmailAddress` | `string` | Required. User email address |
| `Upn` | `string` | Required. User principal name |
| `FirstName` | `string` | Optional. User first name |
| `LastName` | `string` | Optional. User last name |

### MongoDBAtlasPartnerProperties

| Property | Type | Description |
|----------|------|-------------|
| `OrganizationName` | `string` | Name of the MongoDB Atlas organization |
| `OrganizationId` | `string` | Read-only. MongoDB Atlas organization ID |

## Provisioning States

| State | Description |
|-------|-------------|
| `Succeeded` | Resource provisioned successfully |
| `Failed` | Provisioning failed |
| `Canceled` | Provisioning was canceled |
| `Provisioning` | Resource is being provisioned |
| `Updating` | Resource is being updated |
| `Deleting` | Resource is being deleted |
| `Accepted` | Request accepted, provisioning starting |

## Marketplace Subscription Status

| Status | Description |
|--------|-------------|
| `PendingFulfillmentStart` | Subscription pending activation |
| `Subscribed` | Active subscription |
| `Suspended` | Subscription suspended |
| `Unsubscribed` | Subscription canceled |

## Best Practices

### Use Async Methods

```csharp
// Prefer async for all operations
var org = await organizations.GetAsync("my-org");
await org.Value.AddTagAsync("key", "value");
```

### Handle Long-Running Operations

```csharp
// Wait for completion
var operation = await organizations.CreateOrUpdateAsync(
    WaitUntil.Completed,  // Blocks until done
    name,
    data
);

// Or start and poll later
var operation = await organizations.CreateOrUpdateAsync(
    WaitUntil.Started,  // Returns immediately
    name,
    data
);

// Poll for completion
while (!operation.HasCompleted)
{
    await Task.Delay(TimeSpan.FromSeconds(5));
    await operation.UpdateStatusAsync();
}
```

### Check Provisioning State

```csharp
var org = await organizations.GetAsync("my-org");
if (org.Value.Data.Properties?.ProvisioningState == 
    MongoDBAtlasResourceProvisioningState.Succeeded)
{
    Console.WriteLine("Organization is ready");
}
```

### Use Resource Identifiers

```csharp
// Create identifier without API call
var resourceId = MongoDBAtlasOrganizationResource.CreateResourceIdentifier(
    subscriptionId,
    resourceGroupName,
    organizationName
);

// Get resource handle (no data yet)
var orgResource = armClient.GetMongoDBAtlasOrganizationResource(resourceId);

// Fetch data when needed
var response = await orgResource.GetAsync();
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ResourceNotFound` | Organization doesn't exist | Verify name and resource group |
| `AuthorizationFailed` | Insufficient permissions | Check RBAC roles on resource group |
| `InvalidParameter` | Missing required properties | Ensure all required fields are set |
| `MarketplaceError` | Marketplace subscription issue | Verify offer details and subscription |

## Related Resources

- [Microsoft Learn: MongoDB Atlas on Azure](https://learn.microsoft.com/en-us/azure/partner-solutions/mongodb-atlas/)
- [API Reference](https://learn.microsoft.com/en-us/dotnet/api/azure.resourcemanager.mongodbatlas)
- [Azure SDK for .NET](https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/mongodbatlas)

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
