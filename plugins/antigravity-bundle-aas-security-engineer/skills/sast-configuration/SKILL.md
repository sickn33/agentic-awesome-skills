---
name: sast-configuration
description: "Static Application Security Testing (SAST) tool setup, configuration, and custom rule creation for comprehensive security scanning across multiple programming languages."
risk: unknown
source: community
date_added: "2026-02-27"
---

# SAST Configuration

Static Application Security Testing (SAST) tool setup, configuration, and custom rule creation for comprehensive security scanning across multiple programming languages.

## Use this skill when

- Set up SAST scanning in CI/CD pipelines
- Create custom security rules for your codebase
- Configure quality gates and compliance policies
- Optimize scan performance and reduce false positives
- Integrate multiple SAST tools for defense-in-depth

## Do not use this skill when

- You only need DAST or manual penetration testing guidance
- You cannot access source code or CI/CD pipelines
- You need organizational policy decisions rather than tooling setup

## Instructions

1. Identify languages, repos, and compliance requirements.
2. Choose tools and define a baseline policy.
3. Integrate scans into CI/CD with gating thresholds.
4. Tune rules and suppressions based on false positives.
5. Track remediation and verify fixes.

## Safety

- Avoid scanning sensitive repos with third-party services without approval.
- Prevent leaks of secrets in scan artifacts and logs.

## Overview

This skill provides comprehensive guidance for setting up and configuring SAST tools including Semgrep, SonarQube, and CodeQL.

## Core Capabilities

### 1. Semgrep Configuration
- Custom rule creation with pattern matching
- Language-specific security rules (Python, JavaScript, Go, Java, etc.)
- CI/CD integration (GitHub Actions, GitLab CI, Jenkins)
- False positive tuning and rule optimization
- Organizational policy enforcement

### 2. SonarQube Setup
- Quality gate configuration
- Security hotspot analysis
- Code coverage and technical debt tracking
- Custom quality profiles for languages
- Enterprise integration with LDAP/SAML

### 3. CodeQL Analysis
- GitHub Advanced Security integration
- Custom query development
- Vulnerability variant analysis
- Security research workflows
- SARIF result processing

## Quick Start

### Initial Assessment
1. Identify primary programming languages in your codebase
2. Determine compliance requirements (PCI-DSS, SOC 2, etc.)
3. Choose SAST tool based on language support and integration needs
4. Review baseline scan to understand current security posture

### Basic Setup
```bash
# Semgrep quick start
pip install semgrep
semgrep --config=auto --error

# SonarQube with Docker
docker run -d --name sonarqube -p 9000:9000 sonarqube:latest

# CodeQL CLI setup
gh extension install github/gh-codeql
codeql database create mydb --language=python
```

## Reference Documentation

- Semgrep Rule Creation - Pattern-based security rule development
- SonarQube Configuration - Quality gates and profiles
- CodeQL Setup Guide - Query development and workflows

## Templates & Assets

- semgrep-config.yml - Production-ready Semgrep configuration
- sonarqube-settings.xml - SonarQube quality profile template
- run-sast.sh - Automated SAST execution script

## Integration Patterns

### CI/CD Pipeline Integration
```yaml
# GitHub Actions example
- name: Run Semgrep
  uses: returntocorp/semgrep-action@v1
  with:
    config: >-
      p/security-audit
      p/owasp-top-ten
```

### Pre-commit Hook
```bash
# .pre-commit-config.yaml
- repo: https://github.com/returntocorp/semgrep
  rev: v1.45.0
  hooks:
    - id: semgrep
      args: ['--config=auto', '--error']
```

## Best Practices

1. **Start with Baseline**
   - Run initial scan to establish security baseline
   - Prioritize critical and high severity findings
   - Create remediation roadmap

2. **Incremental Adoption**
   - Begin with security-focused rules
   - Gradually add code quality rules
   - Implement blocking only for critical issues

3. **False Positive Management**
   - Document legitimate suppressions
   - Create allow lists for known safe patterns
   - Regularly review suppressed findings

4. **Performance Optimization**
   - Exclude test files and generated code
   - Use incremental scanning for large codebases
   - Cache scan results in CI/CD

5. **Team Enablement**
   - Provide security training for developers
   - Create internal documentation for common patterns
   - Establish security champions program

## Common Use Cases

### New Project Setup
```bash
./scripts/run-sast.sh --setup --language python --tools semgrep,sonarqube
```

### Custom Rule Development
```yaml
# See references/semgrep-rules.md for detailed examples
rules:
  - id: hardcoded-jwt-secret
    pattern: jwt.encode($DATA, "...", ...)
    message: JWT secret should not be hardcoded
    severity: ERROR
```

### Compliance Scanning
```bash
# PCI-DSS focused scan
semgrep --config p/pci-dss --json -o pci-scan-results.json
```

## Troubleshooting

### High False Positive Rate
- Review and tune rule sensitivity
- Add path filters to exclude test files
- Use nostmt metadata for noisy patterns
- Create organization-specific rule exceptions

### Performance Issues
- Enable incremental scanning
- Parallelize scans across modules
- Optimize rule patterns for efficiency
- Cache dependencies and scan results

### Integration Failures
- Verify API tokens and credentials
- Check network connectivity and proxy settings
- Review SARIF output format compatibility
- Validate CI/CD runner permissions

## Related Skills

- OWASP Top 10 Checklist
- Container Security
- Dependency Scanning

## Tool Comparison

| Tool | Best For | Language Support | Cost | Integration |
|------|----------|------------------|------|-------------|
| Semgrep | Custom rules, fast scans | 30+ languages | Free/Enterprise | Excellent |
| SonarQube | Code quality + security | 25+ languages | Free/Commercial | Good |
| CodeQL | Deep analysis, research | 10+ languages | Free (OSS) | GitHub native |

## Next Steps

1. Complete initial SAST tool setup
2. Run baseline security scan
3. Create custom rules for organization-specific patterns
4. Integrate into CI/CD pipeline
5. Establish security gate policies
6. Train development team on findings and remediation

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
