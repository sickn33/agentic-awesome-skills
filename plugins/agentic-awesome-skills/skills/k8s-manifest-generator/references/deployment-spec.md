# Kubernetes Deployment Specification Reference

Comprehensive reference for Kubernetes Deployment resources, covering all key fields, best practices, and common patterns.

## Overview

A Deployment provides declarative updates for Pods and ReplicaSets. It manages the desired state of your application, handling rollouts, rollbacks, and scaling operations.

## Complete Deployment Specification

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: my-system
  annotations:
    description: "Main application deployment"
    contact: "backend-team@example.com"
spec:
  # Replica management
  replicas: 3
  revisionHistoryLimit: 10

  # Pod selection
  selector:
    matchLabels:
      app: my-app
      version: v1

  # Update strategy
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0

  # Minimum time for pod to be ready
  minReadySeconds: 10

  # Deployment will fail if it doesn't progress in this time
  progressDeadlineSeconds: 600

  # Pod template
  template:
    metadata:
      labels:
        app: my-app
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
    spec:
      # Service account for RBAC
      serviceAccountName: my-app

      # Security context for the pod
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      # Init containers run before main containers
      initContainers:
      - name: init-db
        image: busybox:1.36
        command: ['sh', '-c', 'until nc -z db-service 5432; do sleep 1; done']
        securityContext:
          allowPrivilegeEscalation: false
          runAsNonRoot: true
          runAsUser: 1000

      # Main containers
      containers:
      - name: app
        image: myapp:1.0.0
        imagePullPolicy: IfNotPresent

        # Container ports
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP

        # Environment variables
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: POD_NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url

        # ConfigMap and Secret references
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets

        # Resource requests and limits
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

        # Liveness probe
        livenessProbe:
          httpGet:
            path: /health/live
            port: http
            httpHeaders:
            - name: Custom-Header
              value: Awesome
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /health/ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3

        # Startup probe (for slow-starting containers)
        startupProbe:
          httpGet:
            path: /health/startup
            port: http
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 30

        # Volume mounts
        volumeMounts:
        - name: data
          mountPath: /var/lib/app
        - name: config
          mountPath: /etc/app
          readOnly: true
        - name: tmp
          mountPath: /tmp

        # Security context for container
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1000
          capabilities:
            drop:
            - ALL

        # Lifecycle hooks
        lifecycle:
          postStart:
            exec:
              command: ["/bin/sh", "-c", "echo Container started > /tmp/started"]
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]

      # Volumes
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: app-data
      - name: config
        configMap:
          name: app-config
      - name: tmp
        emptyDir: {}

      # DNS configuration
      dnsPolicy: ClusterFirst
      dnsConfig:
        options:
        - name: ndots
          value: "2"

      # Scheduling
      nodeSelector:
        disktype: ssd

      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - my-app
              topologyKey: kubernetes.io/hostname

      tolerations:
      - key: "app"
        operator: "Equal"
        value: "my-app"
        effect: "NoSchedule"

      # Termination
      terminationGracePeriodSeconds: 30

      # Image pull secrets
      imagePullSecrets:
      - name: regcred
```

## Field Reference

### Metadata Fields

#### Required Fields
- `apiVersion`: `apps/v1` (current stable version)
- `kind`: `Deployment`
- `metadata.name`: Unique name within namespace

#### Recommended Metadata
- `metadata.namespace`: Target namespace (defaults to `default`)
- `metadata.labels`: Key-value pairs for organization
- `metadata.annotations`: Non-identifying metadata

### Spec Fields

#### Replica Management

**`replicas`** (integer, default: 1)
- Number of desired pod instances
- Best practice: Use 3+ for production high availability
- Can be scaled manually or via HorizontalPodAutoscaler

**`revisionHistoryLimit`** (integer, default: 10)
- Number of old ReplicaSets to retain for rollback
- Set to 0 to disable rollback capability
- Reduces storage overhead for long-running deployments

#### Update Strategy

**`strategy.type`** (string)
- `RollingUpdate` (default): Gradual pod replacement
- `Recreate`: Delete all pods before creating new ones

**`strategy.rollingUpdate.maxSurge`** (int or percent, default: 25%)
- Maximum pods above desired replicas during update
- Example: With 3 replicas and maxSurge=1, up to 4 pods during update

**`strategy.rollingUpdate.maxUnavailable`** (int or percent, default: 25%)
- Maximum pods below desired replicas during update
- Set to 0 for zero-downtime deployments
- Cannot be 0 if maxSurge is 0

**Best practices:**
```yaml
# Zero-downtime deployment
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0

# Fast deployment (can have brief downtime)
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 2
    maxUnavailable: 1

# Complete replacement
strategy:
  type: Recreate
```

#### Pod Template

**`template.metadata.labels`**
- Must include labels matching `spec.selector.matchLabels`
- Add version labels for blue/green deployments
- Include standard Kubernetes labels

**`template.spec.containers`** (required)
- Array of container specifications
- At least one container required
- Each container needs unique name

#### Container Configuration

**Image Management:**
```yaml
containers:
- name: app
  image: registry.example.com/myapp:1.0.0
  imagePullPolicy: IfNotPresent  # or Always, Never
```

Image pull policies:
- `IfNotPresent`: Pull if not cached (default for tagged images)
- `Always`: Always pull (default for :latest)
- `Never`: Never pull, fail if not cached

**Port Declarations:**
```yaml
ports:
- name: http      # Named for referencing in Service
  containerPort: 8080
  protocol: TCP   # TCP (default), UDP, or SCTP
  hostPort: 8080  # Optional: Bind to host port (rarely used)
```

#### Resource Management

**Requests vs Limits:**

```yaml
resources:
  requests:
    memory: "256Mi"  # Guaranteed resources
    cpu: "250m"      # 0.25 CPU cores
  limits:
    memory: "512Mi"  # Maximum allowed
    cpu: "500m"      # 0.5 CPU cores
```

**QoS Classes (determined automatically):**

1. **Guaranteed**: requests = limits for all containers
   - Highest priority
   - Last to be evicted

2. **Burstable**: requests < limits or only requests set
   - Medium priority
   - Evicted before Guaranteed

3. **BestEffort**: No requests or limits set
   - Lowest priority
   - First to be evicted

**Best practices:**
- Always set requests in production
- Set limits to prevent resource monopolization
- Memory limits should be 1.5-2x requests
- CPU limits can be higher for bursty workloads

#### Health Checks

**Probe Types:**

1. **startupProbe** - For slow-starting applications
   ```yaml
   startupProbe:
     httpGet:
       path: /health/startup
       port: 8080
     initialDelaySeconds: 0
     periodSeconds: 10
     failureThreshold: 30  # 5 minutes to start (10s * 30)
   ```

2. **livenessProbe** - Restarts unhealthy containers
   ```yaml
   livenessProbe:
     httpGet:
       path: /health/live
       port: 8080
     initialDelaySeconds: 30
     periodSeconds: 10
     timeoutSeconds: 5
     failureThreshold: 3  # Restart after 3 failures
   ```

3. **readinessProbe** - Controls traffic routing
   ```yaml
   readinessProbe:
     httpGet:
       path: /health/ready
       port: 8080
     initialDelaySeconds: 5
     periodSeconds: 5
     failureThreshold: 3  # Remove from service after 3 failures
   ```

**Probe Mechanisms:**

```yaml
# HTTP GET
httpGet:
  path: /health
  port: 8080
  httpHeaders:
  - name: Authorization
    value: Bearer token

# TCP Socket
tcpSocket:
  port: 3306

# Command execution
exec:
  command:
  - cat
  - /tmp/healthy

# gRPC (Kubernetes 1.24+)
grpc:
  port: 9090
  service: my.service.health.v1.Health
```

**Probe Timing Parameters:**

- `initialDelaySeconds`: Wait before first probe
- `periodSeconds`: How often to probe
- `timeoutSeconds`: Probe timeout
- `successThreshold`: Successes needed to mark healthy (1 for liveness/startup)
- `failureThreshold`: Failures before taking action

#### Security Context

**Pod-level security context:**
```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    fsGroupChangePolicy: OnRootMismatch
    seccompProfile:
      type: RuntimeDefault
```

**Container-level security context:**
```yaml
containers:
- name: app
  securityContext:
    allowPrivilegeEscalation: false
    readOnlyRootFilesystem: true
    runAsNonRoot: true
    runAsUser: 1000
    capabilities:
      drop:
      - ALL
      add:
      - NET_BIND_SERVICE  # Only if needed
```

**Security best practices:**
- Always run as non-root (`runAsNonRoot: true`)
- Drop all capabilities and add only needed ones
- Use read-only root filesystem when possible
- Enable seccomp profile
- Disable privilege escalation

#### Volumes

**Volume Types:**

```yaml
volumes:
# PersistentVolumeClaim
- name: data
  persistentVolumeClaim:
    claimName: app-data

# ConfigMap
- name: config
  configMap:
    name: app-config
    items:
    - key: app.properties
      path: application.properties

# Secret
- name: secrets
  secret:
    secretName: app-secrets
    defaultMode: 0400

# EmptyDir (ephemeral)
- name: cache
  emptyDir:
    sizeLimit: 1Gi

# HostPath (avoid in production)
- name: host-data
  hostPath:
    path: /data
    type: DirectoryOrCreate
```

#### Scheduling

**Node Selection:**

```yaml
# Simple node selector
nodeSelector:
  disktype: ssd
  zone: us-west-1a

# Node affinity (more expressive)
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
      - matchExpressions:
        - key: kubernetes.io/arch
          operator: In
          values:
          - amd64
          - arm64
```

**Pod Affinity/Anti-Affinity:**

```yaml
# Spread pods across nodes
affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
    - labelSelector:
        matchLabels:
          app: my-app
      topologyKey: kubernetes.io/hostname

# Co-locate with database
affinity:
  podAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchLabels:
            app: database
        topologyKey: kubernetes.io/hostname
```

**Tolerations:**

```yaml
tolerations:
- key: "node.kubernetes.io/unreachable"
  operator: "Exists"
  effect: "NoExecute"
  tolerationSeconds: 30
- key: "dedicated"
  operator: "Equal"
  value: "database"
  effect: "NoSchedule"
```

## Common Patterns

### High Availability Deployment

```yaml
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchLabels:
                app: my-app
            topologyKey: kubernetes.io/hostname
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: my-app
```

### Sidecar Container Pattern

```yaml
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:1.0.0
        volumeMounts:
        - name: shared-logs
          mountPath: /var/log
      - name: log-forwarder
        image: fluent-bit:2.0
        volumeMounts:
        - name: shared-logs
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: shared-logs
        emptyDir: {}
```

### Init Container for Dependencies

```yaml
spec:
  template:
    spec:
      initContainers:
      - name: wait-for-db
        image: busybox:1.36
        command:
        - sh
        - -c
        - |
          until nc -z database-service 5432; do
            echo "Waiting for database..."
            sleep 2
          done
      - name: run-migrations
        image: myapp:1.0.0
        command: ["./migrate", "up"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
      containers:
      - name: app
        image: myapp:1.0.0
```

## Best Practices

### Production Checklist

- [ ] Set resource requests and limits
- [ ] Implement all three probe types (startup, liveness, readiness)
- [ ] Use specific image tags (not :latest)
- [ ] Configure security context (non-root, read-only filesystem)
- [ ] Set replica count >= 3 for HA
- [ ] Configure pod anti-affinity for spread
- [ ] Set appropriate update strategy (maxUnavailable: 0 for zero-downtime)
- [ ] Use ConfigMaps and Secrets for configuration
- [ ] Add standard labels and annotations
- [ ] Configure graceful shutdown (preStop hook, terminationGracePeriodSeconds)
- [ ] Set revisionHistoryLimit for rollback capability
- [ ] Use ServiceAccount with minimal RBAC permissions

### Performance Tuning

**Fast startup:**
```yaml
spec:
  minReadySeconds: 5
  strategy:
    rollingUpdate:
      maxSurge: 2
      maxUnavailable: 1
```

**Zero-downtime updates:**
```yaml
spec:
  minReadySeconds: 10
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

**Graceful shutdown:**
```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: app
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15 && kill -SIGTERM 1"]
```

## Troubleshooting

### Common Issues

**Pods not starting:**
```bash
kubectl describe deployment <name>
kubectl get pods -l app=<app-name>
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**ImagePullBackOff:**
- Check image name and tag
- Verify imagePullSecrets
- Check registry credentials

**CrashLoopBackOff:**
- Check container logs
- Verify liveness probe is not too aggressive
- Check resource limits
- Verify application dependencies

**Deployment stuck in progress:**
- Check progressDeadlineSeconds
- Verify readiness probes
- Check resource availability

## Related Resources

- [Kubernetes Deployment API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#deployment-v1-apps)
- [Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [Resource Management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
