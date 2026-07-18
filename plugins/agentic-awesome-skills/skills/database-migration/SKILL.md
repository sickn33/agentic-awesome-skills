---
name: database-migration
description: "Master database schema and data migrations across ORMs (Sequelize, TypeORM, Prisma), including rollback strategies and zero-downtime deployments."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Database Migration

Master database schema and data migrations across ORMs (Sequelize, TypeORM, Prisma), including rollback strategies and zero-downtime deployments.

## Do not use this skill when

- The task is unrelated to database migration
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- Before proposing execution, bind the plan to the exact engine and version, environment,
  database/schema, table set, data volume, maintenance constraints, recovery objective,
  and authorized operator.

## Use this skill when

- Migrating between different ORMs
- Performing schema transformations
- Moving data between databases
- Implementing rollback procedures
- Zero-downtime deployments
- Database version upgrades
- Data model refactoring

## ORM Migrations

The `down()` blocks below are definitions, not authorization to execute a rollback.
Immediately before any rollback that drops a table, removes a column, or can lose
data, bind the exact environment/database/schema and migration ID, inspect the
generated SQL and affected objects, verify the target-bound recovery point, and
obtain explicit approval for that destructive operation. Do not inherit approval
from migration planning or from a previous `up()` execution.

### Sequelize Migrations
```javascript
// migrations/20231201-create-users.js
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      email: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Destructive example: execute only after the immediate rollback gate above.
    await queryInterface.dropTable('users');
  }
};

// Run: npx sequelize-cli db:migrate
// Rollback: npx sequelize-cli db:migrate:undo
```

### TypeORM Migrations
```typescript
// migrations/1701234567-CreateUsers.ts
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateUsers1701234567 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment'
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP'
          }
        ]
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Destructive example: execute only after the immediate rollback gate above.
    await queryRunner.dropTable('users');
  }
}

// Run: npm run typeorm migration:run
// Rollback: npm run typeorm migration:revert
```

### Prisma Migrations
```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  createdAt DateTime @default(now())
}

// Generate migration: npx prisma migrate dev --name create_users
// Apply: npx prisma migrate deploy
```

## Schema Transformations

### Adding Columns with Defaults
```javascript
// Safe migration: add column with default
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'active',
      allowNull: false
    });
  },

  down: async (queryInterface) => {
    // Destructive example: execute only after the immediate rollback gate above.
    await queryInterface.removeColumn('users', 'status');
  }
};
```

### Expand-and-Contract Workflow

Use this sequence for column renames, type changes, and non-trivial data
transformations. Do not combine the phases into one migration.

1. **Bind the target and recovery objective.** Record the engine/version,
   environment, database/schema, affected tables, expected row count, lock and
   replication constraints, authorized operator, recovery point objective, and
   recovery time objective. Verify a restorable backup or engine-native recovery
   mechanism before changing production.
2. **Expand.** Add nullable or otherwise backward-compatible schema. Assess the
   engine-specific lock/rewrite behavior first; use online DDL only when the
   selected engine and version support it.
3. **Dual-write.** Deploy application code that writes both old and new shapes.
   Make retries safe at the application boundary and monitor write divergence.
4. **Backfill in bounded batches.** Use stable key ranges or checkpoints, limit
   transaction size, rate-limit against production load, and persist progress.
   Each batch must be restartable without corrupting already migrated rows.
5. **Verify.** Compare counts, null rates, checksums or domain invariants, sample
   transformed values, replication lag, errors, and application metrics. Stop on
   divergence; do not advance merely because the backfill command completed.
6. **Cut over.** After explicit approval for the bound target, switch reads to the
   new shape while retaining dual-write and the old schema for the observation
   window. Define the rollback trigger and owner before cutover.
7. **Contract.** Only after the observation window and a second approval, stop
   old writes and remove obsolete columns, constraints, or code in a separate
   migration. Destructive cleanup is not part of the initial rollout.

For recovery, prefer stopping the rollout and reverting application reads/writes
to the still-present old shape. If data restore is required, use the verified,
engine-native recovery procedure for the recorded target and recovery point.
Never reconstruct a production table with `CREATE TABLE ... AS`: that can lose
indexes, constraints, triggers, ownership, privileges, and engine-specific state.

## Rollback Strategies

### Transaction-Based Migrations
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        'users',
        'verified',
        { type: Sequelize.BOOLEAN, defaultValue: false },
        { transaction }
      );

      await queryInterface.sequelize.query(
        'UPDATE users SET verified = true WHERE email_verified_at IS NOT NULL',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    // Destructive example: execute only after the immediate rollback gate above.
    await queryInterface.removeColumn('users', 'verified');
  }
};
```

### Rollback and Recovery Boundaries

- A `down()` migration is appropriate only when the engine and operation can
  reverse the change without losing writes or transformed data.
- For destructive, lossy, or long-running operations, use a forward fix or the
  target-bound recovery plan instead of pretending a generic `down()` is safe.
- Transactional DDL support, lock behavior, and rollback semantics vary by
  engine, version, storage engine, and operation. Verify them for the exact
  target before relying on a transaction.
- A migration need not be globally rerunnable. Require idempotency only where
  the selected migration framework and operation support it; otherwise rely on
  the framework's migration ledger plus explicit, restartable batch checkpoints.

## Cross-Database Migrations

### PostgreSQL to MySQL
```javascript
// Handle differences
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialectName = queryInterface.sequelize.getDialect();

    if (dialectName === 'mysql') {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        data: {
          type: Sequelize.JSON  // MySQL JSON type
        }
      });
    } else if (dialectName === 'postgres') {
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        data: {
          type: Sequelize.JSONB  // PostgreSQL JSONB type
        }
      });
    }
  }
};
```

## Best Practices

1. **Define Recovery**: Choose rollback, forward fix, or restore based on the exact engine and operation
2. **Test Migrations**: Test on staging first
3. **Use Transactions Carefully**: Rely on transactional DDL only when verified for the target
4. **Verify Recovery**: Confirm the backup or engine-native recovery path and its recovery point
5. **Small Changes**: Break into small, incremental steps
6. **Monitor**: Watch for errors during deployment
7. **Document**: Explain why and how
8. **Make Restarts Explicit**: Use framework state and batch checkpoints appropriate to the operation

## Common Pitfalls

- Not testing rollback procedures
- Making breaking changes without downtime strategy
- Forgetting to handle NULL values
- Not considering index performance
- Ignoring foreign key constraints
- Migrating too much data at once

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
