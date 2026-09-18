---
name: container-security-hardening
description: >
  Harden Docker/container images and runtime deployments with secure base images,
  non-root users, CVE scanning, SBOM/signing, seccomp/AppArmor, and Kubernetes
  pod security controls. Use for Dockerfile security reviews, container CVEs,
  image scanning, distroless images, or production hardening.
category: security
risk: safe
source: community
date_added: "2026-05-30"
---

# Container Security Hardening Skill

A production-focused guide for building, scanning, and running containers securely — from Dockerfile authoring through runtime enforcement and supply chain integrity.

---

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- User mentions Docker security, container hardening, or Dockerfile security review
- User asks about distroless images, non-root containers, or read-only filesystems
- User wants to scan images for CVEs with Trivy, Grype, or Snyk
- User mentions seccomp, AppArmor, Linux capabilities, or runtime security
- User asks "is my Dockerfile secure?" or "how do I reduce my image attack surface?"
- User wants to sign/verify images with Cosign or generate SBOMs
- User asks about Kubernetes pod security, NetworkPolicy, or RBAC hardening
- User says "fix container CVEs" or "harden my container for production"

## When NOT to Use This Skill

- The user is primarily asking about GitHub Actions CI/CD → recommend `github-actions-advanced`
- The user needs general Docker usage help (not security) → recommend `docker-expert`
- The user is working with Kubernetes orchestration beyond security → recommend `kubernetes-architect`
- The user needs application-level security (SQL injection, XSS) → recommend `api-security-best-practices`

---

## Security Checklist

### Dockerfile
- [ ] Minimal base image (distroless, slim, or alpine — not full debian/ubuntu)
- [ ] Multi-stage build — no build tools, devDependencies, or compilers in runtime image
- [ ] Non-root `USER` declared before `CMD`/`ENTRYPOINT`
- [ ] Base image pinned to `@sha256:...` digest (not just tag)
- [ ] No secrets in `ENV`, `ARG`, or `RUN` commands
- [ ] `HEALTHCHECK` defined
- [ ] OCI labels present (`org.opencontainers.image.*`)
- [ ] `.dockerignore` excludes `.git`, `.env`, secrets, tests
- [ ] `ENTRYPOINT` uses exec form, not shell form

### Image Scanning
- [ ] Trivy or Grype scan in CI (fails on HIGH/CRITICAL)
- [ ] Hadolint passes with no warnings
- [ ] Secret scan run on image (`trivy --scanners secret`)
- [ ] SBOM generated and stored
- [ ] `.trivyignore` has justified entries for accepted CVEs

### Runtime
- [ ] `--read-only` filesystem
- [ ] `--cap-drop ALL` (add back only what's documented as required)
- [ ] `--security-opt no-new-privileges:true`
- [ ] `--security-opt seccomp=<profile>` applied
- [ ] Resource limits set (`--memory`, `--cpus`, `--pids-limit`)
- [ ] Image signed with Cosign; verified before deploy

### Kubernetes
- [ ] `readOnlyRootFilesystem: true`
- [ ] `allowPrivilegeEscalation: false`
- [ ] `runAsNonRoot: true` with explicit UID
- [ ] `capabilities.drop: ["ALL"]`
- [ ] Resource `requests` and `limits` defined
- [ ] `automountServiceAccountToken: false`
- [ ] Namespace PSA enforced at `restricted` level
- [ ] `NetworkPolicy` default-deny applied
- [ ] RBAC uses specific resource names and minimal verbs

---

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific penetration testing or a formal security audit.
- Seccomp profiles and AppArmor are Linux-only; macOS/Windows Docker Desktop uses different mechanisms.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
