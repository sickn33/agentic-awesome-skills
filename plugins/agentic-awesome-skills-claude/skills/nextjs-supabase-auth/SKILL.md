---
name: nextjs-supabase-auth
description: Expert integration of Supabase Auth with Next.js App Router
risk: none
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Next.js + Supabase Auth

Expert integration of Supabase Auth with Next.js App Router

## Capabilities

- nextjs-auth
- supabase-auth-nextjs
- auth-middleware
- auth-callback

## Prerequisites

- Required skills: nextjs-app-router, supabase-backend

## Patterns

### Supabase Client Setup

Create properly configured Supabase clients for different contexts

**When to use**: Setting up auth in a Next.js project

// lib/supabase/client.ts (Browser client)
'use client'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server client)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}

### Auth Middleware

Protect routes and refresh sessions in middleware

**When to use**: You need route protection or session refresh

// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

### Auth Callback Route

Handle OAuth callback and exchange code for session

**When to use**: Using OAuth providers (Google, GitHub, etc.)

// app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`)
}

### Server Action Auth

Handle auth operations in Server Actions

**When to use**: Login, logout, or signup from Server Components

// app/actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

### Get User in Server Component

Access the authenticated user in Server Components

**When to use**: Rendering user-specific content server-side

// app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div>
      <h1>Welcome, {user.email}</h1>
    </div>
  )
}

## Validation Checks

### Using getSession() for Auth Checks

Severity: ERROR

Message: getSession() doesn't verify the JWT. Use getUser() for secure auth checks.

Fix action: Replace getSession() with getUser() for security-critical checks

### OAuth Without Callback Route

Severity: ERROR

Message: Using OAuth but missing callback route at app/auth/callback/route.ts

Fix action: Create app/auth/callback/route.ts to handle OAuth redirects

### Browser Client in Server Context

Severity: ERROR

Message: Browser client used in server context. Use createServerClient instead.

Fix action: Import and use createServerClient from @supabase/ssr

### Protected Routes Without Middleware

Severity: WARNING

Message: No middleware.ts found. Consider adding middleware for route protection.

Fix action: Create middleware.ts to protect routes and refresh sessions

### Hardcoded Auth Redirect URL

Severity: WARNING

Message: Hardcoded localhost redirect. Use origin for environment flexibility.

Fix action: Use window.location.origin or process.env.NEXT_PUBLIC_SITE_URL

### Auth Call Without Error Handling

Severity: WARNING

Message: Auth operation without error handling. Always check for errors.

Fix action: Destructure { data, error } and handle error case

### Auth Action Without Revalidation

Severity: WARNING

Message: Auth action without revalidatePath. Cache may show stale auth state.

Fix action: Add revalidatePath('/', 'layout') after auth operations

### Client-Only Route Protection

Severity: WARNING

Message: Client-side route protection shows flash of content. Use middleware.

Fix action: Move protection to middleware.ts for better UX

## Collaboration

### Delegation Triggers

- database|rls|queries|tables -> supabase-backend (Auth needs database layer)
- route|page|component|layout -> nextjs-app-router (Auth needs Next.js patterns)
- deploy|production|vercel -> vercel-deployment (Auth needs deployment config)
- ui|form|button|design -> frontend (Auth needs UI components)

### Full Auth Stack

Skills: nextjs-supabase-auth, supabase-backend, nextjs-app-router, vercel-deployment

Workflow:

```
1. Database setup (supabase-backend)
2. Auth implementation (nextjs-supabase-auth)
3. Route protection (nextjs-app-router)
4. Deployment config (vercel-deployment)
```

### Protected SaaS

Skills: nextjs-supabase-auth, stripe-integration, supabase-backend

Workflow:

```
1. User authentication (nextjs-supabase-auth)
2. Customer sync (stripe-integration)
3. Subscription gating (supabase-backend)
```

## Related Skills

Works well with: `nextjs-app-router`, `supabase-backend`

## When to Use
- User mentions or implies: supabase auth next
- User mentions or implies: authentication next.js
- User mentions or implies: login supabase
- User mentions or implies: auth middleware
- User mentions or implies: protected route
- User mentions or implies: auth callback
- User mentions or implies: session management

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
