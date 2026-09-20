---
name: fedramp-compliance
description: Implement FedRAMP requirements for federal cloud services. Configure
  NIST 800-53 controls and continuous monitoring. Use when providing cloud services
  to US federal agencies.
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

# FedRAMP Compliance

Implement FedRAMP (Federal Risk and Authorization Management Program) requirements for cloud service providers serving US federal agencies.

## When to Use

- Pursuing FedRAMP authorization for a cloud service offering
- Implementing NIST 800-53 security controls for federal workloads
- Establishing continuous monitoring (ConMon) processes
- Managing Plan of Action and Milestones (POA&M) tracking
- Preparing for a Third-Party Assessment Organization (3PAO) audit
- Operating a FedRAMP-authorized system and maintaining authorization

## Impact Levels

```yaml
impact_levels:
  low:
    control_count: ~125
    use_case: "Publicly available federal information"
    examples:
      - Public-facing websites with no sensitive data
      - Open data portals
      - Marketing and informational systems
    data_types: "No PII, no CUI, publicly releasable only"
    authorization_path: "FedRAMP Tailored (Li-SaaS) or standard Low"

  moderate:
    control_count: ~325
    use_case: "Most federal systems, including CUI"
    examples:
      - Email and collaboration platforms
      - Case management systems
      - Financial management systems
      - HR and personnel systems
    data_types: "CUI, PII, law enforcement sensitive (LES)"
    authorization_path: "Agency or JAB P-ATO"
    note: "~80% of FedRAMP authorizations are at Moderate"

  high:
    control_count: ~425
    use_case: "High-impact federal systems"
    examples:
      - Law enforcement and criminal justice systems
      - Emergency services and public safety
      - Financial systems with significant impact
      - Healthcare systems with PHI
    data_types: "Classified-adjacent, life-safety, critical infrastructure"
    authorization_path: "JAB P-ATO required"
```

## NIST 800-53 Control Families

```yaml
control_families:
  AC:
    name: "Access Control"
    key_controls:
      AC-2: "Account Management - manage system accounts lifecycle"
      AC-3: "Access Enforcement - enforce approved authorizations"
      AC-6: "Least Privilege - employ principle of least privilege"
      AC-17: "Remote Access - establish usage restrictions for remote access"
    implementation_notes: "Map to IAM policies, RBAC, MFA enforcement"

  AU:
    name: "Audit and Accountability"
    key_controls:
      AU-2: "Audit Events - define auditable events"
      AU-3: "Content of Audit Records - ensure records contain required info"
      AU-6: "Audit Review, Analysis, and Reporting"
      AU-12: "Audit Generation - generate audit records"
    implementation_notes: "Map to CloudTrail, CloudWatch Logs, SIEM"

  AT:
    name: "Awareness and Training"
    key_controls:
      AT-2: "Security Awareness Training - provide training to users"
      AT-3: "Role-Based Security Training - for personnel with security roles"
    implementation_notes: "Annual security training, role-specific training"

  CM:
    name: "Configuration Management"
    key_controls:
      CM-2: "Baseline Configuration - develop and maintain baseline"
      CM-6: "Configuration Settings - establish mandatory settings"
      CM-7: "Least Functionality - restrict to essential capabilities"
      CM-8: "Information System Component Inventory"
    implementation_notes: "Map to AWS Config, SSM, hardened AMIs"

  CP:
    name: "Contingency Planning"
    key_controls:
      CP-2: "Contingency Plan - develop and maintain plan"
      CP-4: "Contingency Plan Testing - test plan annually"
      CP-9: "Information System Backup"
      CP-10: "Information System Recovery and Reconstitution"
    implementation_notes: "Map to DR plan, backup strategy, failover testing"

  IA:
    name: "Identification and Authentication"
    key_controls:
      IA-2: "Identification and Authentication (Org Users)"
      IA-5: "Authenticator Management"
      IA-8: "Identification and Authentication (Non-Org Users)"
    implementation_notes: "Map to SSO, MFA, certificate-based auth, PIV/CAC"

  IR:
    name: "Incident Response"
    key_controls:
      IR-2: "Incident Response Training"
      IR-4: "Incident Handling - implement incident handling capability"
      IR-6: "Incident Reporting - report incidents to US-CERT"
      IR-8: "Incident Response Plan"
    implementation_notes: "US-CERT reporting within 1 hour for federal incidents"

  MA:
    name: "Maintenance"
    key_controls:
      MA-2: "Controlled Maintenance"
      MA-4: "Nonlocal Maintenance - authorize nonlocal maintenance"
    implementation_notes: "Patching procedures, remote maintenance controls"

  MP:
    name: "Media Protection"
    key_controls:
      MP-2: "Media Access - restrict access to media"
      MP-6: "Media Sanitization - sanitize media prior to disposal"
    implementation_notes: "Encryption at rest, secure disposal procedures"

  PE:
    name: "Physical and Environmental Protection"
    key_controls:
      PE-2: "Physical Access Authorizations"
      PE-3: "Physical Access Control"
      PE-6: "Monitoring Physical Access"
    implementation_notes: "Inherit from CSP for IaaS/PaaS, document inheritance"

  PL:
    name: "Planning"
    key_controls:
      PL-2: "System Security Plan (SSP)"
    implementation_notes: "SSP is the core FedRAMP deliverable"

  PS:
    name: "Personnel Security"
    key_controls:
      PS-3: "Personnel Screening"
      PS-4: "Personnel Termination"
      PS-5: "Personnel Transfer"
    implementation_notes: "Background checks, access revocation on termination"

  RA:
    name: "Risk Assessment"
    key_controls:
      RA-3: "Risk Assessment - conduct risk assessment"
      RA-5: "Vulnerability Scanning"
    implementation_notes: "Annual risk assessment, monthly vulnerability scans"

  CA:
    name: "Security Assessment and Authorization"
    key_controls:
      CA-2: "Security Assessments"
      CA-6: "Security Authorization"
      CA-7: "Continuous Monitoring"
    implementation_notes: "Annual assessment by 3PAO, ConMon program"

  SC:
    name: "System and Communications Protection"
    key_controls:
      SC-7: "Boundary Protection"
      SC-8: "Transmission Confidentiality and Integrity"
      SC-12: "Cryptographic Key Establishment and Management"
      SC-13: "Cryptographic Protection - FIPS 140-2 validated"
      SC-28: "Protection of Information at Rest"
    implementation_notes: "FIPS 140-2 validated modules required"

  SI:
    name: "System and Information Integrity"
    key_controls:
      SI-2: "Flaw Remediation"
      SI-3: "Malicious Code Protection"
      SI-4: "Information System Monitoring"
      SI-5: "Security Alerts, Advisories, and Directives"
    implementation_notes: "Patching SLAs, antimalware, IDS/IPS, SIEM"

  SA:
    name: "System and Services Acquisition"
    key_controls:
      SA-4: "Acquisition Process - security requirements in contracts"
      SA-9: "External Information System Services"
      SA-11: "Developer Security Testing"
    implementation_notes: "Supply chain risk management, SBOM"

  PM:
    name: "Program Management"
    key_controls:
      PM-1: "Information Security Program Plan"
      PM-9: "Risk Management Strategy"
    implementation_notes: "Organization-wide security program"
```

## System Security Plan (SSP) Outline

```yaml
ssp_sections:
  section_1: "Information System Name and Title"
  section_2: "Information System Categorization (FIPS 199)"
  section_3: "Information System Owner"
  section_4: "Authorizing Official"
  section_5: "Other Designated Contacts"
  section_6: "Assignment of Security Responsibility"
  section_7: "Information System Operational Status"
  section_8: "Information System Type (cloud service model)"
  section_9: "General System Description"
  section_10: "System Environment and Special Considerations"
  section_11: "System Interconnections"
  section_12: "Laws, Regulations, Policies Applicable"
  section_13: "Minimum Security Controls"

  key_attachments:
    - "Control Implementation Summary (CIS) workbook"
    - "Network architecture diagrams"
    - "Data flow diagrams"
    - "Interconnection security agreements (ISAs)"
    - "Incident response plan"
    - "Contingency plan"
    - "Configuration management plan"
```

## POA&M (Plan of Action and Milestones) Tracking

```yaml
# poam_template.yaml
poam_entry:
  - id: "POAM-2025-001"
    weakness: "AC-2(3) - Automated account disable after 90 days inactivity not implemented"
    control: "AC-2"
    risk_level: "moderate"
    finding_source: "3PAO Annual Assessment - 2025"
    date_identified: "2025-03-15"
    scheduled_completion: "2025-06-15"
    milestone_1:
      description: "Configure IdP inactivity policy"
      target_date: "2025-04-15"
      status: "complete"
    milestone_2:
      description: "Test automated disable in staging"
      target_date: "2025-05-01"
      status: "in_progress"
    milestone_3:
      description: "Deploy to production and validate"
      target_date: "2025-06-15"
      status: "not_started"
    responsible_party: "IAM Team"
    status: "open"
    vendor_dependency: false

  - id: "POAM-2025-002"
    weakness: "RA-5 - Vulnerability scan coverage does not include container images"
    control: "RA-5"
    risk_level: "high"
    finding_source: "3PAO Annual Assessment - 2025"
    date_identified: "2025-03-15"
    scheduled_completion: "2025-05-15"
    milestone_1:
      description: "Evaluate and select container scanning tool"
      target_date: "2025-04-01"
      status: "complete"
    milestone_2:
      description: "Integrate scanning into CI/CD pipeline"
      target_date: "2025-04-30"
      status: "in_progress"
    milestone_3:
      description: "Demonstrate full coverage to 3PAO"
      target_date: "2025-05-15"
      status: "not_started"
    responsible_party: "Security Engineering"
    status: "open"
    vendor_dependency: false

poam_aging_thresholds:
  high: "Must be resolved within 30 days"
  moderate: "Must be resolved within 90 days"
  low: "Must be resolved within 180 days"
  overdue_escalation: "Reported to authorizing official monthly"
```

## Continuous Monitoring (ConMon) Procedures

```yaml
continuous_monitoring:
  monthly:
    vulnerability_scanning:
      scope: "All operating systems, databases, web applications, and containers"
      tool: "Tenable.io, Qualys, or equivalent"
      deliverable: "Monthly scan report with remediation status"
      sla:
        critical_cvss_9_plus: "Remediate within 30 days"
        high_cvss_7_to_9: "Remediate within 30 days"
        moderate_cvss_4_to_7: "Remediate within 90 days"
        low_cvss_below_4: "Remediate within 180 days"

    poam_updates:
      action: "Update all open POA&M items with current status"
      deliverable: "Updated POA&M spreadsheet submitted to agency"
      content:
        - "Milestone completion updates"
        - "New POA&M items from scans"
        - "Closed POA&M items with evidence"

    inventory_updates:
      action: "Review and update system component inventory"
      deliverable: "Updated hardware and software inventory"

  quarterly:
    - "Review and update SSP with any system changes"
    - "Submit ConMon deliverables package to agency"
    - "Review access control lists and user accounts"
    - "Update network diagrams if changes occurred"

  annual:
    security_assessment:
      performed_by: "3PAO"
      scope: "Subset of controls (~1/3 each year, full coverage in 3 years)"
      deliverable: "Security Assessment Report (SAR)"

    penetration_testing:
      performed_by: "3PAO or qualified third party"
      scope: "External and internal network, web applications"
      deliverable: "Penetration test report with findings"

    contingency_plan_test:
      scope: "Full DR/BCP test including failover"
      deliverable: "Contingency plan test report"

    incident_response_test:
      scope: "Tabletop exercise or functional exercise"
      deliverable: "IR test report with lessons learned"
```

## FedRAMP FIPS 140-2 Cryptography Requirements

```bash
# Verify FIPS mode is enabled on Linux systems
cat /proc/sys/crypto/fips_enabled
# Output should be: 1

# Check OpenSSL FIPS module
openssl version
openssl list -providers  # Should show FIPS provider

# AWS: Use FIPS endpoints
# Example: Use FIPS endpoint for S3
aws s3 ls --endpoint-url https://s3-fips.us-east-1.amazonaws.com

# Configure AWS CLI for FIPS
# ~/.aws/config
# [default]
# use_fips_endpoint = true

# Verify TLS configuration meets FedRAMP requirements
openssl s_client -connect your-service.example.com:443 -tls1_2 < /dev/null 2>/dev/null | \
  grep -E "Protocol|Cipher"
# Must be TLS 1.2 or higher with FIPS-approved cipher suites
```

## FedRAMP Authorization Checklist

```yaml
authorization_checklist:
  pre_authorization:
    - [ ] Determine impact level (Low, Moderate, High)
    - [ ] Choose authorization path (Agency ATO or JAB P-ATO)
    - [ ] Engage FedRAMP PMO for readiness assessment
    - [ ] Select 3PAO from FedRAMP marketplace
    - [ ] Complete SSP with all control implementations documented
    - [ ] Develop required policies and procedures
    - [ ] Implement all applicable NIST 800-53 controls
    - [ ] Ensure FIPS 140-2 validated cryptographic modules in use

  assessment:
    - [ ] 3PAO conducts readiness assessment (optional but recommended)
    - [ ] 3PAO conducts full security assessment
    - [ ] 3PAO delivers Security Assessment Report (SAR)
    - [ ] Develop POA&M for all findings
    - [ ] Remediate critical and high findings before authorization

  authorization_package:
    - [ ] System Security Plan (SSP)
    - [ ] Security Assessment Report (SAR)
    - [ ] Plan of Action and Milestones (POA&M)
    - [ ] Continuous Monitoring Plan
    - [ ] Incident Response Plan
    - [ ] Contingency Plan
    - [ ] Configuration Management Plan
    - [ ] Control Implementation Summary (CIS)
    - [ ] Interconnection Security Agreements

  post_authorization:
    - [ ] Establish ConMon program with monthly deliverables
    - [ ] Monthly vulnerability scanning and POA&M updates
    - [ ] Annual 3PAO assessment of control subset
    - [ ] Annual penetration testing
    - [ ] Report significant changes to authorizing official
    - [ ] Report security incidents to US-CERT within 1 hour
    - [ ] Maintain authorization by meeting ConMon requirements
```

## Best Practices

- Start with a FedRAMP Readiness Assessment to identify gaps before the formal 3PAO assessment
- Use the FedRAMP SSP template exactly as provided to avoid review delays
- Inherit controls from your IaaS provider (AWS GovCloud, Azure Government) and document the inheritance clearly
- Implement FIPS 140-2 validated cryptographic modules for all encryption (TLS, at-rest, key management)
- Automate continuous monitoring deliverables to reduce manual effort and human error
- Maintain POA&M items within aging thresholds; overdue items risk losing authorization
- Report significant system changes to the authorizing official before implementation
- Treat the SSP as a living document and update it with every change to the system boundary
- Use US-CERT reporting procedures and maintain the 1-hour incident notification requirement
- Engage the FedRAMP PMO early and often for guidance on the authorization process

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
