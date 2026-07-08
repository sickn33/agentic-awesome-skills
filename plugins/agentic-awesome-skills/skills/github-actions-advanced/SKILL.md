---
name: github-actions-advanced
description: >
  Design, debug, and harden GitHub Actions CI/CD workflows, including reusable
  workflows, matrix builds, self-hosted runners, OIDC authentication, caching,
  environments, secrets, and release automation.
category: devops
risk: safe
source: community
date_added: "2026-05-30"
---

# GitHub Actions Advanced Skill

Expert guidance for designing, writing, debugging, and securing **production-grade** GitHub Actions workflows.

---

## When to Use This Skill

- User mentions GitHub Actions, `.github/workflows`, CI/CD pipelines, runners, jobs, steps, or actions
- User wants to automate builds, tests, deployments, or releases via GitHub
- User asks about matrix builds, reusable workflows, composite actions, or self-hosted runners
- User needs help with OIDC authentication, caching strategies, or secrets management
- User says "my GitHub pipeline is failing" or "set up CI for my repo"
- User asks about workflow security, hardening, or environment protection rules

## When NOT to Use This Skill

- The user is working with GitLab CI/CD → recommend `gitlab-ci-patterns`
- The user is working with CircleCI, Jenkins, or other CI platforms
- The task is purely about Docker image building without GitHub context → recommend `docker-expert`
- The task is about Kubernetes deployment configuration → recommend `kubernetes-architect`

---

## Step 1: Understand Context Before Responding

When invoked, first gather context:

```bash
# Discover existing workflows in the repo
find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | head -20

# Check for composite actions
find .github/actions -name "action.yml" 2>/dev/null

# Detect tech stack (influences runner OS, language setup actions)
ls package.json requirements.txt Gemfile go.mod Cargo.toml pom.xml 2>/dev/null
```

Then adapt recommendations to:
- Existing workflow patterns in the repo
- The tech stack and language runtime
- Whether this is a monorepo or single-project repo
- Whether self-hosted or GitHub-hosted runners are in use

---

## Workflow Structure Reference

```yaml
name: Workflow Name

on:                          # Triggers (see Triggers section)
  push:
    branches: [main]

permissions:                 # Always declare — principle of least privilege
  contents: read

env:                         # Workflow-level env vars
  NODE_VERSION: '20'

concurrency:                 # Prevent duplicate runs
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true   # Cancel older runs for same branch

jobs:
  job-id:
    name: Human-readable name
    runs-on: ubuntu-24.04    # Pin OS version — never use -latest in prod
    timeout-minutes: 15      # Always set — prevents runaway jobs
    environment: production  # Links to GitHub Environment (approvals/secrets)

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - name: Step name
        run: echo "hello"
```

---

## Triggers (`on:`)

### Common Patterns

```yaml
on:
  push:
    branches: [main, 'release/**']
    paths-ignore: ['**.md', 'docs/**']   # Skip docs-only changes

  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]

  workflow_dispatch:                      # Manual trigger with inputs
    inputs:
      environment:
        description: 'Deploy target'
        required: true
        type: choice
        options: [staging, production]
      dry-run:
        description: 'Dry run only?'
        type: boolean
        default: false

  schedule:
    - cron: '0 2 * * 1'                 # Monday 2am UTC

  workflow_call:                          # Called by other workflows (reusable)
    inputs:
      image-tag:
        type: string
        required: true
    secrets:
      deploy-token:
        required: true

  release:
    types: [published]                   # Trigger only on published releases

  pull_request_target:                   # Runs with repo secrets — use with care!
    types: [labeled]                     # Gate with label + author_association check
```

> **Security Warning:** `pull_request_target` runs with repo secrets. Only use after a maintainer labels the PR. Never check out fork code without explicit sandboxing.

---

## Reusable Workflows

Split large pipelines into composable units stored in `.github/workflows/`.

**Convention:** Prefix internal/reusable workflows with `_` (e.g., `_build.yml`).

### Caller (`.github/workflows/deploy.yml`)

```yaml
jobs:
  call-build:
    uses: ./.github/workflows/_build.yml        # Same-repo reusable
    # uses: org/repo/.github/workflows/build.yml@main  # Cross-repo
    with:
      image-tag: ${{ github.sha }}
    secrets: inherit                             # Pass all caller secrets down
  
  call-test:
    uses: ./.github/workflows/_test.yml
    with:
      node-version: '20'
    secrets:
      NPM_TOKEN: ${{ secrets.NPM_TOKEN }}       # Explicit secret passing
```

### Reusable Workflow (`.github/workflows/_build.yml`)

```yaml
on:
  workflow_call:
    inputs:
      image-tag:
        type: string
        required: true
      push:
        type: boolean
        default: false
    secrets:
      registry-token:
        required: false
    outputs:
      digest:
        description: "Image digest"
        value: ${{ jobs.build.outputs.digest }}

jobs:
  build:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    outputs:
      digest: ${{ steps.build.outputs.digest }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - id: build
        uses: docker/build-push-action@4f58ea79222b3b9dc2c8bbdd6debcef730109a75  # v6.9.0
        with:
          push: ${{ inputs.push }}
          tags: myapp:${{ inputs.image-tag }}
```

---

## Matrix Builds

```yaml
jobs:
  test:
    strategy:
      fail-fast: false           # Don't cancel others if one fails
      max-parallel: 4            # Limit concurrent runners
      matrix:
        os: [ubuntu-24.04, windows-2022, macos-14]
        node: ['18', '20', '22']
        exclude:
          - os: windows-2022
            node: '18'
        include:
          - os: ubuntu-24.04
            node: '22'
            experimental: true   # Custom matrix variable

    runs-on: ${{ matrix.os }}
    timeout-minutes: 20

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
        continue-on-error: ${{ matrix.experimental == true }}
```

### Dynamic Matrix via Script

```yaml
jobs:
  generate-matrix:
    runs-on: ubuntu-24.04
    outputs:
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - id: set-matrix
        run: |
          SERVICES=$(find services -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | jq -R -s -c 'split("\n")[:-1]')
          printf 'matrix={"service":%s}\n' "$SERVICES" >> "$GITHUB_OUTPUT"

  build:
    needs: generate-matrix
    strategy:
      matrix: ${{ fromJson(needs.generate-matrix.outputs.matrix) }}
    runs-on: ubuntu-24.04
    steps:
      - env:
          SERVICE: ${{ matrix.service }}
        run: echo "Building $SERVICE"
```

---

## Caching Strategies

### Language Setup Actions (Preferred — No Extra Step Needed)

```yaml
# Node.js
- uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
  with:
    node-version: '20'
    cache: 'npm'           # or 'yarn' or 'pnpm'

# Python
- uses: actions/setup-python@0b93645e9fea7318ecaed2b359559ac225c90a2b  # v5.3.0
  with:
    python-version: '3.12'
    cache: 'pip'

# Go
- uses: actions/setup-go@3041bf56c941b39c61721a86cd11f3bb1338122a  # v5.2.0
  with:
    go-version: '1.23'
    cache: true

# Java / Gradle / Maven
- uses: actions/setup-java@7a6d8a8234af8eb26422e24052f73b12b0e46a27  # v4.6.0
  with:
    distribution: 'temurin'
    java-version: '21'
    cache: 'maven'        # or 'gradle'
```

### Manual Cache (Any Tool)

```yaml
- uses: actions/cache@6849a6489940f00c2f30c0fb92c6274307ccb58a  # v4.1.2
  id: cache-deps
  with:
    path: |
      ~/.cache/pip
      .venv
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-${{ hashFiles('**/requirements*.txt') }}
      ${{ runner.os }}-pip-

- name: Install deps (only on cache miss)
  if: steps.cache-deps.outputs.cache-hit != 'true'
  run: pip install -r requirements.txt
```

### Docker Layer Caching

```yaml
- uses: docker/build-push-action@4f58ea79222b3b9dc2c8bbdd6debcef730109a75  # v6.9.0
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
    # For registry-backed cache (cross-branch):
    # cache-from: type=registry,ref=ghcr.io/myorg/myapp:buildcache
    # cache-to: type=registry,ref=ghcr.io/myorg/myapp:buildcache,mode=max
```

---

## OIDC Authentication (Keyless Cloud Auth)

**Never store long-lived cloud credentials as secrets.** Use OIDC to get short-lived tokens that expire automatically.

### AWS

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: aws-actions/configure-aws-credentials@e3dd6a429d7300a6a4c196c26e071d42e0343502  # v4.0.2
    with:
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
      aws-region: us-east-1
      role-session-name: GitHubActions-${{ github.run_id }}

  # Trust policy on the IAM role must include:
  # "token.actions.githubusercontent.com" as OIDC provider
  # Condition: "repo:org/repo:ref:refs/heads/main" (restrict to branch)
```

### GCP (Workload Identity Federation)

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: google-github-actions/auth@6fc4af4b145ae7821d527454aa9bd537d1f2dc5f  # v2.1.7
    with:
      workload_identity_provider: projects/123456789/locations/global/workloadIdentityPools/github-pool/providers/github-provider
      service_account: github-actions@my-project.iam.gserviceaccount.com
      token_format: access_token   # or 'id_token'
```

### Azure (Federated Identity)

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - uses: azure/login@a65d910e8af852a8061c627c456678983e180302  # v2.2.0
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      # No client secret needed! Uses OIDC federated credentials
```

---

## Environments & Deployment Protection

```yaml
jobs:
  deploy-staging:
    environment:
      name: staging
      url: https://staging.myapp.com
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - run: ./scripts/deploy.sh staging

  deploy-production:
    needs: deploy-staging
    environment:
      name: production
      url: https://myapp.com      # Shown in the GitHub UI deployment panel
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    steps:
      - run: ./scripts/deploy.sh production
```

**Configure in Settings → Environments:**
- **Required reviewers** — manual approval gate before run
- **Wait timer** — delay after approval (e.g., 10-minute buffer)
- **Branch/tag restrictions** — only `main` or `v*` tags can deploy to prod
- **Environment-specific secrets** — override repo-level secrets per environment
- **Deployment branches** — whitelist which branches can target this environment

---

## Secrets Management

```yaml
# Access repo/org/environment secrets
env:
  DB_PASSWORD: ${{ secrets.DB_PASSWORD }}

# Auto-provided token — no setup needed
- uses: actions/github-script@60a0d83039c74a4aee543508d2ffcb1c3799cdea  # v7.0.1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

# Hierarchy (most specific wins):
# environment secret > repo secret > org secret
```

### Masking Dynamic Values

```yaml
- name: Generate and mask dynamic token
  run: |
    TOKEN=$(./scripts/generate-token.sh)
    echo "::add-mask::$TOKEN"          # Mask in all subsequent logs
    echo "DEPLOY_TOKEN=$TOKEN" >> $GITHUB_ENV
```

### Secrets in Composite Actions

```yaml
# Secrets cannot be passed as inputs to composite actions
# Pass them as env vars instead:
- uses: ./.github/actions/my-action
  env:
    SECRET_VALUE: ${{ secrets.MY_SECRET }}
```

---

## Composite Actions

Package reusable step sequences into local actions. No container spin-up, no separate workflow file needed.

### Action Definition (`.github/actions/setup-app/action.yml`)

```yaml
name: Setup App
description: Install and configure application dependencies

inputs:
  node-version:
    description: 'Node.js version'
    required: false
    default: '20'
  install-flags:
    description: 'Additional npm install flags'
    required: false
    default: ''

outputs:
  cache-hit:
    description: 'Whether the dependency cache was hit'
    value: ${{ steps.cache.outputs.cache-hit }}

runs:
  using: composite
  steps:
    - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
      with:
        node-version: ${{ inputs.node-version }}
        cache: npm

    - id: cache
      uses: actions/cache@6849a6489940f00c2f30c0fb92c6274307ccb58a  # v4.1.2
      with:
        path: node_modules
        key: ${{ runner.os }}-node-${{ inputs.node-version }}-${{ hashFiles('package-lock.json') }}

    - name: Install dependencies
      if: steps.cache.outputs.cache-hit != 'true'
      shell: bash
      env:
        INSTALL_FLAGS: ${{ inputs.install-flags }}
      run: |
        args=()
        case "$INSTALL_FLAGS" in
          "") ;;
          "--ignore-scripts") args+=(--ignore-scripts) ;;
          *) echo "Unsupported install flags" >&2; exit 1 ;;
        esac
        npm ci "${args[@]}"

    - name: Build
      shell: bash
      run: npm run build
```

### Usage in a Workflow

```yaml
steps:
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
  - uses: ./.github/actions/setup-app
    with:
      node-version: '22'
      install-flags: '--ignore-scripts'
```

---

## Self-Hosted Runners

```yaml
jobs:
  build-gpu:
    runs-on: [self-hosted, linux, x64, gpu]    # Label matching
    timeout-minutes: 60

  build-arm:
    runs-on: [self-hosted, linux, arm64]
```

### Runner Best Practices

| Practice | Details |
|---|---|
| **Ephemeral runners** | Use Actions Runner Controller (ARC) on Kubernetes for fresh runners per job |
| **Isolation** | Never share prod runners with untrusted/fork PR workflows |
| **Cleanup hooks** | Set `ACTIONS_RUNNER_HOOK_JOB_COMPLETED` to reset environment |
| **Runner groups** | Use groups to restrict which repos/workflows can access which runners |
| **Labels** | Use custom labels (e.g., `gpu`, `high-memory`) for precise targeting |
| **Security** | Disable fork PR access to self-hosted runners in Settings |

```bash
# Actions Runner Controller (Kubernetes) — recommended for ephemeral runners
helm install arc \
  --namespace arc-systems \
  --create-namespace \
  oci://ghcr.io/actions/actions-runner-controller-charts/gha-runner-scale-set-controller
```

---

## Conditional Execution & Flow Control

```yaml
# Condition on branch + event
- run: ./scripts/deploy.sh
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'

# Continue on error (non-blocking steps)
- run: ./scripts/lint.sh
  continue-on-error: true

# Job dependency and conditional execution
jobs:
  test:
    runs-on: ubuntu-24.04
    outputs:
      result: ${{ steps.run-tests.outcome }}

  deploy:
    needs: [test, build]
    if: |
      needs.test.result == 'success' &&
      needs.build.result == 'success' &&
      github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04

  notify-failure:
    needs: [test, deploy]
    if: failure()          # Runs even if earlier jobs fail
    runs-on: ubuntu-24.04
    steps:
      - run: ./scripts/notify-slack.sh "Pipeline failed!"
```

### Passing Data Between Jobs

```yaml
jobs:
  prepare:
    runs-on: ubuntu-24.04
    outputs:
      version: ${{ steps.get-version.outputs.version }}
      should-deploy: ${{ steps.check.outputs.deploy }}

    steps:
      - id: get-version
        run: |
          VERSION=$(tr -d '\r\n' < VERSION)
          case "$VERSION" in
            ""|*[!0-9A-Za-z._-]*) echo "Invalid VERSION" >&2; exit 1 ;;
          esac
          printf 'version=%s\n' "$VERSION" >> "$GITHUB_OUTPUT"

      - id: check
        run: |
          if git log -1 --pretty=%B | grep -q '\[deploy\]'; then
            echo "deploy=true" >> $GITHUB_OUTPUT
          else
            echo "deploy=false" >> $GITHUB_OUTPUT
          fi

  build:
    needs: prepare
    if: needs.prepare.outputs.should-deploy == 'true'
    runs-on: ubuntu-24.04
    steps:
      - env:
          VERSION: ${{ needs.prepare.outputs.version }}
        run: echo "Building version $VERSION"
```

---

## Security Hardening

### 1. Always Declare Permissions (Least Privilege)

```yaml
# Workflow-level default — restrict everything
permissions:
  contents: read

jobs:
  publish:
    # Job-level override — only expand what's needed
    permissions:
      contents: write        # Only for release/publish jobs
      packages: write        # Only for container push jobs
      pull-requests: write   # Only for PR comment jobs
      id-token: write        # Only for OIDC auth jobs
```

### 2. Pin Third-Party Actions to Full Commit SHA

```yaml
# ❌ UNSAFE — tag can be mutated or hijacked
- uses: actions/checkout@v4

# ✅ SAFE — commit SHA is immutable
- uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

# Tool to automate SHA pinning:
# npx pin-github-action .github/workflows/*.yml
# or: pip install ratchet && ratchet pin .github/workflows/
```

### 3. Prevent Script Injection

```yaml
# ❌ UNSAFE — attacker controls PR title, which gets expanded in shell
- run: echo "${{ github.event.pull_request.title }}"

# ✅ SAFE — pass through environment variable (shell doesn't evaluate it)
- env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  run: echo "$PR_TITLE"

# ✅ SAFE — expressions in if: conditions are evaluated by Actions, not shell
- if: github.event.pull_request.draft == false
  run: echo "Not a draft"
```

Never place `${{ ... }}` directly inside `run:` when the value can come from
PR metadata, workflow inputs, repository files, matrix JSON, or earlier job
outputs. Put it in `env:` first, validate allowlisted values where possible, and
reference the shell variable with quotes.

### 4. Restrict `pull_request_target` Usage

```yaml
# Only run when a maintainer adds a specific label — prevents untrusted execution
on:
  pull_request_target:
    types: [labeled]

jobs:
  validate:
    # Double-guard: check label name AND author_association
    if: |
      github.event.label.name == 'safe-to-test' &&
      (github.event.pull_request.author_association == 'COLLABORATOR' ||
       github.event.pull_request.author_association == 'MEMBER' ||
       github.event.pull_request.author_association == 'OWNER')
```

### 5. Harden with StepSecurity

```yaml
# Add to every workflow — hardens runner, monitors outbound traffic
- uses: step-security/harden-runner@4d991eb9995541a0b71d1b66f1f98a5f1bef422c  # v2.11.0
  with:
    egress-policy: audit          # Start with 'audit', move to 'block' after confirming allowlist
    allowed-endpoints: >
      api.github.com:443
      registry.npmjs.org:443
      objects.githubusercontent.com:443
```

---

## Debugging Techniques

```yaml
# Enable runner diagnostic logging via repo secrets:
# ACTIONS_RUNNER_DEBUG = true
# ACTIONS_STEP_DEBUG = true

# Dump full GitHub context for inspection
- name: Debug — dump github context
  if: runner.debug == '1'
  env:
    GITHUB_CONTEXT: ${{ toJson(github) }}
  run: echo "$GITHUB_CONTEXT" | jq '.'

# Dump all available contexts
- name: Debug — dump all contexts
  if: runner.debug == '1'
  run: |
    echo "github: ${{ toJson(github) }}"
    echo "env: ${{ toJson(env) }}"
    echo "vars: ${{ toJson(vars) }}"
    echo "runner: ${{ toJson(runner) }}"

# SSH into a failing runner for interactive debugging
- uses: mxschmitt/action-tmate@7b04f3521e6b0a9fc56fa8f9f50da4bcfb5fc7b5  # v3.19.0
  if: failure() && runner.debug == '1'
  with:
    limit-access-to-actor: true    # Only the workflow triggerer can SSH in
    timeout-minutes: 30

# Check what's pre-installed on GitHub-hosted runners
- run: |
    echo "=== Tool Versions ===" 
    node --version
    python3 --version
    go version
    docker --version
    echo "=== Disk Space ==="
    df -h
    echo "=== Memory ==="
    free -h
```

---

## Complete Pipeline Patterns

### Pattern 1: Build → Test → Push → Deploy

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

permissions:
  contents: read

jobs:
  # ── Build & Test ──────────────────────────────────────
  build-test:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    permissions:
      contents: read
      checks: write        # For test result reporting

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --coverage
      - run: npm run build

      - uses: actions/upload-artifact@b4b15b8c7c6ac21ea08fcf65892d2ee8f75cf882  # v4.4.3
        with:
          name: build-artifacts
          path: dist/
          retention-days: 7

  # ── Push Image (main branch only) ─────────────────────
  push-image:
    needs: build-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    permissions:
      contents: read
      packages: write
      id-token: write      # For OIDC
    outputs:
      image-digest: ${{ steps.push.outputs.digest }}

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - uses: docker/setup-buildx-action@c47758b77c9736f4b2ef4073d4d51994fabfe349  # v3.7.1

      - uses: docker/login-action@9780b0c442fbb1117ed29e0efdff1e18412f7567  # v3.3.0
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/metadata-action@70b2cdc6480c1a8b86edf1777157f8f437de2166  # v5.5.1
        id: meta
        with:
          images: ghcr.io/${{ github.repository }}
          tags: |
            type=sha,format=long
            type=raw,value=latest

      - id: push
        uses: docker/build-push-action@4f58ea79222b3b9dc2c8bbdd6debcef730109a75  # v6.9.0
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          provenance: true    # SLSA provenance attestation
          sbom: true          # Software Bill of Materials

  # ── Deploy Staging ────────────────────────────────────
  deploy-staging:
    needs: push-image
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    environment:
      name: staging
      url: https://staging.myapp.com
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - env:
          IMAGE_DIGEST: ${{ needs.push-image.outputs.image-digest }}
        run: ./scripts/deploy.sh staging "$IMAGE_DIGEST"

  # ── Deploy Production (manual approval required) ──────
  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    environment:
      name: production
      url: https://myapp.com
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - env:
          IMAGE_DIGEST: ${{ needs.push-image.outputs.image-digest }}
        run: ./scripts/deploy.sh production "$IMAGE_DIGEST"
```

### Pattern 2: Automated Release with Changelog

```yaml
name: Release

on:
  push:
    tags: ['v[0-9]+.[0-9]+.[0-9]+']

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-24.04
    timeout-minutes: 15

    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
        with:
          fetch-depth: 0    # Full history needed for changelog generation

      - uses: softprops/action-gh-release@e7a8f85e1c67a31e6ed99a94b41bd0b71bbee6b8  # v2.0.9
        with:
          generate_release_notes: true    # Auto-generates from PR titles and commits
          make_latest: true
          fail_on_unmatched_files: true
          files: |
            dist/**/*.tar.gz
            dist/**/*.zip
```

### Pattern 3: Dependency Auto-Update with PR

```yaml
name: Dependency Updates

on:
  schedule:
    - cron: '0 9 * * 1'    # Every Monday at 9am UTC
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: write

jobs:
  update-deps:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2

      - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af  # v4.1.0
        with:
          node-version: '20'

      - run: npx npm-check-updates -u
      - run: npm install

      - uses: peter-evans/create-pull-request@5e914681df9dc83aa4e4905692ca88beb2f9e91f  # v7.0.5
        with:
          commit-message: 'chore: update npm dependencies'
          title: 'chore: update npm dependencies'
          branch: 'chore/npm-updates'
          delete-branch: true
          body: |
            Automated dependency updates generated by the dependency update workflow.
            Please review and test before merging.
```

### Pattern 4: Security Scanning Pipeline

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'    # Daily at 6am UTC

permissions:
  contents: read
  security-events: write    # For uploading SARIF results

jobs:
  codeql:
    runs-on: ubuntu-24.04
    timeout-minutes: 30
    permissions:
      security-events: write
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - uses: github/codeql-action/init@4f3212b61783c3c68e8309a0f18a699764811cda  # v3.27.1
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/autobuild@4f3212b61783c3c68e8309a0f18a699764811cda  # v3.27.1
      - uses: github/codeql-action/analyze@4f3212b61783c3c68e8309a0f18a699764811cda  # v3.27.1

  container-scan:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - uses: aquasecurity/trivy-action@6e7b7d1fd3e4fef0c5fa8cce1229c54b2c9bd0d8  # v0.28.0
        with:
          scan-type: 'fs'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      - uses: github/codeql-action/upload-sarif@4f3212b61783c3c68e8309a0f18a699764811cda  # v3.27.1
        with:
          sarif_file: 'trivy-results.sarif'
```

---

## Common Pitfalls & Fixes

| Problem | Cause | Fix |
|---|---|---|
| Workflow doesn't trigger on PR from fork | Fork PRs use restricted `GITHUB_TOKEN` | Use `pull_request` not `pull_request_target`; avoid repo secrets in fork context |
| Secret is `***` in logs but exposed | Dynamic value not masked | Use `echo "::add-mask::$VALUE"` before using it |
| Cache never hits across branches | Cache key too specific | Add `restore-keys` fallback without branch or hash segment |
| Matrix job fails silently | `fail-fast: true` (default) cancels siblings | Set `fail-fast: false` during debugging |
| Job hangs indefinitely | No `timeout-minutes` set | Always set `timeout-minutes` on every job |
| `$GITHUB_OUTPUT` not set | Old `set-output` command used | Use `echo "key=value" >> $GITHUB_OUTPUT` |
| OIDC token request fails | Missing `id-token: write` permission | Add to job-level `permissions` block |
| Reusable workflow can't access caller secrets | No `secrets: inherit` | Add `secrets: inherit` or explicitly pass secrets |

---

## GitHub Actions Expressions Reference

```yaml
# Context objects available in expressions
${{ github.sha }}                           # Commit SHA
${{ github.ref }}                           # Branch/tag ref
${{ github.ref_name }}                      # Short branch/tag name
${{ github.event_name }}                    # Event name (push, pull_request, etc.)
${{ github.actor }}                         # Username who triggered the run
${{ github.repository }}                    # org/repo
${{ github.run_id }}                        # Unique run ID
${{ runner.os }}                            # Linux, Windows, macOS

# Built-in functions
${{ toJson(github) }}                       # Serialize context to JSON
${{ fromJson(needs.job.outputs.matrix) }}   # Parse JSON string
${{ hashFiles('**/package-lock.json') }}    # Hash file(s) for cache keys
${{ format('{0}/{1}', var1, var2) }}        # String formatting
${{ join(matrix.items, ',') }}              # Join array

# Status functions (use in if: conditions)
${{ success() }}    # All previous steps succeeded
${{ failure() }}    # Any previous step failed
${{ cancelled() }}  # Workflow was cancelled
${{ always() }}     # Always runs (success OR failure OR cancelled)
```

---

## Production Readiness Checklist

Before merging any workflow to `main`, verify:

### Security
- [ ] All third-party actions pinned to full commit SHA
- [ ] `permissions:` declared at workflow and job level (least privilege)
- [ ] No `${{ }}` expressions directly in `run:` blocks (use env vars)
- [ ] OIDC used for cloud credentials (no long-lived secrets stored)
- [ ] `pull_request_target` gated with label check + author_association guard
- [ ] Secrets never echoed or logged

### Reliability
- [ ] `timeout-minutes` set on every job
- [ ] `fail-fast: false` set for matrix builds used for debugging
- [ ] `concurrency` configured to cancel stale runs
- [ ] Retry logic for flaky external calls
- [ ] Artifact retention policy set appropriately

### Performance
- [ ] Dependency caching configured (setup-* cache or actions/cache)
- [ ] Docker layer caching enabled (`type=gha`)
- [ ] Path filters on `push`/`pull_request` to skip unrelated changes
- [ ] Matrix parallelism appropriate (not exhausting runner pool)

### Maintainability
- [ ] Reusable workflows used for repeated patterns
- [ ] Composite actions used for repeated step sequences
- [ ] Workflow names and step names are human-readable
- [ ] `_` prefix on internal/reusable workflow files
- [ ] Environment protection rules configured for `production`

---

## Related Skills

- `gha-security-review` — Deep security audit of existing workflow files
- `github-actions-templates` — Copy-paste ready workflow templates
- `docker-expert` — Container build optimization and Dockerfile best practices
- `kubernetes-architect` — Deploying to Kubernetes from GitHub Actions
- `gitlab-ci-patterns` — GitLab CI/CD equivalent patterns

## Limitations

- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Always test reusable workflows in a feature branch before merging to main.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
