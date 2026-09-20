# Details (moved from SKILL.md)

> Extended reference content for `alerting-oncall`, kept under `references/` so the entrypoint stays within the audit budget.

## Remediation
### If caused by recent deployment:
```bash
kubectl rollout undo deployment/myapp -n production
```

### If database related:
```bash
kubectl delete pod -l app=postgres -n production
```


## Escalation
If not resolved within 15 minutes, escalate to:
- Database team: @db-oncall
- Platform team: @platform-oncall
```


## Alert Fatigue Reduction

### Strategies

```yaml
fatigue_reduction:
  aggregate_alerts:
    - Group related alerts
    - Use inhibit rules
    - Implement alert correlation
    
  tune_thresholds:
    - Base on SLOs, not arbitrary values
    - Account for normal variance
    - Use appropriate evaluation windows
    
  automate_responses:
    - Auto-remediation for known issues
    - Self-healing infrastructure
    - Automated scaling
    
  regular_review:
    - Weekly alert review
    - Remove unused alerts
    - Update thresholds based on data
```


## Common Issues

### Issue: Alert Storm
**Problem**: Too many alerts firing simultaneously
**Solution**: Implement proper grouping and inhibition rules

### Issue: Missed Alerts
**Problem**: Critical alerts not reaching on-call
**Solution**: Test escalation policies, verify contact methods

### Issue: False Positives
**Problem**: Alerts firing without actual issues
**Solution**: Tune thresholds, increase evaluation windows


## Best Practices

- Define clear severity levels
- Every alert needs a runbook
- Test on-call notifications regularly
- Review and tune alerts weekly
- Implement proper escalation paths
- Use alert grouping and inhibition
- Track alert metrics (MTTR, frequency)
- Practice incident response regularly


## Related Skills

- prometheus-grafana (`prometheus-grafana`) - Monitoring setup
- incident-response (`incident-response`) - Incident handling
- runbook-creation (`runbook-creation`) - Runbook creation

