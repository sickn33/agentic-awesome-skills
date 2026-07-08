---
name: azure-mgmt-apicenter-dotnet
description: Azure API Center SDK for .NET. Centralized API inventory management with governance, versioning, and discovery.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.ResourceManager.ApiCenter (.NET)

Centralized API inventory and governance SDK for managing APIs across your organization.

## Installation

```bash
dotnet add package Azure.ResourceManager.ApiCenter
dotnet add package Azure.Identity
```

**Current Version**: v1.0.0 (GA)  
**API Version**: 2024-03-01

## Environment Variables

```bash
AZURE_SUBSCRIPTION_ID=<your-subscription-id>
AZURE_RESOURCE_GROUP=<your-resource-group>
AZURE_APICENTER_SERVICE_NAME=<your-apicenter-service>
```

## Authentication

```csharp
using Azure.Identity;
using Azure.ResourceManager;
using Azure.ResourceManager.ApiCenter;

ArmClient client = new ArmClient(new DefaultAzureCredential());
```

## Resource Hierarchy

```
Subscription
└── ResourceGroup
    └── ApiCenterService                    # API inventory service
        ├── Workspace                       # Logical grouping of APIs
        │   ├── Api                         # API definition
        │   │   └── ApiVersion              # Version of the API
        │   │       └── ApiDefinition       # OpenAPI/GraphQL/etc specification
        │   ├── Environment                 # Deployment target (dev/staging/prod)
        │   └── Deployment                  # API deployed to environment
        └── MetadataSchema                  # Custom metadata definitions
```

## Core Workflows

### 1. Create API Center Service

```csharp
using Azure.ResourceManager.ApiCenter;
using Azure.ResourceManager.ApiCenter.Models;

ResourceGroupResource resourceGroup = await client
    .GetDefaultSubscriptionAsync()
    .Result
    .GetResourceGroupAsync("my-resource-group");

ApiCenterServiceCollection services = resourceGroup.GetApiCenterServices();

ApiCenterServiceData data = new ApiCenterServiceData(AzureLocation.EastUS)
{
    Identity = new ManagedServiceIdentity(ManagedServiceIdentityType.SystemAssigned)
};

ArmOperation<ApiCenterServiceResource> operation = await services
    .CreateOrUpdateAsync(WaitUntil.Completed, "my-api-center", data);

ApiCenterServiceResource service = operation.Value;
```

### 2. Create Workspace

```csharp
ApiCenterWorkspaceCollection workspaces = service.GetApiCenterWorkspaces();

ApiCenterWorkspaceData workspaceData = new ApiCenterWorkspaceData
{
    Title = "Engineering APIs",
    Description = "APIs owned by the engineering team"
};

ArmOperation<ApiCenterWorkspaceResource> operation = await workspaces
    .CreateOrUpdateAsync(WaitUntil.Completed, "engineering", workspaceData);

ApiCenterWorkspaceResource workspace = operation.Value;
```

### 3. Create API

```csharp
ApiCenterApiCollection apis = workspace.GetApiCenterApis();

ApiCenterApiData apiData = new ApiCenterApiData
{
    Title = "Orders API",
    Description = "API for managing customer orders",
    Kind = ApiKind.Rest,
    LifecycleStage = ApiLifecycleStage.Production,
    TermsOfService = new ApiTermsOfService
    {
        Uri = new Uri("https://example.com/terms")
    },
    ExternalDocumentation = 
    {
        new ApiExternalDocumentation
        {
            Title = "Documentation",
            Uri = new Uri("https://docs.example.com/orders")
        }
    },
    Contacts =
    {
        new ApiContact
        {
            Name = "API Support",
            Email = "api-support@example.com"
        }
    }
};

// Add custom metadata
apiData.CustomProperties = BinaryData.FromObjectAsJson(new
{
    team = "orders-team",
    costCenter = "CC-1234"
});

ArmOperation<ApiCenterApiResource> operation = await apis
    .CreateOrUpdateAsync(WaitUntil.Completed, "orders-api", apiData);

ApiCenterApiResource api = operation.Value;
```

### 4. Create API Version

```csharp
ApiCenterApiVersionCollection versions = api.GetApiCenterApiVersions();

ApiCenterApiVersionData versionData = new ApiCenterApiVersionData
{
    Title = "v1.0.0",
    LifecycleStage = ApiLifecycleStage.Production
};

ArmOperation<ApiCenterApiVersionResource> operation = await versions
    .CreateOrUpdateAsync(WaitUntil.Completed, "v1-0-0", versionData);

ApiCenterApiVersionResource version = operation.Value;
```

### 5. Create API Definition (Upload OpenAPI Spec)

```csharp
ApiCenterApiDefinitionCollection definitions = version.GetApiCenterApiDefinitions();

ApiCenterApiDefinitionData definitionData = new ApiCenterApiDefinitionData
{
    Title = "OpenAPI Specification",
    Description = "Orders API OpenAPI 3.0 definition"
};

ArmOperation<ApiCenterApiDefinitionResource> operation = await definitions
    .CreateOrUpdateAsync(WaitUntil.Completed, "openapi", definitionData);

ApiCenterApiDefinitionResource definition = operation.Value;

// Import specification
string openApiSpec = await File.ReadAllTextAsync("orders-api.yaml");

ApiSpecImportContent importContent = new ApiSpecImportContent
{
    Format = ApiSpecImportSourceFormat.Inline,
    Value = openApiSpec,
    Specification = new ApiSpecImportSpecification
    {
        Name = "openapi",
        Version = "3.0.1"
    }
};

await definition.ImportSpecificationAsync(WaitUntil.Completed, importContent);
```

### 6. Export API Specification

```csharp
ApiCenterApiDefinitionResource definition = await client
    .GetApiCenterApiDefinitionResource(definitionResourceId)
    .GetAsync();

ArmOperation<ApiSpecExportResult> operation = await definition
    .ExportSpecificationAsync(WaitUntil.Completed);

ApiSpecExportResult result = operation.Value;

// result.Format - e.g., "inline"
// result.Value - the specification content
```

### 7. Create Environment

```csharp
ApiCenterEnvironmentCollection environments = workspace.GetApiCenterEnvironments();

ApiCenterEnvironmentData envData = new ApiCenterEnvironmentData
{
    Title = "Production",
    Description = "Production environment",
    Kind = ApiCenterEnvironmentKind.Production,
    Server = new ApiCenterEnvironmentServer
    {
        ManagementPortalUris = { new Uri("https://portal.azure.com") }
    },
    Onboarding = new EnvironmentOnboardingModel
    {
        Instructions = "Contact platform team for access",
        DeveloperPortalUris = { new Uri("https://developer.example.com") }
    }
};

ArmOperation<ApiCenterEnvironmentResource> operation = await environments
    .CreateOrUpdateAsync(WaitUntil.Completed, "production", envData);
```

### 8. Create Deployment

```csharp
ApiCenterDeploymentCollection deployments = workspace.GetApiCenterDeployments();

// Get environment resource ID
ResourceIdentifier envResourceId = ApiCenterEnvironmentResource.CreateResourceIdentifier(
    subscriptionId, resourceGroupName, serviceName, workspaceName, "production");

// Get API definition resource ID
ResourceIdentifier definitionResourceId = ApiCenterApiDefinitionResource.CreateResourceIdentifier(
    subscriptionId, resourceGroupName, serviceName, workspaceName, 
    "orders-api", "v1-0-0", "openapi");

ApiCenterDeploymentData deploymentData = new ApiCenterDeploymentData
{
    Title = "Orders API - Production",
    Description = "Production deployment of Orders API v1.0.0",
    EnvironmentId = envResourceId,
    DefinitionId = definitionResourceId,
    State = ApiCenterDeploymentState.Active,
    Server = new ApiCenterDeploymentServer
    {
        RuntimeUris = { new Uri("https://api.example.com/orders") }
    }
};

ArmOperation<ApiCenterDeploymentResource> operation = await deployments
    .CreateOrUpdateAsync(WaitUntil.Completed, "orders-api-prod", deploymentData);
```

### 9. Create Metadata Schema

```csharp
ApiCenterMetadataSchemaCollection schemas = service.GetApiCenterMetadataSchemas();

string jsonSchema = """
{
    "type": "object",
    "properties": {
        "team": {
            "type": "string",
            "title": "Owning Team"
        },
        "costCenter": {
            "type": "string",
            "title": "Cost Center"
        },
        "dataClassification": {
            "type": "string",
            "enum": ["public", "internal", "confidential"],
            "title": "Data Classification"
        }
    },
    "required": ["team"]
}
""";

ApiCenterMetadataSchemaData schemaData = new ApiCenterMetadataSchemaData
{
    Schema = jsonSchema,
    AssignedTo =
    {
        new MetadataAssignment
        {
            Entity = MetadataAssignmentEntity.Api,
            Required = true
        }
    }
};

ArmOperation<ApiCenterMetadataSchemaResource> operation = await schemas
    .CreateOrUpdateAsync(WaitUntil.Completed, "api-metadata", schemaData);
```

### 10. List and Search APIs

```csharp
// List all APIs in a workspace
ApiCenterWorkspaceResource workspace = await client
    .GetApiCenterWorkspaceResource(workspaceResourceId)
    .GetAsync();

await foreach (ApiCenterApiResource api in workspace.GetApiCenterApis())
{
    Console.WriteLine($"API: {api.Data.Title}");
    Console.WriteLine($"  Kind: {api.Data.Kind}");
    Console.WriteLine($"  Stage: {api.Data.LifecycleStage}");
    
    // List versions
    await foreach (ApiCenterApiVersionResource version in api.GetApiCenterApiVersions())
    {
        Console.WriteLine($"  Version: {version.Data.Title}");
    }
}

// List environments
await foreach (ApiCenterEnvironmentResource env in workspace.GetApiCenterEnvironments())
{
    Console.WriteLine($"Environment: {env.Data.Title} ({env.Data.Kind})");
}

// List deployments
await foreach (ApiCenterDeploymentResource deployment in workspace.GetApiCenterDeployments())
{
    Console.WriteLine($"Deployment: {deployment.Data.Title}");
    Console.WriteLine($"  State: {deployment.Data.State}");
}
```

## Key Types Reference

| Type | Purpose |
|------|---------|
| `ApiCenterServiceResource` | API Center service instance |
| `ApiCenterWorkspaceResource` | Logical grouping of APIs |
| `ApiCenterApiResource` | Individual API |
| `ApiCenterApiVersionResource` | Version of an API |
| `ApiCenterApiDefinitionResource` | API specification (OpenAPI, etc.) |
| `ApiCenterEnvironmentResource` | Deployment environment |
| `ApiCenterDeploymentResource` | API deployment to environment |
| `ApiCenterMetadataSchemaResource` | Custom metadata schema |
| `ApiKind` | rest, graphql, grpc, soap, webhook, websocket, mcp |
| `ApiLifecycleStage` | design, development, testing, preview, production, deprecated, retired |
| `ApiCenterEnvironmentKind` | development, testing, staging, production |
| `ApiCenterDeploymentState` | active, inactive |

## Best Practices

1. **Organize with workspaces** — Group APIs by team, domain, or product
2. **Use metadata schemas** — Define custom properties for governance
3. **Track lifecycle stages** — Keep API status current (design → production → deprecated)
4. **Document environments** — Include onboarding instructions and portal URIs
5. **Version consistently** — Use semantic versioning for API versions
6. **Import specifications** — Upload OpenAPI/GraphQL specs for discovery
7. **Link deployments** — Connect APIs to their runtime environments
8. **Use managed identity** — Enable SystemAssigned identity for secure integrations

## Error Handling

```csharp
using Azure;

try
{
    ArmOperation<ApiCenterApiResource> operation = await apis
        .CreateOrUpdateAsync(WaitUntil.Completed, "my-api", apiData);
}
catch (RequestFailedException ex) when (ex.Status == 409)
{
    Console.WriteLine("API already exists with conflicting configuration");
}
catch (RequestFailedException ex) when (ex.Status == 400)
{
    Console.WriteLine($"Invalid request: {ex.Message}");
}
catch (RequestFailedException ex)
{
    Console.WriteLine($"Azure error: {ex.Status} - {ex.Message}");
}
```

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.ResourceManager.ApiCenter` | API Center management (this SDK) | `dotnet add package Azure.ResourceManager.ApiCenter` |
| `Azure.ResourceManager.ApiManagement` | API gateway and policies | `dotnet add package Azure.ResourceManager.ApiManagement` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.ResourceManager.ApiCenter |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.resourcemanager.apicenter |
| Product Documentation | https://learn.microsoft.com/azure/api-center/ |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/apicenter/Azure.ResourceManager.ApiCenter |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
