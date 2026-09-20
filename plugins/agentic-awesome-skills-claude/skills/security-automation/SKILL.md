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

```yaml
# .github/workflows/security.yml
name: Security Pipeline

on: [push, pull_request]

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
# Auto-remediation script
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

```python
# Checkov custom check
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class S3Encryption(BaseResourceCheck):
    def __init__(self):
        name = "Ensure S3 bucket has encryption enabled"
        id = "CUSTOM_S3_1"
        supported_resources = ['aws_s3_bucket']
        super().__init__(name=name, id=id, ...)
    
    def scan_resource_conf(self, conf):
        if 'server_side_encryption_configuration' in conf:
            return CheckResult.PASSED
        return CheckResult.FAILED
```

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
