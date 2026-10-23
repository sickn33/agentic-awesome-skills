---
name: security-automation
description: Automate security workflows and remediation. Build security pipelines,
  automate compliance checks, and implement SOAR capabilities. Use when scaling security
  operations or implementing DevSecOps.
category: security
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant security tooling (scanners, vault CLIs) and an
  authorized scope for any active assessment. Docs-only; helper scripts and templates
  not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Security Automation

Automate security operations for scale and efficiency.

## Security Pipeline

Illustrative workflow only: action refs below are historical examples, not vetted pins. Select maintained upstream actions, review their code and pin full commit SHAs before use. Grant `contents: read` only unless a reviewed job needs more; never expose secrets to untrusted pull-request code. Install required CLIs at reviewed versions before their steps and verify each scanner’s failure behavior.

```yaml
# .github/workflows/security.yml
name: Security Pipeline

on: [push, pull_request]
permissions:
  contents: read

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Secret Scanning
        uses: trufflesecurity/trufflehog@main
        
      - name: SAST
        uses: returntocorp/semgrep-action@v1
        
      - name: Dependency Scan
        run: npm audit --audit-level=high
        
      - name: Container Scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          
      - name: Compliance Check
        run: |
          checkov -d . --framework terraform
```

## Automated Remediation

```python
# Fragment: requires boto3 and approved scoped AWS credentials.
# Capture existing configuration and an approved rollback plan before mutation.
import boto3

def remediate_public_s3(bucket_name):
    """Remove public access from S3 bucket."""
    s3 = boto3.client('s3')
    s3.put_public_access_block(
        Bucket=bucket_name,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True
        }
    )
```

## SOAR Integration

The YAML is vendor-neutral pseudocode, not an executable playbook schema. Enrichment output is untrusted evidence; require corroboration and scoped approval before blocking an address or disabling an account. Record the prior state, expiry and rollback, and do not automatically notify people without messaging authorization.

```yaml
playbook:
  name: Suspicious Login Response
  trigger: alert.type == "suspicious_login"
  actions:
    - enrich_ip:
        source: threat_intel
    - if_condition: ip.is_malicious
      then:
        - block_ip:
            firewall: cloudflare
        - disable_user:
            duration: 1h
        - notify:
            channel: security
        - create_ticket:
            priority: high
```

## Compliance as Code

A custom Checkov check must target the actual Terraform resource schema in the deployed provider version. Do not assume an inline `server_side_encryption_configuration` on `aws_s3_bucket` covers separate encryption resources or effective cloud defaults. Inspect the installed Checkov API, select the appropriate resource or graph check, and add fixtures for encrypted, unencrypted and unknown configurations. Treat unknown values explicitly; a static pass does not establish live encryption state. The check implementation is not bundled.

## Best Practices

- Start with high-impact automations
- Test in staging first
- Include manual review gates
- Monitor automation effectiveness
- Regular rule updates

## Related Skills

- github-actions (`github-actions`) - CI/CD automation
- policy-as-code (`policy-as-code`) - Policy enforcement

## When to Use

- You need the security workflow covered by this skill (secrets, scanning, network defense, operations, AI security) inside an authorized scope.

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
