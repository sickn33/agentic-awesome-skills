---
name: circleci
description: Configure CircleCI workflows and orbs for continuous integration and
  deployment.
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

# CircleCI

Build, test, and deploy applications using CircleCI's cloud-native CI/CD platform.

## When to Use This Skill

Use this skill when:
- Setting up CI/CD pipelines with CircleCI
- Using orbs for reusable configuration
- Optimizing build times with caching and parallelism
- Configuring CircleCI workflows and approvals
- Managing CircleCI contexts and secrets

## Prerequisites

- CircleCI account connected to repository
- Project enabled in CircleCI dashboard
- Basic YAML understanding

## Configuration File

Create `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  node: circleci/node@5.2
  docker: circleci/docker@2.4

executors:
  default:
    docker:
      - image: cimg/node:20.10
    working_directory: ~/project

jobs:
  build:
    executor: default
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Build application
          command: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist

  test:
    executor: default
    steps:
      - checkout
      - node/install-packages:
          pkg-manager: npm
      - run:
          name: Run tests
          command: npm test

  deploy:
    executor: default
    steps:
      - checkout
      - attach_workspace:
          at: .
      - run:
          name: Deploy
          command: ./deploy.sh

workflows:
  build-test-deploy:
    jobs:
      - build
      - test:
          requires:
            - build
      - deploy:
          requires:
            - test
          filters:
            branches:
              only: main
```

## Executors

### Docker Executor

```yaml
executors:
  node:
    docker:
      - image: cimg/node:20.10
      - image: cimg/postgres:15.0
        environment:
          POSTGRES_USER: test
          POSTGRES_DB: testdb
    working_directory: ~/app
```

### Machine Executor

```yaml
executors:
  linux-machine:
    machine:
      image: ubuntu-2204:current
    resource_class: large
```

### macOS Executor

```yaml
executors:
  macos:
    macos:
      xcode: "15.0.0"
    resource_class: macos.m1.medium.gen1
```

## Caching

### Dependency Caching

```yaml
jobs:
  build:
    steps:
      - checkout
      - restore_cache:
          keys:
            - v1-deps-{{ checksum "package-lock.json" }}
            - v1-deps-
      - run: npm ci
      - save_cache:
          key: v1-deps-{{ checksum "package-lock.json" }}
          paths:
            - node_modules
```

### Multi-Key Caching

```yaml
- restore_cache:
    keys:
      - v1-{{ .Branch }}-{{ checksum "package-lock.json" }}
      - v1-{{ .Branch }}-
      - v1-main-
      - v1-
```

## Workspaces

### Persist Data

```yaml
jobs:
  build:
    steps:
      - checkout
      - run: npm run build
      - persist_to_workspace:
          root: .
          paths:
            - dist
            - node_modules

  deploy:
    steps:
      - attach_workspace:
          at: ~/project
      - run: ./deploy.sh
```

## Parallelism

### Test Splitting

```yaml
jobs:
  test:
    parallelism: 4
    steps:
      - checkout
      - run:
          name: Run tests
          command: |
            TESTFILES=$(circleci tests glob "test/**/*.test.js" | circleci tests split --split-by=timings)
            npm test -- $TESTFILES
      - store_test_results:
          path: test-results
```

## Workflows

### Sequential Jobs

```yaml
workflows:
  pipeline:
    jobs:
      - build
      - test:
          requires:
            - build
      - deploy:
          requires:
            - test
```

### Parallel Jobs

```yaml
workflows:
  pipeline:
    jobs:
      - build
      - test-unit:
          requires:
            - build
      - test-integration:
          requires:
            - build
      - deploy:
          requires:
            - test-unit
            - test-integration
```

### Manual Approval

```yaml
workflows:
  deploy-prod:
    jobs:
      - build
      - test
      - hold:
          type: approval
          requires:
            - test
      - deploy-production:
          requires:
            - hold
```

### Scheduled Workflows

```yaml
workflows:
  nightly:
    triggers:
      - schedule:
          cron: "0 2 * * *"
          filters:
            branches:
              only:
                - main
    jobs:
      - build
      - test
```

### Branch Filtering

```yaml
workflows:
  build-deploy:
    jobs:
      - build:
          filters:
            branches:
              only:
                - main
                - /feature-.*/
      - deploy:
          filters:
            branches:
              only: main
            tags:
              only: /^v.*/
```

## Orbs

### Using Orbs

```yaml
version: 2.1

orbs:
  aws-cli: circleci/aws-cli@4.1
  kubernetes: circleci/kubernetes@1.3

jobs:
  deploy:
    executor: aws-cli/default
    steps:
      - aws-cli/setup:
          aws_access_key_id: AWS_ACCESS_KEY_ID
          aws_secret_access_key: AWS_SECRET_ACCESS_KEY
      - kubernetes/install-kubectl
      - run: kubectl apply -f k8s/
```

### Common Orbs

```yaml
orbs:
  node: circleci/node@5.2              # Node.js
  docker: circleci/docker@2.4          # Docker builds
  aws-cli: circleci/aws-cli@4.1        # AWS CLI
  aws-ecr: circleci/aws-ecr@9.0        # ECR push
  aws-ecs: circleci/aws-ecs@4.0        # ECS deploy
  gcp-cli: circleci/gcp-cli@3.1        # GCP CLI
  kubernetes: circleci/kubernetes@1.3  # K8s deploy
  slack: circleci/slack@4.12           # Notifications
```

## Docker Builds

```yaml
version: 2.1

orbs:
  docker: circleci/docker@2.4

jobs:
  build-and-push:
    executor: docker/docker
    steps:
      - setup_remote_docker:
          version: 20.10.24
      - checkout
      - docker/check
      - docker/build:
          image: myorg/myapp
          tag: $CIRCLE_SHA1
      - docker/push:
          image: myorg/myapp
          tag: $CIRCLE_SHA1
```

## Environment Variables

### Project Variables

Set in CircleCI Project Settings > Environment Variables

### Contexts

```yaml
workflows:
  deploy:
    jobs:
      - deploy-staging:
          context: staging-secrets
      - deploy-production:
          context: production-secrets
```

### Using Variables

```yaml
jobs:
  deploy:
    steps:
      - run:
          name: Deploy
          command: |
            aws s3 sync dist/ s3://$S3_BUCKET
          environment:
            AWS_DEFAULT_REGION: us-east-1
```

## Artifacts and Test Results

```yaml
jobs:
  test:
    steps:
      - run:
          name: Run tests
          command: npm test -- --coverage
      - store_test_results:
          path: test-results
      - store_artifacts:
          path: coverage
          destination: coverage-report
```

## Resource Classes

```yaml
jobs:
  build:
    docker:
      - image: cimg/node:20.10
    resource_class: large  # 4 vCPU, 8GB RAM
    steps:
      - checkout
      - run: npm run build

# Available classes:
# small: 1 vCPU, 2GB RAM
# medium: 2 vCPU, 4GB RAM (default)
# large: 4 vCPU, 8GB RAM
# xlarge: 8 vCPU, 16GB RAM
```

## Common Issues

### Issue: Cache Not Restoring
**Problem**: Cache misses on every build
**Solution**: Verify cache key format, ensure checksum file hasn't changed

### Issue: Workspace Attach Fails
**Problem**: Cannot find persisted workspace
**Solution**: Ensure persist_to_workspace job completed, check paths

### Issue: Docker Layer Caching
**Problem**: Docker builds are slow
**Solution**: Enable Docker Layer Caching in project settings (paid feature)

## Best Practices

- Use orbs for common tasks
- Implement aggressive caching strategies
- Use workspaces for sharing data between jobs
- Split tests with parallelism for faster builds
- Use contexts for environment-specific secrets
- Define reusable executors
- Store test results for insights

## Related Skills

- github-actions (`github-actions`) - GitHub CI/CD
- docker-management (`docker-management`) - Container builds
- aws-ecs-fargate (`aws-ecs-fargate`) - ECS deployments

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
