---
name: gcp-gke
description: Deploy and manage Google Kubernetes Engine clusters. Configure node pools,
  networking, and workload identity. Use when running Kubernetes on GCP.
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

# Google Kubernetes Engine (GKE)

Deploy, operate, and scale managed Kubernetes clusters on Google Cloud Platform.

## When to Use

- Running containerized microservices at scale with automatic scaling and healing
- Workloads requiring fine-grained orchestration, service mesh, or custom scheduling
- Teams already invested in Kubernetes tooling (Helm, Argo CD, Flux)
- When Cloud Run's request-based model does not fit (long-running, stateful workloads)

## Prerequisites

- Google Cloud SDK (`gcloud`) and `kubectl` installed
- APIs enabled: Kubernetes Engine, Compute Engine
- IAM role `roles/container.admin` for cluster management

```bash
gcloud services enable container.googleapis.com compute.googleapis.com
gcloud components install kubectl
```

## Standard vs Autopilot

| Feature | Standard | Autopilot |
|---------|----------|-----------|
| Node management | You manage node pools | Google manages nodes |
| Pricing | Pay per node (VM) | Pay per pod resource request |
| GPU/TPU | Full support | Supported (with limits) |
| DaemonSets | Allowed | Restricted |
| Best for | Full control, specialized HW | Hands-off, cost-optimized |

## Create a Standard Cluster

```bash
gcloud container clusters create prod-cluster \
  --region=us-central1 --num-nodes=2 \
  --machine-type=e2-standard-4 --disk-size=100 \
  --enable-autoscaling --min-nodes=1 --max-nodes=5 \
  --enable-autorepair --enable-autoupgrade \
  --release-channel=regular \
  --workload-pool=${PROJECT_ID}.svc.id.goog \
  --enable-ip-alias --enable-network-policy \
  --enable-shielded-nodes \
  --logging=SYSTEM,WORKLOAD --monitoring=SYSTEM,WORKLOAD \
  --labels=env=production,team=platform

gcloud container clusters get-credentials prod-cluster --region=us-central1
```

## Create an Autopilot Cluster

```bash
gcloud container clusters create-auto autopilot-prod \
  --region=us-central1 --release-channel=regular \
  --workload-pool=${PROJECT_ID}.svc.id.goog \
  --network=my-vpc --subnetwork=gke-subnet
```

## Node Pools

```bash
# High-memory pool with taint
gcloud container node-pools create highmem-pool \
  --cluster=prod-cluster --region=us-central1 \
  --machine-type=n2-highmem-8 --disk-size=200 --disk-type=pd-ssd \
  --num-nodes=1 --enable-autoscaling --min-nodes=0 --max-nodes=4 \
  --node-labels=workload=memory-intensive \
  --node-taints=dedicated=highmem:NoSchedule

# GPU pool
gcloud container node-pools create gpu-pool \
  --cluster=prod-cluster --region=us-central1 \
  --machine-type=n1-standard-8 \
  --accelerator=type=nvidia-tesla-t4,count=1 \
  --num-nodes=0 --enable-autoscaling --min-nodes=0 --max-nodes=4 \
  --node-taints=nvidia.com/gpu=present:NoSchedule

# Spot pool for batch workloads
gcloud container node-pools create spot-pool \
  --cluster=prod-cluster --region=us-central1 \
  --machine-type=e2-standard-4 --spot \
  --num-nodes=0 --enable-autoscaling --min-nodes=0 --max-nodes=20 \
  --node-taints=cloud.google.com/gke-spot=true:NoSchedule
```

## Workload Identity

```bash
# Create GSA and grant permissions
gcloud iam service-accounts create app-gsa
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
  --member="serviceAccount:app-gsa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Create KSA and bind to GSA
kubectl create namespace myapp
kubectl create serviceaccount app-ksa --namespace=myapp
gcloud iam service-accounts add-iam-policy-binding \
  app-gsa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[myapp/app-ksa]"
kubectl annotate serviceaccount app-ksa --namespace=myapp \
  iam.gke.io/gcp-service-account=app-gsa@${PROJECT_ID}.iam.gserviceaccount.com
```

## Deploying Workloads

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: myapp
spec:
  replicas: 3
  selector:
    matchLabels: { app: web-app }
  template:
    metadata:
      labels: { app: web-app }
    spec:
      serviceAccountName: app-ksa
      containers:
      - name: web
        image: us-central1-docker.pkg.dev/PROJECT_ID/repo/web-app:v1.2.0
        ports: [{ containerPort: 8080 }]
        resources:
          requests: { cpu: 250m, memory: 512Mi }
          limits: { cpu: 500m, memory: 1Gi }
        readinessProbe:
          httpGet: { path: /healthz, port: 8080 }
          initialDelaySeconds: 5
        livenessProbe:
          httpGet: { path: /healthz, port: 8080 }
          initialDelaySeconds: 15
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels: { app: web-app }
---
apiVersion: v1
kind: Service
metadata: { name: web-app, namespace: myapp }
spec:
  selector: { app: web-app }
  ports: [{ port: 80, targetPort: 8080 }]
  type: ClusterIP
```

## Ingress with Managed SSL

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  namespace: myapp
  annotations:
    kubernetes.io/ingress.class: "gce"
    networking.gke.io/managed-certificates: "web-cert"
    kubernetes.io/ingress.global-static-ip-name: "web-static-ip"
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service: { name: web-app, port: { number: 80 } }
---
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata: { name: web-cert, namespace: myapp }
spec:
  domains: [app.example.com]
```

```bash
gcloud compute addresses create web-static-ip --global
```

## Terraform Configuration

```hcl
resource "google_container_cluster" "primary" {
  name     = "prod-cluster"
  location = "us-central1"

  release_channel { channel = "REGULAR" }
  workload_identity_config { workload_pool = "${var.project_id}.svc.id.goog" }

  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.gke.name

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes   = true
    master_ipv4_cidr_block = "172.16.0.0/28"
  }

  network_policy { enabled = true }
  logging_config { enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"] }
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
  location = "us-central1"

  initial_node_count = 2
  autoscaling { min_node_count = 1; max_node_count = 5 }
  management  { auto_repair = true; auto_upgrade = true }

  node_config {
    machine_type = "e2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-balanced"
    oauth_scopes = ["https://www.googleapis.com/auth/cloud-platform"]
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }
    metadata = { disable-legacy-endpoints = "true" }
  }
}

resource "google_compute_subnetwork" "gke" {
  name          = "gke-subnet"
  ip_cidr_range = "10.0.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.vpc.id

  secondary_ip_range { range_name = "pods";     ip_cidr_range = "10.4.0.0/14" }
  secondary_ip_range { range_name = "services"; ip_cidr_range = "10.8.0.0/20" }
}
```

## Common Operations

```bash
gcloud container clusters list
gcloud container clusters upgrade prod-cluster --region=us-central1 --master
kubectl top nodes && kubectl top pods --namespace=myapp
kubectl scale deployment web-app --replicas=5 --namespace=myapp
kubectl autoscale deployment web-app --namespace=myapp --min=3 --max=20 --cpu-percent=70
kubectl logs -f deployment/web-app --namespace=myapp --all-containers
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Pods stuck in `Pending` | No nodes with enough resources | Check autoscaler; add larger node pool; verify resource requests |
| `ImagePullBackOff` | Wrong image path or missing AR access | Verify image URL; grant `roles/artifactregistry.reader` to node SA |
| Workload Identity wrong account | KSA annotation missing | Re-annotate KSA; restart pods to pick up new token |
| Nodes `NotReady` | Disk/memory pressure or network issue | Run `kubectl describe node`; check taints and conditions |
| Ingress returns 502 | Backend pods failing health check | Verify readiness probe; check NEG health in Console |
| Cluster create quota error | Insufficient regional CPU/IP quota | Request quota increase in IAM & Admin > Quotas |
| Network policy not working | Not enabled on cluster | Recreate with `--enable-network-policy` or use Dataplane V2 |

## Related Skills

- **gcp-networking** - VPC, firewall rules, and load balancers for GKE clusters
- **terraform-gcp** - Provision GKE clusters with Infrastructure as Code
- **gcp-compute** - When workloads are better suited for VMs than containers
- **gcp-cloud-sql** - Connecting GKE pods to Cloud SQL via sidecar proxy

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

