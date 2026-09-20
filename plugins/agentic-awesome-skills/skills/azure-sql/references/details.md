# Details (moved from SKILL.md)

> Extended reference content for `azure-sql`, kept under `references/` so the entrypoint stays within the audit budget.

## Terraform Configuration

```hcl
resource "azurerm_mssql_server" "main" {
  name                         = "myapp-sqlserver"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = var.sql_admin_password
  minimum_tls_version          = "1.2"
  public_network_access_enabled = false

  azuread_administrator {
    login_username = "SQL Admins"
    object_id      = var.sql_admin_aad_group_id
  }

  tags = var.tags
}

resource "azurerm_mssql_database" "main" {
  name         = "myapp-prod-db"
  server_id    = azurerm_mssql_server.main.id
  collation    = "SQL_Latin1_General_CP1_CI_AS"
  license_type = "LicenseIncluded"
  sku_name     = "BC_Gen5_4"
  max_size_gb  = 256
  zone_redundant = true
  read_scale     = true

  short_term_retention_policy {
    retention_days           = 14
    backup_interval_in_hours = 12
  }

  long_term_retention_policy {
    weekly_retention  = "P4W"
    monthly_retention = "P12M"
    yearly_retention  = "P5Y"
    week_of_year      = 1
  }

  threat_detection_policy {
    state                      = "Enabled"
    email_addresses            = ["security@example.com"]
    email_account_admins       = "Enabled"
    retention_days             = 90
    storage_endpoint           = azurerm_storage_account.audit.primary_blob_endpoint
    storage_account_access_key = azurerm_storage_account.audit.primary_access_key
  }

  tags = var.tags
}

resource "azurerm_mssql_failover_group" "main" {
  name      = "myapp-failover-group"
  server_id = azurerm_mssql_server.main.id
  databases = [azurerm_mssql_database.main.id]

  partner_server {
    id = azurerm_mssql_server.secondary.id
  }

  read_write_endpoint_failover_policy {
    mode          = "Automatic"
    grace_minutes = 60
  }

  tags = var.tags
}

resource "azurerm_private_endpoint" "sql" {
  name                = "sql-private-endpoint"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  subnet_id           = azurerm_subnet.data.id

  private_service_connection {
    name                           = "sql-connection"
    private_connection_resource_id = azurerm_mssql_server.main.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }
}
```


## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Cannot connect to SQL server | Firewall rule missing or public access disabled | Add client IP with `az sql server firewall-rule create` or use private endpoint |
| Login failed for user | Incorrect credentials or Azure AD not configured | Verify admin credentials; enable Azure AD auth on the server |
| Database DTU at 100% | Under-provisioned tier or inefficient queries | Scale up service objective; review Query Store for expensive queries |
| Geo-replication lag is high | Large transaction volumes or network latency | Monitor with `sys.dm_geo_replication_link_status`; consider Hyperscale |
| Point-in-time restore fails | Requested time is outside retention window | Check retention policy; use long-term backups for older data |
| Elastic pool running out of eDTUs | Too many active databases in pool | Increase pool capacity or move heavy databases to dedicated tier |
| TDE key rotation failure | Key Vault access policy missing | Grant SQL server managed identity GET, WRAP, UNWRAP permissions |
| Connection timeout from app | Network path blocked or DNS issue | Use `az network watcher test-connectivity`; verify private DNS resolution |


## Related Skills

- `azure-networking` -- Private endpoints and VNet rules for SQL access.
- `azure-functions` -- SQL bindings for serverless data access.
- `terraform-azure` -- Terraform-based SQL infrastructure provisioning.
- `arm-templates` -- Bicep templates for SQL deployments.

