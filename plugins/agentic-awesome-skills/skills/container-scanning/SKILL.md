---
name: container-scanning
description: Scan container images for vulnerabilities using Trivy, Grype, and cloud-native
  tools.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Container Scanning

Scan container images for vulnerabilities and security misconfigurations.

## When to Use This Skill

Use this skill when:
- Building container images
- Implementing container security gates
- Scanning registry images
- Meeting compliance requirements
- Hardening container deployments

## Prerequisites

- Container runtime (Docker, Podman)
- Container images to scan
- Scanning tool installation

## Tool Comparison

| Tool | License | Speed | Features |
|------|---------|-------|----------|
| Trivy | OSS | Fast | Comprehensive, IaC |
| Grype | OSS | Fast | Accurate, SBOM |
| Clair | OSS | Medium | Registry integration |
| Snyk Container | Commercial | Fast | Fix suggestions |
| Docker Scout | Commercial | Fast | GitHub integration |

## Trivy

### Installation

```bash
# Linux
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh -o /tmp/install-trivy.sh && sh /tmp/install-trivy.sh && rm /tmp/install-trivy.sh -s -- -b /usr/local/bin

# macOS
brew install trivy

# Docker
docker pull aquasec/trivy
```

### Image Scanning

```bash
# Scan local image
trivy image myapp:latest

# Scan remote image
trivy image nginx:1.25

# JSON output
trivy image --format json -o results.json myapp:latest

# Filter by severity
trivy image --severity HIGH,CRITICAL myapp:latest

# Ignore unfixed vulnerabilities
trivy image --ignore-unfixed myapp:latest

# Exit code on vulnerability
trivy image --exit-code 1 --severity CRITICAL myapp:latest
```

### Filesystem Scanning

```bash
# Scan project directory
trivy fs /path/to/project

# Scan Dockerfile
trivy config Dockerfile

# Scan Kubernetes manifests
trivy config k8s/
```

### Configuration

```yaml
# trivy.yaml
timeout: 10m
severity:
  - HIGH
  - CRITICAL
ignore-unfixed: true
exit-code: 1

vulnerability:
  type:
    - os
    - library

scan:
  file-patterns:
    - "Dockerfile"
    - "*.yaml"
```

### CI Integration

```yaml
# GitHub Actions
name: Container Security

on:
  push:
    branches: [main]
  pull_request:

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'myapp:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'

      - name: Upload results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

## Grype

### Installation

```bash
# Linux/macOS
curl -sSfL https://raw.githubusercontent.com/anchore/grype/main/install.sh -o /tmp/install-grype.sh && sh /tmp/install-grype.sh && rm /tmp/install-grype.sh -s -- -b /usr/local/bin

# Homebrew
brew install grype
```

### Usage

```bash
# Scan image
grype myapp:latest

# Scan from SBOM
grype sbom:./sbom.json

# JSON output
grype myapp:latest -o json > results.json

# Filter severity
grype myapp:latest --fail-on high

# Scan directory
grype dir:/path/to/project
```

### Configuration

```yaml
# .grype.yaml
check-for-app-update: false
fail-on-severity: high
output: "json"
scope: "Squashed"

ignore:
  - vulnerability: CVE-2023-12345
    reason: "False positive"
    expires: "2024-12-31"
```

## Docker Scout

### Usage

```bash
# Enable Docker Scout
docker scout quickview myapp:latest

# Full CVE report
docker scout cves myapp:latest

# Compare images
docker scout compare myapp:v1 myapp:v2

# Recommendations
docker scout recommendations myapp:latest
```

### CI Integration

```yaml
- name: Docker Scout
  uses: docker/scout-action@v1
  with:
    command: cves
    image: ${{ env.IMAGE_NAME }}
    sarif-file: scout-results.sarif
    summary: true
```

## Registry Integration

### Amazon ECR

```bash
# Enable scan on push
aws ecr put-image-scanning-configuration \
  --repository-name myapp \
  --image-scanning-configuration scanOnPush=true

# Get scan findings
aws ecr describe-image-scan-findings \
  --repository-name myapp \
  --image-id imageTag=latest

# Start manual scan
aws ecr start-image-scan \
  --repository-name myapp \
  --image-id imageTag=latest
```

### Azure ACR

```bash
# Enable Defender for Containers
az security pricing create \
  --name Containers \
  --tier Standard

# View scan results in Azure Portal or:
az acr repository show \
  --name myregistry \
  --image myapp:latest
```

### Google Artifact Registry

```bash
# Enable vulnerability scanning
gcloud artifacts repositories update myrepo \
  --location=us-central1 \
  --enable-vulnerability-scanning

# View vulnerabilities
gcloud artifacts docker images describe \
  us-central1-docker.pkg.dev/project/myrepo/myapp:latest \
  --show-package-vulnerability
```

## Admission Controllers

### OPA Gatekeeper

```yaml
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: k8sallowedrepos
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRepos
      validation:
        openAPIV3Schema:
          properties:
            repos:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedrepos
        
        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          satisfied := [good | repo = input.parameters.repos[_]; good = startswith(container.image, repo)]
          not any(satisfied)
          msg := sprintf("container <%v> has an invalid image repo <%v>", [container.name, container.image])
        }
```

### Kyverno

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-scan
spec:
  validationFailureAction: enforce
  rules:
    - name: check-vulnerabilities
      match:
        resources:
          kinds:
            - Pod
      verifyImages:
        - image: "*"
          attestations:
            - predicateType: cosign.sigstore.dev/attestation/vuln/v1
              conditions:
                - all:
                    - key: "{{ scanner.result.summary.criticalCount }}"
                      operator: Equals
                      value: "0"
```

## Scanning Policies

### Policy Definition

```yaml
# scan-policy.yaml
policies:
  - name: critical-vulnerabilities
    description: Block images with critical CVEs
    severity: CRITICAL
    action: block
    
  - name: high-vulnerabilities
    description: Warn on high severity CVEs
    severity: HIGH
    action: warn
    max_count: 5
    
  - name: age-policy
    description: Block images older than 30 days
    max_age_days: 30
    action: block
    
  - name: base-image
    description: Only allow approved base images
    allowed_bases:
      - alpine:3.18
      - ubuntu:22.04
      - python:3.11-slim
```

## Common Issues

### Issue: False Positives
**Problem**: Scanner reports non-exploitable vulnerabilities
**Solution**: Use ignore files, validate with context

### Issue: Slow Scans
**Problem**: Scanning takes too long
**Solution**: Use caching, scan incrementally, optimize image layers

### Issue: Unfixed Vulnerabilities
**Problem**: No patch available for CVE
**Solution**: Update base image, implement compensating controls

## Best Practices

- Scan in CI/CD pipeline
- Use minimal base images (Alpine, distroless)
- Update base images regularly
- Implement admission control
- Track vulnerabilities over time
- Set severity thresholds
- Document accepted risks
- Use multi-stage builds

## Related Skills

- docker-management (`docker-management`) - Container basics
- container-hardening (`container-hardening`) - Security hardening
- kubernetes-hardening (`kubernetes-hardening`) - K8s security

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
