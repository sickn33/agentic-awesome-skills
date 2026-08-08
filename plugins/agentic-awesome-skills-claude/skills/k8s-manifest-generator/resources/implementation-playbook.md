# Kubernetes Manifest Generator Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Kubernetes Manifest Generator

Step-by-step guidance for creating production-ready Kubernetes manifests including Deployments, Services, ConfigMaps, Secrets, and PersistentVolumeClaims.

## Purpose

This skill provides comprehensive guidance for generating well-structured, secure, and production-ready Kubernetes manifests following cloud-native best practices and Kubernetes conventions.

## When to Use This Skill

Use this skill when you need to:
- Create new Kubernetes Deployment manifests
- Define Service resources for network connectivity
- Generate ConfigMap and Secret resources for configuration management
- Create PersistentVolumeClaim manifests for stateful workloads
- Follow Kubernetes best practices and naming conventions
- Implement resource limits, health checks, and security contexts
- Design manifests for multi-environment deployments

## Step-by-Step Workflow

### 1. Gather Requirements

**Understand the workload:**
- Application type (stateless/stateful)
- Container image and version
- Environment variables and configuration needs
- Storage requirements
- Network exposure requirements (internal/external)
- Resource requirements (CPU, memory)
- Scaling requirements
- Health check endpoints

**Questions to ask:**
- What is the application name and purpose?
- What container image and tag will be used?
- Does the application need persistent storage?
- What ports does the application expose?
- Are there any secrets or configuration files needed?
- What are the CPU and memory requirements?
- Does the application need to be exposed externally?

### 2. Create Deployment Manifest

**Follow this structure:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <app-name>
  namespace: <namespace>
  labels:
    app: <app-name>
    version: <version>
spec:
  replicas: 3
  selector:
    matchLabels:
      app: <app-name>
  template:
    metadata:
      labels:
        app: <app-name>
        version: <version>
    spec:
      containers:
      - name: <container-name>
        image: <image>:<tag>
        ports:
        - containerPort: <port>
          name: http
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        env:
        - name: ENV_VAR
          value: "value"
        envFrom:
        - configMapRef:
            name: <app-name>-config
        - secretRef:
            name: <app-name>-secret
```

**Best practices to apply:**
- Always set resource requests and limits
- Implement both liveness and readiness probes
- Use specific image tags (never `:latest`)
- Apply security context for non-root users
- Use labels for organization and selection
- Set appropriate replica count based on availability needs

**Reference:** See `references/deployment-spec.md` for detailed deployment options

### 3. Create Service Manifest

**Choose the appropriate Service type:**

**ClusterIP (internal only):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: <app-name>
  namespace: <namespace>
  labels:
    app: <app-name>
spec:
  type: ClusterIP
  selector:
    app: <app-name>
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
```

**LoadBalancer (external access):**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: <app-name>
  namespace: <namespace>
  labels:
    app: <app-name>
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
spec:
  type: LoadBalancer
  selector:
    app: <app-name>
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
```

**Reference:** See `references/service-spec.md` for service types and networking

### 4. Create ConfigMap

**For application configuration:**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: <app-name>-config
  namespace: <namespace>
data:
  APP_MODE: production
  LOG_LEVEL: info
  DATABASE_HOST: db.example.com
  # For config files
  app.properties: |
    server.port=8080
    server.host=0.0.0.0
    logging.level=INFO
```

**Best practices:**
- Use ConfigMaps for non-sensitive data only
- Organize related configuration together
- Use meaningful names for keys
- Consider using one ConfigMap per component
- Version ConfigMaps when making changes

**Reference:** See `assets/configmap-template.yaml` for examples

### 5. Create Secret

**For sensitive data:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: <app-name>-secret
  namespace: <namespace>
type: Opaque
stringData:
  DATABASE_PASSWORD: "changeme"
  API_KEY: "secret-api-key"
  # For certificate files
  tls.crt: |
    -----BEGIN CERTIFICATE-----
    ...
    -----END CERTIFICATE-----
  tls.key: |
    <BASE64_PRIVATE_KEY>
```

**Security considerations:**
- Never commit secrets to Git in plain text
- Use Sealed Secrets, External Secrets Operator, or Vault
- Rotate secrets regularly
- Use RBAC to limit secret access
- Consider using Secret type: `kubernetes.io/tls` for TLS secrets

### 6. Create PersistentVolumeClaim (if needed)

**For stateful applications:**

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: <app-name>-data
  namespace: <namespace>
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: gp3
  resources:
    requests:
      storage: 10Gi
```

**Mount in Deployment:**
```yaml
spec:
  template:
    spec:
      containers:
      - name: app
        volumeMounts:
        - name: data
          mountPath: /var/lib/app
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: <app-name>-data
```

**Storage considerations:**
- Choose appropriate StorageClass for performance needs
- Use ReadWriteOnce for single-pod access
- Use ReadWriteMany for multi-pod shared storage
- Consider backup strategies
- Set appropriate retention policies

### 7. Apply Security Best Practices

**Add security context to Deployment:**

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
```

**Security checklist:**
- [ ] Run as non-root user
- [ ] Drop all capabilities
- [ ] Use read-only root filesystem
- [ ] Disable privilege escalation
- [ ] Set seccomp profile
- [ ] Use Pod Security Standards

### 8. Add Labels and Annotations

**Standard labels (recommended):**

```yaml
metadata:
  labels:
    app.kubernetes.io/name: <app-name>
    app.kubernetes.io/instance: <instance-name>
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: <system-name>
    app.kubernetes.io/managed-by: kubectl
```

**Useful annotations:**

```yaml
metadata:
  annotations:
    description: "Application description"
    contact: "team@example.com"
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
```

### 9. Organize Multi-Resource Manifests

**File organization options:**

**Option 1: Single file with `---` separator**
```yaml
# app-name.yaml
---
apiVersion: v1
kind: ConfigMap
...
---
apiVersion: v1
kind: Secret
...
---
apiVersion: apps/v1
kind: Deployment
...
---
apiVersion: v1
kind: Service
...
```

**Option 2: Separate files**
```
manifests/
├── configmap.yaml
├── secret.yaml
├── deployment.yaml
├── service.yaml
└── pvc.yaml
```

**Option 3: Kustomize structure**
```
base/
├── kustomization.yaml
├── deployment.yaml
├── service.yaml
└── configmap.yaml
overlays/
├── dev/
│   └── kustomization.yaml
└── prod/
    └── kustomization.yaml
```

### 10. Validate and Test

**Validation steps:**

```bash
# Dry-run validation
kubectl apply -f manifest.yaml --dry-run=client

# Server-side validation
kubectl apply -f manifest.yaml --dry-run=server

# Validate with kubeval
kubeval manifest.yaml

# Validate with kube-score
kube-score score manifest.yaml

# Check with kube-linter
kube-linter lint manifest.yaml
```

**Testing checklist:**
- [ ] Manifest passes dry-run validation
- [ ] All required fields are present
- [ ] Resource limits are reasonable
- [ ] Health checks are configured
- [ ] Security context is set
- [ ] Labels follow conventions
- [ ] Namespace exists or is created

## Common Patterns

### Pattern 1: Simple Stateless Web Application

**Use case:** Standard web API or microservice

**Components needed:**
- Deployment (3 replicas for HA)
- ClusterIP Service
- ConfigMap for configuration
- Secret for API keys
- HorizontalPodAutoscaler (optional)

**Reference:** See `assets/deployment-template.yaml`

### Pattern 2: Stateful Database Application

**Use case:** Database or persistent storage application

**Components needed:**
- StatefulSet (not Deployment)
- Headless Service
- PersistentVolumeClaim template
- ConfigMap for DB configuration
- Secret for credentials

### Pattern 3: Background Job or Cron

**Use case:** Scheduled tasks or batch processing

**Components needed:**
- CronJob or Job
- ConfigMap for job parameters
- Secret for credentials
- ServiceAccount with RBAC

### Pattern 4: Multi-Container Pod

**Use case:** Application with sidecar containers

**Components needed:**
- Deployment with multiple containers
- Shared volumes between containers
- Init containers for setup
- Service (if needed)

## Templates

The following templates are available in the `assets/` directory:

- `deployment-template.yaml` - Standard deployment with best practices
- `service-template.yaml` - Service configurations (ClusterIP, LoadBalancer, NodePort)
- `configmap-template.yaml` - ConfigMap examples with different data types
- `secret-template.yaml` - Secret examples (to be generated, not committed)
- `pvc-template.yaml` - PersistentVolumeClaim templates

## Reference Documentation

- `references/deployment-spec.md` - Detailed Deployment specification
- `references/service-spec.md` - Service types and networking details

## Best Practices Summary

1. **Always set resource requests and limits** - Prevents resource starvation
2. **Implement health checks** - Ensures Kubernetes can manage your application
3. **Use specific image tags** - Avoid unpredictable deployments
4. **Apply security contexts** - Run as non-root, drop capabilities
5. **Use ConfigMaps and Secrets** - Separate config from code
6. **Label everything** - Enables filtering and organization
7. **Follow naming conventions** - Use standard Kubernetes labels
8. **Validate before applying** - Use dry-run and validation tools
9. **Version your manifests** - Keep in Git with version control
10. **Document with annotations** - Add context for other developers

## Troubleshooting

**Pods not starting:**
- Check image pull errors: `kubectl describe pod <pod-name>`
- Verify resource availability: `kubectl get nodes`
- Check events: `kubectl get events --sort-by='.lastTimestamp'`

**Service not accessible:**
- Verify selector matches pod labels: `kubectl get endpoints <service-name>`
- Check service type and port configuration
- Test from within cluster: `kubectl run debug --rm -it --image=busybox -- sh`

**ConfigMap/Secret not loading:**
- Verify names match in Deployment
- Check namespace
- Ensure resources exist: `kubectl get configmap,secret`

## Next Steps

After creating manifests:
1. Store in Git repository
2. Set up CI/CD pipeline for deployment
3. Consider using Helm or Kustomize for templating
4. Implement GitOps with ArgoCD or Flux
5. Add monitoring and observability

## Related Skills

- `helm-chart-scaffolding` - For templating and packaging
- `gitops-workflow` - For automated deployments
- `k8s-security-policies` - For advanced security configurations
