# Details (moved from SKILL.md)

> Extended reference content for `azure-keyvault`, kept under `references/` so the entrypoint stays within the audit budget.

## Terraform Configuration

```hcl
resource "azurerm_key_vault" "main" {
  name                        = "myapp-vault-prod"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "premium"

  enable_rbac_authorization   = true
  purge_protection_enabled    = true
  soft_delete_retention_days  = 90
  public_network_access_enabled = false

  network_acls {
    bypass         = "AzureServices"
    default_action = "Deny"
    ip_rules       = ["203.0.113.0/24"]
    virtual_network_subnet_ids = [azurerm_subnet.app.id]
  }
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.main.id
  content_type = "text/plain"

  expiration_date = "2026-01-01T00:00:00Z"

  tags = {
    environment = "production"
    rotation    = "enabled"
  }
}

resource "azurerm_role_assignment" "app_secrets_user" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```


## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Access denied" when reading secrets | Missing RBAC role or access policy | Assign `Key Vault Secrets User` role; or add access policy with `get` permission |
| "Vault not found" | Network access restricted | Check firewall rules; enable private endpoint; add IP to allow list |
| Soft-deleted secret blocks creation | Name collision with deleted secret | Recover and update, or purge the deleted secret first |
| Managed identity cannot access vault | Identity not in correct scope | Verify identity principal ID; check role assignment scope matches vault |
| Certificate renewal fails | Auto-renew policy not configured | Set `lifetimeActions` with `AutoRenew` action in certificate policy |
| CSI driver fails to mount secrets | Wrong provider configuration | Verify `tenantId`, `userAssignedIdentityID`, and object names match exactly |
| High latency on secret retrieval | No client-side caching | Implement caching in application; use CSI driver for K8s (syncs on interval) |


## Best Practices

- Use RBAC authorization over access policies for granular control
- Enable soft-delete and purge protection (required for compliance)
- Use managed identities for all service access (no credentials to manage)
- Enable private endpoints to eliminate public network exposure
- Set expiration dates on all secrets and certificates
- Enable diagnostic logging and forward to SIEM
- Use premium SKU for HSM-backed key operations
- Implement key rotation policies for all encryption keys
- Regularly audit access with Azure Activity logs
- Tag all vault resources for cost and ownership tracking


## Related Skills

- hashicorp-vault (`hashicorp-vault`) - Multi-cloud secrets
- azure-networking (`azure-networking`) - Network security
- aws-secrets-manager (`aws-secrets-manager`) - AWS secret management
- gcp-secret-manager (`gcp-secret-manager`) - GCP secret management

