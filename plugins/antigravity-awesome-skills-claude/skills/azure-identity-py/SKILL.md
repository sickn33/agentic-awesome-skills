---
name: azure-identity-py
description: Azure Identity SDK for Python authentication. Use for DefaultAzureCredential, managed identity, service principals, and token caching.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure Identity SDK for Python

Authentication library for Azure SDK clients using Microsoft Entra ID (formerly Azure AD).

## Installation

```bash
pip install azure-identity
```

## Environment Variables

```bash
# Service Principal (for production/CI)
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>

# User-assigned Managed Identity (optional)
AZURE_CLIENT_ID=<managed-identity-client-id>
```

## DefaultAzureCredential

The recommended credential for most scenarios. Tries multiple authentication methods in order:

```python
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

# Works in local dev AND production without code changes
credential = DefaultAzureCredential()

client = BlobServiceClient(
    account_url="https://<account>.blob.core.windows.net",
    credential=credential
)
```

### Credential Chain Order

| Order | Credential | Environment |
|-------|-----------|-------------|
| 1 | EnvironmentCredential | CI/CD, containers |
| 2 | WorkloadIdentityCredential | Kubernetes |
| 3 | ManagedIdentityCredential | Azure VMs, App Service, Functions |
| 4 | SharedTokenCacheCredential | Windows only |
| 5 | VisualStudioCodeCredential | VS Code with Azure extension |
| 6 | AzureCliCredential | `az login` |
| 7 | AzurePowerShellCredential | `Connect-AzAccount` |
| 8 | AzureDeveloperCliCredential | `azd auth login` |

### Customizing DefaultAzureCredential

```python
# Exclude credentials you don't need
credential = DefaultAzureCredential(
    exclude_environment_credential=True,
    exclude_shared_token_cache_credential=True,
    managed_identity_client_id="<user-assigned-mi-client-id>"  # For user-assigned MI
)

# Enable interactive browser (disabled by default)
credential = DefaultAzureCredential(
    exclude_interactive_browser_credential=False
)
```

## Specific Credential Types

### ManagedIdentityCredential

For Azure-hosted resources (VMs, App Service, Functions, AKS):

```python
from azure.identity import ManagedIdentityCredential

# System-assigned managed identity
credential = ManagedIdentityCredential()

# User-assigned managed identity
credential = ManagedIdentityCredential(
    client_id="<user-assigned-mi-client-id>"
)
```

### ClientSecretCredential

For service principal with secret:

```python
from azure.identity import ClientSecretCredential

credential = ClientSecretCredential(
    tenant_id=os.environ["AZURE_TENANT_ID"],
    client_id=os.environ["AZURE_CLIENT_ID"],
    client_secret=os.environ["AZURE_CLIENT_SECRET"]
)
```

### AzureCliCredential

Uses the account from `az login`:

```python
from azure.identity import AzureCliCredential

credential = AzureCliCredential()
```

### ChainedTokenCredential

Custom credential chain:

```python
from azure.identity import (
    ChainedTokenCredential,
    ManagedIdentityCredential,
    AzureCliCredential
)

# Try managed identity first, fall back to CLI
credential = ChainedTokenCredential(
    ManagedIdentityCredential(client_id="<user-assigned-mi-client-id>"),
    AzureCliCredential()
)
```

## Credential Types Table

| Credential | Use Case | Auth Method |
|------------|----------|-------------|
| `DefaultAzureCredential` | Most scenarios | Auto-detect |
| `ManagedIdentityCredential` | Azure-hosted apps | Managed Identity |
| `ClientSecretCredential` | Service principal | Client secret |
| `ClientCertificateCredential` | Service principal | Certificate |
| `AzureCliCredential` | Local development | Azure CLI |
| `AzureDeveloperCliCredential` | Local development | Azure Developer CLI |
| `InteractiveBrowserCredential` | User sign-in | Browser OAuth |
| `DeviceCodeCredential` | Headless/SSH | Device code flow |

## Getting Tokens Directly

```python
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()

# Get token for a specific scope
token = credential.get_token("https://management.azure.com/.default")
print(f"Token expires: {token.expires_on}")

# For Azure Database for PostgreSQL
token = credential.get_token("https://ossrdbms-aad.database.windows.net/.default")
```

## Async Client

```python
from azure.identity.aio import DefaultAzureCredential
from azure.storage.blob.aio import BlobServiceClient

async def main():
    credential = DefaultAzureCredential()
    
    async with BlobServiceClient(
        account_url="https://<account>.blob.core.windows.net",
        credential=credential
    ) as client:
        # ... async operations
        pass
    
    await credential.close()
```

## Best Practices

1. **Use DefaultAzureCredential** for code that runs locally and in Azure
2. **Never hardcode credentials** — use environment variables or managed identity
3. **Prefer managed identity** in production Azure deployments
4. **Use ChainedTokenCredential** when you need a custom credential order
5. **Close async credentials** explicitly or use context managers
6. **Set AZURE_CLIENT_ID** for user-assigned managed identities
7. **Exclude unused credentials** to speed up authentication

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
