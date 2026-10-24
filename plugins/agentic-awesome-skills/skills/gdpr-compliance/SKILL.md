---
name: gdpr-compliance
description: Implement GDPR data protection requirements. Configure consent management,
  data subject rights, and privacy by design. Use when processing EU personal data.
category: security
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Checklist and framework guidance; no privileged tooling required. Apply
  controls through your own change process.
metadata:
  author: devops-skills
  version: '1.0'
---

# GDPR Compliance

Implement General Data Protection Regulation requirements for processing within GDPR’s territorial/material scope, which depends on establishment, offering goods/services or monitoring and is not determined solely by residence, covering lawful processing, data subject rights, and technical safeguards.

## Key Principles and Legal Bases

```yaml
gdpr_principles:
  article_5:
    lawfulness_fairness_transparency:
      description: "Process data lawfully, fairly, and transparently"
      implementation:
        - Document legal basis for every processing activity
        - Provide clear privacy notices
        - No hidden or deceptive data collection

    purpose_limitation:
      description: "Collect for specified, explicit, and legitimate purposes"
      implementation:
        - Define purpose before collection
        - Do not repurpose data without new legal basis
        - Document all processing purposes in ROPA

    data_minimization:
      description: "Adequate, relevant, and limited to what is necessary"
      implementation:
        - Collect only required fields
        - Review data models for unnecessary fields
        - Remove optional fields that are not used

    accuracy:
      description: "Accurate and kept up to date"
      implementation:
        - Provide self-service profile editing
        - Implement data validation at point of entry
        - Schedule regular data quality reviews

    storage_limitation:
      description: "Kept no longer than necessary"
      implementation:
        - Define retention periods per data category
        - Automate deletion when retention expires
        - Document retention schedule

    integrity_and_confidentiality:
      description: "Appropriate security measures"
      implementation:
        - Encryption at rest and in transit
        - Access controls and audit logging
        - Pseudonymization where appropriate

    accountability:
      description: "Demonstrate compliance"
      implementation:
        - Maintain Records of Processing Activities
        - Conduct DPIAs for high-risk processing
        - Appoint DPO if required

legal_bases:
  article_6:
    consent: "Freely given, specific, informed, unambiguous"
    contract: "Necessary for performance of a contract"
    legal_obligation: "Required by EU or member state law"
    vital_interests: "Protect life of data subject or another person"
    public_interest: "Task carried out in public interest"
    legitimate_interest: "Legitimate interest not overridden by data subject rights"
```

## Data Mapping Template (Records of Processing Activities)

```yaml
# Record of Processing Activities (ROPA) - Article 30
processing_activity:
  name: "Customer Account Management"
  controller: "Example Corp, 123 Main St, Dublin, Ireland"
  dpo_contact: "dpo@example.com"
  purpose: "Manage customer accounts, provide services, handle billing"
  legal_basis: "Contract (Art. 6(1)(b))"
  categories_of_data_subjects:
    - Customers
    - Prospective customers
  categories_of_personal_data:
    - Name, email, phone number
    - Billing address
    - Payment information (tokenized)
    - Service usage data
    - Support ticket history
  special_categories: "None"
  recipients:
    - Payment processor (Stripe) - processor
    - Email service (SendGrid) - processor
    - Cloud hosting (AWS) - processor
  international_transfers:
    - Destination: United States
      Safeguard: "Standard Contractual Clauses (SCCs)"
      TIA_completed: null # require documented evidence
  retention_period: "Account data retained for duration of contract plus category-specific legally justified retention; seven years is not a universal GDPR rule"
  security_measures:
    - AES-256 encryption at rest
    - TLS 1.3 in transit
    - Role-based access control
    - Audit logging of all access
  dpia_required: null # assess explicitly; not a default negative
  last_reviewed: "2024-06-01"

# Template for each processing activity
processing_activity_template:
  name: ""
  controller: ""
  joint_controller: ""  # if applicable
  processor: ""  # if acting as processor
  dpo_contact: ""
  purpose: ""
  legal_basis: ""  # consent | contract | legal_obligation | vital_interests | public_interest | legitimate_interest
  legitimate_interest_assessment: ""  # if legitimate interest
  categories_of_data_subjects: []
  categories_of_personal_data: []
  special_categories: ""  # Art. 9 data
  recipients: []
  international_transfers: []
  retention_period: ""
  security_measures: []
  dpia_required: null # assess explicitly; not a default negative
  date_added: ""
  last_reviewed: ""
```

## Consent Management Implementation

```python
"""
Consent management system implementing GDPR Article 7 requirements.
Consent must be freely given, specific, informed, and unambiguous.
"""
from datetime import datetime, timezone
from enum import Enum
import json
import hashlib


class ConsentPurpose(Enum):
    MARKETING_EMAIL = "marketing_email"
    MARKETING_SMS = "marketing_sms"
    ANALYTICS = "analytics"
    PERSONALIZATION = "personalization"
    THIRD_PARTY_SHARING = "third_party_sharing"
    PROFILING = "profiling"


class ConsentManager:
    def __init__(self, db):
        self.db = db

    def record_consent(self, user_id, purpose, granted, source,
                       privacy_policy_version, ip_address=None):
        """Record a consent decision with full audit trail."""
        consent_record = {
            "user_id": user_id,
            "purpose": purpose.value,
            "granted": granted,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source,  # e.g., "web_signup", "preference_center", "cookie_banner"
            "privacy_policy_version": privacy_policy_version,
            "ip_address": ip_address,
            "withdrawal_timestamp": None,
        }
        # Store a checksum; this unkeyed hash does not make storage immutable or prove consent
        consent_record["record_hash"] = hashlib.sha256(
            json.dumps(consent_record, sort_keys=True).encode()
        ).hexdigest()
        self.db.consent_records.insert(consent_record)
        return consent_record

    def withdraw_consent(self, user_id, purpose):
        """Process consent withdrawal - must be as easy as giving consent."""
        record = self.record_consent(
            user_id=user_id,
            purpose=purpose,
            granted=False,
            source="withdrawal",
            privacy_policy_version="N/A",
        )
        # Trigger downstream actions
        self._stop_processing(user_id, purpose)
        self._notify_processors(user_id, purpose, "withdrawn")
        return record

    def get_consent_status(self, user_id, purpose):
        """Get current consent status for a specific purpose."""
        latest = self.db.consent_records.find_one(
            {"user_id": user_id, "purpose": purpose.value},
            sort=[("timestamp", -1)]
        )
        return latest["granted"] if latest else False

    def get_all_consents(self, user_id):
        """Get all consent records for a user (for DSAR response)."""
        return list(self.db.consent_records.find(
            {"user_id": user_id},
            sort=[("timestamp", -1)]
        ))

    def export_consent_proof(self, user_id, purpose):
        """Export consent records for review; records alone do not establish valid consent."""
        records = list(self.db.consent_records.find(
            {"user_id": user_id, "purpose": purpose.value},
            sort=[("timestamp", 1)]
        ))
        return {
            "user_id": user_id,
            "purpose": purpose.value,
            "consent_history": records,
            "current_status": self.get_consent_status(user_id, purpose),
            "exported_at": datetime.now(timezone.utc).isoformat(),
        }

    def _notify_processors(self, user_id, purpose, action):
        """Notify downstream processors of consent change."""
        raise NotImplementedError("Implement durable processor notification and failure handling")

    def _stop_processing(self, user_id, purpose):
        """Immediately stop processing for withdrawn consent."""
        raise NotImplementedError("Implement verified consent-dependent processing halt")
```

## Data Subject Access Request (DSAR) Procedures

```yaml
dsar_workflow:
  step_1_receive:
    actions:
      - Log the request with timestamp and channel received
      - Assign unique tracking ID
      - Acknowledge promptly under the organization’s chosen service target (3 business days is illustrative, not a GDPR deadline)
    identity_verification:
      - Verify identity before providing any data
      - Use existing authentication where possible
      - Request additional proof if necessary (but not excessive)
    sla: "Respond without undue delay and within one calendar month; where justified by complexity/number, extend by up to two further months and notify reasons within the initial month"

  step_2_assess:
    actions:
      - Determine request type (access, rectification, erasure, portability, etc.)
      - Identify all systems containing the individual's data
      - Check for lawful grounds to refuse (legal obligations, etc.)
      - Assess if extension is needed (complex or numerous requests)

  step_3_collect:
    systems_to_search:
      - Primary application database
      - CRM system
      - Email marketing platform
      - Analytics systems
      - Customer support tickets
      - Backup systems (if practically retrievable)
      - Log files containing PII
      - Third-party processors (request from each)

  step_4_respond:
    access_request:
      - Provide copy of all personal data in commonly used electronic format
      - Include processing purposes, categories, recipients, retention periods
      - Include source of data if not collected from the individual
      - Include information about automated decision-making
    rectification_request:
      - Update data in all systems
      - Notify all recipients of the correction
    erasure_request:
      - Delete data from all active systems
      - Remove from backups where technically feasible
      - Notify all processors and recipients
      - Document what was deleted and any retained data with legal basis
    portability_request:
      - Provide data in structured, machine-readable format (JSON/CSV)
      - Include only data provided by the data subject
      - Transfer directly to another controller if requested and feasible

  step_5_close:
    actions:
      - Send response to data subject
      - Document the entire handling process
      - Archive DSAR record for accountability
      - Update data mapping if new data stores discovered
```

```python
"""DSAR automation - data collection across systems."""
import json
from datetime import datetime, timezone


class DSARProcessor:
    def __init__(self, data_sources, authorize_request):
        self.authorize_request = authorize_request # required server-side verification/scope hook
        self.data_sources = data_sources  # Dict of system_name: DataSource

    def process_access_request(self, user_identifier):
        """Collect all personal data across registered systems."""
        self.authorize_request(user_identifier, "access")
        collected_data = {
            "request_id": f"DSAR-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_subject": user_identifier,
            "systems": {},
        }

        for system_name, source in self.data_sources.items():
            try:
                data = source.extract_user_data(user_identifier)
                collected_data["systems"][system_name] = {
                    "status": "collected",
                    "record_count": len(data) if isinstance(data, list) else 1,
                    "data": data,
                }
            except Exception as e:
                collected_data["systems"][system_name] = {
                    "status": "error",
                    "error": "Source operation failed; restricted diagnostics retained separately",
                }

        collected_data["complete"] = all(v["status"] == "collected" for v in collected_data["systems"].values())
        return collected_data

    def process_erasure_request(self, user_identifier):
        """Delete personal data across all systems (right to erasure)."""
        self.authorize_request(user_identifier, "erasure")
        results = {
            "request_id": f"ERASE-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "data_subject": user_identifier,
            "systems": {},
        }

        for system_name, source in self.data_sources.items():
            try:
                deleted = source.delete_user_data(user_identifier)
                retained = source.get_retained_data(user_identifier)
                results["systems"][system_name] = {
                    "status": "deleted",
                    "records_deleted": deleted,
                    "retained_data": retained,  # Data kept for legal obligations
                    "retention_basis": source.retention_legal_basis,
                }
            except Exception as e:
                results["systems"][system_name] = {
                    "status": "error",
                    "error": "Source operation failed; restricted diagnostics retained separately",
                }

        results["complete"] = all(v["status"] == "deleted" for v in results["systems"].values())
        return results

    def export_portable_data(self, user_identifier, format="json"):
        """Export data in machine-readable format for portability."""
        self.authorize_request(user_identifier, "portability")
        raise NotImplementedError(
            "Implement Article 20 eligibility and a separate portable-data projection; "
            "an access-response dump is not a portability export. Add tested JSON/CSV serializers."
        )
```

## Data Processing Agreement (DPA) Requirements

```yaml
dpa_requirements:
  mandatory_clauses:
    article_28:
      - Subject matter, duration, nature, and purpose of processing
      - Type of personal data and categories of data subjects
      - Obligations and rights of the controller
      - Processing only on documented instructions from controller
      - Confidentiality obligations on processor personnel
      - Appropriate technical and organizational security measures
      - Conditions for engaging sub-processors (prior authorization)
      - Assistance with data subject rights requests
      - Assistance with security obligations (Art. 32-36)
      - Deletion or return of data after service ends
      - Audit and inspection rights for the controller

  sub_processor_management:
    - [ ] List of current sub-processors provided by processor
    - [ ] Notification mechanism for new sub-processors (contractually agreed notice; no universal 30-day GDPR period)
    - [ ] Right to object to new sub-processors
    - [ ] Sub-processors bound by same data protection obligations
    - [ ] Processor remains liable for sub-processor compliance

  international_transfers:
    mechanisms:
      - Standard Contractual Clauses (SCCs) - most common
      - Binding Corporate Rules (BCRs) - intra-group transfers
      - Adequacy decision (countries deemed adequate by EC)
      - Derogations for specific situations (explicit consent, contract necessity)
    transfer_impact_assessment:
      - [ ] Assess laws of the destination country
      - [ ] Evaluate effectiveness of safeguards
      - [ ] Document supplementary measures if needed
      - [ ] Review periodically for legal changes

  dpa_registry:
    track_per_processor:
      - Processor name and contact details
      - DPA execution date
      - Data types processed
      - Sub-processors and their locations
      - SCC version used for international transfers
      - TIA completion date
      - Next review date
```


## Contents

- [Data Protection Impact Assessment (DPIA) Template](references/details.md)
- [GDPR Compliance Checklist](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Assessing processing that may fall within GDPR’s material/territorial scope
- Building consent management and preference centers
- Implementing Data Subject Access Request (DSAR) workflows
- Conducting Data Protection Impact Assessments (DPIAs)
- Setting up data processing agreements with third-party processors
- Designing systems with privacy by design and by default principles

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.

## Implementation and legal boundaries

This is a partial scaffold, not a compliant consent/DSAR service. Authentication, authorized subject/tenant resolution, request eligibility, retention holds, recipient rights and secure delivery must be implemented server-side; a supplied identifier is not proof of identity. Consent storage needs deterministic event ordering, protected evidence, purpose/notice versions and durable withdrawal propagation; an unkeyed hash proves neither immutability nor consent validity. Partial source errors are incomplete results and must not close a request or silently certify deletion. Access and portability have different scope: Article20 generally concerns data provided by the subject, consent/contract basis and automated processing; protect others’ rights. Erasure is conditional, and backups require an approved restoration/deletion policy. Special-category processing needs an applicable Article9 condition in addition to Article6 where applicable; pseudonymization is not anonymization. Recipient role, SCC/TIA, ROPA exceptions, DPIA/DPO and breach duties need factual legal assessment, not default booleans. No user request authorizes automatic deletion, disclosure, notices or processor API calls beyond the confirmed action and scope.
