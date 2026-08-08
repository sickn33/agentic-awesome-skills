---
title: Use Transactions for Database Operations
impact: HIGH
impactDescription: Transactions provide exactly-once database execution within workflows
tags: step, transaction, database, datasource
---

## Use Transactions for Database Operations

Use datasource transactions for database operations within workflows. Transactions commit exactly once and are checkpointed for recovery.

**Incorrect (raw database query in workflow):**

```typescript
import { Pool } from "pg";
const pool = new Pool();

async function myWorkflowFn() {
  // Direct database access in workflow - not checkpointed!
  const result = await pool.query("INSERT INTO orders ...");
}
```

**Correct (using a datasource transaction):**

Install a datasource package (e.g., Knex):
```
npm i @dbos-inc/knex-datasource
```

Configure the datasource:
```typescript
import { KnexDataSource } from "@dbos-inc/knex-datasource";

const config = { client: "pg", connection: process.env.DBOS_DATABASE_URL };
const dataSource = new KnexDataSource("app-db", config);
```

Run transactions inline with `runTransaction`:
```typescript
async function insertOrderFn(userId: string, amount: number) {
  const rows = await dataSource
    .client("orders")
    .insert({ user_id: userId, amount })
    .returning("id");
  return rows[0].id;
}

async function myWorkflowFn(userId: string, amount: number) {
  const orderId = await dataSource.runTransaction(
    () => insertOrderFn(userId, amount),
    { name: "insertOrder" }
  );
  return orderId;
}
const myWorkflow = DBOS.registerWorkflow(myWorkflowFn);
```

You can also pre-register a transaction function with `dataSource.registerTransaction`:
```typescript
const insertOrder = dataSource.registerTransaction(insertOrderFn);
```

Available datasource packages: `@dbos-inc/knex-datasource`, `@dbos-inc/kysely-datasource`, `@dbos-inc/drizzle-datasource`, `@dbos-inc/typeorm-datasource`, `@dbos-inc/prisma-datasource`, `@dbos-inc/nodepg-datasource`, `@dbos-inc/postgres-datasource`.

Datasources require installing the DBOS schema (`transaction_completion` table) via `initializeDBOSSchema`.

Reference: [Transactions & Datasources](https://docs.dbos.dev/typescript/tutorials/transaction-tutorial)
