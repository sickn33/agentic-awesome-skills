# GDPR Data Handling Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# GDPR Data Handling

Practical implementation guide for GDPR-compliant data processing, consent management, and privacy controls.

## When to Use This Skill

- Building systems that process EU personal data
- Implementing consent management
- Handling data subject requests (DSRs)
- Conducting GDPR compliance reviews
- Designing privacy-first architectures
- Creating data processing agreements

## Core Concepts

### 1. Personal Data Categories

| Category | Examples | Protection Level |
|----------|----------|------------------|
| **Basic** | Name, email, phone | Standard |
| **Sensitive (Art. 9)** | Health, religion, ethnicity | Explicit consent |
| **Criminal (Art. 10)** | Convictions, offenses | Official authority |
| **Children's** | Under 16 data | Parental consent |

### 2. Legal Bases for Processing

```
Article 6 - Lawful Bases:
├── Consent: Freely given, specific, informed
├── Contract: Necessary for contract performance
├── Legal Obligation: Required by law
├── Vital Interests: Protecting someone's life
├── Public Interest: Official functions
└── Legitimate Interest: Balanced against rights
```

### 3. Data Subject Rights

```
Right to Access (Art. 15)      ─┐
Right to Rectification (Art. 16) │
Right to Erasure (Art. 17)       │ Must respond
Right to Restrict (Art. 18)      │ within 1 month
Right to Portability (Art. 20)   │
Right to Object (Art. 21)       ─┘
```

## Implementation Patterns

### Pattern 1: Consent Management

```javascript
// Consent data model
const consentSchema = {
  userId: String,
  consents: [{
    purpose: String,         // 'marketing', 'analytics', etc.
    granted: Boolean,
    timestamp: Date,
    source: String,          // 'web_form', 'api', etc.
    version: String,         // Privacy policy version
    ipAddress: String,       // For proof
    userAgent: String        // For proof
  }],
  auditLog: [{
    action: String,          // 'granted', 'withdrawn', 'updated'
    purpose: String,
    timestamp: Date,
    source: String
  }]
};

// Consent service
class ConsentManager {
  async recordConsent(userId, purpose, granted, metadata) {
    const consent = {
      purpose,
      granted,
      timestamp: new Date(),
      source: metadata.source,
      version: await this.getCurrentPolicyVersion(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent
    };

    // Store consent
    await this.db.consents.updateOne(
      { userId },
      {
        $push: {
          consents: consent,
          auditLog: {
            action: granted ? 'granted' : 'withdrawn',
            purpose,
            timestamp: consent.timestamp,
            source: metadata.source
          }
        }
      },
      { upsert: true }
    );

    // Emit event for downstream systems
    await this.eventBus.emit('consent.changed', {
      userId,
      purpose,
      granted,
      timestamp: consent.timestamp
    });
  }

  async hasConsent(userId, purpose) {
    const record = await this.db.consents.findOne({ userId });
    if (!record) return false;

    const latestConsent = record.consents
      .filter(c => c.purpose === purpose)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    return latestConsent?.granted === true;
  }

  async getConsentHistory(userId) {
    const record = await this.db.consents.findOne({ userId });
    return record?.auditLog || [];
  }
}
```

```html
<!-- GDPR-compliant consent UI -->
<div class="consent-banner" role="dialog" aria-labelledby="consent-title">
  <h2 id="consent-title">Cookie Preferences</h2>

  <p>We use cookies to improve your experience. Select your preferences below.</p>

  <form id="consent-form">
    <!-- Necessary - always on, no consent needed -->
    <div class="consent-category">
      <input type="checkbox" id="necessary" checked disabled>
      <label for="necessary">
        <strong>Necessary</strong>
        <span>Required for the website to function. Cannot be disabled.</span>
      </label>
    </div>

    <!-- Analytics - requires consent -->
    <div class="consent-category">
      <input type="checkbox" id="analytics" name="analytics">
      <label for="analytics">
        <strong>Analytics</strong>
        <span>Help us understand how you use our site.</span>
      </label>
    </div>

    <!-- Marketing - requires consent -->
    <div class="consent-category">
      <input type="checkbox" id="marketing" name="marketing">
      <label for="marketing">
        <strong>Marketing</strong>
        <span>Personalized ads based on your interests.</span>
      </label>
    </div>

    <div class="consent-actions">
      <button type="button" id="accept-all">Accept All</button>
      <button type="button" id="reject-all">Reject All</button>
      <button type="submit">Save Preferences</button>
    </div>

    <p class="consent-links">
      <a href="/privacy-policy">Privacy Policy</a> |
      <a href="/cookie-policy">Cookie Policy</a>
    </p>
  </form>
</div>
```

### Pattern 2: Data Subject Access Request (DSAR)

```python
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json

class DSARHandler:
    """Handle Data Subject Access Requests."""

    RESPONSE_DEADLINE_DAYS = 30
    EXTENSION_ALLOWED_DAYS = 60  # For complex requests

    def __init__(self, data_sources: List['DataSource']):
        self.data_sources = data_sources

    async def submit_request(
        self,
        request_type: str,  # 'access', 'erasure', 'rectification', 'portability'
        user_id: str,
        verified: bool,
        details: Optional[Dict] = None
    ) -> str:
        """Submit a new DSAR."""
        request = {
            'id': self.generate_request_id(),
            'type': request_type,
            'user_id': user_id,
            'status': 'pending_verification' if not verified else 'processing',
            'submitted_at': datetime.utcnow(),
            'deadline': datetime.utcnow() + timedelta(days=self.RESPONSE_DEADLINE_DAYS),
            'details': details or {},
            'audit_log': [{
                'action': 'submitted',
                'timestamp': datetime.utcnow(),
                'details': 'Request received'
            }]
        }

        await self.db.dsar_requests.insert_one(request)
        await self.notify_dpo(request)

        return request['id']

    async def process_access_request(self, request_id: str) -> Dict:
        """Process a data access request."""
        request = await self.get_request(request_id)

        if request['type'] != 'access':
            raise ValueError("Not an access request")

        # Collect data from all sources
        user_data = {}
        for source in self.data_sources:
            try:
                data = await source.get_user_data(request['user_id'])
                user_data[source.name] = data
            except Exception as e:
                user_data[source.name] = {'error': str(e)}

        # Format response
        response = {
            'request_id': request_id,
            'generated_at': datetime.utcnow().isoformat(),
            'data_categories': list(user_data.keys()),
            'data': user_data,
            'retention_info': await self.get_retention_info(),
            'processing_purposes': await self.get_processing_purposes(),
            'third_party_recipients': await self.get_recipients()
        }

        # Update request status
        await self.update_request(request_id, 'completed', response)

        return response

    async def process_erasure_request(self, request_id: str) -> Dict:
        """Process a right to erasure request."""
        request = await self.get_request(request_id)

        if request['type'] != 'erasure':
            raise ValueError("Not an erasure request")

        results = {}
        exceptions = []

        for source in self.data_sources:
            try:
                # Check for legal exceptions
                can_delete, reason = await source.can_delete(request['user_id'])

                if can_delete:
                    await source.delete_user_data(request['user_id'])
                    results[source.name] = 'deleted'
                else:
                    exceptions.append({
                        'source': source.name,
                        'reason': reason  # e.g., 'legal retention requirement'
                    })
                    results[source.name] = f'retained: {reason}'
            except Exception as e:
                results[source.name] = f'error: {str(e)}'

        response = {
            'request_id': request_id,
            'completed_at': datetime.utcnow().isoformat(),
            'results': results,
            'exceptions': exceptions
        }

        await self.update_request(request_id, 'completed', response)

        return response

    async def process_portability_request(self, request_id: str) -> bytes:
        """Generate portable data export."""
        request = await self.get_request(request_id)
        user_data = await self.process_access_request(request_id)

        # Convert to machine-readable format (JSON)
        portable_data = {
            'export_date': datetime.utcnow().isoformat(),
            'format_version': '1.0',
            'data': user_data['data']
        }

        return json.dumps(portable_data, indent=2, default=str).encode()
```

### Pattern 3: Data Retention

```python
from datetime import datetime, timedelta
from enum import Enum

class RetentionBasis(Enum):
    CONSENT = "consent"
    CONTRACT = "contract"
    LEGAL_OBLIGATION = "legal_obligation"
    LEGITIMATE_INTEREST = "legitimate_interest"

class DataRetentionPolicy:
    """Define and enforce data retention policies."""

    POLICIES = {
        'user_account': {
            'retention_period_days': 365 * 3,  # 3 years after last activity
            'basis': RetentionBasis.CONTRACT,
            'trigger': 'last_activity_date',
            'archive_before_delete': True
        },
        'transaction_records': {
            'retention_period_days': 365 * 7,  # 7 years for tax
            'basis': RetentionBasis.LEGAL_OBLIGATION,
            'trigger': 'transaction_date',
            'archive_before_delete': True,
            'legal_reference': 'Tax regulations require 7 year retention'
        },
        'marketing_consent': {
            'retention_period_days': 365 * 2,  # 2 years
            'basis': RetentionBasis.CONSENT,
            'trigger': 'consent_date',
            'archive_before_delete': False
        },
        'support_tickets': {
            'retention_period_days': 365 * 2,
            'basis': RetentionBasis.LEGITIMATE_INTEREST,
            'trigger': 'ticket_closed_date',
            'archive_before_delete': True
        },
        'analytics_data': {
            'retention_period_days': 365,  # 1 year
            'basis': RetentionBasis.CONSENT,
            'trigger': 'collection_date',
            'archive_before_delete': False,
            'anonymize_instead': True
        }
    }

    async def apply_retention_policies(self):
        """Run retention policy enforcement."""
        for data_type, policy in self.POLICIES.items():
            cutoff_date = datetime.utcnow() - timedelta(
                days=policy['retention_period_days']
            )

            if policy.get('anonymize_instead'):
                await self.anonymize_old_data(data_type, cutoff_date)
            else:
                if policy.get('archive_before_delete'):
                    await self.archive_data(data_type, cutoff_date)
                await self.delete_old_data(data_type, cutoff_date)

            await self.log_retention_action(data_type, cutoff_date)

    async def anonymize_old_data(self, data_type: str, before_date: datetime):
        """Anonymize data instead of deleting."""
        # Example: Replace identifying fields with hashes
        if data_type == 'analytics_data':
            await self.db.analytics.update_many(
                {'collection_date': {'$lt': before_date}},
                {'$set': {
                    'user_id': None,
                    'ip_address': None,
                    'device_id': None,
                    'anonymized': True,
                    'anonymized_date': datetime.utcnow()
                }}
            )
```

### Pattern 4: Privacy by Design

```python
class PrivacyFirstDataModel:
    """Example of privacy-by-design data model."""

    # Separate PII from behavioral data
    user_profile_schema = {
        'user_id': str,  # UUID, not sequential
        'email_hash': str,  # Hashed for lookups
        'created_at': datetime,
        # Minimal data collection
        'preferences': {
            'language': str,
            'timezone': str
        }
    }

    # Encrypted at rest
    user_pii_schema = {
        'user_id': str,
        'email': str,  # Encrypted
        'name': str,   # Encrypted
        'phone': str,  # Encrypted (optional)
        'address': dict,  # Encrypted (optional)
        'encryption_key_id': str
    }

    # Pseudonymized behavioral data
    analytics_schema = {
        'session_id': str,  # Not linked to user_id
        'pseudonym_id': str,  # Rotating pseudonym
        'events': list,
        'device_category': str,  # Generalized, not specific
        'country': str,  # Not city-level
    }

class DataMinimization:
    """Implement data minimization principles."""

    @staticmethod
    def collect_only_needed(form_data: dict, purpose: str) -> dict:
        """Filter form data to only fields needed for purpose."""
        REQUIRED_FIELDS = {
            'account_creation': ['email', 'password'],
            'newsletter': ['email'],
            'purchase': ['email', 'name', 'address', 'payment'],
            'support': ['email', 'message']
        }

        allowed = REQUIRED_FIELDS.get(purpose, [])
        return {k: v for k, v in form_data.items() if k in allowed}

    @staticmethod
    def generalize_location(ip_address: str) -> str:
        """Generalize IP to country level only."""
        import geoip2.database
        reader = geoip2.database.Reader('GeoLite2-Country.mmdb')
        try:
            response = reader.country(ip_address)
            return response.country.iso_code
        except:
            return 'UNKNOWN'
```

### Pattern 5: Breach Notification

```python
from datetime import datetime
from enum import Enum

class BreachSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class BreachNotificationHandler:
    """Handle GDPR breach notification requirements."""

    AUTHORITY_NOTIFICATION_HOURS = 72
    AFFECTED_NOTIFICATION_REQUIRED_SEVERITY = BreachSeverity.HIGH

    async def report_breach(
        self,
        description: str,
        data_types: List[str],
        affected_count: int,
        severity: BreachSeverity
    ) -> dict:
        """Report and handle a data breach."""
        breach = {
            'id': self.generate_breach_id(),
            'reported_at': datetime.utcnow(),
            'description': description,
            'data_types_affected': data_types,
            'affected_individuals_count': affected_count,
            'severity': severity.value,
            'status': 'investigating',
            'timeline': [{
                'event': 'breach_reported',
                'timestamp': datetime.utcnow(),
                'details': description
            }]
        }

        await self.db.breaches.insert_one(breach)

        # Immediate notifications
        await self.notify_dpo(breach)
        await self.notify_security_team(breach)

        # Authority notification required within 72 hours
        if self.requires_authority_notification(severity, data_types):
            breach['authority_notification_deadline'] = (
                datetime.utcnow() + timedelta(hours=self.AUTHORITY_NOTIFICATION_HOURS)
            )
            await self.schedule_authority_notification(breach)

        # Affected individuals notification
        if severity.value in [BreachSeverity.HIGH.value, BreachSeverity.CRITICAL.value]:
            await self.schedule_individual_notifications(breach)

        return breach

    def requires_authority_notification(
        self,
        severity: BreachSeverity,
        data_types: List[str]
    ) -> bool:
        """Determine if supervisory authority must be notified."""
        # Always notify for sensitive data
        sensitive_types = ['health', 'financial', 'credentials', 'biometric']
        if any(t in sensitive_types for t in data_types):
            return True

        # Notify for medium+ severity
        return severity in [BreachSeverity.MEDIUM, BreachSeverity.HIGH, BreachSeverity.CRITICAL]

    async def generate_authority_report(self, breach_id: str) -> dict:
        """Generate report for supervisory authority."""
        breach = await self.get_breach(breach_id)

        return {
            'organization': {
                'name': self.config.org_name,
                'contact': self.config.dpo_contact,
                'registration': self.config.registration_number
            },
            'breach': {
                'nature': breach['description'],
                'categories_affected': breach['data_types_affected'],
                'approximate_number_affected': breach['affected_individuals_count'],
                'likely_consequences': self.assess_consequences(breach),
                'measures_taken': await self.get_remediation_measures(breach_id),
                'measures_proposed': await self.get_proposed_measures(breach_id)
            },
            'timeline': breach['timeline'],
            'submitted_at': datetime.utcnow().isoformat()
        }
```

## Compliance Checklist

```markdown
## GDPR Implementation Checklist

### Legal Basis
- [ ] Documented legal basis for each processing activity
- [ ] Consent mechanisms meet GDPR requirements
- [ ] Legitimate interest assessments completed

### Transparency
- [ ] Privacy policy is clear and accessible
- [ ] Processing purposes clearly stated
- [ ] Data retention periods documented

### Data Subject Rights
- [ ] Access request process implemented
- [ ] Erasure request process implemented
- [ ] Portability export available
- [ ] Rectification process available
- [ ] Response within 30-day deadline

### Security
- [ ] Encryption at rest implemented
- [ ] Encryption in transit (TLS)
- [ ] Access controls in place
- [ ] Audit logging enabled

### Breach Response
- [ ] Breach detection mechanisms
- [ ] 72-hour notification process
- [ ] Breach documentation system

### Documentation
- [ ] Records of processing activities (Art. 30)
- [ ] Data protection impact assessments
- [ ] Data processing agreements with vendors
```

## Best Practices

### Do's
- **Minimize data collection** - Only collect what's needed
- **Document everything** - Processing activities, legal bases
- **Encrypt PII** - At rest and in transit
- **Implement access controls** - Need-to-know basis
- **Regular audits** - Verify compliance continuously

### Don'ts
- **Don't pre-check consent boxes** - Must be opt-in
- **Don't bundle consent** - Separate purposes separately
- **Don't retain indefinitely** - Define and enforce retention
- **Don't ignore DSARs** - 30-day response required
- **Don't transfer without safeguards** - SCCs or adequacy decisions

## Resources

- [GDPR Full Text](https://gdpr-info.eu/)
- [ICO Guidance](https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/)
- [EDPB Guidelines](https://edpb.europa.eu/our-work-tools/general-guidance/gdpr-guidelines-recommendations-best-practices_en)
