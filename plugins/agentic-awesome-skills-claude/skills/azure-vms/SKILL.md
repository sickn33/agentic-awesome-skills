---
name: azure-vms
description: Manage Azure Virtual Machines and scale sets. Configure availability
  sets and managed disks. Use when deploying compute resources on Azure.
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

# Azure Virtual Machines

Deploy and manage Azure VMs, availability sets, scale sets, custom images, and managed disks. Covers VM creation, sizing, disk management, auto-scaling, and Terraform configurations for production environments.

## Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and set subscription
az login
az account set --subscription "my-subscription-id"

# Create resource group
az group create --name compute-rg --location eastus

# List available VM sizes in a region
az vm list-sizes --location eastus --output table

# List available VM images
az vm image list --output table
az vm image list --publisher Canonical --offer 0001-com-ubuntu-server-jammy --all --output table
```

## VM Creation

### Linux VM with SSH Key

```bash
az vm create \
  --resource-group compute-rg \
  --name myapp-vm \
  --image Ubuntu2204 \
  --size Standard_D4s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --vnet-name myapp-vnet \
  --subnet app-subnet \
  --nsg "" \
  --public-ip-address "" \
  --os-disk-size-gb 64 \
  --os-disk-caching ReadWrite \
  --storage-sku Premium_LRS \
  --zone 1 \
  --assign-identity \
  --tags environment=prod team=platform app=myapp

# SSH into the VM (if public IP assigned)
ssh azureuser@$(az vm show -g compute-rg -n myapp-vm -d --query publicIps -o tsv)
```

### Windows VM

```bash
az vm create \
  --resource-group compute-rg \
  --name myapp-win-vm \
  --image Win2022Datacenter \
  --size Standard_D4s_v5 \
  --admin-username azureadmin \
  --admin-password 'S3cur3P@ssw0rd!' \
  --vnet-name myapp-vnet \
  --subnet app-subnet \
  --public-ip-address "" \
  --os-disk-size-gb 128 \
  --storage-sku Premium_LRS \
  --zone 1
```

### VM with Cloud-Init

```bash
# cloud-init.yaml
# #cloud-config
# package_update: true
# packages:
#   - nginx
#   - docker.io
# runcmd:
#   - systemctl enable nginx
#   - systemctl start nginx
#   - usermod -aG docker azureuser

az vm create \
  --resource-group compute-rg \
  --name web-vm \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --custom-data cloud-init.yaml \
  --tags role=web
```

## VM Size Guide

| Family | Example Sizes | Use Case |
|--------|---------------|----------|
| B-series | Standard_B1s, Standard_B2s | Dev/test, low-traffic web servers |
| D-series | Standard_D4s_v5, Standard_D8s_v5 | General purpose, most production workloads |
| E-series | Standard_E4s_v5, Standard_E16s_v5 | Memory-intensive (databases, caching) |
| F-series | Standard_F4s_v2, Standard_F16s_v2 | CPU-intensive (batch processing, analytics) |
| L-series | Standard_L8s_v3, Standard_L32s_v3 | Storage-optimized (big data, SQL) |
| N-series | Standard_NC6s_v3, Standard_NC24ads_A100_v4 | GPU workloads (ML training, rendering) |
| M-series | Standard_M128s | SAP HANA, large in-memory workloads |

```bash
# Find VM sizes with specific capabilities
az vm list-sizes --location eastus \
  --query "[?numberOfCores >= \`4\` && memoryInMb >= \`16000\`]" \
  --output table

# Check VM size availability in a zone
az vm list-skus --location eastus \
  --size Standard_D4s_v5 \
  --output table
```

## Managed Disks

```bash
# Add a data disk to existing VM
az vm disk attach \
  --resource-group compute-rg \
  --vm-name myapp-vm \
  --name myapp-data-disk \
  --size-gb 256 \
  --sku Premium_LRS \
  --new \
  --lun 0

# Create a standalone managed disk
az disk create \
  --resource-group compute-rg \
  --name shared-data-disk \
  --size-gb 512 \
  --sku Premium_LRS \
  --zone 1

# Resize a disk (VM must be deallocated)
az vm deallocate --resource-group compute-rg --name myapp-vm
az disk update \
  --resource-group compute-rg \
  --name myapp-data-disk \
  --size-gb 512
az vm start --resource-group compute-rg --name myapp-vm

# Snapshot a disk for backup
az snapshot create \
  --resource-group compute-rg \
  --name myapp-disk-snapshot \
  --source myapp-data-disk

# Create disk from snapshot
az disk create \
  --resource-group compute-rg \
  --name myapp-disk-from-snap \
  --source myapp-disk-snapshot \
  --sku Premium_LRS

# List disks attached to a VM
az vm show \
  --resource-group compute-rg \
  --name myapp-vm \
  --query "storageProfile.dataDisks" \
  --output table
```

## Custom Images

```bash
# Generalize the VM (run inside the VM first)
# sudo waagent -deprovision+user -force

# Deallocate and generalize
az vm deallocate --resource-group compute-rg --name myapp-vm
az vm generalize --resource-group compute-rg --name myapp-vm

# Create image from VM
az image create \
  --resource-group compute-rg \
  --name myapp-golden-image \
  --source myapp-vm \
  --os-type Linux

# Create VM from custom image
az vm create \
  --resource-group compute-rg \
  --name myapp-from-image \
  --image myapp-golden-image \
  --size Standard_D4s_v5 \
  --admin-username azureuser \
  --generate-ssh-keys

# Use Azure Compute Gallery for shared images
az sig create \
  --resource-group compute-rg \
  --gallery-name myAppGallery

az sig image-definition create \
  --resource-group compute-rg \
  --gallery-name myAppGallery \
  --gallery-image-definition myapp-image \
  --publisher myorg \
  --offer myapp \
  --sku 1.0 \
  --os-type Linux \
  --os-state Generalized

az sig image-version create \
  --resource-group compute-rg \
  --gallery-name myAppGallery \
  --gallery-image-definition myapp-image \
  --gallery-image-version 1.0.0 \
  --managed-image myapp-golden-image \
  --target-regions eastus westus \
  --replica-count 2
```

## Availability Sets and Zones

```bash
# Create availability set
az vm availability-set create \
  --resource-group compute-rg \
  --name myapp-avset \
  --platform-fault-domain-count 3 \
  --platform-update-domain-count 5

# Create VM in availability set
az vm create \
  --resource-group compute-rg \
  --name myapp-vm-1 \
  --image Ubuntu2204 \
  --size Standard_D4s_v5 \
  --availability-set myapp-avset \
  --admin-username azureuser \
  --generate-ssh-keys

# Create VMs across availability zones
for zone in 1 2 3; do
  az vm create \
    --resource-group compute-rg \
    --name "myapp-vm-zone${zone}" \
    --image Ubuntu2204 \
    --size Standard_D4s_v5 \
    --zone "$zone" \
    --admin-username azureuser \
    --generate-ssh-keys \
    --no-wait
done
```

## Virtual Machine Scale Sets

```bash
# Create VMSS with autoscaling
az vmss create \
  --resource-group compute-rg \
  --name myapp-vmss \
  --image Ubuntu2204 \
  --vm-sku Standard_D4s_v5 \
  --instance-count 2 \
  --admin-username azureuser \
  --generate-ssh-keys \
  --vnet-name myapp-vnet \
  --subnet app-subnet \
  --upgrade-policy-mode Rolling \
  --health-probe "/" \
  --load-balancer myapp-lb \
  --zones 1 2 3 \
  --custom-data cloud-init.yaml \
  --tags environment=prod

# Configure autoscale rules
az monitor autoscale create \
  --resource-group compute-rg \
  --resource myapp-vmss \
  --resource-type Microsoft.Compute/virtualMachineScaleSets \
  --name myapp-autoscale \
  --min-count 2 \
  --max-count 20 \
  --count 3

# Scale out when CPU > 70%
az monitor autoscale rule create \
  --resource-group compute-rg \
  --autoscale-name myapp-autoscale \
  --condition "Percentage CPU > 70 avg 5m" \
  --scale out 2

# Scale in when CPU < 30%
az monitor autoscale rule create \
  --resource-group compute-rg \
  --autoscale-name myapp-autoscale \
  --condition "Percentage CPU < 30 avg 10m" \
  --scale in 1

# Manual scale
az vmss scale \
  --resource-group compute-rg \
  --name myapp-vmss \
  --new-capacity 5

# Update VMSS image
az vmss update \
  --resource-group compute-rg \
  --name myapp-vmss \
  --set virtualMachineProfile.storageProfile.imageReference.version=latest

# Rolling upgrade of instances
az vmss rolling-upgrade start \
  --resource-group compute-rg \
  --name myapp-vmss

# List VMSS instances
az vmss list-instances \
  --resource-group compute-rg \
  --name myapp-vmss \
  --output table
```

## VM Management Operations

```bash
# Start / Stop / Restart / Deallocate
az vm start --resource-group compute-rg --name myapp-vm
az vm stop --resource-group compute-rg --name myapp-vm
az vm restart --resource-group compute-rg --name myapp-vm
az vm deallocate --resource-group compute-rg --name myapp-vm

# Run command on a VM
az vm run-command invoke \
  --resource-group compute-rg \
  --name myapp-vm \
  --command-id RunShellScript \
  --scripts "df -h && free -m && uptime"

# Enable boot diagnostics
az vm boot-diagnostics enable \
  --resource-group compute-rg \
  --name myapp-vm

# Get boot diagnostics log
az vm boot-diagnostics get-boot-log \
  --resource-group compute-rg \
  --name myapp-vm

# Enable Azure Backup
az backup protection enable-for-vm \
  --resource-group compute-rg \
  --vault-name myapp-vault \
  --vm myapp-vm \
  --policy-name DefaultPolicy

# Resize a VM
az vm resize \
  --resource-group compute-rg \
  --name myapp-vm \
  --size Standard_D8s_v5
```


## Contents

- [Terraform Configuration](references/details.md)
- [Troubleshooting](references/details.md)
- [Related Skills](references/details.md)

## When to Use

- You need full control over the operating system and runtime environment.
- Your application requires specific OS configurations or kernel modules.
- You are running legacy applications that cannot be containerized.
- You need GPU-accelerated compute for ML training or rendering.
- You need high-availability compute with availability zones or scale sets.

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

