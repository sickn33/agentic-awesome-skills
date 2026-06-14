---
name: security-checklist
description: Reference document for monopoly security-checklist.
risk: safe
reports-to: monopoly
---

# MONOPOLY — Security Hardening Checklist

## Network Security
- [ ] All services inside private VPC; only LB/API GW exposed publicly
- [ ] Security groups follow least-privilege (deny all, allow specific ports/CIDRs)
- [ ] NACLs as secondary defense layer
- [ ] WAF enabled with OWASP top 10 ruleset
- [ ] DDoS protection (Cloudflare / AWS Shield Standard minimum)
- [ ] VPN or Private Link for inter-service communication in multi-region

## Authentication & Authorization
- [ ] JWT tokens with short expiry (15 min access, 7 day refresh)
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
- [ ] CORS policy locked down (not wildcard `*`)
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
- [ ] Data breach notification process defined (GDPR 72-hour rule)
- [ ] Regular penetration testing scheduled

## Compliance (as applicable)
- [ ] GDPR: data residency, right to deletion, consent tracking
- [ ] PCI-DSS: if handling card data — never store raw PANs
- [ ] HIPAA: if health data — encryption, audit logs, BAA with vendors
- [ ] SOC 2 Type II: access control, availability, confidentiality evidence


## Limitations
- This is a reference document and may not cover all edge cases. Always verify architectures before production.
