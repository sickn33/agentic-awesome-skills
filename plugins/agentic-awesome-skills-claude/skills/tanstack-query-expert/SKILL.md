---
name: tanstack-query-expert
description: "Expert in TanStack Query (React Query) — asynchronous state management. Covers data fetching, stale time configuration, mutations, optimistic updates, and Next.js App Router (SSR) integration."
risk: safe
source: community
date_added: "2026-03-07"
---

# TanStack Query Expert

You are a production-grade TanStack Query (formerly React Query) expert. You help developers build robust, performant asynchronous state management layers in React and Next.js applications. You master declarative data fetching, cache invalidation, optimistic UI updates, background syncing, error boundaries, and server-side rendering (SSR) hydration patterns.

## When to Use This Skill

- Use when setting up or refactoring data fetching logic (replacing `useEffect` + `useState`)
- Use when designing query keys (Array-based, strictly typed keys)
- Use when configuring global or query-specific `staleTime`, `gcTime`, and `retry` behavior
- Use when writing `useMutation` hooks for POST/PUT/DELETE requests
- Use when invalidating the cache (`queryClient.invalidateQueries`) after a mutation
- Use when implementing Optimistic Updates for instant UX feedback
- Use when integrating TanStack Query with Next.js App Router (Server Components + Client Boundary hydration)

## Core Concepts

### Why TanStack Query?

TanStack Query is not just for fetching data; it's an **asynchronous state manager**. It handles caching, background updates, deduplication of multiple requests for the same data, pagination, and out-of-the-box loading/error states. 

**Rule of Thumb:** Never use `useEffect` to fetch data if TanStack Query is available in the stack.

## Query Definition Patterns

### The Custom Hook Pattern (Best Practice)

Always abstract `useQuery` calls into custom hooks to encapsulate the fetching logic, TypeScript types, and query keys.

```typescript
import { useQuery } from '@tanstack/react-query';

// 1. Define strict types
type User = { id: string; name: string; status: 'active' | 'inactive' };

// 2. Define the fetcher function
const fetchUser = async (userId: string): Promise<User> => {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
};

// 3. Export a custom hook
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: ['users', userId], // Array-based query key
    queryFn: () => fetchUser(userId),
    staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes (no background refetching)
    enabled: !!userId, // Dependent query: only run if userId exists
  });
};
```

### Advanced Query Keys

Query keys uniquely identify the cache. They must be arrays, and order matters.

```typescript
// Filtering / Sorting
useQuery({
  queryKey: ['issues', { status: 'open', sort: 'desc' }],
  queryFn: () => fetchIssues({ status: 'open', sort: 'desc' })
});

// Factory pattern for query keys (Highly recommended for large apps)
export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (filters: string) => [...issueKeys.lists(), { filters }] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: number) => [...issueKeys.details(), id] as const,
};
```

## Mutations & Cache Invalidation

### Basic Mutation with Invalidation

When you modify data on the server, you must tell the client cache that the old data is now stale.

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useCreatePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newPost: { title: string }) => {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });
      return res.json();
    },
    // On success, invalidate the 'posts' cache to trigger a background refetch
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
};
```

### Optimistic Updates

Give the user instant feedback by updating the cache *before* the server responds, and rolling back if the request fails.

```typescript
export const useUpdateTodo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTodoFn,
    
    // 1. Triggered immediately when mutate() is called
    onMutate: async (newTodo) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['todos'] });

      // Snapshot the previous value
      const previousTodos = queryClient.getQueryData(['todos']);

      // Optimistically update to the new value
      queryClient.setQueryData(['todos'], (old: any) => 
        old.map((todo: any) => todo.id === newTodo.id ? { ...todo, ...newTodo } : todo)
      );

      // Return a context object with the snapshotted value
      return { previousTodos };
    },
    
    // 2. If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['todos'], context?.previousTodos);
    },
    
    // 3. Always refetch after error or success to ensure server sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
};
```

## Next.js App Router Integration

### Initializing the Provider

```typescript
// app/providers.tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false, // Prevents aggressive refetching on tab switch
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Server Component Pre-fetching (Hydration)

Pre-fetch data on the server and pass it to the client without prop-drilling or `initialData`.

```typescript
// app/posts/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import PostsList from './PostsList'; // Client Component

export default async function PostsPage() {
  const queryClient = new QueryClient();

  // Prefetch the data on the server
  await queryClient.prefetchQuery({
    queryKey: ['posts'],
    queryFn: fetchPostsServerSide,
  });

  // Dehydrate the cache and pass it to the HydrationBoundary
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PostsList />
    </HydrationBoundary>
  );
}
```

```typescript
// app/posts/PostsList.tsx (Client Component)
'use client'
import { useQuery } from '@tanstack/react-query';

export default function PostsList() {
  // This will NOT trigger a network request on mount! 
  // It reads instantly from the dehydrated server cache.
  const { data } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPostsClientSide,
  });

  return <div>{data.map(post => <p key={post.id}>{post.title}</p>)}</div>;
}
```

## Best Practices

- ✅ **Do:** Create Query Key factories so you don't misspell `['users']` vs `['user']` across different files.
- ✅ **Do:** Set a global `staleTime` (e.g., `1000 * 60`) if your data doesn't change every second. The default `staleTime` is `0`, meaning TanStack Query will trigger a background refetch on every component remount by default.
- ✅ **Do:** Use `queryClient.setQueryData` sparingly. It's usually better to just `invalidateQueries` and let TanStack Query refetch the fresh data organically.
- ✅ **Do:** Abstract all `useMutation` and `useQuery` calls into custom hooks. Views should only say `const { mutate } = useCreatePost()`.
- ❌ **Don't:** Pass primitive callbacks inline directly to `useQuery` without memoization if you rely on closures. (Instead, rely on the `queryKey` dependency array).
- ❌ **Don't:** Sync query data into local React state (e.g., `useEffect(() => setLocalState(data), [data])`). Use the query data directly. If you need derived state, derive it during render.

## Troubleshooting

**Problem:** Infinite fetching loop in the network tab.
**Solution:** Check your `queryFn`. If your `fetch` logic isn't structured correctly, or throws an unhandled exception before hitting the return, TanStack Query will retry automatically up to 3 times (default). If wrapped in an unstable `useEffect`, it loops infinitely. Check `retry: false` for debugging.

**Problem:** `staleTime` vs `gcTime` (formerly `cacheTime`) confusion.
**Solution:** `staleTime` governs when a background refetch is triggered. `gcTime` governs how long the inactive data stays in memory after the component unmounts. If `gcTime` < `staleTime`, data will be deleted before it even gets stale!

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
