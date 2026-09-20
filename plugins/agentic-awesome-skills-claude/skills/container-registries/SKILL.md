---
name: container-registries
description: Manage container registries including ECR, ACR, GCR, and Docker Hub.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Container Registries

Store, manage, and distribute container images across cloud and self-hosted registries.

## When to Use This Skill

Use this skill when:
- Pushing and pulling container images
- Configuring registry authentication
- Setting up image retention policies
- Managing private container registries
- Implementing image scanning and security

## Prerequisites

- Docker or Podman installed
- Cloud CLI tools (AWS CLI, az, gcloud) for respective registries
- Appropriate IAM permissions

## Docker Hub

### Authentication

```bash
# Login
docker login

# Login with token
echo "$DOCKER_TOKEN" | docker login -u username --password-stdin
```

### Push/Pull Images

```bash
# Tag image
docker tag myapp:latest username/myapp:latest

# Push
docker push username/myapp:latest

# Pull
docker pull username/myapp:latest
```

### Automated Builds

Configure in Docker Hub UI:
1. Connect GitHub/Bitbucket repository
2. Set build rules (branch → tag mapping)
3. Configure build context and Dockerfile path

## Amazon ECR

### Setup

```bash
# Create repository
aws ecr create-repository \
  --repository-name myapp \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Get registry URI
REGISTRY=$(aws ecr describe-repositories \
  --repository-names myapp \
  --query 'repositories[0].repositoryUri' \
  --output text | cut -d'/' -f1)
```

### Authentication

```bash
# Login (Docker)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $REGISTRY

# Login with credential helper
# Add to ~/.docker/config.json:
{
  "credHelpers": {
    "123456789.dkr.ecr.us-east-1.amazonaws.com": "ecr-login"
  }
}
```

### Push/Pull

```bash
# Tag and push
docker tag myapp:latest $REGISTRY/myapp:latest
docker push $REGISTRY/myapp:latest

# Pull
docker pull $REGISTRY/myapp:latest
```

### Lifecycle Policy

```bash
# Create lifecycle policy
aws ecr put-lifecycle-policy \
  --repository-name myapp \
  --lifecycle-policy-text '{
    "rules": [
      {
        "rulePriority": 1,
        "description": "Keep last 10 images",
        "selection": {
          "tagStatus": "any",
          "countType": "imageCountMoreThan",
          "countNumber": 10
        },
        "action": {
          "type": "expire"
        }
      }
    ]
  }'
```

### Repository Policy

```bash
# Allow cross-account access
aws ecr set-repository-policy \
  --repository-name myapp \
  --policy-text '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "CrossAccountPull",
        "Effect": "Allow",
        "Principal": {
          "AWS": "arn:aws:iam::OTHER_ACCOUNT:root"
        },
        "Action": [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
      }
    ]
  }'
```

## Azure Container Registry (ACR)

### Setup

```bash
# Create registry
az acr create \
  --resource-group mygroup \
  --name myregistry \
  --sku Standard \
  --admin-enabled false

# Get login server
az acr show --name myregistry --query loginServer -o tsv
```

### Authentication

```bash
# Login with Azure CLI
az acr login --name myregistry

# Login with service principal
docker login myregistry.azurecr.io \
  -u $SP_APP_ID \
  -p $SP_PASSWORD

# Get access token
az acr login --name myregistry --expose-token
```

### Push/Pull

```bash
# Tag and push
docker tag myapp:latest myregistry.azurecr.io/myapp:latest
docker push myregistry.azurecr.io/myapp:latest

# ACR Build (build in cloud)
az acr build \
  --registry myregistry \
  --image myapp:latest \
  --file Dockerfile .
```

### Retention Policy

```bash
# Enable retention policy
az acr config retention update \
  --registry myregistry \
  --status enabled \
  --days 30 \
  --type UntaggedManifests
```

### Geo-Replication

```bash
# Enable replication
az acr replication create \
  --registry myregistry \
  --location westeurope

# List replications
az acr replication list --registry myregistry
```

## Google Container Registry (GCR) / Artifact Registry

### Setup (Artifact Registry)

```bash
# Create repository
gcloud artifacts repositories create myrepo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Docker repository"
```

### Authentication

```bash
# Configure Docker auth
gcloud auth configure-docker us-central1-docker.pkg.dev

# Or use credential helper
gcloud auth print-access-token | \
  docker login -u oauth2accesstoken --password-stdin \
  https://us-central1-docker.pkg.dev
```

### Push/Pull

```bash
# Tag for Artifact Registry
docker tag myapp:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/myrepo/myapp:latest

# Push
docker push us-central1-docker.pkg.dev/PROJECT_ID/myrepo/myapp:latest

# Pull
docker pull us-central1-docker.pkg.dev/PROJECT_ID/myrepo/myapp:latest
```

### Cleanup Policy

```bash
# Create cleanup policy
gcloud artifacts repositories set-cleanup-policies myrepo \
  --location=us-central1 \
  --policy=policy.json

# policy.json
{
  "name": "delete-old",
  "action": {"type": "Delete"},
  "condition": {
    "olderThan": "30d",
    "tagState": "untagged"
  }
}
```

## GitHub Container Registry (GHCR)

### Authentication

```bash
# Login with PAT
echo "$GITHUB_TOKEN" | docker login ghcr.io -u USERNAME --password-stdin
```

### Push/Pull

```bash
# Tag
docker tag myapp:latest ghcr.io/OWNER/myapp:latest

# Push
docker push ghcr.io/OWNER/myapp:latest

# Pull
docker pull ghcr.io/OWNER/myapp:latest
```

### Visibility Settings

Configure in GitHub:
1. Go to package settings
2. Change visibility (public/private)
3. Manage access for teams/users

## Self-Hosted Registry

### Deploy with Docker

```bash
# Run registry
docker run -d -p 5000:5000 \
  --name registry \
  -v registry-data:/var/lib/registry \
  registry:2

# Configure TLS
docker run -d -p 443:5000 \
  --name registry \
  -v /certs:/certs \
  -v registry-data:/var/lib/registry \
  -e REGISTRY_HTTP_TLS_CERTIFICATE=/certs/domain.crt \
  -e REGISTRY_HTTP_TLS_KEY=/certs/domain.key \
  registry:2
```

### Harbor Registry

```bash
# Download Harbor
wget https://github.com/goharbor/harbor/releases/download/v2.9.0/harbor-online-installer-v2.9.0.tgz
tar xzvf harbor-online-installer-v2.9.0.tgz

# Configure harbor.yml
# Set hostname, https certificate, admin password

# Install
./install.sh --with-trivy --with-chartmuseum
```

## Image Security

### Vulnerability Scanning

```bash
# ECR - Enable scan on push
aws ecr put-image-scanning-configuration \
  --repository-name myapp \
  --image-scanning-configuration scanOnPush=true

# Get scan results
aws ecr describe-image-scan-findings \
  --repository-name myapp \
  --image-id imageTag=latest

# ACR - Scan with Defender
az acr task create \
  --registry myregistry \
  --name scan-images \
  --cmd "mcr.microsoft.com/azure-cli az acr run-scan"
```

### Image Signing

```bash
# Enable content trust
export DOCKER_CONTENT_TRUST=1

# Sign image on push
docker push myregistry/myapp:latest

# Verify signature
docker trust inspect myregistry/myapp:latest
```

## Common Issues

### Issue: Authentication Expired
**Problem**: Push/pull fails with auth error
**Solution**: Re-run login command, check credential helper

### Issue: Image Not Found
**Problem**: Pull fails with manifest unknown
**Solution**: Verify tag exists, check registry URL

### Issue: Push Permission Denied
**Problem**: Cannot push to repository
**Solution**: Check IAM permissions, verify repository exists

### Issue: Rate Limiting (Docker Hub)
**Problem**: Too many requests error
**Solution**: Authenticate for higher limits, use pull-through cache

## Best Practices

- Enable vulnerability scanning on all repositories
- Implement lifecycle policies to manage storage costs
- Use immutable tags for production images
- Configure cross-region replication for availability
- Use service accounts/principals for CI/CD authentication
- Enable audit logging for compliance
- Implement image signing for supply chain security
- Use pull-through cache to avoid rate limits

## Related Skills

- docker-management (`docker-management`) - Building images
- container-scanning (`container-scanning`) - Security scanning
- aws-iam (`aws-iam`) - AWS permissions

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
