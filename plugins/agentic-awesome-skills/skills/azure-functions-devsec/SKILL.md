---
name: azure-functions-devsec
description: Build serverless applications on Azure Functions. Configure triggers,
  bindings, and deployment. Use when implementing serverless workloads on Azure.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Azure Functions

Build and deploy serverless applications with Azure Functions. Covers function app creation, trigger and binding configuration, deployment strategies, real code examples in Python and Node.js, and production best practices.

## When to Use

- You need event-driven compute that scales automatically to zero.
- You are building APIs, webhooks, or background processing pipelines.
- You want per-execution billing without managing servers.
- You need to respond to Azure service events (Blob Storage, Service Bus, Cosmos DB changes).
- You are implementing lightweight microservices or scheduled tasks.

## Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Azure Functions Core Tools v4
npm install -g azure-functions-core-tools@4

# Verify installation
func --version

# Login
az login
az account set --subscription "my-subscription-id"

# Create supporting resources
az group create --name functions-rg --location eastus

az storage account create \
  --name myfuncstorageacct \
  --resource-group functions-rg \
  --location eastus \
  --sku Standard_LRS
```

## Function App Creation

### Consumption Plan (Pay-per-execution)

```bash
# Python function app on Consumption plan
az functionapp create \
  --resource-group functions-rg \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --name myapp-func \
  --storage-account myfuncstorageacct \
  --os-type Linux

# Node.js function app
az functionapp create \
  --resource-group functions-rg \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name myapp-node-func \
  --storage-account myfuncstorageacct \
  --os-type Linux
```

### Premium Plan (VNet integration, no cold start)

```bash
# Create Premium plan
az functionapp plan create \
  --resource-group functions-rg \
  --name myapp-premium-plan \
  --location eastus \
  --sku EP1 \
  --is-linux true

# Create function app on Premium plan
az functionapp create \
  --resource-group functions-rg \
  --plan myapp-premium-plan \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --name myapp-premium-func \
  --storage-account myfuncstorageacct
```

## Trigger and Binding Examples

### HTTP Trigger -- Python

```python
# function_app.py (v2 programming model)
import azure.functions as func
import json
import logging

app = func.FunctionApp(http_auth_level=func.AuthLevel.FUNCTION)

@app.route(route="users/{userId}", methods=["GET"])
def get_user(req: func.HttpRequest) -> func.HttpResponse:
    user_id = req.route_params.get("userId")
    logging.info(f"Fetching user: {user_id}")

    if not user_id:
        return func.HttpResponse(
            json.dumps({"error": "userId is required"}),
            status_code=400,
            mimetype="application/json"
        )

    user = {"id": user_id, "name": "Jane Doe", "email": "jane@example.com"}
    return func.HttpResponse(
        json.dumps(user),
        status_code=200,
        mimetype="application/json"
    )

@app.route(route="users", methods=["POST"])
def create_user(req: func.HttpRequest) -> func.HttpResponse:
    try:
        body = req.get_json()
    except ValueError:
        return func.HttpResponse(
            json.dumps({"error": "Invalid JSON"}),
            status_code=400,
            mimetype="application/json"
        )

    logging.info(f"Creating user: {body.get('name')}")
    return func.HttpResponse(
        json.dumps({"id": "new-id", **body}),
        status_code=201,
        mimetype="application/json"
    )
```

### HTTP Trigger -- Node.js

```javascript
// src/functions/httpTrigger.js (v4 programming model)
const { app } = require("@azure/functions");

app.http("getUser", {
  methods: ["GET"],
  authLevel: "function",
  route: "users/{userId}",
  handler: async (request, context) => {
    const userId = request.params.userId;
    context.log(`Fetching user: ${userId}`);

    if (!userId) {
      return { status: 400, jsonBody: { error: "userId is required" } };
    }

    const user = { id: userId, name: "Jane Doe", email: "jane@example.com" };
    return { status: 200, jsonBody: user };
  },
});

app.http("createUser", {
  methods: ["POST"],
  authLevel: "function",
  route: "users",
  handler: async (request, context) => {
    const body = await request.json();
    context.log(`Creating user: ${body.name}`);

    return { status: 201, jsonBody: { id: "new-id", ...body } };
  },
});
```

### Blob Trigger -- Python

```python
@app.blob_trigger(arg_name="blob", path="uploads/{name}",
                   connection="AzureWebJobsStorage")
def process_upload(blob: func.InputStream):
    logging.info(f"Processing blob: {blob.name}, Size: {blob.length} bytes")
    content = blob.read()
    # Process file content here
```

### Timer Trigger -- Python

```python
@app.timer_trigger(schedule="0 */5 * * * *", arg_name="timer",
                    run_on_startup=False)
def cleanup_job(timer: func.TimerRequest):
    if timer.past_due:
        logging.warning("Timer is past due")
    logging.info("Running scheduled cleanup")
    # Cleanup logic here
```

### Service Bus Trigger -- Python

```python
@app.service_bus_queue_trigger(arg_name="msg", queue_name="orders",
                                connection="ServiceBusConnection")
@app.cosmos_db_output(arg_name="doc", database_name="mydb",
                       container_name="processed-orders",
                       connection="CosmosDBConnection")
def process_order(msg: func.ServiceBusMessage, doc: func.Out[func.Document]):
    order = json.loads(msg.get_body().decode("utf-8"))
    logging.info(f"Processing order: {order['id']}")

    processed = {
        "id": order["id"],
        "status": "processed",
        "items": order["items"],
        "total": sum(item["price"] for item in order["items"])
    }
    doc.set(func.Document.from_dict(processed))
```

### Cosmos DB Change Feed Trigger -- Python

```python
@app.cosmos_db_trigger_v3(arg_name="documents", database_name="mydb",
                           container_name="orders",
                           connection="CosmosDBConnection",
                           lease_container_name="leases",
                           create_lease_container_if_not_exists=True)
def on_order_change(documents: func.DocumentList):
    for doc in documents:
        logging.info(f"Document changed: {doc['id']}")
```

## Local Development

```bash
# Initialize a new Python function project
func init MyFunctionProject --python
cd MyFunctionProject

# Create a new function from template
func new --name HttpExample --template "HTTP trigger" --authlevel function

# Run locally
func start

# Run locally with specific port
func start --port 7072

# Test locally
curl http://localhost:7071/api/HttpExample?name=World
```

## Deployment

```bash
# Deploy using Core Tools
func azure functionapp publish myapp-func

# Deploy with build step for Python
func azure functionapp publish myapp-func --build remote

# Deploy using ZIP package
zip -r function.zip . -x ".git/*" ".venv/*" "__pycache__/*"
az functionapp deployment source config-zip \
  --resource-group functions-rg \
  --name myapp-func \
  --src function.zip

# Deploy via CI/CD with GitHub Actions
az functionapp deployment github-actions add \
  --resource-group functions-rg \
  --name myapp-func \
  --repo "myorg/myrepo" \
  --branch main \
  --runtime python \
  --login-with-github
```

## Deployment Slots

```bash
# Create a staging slot
az functionapp deployment slot create \
  --resource-group functions-rg \
  --name myapp-func \
  --slot staging

# Deploy to staging slot
func azure functionapp publish myapp-func --slot staging

# Test staging slot
curl https://myapp-func-staging.azurewebsites.net/api/health

# Swap staging to production
az functionapp deployment slot swap \
  --resource-group functions-rg \
  --name myapp-func \
  --slot staging \
  --target-slot production

# Roll back by swapping again
az functionapp deployment slot swap \
  --resource-group functions-rg \
  --name myapp-func \
  --slot staging \
  --target-slot production
```

## Application Settings and Security

```bash
# Set application settings
az functionapp config appsettings set \
  --resource-group functions-rg \
  --name myapp-func \
  --settings \
    ServiceBusConnection="Endpoint=sb://..." \
    CosmosDBConnection="AccountEndpoint=https://..." \
    CUSTOM_SETTING="my-value"

# Set settings as slot-specific
az functionapp config appsettings set \
  --resource-group functions-rg \
  --name myapp-func \
  --slot-settings \
    ENVIRONMENT="staging"

# Enable managed identity
az functionapp identity assign \
  --resource-group functions-rg \
  --name myapp-func

# Configure CORS
az functionapp cors add \
  --resource-group functions-rg \
  --name myapp-func \
  --allowed-origins "https://myapp.example.com"

# Set minimum TLS version
az functionapp config set \
  --resource-group functions-rg \
  --name myapp-func \
  --min-tls-version 1.2

# Enable Application Insights
az functionapp config appsettings set \
  --resource-group functions-rg \
  --name myapp-func \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="your-key"
```

## Terraform Configuration

```hcl
resource "azurerm_service_plan" "functions" {
  name                = "myapp-func-plan"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan
}

resource "azurerm_linux_function_app" "main" {
  name                       = "myapp-func"
  location                   = azurerm_resource_group.main.location
  resource_group_name        = azurerm_resource_group.main.name
  service_plan_id            = azurerm_service_plan.functions.id
  storage_account_name       = azurerm_storage_account.func.name
  storage_account_access_key = azurerm_storage_account.func.primary_access_key

  identity {
    type = "SystemAssigned"
  }

  site_config {
    application_stack {
      python_version = "3.11"
    }
    cors {
      allowed_origins = ["https://myapp.example.com"]
    }
  }

  app_settings = {
    FUNCTIONS_WORKER_RUNTIME       = "python"
    WEBSITE_RUN_FROM_PACKAGE       = "1"
    APPINSIGHTS_INSTRUMENTATIONKEY = azurerm_application_insights.main.instrumentation_key
  }

  tags = var.tags
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Cold start latency > 10s | Consumption plan cold start | Use Premium plan (EP1+) or enable `WEBSITE_RUN_FROM_PACKAGE=1` |
| Function not triggering | Connection string misconfigured | Check `az functionapp config appsettings list` for correct binding values |
| `ModuleNotFoundError` in Python | Dependencies not installed during deploy | Use `--build remote` flag or include `requirements.txt` in package |
| HTTP 401 Unauthorized | Auth level mismatch or missing function key | Verify auth level in code matches expectations; pass `x-functions-key` header |
| Blob trigger not firing | Storage account connection wrong | Verify `AzureWebJobsStorage` points to the correct account |
| Timer trigger runs twice | Multiple instances on Premium plan | Set `WEBSITE_MAX_DYNAMIC_APPLICATION_SCALE_OUT=1` or use singleton lock |
| Deployment slot swap fails | Slot settings not configured | Ensure slot-specific settings are marked with `--slot-settings` |
| Out of memory errors | Large payloads or memory leaks | Stream data instead of loading entirely; increase plan tier |

## Related Skills

- `azure-networking` -- VNet integration for Premium plan functions accessing private resources.
- `azure-sql` -- Database connections from function bindings.
- `terraform-azure` -- Infrastructure as Code for function app provisioning.
- `arm-templates` -- Bicep-based function app deployment.

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

