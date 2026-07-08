---
name: azure-mgmt-weightsandbiases-dotnet
description: Azure Weights & Biases SDK for .NET. ML experiment tracking and model management via Azure Marketplace. Use for creating W&B instances, managing SSO, marketplace integration, and ML observability.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.WeightsAndBiases (.NET)

Azure Resource Manager SDK for deploying and managing Weights & Biases ML experiment tracking instances via Azure Marketplace.

## Installation

```bash
dotnet add package Azure.ResourceManager.WeightsAndBiases --prerelease
dotnet add package Azure.Identity
```

**Current Version**: v1.0.0-beta.1 (preview)  
**API Version**: 2024-09-18-preview

## Environment Variables

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=<your-resource-group>
AZURE_WANDB_INSTANCE_NAME=<your-wandb-instance>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.WeightsAndBiases;

ArmClient client = new ArmClient(new DefaultAzureCredential());
```

## Resource Hierarchy

```
Subscription
└── ResourceGroup
    └── WeightsAndBiasesInstance    # W&B deployment from Azure Marketplace
        ├── Properties
        │   ├── Marketplace          # Offer details, plan, publisher
        │   ├── User                 # Admin user info
        │   ├── PartnerProperties    # W&B-specific config (region, subdomain)
        │   └── SingleSignOnPropertiesV2  # Entra ID SSO configuration
        └── Identity                 # Managed identity (optional)
```

## Core Workflows

### 1. Create Weights & Biases Instance

```csharp
using Azure.ResourceManager.WeightsAndBiases;
using Azure.ResourceManager.WeightsAndBiases.Models;

ResourceGroupResource resourceGroup = await client
    .GetDefaultSubscriptionAsync()
    .Result
    .GetResourceGroupAsync("my-resource-group");

WeightsAndBiasesInstanceCollection instances = resourceGroup.GetWeightsAndBiasesInstances();

WeightsAndBiasesInstanceData data = new WeightsAndBiasesInstanceData(AzureLocation.EastUS)
{
    Properties = new WeightsAndBiasesInstanceProperties
    {
        // Marketplace configuration
        Marketplace = new WeightsAndBiasesMarketplaceDetails
        {
            SubscriptionId = "<marketplace-subscription-id>",
            OfferDetails = new WeightsAndBiasesOfferDetails
            {
                PublisherId = "wandb",
                OfferId = "wandb-pay-as-you-go",
                PlanId = "wandb-payg",
                PlanName = "Pay As You Go",
                TermId = "monthly",
                TermUnit = "P1M"
            }
        },
        // Admin user
        User = new WeightsAndBiasesUserDetails
        {
            FirstName = "Admin",
            LastName = "User",
            EmailAddress = "admin@example.com",
            Upn = "admin@example.com"
        },
        // W&B-specific configuration
        PartnerProperties = new WeightsAndBiasesPartnerProperties
        {
            Region = WeightsAndBiasesRegion.EastUS,
            Subdomain = "my-company-wandb"
        }
    },
    // Optional: Enable managed identity
    Identity = new ManagedServiceIdentity(ManagedServiceIdentityType.SystemAssigned)
};

ArmOperation<WeightsAndBiasesInstanceResource> operation = await instances
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-wandb-instance", data);

WeightsAndBiasesInstanceResource instance = operation.Value;

Console.WriteLine($"W&B Instance created: {instance.Data.Name}");
Console.WriteLine($"Provisioning state: {instance.Data.Properties.ProvisioningState}");
```

### 2. Get Existing Instance

```csharp
WeightsAndBiasesInstanceResource instance = await resourceGroup
    .GetWeightsAndBiasesInstanceAsync("my-wandb-instance");

Console.WriteLine($"Instance: {instance.Data.Name}");
Console.WriteLine($"Location: {instance.Data.Location}");
Console.WriteLine($"State: {instance.Data.Properties.ProvisioningState}");

if (instance.Data.Properties.PartnerProperties != null)
{
    Console.WriteLine($"Region: {instance.Data.Properties.PartnerProperties.Region}");
    Console.WriteLine($"Subdomain: {instance.Data.Properties.PartnerProperties.Subdomain}");
}
```

### 3. List All Instances

```csharp
// List in resource group
await foreach (WeightsAndBiasesInstanceResource instance in 
    resourceGroup.GetWeightsAndBiasesInstances())
{
    Console.WriteLine($"Instance: {instance.Data.Name}");
    Console.WriteLine($"  Location: {instance.Data.Location}");
    Console.WriteLine($"  State: {instance.Data.Properties.ProvisioningState}");
}

// List in subscription
SubscriptionResource subscription = await client.GetDefaultSubscriptionAsync();
await foreach (WeightsAndBiasesInstanceResource instance in 
    subscription.GetWeightsAndBiasesInstancesAsync())
{
    Console.WriteLine($"{instance.Data.Name} in {instance.Id.ResourceGroupName}");
}
```

### 4. Configure Single Sign-On (SSO)

```csharp
WeightsAndBiasesInstanceResource instance = await resourceGroup
    .GetWeightsAndBiasesInstanceAsync("my-wandb-instance");

// Update with SSO configuration
WeightsAndBiasesInstanceData updateData = instance.Data;

updateData.Properties.SingleSignOnPropertiesV2 = new WeightsAndBiasSingleSignOnPropertiesV2
{
    Type = WeightsAndBiasSingleSignOnType.Saml,
    State = WeightsAndBiasSingleSignOnState.Enable,
    EnterpriseAppId = "<entra-app-id>",
    AadDomains = { "example.com", "contoso.com" }
};

ArmOperation<WeightsAndBiasesInstanceResource> operation = await resourceGroup
    .GetWeightsAndBiasesInstances()
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-wandb-instance", updateData);
```

### 5. Update Instance

```csharp
WeightsAndBiasesInstanceResource instance = await resourceGroup
    .GetWeightsAndBiasesInstanceAsync("my-wandb-instance");

// Update tags
WeightsAndBiasesInstancePatch patch = new WeightsAndBiasesInstancePatch
{
    Tags =
    {
        { "environment", "production" },
        { "team", "ml-platform" },
        { "costCenter", "CC-ML-001" }
    }
};

instance = await instance.UpdateAsync(patch);
Console.WriteLine($"Updated instance: {instance.Data.Name}");
```

### 6. Delete Instance

```csharp
WeightsAndBiasesInstanceResource instance = await resourceGroup
    .GetWeightsAndBiasesInstanceAsync("my-wandb-instance");

await instance.DeleteAsync(WaitUntil.Completed);
Console.WriteLine("Instance deleted");
```

### 7. Check Resource Name Availability

```csharp
// Check if name is available before creating
// (Implement via direct ARM call if SDK doesn't expose this)
try
{
    await resourceGroup.GetWeightsAndBiasesInstanceAsync("desired-name");
    Console.WriteLine("Name is already taken");
}
catch (RequestFailedException ex) when (ex.Status == 404)
{
    Console.WriteLine("Name is available");
}
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `WeightsAndBiasesInstanceResource` | W&B instance resource |
| `WeightsAndBiasesInstanceData` | Instance configuration data |
| `WeightsAndBiasesInstanceCollection` | Collection of instances |
| `WeightsAndBiasesInstanceProperties` | Instance properties |
| `WeightsAndBiasesMarketplaceDetails` | Marketplace subscription info |
| `WeightsAndBiasesOfferDetails` | Marketplace offer details |
| `WeightsAndBiasesUserDetails` | Admin user information |
| `WeightsAndBiasesPartnerProperties` | W&B-specific configuration |
| `WeightsAndBiasSingleSignOnPropertiesV2` | SSO configuration |
| `WeightsAndBiasesInstancePatch` | Patch for updates |
| `WeightsAndBiasesRegion` | Supported regions enum |

## Available Regions

| Region Enum | Azure Region |
|-------------|--------------|
| `WeightsAndBiasesRegion.EastUS` | East US |
| `WeightsAndBiasesRegion.CentralUS` | Central US |
| `WeightsAndBiasesRegion.WestUS` | West US |
| `WeightsAndBiasesRegion.WestEurope` | West Europe |
| `WeightsAndBiasesRegion.JapanEast` | Japan East |
| `WeightsAndBiasesRegion.KoreaCentral` | Korea Central |

## Marketplace Offer Details

For Azure Marketplace integration:

| Property | Value |
|----------|-------|
| Publisher ID | `wandb` |
| Offer ID | `wandb-pay-as-you-go` |
| Plan ID | `wandb-payg` (Pay As You Go) |

## Best Practices

1. **Use DefaultAzureCredential** — Supports multiple auth methods automatically
2. **Enable managed identity** — For secure access to other Azure resources
3. **Configure SSO** — Enable Entra ID SSO for enterprise security
4. **Tag resources** — Use tags for cost tracking and organization
5. **Check provisioning state** — Wait for `Succeeded` before using instance
6. **Use appropriate region** — Choose region closest to your compute
7. **Monitor with Azure** — Use Azure Monitor for resource health

## Error Handling

```csharp
using Azure;

try
{
    ArmOperation<WeightsAndBiasesInstanceResource> operation = await instances
        .CreateOrUpdateAsync(WaitUntil.Completed, "my-wandb", data);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("Instance already exists or name conflict");
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

## Integration with W&B SDK

After creating the Azure resource, use the W&B Python SDK for experiment tracking:

```python
# Install: pip install wandb
import wandb

# Login with your W&B API key from the Azure-deployed instance
wandb.login(host="https://my-company-wandb.wandb.ai")

# Initialize a run
run = wandb.init(project="my-ml-project")

# Log metrics
wandb.log({"accuracy": 0.95, "loss": 0.05})

# Finish run
run.finish()
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.ResourceManager.WeightsAndBiases` | W&B instance management (this SDK) | `dotnet add package Azure.ResourceManager.WeightsAndBiases --prerelease` |
| `Azure.ResourceManager.MachineLearning` | Azure ML workspaces | `dotnet add package Azure.ResourceManager.MachineLearning` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.ResourceManager.WeightsAndBiases |
| W&B Documentation | https://docs.wandb.ai/ |
| Azure Marketplace | https://azuremarketplace.microsoft.com/marketplace/apps/wandb.wandb-pay-as-you-go |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/weightsandbiases |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
