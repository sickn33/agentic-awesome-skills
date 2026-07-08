---
name: senior-frontend
description: Frontend development skill for React, Next.js, TypeScript, and Tailwind CSS applications. Use when building React components, optimizing Next.js performance, analyzing bundle sizes, scaffolding frontend projects, implementing accessibility, or reviewing frontend code quality.
risk: safe
source: https://github.com/alirezarezvani/claude-skills
date_added: "2026-03-07"
---

# Senior Frontend

Frontend development patterns, performance optimization, and automation tools for React/Next.js applications.

## When to Use
- Use when scaffolding a new React or Next.js project with TypeScript and Tailwind CSS.
- Use when generating new components or custom hooks.
- Use when analyzing and optimizing bundle sizes for frontend applications.
- Use to implement or review advanced React patterns like Compound Components or Render Props.
- Use to ensure accessibility compliance and implement robust testing strategies.

## Table of Contents

- [Project Scaffolding](#project-scaffolding)
- [Component Generation](#component-generation)
- [Bundle Analysis](#bundle-analysis)
- [React Patterns](#react-patterns)
- [Next.js Optimization](#nextjs-optimization)
- [Accessibility and Testing](#accessibility-and-testing)

---

## Project Scaffolding

Generate a new Next.js or React project with TypeScript, Tailwind CSS, and best practice configurations.

### Workflow: Create New Frontend Project

1. Run the scaffolder with your project name and template:

   ```bash
   python scripts/frontend_scaffolder.py my-app --template nextjs
   ```

2. Add optional features (auth, api, forms, testing, storybook):

   ```bash
   python scripts/frontend_scaffolder.py dashboard --template nextjs --features auth,api
   ```

3. Navigate to the project and install dependencies:

   ```bash
   cd my-app && npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Scaffolder Options

| Option               | Description                                       |
| -------------------- | ------------------------------------------------- |
| `--template nextjs`  | Next.js 14+ with App Router and Server Components |
| `--template react`   | React + Vite with TypeScript                      |
| `--features auth`    | Add NextAuth.js authentication                    |
| `--features api`     | Add React Query + API client                      |
| `--features forms`   | Add React Hook Form + Zod validation              |
| `--features testing` | Add Vitest + Testing Library                      |
| `--dry-run`          | Preview files without creating them               |

### Generated Structure (Next.js)

```
my-app/
├── app/
│   ├── layout.tsx        # Root layout with fonts
│   ├── page.tsx          # Home page
│   ├── globals.css       # Tailwind + CSS variables
│   └── api/health/route.ts
├── components/
│   ├── ui/               # Button, Input, Card
│   └── layout/           # Header, Footer, Sidebar
├── hooks/                # useDebounce, useLocalStorage
├── lib/                  # utils (cn), constants
├── types/                # TypeScript interfaces
├── tailwind.config.ts
├── next.config.js
└── package.json
```

---

## Component Generation

Generate React components with TypeScript, tests, and Storybook stories.

### Workflow: Create a New Component

1. Generate a client component:

   ```bash
   python scripts/component_generator.py Button --dir src/components/ui
   ```

2. Generate a server component:

   ```bash
   python scripts/component_generator.py ProductCard --type server
   ```

3. Generate with test and story files:

   ```bash
   python scripts/component_generator.py UserProfile --with-test --with-story
   ```

4. Generate a custom hook:
   ```bash
   python scripts/component_generator.py FormValidation --type hook
   ```

### Generator Options

| Option          | Description                                  |
| --------------- | -------------------------------------------- |
| `--type client` | Client component with 'use client' (default) |
| `--type server` | Async server component                       |
| `--type hook`   | Custom React hook                            |
| `--with-test`   | Include test file                            |
| `--with-story`  | Include Storybook story                      |
| `--flat`        | Create in output dir without subdirectory    |
| `--dry-run`     | Preview without creating files               |

### Generated Component Example

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export function Button({ className, children }: ButtonProps) {
  return <div className={cn("", className)}>{children}</div>;
}
```

---

## Bundle Analysis

Analyze package.json and project structure for bundle optimization opportunities.

### Workflow: Optimize Bundle Size

1. Run the analyzer on your project:

   ```bash
   python scripts/bundle_analyzer.py /path/to/project
   ```

2. Review the health score and issues:

   ```
   Bundle Health Score: 75/100 (C)

   HEAVY DEPENDENCIES:
     moment (290KB)
       Alternative: date-fns (12KB) or dayjs (2KB)

     lodash (71KB)
       Alternative: lodash-es with tree-shaking
   ```

3. Apply the recommended fixes by replacing heavy dependencies.

4. Re-run with verbose mode to check import patterns:
   ```bash
   python scripts/bundle_analyzer.py . --verbose
   ```

### Bundle Score Interpretation

| Score  | Grade | Action                         |
| ------ | ----- | ------------------------------ |
| 90-100 | A     | Bundle is well-optimized       |
| 80-89  | B     | Minor optimizations available  |
| 70-79  | C     | Replace heavy dependencies     |
| 60-69  | D     | Multiple issues need attention |
| 0-59   | F     | Critical bundle size problems  |

### Heavy Dependencies Detected

The analyzer identifies these common heavy packages:

| Package       | Size  | Alternative                    |
| ------------- | ----- | ------------------------------ |
| moment        | 290KB | date-fns (12KB) or dayjs (2KB) |
| lodash        | 71KB  | lodash-es with tree-shaking    |
| axios         | 14KB  | Native fetch or ky (3KB)       |
| jquery        | 87KB  | Native DOM APIs                |
| @mui/material | Large | shadcn/ui or Radix UI          |

---

## React Patterns

Reference: `references/react_patterns.md`

### Compound Components

Share state between related components:

```tsx
const Tabs = ({ children }) => {
  const [active, setActive] = useState(0);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      {children}
    </TabsContext.Provider>
  );
};

Tabs.List = TabList;
Tabs.Panel = TabPanel;

// Usage
<Tabs>
  <Tabs.List>
    <Tabs.Tab>One</Tabs.Tab>
    <Tabs.Tab>Two</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel>Content 1</Tabs.Panel>
  <Tabs.Panel>Content 2</Tabs.Panel>
</Tabs>;
```

### Custom Hooks

Extract reusable logic:

```tsx
function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const debouncedSearch = useDebounce(searchTerm, 300);
```

### Render Props

Share rendering logic:

```tsx
function DataFetcher({ url, render }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [url]);

  return render({ data, loading });
}

// Usage
<DataFetcher
  url="/api/users"
  render={({ data, loading }) =>
    loading ? <Spinner /> : <UserList users={data} />
  }
/>;
```

---

## Next.js Optimization

Reference: `references/nextjs_optimization_guide.md`

### Server vs Client Components

Use Server Components by default. Add 'use client' only when you need:

- Event handlers (onClick, onChange)
- State (useState, useReducer)
- Effects (useEffect)
- Browser APIs

```tsx
// Server Component (default) - no 'use client'
async function ProductPage({ params }) {
  const product = await getProduct(params.id); // Server-side fetch

  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCartButton productId={product.id} /> {/* Client component */}
    </div>
  );
}

// Client Component
("use client");
function AddToCartButton({ productId }) {
  const [adding, setAdding] = useState(false);
  return <button onClick={() => addToCart(productId)}>Add</button>;
}
```

### Image Optimization

```tsx
import Image from 'next/image';

// Above the fold - load immediately
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
/>

// Responsive image with fill
<div className="relative aspect-video">
  <Image
    src="/product.jpg"
    alt="Product"
    fill
    sizes="(max-width: 768px) 100vw, 50vw"
    className="object-cover"
  />
</div>
```

### Data Fetching Patterns

```tsx
// Parallel fetching
async function Dashboard() {
  const [user, stats] = await Promise.all([getUser(), getStats()]);
  return <div>...</div>;
}

// Streaming with Suspense
async function ProductPage({ params }) {
  return (
    <div>
      <ProductDetails id={params.id} />
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={params.id} />
      </Suspense>
    </div>
  );
}
```

---

## Accessibility and Testing

Reference: `references/frontend_best_practices.md`

### Accessibility Checklist

1. **Semantic HTML**: Use proper elements (`<button>`, `<nav>`, `<main>`)
2. **Keyboard Navigation**: All interactive elements focusable
3. **ARIA Labels**: Provide labels for icons and complex widgets
4. **Color Contrast**: Minimum 4.5:1 for normal text
5. **Focus Indicators**: Visible focus states

```tsx
// Accessible button
<button
  type="button"
  aria-label="Close dialog"
  onClick={onClose}
  className="focus-visible:ring-2 focus-visible:ring-blue-500"
>
  <XIcon aria-hidden="true" />
</button>

// Skip link for keyboard users
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
```

### Testing Strategy

```tsx
// Component test with React Testing Library
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

test("button triggers action on click", async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Click me</Button>);

  await userEvent.click(screen.getByRole("button"));
  expect(onClick).toHaveBeenCalledTimes(1);
});

// Test accessibility
test("dialog is accessible", async () => {
  render(<Dialog open={true} title="Confirm" />);

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby");
});
```

---

## Quick Reference

### Common Next.js Config

```js
// next.config.js
const nextConfig = {
  images: {
    remotePatterns: [{ hostname: "cdn.example.com" }],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@heroicons/react"],
  },
};
```

### Tailwind CSS Utilities

```tsx
// Conditional classes with cn()
import { cn } from "@/lib/utils";

<button
  className={cn(
    "px-4 py-2 rounded",
    variant === "primary" && "bg-blue-500 text-white",
    disabled && "opacity-50 cursor-not-allowed",
  )}
/>;
```

### TypeScript Patterns

```tsx
// Props with children
interface CardProps {
  className?: string;
  children: React.ReactNode;
}

// Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map(renderItem)}</ul>;
}
```

---

## Resources

- React Patterns: `references/react_patterns.md`
- Next.js Optimization: `references/nextjs_optimization_guide.md`
- Best Practices: `references/frontend_best_practices.md`

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
