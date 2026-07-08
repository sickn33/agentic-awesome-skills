---
name: drizzle-orm-expert
description: "Expert in Drizzle ORM for TypeScript — schema design, relational queries, migrations, and serverless database integration. Use when building type-safe database layers with Drizzle."
risk: safe
source: community
date_added: "2026-03-04"
---

# Drizzle ORM Expert

You are a production-grade Drizzle ORM expert. You help developers build type-safe, performant database layers using Drizzle ORM with TypeScript. You know schema design, the relational query API, Drizzle Kit migrations, and integrations with Next.js, tRPC, and serverless databases (Neon, PlanetScale, Turso, Supabase).

## When to Use This Skill

- Use when the user asks to set up Drizzle ORM in a new or existing project
- Use when designing database schemas with Drizzle's TypeScript-first approach
- Use when writing complex relational queries (joins, subqueries, aggregations)
- Use when setting up or troubleshooting Drizzle Kit migrations
- Use when integrating Drizzle with Next.js App Router, tRPC, or Hono
- Use when optimizing database performance (prepared statements, batching, connection pooling)
- Use when migrating from Prisma, TypeORM, or Knex to Drizzle

## Core Concepts

### Why Drizzle

Drizzle ORM is a TypeScript-first ORM that generates zero runtime overhead. Unlike Prisma (which uses a query engine binary), Drizzle compiles to raw SQL — making it ideal for edge runtimes and serverless. Key advantages:

- **SQL-like API**: If you know SQL, you know Drizzle
- **Zero dependencies**: Tiny bundle, works in Cloudflare Workers, Vercel Edge, Deno
- **Full type inference**: Schema → types → queries are all connected at compile time
- **Relational Query API**: Prisma-like nested includes without N+1 problems

## Schema Design Patterns

### Table Definitions

```typescript
// db/schema.ts
import { pgTable, text, integer, timestamp, boolean, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const roleEnum = pgEnum("role", ["admin", "user", "moderator"]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Posts table with foreign key
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  published: boolean("published").default(false).notNull(),
  authorId: uuid("author_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Relations

```typescript
// db/relations.ts
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### Type Inference

```typescript
// Infer types directly from your schema — no separate type files needed
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;
```

## Query Patterns

### Select Queries (SQL-like API)

```typescript
import { eq, and, like, desc, count, sql } from "drizzle-orm";

// Basic select
const allUsers = await db.select().from(users);

// Filtered with conditions
const admins = await db.select().from(users).where(eq(users.role, "admin"));

// Partial select (only specific columns)
const emails = await db.select({ email: users.email }).from(users);

// Join query
const postsWithAuthors = await db
  .select({
    title: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt))
  .limit(10);

// Aggregation
const postCounts = await db
  .select({
    authorId: posts.authorId,
    postCount: count(posts.id),
  })
  .from(posts)
  .groupBy(posts.authorId);
```

### Relational Queries (Prisma-like API)

```typescript
// Nested includes — Drizzle resolves in a single query
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: [desc(posts.createdAt)],
      limit: 5,
    },
  },
});

// Find one with nested data
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: { posts: true },
});
```

### Insert, Update, Delete

```typescript
// Insert with returning
const [newUser] = await db
  .insert(users)
  .values({ email: "dev@example.com", name: "Dev" })
  .returning();

// Batch insert
await db.insert(posts).values([
  { title: "Post 1", authorId: newUser.id },
  { title: "Post 2", authorId: newUser.id },
]);

// Update
await db.update(users).set({ name: "Updated" }).where(eq(users.id, userId));

// Delete
await db.delete(posts).where(eq(posts.authorId, userId));
```

### Transactions

```typescript
const result = await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({ email, name }).returning();
  await tx.insert(posts).values({ title: "Welcome Post", authorId: user.id });
  return user;
});
```

## Migration Workflow (Drizzle Kit)

### Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Commands

```bash
# Generate migration SQL from schema changes
npx drizzle-kit generate

# Push schema directly to database (development only — skips migration files)
npx drizzle-kit push

# Run pending migrations (production)
npx drizzle-kit migrate

# Open Drizzle Studio (GUI database browser)
npx drizzle-kit studio
```

## Database Client Setup

### PostgreSQL (Neon Serverless)

```typescript
// db/index.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### SQLite (Turso/LibSQL)

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
export const db = drizzle(client, { schema });
```

### MySQL (PlanetScale)

```typescript
import { drizzle } from "drizzle-orm/planetscale-serverless";
import { Client } from "@planetscale/database";
import * as schema from "./schema";

const client = new Client({ url: process.env.DATABASE_URL! });
export const db = drizzle(client, { schema });
```

## Performance Optimization

### Prepared Statements

```typescript
// Prepare once, execute many times
const getUserById = db.query.users
  .findFirst({
    where: eq(users.id, sql.placeholder("id")),
  })
  .prepare("get_user_by_id");

// Execute with parameters
const user = await getUserById.execute({ id: "abc-123" });
```

### Batch Operations

```typescript
// Use db.batch() for multiple independent queries in one round-trip
const [allUsers, recentPosts] = await db.batch([
  db.select().from(users),
  db.select().from(posts).orderBy(desc(posts.createdAt)).limit(10),
]);
```

### Indexing in Schema

```typescript
import { index, uniqueIndex } from "drizzle-orm/pg-core";

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    authorId: uuid("author_id").references(() => users.id).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("posts_author_idx").on(table.authorId),
    index("posts_created_idx").on(table.createdAt),
  ]
);
```

## Next.js Integration

### Server Component Usage

```typescript
// app/users/page.tsx (React Server Component)
import { db } from "@/db";
import { users } from "@/db/schema";

export default async function UsersPage() {
  const allUsers = await db.select().from(users);
  return (
    <ul>
      {allUsers.map((u) => (
        <li key={u.id}>{u.name}</li>
      ))}
    </ul>
  );
}
```

### Server Action

```typescript
// app/actions.ts
"use server";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function createUser(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  await db.insert(users).values({ name, email });
}
```

## Best Practices

- ✅ **Do:** Keep all schema definitions in a single `db/schema.ts` or split by domain (`db/schema/users.ts`, `db/schema/posts.ts`)
- ✅ **Do:** Use `InferSelectModel` and `InferInsertModel` for type safety instead of manual interfaces
- ✅ **Do:** Use the relational query API (`db.query.*`) for nested data to avoid N+1 problems
- ✅ **Do:** Use prepared statements for frequently executed queries in production
- ✅ **Do:** Use `drizzle-kit generate` + `migrate` in production (never `push`)
- ✅ **Do:** Pass `{ schema }` to `drizzle()` to enable the relational query API
- ❌ **Don't:** Use `drizzle-kit push` in production — it can cause data loss
- ❌ **Don't:** Write raw SQL when the Drizzle query builder supports the operation
- ❌ **Don't:** Forget to define `relations()` if you want to use `db.query.*` with `with`
- ❌ **Don't:** Create a new database connection per request in serverless — use connection pooling

## Troubleshooting

**Problem:** `db.query.tableName` is undefined
**Solution:** Pass all schema objects (including relations) to `drizzle()`: `drizzle(client, { schema })`

**Problem:** Migration conflicts after schema changes
**Solution:** Run `npx drizzle-kit generate` to create a new migration, then `npx drizzle-kit migrate`

**Problem:** Type errors on `.returning()` with MySQL
**Solution:** MySQL does not support `RETURNING`. Use `.execute()` and read `insertId` from the result instead.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
