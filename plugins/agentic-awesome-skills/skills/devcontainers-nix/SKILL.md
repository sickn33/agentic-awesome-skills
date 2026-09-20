---
name: devcontainers-nix
description: Create reproducible development environments with Dev Containers, Nix
  flakes, and Devbox for consistent toolchains across teams.
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

# Dev Containers & Nix Environments

Reproducible, portable development environments that eliminate environment drift.

## When to Use This Skill

Use this skill when:
- Onboarding new developers (zero-to-productive in minutes)
- Standardizing toolchains across a team
- Eliminating "works on my machine" problems
- Setting up CI environments that match local dev
- Creating ephemeral, disposable dev environments

## Dev Containers

### Basic Configuration

```json
// .devcontainer/devcontainer.json
{
  "name": "My Project",
  "image": "mcr.microsoft.com/devcontainers/base:ubuntu-22.04",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {}
  },
  "forwardPorts": [3000, 5432],
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "ms-python.python"
      ],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  }
}
```

### Docker Compose Dev Container

```json
// .devcontainer/devcontainer.json
{
  "name": "Full Stack Dev",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "forwardPorts": [3000, 5432, 6379],
  "postCreateCommand": "npm install && npx prisma migrate dev"
}
```

```yaml
# .devcontainer/docker-compose.yml
services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
    command: sleep infinity
    depends_on: [db, redis]

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pgdata:
```

### Custom Dockerfile

```dockerfile
# .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/base:ubuntu-22.04

# System dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    jq \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install project-specific tools
RUN curl -fsSL https://get.opentofu.org/install-opentofu.sh -o /tmp/install-opentofu.sh \
    && sh /tmp/install-opentofu.sh -s -- --install-method standalone \
    && rm /tmp/install-opentofu.sh
RUN curl -LO "https://dl.k8s.io/release/$(curl -sL https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && install kubectl /usr/local/bin/

# Non-root user setup
USER vscode
WORKDIR /workspace
```

## Nix Flakes

### Basic Flake

```nix
# flake.nix
{
  description = "Project development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            # Languages
            nodejs_20
            python312
            go_1_22
            rustc
            cargo

            # Tools
            docker-compose
            kubectl
            kubernetes-helm
            opentofu
            awscli2
            jq
            yq-go

            # Databases
            postgresql_16
            redis
          ];

          shellHook = ''
            echo "Dev environment loaded"
            export PROJECT_ROOT=$(pwd)
            export PATH="$PROJECT_ROOT/node_modules/.bin:$PATH"
          '';
        };
      }
    );
}
```

```bash
# Enter the dev shell
nix develop

# Or run a single command
nix develop --command bash -c "node --version && go version"

# Build and run
nix build
nix run
```

### Pin Dependencies

```bash
# Lock flake inputs for reproducibility
nix flake lock
nix flake update  # Update all inputs

# Update a specific input
nix flake lock --update-input nixpkgs
```

## Devbox (Nix Made Simple)

Devbox wraps Nix with a friendlier interface:

```bash
# Install Devbox
curl -fsSL https://get.jetify.com/devbox -o /tmp/install-devbox.sh && sh /tmp/install-devbox.sh && rm /tmp/install-devbox.sh

# Initialize project
devbox init

# Add packages
devbox add nodejs@20 python@3.12 postgresql@16
devbox add go@1.22 kubectl helm

# Enter shell
devbox shell

# Run commands without entering shell
devbox run node --version
```

### devbox.json Configuration

```json
{
  "$schema": "https://raw.githubusercontent.com/jetify-com/devbox/main/.schema/devbox.schema.json",
  "packages": [
    "nodejs@20",
    "python@3.12",
    "go@1.22",
    "kubectl@1.29",
    "kubernetes-helm@3.14",
    "opentofu@1.8",
    "awscli2@2.15",
    "jq@1.7",
    "postgresql@16",
    "redis@7"
  ],
  "env": {
    "PROJECT_ROOT": "$PWD",
    "DATABASE_URL": "postgresql://localhost:5432/dev"
  },
  "shell": {
    "init_hook": [
      "echo 'Dev environment ready'",
      "npm install --silent 2>/dev/null || true"
    ],
    "scripts": {
      "dev": "npm run dev",
      "test": "npm test",
      "db:start": "pg_ctl -D .devbox/virtenv/postgresql/data start",
      "db:stop": "pg_ctl -D .devbox/virtenv/postgresql/data stop",
      "db:migrate": "npx prisma migrate dev"
    }
  }
}
```

```bash
# Run project scripts
devbox run dev
devbox run test
devbox run db:start

# Generate direnv integration (auto-activate on cd)
devbox generate direnv

# Generate Dockerfile from devbox config
devbox generate dockerfile
```

### Devbox + direnv (Auto-Activate)

```bash
# Install direnv
devbox add direnv

# Generate .envrc
devbox generate direnv

# Allow direnv
direnv allow
```

```bash
# .envrc (auto-generated)
eval "$(devbox generate direnv --print-envrc)"
```

Now `cd`-ing into the project automatically loads the environment.

## CI/CD Integration

### GitHub Actions with Devbox

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jetify-com/devbox-install-action@v0.11.0
        with:
          enable-cache: true
      - run: devbox run test
      - run: devbox run lint
```

### GitHub Actions with Nix

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v26
        with:
          nix_path: nixpkgs=channel:nixos-unstable
      - uses: cachix/cachix-action@v14
        with:
          name: my-project
          authToken: '${{ secrets.CACHIX_AUTH_TOKEN }}'
      - run: nix develop --command bash -c "npm ci && npm test"
```

### GitHub Codespaces

```json
// .devcontainer/devcontainer.json — works in Codespaces
{
  "name": "Codespaces Dev",
  "image": "mcr.microsoft.com/devcontainers/universal:2",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" }
  },
  "postCreateCommand": "npm install",
  "portsAttributes": {
    "3000": { "label": "App", "onAutoForward": "openBrowser" },
    "5432": { "label": "Postgres", "onAutoForward": "ignore" }
  }
}
```

## Comparison

| Feature | Dev Containers | Nix Flakes | Devbox |
|---------|---------------|------------|--------|
| Learning curve | Low | High | Low |
| Reproducibility | Good (Docker) | Excellent | Excellent (Nix) |
| Speed | Slow (build image) | Fast (cached) | Fast (cached) |
| IDE support | VS Code, JetBrains | Any terminal | Any terminal |
| CI integration | Docker-based | Nix actions | Devbox action |
| Offline support | Limited | Full | Full |
| macOS/Linux/Win | All | macOS/Linux | macOS/Linux |

## Best Practices

- Pin all tool versions explicitly — never use `latest`
- Commit lock files (`flake.lock`, `devbox.lock`, etc.)
- Use direnv for automatic environment activation
- Cache Nix store in CI (Cachix or GitHub cache)
- Document setup in README: `devbox shell` or `nix develop`
- Keep dev environment close to production (same Node/Python versions)

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Nix build slow first time | Use binary cache (Cachix), `nix develop` caches after first run |
| Dev Container won't build | Check Docker disk space, rebuild with `--no-cache` |
| Package not in Nixpkgs | Search at search.nixos.org, or use `fetchFromGitHub` overlay |
| Devbox hash mismatch | Run `devbox update`, delete `.devbox/` and re-init |
| direnv not activating | Run `direnv allow`, check shell hook is installed |

## Related Skills

- docker-management (`docker-management`) — Container image optimization
- github-actions (`github-actions`) — CI/CD pipeline setup
- linux-administration (`linux-administration`) — System-level tooling

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
