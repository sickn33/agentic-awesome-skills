---
name: security-checklist
description: Review a scoped architecture against evidence-based network, identity, data, secrets, dependency and incident-response controls.
source: community
date_added: "2026-06-14"
risk: safe
reports-to: monopoly
---

# MONOPOLY — Security Hardening Checklist

## When to Use
- Use this skill when the task matches this description: Review a scoped architecture against evidence-based network, identity, data, secrets, dependency and incident-response controls.

## Network Security
- [ ] All services inside private VPC; only LB/API GW exposed publicly
- [ ] Security groups follow least-privilege (deny all, allow specific ports/CIDRs)
- [ ] NACLs as secondary defense layer
- [ ] WAF enabled with OWASP top 10 ruleset
- [ ] DDoS protection (Cloudflare / AWS Shield Standard minimum)
- [ ] VPN or Private Link for inter-service communication in multi-region

## Authentication & Authorization
- [ ] Token lifetimes, renewal and revocation follow a threat model; sample lifetimes are not universal requirements
- [ ] OAuth 2.0 / OIDC for third-party auth
- [ ] MFA enforced for admin accounts
- [ ] RBAC or ABAC for authorization
- [ ] No secrets in JWT payload (use opaque references)
- [ ] Token revocation strategy (Redis blocklist or short TTL)

## API Security
- [ ] Rate limiting at API gateway (per user, per IP, per endpoint)
- [ ] Input validation and sanitization on all endpoints
- [ ] SQL injection prevention (parameterized queries, ORM)
- [ ] XSS prevention (output encoding, CSP headers)
- [ ] CSRF protection (SameSite cookies, CSRF tokens)
- [ ] CORS matches the trust model; private credentialed APIs differ from public non-credentialed resources
- [ ] HTTP security headers (HSTS, X-Frame-Options, X-Content-Type-Options)

## Data Security
- [ ] Encryption in transit (TLS 1.2+ everywhere, TLS 1.3 preferred)
- [ ] Encryption at rest (AES-256 for DBs, S3 SSE)
- [ ] PII data identified, minimized, and encrypted at field level where needed
- [ ] Database backups encrypted
- [ ] No sensitive data in logs (PII, passwords, tokens, card numbers)

## Secrets Management
- [ ] No secrets in code or environment variables in plain text
- [ ] Secrets manager in use (HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager)
- [ ] Secrets rotation automated
- [ ] IAM roles for service-to-service auth (not static credentials)

## Supply Chain & Dependencies
- [ ] Dependency scanning (Snyk, Dependabot, npm audit)
- [ ] Container image scanning (Trivy, ECR scanning)
- [ ] Pin dependency versions in production
- [ ] SBOM (Software Bill of Materials) generated for compliance

## Incident Response
- [ ] Audit logs for all admin actions and data access
- [ ] Alerting on anomalous access patterns
- [ ] Incident response runbook documented
- [ ] Breach assessment and notification process matches the applicable jurisdiction, trigger, recipient and legal timeframe
- [ ] Regular penetration testing scheduled

## Compliance (as applicable)
- [ ] GDPR: lawful basis, transparency, rights, retention and lawful transfer safeguards where applicable
- [ ] PCI-DSS: establish card-data scope and current storage, masking, encryption and sensitive-authentication-data restrictions
- [ ] HIPAA: if health data — encryption, audit logs, BAA with vendors
- [ ] SOC 2 Type II: access control, availability, confidentiality evidence

## Example

**User request:**

> Review this Monopoly implementation against its security checklist and report each failed control with evidence.

## Limitations
- This is a reference document and may not cover all edge cases. Always verify architectures before production.

This checklist is not certification, legal advice or permission to apply controls. Verify current primary standards and actual architecture before marking compliance; a WAF, ORM, token or encrypted database does not prove the corresponding control. Do not force every cloud product onto a smaller system. Link each finding to exact revision, reachable risk and observed evidence.
