---
name: sast-scanning
description: Perform static application security testing with tools like Semgrep,
  CodeQL, and SonarQube.
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

# SAST Scanning

Identify security vulnerabilities in source code through static analysis.

## When to Use This Skill

Use this skill when:
- Implementing secure SDLC practices
- Adding security gates to CI/CD
- Automating code security reviews
- Finding vulnerabilities before deployment
- Meeting compliance requirements

## Prerequisites

- Source code access
- CI/CD pipeline
- SAST tool installation

## Tool Comparison

| Tool | License | Languages | Best For |
|------|---------|-----------|----------|
| Semgrep | OSS/Commercial | 30+ | Custom rules, speed |
| CodeQL | Free (GitHub) | 10+ | Deep analysis |
| SonarQube | OSS/Commercial | 25+ | Quality + Security |
| Bandit | OSS | Python | Python projects |
| Brakeman | OSS | Ruby | Rails apps |

## Semgrep

### Installation

```bash
# Install via pip
pip install semgrep

# Or via Homebrew
brew install semgrep
```

### Basic Usage

```bash
# Run with default rules
semgrep --config auto .

# Run specific rulesets
semgrep --config p/security-audit .
semgrep --config p/owasp-top-ten .
semgrep --config p/ci .

# Scan specific languages
semgrep --config p/python .
semgrep --config p/javascript .

# Output formats
semgrep --config auto --json -o results.json .
semgrep --config auto --sarif -o results.sarif .
```

### Custom Rules

```yaml
# .semgrep/custom-rules.yaml
rules:
  - id: hardcoded-password
    patterns:
      - pattern-either:
          - pattern: password = "..."
          - pattern: PASSWORD = "..."
          - pattern: passwd = "..."
    message: Hardcoded password detected
    severity: ERROR
    languages: [python, javascript, java]
    metadata:
      cwe: "CWE-798"
      owasp: "A3:2017"

  - id: sql-injection
    patterns:
      - pattern: |
          $QUERY = "..." + $USER_INPUT + "..."
          $DB.execute($QUERY)
    message: Potential SQL injection
    severity: ERROR
    languages: [python]
    metadata:
      cwe: "CWE-89"

  - id: insecure-random
    pattern: random.random()
    message: Use secrets module for security-sensitive randomness
    severity: WARNING
    languages: [python]
    fix: secrets.token_hex()
```

### CI Configuration

```yaml
# .github/workflows/semgrep.yml
name: Semgrep

on:
  push:
    branches: [main]
  pull_request:

jobs:
  semgrep:
    runs-on: ubuntu-latest
    container:
      image: returntocorp/semgrep
    steps:
      - uses: actions/checkout@v4

      - name: Run Semgrep
        run: semgrep ci
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
```

## CodeQL

### Setup

```yaml
# .github/workflows/codeql.yml
name: CodeQL Analysis

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read

    strategy:
      matrix:
        language: ['javascript', 'python']

    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
          queries: +security-and-quality

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
```

### Custom Queries

```ql
// queries/sql-injection.ql
/**
 * @name SQL Injection
 * @description User input in SQL query
 * @kind path-problem
 * @problem.severity error
 * @security-severity 9.0
 * @precision high
 * @id py/sql-injection
 * @tags security
 */

import python
import semmle.python.dataflow.new.DataFlow
import semmle.python.dataflow.new.TaintTracking
import semmle.python.security.dataflow.SqlInjectionQuery

from SqlInjectionConfiguration config, DataFlow::PathNode source, DataFlow::PathNode sink
where config.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "SQL injection from $@.", source.getNode(), "user input"
```

## SonarQube

### Docker Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  sonarqube:
    image: sonarqube:lts-community
    ports:
      - "9000:9000"
    environment:
      - SONAR_JDBC_URL=jdbc:postgresql://db:5432/sonar
      - SONAR_JDBC_USERNAME=sonar
      - SONAR_JDBC_PASSWORD=sonar
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_logs:/opt/sonarqube/logs
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=sonar
      - POSTGRES_PASSWORD=sonar
      - POSTGRES_DB=sonar
    volumes:
      - postgresql_data:/var/lib/postgresql/data

volumes:
  sonarqube_data:
  sonarqube_logs:
  postgresql_data:
```

### Scanner Configuration

```properties
# sonar-project.properties
sonar.projectKey=myproject
sonar.projectName=My Project
sonar.projectVersion=1.0

sonar.sources=src
sonar.tests=tests
sonar.exclusions=**/node_modules/**,**/vendor/**

sonar.language=py
sonar.python.coverage.reportPaths=coverage.xml

sonar.qualitygate.wait=true
```

### CI Integration

```yaml
# GitHub Actions
- name: SonarQube Scan
  uses: sonarsource/sonarqube-scan-action@master
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
    SONAR_HOST_URL: ${{ secrets.SONAR_HOST_URL }}

- name: Quality Gate
  uses: sonarsource/sonarqube-quality-gate-action@master
  timeout-minutes: 5
  env:
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

## Language-Specific Tools

### Python (Bandit)

```bash
# Install
pip install bandit

# Run scan
bandit -r src/ -f json -o bandit-report.json

# With configuration
bandit -r src/ -c bandit.yaml
```

```yaml
# bandit.yaml
skips: ['B101', 'B601']
exclude_dirs: ['tests', 'venv']

assert_used:
  skips: ['*_test.py', '*_tests.py']
```

### JavaScript (ESLint Security)

```bash
# Install
npm install eslint eslint-plugin-security --save-dev
```

```javascript
// .eslintrc.js
module.exports = {
  plugins: ['security'],
  extends: ['plugin:security/recommended'],
  rules: {
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'warn',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-possible-timing-attacks': 'warn'
  }
};
```

### Ruby (Brakeman)

```bash
# Install
gem install brakeman

# Run scan
brakeman -o brakeman-report.json -f json

# CI configuration
brakeman --no-exit-on-warn --no-exit-on-error -o report.html
```

## Quality Gates

### SonarQube Quality Gate

```json
{
  "name": "Security Gate",
  "conditions": [
    {
      "metric": "new_security_rating",
      "op": "GT",
      "error": "1"
    },
    {
      "metric": "new_vulnerabilities",
      "op": "GT",
      "error": "0"
    },
    {
      "metric": "new_security_hotspots_reviewed",
      "op": "LT",
      "error": "100"
    }
  ]
}
```

### Custom Gate Script

```bash
#!/bin/bash
# security-gate.sh

CRITICAL=$(cat results.json | jq '[.results[] | select(.severity == "critical")] | length')
HIGH=$(cat results.json | jq '[.results[] | select(.severity == "high")] | length')

echo "Critical: $CRITICAL, High: $HIGH"

if [ "$CRITICAL" -gt 0 ]; then
  echo "FAILED: Critical vulnerabilities found"
  exit 1
fi

if [ "$HIGH" -gt 5 ]; then
  echo "FAILED: Too many high severity vulnerabilities"
  exit 1
fi

echo "PASSED: Security gate"
exit 0
```

## Common Issues

### Issue: Too Many False Positives
**Problem**: Alerts on safe code patterns
**Solution**: Tune rules, add suppressions, use baseline

### Issue: Slow Scans
**Problem**: SAST taking too long in CI
**Solution**: Incremental scanning, parallel execution, exclude test files

### Issue: Missing Coverage
**Problem**: Vulnerabilities not detected
**Solution**: Add custom rules, combine multiple tools

## Best Practices

- Run on every PR/commit
- Establish baseline for existing code
- Prioritize by severity and exploitability
- Maintain custom rules for your codebase
- Integrate with IDE for early feedback
- Track trends over time
- Document false positive suppressions
- Combine with DAST for comprehensive coverage

## Related Skills

- dast-scanning (`dast-scanning`) - Dynamic testing
- dependency-scanning (`dependency-scanning`) - Dependency vulnerabilities
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
