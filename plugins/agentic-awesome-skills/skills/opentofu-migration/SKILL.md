---
name: opentofu-migration
description: Migrate from Terraform to OpenTofu with state compatibility, provider
  registry setup, and CI/CD pipeline updates. Use when adopting the open-source Terraform
  fork or evaluating license-free IaC.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# OpenTofu Migration

Migrate infrastructure-as-code from HashiCorp Terraform to the open-source OpenTofu fork.

## When to Use This Skill

Use this skill when:
- Migrating from Terraform to OpenTofu for licensing reasons
- Setting up a new IaC project and evaluating OpenTofu vs Terraform
- Updating CI/CD pipelines to use OpenTofu
- Configuring the OpenTofu provider registry

## Prerequisites

- Existing Terraform codebase (0.13+)
- OpenTofu CLI installed
- State backend access (S3, GCS, Azure Blob, etc.)

## Install OpenTofu

```bash
# macOS
brew install opentofu

# Linux (Debian/Ubuntu)
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh \
  -o install-opentofu.sh
chmod +x install-opentofu.sh
./install-opentofu.sh --install-method deb
rm install-opentofu.sh

# Linux (RPM)
./install-opentofu.sh --install-method rpm

# Docker
docker run --rm -v $(pwd):/workspace -w /workspace \
  ghcr.io/opentofu/opentofu:latest init

# Verify installation
tofu --version
```

## Migration Checklist

### 1. Verify Compatibility

```bash
# OpenTofu reads Terraform state files directly — no migration needed
# Check your Terraform version (must be <= 1.6.x for full compat)
terraform version

# Run plan with OpenTofu against existing state
tofu init
tofu plan
```

### 2. Replace CLI Commands

| Terraform | OpenTofu |
|-----------|----------|
| `terraform init` | `tofu init` |
| `terraform plan` | `tofu plan` |
| `terraform apply` | `tofu apply` |
| `terraform destroy` | `tofu destroy` |
| `terraform fmt` | `tofu fmt` |
| `terraform validate` | `tofu validate` |
| `terraform state` | `tofu state` |
| `terraform import` | `tofu import` |

### 3. Update Provider Lock File

```bash
# Remove Terraform lock and regenerate for OpenTofu
rm .terraform.lock.hcl
tofu init -upgrade

# Verify providers resolve correctly
tofu providers
```

### 4. Update State Backend

State files are compatible — no migration needed. Just verify:

```hcl
# backend.tf — works identically with OpenTofu
terraform {
  backend "s3" {
    bucket         = "mycompany-tfstate"
    key            = "prod/infrastructure.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

```bash
# Verify state access
tofu init
tofu state list
```

### 5. Provider Registry

OpenTofu uses its own registry but mirrors most Terraform providers:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.25"
    }
    # OpenTofu-specific providers
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}
```

## OpenTofu-Specific Features

### State Encryption (Not in Terraform)

```hcl
# OpenTofu supports native state encryption
terraform {
  encryption {
    key_provider "pbkdf2" "my_key" {
      passphrase = var.state_passphrase
    }
    method "aes_gcm" "encrypt" {
      keys = key_provider.pbkdf2.my_key
    }
    state {
      method   = method.aes_gcm.encrypt
      enforced = true
    }
    plan {
      method   = method.aes_gcm.encrypt
      enforced = true
    }
  }
}
```

### Early Variable/Local Evaluation

```hcl
# OpenTofu allows variables in backend config and module sources
terraform {
  backend "s3" {
    bucket = var.state_bucket  # Works in OpenTofu, not Terraform
    key    = "${var.project}/terraform.tfstate"
    region = var.aws_region
  }
}
```

## CI/CD Pipeline Updates

### GitHub Actions

```yaml
# .github/workflows/tofu.yml
name: OpenTofu
on:
  pull_request:
    paths: ["infra/**"]
  push:
    branches: [main]
    paths: ["infra/**"]

permissions:
  id-token: write
  contents: read
  pull-requests: write

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: "1.8.0"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/tofu-deploy
          aws-region: us-east-1

      - name: Init
        run: tofu init
        working-directory: infra/

      - name: Plan
        id: plan
        run: tofu plan -no-color -out=tfplan
        working-directory: infra/

      - name: Comment PR with plan
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### OpenTofu Plan
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\``;
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output.substring(0, 65536)
            });

  apply:
    needs: plan
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v1
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789:role/tofu-deploy
          aws-region: us-east-1
      - run: tofu init && tofu apply -auto-approve
        working-directory: infra/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages: [validate, plan, apply]

variables:
  TOFU_VERSION: "1.8.0"

.tofu-base:
  image: ghcr.io/opentofu/opentofu:${TOFU_VERSION}
  before_script:
    - tofu init

validate:
  extends: .tofu-base
  stage: validate
  script:
    - tofu fmt -check
    - tofu validate

plan:
  extends: .tofu-base
  stage: plan
  script:
    - tofu plan -out=tfplan
  artifacts:
    paths: [tfplan]

apply:
  extends: .tofu-base
  stage: apply
  script:
    - tofu apply tfplan
  when: manual
  only: [main]
  dependencies: [plan]
```

## Coexistence Strategy

If you need both tools during migration:

```bash
# Use aliases to avoid conflicts
alias tf="terraform"
alias tofu="tofu"

# Or use direnv per-project
# .envrc
export PATH="/opt/opentofu/bin:$PATH"

# Wrapper script for gradual migration
#!/bin/bash
if [ -f ".use-opentofu" ]; then
    exec tofu "$@"
else
    exec terraform "$@"
fi
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Provider not found | Run `tofu init -upgrade`, check registry.opentofu.org |
| State lock conflict | Same as Terraform — check DynamoDB/blob lease |
| Version constraint error | Update `required_version` to `>= 1.6.0` |
| Backend migration | State is compatible — just run `tofu init` |
| Missing provider credentials | Same env vars work (`AWS_*`, `GOOGLE_*`, `ARM_*`) |

## Related Skills

- terraform-aws (`terraform-aws`) — AWS IaC patterns (works with both)
- terraform-azure (`terraform-azure`) — Azure IaC patterns
- terraform-gcp (`terraform-gcp`) — GCP IaC patterns
- policy-as-code (`policy-as-code`) — OPA policy checks for IaC

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

