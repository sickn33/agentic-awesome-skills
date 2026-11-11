# Next.js App Router Patterns Implementation Playbook

This file contains detailed patterns, checklists, and code samples referenced by the skill.

# Next.js App Router Patterns

Comprehensive patterns for Next.js 14+ App Router architecture, Server Components, and modern full-stack React development.

## When to Use This Skill

- Building new Next.js applications with App Router
- Migrating from Pages Router to App Router
- Implementing Server Components and streaming
- Setting up parallel and intercepting routes
- Optimizing data fetching and caching
- Building full-stack features with Server Actions

## Core Concepts

### 1. Rendering Modes

| Mode | Where | When to Use |
|------|-------|-------------|
| **Server Components** | Server only | Data fetching, heavy computation, secrets |
| **Client Components** | Browser interactivity; may be server-prerendered | Interactivity, hooks, browser APIs |
| **Static** | Build time | Content that rarely changes |
| **Dynamic** | Request time | Personalized or real-time data |
| **Streaming** | Progressive | Large pages, slow data sources |

### 2. File Conventions

```
app/
├── layout.tsx       # Shared UI wrapper
├── page.tsx         # Route UI
├── loading.tsx      # Loading UI (Suspense)
├── error.tsx        # Error boundary
├── not-found.tsx    # 404 UI
├── route.ts         # API endpoint
├── template.tsx     # Re-mounted layout
├── default.tsx      # Parallel route fallback
└── opengraph-image.tsx  # OG image generation
```

## Version and security prerequisites

These are independent Next.js 16+/React 19 fragments (Promise request props and updateTag); older releases require version-specific APIs. Application db/components/types, requireUser, owned-cart/product authorization, idempotent order processing and runtime schemas are required adapters, not implemented here. Never accept raw card data or calculate prices from client input. Scope caches and cache tags by authenticated tenant/user for private data; public product cache examples assume truly public shared content. Server Actions and route handlers are public entry points requiring authentication, authorization, runtime validation and request limits. Add default.tsx fallbacks for parallel slots and a null/catch-all modal route for closing intercepted routes.

## Quick Start

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: { default: 'My App', template: '%s | My App' },
  description: 'Built with Next.js App Router',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

// app/page.tsx - Server Component by default
async function getProducts() {
  const res = await fetch('https://api.example.com/products', {
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  })
  if (!res.ok) throw new Error('Product request failed')
  return res.json()
}

export default async function HomePage() {
  const products = await getProducts()

  return (
    <main>
      <h1>Products</h1>
      <ProductGrid products={products} />
    </main>
  )
}
```

## Patterns

### Pattern 1: Server Components with Data Fetching

```typescript
// app/products/page.tsx
import { Suspense } from 'react'
import { ProductList, ProductListSkeleton } from '@/components/products'
import { FilterSidebar } from '@/components/filters'

interface SearchParams {
  category?: string
  sort?: 'price' | 'name' | 'date'
  page?: string
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  return (
    <div className="flex gap-8">
      <FilterSidebar />
      <Suspense
        key={JSON.stringify(params)}
        fallback={<ProductListSkeleton />}
      >
        <ProductList
          category={params.category}
          sort={params.sort}
          page={Number(params.page) || 1}
        />
      </Suspense>
    </div>
  )
}

// components/products/ProductList.tsx - Server Component
async function getProducts(filters: ProductFilters) {
  const res = await fetch(
    `${process.env.API_URL}/products?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))}`,
    { cache: 'force-cache', next: { tags: ['products'] } }
  )
  if (!res.ok) throw new Error('Failed to fetch products')
  return res.json()
}

export async function ProductList({ category, sort, page }: ProductFilters) {
  const { products, totalPages } = await getProducts({ category, sort, page })

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}
```

### Pattern 2: Client Components with 'use client'

```typescript
// components/products/AddToCartButton.tsx
'use client'

import { useState, useTransition } from 'react'
import { addToCart } from '@/app/actions/cart'

export function AddToCartButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      const result = await addToCart(productId)
      if (result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? 'Adding...' : 'Add to Cart'}
      </button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  )
}
```

### Pattern 3: Server Actions

```typescript
// app/actions/cart.ts
'use server'

import { updateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function addToCart(productId: string) {
  const user = await requireUser() // Server-side session verification; never trust cookie presence.
  const sessionId = await getOwnedCartSession(user.id)
  await validatePurchasableProduct(productId)

  try {
    await db.cart.upsert({
      where: { sessionId_productId: { sessionId, productId } },
      update: { quantity: { increment: 1 } },
      create: { sessionId, productId, quantity: 1 },
    })

    updateTag(`cart:${user.id}`)
    return { success: true }
  } catch (error) {
    return { error: 'Failed to add item to cart' }
  }
}

export async function checkout(formData: FormData) {
  const user = await requireUser()
  const address = formData.get('address')
  const payment = formData.get('payment')

  // Validate
  if (typeof address !== 'string' || typeof payment !== 'string' || !address.trim() || !payment.trim()) {
    return { error: 'Missing required fields' }
  }

  // Process order
  const order = await processOwnedCartOrderIdempotently({ userId: user.id, address, paymentToken: payment })

  // Redirect to confirmation
  redirect(`/orders/${order.id}/confirmation`)
}
```

### Pattern 4: Parallel Routes

```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <div className="dashboard-grid">
      <main>{children}</main>
      <aside className="analytics-panel">{analytics}</aside>
      <aside className="team-panel">{team}</aside>
    </div>
  )
}

// app/dashboard/@analytics/page.tsx
export default async function AnalyticsSlot() {
  const stats = await getAnalytics()
  return <AnalyticsChart data={stats} />
}

// app/dashboard/@analytics/loading.tsx
export default function AnalyticsLoading() {
  return <ChartSkeleton />
}

// app/dashboard/@team/page.tsx
export default async function TeamSlot() {
  const members = await getTeamMembers()
  return <TeamList members={members} />
}
```

### Pattern 5: Intercepting Routes (Modal Pattern)

```typescript
// File structure for photo modal
// app/
// ├── @modal/
// │   ├── (.)photos/[id]/page.tsx  # Intercept
// │   └── default.tsx
// ├── photos/
// │   └── [id]/page.tsx            # Full page
// └── layout.tsx

// app/@modal/(.)photos/[id]/page.tsx
import { Modal } from '@/components/Modal'
import { PhotoDetail } from '@/components/PhotoDetail'

export default async function PhotoModal({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)

  return (
    <Modal>
      <PhotoDetail photo={photo} />
    </Modal>
  )
}

// app/photos/[id]/page.tsx - Full page version
export default async function PhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const photo = await getPhoto(id)

  return (
    <div className="photo-page">
      <PhotoDetail photo={photo} />
      <RelatedPhotos photoId={id} />
    </div>
  )
}

// app/layout.tsx
export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <html>
      <body>
        {children}
        {modal}
      </body>
    </html>
  )
}
```

### Pattern 6: Streaming with Suspense

```typescript
// app/product/[id]/page.tsx
import { Suspense } from 'react'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // This data loads first (blocking)
  const product = await getProduct(id)

  return (
    <div>
      {/* Immediate render */}
      <ProductHeader product={product} />

      {/* Stream in reviews */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={id} />
      </Suspense>

      {/* Stream in recommendations */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={id} />
      </Suspense>
    </div>
  )
}

// These components fetch their own data
async function Reviews({ productId }: { productId: string }) {
  const reviews = await getReviews(productId) // Slow API
  return <ReviewList reviews={reviews} />
}

async function Recommendations({ productId }: { productId: string }) {
  const products = await getRecommendations(productId) // ML-based, slow
  return <ProductCarousel products={products} />
}
```

### Pattern 7: Route Handlers (API Routes)

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')

  const products = await db.product.findMany({
    where: category ? { category } : undefined,
    take: 20,
  })

  return NextResponse.json(products)
}

export async function POST(request: NextRequest) {
  const user = await requireUser()
  await requireProductAdmin(user.id)
  const body = ProductCreateSchema.parse(await request.json()) // Allowlisted fields only.

  const product = await db.product.create({
    data: { name: body.name, price: body.price },
  })

  return NextResponse.json(product, { status: 201 })
}

// app/api/products/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const product = await db.product.findUnique({ where: { id } })

  if (!product) {
    return NextResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    )
  }

  return NextResponse.json(product)
}
```

### Pattern 8: Metadata and SEO

```typescript
// app/products/[slug]/page.tsx
import { Metadata } from 'next'
import { notFound } from 'next/navigation'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) return {}

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.description,
      images: [product.image],
    },
  }
}

export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { slug: true } })
  return products.map((p) => ({ slug: p.slug }))
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const product = await getProduct(slug)

  if (!product) notFound()

  return <ProductDetail product={product} />
}
```

## Caching Strategies

### Data Cache

```typescript
// No cache (always fresh)
fetch(url, { cache: 'no-store' })

// Cache until invalidation/eviction; not a durability guarantee
fetch(url, { cache: 'force-cache' })

// ISR - revalidate after 60 seconds
fetch(url, { next: { revalidate: 60 } })

// Tag-based invalidation
fetch(url, { cache: 'force-cache', next: { tags: ['products'] } })

// Invalidate via Server Action
'use server'
import { updateTag, revalidatePath } from 'next/cache'

export async function updateProduct(id: string, data: ProductData) {
  const user = await requireUser()
  await requireProductAdmin(user.id)
  const validated = ProductUpdateSchema.parse(data)
  await db.product.update({ where: { id }, data: validated })
  updateTag('products')
  revalidatePath('/products')
}
```

## Best Practices

### Do's
- **Start with Server Components** - Add 'use client' only when needed
- **Colocate data fetching** - Fetch data where it's used
- **Use Suspense boundaries** - Enable streaming for slow data
- **Leverage parallel routes** - Independent loading states
- **Use Server Actions** - For mutations with progressive enhancement

### Don'ts
- **Don't pass non-serializable data** - Server → Client boundary limitations
- **Don't use hooks in Server Components** - No useState, useEffect
- **Don't fetch in Client Components** - Use Server Components or React Query
- **Don't over-nest layouts** - Each layout adds to the component tree
- **Don't ignore loading states** - Always provide loading.tsx or Suspense

## Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Vercel Templates](https://vercel.com/templates/next.js)
