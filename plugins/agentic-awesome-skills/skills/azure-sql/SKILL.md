---
name: azure-sql
description: Provision Azure SQL Database and Cosmos DB. Configure security, backups,
  and replication. Use when deploying managed databases on Azure.
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

# Azure SQL

Deploy and manage Azure SQL Database, Elastic Pools, and Cosmos DB. Covers server provisioning, firewall rules, geo-replication, backup strategies, performance tuning, security hardening, and Terraform configurations.

## Prerequisites

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login and set subscription
az login
az account set --subscription "my-subscription-id"

# Create resource group
az group create --name database-rg --location eastus
```

## SQL Server and Database Creation

### Create SQL Server

```bash
# Create logical SQL server
az sql server create \
  --resource-group database-rg \
  --name myapp-sqlserver \
  --location eastus \
  --admin-user sqladmin \
  --admin-password 'S3cur3P@ssw0rd!' \
  --enable-public-network false \
  --minimal-tls-version 1.2

# Enable Azure AD authentication
az sql server ad-admin create \
  --resource-group database-rg \
  --server-name myapp-sqlserver \
  --display-name "SQL Admins" \
  --object-id "{aad-group-object-id}"

# Enable Azure AD only authentication (disable SQL auth)
az sql server ad-only-auth enable \
  --resource-group database-rg \
  --name myapp-sqlserver
```

### Create Databases

```bash
# Create General Purpose database
az sql db create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-db \
  --edition GeneralPurpose \
  --compute-model Serverless \
  --auto-pause-delay 60 \
  --min-capacity 0.5 \
  --max-size 32GB \
  --backup-storage-redundancy Geo \
  --zone-redundant false

# Create Business Critical database for production
az sql db create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-prod-db \
  --edition BusinessCritical \
  --service-objective BC_Gen5_4 \
  --max-size 256GB \
  --backup-storage-redundancy Geo \
  --zone-redundant true \
  --read-scale Enabled

# Create Hyperscale database for large workloads
az sql db create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-analytics-db \
  --edition Hyperscale \
  --service-objective HS_Gen5_4 \
  --ha-replicas 2

# List databases on server
az sql db list \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --output table
```

### Elastic Pools

```bash
# Create elastic pool
az sql elastic-pool create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-pool \
  --edition GeneralPurpose \
  --capacity 4 \
  --db-max-capacity 2 \
  --db-min-capacity 0.25 \
  --max-size 256GB \
  --zone-redundant false

# Move database into elastic pool
az sql db update \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-db \
  --elastic-pool myapp-pool

# Monitor elastic pool usage
az sql elastic-pool list-dbs \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-pool \
  --output table
```

## Firewall Rules and Network Security

```bash
# Allow Azure services
az sql server firewall-rule create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0

# Allow specific IP range (office network)
az sql server firewall-rule create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name AllowOffice \
  --start-ip-address 203.0.113.0 \
  --end-ip-address 203.0.113.255

# Allow your current client IP
az sql server firewall-rule create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name AllowMyIP \
  --start-ip-address "$(curl -s ifconfig.me)" \
  --end-ip-address "$(curl -s ifconfig.me)"

# Create VNet rule for subnet access
az sql server vnet-rule create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name AllowAppSubnet \
  --vnet-name spoke-prod-vnet \
  --subnet app-subnet

# List firewall rules
az sql server firewall-rule list \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --output table

# Remove a firewall rule
az sql server firewall-rule delete \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name AllowMyIP
```

## Geo-Replication and Failover

```bash
# Create failover group with secondary server
az sql server create \
  --resource-group database-rg \
  --name myapp-sqlserver-secondary \
  --location westus \
  --admin-user sqladmin \
  --admin-password 'S3cur3P@ssw0rd!'

az sql failover-group create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-failover-group \
  --partner-server myapp-sqlserver-secondary \
  --partner-resource-group database-rg \
  --failover-policy Automatic \
  --grace-period 1 \
  --add-db myapp-prod-db

# Check failover group status
az sql failover-group show \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-failover-group \
  --output table

# Manual failover (for testing or planned maintenance)
az sql failover-group set-primary \
  --resource-group database-rg \
  --server myapp-sqlserver-secondary \
  --name myapp-failover-group

# Create active geo-replication (without failover group)
az sql db replica create \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-db \
  --partner-server myapp-sqlserver-secondary \
  --partner-resource-group database-rg
```

## Backup and Restore

```bash
# Configure short-term retention (1-35 days)
az sql db str-policy set \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-prod-db \
  --retention-days 14 \
  --diffbackup-hours 12

# Configure long-term retention
az sql db ltr-policy set \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-prod-db \
  --weekly-retention P4W \
  --monthly-retention P12M \
  --yearly-retention P5Y \
  --week-of-year 1

# Restore database to a point in time
az sql db restore \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-db-restored \
  --dest-name myapp-db-restored \
  --time "2026-03-23T10:00:00Z"

# Restore from long-term backup
az sql db ltr-backup list \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --database myapp-prod-db \
  --output table

# Export database to bacpac
az sql db export \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-db \
  --admin-user sqladmin \
  --admin-password 'S3cur3P@ssw0rd!' \
  --storage-key-type StorageAccessKey \
  --storage-key "{storage-account-key}" \
  --storage-uri "https://mystorageacct.blob.core.windows.net/backups/myapp-db.bacpac"
```

## Performance Tuning

```bash
# Enable automatic tuning
az sql db update \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-prod-db \
  --set tags.autoTuning=enabled

# Check database performance recommendations
az sql db advisor list \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --database myapp-prod-db \
  --output table

# Scale database tier
az sql db update \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-prod-db \
  --service-objective BC_Gen5_8

# Enable Query Store (via SQL)
# sqlcmd -S myapp-sqlserver.database.windows.net -d myapp-prod-db -Q "ALTER DATABASE [myapp-prod-db] SET QUERY_STORE = ON"

# View DTU/vCore usage metrics
az monitor metrics list \
  --resource "/subscriptions/{sub}/resourceGroups/database-rg/providers/Microsoft.Sql/servers/myapp-sqlserver/databases/myapp-prod-db" \
  --metric "cpu_percent" "dtu_consumption_percent" "storage_percent" \
  --interval PT1H \
  --output table
```

## Security Hardening

```bash
# Enable Advanced Threat Protection
az sql db threat-policy update \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --name myapp-prod-db \
  --state Enabled \
  --email-addresses security@example.com \
  --email-account-admins true

# Enable auditing to storage
az sql server audit-policy update \
  --resource-group database-rg \
  --name myapp-sqlserver \
  --state Enabled \
  --storage-account mystorageacct \
  --retention-days 90

# Enable auditing to Log Analytics
az sql server audit-policy update \
  --resource-group database-rg \
  --name myapp-sqlserver \
  --state Enabled \
  --lats Enabled \
  --lawri "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.OperationalInsights/workspaces/{workspace}"

# Enable Transparent Data Encryption (enabled by default)
az sql db tde set \
  --resource-group database-rg \
  --server myapp-sqlserver \
  --database myapp-prod-db \
  --status Enabled

# Enable vulnerability assessment
az sql vm update \
  --resource-group database-rg \
  --name myapp-sqlserver
```

## Cosmos DB

```bash
# Create Cosmos DB account with SQL API
az cosmosdb create \
  --resource-group database-rg \
  --name myapp-cosmos \
  --default-consistency-level Session \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=true \
  --locations regionName=westus failoverPriority=1 isZoneRedundant=false \
  --enable-automatic-failover true \
  --enable-multiple-write-locations false

# Create database
az cosmosdb sql database create \
  --resource-group database-rg \
  --account-name myapp-cosmos \
  --name myappdb \
  --throughput 400

# Create container with partition key
az cosmosdb sql container create \
  --resource-group database-rg \
  --account-name myapp-cosmos \
  --database-name myappdb \
  --name orders \
  --partition-key-path "/customerId" \
  --throughput 400 \
  --idx @indexing-policy.json

# Enable autoscale throughput
az cosmosdb sql container throughput update \
  --resource-group database-rg \
  --account-name myapp-cosmos \
  --database-name myappdb \
  --name orders \
  --max-throughput 4000
```


## Contents

- [Terraform Configuration](references/details.md)
- [Troubleshooting](references/details.md)
- [Related Skills](references/details.md)

## When to Use

- You need a fully managed relational database on Azure.
- Your application requires geo-replication for disaster recovery.
- You need elastic scaling across multiple databases with Elastic Pools.
- You are migrating on-premises SQL Server workloads to the cloud.
- You need a globally distributed NoSQL database (Cosmos DB).

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

