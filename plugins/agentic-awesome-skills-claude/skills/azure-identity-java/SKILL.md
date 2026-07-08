---
name: azure-identity-java
description: "Authenticate Java applications with Azure services using Microsoft Entra ID (Azure AD)."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Azure Identity (Java)

Authenticate Java applications with Azure services using Microsoft Entra ID (Azure AD).

## Installation

```xml
<dependency>
    <groupId>com.azure</groupId>
    <artifactId>azure-identity</artifactId>
    <version>1.15.0</version>
</dependency>
```

## Key Concepts

| Credential | Use Case |
|------------|----------|
| `DefaultAzureCredential` | **Recommended** - Works in dev and production |
| `ManagedIdentityCredential` | Azure-hosted apps (App Service, Functions, VMs) |
| `EnvironmentCredential` | CI/CD pipelines with env vars |
| `ClientSecretCredential` | Service principals with secret |
| `ClientCertificateCredential` | Service principals with certificate |
| `AzureCliCredential` | Local dev using `az login` |
| `InteractiveBrowserCredential` | Interactive login flow |
| `DeviceCodeCredential` | Headless device authentication |

## DefaultAzureCredential (Recommended)

The `DefaultAzureCredential` tries multiple authentication methods in order:

1. Environment variables
2. Workload Identity
3. Managed Identity
4. Azure CLI
5. Azure PowerShell
6. Azure Developer CLI

```java
import com.azure.identity.DefaultAzureCredential;
import com.azure.identity.DefaultAzureCredentialBuilder;

// Simple usage
DefaultAzureCredential credential = new DefaultAzureCredentialBuilder().build();

// Use with any Azure client
BlobServiceClient blobClient = new BlobServiceClientBuilder()
    .endpoint("https://<storage-account>.blob.core.windows.net")
    .credential(credential)
    .buildClient();

KeyClient keyClient = new KeyClientBuilder()
    .vaultUrl("https://<vault-name>.vault.azure.net")
    .credential(credential)
    .buildClient();
```

### Configure DefaultAzureCredential

```java
DefaultAzureCredential credential = new DefaultAzureCredentialBuilder()
    .managedIdentityClientId("<user-assigned-identity-client-id>")  // For user-assigned MI
    .tenantId("<tenant-id>")                                        // Limit to specific tenant
    .excludeEnvironmentCredential()                                 // Skip env vars
    .excludeAzureCliCredential()                                    // Skip Azure CLI
    .build();
```

## Managed Identity

For Azure-hosted applications (App Service, Functions, AKS, VMs).

```java
import com.azure.identity.ManagedIdentityCredential;
import com.azure.identity.ManagedIdentityCredentialBuilder;

// System-assigned managed identity
ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder()
    .build();

// User-assigned managed identity (by client ID)
ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder()
    .clientId("<user-assigned-client-id>")
    .build();

// User-assigned managed identity (by resource ID)
ManagedIdentityCredential credential = new ManagedIdentityCredentialBuilder()
    .resourceId("/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.ManagedIdentity/userAssignedIdentities/<name>")
    .build();
```

## Service Principal with Secret

```java
import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;

ClientSecretCredential credential = new ClientSecretCredentialBuilder()
    .tenantId("<tenant-id>")
    .clientId("<client-id>")
    .clientSecret("<client-secret>")
    .build();
```

## Service Principal with Certificate

```java
import com.azure.identity.ClientCertificateCredential;
import com.azure.identity.ClientCertificateCredentialBuilder;

// From PEM file
ClientCertificateCredential credential = new ClientCertificateCredentialBuilder()
    .tenantId("<tenant-id>")
    .clientId("<client-id>")
    .pemCertificate("<path-to-cert.pem>")
    .build();

// From PFX file with password
ClientCertificateCredential credential = new ClientCertificateCredentialBuilder()
    .tenantId("<tenant-id>")
    .clientId("<client-id>")
    .pfxCertificate("<path-to-cert.pfx>", "<pfx-password>")
    .build();

// Send certificate chain for SNI
ClientCertificateCredential credential = new ClientCertificateCredentialBuilder()
    .tenantId("<tenant-id>")
    .clientId("<client-id>")
    .pemCertificate("<path-to-cert.pem>")
    .sendCertificateChain(true)
    .build();
```

## Environment Credential

Reads credentials from environment variables.

```java
import com.azure.identity.EnvironmentCredential;
import com.azure.identity.EnvironmentCredentialBuilder;

EnvironmentCredential credential = new EnvironmentCredentialBuilder().build();
```

### Required Environment Variables

**For service principal with secret:**
```bash
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>
```

**For service principal with certificate:**
```bash
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_CERTIFICATE_PATH=/path/to/cert.pem
AZURE_CLIENT_CERTIFICATE_PASSWORD=<optional-password>
```

**For username/password:**
```bash
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_USERNAME=<username>
AZURE_PASSWORD=<password>
```

## Azure CLI Credential

For local development using `az login`.

```java
import com.azure.identity.AzureCliCredential;
import com.azure.identity.AzureCliCredentialBuilder;

AzureCliCredential credential = new AzureCliCredentialBuilder()
    .tenantId("<tenant-id>")  // Optional: specific tenant
    .build();
```

## Interactive Browser

For desktop applications requiring user login.

```java
import com.azure.identity.InteractiveBrowserCredential;
import com.azure.identity.InteractiveBrowserCredentialBuilder;

InteractiveBrowserCredential credential = new InteractiveBrowserCredentialBuilder()
    .clientId("<client-id>")
    .redirectUrl("http://localhost:8080")  // Must match app registration
    .build();
```

## Device Code

For headless devices (IoT, CLI tools).

```java
import com.azure.identity.DeviceCodeCredential;
import com.azure.identity.DeviceCodeCredentialBuilder;

DeviceCodeCredential credential = new DeviceCodeCredentialBuilder()
    .clientId("<client-id>")
    .challengeConsumer(challenge -> {
        // Display to user
        System.out.println(challenge.getMessage());
    })
    .build();
```

## Chained Credential

Create custom authentication chains.

```java
import com.azure.identity.ChainedTokenCredential;
import com.azure.identity.ChainedTokenCredentialBuilder;

ChainedTokenCredential credential = new ChainedTokenCredentialBuilder()
    .addFirst(new ManagedIdentityCredentialBuilder().build())
    .addLast(new AzureCliCredentialBuilder().build())
    .build();
```

## Workload Identity (AKS)

For Azure Kubernetes Service with workload identity.

```java
import com.azure.identity.WorkloadIdentityCredential;
import com.azure.identity.WorkloadIdentityCredentialBuilder;

// Reads from AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_FEDERATED_TOKEN_FILE
WorkloadIdentityCredential credential = new WorkloadIdentityCredentialBuilder().build();

// Or explicit configuration
WorkloadIdentityCredential credential = new WorkloadIdentityCredentialBuilder()
    .tenantId("<tenant-id>")
    .clientId("<client-id>")
    .tokenFilePath("/var/run/secrets/azure/tokens/azure-identity-token")
    .build();
```

## Token Caching

Enable persistent token caching for better performance.

```java
// Enable token caching (in-memory by default)
DefaultAzureCredential credential = new DefaultAzureCredentialBuilder()
    .enableAccountIdentifierLogging()
    .build();

// With shared token cache (for multi-credential scenarios)
SharedTokenCacheCredential credential = new SharedTokenCacheCredentialBuilder()
    .clientId("<client-id>")
    .build();
```

## Sovereign Clouds

```java
import com.azure.identity.AzureAuthorityHosts;

// Azure Government
DefaultAzureCredential govCredential = new DefaultAzureCredentialBuilder()
    .authorityHost(AzureAuthorityHosts.AZURE_GOVERNMENT)
    .build();

// Azure China
DefaultAzureCredential chinaCredential = new DefaultAzureCredentialBuilder()
    .authorityHost(AzureAuthorityHosts.AZURE_CHINA)
    .build();
```

## Error Handling

```java
import com.azure.identity.CredentialUnavailableException;
import com.azure.core.exception.ClientAuthenticationException;

try {
    DefaultAzureCredential credential = new DefaultAzureCredentialBuilder().build();
    AccessToken token = credential.getToken(new TokenRequestContext()
        .addScopes("https://management.azure.com/.default"));
} catch (CredentialUnavailableException e) {
    // No credential could authenticate
    System.out.println("Authentication failed: " + e.getMessage());
} catch (ClientAuthenticationException e) {
    // Authentication error (wrong credentials, expired, etc.)
    System.out.println("Auth error: " + e.getMessage());
}
```

## Logging

Enable authentication logging for debugging.

```java
// Via environment variable
// AZURE_LOG_LEVEL=verbose

// Or programmatically
DefaultAzureCredential credential = new DefaultAzureCredentialBuilder()
    .enableAccountIdentifierLogging()  // Log account info
    .build();
```

## Environment Variables

```bash
# DefaultAzureCredential configuration
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<client-secret>

# Managed Identity
AZURE_CLIENT_ID=<user-assigned-mi-client-id>

# Workload Identity (AKS)
AZURE_FEDERATED_TOKEN_FILE=/var/run/secrets/azure/tokens/azure-identity-token

# Logging
AZURE_LOG_LEVEL=verbose

# Authority host
AZURE_AUTHORITY_HOST=https://login.microsoftonline.com/
```

## Best Practices

1. **Use DefaultAzureCredential** - Works seamlessly from dev to production
2. **Managed Identity in Production** - No secrets to manage, automatic rotation
3. **Azure CLI for Local Dev** - Run `az login` before running your app
4. **Least Privilege** - Grant only required permissions to service principals
5. **Token Caching** - Enabled by default, reduces auth round-trips
6. **Environment Variables** - Use for CI/CD, not hardcoded secrets

## Credential Selection Matrix

| Environment | Recommended Credential |
|-------------|----------------------|
| Local Development | `DefaultAzureCredential` (uses Azure CLI) |
| Azure App Service | `DefaultAzureCredential` (uses Managed Identity) |
| Azure Functions | `DefaultAzureCredential` (uses Managed Identity) |
| Azure Kubernetes Service | `WorkloadIdentityCredential` |
| Azure VMs | `DefaultAzureCredential` (uses Managed Identity) |
| CI/CD Pipeline | `EnvironmentCredential` |
| Desktop App | `InteractiveBrowserCredential` |
| CLI Tool | `DeviceCodeCredential` |

## Trigger Phrases

- "Azure authentication Java", "DefaultAzureCredential Java"
- "managed identity Java", "service principal Java"
- "Azure login Java", "Azure credentials Java"
- "AZURE_CLIENT_ID", "AZURE_TENANT_ID"

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
