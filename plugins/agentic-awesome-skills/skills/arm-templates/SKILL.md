---
name: arm-templates
description: Deploy Azure resources with ARM templates and Bicep. Create modular deployments
  and manage dependencies. Use when deploying Azure-native IaC.
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

# ARM Templates & Bicep

Deploy Azure infrastructure with ARM templates and Bicep. Bicep is the recommended domain-specific language that compiles to ARM JSON, offering cleaner syntax, modules, and first-class tooling support.

## Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Install Bicep CLI (bundled with Azure CLI 2.20+)
az bicep install
az bicep upgrade

# Verify installation
az bicep version

# Login and set subscription
az login
az account set --subscription "my-subscription-id"
```

## Bicep Fundamentals

### Resource Group Deployment with Virtual Network

```bicep
// main.bicep
@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Environment name used for resource naming')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'

@description('Base name for all resources')
param baseName string

var vnetName = '${baseName}-${environment}-vnet'
var nsgName = '${baseName}-${environment}-nsg'

resource nsg 'Microsoft.Network/networkSecurityGroups@2023-05-01' = {
  name: nsgName
  location: location
  properties: {
    securityRules: [
      {
        name: 'AllowHTTPS'
        properties: {
          priority: 100
          direction: 'Inbound'
          access: 'Allow'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '443'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'DenyAllInbound'
        properties: {
          priority: 4096
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourcePortRange: '*'
          destinationPortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-05-01' = {
  name: vnetName
  location: location
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
    subnets: [
      {
        name: 'web-subnet'
        properties: {
          addressPrefix: '10.0.1.0/24'
          networkSecurityGroup: {
            id: nsg.id
          }
        }
      }
      {
        name: 'app-subnet'
        properties: {
          addressPrefix: '10.0.2.0/24'
        }
      }
      {
        name: 'data-subnet'
        properties: {
          addressPrefix: '10.0.3.0/24'
          privateEndpointNetworkPolicies: 'Enabled'
        }
      }
    ]
  }
}

output vnetId string = vnet.id
output webSubnetId string = vnet.properties.subnets[0].id
output appSubnetId string = vnet.properties.subnets[1].id
```

### VM Deployment with Managed Identity

```bicep
// vm.bicep
param location string = resourceGroup().location
param vmName string
param subnetId string
param adminUsername string = 'azureuser'

@secure()
param adminPublicKey string

resource nic 'Microsoft.Network/networkInterfaces@2023-05-01' = {
  name: '${vmName}-nic'
  location: location
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: subnetId
          }
        }
      }
    ]
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2023-07-01' = {
  name: vmName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    hardwareProfile: {
      vmSize: 'Standard_B2s'
    }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: adminPublicKey
            }
          ]
        }
      }
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: '0001-com-ubuntu-server-jammy'
        sku: '22_04-lts-gen2'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Premium_LRS'
        }
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
        }
      ]
    }
    diagnosticsProfile: {
      bootDiagnostics: {
        enabled: true
      }
    }
  }
}

output vmPrincipalId string = vm.identity.principalId
output vmId string = vm.id
```

## Bicep Modules

### Module Definition

```bicep
// modules/storage.bicep
@description('Storage account name (3-24 chars, lowercase alphanumeric)')
param storageAccountName string

param location string = resourceGroup().location
param sku string = 'Standard_LRS'

@allowed(['Hot', 'Cool', 'Archive'])
param accessTier string = 'Hot'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: sku
  }
  kind: 'StorageV2'
  properties: {
    accessTier: accessTier
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

output storageAccountId string = storageAccount.id
output primaryBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
```

### Consuming Modules

```bicep
// main.bicep
param location string = resourceGroup().location
param environment string = 'prod'

module storage 'modules/storage.bicep' = {
  name: 'storage-deployment'
  params: {
    storageAccountName: 'myapp${environment}sa'
    location: location
    sku: environment == 'prod' ? 'Standard_GRS' : 'Standard_LRS'
  }
}

module vnet 'modules/network.bicep' = {
  name: 'vnet-deployment'
  params: {
    location: location
    environment: environment
  }
}

// Reference module outputs
output storageBlobEndpoint string = storage.outputs.primaryBlobEndpoint
```

## ARM JSON Template Structure

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountName": {
      "type": "string",
      "metadata": {
        "description": "Name of the storage account"
      }
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "variables": {
    "storageSku": "Standard_LRS"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "[parameters('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "[variables('storageSku')]"
      },
      "kind": "StorageV2",
      "properties": {
        "supportsHttpsTrafficOnly": true,
        "minimumTlsVersion": "TLS1_2"
      }
    }
  ],
  "outputs": {
    "storageId": {
      "type": "string",
      "value": "[resourceId('Microsoft.Storage/storageAccounts', parameters('storageAccountName'))]"
    }
  }
}
```

## Deployment Commands

```bash
# Validate a Bicep template before deployment
az deployment group validate \
  --resource-group mygroup \
  --template-file main.bicep \
  --parameters environment='prod' baseName='myapp'

# Preview changes with What-If
az deployment group what-if \
  --resource-group mygroup \
  --template-file main.bicep \
  --parameters environment='prod' baseName='myapp'

# Deploy Bicep to resource group
az deployment group create \
  --resource-group mygroup \
  --template-file main.bicep \
  --parameters environment='prod' baseName='myapp' \
  --name "deploy-$(date +%Y%m%d-%H%M%S)"

# Deploy ARM JSON with parameter file
az deployment group create \
  --resource-group mygroup \
  --template-file template.json \
  --parameters @parameters.prod.json

# Subscription-level deployment (e.g., resource groups, policies)
az deployment sub create \
  --location eastus \
  --template-file subscription-level.bicep \
  --parameters @params.json

# Management group deployment
az deployment mg create \
  --management-group-id my-mg \
  --location eastus \
  --template-file mg-policy.bicep

# Export resource group to ARM JSON
az group export --name mygroup --output json > exported-template.json

# Decompile ARM JSON to Bicep
az bicep decompile --file exported-template.json

# Build Bicep to ARM JSON (for inspection)
az bicep build --file main.bicep --outfile main.json

# List deployments and their status
az deployment group list \
  --resource-group mygroup \
  --output table

# Delete a failed deployment
az deployment group delete \
  --resource-group mygroup \
  --name my-failed-deployment
```

## Parameter Files

```json
// parameters.prod.json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": { "value": "prod" },
    "baseName": { "value": "myapp" },
    "adminPublicKey": {
      "reference": {
        "keyVault": {
          "id": "/subscriptions/{sub-id}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{vault}"
        },
        "secretName": "ssh-public-key"
      }
    }
  }
}
```


## Contents

- [Linked and Nested Templates](references/details.md)
- [Troubleshooting](references/details.md)
- [Related Skills](references/details.md)

## When to Use

- You need Azure-native Infrastructure as Code without third-party tooling.
- Your organization standardizes on Azure and wants tight portal integration.
- You need What-If analysis before deploying changes.
- You are migrating existing ARM JSON templates to Bicep for maintainability.
- You need deployment scopes at resource group, subscription, management group, or tenant level.

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

