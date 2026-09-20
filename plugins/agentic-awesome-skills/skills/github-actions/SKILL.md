---
name: github-actions
description: Build, test, and deploy applications using GitHub Actions workflows.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# GitHub Actions

Automate software workflows directly in your GitHub repository with GitHub Actions.

## When to Use This Skill

Use this skill when:
- Setting up CI/CD pipelines for GitHub repositories
- Automating build, test, and deployment workflows
- Creating reusable workflow components
- Configuring self-hosted runners
- Managing workflow secrets and variables
- Debugging failed workflow runs

## Prerequisites

- GitHub repository with write access
- Understanding of YAML syntax
- For self-hosted runners: server with Docker (optional)

## Workflow File Structure

Workflows are defined in `.github/workflows/` directory:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

## Common Triggers

### Push and Pull Request

```yaml
on:
  push:
    branches: [main]
    paths:
      - 'src/**'
      - 'package.json'
  pull_request:
    branches: [main]
```

### Scheduled Runs

```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

### Manual Dispatch

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deployment environment'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production
```

## Job Configuration

### Matrix Builds

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, windows-latest]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

### Job Dependencies

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run build
      
  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: npm test
      
  deploy:
    needs: [build, test]
    runs-on: ubuntu-latest
    steps:
      - run: ./deploy.sh
```

### Environment Protection

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://example.com
    steps:
      - run: ./deploy.sh
```

## Secrets and Variables

### Using Secrets

```yaml
steps:
  - name: Deploy
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    run: aws s3 sync ./dist s3://my-bucket
```

### Using Variables

```yaml
steps:
  - name: Build
    env:
      API_URL: ${{ vars.API_URL }}
    run: npm run build
```

## Caching Dependencies

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

## Artifacts

### Upload Artifacts

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: dist/
    retention-days: 5
```

### Download Artifacts

```yaml
- uses: actions/download-artifact@v4
  with:
    name: build-output
    path: dist/
```

## Docker Builds

```yaml
jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: user/app:latest
```

## Reusable Workflows

### Define Reusable Workflow

```yaml
# .github/workflows/reusable-deploy.yml
name: Reusable Deploy

on:
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
    secrets:
      deploy_key:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: ${{ inputs.environment }}
    steps:
      - run: echo "Deploying to ${{ inputs.environment }}"
```

### Call Reusable Workflow

```yaml
jobs:
  deploy-staging:
    uses: ./.github/workflows/reusable-deploy.yml
    with:
      environment: staging
    secrets:
      deploy_key: ${{ secrets.STAGING_KEY }}
```

## Self-Hosted Runners

### Register Runner

```bash
# Download runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf actions-runner-linux-x64.tar.gz

# Configure
./config.sh --url https://github.com/OWNER/REPO --token TOKEN

# Run
./run.sh
```

### Use Self-Hosted Runner

```yaml
jobs:
  build:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
```

## Debugging Workflows

### Enable Debug Logging

Set repository secrets:
- `ACTIONS_RUNNER_DEBUG`: `true`
- `ACTIONS_STEP_DEBUG`: `true`

### Debug Step

```yaml
- name: Debug
  run: |
    echo "GitHub context: ${{ toJson(github) }}"
    echo "Job context: ${{ toJson(job) }}"
```

## Common Issues

### Issue: Workflow Not Triggering
**Problem**: Workflow doesn't run on push/PR
**Solution**: Check branch filters, path filters, and ensure workflow file is on the default branch

### Issue: Permission Denied
**Problem**: Actions can't push or create PRs
**Solution**: Configure `permissions` in workflow or update repository settings

```yaml
permissions:
  contents: write
  pull-requests: write
```

### Issue: Cache Not Restoring
**Problem**: Cache misses despite existing cache
**Solution**: Verify cache key matches exactly, check runner OS

## Best Practices

- Pin action versions to specific commits or tags
- Use caching for dependencies to speed up builds
- Minimize secrets exposure with environment scoping
- Use matrix builds for cross-platform testing
- Implement proper error handling with `continue-on-error`
- Keep workflows DRY with reusable workflows and composite actions

## Related Skills

- gitlab-ci (`gitlab-ci`) - GitLab CI/CD alternative
- docker-management (`docker-management`) - Container builds
- semantic-versioning (`semantic-versioning`) - Automated releases

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
