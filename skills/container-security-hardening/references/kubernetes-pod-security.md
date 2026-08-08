# Kubernetes Pod Security Reference

Full reference for hardening workloads in Kubernetes — NetworkPolicy, RBAC, Pod Security Admission, admission controllers (Kyverno/OPA), and service account hardening.

## Table of Contents

1. [Pod Security Admission (PSA)](#pod-security-admission)
2. [NetworkPolicy — Zero-Trust Networking](#networkpolicy)
3. [RBAC — Least Privilege](#rbac)
4. [Admission Controllers (Kyverno / OPA Gatekeeper)](#admission-controllers)
5. [Service Account Hardening](#service-account-hardening)
6. [Runtime Security — Falco](#runtime-security--falco)
7. [Secrets Management in K8s](#secrets-management-in-k8s)

---

## Pod Security Admission

Built-in K8s 1.25+ policy engine (replaces deprecated PodSecurityPolicy).

### Three Built-In Policy Levels

| Level | What It Blocks |
|---|---|
| `privileged` | No restrictions (cluster default) |
| `baseline` | Blocks hostNetwork, hostPID, hostIPC, privileged containers, dangerous volume types, hostPath |
| `restricted` | Everything in baseline + requires non-root, read-only FS, drops capabilities, requires seccomp |

### Three Modes Per Level

| Mode | Behavior |
|---|---|
| `enforce` | Reject pods that violate the policy |
| `audit` | Allow but log a violation in audit log |
| `warn` | Allow but return a warning to the user |

### Applying PSA Labels

```bash
# Audit before enforcing — find what would fail
kubectl label namespace production \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/audit-version=latest

# Gradual rollout: warn in staging, enforce in production
kubectl label namespace staging \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest

kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest
```

### Check What Would Fail Before Enforcing

```bash
# Dry-run check against a namespace
kubectl --dry-run=server apply -f manifests/ --namespace production

# Check a specific pod spec
kubectl run test-pod --image=nginx --dry-run=server -n production
```

### Minimum Pod Spec for `restricted` Level

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    runAsGroup: 10001
    fsGroup: 10001
    seccompProfile:
      type: RuntimeDefault     # or Localhost with a custom profile
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      # Resource limits are required for restricted PSA
      resources:
        requests:
          memory: "64Mi"
          cpu: "50m"
        limits:
          memory: "256Mi"
          cpu: "250m"
```

---

## NetworkPolicy — Zero-Trust Networking

By default all pods in a cluster can reach all other pods on any port. Lock down with NetworkPolicy.

> **Prerequisite:** Your CNI plugin must support NetworkPolicy (Calico, Cilium, Weave Net — but NOT Flannel by default).

### Step 1: Default Deny All

Apply a default-deny to every namespace that holds workloads:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}               # Selects all pods in this namespace
  policyTypes:
    - Ingress
    - Egress
```

### Step 2: Allow Only Required Traffic

```yaml
# Allow ingress from nginx ingress controller, egress to postgres + DNS
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-myapp
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: myapp
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: postgres
          namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: production
      ports:
        - protocol: TCP
          port: 5432
    - to:                       # Allow DNS resolution to cluster DNS only
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Allow Access to External Services (e.g., cloud APIs)

```yaml
egress:
  - to:
      - ipBlock:
          cidr: 0.0.0.0/0        # All external IPs
          except:
            - 10.0.0.0/8         # But not internal cluster ranges
            - 172.16.0.0/12
            - 192.168.0.0/16
    ports:
      - protocol: TCP
        port: 443                 # HTTPS only
```

### Validate NetworkPolicy with Cilium or Calico CLI

```bash
# Cilium — test connectivity between pods
cilium connectivity test

# Calico — list effective policies
kubectl exec -it deploy/myapp -- calicoctl get networkpolicy -n production
```

---

## RBAC — Least Privilege

### Principle: Scope Narrowly, Avoid Wildcards

```yaml
# ❌ DANGEROUS — grants everything to everything
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: full-admin
subjects:
  - kind: ServiceAccount
    name: myapp-sa
    namespace: production
roleRef:
  kind: ClusterRole
  name: cluster-admin
  apiGroup: rbac.authorization.k8s.io

---
# ✅ CORRECT — minimal namespace-scoped role with specific resource names
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: myapp-role
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["myapp-config"]    # Lock to specific named resources
    verbs: ["get", "list"]             # Never ["*"]
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["myapp-db-creds"]
    verbs: ["get"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: myapp-rolebinding
  namespace: production
subjects:
  - kind: ServiceAccount
    name: myapp-sa
    namespace: production
roleRef:
  kind: Role
  name: myapp-role
  apiGroup: rbac.authorization.k8s.io
```

### Audit RBAC

```bash
# What can a service account do?
kubectl auth can-i --list \
  --as=system:serviceaccount:production:myapp-sa \
  -n production

# Find all cluster-admin bindings (security anti-pattern)
kubectl get clusterrolebindings -o json | \
  jq '.items[] | select(.roleRef.name=="cluster-admin") | {name:.metadata.name, subjects:.subjects}'

# Find overly broad wildcard permissions
kubectl get roles,clusterroles -A -o json | \
  jq '.items[] | select(.rules[]?.verbs[]? == "*") | .metadata.name'

# Use rbac-tool for a full audit
kubectl rbac-tool who-can get secrets -n production
```

---

## Admission Controllers

### Kyverno (Policy as Kubernetes Resources)

Kyverno validates, mutates, and generates resources — no Rego knowledge required.

```bash
# Install Kyverno
helm repo add kyverno https://kyverno.github.io/kyverno/
helm install kyverno kyverno/kyverno -n kyverno --create-namespace
```

**Essential Policies:**

```yaml
# 1. Require non-root containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-non-root
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-run-as-non-root
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "runAsNonRoot: true is required"
        pattern:
          spec:
            containers:
              - securityContext:
                  runAsNonRoot: true

---
# 2. Require image digest pinning
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-image-digest
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-digest
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "Images must use @sha256: digest, not floating tags"
        pattern:
          spec:
            containers:
              - image: "*@sha256:*"

---
# 3. Disallow privileged containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-privileged
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "Privileged containers are not allowed"
        pattern:
          spec:
            containers:
              - =(securityContext):
                  =(privileged): "false"

---
# 4. Require resource limits (prevents resource starvation)
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-limits
      match:
        resources:
          kinds: [Pod]
      validate:
        message: "Resource limits (memory and cpu) must be set"
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"

---
# 5. Auto-mutate: add drop ALL capabilities if not set
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: drop-all-capabilities
spec:
  rules:
    - name: add-drop-all
      match:
        resources:
          kinds: [Pod]
      mutate:
        patchStrategicMerge:
          spec:
            containers:
              - (name): "*"
                securityContext:
                  capabilities:
                    drop: ["ALL"]
```

### OPA Gatekeeper (Policy as Rego)

```bash
# Install Gatekeeper
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.17/deploy/gatekeeper.yaml
```

```yaml
# ConstraintTemplate — define the Rego policy
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredlabels
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredLabels
      validation:
        openAPIV3Schema:
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("Missing required labels: %v", [missing])
        }

---
# Constraint — apply the policy
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-app-label
spec:
  enforcementAction: deny
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["app", "version", "owner"]
```

---

## Service Account Hardening

```yaml
# Dedicated service account per workload (never use 'default')
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: production
  annotations:
    # EKS — IAM Roles for Service Accounts (IRSA)
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/myapp-role
    # GKE — Workload Identity
    iam.gke.io/gcp-service-account: myapp@my-project.iam.gserviceaccount.com
automountServiceAccountToken: false    # Disable unless app calls K8s API

---
# In the pod spec — also disable token mounting
spec:
  serviceAccountName: myapp-sa
  automountServiceAccountToken: false
```

**Why use Workload Identity instead of K8s Secrets for cloud credentials?**
- Credentials are short-lived (1h) and auto-rotated
- No secret to leak, rotate, or store
- Audit trail tied to workload identity, not a shared key

---

## Runtime Security — Falco

Falco detects anomalous runtime behaviour (unexpected syscalls, network connections, file reads).

```bash
# Install via Helm
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --namespace falco --create-namespace \
  --set falco.grpc.enabled=true \
  --set falco.grpcOutput.enabled=true
```

**Example rules:**

```yaml
# Alert on shell spawned inside a container
- rule: Terminal shell in container
  desc: A shell was spawned in a container with an attached terminal
  condition: >
    spawned_process and container
    and shell_procs and proc.tty != 0
    and container_entrypoint
  output: >
    Shell spawned in a container (user=%user.name container=%container.name
    shell=%proc.name parent=%proc.pname)
  priority: WARNING

# Alert on sensitive file read
- rule: Read sensitive file untrusted
  desc: An attempt to read a sensitive file by a non-trusted program
  condition: >
    open_read and sensitive_files
    and not proc.name in (trusted_programs)
  output: >
    Sensitive file opened for reading (file=%fd.name user=%user.name
    container=%container.name)
  priority: WARNING
```

---

## Secrets Management in K8s

**Kubernetes Secrets are base64-encoded, not encrypted by default.** Use one of these:

| Solution | Mechanism | Best For |
|---|---|---|
| **External Secrets Operator** | Sync from AWS Secrets Manager / GCP Secret Manager / Vault | Production — secrets never live in etcd |
| **Sealed Secrets (Bitnami)** | Asymmetric encryption of secrets in Git | GitOps workflows |
| **HashiCorp Vault** | Dynamic secrets, PKI, lease management | Complex multi-cloud setups |
| **SOPS + Age/GPG** | Encrypted secret files in Git | Small teams, simple workflows |

```yaml
# External Secrets Operator — sync from AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-db-creds
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: myapp-db-creds
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/myapp/db
        property: password
```

```bash
# Enable etcd encryption at rest (K8s)
# In kube-apiserver: --encryption-provider-config=encryption-config.yaml
# encryption-config.yaml:
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```
