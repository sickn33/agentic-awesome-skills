---
name: threat-modeling
description: Conduct threat modeling using STRIDE methodology. Identify threats, assess
  risks, and design security controls. Use when designing secure systems or assessing
  application security.
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

# Threat Modeling

Identify and mitigate security threats during system design.

## When to Use This Skill

Use this skill when:
- Designing a new system, service, or feature
- Making significant architectural changes to existing systems
- Onboarding a new third-party integration or dependency
- Preparing for security audits or compliance reviews
- Responding to a security incident to improve defenses
- Reviewing infrastructure changes that affect trust boundaries

## Prerequisites

- System architecture documentation or design diagrams
- Access to development and operations teams for context
- Understanding of the system's data classification (PII, PHI, financial, etc.)
- OWASP Threat Dragon or Microsoft Threat Modeling Tool (optional but helpful)
- Whiteboard or diagramming tool for collaborative sessions

## STRIDE Methodology

| Threat | Description | Property Violated | Mitigation Examples |
|--------|-------------|-------------------|---------------------|
| **S**poofing | Pretending to be another user or system | Authentication | MFA, mTLS, API key validation, certificate pinning |
| **T**ampering | Modifying data in transit or at rest | Integrity | HMAC, digital signatures, checksums, immutable logs |
| **R**epudiation | Denying having performed an action | Non-repudiation | Audit logging, digital signatures, tamper-evident logs |
| **I**nformation Disclosure | Exposing data to unauthorized parties | Confidentiality | Encryption (TLS, AES), access controls, data masking |
| **D**enial of Service | Making service unavailable | Availability | Rate limiting, autoscaling, CDN, circuit breakers |
| **E**levation of Privilege | Gaining unauthorized higher access | Authorization | RBAC, principle of least privilege, input validation |

## STRIDE Worksheet Template

```yaml
# stride-worksheet.yaml - Fill out one per component/trust boundary crossing
component:
  name: "API Gateway"
  owner: "Platform Team"
  data_classification: "Confidential"
  trust_boundary: "External -> Internal"

threats:
  - id: T001
    category: Spoofing
    description: "Attacker forges JWT tokens to impersonate users"
    attack_vector: "Stolen signing key or weak algorithm (HS256 with guessable secret)"
    likelihood: Medium
    impact: Critical
    risk_score: 15  # likelihood(3) x impact(5)
    existing_controls:
      - "JWT validation on every request"
      - "RS256 algorithm with rotated keys"
    gaps:
      - "No token binding to device/IP"
    recommended_mitigations:
      - "Add token binding claims"
      - "Implement short-lived tokens (15 min) with refresh"
      - "Monitor for token reuse from different IPs"
    status: "Mitigated (partial)"
    owner: "Auth Team"

  - id: T002
    category: Tampering
    description: "Man-in-the-middle modifies API requests"
    attack_vector: "Compromised network between client and gateway"
    likelihood: Low
    impact: High
    risk_score: 8
    existing_controls:
      - "TLS 1.3 enforced"
      - "HSTS enabled"
    gaps: []
    recommended_mitigations:
      - "Certificate pinning for mobile clients"
    status: "Mitigated"
    owner: "Platform Team"

  - id: T003
    category: Information Disclosure
    description: "Verbose error messages leak internal details"
    attack_vector: "Triggering errors returns stack traces, internal IPs, DB schema"
    likelihood: High
    impact: Medium
    risk_score: 12
    existing_controls:
      - "Generic error pages in production"
    gaps:
      - "Some microservices return raw exceptions"
    recommended_mitigations:
      - "Centralized error handling middleware"
      - "Error response schema validation"
    status: "Open"
    owner: "Backend Team"

  - id: T004
    category: Denial of Service
    description: "API rate limiting bypass through distributed requests"
    attack_vector: "Botnet sending requests below per-IP threshold"
    likelihood: Medium
    impact: High
    risk_score: 12
    existing_controls:
      - "Per-IP rate limiting at WAF"
    gaps:
      - "No aggregate rate limiting"
      - "No bot detection"
    recommended_mitigations:
      - "Add aggregate rate limiting per endpoint"
      - "Deploy bot detection (Cloudflare Bot Management)"
      - "Implement circuit breaker pattern"
    status: "Open"
    owner: "Platform Team"

  - id: T005
    category: Elevation of Privilege
    description: "IDOR allows accessing other users' data"
    attack_vector: "Manipulating resource IDs in API calls"
    likelihood: Medium
    impact: Critical
    risk_score: 15
    existing_controls:
      - "Authentication required"
    gaps:
      - "Authorization checks inconsistent across endpoints"
    recommended_mitigations:
      - "Enforce ownership checks on all resource access"
      - "Use opaque IDs instead of sequential integers"
      - "Add authorization integration tests"
    status: "Open"
    owner: "Backend Team"
```

## Data Flow Diagram

### Text-Based DFD Notation

```
                    Trust Boundary: Internet
                    ==========================
                           |
                    [External User]
                           |
                      HTTPS/443
                           |
                    ==========================
                    Trust Boundary: DMZ
                    ==========================
                           |
                    (WAF / CDN)
                           |
                    [API Gateway]---->[Auth Service]--->[Identity DB]
                           |
                    ==========================
                    Trust Boundary: Internal
                    ==========================
                           |
                    [App Service]
                       /       \
                      /         \
               [Cache]       [Message Queue]
                                  |
                           [Worker Service]
                                  |
                    ==========================
                    Trust Boundary: Data
                    ==========================
                                  |
                           [Primary DB]--->[Replica DB]
                                  |
                           [Object Store]

Legend:
  [Box]     = Process
  (Parens)  = External entity / proxy
  ====      = Trust boundary
  --->      = Data flow
```

### Threat Dragon Model (JSON)

```json
{
  "summary": {
    "title": "E-Commerce Platform",
    "owner": "Security Team",
    "description": "Threat model for the e-commerce API platform"
  },
  "detail": {
    "diagrams": [
      {
        "title": "API Data Flow",
        "diagramType": "STRIDE",
        "cells": [
          {
            "type": "tm.Actor",
            "name": "Web Client",
            "threats": []
          },
          {
            "type": "tm.Process",
            "name": "API Gateway",
            "threats": ["T001", "T002", "T003", "T004"]
          },
          {
            "type": "tm.Process",
            "name": "Order Service",
            "threats": ["T005"]
          },
          {
            "type": "tm.Store",
            "name": "Orders Database",
            "threats": ["T006"]
          },
          {
            "type": "tm.Boundary",
            "name": "DMZ"
          },
          {
            "type": "tm.Boundary",
            "name": "Internal Network"
          }
        ]
      }
    ]
  }
}
```

## Threat Library

```yaml
# threat-library.yaml - Reusable threat patterns
categories:
  authentication:
    - id: TL-AUTH-001
      name: "Credential stuffing"
      description: "Attacker uses leaked credential databases to attempt logins"
      applicable_to: ["login endpoints", "API authentication"]
      mitigations: ["MFA", "rate limiting", "credential breach monitoring", "CAPTCHA"]

    - id: TL-AUTH-002
      name: "Session hijacking"
      description: "Attacker steals session tokens via XSS or network sniffing"
      applicable_to: ["web applications", "APIs with session tokens"]
      mitigations: ["HttpOnly cookies", "TLS", "session binding", "short TTL"]

    - id: TL-AUTH-003
      name: "OAuth token theft"
      description: "Access tokens stolen from logs, URLs, or insecure storage"
      applicable_to: ["OAuth/OIDC integrations"]
      mitigations: ["PKCE", "short-lived tokens", "token binding", "secure storage"]

  injection:
    - id: TL-INJ-001
      name: "SQL injection"
      description: "Malicious SQL in user input executes unauthorized queries"
      applicable_to: ["database-backed endpoints", "search functionality"]
      mitigations: ["parameterized queries", "ORM", "input validation", "WAF"]

    - id: TL-INJ-002
      name: "Command injection"
      description: "User input passed to system commands without sanitization"
      applicable_to: ["file processing", "system administration features"]
      mitigations: ["avoid shell commands", "input allowlisting", "sandboxing"]

    - id: TL-INJ-003
      name: "SSRF (Server-Side Request Forgery)"
      description: "Attacker makes server send requests to internal resources"
      applicable_to: ["URL fetching features", "webhook handlers", "PDF generators"]
      mitigations: ["URL allowlisting", "network segmentation", "metadata endpoint blocking"]

  supply_chain:
    - id: TL-SC-001
      name: "Dependency confusion"
      description: "Malicious package with internal name published to public registry"
      applicable_to: ["npm, pip, maven projects using private packages"]
      mitigations: ["namespace scoping", "registry prioritization", "SBOM monitoring"]

    - id: TL-SC-002
      name: "Compromised CI/CD pipeline"
      description: "Attacker injects malicious code through build system compromise"
      applicable_to: ["all software builds"]
      mitigations: ["SLSA compliance", "signed commits", "ephemeral builders", "provenance"]

  data:
    - id: TL-DATA-001
      name: "Unencrypted data at rest"
      description: "Sensitive data stored without encryption on disk or in database"
      applicable_to: ["databases", "object storage", "backups"]
      mitigations: ["AES-256 encryption", "KMS-managed keys", "encrypted volumes"]

    - id: TL-DATA-002
      name: "PII exposure in logs"
      description: "Personal data written to application or infrastructure logs"
      applicable_to: ["all services handling PII"]
      mitigations: ["log sanitization", "structured logging", "PII detection scanning"]
```

## Risk Scoring Matrix

### Likelihood Rating

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Very Low | Requires nation-state resources; no known exploits |
| 2 | Low | Requires significant expertise and specific conditions |
| 3 | Medium | Moderately skilled attacker with available tools |
| 4 | High | Script-kiddie level; public exploits available |
| 5 | Very High | Trivial to exploit; automated scanning detects it |

### Impact Rating

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Negligible | No data exposure; cosmetic only |
| 2 | Minor | Limited data exposure; single user affected |
| 3 | Moderate | Significant data exposure; service degradation |
| 4 | Major | Large-scale data breach; extended outage |
| 5 | Critical | Complete system compromise; regulatory breach |

### Risk Matrix

```
Impact ->     1        2        3        4        5
Likelihood
    5      Medium    High     High   Critical Critical
    4       Low     Medium    High    High   Critical
    3       Low      Low     Medium   High    High
    2      Info      Low      Low    Medium   High
    1      Info     Info      Low     Low    Medium
```

### Risk Treatment Decisions

```yaml
risk_treatment:
  critical:  # Score >= 20
    action: "Immediate remediation required"
    sla: "24 hours"
    approval: "CISO"
  high:      # Score 12-19
    action: "Remediation in current sprint"
    sla: "1 week"
    approval: "Security Lead"
  medium:    # Score 6-11
    action: "Remediation in next sprint"
    sla: "1 month"
    approval: "Team Lead"
  low:       # Score 2-5
    action: "Track and address in backlog"
    sla: "1 quarter"
    approval: "Team Lead"
  info:      # Score 1
    action: "Accept risk and document"
    sla: "None"
    approval: "Team Lead"
```

## OWASP Threat Dragon Setup

```bash
# Run Threat Dragon locally with Docker
docker run -d \
  --name threat-dragon \
  -p 3000:3000 \
  -e ENCRYPTION_KEYS='["threat-dragon-encryption-key-change-me"]' \
  -e NODE_ENV=production \
  owasp/threat-dragon:v2.2.0

# Access at http://localhost:3000

# Or install as desktop application
# Download from: https://github.com/OWASP/threat-dragon/releases
```

### Integration with CI/CD

```yaml
# .github/workflows/threat-model-review.yml
name: Threat Model Review
on:
  pull_request:
    paths:
      - 'docs/threat-model/**'
      - 'architecture/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate threat model files
        run: |
          for model in docs/threat-model/*.yaml; do
            echo "Validating $model..."
            python -c "
          import yaml, sys
          with open('$model') as f:
              data = yaml.safe_load(f)
          required = ['component', 'threats']
          for r in required:
              if r not in data:
                  print(f'ERROR: Missing required field: {r}')
                  sys.exit(1)
          for t in data.get('threats', []):
              if t.get('status') == 'Open' and t.get('risk_score', 0) >= 12:
                  print(f'WARNING: High-risk open threat: {t[\"id\"]} - {t[\"description\"]}')
          print(f'OK: {len(data[\"threats\"])} threats documented')
          "
          done

      - name: Check for unaddressed critical threats
        run: |
          CRITICAL=$(grep -r "risk_score: \(1[5-9]\|2[0-5]\)" docs/threat-model/*.yaml | grep "status: \"Open\"" | wc -l)
          if [ "$CRITICAL" -gt 0 ]; then
            echo "WARNING: $CRITICAL critical/high-risk threats still open"
            echo "Review required before merging architectural changes"
          fi
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Threat model sessions are unproductive | Participants don't understand the system | Share architecture docs before the session; include a system walkthrough |
| Too many threats identified | Scope too broad | Focus on one component or trust boundary per session |
| Threats are too vague | No structured methodology | Use STRIDE per element; fill in the worksheet template for each |
| Team doesn't follow up on findings | No ownership or tracking | Assign each threat to a team with SLA; track in issue tracker |
| Threat model becomes stale | No trigger to update | Require review on architecture changes (CI/CD gate on diagram changes) |
| Disagreements on risk scores | Subjective scoring | Use the scoring matrix consistently; calibrate with historical incidents |

## Best Practices

- Integrate threat modeling into the SDLC at the design phase
- Review threat models when architecture changes occur
- Include developers, ops, and security in sessions
- Use the threat library to ensure consistent coverage
- Document all risk acceptance decisions with rationale
- Track threats in the same system as other work items
- Conduct annual reviews of all active threat models
- Start with the most critical data flows and expand
- Keep sessions timeboxed (90 minutes maximum)
- Maintain a living threat library updated with new patterns

## Related Skills

- sast-scanning (`sast-scanning`) - Code analysis
- penetration-testing (`penetration-testing`) - Validation of threat model findings
- incident-response (`incident-response`) - Response when threats materialize

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
