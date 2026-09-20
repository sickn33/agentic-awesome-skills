# Details (moved from SKILL.md)

> Extended reference content for `gdpr-compliance`, kept under `references/` so the entrypoint stays within the audit budget.

## Data Protection Impact Assessment (DPIA) Template

```yaml
dpia_template:
  when_required:
    - Systematic and extensive profiling with significant effects
    - Large-scale processing of special category data
    - Systematic monitoring of publicly accessible areas
    - Any processing on national supervisory authority's list
    - New technologies with likely high risk to rights and freedoms

  assessment:
    section_1_description:
      processing_activity: ""
      purpose: ""
      legal_basis: ""
      data_categories: []
      data_subjects: []
      recipients: []
      retention: ""
      data_flows: "Describe how data moves through systems"

    section_2_necessity:
      is_processing_necessary: ""
      is_processing_proportionate: ""
      alternatives_considered: ""
      data_minimization_applied: ""

    section_3_risks:
      risk_assessment:
        - risk: "Unauthorized access to personal data"
          likelihood: "medium"
          severity: "high"
          risk_level: "high"
          existing_controls: "Encryption, access controls, audit logs"
          residual_risk: "medium"

        - risk: "Accidental data loss or destruction"
          likelihood: "low"
          severity: "high"
          risk_level: "medium"
          existing_controls: "Backups, replication, DR procedures"
          residual_risk: "low"

        - risk: "Excessive data collection beyond purpose"
          likelihood: "medium"
          severity: "medium"
          risk_level: "medium"
          existing_controls: "Data minimization review, schema validation"
          residual_risk: "low"

    section_4_measures:
      technical_measures:
        - Pseudonymization of personal data
        - Encryption at rest (AES-256) and in transit (TLS 1.3)
        - Access controls with least privilege
        - Automated data retention enforcement
      organizational_measures:
        - Staff training on data protection
        - Data protection policies and procedures
        - Incident response procedures
        - Regular access reviews
      monitoring:
        - Audit logging of all data access
        - Anomaly detection for unusual access patterns
        - Regular compliance testing

    section_5_sign_off:
      dpo_consultation: "Required if high residual risk"
      dpo_opinion: ""
      supervisory_authority_consultation: "Required if risk cannot be mitigated"
      approval_date: ""
      next_review_date: ""
```


## GDPR Compliance Checklist

```yaml
gdpr_compliance_checklist:
  governance:
    - [ ] Data Protection Officer appointed (if required under Art. 37)
    - [ ] Records of Processing Activities (ROPA) maintained
    - [ ] Privacy policies published and up to date
    - [ ] Data protection training conducted for all staff
    - [ ] Data breach response plan documented and tested

  lawful_processing:
    - [ ] Legal basis identified and documented for each processing activity
    - [ ] Consent mechanisms comply with Art. 7 (freely given, specific, informed)
    - [ ] Consent withdrawal is as easy as giving consent
    - [ ] Legitimate interest assessments completed where applicable
    - [ ] Special category data has Art. 9 legal basis documented

  data_subject_rights:
    - [ ] DSAR intake process established (multiple channels)
    - [ ] Identity verification procedure defined
    - [ ] Response within 30 days (or extension communicated)
    - [ ] Right to access implemented and tested
    - [ ] Right to rectification implemented
    - [ ] Right to erasure implemented with legal retention exceptions
    - [ ] Right to portability implemented (structured, machine-readable export)
    - [ ] Right to object implemented (especially for direct marketing)

  technical_measures:
    - [ ] Encryption at rest and in transit for all personal data
    - [ ] Pseudonymization applied where feasible
    - [ ] Access controls enforce least privilege
    - [ ] Audit logging of personal data access
    - [ ] Data retention automated with defined schedules
    - [ ] Secure deletion procedures verified

  third_parties:
    - [ ] Data Processing Agreements signed with all processors
    - [ ] Sub-processor notification mechanism in place
    - [ ] International transfer safeguards implemented (SCCs, etc.)
    - [ ] Transfer Impact Assessments completed
    - [ ] Processor compliance verified periodically

  breach_management:
    - [ ] Breach detection and assessment procedures documented
    - [ ] 72-hour supervisory authority notification process ready
    - [ ] Individual notification procedures for high-risk breaches
    - [ ] Breach register maintained
    - [ ] Post-breach review and improvement process
```


## Best Practices

- Maintain a comprehensive Records of Processing Activities as the foundation of GDPR compliance
- Implement privacy by design: build data protection into systems from the start, not retrofitted
- Apply data minimization rigorously: do not collect personal data "just in case"
- Automate DSAR processing to meet the 30-day response deadline consistently
- Keep consent granular and purpose-specific; avoid bundled consent for multiple purposes
- Conduct DPIAs before launching high-risk processing activities
- Ensure data processing agreements are signed with every processor before sharing personal data
- Implement automated retention enforcement to prevent storage beyond defined periods
- Train all staff who handle personal data, not just the IT and legal teams
- Regularly audit data flows to discover shadow processing or undocumented data stores

