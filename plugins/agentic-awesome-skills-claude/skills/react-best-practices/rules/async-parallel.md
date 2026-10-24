---
title: Promise.all() for Independent Operations
impact: CRITICAL
impactDescription: workload-dependent parallel latency reduction
tags: async, parallelization, promises, waterfalls
---

## Promise.all() for Independent Operations

When async operations have no interdependencies, execute them concurrently using `Promise.all()`.

**Incorrect (sequential execution, 3 round trips):**

```typescript
const user = await fetchUser()
const posts = await fetchPosts()
const comments = await fetchComments()
```

**Correct (parallel execution, overlapping latency):**

```typescript
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments()
])
```

Concurrent requests remain separate requests. Promise.all rejects on the first failure but does not cancel or undo sibling operations; use cancellation and transactions where required.
