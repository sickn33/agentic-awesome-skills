---
name: gcp-compute
description: Manage Compute Engine instances and instance templates. Configure managed
  instance groups and preemptible VMs. Use when deploying compute resources on GCP.
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

# GCP Compute Engine

Deploy, manage, and scale Compute Engine virtual machines on Google Cloud Platform.

## When to Use

- Deploying web servers, application backends, or batch-processing workloads on GCP
- Running workloads that need full OS-level control (unlike Cloud Run or App Engine)
- Creating managed instance groups for auto-healing and auto-scaling behind a load balancer
- Provisioning GPU-attached VMs for ML training or rendering pipelines
- Cost-optimizing non-critical workloads with preemptible or spot VMs

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- A GCP project with the Compute Engine API enabled
- IAM role `roles/compute.admin` or scoped roles for instance management

```bash
gcloud auth list
gcloud config set project $PROJECT_ID
gcloud services enable compute.googleapis.com
```

## Machine Types Reference

| Family | Example | vCPUs | Memory | Use Case |
|--------|---------|-------|--------|----------|
| E2 | e2-micro | 0.25 | 1 GB | Dev/test, microservices |
| E2 | e2-medium | 1 | 4 GB | Light web servers |
| N2 | n2-standard-4 | 4 | 16 GB | General-purpose production |
| N2 | n2-highmem-8 | 8 | 64 GB | In-memory caches, databases |
| C2 | c2-standard-16 | 16 | 64 GB | Compute-intensive, HPC |

```bash
# List machine types available in a zone
gcloud compute machine-types list --zones=us-central1-a --filter="name~'e2-'"

# Create a custom machine type (6 vCPUs, 24 GB RAM)
gcloud compute instances create custom-vm \
  --custom-cpu=6 --custom-memory=24GB \
  --zone=us-central1-a \
  --image-family=debian-12 --image-project=debian-cloud
```

## Create an Instance

```bash
# Production instance with shielded VM and startup script
gcloud compute instances create web-server \
  --machine-type=e2-medium \
  --zone=us-central1-a \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-balanced \
  --tags=http-server,https-server \
  --labels=env=production,team=backend \
  --metadata=enable-oslogin=TRUE \
  --shielded-secure-boot \
  --shielded-vtpm \
  --shielded-integrity-monitoring

# Instance with a startup script and service account
gcloud compute instances create app-server \
  --machine-type=e2-standard-2 \
  --zone=us-central1-a \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --metadata-from-file=startup-script=startup.sh \
  --service-account=app-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --scopes=cloud-platform

# Instance with an additional data disk
gcloud compute instances create db-server \
  --machine-type=n2-highmem-4 \
  --zone=us-central1-a \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --create-disk=name=data-disk,size=200GB,type=pd-ssd,auto-delete=no
```

## Startup Script Example

```bash
#!/bin/bash
# startup.sh - runs on first boot and every reboot
set -euo pipefail
apt-get update && apt-get install -y nginx
systemctl enable nginx && systemctl start nginx
curl -X PUT -H "Metadata-Flavor: Google" \
  "http://metadata.google.internal/computeMetadata/v1/instance/guest-attributes/startup/status" \
  -d "complete"
```

## Instance Templates and Managed Instance Groups

```bash
# Create an instance template
gcloud compute instance-templates create web-template \
  --machine-type=e2-medium \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=20GB --tags=http-server \
  --metadata-from-file=startup-script=startup.sh

# Create a regional managed instance group (MIG) with health check
gcloud compute health-checks create http http-health-check \
  --port=80 --request-path=/healthz \
  --check-interval=10s --timeout=5s \
  --healthy-threshold=2 --unhealthy-threshold=3

gcloud compute instance-groups managed create web-mig \
  --template=web-template --size=3 \
  --region=us-central1 \
  --health-check=http-health-check --initial-delay=120

# Configure autoscaling
gcloud compute instance-groups managed set-autoscaling web-mig \
  --region=us-central1 \
  --min-num-replicas=2 --max-num-replicas=10 \
  --target-cpu-utilization=0.65 --cool-down-period=90

# Rolling update to a new template
gcloud compute instance-groups managed rolling-action start-update web-mig \
  --version=template=web-template-v2 \
  --region=us-central1 --max-surge=3 --max-unavailable=0
```

## Preemptible and Spot VMs

```bash
# Spot VM (recommended over legacy preemptible)
gcloud compute instances create spot-worker \
  --machine-type=n2-standard-8 \
  --zone=us-central1-a \
  --image-family=debian-12 --image-project=debian-cloud \
  --provisioning-model=SPOT \
  --instance-termination-action=STOP

# Spot instance template for batch MIG
gcloud compute instance-templates create batch-template \
  --machine-type=n2-standard-4 \
  --image-family=debian-12 --image-project=debian-cloud \
  --provisioning-model=SPOT \
  --instance-termination-action=DELETE
```

## Snapshots and Images

```bash
# Create a snapshot
gcloud compute disks snapshot web-server \
  --zone=us-central1-a \
  --snapshot-names=web-server-snap-$(date +%Y%m%d)

# Scheduled snapshot policy
gcloud compute resource-policies create snapshot-schedule daily-backup \
  --region=us-central1 --max-retention-days=14 \
  --daily-schedule --start-time=03:00

gcloud compute disks add-resource-policies web-server \
  --zone=us-central1-a --resource-policies=daily-backup

# Create a custom image from an instance
gcloud compute instances stop web-server --zone=us-central1-a
gcloud compute images create web-golden-image \
  --source-disk=web-server --source-disk-zone=us-central1-a \
  --family=web-server --labels=version=v1
```

## Terraform Configuration

```hcl
resource "google_compute_instance" "web" {
  name         = "web-server"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  tags         = ["http-server", "https-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
      type  = "pd-balanced"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.main.id
    access_config {}
  }

  metadata_startup_script = file("${path.module}/startup.sh")

  service_account {
    email  = google_service_account.app.email
    scopes = ["cloud-platform"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }
}

resource "google_compute_instance_template" "web" {
  name_prefix  = "web-"
  machine_type = "e2-medium"

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
  }

  network_interface {
    subnetwork = google_compute_subnetwork.main.id
  }

  lifecycle { create_before_destroy = true }
}

resource "google_compute_region_instance_group_manager" "web" {
  name               = "web-mig"
  base_instance_name = "web"
  region             = "us-central1"

  version {
    instance_template = google_compute_instance_template.web.id
  }

  target_size = 3
  named_port { name = "http"; port = 80 }

  auto_healing_policies {
    health_check      = google_compute_health_check.http.id
    initial_delay_sec = 120
  }
}

resource "google_compute_region_autoscaler" "web" {
  name   = "web-autoscaler"
  region = "us-central1"
  target = google_compute_region_instance_group_manager.web.id

  autoscaling_policy {
    min_replicas    = 2
    max_replicas    = 10
    cooldown_period = 90
    cpu_utilization { target = 0.65 }
  }
}
```

## Common Operations

```bash
# SSH into an instance
gcloud compute ssh web-server --zone=us-central1-a

# List all instances with status
gcloud compute instances list \
  --format="table(name,zone,status,machineType.basename())"

# Stop / start / resize
gcloud compute instances stop web-server --zone=us-central1-a
gcloud compute instances set-machine-type web-server \
  --machine-type=e2-standard-4 --zone=us-central1-a
gcloud compute instances start web-server --zone=us-central1-a

# View serial port output (debug startup scripts)
gcloud compute instances get-serial-port-output web-server --zone=us-central1-a
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Instance stuck in STAGING | Quota exceeded or resource unavailable | Check quota with `gcloud compute project-info describe`; try another zone |
| Startup script not running | Syntax errors or wrong metadata key | Check serial output; ensure key is `startup-script` not `startup_script` |
| Cannot SSH | Firewall blocks port 22 or OS Login misconfigured | Add firewall rule for `tcp:22`; verify `enable-oslogin` metadata |
| Preempted too often | Zone resource pressure | Use Spot VM with `STOP` action; spread across zones in a MIG |
| Disk out of space | Boot disk too small | Use `gcloud compute disks resize`; enable `--storage-auto-increase` for data disks |
| MIG not healing | Health check misconfigured or initial delay too short | Verify health check path returns 200; increase `--initial-delay` |

## Related Skills

- **gcp-networking** - VPC, firewall rules, and load balancers for Compute Engine
- **terraform-gcp** - Provision Compute Engine resources with Infrastructure as Code
- **gcp-gke** - When workloads are better suited for containers than VMs
- **gcp-cloud-sql** - Managed databases that Compute Engine applications connect to

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

