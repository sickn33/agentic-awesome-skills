# Helm Chart Structure Reference

Complete guide to Helm chart organization, file conventions, and best practices.

## Standard Chart Directory Structure

```
my-app/
├── Chart.yaml              # Chart metadata (required)
├── Chart.lock              # Dependency lock file (generated)
├── values.yaml             # Default configuration values (required)
├── values.schema.json      # JSON schema for values validation
├── .helmignore             # Patterns to ignore when packaging
├── README.md               # Chart documentation
├── LICENSE                 # Chart license
├── charts/                 # Chart dependencies (bundled)
│   └── postgresql-12.0.0.tgz
├── crds/                   # Custom Resource Definitions
│   └── my-crd.yaml
├── templates/              # Kubernetes manifest templates (required)
│   ├── NOTES.txt          # Post-install instructions
│   ├── _helpers.tpl       # Template helper functions
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── serviceaccount.yaml
│   ├── hpa.yaml
│   ├── pdb.yaml
│   ├── networkpolicy.yaml
│   └── tests/
│       └── test-connection.yaml
└── files/                  # Additional files to include
    └── config/
        └── app.conf
```

## Chart.yaml Specification

### API Version v2 (Helm 3+)

```yaml
apiVersion: v2                    # Required: API version
name: my-application              # Required: Chart name
version: 1.2.3                    # Required: Chart version (SemVer)
appVersion: "2.5.0"              # Application version
description: A Helm chart for my application  # Required
type: application                 # Chart type: application or library
keywords:                         # Search keywords
  - web
  - api
  - backend
home: https://example.com         # Project home page
sources:                          # Source code URLs
  - https://github.com/example/my-app
maintainers:                      # Maintainer list
  - name: John Doe
    email: john@example.com
    url: https://github.com/johndoe
icon: https://example.com/icon.png  # Chart icon URL
kubeVersion: ">=1.24.0"          # Compatible Kubernetes versions
deprecated: false                 # Mark chart as deprecated
annotations:                      # Arbitrary annotations
  example.com/release-notes: https://example.com/releases/v1.2.3
dependencies:                     # Chart dependencies
  - name: postgresql
    version: "12.0.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
    tags:
      - database
    import-values:
      - child: database
        parent: database
    alias: db
```

## Chart Types

### Application Chart
```yaml
type: application
```
- Standard Kubernetes applications
- Can be installed and managed
- Contains templates for K8s resources

### Library Chart
```yaml
type: library
```
- Shared template helpers
- Cannot be installed directly
- Used as dependency by other charts
- No templates/ directory

## Values Files Organization

### values.yaml (defaults)
```yaml
# Global values (shared with subcharts)
global:
  imageRegistry: docker.io
  imagePullSecrets: []

# Image configuration
image:
  registry: docker.io
  repository: myapp/web
  tag: ""  # Defaults to .Chart.AppVersion
  pullPolicy: IfNotPresent

# Deployment settings
replicaCount: 1
revisionHistoryLimit: 10

# Pod configuration
podAnnotations: {}
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000

# Container security
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL

# Service
service:
  type: ClusterIP
  port: 80
  targetPort: http
  annotations: {}

# Resources
resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi

# Autoscaling
autoscaling:
  enabled: false
  minReplicas: 1
  maxReplicas: 100
  targetCPUUtilizationPercentage: 80

# Node selection
nodeSelector: {}
tolerations: []
affinity: {}

# Monitoring
serviceMonitor:
  enabled: false
  interval: 30s
```

### values.schema.json (validation)
```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "replicaCount": {
      "type": "integer",
      "minimum": 1
    },
    "image": {
      "type": "object",
      "required": ["repository"],
      "properties": {
        "repository": {
          "type": "string"
        },
        "tag": {
          "type": "string"
        },
        "pullPolicy": {
          "type": "string",
          "enum": ["Always", "IfNotPresent", "Never"]
        }
      }
    }
  },
  "required": ["image"]
}
```

## Template Files

### Template Naming Conventions

- **Lowercase with hyphens**: `deployment.yaml`, `service-account.yaml`
- **Partial templates**: Prefix with underscore `_helpers.tpl`
- **Tests**: Place in `templates/tests/`
- **CRDs**: Place in `crds/` (not templated)

### Common Templates

#### _helpers.tpl
```yaml
{{/*
Standard naming helpers
*/}}
{{- define "my-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "my-app.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Chart.Name .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{- define "my-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Common labels
*/}}
{{- define "my-app.labels" -}}
helm.sh/chart: {{ include "my-app.chart" . }}
{{ include "my-app.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "my-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "my-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}

{{/*
Image name helper
*/}}
{{- define "my-app.image" -}}
{{- $registry := .Values.global.imageRegistry | default .Values.image.registry -}}
{{- $repository := .Values.image.repository -}}
{{- $tag := .Values.image.tag | default .Chart.AppVersion -}}
{{- printf "%s/%s:%s" $registry $repository $tag -}}
{{- end -}}
```

#### NOTES.txt
```
Thank you for installing {{ .Chart.Name }}.

Your release is named {{ .Release.Name }}.

To learn more about the release, try:

  $ helm status {{ .Release.Name }}
  $ helm get all {{ .Release.Name }}

{{- if .Values.ingress.enabled }}

Application URL:
{{- range .Values.ingress.hosts }}
  http{{ if $.Values.ingress.tls }}s{{ end }}://{{ .host }}{{ .path }}
{{- end }}
{{- else }}

Get the application URL by running:
  export POD_NAME=$(kubectl get pods --namespace {{ .Release.Namespace }} -l "app.kubernetes.io/name={{ include "my-app.name" . }}" -o jsonpath="{.items[0].metadata.name}")
  kubectl port-forward $POD_NAME 8080:80
  echo "Visit http://127.0.0.1:8080"
{{- end }}
```

## Dependencies Management

### Declaring Dependencies

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.0.0"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled  # Enable/disable via values
    tags:                          # Group dependencies
      - database
    import-values:                 # Import values from subchart
      - child: database
        parent: database
    alias: db                      # Reference as .Values.db
```

### Managing Dependencies

```bash
# Update dependencies
helm dependency update

# List dependencies
helm dependency list

# Build dependencies
helm dependency build
```

### Chart.lock

Generated automatically by `helm dependency update`:

```yaml
dependencies:
- name: postgresql
  repository: https://charts.bitnami.com/bitnami
  version: 12.0.0
digest: sha256:abcd1234...
generated: "2024-01-01T00:00:00Z"
```

## .helmignore

Exclude files from chart package:

```
# Development files
.git/
.gitignore
*.md
docs/

# Build artifacts
*.swp
*.bak
*.tmp
*.orig

# CI/CD
.travis.yml
.gitlab-ci.yml
Jenkinsfile

# Testing
test/
*.test

# IDE
.vscode/
.idea/
*.iml
```

## Custom Resource Definitions (CRDs)

Place CRDs in `crds/` directory:

```
crds/
├── my-app-crd.yaml
└── another-crd.yaml
```

**Important CRD notes:**
- CRDs are installed before any templates
- CRDs are NOT templated (no `{{ }}` syntax)
- CRDs are NOT upgraded or deleted with chart
- Use `helm install --skip-crds` to skip installation

## Chart Versioning

### Semantic Versioning

- **Chart Version**: Increment when chart changes
  - MAJOR: Breaking changes
  - MINOR: New features, backward compatible
  - PATCH: Bug fixes

- **App Version**: Application version being deployed
  - Can be any string
  - Not required to follow SemVer

```yaml
version: 2.3.1      # Chart version
appVersion: "1.5.0" # Application version
```

## Chart Testing

### Test Files

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "my-app.fullname" . }}-test-connection"
  annotations:
    "helm.sh/hook": test
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  containers:
  - name: wget
    image: busybox
    command: ['wget']
    args: ['{{ include "my-app.fullname" . }}:{{ .Values.service.port }}']
  restartPolicy: Never
```

### Running Tests

```bash
helm test my-release
helm test my-release --logs
```

## Hooks

Helm hooks allow intervention at specific points:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ include "my-app.fullname" . }}-migration
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
```

### Hook Types

- `pre-install`: Before templates rendered
- `post-install`: After all resources loaded
- `pre-delete`: Before any resources deleted
- `post-delete`: After all resources deleted
- `pre-upgrade`: Before upgrade
- `post-upgrade`: After upgrade
- `pre-rollback`: Before rollback
- `post-rollback`: After rollback
- `test`: Run with `helm test`

### Hook Weight

Controls hook execution order (-5 to 5, lower runs first)

### Hook Deletion Policies

- `before-hook-creation`: Delete previous hook before new one
- `hook-succeeded`: Delete after successful execution
- `hook-failed`: Delete if hook fails

## Best Practices

1. **Use helpers** for repeated template logic
2. **Quote strings** in templates: `{{ .Values.name | quote }}`
3. **Validate values** with values.schema.json
4. **Document all values** in values.yaml
5. **Use semantic versioning** for chart versions
6. **Pin dependency versions** exactly
7. **Include NOTES.txt** with usage instructions
8. **Add tests** for critical functionality
9. **Use hooks** for database migrations
10. **Keep charts focused** - one application per chart

## Chart Repository Structure

```
helm-charts/
├── index.yaml
├── my-app-1.0.0.tgz
├── my-app-1.1.0.tgz
├── my-app-1.2.0.tgz
└── another-chart-2.0.0.tgz
```

### Creating Repository Index

```bash
helm repo index . --url https://charts.example.com
```

## Related Resources

- [Helm Documentation](https://helm.sh/docs/)
- [Chart Template Guide](https://helm.sh/docs/chart_template_guide/)
- [Best Practices](https://helm.sh/docs/chart_best_practices/)
