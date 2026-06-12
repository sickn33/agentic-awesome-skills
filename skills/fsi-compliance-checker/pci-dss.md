# PCI-DSS v4.0 — Engineering Control Reference

Engineering-relevant controls from PCI-DSS v4.0, organized by what a code/architecture change typically touches. Control numbers follow the official standard (PCI Security Standards Council). This is a working summary for triage, not the standard itself — for formal scoping consult the full standard and a QSA.

**Key v4.0 dates:** v4.0 became mandatory March 2024; the ~50 future-dated requirements (marked FD below) became mandatory **31 March 2025** — they are now in force.

## Contents

1. [Cardholder data handling (Req 3, 4)](#1-cardholder-data-handling)
2. [Authentication & access (Req 7, 8)](#2-authentication--access)
3. [Secure development (Req 6)](#3-secure-development)
4. [Logging & monitoring (Req 10)](#4-logging--monitoring)
5. [Network & segmentation (Req 1)](#5-network--segmentation)
6. [Payment page / client-side (Req 6.4.3, 11.6.1)](#6-payment-page--client-side)
7. [Quick triage table](#7-quick-triage-table)

## 1. Cardholder Data Handling

| Control | Requirement (summary) | Engineering check |
|---------|----------------------|-------------------|
| 3.2.1 | Don't store sensitive authentication data (CVV/CVC, full track, PIN) after authorization — ever, even encrypted | grep for CVV/CVC fields in models, logs, caches, analytics events |
| 3.3.1 | Mask PAN when displayed (max first 6 + last 4 visible) | UI components, receipts, admin screens, support tooling |
| 3.4.1 | Render PAN unreadable anywhere stored (strong crypto, truncation, tokens) | DB columns, backups, object storage, message queues, data lakes |
| 3.5.1 | Documented inventory of where account data is stored | New stores/caches must update the data-flow inventory |
| 3.6 / 3.7 | Key management: documented procedures, key rotation, split knowledge for manual operations | KMS usage, key rotation schedules, no keys in code/config |
| 4.2.1 | Strong cryptography for PAN over open/public networks; no fallback to insecure versions | TLS 1.2+ enforced, cert validation not disabled, no PAN over email/chat |

## 2. Authentication & Access

| Control | Requirement (summary) | Engineering check |
|---------|----------------------|-------------------|
| 7.2.1 | Access by least privilege, need-to-know, defined roles | New endpoints/services declare required roles; no wildcard IAM |
| 8.3.6 (FD) | Passwords minimum 12 characters with complexity | Password validators, policy configs |
| 8.3.9 | Password change every 90 days OR dynamic risk analysis OR MFA-always | Session/auth design |
| 8.4.2 (FD) | MFA for ALL access into the CDE (not just admins) | Auth flows for any CDE-touching application access |
| 8.6.1-8.6.3 (FD) | Interactive use of system/service accounts restricted; their passwords managed and rotated | Service account credentials in pipelines, cron jobs |
| 8.2.2 | No shared/group accounts except documented exceptional circumstances | Service design, break-glass procedures |

## 3. Secure Development

| Control | Requirement (summary) | Engineering check |
|---------|----------------------|-------------------|
| 6.2.1 | Software developed per secure SDLC, security throughout | Threat modeling, security stories, review gates exist |
| 6.2.4 | Engineering techniques preventing common attack classes (injection, XSS, etc.) | Parameterized queries, output encoding, input validation at boundaries |
| 6.3.1 | Security vulnerabilities identified and ranked (CVSS or equivalent) | Scanner integration, triage workflow |
| 6.3.2 (FD) | Inventory of bespoke and custom software, and third-party components (SBOM-like) | Dependency manifests current; new deps recorded |
| 6.3.3 | Critical/high patches within one month | Dependency update cadence |
| 6.4.1/6.4.2 | Public-facing web apps protected (WAF in blocking mode per 6.4.2 FD) | New public endpoints behind WAF |
| 6.5.1-6.5.6 | Change management: documented, tested, approved; separation of dev/test from prod; no prod data in test; no test accounts/data left in prod before release | CI/CD gates, seed data hygiene, environment separation |

## 4. Logging & Monitoring

| Control | Requirement (summary) | Engineering check |
|---------|----------------------|-------------------|
| 10.2.1 | Audit logs capture: individual user access to cardholder data, admin actions, auth attempts (success/failure), log access, security event types | Audit events emitted for these actions with user identity |
| 10.2.1.2 | All actions by accounts with admin access logged | Admin tooling, support backdoors |
| 10.3.1-10.3.4 | Logs protected from modification, access limited, integrity monitored | Append-only/immutable log storage, restricted access |
| 10.4.1 (FD: automated) | Daily review of security events — automated mechanisms required in v4.0 | Alerting rules exist for new security-relevant events |
| — | **Never log:** full PAN, CVV, passwords, full track data | grep logging statements in payment/auth paths |

## 5. Network & Segmentation

| Control | Requirement (summary) | Engineering check |
|---------|----------------------|-------------------|
| 1.2.5 / 1.2.6 | All services/ports/protocols identified, approved, with security features defined | New listeners/ports documented and justified |
| 1.3.1 / 1.3.2 | Inbound and outbound CDE traffic restricted to necessary only | Security group / firewall changes reviewed against data flows |
| 1.4.4 | Stored cardholder data not directly accessible from untrusted networks | No DB with card data reachable from public subnets |

## 6. Payment Page / Client-Side

The two controls that catch most modern e-commerce teams (both FD, mandatory since 31 Mar 2025):

| Control | Requirement (summary) | Engineering check |
|---------|----------------------|-------------------|
| 6.4.3 | All payment-page scripts: inventoried, authorized, integrity-assured (e.g. SRI/CSP) | Script inventory for checkout pages; CSP headers; no unvetted tags |
| 11.6.1 | Change/tamper detection on payment pages, alerting on unauthorized modification | Monitoring on checkout page headers and script changes |

## 7. Quick Triage Table

| Change type | Check first |
|-------------|-------------|
| New logging | 3.2.1, never-log list (§4) |
| New data store/cache | 3.4.1, 3.5.1, 1.4.4 |
| Auth/session change | 8.3.x, 8.4.2, 10.2.1 |
| New dependency | 6.3.2, 6.3.3 |
| New public endpoint | 6.4.1/6.4.2, 1.2.x |
| Checkout/payment UI | 6.4.3, 11.6.1, 3.3.1 |
| CI/CD change | 6.5.1-6.5.6, 8.6.x |
| Infra/network change | 1.2.x, 1.3.x |
