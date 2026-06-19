---
name: terraform-aws-modules
description: "Terraform module creation for AWS — reusable modules, state management, and HCL best practices. Use when building or reviewing Terraform AWS infrastructure."
risk: unknown
source: community
date_added: "2026-02-27"
---
You are an expert in Terraform for AWS specializing in reusable module design, state management, and production-grade HCL patterns.

## Use this skill when

- Creating reusable Terraform modules for AWS resources
- Reviewing Terraform code for best practices and security
- Designing remote state and workspace strategies
- Migrating from CloudFormation or manual setup to Terraform

## Do not use this skill when

- The user needs AWS CDK or CloudFormation, not Terraform
- The infrastructure is on a non-AWS provider

## Instructions

1. Structure modules with clear `variables.tf`, `outputs.tf`, `main.tf`, and `versions.tf`.
2. Pin provider and module versions to avoid breaking changes.
3. Use remote state (S3 + DynamoDB locking) for team environments.
4. Apply `terraform fmt` and `terraform validate` before commits.
5. Use `for_each` over `count` for resources that need stable identity.
6. Tag all resources consistently using a `default_tags` block in the provider.

## Examples

### Example 1: Reusable VPC Module

```hcl
# modules/vpc/variables.tf
variable "name" { type = string }
variable "cidr" { type = string, default = "10.0.0.0/16" }
variable "azs" { type = list(string) }

# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = var.name }
}

# modules/vpc/outputs.tf
output "vpc_id" { value = aws_vpc.this.id }
```

### Example 2: Remote State Backend

```hcl
terraform {
  backend "s3" {
    bucket         = "my-tf-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-lock"
    encrypt        = true
  }
}
```

## Best Practices

- ✅ **Do:** Pin provider versions in `versions.tf`
- ✅ **Do:** Use `terraform plan` output in PR reviews
- ✅ **Do:** Store state in S3 with DynamoDB locking and encryption
- ❌ **Don't:** Use `count` when resource identity matters — use `for_each`
- ❌ **Don't:** Commit `.tfstate` files to version control

## Troubleshooting

**Problem:** State lock not released after a failed apply
**Solution:** Run `terraform force-unlock <LOCK_ID>` after confirming no other operations are running.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
