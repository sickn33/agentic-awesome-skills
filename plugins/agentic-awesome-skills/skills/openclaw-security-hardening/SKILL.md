---
name: openclaw-security-hardening
description: Harden OpenClaw self-hosted environments with baseline host controls,
  auth tightening, secret handling, network segmentation, and safe update/rollback
  workflows.
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

## When to Use

- Provisioning, hardening, or operating the infrastructure described in this skill within an authorized environment.


# OpenClaw Security Hardening

Use this skill to reduce exposure in self-hosted OpenClaw deployments before opening access to teammates or external networks.

## Build a Threat Model First

Map the highest-risk assets and paths:

- Admin/API endpoints for OpenClaw
- Provider API keys and model credentials
- Prompt/response logs containing sensitive business data
- Host-level access (SSH, local admin accounts, remote desktop)

Prioritize controls that reduce credential theft, remote code execution blast radius, and data exfiltration.

## Apply Baseline Host Hardening

1. Keep OS and package dependencies patched on a regular cadence.
2. Run OpenClaw as a dedicated non-admin user account.
3. Enable full-disk encryption and secure boot features where available.
4. Remove unnecessary services and block inbound ports by default.
5. Lock down remote admin (key-only SSH, no password login, limited source CIDRs).

Example Linux baseline checks:

```bash
id openclaw
sudo ss -tulpn
sudo ufw status verbose
sudo systemctl --failed
```

## Harden Application Runtime

- Bind OpenClaw to localhost or private VLAN by default.
- Place a reverse proxy in front of OpenClaw for TLS, auth, and rate limits.
- Enforce authentication on every non-health endpoint.
- Disable debug/dev modes in persistent environments.
- Restrict outbound egress to only required providers (LLM API, telemetry sink, package mirror).

Example reverse proxy controls to enforce:

- TLS 1.2+ only
- strict transport security header
- request body size limits
- request timeout and upstream timeout guardrails
- per-IP and per-token rate limiting

## Protect Secrets and Tokens

- Store secrets in a vault or platform secret manager, not committed `.env` files.
- Rotate provider and admin tokens on a fixed interval and after any incident.
- Scope tokens minimally (least privilege, per-service keys).
- Scan repos and deployment artifacts for leaked credentials before release.

Rotation checklist:

1. Generate replacement key.
2. Update runtime secret store.
3. Restart or reload OpenClaw.
4. Validate request success with new key.
5. Revoke old key.

## Segment Network Access

Use layered access patterns:

- **Tier 1 (private):** OpenClaw service port reachable only from app/proxy subnet.
- **Tier 2 (operator):** Admin plane reachable only from VPN/Tailscale/WireGuard.
- **Tier 3 (public):** Expose only hardened reverse proxy with strict ACLs.

Do not publish raw OpenClaw service ports directly to the internet.

## Add Detection and Recovery Paths

- Centralize auth, error, and audit logs.
- Alert on brute-force attempts, token failures, and unusual outbound traffic.
- Capture immutable backup snapshots of configs and prompt data retention settings.
- Test rollback and restore procedures every release cycle.

Minimum operational runbook:

- service restart path
- key revocation path
- incident isolation path (network block + token disable)
- known-good rollback version

## Validation Checklist

- All sensitive endpoints require auth and are unreachable without VPN or gateway policy.
- Secrets are absent from repo history and plaintext shared directories.
- Host firewall default deny is active for inbound traffic.
- TLS termination and rate limits are active at ingress.
- Rollback drill can restore service within target RTO.

## Related Skills

- openclaw-local-mac-mini (`openclaw-local-mac-mini`) - Local OpenClaw hosting setup
- multi-tenant-llm-hosting (`multi-tenant-llm-hosting`) - Multi-tenant AI isolation patterns
- zero-trust (`zero-trust`) - Private access and identity-aware network controls

## When to Use

- You are provisioning, configuring, or troubleshooting the infrastructure component covered by this skill (servers, storage, databases, networking, cloud, local AI).

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

