# Database Rules

## ORM: {{ORM_NAME}}

{{ORM_DESCRIPTION}}

## Schema Location

{{SCHEMA_LOCATION}}

{{MIGRATIONS_SECTION}}

## Conventions

{{DB_CONVENTIONS}}

## Relationships and Queries

{{QUERY_PATTERNS}}

## Generation Rules

- **ORM_NAME**: "Prisma", "Drizzle", "Knex", "TypeORM", "Mongoose", or "Raw SQL".
- **ORM_DESCRIPTION**: Database provider detected (postgresql, sqlite, mysql, mongodb).
- **SCHEMA_LOCATION**: Where the schema or DB config lives.
- **MIGRATIONS_SECTION**:
  - **Prisma**: `prisma migrate dev` for development, `prisma migrate deploy` for production. `prisma generate` to regenerate client.
  - **Drizzle**: `drizzle-kit generate` for migrations, `drizzle-kit push` for prototyping.
  - **Knex**: `knex migrate:make`, `knex migrate:latest`.
- **DB_CONVENTIONS**:
  - IDs: `uuid` vs `cuid` vs `autoincrement` vs `ObjectId`. Detect from schema.
  - Timestamps: `createdAt` + `updatedAt` automatically.
  - Naming: `snake_case` in DB, `camelCase` in code.
  - Enums: native DB enums vs strings vs TypeScript enums.
  - Soft deletes: if `deletedAt` field exists.
- **QUERY_PATTERNS**:
  - **Prisma**: `prisma.user.findMany({ where, include, select })`. Include vs select rules. Transactions with `prisma.$transaction`.
  - **Drizzle**: `db.select().from(users).where(eq(...))`. Relations with `relations`.
  - **Mongoose**: `Model.find()`, `Model.populate()`, `Model.aggregate()`.
  - **Raw SQL**: Use parameterized queries, never string interpolation.
