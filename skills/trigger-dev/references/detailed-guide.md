# Trigger.dev Integration - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Principles

- Tasks are the building blocks - each task is independently retryable
- Runs are durable - state survives crashes and restarts
- Integrations are first-class - use built-in API wrappers for reliability
- Logs are your debugging lifeline - log liberally in tasks
- Concurrency protects your resources - always set limits
- Delays and schedules are built-in - no external cron needed
- AI-ready by design - long-running AI tasks just work
- Local development matches production - use the CLI


## Capabilities

- trigger-dev-tasks
- ai-background-jobs
- integration-tasks
- scheduled-triggers
- webhook-handlers
- long-running-tasks
- task-queues
- batch-processing


## Scope

- redis-queues -> bullmq-specialist
- serverless-queues -> upstash-qstash
- pure-event-driven -> inngest
- workflow-orchestration -> temporal-craftsman
- infrastructure -> infra-architect


## Tooling

### Core

- trigger-dev-sdk
- trigger-cli

### Frameworks

- nextjs
- remix
- express
- hono

### Integrations

- openai
- anthropic
- resend
- stripe
- slack
- supabase

### Deployment

- trigger-cloud
- self-hosted
- docker


## Patterns

### Basic Task Setup

Setting up Trigger.dev in a Next.js project

**When to use**: Starting with Trigger.dev in any project

// trigger.config.ts
import { defineConfig } from '@trigger.dev/sdk';

export default defineConfig({
  project: 'my-project',
  runtime: 'node',
  maxDuration: 300,
  logLevel: 'log',
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});

// src/trigger/tasks.ts
import { task, logger } from '@trigger.dev/sdk';

export const helloWorld = task({
  id: 'hello-world',
  run: async (payload: { name: string }) => {
    logger.log('Processing hello world'); // Avoid logging personal payload data

    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));

    return { message: `Hello, ${payload.name}!` };
  },
});

// Triggering from your app
import { helloWorld } from '@/trigger/tasks';

// Fire and forget
await helloWorld.trigger({ name: 'World' });

// Inside another task's run(), wait for the child and check its outcome:
const result = await helloWorld.triggerAndWait({ name: 'World' });
if (!result.ok) throw result.error;
// Backend callers use trigger() and the documented run retrieval APIs.

### AI Task with the provider SDK

Use the provider's supported SDK inside a task. Configure the model through a
server-side allowlist and environment, set request and task timeouts, bound tokens,
and account for both SDK and task retry attempts. Do not copy v2 integration
packages into current SDK tasks. The provider call can be repeated on retry;
Trigger.dev does not make that external operation exactly-once.

### Scheduled Task with Cron

Tasks that run on a schedule

**When to use**: Periodic jobs like reports, cleanup, or syncs

import { schedules, task, logger } from '@trigger.dev/sdk';

export const dailyCleanup = schedules.task({
  id: 'daily-cleanup',
  cron: '0 2 * * *',  // 2 AM daily
  run: async () => {
    logger.log('Starting daily cleanup');

    // Clean up old records
    const deleted = await db.logs.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    logger.log('Cleanup complete', { deletedCount: deleted.count });

    return { deleted: deleted.count };
  },
});

// Weekly report
export const weeklyReport = schedules.task({
  id: 'weekly-report',
  cron: '0 9 * * 1',  // Monday 9 AM
  run: async () => {
    const stats = await generateWeeklyStats();
    await sendReportEmail(stats);
    return stats;
  },
});

### Batch Processing

Processing large datasets in batches

**When to use**: Need to process many items with rate limiting

import { task, logger, wait } from '@trigger.dev/sdk';

export const processBatch = task({
  id: 'process-batch',
  queue: {
    concurrencyLimit: 5,  // Only 5 running at once
  },
  run: async (payload: { items: string[] }) => {
    const results = [];

    for (const item of payload.items) {
      logger.log('Processing item', { item });

      const result = await processItem(item);
      results.push(result);

      // Respect rate limits
      await wait.for({ seconds: 1 });
    }

    return { processed: results.length, results };
  },
});

// Trigger batch processing
export const startBatchJob = task({
  id: 'start-batch',
  run: async (payload: { datasetId: string }) => {
    const items = await fetchDataset(payload.datasetId);

    // Split into chunks of 100
    const chunks = chunkArray(items, 100);

    // Trigger parallel batch tasks
    const handles = await Promise.all(
      chunks.map(chunk => processBatch.trigger({ items: chunk }))
    );

    logger.log('Started batch processing', {
      totalItems: items.length,
      batches: chunks.length,
    });

    return { batches: handles.length };
  },
});

### Webhook Handler

Processing webhooks reliably with deduplication

**When to use**: Handling webhooks from Stripe, GitHub, etc.

import { task, logger, idempotencyKeys } from '@trigger.dev/sdk';

export const handleStripeEvent = task({
  id: 'handle-stripe-event',
  run: async (payload: {
    eventId: string;
    type: string;
    data: any;
  }) => {
    // Authenticate the raw webhook and deduplicate before triggering this task.
    // idempotencyKeys.create() returns a key, not an object with isNew.
    // The business handlers below also require durable/provider idempotency.

    logger.log('Processing Stripe event', {
      type: payload.type,
      eventId: payload.eventId,
    });

    switch (payload.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(payload.data);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(payload.data);
        break;
    }

    return { processed: true, type: payload.type };
  },
});


## Sharp Edges

### Task timeout kills execution without clear error

Severity: CRITICAL

Situation: Long-running AI task or batch process suddenly stops. No error in logs.
Task shows as failed in dashboard but no stack trace. Data partially processed.

Symptoms:
- Task fails with no error message
- Partial data processing
- Works locally, fails in production
- "Task timed out" in dashboard

Why this breaks:
Configure an explicit maxDuration compute budget. Exceeding it stops the attempt;
waitpoint time is excluded, and lifecycle cleanup may not run. If you're not logging progress, you won't know
where it stopped. This is especially common with AI tasks that can take minutes.

Recommended fix:

# Configure explicit timeouts:
```typescript
export const processDocument = task({
  id: 'process-document',
  maxDuration: 300, // Compute-time budget in seconds, independent of machine size
  run: async (payload) => {
    logger.log('Starting document processing', { docId: payload.id });

    // Log progress at each step
    logger.log('Step 1: Extracting text');
    const text = await extractText(payload.fileUrl);

    logger.log('Step 2: Generating embeddings', { textLength: text.length });
    const embeddings = await generateEmbeddings(text);

    logger.log('Step 3: Storing vectors', { count: embeddings.length });
    await storeVectors(embeddings);

    logger.log('Completed successfully');
    return { processed: true };
  },
});
```

# For very long tasks, break into subtasks:
- Use triggerAndWait for sequential steps
- Each subtask has its own timeout
- Progress is visible in dashboard

### Non-serializable payload causes silent task failure

Severity: CRITICAL

Situation: Passing Date objects, class instances, or circular references in payload.
Task queued but never runs. Or runs with undefined/null values.

Symptoms:
- Payload values are undefined in task
- Date objects become strings
- Class methods not available
- "Converting circular structure to JSON"

Why this breaks:
Trigger.dev serializes payloads to JSON. Dates become strings, class instances
lose methods, functions disappear, circular refs throw. Your task sees different
data than you sent.

Recommended fix:

# Always use plain objects:
```typescript
// WRONG - Date becomes string
await myTask.trigger({ createdAt: new Date() });

// RIGHT - ISO string
await myTask.trigger({ createdAt: new Date().toISOString() });

// WRONG - Class instance
await myTask.trigger({ user: new User(data) });

// RIGHT - Plain object
await myTask.trigger({ user: { id: data.id, email: data.email } });

// WRONG - Circular reference
const obj = { parent: null };
obj.parent = obj;
await myTask.trigger(obj);  // Throws!
```

# In task, reconstitute as needed:
```typescript
run: async (payload: { createdAt: string }) => {
  const date = new Date(payload.createdAt);
  // ...
}
```

### Environment variables not synced to Trigger.dev cloud

Severity: CRITICAL

Situation: Task works locally but fails in production. Env var that exists in Vercel
is undefined in Trigger.dev. API calls fail, database connections fail.

Symptoms:
- "Environment variable not found"
- API calls return 401 in production tasks
- Works in dev, fails in production
- Database connection errors in tasks

Why this breaks:
Trigger.dev runs tasks in its own cloud, separate from your Vercel/Railway
deployment. Environment variables must be configured in BOTH places. They
don't automatically sync.

Recommended fix:

# Sync env vars to Trigger.dev:
1. Go to Trigger.dev dashboard
2. Project Settings > Environment Variables
3. Add ALL required env vars

Use the documented environment-variable dashboard or the installed CLI's
verified help. Do not place live secret examples in shell history or a tracked
.env file; store only the least-privilege secrets needed by the target environment.

# Common missing vars:
- DATABASE_URL
- OPENAI_API_KEY / ANTHROPIC_API_KEY
- STRIPE_SECRET_KEY
- Service API keys
- Internal service URLs

# Test in staging:
Trigger.dev has separate envs - configure staging too

### SDK version mismatch between CLI and package

Severity: HIGH

Situation: Updated @trigger.dev/sdk but forgot to update CLI. Or vice versa.
Tasks fail to register. Weird type errors. Dev server crashes.

Symptoms:
- Tasks not appearing in dashboard
- Type errors in trigger.config.ts
- "Failed to register task"
- Dev server crashes on start

Why this breaks:
The Trigger.dev SDK and CLI must be on compatible versions. Breaking changes
between versions cause registration failures. The CLI generates types that
must match the SDK.

Recommended fix:

# Always update together:
```bash
# Update both SDK and CLI
npm install @trigger.dev/sdk@latest
npx trigger.dev@latest dev

# Or pin to same version
npm install @trigger.dev/sdk@3.3.0
npx trigger.dev@3.3.0 dev
```

# Check versions:
```bash
npx trigger.dev@latest --version
npm list @trigger.dev/sdk
```

# In CI/CD:
```yaml
- run: npm install @trigger.dev/sdk@${{ env.TRIGGER_VERSION }}
- run: npx trigger.dev@${{ env.TRIGGER_VERSION }} deploy
```

### Task retries cause duplicate side effects

Severity: HIGH

Situation: Task sends email, then fails on next step. Retry sends email again.
Customer gets 3 identical emails. Or 3 Stripe charges. Or 3 Slack messages.

Symptoms:
- Duplicate emails on retry
- Multiple charges for same order
- Duplicate webhook deliveries
- Data inserted multiple times

Why this breaks:
Trigger.dev retries failed tasks from the beginning. If your task has side
effects before the failure point, those execute again. Without idempotency,
you create duplicates.

Recommended fix:

# Bind idempotency when triggering a task

Create a key and pass it as the trigger option; it has no `isNew` property.
Use global scope when deduplicating separate deliveries of the same verified
provider event, and choose an explicit retention window suitable for redelivery.
Run-scoped keys primarily cover retries within the same parent run. Key expiry
allows a later run; it is not permanent business deduplication.

For an external email, charge or write, also use the provider's idempotency key
and a durable unique business-operation record/outbox. A check-then-send-then-log
sequence races and can duplicate after a crash. An ambiguous send must be
reconciled with the provider before retrying.

### High concurrency overwhelms downstream services

Severity: HIGH

Situation: Burst of 1000 tasks triggered. All hit OpenAI API simultaneously.
Rate limited. All fail. Retry. Rate limited again. Vicious cycle.

Symptoms:
- Rate limit errors (429)
- Database connection pool exhausted
- API returns "too many requests"
- Mass task failures

Why this breaks:
Trigger.dev scales to handle many concurrent tasks. But your downstream
APIs (OpenAI, databases, external services) have rate limits. Without
concurrency control, you overwhelm them.

Recommended fix:

# Set queue concurrency limits:
```typescript
export const callOpenAI = task({
  id: 'call-openai',
  queue: {
    concurrencyLimit: 10,  // Only 10 running at once
  },
  run: async (payload) => {
    // Protected by concurrency limit
    return await openai.chat.completions.create(payload);
  },
});
```

# For rate-limited APIs:
```typescript
export const callRateLimitedAPI = task({
  id: 'call-api',
  queue: {
    concurrencyLimit: 5,
  },
  retry: {
    maxAttempts: 5,
    minTimeoutInMs: 5000,  // Wait before retry
    factor: 2,  // Exponential backoff
  },
  run: async (payload) => {
    // Add delay between calls
    await wait.for({ milliseconds: 200 });
    return await externalAPI.call(payload);
  },
});
```

# Start conservative:
- 5-10 for external APIs
- 20-50 for databases
- Increase based on monitoring

### trigger.config.ts not at project root

Severity: HIGH

Situation: Running npx trigger.dev dev but CLI can't find config.
Or config exists but in wrong location (monorepo issue).

Symptoms:
- "Could not find trigger.config.ts"
- Tasks not discovered
- Empty task list in dashboard
- Works for one package, not another

Why this breaks:
The CLI looks for trigger.config.ts at the current working directory.
In monorepos, you must run from the package directory, not the root.
Wrong location = tasks not discovered.

Recommended fix:

# Config must be at package root:
```
my-app/
├── trigger.config.ts  <- Here
├── package.json
├── src/
│   └── trigger/
│       └── tasks.ts
```

# In monorepos:
```
monorepo/
├── apps/
│   └── web/
│       ├── trigger.config.ts  <- Here, not at monorepo root
│       ├── package.json
│       └── src/trigger/

# Run from package directory
cd apps/web && npx trigger.dev dev
```

# Specify config location:
```bash
npx trigger.dev dev --config ./apps/web/trigger.config.ts
```

### wait.for in loops causes memory issues

Severity: MEDIUM

Situation: Processing thousands of items with wait.for between each.
Task memory grows. Eventually killed for memory.

Symptoms:
- Task killed for memory
- Slow task execution
- State blob too large error
- Works for small batches, fails for large

Why this breaks:
Many waits can add overhead; checkpoint and memory behavior depend on the engine
and wait duration. Profile the actual run rather than assuming each wait leaks state.

Recommended fix:

# Batch instead of individual waits:
```typescript
// WRONG - Wait per item
for (const item of items) {
  await processItem(item);
  await wait.for({ milliseconds: 100 });  // profile checkpoint overhead
}

// RIGHT - Batch processing
const chunks = chunkArray(items, 50);
for (const chunk of chunks) {
  await Promise.all(chunk.map(processItem));
  await wait.for({ milliseconds: 500 });  // Only 20 waits
}
```

# For very large datasets, use subtasks:
```typescript
export const processAll = task({
  id: 'process-all',
  run: async (payload: { items: string[] }) => {
    const chunks = chunkArray(payload.items, 100);

    // Each chunk is a separate task
    for (const chunk of chunks) {
      const result = await processChunk.triggerAndWait({ items: chunk });
      if (!result.ok) throw result.error;
    }
  },
});
```

### Provider SDK retry interaction

Current tasks can use provider SDKs directly. Confirm the installed SDK's retry,
timeout and error behavior rather than assuming no retries or guaranteed rate
limiting. Task retries restart code, so budget repeated AI requests and protect
external effects. Legacy integration package names are not migration instructions.

### Triggering tasks without dev server running

Severity: MEDIUM

Situation: Called task.trigger() but nothing happens. No errors either.
Task just disappears into void. Dev server wasn't running.

Symptoms:
- Triggers don't run
- No task in dashboard
- No errors, just silence
- Works in production, not dev

Why this breaks:
In development, tasks run through the local dev server (npx trigger.dev dev).
If it's not running, triggers queue up or fail silently depending on
configuration. Production works differently.

Recommended fix:

# Always run dev server during development:
```bash
# Terminal 1: Your app
npm run dev

# Terminal 2: Trigger.dev dev server
npx trigger.dev dev
```

# Check dev server is connected:
- Should show "Connected to Trigger.dev"
- Tasks should appear in console
- Dashboard shows task registrations

# In package.json:
```json
{
  "scripts": {
    "dev": "next dev",
    "trigger:dev": "trigger.dev dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run trigger:dev\""
  }
}
```


## Validation Checks

### Task without logging

Severity: WARNING

Message: Task has no logging. Add logger.log() calls for debugging in production.

Fix action: Import { logger } from '@trigger.dev/sdk' and add log statements

### Task without error handling

Severity: ERROR

Message: Task lacks explicit error handling. Unhandled errors may cause unclear failures.

Fix action: Let failures propagate for retries; catch only to classify/rethrow sanitized context

### Task without concurrency limit

Severity: WARNING

Message: Task has no concurrency limit. High load may overwhelm downstream services.

Fix action: Add queue: { concurrencyLimit: 10 } to protect APIs and databases

### Date object in trigger payload

Severity: ERROR

Message: Date objects are serialized to strings. Use ISO string format instead.

Fix action: Use date.toISOString() instead of new Date()

### Class instance in trigger payload

Severity: ERROR

Message: Class instances lose methods when serialized. Use plain objects.

Fix action: Convert class instance to plain object before triggering

### Task without explicit ID

Severity: ERROR

Message: Task must have an explicit id property for registration.

Fix action: Add id: 'my-task-name' to task definition

### Trigger.dev API key hardcoded

Severity: CRITICAL

Message: Trigger.dev API key should not be hardcoded - use TRIGGER_SECRET_KEY env var

Fix action: Remove hardcoded key and use process.env.TRIGGER_SECRET_KEY

### Provider SDK configuration

Severity: WARNING

Message: Verify the provider SDK retry policy and combined task-attempt budget

Fix action: Configure bounded retries, timeout and token/cost limits

### Provider rate limiting

Severity: WARNING

Message: Concurrency limits alone do not enforce requests or tokens per minute

Fix action: Use a shared rate limiter and bounded retry backoff

### wait.for inside loop

Severity: WARNING

Message: wait.for in loops creates many checkpoints. Consider batching instead.

Fix action: Batch items and use fewer waits, or split into subtasks


## Collaboration

### Delegation Triggers

- redis|bullmq|traditional queue -> bullmq-specialist (Need Redis-backed queues instead of managed service)
- serverless queue|http queue|no workers -> upstash-qstash (Need HTTP-delivered queues and schedules without a worker runtime)
- vercel|deployment|serverless -> vercel-deployment (Trigger.dev needs deployment config)
- database|postgres|supabase -> supabase-backend (Tasks need database access)
- openai|anthropic|ai model|llm -> llm-architect (Tasks need AI model integration)
- event-driven|event sourcing|fan out -> inngest (Need pure event-driven model)

### AI Background Processing

Skills: trigger-dev, llm-architect, nextjs-app-router, supabase-backend

Workflow:

```
1. User triggers via UI (nextjs-app-router)
2. Task queued (trigger-dev)
3. AI processing (llm-architect)
4. Results stored (supabase-backend)
```

### Webhook Processing Pipeline

Skills: trigger-dev, stripe-integration, email-systems, supabase-backend

Workflow:

```
1. Webhook received (stripe-integration)
2. Task triggered (trigger-dev)
3. Database updated (supabase-backend)
4. Notification sent (email-systems)
```

### Batch Data Processing

Skills: trigger-dev, supabase-backend, backend

Workflow:

```
1. Batch job triggered (backend)
2. Data chunked and processed (trigger-dev)
3. Results aggregated (supabase-backend)
```

### Scheduled Reports

Skills: trigger-dev, supabase-backend, email-systems

Workflow:

```
1. Cron triggers task (trigger-dev)
2. Data aggregated (supabase-backend)
3. Report generated and sent (email-systems)
```


## Related Skills

Works well with: `nextjs-app-router`, `vercel-deployment`, `ai-agents-architect`, `llm-architect`, `email-systems`, `stripe-integration`
