# Details (moved from SKILL.md)

> Extended reference content for `blue-green-deploy`, kept under `references/` so the entrypoint stays within the audit budget.

## Rollback Procedures

### Automated Rollback

```bash
#!/bin/bash
set -euo pipefail
DEPLOYMENT=${1:?Deployment name required}
NAMESPACE=${2:?Namespace required}
: "${PROMETHEUS_URL:?Set the authorized Prometheus base URL}"
[[ "$DEPLOYMENT" =~ ^[a-z0-9][a-z0-9.-]*$ ]] || exit 2
[[ "$NAMESPACE" =~ ^[a-z0-9][a-z0-9-]*$ ]] || exit 2
# Application metrics must actually carry these labels. Empty/invalid/no-traffic
# results are unavailable evidence and must never trigger an unrelated rollback.
QUERY="sum(rate(http_requests_total{namespace=\"$NAMESPACE\",deployment=\"$DEPLOYMENT\",status=~\"2.*\"}[5m])) / sum(rate(http_requests_total{namespace=\"$NAMESPACE\",deployment=\"$DEPLOYMENT\"}[5m]))"
RATE=$(curl --fail --silent --show-error --max-time 10 --get \
  --data-urlencode "query=$QUERY" "$PROMETHEUS_URL/api/v1/query" | \
  jq -er '.data.result | select(length == 1) | .[0].value[1] | tonumber | select(. >= 0 and . <= 1)')
if awk -v rate="$RATE" 'BEGIN {exit !(rate < 0.95)}'; then
  printf 'Rollback recommended for %s/%s; confirm deployment revision and approved rollback policy.\n' "$NAMESPACE" "$DEPLOYMENT"
  # Only under an already authorized rollback policy:
  # kubectl -n "$NAMESPACE" rollout undo "deployment/$DEPLOYMENT" --to-revision=REVIEWED_REVISION
fi
```

Use a preapproved bounded monitoring window, minimum traffic and consecutive-failure policy before automatic rollback. A global success rate cannot identify a deployment regression; rolling back workloads cannot undo incompatible data migrations.


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
**Solution**: Inspect capacity and readiness first; adjust maxSurge or minReadySeconds only after verifying resource headroom and stability requirements.

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

