# Kubernetes Service Specification Reference

Comprehensive reference for Kubernetes Service resources, covering service types, networking, load balancing, and service discovery patterns.

## Overview

A Service provides stable network endpoints for accessing Pods. Services enable loose coupling between microservices by providing service discovery and load balancing.

## Service Types

### 1. ClusterIP (Default)

Exposes the service on an internal cluster IP. Only reachable from within the cluster.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  sessionAffinity: None
```

**Use cases:**
- Internal microservice communication
- Database services
- Internal APIs
- Message queues

### 2. NodePort

Exposes the service on each Node's IP at a static port (30000-32767 range).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
spec:
  type: NodePort
  selector:
    app: frontend
  ports:
  - name: http
    port: 80
    targetPort: 8080
    nodePort: 30080  # Optional, auto-assigned if omitted
    protocol: TCP
```

**Use cases:**
- Development/testing external access
- Small deployments without load balancer
- Direct node access requirements

**Limitations:**
- Limited port range (30000-32767)
- Must handle node failures
- No built-in load balancing across nodes

### 3. LoadBalancer

Exposes the service using a cloud provider's load balancer.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: public-api
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
  loadBalancerSourceRanges:
  - 203.0.113.0/24
```

**Cloud-specific annotations:**

**AWS:**
```yaml
annotations:
  service.beta.kubernetes.io/aws-load-balancer-type: "nlb"  # or "external"
  service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
  service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
  service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:..."
  service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"
```

**Azure:**
```yaml
annotations:
  service.beta.kubernetes.io/azure-load-balancer-internal: "true"
  service.beta.kubernetes.io/azure-pip-name: "my-public-ip"
```

**GCP:**
```yaml
annotations:
  cloud.google.com/load-balancer-type: "Internal"
  cloud.google.com/backend-config: '{"default": "my-backend-config"}'
```

### 4. ExternalName

Maps service to external DNS name (CNAME record).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
spec:
  type: ExternalName
  externalName: db.external.example.com
  ports:
  - port: 5432
```

**Use cases:**
- Accessing external services
- Service migration scenarios
- Multi-cluster service references

## Complete Service Specification

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: production
  labels:
    app: my-app
    tier: backend
  annotations:
    description: "Main application service"
    prometheus.io/scrape: "true"
spec:
  # Service type
  type: ClusterIP

  # Pod selector
  selector:
    app: my-app
    version: v1

  # Ports configuration
  ports:
  - name: http
    port: 80           # Service port
    targetPort: 8080   # Container port (or named port)
    protocol: TCP      # TCP, UDP, or SCTP

  # Session affinity
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800

  # IP configuration
  clusterIP: 10.0.0.10  # Optional: specific IP
  clusterIPs:
  - 10.0.0.10
  ipFamilies:
  - IPv4
  ipFamilyPolicy: SingleStack

  # External traffic policy
  externalTrafficPolicy: Local

  # Internal traffic policy
  internalTrafficPolicy: Local

  # Health check
  healthCheckNodePort: 30000

  # Load balancer config (for type: LoadBalancer)
  loadBalancerIP: 203.0.113.100
  loadBalancerSourceRanges:
  - 203.0.113.0/24

  # External IPs
  externalIPs:
  - 80.11.12.10

  # Publishing strategy
  publishNotReadyAddresses: false
```

## Port Configuration

### Named Ports

Use named ports in Pods for flexibility:

**Deployment:**
```yaml
spec:
  template:
    spec:
      containers:
      - name: app
        ports:
        - name: http
          containerPort: 8080
        - name: metrics
          containerPort: 9090
```

**Service:**
```yaml
spec:
  ports:
  - name: http
    port: 80
    targetPort: http  # References named port
  - name: metrics
    port: 9090
    targetPort: metrics
```

### Multiple Ports

```yaml
spec:
  ports:
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
  - name: grpc
    port: 9090
    targetPort: 9090
    protocol: TCP
```

## Session Affinity

### None (Default)

Distributes requests randomly across pods.

```yaml
spec:
  sessionAffinity: None
```

### ClientIP

Routes requests from same client IP to same pod.

```yaml
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
```

**Use cases:**
- Stateful applications
- Session-based applications
- WebSocket connections

## Traffic Policies

### External Traffic Policy

**Cluster (Default):**
```yaml
spec:
  externalTrafficPolicy: Cluster
```
- Load balances across all nodes
- May add extra network hop
- Source IP is masked

**Local:**
```yaml
spec:
  externalTrafficPolicy: Local
```
- Traffic goes only to pods on receiving node
- Preserves client source IP
- Better performance (no extra hop)
- May cause imbalanced load

### Internal Traffic Policy

```yaml
spec:
  internalTrafficPolicy: Local  # or Cluster
```

Controls traffic routing for cluster-internal clients.

## Headless Services

Service without cluster IP for direct pod access.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database
spec:
  clusterIP: None  # Headless
  selector:
    app: database
  ports:
  - port: 5432
    targetPort: 5432
```

**Use cases:**
- StatefulSet pod discovery
- Direct pod-to-pod communication
- Custom load balancing
- Database clusters

**DNS returns:**
- Individual pod IPs instead of service IP
- Format: `<pod-name>.<service-name>.<namespace>.svc.cluster.local`

## Service Discovery

### DNS

**ClusterIP Service:**
```
<service-name>.<namespace>.svc.cluster.local
```

Example:
```bash
curl http://backend-service.production.svc.cluster.local
```

**Within same namespace:**
```bash
curl http://backend-service
```

**Headless Service (returns pod IPs):**
```
<pod-name>.<service-name>.<namespace>.svc.cluster.local
```

### Environment Variables

Kubernetes injects service info into pods:

```bash
# Service host and port
BACKEND_SERVICE_SERVICE_HOST=10.0.0.100
BACKEND_SERVICE_SERVICE_PORT=80

# For named ports
BACKEND_SERVICE_SERVICE_PORT_HTTP=80
```

**Note:** Pods must be created after the service for env vars to be injected.

## Load Balancing

### Algorithms

Kubernetes uses random selection by default. For advanced load balancing:

**Service Mesh (Istio example):**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-destination-rule
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST  # or ROUND_ROBIN, RANDOM, PASSTHROUGH
    connectionPool:
      tcp:
        maxConnections: 100
```

### Connection Limits

Use pod disruption budgets and resource limits:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-app-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-app
```

## Service Mesh Integration

### Istio Virtual Service

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        version:
          exact: v2
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
      weight: 90
    - destination:
        host: my-service
        subset: v2
      weight: 10
```

## Common Patterns

### Pattern 1: Internal Microservice

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: backend
  labels:
    app: user-service
    tier: backend
spec:
  type: ClusterIP
  selector:
    app: user-service
  ports:
  - name: http
    port: 8080
    targetPort: http
    protocol: TCP
  - name: grpc
    port: 9090
    targetPort: grpc
    protocol: TCP
```

### Pattern 2: Public API with Load Balancer

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:..."
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: api-gateway
  ports:
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
  loadBalancerSourceRanges:
  - 0.0.0.0/0
```

### Pattern 3: StatefulSet with Headless Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: cassandra
spec:
  clusterIP: None
  selector:
    app: cassandra
  ports:
  - port: 9042
    targetPort: 9042
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      containers:
      - name: cassandra
        image: cassandra:4.0
```

### Pattern 4: External Service Mapping

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-database
spec:
  type: ExternalName
  externalName: prod-db.cxyz.us-west-2.rds.amazonaws.com
---
# Or with Endpoints for IP-based external service
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  ports:
  - port: 443
    targetPort: 443
    protocol: TCP
---
apiVersion: v1
kind: Endpoints
metadata:
  name: external-api
subsets:
- addresses:
  - ip: 203.0.113.100
  ports:
  - port: 443
```

### Pattern 5: Multi-Port Service with Metrics

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
    prometheus.io/path: "/metrics"
spec:
  type: ClusterIP
  selector:
    app: web-app
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: metrics
    port: 9090
    targetPort: 9090
```

## Network Policies

Control traffic to services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

## Best Practices

### Service Configuration

1. **Use named ports** for flexibility
2. **Set appropriate service type** based on exposure needs
3. **Use labels and selectors consistently** across Deployments and Services
4. **Configure session affinity** for stateful apps
5. **Set external traffic policy to Local** for IP preservation
6. **Use headless services** for StatefulSets
7. **Implement network policies** for security
8. **Add monitoring annotations** for observability

### Production Checklist

- [ ] Service type appropriate for use case
- [ ] Selector matches pod labels
- [ ] Named ports used for clarity
- [ ] Session affinity configured if needed
- [ ] Traffic policy set appropriately
- [ ] Load balancer annotations configured (if applicable)
- [ ] Source IP ranges restricted (for public services)
- [ ] Health check configuration validated
- [ ] Monitoring annotations added
- [ ] Network policies defined

### Performance Tuning

**For high traffic:**
```yaml
spec:
  externalTrafficPolicy: Local
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

**For WebSocket/long connections:**
```yaml
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 86400  # 24 hours
```

## Troubleshooting

### Service not accessible

```bash
# Check service exists
kubectl get service <service-name>

# Check endpoints (should show pod IPs)
kubectl get endpoints <service-name>

# Describe service
kubectl describe service <service-name>

# Check if pods match selector
kubectl get pods -l app=<app-name>
```

**Common issues:**
- Selector doesn't match pod labels
- No pods running (endpoints empty)
- Ports misconfigured
- Network policy blocking traffic

### DNS resolution failing

```bash
# Test DNS from pod
kubectl run debug --rm -it --image=busybox -- nslookup <service-name>

# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

### Load balancer issues

```bash
# Check load balancer status
kubectl describe service <service-name>

# Check events
kubectl get events --sort-by='.lastTimestamp'

# Verify cloud provider configuration
kubectl describe node
```

## Related Resources

- [Kubernetes Service API Reference](https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.28/#service-v1-core)
- [Service Networking](https://kubernetes.io/docs/concepts/services-networking/service/)
- [DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
