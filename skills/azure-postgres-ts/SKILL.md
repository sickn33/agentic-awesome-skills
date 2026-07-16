---
name: azure-postgres-ts
description: Connect to Azure Database for PostgreSQL Flexible Server from Node.js/TypeScript using the pg (node-postgres) package.
risk: unknown
source: community
date_added: '2026-02-27'
---

# Azure PostgreSQL for TypeScript (node-postgres)

Connect to Azure Database for PostgreSQL Flexible Server using the `pg` (node-postgres) package with support for password and Microsoft Entra ID (passwordless) authentication.

## Installation

```bash
npm install pg @azure/identity
npm install -D @types/pg
```

## Environment Variables

```bash
# Required
AZURE_POSTGRESQL_HOST=<server>.postgres.database.azure.com
AZURE_POSTGRESQL_DATABASE=<database>
AZURE_POSTGRESQL_PORT=5432

# For password authentication
AZURE_POSTGRESQL_USER=<username>
AZURE_POSTGRESQL_PASSWORD=<password>

# For Entra ID authentication
AZURE_POSTGRESQL_USER=<entra-user>@<server>   # e.g., user@contoso.com
AZURE_POSTGRESQL_CLIENTID=<managed-identity-client-id>  # For user-assigned identity
```

## Authentication

### Option 1: Password Authentication

```typescript
import { Client, Pool } from "pg";

const client = new Client({
  host: process.env.AZURE_POSTGRESQL_HOST,
  database: process.env.AZURE_POSTGRESQL_DATABASE,
  user: process.env.AZURE_POSTGRESQL_USER,
  password: process.env.AZURE_POSTGRESQL_PASSWORD,
  port: Number(process.env.AZURE_POSTGRESQL_PORT) || 5432,
  ssl: { rejectUnauthorized: true }  // Required for Azure
});

await client.connect();
```

### Option 2: Microsoft Entra ID (Passwordless) - Recommended

```typescript
import { Client, Pool } from "pg";
import { DefaultAzureCredential } from "@azure/identity";

// For system-assigned managed identity
const credential = new DefaultAzureCredential();

// For user-assigned managed identity
// const credential = new DefaultAzureCredential({
//   managedIdentityClientId: process.env.AZURE_POSTGRESQL_CLIENTID
// });

// Acquire access token for Azure PostgreSQL
const tokenResponse = await credential.getToken(
  "https://ossrdbms-aad.database.windows.net/.default"
);

const client = new Client({
  host: process.env.AZURE_POSTGRESQL_HOST,
  database: process.env.AZURE_POSTGRESQL_DATABASE,
  user: process.env.AZURE_POSTGRESQL_USER,  // Entra ID user
  password: tokenResponse.token,             // Token as password
  port: Number(process.env.AZURE_POSTGRESQL_PORT) || 5432,
  ssl: { rejectUnauthorized: true }
});

await client.connect();
```

## Core Workflows

### 1. Single Client Connection

```typescript
import { Client } from "pg";

const client = new Client({
  host: process.env.AZURE_POSTGRESQL_HOST,
  database: process.env.AZURE_POSTGRESQL_DATABASE,
  user: process.env.AZURE_POSTGRESQL_USER,
  password: process.env.AZURE_POSTGRESQL_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: true }
});

try {
  await client.connect();
  
  const result = await client.query("SELECT NOW() as current_time");
  console.log(result.rows[0].current_time);
} finally {
  await client.end();  // Always close connection
}
```

### 2. Connection Pool (Recommended for Production)

```typescript
import { Pool } from "pg";

const pool = new Pool({
  host: process.env.AZURE_POSTGRESQL_HOST,
  database: process.env.AZURE_POSTGRESQL_DATABASE,
  user: process.env.AZURE_POSTGRESQL_USER,
  password: process.env.AZURE_POSTGRESQL_PASSWORD,
  port: 5432,
  ssl: { rejectUnauthorized: true },
  
  // Pool configuration
  max: 20,                    // Maximum connections in pool
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 10000  // Timeout for new connections
});

// Query using pool (automatically acquires and releases connection)
const result = await pool.query("SELECT * FROM users WHERE id = $1", [userId]);

// Explicit checkout for multiple queries
const client = await pool.connect();
try {
  const res1 = await client.query("SELECT * FROM users");
  const res2 = await client.query("SELECT * FROM orders");
} finally {
  client.release();  // Return connection to pool
}

// Cleanup on shutdown
await pool.end();
```

### 3. Parameterized Queries (Prevent SQL Injection)

```typescript
// ALWAYS use parameterized queries - never concatenate user input
const userId = 123;
const email = "user@example.com";

// Single parameter
const result = await pool.query(
  "SELECT * FROM users WHERE id = $1",
  [userId]
);

// Multiple parameters
const result = await pool.query(
  "INSERT INTO users (email, name, created_at) VALUES ($1, $2, NOW()) RETURNING *",
  [email, "John Doe"]
);

// Array parameter
const ids = [1, 2, 3, 4, 5];
const result = await pool.query(
  "SELECT * FROM users WHERE id = ANY($1::int[])",
  [ids]
);
```

### 4. Transactions

```typescript
const client = await pool.connect();

try {
  await client.query("BEGIN");
  
  const userResult = await client.query(
    "INSERT INTO users (email) VALUES ($1) RETURNING id",
    ["user@example.com"]
  );
  const userId = userResult.rows[0].id;
  
  await client.query(
    "INSERT INTO orders (user_id, total) VALUES ($1, $2)",
    [userId, 99.99]
  );
  
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}
```

### 5. Transaction Helper Function

```typescript
async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Usage
const order = await withTransaction(pool, async (client) => {
  const user = await client.query(
    "INSERT INTO users (email) VALUES ($1) RETURNING *",
    ["user@example.com"]
  );
  const order = await client.query(
    "INSERT INTO orders (user_id, total) VALUES ($1, $2) RETURNING *",
    [user.rows[0].id, 99.99]
  );
  return order.rows[0];
});
```

### 6. Typed Queries with TypeScript

```typescript
import { Pool, QueryResult } from "pg";

interface User {
  id: number;
  email: string;
  name: string;
  created_at: Date;
}

// Type the query result
const result: QueryResult<User> = await pool.query<User>(
  "SELECT * FROM users WHERE id = $1",
  [userId]
);

const user: User | undefined = result.rows[0];

// Type-safe insert
async function createUser(
  pool: Pool,
  email: string,
  name: string
): Promise<User> {
  const result = await pool.query<User>(
    "INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *",
    [email, name]
  );
  return result.rows[0];
}
```

## Pool with Entra ID Token Refresh

For long-running applications, tokens expire and need refresh:

```typescript
import { Pool, PoolConfig } from "pg";
import { DefaultAzureCredential, AccessToken } from "@azure/identity";

class AzurePostgresPool {
  private pool: Pool | null = null;
  private credential: DefaultAzureCredential;
  private tokenExpiry: Date | null = null;
  private config: Omit<PoolConfig, "password">;

  constructor(config: Omit<PoolConfig, "password">) {
    this.credential = new DefaultAzureCredential();
    this.config = config;
  }

  private async getToken(): Promise<string> {
    const tokenResponse = await this.credential.getToken(
      "https://ossrdbms-aad.database.windows.net/.default"
    );
    this.tokenExpiry = new Date(tokenResponse.expiresOnTimestamp);
    return tokenResponse.token;
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    // Refresh 5 minutes before expiry
    return new Date() >= new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000);
  }

  async getPool(): Promise<Pool> {
    if (this.pool && !this.isTokenExpired()) {
      return this.pool;
    }

    // Close existing pool if token expired
    if (this.pool) {
      await this.pool.end();
    }

    const token = await this.getToken();
    this.pool = new Pool({
      ...this.config,
      password: token
    });

    return this.pool;
  }

  async query<T>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const pool = await this.getPool();
    return pool.query<T>(text, params);
  }

  async end(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Usage
const azurePool = new AzurePostgresPool({
  host: process.env.AZURE_POSTGRESQL_HOST!,
  database: process.env.AZURE_POSTGRESQL_DATABASE!,
  user: process.env.AZURE_POSTGRESQL_USER!,
  port: 5432,
  ssl: { rejectUnauthorized: true },
  max: 20
});

const result = await azurePool.query("SELECT NOW()");
```

## Error Handling

```typescript
import { DatabaseError } from "pg";

try {
  await pool.query("INSERT INTO users (email) VALUES ($1)", [email]);
} catch (error) {
  if (error instanceof DatabaseError) {
    switch (error.code) {
      case "23505":  // unique_violation
        console.error("Duplicate entry:", error.detail);
        break;
      case "23503":  // foreign_key_violation
        console.error("Foreign key constraint failed:", error.detail);
        break;
      case "42P01":  // undefined_table
        console.error("Table does not exist:", error.message);
        break;
      case "28P01":  // invalid_password
        console.error("Authentication failed");
        break;
      case "57P03":  // cannot_connect_now (server starting)
        console.error("Server unavailable, retry later");
        break;
      default:
        console.error(`PostgreSQL error ${error.code}: ${error.message}`);
    }
  }
  throw error;
}
```

## Connection String Format

```typescript
// Alternative: Use connection string
const pool = new Pool({
  connectionString: `postgres://${user}:${password}@${host}:${port}/${database}?sslmode=require`
});

// With SSL required (Azure)
const connectionString = 
  `postgres://user:password@server.postgres.database.azure.com:5432/mydb?sslmode=require`;
```

## Pool Events

```typescript
const pool = new Pool({ /* config */ });

pool.on("connect", (client) => {
  console.log("New client connected to pool");
});

pool.on("acquire", (client) => {
  console.log("Client checked out from pool");
});

pool.on("release", (err, client) => {
  console.log("Client returned to pool");
});

pool.on("remove", (client) => {
  console.log("Client removed from pool");
});

pool.on("error", (err, client) => {
  console.error("Unexpected pool error:", err);
});
```

## Azure-Specific Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `ssl.rejectUnauthorized` | `true` | Always use SSL for Azure |
| Default port | `5432` | Standard PostgreSQL port |
| PgBouncer port | `6432` | Use when PgBouncer enabled |
| Token scope | `https://ossrdbms-aad.database.windows.net/.default` | Entra ID token scope |
| Token lifetime | ~1 hour | Refresh before expiry |

## Pool Sizing Guidelines

| Workload | `max` | `idleTimeoutMillis` |
|----------|-------|---------------------|
| Light (dev/test) | 5-10 | 30000 |
| Medium (production) | 20-30 | 30000 |
| Heavy (high concurrency) | 50-100 | 10000 |

> **Note**: Azure PostgreSQL has connection limits based on SKU. Check your tier's max connections.

## Best Practices

1. **Always use connection pools** for production applications
2. **Use parameterized queries** - Never concatenate user input
3. **Always close connections** - Use `try/finally` or connection pools
4. **Enable SSL** - Required for Azure (`ssl: { rejectUnauthorized: true }`)
5. **Handle token refresh** - Entra ID tokens expire after ~1 hour
6. **Set connection timeouts** - Avoid hanging on network issues
7. **Use transactions** - For multi-statement operations
8. **Monitor pool metrics** - Track `pool.totalCount`, `pool.idleCount`, `pool.waitingCount`
9. **Graceful shutdown** - Call `pool.end()` on application termination
10. **Use TypeScript generics** - Type your query results for safety

## Key Types

```typescript
import {
  Client,
  Pool,
  PoolClient,
  PoolConfig,
  QueryResult,
  QueryResultRow,
  DatabaseError,
  QueryConfig
} from "pg";
```

## Reference Links

| Resource | URL |
|----------|-----|
| node-postgres Docs | https://node-postgres.com |
| npm Package | https://www.npmjs.com/package/pg |
| GitHub Repository | https://github.com/brianc/node-postgres |
| Azure PostgreSQL Docs | https://learn.microsoft.com/azure/postgresql/flexible-server/ |
| Passwordless Connection | https://learn.microsoft.com/azure/postgresql/flexible-server/how-to-connect-with-managed-identity |

## When to Use
This skill is applicable to execute the workflow or actions described in the overview.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
