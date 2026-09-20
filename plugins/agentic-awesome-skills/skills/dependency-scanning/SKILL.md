---
name: dependency-scanning
description: Scan package dependencies for known vulnerabilities using Snyk, Dependabot,
  and OWASP Dependency-Check.
category: security
risk: safe
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

# Dependency Scanning

Identify vulnerabilities in third-party dependencies and libraries.

## When to Use This Skill

Use this skill when:
- Managing third-party dependencies
- Implementing software composition analysis
- Meeting compliance requirements
- Securing the software supply chain
- Automating vulnerability detection

## Prerequisites

- Package manifest files (package.json, requirements.txt, etc.)
- CI/CD pipeline access
- Dependency scanning tool

## Tool Comparison

| Tool | Type | Languages | Best For |
|------|------|-----------|----------|
| Snyk | Commercial/Free | Many | Comprehensive SCA |
| Dependabot | Free (GitHub) | Many | Automated PRs |
| OWASP Dep-Check | OSS | Many | Free scanning |
| npm audit | Built-in | Node.js | Quick checks |
| pip-audit | OSS | Python | Python projects |
| Trivy | OSS | Many | Container deps |

## Snyk

### CLI Usage

```bash
# Install
npm install -g snyk

# Authenticate
snyk auth

# Test project
snyk test

# Monitor project (track over time)
snyk monitor

# Test specific manifest
snyk test --file=package.json
snyk test --file=requirements.txt

# Output formats
snyk test --json > snyk-results.json
snyk test --sarif > snyk-results.sarif

# Fix vulnerabilities
snyk fix

# Ignore vulnerability
snyk ignore --id=SNYK-JS-LODASH-567746 --expiry=2024-12-31 --reason="No exploit path"
```

### CI Integration

```yaml
# .github/workflows/snyk.yml
name: Snyk Security

on:
  push:
    branches: [main]
  pull_request:

jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Upload results to GitHub
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: snyk.sarif
```

### Policy File

```yaml
# .snyk
version: v1.25.0
ignore:
  SNYK-JS-LODASH-567746:
    - '*':
        reason: No user input reaches this function
        expires: 2024-12-31
        created: 2024-01-15

  'snyk:lic:npm:gpl-3.0':
    - '*':
        reason: Internal use only
        
patch: {}
```

## GitHub Dependabot

### Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  # JavaScript/Node.js
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    ignore:
      - dependency-name: "aws-sdk"
        update-types: ["version-update:semver-major"]
    groups:
      development-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"

  # Python
  - package-ecosystem: "pip"
    directory: "/"
    schedule:
      interval: "daily"
    
  # Docker
  - package-ecosystem: "docker"
    directory: "/"
    schedule:
      interval: "weekly"
    
  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

### Security Alerts

```yaml
# Automated security updates
# Enable in repository Settings > Security > Dependabot

# Dependabot will automatically:
# - Create PRs for vulnerable dependencies
# - Update to patched versions
# - Provide CVE details in PR description
```

## OWASP Dependency-Check

### Installation

```bash
# Download
wget https://github.com/jeremylong/DependencyCheck/releases/download/v9.0.0/dependency-check-9.0.0-release.zip
unzip dependency-check-9.0.0-release.zip

# Or via Homebrew
brew install dependency-check
```

### Usage

```bash
# Scan project
dependency-check --project "MyProject" \
  --scan /path/to/project \
  --out /path/to/reports \
  --format HTML \
  --format JSON

# With specific analyzers
dependency-check --project "MyProject" \
  --scan . \
  --enableExperimental \
  --disableRetireJS

# CI configuration
dependency-check --project "MyProject" \
  --scan . \
  --format JSON \
  --failOnCVSS 7 \
  --suppression suppression.xml
```

### Suppression File

```xml
<!-- suppression.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<suppressions xmlns="https://jeremylong.github.io/DependencyCheck/dependency-suppression.1.3.xsd">
  <suppress>
    <notes>False positive - not using vulnerable function</notes>
    <packageUrl regex="true">^pkg:npm/lodash@.*$</packageUrl>
    <cve>CVE-2021-23337</cve>
  </suppress>
  
  <suppress until="2024-12-31">
    <notes>Risk accepted - mitigated by WAF</notes>
    <cpe>cpe:/a:apache:struts:2.5.0</cpe>
    <vulnerabilityName>CVE-2023-12345</vulnerabilityName>
  </suppress>
</suppressions>
```

### Maven Integration

```xml
<!-- pom.xml -->
<plugin>
  <groupId>org.owasp</groupId>
  <artifactId>dependency-check-maven</artifactId>
  <version>9.0.0</version>
  <configuration>
    <failBuildOnCVSS>7</failBuildOnCVSS>
    <suppressionFiles>
      <suppressionFile>suppression.xml</suppressionFile>
    </suppressionFiles>
  </configuration>
  <executions>
    <execution>
      <goals>
        <goal>check</goal>
      </goals>
    </execution>
  </executions>
</plugin>
```

## Language-Specific Tools

### Node.js (npm audit)

```bash
# Run audit
npm audit

# JSON output
npm audit --json

# Fix automatically
npm audit fix

# Fix with breaking changes
npm audit fix --force

# Production only
npm audit --production
```

### Python (pip-audit)

```bash
# Install
pip install pip-audit

# Scan installed packages
pip-audit

# Scan requirements file
pip-audit -r requirements.txt

# Output formats
pip-audit --format json
pip-audit --format cyclonedx-json

# Fix vulnerabilities
pip-audit --fix
```

### Go (govulncheck)

```bash
# Install
go install golang.org/x/vuln/cmd/govulncheck@latest

# Scan project
govulncheck ./...

# JSON output
govulncheck -json ./...
```

### Ruby (bundler-audit)

```bash
# Install
gem install bundler-audit

# Update database
bundle-audit update

# Run audit
bundle-audit check

# Output format
bundle-audit check --format json
```

## SBOM Generation

### CycloneDX

```bash
# Node.js
npx @cyclonedx/cyclonedx-npm --output-file sbom.json

# Python
pip install cyclonedx-bom
cyclonedx-py -o sbom.json

# Go
go install github.com/CycloneDX/cyclonedx-gomod/cmd/cyclonedx-gomod@latest
cyclonedx-gomod mod -json > sbom.json
```

### Syft

```bash
# Install
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh -o /tmp/install-syft.sh && sh /tmp/install-syft.sh && rm /tmp/install-syft.sh -s

# Generate SBOM
syft dir:/path/to/project -o cyclonedx-json > sbom.json
syft dir:/path/to/project -o spdx-json > sbom-spdx.json

# From container
syft myimage:latest -o cyclonedx-json > sbom.json
```

## CI/CD Pipeline

```yaml
# Comprehensive dependency scanning
name: Dependency Security

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 8 * * *'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: npm audit
        run: npm audit --audit-level=high

      - name: Snyk scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
          
      - name: Generate SBOM
        run: npx @cyclonedx/cyclonedx-npm --output-file sbom.json

      - name: Upload SBOM
        uses: actions/upload-artifact@v4
        with:
          name: sbom
          path: sbom.json
```

## Common Issues

### Issue: Too Many Alerts
**Problem**: Overwhelmed by vulnerability count
**Solution**: Prioritize by exploitability, filter by severity

### Issue: No Fix Available
**Problem**: Vulnerable dependency has no patch
**Solution**: Consider alternatives, implement compensating controls

### Issue: Breaking Updates
**Problem**: Security fix breaks functionality
**Solution**: Review changelogs, test thoroughly, use lockfiles

## Best Practices

- Scan on every build
- Use lockfiles for reproducibility
- Set severity thresholds
- Generate and track SBOMs
- Document exceptions properly
- Update dependencies regularly
- Monitor for new vulnerabilities
- Automate PR creation for updates

## Related Skills

- sast-scanning (`sast-scanning`) - Code vulnerabilities
- container-scanning (`container-scanning`) - Container dependencies
- github-actions (`github-actions`) - CI integration

## Limitations

- Apply guidance only within authorized scope; test destructive steps in non-production first.
- Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
# Read-only first: inventory before any active step.
which <tool> && <tool> --help | head -n 20
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
