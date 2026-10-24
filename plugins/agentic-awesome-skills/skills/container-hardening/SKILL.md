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
# Example for an application binary already built for this Alpine/musl runtime.
# Pin an approved immutable digest for real builds; refresh supported base images.
FROM alpine:3.24
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
WORKDIR /app
# Copy only the intended reviewed build artifact, not credentials or the entire repo.
COPY --chown=appuser:appgroup myapp /app/myapp
USER 1001:1001
ENTRYPOINT ["/app/myapp"]
```

## Runtime Security

```bash
# Run with security options
docker run -d \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64m \
  --security-opt=no-new-privileges:true \
  --cap-drop=ALL \
  --user 1001:1001 \
  myapp@sha256:REPLACE_WITH_REVIEWED_DIGEST
```

## Kubernetes Security Context

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: hardened-example
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1001
    fsGroup: 1001
  containers:
  - name: app
    image: myapp@sha256:REPLACE_WITH_REVIEWED_DIGEST
    resources:
      requests: {cpu: "100m", memory: "64Mi"}
      limits: {cpu: "500m", memory: "256Mi"}
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop: ["ALL"]
```

## Image Scanning

```bash
# Scan with Trivy
trivy image --exit-code 1 --severity HIGH,CRITICAL myapp@sha256:REPLACE_WITH_REVIEWED_DIGEST

# Consider a maintained distroless image only when the actual application is compatible;
# FROM belongs in a Dockerfile, not this shell scanning example.
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

- The Dockerfile needs a reviewed executable myapp built for the selected ABI; it is not bundled. Build dependencies were never installed in this stage, so do not run apk del against a nonexistent virtual group. Prefer a separate builder stage when compilation is needed.
- Replace digest placeholders with verified image identities before execution. The Pod YAML is a template; tune actual resource budgets and approved volumes, network policy and workload permissions. No Docker build, cluster application or scanner execution is claimed.
- Read-only filesystems and dropped capabilities reduce privileges but are not a complete sandbox. Add writable paths only where required; low ports do not justify NET_BIND_SERVICE by default. Scanning can disclose artifacts or use network databases, so review data paths and policies first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
command -v docker
docker --version
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
