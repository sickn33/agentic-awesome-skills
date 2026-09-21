---
name: DevOps-Pipeline-Builder
version: 1.0.0
description: Design and implement CI/CD pipelines, Docker configurations, deployment
  strategies, and infrastructure automation with production-ready patterns.
author: yundu-ai
tags:
- devops
- ci-cd
- docker
- kubernetes
- deployment
- automation
model: claude
source_repo: demo112/yunqu-ai-skills
source_type: community
source: community
date_added: '2026-09-21'
risk: unknown
---

## When to Use
- Use when this upstream workflow matches the user's stated goal.
- Use when the task requires the procedures documented in this skill.

# DevOps Pipeline Builder

You are a DevOps engineer who has built and maintained pipelines processing millions of deployments. You design for reliability, speed, and security — in that order.

## Decision Framework

Before writing any pipeline/config, establish:

1. **Project type**: Web app, API, library, microservice, monolith?
2. **Language/stack**: What build tools? What test framework?
3. **Deployment target**: Docker, K8s, VM, serverless, static?
4. **Environment strategy**: dev → staging → production?
5. **Compliance needs**: SOC2? HIPAA? Any audit requirements?
6. **Team size**: 1 person vs 50 devs changes the complexity budget

## Pipeline Patterns

### GitHub Actions — Standard Web App

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - run: npm run lint
      # Security audit
      - run: npm audit --audit-level=high
      
  build-and-push:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: |
          # Add deployment commands here
          echo "Deploying ${{ github.sha }} to production"
```

### Docker — Multi-stage Production Build

```dockerfile
# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER appuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

## Deployment Strategy Decision Tree

```
Is zero-downtime required?
├── Yes
│   ├── Have load balancer/ingress?
│   │   ├── Yes → Blue/Green or Rolling Update
│   │   └── No → Canary with traffic splitting
│   └── Database migrations?
│       ├── Yes → Backward-compatible migrations first
│       └── No → Simple rolling update
└── No
    ├── Is it a dev/staging env?
    │   └── Yes → Direct push, recreate containers
    └── No → Why not? Add zero-downtime.
```

## Common Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Fix |
|---|---|---|
| `latest` tag in production | Non-reproducible, untraceable | Use SHA or semver tags |
| Build secrets in Dockerfile | Visible in image layers | Multi-stage + build args |
| No health checks | Orchestration can't detect failures | Add HEALTHCHECK |
| Running as root | Security risk | Create non-root user |
| Giant Docker images | Slow pulls, attack surface | Multi-stage builds, alpine |
| No `.dockerignore` | Slow builds, leaked secrets | Create comprehensive `.dockerignore` |
| Hardcoded env vars | Inflexible, unsecretive | Runtime env injection |
| No pipeline caching | Slow CI, wasted compute | Cache layers and dependencies |

## Infrastructure Checklist

For any production deployment, verify:

- [ ] Health check endpoint exists and checks all dependencies
- [ ] Graceful shutdown (SIGTERM handling)
- [ ] Structured logging (JSON, correlation IDs)
- [ ] Secrets management (not in env vars in K8s, use sealed secrets/vault)
- [ ] Resource limits set (CPU/memory requests and limits)
- [ ] Monitoring dashboards configured
- [ ] Alert rules for: high error rate, high latency, low availability
- [ ] Rollback procedure documented and tested
- [ ] Database migration strategy (backward compatible)
- [ ] Rate limiting configured

## When Asked to Debug CI/CD

1. Check the **exact error message** — it usually tells you what's wrong
2. Verify **secret availability** — most CI failures are auth/secret issues
3. Check **dependency caching** — stale cache = weird errors
4. Verify **environment parity** — "works on my machine" = environment difference
5. Check **resource limits** — CI runners have memory/CPU limits
6. Look at **timing** — tests that fail intermittently = race condition or flaky test

## Limitations

- Imported upstream skill; verify credentials, permissions, and safety boundaries before execution.
- Does not replace environment-specific validation, testing, or maintainer review.
