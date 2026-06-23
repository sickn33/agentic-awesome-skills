# Environment Detection Guide

This document defines **environment.json** — the environment contract between ecl-harness-engineer and harness-executor — and explains how to detect, collect, and generate environment information for a project.

> **Key Insight**: Environment is not just configuration — it's the complete runtime ecosystem including databases, services, secrets, and the **executable scripts** to bring it all up.

---

## 1. environment.json Overview

### 1.1 Purpose

| File | Purpose | Consumer |
|------|---------|----------|
| `environment.json` | "What the environment is" — full ecosystem description | `preflight.py`, `verifier subagent`, setup scripts |

`ecl-harness-engineer` creates `environment.json` only. Runtime verification plans such as
`verify.json` are generated later by harness-executor or another runtime from `environment.json`
plus the active task context.

### 1.2 Location

```
harness/
├── config/
│   └── environment.json      # Environment ecosystem contract
└── scripts/
    ├── setup-env.sh          # Start dependencies (DB, Redis, etc.)
    ├── start-server.sh       # Start the application
    ├── teardown-env.sh       # Stop and cleanup
    └── seed-data.sh          # Seed test data
```

### 1.3 When to Generate

| Mode | Trigger |
|------|---------|
| **Greenfield** | Always generate (scaffold includes environment.json) |
| **Create** | Always generate (detected from code analysis) |
| **Improve** | Generate if missing; audit and update if exists |

---

## 2. environment.json Schema

```json
{
  "version": "1.0",
  "project_name": "my-project",
  "generated_at": "2026-03-27T10:00:00Z",
  "generated_by": "ecl-harness-engineer",

  "runtime": {
    "language": "go | typescript | python | java",
    "version": "1.22+ | 20+ | 3.11+ | 21+",
    "package_manager": "npm | pnpm | yarn | pip | poetry | maven | gradle",
    "build_command": "go build ./... | npm run build | ...",
    "dev_command": "go run cmd/server/main.go | npm run dev | ..."
  },

  "databases": [
    {
      "name": "primary_db",
      "type": "postgres | mysql | mongodb | redis | sqlite",
      "purpose": "Main application data store",
      "required": true,
      "connection": {
        "host_env": "DB_HOST",
        "port_env": "DB_PORT",
        "default_port": 5432,
        "user_env": "DB_USER",
        "password_env": "DB_PASSWORD",
        "database_env": "DB_NAME",
        "url_env": "DATABASE_URL"
      },
      "setup": {
        "docker_image": "postgres:16",
        "docker_compose_service": "postgres",
        "migration_command": "go run cmd/migrate/main.go up",
        "seed_command": "go run cmd/seed/main.go"
      },
      "test_alternatives": {
        "sqlite_in_memory": "DB_DRIVER=sqlite3 DB_URL=:memory:",
        "docker": "docker run -d --name test-pg -p 127.0.0.1:5433:5432 -e POSTGRES_PASSWORD=test postgres:16"
      }
    }
  ],

  "services": [
    {
      "name": "redis_cache",
      "type": "redis | http | grpc | kafka | rabbitmq | s3",
      "purpose": "Session storage and caching",
      "required": false,
      "connection": {
        "url_env": "REDIS_URL",
        "default_url": "redis://localhost:6379"
      },
      "setup": {
        "docker_image": "redis:7",
        "docker_compose_service": "redis"
      },
      "fallback": "In-memory cache used when Redis unavailable"
    },
    {
      "name": "auth_service",
      "type": "http",
      "purpose": "External authentication provider",
      "required": true,
      "connection": {
        "url_env": "AUTH_SERVICE_URL",
        "health_endpoint": "/health"
      },
      "test_alternatives": {
        "mock": "AUTH_SERVICE_URL=http://localhost:9999 (use mock server in test/mock/auth.go)"
      }
    }
  ],

  "secrets": [
    {
      "name": "JWT_SECRET",
      "purpose": "Signs JWT tokens for authentication",
      "required": true,
      "test_value_ok": true,
      "test_value": "test-jwt-secret-not-for-production"
    },
    {
      "name": "STRIPE_SECRET_KEY",
      "purpose": "Payment processing",
      "required": false,
      "test_value_ok": false,
      "skip_when_missing": "Payment features disabled in test mode"
    }
  ],

  "ports": [
    {
      "name": "http_server",
      "env": "PORT",
      "default": 8080,
      "test_port": 8081,
      "purpose": "Main HTTP server"
    }
  ],

  "files": {
    "required": [
      { "path": ".env", "template": ".env.example", "purpose": "Local env config" }
    ],
    "generated": [
      { "path": "internal/generated/schema.go", "command": "go generate ./...", "purpose": "Generated code" }
    ]
  },

  "functional_scenarios": [
    {
      "name": "user_registration_flow",
      "description": "Register a new user, verify data stored, login with credentials",
      "requires": ["primary_db", "JWT_SECRET"],
      "category": "auth",
      "steps_hint": [
        "POST /api/v1/register with valid user data -> 201",
        "GET /api/v1/users/{id} -> 200 with matching data",
        "POST /api/v1/login with same credentials -> 200 with JWT token",
        "GET /api/v1/profile with JWT token -> 200 with user info"
      ],
      "priority": "high"
    }
  ],

  "test_environment": {
    "env_vars": {
      "ENV": "test",
      "LOG_LEVEL": "error",
      "PORT": "8081",
      "DB_DRIVER": "sqlite3",
      "DB_URL": ":memory:",
      "JWT_SECRET": "test-jwt-secret-not-for-production"
    },
    "setup_commands": ["go mod download", "go generate ./..."],
    "teardown_commands": []
  },

  "scripts": {
    "setup_env": "harness/scripts/setup-env.sh",
    "start_server": "harness/scripts/start-server.sh",
    "teardown_env": "harness/scripts/teardown-env.sh",
    "seed_data": "harness/scripts/seed-data.sh"
  }
}
```

---

## 3. Environment Scripts Generation

Beyond the JSON configuration, ecl-harness-engineer must generate **executable scripts** that actually bring up the environment.

### 3.1 Script Templates

#### `harness/scripts/setup-env.sh`

Sets up all dependencies (databases, external services) using Docker or local services.

```bash
#!/bin/bash
# setup-env.sh - Start all required dependencies for local development
# Generated by ecl-harness-engineer from environment.json
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

echo "==> Setting up environment for ${PROJECT_NAME}..."

# --- Database: ${DB_NAME} ---
{{#if databases}}
{{#each databases}}
{{#if (eq type "postgres")}}
if ! docker ps -q -f name={{name}} | grep -q .; then
  echo "Starting PostgreSQL ({{name}})..."
  docker run -d \
    --name {{name}} \
    -p 127.0.0.1:{{connection.default_port}}:5432 \
    -e POSTGRES_USER=${{{connection.user_env}}:-postgres} \
    -e POSTGRES_PASSWORD=${{{connection.password_env}}:-postgres} \
    -e POSTGRES_DB=${{{connection.database_env}}:-{{../project_name}}} \
    {{setup.docker_image}}
  echo "Waiting for PostgreSQL to be ready..."
  sleep 3
  until docker exec {{name}} pg_isready -U postgres > /dev/null 2>&1; do
    sleep 1
  done
  echo "PostgreSQL ready."
fi
{{/if}}
{{#if (eq type "mysql")}}
if ! docker ps -q -f name={{name}} | grep -q .; then
  echo "Starting MySQL ({{name}})..."
  docker run -d \
    --name {{name}} \
    -p 127.0.0.1:{{connection.default_port}}:3306 \
    -e MYSQL_ROOT_PASSWORD=${{{connection.password_env}}:-root} \
    -e MYSQL_DATABASE=${{{connection.database_env}}:-{{../project_name}}} \
    {{setup.docker_image}}
  echo "Waiting for MySQL to be ready..."
  sleep 5
  until docker exec {{name}} mysqladmin ping -h localhost --silent; do
    sleep 1
  done
  echo "MySQL ready."
fi
{{/if}}
{{/each}}
{{/if}}

# --- Services ---
{{#if services}}
{{#each services}}
{{#if (eq type "redis")}}
if ! docker ps -q -f name={{name}} | grep -q .; then
  echo "Starting Redis ({{name}})..."
  docker run -d --name {{name}} -p 127.0.0.1:6379:6379 {{setup.docker_image}}
  echo "Redis started."
fi
{{/if}}
{{/each}}
{{/if}}

# --- Run migrations ---
{{#if databases}}
{{#each databases}}
{{#if setup.migration_command}}
echo "Running migrations for {{name}}..."
{{setup.migration_command}}
{{/if}}
{{/each}}
{{/if}}

echo "==> Environment setup complete!"
```

#### `harness/scripts/start-server.sh`

Starts the application with the correct environment variables.

```bash
#!/bin/bash
# start-server.sh - Start the application server
# Generated by ecl-harness-engineer from environment.json
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

# Load .env if exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Set defaults from environment.json
{{#each test_environment.env_vars}}
export {{@key}}=${{{@key}}:-{{this}}}
{{/each}}

# Build if needed
{{#if runtime.build_command}}
echo "Building..."
{{runtime.build_command}}
{{/if}}

# Start the server
echo "Starting server on port ${PORT:-8080}..."
{{runtime.dev_command}}
```

#### `harness/scripts/teardown-env.sh`

Stops and cleans up all dependencies.

```bash
#!/bin/bash
# teardown-env.sh - Stop and cleanup environment
# Generated by ecl-harness-engineer from environment.json
set -e

echo "==> Tearing down environment..."

{{#if databases}}
{{#each databases}}
docker stop {{name}} 2>/dev/null || true
docker rm {{name}} 2>/dev/null || true
{{/each}}
{{/if}}

{{#if services}}
{{#each services}}
{{#if setup.docker_image}}
docker stop {{name}} 2>/dev/null || true
docker rm {{name}} 2>/dev/null || true
{{/if}}
{{/each}}
{{/if}}

echo "==> Teardown complete."
```

#### `harness/scripts/seed-data.sh`

Seeds the database with test data.

```bash
#!/bin/bash
# seed-data.sh - Seed database with test data
# Generated by ecl-harness-engineer from environment.json
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
cd "$PROJECT_ROOT"

{{#if databases}}
{{#each databases}}
{{#if setup.seed_command}}
echo "Seeding {{name}}..."
{{setup.seed_command}}
{{/if}}
{{/each}}
{{/if}}

echo "==> Seeding complete."
```

### 3.2 When to Generate Scripts

| Scenario | Generate Scripts? |
|----------|-------------------|
| Greenfield mode | Yes, always (part of scaffold) |
| Create mode with detected DB/services | Yes |
| Create mode with no dependencies | Minimal (just start-server.sh) |
| Improve mode, scripts missing | Yes, if dependencies detected |
| Improve mode, scripts exist | Keep existing, suggest updates if outdated |

### 3.3 Script vs docker-compose.yml

If project already has `docker-compose.yml`:
- **Do not generate duplicate scripts** that replicate docker-compose functionality
- Instead, generate thin wrapper scripts that call `docker-compose up -d` etc.
- Reference the docker-compose service names in environment.json

```bash
# setup-env.sh when docker-compose.yml exists
#!/bin/bash
set -e
docker-compose up -d postgres redis
echo "Waiting for services..."
sleep 5
docker-compose exec postgres pg_isready
echo "Services ready."
```

---

## 4. Environment Detection Strategies

### 4.1 Code Dependency Analysis

Scan dependency files to detect what the project uses:

| Pattern | Detection | Implies |
|---------|-----------|---------|
| `go.mod`: `github.com/lib/pq`, `github.com/jackc/pgx` | PostgreSQL | Database, connection env vars |
| `go.mod`: `github.com/go-redis/redis` | Redis | Cache service |
| `package.json`: `pg`, `mysql2`, `mongoose` | DB drivers | Database dependencies |
| `package.json`: `@aws-sdk/*` | AWS services | Cloud service credentials |
| `requirements.txt`: `psycopg2`, `sqlalchemy` | PostgreSQL | Database |
| `requirements.txt`: `boto3` | AWS | Cloud credentials |

**Go detection patterns:**
```go
// Scan import statements
"github.com/lib/pq"           // PostgreSQL
"github.com/jackc/pgx"        // PostgreSQL
"github.com/go-sql-driver/mysql"  // MySQL
"go.mongodb.org/mongo-driver"     // MongoDB
"github.com/go-redis/redis"       // Redis
"github.com/nats-io/nats.go"      // NATS
"github.com/segmentio/kafka-go"   // Kafka
```

**TypeScript/JavaScript patterns:**
```javascript
// package.json dependencies
"pg"           // PostgreSQL
"mysql2"       // MySQL
"mongodb"      // MongoDB
"ioredis"      // Redis
"kafkajs"      // Kafka
"@aws-sdk/*"   // AWS services
```

**Python patterns:**
```python
# requirements.txt or pyproject.toml
psycopg2       # PostgreSQL
mysql-connector-python  # MySQL
pymongo        # MongoDB
redis          # Redis
boto3          # AWS
```

### 4.2 Environment Variable Collection

Scan code for all environment variable references:

```go
// Go
os.Getenv("DB_HOST")
os.LookupEnv("REDIS_URL")
viper.GetString("jwt.secret")  // with config binding

// TypeScript
process.env.DB_HOST
config.get('database.url')

// Python
os.environ.get("DB_HOST")
os.getenv("REDIS_URL")
```

Also check:
- `.env.example` / `.env.template` for expected variables
- Config struct definitions (Go struct tags, TypeScript interfaces)
- README mentions of required environment variables

### 4.3 Functional Scenario Inference

Analyze routes to infer functional scenarios:

**Route patterns → Scenarios:**

| Detected Routes | Inferred Scenario |
|-----------------|-------------------|
| `POST /register`, `POST /login`, `GET /profile` | `user_auth_flow` |
| `POST /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id` | `user_crud` |
| `POST /orders`, `GET /orders`, middleware `auth` | `authenticated_orders_flow` |
| `GET /health`, `GET /ready` | `health_check` (always include) |

**Middleware analysis:**
- Auth middleware on routes → scenario needs authentication first
- Rate limit middleware → include rate limit boundary test

**Data model analysis:**
- User model with password field → auth scenarios
- Relations (User has Orders) → relational query scenarios

### 4.4 Docker/K8s Manifest Analysis

If `docker-compose.yml` or Kubernetes manifests exist:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
```

Extract:
- Service names → `databases[].setup.docker_compose_service`
- Images → `databases[].setup.docker_image`
- Port mappings → `databases[].connection.default_port`
- Environment variables → `databases[].connection.*_env`

---

## 5. Security Guidelines

### 5.1 Never Hardcode Secrets

```json
// WRONG - never do this
"secrets": [{ "value": "sk-abc123..." }]

// CORRECT - reference via environment variable
"secrets": [{ "name": "API_KEY", "purpose": "..." }]
```

### 5.2 Test Values

Only allow `test_value` for secrets that are:
- Self-contained (JWT signing key with no external dependency)
- Clearly marked as test-only

```json
{
  "name": "JWT_SECRET",
  "test_value_ok": true,
  "test_value": "test-jwt-secret-not-for-production"
}
```

### 5.3 Sensitive Patterns

Detect and warn about:
- API keys: `sk-`, `pk-`, `api_`, `token_`
- Connection strings with passwords
- Private keys (RSA, EC)

When detected, prompt user to confirm before including in environment.json.

---

## 6. Integration with harness-executor

### 6.1 Relationship

ecl-harness-engineer generates `environment.json` to describe the runtime ecosystem. harness-executor consumes it at task runtime to dynamically generate `verify.json` for verification.

```
environment.json (ecl-harness-engineer)       verify.json (harness-executor, runtime)
════════════════════════════════════     ═══════════════════════════════════════
databases[]                              prerequisites.database_checks[]
  └─ auto-derived ─────────────────►       (TCP connectivity)

services[]                               prerequisites.service_checks[]
  └─ auto-derived ─────────────────►       (HTTP health, TCP)

secrets[]                                prerequisites.env_checks[]
  └─ auto-derived ─────────────────►       (required env vars)

ports[]                                  prerequisites.port_checks[]
  └─ auto-derived ─────────────────►       (port availability)

functional_scenarios[]                   (not in verify.json)
  └─ consumed by ──────────────────►     verifier subagent
```

> **Note**: ecl-harness-engineer does NOT generate `verify.json`. It only provides `environment.json` as the foundation. harness-executor dynamically generates `verify.json` at task runtime based on environment.json + task context.

### 6.2 Auto-Derivation Rules

When harness-executor generates `verify.json`, it automatically derives `prerequisites` from `environment.json`:

```python
def derive_prerequisites(env_config):
    prereqs = {"database_checks": [], "service_checks": [], ...}

    for db in env_config.get("databases", []):
        if db["required"]:
            prereqs["database_checks"].append({
                "type": db["type"],
                "host_env": db["connection"].get("host_env", "localhost"),
                "port": db["connection"].get("default_port")
            })

    for svc in env_config.get("services", []):
        if svc["required"]:
            prereqs["service_checks"].append({
                "type": svc["type"],
                "url_env": svc["connection"].get("url_env"),
                "health_endpoint": svc["connection"].get("health_endpoint")
            })

    for secret in env_config.get("secrets", []):
        if secret["required"]:
            prereqs["env_checks"].append({
                "name": secret["name"],
                "required": True
            })

    return prereqs
```

---

## 7. Checklist for Modes

### 7.1 Greenfield Mode

- [ ] Generate `environment.json` with detected/default values
- [ ] Generate all four scripts (setup-env, start-server, teardown-env, seed-data)
- [ ] Include at least `health_check` functional scenario
- [ ] Set up `test_environment` with safe defaults

### 7.2 Create Mode

- [ ] Analyze codebase for dependencies (Section 4.1)
- [ ] Collect all environment variables (Section 4.2)
- [ ] Infer functional scenarios from routes (Section 4.3)
- [ ] Check existing docker-compose.yml (Section 4.4)
- [ ] Generate `environment.json`
- [ ] Generate scripts (or thin wrappers if docker-compose exists)
- [ ] Validate security (no hardcoded secrets)

### 7.3 Improve Mode

- [ ] Check if `environment.json` exists
  - If missing: run Create mode detection and generate
  - If exists: audit for completeness
- [ ] Audit checklist:
  - [ ] All detected DB drivers have corresponding `databases[]` entry
  - [ ] All required env vars from code are in `secrets[]` or `test_environment`
  - [ ] `functional_scenarios[]` covers main user flows
  - [ ] Scripts exist and are executable
  - [ ] Scripts match `environment.json` (not outdated)
- [ ] Generate missing components
- [ ] Update outdated components

---

## 8. Example: Complete Go Web API

Given a Go web API with PostgreSQL and Redis:

**Detected from code:**
- `go.mod`: `github.com/jackc/pgx/v5`, `github.com/go-redis/redis/v9`
- Env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `PORT`
- Routes: `/api/v1/register`, `/api/v1/login`, `/api/v1/users/:id`, `/health`
- Auth middleware on `/api/v1/users/:id`

**Generated environment.json:**
```json
{
  "version": "1.0",
  "project_name": "my-api",
  "runtime": {
    "language": "go",
    "version": "1.22+",
    "build_command": "go build -o bin/server ./cmd/server",
    "dev_command": "go run ./cmd/server"
  },
  "databases": [{
    "name": "primary_db",
    "type": "postgres",
    "purpose": "Main application database",
    "required": true,
    "connection": {
      "url_env": "DATABASE_URL",
      "default_port": 5432
    },
    "setup": {
      "docker_image": "postgres:16",
      "migration_command": "go run ./cmd/migrate up"
    }
  }],
  "services": [{
    "name": "cache",
    "type": "redis",
    "purpose": "Session and cache storage",
    "required": false,
    "connection": { "url_env": "REDIS_URL" },
    "setup": { "docker_image": "redis:7" },
    "fallback": "In-memory cache when Redis unavailable"
  }],
  "secrets": [{
    "name": "JWT_SECRET",
    "purpose": "JWT token signing",
    "required": true,
    "test_value_ok": true,
    "test_value": "test-secret-do-not-use-in-production"
  }],
  "ports": [{
    "name": "http_server",
    "env": "PORT",
    "default": 8080,
    "test_port": 8081
  }],
  "functional_scenarios": [
    {
      "name": "user_auth_flow",
      "description": "Register, login, access protected resource",
      "requires": ["primary_db", "JWT_SECRET"],
      "category": "auth",
      "steps_hint": [
        "POST /api/v1/register -> 201",
        "POST /api/v1/login -> 200 with token",
        "GET /api/v1/users/{id} with token -> 200"
      ],
      "priority": "high"
    },
    {
      "name": "health_check",
      "description": "Basic health and readiness",
      "requires": [],
      "category": "infra",
      "steps_hint": ["GET /health -> 200"],
      "priority": "high"
    }
  ],
  "test_environment": {
    "env_vars": {
      "ENV": "test",
      "PORT": "8081",
      "DATABASE_URL": "postgres://postgres:postgres@localhost:5432/testdb?sslmode=disable",
      "JWT_SECRET": "test-secret-do-not-use-in-production"
    }
  },
  "scripts": {
    "setup_env": "harness/scripts/setup-env.sh",
    "start_server": "harness/scripts/start-server.sh",
    "teardown_env": "harness/scripts/teardown-env.sh"
  }
}
```
