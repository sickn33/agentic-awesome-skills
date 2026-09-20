# Details (moved from SKILL.md)

> Extended reference content for `incident-response`, kept under `references/` so the entrypoint stays within the audit budget.

## Notice of Data Security Incident

Dear [Customer/Partner],

We are writing to inform you of a security incident that we detected on
[date]. Upon discovery, we immediately activated our incident response
procedures and engaged external cybersecurity experts.

### What Happened
[Brief, factual description]

### What Information Was Involved
[Types of data affected]

### What We Are Doing
[Remediation steps taken and planned]

### What You Can Do
[Recommended actions for affected parties]

### Contact Information
For questions, please contact: [dedicated contact/hotline]

[Company Name]
[Date]
```


## IR Playbook: Compromised Credentials

```yaml
playbook: compromised-credentials
trigger: "Alert indicating credential theft, brute force success, or credential dump"

steps:
  1_validate:
    - Confirm the alert is not a false positive
    - Identify which credentials are compromised
    - Determine scope (single user, service account, API key)

  2_contain:
    - Disable compromised accounts immediately
    - Revoke active sessions and tokens
    - Rotate API keys and service account credentials
    - Block source IP if identified
    commands:
      - "aws iam update-login-profile --user-name USER --password-reset-required"
      - "aws iam delete-access-key --user-name USER --access-key-id AKIAXXXX"
      - "aws iam deactivate-mfa-device --user-name USER --serial-number ARN"
      - "kubectl delete secret compromised-secret -n NAMESPACE"

  3_investigate:
    - Review CloudTrail/audit logs for the compromised identity
    - Identify all actions taken with compromised credentials
    - Check for persistence (new keys, roles, backdoors)
    - Determine initial compromise vector (phishing, leak, breach)

  4_eradicate:
    - Remove any backdoors or persistence mechanisms
    - Rotate all credentials that may have been exposed
    - Update access policies to enforce MFA
    - Patch credential storage if vault/secret manager was compromised

  5_recover:
    - Issue new credentials with MFA enforced
    - Restore access with least-privilege review
    - Monitor new credentials for abnormal usage

  6_improve:
    - Add detection for initial compromise vector
    - Review credential management policies
    - Update security awareness training if phishing was involved
```


## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Evidence collection script fails | Insufficient permissions | Run with sudo/root; pre-authorize IR accounts |
| Cannot access compromised system | System encrypted by ransomware | Use offline disk imaging; restore from backups |
| Logs are missing or tampered | Attacker cleared logs | Check centralized log aggregator; restore from log backups |
| Cannot determine incident scope | Insufficient logging | Enable CloudTrail, VPC flow logs, audit logging for future |
| Stakeholders demanding immediate answers | Pressure to resolve quickly | Follow IR process; provide regular updates; avoid speculation |
| False positive triggered full IR | Detection rules too sensitive | Tune alerting thresholds; add validation step before escalation |
| Evidence integrity questioned | No chain of custody | Hash all evidence immediately; document who accessed what and when |


## Best Practices

- Pre-define and practice playbooks with tabletop exercises quarterly
- Maintain separate, secure communication channels for IR (not email or Slack on corporate infra)
- Always preserve evidence before making changes to compromised systems
- Establish chain of custody for all collected evidence
- Engage legal counsel early in any potential data breach
- Conduct blameless post-incident reviews within 72 hours
- Update detection rules and playbooks based on lessons learned
- Pre-authorize common IR actions so responders can act without delay
- Keep an IR "go bag" with tools, credentials, and documentation ready
- Test backup restoration procedures regularly (not just backup creation)


## Related Skills

- audit-logging (`audit-logging`) - Log analysis
- alerting-oncall (`alerting-oncall`) - Alert management
- security-automation (`security-automation`) - Automated response workflows
- threat-modeling (`threat-modeling`) - Proactive threat identification

