---
name: ai-inference-service-mesh
description: Use service mesh patterns for AI inference traffic management, mTLS,
  canary releases, policy enforcement, and cross-cluster resilience.
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

# AI Inference Service Mesh

Apply Istio/Linkerd mesh controls to secure and optimize east-west AI traffic across inference microservices.

## Why Mesh for AI

- Enforce mTLS between gateway, retriever, reranker, and model services
- Apply fine-grained traffic policies without app code changes
- Run progressive delivery for model-serving backends
- Observe latency hops for retrieval + generation chains
- Route inference requests by model version, tenant, or priority tier
- Protect expensive GPU-backed services from cascading failures

## Prerequisites

```bash
# Install Istio with production profile
istioctl install --set profile=default \
  --set meshConfig.accessLogFile=/dev/stdout \
  --set meshConfig.defaultConfig.holdApplicationUntilProxyStarts=true

# Label inference namespace for sidecar injection
kubectl create namespace ai-inference
kubectl label namespace ai-inference istio-injection=enabled

# Verify installation
istioctl verify-install
istioctl analyze -n ai-inference
```

## Core Patterns

### mTLS Strict Mode Cluster-Wide

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Namespace-level override if needed for gradual rollout
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: ai-inference-mtls
  namespace: ai-inference
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    # gRPC inference port
    8081:
      mode: STRICT
    # Prometheus metrics port - allow plaintext scraping
    9090:
      mode: PERMISSIVE
```

### AuthorizationPolicy Per Service Account

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: model-server-access
  namespace: ai-inference
spec:
  selector:
    matchLabels:
      app: model-server
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/ai-inference/sa/api-gateway"
        - "cluster.local/ns/ai-inference/sa/orchestrator"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/v1/predict", "/v1/embeddings", "/v2/models/*/infer"]
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-external-to-retriever
  namespace: ai-inference
spec:
  selector:
    matchLabels:
      app: vector-retriever
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces: ["ai-inference"]
```

### Egress Policy for Approved Model Endpoints

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: openai-api
  namespace: ai-inference
spec:
  hosts:
  - api.openai.com
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: openai-api-tls
  namespace: ai-inference
spec:
  host: api.openai.com
  trafficPolicy:
    tls:
      mode: SIMPLE
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
      tcp:
        maxConnections: 50
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: restrict-egress
  namespace: ai-inference
spec:
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts:
        - "api.openai.com"
        - "models.anthropic.com"
        - "*.blob.core.windows.net"
```

## Traffic Management

### VirtualService for A/B Model Testing

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: model-server
  namespace: ai-inference
spec:
  hosts:
  - model-server
  http:
  # Route by header for explicit model version selection
  - match:
    - headers:
        x-model-version:
          exact: "v2-experimental"
    route:
    - destination:
        host: model-server
        subset: v2-experimental
    timeout: 120s
  # Route by header for A/B test cohort
  - match:
    - headers:
        x-ab-cohort:
          exact: "treatment"
    route:
    - destination:
        host: model-server
        subset: v2-experimental
      weight: 100
    timeout: 120s
  # Default traffic split: 90/10 canary
  - route:
    - destination:
        host: model-server
        subset: v1-stable
      weight: 90
    - destination:
        host: model-server
        subset: v2-experimental
      weight: 10
    timeout: 60s
    retries:
      attempts: 2
      perTryTimeout: 30s
      retryOn: unavailable,resource-exhausted
```

### DestinationRule with Subsets

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: model-server
  namespace: ai-inference
spec:
  host: model-server
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 100
      tcp:
        maxConnections: 200
        connectTimeout: 5s
    loadBalancer:
      simple: LEAST_REQUEST
  subsets:
  - name: v1-stable
    labels:
      version: v1
    trafficPolicy:
      connectionPool:
        http:
          maxRequestsPerConnection: 50
  - name: v2-experimental
    labels:
      version: v2
    trafficPolicy:
      connectionPool:
        http:
          maxRequestsPerConnection: 20
```

### Circuit Breaking for Inference Backends

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: model-server-circuit-breaker
  namespace: ai-inference
spec:
  host: model-server
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 200
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 15s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
      splitExternalLocalOriginErrors: true
---
# Separate circuit breaker for the vector retriever
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: vector-retriever-circuit-breaker
  namespace: ai-inference
spec:
  host: vector-retriever
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 300
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 500
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 15s
      maxEjectionPercent: 30
```

### Retry Budget for Streaming Requests

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: streaming-inference
  namespace: ai-inference
spec:
  hosts:
  - model-server
  http:
  # Streaming endpoint: no retries, long timeout
  - match:
    - uri:
        prefix: /v1/stream
    route:
    - destination:
        host: model-server
        subset: v1-stable
    timeout: 300s
    retries:
      attempts: 0
  # Embeddings endpoint: safe to retry, short timeout
  - match:
    - uri:
        prefix: /v1/embeddings
    route:
    - destination:
        host: model-server
        subset: v1-stable
    timeout: 15s
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: 5xx,reset,connect-failure,retriable-status-codes
```

## Resilience

### Locality-Aware Routing

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: model-server-locality
  namespace: ai-inference
spec:
  host: model-server
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        - from: "us-east-1/us-east-1a/*"
          to:
            "us-east-1/us-east-1a/*": 80
            "us-east-1/us-east-1b/*": 20
        failover:
        - from: us-east-1
          to: us-west-2
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Observability

```yaml
# Telemetry resource for custom metrics on inference services
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: inference-telemetry
  namespace: ai-inference
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: REQUEST_DURATION
        mode: CLIENT_AND_SERVER
      tagOverrides:
        model_name:
          operation: UPSERT
          value: "request.headers['x-model-name']"
        tenant_id:
          operation: UPSERT
          value: "request.headers['x-tenant-id']"
  tracing:
  - providers:
    - name: zipkin
    randomSamplingPercentage: 10.0
```

### Kiali Dashboard Check

```bash
# Port-forward Kiali
kubectl port-forward svc/kiali -n istio-system 20001:20001 &

# Verify mesh health via API
curl -s http://localhost:20001/kiali/api/namespaces/ai-inference/health | jq .

# Check proxy sync status
istioctl proxy-status -n ai-inference

# Debug a specific pod sidecar config
istioctl proxy-config routes deploy/model-server -n ai-inference -o json
istioctl proxy-config cluster deploy/model-server -n ai-inference
```

## Pitfalls to Avoid

- Aggressive timeouts that break streaming responses -- set 300s+ for generation endpoints
- Blanket retries that amplify expensive generation calls -- disable retries on non-idempotent routes
- Missing identity boundaries between tenant-facing and internal services
- Forgetting to exempt health check and metrics ports from strict mTLS
- Setting outlier ejection too aggressively on small pools (maxEjectionPercent too high)
- Not using `holdApplicationUntilProxyStarts` causing race conditions on startup

## Related Skills

- service-mesh (`service-mesh`) - Foundational mesh concepts
- llm-gateway (`llm-gateway`) - North-south API gateway controls
- opentelemetry (`opentelemetry`) - End-to-end tracing and metrics

## When to Use

- You are provisioning, configuring, or troubleshooting the infrastructure component covered by this skill (servers, storage, databases, networking, cloud, local AI).

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

