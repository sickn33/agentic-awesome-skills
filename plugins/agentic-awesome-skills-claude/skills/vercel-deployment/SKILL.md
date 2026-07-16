---
name: vercel-deployment
description: Expert knowledge for deploying to Vercel with Next.js
risk: safe
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Vercel Deployment

Expert knowledge for deploying to Vercel with Next.js

## Capabilities

- vercel
- deployment
- edge-functions
- serverless
- environment-variables

## Prerequisites

- Required skills: nextjs-app-router

## Patterns

### Environment Variables Setup

Properly configure environment variables for all environments

**When to use**: Setting up a new project on Vercel

// Three environments in Vercel:
// - Development (local)
// - Preview (PR deployments)
// - Production (main branch)

// In Vercel Dashboard:
// Settings → Environment Variables

// PUBLIC variables (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

// PRIVATE variables (server only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  // Never NEXT_PUBLIC_!
DATABASE_URL=postgresql://...

// Per-environment values:
// Production: Real database, production API keys
// Preview: Staging database, test API keys
// Development: Local/dev values (also in .env.local)

// In code, check environment:
const isProduction = process.env.VERCEL_ENV === 'production'
const isPreview = process.env.VERCEL_ENV === 'preview'

### Edge vs Serverless Functions

Choose the right runtime for your API routes

**When to use**: Creating API routes or middleware

// EDGE RUNTIME - Fast cold starts, limited APIs
// Good for: Auth checks, redirects, simple transforms

// app/api/hello/route.ts
export const runtime = 'edge'

export async function GET() {
  return Response.json({ message: 'Hello from Edge!' })
}

// middleware.ts (always edge)
export function middleware(request: NextRequest) {
  // Fast auth checks here
}

// SERVERLESS (Node.js) - Full Node APIs, slower cold start
// Good for: Database queries, file operations, heavy computation

// app/api/users/route.ts
export const runtime = 'nodejs'  // Default, can omit

export async function GET() {
  const users = await db.query('SELECT * FROM users')
  return Response.json(users)
}

### Build Optimization

Optimize build for faster deployments and smaller bundles

**When to use**: Preparing for production deployment

// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Minimize output
  output: 'standalone',  // For Docker/self-hosting

  // Image optimization
  images: {
    remotePatterns: [
      { hostname: 'your-cdn.com' },
    ],
  },

  // Bundle analyzer (dev only)
  // npm install @next/bundle-analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer')
      config.plugins.push(new BundleAnalyzerPlugin())
      return config
    },
  }),
}

// Reduce serverless function size:
// - Use dynamic imports for heavy libs
// - Check bundle with: npx @next/bundle-analyzer

### Preview Deployment Workflow

Use preview deployments for PR reviews

**When to use**: Setting up team development workflow

// Every PR gets a unique preview URL automatically

// Protect preview deployments with password:
// Vercel Dashboard → Settings → Deployment Protection

// Use different env vars for preview:
// - PREVIEW: Use staging database
// - PRODUCTION: Use production database

// In code, detect preview:
if (process.env.VERCEL_ENV === 'preview') {
  // Show "Preview" banner
  // Use test payment processor
  // Disable analytics
}

// Comment preview URL on PR (automatic with Vercel GitHub integration)

### Custom Domain Setup

Configure custom domains with proper SSL

**When to use**: Going to production

// In Vercel Dashboard → Domains

// Add domains:
// - example.com (apex/root)
// - www.example.com (subdomain)

// DNS Configuration (at your registrar):
// Type: A, Name: @, Value: 76.76.21.21
// Type: CNAME, Name: www, Value: cname.vercel-dns.com

// Redirect www to apex (or vice versa):
// Vercel handles this automatically

// In next.config.js for redirects:
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-page',
        destination: '/new-page',
        permanent: true,  // 308
      },
    ]
  },
}

## Sharp Edges

### NEXT_PUBLIC_ exposes secrets to the browser

Severity: CRITICAL

Situation: Using NEXT_PUBLIC_ prefix for sensitive API keys

Symptoms:
- Secrets visible in browser DevTools → Sources
- Security audit finds exposed keys
- Unexpected API access from unknown sources

Why this breaks:
Variables prefixed with NEXT_PUBLIC_ are inlined into the JavaScript
bundle at build time. Anyone can view them in browser DevTools.
This includes all your users and potential attackers.

Recommended fix:

Only use NEXT_PUBLIC_ for truly public values:

// SAFE to use NEXT_PUBLIC_
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  // Anon key is designed to be public
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_GA_ID=G-XXXXXXX

// NEVER use NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJ...     // Full database access!
STRIPE_SECRET_KEY=sk_live_...         // Can charge cards!
DATABASE_URL=postgresql://...          // Direct DB access!
JWT_SECRET=...                         // Can forge tokens!

// Access server-only vars in:
// - Server Components (app router)
// - API Routes
// - Server Actions ('use server')
// - getServerSideProps (pages router)

### Preview deployments using production database

Severity: HIGH

Situation: Not configuring separate environment variables for preview

Symptoms:
- Test data appearing in production
- Production data corrupted after PR merge
- Users seeing test accounts/content

Why this breaks:
Preview deployments run untested code. If they use production database,
a bug in a PR can corrupt production data. Also, testers might create
test data that shows up in production.

Recommended fix:

Set up separate databases for each environment:

// In Vercel Dashboard → Settings → Environment Variables

// Production (production env only):
DATABASE_URL=postgresql://prod-host/prod-db

// Preview (preview env only):
DATABASE_URL=postgresql://staging-host/staging-db

// Or use Vercel's branching databases:
// - Neon, PlanetScale, Supabase all support branch databases
// - Auto-create preview DB for each PR

// For Supabase, create a staging project:
// Production:
NEXT_PUBLIC_SUPABASE_URL=https://prod-xxx.supabase.co

// Preview:
NEXT_PUBLIC_SUPABASE_URL=https://staging-xxx.supabase.co

### Serverless function too large, slow cold starts

Severity: HIGH

Situation: API route or server component has slow initial load

Symptoms:
- First request takes 3-10+ seconds
- Subsequent requests are fast
- Function size limit exceeded error
- Deployment fails with size error

Why this breaks:
Vercel serverless functions have a 50MB limit (compressed).
Large functions mean slow cold starts (1-5+ seconds).
Heavy dependencies like puppeteer, sharp can cause this.

Recommended fix:

Reduce function size:

// 1. Use dynamic imports for heavy libs
export async function GET() {
  const sharp = await import('sharp')  // Only loads when needed
  // ...
}

// 2. Move heavy processing to edge or external service
export const runtime = 'edge'  // Much smaller, faster cold start

// 3. Check bundle size
// npx @next/bundle-analyzer
// Look for large dependencies

// 4. Use external services for heavy tasks
// - Image processing: Cloudinary, imgix
// - PDF generation: API service
// - Puppeteer: Browserless.io

// 5. Split into multiple functions
// /api/heavy-task/start - Queue the job
// /api/heavy-task/status - Check progress

### Edge runtime missing Node.js APIs

Severity: HIGH

Situation: Using Node.js APIs in edge runtime functions

Symptoms:
- X is not defined at runtime
- Cannot find module fs
- Works locally, fails deployed
- Middleware crashes

Why this breaks:
Edge runtime runs on V8, not Node.js. Many Node APIs are missing:
fs, path, crypto (partial), child_process, and most native modules.
Your code will fail at runtime with "X is not defined".

Recommended fix:

Check API compatibility before using edge:

// SUPPORTED in Edge:
// - fetch, Request, Response
// - crypto.subtle (Web Crypto)
// - TextEncoder, TextDecoder
// - URL, URLSearchParams
// - Headers, FormData
// - setTimeout, setInterval

// NOT SUPPORTED in Edge:
// - fs, path, os
// - Buffer (use Uint8Array)
// - crypto.createHash (use crypto.subtle)
// - Most npm packages with native deps

// If you need Node.js APIs:
export const runtime = 'nodejs'  // Use Node runtime instead

// For crypto hashing in edge:
// WRONG
import { createHash } from 'crypto'  // Fails in edge

// RIGHT
async function hash(message: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

### Function timeout causes incomplete operations

Severity: MEDIUM

Situation: Long-running operations timing out

Symptoms:
- Task timed out after X seconds
- Incomplete database operations
- Partial file uploads
- Function killed mid-execution

Why this breaks:
Vercel has timeout limits:
- Hobby: 10 seconds
- Pro: 60 seconds (can increase to 300)
- Enterprise: 900 seconds

Operations exceeding this are killed mid-execution.

Recommended fix:

Handle long operations properly:

// 1. Return early, process async
export async function POST(request: Request) {
  const data = await request.json()

  // Queue for background processing
  await queue.add('process-data', data)

  // Return immediately
  return Response.json({ status: 'queued' })
}

// 2. Use streaming for long responses
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      for (const chunk of generateChunks()) {
        controller.enqueue(chunk)
        await sleep(100)  // Prevents timeout
      }
      controller.close()
    }
  })
  return new Response(stream)
}

// 3. Use external services for heavy processing
// - Trigger serverless function, return job ID
// - Process in background (Inngest, Trigger.dev)
// - Client polls for completion

// 4. Increase timeout (Pro plan)
// vercel.json:
{
  "functions": {
    "app/api/slow/route.ts": {
      "maxDuration": 60
    }
  }
}

### Environment variable missing at runtime but present at build

Severity: MEDIUM

Situation: Environment variable works in build but undefined at runtime

Symptoms:
- Env var is undefined in production
- Value doesn't change after updating in dashboard
- Works in dev, wrong value in production
- Requires redeploy to update value

Why this breaks:
Some env vars are only available at build time (hardcoded into bundle).
If you expect a runtime value but it was baked in at build, you get
the build-time value or undefined.

Recommended fix:

Understand when env vars are read:

// BUILD TIME (baked into bundle):
// - NEXT_PUBLIC_* variables
// - next.config.js
// - generateStaticParams
// - Static pages

// RUNTIME (read on each request):
// - Server Components (without cache)
// - API Routes
// - Server Actions
// - Middleware

// To force runtime reading:
export const dynamic = 'force-dynamic'

// For config that must be runtime:
// Don't use NEXT_PUBLIC_, read on server and pass to client

// Check which env vars you need:
// Build: URLs, public keys, feature flags (if static)
// Runtime: Secrets, database URLs, user-specific config

### CORS errors calling API routes from different domain

Severity: MEDIUM

Situation: Frontend on different domain can't call API routes

Symptoms:
- CORS policy error in browser console
- No Access-Control-Allow-Origin header
- Requests work in Postman but not browser
- Works same-origin, fails cross-origin

Why this breaks:
By default, browsers block cross-origin requests. Vercel doesn't
automatically add CORS headers. If your frontend is on a different
domain (or localhost in dev), requests fail.

Recommended fix:

Add CORS headers to API routes:

// app/api/data/route.ts
export async function GET(request: Request) {
  const data = await fetchData()

  return Response.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',  // Or specific domain
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Handle preflight requests
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Or use next.config.js for all routes:
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ]
  },
}

### Page shows stale data after deployment

Severity: MEDIUM

Situation: Updated data not appearing after new deployment

Symptoms:
- Old content shows after deploy
- Changes not visible immediately
- Different users see different versions
- Data updates but page doesn't

Why this breaks:
Vercel caches aggressively. Static pages are cached at the edge.
Even dynamic pages may be cached if not configured properly.
Old cached versions served until cache expires or is purged.

Recommended fix:

Control caching behavior:

// Force no caching (always fresh)
export const dynamic = 'force-dynamic'
export const revalidate = 0

// ISR - revalidate every 60 seconds
export const revalidate = 60

// On-demand revalidation (after mutation)
import { revalidatePath, revalidateTag } from 'next/cache'

// In Server Action:
async function updatePost(id: string) {
  await db.post.update({ ... })
  revalidatePath(`/posts/${id}`)  // Purge this page
  revalidateTag('posts')          // Purge all with this tag
}

// Purge via API (deployment hook):
// POST https://your-site.vercel.app/api/revalidate?path=/posts

// Check caching in response headers:
// x-vercel-cache: HIT = served from cache
// x-vercel-cache: MISS = freshly generated

## Validation Checks

### Secret in NEXT_PUBLIC Variable

Severity: CRITICAL

Message: Secret exposed via NEXT_PUBLIC_ prefix. This will be visible in browser.

Fix action: Remove NEXT_PUBLIC_ prefix and access only in server-side code

### Hardcoded Vercel URL

Severity: WARNING

Message: Hardcoded Vercel URL. Use VERCEL_URL environment variable instead.

Fix action: Use process.env.VERCEL_URL or NEXT_PUBLIC_VERCEL_URL

### Node.js API in Edge Runtime

Severity: ERROR

Message: Node.js module used in Edge runtime. fs/path not available in Edge.

Fix action: Use runtime = 'nodejs' or remove Node.js dependencies

### API Route Without CORS Headers

Severity: WARNING

Message: API route without CORS headers may fail cross-origin requests.

Fix action: Add Access-Control-Allow-Origin header if API is called from other domains

### API Route Without Error Handling

Severity: WARNING

Message: API route without try/catch. Unhandled errors return 500 without details.

Fix action: Wrap in try/catch and return appropriate error responses

### Secret Read in Static Context

Severity: WARNING

Message: Server secret accessed in static generation. Value baked into build.

Fix action: Move secret access to runtime code or use NEXT_PUBLIC_ for public values

### Large Package Import

Severity: WARNING

Message: Large package imported. May cause slow cold starts. Consider alternatives.

Fix action: Use lodash-es with tree shaking, date-fns instead of moment, @aws-sdk/client-* instead of aws-sdk

### Dynamic Page Without Revalidation Config

Severity: WARNING

Message: Dynamic page without revalidation config. Consider setting revalidation strategy.

Fix action: Add export const revalidate = 60 for ISR, or 0 for no cache

## Collaboration

### Delegation Triggers

- next.js|app router|pages|server components -> nextjs-app-router (Deployment needs Next.js patterns)
- database|supabase|backend -> supabase-backend (Deployment needs database)
- auth|authentication|session -> nextjs-supabase-auth (Deployment needs auth config)
- monitoring|logs|errors|analytics -> analytics-architecture (Deployment needs monitoring)

### Production Launch

Skills: vercel-deployment, nextjs-app-router, supabase-backend, nextjs-supabase-auth

Workflow:

```
1. App configuration (nextjs-app-router)
2. Database setup (supabase-backend)
3. Auth config (nextjs-supabase-auth)
4. Deploy (vercel-deployment)
```

### CI/CD Pipeline

Skills: vercel-deployment, devops, qa-engineering

Workflow:

```
1. Test automation (qa-engineering)
2. Pipeline config (devops)
3. Deploy strategy (vercel-deployment)
```

## Related Skills

Works well with: `nextjs-app-router`, `supabase-backend`

## When to Use
- User mentions or implies: vercel
- User mentions or implies: deploy
- User mentions or implies: deployment
- User mentions or implies: hosting
- User mentions or implies: production
- User mentions or implies: environment variables
- User mentions or implies: edge function
- User mentions or implies: serverless function

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
