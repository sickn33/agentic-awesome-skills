---
name: mtls-configuration
description: "Configure mutual TLS (mTLS) for zero-trust service-to-service communication. Use when implementing zero-trust networking, certificate management, or securing internal service communication."
risk: unknown
source: community
date_added: "2026-02-27"
---

# mTLS Configuration

Comprehensive guide to implementing mutual TLS for zero-trust service mesh communication.

## Do not use this skill when

- The task is unrelated to mtls configuration
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Use this skill when

- Implementing zero-trust networking
- Securing service-to-service communication
- Certificate rotation and management
- Debugging TLS handshake issues
- Compliance requirements (PCI-DSS, HIPAA)
- Multi-cluster secure communication

## Core Concepts

### 1. mTLS Flow

```
┌─────────┐                              ┌─────────┐
│ Service │                              │ Service │
│    A    │                              │    B    │
└────┬────┘                              └────┬────┘
     │                                        │
┌────┴────┐      TLS Handshake          ┌────┴────┐
│  Proxy  │◄───────────────────────────►│  Proxy  │
│(Sidecar)│  1. ClientHello             │(Sidecar)│
│         │  2. ServerHello + Cert      │         │
│         │  3. Client Cert             │         │
│         │  4. Verify Both Certs       │         │
│         │  5. Encrypted Channel       │         │
└─────────┘                              └─────────┘
```

### 2. Certificate Hierarchy

```
Root CA (Self-signed, long-lived)
    │
    ├── Intermediate CA (Cluster-level)
    │       │
    │       ├── Workload Cert (Service A)
    │       └── Workload Cert (Service B)
    │
    └── Intermediate CA (Multi-cluster)
            │
            └── Cross-cluster certs
```

## Templates

### Template 1: Istio mTLS (Strict Mode)

```yaml
# Enable strict mTLS mesh-wide
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
# Namespace-level override (permissive for migration)
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: legacy-namespace
spec:
  mtls:
    mode: PERMISSIVE
---
# Workload-specific policy
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: payment-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:
      mode: STRICT
    9090:
      mode: DISABLE  # Metrics port, no mTLS
```

### Template 2: Istio Destination Rule for mTLS

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: default
  namespace: istio-system
spec:
  host: "*.local"
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
---
# TLS to external service
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      caCertificates: /etc/certs/external-ca.pem
---
# Mutual TLS to external service
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: partner-api
spec:
  host: api.partner.com
  trafficPolicy:
    tls:
      mode: MUTUAL
      clientCertificate: /etc/certs/client.pem
      privateKey: /etc/certs/client-key.pem
      caCertificates: /etc/certs/partner-ca.pem
```

### Template 3: Cert-Manager with Istio

```yaml
# Install cert-manager issuer for Istio
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: istio-ca
spec:
  ca:
    secretName: istio-ca-secret
---
# Create Istio CA secret
apiVersion: v1
kind: Secret
metadata:
  name: istio-ca-secret
  namespace: cert-manager
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-ca-cert>
  tls.key: <base64-encoded-ca-key>
---
# Certificate for workload
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-service-cert
  namespace: my-namespace
spec:
  secretName: my-service-tls
  duration: 24h
  renewBefore: 8h
  issuerRef:
    name: istio-ca
    kind: ClusterIssuer
  commonName: my-service.my-namespace.svc.cluster.local
  dnsNames:
    - my-service
    - my-service.my-namespace
    - my-service.my-namespace.svc
    - my-service.my-namespace.svc.cluster.local
  usages:
    - server auth
    - client auth
```

### Template 4: SPIFFE/SPIRE Integration

```yaml
# SPIRE Server configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: spire-server
  namespace: spire
data:
  server.conf: |
    server {
      bind_address = "0.0.0.0"
      bind_port = "8081"
      trust_domain = "example.org"
      data_dir = "/run/spire/data"
      log_level = "INFO"
      ca_ttl = "168h"
      default_x509_svid_ttl = "1h"
    }

    plugins {
      DataStore "sql" {
        plugin_data {
          database_type = "sqlite3"
          connection_string = "/run/spire/data/datastore.sqlite3"
        }
      }

      NodeAttestor "k8s_psat" {
        plugin_data {
          clusters = {
            "demo-cluster" = {
              service_account_allow_list = ["spire:spire-agent"]
            }
          }
        }
      }

      KeyManager "memory" {
        plugin_data {}
      }

      UpstreamAuthority "disk" {
        plugin_data {
          key_file_path = "/run/spire/secrets/bootstrap.key"
          cert_file_path = "/run/spire/secrets/bootstrap.crt"
        }
      }
    }
---
# SPIRE Agent DaemonSet (abbreviated)
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: spire-agent
  namespace: spire
spec:
  selector:
    matchLabels:
      app: spire-agent
  template:
    spec:
      containers:
        - name: spire-agent
          image: ghcr.io/spiffe/spire-agent:1.8.0
          volumeMounts:
            - name: spire-agent-socket
              mountPath: /run/spire/sockets
      volumes:
        - name: spire-agent-socket
          hostPath:
            path: /run/spire/sockets
            type: DirectoryOrCreate
```

### Template 5: Linkerd mTLS (Automatic)

```yaml
# Linkerd enables mTLS automatically
# Verify with:
# linkerd viz edges deployment -n my-namespace

# For external services without mTLS
apiVersion: policy.linkerd.io/v1beta1
kind: Server
metadata:
  name: external-api
  namespace: my-namespace
spec:
  podSelector:
    matchLabels:
      app: my-app
  port: external-api
  proxyProtocol: HTTP/1  # or TLS for passthrough
---
# Skip TLS for specific port
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    config.linkerd.io/skip-outbound-ports: "3306"  # MySQL
```

## Certificate Rotation

```bash
# Istio - Check certificate expiry
istioctl proxy-config secret deploy/my-app -o json | \
  jq '.dynamicActiveSecrets[0].secret.tlsCertificate.certificateChain.inlineBytes' | \
  tr -d '"' | base64 -d | openssl x509 -text -noout

# Force certificate rotation
kubectl rollout restart deployment/my-app

# Check Linkerd identity
linkerd identity -n my-namespace
```

## Debugging mTLS Issues

```bash
# Istio - Check if mTLS is enabled
istioctl authn tls-check my-service.my-namespace.svc.cluster.local

# Verify peer authentication
kubectl get peerauthentication --all-namespaces

# Check destination rules
kubectl get destinationrule --all-namespaces

# Debug TLS handshake
istioctl proxy-config log deploy/my-app --level debug
kubectl logs deploy/my-app -c istio-proxy | grep -i tls

# Linkerd - Check mTLS status
linkerd viz edges deployment -n my-namespace
linkerd viz tap deploy/my-app --to deploy/my-backend
```

## Best Practices

### Do's
- **Start with PERMISSIVE** - Migrate gradually to STRICT
- **Monitor certificate expiry** - Set up alerts
- **Use short-lived certs** - 24h or less for workloads
- **Rotate CA periodically** - Plan for CA rotation
- **Log TLS errors** - For debugging and audit

### Don'ts
- **Don't disable mTLS** - For convenience in production
- **Don't ignore cert expiry** - Automate rotation
- **Don't use self-signed certs** - Use proper CA hierarchy
- **Don't skip verification** - Verify the full chain

## Resources

- [Istio Security](https://istio.io/latest/docs/concepts/security/)
- [SPIFFE/SPIRE](https://spiffe.io/)
- [cert-manager](https://cert-manager.io/)
- [Zero Trust Architecture (NIST)](https://www.nist.gov/publications/zero-trust-architecture)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
