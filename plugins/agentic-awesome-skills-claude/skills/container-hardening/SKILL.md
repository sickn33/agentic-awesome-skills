---
name: container-hardening
description: Secure Docker images and container runtime configurations.
category: security
risk: critical
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

# Container Hardening

Secure container images and runtime configurations.

## When to Use This Skill

Use this skill when:
- Building secure container images
- Hardening container deployments
- Meeting container security requirements
- Implementing defense in depth

## Dockerfile Security

```dockerfile
# Use minimal base image
FROM alpine:3.18

# Don't run as root
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# Copy with specific ownership
COPY --chown=appuser:appgroup . /app

# Remove unnecessary packages
RUN apk del --purge build-dependencies && \
    rm -rf /var/cache/apk/*

# Use non-root user
USER appuser

# Read-only filesystem support
WORKDIR /app
```

## Runtime Security

```bash
# Run with security options
docker run -d \
  --read-only \
  --tmpfs /tmp \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --user 1001:1001 \
  myapp:latest
```

## Kubernetes Security Context

```yaml
apiVersion: v1
kind: Pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
```

## Image Scanning

```bash
# Scan with Trivy
trivy image --severity HIGH,CRITICAL myapp:latest

# Use distroless images
FROM gcr.io/distroless/static-debian11
```

## Best Practices

- Use minimal base images
- Run as non-root user
- Enable read-only filesystem
- Drop all capabilities
- Scan images regularly
- Sign and verify images
- Use secrets management

## Related Skills

- container-scanning (`container-scanning`) - Vulnerability scanning
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
