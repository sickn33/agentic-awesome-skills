# SAST Security Plugin - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Capabilities

- **Multi-language SAST**: Python, JavaScript/TypeScript, Java, Ruby, PHP, Go, Rust
- **Tool integration**: Bandit, Semgrep, ESLint Security, SonarQube, CodeQL, PMD, SpotBugs, Brakeman, gosec, cargo-clippy
- **Vulnerability patterns**: SQL injection, XSS, hardcoded secrets, path traversal, IDOR, CSRF, insecure deserialization
- **Framework analysis**: Django, Flask, React, Express, Spring Boot, Rails, Laravel
- **Custom rule authoring**: Semgrep pattern development for organization-specific security policies


## Instructions

1. Identify the languages, frameworks, and scope to scan.
2. Select SAST tools and configure rules for the codebase.
3. Run scans in CI or locally with reproducible settings.
4. Triage findings, prioritize by severity, and propose fixes.


## SAST Tool Selection

### Python: Bandit

```bash
# Installation & scan
pip install bandit
bandit -r . -f json -o bandit-report.json
bandit -r . -lll -iii -f json  # HIGH severity, HIGH confidence (Bandit has no CRITICAL level)
```

**Configuration**: `bandit.yaml` (pass `-c bandit.yaml`; `.bandit` is the INI form)
```yaml
exclude_dirs: ['/tests/', '/venv/', '/.tox/', '/build/']
tests: [B201, B301, B302, B303, B304, B305, B307, B308, B312, B323, B324, B501, B502, B506, B602, B608]
skips: [B101]
```

### JavaScript/TypeScript: ESLint Security

```bash
npm install --save-dev eslint eslint-plugin-security eslint-plugin-no-secrets
eslint . --ext .js,.jsx,.ts,.tsx --format json > eslint-security.json
```

**Configuration**: `eslint.config.mjs` (JavaScript; add the project’s TypeScript parser/config separately).
```javascript
import security from 'eslint-plugin-security';
import noSecrets from 'eslint-plugin-no-secrets';
export default [
  security.configs.recommended,
  { files: ['**/*.{js,mjs,cjs}'], plugins: { 'no-secrets': noSecrets },
    rules: { 'no-secrets/no-secrets': 'error' } }
];
```

### Multi-Language: Semgrep

```bash
pip install semgrep
semgrep scan --config=auto --json --output=semgrep-report.json
semgrep scan --config=p/security-audit --json
semgrep scan --config=p/owasp-top-ten --json
semgrep ci  # authenticated platform CI; confirm upload/privacy policy first
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
if not isinstance(file_name, str) or not file_name:
    raise ValueError('Missing file name')
file_path = os.path.join(ALLOWED_DIR, file_name)
file_path = os.path.realpath(file_path)
if os.path.commonpath([os.path.realpath(ALLOWED_DIR), file_path]) != os.path.realpath(ALLOWED_DIR):
    raise ValueError("Invalid file path")
with open(file_path, 'r') as f:
    content = f.read()
# This resolve-then-open form assumes an immutable trusted directory. For attacker-
# writable trees, use descriptor-relative no-follow traversal to prevent symlink races.
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
import ipaddress
validated_ip = str(ipaddress.ip_address(user_input))
subprocess.run(['ping', '-c', '4', validated_ip], check=True, timeout=10)
# Array arguments avoid shell parsing; input validation separately prevents
# option injection. shlex.quote is shell escaping, not input validation.
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


## Scanner implementation boundary

The earlier all-language wrapper was incomplete (missing Bandit/ESLint methods), swallowed process/parse failures and mapped Semgrep ERROR/WARNING/INFO to unsupported severity weights. Use each tool's documented CLI and native report instead. Record tool version, exact reviewed ruleset, target, exclusions, exit status and parse errors separately from findings. Zero findings with a failed, partial or skipped scan is **not** a pass. Do not invent a 0–100 security score from counts or claim compliance from a static scan. Custom rules above are heuristic examples requiring positive/negative fixtures; a joined path is not automatically safe and a sink match is not confirmed exploitability.

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
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install tools
        run: |
          pip install bandit semgrep
          npm install -g eslint eslint-plugin-security

      - name: Run scans
        run: |
          bandit -r . -f json -o bandit.json
          semgrep scan --config=auto --error --json --output=semgrep.json

      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@v4
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
    - bandit -r . -f json -o bandit.json
    - semgrep scan --config=auto --error --json --output=semgrep.json
  artifacts:
    when: always
    paths: [bandit.json, semgrep.json]
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

Bandit JSON is not GitLab’s SAST report schema; the example stores raw artifacts only. Execute separate scan steps/jobs if both reports are required after one fails. Pin approved tool/ruleset/action versions before production use and scan untrusted source without running its build scripts or privileged hooks. Framework snippets are partial settings, not complete middleware stacks; CORS is not authorization. Referenced security-*.md files are not bundled.

Primary references: [Bandit CLI](https://bandit.readthedocs.io/en/latest/man/bandit.html), [ESLint Security](https://github.com/eslint-community/eslint-plugin-security), [Semgrep CLI](https://docs.semgrep.dev/cli-reference).
