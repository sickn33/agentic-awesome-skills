# Async Patterns and Error Handling

> Scope: independent illustrative fragments, not a supplied runnable application. Private project paths, helpers, DTOs and Prisma models must be implemented/adapted in the target repository. Pin and check installed Express/Sentry/Zod/Prisma versions. Authentication does not grant object/tenant access; authorize before reads/writes, enforce CSRF for cookie authentication, allowlist DTOs and project public response fields. Capture unexpected errors once at an approved, redacted boundary; never send raw request bodies, credentials or personal data to telemetry.


Complete guide to async/await patterns and custom error handling.

## Table of Contents

- [Async/Await Best Practices](#asyncawait-best-practices)
- [Promise Error Handling](#promise-error-handling)
- [Custom Error Types](#custom-error-types)
- [asyncErrorWrapper Utility](#asyncerrorwrapper-utility)
- [Error Propagation](#error-propagation)
- [Common Async Pitfalls](#common-async-pitfalls)

---

## Async/Await Best Practices

### Propagate or Handle Rejections at an Explicit Boundary

```typescript
// Valid propagation: the caller must await/return this promise
async function fetchData() {
    const data = await database.query(); // Rejects fetchData; caller/boundary handles it
    return data;
}

// Catch only to recover, translate or capture at the owning boundary
async function fetchData() {
    try {
        const data = await database.query();
        return data;
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    }
}
```

### Avoid .then() Chains

```typescript
// ❌ AVOID: Promise chains
function processData() {
    return fetchData()
        .then(data => transform(data))
        .then(transformed => save(transformed))
        .catch(error => {
            console.error(error);
        });
}

// ✅ PREFER: Async/await
async function processData() {
    try {
        const data = await fetchData();
        const transformed = await transform(data);
        return await save(transformed);
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    }
}
```

---

## Promise Error Handling

### Parallel Operations

```typescript
// ✅ Handle errors in Promise.all
try {
    const [users, profiles, settings] = await Promise.all([
        userService.getAll(),
        profileService.getAll(),
        settingsService.getAll(),
    ]);
} catch (error) {
    // Promise.all rejects on the first rejection; other operations continue unless explicitly cancelled
    Sentry.captureException(error);
    throw error;
}

// ✅ Handle errors individually with Promise.allSettled
const results = await Promise.allSettled([
    userService.getAll(),
    profileService.getAll(),
    settingsService.getAll(),
]);

results.forEach((result, index) => {
    if (result.status === 'rejected') {
        Sentry.captureException(result.reason, {
            tags: { operation: ['users', 'profiles', 'settings'][index] }
        });
    }
});
```

---

## Custom Error Types

### Define Custom Errors

```typescript
// Base error class
export class AppError extends Error {
    constructor(
        message: string,
        public code: string,
        public statusCode: number,
        public isOperational: boolean = true
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Specific error types
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 'VALIDATION_ERROR', 400);
    }
}

export class NotFoundError extends AppError {
    constructor(message: string) {
        super(message, 'NOT_FOUND', 404);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string) {
        super(message, 'FORBIDDEN', 403);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 'CONFLICT', 409);
    }
}
```

### Usage

```typescript
// Throw specific errors
if (!user) {
    throw new NotFoundError('User not found');
}

if (user.age < 18) {
    throw new ValidationError('User must be 18+');
}

// Error boundary handles them
function errorBoundary(error, req, res, next) {
    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            error: {
                message: error.message,
                code: error.code
            }
        });
    }

    // Unknown error
    Sentry.captureException(error);
    res.status(500).json({ error: { message: 'Internal server error' } });
}
```

---

## asyncErrorWrapper Utility

### Pattern

```typescript
export function asyncErrorWrapper(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await handler(req, res, next);
        } catch (error) {
            next(error);
        }
    };
}
```

### Usage

```typescript
// Express 4 needs a wrapper; Express 5 forwards returned promise rejections
router.get('/users', async (req, res) => {
    const users = await userService.getAll(); // Forward rejection according to the installed Express major
    res.json(users);
});

// With wrapper - errors caught
router.get('/users', asyncErrorWrapper(async (req, res) => {
    const users = await userService.getAll();
    res.json(users);
}));
```

---

## Error Propagation

### Proper Error Chains

```typescript
// ✅ Propagate errors up the stack
async function repositoryMethod() {
    try {
        return await PrismaService.main.user.findMany();
    } catch (error) {
        // Preserve error; outer boundary owns telemetry.
        throw error; // Propagate to service
    }
}

async function serviceMethod() {
    try {
        return await repositoryMethod();
    } catch (error) {
        // Preserve error; avoid duplicate telemetry.
        throw error; // Propagate to controller
    }
}

async function controllerMethod(req, res) {
    try {
        const result = await serviceMethod();
        res.json(result);
    } catch (error) {
        this.handleError(error, res, 'controllerMethod'); // Final handler
    }
}
```

---

## Common Async Pitfalls

### Fire and Forget (Bad)

```typescript
// ❌ NEVER: Fire and forget
async function processRequest(req, res) {
    sendEmail(user.email); // Fires async, errors unhandled!
    res.json({ success: true });
}

// ✅ ALWAYS: Await or handle
async function processRequest(req, res) {
    try {
        await sendEmail(user.email);
        res.json({ success: true });
    } catch (error) {
        Sentry.captureException(error);
        res.status(500).json({ error: 'Failed to send email' });
    }
}

// ✅ OR: Intentional background task
async function processRequest(req, res) {
    sendEmail(user.email).catch(error => {
        Sentry.captureException(error);
    });
    res.json({ success: true });
}
```

### Last-Resort Failure Reporting

These handlers are not recovery. Stop accepting requests, close resources, await a bounded telemetry flush, then exit nonzero under a supervisor. A handler that only sets exitCode may keep running while handles remain open; implement shutdown for the target application.

```typescript
// ✅ Global handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    Sentry.captureException(reason, {
        tags: { type: 'unhandled_rejection' }
    });
    // Stop accepting work and exit through a bounded shutdown; continuing is unsafe.
    process.exitCode = 1;
});

process.on('uncaughtException', (error) => {
    Sentry.captureException(error, {
        tags: { type: 'uncaught_exception' }
    });
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
```

---

**Related Files:**
- SKILL.md
- [sentry-and-monitoring.md](sentry-and-monitoring.md)
- [complete-examples.md](complete-examples.md)
