---
name: gitlab-ci
description: Configure GitLab CI/CD pipelines and runners for automated building,
  testing, and deployment.
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

# GitLab CI/CD

Automate your software delivery pipeline with GitLab's integrated CI/CD system.

## When to Use This Skill

Use this skill when:
- Setting up CI/CD pipelines in GitLab
- Configuring GitLab runners (shared or self-hosted)
- Creating multi-stage deployment pipelines
- Implementing GitLab Auto DevOps
- Managing CI/CD variables and secrets

## Prerequisites

- GitLab repository (gitlab.com or self-hosted)
- Basic understanding of YAML
- For self-hosted runners: Linux server or Kubernetes cluster

## Pipeline Configuration

Create `.gitlab-ci.yml` in repository root:

```yaml
stages:
  - build
  - test
  - deploy

variables:
  NODE_VERSION: "20"

build:
  stage: build
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour

test:
  stage: test
  image: node:${NODE_VERSION}
  script:
    - npm ci
    - npm test
  coverage: '/Coverage: \d+\.\d+%/'

deploy:
  stage: deploy
  script:
    - ./deploy.sh
  environment:
    name: production
    url: https://example.com
  only:
    - main
```

## Job Configuration

### Rules-Based Execution

```yaml
deploy:
  script: ./deploy.sh
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
      when: never
    - when: on_success
```

### Parallel Jobs

```yaml
test:
  stage: test
  parallel: 3
  script:
    - npm test -- --shard=$CI_NODE_INDEX/$CI_NODE_TOTAL
```

### Matrix Builds

```yaml
test:
  stage: test
  parallel:
    matrix:
      - NODE_VERSION: ["18", "20", "22"]
        OS: ["alpine", "slim"]
  image: node:${NODE_VERSION}-${OS}
  script:
    - npm test
```

## Caching

```yaml
cache:
  key:
    files:
      - package-lock.json
  paths:
    - node_modules/
  policy: pull-push

build:
  cache:
    key: build-cache
    paths:
      - .cache/
    policy: pull
```

## Artifacts

```yaml
build:
  artifacts:
    paths:
      - dist/
      - coverage/
    reports:
      junit: junit.xml
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura.xml
    expire_in: 1 week
    when: always
```

## Environments and Deployments

```yaml
deploy_staging:
  stage: deploy
  script:
    - deploy --env staging
  environment:
    name: staging
    url: https://staging.example.com
    on_stop: stop_staging

stop_staging:
  stage: deploy
  script:
    - undeploy --env staging
  environment:
    name: staging
    action: stop
  when: manual
```

## Docker Builds

```yaml
build_image:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  variables:
    DOCKER_TLS_CERTDIR: "/certs"
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
```

## GitLab Runners

### Install Runner

```bash
# Download and install
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
sudo apt install gitlab-runner

# Register runner
sudo gitlab-runner register \
  --url https://gitlab.com/ \
  --registration-token TOKEN \
  --executor docker \
  --docker-image alpine:latest
```

### Runner Configuration

```toml
# /etc/gitlab-runner/config.toml
[[runners]]
  name = "docker-runner"
  url = "https://gitlab.com/"
  token = "TOKEN"
  executor = "docker"
  [runners.docker]
    image = "alpine:latest"
    privileged = true
    volumes = ["/cache", "/var/run/docker.sock:/var/run/docker.sock"]
```

### Runner Tags

```yaml
build:
  tags:
    - docker
    - linux
  script:
    - make build
```

## CI/CD Variables

### Protected Variables

Define in Settings > CI/CD > Variables:
- `AWS_ACCESS_KEY_ID` (protected, masked)
- `AWS_SECRET_ACCESS_KEY` (protected, masked)

### Using Variables

```yaml
deploy:
  script:
    - aws s3 sync dist/ s3://$S3_BUCKET
  variables:
    AWS_DEFAULT_REGION: us-east-1
```

## Include and Extend

### Include Templates

```yaml
include:
  - template: Security/SAST.gitlab-ci.yml
  - project: 'group/shared-ci'
    file: '/templates/deploy.yml'
  - local: '/ci/jobs.yml'
```

### Extend Jobs

```yaml
.base_job:
  image: node:20
  before_script:
    - npm ci

build:
  extends: .base_job
  script:
    - npm run build

test:
  extends: .base_job
  script:
    - npm test
```

## Multi-Project Pipelines

```yaml
trigger_downstream:
  stage: deploy
  trigger:
    project: group/downstream-project
    branch: main
    strategy: depend
```

## Common Issues

### Issue: Pipeline Stuck
**Problem**: Jobs stay pending
**Solution**: Check runner availability and tags matching

### Issue: Docker-in-Docker Fails
**Problem**: Cannot connect to Docker daemon
**Solution**: Use `docker:dind` service with proper TLS configuration

### Issue: Cache Not Working
**Problem**: Cache misses between jobs
**Solution**: Verify cache key and ensure runners share distributed cache

## Best Practices

- Use `rules` instead of `only/except` for complex conditions
- Leverage GitLab's built-in security scanning templates
- Use job dependencies to optimize pipeline speed
- Implement review apps for merge requests
- Cache dependencies aggressively
- Use artifacts for passing data between stages

## Related Skills

- github-actions (`github-actions`) - GitHub CI/CD alternative
- argocd-gitops (`argocd-gitops`) - GitOps deployments
- container-registries (`container-registries`) - Registry management

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
