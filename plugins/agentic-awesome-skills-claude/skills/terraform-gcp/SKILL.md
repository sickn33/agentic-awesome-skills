---
name: terraform-gcp
description: Provision GCP infrastructure with Terraform. Configure providers and
  deploy Google Cloud resources. Use when implementing IaC for GCP.
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

# Terraform GCP

Provision and manage Google Cloud Platform infrastructure using Terraform with the `hashicorp/google` provider.

## When to Use

- Defining GCP infrastructure as code for repeatable, auditable deployments
- Managing multi-environment setups (dev, staging, production) from a single codebase
- Provisioning complex resource graphs (VPC + GKE + Cloud SQL + IAM) in one plan
- Integrating infrastructure changes into CI/CD pipelines with plan/apply stages

## Prerequisites

- Terraform >= 1.5 installed
- Google Cloud SDK or a service account key for CI
- A GCP project with billing enabled

```bash
gcloud auth application-default login          # local dev
export GOOGLE_APPLICATION_CREDENTIALS="sa.json" # CI/CD
terraform version
```

## Provider Configuration

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    google      = { source = "hashicorp/google";      version = "~> 5.0" }
    google-beta = { source = "hashicorp/google-beta"; version = "~> 5.0" }
  }
  backend "gcs" { bucket = "my-project-tf-state"; prefix = "terraform/state" }
}

provider "google"      { project = var.project_id; region = var.region }
provider "google-beta" { project = var.project_id; region = var.region }
```

```hcl
# variables.tf
variable "project_id"  { type = string }
variable "region"      { type = string; default = "us-central1" }
variable "environment" {
  type = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}
```

## Project Setup and State Bucket

```bash
gcloud storage buckets create gs://my-project-tf-state \
  --location=us-central1 --uniform-bucket-level-access --public-access-prevention
gcloud storage buckets update gs://my-project-tf-state --versioning

terraform init
terraform plan -var="project_id=my-project" -var="environment=production" -out=tfplan
terraform apply tfplan
```

```hcl
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com", "container.googleapis.com",
    "sqladmin.googleapis.com", "servicenetworking.googleapis.com",
    "cloudfunctions.googleapis.com", "run.googleapis.com",
    "secretmanager.googleapis.com", "artifactregistry.googleapis.com",
  ])
  project = var.project_id
  service = each.value
  disable_dependent_services = false
  disable_on_destroy         = false
}
```

## Networking Module

```hcl
# modules/networking/main.tf
resource "google_compute_network" "vpc" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

resource "google_compute_subnetwork" "main" {
  name                     = "${var.environment}-main-subnet"
  ip_cidr_range            = var.subnet_cidr
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true
  log_config { aggregation_interval = "INTERVAL_5_SEC"; flow_sampling = 0.5 }
}

resource "google_compute_subnetwork" "gke" {
  name                     = "${var.environment}-gke-subnet"
  ip_cidr_range            = var.gke_subnet_cidr
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true
  secondary_ip_range { range_name = "pods";     ip_cidr_range = var.pods_cidr }
  secondary_ip_range { range_name = "services"; ip_cidr_range = var.services_cidr }
}

resource "google_compute_firewall" "allow_iap" {
  name    = "${var.environment}-allow-iap"
  network = google_compute_network.vpc.name
  allow { protocol = "tcp"; ports = ["22", "3389"] }
  source_ranges = ["35.235.240.0/20"]
}

resource "google_compute_router" "router" {
  name    = "${var.environment}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "${var.environment}-nat"
  router                             = google_compute_router.router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  log_config { enable = true; filter = "ERRORS_ONLY" }
}

output "vpc_id"         { value = google_compute_network.vpc.id }
output "gke_subnet_id"  { value = google_compute_subnetwork.gke.id }
```

## GKE Cluster Module

```hcl
# modules/gke/main.tf
resource "google_container_cluster" "primary" {
  name     = "${var.environment}-cluster"
  location = var.region

  release_channel { channel = var.release_channel }
  workload_identity_config { workload_pool = "${var.project_id}.svc.id.goog" }
  network    = var.vpc_name
  subnetwork = var.gke_subnet_name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }
  private_cluster_config {
    enable_private_nodes   = true
    master_ipv4_cidr_block = "172.16.0.0/28"
  }
  network_policy { enabled = true }
  logging_config    { enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"] }
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
    managed_prometheus { enabled = true }
  }

  remove_default_node_pool = true
  initial_node_count       = 1
}

resource "google_container_node_pool" "primary" {
  name     = "primary-pool"
  cluster  = google_container_cluster.primary.name
  location = var.region

  initial_node_count = var.initial_node_count
  autoscaling { min_node_count = var.min_nodes; max_node_count = var.max_nodes }
  management  { auto_repair = true; auto_upgrade = true }

  node_config {
    machine_type = var.machine_type
    disk_size_gb = 100
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    shielded_instance_config { enable_secure_boot = true; enable_integrity_monitoring = true }
    metadata = { disable-legacy-endpoints = "true" }
  }
}

output "cluster_name"     { value = google_container_cluster.primary.name }
output "cluster_endpoint" { value = google_container_cluster.primary.endpoint; sensitive = true }
```

## Cloud SQL Module

```hcl
# modules/cloud-sql/main.tf
resource "google_sql_database_instance" "main" {
  name             = "${var.environment}-db"
  database_version = var.database_version
  region           = var.region

  settings {
    tier              = var.tier
    availability_type = var.environment == "production" ? "REGIONAL" : "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = var.disk_size
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      backup_retention_settings { retained_backups = var.environment == "production" ? 30 : 7 }
    }
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
      require_ssl     = true
    }
    database_flags { name = "max_connections"; value = var.max_connections }
  }

  deletion_protection = var.environment == "production"
  depends_on          = [var.private_vpc_connection]
}

resource "google_sql_database" "app" { name = var.database_name; instance = google_sql_database_instance.main.name }
resource "google_sql_user" "app"     { name = var.db_user; instance = google_sql_database_instance.main.name; password = random_password.db.result }
resource "random_password" "db"      { length = 32; special = true }

output "connection_name" { value = google_sql_database_instance.main.connection_name }
output "private_ip"      { value = google_sql_database_instance.main.private_ip_address }
```

## IAM and Service Accounts

```hcl
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.environment}-gke-nodes"
  display_name = "GKE Node Pool SA"
}

resource "google_project_iam_member" "gke_nodes" {
  for_each = toset([
    "roles/logging.logWriter", "roles/monitoring.metricWriter",
    "roles/artifactregistry.reader",
  ])
  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_service_account" "app" {
  account_id   = "${var.environment}-app"
  display_name = "Application SA"
}

resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[myapp/app-ksa]"
}
```

## Root Module Composition

```hcl
module "networking" {
  source      = "./modules/networking"
  project_id  = var.project_id
  environment = var.environment
  region      = var.region
}

module "gke" {
  source          = "./modules/gke"
  project_id      = var.project_id
  environment     = var.environment
  region          = var.region
  vpc_name        = module.networking.vpc_id
  gke_subnet_name = module.networking.gke_subnet_id
  node_sa_email   = google_service_account.gke_nodes.email
  depends_on      = [module.networking]
}

module "database" {
  source               = "./modules/cloud-sql"
  project_id           = var.project_id
  environment          = var.environment
  region               = var.region
  vpc_id               = module.networking.vpc_id
  database_version     = "POSTGRES_16"
  tier                 = "db-custom-4-16384"
  private_vpc_connection = module.networking.private_vpc_connection
  depends_on           = [module.networking]
}
```

## Environment Configuration

```hcl
# environments/production.tfvars
project_id  = "my-company-prod"
environment = "production"
region      = "us-central1"
```

```bash
terraform plan -var-file=environments/production.tfvars -out=tfplan
terraform apply tfplan
```

## CI/CD Integration

```bash
terraform init -input=false
terraform validate && terraform fmt -check
terraform plan -var-file=environments/${ENV}.tfvars -out=tfplan -input=false
terraform apply -input=false tfplan

# Import existing resources
terraform import google_compute_network.vpc projects/${PROJECT_ID}/global/networks/prod-vpc

# State management
terraform state list
terraform state mv google_compute_instance.old google_compute_instance.new
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `Error 403: Access Not Configured` | API not enabled | Add API to `google_project_service` resources |
| `Error acquiring the state lock` | Concurrent run or stale lock | Run `terraform force-unlock LOCK_ID` after verification |
| `Resource already exists` | Created outside Terraform | Import with `terraform import` |
| `Quota exceeded` | Project quota too low | Request increase in Cloud Console > Quotas |
| Plan shows destroy/recreate | Changed force-new attribute | Use `moved` blocks or `terraform state mv` |
| `Backend initialization required` | Changed backend config | Run `terraform init -migrate-state` |
| Cycle in resource graph | Circular references | Refactor with data sources; split applies |

## Related Skills

- **gcp-networking** - VPC and firewall resources managed by Terraform
- **gcp-gke** - GKE cluster provisioning with Terraform modules
- **gcp-cloud-sql** - Cloud SQL instance management via Terraform
- **gcp-compute** - Compute Engine resources defined in Terraform
- **gcp-cloud-functions** - Serverless function deployment with Terraform

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

