---
name: cis-benchmarks
description: Audit and remediate CIS benchmark violations.
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

# CIS Benchmarks

Implement and audit CIS security benchmarks.

## When to Use This Skill

Use this skill when:
- Assessing security compliance
- Implementing security baselines
- Meeting regulatory requirements
- Hardening systems to standards

## Assessment Tools

### OpenSCAP

```bash
# Install
apt install openscap-scanner scap-security-guide

# Run CIS benchmark scan
oscap xccdf eval \
  --profile xccdf_org.ssgproject.content_profile_cis \
  --results results.xml \
  --report report.html \
  /usr/share/xml/scap/ssg/content/ssg-ubuntu2204-ds.xml
```

### Lynis

```bash
# Install
apt install lynis

# Run audit
lynis audit system

# Generate report
lynis audit system --report-file /tmp/lynis-report.dat
```

### InSpec

```ruby
# cis-profile/controls/ssh.rb
control 'cis-ssh-1' do
  impact 1.0
  title 'Ensure SSH root login is disabled'
  
  describe sshd_config do
    its('PermitRootLogin') { should eq 'no' }
  end
end

control 'cis-ssh-2' do
  impact 0.7
  title 'Ensure SSH password authentication is disabled'
  
  describe sshd_config do
    its('PasswordAuthentication') { should eq 'no' }
  end
end
```

```bash
# Run InSpec
inspec exec cis-profile -t ssh://user@target
```

### Kubernetes CIS

```bash
# kube-bench
docker run --rm -v /etc:/etc:ro -v /var:/var:ro \
  aquasec/kube-bench:latest run --targets node

# Check specific sections
kube-bench run --targets master --check 1.1,1.2
```

## Remediation Workflow

```yaml
workflow:
  1_scan:
    - Run automated assessment
    - Generate baseline report
    
  2_analyze:
    - Review findings
    - Identify false positives
    - Prioritize by risk
    
  3_remediate:
    - Apply fixes
    - Document exceptions
    - Verify changes
    
  4_validate:
    - Re-run assessment
    - Confirm remediation
    - Generate compliance report
```

## Best Practices

- Baseline before hardening
- Document exceptions
- Automate assessments
- Track compliance over time
- Regular re-assessment
- Version control configurations

## Related Skills

- linux-hardening (`linux-hardening`) - Linux security
- vulnerability-scanning (`vulnerability-scanning`) - Security scanning

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
