---
name: inngest
description: Inngest expert for serverless-first background jobs, event-driven
  workflows, and durable execution without managing queues or workers.
risk: none
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Inngest Integration

Inngest expert for serverless-first background jobs, event-driven workflows,
and durable execution without managing queues or workers.

## Principles

- Events are the primitive - everything triggers from events, not queues
- Steps are your checkpoints - each step result is durably stored
- Sleep is not a hack - Inngest sleeps are real, not blocking threads
- Retries are automatic - but you control the policy
- Functions are just HTTP handlers - deploy anywhere that serves HTTP
- Concurrency is a first-class concern - protect downstream services
- Idempotency keys prevent duplicates - use them for critical operations
- Fan-out is built-in - one event can trigger many functions

## Capabilities

- inngest-functions
- event-driven-workflows
- step-functions
- serverless-background-jobs
- durable-sleep
- fan-out-patterns
- concurrency-control
- scheduled-functions

## Scope

- redis-queues -> bullmq-specialist
- workflow-orchestration -> temporal-craftsman
- message-streaming -> event-architect
- infrastructure -> infra-architect

## Tooling

### Core

- inngest
- inngest-cli

### Frameworks

- nextjs
- express
- hono
- remix
- sveltekit

### Deployment

- vercel
- cloudflare-workers
- netlify
- railway
- fly-io

### Patterns

- step-functions
- event-fan-out
- scheduled-cron
- webhook-handling

## Patterns

### Basic Function Setup

Inngest function with typed events in Next.js

**When to use**: Starting with Inngest in any Next.js project

// lib/inngest/client.ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'my-app',
  schemas: new EventSchemas().fromRecord<Events>(),
});

// Define your events with types
type Events = {
  'user/signed.up': { data: { userId: string; email: string } };
  'order/placed': { data: { orderId: string; total: number } };
};

// lib/inngest/functions.ts
import { inngest } from './client';

export const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email' },
  { event: 'user/signed.up' },
  async ({ event, step }) => {
    // Step 1: Get user details
    const user = await step.run('get-user', async () => {
      return await db.users.findUnique({ where: { id: event.data.userId } });
    });

    // Step 2: Send welcome email
    await step.run('send-email', async () => {
      await resend.emails.send({
        to: user.email,
        subject: 'Welcome!',
        template: 'welcome',
      });
    });

    // Step 3: Wait 24 hours, then send tips
    await step.sleep('wait-for-tips', '24h');

    await step.run('send-tips', async () => {
      await resend.emails.send({
        to: user.email,
        subject: 'Getting Started Tips',
        template: 'tips',
      });
    });
  }
);

// app/api/inngest/route.ts (Next.js App Router)
import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { sendWelcomeEmail } from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendWelcomeEmail],
});

### Multi-Step Workflow

Complex workflow with parallel steps and error handling

**When to use**: Processing that involves multiple services or long waits

export const processOrder = inngest.createFunction(
  {
    id: 'process-order',
    retries: 3,
    concurrency: { limit: 10 },  // Max 10 orders processing at once
  },
  { event: 'order/placed' },
  async ({ event, step }) => {
    const { orderId } = event.data;

    // Parallel steps - both run simultaneously
    const [inventory, payment] = await Promise.all([
      step.run('check-inventory', () => checkInventory(orderId)),
      step.run('validate-payment', () => validatePayment(orderId)),
    ]);

    if (!inventory.available) {
      // Send event instead of direct call (fan-out pattern)
      await step.sendEvent('notify-backorder', {
        name: 'order/backordered',
        data: { orderId, items: inventory.missing },
      });
      return { status: 'backordered' };
    }

    // Process payment
    const charge = await step.run('charge-payment', async () => {
      return await stripe.charges.create({
        amount: event.data.total,
        customer: payment.customerId,
      });
    });

    // Ship order
    await step.run('ship-order', () => fulfillment.ship(orderId));

    return { status: 'completed', chargeId: charge.id };
  }
);

### Scheduled/Cron Functions

Functions that run on a schedule

**When to use**: Recurring tasks like daily reports or cleanup jobs

export const dailyDigest = inngest.createFunction(
  { id: 'daily-digest' },
  { cron: '0 9 * * *' },  // Every day at 9am UTC
  async ({ step }) => {
    // Get all users who want digests
    const users = await step.run('get-users', async () => {
      return await db.users.findMany({
        where: { digestEnabled: true },
      });
    });

    // Send to each user (creates child events)
    await step.sendEvent(
      'send-digests',
      users.map(user => ({
        name: 'digest/send',
        data: { userId: user.id },
      }))
    );

    return { sent: users.length };
  }
);

// Separate function handles individual digest sending
export const sendDigest = inngest.createFunction(
  { id: 'send-digest', concurrency: { limit: 50 } },
  { event: 'digest/send' },
  async ({ event, step }) => {
    // ... send individual digest
  }
);

### Webhook Handler with Idempotency

Safely process webhooks with deduplication

**When to use**: Handling Stripe, GitHub, or other webhooks

export const handleStripeWebhook = inngest.createFunction(
  {
    id: 'stripe-webhook',
    // Deduplicate by Stripe event ID
    idempotency: 'event.data.stripeEventId',
  },
  { event: 'stripe/webhook.received' },
  async ({ event, step }) => {
    const { type, data } = event.data;

    switch (type) {
      case 'checkout.session.completed':
        await step.run('fulfill-order', async () => {
          await fulfillOrder(data.session.id);
        });
        break;

      case 'customer.subscription.deleted':
        await step.run('cancel-subscription', async () => {
          await cancelSubscription(data.subscription.id);
        });
        break;
    }
  }
);

### AI Pipeline with Long Processing

Multi-step AI processing with chunked work

**When to use**: AI workflows that may take minutes to complete

export const processDocument = inngest.createFunction(
  {
    id: 'process-document',
    retries: 2,
    concurrency: { limit: 5 },  // Limit API usage
  },
  { event: 'document/uploaded' },
  async ({ event, step }) => {
    // Step 1: Extract text (may take a while)
    const text = await step.run('extract-text', async () => {
      return await extractTextFromPDF(event.data.fileUrl);
    });

    // Step 2: Chunk for embedding
    const chunks = await step.run('chunk-text', async () => {
      return chunkText(text, { maxTokens: 500 });
    });

    // Step 3: Generate embeddings (API rate limited)
    const embeddings = await step.run('generate-embeddings', async () => {
      return await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks,
      });
    });

    // Step 4: Store in vector DB
    await step.run('store-vectors', async () => {
      await vectorDb.upsert({
        vectors: embeddings.data.map((e, i) => ({
          id: `${event.data.documentId}-${i}`,
          values: e.embedding,
          metadata: { chunk: chunks[i] },
        })),
      });
    });

    return { chunks: chunks.length, status: 'indexed' };
  }
);

## Validation Checks

### Inngest serve handler present

Severity: CRITICAL

Message: Inngest requires a serve handler to receive events

Fix action: Create app/api/inngest/route.ts with serve() export

### Functions registered with serve

Severity: ERROR

Message: Ensure all Inngest functions are registered in the serve() call

Fix action: Add function to the functions array in serve()

### Step.run has descriptive name

Severity: WARNING

Message: Step names should be kebab-case and descriptive

Fix action: Use descriptive step names like 'fetch-user' or 'send-email'

### waitForEvent has timeout

Severity: ERROR

Message: waitForEvent should have a timeout to prevent infinite waits

Fix action: Add timeout option: { timeout: '24h' }

### Function has concurrency limit

Severity: WARNING

Message: Consider adding concurrency limits to protect downstream services

Fix action: Add concurrency: { limit: 10 } to function config

### Event types defined

Severity: WARNING

Message: Inngest client should define event schemas for type safety

Fix action: Add schemas: new EventSchemas().fromRecord<Events>()

### Function has unique ID

Severity: CRITICAL

Message: Every Inngest function must have a unique ID

Fix action: Add id: 'my-function-name' to function config

### Sleep uses duration string

Severity: WARNING

Message: step.sleep should use duration strings like '1h' or '30m', not milliseconds

Fix action: Use duration string: step.sleep('wait', '1h')

### Retry policy configured

Severity: WARNING

Message: Consider configuring retry policy for failure handling

Fix action: Add retries: 3 or retries: { attempts: 3, backoff: { ... } }

### Idempotency key for payment functions

Severity: ERROR

Message: Payment-related functions should use idempotency keys

Fix action: Add idempotency: 'event.data.orderId' to function config

## Collaboration

### Delegation Triggers

- redis|queue infrastructure|bullmq -> bullmq-specialist (Need Redis-based queue with existing infrastructure)
- saga|compensation|rollback|long-running workflow -> temporal-craftsman (Need complex workflow orchestration with compensation)
- event sourcing|event store|cqrs -> event-architect (Need event sourcing patterns)
- vercel|deploy|production -> vercel-deployment (Need deployment configuration)
- database|schema|data model -> supabase-backend (Need database for event data)
- api|endpoint|route -> backend (Need API to trigger events)

### Vercel Background Jobs

Skills: inngest, nextjs-app-router, vercel-deployment

Workflow:

```
1. Define Inngest functions (inngest)
2. Set up serve handler in Next.js (nextjs-app-router)
3. Configure function timeouts (vercel-deployment)
4. Deploy and test (vercel-deployment)
```

### AI Pipeline

Skills: inngest, ai-agents-architect, supabase-backend

Workflow:

```
1. Design AI workflow steps (ai-agents-architect)
2. Implement with Inngest durability (inngest)
3. Store results in database (supabase-backend)
4. Handle retries for API failures (inngest)
```

### Webhook Processing

Skills: inngest, stripe-integration, backend

Workflow:

```
1. Receive webhook (backend)
2. Send to Inngest with idempotency (inngest)
3. Process payment logic (stripe-integration)
4. Update application state (backend)
```

### Email Automation

Skills: inngest, email-systems, supabase-backend

Workflow:

```
1. Trigger event from user action (inngest)
2. Schedule drip emails with step.sleep (inngest)
3. Send emails with retry (email-systems)
4. Track email status (supabase-backend)
```

### Scheduled Tasks

Skills: inngest, backend, analytics-architecture

Workflow:

```
1. Define cron triggers (inngest)
2. Implement processing logic (backend)
3. Aggregate and report data (analytics-architecture)
4. Handle failures with alerting (inngest)
```

## Related Skills

Works well with: `nextjs-app-router`, `vercel-deployment`, `supabase-backend`, `email-systems`, `ai-agents-architect`, `stripe-integration`

## When to Use
- User mentions or implies: inngest
- User mentions or implies: serverless background job
- User mentions or implies: event-driven workflow
- User mentions or implies: step function
- User mentions or implies: durable execution
- User mentions or implies: vercel background job
- User mentions or implies: scheduled function
- User mentions or implies: fan out

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
