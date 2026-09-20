# Details (moved from SKILL.md)

> Extended reference content for `gcp-audit-logs`, kept under `references/` so the entrypoint stays within the audit budget.

## Setup Checklist

```yaml
gcp_audit_logs_checklist:
  log_enablement:
    - [ ] Admin activity logs verified active (always on)
    - [ ] Data access logs enabled for sensitive services
    - [ ] Data access exemptions configured to exclude high-volume, low-risk operations
    - [ ] System event logs verified active (always on)

  log_routing:
    - [ ] Organization-level sink to BigQuery for analysis
    - [ ] Organization-level sink to Cloud Storage for long-term archive
    - [ ] Pub/Sub sink for real-time SIEM streaming (high severity events)
    - [ ] Sink writer identities granted appropriate destination permissions
    - [ ] Inclusion filters verified to capture all audit log types

  storage_and_retention:
    - [ ] BigQuery dataset created with appropriate access controls
    - [ ] Cloud Storage bucket with retention policy and bucket lock
    - [ ] Storage class lifecycle rules configured (Standard to Coldline)
    - [ ] Default log retention in Cloud Logging extended if needed

  alerting:
    - [ ] Notification channels configured (email, PagerDuty, Slack)
    - [ ] Log-based metric for IAM policy changes
    - [ ] Log-based metric for firewall rule changes
    - [ ] Log-based metric for service account key creation
    - [ ] Alert policy for each critical metric
    - [ ] Alert notification tested end-to-end

  access_control:
    - [ ] Logging Admin role restricted to security team
    - [ ] BigQuery dataset read access granted to auditors only
    - [ ] Storage bucket access restricted with IAM
    - [ ] Sink configuration changes monitored via admin activity logs
```


## Best Practices

- Enable data access logs selectively on sensitive services to control cost and volume
- Use organization-level sinks with include-children to capture all projects automatically
- Export to BigQuery with partitioned tables for efficient querying over large time ranges
- Archive to Cloud Storage with bucket lock and retention policies for immutable long-term storage
- Create log-based metrics and alerting policies for high-severity events
- Stream critical audit events via Pub/Sub to SIEM for real-time correlation
- Apply exemptions to exclude high-volume read-only service accounts from data access logs
- Restrict access to audit log sinks and destinations with least-privilege IAM bindings
- Regularly run BigQuery analysis queries to detect anomalous patterns and generate compliance reports
- Monitor log sink health and delivery latency to ensure continuous audit coverage

