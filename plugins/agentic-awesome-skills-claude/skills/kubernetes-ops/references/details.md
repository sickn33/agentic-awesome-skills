# Details (moved from SKILL.md)

> Extended reference content for `kubernetes-ops`, kept under `references/` so the entrypoint stays within the audit budget.

## Resource Quotas

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: myapp-quota
  namespace: myapp
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "20"
```


## Rolling Updates

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

```bash
# Update image
kubectl set image deployment/myapp myapp=myapp:2.0.0

# Check rollout status
kubectl rollout status deployment/myapp

# View history
kubectl rollout history deployment/myapp

# Rollback
kubectl rollout undo deployment/myapp
kubectl rollout undo deployment/myapp --to-revision=2
```


## Common Issues

### Issue: Pod Stuck in Pending
**Problem**: Pod won't start
**Solution**: Check resource availability, node selector, PVC binding

```bash
kubectl describe pod myapp-xxx
kubectl get events
```

### Issue: CrashLoopBackOff
**Problem**: Container keeps restarting
**Solution**: Check logs, verify entrypoint, check probes

```bash
kubectl logs myapp-xxx --previous
kubectl describe pod myapp-xxx
```

### Issue: Service Not Accessible
**Problem**: Cannot connect to service
**Solution**: Check selector labels, verify endpoints exist

```bash
kubectl get endpoints myapp
kubectl describe svc myapp
```

### Issue: Image Pull Error
**Problem**: ImagePullBackOff
**Solution**: Check image name, verify registry credentials

```bash
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=pass
```


## Best Practices

- Always set resource requests and limits
- Implement liveness and readiness probes
- Use namespaces for isolation
- Apply network policies for security
- Use ConfigMaps and Secrets for configuration
- Implement pod disruption budgets for availability
- Use labels consistently for organization
- Enable RBAC for access control


## Related Skills

- helm-charts (`helm-charts`) - Package management
- argocd-gitops (`argocd-gitops`) - GitOps deployments
- kubernetes-hardening (`kubernetes-hardening`) - Security

