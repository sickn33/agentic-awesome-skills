---
name: azure-networking
description: Configure Azure VNets, NSGs, and Azure Firewall. Implement hub-spoke
  topology and private endpoints. Use when designing Azure network infrastructure.
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

# Azure Networking

Design and implement Azure network infrastructure including VNets, subnets, NSGs, VNet peering, private endpoints, Azure Firewall, and Application Gateway. Covers both az CLI commands and Terraform configurations for production hub-spoke topologies.

## Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and set subscription
az login
az account set --subscription "my-subscription-id"

# Register required providers
az provider register --namespace Microsoft.Network

# Create resource group
az group create --name networking-rg --location eastus
```

## VNet and Subnet Creation

### Hub VNet

```bash
# Create hub VNet for shared services
az network vnet create \
  --resource-group networking-rg \
  --name hub-vnet \
  --address-prefix 10.0.0.0/16 \
  --location eastus \
  --tags environment=prod role=hub

# Add subnets to hub
az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name hub-vnet \
  --name AzureFirewallSubnet \
  --address-prefix 10.0.1.0/26

az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name hub-vnet \
  --name GatewaySubnet \
  --address-prefix 10.0.2.0/27

az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name hub-vnet \
  --name SharedServicesSubnet \
  --address-prefix 10.0.3.0/24

az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name hub-vnet \
  --name AzureBastionSubnet \
  --address-prefix 10.0.4.0/26
```

### Spoke VNet

```bash
# Create spoke VNet for application workloads
az network vnet create \
  --resource-group networking-rg \
  --name spoke-prod-vnet \
  --address-prefix 10.1.0.0/16 \
  --location eastus \
  --tags environment=prod role=spoke

az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name web-subnet \
  --address-prefix 10.1.1.0/24

az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name app-subnet \
  --address-prefix 10.1.2.0/24

az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name data-subnet \
  --address-prefix 10.1.3.0/24 \
  --private-endpoint-network-policies Enabled

# List all subnets in a VNet
az network vnet subnet list \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --output table
```

## Network Security Groups

```bash
# Create NSG for web tier
az network nsg create \
  --resource-group networking-rg \
  --name web-nsg \
  --tags tier=web

# Allow HTTPS from internet
az network nsg rule create \
  --resource-group networking-rg \
  --nsg-name web-nsg \
  --name AllowHTTPS \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --destination-port-ranges 443

# Allow HTTP for redirect
az network nsg rule create \
  --resource-group networking-rg \
  --nsg-name web-nsg \
  --name AllowHTTP \
  --priority 110 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes Internet \
  --destination-port-ranges 80

# Deny all other inbound traffic
az network nsg rule create \
  --resource-group networking-rg \
  --nsg-name web-nsg \
  --name DenyAllInbound \
  --priority 4096 \
  --direction Inbound \
  --access Deny \
  --protocol '*' \
  --source-address-prefixes '*' \
  --destination-port-ranges '*'

# Create NSG for app tier -- only allow from web subnet
az network nsg create \
  --resource-group networking-rg \
  --name app-nsg

az network nsg rule create \
  --resource-group networking-rg \
  --nsg-name app-nsg \
  --name AllowFromWeb \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 10.1.1.0/24 \
  --destination-port-ranges 8080

# Create NSG for data tier -- only allow from app subnet
az network nsg create \
  --resource-group networking-rg \
  --name data-nsg

az network nsg rule create \
  --resource-group networking-rg \
  --nsg-name data-nsg \
  --name AllowSQLFromApp \
  --priority 100 \
  --direction Inbound \
  --access Allow \
  --protocol Tcp \
  --source-address-prefixes 10.1.2.0/24 \
  --destination-port-ranges 1433

# Associate NSG with subnet
az network vnet subnet update \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name web-subnet \
  --network-security-group web-nsg

az network vnet subnet update \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name app-subnet \
  --network-security-group app-nsg

az network vnet subnet update \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name data-subnet \
  --network-security-group data-nsg

# View effective NSG rules
az network nic list-effective-nsg \
  --resource-group networking-rg \
  --name myvm-nic \
  --output table
```

## VNet Peering

```bash
# Peer hub to spoke
az network vnet peering create \
  --resource-group networking-rg \
  --name hub-to-spoke-prod \
  --vnet-name hub-vnet \
  --remote-vnet spoke-prod-vnet \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --allow-gateway-transit

# Peer spoke to hub
az network vnet peering create \
  --resource-group networking-rg \
  --name spoke-prod-to-hub \
  --vnet-name spoke-prod-vnet \
  --remote-vnet hub-vnet \
  --allow-vnet-access \
  --allow-forwarded-traffic \
  --use-remote-gateways false

# Verify peering status
az network vnet peering list \
  --resource-group networking-rg \
  --vnet-name hub-vnet \
  --output table
```

## Private Endpoints

```bash
# Create private endpoint for Azure SQL
az network private-endpoint create \
  --resource-group networking-rg \
  --name sql-private-endpoint \
  --vnet-name spoke-prod-vnet \
  --subnet data-subnet \
  --private-connection-resource-id "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Sql/servers/myserver" \
  --group-id sqlServer \
  --connection-name sql-connection

# Create private DNS zone for SQL
az network private-dns zone create \
  --resource-group networking-rg \
  --name privatelink.database.windows.net

# Link DNS zone to VNet
az network private-dns link vnet create \
  --resource-group networking-rg \
  --zone-name privatelink.database.windows.net \
  --name spoke-dns-link \
  --virtual-network spoke-prod-vnet \
  --registration-enabled false

# Create DNS record for the private endpoint
az network private-endpoint dns-zone-group create \
  --resource-group networking-rg \
  --endpoint-name sql-private-endpoint \
  --name sql-dns-group \
  --private-dns-zone privatelink.database.windows.net \
  --zone-name privatelink.database.windows.net

# Create private endpoint for Storage Account
az network private-endpoint create \
  --resource-group networking-rg \
  --name storage-private-endpoint \
  --vnet-name spoke-prod-vnet \
  --subnet data-subnet \
  --private-connection-resource-id "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Storage/storageAccounts/mystorageacct" \
  --group-id blob \
  --connection-name storage-blob-connection

# Create private endpoint for Key Vault
az network private-endpoint create \
  --resource-group networking-rg \
  --name kv-private-endpoint \
  --vnet-name spoke-prod-vnet \
  --subnet app-subnet \
  --private-connection-resource-id "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/myvault" \
  --group-id vault \
  --connection-name kv-connection
```

## Azure Firewall

```bash
# Create public IP for firewall
az network public-ip create \
  --resource-group networking-rg \
  --name fw-public-ip \
  --sku Standard \
  --allocation-method Static

# Create Azure Firewall
az network firewall create \
  --resource-group networking-rg \
  --name hub-firewall \
  --location eastus \
  --sku AZFW_VNet \
  --tier Standard

# Configure firewall IP
az network firewall ip-config create \
  --resource-group networking-rg \
  --firewall-name hub-firewall \
  --name fw-ipconfig \
  --public-ip-address fw-public-ip \
  --vnet-name hub-vnet

# Get firewall private IP for route tables
FW_PRIVATE_IP=$(az network firewall show \
  --resource-group networking-rg \
  --name hub-firewall \
  --query "ipConfigurations[0].privateIpAddress" \
  --output tsv)

# Create application rule allowing web traffic
az network firewall application-rule create \
  --resource-group networking-rg \
  --firewall-name hub-firewall \
  --collection-name AllowWeb \
  --name AllowGoogle \
  --protocols Https=443 Http=80 \
  --source-addresses 10.1.0.0/16 \
  --target-fqdns "*.google.com" "*.microsoft.com" \
  --action Allow \
  --priority 100

# Create network rule for DNS
az network firewall network-rule create \
  --resource-group networking-rg \
  --firewall-name hub-firewall \
  --collection-name AllowDNS \
  --name AllowDNS \
  --protocols UDP \
  --source-addresses 10.1.0.0/16 \
  --destination-addresses 168.63.129.16 \
  --destination-ports 53 \
  --action Allow \
  --priority 200

# Create route table to send traffic through firewall
az network route-table create \
  --resource-group networking-rg \
  --name spoke-route-table

az network route-table route create \
  --resource-group networking-rg \
  --route-table-name spoke-route-table \
  --name default-to-firewall \
  --address-prefix 0.0.0.0/0 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address "$FW_PRIVATE_IP"

# Associate route table with spoke subnet
az network vnet subnet update \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name app-subnet \
  --route-table spoke-route-table
```

## Application Gateway with WAF

```bash
# Create public IP
az network public-ip create \
  --resource-group networking-rg \
  --name appgw-public-ip \
  --sku Standard \
  --allocation-method Static

# Create Application Gateway subnet
az network vnet subnet create \
  --resource-group networking-rg \
  --vnet-name spoke-prod-vnet \
  --name AppGatewaySubnet \
  --address-prefix 10.1.10.0/24

# Create Application Gateway with WAF v2
az network application-gateway create \
  --resource-group networking-rg \
  --name myapp-appgw \
  --location eastus \
  --sku WAF_v2 \
  --capacity 2 \
  --vnet-name spoke-prod-vnet \
  --subnet AppGatewaySubnet \
  --public-ip-address appgw-public-ip \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --frontend-port 443 \
  --servers 10.1.2.4 10.1.2.5

# Enable WAF policy
az network application-gateway waf-policy create \
  --resource-group networking-rg \
  --name myapp-waf-policy

az network application-gateway waf-policy managed-rule rule-set add \
  --resource-group networking-rg \
  --policy-name myapp-waf-policy \
  --type OWASP \
  --version 3.2
```


## Contents

- [Terraform Configuration](references/details.md)
- [Troubleshooting](references/details.md)
- [Related Skills](references/details.md)

## When to Use

- You are designing the network foundation for Azure workloads.
- You need to isolate environments with VNets and NSGs.
- You are connecting on-premises networks to Azure via VPN or ExpressRoute.
- You need private connectivity to PaaS services via private endpoints.
- You are implementing centralized egress filtering with Azure Firewall.
- You need to set up load balancing or application-layer routing with Application Gateway.

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

