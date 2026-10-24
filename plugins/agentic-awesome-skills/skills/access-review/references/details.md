# Details (moved from SKILL.md)

> Extended reference content for `access-review`, kept under `references/` so the entrypoint stays within the audit budget.

## Certification Workflow Automation

Automation design (no bundled executable workflow): use pinned read-only tooling
and workload identity, collect complete paginated inventory, then produce a private
review package. The upstream scripts named in the historical workflow are not
bundled. Creating issues/notifying managers needs an explicit recipient/repository
mandate and must not publish personal access inventories in a public issue.
Use a reviewed report body file and metadata-only aggregate counts; upload evidence
only to an approved access-controlled store with an organization-approved retention
policy. A 365-day Actions artifact retention may exceed account limits and is not
a substitute for a durable compliance evidence archive.

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
    - [ ] Evidence archived for audit (retained according to approved legal/security policy)
    - [ ] Metrics compared to prior review cycle
```


## Best Practices

- Automate access data extraction to eliminate manual data gathering and reduce errors
- Integrate access review with HR systems to automatically flag accounts for departed employees
- Use risk-based review frequency: privileged access quarterly, standard access semi-annually
- Provide managers with clear context: show last login date, permissions, and role to inform decisions
- Set firm deadlines with escalation for non-response (non-response triggers owner escalation and a risk-approved decision, not blanket automatic revocation)
- Detect and eliminate orphaned accounts from contractors, former employees, and decommissioned services
- Review service accounts and API keys alongside human accounts to prevent credential sprawl
- Document all exceptions with business justification, approver, and expiration date
- Track review metrics over time: completion rates, revocation rates, time to remediate
- Archive all access review evidence for the approved policy period with access controls and minimization

