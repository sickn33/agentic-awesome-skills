# Permissions and Secrets

## Overview

GitHub Actions workflows have access to `GITHUB_TOKEN` (automatic) and repository secrets (configured). Overly broad permissions amplify the impact of any vulnerability. Proper permission scoping is the single most effective mitigation for GitHub Actions attacks.

---

## GITHUB_TOKEN Permissions

### Default Permissions

GitHub offers two default permission modes (configured in repo Settings > Actions > General):

| Mode | Default Permissions |
|------|-------------------|
| **Read and write** (legacy default) | `contents: write`, `packages: write`, etc. |
| **Read-only** (recommended) | `contents: read` only |

### Explicit Permission Scoping

```yaml
# VULNERABLE: No explicit permissions — inherits repo default
on: pull_request
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "What permissions does GITHUB_TOKEN have?"

# SAFE: Explicit minimal permissions at workflow level
on: pull_request
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "GITHUB_TOKEN can only read"
```

### Permission Scopes

| Permission | Read | Write | Use Cases |
|------------|------|-------|-----------|
| `contents` | Clone, read files | Push commits, create releases | Most workflows need read |
| `pull-requests` | View PRs | Comment, approve, merge | PR review bots |
| `issues` | View issues | Create, comment, close | Issue management |
| `packages` | Pull packages | Push packages | Package publishing |
| `deployments` | View deployments | Create deployments | CD workflows |
| `id-token` | — | Request OIDC token | Cloud authentication |
| `actions` | View workflow runs | Cancel/rerun workflows | Workflow management |
| `security-events` | View alerts | Upload SARIF, dismiss alerts | Security scanning |
| `statuses` | View statuses | Create commit statuses | CI status reporting |

### Dangerous Permission Patterns

```yaml
# DANGEROUS: write-all grants everything
permissions: write-all

# DANGEROUS: Broad permissions on untrusted trigger
on: pull_request_target
permissions:
  contents: write
  pull-requests: write
  packages: write

# SUSPICIOUS: id-token on workflows that don't deploy
on: pull_request
permissions:
  id-token: write  # Why does a PR build need OIDC?
```

---

## Secret Management

### Secret Exposure Vectors

#### Via Expression Injection

```yaml
# VULNERABLE: Secret value ends up in shell where injection can capture it
env:
  API_KEY: ${{ secrets.API_KEY }}
steps:
  - run: echo "Processing ${{ github.event.pull_request.title }}"
    # Expression injection here can access $API_KEY from environment
```

#### Via Workflow Logs

```yaml
# VULNERABLE: Derived values from secrets may not be masked
- run: |
    ENCODED=$(echo "${{ secrets.API_KEY }}" | base64)
    echo "Encoded key: $ENCODED"  # GitHub only masks the original secret value
```

GitHub Actions automatically masks secret values in logs, but **derived values** (base64-encoded, truncated, transformed) are not reliably masked unless registered.

#### Via Artifacts

```yaml
# VULNERABLE: Secrets written to files that become artifacts
- run: |
    echo "${{ secrets.DEPLOY_KEY }}" > deploy_key.pem
    # If this file ends up in an artifact, the secret is exposed
- uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: .  # Includes deploy_key.pem!
```

#### Via Pull Request Target

```yaml
# VULNERABLE: Fork code can access org secrets
on: pull_request_target
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: ./build.sh  # Fork code can read secrets/credentials actually passed to this job, not all secret names automatically
```

**Important:** Secrets are available to `pull_request_target` workflows. Combined with fork checkout, this exposes secrets actually materialized into the job, action inputs, files or credentials. Untrusted shell code cannot automatically enumerate the entire GitHub secrets store.

---

## Detection Patterns

```bash
# Find workflows without explicit permissions
grep -L "permissions:" .github/workflows/*.yml

# Find workflows with write-all
grep -rn "write-all" .github/workflows/

# Find workflows with broad write permissions
grep -rn "write$" .github/workflows/ | grep -v "#"

# Find secret usage
grep -rn "secrets\." .github/workflows/

# Find secrets in pull_request_target workflows
for f in .github/workflows/*.yml; do
  if grep -q "pull_request_target" "$f" && grep -q "secrets\." "$f"; then
    echo "ALERT: $f uses secrets with pull_request_target"
  fi
done

# Find workflows that write secrets to files
grep -A2 "secrets\." .github/workflows/*.yml | grep -E ">\s|>>|tee "

# Check for environment-level secrets
grep -rn "environment:" .github/workflows/
```

---

## OIDC Subject Claim Misconfiguration

GitHub OIDC tokens include a `sub` (subject) claim that cloud providers use to authorize access. Misconfigured subject claims can allow unauthorized workflows to assume cloud roles.

```yaml
# VULNERABLE: Subject claim too broad — any branch can assume role
# AWS IAM trust policy
{
  "Condition": {
    "StringLike": {
      "token.actions.githubusercontent.com:sub": "repo:org/repo:*"  # Any ref!
    }
  }
}

# SAFE: Restrict to an environment subject; separately protect that environment's allowed branches and reviewers
{
  "Condition": {
    "StringEquals": {
      "token.actions.githubusercontent.com:sub": "repo:org/repo:environment:production"
    }
  }
}
```

### OIDC Best Practices

| Claim Filter | Risk Level | When to Use |
|-------------|------------|-------------|
| `repo:org/repo:*` | **High** | Never — any branch/PR can assume role |
| `repo:org/repo:ref:refs/heads/main` | **Medium** | Only main branch, but any workflow |
| `repo:org/repo:environment:production` | **Low** | Requires environment protection rules |

---

## The Fix: Minimal Permissions Pattern

### Workflow-Level Defaults

```yaml
# Set restrictive defaults at workflow level
permissions:
  contents: read

# Override per-job only when needed
jobs:
  lint:
    runs-on: ubuntu-latest
    # Inherits workflow permissions: contents: read
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write  # Only this job needs OIDC
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
```

### Secret Scoping with Environments

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production  # Secrets only available in this environment
    steps:
      - env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: ./deploy-from-env.sh  # trusted script reads env; keep credentials out of argv/logs
```

Environment protection rules add:
- Required reviewers
- Wait timers
- Branch restrictions
- Deployment protection rules

---

## Severity Guidelines

| Pattern | Severity | Rationale |
|---------|----------|-----------|
| `write-all` on `pull_request_target` | **Critical** | Maximum permissions + fork code execution |
| No `permissions:` block (inherits repo default) | **Medium** | May have write access depending on repo settings |
| `contents: write` on PR-triggered workflow | **High** | Allows pushing commits if combined with other vulns |
| Secrets in `pull_request_target` with fork checkout | **Critical** | All secrets exposed to attacker code |
| OIDC with wildcard subject claim | **High** | Any workflow can assume cloud role |
| Secrets written to files/artifacts | **High** | Persistent exposure beyond workflow run |

---

## References

- [GitHub Docs: Permissions for GITHUB_TOKEN](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [GitHub Docs: Using OIDC for cloud deployments](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [GitHub Blog: Security hardening — Permissions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
