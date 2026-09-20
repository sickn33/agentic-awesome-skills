---
name: docker-compose
description: Define and run multi-container Docker applications using Docker Compose.
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

# Docker Compose

Orchestrate multi-container applications with declarative YAML configuration.

## When to Use This Skill

Use this skill when:
- Running multi-container applications locally
- Setting up development environments
- Defining service dependencies and networking
- Managing application stacks with multiple services
- Creating reproducible development setups

## Prerequisites

- Docker Engine with Compose plugin (v2)
- Basic Docker knowledge
- YAML syntax understanding

## Basic Configuration

### Simple Application Stack

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:secret@db:5432/myapp
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres-data:
```

## Service Configuration

### Build Options

```yaml
services:
  app:
    build:
      context: ./app
      dockerfile: Dockerfile.dev
      args:
        NODE_VERSION: "20"
      target: development
      cache_from:
        - myapp:cache
    image: myapp:dev
```

### Environment Variables

```yaml
services:
  app:
    environment:
      - NODE_ENV=production
      - API_KEY=${API_KEY}  # From shell or .env file
    env_file:
      - .env
      - .env.local
```

### Port Mapping

```yaml
services:
  web:
    ports:
      - "3000:3000"           # HOST:CONTAINER
      - "127.0.0.1:9229:9229" # Bind to localhost only
      - "8080-8090:8080-8090" # Port range
    expose:
      - "3000"                # Internal only (no host binding)
```

### Volume Mounts

```yaml
services:
  app:
    volumes:
      # Named volume
      - app-data:/app/data
      # Bind mount
      - ./src:/app/src
      # Read-only bind mount
      - ./config:/app/config:ro
      # Anonymous volume (for node_modules)
      - /app/node_modules

volumes:
  app-data:
    driver: local
```

### Dependencies

```yaml
services:
  web:
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started

  db:
    image: postgres:15
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

## Networking

### Custom Networks

```yaml
services:
  frontend:
    networks:
      - frontend-net

  backend:
    networks:
      - frontend-net
      - backend-net

  db:
    networks:
      - backend-net

networks:
  frontend-net:
    driver: bridge
  backend-net:
    driver: bridge
    internal: true  # No external access
```

### Network Aliases

```yaml
services:
  db:
    networks:
      backend:
        aliases:
          - database
          - postgres

networks:
  backend:
```

## Resource Limits

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M
```

## Multiple Compose Files

### Override Files

```yaml
# docker-compose.yml (base)
services:
  web:
    image: myapp:latest
    ports:
      - "3000:3000"

# docker-compose.override.yml (development - auto-loaded)
services:
  web:
    build: .
    volumes:
      - ./src:/app/src
    environment:
      - DEBUG=true

# docker-compose.prod.yml (production)
services:
  web:
    deploy:
      replicas: 3
    environment:
      - DEBUG=false
```

### Using Multiple Files

```bash
# Development (uses override automatically)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up

# Merge and view final config
docker compose -f docker-compose.yml -f docker-compose.prod.yml config
```

## Profiles

```yaml
services:
  web:
    image: myapp

  db:
    image: postgres:15

  debug:
    image: busybox
    profiles:
      - debug

  monitoring:
    image: prometheus
    profiles:
      - monitoring
```

```bash
# Run without profiles (web, db only)
docker compose up

# Run with debug profile
docker compose --profile debug up

# Run with multiple profiles
docker compose --profile debug --profile monitoring up
```

## Commands

### Lifecycle

```bash
# Start services
docker compose up -d

# Start specific service
docker compose up -d web

# Stop services
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove everything including volumes
docker compose down -v --rmi all

# Restart services
docker compose restart web
```

### Building

```bash
# Build images
docker compose build

# Build without cache
docker compose build --no-cache

# Build and start
docker compose up --build

# Pull latest images
docker compose pull
```

### Monitoring

```bash
# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f web

# View running services
docker compose ps

# View resource usage
docker compose top
```

### Execution

```bash
# Run command in new container
docker compose run --rm web npm test

# Execute in running container
docker compose exec web /bin/sh

# Scale service
docker compose up -d --scale worker=3
```

## Development Workflow

### Watch Mode (Compose v2.22+)

```yaml
services:
  web:
    build: .
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: ./package.json
```

```bash
docker compose watch
```

### Hot Reload Setup

```yaml
services:
  web:
    build:
      context: .
      target: development
    volumes:
      - ./src:/app/src
      - /app/node_modules
    environment:
      - CHOKIDAR_USEPOLLING=true
    command: npm run dev
```

## Common Patterns

### Database Initialization

```yaml
services:
  db:
    image: postgres:15
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d:ro
    environment:
      POSTGRES_DB: myapp
```

### Reverse Proxy

```yaml
services:
  proxy:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/etc/traefik/traefik.yml:ro

  web:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.web.rule=Host(`app.localhost`)"
```

## Common Issues

### Issue: Container Cannot Resolve Service Name
**Problem**: Service can't connect to another service by name
**Solution**: Ensure services are on the same network, check depends_on

### Issue: Volume Permissions
**Problem**: Container can't write to mounted volume
**Solution**: Match container user UID with host, or use named volumes

### Issue: Port Already in Use
**Problem**: Error binding to port
**Solution**: Change host port or stop conflicting service

### Issue: Changes Not Reflected
**Problem**: Code changes don't appear in container
**Solution**: Check volume mounts, rebuild if Dockerfile changed

## Best Practices

- Use named volumes for persistent data
- Define healthchecks for database dependencies
- Use profiles to separate optional services
- Keep secrets in .env files (not committed)
- Use override files for environment-specific config
- Pin image versions for reproducibility
- Use networks to isolate service groups
- Leverage watch mode for development

## Related Skills

- docker-management (`docker-management`) - Docker fundamentals
- kubernetes-ops (`kubernetes-ops`) - Production orchestration
- reverse-proxy (`reverse-proxy`) - Production routing

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
