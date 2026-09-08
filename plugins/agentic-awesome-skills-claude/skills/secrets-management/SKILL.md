---
name: secrets-management
description: "Secure secrets management practices for CI/CD pipelines using Vault, AWS Secrets Manager, and other tools."
risk: critical
source: community
date_added: "2026-02-27"
---

# Secrets Management

## When to Use

Design or repair secret retrieval, CI credentials, workload identity, access policies and rotation for an authorized system.

## Inputs

Identify secret names and owners, consumers, environments, authentication mechanism and the rotation/recovery policy. Inspect configuration without displaying values.

## Procedure

1. Choose the existing supported backend: Vault, a cloud secret manager or the host's protected secret store. Keep environment boundaries and minimum privileges explicit.
2. For Vault, read `references/vault-setup.md`. Development mode and root tokens are not production configuration.
3. For GitHub Actions, read `references/github-secrets.md`. Keep pull-request validation separate from privileged jobs. Supply values to the consuming process, never interpolate them into generated shell source or print them for debugging.
4. Prefer short-lived workload identity when the backend supports it. Check issuer, audience, workload/environment restrictions and denied access before enabling retrieval.
5. Rotate through prepare, consumer switch, verification and old-credential revocation. Use the backend's supported rotation protocol; retries must not leave the database and secret store on different credentials.
6. Inspect logs, error paths, artifacts and crash reports with synthetic secret markers. Record metadata such as operation, principal and outcome rather than values.

## Example

A deployment needs a database credential. The trusted job retrieves it through the configured identity and passes it only to the migration process. Test missing access and an expired identity in staging. Verify no credential appears in output, and that a failed rotation leaves a recoverable working state.

## Verification

- Authorized retrieval succeeds; a different workload or environment is denied.
- Missing credentials fail closed without exposing values.
- Rotation and rollback are exercised with synthetic data.
- Logs and artifacts contain no secret markers, including on failure.
- Exposed credentials are revoked or rotated; merely deleting their log entry is insufficient.

## Limitations

Masking cannot make logging secrets safe. Secret data can persist in infrastructure state, subprocess environments or backups; review those boundaries explicitly. Do not alter real credentials or deploy secret infrastructure without authorization.

## Sources

- [GitHub secure workflow guidance](https://docs.github.com/en/actions/reference/security/secure-use)
- [Vault production hardening](https://developer.hashicorp.com/vault/docs/concepts/production-hardening)
