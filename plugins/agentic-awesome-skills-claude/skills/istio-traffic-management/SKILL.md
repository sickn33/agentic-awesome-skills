---
name: istio-traffic-management
description: "Comprehensive guide to Istio traffic management for production service mesh deployments."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Istio Traffic Management

Comprehensive guide to Istio traffic management for production service mesh deployments.

## Do not use this skill when

- The task is unrelated to istio traffic management
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Configuring service-to-service routing
- Implementing canary or blue-green deployments
- Setting up circuit breakers and retries
- Load balancing configuration
- Traffic mirroring for testing
- Fault injection for chaos engineering

## Core Concepts

### 1. Traffic Management Resources

| Resource | Purpose | Scope |
|----------|---------|-------|
| **VirtualService** | Route traffic to destinations | Host-based |
| **DestinationRule** | Define policies after routing | Service-based |
| **Gateway** | Configure ingress/egress | Cluster edge |
| **ServiceEntry** | Add external services | Mesh-wide |

### 2. Traffic Flow

```
Client → Gateway → VirtualService → DestinationRule → Service
                   (routing)        (policies)        (pods)
```

## Templates

### Template 1: Basic Routing

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: reviews-route
  namespace: bookinfo
spec:
  hosts:
    - reviews
  http:
    - match:
        - headers:
            end-user:
              exact: jason
      route:
        - destination:
            host: reviews
            subset: v2
    - route:
        - destination:
            host: reviews
            subset: v1
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: reviews-destination
  namespace: bookinfo
spec:
  host: reviews
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
    - name: v3
      labels:
        version: v3
```

### Template 2: Canary Deployment

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-canary
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: stable
          weight: 90
        - destination:
            host: my-service
            subset: canary
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service-dr
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
  subsets:
    - name: stable
      labels:
        version: stable
    - name: canary
      labels:
        version: canary
```

### Template 3: Circuit Breaker

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: circuit-breaker
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
      minHealthPercent: 30
```

### Template 4: Retry and Timeout

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ratings-retry
spec:
  hosts:
    - ratings
  http:
    - route:
        - destination:
            host: ratings
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-4xx,503
        retryRemoteLocalities: true
```

### Template 5: Traffic Mirroring

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mirror-traffic
spec:
  hosts:
    - my-service
  http:
    - route:
        - destination:
            host: my-service
            subset: v1
      mirror:
        host: my-service
        subset: v2
      mirrorPercentage:
        value: 100.0
```

### Template 6: Fault Injection

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: fault-injection
spec:
  hosts:
    - ratings
  http:
    - fault:
        delay:
          percentage:
            value: 10
          fixedDelay: 5s
        abort:
          percentage:
            value: 5
          httpStatus: 503
      route:
        - destination:
            host: ratings
```

### Template 7: Ingress Gateway

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-gateway
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
        credentialName: my-tls-secret
      hosts:
        - "*.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-vs
spec:
  hosts:
    - "api.example.com"
  gateways:
    - my-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-service
            port:
              number: 8080
```

## Load Balancing Strategies

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: load-balancing
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN  # or LEAST_CONN, RANDOM, PASSTHROUGH
---
# Consistent hashing for sticky sessions
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: sticky-sessions
spec:
  host: my-service
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
        # or: httpCookie, useSourceIp, httpQueryParameterName
```

## Best Practices

### Do's
- **Start simple** - Add complexity incrementally
- **Use subsets** - Version your services clearly
- **Set timeouts** - Always configure reasonable timeouts
- **Enable retries** - But with backoff and limits
- **Monitor** - Use Kiali and Jaeger for visibility

### Don'ts
- **Don't over-retry** - Can cause cascading failures
- **Don't ignore outlier detection** - Enable circuit breakers
- **Don't mirror to production** - Mirror to test environments
- **Don't skip canary** - Test with small traffic percentage first

## Debugging Commands

```bash
# Check VirtualService configuration
istioctl analyze

# View effective routes
istioctl proxy-config routes deploy/my-app -o json

# Check endpoint discovery
istioctl proxy-config endpoints deploy/my-app

# Debug traffic
istioctl proxy-config log deploy/my-app --level debug
```

## Resources

- [Istio Traffic Management](https://istio.io/latest/docs/concepts/traffic-management/)
- [Virtual Service Reference](https://istio.io/latest/docs/reference/config/networking/virtual-service/)
- [Destination Rule Reference](https://istio.io/latest/docs/reference/config/networking/destination-rule/)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
