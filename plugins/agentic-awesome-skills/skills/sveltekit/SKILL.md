---
name: sveltekit
description: "Build full-stack web applications with SvelteKit — file-based routing, SSR, SSG, API routes, and form actions in one framework."
category: frontend
risk: safe
source: community
date_added: "2026-03-18"
author: suhaibjanjua
tags: [svelte, sveltekit, fullstack, ssr, ssg, typescript]
tools: [claude, cursor, gemini]
---

# SvelteKit Full-Stack Development

## Overview

SvelteKit is the official full-stack framework built on top of Svelte. It provides file-based routing, server-side rendering (SSR), static site generation (SSG), API routes, and progressive form actions — all with Svelte's compile-time reactivity model that ships zero runtime overhead to the browser. Use this skill when building fast, modern web apps where both DX and performance matter.

## When to Use This Skill

- Use when building a new full-stack web application with Svelte
- Use when you need SSR or SSG with fine-grained control per route
- Use when migrating a SPA to a framework with server capabilities
- Use when working on a project that needs file-based routing and collocated API endpoints
- Use when the user asks about `+page.svelte`, `+layout.svelte`, `load` functions, or form actions

## How It Works

### Step 1: Project Setup

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

Choose **Skeleton project** + **TypeScript** + **ESLint/Prettier** when prompted.

Directory structure after scaffolding:

```
src/
  routes/
    +page.svelte        ← Root page component
    +layout.svelte      ← Root layout (wraps all pages)
    +error.svelte       ← Error boundary
  lib/
    server/             ← Server-only code (never bundled to client)
    components/         ← Shared components
  app.html              ← HTML shell
static/                 ← Static assets
```

### Step 2: File-Based Routing

Every `+page.svelte` file in `src/routes/` maps directly to a URL:

```
src/routes/+page.svelte          → /
src/routes/about/+page.svelte    → /about
src/routes/blog/[slug]/+page.svelte  → /blog/:slug
src/routes/shop/[...path]/+page.svelte → /shop/* (catch-all)
```

**Route groups** (no URL segment): wrap in `(group)/` folder.
**Private routes** (not accessible as URLs): prefix with `_` or `(group)`.

### Step 3: Loading Data with `load` Functions

Use a `+page.ts` (universal) or `+page.server.ts` (server-only) file alongside the page:

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const post = await fetch(`/api/posts/${params.slug}`).then(r => r.json());

  if (!post) {
    error(404, 'Post not found');
  }

  return { post };
};
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;
</script>

<h1>{data.post.title}</h1>
<article>{@html data.post.content}</article>
```

### Step 4: API Routes (Server Endpoints)

Create `+server.ts` files for REST-style endpoints:

```typescript
// src/routes/api/posts/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const limit = Number(url.searchParams.get('limit') ?? 10);
  const posts = await db.post.findMany({ take: limit });
  return json(posts);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const post = await db.post.create({ data: body });
  return json(post, { status: 201 });
};
```

### Step 5: Form Actions

Form actions are the SvelteKit-native way to handle mutations — no client-side fetch required:

```typescript
// src/routes/contact/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');

    if (!email) {
      return fail(400, { email, missing: true });
    }

    await sendEmail(String(email));
    redirect(303, '/thank-you');
  }
};
```

```svelte
<!-- src/routes/contact/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  export let form: ActionData;
</script>

<form method="POST" use:enhance>
  <input name="email" type="email" />
  {#if form?.missing}<p class="error">Email is required</p>{/if}
  <button type="submit">Subscribe</button>
</form>
```

### Step 6: Layouts and Nested Routes

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import type { LayoutData } from './$types';
  export let data: LayoutData;
</script>

<nav>
  <a href="/">Home</a>
  <a href="/blog">Blog</a>
  {#if data.user}
    <a href="/dashboard">Dashboard</a>
  {/if}
</nav>

<slot />  <!-- child page renders here -->
```

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return { user: locals.user ?? null };
};
```

### Step 7: Rendering Modes

Control per-route rendering with page options:

```typescript
// src/routes/docs/+page.ts
export const prerender = true;   // Static — generated at build time
export const ssr = true;         // Default — rendered on server per request
export const csr = false;        // Disable client-side hydration entirely
```

## Examples

### Example 1: Protected Dashboard Route

```typescript
// src/routes/dashboard/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(303, '/login');
  }
  return { user: locals.user };
};
```

### Example 2: Hooks — Session Middleware

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session');
  if (token) {
    event.locals.user = await verifyToken(token);
  }
  return resolve(event);
};
```

### Example 3: Preloading and Invalidation

```svelte
<script lang="ts">
  import { invalidateAll } from '$app/navigation';

  async function refresh() {
    await invalidateAll(); // re-runs all load functions on the page
  }
</script>

<button on:click={refresh}>Refresh</button>
```

## Best Practices

- ✅ Use `+page.server.ts` for database/auth logic — it never ships to the client
- ✅ Use `$lib/server/` for shared server-only modules (DB client, auth helpers)
- ✅ Use form actions for mutations instead of client-side `fetch` — works without JS
- ✅ Type all `load` return values with generated `$types` (`PageData`, `LayoutData`)
- ✅ Use `event.locals` in hooks to pass server-side context to load functions
- ❌ Don't import server-only code in `+page.svelte` or `+layout.svelte` directly
- ❌ Don't store sensitive state in stores — use `locals` on the server
- ❌ Don't skip `use:enhance` on forms — without it, forms lose progressive enhancement

## Security & Safety Notes

- All code in `+page.server.ts`, `+server.ts`, and `$lib/server/` runs exclusively on the server — safe for DB queries, secrets, and session validation.
- Always validate and sanitize form data before database writes.
- Use `error(403)` or `redirect(303)` from `@sveltejs/kit` rather than returning raw error objects.
- Set `httpOnly: true` and `secure: true` on all auth cookies.
- CSRF protection is built-in for form actions — do not disable `checkOrigin` in production.

## Common Pitfalls

- **Problem:** `Cannot use import statement in a module` in `+page.server.ts`
  **Solution:** The file must be `.ts` or `.js`, not `.svelte`. Server files and Svelte components are separate.

- **Problem:** Store value is `undefined` on first SSR render
  **Solution:** Populate the store from the `load` function return value (`data` prop), not from client-side `onMount`.

- **Problem:** Form action does not redirect after submit
  **Solution:** Use `redirect(303, '/path')` from `@sveltejs/kit`, not a plain `return`. 303 is required for POST redirects.

- **Problem:** `locals.user` is undefined inside a `+page.server.ts` load function
  **Solution:** Set `event.locals.user` in `src/hooks.server.ts` before the `resolve()` call.

## Related Skills

- `@nextjs-app-router-patterns` — When you prefer React over Svelte for SSR/SSG
- `@trpc-fullstack` — Add end-to-end type safety to SvelteKit API routes
- `@auth-implementation-patterns` — Authentication patterns usable with SvelteKit hooks
- `@tailwind-patterns` — Styling SvelteKit apps with Tailwind CSS

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
