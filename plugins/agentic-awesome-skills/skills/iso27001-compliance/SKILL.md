---
name: iso27001-compliance
description: Implement ISO 27001 Information Security Management System. Configure
  ISMS controls and risk management. Use when implementing enterprise security frameworks.
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

# ISO 27001 Compliance

Implement an Information Security Management System (ISMS) aligned with ISO/IEC 27001:2022.

## When to Use

- Establishing an ISMS for the first time in an organization
- Preparing for ISO 27001 certification audit
- Conducting risk assessments and developing risk treatment plans
- Creating the Statement of Applicability (SoA)
- Transitioning from ISO 27001:2013 to the 2022 revision
- Meeting customer or regulatory requirements for ISO 27001 certification

## ISMS Plan-Do-Check-Act Cycle

```yaml
pdca_cycle:
  plan:
    - Define ISMS scope and boundaries
    - Establish information security policy
    - Conduct risk assessment
    - Develop risk treatment plan
    - Produce Statement of Applicability
    - Obtain management approval and commitment
    - Define security objectives and metrics

  do:
    - Implement selected Annex A controls
    - Deploy technical security controls
    - Conduct security awareness training
    - Document all procedures and processes
    - Implement incident management process
    - Establish supplier security management

  check:
    - Conduct internal audits (at least annual)
    - Perform management review meetings
    - Monitor and measure control effectiveness
    - Review incident trends and near misses
    - Assess compliance with legal requirements
    - Evaluate security metrics against objectives

  act:
    - Address nonconformities with corrective actions
    - Implement continual improvement initiatives
    - Update risk assessment based on changes
    - Refine controls based on audit findings
    - Communicate improvements to stakeholders
```

## ISMS Scope Definition

```yaml
isms_scope:
  template:
    organization: "Company Name, Ltd."
    scope_statement: |
      The ISMS covers the design, development, operation, and support of
      the Company's cloud-based SaaS platform, including all supporting
      infrastructure, personnel, and processes at the following locations.

    included:
      locations:
        - "Primary office: 123 Main Street, City, Country"
        - "AWS us-east-1 and eu-west-1 regions"
        - "Remote workers accessing corporate systems"
      business_processes:
        - "Software development and deployment"
        - "Cloud infrastructure management"
        - "Customer data processing and storage"
        - "Customer support operations"
        - "Corporate IT and internal systems"
      information_assets:
        - "Customer data (PII, business data)"
        - "Source code and intellectual property"
        - "Employee personal data"
        - "Financial records"
        - "Security configurations and credentials"
      technology:
        - "AWS cloud infrastructure"
        - "SaaS application stack"
        - "Corporate IT systems (Google Workspace, Okta, Jira)"
        - "Development tools (GitHub, CI/CD pipelines)"

    excluded:
      - "Physical data center operations (inherited from AWS)"
      - "Third-party SaaS platforms beyond integration points"
    exclusion_justification: "Physical data center controls are inherited from AWS, which maintains its own ISO 27001 certification."

    interfaces:
      - "Customer API endpoints"
      - "Third-party integrations (payment processor, email provider)"
      - "AWS management plane"
```

## Risk Assessment Process

```yaml
risk_assessment:
  methodology:
    approach: "Asset-based risk assessment"
    risk_formula: "Risk = Likelihood x Impact"
    scale: "1-5 for both likelihood and impact (total 1-25)"

  likelihood_scale:
    1: "Rare - less than once per 5 years"
    2: "Unlikely - once per 2-5 years"
    3: "Possible - once per 1-2 years"
    4: "Likely - multiple times per year"
    5: "Almost Certain - monthly or more frequent"

  impact_scale:
    1: "Negligible - minimal operational impact, no data loss"
    2: "Minor - limited impact, small data exposure, <$10K cost"
    3: "Moderate - significant impact, data breach <1K records, <$100K cost"
    4: "Major - severe impact, large data breach, <$1M cost, regulatory action"
    5: "Critical - catastrophic, massive breach, >$1M cost, business viability at risk"

  risk_matrix:
    #        Impact: 1    2    3    4    5
    likelihood_5:  [5,  10,  15,  20,  25]
    likelihood_4:  [4,   8,  12,  16,  20]
    likelihood_3:  [3,   6,   9,  12,  15]
    likelihood_2:  [2,   4,   6,   8,  10]
    likelihood_1:  [1,   2,   3,   4,   5]

  risk_appetite:
    accept: "Score 1-4 (low risk, accept with monitoring)"
    mitigate: "Score 5-14 (medium risk, implement controls to reduce)"
    escalate: "Score 15-25 (high/critical risk, immediate action required)"

  treatment_options:
    mitigate: "Implement controls to reduce likelihood or impact"
    transfer: "Insurance or contractual transfer to third party"
    avoid: "Eliminate the risk by removing the activity or asset"
    accept: "Accept with documented management approval"

  example_risk_register:
    - id: "RISK-001"
      asset: "Customer database"
      threat: "SQL injection attack"
      vulnerability: "Insufficient input validation"
      likelihood: 3
      impact: 4
      inherent_risk: 12
      treatment: "mitigate"
      controls: ["A.8.28 Secure coding", "A.8.8 Vulnerability management"]
      residual_likelihood: 1
      residual_impact: 4
      residual_risk: 4
      risk_owner: "CTO"

    - id: "RISK-002"
      asset: "Source code repository"
      threat: "Insider theft of intellectual property"
      vulnerability: "Excessive access permissions"
      likelihood: 2
      impact: 5
      inherent_risk: 10
      treatment: "mitigate"
      controls: ["A.5.15 Access control", "A.8.3 Information access restriction"]
      residual_likelihood: 1
      residual_impact: 5
      residual_risk: 5
      risk_owner: "VP Engineering"

    - id: "RISK-003"
      asset: "Cloud infrastructure"
      threat: "Cloud provider outage"
      vulnerability: "Single-region deployment"
      likelihood: 3
      impact: 3
      inherent_risk: 9
      treatment: "mitigate"
      controls: ["A.5.30 ICT readiness for business continuity", "A.8.14 Redundancy"]
      residual_likelihood: 3
      residual_impact: 2
      residual_risk: 6
      risk_owner: "Head of Infrastructure"
```

## Statement of Applicability (SoA)

```yaml
# ISO 27001:2022 Annex A Controls - Statement of Applicability
soa_template:
  organizational_controls_5:
    "A.5.1":
      control: "Policies for information security"
      applicable: true
      justification: "Required to establish security governance"
      implementation: "Information security policy approved by CEO, reviewed annually"

    "A.5.2":
      control: "Information security roles and responsibilities"
      applicable: true
      justification: "Required for accountability"
      implementation: "RACI matrix for security responsibilities, CISO appointed"

    "A.5.7":
      control: "Threat intelligence"
      applicable: true
      justification: "Required for proactive threat management"
      implementation: "Subscribe to threat feeds, CVE monitoring, vendor advisories"

    "A.5.15":
      control: "Access control"
      applicable: true
      justification: "Required for data protection"
      implementation: "RBAC via Okta, least-privilege IAM policies, quarterly access reviews"

    "A.5.23":
      control: "Information security for use of cloud services"
      applicable: true
      justification: "Primary infrastructure is cloud-based"
      implementation: "AWS security baseline, CSP shared responsibility documented"

    "A.5.29":
      control: "Information security during disruption"
      applicable: true
      justification: "Business continuity requirement"
      implementation: "BCP/DR plans tested annually, multi-AZ deployment"

    "A.5.30":
      control: "ICT readiness for business continuity"
      applicable: true
      justification: "Ensure technology supports continuity"
      implementation: "DR runbooks, RTO/RPO defined, failover tested quarterly"

  people_controls_6:
    "A.6.1":
      control: "Screening"
      applicable: true
      implementation: "Background checks for all employees before hiring"

    "A.6.3":
      control: "Information security awareness, education and training"
      applicable: true
      implementation: "Annual security training, phishing simulations quarterly"

    "A.6.5":
      control: "Responsibilities after termination or change of employment"
      applicable: true
      implementation: "Offboarding checklist, access revoked within 24 hours"

  physical_controls_7:
    "A.7.1":
      control: "Physical security perimeters"
      applicable: false
      exclusion_justification: "No company-operated data centers, inherited from AWS"

  technology_controls_8:
    "A.8.1":
      control: "User endpoint devices"
      applicable: true
      implementation: "MDM enrollment, disk encryption, screen lock policy"

    "A.8.5":
      control: "Secure authentication"
      applicable: true
      implementation: "MFA required for all systems, SSO via Okta"

    "A.8.8":
      control: "Management of technical vulnerabilities"
      applicable: true
      implementation: "Weekly vulnerability scans, 30-day patch SLA for critical"

    "A.8.9":
      control: "Configuration management"
      applicable: true
      implementation: "Infrastructure as code, AWS Config rules, baseline hardening"

    "A.8.15":
      control: "Logging"
      applicable: true
      implementation: "Centralized logging via CloudWatch + SIEM, 12-month retention"

    "A.8.16":
      control: "Monitoring activities"
      applicable: true
      implementation: "SIEM alerting, 24/7 on-call rotation, anomaly detection"

    "A.8.24":
      control: "Use of cryptography"
      applicable: true
      implementation: "TLS 1.2+, AES-256 at rest, KMS key management"

    "A.8.25":
      control: "Secure development lifecycle"
      applicable: true
      implementation: "SAST/DAST in CI, code review required, dependency scanning"

    "A.8.28":
      control: "Secure coding"
      applicable: true
      implementation: "OWASP guidelines, security code review, automated linting"
```

## Internal Audit Program

```yaml
internal_audit:
  schedule:
    frequency: "Annual full cycle, quarterly focused audits"
    cycle: "All ISMS clauses and applicable Annex A controls audited over 12 months"

  audit_plan_template:
    audit_id: "IA-2025-Q1"
    scope: "Clauses 4-10, Annex A controls A.5.1-A.5.15"
    auditor: "Internal auditor (independent of audited area)"
    audit_dates: "2025-03-10 to 2025-03-14"
    areas:
      - area: "Access Control (A.5.15)"
        auditee: "IT Security Team"
        evidence_requested:
          - "Access review records from last quarter"
          - "Joiner/mover/leaver process records"
          - "Privileged access management logs"
      - area: "Risk Management (Clause 6.1)"
        auditee: "Risk Management Team"
        evidence_requested:
          - "Current risk register"
          - "Risk assessment methodology document"
          - "Management risk review meeting minutes"

  finding_categories:
    major_nonconformity: "Requirement not met, significant risk to ISMS effectiveness"
    minor_nonconformity: "Requirement partially met, limited risk"
    observation: "Area for improvement, no requirement breach"
    positive_finding: "Notably effective implementation"

  corrective_action:
    major: "Root cause analysis within 10 days, corrective action within 30 days"
    minor: "Corrective action within 60 days"
    observation: "Address in next ISMS review cycle"
    verification: "Auditor verifies corrective action effectiveness"
```

## Management Review Meeting

```yaml
management_review:
  frequency: "At least annually, recommended quarterly"
  attendees:
    required:
      - "CEO or Managing Director"
      - "CISO or Information Security Manager"
      - "Department heads"
    optional:
      - "Internal auditor"
      - "Risk manager"
      - "External consultant"

  mandatory_inputs:
    - "Status of actions from previous management reviews"
    - "Changes in external and internal issues relevant to the ISMS"
    - "Information security performance (metrics and KPIs)"
    - "Audit results (internal and external)"
    - "Incident trends and nonconformities"
    - "Risk assessment results and risk treatment plan status"
    - "Interested party feedback"
    - "Opportunities for continual improvement"

  mandatory_outputs:
    - "Decisions on continual improvement opportunities"
    - "Decisions on changes needed to the ISMS"
    - "Resource allocation decisions"
    - "Updated risk acceptance decisions"

  kpis_to_report:
    - "Number and severity of security incidents"
    - "Vulnerability remediation SLA compliance"
    - "Security awareness training completion rate"
    - "Access review completion rate"
    - "Audit finding closure rate"
    - "Risk treatment plan progress"
    - "Patch compliance percentage"
```

## ISO 27001 Certification Checklist

```yaml
certification_checklist:
  stage_1_audit_preparation:
    - [ ] ISMS scope documented and approved
    - [ ] Information security policy published
    - [ ] Risk assessment methodology defined
    - [ ] Risk assessment completed with risk register
    - [ ] Risk treatment plan developed
    - [ ] Statement of Applicability completed
    - [ ] ISMS objectives defined with measurable targets
    - [ ] Internal audit program established
    - [ ] At least one full internal audit completed
    - [ ] Management review conducted with minutes documented
    - [ ] Document control process in place

  stage_2_audit_preparation:
    - [ ] All Annex A controls implemented per SoA
    - [ ] Evidence of control operation for 3+ months
    - [ ] Corrective actions from internal audit tracked and closed
    - [ ] Security awareness training delivered and recorded
    - [ ] Incident management process operational with records
    - [ ] Supplier security assessments performed
    - [ ] Business continuity plan tested
    - [ ] All mandatory documented information available
    - [ ] Employees aware of security policy and their responsibilities

  surveillance_audit_readiness:
    - [ ] All corrective actions from certification audit closed
    - [ ] Continuous internal audit schedule maintained
    - [ ] Management reviews conducted per schedule
    - [ ] Risk register updated with new threats and changes
    - [ ] Metrics demonstrate ISMS effectiveness
    - [ ] Changes to ISMS scope documented
```

## Best Practices

- Secure visible management commitment with a signed information security policy
- Define ISMS scope carefully; too broad makes certification expensive, too narrow reduces value
- Use an asset-based risk assessment approach to ensure comprehensive coverage
- Maintain the Statement of Applicability as a living document aligned with the risk register
- Conduct internal audits with auditors independent of the area being audited
- Hold management review meetings quarterly rather than only annually
- Integrate ISO 27001 controls into daily operations rather than treating them as a separate compliance exercise
- Use metrics and KPIs to demonstrate ISMS effectiveness to auditors and management
- Plan for the 3-year certification cycle: certification audit, then two surveillance audits
- Start collecting evidence of control operation at least 3 months before the Stage 2 audit

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
