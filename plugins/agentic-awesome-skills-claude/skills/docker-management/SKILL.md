---
name: docker-management
description: Build, optimize, and troubleshoot Docker containers and images.
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

# Docker Management

Build, run, and manage Docker containers for application deployment and development.

## When to Use This Skill

Use this skill when:
- Creating and optimizing Dockerfiles
- Building and tagging Docker images
- Running and managing containers
- Debugging container issues
- Configuring Docker networking and volumes
- Implementing container security best practices

## Prerequisites

- Docker Engine installed (20.10+)
- Basic command line knowledge
- Understanding of application deployment

## Dockerfile Best Practices

### Multi-Stage Build

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Layer Optimization

```dockerfile
FROM python:3.12-slim

# Install dependencies first (cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (changes frequently)
COPY . .

CMD ["python", "app.py"]
```

### Security Hardening

```dockerfile
FROM node:20-alpine

# Create non-root user
RUN addgroup -g 1001 appgroup && \
    adduser -u 1001 -G appgroup -D appuser

WORKDIR /app

# Copy with proper ownership
COPY --chown=appuser:appgroup . .

# Drop privileges
USER appuser

# Use exec form for proper signal handling
CMD ["node", "server.js"]
```

## Building Images

### Basic Build

```bash
# Build with tag
docker build -t myapp:1.0 .

# Build with build args
docker build --build-arg NODE_ENV=production -t myapp:prod .

# Build for specific platform
docker build --platform linux/amd64 -t myapp:amd64 .

# Build with no cache
docker build --no-cache -t myapp:fresh .
```

### Multi-Platform Builds

```bash
# Create builder
docker buildx create --name multiplatform --use

# Build for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myregistry/myapp:latest \
  --push .
```

## Running Containers

### Basic Operations

```bash
# Run container
docker run -d --name myapp -p 8080:3000 myapp:latest

# Run with environment variables
docker run -d \
  -e DATABASE_URL=postgres://localhost/db \
  -e NODE_ENV=production \
  myapp:latest

# Run with resource limits
docker run -d \
  --memory="512m" \
  --cpus="1.0" \
  myapp:latest

# Run with restart policy
docker run -d --restart=unless-stopped myapp:latest
```

### Volume Management

```bash
# Named volume
docker volume create mydata
docker run -v mydata:/app/data myapp:latest

# Bind mount
docker run -v $(pwd)/config:/app/config:ro myapp:latest

# tmpfs mount (memory)
docker run --tmpfs /tmp:rw,noexec,nosuid myapp:latest
```

### Networking

```bash
# Create network
docker network create mynetwork

# Run on network
docker run -d --network mynetwork --name api myapp:latest

# Connect existing container
docker network connect mynetwork existing-container

# Expose specific ports
docker run -d -p 127.0.0.1:8080:3000 myapp:latest
```

## Container Lifecycle

### Management Commands

```bash
# List containers
docker ps -a

# Stop container
docker stop myapp

# Remove container
docker rm myapp

# Force remove running container
docker rm -f myapp

# Prune stopped containers
docker container prune -f
```

### Logs and Monitoring

```bash
# View logs
docker logs myapp

# Follow logs
docker logs -f --tail 100 myapp

# View resource usage
docker stats myapp

# Inspect container
docker inspect myapp
```

## Debugging Containers

### Interactive Access

```bash
# Execute command in running container
docker exec -it myapp /bin/sh

# Run container with shell
docker run -it --rm myapp:latest /bin/sh

# Debug failed container
docker run -it --entrypoint /bin/sh myapp:latest
```

### Troubleshooting

```bash
# Check container logs for errors
docker logs myapp 2>&1 | grep -i error

# Inspect container state
docker inspect --format='{{.State.Status}}' myapp

# Check container processes
docker top myapp

# View container filesystem changes
docker diff myapp

# Export container filesystem
docker export myapp > myapp-fs.tar
```

### Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

```bash
# Check health status
docker inspect --format='{{.State.Health.Status}}' myapp
```

## Image Management

### Tagging and Pushing

```bash
# Tag image
docker tag myapp:latest myregistry.com/myapp:v1.0

# Push to registry
docker push myregistry.com/myapp:v1.0

# Pull image
docker pull myregistry.com/myapp:v1.0
```

### Cleanup

```bash
# Remove unused images
docker image prune -a

# Remove all unused resources
docker system prune -a --volumes

# Remove specific image
docker rmi myapp:old

# List image sizes
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
```

### Image Analysis

```bash
# View image history
docker history myapp:latest

# Inspect image layers
docker inspect myapp:latest

# Check image vulnerabilities (with Docker Scout)
docker scout cves myapp:latest
```

## Docker Compose Integration

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - app-data:/app/data
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  app-data:
  db-data:
```

## Security Best Practices

### Image Security

```dockerfile
# Use specific version tags
FROM node:20.10-alpine3.18

# Don't run as root
USER nobody

# Remove unnecessary packages
RUN apk del --purge build-dependencies

# Use COPY instead of ADD
COPY . .
```

### Runtime Security

```bash
# Run with security options
docker run -d \
  --security-opt=no-new-privileges \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --read-only \
  myapp:latest

# Use user namespace remapping
# Add to /etc/docker/daemon.json: {"userns-remap": "default"}
```

## Common Issues

### Issue: Container Exits Immediately
**Problem**: Container starts and stops instantly
**Solution**: Check if CMD/ENTRYPOINT runs foreground process, use `docker logs` to see errors

### Issue: Cannot Connect to Container
**Problem**: Port not accessible
**Solution**: Verify port mapping (-p), check container is running, verify firewall rules

### Issue: Out of Disk Space
**Problem**: Docker using too much disk
**Solution**: Run `docker system prune -a --volumes`, check for large unused images

### Issue: Build Cache Not Working
**Problem**: Every build downloads dependencies
**Solution**: Order Dockerfile instructions from least to most frequently changing

## Best Practices

- Use multi-stage builds to minimize image size
- Never store secrets in images - use runtime injection
- Pin base image versions for reproducibility
- Implement health checks for production containers
- Use .dockerignore to exclude unnecessary files
- Run containers as non-root users
- Scan images for vulnerabilities regularly
- Use Docker BuildKit for faster builds

## Related Skills

- docker-compose (`docker-compose`) - Multi-container applications
- container-scanning (`container-scanning`) - Security scanning
- container-hardening (`container-hardening`) - Security hardening

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
