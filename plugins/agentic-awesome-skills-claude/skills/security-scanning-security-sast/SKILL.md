---
name: security-scanning-security-sast
description: 'Static Application Security Testing (SAST) for code vulnerability

  analysis across multiple languages and frameworks

  '
risk: unknown
source: community
date_added: '2026-02-27'
---
# SAST Security Plugin

Static Application Security Testing (SAST) for comprehensive code vulnerability detection across multiple languages, frameworks, and security patterns.

## Capabilities

- **Multi-language SAST**: Python, JavaScript/TypeScript, Java, Ruby, PHP, Go, Rust
- **Tool integration**: Bandit, Semgrep, ESLint Security, SonarQube, CodeQL, PMD, SpotBugs, Brakeman, gosec, cargo-clippy
- **Vulnerability patterns**: SQL injection, XSS, hardcoded secrets, path traversal, IDOR, CSRF, insecure deserialization
- **Framework analysis**: Django, Flask, React, Express, Spring Boot, Rails, Laravel
- **Custom rule authoring**: Semgrep pattern development for organization-specific security policies

## Use this skill when

Use for code review security analysis, injection vulnerabilities, hardcoded secrets, framework-specific patterns, custom security policy enforcement, pre-deployment validation, legacy code assessment, and compliance (OWASP, PCI-DSS, SOC2).

**Specialized tools**: Use `security-secrets.md` for advanced credential scanning, `security-owasp.md` for Top 10 mapping, `security-api.md` for REST/GraphQL endpoints.

## Do not use this skill when

- You only need runtime testing or penetration testing
- You cannot access the source code or build outputs
- The environment forbids third-party scanning tools

## Instructions

1. Identify the languages, frameworks, and scope to scan.
2. Select SAST tools and configure rules for the codebase.
3. Run scans in CI or locally with reproducible settings.
4. Triage findings, prioritize by severity, and propose fixes.

## Safety

- Avoid uploading proprietary code to external services without approval.
- Require review before enabling auto-fix or blocking releases.

## SAST Tool Selection

### Python: Bandit

```bash
# Installation & scan
pip install bandit
bandit -r . -f json -o bandit-report.json
bandit -r . -ll -ii -f json  # High/Critical only
```

**Configuration**: `.bandit`
```yaml
exclude_dirs: ['/tests/', '/venv/', '/.tox/', '/build/']
tests: [B201, B301, B302, B303, B304, B305, B307, B308, B312, B323, B324, B501, B502, B506, B602, B608]
skips: [B101]
```

### JavaScript/TypeScript: ESLint Security

```bash
npm install --save-dev eslint @eslint/plugin-security eslint-plugin-no-secrets
eslint . --ext .js,.jsx,.ts,.tsx --format json > eslint-security.json
```

**Configuration**: `.eslintrc-security.json`
```json
{
  "plugins": ["@eslint/plugin-security", "eslint-plugin-no-secrets"],
  "extends": ["plugin:security/recommended"],
  "rules": {
    "security/detect-object-injection": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-eval-with-expression": "error",
    "security/detect-pseudo-random-prng": "error",
    "no-secrets/no-secrets": "error"
  }
}
```

### Multi-Language: Semgrep

```bash
pip install semgrep
semgrep --config=auto --json --output=semgrep-report.json
semgrep --config=p/security-audit --json
semgrep --config=p/owasp-top-ten --json
semgrep ci --config=auto  # CI mode
```

**Custom Rules**: `.semgrep.yml`
```yaml
rules:
  - id: sql-injection-format-string
    pattern: cursor.execute("... %s ..." % $VAR)
    message: SQL injection via string formatting
    severity: ERROR
    languages: [python]
    metadata:
      cwe: "CWE-89"
      owasp: "A03:2021-Injection"

  - id: dangerous-innerHTML
    pattern: $ELEM.innerHTML = $VAR
    message: XSS via innerHTML assignment
    severity: ERROR
    languages: [javascript, typescript]
    metadata:
      cwe: "CWE-79"

  - id: hardcoded-aws-credentials
    patterns:
      - pattern: $KEY = "AKIA..."
      - metavariable-regex:
          metavariable: $KEY
          regex: "(aws_access_key_id|AWS_ACCESS_KEY_ID)"
    message: Hardcoded AWS credentials detected
    severity: ERROR
    languages: [python, javascript, java]

  - id: path-traversal-open
    patterns:
      - pattern: open($PATH, ...)
      - pattern-not: open(os.path.join(SAFE_DIR, ...), ...)
      - metavariable-pattern:
          metavariable: $PATH
          patterns:
            - pattern: $REQ.get(...)
    message: Path traversal via user input
    severity: ERROR
    languages: [python]

  - id: command-injection
    patterns:
      - pattern-either:
          - pattern: os.system($CMD)
          - pattern: subprocess.call($CMD, shell=True)
      - metavariable-pattern:
          metavariable: $CMD
          patterns:
            - pattern-either:
                - pattern: $X + $Y
                - pattern: f"...{$VAR}..."
    message: Command injection via shell=True
    severity: ERROR
    languages: [python]
```

### Other Language Tools

**Java**: `mvn spotbugs:check`
**Ruby**: `brakeman -o report.json -f json`
**Go**: `gosec -fmt=json -out=gosec.json ./...`
**Rust**: `cargo clippy -- -W clippy::unwrap_used`

## Vulnerability Patterns

### SQL Injection

**VULNERABLE**: String formatting/concatenation with user input in SQL queries

**SECURE**:
```python
# Parameterized queries
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
User.objects.filter(id=user_id)  # ORM
```

### Cross-Site Scripting (XSS)

**VULNERABLE**: Direct HTML manipulation with unsanitized user input (innerHTML, outerHTML, document.write)

**SECURE**:
```javascript
// Use textContent for plain text
element.textContent = userInput;

// React auto-escapes
<div>{userInput}</div>

// Sanitize when HTML required
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(userInput);
```

### Hardcoded Secrets

**VULNERABLE**: Hardcoded API keys, passwords, tokens in source code

**SECURE**:
```python
import os
API_KEY = os.environ.get('API_KEY')
PASSWORD = os.getenv('DB_PASSWORD')
```

### Path Traversal

**VULNERABLE**: Opening files using unsanitized user input

**SECURE**:
```python
import os
ALLOWED_DIR = '/var/www/uploads'
file_name = request.args.get('file')
file_path = os.path.join(ALLOWED_DIR, file_name)
file_path = os.path.realpath(file_path)
if not file_path.startswith(os.path.realpath(ALLOWED_DIR)):
    raise ValueError("Invalid file path")
with open(file_path, 'r') as f:
    content = f.read()
```

### Insecure Deserialization

**VULNERABLE**: pickle.loads(), yaml.load() with untrusted data

**SECURE**:
```python
import json
data = json.loads(user_input)  # SECURE
import yaml
config = yaml.safe_load(user_input)  # SECURE
```

### Command Injection

**VULNERABLE**: os.system() or subprocess with shell=True and user input

**SECURE**:
```python
subprocess.run(['ping', '-c', '4', user_input])  # Array args
import shlex
safe_input = shlex.quote(user_input)  # Input validation
```

### Insecure Random

**VULNERABLE**: random module for security-critical operations

**SECURE**:
```python
import secrets
token = secrets.token_hex(16)
session_id = secrets.token_urlsafe(32)
```

## Framework Security

### Django

**VULNERABLE**: @csrf_exempt, DEBUG=True, weak SECRET_KEY, missing security middleware

**SECURE**:
```python
# settings.py
DEBUG = False
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
```

### Flask

**VULNERABLE**: debug=True, weak secret_key, CORS wildcard

**SECURE**:
```python
import os
from flask_talisman import Talisman

app.secret_key = os.environ.get('FLASK_SECRET_KEY')
Talisman(app, force_https=True)
CORS(app, origins=['https://example.com'])
```

### Express.js

**VULNERABLE**: Missing helmet, CORS wildcard, no rate limiting

**SECURE**:
```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(cors({ origin: 'https://example.com' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
```

## Multi-Language Scanner Implementation

```python
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class SASTFinding:
    tool: str
    severity: str
    category: str
    title: str
    description: str
    file_path: str
    line_number: int
    cwe: str
    owasp: str
    confidence: str

class MultiLanguageSASTScanner:
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.findings: List[SASTFinding] = []

    def detect_languages(self) -> List[str]:
        """Auto-detect languages"""
        languages = []
        indicators = {
            'python': ['*.py', 'requirements.txt'],
            'javascript': ['*.js', 'package.json'],
            'typescript': ['*.ts', 'tsconfig.json'],
            'java': ['*.java', 'pom.xml'],
            'ruby': ['*.rb', 'Gemfile'],
            'go': ['*.go', 'go.mod'],
            'rust': ['*.rs', 'Cargo.toml'],
        }
        for lang, patterns in indicators.items():
            for pattern in patterns:
                if list(self.project_path.glob(f'**/{pattern}')):
                    languages.append(lang)
                    break
        return languages

    def run_comprehensive_sast(self) -> Dict[str, Any]:
        """Execute all applicable SAST tools"""
        languages = self.detect_languages()

        scan_results = {
            'timestamp': datetime.now().isoformat(),
            'languages': languages,
            'tools_executed': [],
            'findings': []
        }

        self.run_semgrep_scan()
        scan_results['tools_executed'].append('semgrep')

        if 'python' in languages:
            self.run_bandit_scan()
            scan_results['tools_executed'].append('bandit')
        if 'javascript' in languages or 'typescript' in languages:
            self.run_eslint_security_scan()
            scan_results['tools_executed'].append('eslint-security')

        scan_results['findings'] = [vars(f) for f in self.findings]
        scan_results['summary'] = self.generate_summary()
        return scan_results

    def run_semgrep_scan(self):
        """Run Semgrep"""
        for ruleset in ['auto', 'p/security-audit', 'p/owasp-top-ten']:
            try:
                result = subprocess.run([
                    'semgrep', '--config', ruleset, '--json', '--quiet',
                    str(self.project_path)
                ], capture_output=True, text=True, timeout=300)

                if result.stdout:
                    data = json.loads(result.stdout)
                    for f in data.get('results', []):
                        self.findings.append(SASTFinding(
                            tool='semgrep',
                            severity=f.get('extra', {}).get('severity', 'MEDIUM').upper(),
                            category='sast',
                            title=f.get('check_id', ''),
                            description=f.get('extra', {}).get('message', ''),
                            file_path=f.get('path', ''),
                            line_number=f.get('start', {}).get('line', 0),
                            cwe=f.get('extra', {}).get('metadata', {}).get('cwe', ''),
                            owasp=f.get('extra', {}).get('metadata', {}).get('owasp', ''),
                            confidence=f.get('extra', {}).get('metadata', {}).get('confidence', 'MEDIUM')
                        ))
            except Exception as e:
                print(f"Semgrep {ruleset} failed: {e}")

    def generate_summary(self) -> Dict[str, Any]:
        """Generate statistics"""
        severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
        for f in self.findings:
            severity_counts[f.severity] = severity_counts.get(f.severity, 0) + 1

        return {
            'total_findings': len(self.findings),
            'severity_breakdown': severity_counts,
            'risk_score': self.calculate_risk_score(severity_counts)
        }

    def calculate_risk_score(self, severity_counts: Dict[str, int]) -> int:
        """Risk score 0-100"""
        weights = {'CRITICAL': 10, 'HIGH': 7, 'MEDIUM': 4, 'LOW': 1}
        total = sum(weights[s] * c for s, c in severity_counts.items())
        return min(100, int((total / 50) * 100))
```

## CI/CD Integration

### GitHub Actions

```yaml
name: SAST Scan
on:
  pull_request:
    branches: [main]

jobs:
  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install tools
        run: |
          pip install bandit semgrep
          npm install -g eslint @eslint/plugin-security

      - name: Run scans
        run: |
          bandit -r . -f json -o bandit.json || true
          semgrep --config=auto --json --output=semgrep.json || true

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: sast-reports
          path: |
            bandit.json
            semgrep.json
```

### GitLab CI

```yaml
sast:
  stage: test
  image: python:3.11
  script:
    - pip install bandit semgrep
    - bandit -r . -f json -o bandit.json || true
    - semgrep --config=auto --json --output=semgrep.json || true
  artifacts:
    reports:
      sast: bandit.json
```

## Best Practices

1. **Run early and often** - Pre-commit hooks and CI/CD
2. **Combine multiple tools** - Different tools catch different vulnerabilities
3. **Tune false positives** - Configure exclusions and thresholds
4. **Prioritize findings** - Focus on CRITICAL/HIGH first
5. **Framework-aware scanning** - Use specific rulesets
6. **Custom rules** - Organization-specific patterns
7. **Developer training** - Secure coding practices
8. **Incremental remediation** - Fix gradually
9. **Baseline management** - Track known issues
10. **Regular updates** - Keep tools current

## Related Tools

- **security-secrets.md** - Advanced credential detection
- **security-owasp.md** - OWASP Top 10 assessment
- **security-api.md** - API security testing
- **security-scan.md** - Comprehensive security scanning

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
