# Details (moved from SKILL.md)

> Extended reference content for `vendor-management`, kept under `references/` so the entrypoint stays within the audit budget.

## Vendor Lifecycle Management

```yaml
vendor_lifecycle:
  onboarding:
    step_1_request:
      - Business owner submits vendor request with use case
      - Procurement assigns vendor ID
      - Initial risk tier assessment based on data access and criticality

    step_2_assess:
      - Send security questionnaire (appropriate to tier)
      - Review compliance certifications
      - Evaluate questionnaire responses
      - Score vendor risk

    step_3_contract:
      - Negotiate security requirements based on risk tier
      - Execute DPA/BAA as required
      - Document data flows and access scope
      - Set SLA expectations

    step_4_provision:
      - Configure integration with least privilege access
      - Enable audit logging for vendor access
      - Add to vendor registry
      - Schedule first reassessment

  ongoing_management:
    monitoring:
      - Track SLA compliance monthly
      - Monitor vendor status pages for incidents
      - Review vendor security advisories
      - Track data sub-processor changes
    reassessment:
      - Conduct reassessment per tier schedule
      - Review updated SOC 2 / ISO 27001 reports
      - Verify certifications are current
      - Update risk score

  offboarding:
    step_1_plan:
      - Data migration or transition to replacement vendor
      - Identify all integrations and access points
      - Communication plan for stakeholders

    step_2_execute:
      - Revoke all API keys, credentials, and access
      - Request data return or destruction certificate
      - Remove vendor integrations from systems
      - Disable SSO/SAML connections

    step_3_verify:
      - Confirm data destruction (written certification)
      - Verify all access revoked
      - Update vendor registry status to inactive
      - Archive vendor records for retention period
```


## Vendor Management Checklist

```yaml
vendor_management_checklist:
  program_setup:
    - [ ] Vendor risk tiering criteria defined
    - [ ] Security questionnaire template created
    - [ ] Risk scoring model documented
    - [ ] Vendor registry established
    - [ ] Onboarding and offboarding procedures documented
    - [ ] Contract security requirements defined per tier

  ongoing_operations:
    - [ ] All active vendors cataloged in registry
    - [ ] Risk tier assigned to each vendor
    - [ ] Security assessments current (per tier schedule)
    - [ ] Compliance certifications on file and not expired
    - [ ] DPAs/BAAs signed for all vendors handling personal data
    - [ ] SLA monitoring active for critical and high-tier vendors
    - [ ] Sub-processor lists reviewed and tracked
    - [ ] Vendor security incidents tracked and assessed

  governance:
    - [ ] Vendor management policy approved and published
    - [ ] Roles and responsibilities assigned (owner per vendor)
    - [ ] Assessment findings tracked to remediation
    - [ ] Vendor risk reported to management quarterly
    - [ ] Offboarding includes data destruction verification
    - [ ] Evidence retained for compliance audit (3+ years)
```


## Best Practices

- Tier vendors by risk before investing assessment effort: not every vendor needs a full security review
- Use standardized questionnaires (SIG, CAIQ, or consistent custom template) for comparable assessments
- Review SOC 2 Type II reports thoroughly, including complementary user entity controls
- Include right-to-audit clauses in contracts for critical vendors even if you do not exercise them frequently
- Monitor vendor status pages and set up alerts for outages affecting your services
- Track sub-processor changes: your vendor's vendor is part of your supply chain risk
- Maintain a vendor registry as a single source of truth for all vendor relationships
- Conduct offboarding rigorously: revoke all access and obtain data destruction certificates
- Score vendor risk quantitatively to enable consistent prioritization and trend analysis
- Report vendor risk metrics to management quarterly as part of the overall risk management program

