---
name: openclaw-deployment-hardening
description: Secure OpenClaw deployments with preflight hardening checks, CI/CD guardrails,
  container runtime restrictions, and post-deploy verification.
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

# OpenClaw Deployment Hardening

Use this skill to add repeatable security gates around OpenClaw build and deployment workflows.

## Enforce a Secure Build Pipeline

Add mandatory controls to CI before artifacts are promoted:

1. Dependency and lockfile vulnerability scan (fail on critical CVEs).
2. Image scan for OS/package vulnerabilities.
3. Secret scanning across source and build context.
4. SBOM generation and artifact signing.
5. Policy check that blocks deploy when controls fail.

Example CI step order (run in a CI shell that stops on failure, with reviewed/pinned tools and an image already built and its reviewed sha256 digest supplied as IMAGE_DIGEST):

```bash
# Build
npm ci
npm run build

# Security gates
trivy fs --scanners vuln,secret --severity HIGH,CRITICAL --exit-code 1 .
trivy image --severity HIGH,CRITICAL --exit-code 1 "my-registry/openclaw@${IMAGE_DIGEST}"
syft "my-registry/openclaw@${IMAGE_DIGEST}" -o spdx-json > sbom.json
# Keep signing keys out of source; sign the exact digest scanned above.
cosign sign --key /secure/path/cosign.key "my-registry/openclaw@${IMAGE_DIGEST}"
```

Trivy reports findings without failing by default; explicit `--exit-code` makes the examples gates. Pin and record the scanned digest, use that same digest for SBOM/signing/promotion, and verify signatures against an explicitly trusted key or identity. These commands do not implement the full pipeline alone. See [Trivy exit-code behavior](https://trivy.dev/docs/latest/configuration/others/).

## Lock Down Container Runtime

Run OpenClaw with restrictive defaults:

- Non-root user in container
- Read-only root filesystem where possible
- Drop all Linux capabilities, add back only required
- `no-new-privileges` enabled
- Constrained CPU/memory limits to reduce abuse impact
- Seccomp/AppArmor (or equivalent) profile enforced

Kubernetes-oriented expectations:

- `runAsNonRoot: true`
- `allowPrivilegeEscalation: false`
- `readOnlyRootFilesystem: true`
- network policy deny-all baseline with explicit allow rules

## Gate Production Promotion

Require explicit promotion checks:

- Security sign-off on CVE exceptions.
- Signed artifact verification in deployment stage.
- Drift check between expected and live manifest values.
- Deployment only from immutable tags or digests.

Avoid mutable `latest` tags for production OpenClaw services.

## Protect Data and Session Surfaces

- Minimize prompt/response retention by policy.
- Mask secrets and PII in logs before shipping to SIEM.
- Encrypt persistent volumes and backups.
- Isolate tenant/session data boundaries when serving multiple teams.

## Post-Deploy Verification

Run a hardening smoke test immediately after rollout:

```bash
kubectl get pods -n openclaw
kubectl auth can-i --as=system:serviceaccount:openclaw:default list secrets -n openclaw
kubectl get networkpolicy -n openclaw
kubectl logs deploy/openclaw -n openclaw --tail=200
```

Verify:

- Pod security context matches policy.
- Service account permissions are least privilege.
- Ingress auth/rate limits are effective.
- No plaintext secrets appear in logs.

## Incident-Ready Rollback Pattern

Maintain a hardened rollback workflow:

1. Freeze further rollouts.
2. Revoke suspect tokens and rotate secrets.
3. Roll back to last signed known-good image digest.
4. Re-run post-deploy hardening verification.
5. Capture timeline and artifacts for forensics.

## Related Skills

- container-hardening (`container-hardening`) - Container security baseline controls
- kubernetes-hardening (`kubernetes-hardening`) - Pod and cluster hardening patterns
- sbom-supply-chain (`sbom-supply-chain`) - SBOM, signing, and provenance controls

## When to Use

- You need the security workflow covered by this skill (secrets, scanning, network defense, operations, AI security) inside an authorized scope.

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
