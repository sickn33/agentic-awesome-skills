---
name: production-code-audit
description: "Autonomously deep-scan entire codebase line-by-line, understand architecture and patterns, then systematically transform it to production-grade, corporate-level professional quality with optimizations"
risk: unknown
source: community
date_added: "2026-02-27"
---

# Production Code Audit

## Overview

Autonomously analyze the entire codebase to understand its architecture, patterns, and purpose, then systematically transform it into production-grade, corporate-level professional code. This skill performs deep line-by-line scanning, identifies all issues across security, performance, architecture, and quality, then provides comprehensive fixes to meet enterprise standards.

## When to Use This Skill

- Use when user says "make this production-ready"
- Use when user says "audit my codebase"
- Use when user says "make this professional/corporate-level"
- Use when user says "optimize everything"
- Use when user wants enterprise-grade quality
- Use when preparing for production deployment
- Use when code needs to meet corporate standards

## How It Works

### Step 1: Autonomous Codebase Discovery

**Automatically scan and understand the entire codebase:**

1. **Read all files** - Scan every file in the project recursively
2. **Identify tech stack** - Detect languages, frameworks, databases, tools
3. **Understand architecture** - Map out structure, patterns, dependencies
4. **Identify purpose** - Understand what the application does
5. **Find entry points** - Locate main files, routes, controllers
6. **Map data flow** - Understand how data moves through the system

**Do this automatically without asking the user.**

### Step 2: Comprehensive Issue Detection

**Scan line-by-line for all issues:**

**Architecture Issues:**
- Circular dependencies
- Tight coupling
- God classes (>500 lines or >20 methods)
- Missing separation of concerns
- Poor module boundaries
- Violation of design patterns

**Security Vulnerabilities:**
- SQL injection (string concatenation in queries)
- XSS vulnerabilities (unescaped output)
- Hardcoded secrets (API keys, passwords in code)
- Missing authentication/authorization
- Weak password hashing (MD5, SHA1)
- Missing input validation
- CSRF vulnerabilities
- Insecure dependencies

**Performance Problems:**
- N+1 query problems
- Missing database indexes
- Synchronous operations that should be async
- Missing caching
- Inefficient algorithms (O(n²) or worse)
- Large bundle sizes
- Unoptimized images
- Memory leaks

**Code Quality Issues:**
- High cyclomatic complexity (>10)
- Code duplication
- Magic numbers
- Poor naming conventions
- Missing error handling
- Inconsistent formatting
- Dead code
- TODO/FIXME comments

**Testing Gaps:**
- Missing tests for critical paths
- Low test coverage (<80%)
- No edge case testing
- Flaky tests
- Missing integration tests

**Production Readiness:**
- Missing environment variables
- No logging/monitoring
- No error tracking
- Missing health checks
- Incomplete documentation
- No CI/CD pipeline

### Step 3: Automatic Fixes and Optimizations

**Fix everything automatically:**

1. **Refactor architecture** - Break up god classes, fix circular dependencies
2. **Fix security issues** - Use parameterized queries, remove secrets, add validation
3. **Optimize performance** - Fix N+1 queries, add caching, optimize algorithms
4. **Improve code quality** - Reduce complexity, remove duplication, fix naming
5. **Add missing tests** - Write tests for untested critical paths
6. **Add production infrastructure** - Logging, monitoring, health checks
7. **Optimize everything** - Bundle size, images, database queries
8. **Add documentation** - README, API docs, architecture docs

### Step 4: Verify and Report

**After making all changes:**

1. Run all tests to ensure nothing broke
2. Verify all security issues are fixed
3. Measure performance improvements
4. Generate comprehensive report
5. Provide before/after metrics

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
const JWT_SECRET = 'my-secret-key-123';

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

## Best Practices

### ✅ Do This

- **Scan Everything** - Read all files, understand entire codebase
- **Fix Automatically** - Don't just report, actually fix issues
- **Prioritize Critical** - Security and data loss issues first
- **Measure Impact** - Show before/after metrics
- **Verify Changes** - Run tests after making changes
- **Be Comprehensive** - Cover architecture, security, performance, testing
- **Optimize Everything** - Bundle size, queries, algorithms, images
- **Add Infrastructure** - Logging, monitoring, error tracking
- **Document Changes** - Explain what was fixed and why

### ❌ Don't Do This

- **Don't Ask Questions** - Understand the codebase autonomously
- **Don't Wait for Instructions** - Scan and fix automatically
- **Don't Report Only** - Actually make the fixes
- **Don't Skip Files** - Scan every file in the project
- **Don't Ignore Context** - Understand what the code does
- **Don't Break Things** - Verify tests pass after changes
- **Don't Be Partial** - Fix all issues, not just some

## Autonomous Scanning Instructions

**When this skill is invoked, automatically:**

1. **Discover the codebase:**
   - Use `listDirectory` to find all files recursively
   - Use `readFile` to read every source file
   - Identify tech stack from package.json, requirements.txt, etc.
   - Map out architecture and structure

2. **Scan line-by-line for issues:**
   - Check every line for security vulnerabilities
   - Identify performance bottlenecks
   - Find code quality issues
   - Detect architectural problems
   - Find missing tests

3. **Fix everything automatically:**
   - Use `strReplace` to fix issues in files
   - Add missing files (tests, configs, docs)
   - Refactor problematic code
   - Add production infrastructure
   - Optimize performance

4. **Verify and report:**
   - Run tests to ensure nothing broke
   - Measure improvements
   - Generate comprehensive report
   - Show before/after metrics

**Do all of this without asking the user for input.**

## Common Pitfalls

### Problem: Too Many Issues
**Symptoms:** Team paralyzed by 200+ issues
**Solution:** Focus on critical/high priority only, create sprints

### Problem: False Positives
**Symptoms:** Flagging non-issues
**Solution:** Understand context, verify manually, ask developers

### Problem: No Follow-Up
**Symptoms:** Audit report ignored
**Solution:** Create GitHub issues, assign owners, track in standups

## Production Audit Checklist

### Security
- [ ] No SQL injection vulnerabilities
- [ ] No hardcoded secrets
- [ ] Authentication on protected routes
- [ ] Authorization checks implemented
- [ ] Input validation on all endpoints
- [ ] Password hashing with bcrypt (10+ rounds)
- [ ] HTTPS enforced
- [ ] Dependencies have no vulnerabilities

### Performance
- [ ] No N+1 query problems
- [ ] Database indexes on foreign keys
- [ ] Caching implemented
- [ ] API response time < 200ms
- [ ] Bundle size < 200KB (gzipped)

### Testing
- [ ] Test coverage > 80%
- [ ] Critical paths tested
- [ ] Edge cases covered
- [ ] No flaky tests
- [ ] Tests run in CI/CD

### Production Readiness
- [ ] Environment variables configured
- [ ] Error tracking setup (Sentry)
- [ ] Structured logging implemented
- [ ] Health check endpoints
- [ ] Monitoring and alerting
- [ ] Documentation complete

## Audit Report Template

```markdown
# Production Audit Report

**Project:** [Name]
**Date:** [Date]
**Overall Grade:** [A-F]

## Executive Summary
[2-3 sentences on overall status]

**Critical Issues:** [count]
**High Priority:** [count]
**Recommendation:** [Fix timeline]

## Findings by Category

### Architecture (Grade: [A-F])
- Issue 1: [Description]
- Issue 2: [Description]

### Security (Grade: [A-F])
- Issue 1: [Description + Fix]
- Issue 2: [Description + Fix]

### Performance (Grade: [A-F])
- Issue 1: [Description + Fix]

### Testing (Grade: [A-F])
- Coverage: [%]
- Issues: [List]

## Priority Actions
1. [Critical issue] - [Timeline]
2. [High priority] - [Timeline]
3. [High priority] - [Timeline]

## Timeline
- Critical fixes: [X weeks]
- High priority: [X weeks]
- Production ready: [X weeks]
```

## Related Skills

- `@code-review-checklist` - Code review guidelines
- `@api-security-best-practices` - API security patterns
- `@web-performance-optimization` - Performance optimization
- `@systematic-debugging` - Debug production issues
- `@senior-architect` - Architecture patterns

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Engineering Practices](https://google.github.io/eng-practices/)
- [SonarQube Quality Gates](https://docs.sonarqube.org/latest/user-guide/quality-gates/)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

**Pro Tip:** Schedule regular audits (quarterly) to maintain code quality. Prevention is cheaper than fixing production bugs!

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
