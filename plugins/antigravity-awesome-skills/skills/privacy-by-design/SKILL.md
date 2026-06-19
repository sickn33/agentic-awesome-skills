---
name: privacy-by-design
description: "Use when building apps that collect user data. Ensures privacy protections are built in from the start—data minimization, consent, encryption."
risk: safe
source: community
date_added: "2026-02-23"
---

# Privacy by Design

## Overview

Integrate privacy protections into software architecture from the beginning, not as an afterthought. This skill applies Privacy by Design principles (GDPR Article 25, Cavoukian's framework) when designing databases, APIs, and user flows. Protects real users' data and builds trust.

## When to Use This Skill

- Use when building apps that collect personal data (names, emails, locations, preferences)
- Use when designing database schemas, APIs, or authentication flows
- Use when the user mentions forms, user accounts, analytics, or third-party integrations
- Use when deploying to production—verify privacy controls before launch

## Legal Frameworks

**GDPR (EU)** — Primary reference. Article 25 mandates "data protection by design and by default." Applies to EU users and often adopted globally.

**CCPA (California)** — Right to know, delete, opt-out of sale. Similar principles: minimize, disclose, allow control.

**LGPD (Brazil)** — Aligned with GDPR. Purpose limitation, necessity, transparency. Applies to Brazil users.

Design for the strictest framework you target; it often satisfies others.

---

## Core Principles

### 1. Data Minimization
Collect only what is strictly necessary. Every field needs a documented justification. Avoid "we might need it later."

### 2. Purpose Limitation
Store the purpose of each data point. Do not reuse data for purposes the user did not consent to.

### 3. Storage Limitation
Define retention periods. Implement automated deletion or anonymization when retention expires. Never keep data "forever" by default.

### 4. Privacy as Default
Opt-in for optional collection, not opt-out. Sensitive settings (analytics, marketing) off by default. No pre-checked consent boxes.

### 5. End-to-End Security
Encrypt at rest and in transit. Use RBAC. Log access to sensitive data for audit.

### 6. Transparency
Document what is collected and why. Clear privacy policies. Easy access and deletion for users.

---

## User Rights (GDPR)

Ensure these are implementable from day one:

| Right | What to build |
|-------|---------------|
| **Access** | Endpoint or flow to return all user data |
| **Rectification** | Ability to update/correct data |
| **Erasure** | Account deletion + data purge (including backups) |
| **Portability** | Export data in machine-readable format (JSON, CSV) |

---

## Deep Dive: Why It Matters

**Data minimization** — Less data = less breach impact, lower storage cost, simpler compliance. Each field is a liability.

**Purpose limitation** — Reusing data without consent is illegal under GDPR. Document purpose in schema or metadata.

**Retention** — Indefinite storage increases risk and violates GDPR. Define `retention_days` per data type; automate cleanup.

**Logging** — Logs often leak PII. Redact emails, IDs, tokens. Use structured logging with allowlists.

**Third parties** — Every SDK (analytics, crash reporting, ads) may send data elsewhere. Audit dependencies; require consent before loading.

---

## Code Examples

### JavaScript/Node — Minimal User Model

```javascript
// BAD: Collecting everything "just in case"
const user = { email, name, phone, address, birthdate, ipAddress, userAgent, ... };

// GOOD: Minimal, documented purpose
const user = {
  email,        // purpose: authentication
  displayName,  // purpose: UI display
  createdAt,    // purpose: account age
};
```

### JavaScript — Consent Before Tracking

```javascript
// BAD: Track first, ask later
analytics.track(userId, event);

// GOOD: Check consent first
if (userConsent.analytics) {
  analytics.track(userId, event);
}
```

### Python — Safe Logging

```python
# BAD: Logging PII in plain text
logger.info(f"User {user.email} logged in from {request.remote_addr}")

# GOOD: Redact or hash identifiers
logger.info(f"User {hash_user_id(user.id)} logged in")
# Or: logger.info("User login", extra={"user_id_hash": hash_id(user.id)})
```

### SQL — Schema with Purpose and Retention

```sql
-- GOOD: Document purpose and retention in schema
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL,  -- purpose: auth, retention: account lifetime
  display_name VARCHAR(100),   -- purpose: UI, retention: account lifetime
  created_at TIMESTAMPTZ,      -- purpose: audit, retention: 7 years
  last_login_at TIMESTAMPTZ    -- purpose: security, retention: 90 days
);

-- Add retention policy (PostgreSQL example)
-- Schedule job to anonymize/delete last_login_at after 90 days
```

### API — Return Only Needed Fields

```python
# BAD: Returning full user object
return jsonify(user)  # May include internal fields, hashed passwords

# GOOD: Explicit allowlist
return jsonify({
    "id": user.id,
    "email": user.email,
    "displayName": user.display_name,
})
```

---

## Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Logs contain emails, IPs, tokens | Redact PII; use hashed IDs or structured logs |
| Error messages expose data | Return generic errors to client; log details server-side |
| Third-party SDKs load before consent | Load analytics/ads only after consent; use consent management |
| No deletion flow | Design account deletion + data purge from day one |
| Backups keep data forever | Include backups in retention; encrypt backups |
| Cookies without consent | Use consent banner; respect Do Not Track where applicable |

---

## Third-Party Audit

Before adding a dependency that touches user data:

- [ ] What data does it collect or receive?
- [ ] Where does it send data (servers, countries)?
- [ ] Is it loaded before or after user consent?
- [ ] Can we disable it if user opts out?
- [ ] Does their privacy policy align with ours?

---

## Implementation Checklist

When building a feature that touches user data:

- [ ] Is this data necessary? Can we achieve the goal with less?
- [ ] Do we have explicit consent for this use?
- [ ] Is it encrypted (at rest and in transit)?
- [ ] Do we have a retention/deletion policy?
- [ ] Can the user export or delete their data?
- [ ] Are third-party services disclosed and consented?
- [ ] Are logs free of PII?
- [ ] Are backups included in retention policy?

---

## Best Practices

- ✅ Ask "do we need this?" for every new data field
- ✅ Design deletion and export flows from day one
- ✅ Use hashing or tokenization for sensitive identifiers when possible
- ✅ Document purpose and retention in schema or metadata
- ❌ Don't log passwords, tokens, or PII in plain text
- ❌ Don't share data with third parties without explicit consent
- ❌ Don't assume "we'll add privacy later"—it rarely happens
- ❌ Don't expose stack traces or internal errors to clients

---

## When to Use
This skill is applicable when building software that collects, stores, or processes personal data. Apply it proactively during design and implementation.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
