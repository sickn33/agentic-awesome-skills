# Details (moved from SKILL.md)

> Extended reference content for `access-review`, kept under `references/` so the entrypoint stays within the audit budget.

## Certification Workflow Automation

```yaml
# GitHub Actions - Automated access review reminder and tracking
name: Quarterly Access Review
on:
  schedule:
    - cron: '0 9 1 1,4,7,10 *'  # First day of each quarter
  workflow_dispatch:

jobs:
  generate-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate access reports
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AUDIT_AWS_KEY }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AUDIT_AWS_SECRET }}
          OKTA_DOMAIN: ${{ secrets.OKTA_DOMAIN }}
          OKTA_API_TOKEN: ${{ secrets.OKTA_API_TOKEN }}
        run: |
          bash scripts/aws-iam-review.sh
          bash scripts/github-access-review.sh
          bash scripts/okta-access-review.sh

      - name: Create review issue
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          QUARTER="Q$(( ($(date +%-m) - 1) / 3 + 1 )) $(date +%Y)"
          MFA_MISSING=$(wc -l < access-review/$(date +%Y-%m)/users-without-mfa.txt)
          INACTIVE=$(wc -l < access-review/$(date +%Y-%m)/inactive-users.csv)
          STALE_KEYS=$(wc -l < access-review/$(date +%Y-%m)/stale-access-keys.csv)

          gh issue create \
            --title "Access Review - $QUARTER" \
            --label "compliance,access-review" \
            --body "## Quarterly Access Review - $QUARTER

          ### Summary
          - Users without MFA: **$MFA_MISSING**
          - Inactive users (90+ days): **$INACTIVE**
          - Stale access keys: **$STALE_KEYS**

          ### Required Actions
          - [ ] Review and disable inactive users
          - [ ] Enforce MFA for non-compliant users
          - [ ] Rotate or deactivate stale access keys
          - [ ] Review admin/privileged access assignments
          - [ ] Review outside collaborators on GitHub
          - [ ] Certify remaining access is appropriate
          - [ ] Document exceptions with justification

          ### Deadline
          Complete within 30 days."

      - name: Upload reports as artifact
        uses: actions/upload-artifact@v4
        with:
          name: access-review-reports
          path: access-review/
          retention-days: 365
```


## Access Review Checklist

```yaml
access_review_checklist:
  preparation:
    - [ ] Define scope (systems, user populations, review period)
    - [ ] Assign review owners for each system
    - [ ] Extract current access data from all identity sources
    - [ ] Correlate identities across platforms via SSO mapping
    - [ ] Generate review packages for each manager

  execution:
    - [ ] Managers notified with review assignments and deadline
    - [ ] Privileged access reviewed first (admin, root, service accounts)
    - [ ] Each user's access certified (approve, modify, or revoke)
    - [ ] Inactive accounts flagged for disable/removal
    - [ ] Stale credentials (keys, tokens) flagged for rotation
    - [ ] Outside collaborators and contractors verified
    - [ ] Service account ownership confirmed

  remediation:
    - [ ] Revocations executed within SLA (5 business days)
    - [ ] Access modifications completed within SLA (10 business days)
    - [ ] Exceptions documented with business justification
    - [ ] Exception approvals recorded from security team
    - [ ] Changes verified in target systems

  reporting:
    - [ ] Review completion rate documented (target: 100%)
    - [ ] Non-response escalations documented
    - [ ] Remediation actions summarized
    - [ ] Exception register updated
    - [ ] Evidence archived for audit (retained 3+ years)
    - [ ] Metrics compared to prior review cycle
```


## Best Practices

- Automate access data extraction to eliminate manual data gathering and reduce errors
- Integrate access review with HR systems to automatically flag accounts for departed employees
- Use risk-based review frequency: privileged access quarterly, standard access semi-annually
- Provide managers with clear context: show last login date, permissions, and role to inform decisions
- Set firm deadlines with escalation for non-response (no certification = automatic revocation)
- Detect and eliminate orphaned accounts from contractors, former employees, and decommissioned services
- Review service accounts and API keys alongside human accounts to prevent credential sprawl
- Document all exceptions with business justification, approver, and expiration date
- Track review metrics over time: completion rates, revocation rates, time to remediate
- Archive all access review evidence for a minimum of 3 years for audit purposes

