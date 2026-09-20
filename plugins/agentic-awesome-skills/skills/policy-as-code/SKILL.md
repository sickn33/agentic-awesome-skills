---
name: policy-as-code
description: Implement policy as code with OPA, Sentinel, and Kyverno. Automate policy
  enforcement in CI/CD and infrastructure. Use when enforcing compliance through automation.
category: security
risk: safe
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Checklist and framework guidance; no privileged tooling required. Apply
  controls through your own change process.
metadata:
  author: devops-skills
  version: '1.0'
---

# Policy as Code

Automate policy enforcement through code using OPA/Rego, Kyverno, Checkov, and CI/CD integration to prevent compliance violations before they reach production.

## Open Policy Agent (OPA) Rego Policies

```rego
# deny_public_s3.rego - Deny S3 buckets with public access
package terraform.aws.s3

import rego.v1

deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    resource.change.after.acl == "public-read"
    msg := sprintf(
        "S3 bucket '%s' has public-read ACL. All buckets must be private. [Policy: no-public-s3]",
        [resource.address]
    )
}

deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    resource.change.after.acl == "public-read-write"
    msg := sprintf(
        "S3 bucket '%s' has public-read-write ACL. This is strictly prohibited. [Policy: no-public-s3]",
        [resource.address]
    )
}
```

```rego
# require_encryption.rego - Require encryption on data stores
package terraform.aws.encryption

import rego.v1

deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_db_instance"
    not resource.change.after.storage_encrypted
    msg := sprintf(
        "RDS instance '%s' does not have storage encryption enabled. [Policy: require-rds-encryption]",
        [resource.address]
    )
}

deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_ebs_volume"
    not resource.change.after.encrypted
    msg := sprintf(
        "EBS volume '%s' is not encrypted. [Policy: require-ebs-encryption]",
        [resource.address]
    )
}

deny contains msg if {
    resource := input.resource_changes[_]
    resource.type == "aws_s3_bucket"
    not has_encryption(resource)
    msg := sprintf(
        "S3 bucket '%s' does not have default encryption configured. [Policy: require-s3-encryption]",
        [resource.address]
    )
}

has_encryption(resource) if {
    resource.change.after.server_side_encryption_configuration[_]
}
```

```rego
# require_tags.rego - Enforce mandatory tagging
package terraform.aws.tags

import rego.v1

required_tags := {"Environment", "Owner", "CostCenter", "DataClassification"}

deny contains msg if {
    resource := input.resource_changes[_]
    tags := object.get(resource.change.after, "tags", {})
    missing := required_tags - {key | tags[key]}
    count(missing) > 0
    msg := sprintf(
        "Resource '%s' is missing required tags: %v. [Policy: required-tags]",
        [resource.address, missing]
    )
}
```

```rego
# restrict_regions.rego - Limit resource deployment to approved regions
package terraform.aws.regions

import rego.v1

approved_regions := {"us-east-1", "us-west-2", "eu-west-1"}

deny contains msg if {
    resource := input.resource_changes[_]
    provider_config := input.configuration.provider_config.aws
    region := provider_config.expressions.region.constant_value
    not region in approved_regions
    msg := sprintf(
        "Resource '%s' is in region '%s'. Approved regions: %v. [Policy: approved-regions]",
        [resource.address, region, approved_regions]
    )
}
```

```bash
# Evaluate OPA policies against Terraform plan
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Run OPA evaluation
opa eval \
  --data policies/ \
  --input tfplan.json \
  "data.terraform.aws.s3.deny" \
  --format pretty

# Use conftest for easier CI integration
conftest test tfplan.json --policy policies/ --output table
```

## Kyverno Kubernetes Policies

```yaml
# require-labels.yaml - Enforce required labels on all pods
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-labels
  annotations:
    policies.kyverno.io/title: Require Labels
    policies.kyverno.io/category: Best Practices
    policies.kyverno.io/severity: medium
spec:
  validationFailureAction: Enforce
  background: true
  rules:
  - name: check-required-labels
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: >-
        Labels 'app.kubernetes.io/name', 'app.kubernetes.io/version',
        and 'team' are required on all Pods.
      pattern:
        metadata:
          labels:
            app.kubernetes.io/name: "?*"
            app.kubernetes.io/version: "?*"
            team: "?*"
---
# disallow-privileged.yaml - Block privileged containers
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-privileged-containers
  annotations:
    policies.kyverno.io/title: Disallow Privileged Containers
    policies.kyverno.io/category: Pod Security
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: Enforce
  background: true
  rules:
  - name: deny-privileged
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Privileged containers are not allowed."
      pattern:
        spec:
          containers:
          - securityContext:
              privileged: "false"
          =(initContainers):
          - securityContext:
              privileged: "false"
---
# require-resource-limits.yaml - Enforce resource limits
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
  annotations:
    policies.kyverno.io/title: Require Resource Limits
    policies.kyverno.io/severity: medium
spec:
  validationFailureAction: Enforce
  background: true
  rules:
  - name: check-resource-limits
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "All containers must have CPU and memory limits defined."
      pattern:
        spec:
          containers:
          - resources:
              limits:
                memory: "?*"
                cpu: "?*"
---
# disallow-latest-tag.yaml - Block usage of 'latest' image tag
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: disallow-latest-tag
  annotations:
    policies.kyverno.io/title: Disallow Latest Tag
    policies.kyverno.io/severity: medium
spec:
  validationFailureAction: Enforce
  background: true
  rules:
  - name: validate-image-tag
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images must use a specific tag, not 'latest'."
      pattern:
        spec:
          containers:
          - image: "!*:latest & *:*"
---
# restrict-image-registries.yaml - Allow only approved registries
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
  annotations:
    policies.kyverno.io/title: Restrict Image Registries
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: Enforce
  background: true
  rules:
  - name: validate-registries
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: >-
        Images must come from approved registries:
        123456789012.dkr.ecr.us-east-1.amazonaws.com or ghcr.io/your-org.
      pattern:
        spec:
          containers:
          - image: "123456789012.dkr.ecr.*.amazonaws.com/* | ghcr.io/your-org/*"
---
# require-networkpolicy.yaml - Ensure namespaces have NetworkPolicies
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-networkpolicy
  annotations:
    policies.kyverno.io/title: Require Network Policy
    policies.kyverno.io/severity: high
spec:
  validationFailureAction: Audit
  background: true
  rules:
  - name: check-networkpolicy
    match:
      any:
      - resources:
          kinds:
          - Deployment
    preconditions:
      all:
      - key: "{{request.object.metadata.namespace}}"
        operator: NotIn
        value: ["kube-system", "kube-public"]
    validate:
      message: "A NetworkPolicy must exist in namespace '{{request.object.metadata.namespace}}' before deploying workloads."
      deny:
        conditions:
          all:
          - key: "{{request.object.metadata.namespace}}"
            operator: AnyNotIn
            value: "{{request.object.metadata.namespace}}"
```

## Checkov Custom Checks

```python
# custom_checks/require_s3_versioning.py
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories


class S3Versioning(BaseResourceCheck):
    def __init__(self):
        name = "Ensure S3 bucket has versioning enabled"
        id = "CUSTOM_S3_001"
        supported_resources = ["aws_s3_bucket_versioning"]
        categories = [CheckCategories.BACKUP_AND_RECOVERY]
        super().__init__(name=name, id=id,
                         categories=categories,
                         supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        versioning = conf.get("versioning_configuration", [{}])
        if isinstance(versioning, list):
            versioning = versioning[0] if versioning else {}
        status = versioning.get("status", ["Disabled"])
        if isinstance(status, list):
            status = status[0]
        return CheckResult.PASSED if status == "Enabled" else CheckResult.FAILED


check = S3Versioning()
```

```python
# custom_checks/require_rds_backup.py
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck
from checkov.common.models.enums import CheckResult, CheckCategories


class RDSBackupRetention(BaseResourceCheck):
    def __init__(self):
        name = "Ensure RDS has backup retention of at least 7 days"
        id = "CUSTOM_RDS_001"
        supported_resources = ["aws_db_instance"]
        categories = [CheckCategories.BACKUP_AND_RECOVERY]
        super().__init__(name=name, id=id,
                         categories=categories,
                         supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        retention = conf.get("backup_retention_period", [0])
        if isinstance(retention, list):
            retention = retention[0]
        return CheckResult.PASSED if int(retention) >= 7 else CheckResult.FAILED


check = RDSBackupRetention()
```

```bash
# Run Checkov with custom checks
checkov -d ./terraform \
  --framework terraform \
  --external-checks-dir ./custom_checks \
  --output cli \
  --compact

# Run specific check IDs
checkov -d ./terraform \
  --check CUSTOM_S3_001,CUSTOM_RDS_001,CKV_AWS_18,CKV_AWS_19

# Generate SARIF output for GitHub Advanced Security integration
checkov -d ./terraform \
  --framework terraform \
  --output sarif \
  --output-file checkov-results.sarif

# Skip specific checks with documented justification
checkov -d ./terraform \
  --skip-check CKV_AWS_145 \
  --skip-check CKV_AWS_79
```


## Contents

- [CI/CD Pipeline Integration](references/details.md)
- [Policy Exception Management](references/details.md)
- [Policy Testing](references/details.md)
- [Best Practices](references/details.md)

## When to Use

- Enforcing security and compliance policies on infrastructure-as-code changes
- Preventing misconfigured Kubernetes workloads from deploying
- Automating guardrails in CI/CD pipelines for Terraform, CloudFormation, or Helm
- Implementing organizational standards that must be consistently applied
- Replacing manual approval gates with automated policy checks

## Limitations

- Guidance and checklists only; not legal advice and not a substitute for a qualified auditor.
- Docs-only import: upstream templates and scripts not bundled.

### Example

```markdown
Map this skill's control checklist to our current evidence and list gaps.
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
