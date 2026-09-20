# Details (moved from SKILL.md)

> Extended reference content for `azure-networking`, kept under `references/` so the entrypoint stays within the audit budget.

## Terraform Configuration

```hcl
resource "azurerm_virtual_network" "hub" {
  name                = "hub-vnet"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  address_space       = ["10.0.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "firewall" {
  name                 = "AzureFirewallSubnet"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.hub.name
  address_prefixes     = ["10.0.1.0/26"]
}

resource "azurerm_virtual_network" "spoke" {
  name                = "spoke-prod-vnet"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  address_space       = ["10.1.0.0/16"]
  tags                = var.tags
}

resource "azurerm_subnet" "web" {
  name                 = "web-subnet"
  resource_group_name  = azurerm_resource_group.networking.name
  virtual_network_name = azurerm_virtual_network.spoke.name
  address_prefixes     = ["10.1.1.0/24"]
}

resource "azurerm_network_security_group" "web" {
  name                = "web-nsg"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name

  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = var.tags
}

resource "azurerm_subnet_network_security_group_association" "web" {
  subnet_id                 = azurerm_subnet.web.id
  network_security_group_id = azurerm_network_security_group.web.id
}

resource "azurerm_virtual_network_peering" "hub_to_spoke" {
  name                      = "hub-to-spoke"
  resource_group_name       = azurerm_resource_group.networking.name
  virtual_network_name      = azurerm_virtual_network.hub.name
  remote_virtual_network_id = azurerm_virtual_network.spoke.id
  allow_forwarded_traffic   = true
  allow_gateway_transit     = true
}

resource "azurerm_virtual_network_peering" "spoke_to_hub" {
  name                      = "spoke-to-hub"
  resource_group_name       = azurerm_resource_group.networking.name
  virtual_network_name      = azurerm_virtual_network.spoke.name
  remote_virtual_network_id = azurerm_virtual_network.hub.id
  allow_forwarded_traffic   = true
  use_remote_gateways       = false
}

resource "azurerm_private_endpoint" "sql" {
  name                = "sql-private-endpoint"
  location            = azurerm_resource_group.networking.location
  resource_group_name = azurerm_resource_group.networking.name
  subnet_id           = azurerm_subnet.data.id

  private_service_connection {
    name                           = "sql-connection"
    private_connection_resource_id = azurerm_mssql_server.main.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "sql-dns-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.sql.id]
  }
}
```


## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| VMs cannot reach the internet | NSG blocking outbound or missing route | Check NSG rules with `az network nic list-effective-nsg`; verify route table |
| VNet peering shows `Disconnected` | Peering created in one direction only | Create peering from both sides (hub-to-spoke AND spoke-to-hub) |
| Private endpoint DNS not resolving | Private DNS zone not linked to VNet | Link DNS zone with `az network private-dns link vnet create` |
| NSG rule not taking effect | Higher-priority rule overriding | List rules with `az network nsg rule list` and check priority ordering |
| Application Gateway health probes failing | Backend pool servers unreachable | Verify NSG allows traffic from the AppGateway subnet |
| Azure Firewall blocking legitimate traffic | Missing application or network rule | Check firewall logs in Log Analytics; add appropriate rule |
| Cross-VNet communication failing | Peering not configured or route missing | Verify peering status and that `allow-vnet-access` is enabled |
| High latency between regions | Traffic routing through unexpected path | Use `az network watcher next-hop` to diagnose routing |


## Related Skills

- `azure-vms` -- VM network interface and NSG configuration.
- `azure-aks` -- AKS VNet integration with Azure CNI.
- `azure-sql` -- Private endpoint configuration for database access.
- `terraform-azure` -- Network infrastructure provisioning with Terraform.
- `azure-functions` -- VNet integration for Premium plan functions.

