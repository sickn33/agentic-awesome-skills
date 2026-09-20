---
name: service-mesh
description: Implement Istio and Linkerd service meshes. Configure mTLS, traffic management,
  and observability. Use when managing microservices communication.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Service Mesh

Implement service-to-service communication management with mTLS, traffic shaping, observability, and policy enforcement using Istio or Linkerd.

## When to Use

- Securing microservice communication with automatic mTLS.
- Implementing canary deployments, traffic splitting, or A/B testing.
- Adding circuit breakers, retries, and timeouts without changing application code.
- Gaining service-level observability (latency, error rates, request volume).
- Enforcing authorization policies between services.

## Prerequisites

- Kubernetes cluster (1.26+) with kubectl configured.
- Helm 3 installed (for some installation methods).
- Sufficient cluster resources (Istio control plane needs ~2 GB RAM).
- For Istio: `istioctl` CLI installed.
- For Linkerd: `linkerd` CLI installed.

## Istio Installation

### Install with istioctl

```bash
# Download istioctl
curl -L https://istio.io/downloadIstio -o /tmp/downloadIstio.sh && sh /tmp/downloadIstio.sh && rm /tmp/downloadIstio.sh
cd istio-*
export PATH=$PWD/bin:$PATH

# Install with the production profile
istioctl install --set profile=default -y

# Or use the demo profile (includes all addons, good for learning)
istioctl install --set profile=demo -y

# Verify installation
istioctl verify-install

# Check running components
kubectl get pods -n istio-system
```

### Enable Sidecar Injection

```bash
# Enable automatic sidecar injection for a namespace
kubectl label namespace default istio-injection=enabled

# Verify label
kubectl get namespace default --show-labels

# Restart existing pods to inject sidecars
kubectl rollout restart deployment -n default

# Check sidecar status
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{" containers: "}{range .spec.containers[*]}{.name}{" "}{end}{"\n"}{end}'
```

### Install Observability Addons

```bash
# Install Kiali, Prometheus, Grafana, Jaeger
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/jaeger.yaml
kubectl apply -f samples/addons/kiali.yaml

# Wait for rollout
kubectl rollout status deployment/kiali -n istio-system

# Access dashboards
istioctl dashboard kiali
istioctl dashboard grafana
istioctl dashboard jaeger
```

## Traffic Management

### VirtualService (Routing Rules)

```yaml
# virtualservice.yaml — canary deployment with traffic split
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app
  namespace: default
spec:
  hosts:
    - my-app
  http:
    # Header-based routing (canary testers)
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: my-app
            subset: canary
    # Percentage-based traffic split
    - route:
        - destination:
            host: my-app
            subset: stable
          weight: 90
        - destination:
            host: my-app
            subset: canary
          weight: 10
      timeout: 30s
      retries:
        attempts: 3
        perTryTimeout: 10s
        retryOn: gateway-error,connect-failure,refused-stream
```

### DestinationRule (Subsets and Connection Policy)

```yaml
# destinationrule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-app
  namespace: default
spec:
  host: my-app
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

### Gateway (Ingress Traffic)

```yaml
# gateway.yaml — expose service to external traffic
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: app-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: app-tls-cert  # Kubernetes secret
      hosts:
        - app.example.com
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - app.example.com
      tls:
        httpsRedirect: true
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: app-external
  namespace: default
spec:
  hosts:
    - app.example.com
  gateways:
    - app-gateway
  http:
    - route:
        - destination:
            host: my-app
            port:
              number: 8080
```

## mTLS Configuration

### Strict mTLS (Cluster-Wide)

```yaml
# peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system  # Applies to entire mesh
spec:
  mtls:
    mode: STRICT
```

### Permissive mTLS (Per Namespace)

```yaml
# Allow both plaintext and mTLS during migration
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: legacy-apps
spec:
  mtls:
    mode: PERMISSIVE
```

### Verify mTLS Status

```bash
# Check mTLS status for a namespace
istioctl x describe pod <pod-name> -n default

# View TLS configuration
istioctl proxy-config cluster <pod-name>.default --fqdn my-app.default.svc.cluster.local -o json | grep -A5 "tlsContext"

# Verify with istioctl authn
istioctl authn tls-check <pod-name>.default my-app.default.svc.cluster.local
```

## Authorization Policies

```yaml
# authz-policy.yaml — only allow frontend to call API
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/frontend"
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
---
# Deny all other traffic to api
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
    - from:
        - source:
            notPrincipals:
              - "cluster.local/ns/default/sa/frontend"
```

## Circuit Breaking

```yaml
# circuit-breaker.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-api-circuit-breaker
spec:
  host: my-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 15s
      baseEjectionTime: 60s
      maxEjectionPercent: 100
```

## Linkerd Installation

```bash
# Install Linkerd CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install -o /tmp/install-linkerd.sh && sh /tmp/install-linkerd.sh && rm /tmp/install-linkerd.sh
export PATH=$HOME/.linkerd2/bin:$PATH

# Validate cluster prerequisites
linkerd check --pre

# Install Linkerd CRDs
linkerd install --crds | kubectl apply -f -

# Install Linkerd control plane
linkerd install | kubectl apply -f -

# Verify installation
linkerd check

# Inject sidecar into a namespace
kubectl get deploy -n my-app -o yaml | linkerd inject - | kubectl apply -f -

# Or annotate namespace for auto-injection
kubectl annotate namespace my-app linkerd.io/inject=enabled

# View live traffic dashboard
linkerd viz install | kubectl apply -f -
linkerd viz dashboard
```

### Linkerd Traffic Split (SMI)

```yaml
# traffic-split.yaml
apiVersion: split.smi-spec.io/v1alpha4
kind: TrafficSplit
metadata:
  name: my-app-split
  namespace: default
spec:
  service: my-app
  backends:
    - service: my-app-stable
      weight: 900
    - service: my-app-canary
      weight: 100
```

## Debugging

```bash
# Istio: check proxy configuration
istioctl proxy-config routes <pod-name>.default
istioctl proxy-config clusters <pod-name>.default
istioctl proxy-config listeners <pod-name>.default

# Istio: analyze configuration for issues
istioctl analyze -n default

# Istio: proxy debug logs
istioctl proxy-config log <pod-name>.default --level debug

# Linkerd: check proxy stats
linkerd viz stat deploy -n default
linkerd viz top deploy/my-app -n default
linkerd viz edges deploy -n default
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Sidecar not injected | Missing namespace label | Add `istio-injection=enabled` label; restart pods |
| 503 errors between services | mTLS mismatch (one side plaintext) | Set `PeerAuthentication` to `PERMISSIVE` during migration |
| High latency after mesh install | Sidecar resource limits too low | Increase sidecar CPU/memory limits in mesh config |
| VirtualService not routing | Missing DestinationRule subsets | Create matching DestinationRule with subset labels |
| `upstream connect error` | Circuit breaker tripped | Check outlier detection settings; increase thresholds |
| Authorization policy blocks everything | Default deny without matching allow rule | Add explicit ALLOW rule before DENY-all |
| Kiali shows "Unknown" traffic | Missing sidecar on calling service | Inject sidecar into all communicating services |

## Related Skills

- load-balancing (`load-balancing`) - Layer 4/7 load balancing outside Kubernetes
- reverse-proxy (`reverse-proxy`) - Ingress-level proxying
- ai-inference-service-mesh (`ai-inference-service-mesh`) - Mesh patterns for ML workloads
- dns-management (`dns-management`) - DNS for mesh ingress gateways

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

