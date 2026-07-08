---
name: cloud-devops
description: "Cloud infrastructure and DevOps workflow covering AWS, Azure, GCP, Kubernetes, Terraform, CI/CD, monitoring, and cloud-native development."
category: workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# Cloud/DevOps Workflow Bundle

## Overview

Comprehensive cloud and DevOps workflow for infrastructure provisioning, container orchestration, CI/CD pipelines, monitoring, and cloud-native application development.

## When to Use This Workflow

Use this workflow when:
- Setting up cloud infrastructure
- Implementing CI/CD pipelines
- Deploying Kubernetes applications
- Configuring monitoring and observability
- Managing cloud costs
- Implementing DevOps practices

## Workflow Phases

### Phase 1: Cloud Infrastructure Setup

#### Skills to Invoke
- `cloud-architect` - Cloud architecture
- `aws-skills` - AWS development
- `azure-functions` - Azure development
- `gcp-cloud-run` - GCP development
- `terraform-skill` - Terraform IaC
- `terraform-specialist` - Advanced Terraform

#### Actions
1. Design cloud architecture
2. Set up accounts and billing
3. Configure networking
4. Provision resources
5. Set up IAM

#### Copy-Paste Prompts
```
Use @cloud-architect to design multi-cloud architecture
```

```
Use @terraform-skill to provision AWS infrastructure
```

### Phase 2: Container Orchestration

#### Skills to Invoke
- `kubernetes-architect` - Kubernetes architecture
- `docker-expert` - Docker containerization
- `helm-chart-scaffolding` - Helm charts
- `k8s-manifest-generator` - K8s manifests
- `k8s-security-policies` - K8s security

#### Actions
1. Design container architecture
2. Create Dockerfiles
3. Build container images
4. Write K8s manifests
5. Deploy to cluster
6. Configure networking

#### Copy-Paste Prompts
```
Use @kubernetes-architect to design K8s architecture
```

```
Use @docker-expert to containerize application
```

```
Use @helm-chart-scaffolding to create Helm chart
```

### Phase 3: CI/CD Implementation

#### Skills to Invoke
- `deployment-engineer` - Deployment engineering
- `cicd-automation-workflow-automate` - CI/CD automation
- `github-actions-templates` - GitHub Actions
- `gitlab-ci-patterns` - GitLab CI
- `deployment-pipeline-design` - Pipeline design

#### Actions
1. Design deployment pipeline
2. Configure build automation
3. Set up test automation
4. Configure deployment stages
5. Implement rollback strategies
6. Set up notifications

#### Copy-Paste Prompts
```
Use @cicd-automation-workflow-automate to set up CI/CD pipeline
```

```
Use @github-actions-templates to create GitHub Actions workflow
```

### Phase 4: Monitoring and Observability

#### Skills to Invoke
- `observability-engineer` - Observability engineering
- `grafana-dashboards` - Grafana dashboards
- `prometheus-configuration` - Prometheus setup
- `datadog-automation` - Datadog integration
- `sentry-automation` - Sentry error tracking

#### Actions
1. Design monitoring strategy
2. Set up metrics collection
3. Configure log aggregation
4. Implement distributed tracing
5. Create dashboards
6. Set up alerts

#### Copy-Paste Prompts
```
Use @observability-engineer to set up observability stack
```

```
Use @grafana-dashboards to create monitoring dashboards
```

### Phase 5: Cloud Security

#### Skills to Invoke
- `cloud-penetration-testing` - Cloud pentesting
- `aws-penetration-testing` - AWS security
- `k8s-security-policies` - K8s security
- `secrets-management` - Secrets management
- `mtls-configuration` - mTLS setup

#### Actions
1. Assess cloud security
2. Configure security groups
3. Set up secrets management
4. Implement network policies
5. Configure encryption
6. Set up audit logging

#### Copy-Paste Prompts
```
Use @cloud-penetration-testing to assess cloud security
```

```
Use @secrets-management to configure secrets
```

### Phase 6: Cost Optimization

#### Skills to Invoke
- `cost-optimization` - Cloud cost optimization
- `database-cloud-optimization-cost-optimize` - Database cost optimization

#### Actions
1. Analyze cloud spending
2. Identify optimization opportunities
3. Right-size resources
4. Implement auto-scaling
5. Use reserved instances
6. Set up cost alerts

#### Copy-Paste Prompts
```
Use @cost-optimization to reduce cloud costs
```

### Phase 7: Disaster Recovery

#### Skills to Invoke
- `incident-responder` - Incident response
- `incident-runbook-templates` - Runbook creation
- `postmortem-writing` - Postmortem documentation

#### Actions
1. Design DR strategy
2. Set up backups
3. Create runbooks
4. Test failover
5. Document procedures
6. Train team

#### Copy-Paste Prompts
```
Use @incident-runbook-templates to create runbooks
```

## Cloud Provider Workflows

### AWS
```
Skills: aws-skills, aws-serverless, aws-penetration-testing
Services: EC2, Lambda, S3, RDS, ECS, EKS
```

### Azure
```
Skills: azure-functions, azure-ai-projects-py, azure-monitor-opentelemetry-py
Services: Functions, App Service, AKS, Cosmos DB
```

### GCP
```
Skills: gcp-cloud-run
Services: Cloud Run, GKE, Cloud Functions, BigQuery
```

## Quality Gates

- [ ] Infrastructure provisioned
- [ ] CI/CD pipeline working
- [ ] Monitoring configured
- [ ] Security measures in place
- [ ] Cost optimization applied
- [ ] DR procedures documented

## Related Workflow Bundles

- `development` - Application development
- `security-audit` - Security testing
- `database` - Database operations
- `testing-qa` - Testing workflows

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
