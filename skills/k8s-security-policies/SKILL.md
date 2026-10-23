---
name: k8s-security-policies
description: "Guide for NetworkPolicy, RBAC, and Pod Security Admission/Standards (PodSecurityPolicy was removed in Kubernetes1.25) in Kubernetes."
risk: critical
source: community
date_added: "2026-02-27"
---
## Supporting material availability

This catalog copy contains the inline guidance below, but does not include the following supporting paths. They are external prerequisites, not bundled files:

- `<support-root>/assets/pod-security-template.yaml`

Ask for the original supporting material or an existing installation before using a step that depends on these paths; this catalog does not identify a verified download source for them. Resolve each path relative to that installation, inspect its contents, and verify any applicable license and execution prerequisites. Do not run a command or claim a referenced procedure was followed until its required file exists. Do not fabricate the missing scripts or treat an unrelated file with the same name as equivalent. Independent steps fully documented here can proceed within the user’s authorized scope; report any dependent step as unavailable.


# Kubernetes Security Policies

Guide for NetworkPolicy, RBAC, and Pod Security Admission/Standards (PodSecurityPolicy was removed in Kubernetes1.25) in Kubernetes.

## Do not use this skill when

- The task is unrelated to kubernetes security policies
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.

## Purpose

Implement defense-in-depth security for Kubernetes clusters using network policies, pod security standards, and RBAC.

## Use this skill when

- Implement network segmentation
- Configure pod security standards
- Set up RBAC for least-privilege access
- Create security policies for compliance
- Implement admission control
- Secure multi-tenant clusters

## Pod Security Standards

### 1. Privileged (Unrestricted)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: privileged-ns
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
```

### 2. Baseline (Minimally restrictive)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: baseline-ns
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
```

### 3. Restricted (Most restrictive)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: restricted-ns
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

## Network Policies

NetworkPolicy requires an enforcing CNI; listing nodes/policies alone does not prove enforcement. Policies are additive and both source egress/destination ingress must permit a connection. With default-deny-all, the backend ingress example also needs a matching frontend egress allowance. DNS may use NodeLocal DNS rather than kube-system pod destinations; inspect actual resolver and selectors. Standard policy is L3/L4 and does not enforce FQDN/HTTP or universal metadata isolation; NAT/host networking/IPv6 behavior depends on CNI. Stage/dry-run and test approved positive/negative flows before enforcing to avoid outages. Pod Security privileged mode removes restrictions; use audit/warn first and pin the intended policy version before enforcing.

### Default Deny All
```yaml
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
```

### Allow Frontend to Backend
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
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

### Allow DNS
```yaml
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
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

**Reference:** See `assets/network-policy-template.yaml`

## RBAC Configuration

### Role (Namespace-scoped)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "watch", "list"]
```

### ClusterRole (Cluster-wide)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: secret-reader
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "watch", "list"]
```

### RoleBinding
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: production
subjects:
- kind: User
  name: jane
  apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

**Reference:** See `references/rbac-patterns.md`

## Pod Security Context

### Restricted Pod
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
```

## Policy Enforcement with OPA Gatekeeper

### ConstraintTemplate
```yaml
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
          type: object
          properties:
            labels:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredlabels
        violation[{"msg": msg, "details": {"missing_labels": missing}}] {
          provided := {label | input.review.object.metadata.labels[label]}
          required := {label | label := input.parameters.labels[_]}
          missing := required - provided
          count(missing) > 0
          msg := sprintf("missing required labels: %v", [missing])
        }
```

### Constraint
```yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredLabels
metadata:
  name: require-app-label
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment"]
  parameters:
    labels: ["app", "environment"]
```

## Service Mesh Security (Istio)

### PeerAuthentication (mTLS)
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
```

### AuthorizationPolicy
```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/frontend"]
```

## Best Practices

1. **Implement Pod Security Standards** at namespace level
2. **Use Network Policies** for network segmentation
3. **Apply least-privilege RBAC** for all service accounts
4. **Enable admission control** (OPA Gatekeeper/Kyverno)
5. **Run containers as non-root**
6. **Use read-only root filesystem**
7. **Drop all capabilities** unless needed
8. **Implement resource quotas** and limit ranges
9. **Enable audit logging** for security events
10. **Regular security scanning** of images

## Compliance Frameworks

### CIS Kubernetes Benchmark
- Use RBAC authorization
- Enable audit logging
- Use Pod Security Standards
- Configure network policies
- Implement secrets encryption at rest
- Enable node authentication

### NIST Cybersecurity Framework
- Implement defense in depth
- Use network segmentation
- Configure security monitoring
- Implement access controls
- Enable logging and monitoring

## Troubleshooting

**NetworkPolicy not working:**
```bash
# Check if CNI supports NetworkPolicy
kubectl get nodes -o wide
kubectl describe networkpolicy <name>
```

**RBAC permission denied:**
```bash
# Check effective permissions
kubectl auth can-i list pods --as system:serviceaccount:default:my-sa
kubectl auth can-i '*' '*' --as system:serviceaccount:default:my-sa
```

## Reference Files

- `assets/network-policy-template.yaml` - Network policy examples
- `assets/pod-security-template.yaml` - Pod security policies
- `references/rbac-patterns.md` - RBAC configuration patterns

## Related Skills

- `k8s-manifest-generator` - For creating secure manifests
- `gitops-workflow` - For automated policy deployment

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
