---
name: gcp-cloud-sql
description: Provision Cloud SQL and Spanner databases. Configure high availability,
  backups, and security. Use when deploying managed databases on GCP.
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

# GCP Cloud SQL

Deploy and manage fully managed relational databases (PostgreSQL, MySQL, SQL Server) on Google Cloud.

## When to Use

- Running production relational databases without managing replication, patching, or backups
- Migrating on-premises PostgreSQL or MySQL workloads to a managed service
- Applications requiring ACID transactions, relational schemas, and SQL query support
- Workloads that need automated high availability with regional failover

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Cloud SQL Admin API and Service Networking API enabled
- IAM role `roles/cloudsql.admin` for full management

```bash
gcloud services enable sqladmin.googleapis.com servicenetworking.googleapis.com
```

## Instance Tiers Reference

| Tier | vCPUs | Memory | Use Case |
|------|-------|--------|----------|
| db-f1-micro | Shared | 0.6 GB | Dev/test only |
| db-g1-small | Shared | 1.7 GB | Low-traffic staging |
| db-custom-2-8192 | 2 | 8 GB | Small production |
| db-custom-4-16384 | 4 | 16 GB | Medium production |
| db-custom-8-32768 | 8 | 32 GB | High-traffic production |

## Create a PostgreSQL Instance

```bash
gcloud sql instances create prod-db \
  --database-version=POSTGRES_16 \
  --tier=db-custom-4-16384 \
  --region=us-central1 \
  --availability-type=REGIONAL \
  --storage-type=SSD --storage-size=100GB --storage-auto-increase \
  --backup-start-time=02:00 --enable-point-in-time-recovery \
  --retained-backups-count=14 \
  --maintenance-window-day=SUN --maintenance-window-hour=4 \
  --database-flags=max_connections=200,log_min_duration_statement=1000 \
  --root-password=$(openssl rand -base64 24) \
  --labels=env=production,team=backend

gcloud sql databases create myapp --instance=prod-db --charset=UTF8
gcloud sql users create appuser --instance=prod-db \
  --password=$(openssl rand -base64 24)
```

## Create a MySQL Instance

```bash
gcloud sql instances create mysql-prod \
  --database-version=MYSQL_8_0 \
  --tier=db-custom-4-16384 --region=us-central1 \
  --availability-type=REGIONAL \
  --storage-type=SSD --storage-size=100GB --storage-auto-increase \
  --backup-start-time=02:00 --enable-bin-log --retained-backups-count=14 \
  --database-flags=slow_query_log=on,long_query_time=2,max_connections=500 \
  --root-password=$(openssl rand -base64 24)
```

## Private IP Configuration

```bash
# Allocate IP range and create private connection
gcloud compute addresses create google-managed-services \
  --global --purpose=VPC_PEERING --prefix-length=16 --network=my-vpc

gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services --network=my-vpc

# Create instance with private IP only
gcloud sql instances create private-db \
  --database-version=POSTGRES_16 --tier=db-custom-2-8192 \
  --region=us-central1 \
  --network=projects/${PROJECT_ID}/global/networks/my-vpc \
  --no-assign-ip --availability-type=REGIONAL \
  --storage-type=SSD --storage-size=50GB --storage-auto-increase
```

## Read Replicas

```bash
# Same-region replica
gcloud sql instances create prod-db-replica-1 \
  --master-instance-name=prod-db --tier=db-custom-4-16384 \
  --region=us-central1 --availability-type=ZONAL

# Cross-region replica for DR
gcloud sql instances create prod-db-replica-eu \
  --master-instance-name=prod-db --tier=db-custom-4-16384 \
  --region=europe-west1 --availability-type=ZONAL

# Promote a replica to standalone (disaster recovery)
gcloud sql instances promote-replica prod-db-replica-eu
```

## Backups and Restore

```bash
gcloud sql backups create --instance=prod-db --description="pre-migration"
gcloud sql backups list --instance=prod-db

# Point-in-time recovery
gcloud sql instances clone prod-db prod-db-pitr \
  --point-in-time="2026-03-23T10:00:00Z"

# Export / import
gcloud sql export sql prod-db gs://my-bucket/export.sql.gz --database=myapp
gcloud sql import sql prod-db gs://my-bucket/export.sql.gz --database=myapp
```

## Cloud SQL Auth Proxy

```bash
curl -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.11.0/cloud-sql-proxy.linux.amd64
chmod +x cloud-sql-proxy

./cloud-sql-proxy ${PROJECT_ID}:us-central1:prod-db --port=5432 --auto-iam-authn

# Unix socket (for Kubernetes sidecar pattern)
./cloud-sql-proxy ${PROJECT_ID}:us-central1:prod-db --unix-socket=/tmp/cloudsql
psql "host=/tmp/cloudsql/${PROJECT_ID}:us-central1:prod-db user=appuser dbname=myapp"
```

## Connection Methods Summary

| Method | Use Case | Requirement |
|--------|----------|-------------|
| Public IP + SSL | Dev/test access | Authorized networks configured |
| Cloud SQL Auth Proxy | Production on GCE/GKE | SA with `roles/cloudsql.client` |
| Private IP | VPC-native apps | VPC peering configured |
| Cloud SQL Connector lib | App-level integration | SA credentials |

## Terraform Configuration

```hcl
resource "google_sql_database_instance" "main" {
  name             = "prod-db"
  database_version = "POSTGRES_16"
  region           = "us-central1"

  settings {
    tier              = "db-custom-4-16384"
    availability_type = "REGIONAL"
    disk_type         = "PD_SSD"
    disk_size         = 100
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings { retained_backups = 14 }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
      require_ssl     = true
    }

    maintenance_window { day = 7; hour = 4 }
    database_flags { name = "max_connections"; value = "200" }

    user_labels = { env = "production" }
  }

  deletion_protection = true
  depends_on          = [google_service_networking_connection.private_vpc]
}

resource "google_sql_database" "app" {
  name     = "myapp"
  instance = google_sql_database_instance.main.name
}

resource "google_sql_user" "app" {
  name     = "appuser"
  instance = google_sql_database_instance.main.name
  password = random_password.db_password.result
}

resource "google_sql_database_instance" "replica" {
  name                 = "prod-db-replica-1"
  master_instance_name = google_sql_database_instance.main.name
  region               = "us-central1"
  database_version     = "POSTGRES_16"

  replica_configuration { failover_target = false }

  settings {
    tier            = "db-custom-4-16384"
    disk_type       = "PD_SSD"
    disk_autoresize = true
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
  }
}

resource "google_compute_global_address" "private_ip" {
  name          = "google-managed-services"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}
```

## Common Operations

```bash
gcloud sql instances list
gcloud sql instances describe prod-db \
  --format="yaml(state,settings.tier,settings.availabilityType,ipAddresses)"
gcloud sql instances patch prod-db --storage-size=200GB
gcloud sql instances patch prod-db --database-flags=max_connections=300
gcloud sql instances restart prod-db
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Connection refused` via public IP | IP not in authorized networks | Add IP with `gcloud sql instances patch --authorized-networks` |
| `SSL required` error | `require_ssl=true` but client not using SSL | Use Cloud SQL Proxy or pass `sslmode=require` |
| High replication lag | Replica tier too small or write-heavy primary | Increase replica tier; reduce write load |
| Instance slow despite RUNNABLE | Under-provisioned CPU/memory | Scale tier with `gcloud sql instances patch --tier` |
| Proxy returns `ECONNREFUSED` | Wrong connection name or missing IAM role | Verify `project:region:instance` format; grant `roles/cloudsql.client` |
| Cannot create private IP instance | VPC peering not established | Run `gcloud services vpc-peerings connect` first |
| Backup restore fails | Incompatible version | Ensure same major database version between source and target |

## Related Skills

- **gcp-networking** - VPC and private service connect for Cloud SQL private IP
- **terraform-gcp** - Provision Cloud SQL with Infrastructure as Code
- **gcp-gke** - Connecting Kubernetes workloads to Cloud SQL via sidecar proxy
- **gcp-compute** - Running applications on Compute Engine that connect to Cloud SQL

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

