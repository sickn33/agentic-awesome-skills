---
name: argocd-gitops
description: Implement GitOps with ArgoCD for declarative Kubernetes deployments.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# ArgoCD GitOps

Implement declarative continuous delivery for Kubernetes with ArgoCD.

## When to Use This Skill

Use this skill when:
- Implementing GitOps workflows for Kubernetes
- Automating deployments from Git repositories
- Managing multiple environments declaratively
- Implementing progressive delivery strategies
- Synchronizing cluster state with Git

## Prerequisites

- Kubernetes cluster with ArgoCD installed
- kubectl configured
- Git repository for manifests
- ArgoCD CLI (optional)

## Installation

```bash
# Create namespace
kubectl create namespace argocd

# Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port forward to access UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Login with CLI
argocd login localhost:8080
```

## Application Definition

### Basic Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/myapp-manifests.git
    targetRevision: main
    path: environments/production
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Helm Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-helm
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/myapp-chart.git
    targetRevision: main
    path: charts/myapp
    helm:
      valueFiles:
        - values.yaml
        - values-production.yaml
      parameters:
        - name: replicaCount
          value: "3"
        - name: image.tag
          value: "2.0.0"
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

### Kustomize Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp-kustomize
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/myapp-manifests.git
    targetRevision: main
    path: overlays/production
    kustomize:
      images:
        - myapp=myregistry/myapp:2.0.0
  destination:
    server: https://kubernetes.default.svc
    namespace: myapp
```

## Projects

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: myproject
  namespace: argocd
spec:
  description: My Project
  sourceRepos:
    - https://github.com/org/*
  destinations:
    - namespace: myapp-*
      server: https://kubernetes.default.svc
  clusterResourceWhitelist:
    - group: ''
      kind: Namespace
  namespaceResourceWhitelist:
    - group: '*'
      kind: '*'
  roles:
    - name: developer
      description: Developer role
      policies:
        - p, proj:myproject:developer, applications, get, myproject/*, allow
        - p, proj:myproject:developer, applications, sync, myproject/*, allow
      groups:
        - developers
```

## Application Sets

### Git Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-environments
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/org/myapp-manifests.git
        revision: main
        directories:
          - path: environments/*
  template:
    metadata:
      name: 'myapp-{{path.basename}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/myapp-manifests.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: 'myapp-{{path.basename}}'
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

### List Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-clusters
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - cluster: production
            url: https://prod-cluster.example.com
          - cluster: staging
            url: https://staging-cluster.example.com
  template:
    metadata:
      name: 'myapp-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/myapp-manifests.git
        targetRevision: main
        path: 'environments/{{cluster}}'
      destination:
        server: '{{url}}'
        namespace: myapp
```

### Matrix Generator

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: myapp-matrix
  namespace: argocd
spec:
  generators:
    - matrix:
        generators:
          - git:
              repoURL: https://github.com/org/myapp-manifests.git
              revision: main
              directories:
                - path: apps/*
          - list:
              elements:
                - env: staging
                - env: production
  template:
    metadata:
      name: '{{path.basename}}-{{env}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/org/myapp-manifests.git
        targetRevision: main
        path: '{{path}}/overlays/{{env}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path.basename}}-{{env}}'
```

## Sync Policies

### Automated Sync

```yaml
syncPolicy:
  automated:
    prune: true          # Delete resources not in Git
    selfHeal: true       # Revert manual changes
    allowEmpty: false    # Don't sync empty directories
  syncOptions:
    - CreateNamespace=true
    - PrunePropagationPolicy=foreground
    - PruneLast=true
  retry:
    limit: 5
    backoff:
      duration: 5s
      factor: 2
      maxDuration: 3m
```

### Sync Waves

```yaml
# In Kubernetes manifests
apiVersion: v1
kind: ConfigMap
metadata:
  name: myconfig
  annotations:
    argocd.argoproj.io/sync-wave: "-1"  # Sync first
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    argocd.argoproj.io/sync-wave: "0"   # Sync second
```

### Sync Hooks

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myapp:latest
          command: ["./migrate.sh"]
      restartPolicy: Never
```

## CLI Commands

```bash
# List applications
argocd app list

# Get application details
argocd app get myapp

# Sync application
argocd app sync myapp

# Force sync (ignore differences)
argocd app sync myapp --force

# View diff
argocd app diff myapp

# Rollback
argocd app rollback myapp

# Delete application
argocd app delete myapp

# View logs
argocd app logs myapp

# Hard refresh (clear cache)
argocd app get myapp --hard-refresh
```

## Repository Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: private-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: https://github.com/org/private-repo.git
  username: git
  password: ghp_xxxx
---
# SSH key
apiVersion: v1
kind: Secret
metadata:
  name: private-repo-ssh
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: git@github.com:org/private-repo.git
  sshPrivateKey: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    ...
    -----END OPENSSH PRIVATE KEY-----
```

## Notifications

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.slack: |
    token: $slack-token
  template.app-deployed: |
    message: Application {{.app.metadata.name}} is now {{.app.status.sync.status}}.
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-deployed]
```

## Common Issues

### Issue: Sync Fails with Diff
**Problem**: Resources show differences but are correct
**Solution**: Configure ignore differences

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas
```

### Issue: Repository Not Accessible
**Problem**: ArgoCD cannot clone repository
**Solution**: Check repository secret, verify URL and credentials

### Issue: Application Stuck OutOfSync
**Problem**: Application never becomes synced
**Solution**: Check resource status, review events, verify manifests

### Issue: Health Check Failing
**Problem**: Application shows degraded health
**Solution**: Check custom health checks, verify probe configurations

## Best Practices

- Use ApplicationSets for multi-environment deployments
- Implement sync waves for ordered deployments
- Use projects to isolate applications
- Configure notifications for deployment events
- Implement proper RBAC with projects
- Use health checks for deployment verification
- Enable auto-pruning to remove deleted resources
- Keep manifests in dedicated repositories

## Related Skills

- kubernetes-ops (`kubernetes-ops`) - K8s fundamentals
- helm-charts (`helm-charts`) - Helm deployments
- kustomize (`kustomize`) - Kustomize overlays

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
