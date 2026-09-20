# Details (moved from SKILL.md)

> Extended reference content for `arm-templates`, kept under `references/` so the entrypoint stays within the audit budget.

## Linked and Nested Templates

```bicep
// Deploy to a different resource group
module networkInSharedRg 'modules/network.bicep' = {
  name: 'shared-network'
  scope: resourceGroup('shared-networking-rg')
  params: {
    location: location
  }
}

// Conditional deployment
param deployMonitoring bool = true

module monitoring 'modules/monitoring.bicep' = if (deployMonitoring) {
  name: 'monitoring-deployment'
  params: {
    location: location
  }
}

// Loop deployment
param storageAccounts array = [
  { name: 'logs', sku: 'Standard_LRS' }
  { name: 'data', sku: 'Standard_GRS' }
]

module storageLoop 'modules/storage.bicep' = [for account in storageAccounts: {
  name: 'storage-${account.name}'
  params: {
    storageAccountName: '${baseName}${account.name}sa'
    sku: account.sku
    location: location
  }
}]
```


## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `InvalidTemplate` error | Syntax error in ARM JSON or Bicep | Run `az bicep build` to check for compile errors |
| `ResourceNotFound` during deployment | Resource dependency not declared | Add `dependsOn` or use implicit references in Bicep |
| `DeploymentFailed` with quota error | Subscription quota exceeded | Request quota increase or use a different region |
| `AuthorizationFailed` | Insufficient RBAC permissions | Assign Contributor role on the target resource group |
| Parameter file secrets in source control | Secrets stored as plain text | Use Key Vault references in parameter files |
| Deployment takes very long | Large number of resources deployed serially | Use `dependsOn` carefully to allow parallel deployment |
| `What-If` shows unexpected deletions | Complete mode instead of Incremental | Use `--mode Incremental` (the default) to avoid deleting unmanaged resources |
| Bicep module not found | Incorrect relative path | Verify path is relative to the consuming file |


## Related Skills

- `terraform-azure` -- Multi-cloud IaC alternative with broader provider support.
- `azure-networking` -- VNet, NSG, and firewall configurations referenced in templates.
- `azure-vms` -- Virtual machine sizing and configuration details.
- `azure-aks` -- Kubernetes cluster definitions for Bicep/ARM.

