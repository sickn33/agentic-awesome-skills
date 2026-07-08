# RBAC Patterns and Best Practices

## Common RBAC Patterns

### Pattern 1: Read-Only Access
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: read-only
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
```

### Pattern 2: Namespace Admin
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: production
rules:
- apiGroups: ["", "apps", "batch", "extensions"]
  resources: ["*"]
  verbs: ["*"]
```

### Pattern 3: Deployment Manager
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
  namespace: production
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
```

### Pattern 4: Secret Reader (ServiceAccount)
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-reader
  namespace: production
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["app-secrets"]  # Specific secret only
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: app-secret-reader
  namespace: production
subjects:
- kind: ServiceAccount
  name: my-app
  namespace: production
roleRef:
  kind: Role
  name: secret-reader
  apiGroup: rbac.authorization.k8s.io
```

### Pattern 5: CI/CD Pipeline Access
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cicd-deployer
rules:
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
```

## ServiceAccount Best Practices

### Create Dedicated ServiceAccounts
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app
  namespace: production
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      serviceAccountName: my-app
      automountServiceAccountToken: false  # Disable if not needed
```

### Least-Privilege ServiceAccount
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get"]
  resourceNames: ["my-app-config"]
```

## Security Best Practices

1. **Use Roles over ClusterRoles** when possible
2. **Specify resourceNames** for fine-grained access
3. **Avoid wildcard permissions** (`*`) in production
4. **Create dedicated ServiceAccounts** for each app
5. **Disable token auto-mounting** if not needed
6. **Regular RBAC audits** to remove unused permissions
7. **Use groups** for user management
8. **Implement namespace isolation**
9. **Monitor RBAC usage** with audit logs
10. **Document role purposes** in metadata

## Troubleshooting RBAC

### Check User Permissions
```bash
kubectl auth can-i list pods --as john@example.com
kubectl auth can-i '*' '*' --as system:serviceaccount:default:my-app
```

### View Effective Permissions
```bash
kubectl describe clusterrole cluster-admin
kubectl describe rolebinding -n production
```

### Debug Access Issues
```bash
kubectl get rolebindings,clusterrolebindings --all-namespaces -o wide | grep my-user
```

## Common RBAC Verbs

- `get` - Read a specific resource
- `list` - List all resources of a type
- `watch` - Watch for resource changes
- `create` - Create new resources
- `update` - Update existing resources
- `patch` - Partially update resources
- `delete` - Delete resources
- `deletecollection` - Delete multiple resources
- `*` - All verbs (avoid in production)

## Resource Scope

### Cluster-Scoped Resources
- Nodes
- PersistentVolumes
- ClusterRoles
- ClusterRoleBindings
- Namespaces

### Namespace-Scoped Resources
- Pods
- Services
- Deployments
- ConfigMaps
- Secrets
- Roles
- RoleBindings
