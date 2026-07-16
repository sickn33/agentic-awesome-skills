---
name: azd-deployment
description: "Deploy containerized frontend + backend applications to Azure Container Apps with remote builds, managed identity, and idempotent infrastructure."
risk: critical
source: community
date_added: "2026-02-27"
---

# Azure Developer CLI (azd) Container Apps Deployment

Deploy containerized frontend + backend applications to Azure Container Apps with remote builds, managed identity, and idempotent infrastructure.

## Quick Start

```bash
# Initialize and deploy
azd auth login
azd init                    # Creates azure.yaml and .azure/ folder
azd env new <env-name>      # Create environment (dev, staging, prod)
azd up                      # Provision infra + build + deploy
```

## Core File Structure

```
project/
├── azure.yaml              # azd service definitions + hooks
├── infra/
│   ├── main.bicep          # Root infrastructure module
│   ├── main.parameters.json # Parameter injection from env vars
│   └── modules/
│       ├── container-apps-environment.bicep
│       └── container-app.bicep
├── .azure/
│   ├── config.json         # Default environment pointer
│   └── <env-name>/
│       ├── .env            # Environment-specific values (azd-managed)
│       └── config.json     # Environment metadata
└── src/
    ├── frontend/Dockerfile
    └── backend/Dockerfile
```

## azure.yaml Configuration

### Minimal Configuration

```yaml
name: azd-deployment
services:
  backend:
    project: ./src/backend
    language: python
    host: containerapp
    docker:
      path: ./Dockerfile
      remoteBuild: true
```

### Full Configuration with Hooks

```yaml
name: azd-deployment
metadata:
  template: my-project@1.0.0

infra:
  provider: bicep
  path: ./infra

azure:
  location: eastus2

services:
  frontend:
    project: ./src/frontend
    language: ts
    host: containerapp
    docker:
      path: ./Dockerfile
      context: .
      remoteBuild: true

  backend:
    project: ./src/backend
    language: python
    host: containerapp
    docker:
      path: ./Dockerfile
      context: .
      remoteBuild: true

hooks:
  preprovision:
    shell: sh
    run: |
      echo "Before provisioning..."
      
  postprovision:
    shell: sh
    run: |
      echo "After provisioning - set up RBAC, etc."
      
  postdeploy:
    shell: sh
    run: |
      echo "Frontend: ${SERVICE_FRONTEND_URI}"
      echo "Backend: ${SERVICE_BACKEND_URI}"
```

### Key azure.yaml Options

| Option | Description |
|--------|-------------|
| `remoteBuild: true` | Build images in Azure Container Registry (recommended) |
| `context: .` | Docker build context relative to project path |
| `host: containerapp` | Deploy to Azure Container Apps |
| `infra.provider: bicep` | Use Bicep for infrastructure |

## Environment Variables Flow

### Three-Level Configuration

1. **Local `.env`** - For local development only
2. **`.azure/<env>/.env`** - azd-managed, auto-populated from Bicep outputs
3. **`main.parameters.json`** - Maps env vars to Bicep parameters

### Parameter Injection Pattern

```json
// infra/main.parameters.json
{
  "parameters": {
    "environmentName": { "value": "${AZURE_ENV_NAME}" },
    "location": { "value": "${AZURE_LOCATION=eastus2}" },
    "azureOpenAiEndpoint": { "value": "${AZURE_OPENAI_ENDPOINT}" }
  }
}
```

Syntax: `${VAR_NAME}` or `${VAR_NAME=default_value}`

### Setting Environment Variables

```bash
# Set for current environment
azd env set AZURE_OPENAI_ENDPOINT "https://my-openai.openai.azure.com"
azd env set AZURE_SEARCH_ENDPOINT "https://my-search.search.windows.net"

# Set during init
azd env new prod
azd env set AZURE_OPENAI_ENDPOINT "..." 
```

### Bicep Output → Environment Variable

```bicep
// In main.bicep - outputs auto-populate .azure/<env>/.env
output SERVICE_FRONTEND_URI string = frontend.outputs.uri
output SERVICE_BACKEND_URI string = backend.outputs.uri
output BACKEND_PRINCIPAL_ID string = backend.outputs.principalId
```

## Idempotent Deployments

### Why azd up is Idempotent

1. **Bicep is declarative** - Resources reconcile to desired state
2. **Remote builds tag uniquely** - Image tags include deployment timestamp
3. **ACR reuses layers** - Only changed layers upload

### Preserving Manual Changes

Custom domains added via Portal can be lost on redeploy. Preserve with hooks:

```yaml
hooks:
  preprovision:
    shell: sh
    run: |
      # Save custom domains before provision
      if az containerapp show --name "$FRONTEND_NAME" -g "$RG" &>/dev/null; then
        az containerapp show --name "$FRONTEND_NAME" -g "$RG" \
          --query "properties.configuration.ingress.customDomains" \
          -o json > /tmp/domains.json
      fi

  postprovision:
    shell: sh
    run: |
      # Verify/restore custom domains
      if [ -f /tmp/domains.json ]; then
        echo "Saved domains: $(cat /tmp/domains.json)"
      fi
```

### Handling Existing Resources

```bicep
// Reference existing ACR (don't recreate)
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: containerRegistryName
}

// Set customDomains to null to preserve Portal-added domains
customDomains: empty(customDomainsParam) ? null : customDomainsParam
```

## Container App Service Discovery

Internal HTTP routing between Container Apps in same environment:

```bicep
// Backend reference in frontend env vars
env: [
  {
    name: 'BACKEND_URL'
    value: 'http://ca-backend-${resourceToken}'  // Internal DNS
  }
]
```

Frontend nginx proxies to internal URL:
```nginx
location /api {
    proxy_pass $BACKEND_URL;
}
```

## Managed Identity & RBAC

### Enable System-Assigned Identity

```bicep
resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  identity: {
    type: 'SystemAssigned'
  }
}

output principalId string = containerApp.identity.principalId
```

### Post-Provision RBAC Assignment

```yaml
hooks:
  postprovision:
    shell: sh
    run: |
      PRINCIPAL_ID="${BACKEND_PRINCIPAL_ID}"
      
      # Azure OpenAI access
      az role assignment create \
        --assignee-object-id "$PRINCIPAL_ID" \
        --assignee-principal-type ServicePrincipal \
        --role "Cognitive Services OpenAI User" \
        --scope "$OPENAI_RESOURCE_ID" 2>/dev/null || true
      
      # Azure AI Search access
      az role assignment create \
        --assignee-object-id "$PRINCIPAL_ID" \
        --role "Search Index Data Reader" \
        --scope "$SEARCH_RESOURCE_ID" 2>/dev/null || true
```

## Common Commands

```bash
# Environment management
azd env list                        # List environments
azd env select <name>               # Switch environment
azd env get-values                  # Show all env vars
azd env set KEY value               # Set variable

# Deployment
azd up                              # Full provision + deploy
azd provision                       # Infrastructure only
azd deploy                          # Code deployment only
azd deploy --service backend        # Deploy single service

# Debugging
azd show                            # Show project status
az containerapp logs show -n <app> -g <rg> --follow  # Stream logs
```

## Reference Files

- **Bicep patterns**: See references/bicep-patterns.md for Container Apps modules
- **Troubleshooting**: See references/troubleshooting.md for common issues
- **azure.yaml schema**: See references/azure-yaml-schema.md for full options

## Critical Reminders

1. **Always use `remoteBuild: true`** - Local builds fail on M1/ARM Macs deploying to AMD64
2. **Bicep outputs auto-populate .azure/<env>/.env** - Don't manually edit
3. **Use `azd env set` for secrets** - Not main.parameters.json defaults
4. **Service tags (`azd-service-name`)** - Required for azd to find Container Apps
5. **`|| true` in hooks** - Prevent RBAC "already exists" errors from failing deploy

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
