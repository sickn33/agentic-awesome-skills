---
name: neon-postgres
description: Expert patterns for Neon serverless Postgres, branching, connection
  pooling, and Prisma/Drizzle integration
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Neon Postgres

Expert patterns for Neon serverless Postgres, branching, connection pooling, and Prisma/Drizzle integration

## Patterns

### Prisma with Neon Connection

Configure Prisma for Neon with connection pooling.

Use two connection strings:
- DATABASE_URL: Pooled connection for Prisma Client
- DIRECT_URL: Direct connection for Prisma Migrate

The pooled connection uses PgBouncer for up to 10K connections.
Direct connection required for migrations (DDL operations).

### Code_example

# .env
# Pooled connection for application queries
DATABASE_URL="postgres://user:password@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
# Direct connection for migrations
DIRECT_URL="postgres://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"

// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Run migrations
// Uses DIRECT_URL automatically
npx prisma migrate dev
npx prisma migrate deploy

### Anti_patterns

- Pattern: Using pooled connection for migrations | Why: DDL operations fail through PgBouncer | Fix: Set directUrl in schema.prisma
- Pattern: Not using connection pooling | Why: Serverless functions exhaust connection limits | Fix: Use -pooler endpoint in DATABASE_URL

### References

- https://neon.com/docs/guides/prisma
- https://www.prisma.io/docs/orm/overview/databases/neon

### Drizzle with Neon Serverless Driver

Use Drizzle ORM with Neon's serverless HTTP driver for
edge/serverless environments.

Two driver options:
- neon-http: Single queries over HTTP (fastest for one-off queries)
- neon-serverless: WebSocket for transactions and sessions

### Code_example

# Install dependencies
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

// lib/db/schema.ts
import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// lib/db/index.ts (for serverless - HTTP driver)
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

// Usage in API route
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
  const allUsers = await db.select().from(users);
  return Response.json(allUsers);
}

// lib/db/index.ts (for WebSocket - transactions)
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// With transactions
await db.transaction(async (tx) => {
  await tx.insert(users).values({ email: 'test@example.com' });
  await tx.update(users).set({ name: 'Updated' });
});

// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

// Run migrations
npx drizzle-kit generate
npx drizzle-kit migrate

### Anti_patterns

- Pattern: Using pg driver in serverless | Why: TCP connections don't work in all edge environments | Fix: Use @neondatabase/serverless driver
- Pattern: HTTP driver for transactions | Why: HTTP driver doesn't support transactions | Fix: Use WebSocket driver (Pool) for transactions

### References

- https://neon.com/docs/guides/drizzle
- https://orm.drizzle.team/docs/connect-neon

### Connection Pooling with PgBouncer

Neon provides built-in connection pooling via PgBouncer.

Key limits:
- Up to 10,000 concurrent connections to pooler
- Connections still consume underlying Postgres connections
- 7 connections reserved for Neon superuser

Use pooled endpoint for application, direct for migrations.

### Code_example

# Connection string formats

# Pooled connection (for application)
# Note: -pooler in hostname
postgres://user:pass@ep-cool-name-pooler.us-east-2.aws.neon.tech/neondb

# Direct connection (for migrations)
# Note: No -pooler
postgres://user:pass@ep-cool-name.us-east-2.aws.neon.tech/neondb

// Prisma with pooling
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled
  directUrl = env("DIRECT_URL")        // Direct
}

// Connection pool settings for high-traffic
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool settings
  // Adjust based on compute size
});

// For Drizzle with connection pool
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,  // Max connections in local pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Compute size connection limits
// 0.25 CU: 112 connections (105 available after reserved)
// 0.5 CU: 225 connections
// 1 CU: 450 connections
// 2 CU: 901 connections
// 4 CU: 1802 connections
// 8 CU: 3604 connections

### Anti_patterns

- Pattern: Opening new connection per request | Why: Exhausts connection limits quickly | Fix: Use connection pooling, reuse connections
- Pattern: High max pool size in serverless | Why: Many function instances = many pools = many connections | Fix: Keep local pool size low (5-10), rely on PgBouncer

### References

- https://neon.com/docs/connect/connection-pooling

### Database Branching for Development

Create instant copies of your database for development,
testing, and preview environments.

Branches share underlying storage (copy-on-write),
making them instant and cost-effective.

### Code_example

# Create branch via Neon CLI
neon branches create --name feature/new-feature --parent main

# Create branch from specific point in time
neon branches create --name debug/yesterday \
  --parent main \
  --timestamp "2024-01-15T10:00:00Z"

# List branches
neon branches list

# Get connection string for branch
neon connection-string feature/new-feature

# Delete branch when done
neon branches delete feature/new-feature

// In CI/CD (GitHub Actions)
// .github/workflows/preview.yml
name: Preview Environment
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  create-branch:
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/create-branch-action@v5
        id: create-branch
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch_name: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}
          username: ${{ secrets.NEON_ROLE_NAME }}

      - name: Run migrations
        env:
          DATABASE_URL: ${{ steps.create-branch.outputs.db_url_with_pooler }}
        run: npx prisma migrate deploy

      - name: Deploy to Vercel
        env:
          DATABASE_URL: ${{ steps.create-branch.outputs.db_url_with_pooler }}
        run: vercel deploy --prebuilt

// Cleanup on PR close
on:
  pull_request:
    types: [closed]

jobs:
  delete-branch:
    runs-on: ubuntu-latest
    steps:
      - uses: neondatabase/delete-branch-action@v3
        with:
          project_id: ${{ secrets.NEON_PROJECT_ID }}
          branch: preview/pr-${{ github.event.pull_request.number }}
          api_key: ${{ secrets.NEON_API_KEY }}

### Anti_patterns

- Pattern: Sharing production database for development | Why: Risk of data corruption, no isolation | Fix: Create development branches from production
- Pattern: Not cleaning up old branches | Why: Accumulates storage and clutter | Fix: Auto-delete branches on PR close

### References

- https://neon.com/blog/branching-with-preview-environments
- https://github.com/neondatabase/create-branch-action

### Vercel Preview Environment Integration

Automatically create database branches for Vercel preview
deployments. Each PR gets its own isolated database.

Two integration options:
- Vercel-Managed: Billing in Vercel, auto-setup
- Neon-Managed: Billing in Neon, more control

### Code_example

# Vercel-Managed Integration
# 1. Go to Vercel Dashboard > Storage > Create Database
# 2. Select Neon Postgres
# 3. Enable "Create a branch for each preview deployment"
# 4. Environment variables automatically injected

# Neon-Managed Integration
# 1. Install from Neon Dashboard > Integrations > Vercel
# 2. Select Vercel project to connect
# 3. Enable "Create a branch for each preview deployment"
# 4. Optionally enable auto-delete on branch delete

// vercel.json - Add migration to build
{
  "buildCommand": "prisma migrate deploy && next build",
  "framework": "nextjs"
}

// Or in package.json
{
  "scripts": {
    "vercel-build": "prisma generate && prisma migrate deploy && next build"
  }
}

// Environment variables injected by integration
// DATABASE_URL - Pooled connection for preview branch
// DATABASE_URL_UNPOOLED - Direct connection for migrations
// PGHOST, PGUSER, PGDATABASE, PGPASSWORD - Individual vars

// Prisma schema for Vercel integration
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")  // Vercel variable
}

// For Drizzle in Next.js on Vercel
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Use pooled URL for queries
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);

### Anti_patterns

- Pattern: Same database for all previews | Why: Previews interfere with each other | Fix: Enable branch-per-preview in integration
- Pattern: Not running migrations on preview | Why: Schema mismatch between code and database | Fix: Add migrate command to build step

### References

- https://neon.com/docs/guides/vercel-managed-integration
- https://neon.com/docs/guides/neon-managed-vercel-integration

### Autoscaling and Cold Start Management

Neon autoscales compute resources and scales to zero.

Cold start latency: 500ms - few seconds when waking from idle.
Production recommendation: Disable scale-to-zero, set minimum compute.

### Code_example

# Neon Console settings for production
# Project Settings > Compute > Default compute size
# - Set minimum to 0.5 CU or higher
# - Disable "Suspend compute after inactivity"

// Handle cold starts in application
// lib/db-with-retry.ts
import { prisma } from './prisma';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export async function queryWithRetry<T>(
  query: () => Promise<T>
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await query();
    } catch (error) {
      lastError = error as Error;

      // Retry on connection errors (cold start)
      if (error.code === 'P1001' || error.code === 'P1002') {
        console.log(`Retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// Usage
const users = await queryWithRetry(() =>
  prisma.user.findMany()
);

// Reduce cold start latency with SSL direct negotiation
# PostgreSQL 17+ connection string
postgres://user:pass@ep-xxx-pooler.aws.neon.tech/db?sslmode=require&sslnegotiation=direct

// Keep-alive for long-running apps
// lib/db-keepalive.ts
import { prisma } from './prisma';

// Ping database every 4 minutes to prevent suspend
const KEEPALIVE_INTERVAL = 4 * 60 * 1000;

if (process.env.NEON_KEEPALIVE === 'true') {
  setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('Keepalive failed:', error);
    }
  }, KEEPALIVE_INTERVAL);
}

// Compute sizing recommendations
// Development: 0.25 CU, scale-to-zero enabled
// Staging: 0.5 CU, scale-to-zero enabled
// Production: 1+ CU, scale-to-zero DISABLED
// High-traffic: 2-4 CU minimum, autoscaling enabled

### Anti_patterns

- Pattern: Scale-to-zero in production | Why: Cold starts add 500ms+ latency to first request | Fix: Disable scale-to-zero for production branch
- Pattern: No retry logic for cold starts | Why: First connection after idle may timeout | Fix: Add retry with exponential backoff

### References

- https://neon.com/blog/scaling-serverless-postgres
- https://neon.com/docs/connect/connection-latency

## Sharp Edges

### Cold Start Latency After Scale-to-Zero

Severity: HIGH

### Using Pooled Connection for Migrations

Severity: HIGH

### Connection Pool Exhaustion in Serverless

Severity: HIGH

### PgBouncer Feature Limitations

Severity: MEDIUM

### Branch Storage Accumulation

Severity: MEDIUM

### Reserved Connections Reduce Available Pool

Severity: LOW

### HTTP Driver Doesn't Support Transactions

Severity: MEDIUM

### Deleting Parent Branch Affects Children

Severity: HIGH

### Schema Drift Between Branches

Severity: MEDIUM

## Validation Checks

### Direct Database URL in Client Code

Severity: ERROR

Direct database URLs should never be exposed to client

Message: Direct URL exposed to client. Only pooled URLs for server-side use.

### Hardcoded Database Connection String

Severity: ERROR

Connection strings should use environment variables

Message: Hardcoded connection string. Use environment variables.

### Missing SSL Mode in Connection String

Severity: WARNING

Neon requires SSL connections

Message: Missing sslmode=require. Add to connection string.

### Prisma Missing directUrl for Migrations

Severity: ERROR

Prisma needs directUrl for migrations through PgBouncer

Message: Using pooled URL without directUrl. Migrations will fail.

### Prisma directUrl Points to Pooler

Severity: ERROR

directUrl should be non-pooled connection

Message: directUrl points to pooler. Use non-pooled endpoint for migrations.

### High Pool Size in Serverless Function

Severity: WARNING

High pool sizes exhaust connections with many function instances

Message: Pool size too high for serverless. Use max: 5-10.

### Creating New Client Per Request

Severity: WARNING

Creating new clients per request wastes connections

Message: Creating client per request. Use connection pool or neon() driver.

### Branch Creation Without Cleanup Strategy

Severity: WARNING

Branches should have cleanup automation

Message: Creating branch without cleanup. Add delete-branch-action to PR close.

### Scale-to-Zero Enabled on Production

Severity: WARNING

Scale-to-zero adds latency in production

Message: Scale-to-zero on production. Disable for low-latency.

### HTTP Driver Used for Transactions

Severity: ERROR

neon() HTTP driver doesn't support transactions

Message: HTTP driver with transaction. Use Pool from @neondatabase/serverless.

## Collaboration

### Delegation Triggers

- user needs authentication -> clerk-auth (User table with clerkId column)
- user needs caching -> redis-specialist (Query caching, session storage)
- user needs search -> algolia-search (Full-text search beyond Postgres capabilities)
- user needs analytics -> segment-cdp (Track database events, user actions)
- user needs deployment -> vercel-deployment (Environment variables, preview databases)

## When to Use
- User mentions or implies: neon database
- User mentions or implies: serverless postgres
- User mentions or implies: database branching
- User mentions or implies: neon postgres
- User mentions or implies: postgres serverless
- User mentions or implies: connection pooling
- User mentions or implies: preview environments
- User mentions or implies: database per preview

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
