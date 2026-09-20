---
name: openshift
description: Manage Red Hat OpenShift clusters and deployments.
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

# OpenShift

Deploy and manage applications on Red Hat OpenShift Container Platform.

## When to Use This Skill

Use this skill when:
- Deploying applications to OpenShift clusters
- Using OpenShift-specific features (Routes, BuildConfigs)
- Managing projects and RBAC in OpenShift
- Implementing S2I (Source-to-Image) builds
- Working with OpenShift Operators

## Prerequisites

- OpenShift cluster access
- oc CLI installed
- Basic Kubernetes knowledge

## CLI Basics

### Authentication

```bash
# Login to cluster
oc login https://api.cluster.example.com:6443 -u admin -p password

# Login with token
oc login --token=sha256~xxxx --server=https://api.cluster.example.com:6443

# Check current context
oc whoami
oc whoami --show-server
oc whoami --show-context

# Logout
oc logout
```

### Project Management

```bash
# Create project (namespace)
oc new-project myapp --display-name="My App" --description="My Application"

# Switch project
oc project myapp

# List projects
oc projects

# Delete project
oc delete project myapp
```

## Deploying Applications

### From Image

```bash
# Deploy from container image
oc new-app --image=nginx:latest --name=webserver

# Deploy from Docker Hub
oc new-app docker.io/library/nginx:latest

# Deploy with environment variables
oc new-app myimage:latest \
  -e DATABASE_URL=postgres://localhost/db \
  -e APP_ENV=production
```

### From Source (S2I)

```bash
# Deploy from Git repository
oc new-app https://github.com/org/myapp.git

# Specify builder image
oc new-app nodejs:18~https://github.com/org/nodejs-app.git

# With context directory
oc new-app https://github.com/org/monorepo.git \
  --context-dir=backend \
  --name=backend-api
```

### From Template

```bash
# List available templates
oc get templates -n openshift

# Deploy from template
oc new-app postgresql-persistent \
  -p POSTGRESQL_USER=user \
  -p POSTGRESQL_PASSWORD=secret \
  -p POSTGRESQL_DATABASE=mydb
```

## Routes

### Creating Routes

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: myapp
spec:
  host: myapp.apps.cluster.example.com
  to:
    kind: Service
    name: myapp
    weight: 100
  port:
    targetPort: 8080
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect
```

```bash
# Create route via CLI
oc expose svc/myapp

# Create with custom hostname
oc create route edge myapp \
  --service=myapp \
  --hostname=myapp.apps.cluster.example.com

# Create passthrough route (TLS termination at pod)
oc create route passthrough myapp-secure --service=myapp
```

### A/B Testing

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: myapp
spec:
  to:
    kind: Service
    name: myapp-v1
    weight: 90
  alternateBackends:
    - kind: Service
      name: myapp-v2
      weight: 10
```

## Build Configurations

### BuildConfig

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: myapp
spec:
  source:
    type: Git
    git:
      uri: https://github.com/org/myapp.git
      ref: main
  strategy:
    type: Docker
    dockerStrategy:
      dockerfilePath: Dockerfile
  output:
    to:
      kind: ImageStreamTag
      name: myapp:latest
  triggers:
    - type: ConfigChange
    - type: GitHub
      github:
        secret: webhook-secret
```

### S2I Build

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: myapp
spec:
  source:
    type: Git
    git:
      uri: https://github.com/org/myapp.git
  strategy:
    type: Source
    sourceStrategy:
      from:
        kind: ImageStreamTag
        namespace: openshift
        name: nodejs:18-ubi8
      env:
        - name: NPM_RUN
          value: start
  output:
    to:
      kind: ImageStreamTag
      name: myapp:latest
```

### Build Commands

```bash
# Start build
oc start-build myapp

# Start build from local source
oc start-build myapp --from-dir=.

# Follow build logs
oc start-build myapp --follow

# View build logs
oc logs -f bc/myapp

# Cancel build
oc cancel-build myapp-1
```

## Image Streams

```yaml
apiVersion: image.openshift.io/v1
kind: ImageStream
metadata:
  name: myapp
spec:
  lookupPolicy:
    local: true
  tags:
    - name: latest
      from:
        kind: DockerImage
        name: registry.example.com/myapp:latest
      importPolicy:
        scheduled: true
```

```bash
# Create image stream
oc create imagestream myapp

# Import image
oc import-image myapp:latest \
  --from=docker.io/library/nginx:latest \
  --confirm

# Tag image
oc tag myapp:latest myapp:production
```

## Deployment Configs

```yaml
apiVersion: apps.openshift.io/v1
kind: DeploymentConfig
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "500m"
  triggers:
    - type: ConfigChange
    - type: ImageChange
      imageChangeParams:
        automatic: true
        containerNames:
          - myapp
        from:
          kind: ImageStreamTag
          name: myapp:latest
  strategy:
    type: Rolling
    rollingParams:
      maxSurge: 25%
      maxUnavailable: 25%
```

## ConfigMaps and Secrets

```bash
# Create ConfigMap
oc create configmap myapp-config \
  --from-literal=APP_ENV=production \
  --from-file=config.yaml

# Create Secret
oc create secret generic myapp-secrets \
  --from-literal=password=secret123

# Mount as volume
oc set volume dc/myapp \
  --add --name=config \
  --type=configmap \
  --configmap-name=myapp-config \
  --mount-path=/etc/config

# Set as environment
oc set env dc/myapp --from=secret/myapp-secrets
```

## Security Context Constraints

```bash
# List SCCs
oc get scc

# View SCC details
oc describe scc restricted

# Grant SCC to service account
oc adm policy add-scc-to-user anyuid -z myapp-sa -n myproject

# Create service account
oc create serviceaccount myapp-sa
```

### Custom SCC

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: myapp-scc
allowPrivilegedContainer: false
runAsUser:
  type: MustRunAsNonRoot
seLinuxContext:
  type: MustRunAs
fsGroup:
  type: RunAsAny
volumes:
  - configMap
  - secret
  - persistentVolumeClaim
users:
  - system:serviceaccount:myproject:myapp-sa
```

## Operators

```bash
# List available operators
oc get packagemanifests -n openshift-marketplace

# Subscribe to operator
cat <<EOF | oc apply -f -
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: prometheus
  namespace: openshift-operators
spec:
  channel: stable
  name: prometheus
  source: community-operators
  sourceNamespace: openshift-marketplace
EOF

# View installed operators
oc get csv -n openshift-operators
```

## Monitoring

```bash
# View pod logs
oc logs -f pod/myapp-1-xyz

# View events
oc get events --sort-by='.lastTimestamp'

# Resource usage
oc adm top pods
oc adm top nodes

# Debug pod
oc debug pod/myapp-1-xyz
```

## Common Issues

### Issue: Build Fails
**Problem**: S2I build cannot find dependencies
**Solution**: Check builder image, verify source repository access

### Issue: Pod Security Violation
**Problem**: Pod fails to start due to SCC
**Solution**: Use appropriate SCC or modify container security context

### Issue: Route Not Working
**Problem**: Cannot access application via route
**Solution**: Verify service selector, check router pods, validate DNS

### Issue: Image Pull Error
**Problem**: Cannot pull image from registry
**Solution**: Create image pull secret, link to service account

```bash
oc create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=pass

oc secrets link default regcred --for=pull
```

## Best Practices

- Use Projects for isolation (not just namespaces)
- Leverage ImageStreams for image management
- Use BuildConfigs for CI/CD integration
- Implement proper SCCs (avoid privileged)
- Use Routes instead of Ingress
- Leverage OpenShift templates for repeatability
- Monitor with built-in Prometheus
- Use Operators for complex applications

## Related Skills

- kubernetes-ops (`kubernetes-ops`) - K8s fundamentals
- helm-charts (`helm-charts`) - Helm deployments
- container-registries (`container-registries`) - Image management

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
