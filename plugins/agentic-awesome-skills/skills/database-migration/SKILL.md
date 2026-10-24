---
name: database-migration
description: "Master database schema and data migrations across ORMs (Sequelize, TypeORM, Prisma), including rollback strategies and zero-downtime deployments."
risk: critical
source: community
date_added: "2026-02-27"
---
## Supporting material availability

This catalog copy contains the inline guidance below, but does not include the following supporting paths. They are external prerequisites, not bundled files:

- `<support-root>/references/orm-switching.md`
- `<support-root>/references/schema-migration.md`
- `<support-root>/references/data-transformation.md`
- `<support-root>/references/rollback-strategies.md`
- `<support-root>/assets/schema-migration-template.sql`
- `<support-root>/assets/data-migration-script.py`
- `<support-root>/scripts/test-migration.sh`

Ask for the original supporting material or an existing installation before using a step that depends on these paths; this catalog does not identify a verified download source for them. Resolve each path relative to that installation, inspect its contents, and verify any applicable license and execution prerequisites. Do not run a command or claim a referenced procedure was followed until its required file exists. Do not fabricate the missing scripts or treat an unrelated file with the same name as equivalent. Independent steps fully documented here can proceed within the user’s authorized scope; report any dependent step as unavailable.


# Database Migration

Master database schema and data migrations across ORMs (Sequelize, TypeORM, Prisma), including rollback strategies and zero-downtime deployments.

## Do not use this skill when

- The task is unrelated to database migration
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.

## Use this skill when

- Migrating between different ORMs
- Performing schema transformations
- Moving data between databases
- Implementing rollback procedures
- Zero-downtime deployments
- Database version upgrades
- Data model refactoring

## ORM Migrations

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
// Illustrative migration: lock/rewrite behavior depends on engine/version/table size
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'active',
      allowNull: false
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'status');
  }
};
```

### Renaming Columns (Expand/Contract Sketch)

This sketch is not sufficient for concurrent writes. Deploy compatible dual writes before a bounded backfill, reconcile changes during backfill, switch reads only after validation, and drop the old column only after all readers/writers migrate. A one-time UPDATE alone can lose updates.
```javascript
// Step 1: Add new column
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'full_name', {
      type: Sequelize.STRING
    });

    // Copy data from old column
    await queryInterface.sequelize.query(
      'UPDATE users SET full_name = name'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'full_name');
  }
};

// Step 2: Update application to use new column

// Step 3: Remove old column
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'name');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'name', {
      type: Sequelize.STRING
    });
  }
};
```

### Changing Column Types

This example is a breaking, potentially lossy migration, not a zero-downtime recipe. Validate casts and range/null handling first. Preserve original values until a separately approved contract step; casting back cannot recover discarded data.
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For large tables, use multi-step approach

    // 1. Add new column
    await queryInterface.addColumn('users', 'age_new', {
      type: Sequelize.INTEGER
    });

    // 2. Copy and transform data
    await queryInterface.sequelize.query(`
      UPDATE users
      SET age_new = CAST(age AS INTEGER)
      WHERE age IS NOT NULL
    `);

    // 3. Drop old column
    await queryInterface.removeColumn('users', 'age');

    // 4. Rename new column
    await queryInterface.renameColumn('users', 'age_new', 'age');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('users', 'age', {
      type: Sequelize.STRING
    });
  }
};
```

## Data Transformations

### Complex Data Migration

Illustrative parsing only: define and validate an address schema first; splitting on commas is lossy. Use bounded batches with checkpoints and keep the source column until reconciliation and a tested recovery plan pass. The down() reconstruction below does not recover original formatting.
```javascript
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all records
    const [users] = await queryInterface.sequelize.query(
      'SELECT id, address_string FROM users'
    );

    // Transform each record
    for (const user of users) {
      const addressParts = user.address_string.split(',');

      await queryInterface.sequelize.query(
        `UPDATE users
         SET street = :street,
             city = :city,
             state = :state
         WHERE id = :id`,
        {
          replacements: {
            id: user.id,
            street: addressParts[0]?.trim(),
            city: addressParts[1]?.trim(),
            state: addressParts[2]?.trim()
          }
        }
      );
    }

    // Drop old column
    await queryInterface.removeColumn('users', 'address_string');
  },

  down: async (queryInterface, Sequelize) => {
    // Reconstruct original column
    await queryInterface.addColumn('users', 'address_string', {
      type: Sequelize.STRING
    });

    await queryInterface.sequelize.query(`
      UPDATE users
      SET address_string = CONCAT(street, ', ', city, ', ', state)
    `);

    await queryInterface.removeColumn('users', 'street');
    await queryInterface.removeColumn('users', 'city');
    await queryInterface.removeColumn('users', 'state');
  }
};
```

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
    await queryInterface.removeColumn('users', 'verified');
  }
};
```

### Checkpoint-Based Recovery

Use the database engine's tested backup/snapshot and point-in-time recovery procedure, verified in a disposable restore environment. Record the recovery point, schema, constraints, indexes, sequences, permissions and application compatibility before migration. A `CREATE TABLE AS SELECT` copy is not a complete backup and must never be used to DROP and recreate a live table during automatic error recovery. It omits important schema properties and can lose concurrent writes. Stop on uncertain partial state and reconcile before retrying.

## Zero-Downtime Migrations

### Blue-Green Deployment Strategy
```javascript
// Phase 1: Make changes backward compatible
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new column (both old and new code can work)
    await queryInterface.addColumn('users', 'email_new', {
      type: Sequelize.STRING
    });
  }
};

// Phase 2: Deploy code that writes to both columns

// Phase 3: Backfill data
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE users
      SET email_new = email
      WHERE email_new IS NULL
    `);
  }
};

// Phase 4: Deploy code that reads from new column

// Phase 5: Remove old column
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.removeColumn('users', 'email');
  }
};
```

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

## Resources

- **references/orm-switching.md**: ORM migration guides
- **references/schema-migration.md**: Schema transformation patterns
- **references/data-transformation.md**: Data migration scripts
- **references/rollback-strategies.md**: Rollback procedures
- **assets/schema-migration-template.sql**: SQL migration templates
- **assets/data-migration-script.py**: Data migration utilities
- **scripts/test-migration.sh**: Migration testing script

## Best Practices

1. **Plan Recovery**: Provide a tested down() only when genuinely reversible; otherwise document a forward fix or tested restore and the data-loss boundary
2. **Test Migrations**: Test on staging first
3. **Use Transactions**: Atomic migrations when possible
4. **Backup First**: Always backup before migration
5. **Small Changes**: Break into small, incremental steps
6. **Monitor**: Watch for errors during deployment
7. **Document**: Explain why and how
8. **Idempotent**: Migrations should be rerunnable

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
