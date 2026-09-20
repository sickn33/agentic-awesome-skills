---
name: vendor-management
description: Implement vendor risk management programs. Assess third-party security
  and maintain vendor inventory. Use when managing supplier security.
category: security
risk: safe
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

# Vendor Management

Implement a vendor risk management program covering vendor assessment questionnaires, risk scoring, contract tracking, SLA monitoring, and ongoing oversight for compliance with SOC 2, ISO 27001, and regulatory frameworks.

## Vendor Risk Tiering

```yaml
vendor_risk_tiers:
  critical:
    criteria:
      - Processes or stores sensitive/regulated data (PII, PHI, PCI)
      - Single point of failure (no alternative vendor)
      - Has privileged access to production systems
      - Handles authentication or security-critical functions
    assessment_requirements:
      - Full security questionnaire (SIG or custom)
      - SOC 2 Type II report review (or equivalent)
      - Penetration test results review
      - On-site or virtual security assessment (optional)
      - Business continuity and DR plan review
    review_frequency: Annual
    contract_requirements:
      - Data processing agreement (DPA)
      - Business associate agreement (BAA) if PHI
      - Security SLA with breach notification timeline
      - Right to audit clause
      - Cyber insurance requirements
    examples:
      - Cloud infrastructure providers (AWS, Azure, GCP)
      - Identity providers (Okta, Azure AD)
      - Payment processors (Stripe, Adyen)
      - Primary database or CRM SaaS

  high:
    criteria:
      - Accesses significant company data (internal or confidential)
      - Integrates with production systems via API
      - Processes customer-facing transactions
      - Substitution would cause significant business disruption
    assessment_requirements:
      - Security questionnaire
      - SOC 2 report review (Type I or Type II)
      - Compliance certifications verified
    review_frequency: Annual
    contract_requirements:
      - Data processing agreement
      - Security requirements appendix
      - Incident notification clause (72 hours)
    examples:
      - Email/marketing platforms (SendGrid, HubSpot)
      - Monitoring and logging SaaS (Datadog, Splunk)
      - CI/CD platforms (GitHub, GitLab)
      - Customer support platforms

  medium:
    criteria:
      - Limited data access (internal data only)
      - Non-production system integration
      - Some business impact if unavailable
    assessment_requirements:
      - Abbreviated security questionnaire
      - Compliance certification verification
    review_frequency: Every 2 years
    contract_requirements:
      - Standard vendor terms with security clause
      - NDA
    examples:
      - Project management tools
      - HR platforms
      - Travel and expense systems

  low:
    criteria:
      - No access to company data
      - No system integration
      - Easily replaceable
    assessment_requirements:
      - Basic due diligence (public info review)
      - Confirm no data sharing
    review_frequency: Every 3 years or on renewal
    contract_requirements:
      - Standard terms
    examples:
      - Office supply vendors
      - Facilities services
      - General consulting (no data access)
```

## Vendor Assessment Questionnaire

```yaml
security_questionnaire:
  section_1_governance:
    questions:
      - "Do you have a documented information security policy?"
      - "Is there a designated CISO or security lead?"
      - "Do you conduct annual security risk assessments?"
      - "Do you have a security awareness training program?"
      - "What compliance certifications do you hold? (SOC 2, ISO 27001, etc.)"
      - "When was your last external security audit?"
      - "Do you carry cyber liability insurance? What coverage limits?"
    evidence_requested:
      - Information security policy (or summary)
      - SOC 2 Type II report (or bridge letter)
      - ISO 27001 certificate
      - Cyber insurance certificate

  section_2_access_control:
    questions:
      - "How do you manage user access to systems containing our data?"
      - "Is multi-factor authentication enforced for all personnel?"
      - "How frequently do you conduct access reviews?"
      - "What is your process for revoking access upon employee termination?"
      - "Do you support SSO/SAML integration for customer access?"
      - "How do you manage privileged access?"
    evidence_requested:
      - Access management policy
      - MFA configuration documentation
      - Access review records (sample)

  section_3_data_protection:
    questions:
      - "How is our data encrypted at rest?"
      - "How is our data encrypted in transit?"
      - "In which geographic regions is our data stored?"
      - "Do you use sub-processors? If so, provide a list."
      - "What is your data retention policy?"
      - "How is our data isolated from other customers? (multi-tenancy model)"
      - "Can you provide data export in standard formats upon request?"
      - "What is your data destruction process at contract end?"
    evidence_requested:
      - Encryption standards documentation
      - Sub-processor list
      - Data flow diagram showing customer data handling

  section_4_vulnerability_management:
    questions:
      - "How frequently do you perform vulnerability scans?"
      - "How frequently do you conduct penetration tests?"
      - "What is your patch management SLA for critical vulnerabilities?"
      - "Do you have a responsible disclosure or bug bounty program?"
      - "How do you manage vulnerabilities in third-party dependencies?"
    evidence_requested:
      - Penetration test executive summary (last 12 months)
      - Vulnerability management policy
      - Patch management SLA documentation

  section_5_incident_response:
    questions:
      - "Do you have a documented incident response plan?"
      - "What is your breach notification timeline?"
      - "Have you experienced a data breach in the last 3 years?"
      - "How would you notify us in the event of a security incident?"
      - "Do you conduct incident response tabletop exercises?"
    evidence_requested:
      - Incident response plan summary
      - Breach notification procedure

  section_6_business_continuity:
    questions:
      - "Do you have a business continuity plan?"
      - "Do you have a disaster recovery plan?"
      - "What are your RTO and RPO targets?"
      - "How frequently do you test your DR plan?"
      - "What is your uptime SLA?"
      - "Do you have geographic redundancy?"
    evidence_requested:
      - BCP/DR plan summary
      - Uptime SLA documentation
      - Most recent DR test results

  section_7_compliance:
    questions:
      - "Do you process data subject to GDPR, HIPAA, or PCI DSS?"
      - "How do you support our compliance obligations?"
      - "Do you have a Data Processing Agreement (DPA) template?"
      - "How do you handle data subject access requests (DSARs)?"
      - "Are you FedRAMP authorized? If so, at what impact level?"
    evidence_requested:
      - DPA template
      - Compliance certification documentation
```

## Risk Scoring Model

```yaml
risk_scoring:
  dimensions:
    data_sensitivity:
      weight: 30
      scores:
        1: "No access to company or customer data"
        2: "Access to public or non-sensitive internal data"
        3: "Access to internal confidential data"
        4: "Access to PII or customer financial data"
        5: "Access to regulated data (PHI, PCI, classified)"

    system_access:
      weight: 25
      scores:
        1: "No system access"
        2: "Read-only access to non-production"
        3: "Read/write access to non-production or read-only production"
        4: "Read/write access to production systems"
        5: "Privileged/admin access to production or security systems"

    business_criticality:
      weight: 20
      scores:
        1: "No operational dependency"
        2: "Minor convenience; easily replaced"
        3: "Moderate dependency; replacement in weeks"
        4: "Significant dependency; replacement in months"
        5: "Critical dependency; no viable alternative"

    security_posture:
      weight: 15
      scores:
        5: "No certifications, no formal security program"
        4: "Some security controls but no external validation"
        3: "SOC 2 Type I or equivalent"
        2: "SOC 2 Type II within last 12 months"
        1: "Multiple certifications (SOC 2 + ISO 27001), strong program"

    regulatory_exposure:
      weight: 10
      scores:
        1: "No regulatory requirements"
        2: "General data protection (GDPR basic)"
        3: "Industry-specific (HIPAA, PCI)"
        4: "Government (FedRAMP, ITAR)"
        5: "Multiple stringent regulations"

  calculation:
    formula: "Sum of (dimension_score * dimension_weight) / 100"
    risk_levels:
      low: "Score 1.0 - 2.0"
      medium: "Score 2.1 - 3.0"
      high: "Score 3.1 - 4.0"
      critical: "Score 4.1 - 5.0"

  example:
    vendor: "Payment Processor X"
    data_sensitivity: 5  # PCI data
    system_access: 4     # Production API integration
    business_criticality: 5  # No alternative
    security_posture: 2  # SOC 2 Type II
    regulatory_exposure: 3   # PCI DSS
    score: "(5*30 + 4*25 + 5*20 + 2*15 + 3*10) / 100 = 4.1 -> Critical"
```

## Vendor Registry and Contract Tracking

```yaml
vendor_registry_schema:
  vendor_info:
    vendor_id: "VND-NNNN"
    vendor_name: ""
    vendor_website: ""
    primary_contact_email: ""
    security_contact_email: ""
    vendor_category: ""  # SaaS, IaaS, Consulting, etc.

  risk_assessment:
    risk_tier: ""  # critical, high, medium, low
    risk_score: 0.0
    last_assessment_date: ""
    next_assessment_date: ""
    assessment_status: ""  # current, due, overdue
    open_findings: 0
    certifications:
      - type: "SOC 2 Type II"
        valid_until: ""
        report_on_file: true
      - type: "ISO 27001"
        valid_until: ""
        certificate_on_file: true

  contract:
    contract_id: ""
    start_date: ""
    end_date: ""
    auto_renewal: true
    cancellation_notice_days: 90
    annual_value: 0
    terms:
      data_processing_agreement: true
      nda: true
      baa: false
      right_to_audit: true
      breach_notification_sla: "72 hours"
      data_return_clause: true
      data_destruction_clause: true
      cyber_insurance_required: true

  data_access:
    data_types: []
    data_classification: ""
    data_location: []
    sub_processors: []

  sla_tracking:
    uptime_sla: "99.9%"
    actual_uptime_last_month: ""
    support_response_sla: ""
    sla_breaches_ytd: 0

  status: ""  # active, under_review, offboarding, inactive
  owner: ""   # Internal team/person responsible
```

## SLA Monitoring

```python
"""
Vendor SLA monitoring - Track uptime and response time commitments.
"""
import requests
from datetime import datetime, timezone


class VendorSLAMonitor:
    def __init__(self, vendors_config):
        self.vendors = vendors_config

    def check_uptime(self, vendor):
        """Check vendor service availability."""
        results = []
        for endpoint in vendor.get("health_endpoints", []):
            try:
                resp = requests.get(
                    endpoint["url"],
                    timeout=endpoint.get("timeout", 10),
                    headers=endpoint.get("headers", {}),
                )
                results.append({
                    "endpoint": endpoint["url"],
                    "status": resp.status_code,
                    "response_time_ms": resp.elapsed.total_seconds() * 1000,
                    "healthy": resp.status_code == endpoint.get("expected_status", 200),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
            except requests.RequestException as e:
                results.append({
                    "endpoint": endpoint["url"],
                    "status": "error",
                    "error": str(e),
                    "healthy": False,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
        return results

    def check_status_page(self, vendor):
        """Check vendor status page for active incidents."""
        status_url = vendor.get("status_page_url")
        if not status_url:
            return None
        try:
            api_url = f"{status_url}/api/v2/summary.json"
            resp = requests.get(api_url, timeout=10)
            data = resp.json()
            return {
                "vendor": vendor["name"],
                "status": data.get("status", {}).get("indicator", "unknown"),
                "active_incidents": len(data.get("incidents", [])),
                "components": [
                    {"name": c["name"], "status": c["status"]}
                    for c in data.get("components", [])
                ],
            }
        except Exception:
            return {"vendor": vendor["name"], "status": "unknown"}

    def generate_sla_report(self, vendor_name, monthly_checks):
        """Calculate monthly SLA compliance."""
        total = len(monthly_checks)
        healthy = sum(1 for c in monthly_checks if c.get("healthy"))
        uptime_pct = (healthy / total * 100) if total > 0 else 0
        avg_response = (
            sum(c.get("response_time_ms", 0) for c in monthly_checks if c.get("healthy"))
            / max(healthy, 1)
        )
        return {
            "vendor": vendor_name,
            "period": datetime.now(timezone.utc).strftime("%Y-%m"),
            "total_checks": total,
            "healthy_checks": healthy,
            "uptime_percentage": round(uptime_pct, 3),
            "avg_response_time_ms": round(avg_response, 1),
            "sla_met": uptime_pct >= 99.9,
        }
```


## Contents

- [Vendor Lifecycle Management](references/details.md)
- [Vendor Management Checklist](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Onboarding new vendors that will access company data or systems
- Conducting annual vendor risk assessments and reassessments
- Negotiating security requirements in vendor contracts
- Monitoring vendor SLA compliance and security posture
- Preparing vendor management evidence for SOC 2 or ISO 27001 audits

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
