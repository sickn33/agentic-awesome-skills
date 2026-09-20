---
name: platform-engineering
description: Build internal developer platforms (IDPs) with self-service infrastructure,
  golden paths, and developer portals using Backstage, Crossplane, and score.
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

# Platform Engineering

Platform engineering is the discipline of building and maintaining internal developer platforms (IDPs) that enable self-service capabilities for software engineering teams. The goal is to reduce cognitive load, standardize infrastructure provisioning, and accelerate delivery while maintaining governance and security guardrails.

---

## 2. Backstage Setup

[Backstage](https://backstage.io) is the leading open-source developer portal framework, originally created at Spotify.

### Installation

```bash
# Prerequisites: Node.js 18+, yarn 1.x
npx @backstage/create-app@latest

# Follow the prompts -- name your app, e.g., "internal-platform"
cd internal-platform

# Start the development server
yarn dev
```

### Production Docker Build

```dockerfile
# Dockerfile for Backstage production image
FROM node:18-bookworm-slim AS build
WORKDIR /app

COPY package.json yarn.lock ./
COPY packages/ packages/
COPY plugins/ plugins/

RUN yarn install --frozen-lockfile
RUN yarn tsc
RUN yarn build:backend

FROM node:18-bookworm-slim
WORKDIR /app

COPY --from=build /app/packages/backend/dist/ ./
COPY --from=build /app/node_modules/ ./node_modules/
COPY app-config.yaml app-config.production.yaml ./

ENV NODE_ENV=production
CMD ["node", "packages/backend", "--config", "app-config.production.yaml"]
```

### Core app-config.yaml

```yaml
# app-config.yaml
app:
  title: Internal Developer Platform
  baseUrl: http://localhost:3000

organization:
  name: MyOrg

backend:
  baseUrl: http://localhost:7007
  listen:
    port: 7007
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}

integrations:
  github:
    - host: github.com
      token: ${GITHUB_TOKEN}

catalog:
  import:
    entityFilename: catalog-info.yaml
    pullRequestBranchName: backstage-integration
  rules:
    - allow: [Component, System, API, Resource, Location, Template]
  locations:
    - type: url
      target: https://github.com/myorg/software-catalog/blob/main/catalog-info.yaml
    - type: url
      target: https://github.com/myorg/backstage-templates/blob/main/all-templates.yaml
```

---

## 3. Crossplane for Self-Service Infrastructure

Crossplane extends Kubernetes to provision and manage cloud infrastructure through declarative YAML.

### Install Crossplane

```bash
# Add the Crossplane Helm repo
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update

# Install Crossplane into its own namespace
helm install crossplane crossplane-stable/crossplane \
  --namespace crossplane-system \
  --create-namespace \
  --set args='{"--enable-composition-revisions"}'

# Install the AWS provider
kubectl apply -f - <<EOF
apiVersion: pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-aws
spec:
  package: xpkg.upbound.io/upbound/provider-family-aws:v1.1.0
EOF

# Configure AWS credentials
kubectl create secret generic aws-creds \
  -n crossplane-system \
  --from-file=creds=./aws-credentials.txt

kubectl apply -f - <<EOF
apiVersion: aws.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-creds
      key: creds
EOF
```

### CompositeResourceDefinition (XRD)

This defines a new platform API that developers consume without knowing the underlying cloud resources.

```yaml
# xrd-application-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: CompositeResourceDefinition
metadata:
  name: xapplicationdatabases.platform.myorg.io
spec:
  group: platform.myorg.io
  names:
    kind: XApplicationDatabase
    plural: xapplicationdatabases
  claimNames:
    kind: ApplicationDatabase
    plural: applicationdatabases
  versions:
    - name: v1alpha1
      served: true
      referenceable: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                parameters:
                  type: object
                  properties:
                    engine:
                      type: string
                      enum: ["postgres", "mysql"]
                      default: "postgres"
                    engineVersion:
                      type: string
                      default: "15"
                    storageGB:
                      type: integer
                      minimum: 20
                      maximum: 500
                      default: 20
                    instanceSize:
                      type: string
                      enum: ["small", "medium", "large"]
                      default: "small"
                    environment:
                      type: string
                      enum: ["dev", "staging", "prod"]
                  required:
                    - environment
```

### Composition (AWS RDS)

```yaml
# composition-aws-database.yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: applicationdatabase-aws
  labels:
    provider: aws
spec:
  compositeTypeRef:
    apiVersion: platform.myorg.io/v1alpha1
    kind: XApplicationDatabase
  resources:
    - name: rds-instance
      base:
        apiVersion: rds.aws.upbound.io/v1beta1
        kind: Instance
        spec:
          forProvider:
            region: us-east-1
            allocatedStorage: 20
            autoMinorVersionUpgrade: true
            backupRetentionPeriod: 7
            dbName: appdb
            deletionProtection: false
            publiclyAccessible: false
            skipFinalSnapshot: true
            storageEncrypted: true
            storageType: gp3
            vpcSecurityGroupIdSelector:
              matchLabels:
                platform.myorg.io/network: shared
            dbSubnetGroupNameSelector:
              matchLabels:
                platform.myorg.io/network: shared
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.engine
          toFieldPath: spec.forProvider.engine
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.engineVersion
          toFieldPath: spec.forProvider.engineVersion
        - type: FromCompositeFieldPath
          fromFieldPath: spec.parameters.storageGB
          toFieldPath: spec.forProvider.allocatedStorage
        - type: CombineFromComposite
          combine:
            variables:
              - fromFieldPath: spec.parameters.instanceSize
            strategy: map
            map:
              small: db.t3.micro
              medium: db.t3.medium
              large: db.r6g.large
          toFieldPath: spec.forProvider.instanceClass
    - name: db-secret
      base:
        apiVersion: secretstores.aws.upbound.io/v1beta1
        kind: Secret
        spec:
          forProvider:
            region: us-east-1
      patches:
        - type: FromCompositeFieldPath
          fromFieldPath: metadata.name
          toFieldPath: spec.forProvider.name
          transforms:
            - type: string
              string:
                fmt: "platform/%s/db-credentials"
```

### Developer Claim (what devs actually write)

```yaml
# my-app-database.yaml
apiVersion: platform.myorg.io/v1alpha1
kind: ApplicationDatabase
metadata:
  name: orders-db
  namespace: team-commerce
spec:
  parameters:
    engine: postgres
    engineVersion: "15"
    storageGB: 50
    instanceSize: medium
    environment: staging
```

---


## Contents

- [4. Golden Paths](references/details.md)
- [5. Service Catalog](references/details.md)
- [6. Developer Portal -- Backstage Plugins](references/details.md)
- [7. Score Specification](references/details.md)
- [8. Self-Service Workflows](references/details.md)
- [9. Platform Metrics](references/details.md)
- [10. Governance -- Policy Enforcement](references/details.md)
- [Summary](references/details.md)

## When to Use

Adopt platform engineering practices when your organization experiences:

- **Cognitive overload on dev teams** -- developers spend more time on infrastructure wiring than writing business logic.
- **Inconsistent environments** -- every team provisions infrastructure differently, causing drift and outages.
- **Slow onboarding** -- new engineers take weeks to get a working development environment.
- **Repeated toil** -- the same Terraform/Helm/CI boilerplate is copy-pasted across dozens of repos.
- **Compliance bottlenecks** -- security and ops reviews gate every deployment, slowing release cadence.
- **Scale inflection points** -- you have 5+ teams and shared infrastructure concerns (networking, observability, secrets).

Platform engineering is NOT about replacing ops with a portal. It is about encoding organizational standards into reusable, self-service abstractions that dev teams consume through golden paths.

---

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
