# Details (moved from SKILL.md)

> Extended reference content for `policy-as-code`, kept under `references/` so the entrypoint stays within the audit budget.

## CI/CD Pipeline Integration

```yaml
# GitHub Actions - Policy enforcement in PR workflow
name: Policy Checks
on:
  pull_request:
    paths:
      - 'terraform/**'
      - 'kubernetes/**'

jobs:
  terraform-policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init and Plan
        working-directory: terraform/
        run: |
          terraform init -backend=false
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json

      - name: OPA Policy Check
        uses: open-policy-agent/setup-opa@v2
        with:
          version: latest
      - run: |
          RESULTS=$(opa eval \
            --data policies/ \
            --input terraform/tfplan.json \
            --format json \
            "data.terraform" | jq '.result[0].expressions[0].value')
          DENY_COUNT=$(echo "$RESULTS" | jq '[.. | .deny? // empty | .[] ] | length')
          if [ "$DENY_COUNT" -gt 0 ]; then
            echo "::error::Policy violations found:"
            echo "$RESULTS" | jq '.. | .deny? // empty | .[]'
            exit 1
          fi

      - name: Checkov Scan
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: terraform/
          framework: terraform
          output_format: cli,sarif
          output_file_path: console,checkov-results.sarif
          soft_fail: false
          external_checks_dirs: custom_checks/

      - name: Upload SARIF
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: checkov-results.sarif

  kubernetes-policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Kyverno CLI
        run: |
          curl -LO https://github.com/kyverno/kyverno/releases/latest/download/kyverno-cli_linux_amd64.tar.gz
          tar -xzf kyverno-cli_linux_amd64.tar.gz
          sudo mv kyverno /usr/local/bin/

      - name: Test Kyverno Policies
        run: |
          kyverno apply policies/kyverno/ \
            --resource kubernetes/manifests/ \
            --detailed-results \
            --output-format table

      - name: Conftest Kubernetes Manifests
        uses: open-policy-agent/conftest-action@v2
        with:
          files: kubernetes/manifests/
          policy: policies/kubernetes/
```


## Policy Exception Management

```yaml
exception_workflow:
  request:
    fields:
      - policy_id: "Which policy needs an exception"
      - resource: "Specific resource requiring exception"
      - justification: "Business reason for the exception"
      - compensating_controls: "Alternative mitigations in place"
      - duration: "Temporary (with expiry) or permanent"
      - requestor: "Person requesting"
      - approver: "Security team member who approved"

  approval_process:
    1: "Requestor submits exception with justification"
    2: "Security team reviews and assesses risk"
    3: "Compensating controls verified"
    4: "Exception approved or denied with rationale"
    5: "Exception documented in registry"
    6: "Automated enforcement updated to allow exception"

  enforcement:
    opa: |
      # Exception list loaded as data
      # policies/exceptions.json
      # {"exceptions": [{"resource": "aws_s3_bucket.public_website", "policy": "no-public-s3", "expires": "2025-06-01"}]}
    kyverno: |
      # Use Kyverno PolicyException resource
      apiVersion: kyverno.io/v2beta1
      kind: PolicyException
      metadata:
        name: allow-public-website
        namespace: web
      spec:
        exceptions:
        - policyName: disallow-privileged-containers
          ruleNames:
          - deny-privileged
        match:
          any:
          - resources:
              kinds:
              - Pod
              names:
              - legacy-app-*

  review_schedule:
    - Review all active exceptions quarterly
    - Expire temporary exceptions automatically
    - Re-justify permanent exceptions annually
    - Track exception count trends as a security metric
```


## Policy Testing

```bash
# Test OPA policies with mock input
mkdir -p policies/tests

# Create test input
cat > policies/tests/public_bucket_test.json <<'EOF'
{
  "resource_changes": [{
    "address": "aws_s3_bucket.test",
    "type": "aws_s3_bucket",
    "change": {
      "after": {"acl": "public-read"}
    }
  }]
}
EOF

# Run test
opa eval --data policies/ --input policies/tests/public_bucket_test.json \
  "data.terraform.aws.s3.deny" --format pretty
# Should output the deny message

# OPA unit tests
cat > policies/tests/s3_test.rego <<'EOF'
package terraform.aws.s3_test

import rego.v1
import data.terraform.aws.s3

test_deny_public_bucket if {
    result := s3.deny with input as {"resource_changes": [{"address": "test", "type": "aws_s3_bucket", "change": {"after": {"acl": "public-read"}}}]}
    count(result) > 0
}

test_allow_private_bucket if {
    result := s3.deny with input as {"resource_changes": [{"address": "test", "type": "aws_s3_bucket", "change": {"after": {"acl": "private"}}}]}
    count(result) == 0
}
EOF

opa test policies/ -v
```


## Best Practices

- Version control all policies alongside the infrastructure code they govern
- Start in audit/warn mode and transition to enforce after verifying no false positives
- Write unit tests for every policy to catch regressions and verify intended behavior
- Implement a formal exception process: never disable policies to bypass legitimate checks
- Use policy results as PR status checks to block non-compliant merges
- Layer policies: Checkov for static analysis, OPA for Terraform plan evaluation, Kyverno for runtime
- Tag policies with compliance framework references (e.g., SOC 2 CC6.1, PCI Req 2.2)
- Monitor policy violation trends over time to identify systemic issues
- Provide clear, actionable error messages that explain how to fix violations
- Roll out new policies gradually: inform teams, give a remediation window, then enforce

