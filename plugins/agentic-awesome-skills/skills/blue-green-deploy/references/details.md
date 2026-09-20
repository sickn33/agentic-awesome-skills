# Details (moved from SKILL.md)

> Extended reference content for `blue-green-deploy`, kept under `references/` so the entrypoint stays within the audit budget.

## Rollback Procedures

### Automated Rollback

```bash
#!/bin/bash
# auto-rollback.sh

DEPLOYMENT=$1
THRESHOLD=0.95
INTERVAL=60

echo "Monitoring deployment $DEPLOYMENT"

while true; do
  # Get success rate from Prometheus
  SUCCESS_RATE=$(curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status=~\"2.*\"}[5m]))/sum(rate(http_requests_total[5m]))" | jq -r '.data.result[0].value[1]')
  
  echo "Current success rate: $SUCCESS_RATE"
  
  if (( $(echo "$SUCCESS_RATE < $THRESHOLD" | bc -l) )); then
    echo "Success rate below threshold! Rolling back..."
    kubectl rollout undo deployment/$DEPLOYMENT
    exit 1
  fi
  
  sleep $INTERVAL
done
```

### Manual Rollback Checklist

```markdown

## Rollback Checklist

### Before Rollback
- [ ] Confirm issue is deployment-related
- [ ] Document current error rates
- [ ] Notify team in #deployments channel

### During Rollback
- [ ] Execute rollback command
- [ ] Monitor rollback progress
- [ ] Verify old version is serving traffic

### After Rollback
- [ ] Confirm error rates normalized
- [ ] Update incident ticket
- [ ] Schedule post-mortem
```


## Common Issues

### Issue: Slow Deployments
**Problem**: Rollout takes too long
**Solution**: Increase maxSurge, decrease minReadySeconds

### Issue: Failed Health Checks
**Problem**: Pods not becoming ready
**Solution**: Check probe endpoints, increase timeouts

### Issue: Traffic During Rollback
**Problem**: Errors during switch
**Solution**: Use connection draining, implement graceful shutdown


## Best Practices

- Always implement health checks
- Use connection draining
- Test rollback procedures regularly
- Monitor key metrics during deployment
- Implement circuit breakers
- Use deployment slots/environments
- Automate deployment verification
- Document rollback procedures


## Related Skills

- kubernetes-ops (`kubernetes-ops`) - K8s deployment basics
- argocd-gitops (`argocd-gitops`) - GitOps deployments
- feature-flags (`feature-flags`) - Progressive rollout

