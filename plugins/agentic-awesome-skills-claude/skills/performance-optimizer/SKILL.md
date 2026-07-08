---
name: performance-optimizer
description: "Identifies and fixes performance bottlenecks in code, databases, and APIs. Measures before and after to prove improvements."
category: development
risk: safe
source: community
date_added: "2026-03-05"
---

# Performance Optimizer

Find and fix performance bottlenecks. Measure, optimize, verify. Make it fast.

## When to Use This Skill

- App is slow or laggy
- User complains about performance
- Page load times are high
- API responses are slow
- Database queries take too long
- User mentions "slow", "lag", "performance", or "optimize"

## The Optimization Process

### 1. Measure First

Never optimize without measuring:

```javascript
// Measure execution time
console.time('operation');
await slowOperation();
console.timeEnd('operation'); // operation: 2341ms
```

**What to measure:**
- Page load time
- API response time
- Database query time
- Function execution time
- Memory usage
- Network requests

### 2. Find the Bottleneck

Use profiling tools to find the slow parts:

**Browser:**
```
DevTools → Performance tab → Record → Stop
Look for long tasks (red bars)
```

**Node.js:**
```bash
node --prof app.js
node --prof-process isolate-*.log > profile.txt
```

**Database:**
```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

### 3. Optimize

Fix the slowest thing first (biggest impact).

## Common Optimizations

### Database Queries

**Problem: N+1 Queries**
```javascript
// Bad: N+1 queries
const users = await db.users.find();
for (const user of users) {
  user.posts = await db.posts.find({ userId: user.id }); // N queries
}

// Good: Single query with JOIN
const users = await db.users.find()
  .populate('posts'); // 1 query
```

**Problem: Missing Index**
```sql
-- Check slow query
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
-- Shows: Seq Scan (bad)

-- Add index
CREATE INDEX idx_users_email ON users(email);

-- Check again
EXPLAIN SELECT * FROM users WHERE email = 'test@example.com';
-- Shows: Index Scan (good)
```

**Problem: SELECT ***
```javascript
// Bad: Fetches all columns
const users = await db.query('SELECT * FROM users');

// Good: Only needed columns
const users = await db.query('SELECT id, name, email FROM users');
```

**Problem: No Pagination**
```javascript
// Bad: Returns all records
const users = await db.users.find();

// Good: Paginated
const users = await db.users.find()
  .limit(20)
  .skip((page - 1) * 20);
```

### API Performance

**Problem: No Caching**
```javascript
// Bad: Hits database every time
app.get('/api/stats', async (req, res) => {
  const stats = await db.stats.calculate(); // Slow
  res.json(stats);
});

// Good: Cache for 5 minutes
const cache = new Map();
app.get('/api/stats', async (req, res) => {
  const cached = cache.get('stats');
  if (cached && Date.now() - cached.time < 300000) {
    return res.json(cached.data);
  }
  
  const stats = await db.stats.calculate();
  cache.set('stats', { data: stats, time: Date.now() });
  res.json(stats);
});
```

**Problem: Sequential Operations**
```javascript
// Bad: Sequential (slow)
const user = await getUser(id);
const posts = await getPosts(id);
const comments = await getComments(id);
// Total: 300ms + 200ms + 150ms = 650ms

// Good: Parallel (fast)
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id)
]);
// Total: max(300ms, 200ms, 150ms) = 300ms
```

**Problem: Large Payloads**
```javascript
// Bad: Returns everything
res.json(users); // 5MB response

// Good: Only needed fields
res.json(users.map(u => ({
  id: u.id,
  name: u.name,
  email: u.email
}))); // 500KB response
```

### Frontend Performance

**Problem: Unnecessary Re-renders**
```javascript
// Bad: Re-renders on every parent update
function UserList({ users }) {
  return users.map(user => <UserCard user={user} />);
}

// Good: Memoized
const UserCard = React.memo(({ user }) => {
  return <div>{user.name}</div>;
});
```

**Problem: Large Bundle**
```javascript
// Bad: Imports entire library
import _ from 'lodash'; // 70KB

// Good: Import only what you need
import debounce from 'lodash/debounce'; // 2KB
```

**Problem: No Code Splitting**
```javascript
// Bad: Everything in one bundle
import HeavyComponent from './HeavyComponent';

// Good: Lazy load
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));
```

**Problem: Unoptimized Images**
```html
<!-- Bad: Large image -->
<img src="photo.jpg" /> <!-- 5MB -->

<!-- Good: Optimized and responsive -->
<img 
  src="photo-small.webp" 
  srcset="photo-small.webp 400w, photo-large.webp 800w"
  loading="lazy"
  width="400"
  height="300"
/> <!-- 50KB -->
```

### Algorithm Optimization

**Problem: Inefficient Algorithm**
```javascript
// Bad: O(n²) - nested loops
function findDuplicates(arr) {
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j]) duplicates.push(arr[i]);
    }
  }
  return duplicates;
}

// Good: O(n) - single pass with Set
function findDuplicates(arr) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arr) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }
  return Array.from(duplicates);
}
```

**Problem: Repeated Calculations**
```javascript
// Bad: Calculates every time
function getTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
// Called 100 times in render

// Good: Memoized
const getTotal = useMemo(() => {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}, [items]);
```

### Memory Optimization

**Problem: Memory Leak**
```javascript
// Bad: Event listener not cleaned up
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  // Memory leak!
}, []);

// Good: Cleanup
useEffect(() => {
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

**Problem: Large Data in Memory**
```javascript
// Bad: Loads entire file into memory
const data = fs.readFileSync('huge-file.txt'); // 1GB

// Good: Stream it
const stream = fs.createReadStream('huge-file.txt');
stream.on('data', chunk => process(chunk));
```

## Measuring Impact

Always measure before and after:

```javascript
// Before optimization
console.time('query');
const users = await db.users.find();
console.timeEnd('query');
// query: 2341ms

// After optimization (added index)
console.time('query');
const users = await db.users.find();
console.timeEnd('query');
// query: 23ms

// Improvement: 100x faster!
```

## Performance Budgets

Set targets:

```
Page Load: < 2 seconds
API Response: < 200ms
Database Query: < 50ms
Bundle Size: < 200KB
Time to Interactive: < 3 seconds
```

## Tools

**Browser:**
- Chrome DevTools Performance tab
- Lighthouse (audit)
- Network tab (waterfall)

**Node.js:**
- `node --prof` (profiling)
- `clinic` (diagnostics)
- `autocannon` (load testing)

**Database:**
- `EXPLAIN ANALYZE` (query plans)
- Slow query log
- Database profiler

**Monitoring:**
- New Relic
- Datadog
- Sentry Performance

## Quick Wins

Easy optimizations with big impact:

1. **Add database indexes** on frequently queried columns
2. **Enable gzip compression** on server
3. **Add caching** for expensive operations
4. **Lazy load** images and heavy components
5. **Use CDN** for static assets
6. **Minify and compress** JavaScript/CSS
7. **Remove unused dependencies**
8. **Use pagination** instead of loading all data
9. **Optimize images** (WebP, proper sizing)
10. **Enable HTTP/2** on server

## Optimization Checklist

- [ ] Measured current performance
- [ ] Identified bottleneck
- [ ] Applied optimization
- [ ] Measured improvement
- [ ] Verified functionality still works
- [ ] No new bugs introduced
- [ ] Documented the change

## When NOT to Optimize

- Premature optimization (optimize when it's actually slow)
- Micro-optimizations (save 1ms when page takes 5 seconds)
- Readable code is more important than tiny speed gains
- If it's already fast enough

## Key Principles

- Measure before optimizing
- Fix the biggest bottleneck first
- Measure after to prove improvement
- Don't sacrifice readability for tiny gains
- Profile in production-like environment
- Consider the 80/20 rule (20% of code causes 80% of slowness)

## Related Skills

- `@database-design` - Query optimization
- `@codebase-audit-pre-push` - Code review
- `@bug-hunter` - Debugging

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
