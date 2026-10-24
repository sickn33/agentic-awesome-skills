---
name: odoo-docker-deployment
description: "Production-ready Docker and docker-compose setup for Odoo with PostgreSQL, persistent volumes, environment-based configuration, and Nginx reverse proxy."
risk: safe
source: "self"
date_added: "2026-03-04"
---

# Odoo Docker Deployment

## Overview

This skill provides a starting Docker configuration requiring environment-specific validation for Odoo, including PostgreSQL, persistent file storage, environment variable configuration, and an optional Nginx reverse proxy with SSL. It covers both development and production configurations.

## When to Use This Skill

- Spinning up a local Odoo development environment with Docker.
- Deploying Odoo to a VPS or cloud server (AWS, DigitalOcean, etc.).
- Troubleshooting Odoo container startup failures or database connection errors.
- Adding a reverse proxy with SSL to an existing Odoo Docker setup.

## How It Works

1. **Activate**: Mention `@odoo-docker-deployment` and describe your deployment scenario.
2. **Generate**: Receive a complete `docker-compose.yml` and `odoo.conf` ready to run.
3. **Debug**: Describe your container error and get a diagnosis with a fix.

## Examples

### Example 1: Production docker-compose.yml

```yaml
# Note: The top-level 'version' key is deprecated in Docker Compose v2+
# and can be safely omitted. Remove it to avoid warnings.

services:
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: odoo
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U odoo -d odoo"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - odoo-net

  odoo:
    image: odoo:17.0
    restart: always
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "127.0.0.1:8069:8069"
      - "127.0.0.1:8072:8072"   # Longpolling for live chat / bus
    environment:
      HOST: db
      USER: odoo
      PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - odoo-web-data:/var/lib/odoo
      - ./addons:/mnt/extra-addons   # Custom modules
      - ./odoo.conf:/etc/odoo/odoo.conf
    networks:
      - odoo-net

volumes:
  postgres-data:
  odoo-web-data:

networks:
  odoo-net:
```

### Example 2: odoo.conf

```ini
[options]
admin_passwd = REPLACE_WITH_PRIVATELY_RENDERED_VALUE
db_host = db
db_port = 5432
db_user = odoo
; Official container entrypoint receives database password through PASSWORD.
; Plain odoo.conf does not expand Compose-style environment placeholders.

; addons_path inside the official Odoo Docker image (Debian-based)
addons_path = /mnt/extra-addons,/usr/lib/python3/dist-packages/odoo/addons

; Use container stdout/stderr unless a writable private log volume is configured.
log_level = warn

; Illustrative worker count; size HTTP+cron+PostgreSQL+OS within measured RAM:
workers = 4
max_cron_threads = 2
limit_memory_soft = 1610612736   ; 1.5 GB — soft kill threshold
limit_memory_hard = 2147483648   ; 2.0 GB — hard kill threshold
limit_time_cpu = 600
limit_time_real = 1200
limit_request = 8192
```

### Example 3: Common Commands

```bash
# Start all services in background
docker compose up -d

# Stream Odoo logs in real time
docker compose logs -f odoo

# Restart Odoo only (not DB — avoids data risk)
docker compose restart odoo

# Stop all services
docker compose down

# Backup the database to a local SQL dump
docker compose exec db pg_dump -U odoo odoo > backup_$(date +%Y%m%d).sql

# Module updates change schema/data: stop normal Odoo workers first and back up DB+filestore.
# Run a single maintenance instance with the same reviewed DB/config; verify then restart.
```

Compose expands `${VAR}` in the Compose file, not arbitrary mounted application config. Render required configuration through an approved private secret mechanism and validate it without printing secrets. A SQL dump alone omits Odoo’s filestore; coordinate consistent DB+filestore backup and prove restore in staging. These examples do not include TLS/proxy/database-selection hardening or a production readiness test.

## Best Practices

- ✅ **Do:** Store all secrets in a `.env` file and reference them with `${VAR}` — never hardcode passwords in `docker-compose.yml`.
- ✅ **Do:** Use `depends_on: condition: service_healthy` with a PostgreSQL healthcheck to prevent Odoo starting before the DB is ready.
- ✅ **Do:** Put Nginx in front of Odoo for SSL termination (Let's Encrypt / Certbot) — never expose Odoo directly on port 80/443.
- ✅ **Do:** Measure worker memory and concurrency; a CPU heuristic alone cannot guarantee a safe RAM budget.
- ❌ **Don't:** Expose port 5432 (PostgreSQL) to the public internet — keep it on the internal Docker network only.
- ❌ **Don't:** Use the `latest` or `17` Docker image tags in production — pin a reviewed image digest; `odoo:17.0` is a mutable series tag, not an immutable patch identity.
- ❌ **Don't:** Mount `odoo.conf` and rely on it for secrets in CI/CD — use Docker secrets or environment variables instead.

## Limitations

- This skill covers **self-hosted Docker deployments** — Odoo.sh (cloud-managed hosting) has a completely different deployment model.
- **Horizontal scaling** (multiple Odoo containers behind a load balancer) requires shared filestore (NFS or S3-compatible storage) not covered here.
- Does not include an Nginx configuration template — consult the [official Odoo Nginx docs](https://www.odoo.com/documentation/17.0/administration/install/deploy.html) for the full reverse proxy config.
- The `addons_path` inside the Docker image may change with new base image versions — always verify after upgrading the Odoo image.
