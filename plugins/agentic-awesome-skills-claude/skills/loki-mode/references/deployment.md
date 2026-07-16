# Deployment Reference

Infrastructure provisioning and deployment instructions for all supported platforms.

## Deployment Decision Matrix

| Criteria | Vercel/Netlify | Railway/Render | AWS | GCP | Azure |
|----------|----------------|----------------|-----|-----|-------|
| Static/JAMstack | Best | Good | Overkill | Overkill | Overkill |
| Simple full-stack | Good | Best | Overkill | Overkill | Overkill |
| Scale to millions | No | Limited | Best | Best | Best |
| Enterprise compliance | Limited | Limited | Best | Good | Best |
| Cost at scale | Expensive | Moderate | Cheapest | Cheap | Moderate |
| Setup complexity | Trivial | Easy | Complex | Complex | Complex |

## Quick Start Commands

### Vercel
```bash
# Install CLI
npm i -g vercel

# Deploy (auto-detects framework)
vercel --prod

# Environment variables
vercel env add VARIABLE_NAME production
```

### Netlify
```bash
# Install CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod

# Environment variables
netlify env:set VARIABLE_NAME value
```

### Railway
```bash
# Install CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Environment variables
railway variables set VARIABLE_NAME=value
```

### Render
```yaml
# render.yaml (Infrastructure as Code)
services:
  - type: web
    name: api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: postgres
          property: connectionString

databases:
  - name: postgres
    plan: starter
```

---

## AWS Deployment

### Architecture Template
```
┌─────────────────────────────────────────────────────────┐
│                        CloudFront                        │
└─────────────────────────┬───────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
    ┌─────▼─────┐                   ┌─────▼─────┐
    │    S3     │                   │    ALB    │
    │ (static)  │                   │           │
    └───────────┘                   └─────┬─────┘
                                          │
                                    ┌─────▼─────┐
                                    │   ECS     │
                                    │  Fargate  │
                                    └─────┬─────┘
                                          │
                              ┌───────────┴───────────┐
                              │                       │
                        ┌─────▼─────┐           ┌─────▼─────┐
                        │    RDS    │           │ ElastiCache│
                        │ Postgres  │           │   Redis   │
                        └───────────┘           └───────────┘
```

### Terraform Configuration
```hcl
# main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "terraform-state-${var.project_name}"
    key    = "state.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "${var.project_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = var.environment != "production"
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS
module "rds" {
  source  = "terraform-aws-modules/rds/aws"
  version = "6.0.0"

  identifier = "${var.project_name}-db"

  engine               = "postgres"
  engine_version       = "15"
  family               = "postgres15"
  major_engine_version = "15"
  instance_class       = var.environment == "production" ? "db.t3.medium" : "db.t3.micro"

  allocated_storage = 20
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  port     = 5432

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids             = module.vpc.private_subnets

  backup_retention_period = var.environment == "production" ? 7 : 1
  deletion_protection     = var.environment == "production"
}
```

### ECS Task Definition
```json
{
  "family": "app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "${ECR_REPO}:${TAG}",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"}
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-url"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3
      }
    }
  ]
}
```

### GitHub Actions CI/CD
```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: app
  ECS_SERVICE: app-service
  ECS_CLUSTER: app-cluster

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, and push image
        id: build-image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          echo "image=$ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

---

## GCP Deployment

### Cloud Run (Recommended for most cases)
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/app
gcloud run deploy app \
  --image gcr.io/PROJECT_ID/app \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="DATABASE_URL=db-url:latest"
```

### Terraform for GCP
```hcl
provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud Run Service
resource "google_cloud_run_service" "app" {
  name     = "app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/app:latest"
        
        ports {
          container_port = 3000
        }

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name = "DATABASE_URL"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_url.secret_id
              key  = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "10"
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.main.connection_name
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}

# Cloud SQL
resource "google_sql_database_instance" "main" {
  name             = "app-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro"

    backup_configuration {
      enabled = true
    }
  }

  deletion_protection = var.environment == "production"
}
```

---

## Azure Deployment

### Azure Container Apps
```bash
# Create resource group
az group create --name app-rg --location eastus

# Create Container Apps environment
az containerapp env create \
  --name app-env \
  --resource-group app-rg \
  --location eastus

# Deploy container
az containerapp create \
  --name app \
  --resource-group app-rg \
  --environment app-env \
  --image myregistry.azurecr.io/app:latest \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 10 \
  --env-vars "NODE_ENV=production"
```

---

## Kubernetes Deployment

### Manifests
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  labels:
    app: app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: app
  template:
    metadata:
      labels:
        app: app
    spec:
      containers:
        - name: app
          image: app:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: app
spec:
  selector:
    app: app
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: app
                port:
                  number: 80
```

### Helm Chart Structure
```
chart/
├── Chart.yaml
├── values.yaml
├── values-staging.yaml
├── values-production.yaml
└── templates/
    ├── deployment.yaml
    ├── service.yaml
    ├── ingress.yaml
    ├── configmap.yaml
    ├── secret.yaml
    └── hpa.yaml
```

---

## Blue-Green Deployment

### Strategy
```
1. Deploy new version to "green" environment
2. Run smoke tests against green
3. Switch load balancer to green
4. Monitor for 15 minutes
5. If healthy: decommission blue
6. If errors: switch back to blue (rollback)
```

### Implementation (AWS ALB)
```bash
# Deploy green
aws ecs update-service --cluster app --service app-green --task-definition app:NEW_VERSION

# Wait for stability
aws ecs wait services-stable --cluster app --services app-green

# Run smoke tests
curl -f https://green.app.example.com/health

# Switch traffic (update target group weights)
aws elbv2 modify-listener-rule \
  --rule-arn $RULE_ARN \
  --actions '[{"Type":"forward","TargetGroupArn":"'$GREEN_TG'","Weight":100}]'
```

---

## Rollback Procedures

### Immediate Rollback
```bash
# AWS ECS
aws ecs update-service --cluster app --service app --task-definition app:PREVIOUS_VERSION

# Kubernetes
kubectl rollout undo deployment/app

# Vercel
vercel rollback
```

### Automated Rollback Triggers
Monitor these metrics post-deploy:
- Error rate > 1% for 5 minutes
- p99 latency > 500ms for 5 minutes
- Health check failures > 3 consecutive
- Memory usage > 90% for 10 minutes

If any trigger fires, execute automatic rollback.

---

## Secrets Management

### AWS Secrets Manager
```bash
# Create secret
aws secretsmanager create-secret \
  --name app/database-url \
  --secret-string "postgresql://..."

# Reference in ECS task
"secrets": [
  {
    "name": "DATABASE_URL",
    "valueFrom": "arn:aws:secretsmanager:region:account:secret:app/database-url"
  }
]
```

### HashiCorp Vault
```bash
# Store secret
vault kv put secret/app database-url="postgresql://..."

# Read in application
vault kv get -field=database-url secret/app
```

### Environment-Specific
```
.env.development   # Local development
.env.staging       # Staging environment
.env.production    # Production (never commit)
```

All production secrets must be in a secrets manager, never in code or environment files.
