---
name: helm-charts
description: Create, manage, and deploy Helm charts for Kubernetes package management.
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

# Helm Charts

Package and deploy Kubernetes applications using Helm, the package manager for Kubernetes.

## When to Use This Skill

Use this skill when:
- Creating reusable Kubernetes application packages
- Deploying applications with configurable values
- Managing Helm releases and upgrades
- Using third-party Helm charts
- Implementing chart versioning and repositories

## Prerequisites

- Helm 3.x installed
- kubectl configured with cluster access
- Basic Kubernetes knowledge

## Chart Structure

```
mychart/
├── Chart.yaml          # Chart metadata
├── values.yaml         # Default configuration values
├── charts/             # Chart dependencies
├── templates/          # Kubernetes manifest templates
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── _helpers.tpl    # Template helpers
│   ├── NOTES.txt       # Post-install notes
│   └── tests/
│       └── test-connection.yaml
└── .helmignore         # Files to ignore
```

## Chart.yaml

```yaml
apiVersion: v2
name: myapp
description: A Helm chart for MyApp
type: application
version: 1.0.0
appVersion: "2.0.0"
keywords:
  - myapp
  - web
maintainers:
  - name: DevOps Team
    email: devops@example.com
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

## values.yaml

```yaml
replicaCount: 2

image:
  repository: myapp
  tag: ""  # Defaults to appVersion
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: false
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix
  tls: []

resources:
  limits:
    cpu: 500m
    memory: 256Mi
  requests:
    cpu: 100m
    memory: 128Mi

postgresql:
  enabled: true
  auth:
    database: myapp
```

## Templates

### Deployment Template

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: 8080
          {{- with .Values.resources }}
          resources:
            {{- toYaml . | nindent 12 }}
          {{- end }}
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "myapp.fullname" . }}-secrets
                  key: database-url
```

### Helper Functions

```yaml
# templates/_helpers.tpl
{{/*
Expand the name of the chart.
*/}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "myapp.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{ include "myapp.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### Conditional Resources

```yaml
# templates/ingress.yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "myapp.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

## Helm Commands

### Installing Charts

```bash
# Install from local chart
helm install myapp ./mychart

# Install with custom values
helm install myapp ./mychart -f custom-values.yaml

# Install with value overrides
helm install myapp ./mychart \
  --set replicaCount=3 \
  --set image.tag=2.0.0

# Install in specific namespace
helm install myapp ./mychart -n production --create-namespace

# Dry run to preview
helm install myapp ./mychart --dry-run --debug
```

### Managing Releases

```bash
# List releases
helm list
helm list -A  # All namespaces

# Upgrade release
helm upgrade myapp ./mychart
helm upgrade myapp ./mychart -f new-values.yaml

# Rollback
helm rollback myapp 1
helm history myapp

# Uninstall
helm uninstall myapp
```

### Chart Development

```bash
# Create new chart
helm create mychart

# Lint chart
helm lint ./mychart

# Template locally (debug)
helm template myapp ./mychart

# Package chart
helm package ./mychart

# Update dependencies
helm dependency update ./mychart
```

## Repositories

```bash
# Add repository
helm repo add bitnami https://charts.bitnami.com/bitnami

# Update repositories
helm repo update

# Search charts
helm search repo postgresql
helm search hub prometheus

# Install from repo
helm install postgres bitnami/postgresql

# Show chart info
helm show values bitnami/postgresql
```

## Advanced Features

### Hooks

```yaml
# templates/pre-install-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "myapp.fullname" . }}-migration
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": hook-succeeded
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        command: ["./migrate.sh"]
      restartPolicy: Never
```

### Tests

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "myapp.fullname" . }}-test-connection"
  annotations:
    "helm.sh/hook": test
spec:
  containers:
    - name: wget
      image: busybox
      command: ['wget']
      args: ['{{ include "myapp.fullname" . }}:{{ .Values.service.port }}']
  restartPolicy: Never
```

```bash
# Run tests
helm test myapp
```

### Library Charts

```yaml
# Chart.yaml
apiVersion: v2
name: mylib
type: library
version: 1.0.0
```

```yaml
# Using library chart
dependencies:
  - name: mylib
    version: "1.x.x"
    repository: "file://../mylib"
```

## OCI Registry Support

```bash
# Login to registry
helm registry login registry.example.com

# Push chart to OCI registry
helm push mychart-1.0.0.tgz oci://registry.example.com/charts

# Pull from OCI registry
helm pull oci://registry.example.com/charts/mychart --version 1.0.0

# Install from OCI
helm install myapp oci://registry.example.com/charts/mychart
```

## Common Issues

### Issue: YAML Indentation Errors
**Problem**: Template renders with wrong indentation
**Solution**: Use `nindent` helper function

```yaml
{{- toYaml .Values.resources | nindent 12 }}
```

### Issue: Values Not Applying
**Problem**: Custom values not reflected
**Solution**: Check value paths, use `--debug` flag

```bash
helm template myapp ./mychart --debug
```

### Issue: Dependency Errors
**Problem**: Chart dependencies not found
**Solution**: Run `helm dependency update`

### Issue: Release Already Exists
**Problem**: Cannot install, release exists
**Solution**: Use `helm upgrade --install`

```bash
helm upgrade --install myapp ./mychart
```

## Best Practices

- Use semantic versioning for charts
- Provide comprehensive default values
- Document all values in values.yaml with comments
- Use helper templates for repeated patterns
- Implement chart tests
- Use .helmignore to exclude unnecessary files
- Pin dependency versions
- Use `helm lint` in CI pipelines

## Related Skills

- kubernetes-ops (`kubernetes-ops`) - K8s fundamentals
- argocd-gitops (`argocd-gitops`) - GitOps with Helm
- kustomize (`kustomize`) - Alternative templating

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
