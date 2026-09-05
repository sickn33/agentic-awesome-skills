---
name: production-code-audit
description: "Autonomously deep-scan entire codebase line-by-line, understand architecture and patterns, then systematically transform it to production-grade, corporate-level professional quality with optimizations"
risk: critical
source: community
date_added: "2026-02-27"
---

# Production Code Audit

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Use when user says "make this production-ready"
- Use when user says "audit my codebase"
- Use when user says "make this professional/corporate-level"
- Use when user says "optimize everything"
- Use when user wants enterprise-grade quality
- Use when preparing for production deployment
- Use when code needs to meet corporate standards

## Examples

### Example 1: Autonomous Codebase Transformation

```markdown
User: @production-code-audit make this production-ready

AI: I'll scan your entire codebase and transform it to production-grade quality.

**Phase 1: Discovering Codebase** (analyzing 247 files)
- Detected: Node.js + Express + PostgreSQL + React
- Architecture: MVC pattern with REST API
- Purpose: E-commerce platform
- Entry points: server.js, src/index.tsx

**Phase 2: Scanning for Issues** (line-by-line analysis)

Found 127 issues:
- 🔴 CRITICAL: 8 issues
- 🟠 HIGH: 23 issues  
- 🟡 MEDIUM: 41 issues
- 🔵 LOW: 55 issues

**Phase 3: Fixing Issues Automatically**

🔴 CRITICAL FIXES (8/8 completed):

1. ✅ Fixed SQL injection in UserRepository.findByEmail()
   - Before: String concatenation in query
   - After: Parameterized query with $1 placeholder

2. ✅ Removed hardcoded database password from config/database.ts
   - Before: password: 'SuperSecret123!'
   - After: password: process.env.DB_PASSWORD

3. ✅ Added authentication to admin routes
   - Before: No auth middleware
   - After: authenticateToken + requireRole('admin')

4. ✅ Fixed weak password hashing (MD5 → bcrypt)
   - Before: crypto.createHash('md5')
   - After: bcrypt.hash(password, 12)

5. ✅ Fixed circular dependency: OrderService ↔ PaymentService
   - Before: Direct imports causing cycle
   - After: Event-based decoupling with EventBus

6. ✅ Added input validation to all API endpoints
   - Before: No validation
   - After: Zod schemas validating all inputs

7. ✅ Fixed authentication bypass in auth middleware
   - Before: next() called on missing token
   - After: Returns 401 error

8. ✅ Fixed mass assignment vulnerability in UserController
   - Before: Accepts all fields from req.body
   - After: Whitelist of allowed fields only

🟠 HIGH PRIORITY FIXES (23/23 completed):

9. ✅ Fixed N+1 query in OrderService.getOrdersWithItems()
   - Before: Loop with individual queries (2.8s)
   - After: Single query with joins (45ms)
   - Performance: 98% improvement

10. ✅ Refactored UserService god class (850 lines → 4 focused services)
    - UserAuthenticationService (login, logout, password)
    - UserProfileService (CRUD operations)
    - UserNotificationService (email, SMS)
    - UserPermissionService (roles, permissions)

11. ✅ Added Redis caching for product queries
    - Before: Database query every request
    - After: Cache with 1-hour TTL
    - Performance: 95% faster

12. ✅ Optimized bundle size
    - Before: 850KB (gzipped: 280KB)
    - After: 380KB (gzipped: 120KB)
    - Improvement: 55% reduction

13. ✅ Added database indexes
    - orders(user_id, status, created_at)
    - products(category, price)
    - Query performance: 98% improvement

[... 11 more high-priority fixes ...]

🟡 MEDIUM PRIORITY FIXES (41/41 completed):
[... all medium fixes ...]

🔵 LOW PRIORITY IMPROVEMENTS (55/55 completed):
[... all low improvements ...]

**Phase 4: Adding Production Infrastructure**

✅ Added structured logging (Winston)
✅ Added error tracking (Sentry)
✅ Added health check endpoints (/health, /ready)
✅ Added monitoring (Prometheus metrics)
✅ Added rate limiting (Redis-based)
✅ Added API documentation (Swagger/OpenAPI)
✅ Added comprehensive README
✅ Added deployment guide
✅ Added CI/CD pipeline (.github/workflows)

**Phase 5: Verification**

✅ All tests passing (1,247 tests)
✅ Test coverage: 42% → 87%
✅ Security scan: 0 vulnerabilities
✅ Performance: API response time 3.2s → 180ms
✅ Bundle size: 850KB → 380KB
✅ Lighthouse score: 62 → 94

**TRANSFORMATION COMPLETE**

Your codebase is now production-ready with enterprise-grade quality:

📊 Metrics:
- Issues fixed: 127/127 (100%)
- Test coverage: 87% (target: 80%+)
- API performance: 94% improvement
- Security: OWASP Top 10 compliant
- Code quality: Grade A-

📁 Files changed: 89 files
📝 Lines changed: +3,247 / -1,892

🚀 Ready for production deployment!
```

### Example 2: Automatic Security Hardening

```markdown
User: @production-code-audit secure this codebase

AI: Scanning for security vulnerabilities...

**Security Scan Complete**

Found 15 security issues:
- 🔴 CRITICAL: 5
- 🟠 HIGH: 7
- 🟡 MEDIUM: 3

**Fixing all security issues automatically...**

🔴 CRITICAL (5/5 fixed):

1. ✅ SQL Injection in UserRepository
\`\`\`typescript
// Before (VULNERABLE)
const query = \`SELECT * FROM users WHERE email = '\${email}'\`;

// After (SECURE)
const query = 'SELECT * FROM users WHERE email = $1';
await db.query(query, [email]);
\`\`\`

2. ✅ Hardcoded Secrets Removed
\`\`\`typescript
// Before (INSECURE)
const tokenSigningKey = '[redacted weak value]';

// After (SECURE)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET required');
\`\`\`

3. ✅ Authentication Added to Admin Routes
\`\`\`typescript
// Before (VULNERABLE)
router.delete('/api/admin/users/:id', deleteUser);

// After (SECURE)
router.delete('/api/admin/users/:id',
  authenticateToken,
  requireRole('admin'),
  deleteUser
);
\`\`\`

4. ✅ Password Hashing Upgraded
\`\`\`typescript
// Before (WEAK)
const hash = crypto.createHash('md5').update(password).digest('hex');

// After (STRONG)
const hash = await bcrypt.hash(password, 12);
\`\`\`

5. ✅ Input Validation Added
\`\`\`typescript
// Before (VULNERABLE)
const user = await db.user.create({ data: req.body });

// After (SECURE)
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  name: z.string().min(2).max(100)
});
const validated = schema.parse(req.body);
const user = await db.user.create({ data: validated });
\`\`\`

**Security Status:**
- ✅ OWASP Top 10: Compliant
- ✅ SQL Injection: Protected
- ✅ XSS: Protected
- ✅ CSRF: Protected
- ✅ Authentication: Secure
- ✅ Secrets: Environment variables
- ✅ Dependencies: No vulnerabilities

🔒 Codebase is now secure and production-ready!
```

### Example 3: Performance Optimization

```markdown
User: @production-code-audit optimize performance

AI: Analyzing performance bottlenecks...

**Performance Analysis Complete**

Current metrics:
- API response time: 3.2s (target: <200ms)
- Page load time: 8.5s (target: <2s)
- Bundle size: 850KB (target: <200KB)

**Optimizing automatically...**

✅ Fixed N+1 queries (3.2s → 180ms - 94% faster)
✅ Added Redis caching (95% cache hit rate)
✅ Optimized database indexes (98% faster queries)
✅ Reduced bundle size (850KB → 380KB - 55% smaller)
✅ Optimized images (28MB → 3.2MB - 89% smaller)
✅ Implemented code splitting
✅ Added lazy loading
✅ Parallelized async operations

**Performance Results:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Response | 3.2s | 180ms | 94% |
| Page Load | 8.5s | 1.8s | 79% |
| Bundle Size | 850KB | 380KB | 55% |
| Image Size | 28MB | 3.2MB | 89% |
| Lighthouse | 42 | 94 | +52 points |

🚀 Performance optimized to production standards!
```

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
