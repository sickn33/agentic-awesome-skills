# Details (moved from SKILL.md)

> Extended reference content for `feature-flags`, kept under `references/` so the entrypoint stays within the audit budget.

## Monitoring and Analytics

### Flag Usage Tracking

```javascript
// Track flag evaluations
const flagMetrics = {
  evaluations: new Map(),
  
  track(flagName, variation, user) {
    const key = `${flagName}:${variation}`;
    const count = this.evaluations.get(key) || 0;
    this.evaluations.set(key, count + 1);
    
    // Send to analytics
    analytics.track('feature_flag_evaluated', {
      flag: flagName,
      variation: variation,
      userId: user.key
    });
  }
};
```

### Stale Flag Detection

```python
from datetime import datetime, timedelta

def detect_stale_flags():
    """Find flags that haven't been evaluated recently."""
    stale_threshold = timedelta(days=30)
    now = datetime.utcnow()
    
    stale_flags = []
    for flag in FeatureFlag.objects.all():
        if flag.last_evaluated:
            age = now - flag.last_evaluated
            if age > stale_threshold:
                stale_flags.append({
                    'name': flag.name,
                    'last_evaluated': flag.last_evaluated,
                    'age_days': age.days
                })
    
    return stale_flags
```


## Common Issues

### Issue: Inconsistent Flag Evaluation
**Problem**: Same user sees different variations
**Solution**: Use consistent hashing, check caching strategy

### Issue: Flag Debt Accumulation
**Problem**: Too many old flags in codebase
**Solution**: Implement flag lifecycle, regular cleanup sprints

### Issue: Performance Impact
**Problem**: Flag evaluation slowing requests
**Solution**: Use local caching, batch evaluations


## Best Practices

- Use consistent naming conventions
- Document flag purpose and owner
- Set expiration dates for temporary flags
- Implement flag lifecycle management
- Use gradual rollouts (not 0→100)
- Monitor flag evaluation metrics
- Clean up old flags regularly
- Test both variations in CI


## Related Skills

- blue-green-deploy (`blue-green-deploy`) - Deployment strategies
- git-workflow (`git-workflow`) - Trunk-based development
- alerting-oncall (`alerting-oncall`) - Monitoring rollouts

