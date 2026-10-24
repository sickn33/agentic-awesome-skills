# Sentry Integration and Monitoring

> Scope: independent illustrative fragments, not a supplied runnable application. Private project paths, helpers, DTOs and Prisma models must be implemented/adapted in the target repository. Pin and check installed Express/Sentry/Zod/Prisma versions. Authentication does not grant object/tenant access; authorize before reads/writes, enforce CSRF for cookie authentication, allowlist DTOs and project public response fields. Capture unexpected errors once at an approved, redacted boundary; never send raw request bodies, credentials or personal data to telemetry.


Complete guide to error tracking and performance monitoring with Sentry v8.

## Table of Contents

- [Core Principles](#core-principles)
- [Sentry Initialization](#sentry-initialization)
- [Error Capture Patterns](#error-capture-patterns)
- [Performance Monitoring](#performance-monitoring)
- [Cron Job Monitoring](#cron-job-monitoring)
- [Error Context Best Practices](#error-context-best-practices)
- [Common Mistakes](#common-mistakes)

---

## Core Principles

Capture unexpected failures once at the approved boundary. Expected validation/authentication failures need bounded metrics rather than raw payload capture.

Select a supported SDK version and approved destination; document data minimization, access and retention.

---

## Sentry Initialization

### instrument.ts Pattern

**Location:** `src/instrument.ts` (MUST be first import in server.ts and all cron jobs)

**Template for Microservices:**

```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
    dsn: process.env.SENTRY_DSN, // validated configuration bootstrap
    environment: process.env.NODE_ENV || 'development',
    sendDefaultPii: false,
    tracesSampleRate: 0, // enable a bounded rate only after trace-data review
    beforeSend(event) {
        // Conservative example: discard request/user/extra/breadcrumb snapshots.
        // Also review error messages, stack frames, attachments, traces and logs.
        delete event.request;
        delete event.user;
        delete event.extra;
        delete event.contexts;
        delete event.breadcrumbs;
        return event;
    },
});
```

Initialize before instrumented imports according to the installed SDK/module mode. This filter is not anonymization: exception text, integrations, traces and logs require separate controls. Disable unreviewed local-variable, body, header, query and user capture. Use the installed SDK's Express error handler before a response-consuming custom boundary, or explicitly capture there once. Do not register both capture paths.

**Critical Points:**
- beforeSend requires data review; redaction does not certify privacy
- Filter non-critical errors
- Comprehensive integrations
- Prisma instrumentation
- Service-specific tagging

---

## Error Capture Patterns

### 1. BaseController Pattern

```typescript
// Use BaseController.handleError
protected handleError(error: unknown, res: Response, context: string, statusCode = 500): void {
    Sentry.withScope((scope) => {
        scope.setTag('controller', this.constructor.name);
        scope.setTag('operation', context);
        scope.setUser({ id: res.locals?.claims?.userId });
        Sentry.captureException(error);
    });

    res.status(statusCode).json({
        success: false,
        error: { message: statusCode >= 500 ? 'Internal server error' : 'Request could not be completed' }
    });
}
```

### 2. Workflow Error Handling

```typescript
import { SentryHelper } from '../utils/sentryHelper';

try {
    await businessOperation();
} catch (error) {
    SentryHelper.captureOperationError(error, {
        operationType: 'POST_CREATION',
        entityId: 123,
        userId: 'user-123',
        operation: 'createPost',
    });
    throw error;
}
```

### 3. Service Layer Error Handling

```typescript
try {
    await someOperation();
} catch (error) {
    Sentry.captureException(error, {
        tags: {
            service: 'form',
            operation: 'someOperation'
        },
        extra: {
            userId: currentUser.id,
            entityId: 123
        }
    });
    throw error;
}
```

---

## Performance Monitoring

### Database Performance Tracking

```typescript
import { DatabasePerformanceMonitor } from '../utils/databasePerformance';

const result = await DatabasePerformanceMonitor.withPerformanceTracking(
    'findMany',
    'UserProfile',
    async () => {
        return await PrismaService.main.userProfile.findMany({ take: 5 });
    }
);
```

### API Endpoint Spans

```typescript
router.post('/operation', async (req, res) => {
    return await Sentry.startSpan({
        name: 'operation.execute',
        op: 'http.server',
        attributes: {
            'http.method': 'POST',
            'http.route': '/operation'
        }
    }, async () => {
        const result = await performOperation();
        res.json(result);
    });
});
```

---

## Cron Job Monitoring

### Mandatory Pattern

```typescript
#!/usr/bin/env node
import '../instrument'; // FIRST LINE after shebang
import * as Sentry from '@sentry/node';

async function main() {
    return await Sentry.startSpan({
        name: 'cron.job-name',
        op: 'cron',
        attributes: {
            'cron.job': 'job-name',
            'cron.startTime': new Date().toISOString(),
        }
    }, async () => {
        try {
            // Cron job logic here
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    'cron.job': 'job-name',
                    'error.type': 'execution_error'
                }
            });
            console.error('[Cron] Error:', error);
            await Sentry.flush(2000);
            process.exitCode = 1;
            throw error;
        }
    });
}

main().then(async () => {
    await Sentry.flush(2000);
}).catch(async () => {
    await Sentry.flush(2000);
    process.exitCode = 1;
});
```

---

## Error Context Best Practices

### Rich Context Example

```typescript
Sentry.withScope((scope) => {
    // User context
    scope.setUser({
        id: user.id,
        // Use an approved pseudonymous ID only; omit email/username.
    });

    // Tags for filtering
    scope.setTag('service', 'form');
    scope.setTag('endpoint', req.path);
    scope.setTag('method', req.method);

    // Structured context
    scope.setContext('operation', {
        type: 'workflow.complete',
        workflowId: 123,
        stepId: 456
    });

    // Breadcrumbs for timeline
    scope.addBreadcrumb({
        category: 'workflow',
        message: 'Starting step completion',
        level: 'info',
        data: { stepId: 456 }
    });

    Sentry.captureException(error);
});
```

---

## Common Mistakes

```typescript
// ❌ Swallowing errors
try {
    await riskyOperation();
} catch (error) {
    // Silent failure
}

// ❌ Generic error messages
throw new Error('Error occurred');

// ❌ Exposing sensitive data
Sentry.captureException(error, {
    extra: { password: user.password } // NEVER
});

// ❌ Missing async error handling
async function bad() {
    fetchData().then(data => processResult(data)); // Unhandled
}

// ✅ Proper async handling
async function good() {
    try {
        const data = await fetchData();
        processResult(data);
    } catch (error) {
        Sentry.captureException(error);
        throw error;
    }
}
```

---

**Related Files:**
- SKILL.md
- [routing-and-controllers.md](routing-and-controllers.md)
- [async-and-errors.md](async-and-errors.md)
