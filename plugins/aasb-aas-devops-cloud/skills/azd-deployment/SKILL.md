---
name: azd-deployment
description: Prepare and verify authorized Azure Container Apps deployments with azd. Use for azure.yaml, Bicep, remote builds, managed identity and post-deploy checks.
metadata:
  aas-risk: critical
  aas-source: community
  aas-date-added: '2026-02-27'
---

# Azure Developer CLI (azd) Container Apps Deployment

Deploy containerized frontend + backend applications to Azure Container Apps with remote builds, managed identity, and idempotent infrastructure.

## Authorization and preparation

Inspect existing project files and the active tenant, subscription and environment first. Provisioning, deployment, role assignments and hook execution change cloud resources and may incur costs. Prepare the exact diff, target, estimated impact and rollback plan; execute only when the user explicitly authorizes that deployment. Do not print environment values or credentials into shared logs.

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

## Deployment Repeatability

### Reconciliation and revision changes

1. **Bicep is declarative** - Resources reconcile to desired state
2. **Remote builds tag uniquely** - Image tags include deployment timestamp
3. **ACR reuses layers** - Only changed layers upload

### Preserve unmanaged changes deliberately

Inventory custom domains, ingress, role assignments and other Portal-managed settings before preparing a deployment. Move desired settings into reviewed infrastructure code or prepare a specific restoration plan. Setting a property to `null` is not a general guarantee that Azure will preserve an out-of-band edit. Repeated deployment may create new image revisions and execute hooks again; inspect those effects rather than claiming every hook is idempotent.

Reference an existing container registry explicitly in the project's Bicep when it is meant to remain externally managed. Do not copy an incomplete module or overwrite unrelated settings to make a deployment succeed.

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

Configure the frontend proxy using the backend's verified internal hostname, scheme and port. Do not assume the illustrative Bicep `resourceToken` exists in your project or copy an undeclared nginx `$BACKEND_URL` variable. If using a template, validate the rendered nginx configuration before deployment.

```nginx
# Schematic: replace this host with the approved internal endpoint.
location /api {
    proxy_pass http://approved-internal-backend;
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
      set -eu
      : "${BACKEND_PRINCIPAL_ID:?Set the reviewed backend principal ID}"
      : "${OPENAI_RESOURCE_ID:?Set the approved OpenAI resource scope}"
      : "${SEARCH_RESOURCE_ID:?Set the approved Search resource scope}"
      PRINCIPAL_ID="${BACKEND_PRINCIPAL_ID}"
      
      # Azure OpenAI access
      az role assignment create \
        --assignee-object-id "$PRINCIPAL_ID" \
        --assignee-principal-type ServicePrincipal \
        --role "Cognitive Services OpenAI User" \
        --scope "$OPENAI_RESOURCE_ID"
      
      # Azure AI Search access
      az role assignment create \
        --assignee-object-id "$PRINCIPAL_ID" \
        --role "Search Index Data Reader" \
        --scope "$SEARCH_RESOURCE_ID"
```

## Common Commands

```bash
# Environment management
azd env list                        # List environments
azd env select <name>               # Switch environment
azd show                            # Inspect project/resource information
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

## Post-Deployment Verification

Do not report completion from the deployment command's exit code alone. Within the authorized target scope:

1. Inspect `azd show` and compare the actual environment, resource IDs and service endpoints with the approved plan.
2. Check the active Container Apps revision, image architecture, ingress and readiness using the installed Azure CLI's supported read-only commands. Record the observed revision and health state; do not assume a new revision is receiving traffic.
3. Run project-owned smoke checks against explicitly approved endpoints. Verify the frontend/backend integration and identity-based access without creating paid transactions, sending messages or exposing real customer data.
4. Verify required role assignments at their exact resource scopes. A failed permission check is a failure, not a reason to add a broader role automatically.
5. Inspect bounded, redacted service logs and compare custom domains or other preserved settings with the pre-deploy inventory.
6. If a check fails, stop further rollout, report the failed observation and use the reviewed rollback plan. Do not run destructive cleanup or delete resources as an automatic rollback.

Record the deployment target, image/revision identity, checks actually performed, failures and unverified areas. Missing provider access means verification is incomplete. The hook example above requires its resource IDs to be defined explicitly and fails before role mutation when they are missing.

## Local Resources

No additional Bicep patterns, troubleshooting guide or schema file is bundled. Validate the project configuration against the installed Azure Developer CLI and current official Azure documentation before preparing deployment.

## Critical Reminders

1. **Verify build architecture** - Use remote builds or an explicitly configured local target architecture; an ARM image may not match an AMD64 deployment.
2. **Bicep outputs auto-populate .azure/<env>/.env** - Don't manually edit
3. **Protect secrets** - Use the project’s approved secret-management approach; never commit credentials, dump environment values or put secrets in parameter defaults.
4. **Service tags (`azd-service-name`)** - Required for azd to find Container Apps
5. **Handle RBAC failures explicitly** - Verify an existing assignment before treating a duplicate as success; never suppress permission or configuration failures.

## When to Use
Use for an existing azd project targeting Azure Container Apps when reviewing infrastructure, build architecture, managed identity, authorized deployment or post-deployment verification.

## Limitations
- Examples require project-owned modules, resource IDs and installed CLI versions; no complete application or infrastructure template is bundled.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Official command references

Check the [Azure Developer CLI reference](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/reference) and [Container Apps workflow guide](https://learn.microsoft.com/en-us/azure/developer/azure-developer-cli/container-apps-workflows) for the installed tool version. These links inform API/command verification, not permission to install tools or deploy resources.
