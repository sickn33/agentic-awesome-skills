# Details (moved from SKILL.md)

> Extended reference content for `change-management`, kept under `references/` so the entrypoint stays within the audit budget.

## Change Freeze Policy

```yaml
change_freeze:
  definition: "Period during which non-emergency changes are prohibited"

  scheduled_freezes:
    year_end:
      start: "December 15"
      end: "January 3"
      scope: "All production changes"
    major_events:
      - "Black Friday through Cyber Monday (e-commerce)"
      - "Tax filing deadline periods (financial services)"
      - "Open enrollment periods (healthcare)"

  exceptions_during_freeze:
    allowed:
      - Security patches for actively exploited vulnerabilities
      - Changes required by regulatory deadline
      - Fixes for P1/SEV1 production incidents
    approval: "VP of Engineering + Security Lead"

  communication:
    announcement: "2 weeks before freeze"
    reminder: "1 week and 1 day before freeze"
    daily_status: "During freeze period"
    lift_notification: "When freeze ends"
```


## Change Management Metrics

```yaml
metrics:
  change_success_rate:
    description: "Percentage of changes implemented without rollback or incident"
    target: ">95%"
    formula: "(successful changes / total changes) * 100"

  emergency_change_rate:
    description: "Percentage of changes classified as emergency"
    target: "<5%"
    formula: "(emergency changes / total changes) * 100"

  rollback_rate:
    description: "Percentage of changes that required rollback"
    target: "<3%"

  mean_time_to_implement:
    description: "Average time from approval to implementation"
    target: "Varies by type"

  cab_approval_time:
    description: "Average time from submission to CAB decision"
    target: "<5 business days for normal changes"
```


## Change Management Checklist

```yaml
change_management_checklist:
  process_setup:
    - [ ] Change types defined with classification criteria
    - [ ] Approval matrix documented (who approves what)
    - [ ] CAB established with regular meeting schedule
    - [ ] Emergency change procedure documented
    - [ ] Change request template created
    - [ ] Change freeze policy defined

  tooling:
    - [ ] PR template includes change management fields
    - [ ] Automated risk classification in CI/CD
    - [ ] Branch protection enforces required approvals
    - [ ] Deployment records captured automatically
    - [ ] Change audit trail preserved (PR history, approvals)

  compliance:
    - [ ] All production changes have documented approval
    - [ ] Rollback plans exist for every change
    - [ ] Post-implementation reviews conducted for failures
    - [ ] Emergency changes documented retroactively within 48 hours
    - [ ] Change metrics reported monthly
    - [ ] Audit trail retained for compliance period (1-3 years)
```


## Best Practices

- Classify changes by risk level to apply proportionate controls without slowing low-risk work
- Automate risk classification based on files changed, services affected, and deployment scope
- Use PR approvals as the native change approval mechanism for code-driven changes
- Require rollback plans for every change and test rollback procedures periodically
- Track emergency changes as a key metric: a high rate indicates systemic process issues
- Implement change freezes during critical business periods to protect stability
- Conduct post-implementation reviews for all failed changes to drive improvement
- Separate duty of implementation from duty of approval (no self-approving changes)
- Capture deployment records automatically in CI/CD rather than relying on manual entry
- Keep the CAB focused on high-risk decisions; do not bottleneck low-risk changes through CAB

