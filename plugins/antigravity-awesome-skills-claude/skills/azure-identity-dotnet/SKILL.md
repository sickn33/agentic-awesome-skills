---
name: azure-identity-dotnet
description: Azure Identity SDK for .NET. Authentication library for Azure SDK clients using Microsoft Entra ID. Use for DefaultAzureCredential, managed identity, service principals, and developer credentials.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure.Identity (.NET)

Authentication library for Azure SDK clients using Microsoft Entra ID (formerly Azure AD).

## Installation

```bash
dotnet add package Azure.Identity

# For ASP.NET Core
dotnet add package Microsoft.Extensions.Azure

# For brokered authentication (Windows)
dotnet add package Azure.Identity.Broker
```

**Current Versions**: Stable v1.17.1, Preview v1.18.0-beta.2

## Environment Variables

### Service Principal with Secret
```bash
AZURE_CLIENT_ID=<application-client-id>
AZURE_TENANT_ID=<directory-tenant-id>
AZURE_CLIENT_SECRET=<client-secret-value>
```

### Service Principal with Certificate
```bash
AZURE_CLIENT_ID=<application-client-id>
AZURE_TENANT_ID=<directory-tenant-id>
AZURE_CLIENT_CERTIFICATE_PATH=<path-to-pfx-or-pem>
AZURE_CLIENT_CERTIFICATE_PASSWORD=<certificate-password>  # Optional
```

### Managed Identity
```bash
AZURE_CLIENT_ID=<user-assigned-managed-identity-client-id>  # Only for user-assigned
```

## DefaultAzureCredential

The recommended credential for most scenarios. Tries multiple authentication methods in order:

| Order | Credential | Enabled by Default |
|-------|------------|-------------------|
| 1 | EnvironmentCredential | Yes |
| 2 | WorkloadIdentityCredential | Yes |
| 3 | ManagedIdentityCredential | Yes |
| 4 | VisualStudioCredential | Yes |
| 5 | VisualStudioCodeCredential | Yes |
| 6 | AzureCliCredential | Yes |
| 7 | AzurePowerShellCredential | Yes |
| 8 | AzureDeveloperCliCredential | Yes |
| 9 | InteractiveBrowserCredential | **No** |

### Basic Usage

```csharp
using Azure.Identity;
using Azure.Storage.Blobs;

var credential = new DefaultAzureCredential();
var blobClient = new BlobServiceClient(
    new Uri("https://myaccount.blob.core.windows.net"),
    credential);
```

### ASP.NET Core with Dependency Injection

```csharp
using Azure.Identity;
using Microsoft.Extensions.Azure;

builder.Services.AddAzureClients(clientBuilder =>
{
    clientBuilder.AddBlobServiceClient(
        new Uri("https://myaccount.blob.core.windows.net"));
    clientBuilder.AddSecretClient(
        new Uri("https://myvault.vault.azure.net"));
    
    // Uses DefaultAzureCredential by default
    clientBuilder.UseCredential(new DefaultAzureCredential());
});
```

### Customizing DefaultAzureCredential

```csharp
var credential = new DefaultAzureCredential(
    new DefaultAzureCredentialOptions
    {
        ExcludeEnvironmentCredential = true,
        ExcludeManagedIdentityCredential = false,
        ExcludeVisualStudioCredential = false,
        ExcludeAzureCliCredential = false,
        ExcludeInteractiveBrowserCredential = false, // Enable interactive
        TenantId = "<tenant-id>",
        ManagedIdentityClientId = "<user-assigned-mi-client-id>"
    });
```

## Credential Types

### ManagedIdentityCredential (Production)

```csharp
// System-assigned managed identity
var credential = new ManagedIdentityCredential(ManagedIdentityId.SystemAssigned);

// User-assigned by client ID
var credential = new ManagedIdentityCredential(
    ManagedIdentityId.FromUserAssignedClientId("<client-id>"));

// User-assigned by resource ID
var credential = new ManagedIdentityCredential(
    ManagedIdentityId.FromUserAssignedResourceId("<resource-id>"));
```

### ClientSecretCredential

```csharp
var credential = new ClientSecretCredential(
    tenantId: "<tenant-id>",
    clientId: "<client-id>",
    clientSecret: "<client-secret>");

var client = new SecretClient(
    new Uri("https://myvault.vault.azure.net"),
    credential);
```

### ClientCertificateCredential

```csharp
var certificate = X509CertificateLoader.LoadCertificateFromFile("MyCertificate.pfx");
var credential = new ClientCertificateCredential(
    tenantId: "<tenant-id>",
    clientId: "<client-id>",
    certificate);
```

### ChainedTokenCredential (Custom Chain)

```csharp
var credential = new ChainedTokenCredential(
    new ManagedIdentityCredential(),
    new AzureCliCredential());

var client = new SecretClient(
    new Uri("https://myvault.vault.azure.net"),
    credential);
```

### Developer Credentials

```csharp
// Azure CLI
var credential = new AzureCliCredential();

// Azure PowerShell
var credential = new AzurePowerShellCredential();

// Azure Developer CLI (azd)
var credential = new AzureDeveloperCliCredential();

// Visual Studio
var credential = new VisualStudioCredential();

// Interactive Browser
var credential = new InteractiveBrowserCredential();
```

## Environment-Based Configuration

```csharp
// Production vs Development
TokenCredential credential = builder.Environment.IsProduction()
    ? new ManagedIdentityCredential("<client-id>")
    : new DefaultAzureCredential();
```

## Sovereign Clouds

```csharp
var credential = new DefaultAzureCredential(
    new DefaultAzureCredentialOptions
    {
        AuthorityHost = AzureAuthorityHosts.AzureGovernment
    });

// Available authority hosts:
// AzureAuthorityHosts.AzurePublicCloud (default)
// AzureAuthorityHosts.AzureGovernment
// AzureAuthorityHosts.AzureChina
// AzureAuthorityHosts.AzureGermany
```

## Credential Types Reference

| Category | Credential | Purpose |
|----------|------------|---------|
| **Chains** | `DefaultAzureCredential` | Preconfigured chain for dev-to-prod |
| | `ChainedTokenCredential` | Custom credential chain |
| **Azure-Hosted** | `ManagedIdentityCredential` | Azure managed identity |
| | `WorkloadIdentityCredential` | Kubernetes workload identity |
| | `EnvironmentCredential` | Environment variables |
| **Service Principal** | `ClientSecretCredential` | Client ID + secret |
| | `ClientCertificateCredential` | Client ID + certificate |
| | `ClientAssertionCredential` | Signed client assertion |
| **User** | `InteractiveBrowserCredential` | Browser-based auth |
| | `DeviceCodeCredential` | Device code flow |
| | `OnBehalfOfCredential` | Delegated identity |
| **Developer** | `AzureCliCredential` | Azure CLI |
| | `AzurePowerShellCredential` | Azure PowerShell |
| | `AzureDeveloperCliCredential` | Azure Developer CLI |
| | `VisualStudioCredential` | Visual Studio |

## Best Practices

### 1. Use Deterministic Credentials in Production

```csharp
// Development
var devCredential = new DefaultAzureCredential();

// Production - use specific credential
var prodCredential = new ManagedIdentityCredential("<client-id>");
```

### 2. Reuse Credential Instances

```csharp
// Good: Single credential instance shared across clients
var credential = new DefaultAzureCredential();
var blobClient = new BlobServiceClient(blobUri, credential);
var secretClient = new SecretClient(vaultUri, credential);
```

### 3. Configure Retry Policies

```csharp
var options = new ManagedIdentityCredentialOptions(
    ManagedIdentityId.FromUserAssignedClientId(clientId))
{
    Retry =
    {
        MaxRetries = 3,
        Delay = TimeSpan.FromSeconds(0.5),
    }
};
var credential = new ManagedIdentityCredential(options);
```

### 4. Enable Logging for Debugging

```csharp
using Azure.Core.Diagnostics;

using AzureEventSourceListener listener = new((args, message) =>
{
    if (args is { EventSource.Name: "Azure-Identity" })
    {
        Console.WriteLine(message);
    }
}, EventLevel.LogAlways);
```

## Error Handling

```csharp
using Azure.Identity;
using Azure.Security.KeyVault.Secrets;

var client = new SecretClient(
    new Uri("https://myvault.vault.azure.net"),
    new DefaultAzureCredential());

try
{
    KeyVaultSecret secret = await client.GetSecretAsync("secret1");
}
catch (AuthenticationFailedException e)
{
    Console.WriteLine($"Authentication Failed: {e.Message}");
}
catch (CredentialUnavailableException e)
{
    Console.WriteLine($"Credential Unavailable: {e.Message}");
}
```

## Key Exceptions

| Exception | Description |
|-----------|-------------|
| `AuthenticationFailedException` | Base exception for authentication errors |
| `CredentialUnavailableException` | Credential cannot authenticate in current environment |
| `AuthenticationRequiredException` | Interactive authentication is required |

## Managed Identity Support

Supported Azure services:
- Azure App Service and Azure Functions
- Azure Arc
- Azure Cloud Shell
- Azure Kubernetes Service (AKS)
- Azure Service Fabric
- Azure Virtual Machines
- Azure Virtual Machine Scale Sets

## Thread Safety

All credential implementations are thread-safe. A single credential instance can be safely shared across multiple clients and threads.

## Related SDKs

| SDK | Purpose | Install |
|-----|---------|---------|
| `Azure.Identity` | Authentication (this SDK) | `dotnet add package Azure.Identity` |
| `Microsoft.Extensions.Azure` | DI integration | `dotnet add package Microsoft.Extensions.Azure` |
| `Azure.Identity.Broker` | Brokered auth (Windows) | `dotnet add package Azure.Identity.Broker` |

## Reference Links

| Resource | URL |
|----------|-----|
| NuGet Package | https://www.nuget.org/packages/Azure.Identity |
| API Reference | https://learn.microsoft.com/dotnet/api/azure.identity |
| Credential Chains | https://learn.microsoft.com/dotnet/azure/sdk/authentication/credential-chains |
| Best Practices | https://learn.microsoft.com/dotnet/azure/sdk/authentication/best-practices |
| GitHub Source | https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/identity/Azure.Identity |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
