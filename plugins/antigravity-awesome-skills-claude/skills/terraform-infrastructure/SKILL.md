---
name: terraform-infrastructure
description: "Terraform infrastructure as code workflow for provisioning cloud resources, creating reusable modules, and managing infrastructure at scale."
category: granular-workflow-bundle
risk: safe
source: personal
date_added: "2026-02-27"
---

# Terraform Infrastructure Workflow

## Overview

Specialized workflow for infrastructure as code using Terraform including resource provisioning, module creation, state management, and multi-environment deployments.

## When to Use This Workflow

Use this workflow when:
- Provisioning cloud infrastructure
- Creating Terraform modules
- Managing multi-environment infra
- Implementing IaC best practices
- Setting up Terraform workflows

## Workflow Phases

### Phase 1: Terraform Setup

#### Skills to Invoke
- `terraform-skill` - Terraform basics
- `terraform-specialist` - Advanced Terraform

#### Actions
1. Initialize Terraform
2. Configure backend
3. Set up providers
4. Configure variables
5. Create outputs

#### Copy-Paste Prompts
```
Use @terraform-skill to set up Terraform project
```

### Phase 2: Resource Provisioning

#### Skills to Invoke
- `terraform-module-library` - Terraform modules
- `cloud-architect` - Cloud architecture

#### Actions
1. Design infrastructure
2. Create resource definitions
3. Configure networking
4. Set up compute
5. Add storage

#### Copy-Paste Prompts
```
Use @terraform-module-library to provision cloud resources
```

### Phase 3: Module Creation

#### Skills to Invoke
- `terraform-module-library` - Module creation

#### Actions
1. Design module interface
2. Create module structure
3. Define variables/outputs
4. Add documentation
5. Test module

#### Copy-Paste Prompts
```
Use @terraform-module-library to create reusable Terraform module
```

### Phase 4: State Management

#### Skills to Invoke
- `terraform-specialist` - State management

#### Actions
1. Configure remote backend
2. Set up state locking
3. Implement workspaces
4. Configure state access
5. Set up backup

#### Copy-Paste Prompts
```
Use @terraform-specialist to configure Terraform state
```

### Phase 5: Multi-Environment

#### Skills to Invoke
- `terraform-specialist` - Multi-environment

#### Actions
1. Design environment structure
2. Create environment configs
3. Set up variable files
4. Configure isolation
5. Test deployments

#### Copy-Paste Prompts
```
Use @terraform-specialist to set up multi-environment Terraform
```

### Phase 6: CI/CD Integration

#### Skills to Invoke
- `cicd-automation-workflow-automate` - CI/CD
- `github-actions-templates` - GitHub Actions

#### Actions
1. Create CI pipeline
2. Configure plan/apply
3. Set up approvals
4. Add validation
5. Test pipeline

#### Copy-Paste Prompts
```
Use @cicd-automation-workflow-automate to create Terraform CI/CD
```

### Phase 7: Security

#### Skills to Invoke
- `secrets-management` - Secrets management
- `terraform-specialist` - Security

#### Actions
1. Configure secrets
2. Set up encryption
3. Implement policies
4. Add compliance
5. Audit access

#### Copy-Paste Prompts
```
Use @secrets-management to secure Terraform secrets
```

## Quality Gates

- [ ] Resources provisioned
- [ ] Modules working
- [ ] State configured
- [ ] Multi-env tested
- [ ] CI/CD working
- [ ] Security verified

## Related Workflow Bundles

- `cloud-devops` - Cloud/DevOps
- `kubernetes-deployment` - Kubernetes
- `aws-infrastructure` - AWS specific

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
