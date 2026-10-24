---
name: ai-inference-service-mesh
description: Use verified service mesh patterns for AI inference traffic management, mTLS,
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

Confirm the exact cluster/context, mesh version, CRD schemas, owned namespace and authorized mutation scope. Examples are alternative fragments, not a manifest to apply wholesale: multiple DestinationRules for the same host must be consolidated under the installed version's merge rules. Preview and validate in a disposable environment; protect production routes and rollback evidence.


```bash
# Illustrative mutating install; default is not a validated production configuration
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
# Workload-level override; portLevelMtls requires a workload selector.
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: ai-inference-mtls
  namespace: ai-inference
spec:
  selector:
    matchLabels:
      app: model-server
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

```

A `ServiceEntry` registers a service; it is not a complete egress firewall. Namespace `AuthorizationPolicy` controls requests to selected workloads, not arbitrary outbound HTTPS by destination host. Enforce approved egress through a verified gateway/network policy and test bypass routes. For application-originated HTTPS, do not also originate TLS in a DestinationRule without a designed HTTP-to-TLS route (double TLS breaks the connection).

Official guidance: [Istio egress control](https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/).

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
  # Embeddings: retries can duplicate billed computation; enable only with a verified deduplication policy
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
        # Choose distribution OR a separately designed failover policy, not both.
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
        # Any model_name label must use a bounded, gateway-validated allowlist.
        # Raw client header values can create unbounded time series.
        # Do not expose raw tenant IDs as unbounded metric labels.
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

- Aggressive or unlimited streaming timeouts: choose tested idle/overall limits with the provider and gateway, not a universal 300-second value
- Blanket retries that amplify expensive generation calls -- disable retries on non-idempotent routes
- Missing identity boundaries between tenant-facing and internal services
- Assuming metrics/health ports need plaintext exceptions: prefer authenticated scrapers and the platform's supported probe rewrite; any exception requires an explicit trust model
- Setting outlier ejection too aggressively on small pools (maxEjectionPercent too high)
- Not using `holdApplicationUntilProxyStarts` causing race conditions on startup

## Related Skills

- service-mesh (`service-mesh`) - Foundational mesh concepts
- llm-gateway (`llm-gateway`) - North-south API gateway controls
- opentelemetry (`opentelemetry`) - End-to-end tracing and metrics

## When to Use

- Design or troubleshoot mTLS identity, model-version routing, inference retry budgets, mesh egress or observable latency on an actual supported cluster.

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.


Strip/validate routing headers at a trusted gateway before using them for model, cohort or tenant decisions. Test identities, authorized/denied requests, egress bypass, streaming disconnects and duplicate billable retries. Keep prompts, credentials and user/tenant identifiers out of access logs and high-cardinality telemetry. Record observed checks, not assumed cluster health.
