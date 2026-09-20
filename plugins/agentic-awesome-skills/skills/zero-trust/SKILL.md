---
name: zero-trust
description: Implement zero-trust network architecture. Configure identity-based access,
  micro-segmentation, and continuous verification. Use when implementing modern security
  architectures.
category: security
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Zero Trust Architecture

Implement "never trust, always verify" security model.

## When to Use This Skill

Use this skill when:
- Replacing traditional perimeter-based VPN access models
- Implementing BeyondCorp-style access to internal applications
- Securing multi-cloud or hybrid-cloud environments
- Enforcing identity-based access for every service interaction
- Meeting compliance requirements for continuous verification and least privilege
- Adopting micro-segmentation for Kubernetes or cloud workloads

## Prerequisites

- Identity provider (IdP) supporting OIDC/SAML (Okta, Azure AD, Google Workspace)
- Service mesh or proxy infrastructure (Istio, Envoy, Cloudflare Access)
- Device management/MDM solution for device posture checks
- Kubernetes cluster for workload-level examples
- Understanding of mTLS, RBAC, and network policies

## Core Principles

```yaml
zero_trust_principles:
  verify_explicitly:
    description: "Authenticate and authorize every access request"
    controls:
      - Strong multi-factor authentication
      - Identity-aware proxy for all applications
      - Service-to-service mTLS
      - API token validation on every request

  least_privilege:
    description: "Grant minimum access needed for the task"
    controls:
      - Just-in-time (JIT) access provisioning
      - Time-bounded access grants
      - Role-based access with fine-grained permissions
      - Regular access reviews and certification

  assume_breach:
    description: "Design systems expecting compromise has occurred"
    controls:
      - Micro-segmentation between all services
      - End-to-end encryption (data in transit and at rest)
      - Continuous monitoring and anomaly detection
      - Blast radius containment
```

## BeyondCorp Implementation

### Cloudflare Access Configuration

```bash
# Create an Access application for an internal service
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Internal Dashboard",
    "domain": "dashboard.internal.example.com",
    "type": "self_hosted",
    "session_duration": "12h",
    "auto_redirect_to_identity": true,
    "allowed_idps": ["google-workspace-idp-id"]
  }'

# Create an Access policy
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/access/apps/${APP_ID}/policies" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engineering team access",
    "decision": "allow",
    "include": [
      { "group": { "id": "engineering-group-id" } }
    ],
    "require": [
      { "login_method": { "id": "google-workspace-idp-id" } }
    ],
    "exclude": [
      { "geo": { "country_code": "KP" } }
    ]
  }'

# Create a device posture rule
curl -X POST "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/devices/posture" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Require disk encryption",
    "type": "disk_encryption",
    "match": { "platform": "linux" },
    "schedule": "1h",
    "input": { "requireAll": true }
  }'
```

### Cloudflare Access Terraform

```hcl
resource "cloudflare_access_application" "dashboard" {
  account_id       = var.cloudflare_account_id
  name             = "Internal Dashboard"
  domain           = "dashboard.internal.example.com"
  type             = "self_hosted"
  session_duration = "12h"

  auto_redirect_to_identity = true
}

resource "cloudflare_access_policy" "engineering" {
  account_id     = var.cloudflare_account_id
  application_id = cloudflare_access_application.dashboard.id
  name           = "Engineering team"
  precedence     = 1
  decision       = "allow"

  include {
    group = [cloudflare_access_group.engineering.id]
  }

  require {
    login_method = [var.google_idp_id]
  }
}

resource "cloudflare_access_group" "engineering" {
  account_id = var.cloudflare_account_id
  name       = "Engineering"

  include {
    email_domain = ["example.com"]
  }

  require {
    group = ["engineering@example.com"]
  }
}
```

## Identity-Aware Proxy with OAuth2 Proxy

```yaml
# oauth2-proxy deployment for protecting internal services
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-proxy
  namespace: auth
spec:
  replicas: 2
  selector:
    matchLabels:
      app: oauth2-proxy
  template:
    metadata:
      labels:
        app: oauth2-proxy
    spec:
      containers:
        - name: oauth2-proxy
          image: quay.io/oauth2-proxy/oauth2-proxy:v7.6.0
          args:
            - --provider=oidc
            - --oidc-issuer-url=https://accounts.google.com
            - --client-id=$(CLIENT_ID)
            - --client-secret=$(CLIENT_SECRET)
            - --email-domain=example.com
            - --upstream=http://internal-service.default.svc:8080
            - --http-address=0.0.0.0:4180
            - --cookie-secret=$(COOKIE_SECRET)
            - --cookie-secure=true
            - --cookie-httponly=true
            - --cookie-samesite=lax
            - --set-xauthrequest=true
            - --pass-access-token=true
            - --skip-provider-button=true
            - --session-store-type=redis
            - --redis-connection-url=redis://redis.auth.svc:6379
          env:
            - name: CLIENT_ID
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy
                  key: client-id
            - name: CLIENT_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy
                  key: client-secret
            - name: COOKIE_SECRET
              valueFrom:
                secretKeyRef:
                  name: oauth2-proxy
                  key: cookie-secret
          ports:
            - containerPort: 4180
---
# Ingress routing through oauth2-proxy
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internal-service
  annotations:
    nginx.ingress.kubernetes.io/auth-url: "https://auth.example.com/oauth2/auth"
    nginx.ingress.kubernetes.io/auth-signin: "https://auth.example.com/oauth2/start?rd=$scheme://$host$request_uri"
    nginx.ingress.kubernetes.io/auth-response-headers: "X-Auth-Request-User,X-Auth-Request-Email"
spec:
  rules:
    - host: dashboard.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: internal-service
                port:
                  number: 8080
```

## Service Mesh mTLS (Istio)

```yaml
# Enforce strict mTLS across the mesh
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Authorization policy: frontend can call backend
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: backend-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/default/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
---
# Default deny all in namespace
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec: {}
```

## Micro-Segmentation with Kubernetes Network Policies

```yaml
# Default deny all traffic in namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow DNS resolution for all pods
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to: []
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
# Frontend: allow ingress from ingress controller, egress to backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: frontend
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 8080
---
# Database: allow from backend only, no egress
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: database-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: database
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - protocol: TCP
          port: 5432
```

## OPA Policy for Access Decisions

```rego
# policy.rego - Zero trust access decision
package zerotrust.access

import rego.v1

default allow := false

allow if {
    identity_verified
    device_compliant
    authorized_for_resource
    risk_acceptable
}

identity_verified if {
    input.identity.authenticated == true
    input.identity.mfa_verified == true
    time.now_ns() < input.identity.session_expires_ns
}

device_compliant if {
    input.device.encryption_enabled == true
    input.device.os_updated == true
    input.device.firewall_enabled == true
    input.device.certificate_valid == true
}

authorized_for_resource if {
    some role in input.identity.roles
    some permission in data.role_permissions[role]
    permission == input.resource.required_permission
}

risk_acceptable if {
    input.risk.score < 70
    not input.risk.active_threat
}

step_up_required if {
    input.risk.score >= 50
    input.risk.score < 70
    not input.identity.recent_mfa
}
```

## Implementation Steps

1. **Inventory assets and data flows** - Map every application, service, and data store
2. **Deploy identity provider** - Centralize authentication with SSO and MFA
3. **Implement identity-aware proxy** - Route all access through authentication layer
4. **Enable mTLS for service mesh** - Encrypt and authenticate all service communication
5. **Apply network policies** - Default deny with explicit allow rules
6. **Add device posture checks** - Verify device compliance before granting access
7. **Deploy continuous monitoring** - Log and analyze all access decisions
8. **Iterate and refine** - Review policies based on monitoring data

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Users cannot access internal apps | Identity provider misconfigured | Verify OIDC/SAML settings; check redirect URIs |
| mTLS connections failing | Certificate expired or wrong CA | Check cert expiry with `istioctl proxy-config secret`; verify CA chain |
| Network policy blocking legitimate traffic | Missing egress or ingress rule | Use `kubectl describe networkpolicy`; verify pod labels match selectors |
| Device posture check fails | MDM agent not reporting | Verify device agent is running; check compliance dashboard |
| OAuth2 proxy returns 403 | User email domain not in allow-list | Add domain to `--email-domain` flag or update group membership |

## Related Skills

- service-mesh (`service-mesh`) - mTLS implementation
- kubernetes-hardening (`kubernetes-hardening`) - K8s security
- vpn-setup (`vpn-setup`) - Traditional VPN (contrast with zero trust)

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
