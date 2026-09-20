---
name: penetration-testing
description: Perform basic penetration testing and security assessments.
category: security
risk: offensive
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
> **⚠️ AUTHORIZED USE ONLY**
> This skill is for educational purposes or authorized security assessments only.
> You must have explicit, written permission from the system owner before using this tool.
> Misuse of this tool is illegal and strictly prohibited.

> **Mandatory confirmation gate**
> Before running any command that probes, exploits, changes, persists on, extracts data from, or attempts credential access against a target:
> 1. Ask the user to state the exact target URL, IP, account, or resource.
> 2. Ask the user to confirm written authorization and the permitted scope.
> 3. Show the exact command(s) and explain their expected effect.
> 4. Wait for explicit confirmation in the current conversation.
>
> Without that confirmation, remain read-only and provide defensive guidance only. Prefer a sandbox, disposable VM, or controlled lab.

# Penetration Testing

Validate security controls through authorized testing.

## Phases

```yaml
pentest_phases:
  1_reconnaissance:
    - Passive information gathering
    - DNS enumeration
    - Network mapping
    
  2_scanning:
    - Port scanning
    - Service identification
    - Vulnerability scanning
    
  3_exploitation:
    - Attempt exploitation
    - Verify vulnerabilities
    - Document findings
    
  4_post_exploitation:
    - Privilege escalation
    - Lateral movement
    - Data access
    
  5_reporting:
    - Document findings
    - Risk assessment
    - Remediation recommendations
```

## Reconnaissance

```bash
# DNS enumeration
dig example.com ANY
host -l example.com

# Subdomain discovery
subfinder -d example.com

# WHOIS
whois example.com
```

## Scanning

```bash
# Port scan
nmap -sV -sC -p- target.com

# Web scanning
nikto -h https://target.com
dirb https://target.com

# Vulnerability scan
nmap --script vuln target.com
```

## Web Testing

```bash
# SQL injection test
sqlmap -u "http://target.com/page?id=1"

# XSS testing
# Use Burp Suite or manual testing

# Directory traversal
curl "http://target.com/file?path=../../../etc/passwd"
```

## Rules of Engagement

```yaml
scope:
  in_scope:
    - target.com
    - api.target.com
  out_of_scope:
    - production-db.target.com
    - third-party services
  
  testing_window: "Weekdays 2-6 AM UTC"
  emergency_contact: "security@target.com"
```

## Best Practices

- Always get written authorization
- Define clear scope
- Document everything
- Report critical findings immediately
- Safe exploitation techniques only

## Related Skills

- dast-scanning (`dast-scanning`) - Automated testing
- vulnerability-scanning (`vulnerability-scanning`) - Vulnerability discovery

## When to Use

- You have explicit, written authorization to assess the target in scope, and the task matches this skill's active assessment workflow.

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
