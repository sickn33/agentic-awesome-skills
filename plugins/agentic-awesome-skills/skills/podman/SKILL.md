---
name: podman
description: Manage containers using Podman, the daemonless container engine.
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

# Podman

Run and manage containers without a daemon using Podman's rootless container engine.

## When to Use This Skill

Use this skill when:
- Running containers without root privileges
- Managing containers on systems without Docker
- Creating pod-based container groups
- Using systemd for container management
- Working in security-conscious environments

## Prerequisites

- Podman installed (4.x+)
- For rootless: user namespaces enabled
- Basic container concepts understanding

## Key Differences from Docker

| Feature | Docker | Podman |
|---------|--------|--------|
| Architecture | Client-daemon | Daemonless |
| Root required | Default | Optional (rootless) |
| Pod support | No | Yes (Kubernetes-style) |
| Systemd integration | Limited | Native |
| Socket | docker.sock | podman.sock (optional) |

## Basic Commands

### Container Operations

```bash
# Run container (identical to Docker)
podman run -d --name webserver -p 8080:80 nginx

# List containers
podman ps -a

# Stop and remove
podman stop webserver
podman rm webserver

# Execute command
podman exec -it webserver /bin/sh

# View logs
podman logs -f webserver
```

### Image Management

```bash
# Pull image
podman pull docker.io/library/nginx:latest

# List images
podman images

# Build image
podman build -t myapp:latest .

# Push to registry
podman push myapp:latest registry.example.com/myapp:latest

# Remove image
podman rmi nginx:latest
```

## Rootless Containers

### Setup

```bash
# Check user namespace support
cat /proc/sys/user/max_user_namespaces

# Enable if needed (as root)
echo "user.max_user_namespaces=28633" | sudo tee /etc/sysctl.d/userns.conf
sudo sysctl -p /etc/sysctl.d/userns.conf

# Configure subuid/subgid for user
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Verify
podman unshare cat /proc/self/uid_map
```

### Running Rootless

```bash
# Run as regular user (no sudo)
podman run -d --name myapp -p 8080:80 nginx

# Check user namespace mapping
podman unshare id

# Verify non-root
podman top myapp user
```

### Port Considerations

```bash
# Rootless cannot bind to ports < 1024 by default
# Use ports >= 1024
podman run -d -p 8080:80 nginx

# Or enable unprivileged ports (as root)
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/ports.conf
sudo sysctl -p /etc/sysctl.d/ports.conf
```

## Pods

### Creating Pods

```bash
# Create pod
podman pod create --name mypod -p 8080:80 -p 5432:5432

# Add containers to pod
podman run -d --pod mypod --name web nginx
podman run -d --pod mypod --name db postgres:15

# List pods
podman pod ps

# Containers share network namespace
podman exec web curl localhost:5432
```

### Pod Management

```bash
# Start/stop pod (affects all containers)
podman pod start mypod
podman pod stop mypod

# Remove pod and containers
podman pod rm -f mypod

# View pod details
podman pod inspect mypod

# Generate Kubernetes YAML from pod
podman generate kube mypod > mypod.yaml
```

## Systemd Integration

### Generate Systemd Unit

```bash
# Generate unit file for container
podman generate systemd --new --name myapp > ~/.config/systemd/user/container-myapp.service

# For pod
podman generate systemd --new --name mypod --files

# Reload systemd
systemctl --user daemon-reload

# Enable and start
systemctl --user enable --now container-myapp.service
```

### Quadlet (Podman 4.4+)

```ini
# ~/.config/containers/systemd/webapp.container
[Container]
Image=docker.io/library/nginx:latest
PublishPort=8080:80
Volume=webapp-data:/usr/share/nginx/html

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload to generate service
systemctl --user daemon-reload

# Start the service
systemctl --user start webapp
```

## Compose Compatibility

### Using Podman Compose

```bash
# Install podman-compose
pip install podman-compose

# Run compose file
podman-compose up -d

# Or use Docker Compose with Podman socket
systemctl --user enable --now podman.socket
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock
docker-compose up -d
```

### Native Podman Kube

```bash
# Play Kubernetes YAML
podman kube play deployment.yaml

# Stop and remove
podman kube down deployment.yaml
```

## Networking

### Network Management

```bash
# Create network
podman network create mynetwork

# Run on network
podman run -d --network mynetwork --name app myapp

# Connect container to network
podman network connect mynetwork existing-container

# List networks
podman network ls

# Inspect network
podman network inspect mynetwork
```

### DNS Resolution

```bash
# Containers on same network can resolve by name
podman run -d --network mynetwork --name db postgres:15
podman run -d --network mynetwork --name app \
  -e DATABASE_HOST=db myapp
```

## Storage

### Volume Management

```bash
# Create volume
podman volume create mydata

# Use volume
podman run -d -v mydata:/data myapp

# List volumes
podman volume ls

# Inspect volume
podman volume inspect mydata

# Rootless volumes location
ls ~/.local/share/containers/storage/volumes/
```

### Bind Mounts

```bash
# Bind mount with SELinux label
podman run -v ./data:/app/data:Z myapp

# Z = private label (single container)
# z = shared label (multiple containers)
```

## Registry Configuration

### Configure Registries

```bash
# Edit registries.conf
# ~/.config/containers/registries.conf
```

```toml
unqualified-search-registries = ["docker.io", "quay.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.gcr.io"
```

### Authentication

```bash
# Login to registry
podman login docker.io

# Login to private registry
podman login registry.example.com

# Credentials stored in
# ~/.config/containers/auth.json
```

## Building Images

### Buildah Integration

```bash
# Podman uses Buildah for builds
podman build -t myapp:latest .

# Build with specific format
podman build --format docker -t myapp .

# Multi-stage build
podman build --target production -t myapp:prod .
```

### Buildah Commands

```bash
# Create container from scratch
buildah from scratch
buildah copy working-container ./app /app
buildah config --entrypoint '["/app/main"]' working-container
buildah commit working-container myapp:minimal
```

## Common Issues

### Issue: Permission Denied
**Problem**: Cannot access files in mounted volumes
**Solution**: Use `:Z` or `:z` suffix for SELinux, or check ownership

### Issue: Cannot Connect to Container
**Problem**: Port not accessible in rootless mode
**Solution**: Use ports >= 1024 or configure unprivileged port start

### Issue: Slow Image Pulls
**Problem**: Images download slowly
**Solution**: Configure registry mirrors in registries.conf

### Issue: Systemd Service Fails
**Problem**: Container doesn't start via systemd
**Solution**: Enable lingering: `loginctl enable-linger $USER`

## Best Practices

- Use rootless mode for enhanced security
- Leverage pods for related containers
- Generate systemd units for production
- Use Quadlet for declarative container services
- Configure SELinux labels for bind mounts
- Enable user lingering for persistent services
- Use podman auto-update for automatic updates
- Alias `docker` to `podman` for compatibility

## Related Skills

- docker-management (`docker-management`) - Docker fundamentals
- kubernetes-ops (`kubernetes-ops`) - K8s orchestration
- container-hardening (`container-hardening`) - Security

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
