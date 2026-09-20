---
name: cloudflare-pages
description: Deploy static sites and full-stack apps on Cloudflare Pages with previews,
  functions, and custom domains.
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

# Cloudflare Pages

Deploy frontend projects with preview builds, edge functions, and global CDN delivery on Cloudflare's network.

## When to Use

- Deploying static sites (React, Vue, Astro, Hugo, Next.js static export).
- Full-stack applications using Pages Functions for server-side logic.
- Projects that need automatic preview deployments per pull request.
- Teams that want zero-config CDN with custom domain and TLS.
- Migrating from Vercel, Netlify, or GitHub Pages to Cloudflare's ecosystem.

## Prerequisites

- Node.js 18+ and npm installed locally.
- A Cloudflare account (free tier works for most projects).
- Wrangler CLI installed: `npm install -g wrangler`.
- Authenticated via `wrangler login` or `CLOUDFLARE_API_TOKEN` environment variable.
- Source code in a Git repository (GitHub or GitLab for dashboard integration).

## Project Setup via Wrangler

### Create a New Project

```bash
# Create a new Pages project
npx wrangler pages project create my-site

# List existing projects
npx wrangler pages project list

# Delete a project (removes all deployments)
npx wrangler pages project delete my-site
```

### Deploy from Local Build Output

```bash
# Build your framework first
npm run build

# Deploy the output directory
npx wrangler pages deploy dist --project-name=my-site

# Deploy with a custom branch name (triggers preview URL)
npx wrangler pages deploy dist --project-name=my-site --branch=feature-auth

# Deploy and get the deployment URL in JSON
npx wrangler pages deploy dist --project-name=my-site --branch=main 2>&1 | tail -1
```

### List and Manage Deployments

```bash
# List recent deployments
npx wrangler pages deployment list --project-name=my-site

# Tail live logs from a deployment
npx wrangler pages deployment tail --project-name=my-site --environment=production
```

## Dashboard Git Integration

1. Navigate to **Workers & Pages > Create application > Pages**.
2. Connect your GitHub or GitLab account.
3. Select the repository and configure:
   - **Production branch**: `main`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist` (or `build`, `.next`, `public` depending on framework)
4. Set environment variables per environment (Production vs Preview).

### Framework Presets

Cloudflare auto-detects frameworks. Override if needed:

| Framework  | Build Command        | Output Directory |
|------------|----------------------|------------------|
| React CRA  | `npm run build`      | `build`          |
| Vite       | `npm run build`      | `dist`           |
| Next.js    | `npx @cloudflare/next-on-pages` | `.vercel/output/static` |
| Astro      | `npm run build`      | `dist`           |
| Hugo       | `hugo`               | `public`         |
| SvelteKit  | `npm run build`      | `.svelte-kit/cloudflare` |

## Preview Deployments

Every non-production branch gets a unique preview URL automatically.

```
# URL format for preview deployments
https://<commit-hash>.<project-name>.pages.dev
https://<branch-name>.<project-name>.pages.dev
```

### Branch-Based Access Control

```bash
# Set preview branch patterns in wrangler.toml (Pages-specific)
# Or configure via dashboard: Settings > Builds & deployments
# Include branches: feature/*, staging
# Exclude branches: dependabot/*
```

### Preview Comment on Pull Requests

Enable the Cloudflare Pages GitHub App to post deployment URLs as PR comments. Configure under **Settings > Builds & deployments > Preview comment**.

## Pages Functions

Pages Functions provide server-side logic deployed alongside your static site. Place files in a `functions/` directory at the project root.

### Basic API Route

```typescript
// functions/api/hello.ts
export const onRequestGet: PagesFunction = async (context) => {
  return new Response(JSON.stringify({ message: "Hello from the edge" }), {
    headers: { "Content-Type": "application/json" },
  });
};

// functions/api/users/[id].ts — dynamic route parameter
export const onRequestGet: PagesFunction = async (context) => {
  const userId = context.params.id;
  return new Response(JSON.stringify({ userId }), {
    headers: { "Content-Type": "application/json" },
  });
};
```

### Middleware

```typescript
// functions/_middleware.ts — runs before all routes
export const onRequest: PagesFunction = async (context) => {
  const authHeader = context.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }
  return context.next();
};
```

### Functions with Bindings

```typescript
// functions/api/data.ts — using KV and D1 bindings
interface Env {
  MY_KV: KVNamespace;
  MY_DB: D1Database;
  MY_BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Read from KV
  const cached = await context.env.MY_KV.get("key");
  if (cached) return new Response(cached);

  // Query D1
  const result = await context.env.MY_DB.prepare(
    "SELECT * FROM items LIMIT 10"
  ).all();

  // Cache in KV
  await context.env.MY_KV.put("key", JSON.stringify(result.results), {
    expirationTtl: 300,
  });

  return Response.json(result.results);
};
```

## Wrangler Configuration

```toml
# wrangler.toml — Pages project configuration
name = "my-site"
compatibility_date = "2024-09-01"
pages_build_output_dir = "dist"

# KV namespace binding
[[kv_namespaces]]
binding = "MY_KV"
id = "abc123def456"

# D1 database binding
[[d1_databases]]
binding = "MY_DB"
database_name = "my-app-db"
database_id = "xxxx-yyyy-zzzz"

# R2 bucket binding
[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "app-assets"

# Environment variables
[vars]
API_BASE_URL = "https://api.example.com"
```

## Headers and Redirects

### Custom Headers

```
# public/_headers
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'

/api/*
  Access-Control-Allow-Origin: https://example.com
  Access-Control-Allow-Methods: GET, POST, OPTIONS
```

### Redirects

```
# public/_redirects
/old-page  /new-page  301
/blog/:slug  /posts/:slug  301
/docs/*  https://docs.example.com/:splat  302
/home  /  302
```

## Custom Domains

```bash
# Add a custom domain via Cloudflare dashboard:
# Pages project > Custom domains > Set up a custom domain

# Or via API
curl -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/my-site/domains" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"www.example.com"}'
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages
on:
  push:
    branches: [main]
  pull_request:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=my-site
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Build fails with out-of-memory | Build exceeds 1 GB RAM limit | Reduce dependencies; use `NODE_OPTIONS=--max_old_space_size=768` |
| Functions return 404 | `functions/` directory not at project root | Move `functions/` to repo root, not inside `src/` |
| Preview URL shows old content | Browser cache or stale deployment | Hard refresh; check deployment list for latest commit hash |
| Custom domain shows SSL error | DNS not proxied through Cloudflare | Enable orange cloud (proxy) on the CNAME record |
| `_headers` file ignored | File not in build output directory | Place in `public/` so it copies to `dist/` during build |
| Bindings undefined in Functions | Missing `wrangler.toml` or dashboard config | Add bindings in `wrangler.toml` and redeploy |
| 1 MB function size limit exceeded | Too many dependencies bundled | Tree-shake; move large deps to KV or R2 |

## Related Skills

- cloudflare-workers (`cloudflare-workers`) - Edge backend logic and API routes
- cloudflare-r2 (`cloudflare-r2`) - Object storage for assets and uploads
- cloudflare-zero-trust (`cloudflare-zero-trust`) - Protect preview deployments with Access policies
- cdn-setup (`cdn-setup`) - General CDN configuration patterns

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

