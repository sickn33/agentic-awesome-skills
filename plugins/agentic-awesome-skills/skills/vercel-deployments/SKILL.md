---
name: vercel-deployments
description: Deploy frontend and full-stack apps on Vercel with previews, edge functions,
  environment promotion, and production guardrails.
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

# Vercel Deployments

Ship web apps quickly with preview environments and managed edge infrastructure.

## When to Use This Skill

Use this skill when:
- Deploying Next.js, SvelteKit, Nuxt, or static sites
- Setting up preview environments for every PR
- Configuring edge functions and serverless APIs
- Managing environment variables across preview/production
- Setting up custom domains and redirects

## Prerequisites

- Node.js 18+
- Vercel account (free tier works for personal projects)
- Git repository (GitHub, GitLab, or Bitbucket)

## Quick Start

```bash
# Install CLI
npm i -g vercel

# Login and link project
vercel login
vercel link

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Pull environment variables locally
vercel env pull .env.local
```

## Project Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "regions": ["iad1", "sfo1", "cdg1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" }
      ]
    }
  ],
  "redirects": [
    { "source": "/blog/:slug", "destination": "/posts/:slug", "permanent": true }
  ],
  "rewrites": [
    { "source": "/api/v1/:path*", "destination": "https://api.example.com/:path*" }
  ]
}
```

## Environment Variables

```bash
# Add environment variables
vercel env add DATABASE_URL production
vercel env add DATABASE_URL preview
vercel env add NEXT_PUBLIC_API_URL production

# List all env vars
vercel env ls

# Pull to local .env.local
vercel env pull .env.local

# Remove an env var
vercel env rm SECRET_KEY production
```

### Environment Separation Pattern

```bash
# Production — real credentials
vercel env add DATABASE_URL production <<< "postgresql://prod-host:5432/app"
vercel env add STRIPE_SECRET_KEY production

# Preview — staging/test credentials
vercel env add DATABASE_URL preview <<< "postgresql://staging-host:5432/app"
vercel env add STRIPE_SECRET_KEY preview   # Use test mode key

# Development — local values
vercel env add DATABASE_URL development <<< "postgresql://localhost:5432/app"
```

## Edge Functions

```typescript
// app/api/geo/route.ts — Edge API route (Next.js App Router)
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export function GET(request: NextRequest) {
  const country = request.geo?.country || 'US';
  const city = request.geo?.city || 'Unknown';

  return Response.json({
    country,
    city,
    region: request.geo?.region,
    timestamp: new Date().toISOString(),
  });
}
```

```typescript
// middleware.ts — Edge middleware for auth/redirects
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Block non-US traffic from admin
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (request.geo?.country !== 'US') {
      return NextResponse.redirect(new URL('/blocked', request.url));
    }
  }

  // Add security headers
  const response = NextResponse.next();
  response.headers.set('X-Request-Id', crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
```

## GitHub Actions Integration

```yaml
# .github/workflows/preview.yml
name: Vercel Preview
on: pull_request

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run test

      - name: Deploy to Vercel Preview
        id: deploy
        run: |
          npm i -g vercel
          URL=$(vercel --token ${{ secrets.VERCEL_TOKEN }} --yes)
          echo "url=$URL" >> "$GITHUB_OUTPUT"

      - name: Comment PR with preview URL
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Preview deployed: ${{ steps.deploy.outputs.url }}`
            });
```

## CLI Commands Reference

```bash
# Deployments
vercel                          # Deploy to preview
vercel --prod                   # Deploy to production
vercel rollback                 # Rollback last production deploy
vercel promote <url>            # Promote preview to production

# Domains
vercel domains add example.com
vercel domains ls
vercel certs ls

# Logs
vercel logs <deployment-url>
vercel logs <deployment-url> --follow

# Project management
vercel project ls
vercel project rm <name>

# Inspect deployment
vercel inspect <deployment-url>
```

## Production Guardrails

- Require preview checks before merge (GitHub branch protection)
- Separate preview and production environment variables — never share API keys
- Use branch protection with required deployment status checks
- Monitor function duration and cold start behavior in Vercel Analytics
- Set spend limits in Vercel dashboard to prevent cost surprises
- Enable Vercel Firewall for DDoS and bot protection
- Use `vercel.json` headers for security (CSP, HSTS, X-Frame-Options)

## Monitoring & Analytics

```bash
# Enable Speed Insights in Next.js
npm install @vercel/speed-insights

# Enable Web Analytics
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Build fails | Check `vercel logs`, verify Node.js version in `engines` field |
| Env vars missing | Run `vercel env pull`, check variable scope (preview vs production) |
| Edge function timeout | Edge has 30s limit; move heavy work to serverless (no `runtime = 'edge'`) |
| Cold starts slow | Use edge runtime where possible, reduce bundle size |
| Domain not working | Check DNS propagation, verify `vercel domains` configuration |

## Related Skills

- github-actions (`github-actions`) — Automated deployment gates
- cloudflare-pages (`cloudflare-pages`) — Alternative edge hosting
- ssl-tls-management (`ssl-tls-management`) — Custom certificate setup

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

