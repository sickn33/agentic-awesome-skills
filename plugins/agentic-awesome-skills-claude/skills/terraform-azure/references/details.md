# Details (moved from SKILL.md)

> Extended reference content for `terraform-azure`, kept under `references/` so the entrypoint stays within the audit budget.

## SQL Database

### database.tf

```hcl
resource "azurerm_mssql_server" "main" {
  name                         = "${local.name_prefix}-sql"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"

  azuread_administrator {
    login_username = "SQL Admins"
    object_id      = var.aks_admin_group_id
  }

  tags = local.common_tags
}

resource "azurerm_mssql_database" "main" {
  name         = "${var.project_name}-db"
  server_id    = azurerm_mssql_server.main.id
  collation    = "SQL_Latin1_General_CP1_CI_AS"
  sku_name     = var.environment == "prod" ? "BC_Gen5_4" : "GP_S_Gen5_2"
  max_size_gb  = var.environment == "prod" ? 256 : 32
  zone_redundant = var.environment == "prod"

  short_term_retention_policy {
    retention_days = var.environment == "prod" ? 14 : 7
  }

  tags = local.common_tags
}

resource "azurerm_private_endpoint" "sql" {
  name                = "${local.name_prefix}-sql-pe"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.data.id

  private_service_connection {
    name                           = "sql-connection"
    private_connection_resource_id = azurerm_mssql_server.main.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  tags = local.common_tags
}
```


## Outputs

### outputs.tf

```hcl
output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.main.name
}

output "aks_kube_config" {
  value     = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive = true
}

output "key_vault_uri" {
  value = azurerm_key_vault.main.vault_uri
}

output "sql_server_fqdn" {
  value = azurerm_mssql_server.main.fully_qualified_domain_name
}

output "vnet_id" {
  value = azurerm_virtual_network.main.id
}
```


## Terraform Workflow Commands

```bash
# Initialize (download providers, configure backend)
terraform init

# Validate configuration syntax
terraform validate

# Format all .tf files
terraform fmt -recursive

# Plan changes for a specific environment
terraform plan \
  -var-file="terraform.prod.tfvars" \
  -var="sql_admin_password=$(az keyvault secret show --vault-name ops-vault --name sql-pass --query value -o tsv)" \
  -out=tfplan

# Apply the saved plan
terraform apply tfplan

# Apply with auto-approve (CI/CD pipelines only)
terraform apply \
  -var-file="terraform.prod.tfvars" \
  -auto-approve

# Destroy infrastructure (careful!)
terraform plan -destroy -var-file="terraform.prod.tfvars" -out=destroyplan
terraform apply destroyplan

# Import existing resources into state
terraform import azurerm_resource_group.main /subscriptions/{sub}/resourceGroups/myapp-prod-rg

# Show current state
terraform state list
terraform state show azurerm_kubernetes_cluster.main

# Move resources in state (renaming)
terraform state mv azurerm_resource_group.old azurerm_resource_group.new

# Refresh state from real infrastructure
terraform refresh -var-file="terraform.prod.tfvars"

# Unlock stuck state
terraform force-unlock LOCK_ID

# Use workspaces for environment isolation
terraform workspace new prod
terraform workspace select prod
terraform workspace list
```


## Module Structure

```
project/
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    aks/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
  environments/
    dev/
      main.tf
      terraform.tfvars
      backend.tf
    prod/
      main.tf
      terraform.tfvars
      backend.tf
```

### Using Modules

```hcl
# environments/prod/main.tf
module "networking" {
  source = "../../modules/networking"

  environment   = var.environment
  location      = var.location
  project_name  = var.project_name
  address_space = ["10.0.0.0/16"]
}

module "aks" {
  source = "../../modules/aks"

  environment         = var.environment
  location            = var.location
  project_name        = var.project_name
  resource_group_name = module.networking.resource_group_name
  subnet_id           = module.networking.aks_subnet_id
  admin_group_id      = var.aks_admin_group_id
}

module "database" {
  source = "../../modules/database"

  environment         = var.environment
  location            = var.location
  project_name        = var.project_name
  resource_group_name = module.networking.resource_group_name
  subnet_id           = module.networking.data_subnet_id
  admin_password      = var.sql_admin_password
}
```


## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Error acquiring state lock` | Previous run crashed or concurrent access | Run `terraform force-unlock LOCK_ID` after confirming no other run is active |
| `Provider version constraint error` | Version conflict in required_providers | Run `terraform init -upgrade` to fetch compatible versions |
| `Resource already exists` | Resource created outside Terraform | Import with `terraform import` to bring it under management |
| `Cycle detected` in plan | Circular dependency between resources | Restructure references or use `depends_on` carefully |
| State file corruption | Concurrent writes or manual edits | Restore from state backup in the storage account versioning |
| `AuthorizationFailed` during apply | Service principal lacks RBAC permissions | Assign Contributor role on subscription or resource group |
| Plan shows unexpected changes | Drift from manual portal changes | Run `terraform refresh` then `terraform plan` to reconcile |
| Module source not found | Incorrect relative path or registry reference | Verify path in `source` attribute; run `terraform init` again |


## Related Skills

- `arm-templates` -- Azure-native IaC alternative with Bicep.
- `azure-aks` -- AKS cluster details and kubectl operations.
- `azure-networking` -- VNet and NSG design referenced in Terraform configs.
- `azure-sql` -- Database provisioning and security configurations.
- `azure-vms` -- VM sizing and scale set configurations.

