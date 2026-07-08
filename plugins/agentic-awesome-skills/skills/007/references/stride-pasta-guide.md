# STRIDE & PASTA Threat Modeling Guide

> Practical guide for threat modeling systems, APIs, and AI agents.
> Use this when performing `007 threat-model` or any security analysis that requires structured threat identification.

---

## When to Use What

| Method | Best For | Effort | Output |
|--------|----------|--------|--------|
| **STRIDE** | Component-level analysis, quick threat identification | Low-Medium | List of threats per component |
| **PASTA** | Full system risk analysis, business-aligned | Medium-High | Prioritized attack scenarios |
| **Both** | Critical systems, compliance requirements | High | Complete threat landscape |

**Rule of thumb:**
- Quick code review or PR? -> STRIDE on changed components
- New system design or architecture review? -> PASTA full process
- Production system with sensitive data? -> Both (PASTA for strategy, STRIDE for each component)

---

## STRIDE Walkthrough

STRIDE categorizes threats into six types. For each, ask: "Can an attacker do this to my system?"

### S - Spoofing (Identity)

**Question:** Can someone pretend to be another user, service, or component?

**Examples:**
```
# API without authentication
GET /api/users/123/data  # Anyone can access any user's data

# Forged JWT with weak secret
jwt.encode({"user_id": "admin", "role": "superuser"}, "password123")

# Webhook without origin verification
POST /webhooks/payment  # No signature validation, anyone can send fake events
```

**Detection patterns:** Missing auth middleware, hardcoded/weak secrets, no mutual TLS between services.

**Mitigations:** Strong authentication (OAuth 2.0, mTLS), HMAC signature validation, API key rotation.

---

### T - Tampering (Data Integrity)

**Question:** Can someone modify data in transit, at rest, or in processing?

**Examples:**
```
# SQL injection modifying data
POST /api/transfer {"amount": "100; UPDATE accounts SET balance=999999 WHERE id=1"}

# Man-in-the-middle on HTTP (not HTTPS)
# Attacker intercepts and modifies API response

# Unsigned configuration files
config.yaml loaded without integrity check -> attacker modifies log_level: DEBUG to expose secrets
```

**Detection patterns:** No input validation, HTTP endpoints, missing integrity checks on files, no checksums.

**Mitigations:** Input validation/sanitization, HTTPS everywhere, signed artifacts, database constraints.

---

### R - Repudiation (Accountability)

**Question:** Can someone perform an action and deny it later?

**Examples:**
```
# No audit logging on financial transactions
def transfer_money(from_acc, to_acc, amount):
    db.execute("UPDATE accounts ...")  # No log of who did this, when, or why

# Logs stored on same server (attacker can delete)
# User deletes their own audit trail after unauthorized access
```

**Detection patterns:** Missing audit logs, logs without timestamps/user IDs, mutable log storage, no log forwarding.

**Mitigations:** Immutable audit logs (append-only), centralized logging (SIEM), signed log entries, write-once storage.

---

### I - Information Disclosure

**Question:** Can someone access data they shouldn't see?

**Examples:**
```python
# Stack trace in production API response
{
  "error": "NullPointerException at com.app.UserService.getUser(UserService.java:42)",
  "database": "postgresql://admin:s3cret@db.internal:5432/users"
}

# .env file exposed via web server
GET /.env  # Returns API_KEY=sk-live-xxxxx, DB_PASSWORD=...

# Verbose error messages
"User admin@company.com not found" vs "Invalid credentials" (leaks valid emails)
```

**Detection patterns:** Verbose errors in production, exposed config files, missing access controls on endpoints, debug mode enabled.

**Mitigations:** Generic error messages, secrets in vault (not env files), access control on all endpoints, disable debug in production.

---

### D - Denial of Service

**Question:** Can someone make the system unavailable?

**Examples:**
```python
# Unbounded query with no pagination
GET /api/users  # Returns 10 million records, crashes server

# ReDoS - Regular expression denial of service
import re
re.match(r"(a+)+$", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!")  # Exponential backtracking

# No rate limiting on expensive operation
POST /api/reports/generate  # Each request takes 30s and 2GB RAM
```

**Detection patterns:** Missing rate limits, unbounded queries, regex without timeout, no resource limits on containers.

**Mitigations:** Rate limiting, pagination, query limits, circuit breakers, resource quotas, CDN/WAF.

---

### E - Elevation of Privilege

**Question:** Can someone gain permissions they shouldn't have?

**Examples:**
```python
# IDOR - Insecure Direct Object Reference
GET /api/users/123/admin-panel  # Only checks if user is logged in, not if they're admin

# Role manipulation via mass assignment
POST /api/register {"name": "John", "email": "john@test.com", "role": "admin"}

# Path traversal
GET /api/files?path=../../etc/passwd
```

**Detection patterns:** Missing authorization checks (not just authentication), mass assignment vulnerabilities, path traversal, insecure deserialization.

**Mitigations:** Role-based access control (RBAC), allowlist for assignable fields, input path validation, principle of least privilege.

---

## PASTA 7-Stage Walkthrough

**P**rocess for **A**ttack **S**imulation and **T**hreat **A**nalysis

### Stage 1: Define Objectives

**What to do:** Align security analysis with business goals.

```
Business objective: "Process payments securely"
Security objective: "Prevent unauthorized transactions and data exposure"
Compliance: PCI-DSS, LGPD
Risk appetite: LOW (financial data)
```

### Stage 2: Define Technical Scope

**What to do:** Map all technical components in scope.

```
Components:
- Frontend: React SPA (app.example.com)
- API Gateway: Kong (api.example.com)
- Backend: FastAPI (internal)
- Database: PostgreSQL (internal)
- Queue: RabbitMQ (internal)
- External: Stripe API, SendGrid
- Infrastructure: AWS ECS, RDS, S3
```

### Stage 3: Application Decomposition

**What to do:** Create data flow diagrams (DFDs), identify trust boundaries.

```
Trust boundaries:
  [Internet] --HTTPS--> [WAF/CDN] --HTTPS--> [API Gateway]
  [API Gateway] --mTLS--> [Backend Services]
  [Backend] --TLS--> [Database]
  [Backend] --HTTPS--> [Stripe API]

Data flows:
  User credentials -> API Gateway -> Auth Service -> DB
  Payment data -> API Gateway -> Payment Service -> Stripe
  Webhook events -> Stripe -> API Gateway -> Payment Service
```

### Stage 4: Threat Analysis

**What to do:** Identify threats using STRIDE on each component from Stage 3.

Apply STRIDE to each data flow crossing a trust boundary.

### Stage 5: Vulnerability Analysis

**What to do:** Map known vulnerabilities to threats identified.

```
Tools: OWASP ZAP, Semgrep, dependency audit (npm audit, pip-audit)
CVE databases: NVD, GitHub Advisory
Existing findings: penetration test reports, bug bounty reports
```

### Stage 6: Attack Modeling

**What to do:** Build attack trees for high-priority threats.

(See Attack Trees section below)

### Stage 7: Risk & Impact Analysis

**What to do:** Prioritize threats by business impact and likelihood.

Use the threat documentation template below to score each threat.

---

## Building Attack Trees

Attack trees decompose a goal into sub-goals with AND/OR relationships.

```
GOAL: Steal user payment data
├── OR: Compromise database directly
│   ├── AND: Find SQL injection point
│   │   ├── Identify input field without sanitization
│   │   └── Craft injection payload
│   └── AND: Access database credentials
│       ├── Find exposed .env file
│       └── OR: Access via SSRF
├── OR: Intercept data in transit
│   ├── Downgrade HTTPS to HTTP
│   └── Compromise TLS certificate
├── OR: Exploit API vulnerability
│   ├── AND: BOLA on payment endpoint
│   │   ├── Enumerate user IDs
│   │   └── Access /users/{id}/payments without authz
│   └── Mass assignment on user object
└── OR: Social engineering
    ├── Phish admin credentials
    └── Compromise developer laptop
```

**Each leaf node = actionable threat to mitigate.**

---

## Threat Documentation Template

Use this template for every identified threat:

```markdown
### THREAT-{ID}: {Short Title}

**Category:** STRIDE category (S/T/R/I/D/E)
**Component:** Affected system component
**Attack Vector:** How the attacker exploits this
**Prerequisites:** What the attacker needs (access level, knowledge, tools)

**Impact:**
- Confidentiality: HIGH/MEDIUM/LOW
- Integrity: HIGH/MEDIUM/LOW
- Availability: HIGH/MEDIUM/LOW
- Business impact: Description of business consequence

**Probability:** HIGH/MEDIUM/LOW
**Severity:** CRITICAL/HIGH/MEDIUM/LOW (Impact x Probability)

**Evidence/Detection:**
- How to detect if this is being exploited
- Log patterns, monitoring alerts

**Mitigation:**
- [ ] Short-term fix (hotfix)
- [ ] Long-term fix (architectural)
- [ ] Monitoring/alerting to add

**Status:** OPEN | MITIGATED | ACCEPTED | TRANSFERRED
**Owner:** Team/person responsible
**Due date:** YYYY-MM-DD
```

---

## Example: Threat Modeling a Webhook Endpoint

**Context:** `POST /webhooks/stripe` receives payment events from Stripe.

### STRIDE Analysis

| Category | Threat | Severity | Mitigation |
|----------|--------|----------|------------|
| **Spoofing** | Attacker sends fake Stripe events | CRITICAL | Verify `Stripe-Signature` header with HMAC |
| **Tampering** | Event payload modified in transit | HIGH | HTTPS + signature verification |
| **Repudiation** | Cannot prove event was received/processed | MEDIUM | Log all webhook events with idempotency key |
| **Info Disclosure** | Error responses leak internal state | MEDIUM | Return generic 200/400, log details internally |
| **DoS** | Flood endpoint with fake events | HIGH | Rate limit by IP, verify signature before processing |
| **EoP** | Webhook triggers admin-level operations | HIGH | Webhook handler runs with minimal permissions, validate event type |

### Key Implementation

```python
import hmac
import hashlib

def verify_stripe_webhook(payload: bytes, signature: str, secret: str) -> bool:
    """Always verify before processing ANY webhook logic."""
    timestamp, sig = parse_stripe_signature(signature)

    # Prevent replay attacks (reject events older than 5 minutes)
    if abs(time.time() - int(timestamp)) > 300:
        return False

    expected = hmac.new(
        secret.encode(), f"{timestamp}.{payload.decode()}".encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, sig)
```

---

## Example: Threat Modeling an AI Agent with Tool Access

**Context:** AI agent with access to file system, API calls, and database queries.

### STRIDE Analysis

| Category | Threat | Severity | Mitigation |
|----------|--------|----------|------------|
| **Spoofing** | Prompt injection makes agent impersonate admin | CRITICAL | Input sanitization, system prompt hardening |
| **Tampering** | Agent modifies files/DB beyond intended scope | CRITICAL | Read-only by default, allowlist of writable paths |
| **Repudiation** | Cannot trace which agent action caused damage | HIGH | Log every tool call with full context |
| **Info Disclosure** | Agent leaks secrets from context/env to output | CRITICAL | Strip secrets before context injection, output filtering |
| **DoS** | Agent enters infinite loop, burns API credits | HIGH | Iteration limits, token budgets, timeout per operation |
| **EoP** | Agent escapes sandbox via tool chaining | CRITICAL | Least-privilege tool access, no shell access, sandboxed execution |

### Critical Controls for AI Agents

```yaml
agent_security:
  tool_access:
    file_system: READ_ONLY  # Default
    writable_paths: ["/tmp/agent-workspace/"]  # Explicit allowlist
    blocked_paths: ["~/.ssh", "~/.aws", ".env"]
    max_file_size: 1MB

  execution_limits:
    max_iterations: 25
    max_tokens_per_request: 4000
    max_total_tokens: 100000
    timeout_seconds: 120
    max_tool_calls: 50

  monitoring:
    log_all_tool_calls: true
    alert_on_file_write: true
    alert_on_external_api: true
    alert_on_secret_pattern: true  # Regex for API keys, passwords

  isolation:
    network: RESTRICTED  # Only allowlisted domains
    allowed_domains: ["api.openai.com", "api.anthropic.com"]
    no_shell_access: true
    no_code_execution: true  # Unless explicitly sandboxed
```

---

## Quick Reference: Severity Matrix

| | Low Impact | Medium Impact | High Impact |
|---|---|---|---|
| **High Probability** | MEDIUM | HIGH | CRITICAL |
| **Medium Probability** | LOW | MEDIUM | HIGH |
| **Low Probability** | LOW | LOW | MEDIUM |
