---
name: dast-scanning
description: Perform dynamic application security testing with OWASP ZAP, Burp Suite,
  and Nikto.
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

# DAST Scanning

Test running applications for security vulnerabilities through dynamic analysis.

## When to Use This Skill

Use this skill when:
- Testing deployed applications
- Performing automated security scans
- Finding runtime vulnerabilities
- Testing authentication flows
- Validating API security

## Prerequisites

- Running application instance
- Network access to target
- Testing authorization
- Understanding of web security

## Tool Overview

| Tool | Type | Best For |
|------|------|----------|
| OWASP ZAP | OSS | Automated scanning, CI |
| Burp Suite | Commercial | Manual testing, advanced |
| Nikto | OSS | Web server scanning |
| Nuclei | OSS | Template-based scanning |
| Arachni | OSS | Comprehensive scanning |

## OWASP ZAP

### Docker Setup

```bash
# Run ZAP in daemon mode
docker run -d --name zap \
  -p 8080:8080 \
  -v $(pwd)/reports:/zap/reports \
  ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -daemon -host 0.0.0.0 -port 8080 \
  -config api.addrs.addr.name=.* \
  -config api.addrs.addr.regex=true
```

### Baseline Scan

```bash
# Quick baseline scan
docker run --rm -v $(pwd):/zap/wrk \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://target.example.com \
  -r baseline-report.html

# With authentication
docker run --rm -v $(pwd):/zap/wrk \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py -t https://target.example.com \
  -r report.html \
  --auth-login-url https://target.example.com/login \
  --auth-username user \
  --auth-password pass
```

### Full Scan

```bash
# Comprehensive scan
docker run --rm -v $(pwd):/zap/wrk \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-full-scan.py -t https://target.example.com \
  -r full-report.html \
  -J full-report.json
```

### API Scan

```bash
# OpenAPI specification scan
docker run --rm -v $(pwd):/zap/wrk \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-api-scan.py -t https://target.example.com/openapi.json \
  -f openapi \
  -r api-report.html
```

### ZAP Automation Framework

```yaml
# zap-automation.yaml
env:
  contexts:
    - name: "Default Context"
      urls:
        - "https://target.example.com"
      includePaths:
        - "https://target.example.com/.*"
      excludePaths:
        - "https://target.example.com/logout.*"
      authentication:
        method: "form"
        parameters:
          loginUrl: "https://target.example.com/login"
          loginRequestData: "username={%username%}&password={%password%}"
        verification:
          method: "response"
          loggedInRegex: "\\QWelcome\\E"
      users:
        - name: "testuser"
          credentials:
            username: "test@example.com"
            password: "password123"

jobs:
  - type: spider
    parameters:
      context: "Default Context"
      user: "testuser"
      maxDuration: 10
      
  - type: spiderAjax
    parameters:
      context: "Default Context"
      user: "testuser"
      maxDuration: 10
      
  - type: passiveScan-wait
    parameters:
      maxDuration: 5
      
  - type: activeScan
    parameters:
      context: "Default Context"
      user: "testuser"
      policy: "Default Policy"
      
  - type: report
    parameters:
      template: "traditional-html"
      reportDir: "/zap/reports"
      reportFile: "zap-report"
```

```bash
# Run automation
docker run --rm -v $(pwd):/zap/wrk \
  ghcr.io/zaproxy/zaproxy:stable \
  zap.sh -cmd -autorun /zap/wrk/zap-automation.yaml
```

## CI/CD Integration

### GitHub Actions

```yaml
name: DAST Scan

on:
  workflow_dispatch:
  schedule:
    - cron: '0 2 * * *'

jobs:
  dast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start Application
        run: |
          docker-compose up -d
          sleep 30  # Wait for app to be ready

      - name: OWASP ZAP Scan
        uses: zaproxy/action-full-scan@v0.8.0
        with:
          target: 'http://localhost:8080'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-report
          path: report_html.html
```

### GitLab CI

```yaml
dast:
  stage: security
  image: ghcr.io/zaproxy/zaproxy:stable
  variables:
    TARGET_URL: $DAST_TARGET_URL
  script:
    - mkdir -p /zap/wrk/reports
    - zap-baseline.py -t $TARGET_URL -r /zap/wrk/reports/zap-report.html -I
  artifacts:
    paths:
      - reports/
    expire_in: 1 week
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
```

## Burp Suite Automation

### REST API Usage

```python
import requests

class BurpScanner:
    def __init__(self, api_url, api_key):
        self.api_url = api_url
        self.headers = {'Authorization': api_key}
    
    def create_scan(self, target_url):
        """Create and start a new scan."""
        payload = {
            'scan_configurations': [
                {'name': 'Crawl and Audit - Balanced'}
            ],
            'scope': {
                'include': [{'rule': target_url}]
            },
            'urls': [target_url]
        }
        response = requests.post(
            f'{self.api_url}/v0.1/scan',
            json=payload,
            headers=self.headers
        )
        return response.headers.get('Location')
    
    def get_scan_status(self, scan_id):
        """Get scan status."""
        response = requests.get(
            f'{self.api_url}/v0.1/scan/{scan_id}',
            headers=self.headers
        )
        return response.json()
    
    def get_issues(self, scan_id):
        """Get scan issues."""
        response = requests.get(
            f'{self.api_url}/v0.1/scan/{scan_id}/issues',
            headers=self.headers
        )
        return response.json()

# Usage
scanner = BurpScanner('http://burp:1337', 'api-key')
scan_id = scanner.create_scan('https://target.example.com')

while True:
    status = scanner.get_scan_status(scan_id)
    if status['scan_status'] == 'succeeded':
        break
    time.sleep(30)

issues = scanner.get_issues(scan_id)
```

## Nikto

### Basic Scanning

```bash
# Install
apt-get install nikto

# Basic scan
nikto -h https://target.example.com

# With specific options
nikto -h https://target.example.com \
  -ssl \
  -Tuning 123bde \
  -output nikto-report.html \
  -Format html

# Scan specific ports
nikto -h target.example.com -p 80,443,8080
```

## Common DAST Findings

### OWASP Top 10

```yaml
owasp_findings:
  A01_Broken_Access_Control:
    - IDOR vulnerabilities
    - Missing function-level access control
    - Privilege escalation
    
  A02_Cryptographic_Failures:
    - Sensitive data in URLs
    - Missing HTTPS
    - Weak ciphers
    
  A03_Injection:
    - SQL injection
    - Command injection
    - XSS
    
  A05_Security_Misconfiguration:
    - Default credentials
    - Verbose error messages
    - Missing security headers
    
  A07_Auth_Failures:
    - Weak passwords accepted
    - Session fixation
    - Missing MFA
```

## Security Headers Check

```bash
# Check security headers
curl -I https://target.example.com | grep -i "x-\|content-security\|strict"

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: default-src 'self'
# Strict-Transport-Security: max-age=31536000
```

## Custom Test Cases

```yaml
# Test authentication
tests:
  - name: "Authentication Bypass"
    steps:
      - Access protected resource without auth
      - Verify 401/403 response
      - Access with valid auth
      - Verify 200 response
    
  - name: "Session Management"
    steps:
      - Login and capture session token
      - Logout
      - Attempt to use old session
      - Verify session invalidated
    
  - name: "Input Validation"
    steps:
      - Submit XSS payload in all inputs
      - Submit SQL injection in all inputs
      - Verify proper sanitization
```

## Common Issues

### Issue: False Positives
**Problem**: Scanner reports non-vulnerabilities
**Solution**: Configure scan policy, review findings manually

### Issue: Missing Authentication
**Problem**: Cannot scan authenticated areas
**Solution**: Configure authentication context, use session tokens

### Issue: Incomplete Coverage
**Problem**: Scanner misses endpoints
**Solution**: Import API specs, improve spidering, use authenticated scanning

## Best Practices

- Test in staging environment first
- Configure proper authentication
- Import API specifications for complete coverage
- Review findings before reporting
- Combine with manual testing
- Run regular scans (weekly minimum)
- Track findings over time
- Coordinate with development team

## Related Skills

- sast-scanning (`sast-scanning`) - Static analysis
- penetration-testing (`penetration-testing`) - Manual testing
- waf-setup (`waf-setup`) - WAF configuration

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
