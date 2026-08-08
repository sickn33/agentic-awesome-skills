---
name: hono
description: "Build ultra-fast web APIs and full-stack apps with Hono — runs on Cloudflare Workers, Deno, Bun, Node.js, and any WinterCG-compatible runtime."
category: backend
risk: safe
source: community
date_added: "2026-03-18"
author: suhaibjanjua
tags: [hono, edge, cloudflare-workers, bun, deno, api, typescript, web-standards]
tools: [claude, cursor, gemini]
---

# Hono Web Framework

## Overview

Hono (炎, "flame" in Japanese) is a small, ultrafast web framework built on Web Standards (`Request`/`Response`/`fetch`). It runs anywhere: Cloudflare Workers, Deno Deploy, Bun, Node.js, AWS Lambda, and any WinterCG-compatible runtime — with the same code. Hono's router is one of the fastest available, and its middleware system, built-in JSX support, and RPC client make it a strong choice for edge APIs, BFFs, and lightweight full-stack apps.

## When to Use This Skill

- Use when building a REST or RPC API for edge deployment (Cloudflare Workers, Deno Deploy)
- Use when you need a minimal but type-safe server framework for Bun or Node.js
- Use when building a Backend for Frontend (BFF) layer with low latency requirements
- Use when migrating from Express but wanting better TypeScript support and edge compatibility
- Use when the user asks about Hono routing, middleware, `c.req`, `c.json`, or `hc()` RPC client

## How It Works

### Step 1: Project Setup

**Cloudflare Workers (recommended for edge):**
```bash
npm create hono@latest my-api
# Select: cloudflare-workers
cd my-api
npm install
npm run dev    # Wrangler local dev
npm run deploy # Deploy to Cloudflare
```

**Bun / Node.js:**
```bash
mkdir my-api && cd my-api
bun init
bun add hono
```

```typescript
// src/index.ts (Bun)
import { Hono } from 'hono';

const app = new Hono();

app.get('/', c => c.text('Hello Hono!'));

export default {
  port: 3000,
  fetch: app.fetch,
};
```

### Step 2: Routing

```typescript
import { Hono } from 'hono';

const app = new Hono();

// Basic methods
app.get('/posts', c => c.json({ posts: [] }));
app.post('/posts', c => c.json({ created: true }, 201));
app.put('/posts/:id', c => c.json({ updated: true }));
app.delete('/posts/:id', c => c.json({ deleted: true }));

// Route params and query strings
app.get('/posts/:id', async c => {
  const id = c.req.param('id');
  const format = c.req.query('format') ?? 'json';
  return c.json({ id, format });
});

// Wildcard
app.get('/static/*', c => c.text('static file'));

export default app;
```

**Chained routing:**
```typescript
app
  .get('/users', listUsers)
  .post('/users', createUser)
  .get('/users/:id', getUser)
  .patch('/users/:id', updateUser)
  .delete('/users/:id', deleteUser);
```

### Step 3: Middleware

Hono middleware works exactly like `fetch` interceptors — before and after handlers:

```typescript
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';

const app = new Hono();

// Built-in middleware
app.use('*', logger());
app.use('/api/*', cors({ origin: 'https://myapp.com' }));
app.use('/api/admin/*', bearerAuth({ token: process.env.API_TOKEN! }));

// Custom middleware
app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
  c.header('X-Request-Id', c.get('requestId'));
});
```

**Available built-in middleware:** `logger`, `cors`, `csrf`, `etag`, `cache`, `basicAuth`, `bearerAuth`, `jwt`, `compress`, `bodyLimit`, `timeout`, `prettyJSON`, `secureHeaders`.

### Step 4: Request and Response Helpers

```typescript
app.post('/submit', async c => {
  // Parse body
  const body = await c.req.json<{ name: string; email: string }>();
  const form = await c.req.formData();
  const text = await c.req.text();

  // Headers and cookies
  const auth = c.req.header('authorization');
  const token = getCookie(c, 'session');

  // Responses
  return c.json({ ok: true });                        // JSON
  return c.text('hello');                             // plain text
  return c.html('<h1>Hello</h1>');                    // HTML
  return c.redirect('/dashboard', 302);              // redirect
  return new Response(stream, { status: 200 });       // raw Response
});
```

### Step 5: Zod Validator Middleware

```typescript
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

app.post(
  '/posts',
  zValidator('json', createPostSchema),
  async c => {
    const data = c.req.valid('json'); // fully typed
    const post = await db.post.create({ data });
    return c.json(post, 201);
  }
);
```

### Step 6: Route Groups and App Composition

```typescript
// src/routes/posts.ts
import { Hono } from 'hono';

const posts = new Hono();

posts.get('/', async c => { /* list posts */ });
posts.post('/', async c => { /* create post */ });
posts.get('/:id', async c => { /* get post */ });

export default posts;
```

```typescript
// src/index.ts
import { Hono } from 'hono';
import posts from './routes/posts';
import users from './routes/users';

const app = new Hono().basePath('/api');

app.route('/posts', posts);
app.route('/users', users);

export default app;
```

### Step 7: RPC Client (End-to-End Type Safety)

Hono's RPC mode exports route types that the `hc` client consumes — similar to tRPC but using fetch conventions:

```typescript
// server: src/routes/posts.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const posts = new Hono()
  .get('/', c => c.json({ posts: [{ id: '1', title: 'Hello' }] }))
  .post(
    '/',
    zValidator('json', z.object({ title: z.string() })),
    async c => {
      const { title } = c.req.valid('json');
      return c.json({ id: '2', title }, 201);
    }
  );

export default posts;
export type PostsType = typeof posts;
```

```typescript
// client: src/client.ts
import { hc } from 'hono/client';
import type { PostsType } from '../server/routes/posts';

const client = hc<PostsType>('/api/posts');

// Fully typed — autocomplete on routes, params, and responses
const { posts } = await client.$get().json();
const newPost = await client.$post({ json: { title: 'New Post' } }).json();
```

## Examples

### Example 1: JWT Auth Middleware

```typescript
import { Hono } from 'hono';
import { jwt, sign } from 'hono/jwt';

const app = new Hono();
const SECRET = process.env.JWT_SECRET!;

app.post('/login', async c => {
  const { email, password } = await c.req.json();
  const user = await validateUser(email, password);
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  const token = await sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET);
  return c.json({ token });
});

app.use('/api/*', jwt({ secret: SECRET }));
app.get('/api/me', async c => {
  const payload = c.get('jwtPayload');
  const user = await getUserById(payload.sub);
  return c.json(user);
});

export default app;
```

### Example 2: Cloudflare Workers with D1 Database

```typescript
// src/index.ts
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  API_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/users', async c => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users LIMIT 50').all();
  return c.json(results);
});

app.post('/users', async c => {
  const { name, email } = await c.req.json();
  await c.env.DB.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
    .bind(name, email)
    .run();
  return c.json({ created: true }, 201);
});

export default app;
```

### Example 3: Streaming Response

```typescript
import { stream, streamText } from 'hono/streaming';

app.get('/stream', c =>
  streamText(c, async stream => {
    for (const chunk of ['Hello', ' ', 'World']) {
      await stream.write(chunk);
      await stream.sleep(100);
    }
  })
);
```

## Best Practices

- ✅ Use route groups (sub-apps) to keep handlers in separate files — `app.route('/users', usersRouter)`
- ✅ Use `zValidator` for all request body, query, and param validation
- ✅ Type Cloudflare Workers bindings with the `Bindings` generic: `new Hono<{ Bindings: Env }>()`
- ✅ Use the RPC client (`hc`) when your frontend and backend share the same repo
- ✅ Prefer returning `c.json()`/`c.text()` over `new Response()` for cleaner code
- ❌ Don't use Node.js-specific APIs (`fs`, `path`, `process`) if you want edge portability
- ❌ Don't add heavy dependencies — Hono's value is its tiny footprint on edge runtimes
- ❌ Don't skip middleware typing — use generics (`Variables`, `Bindings`) to keep `c.get()` type-safe

## Security & Safety Notes

- Always validate input with `zValidator` before using data from requests.
- Use Hono's built-in `csrf` middleware on mutation endpoints when serving HTML/forms.
- For Cloudflare Workers, store secrets in `wrangler.toml` `[vars]` (non-secret) or `wrangler secret put` (secret) — never hardcode them in source.
- When using `bearerAuth` or `jwt`, ensure tokens are validated server-side — do not trust client-provided user IDs.
- Rate-limit sensitive endpoints (auth, password reset) with Cloudflare Rate Limiting or a custom middleware.

## Common Pitfalls

- **Problem:** Handler returns `undefined` — response is empty
  **Solution:** Always `return` a response from handlers: `return c.json(...)` not just `c.json(...)`.

- **Problem:** Middleware runs after the response is sent
  **Solution:** Call `await next()` before post-response logic; Hono runs code after `next()` as the response travels back up the chain.

- **Problem:** `c.env` is undefined on Node.js
  **Solution:** Cloudflare `env` bindings only exist in Workers. Use `process.env` on Node.js.

- **Problem:** Route not matching — gets a 404
  **Solution:** Check that `app.route('/prefix', subRouter)` uses the same prefix your client calls. Sub-routers should **not** repeat the prefix in their own routes.

## Related Skills

- `@cloudflare-workers-expert` — Deep dive into Cloudflare Workers platform specifics
- `@trpc-fullstack` — Alternative RPC approach for TypeScript full-stack apps
- `@zod-validation-expert` — Detailed Zod schema patterns used with `@hono/zod-validator`
- `@nodejs-backend-patterns` — When you need a Node.js-specific backend (not edge)

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
