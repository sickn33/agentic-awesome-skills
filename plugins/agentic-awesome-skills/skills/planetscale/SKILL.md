---
name: planetscale
description: Operate MySQL-compatible databases on PlanetScale with branching workflows,
  safe migrations, and production rollouts.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# PlanetScale

Use PlanetScale for serverless MySQL-compatible databases with non-blocking schema change workflows built on Vitess.

## When to Use

- You need a managed MySQL-compatible database with zero-downtime migrations.
- Your team wants Git-like branching for schema development.
- You are building a serverless or edge application that benefits from connection pooling.
- You need horizontal sharding without managing Vitess directly.

## Prerequisites

- A PlanetScale account (free tier available).
- The `pscale` CLI installed locally.
- Node.js 18+ if using Prisma or other ORM integrations.

## Install the pscale CLI

```bash
# macOS
brew install planetscale/tap/pscale

# Linux (deb)
curl -fsSL https://github.com/planetscale/cli/releases/latest/download/pscale_linux_amd64.deb -o pscale.deb
sudo dpkg -i pscale.deb

# Verify installation
pscale version

# Authenticate
pscale auth login
```

## Create and Manage Databases

```bash
# Create a new database
pscale database create my-app --region us-east

# List databases
pscale database list

# Show database info
pscale database show my-app

# Delete a database (destructive)
pscale database delete my-app
```

## Branching Workflow

PlanetScale branches work like Git branches for your database schema. The `main` branch is the production branch by default.

```bash
# Create a development branch from main
pscale branch create my-app add-users-table

# List all branches
pscale branch list my-app

# Open a shell on the branch to apply schema changes
pscale shell my-app add-users-table
```

### Apply Schema Changes on a Branch

```sql
-- Inside the pscale shell on the development branch
CREATE TABLE users (
  id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  name       VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders (
  id         BIGINT    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT    NOT NULL,
  total      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status     ENUM('pending','paid','shipped','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_orders_user_id (user_id),
  KEY idx_orders_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> PlanetScale does not enforce foreign keys at the database level. Use application-level constraints or Vitess-level routing rules instead.

## Deploy Requests

Deploy requests are the pull-request equivalent for database schemas. They show a diff, run linting, and merge non-blocking into production.

```bash
# Create a deploy request from branch to main
pscale deploy-request create my-app add-users-table

# List open deploy requests
pscale deploy-request list my-app

# Show diff for a deploy request
pscale deploy-request diff my-app 1

# Deploy (merge) the request
pscale deploy-request deploy my-app 1

# Close without deploying
pscale deploy-request close my-app 1

# Delete the branch after successful deploy
pscale branch delete my-app add-users-table
```

## Connection Strings and Proxying

```bash
# Create a password (connection credential) for a branch
pscale password create my-app main production-creds

# Output includes host, username, and password for the connection string:
# mysql://USERNAME:PASSWORD@HOST/my-app?sslmode=verify_identity

# Proxy a branch to localhost for local development (no password needed)
pscale connect my-app add-users-table --port 3306
```

### Environment Variable Pattern

```bash
# .env (local development using pscale connect)
DATABASE_URL="mysql://root@127.0.0.1:3306/my-app"

# .env.production (using PlanetScale connection string)
DATABASE_URL="mysql://USERNAME:PASSWORD@us-east.connect.psdb.cloud/my-app?sslaccept=strict"
```

## Prisma Integration

```prisma
// prisma/schema.prisma
datasource db {
  provider     = "mysql"
  url          = env("DATABASE_URL")
  relationMode = "prisma"   // required — PlanetScale does not support foreign keys
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Order {
  id        Int      @id @default(autoincrement())
  userId    Int
  total     Decimal  @db.Decimal(10, 2)
  status    String   @default("pending")
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([status])
}
```

```bash
# Push schema changes to the PlanetScale branch
npx prisma db push

# Generate the Prisma client
npx prisma generate
```

## Vitess Features and Query Insights

```bash
# Open the query insights dashboard
pscale shell my-app main

# Inside the shell, check running queries
SHOW PROCESSLIST;

# Examine query statistics (PlanetScale Insights tab in the web UI)
# Or use the API:
pscale api organizations/my-org/databases/my-app/branches/main/query-statistics
```

### Useful Vitess-Aware Queries

```sql
-- Check table sizes
SELECT table_name,
       ROUND(data_length / 1024 / 1024, 2) AS data_mb,
       ROUND(index_length / 1024 / 1024, 2) AS index_mb,
       table_rows
FROM information_schema.tables
WHERE table_schema = 'my-app'
ORDER BY data_length DESC;

-- Show index usage
SHOW INDEX FROM users;

-- Explain a query plan
EXPLAIN SELECT * FROM orders WHERE user_id = 42 AND status = 'paid';
```

## Docker Setup for Local Development

Use a plain MySQL 8 container to mirror PlanetScale locally when you are offline or want fast iteration without the CLI proxy.

```yaml
# docker-compose.yml
version: "3.9"

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: my-app
      MYSQL_USER: myapp
      MYSQL_PASSWORD: secret
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    command: >
      --default-authentication-plugin=mysql_native_password
      --character-set-server=utf8mb4
      --collation-server=utf8mb4_unicode_ci

volumes:
  mysql_data:
```

```bash
docker compose up -d
mysql -h 127.0.0.1 -u myapp -psecret my-app
```

## Production Best Practices

- Keep every schema change backward compatible; deploy the schema first, then the application code.
- Use deploy request reviews as a gate; require at least one approval before merging.
- Enable connection pooling (`@planetscale/database` driver or Prisma Data Proxy) for serverless workloads.
- Monitor query insights weekly and add indexes for queries exceeding 100 ms.
- Set branch promotion rules so only specific team members can deploy to `main`.
- Use read-only regions to reduce latency for geographically distributed reads.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Access denied` on `pscale connect` | CLI not authenticated | Run `pscale auth login` |
| Deploy request shows "schema conflict" | Concurrent branch changes to the same table | Rebase: delete branch, recreate from current `main`, reapply changes |
| `foreign key constraint` error | PlanetScale does not support foreign keys | Use `relationMode = "prisma"` or remove FK definitions |
| High latency on reads | No index on queried column | Add index via a new branch and deploy request |
| `max connections` exceeded | Connection pooling not enabled | Use `@planetscale/database` serverless driver or PgBouncer-style proxy |
| `pscale connect` hangs | Firewall blocking outbound TLS | Allow outbound 443 to `*.psdb.cloud` |

## Related Skills

- mysql (`mysql`) - MySQL tuning fundamentals
- database-backups (`database-backups`) - Recovery planning
- postgresql (`postgresql-devsec`) - Alternative relational database

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

