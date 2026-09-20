# Details (moved from SKILL.md)

> Extended reference content for `azure-vms`, kept under `references/` so the entrypoint stays within the audit budget.

## Terraform Configuration

```hcl
resource "azurerm_linux_virtual_machine" "main" {
  name                  = "myapp-vm"
  resource_group_name   = azurerm_resource_group.main.name
  location              = azurerm_resource_group.main.location
  size                  = "Standard_D4s_v5"
  admin_username        = "azureuser"
  zone                  = "1"
  network_interface_ids = [azurerm_network_interface.main.id]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 64
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}

resource "azurerm_managed_disk" "data" {
  name                 = "myapp-data-disk"
  resource_group_name  = azurerm_resource_group.main.name
  location             = azurerm_resource_group.main.location
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 256
  zone                 = "1"
  tags                 = var.tags
}

resource "azurerm_virtual_machine_data_disk_attachment" "data" {
  managed_disk_id    = azurerm_managed_disk.data.id
  virtual_machine_id = azurerm_linux_virtual_machine.main.id
  lun                = 0
  caching            = "ReadOnly"
}

resource "azurerm_linux_virtual_machine_scale_set" "main" {
  name                = "myapp-vmss"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Standard_D4s_v5"
  instances           = 3
  admin_username      = "azureuser"
  zones               = [1, 2, 3]

  admin_ssh_key {
    username   = "azureuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  network_interface {
    name    = "vmss-nic"
    primary = true

    ip_configuration {
      name      = "internal"
      primary   = true
      subnet_id = azurerm_subnet.app.id
    }
  }

  automatic_os_upgrade_policy {
    disable_automatic_rollback  = false
    enable_automatic_os_upgrade = true
  }

  rolling_upgrade_policy {
    max_batch_instance_percent              = 20
    max_unhealthy_instance_percent          = 20
    max_unhealthy_upgraded_instance_percent = 5
    pause_time_between_batches              = "PT0S"
  }

  tags = var.tags
}
```


## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| VM fails to start | Quota exceeded in region | Check quota with `az vm list-usage --location eastus`; request increase |
| SSH connection refused | NSG blocking port 22 or VM not running | Check NSG rules and VM power state; use Azure Bastion for private VMs |
| VM disk full | OS disk too small or logs not rotated | Resize disk after deallocating; configure log rotation |
| VM performance is slow | Wrong VM size or disk throttling | Check metrics with `az monitor metrics list`; upgrade size or disk tier |
| Scale set not scaling out | Autoscale rule threshold not met | Review autoscale settings; verify metric thresholds match workload |
| Custom image VM boot fails | Image not properly generalized | Re-run `waagent -deprovision` before capturing; check boot diagnostics |
| VMSS rolling upgrade stuck | Health probe failing on new instances | Fix application health endpoint; check `az vmss rolling-upgrade get-latest` |
| Spot VM evicted unexpectedly | Azure reclaimed capacity | Use eviction policy `Deallocate` and set up eviction notifications |


## Related Skills

- `azure-networking` -- VNet and NSG configuration for VM connectivity.
- `azure-aks` -- Container alternative when VMs are not required.
- `arm-templates` -- Bicep-based VM deployment templates.
- `terraform-azure` -- Terraform-based VM and VMSS provisioning.

