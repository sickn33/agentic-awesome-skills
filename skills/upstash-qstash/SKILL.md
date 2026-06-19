---
name: upstash-qstash
description: Upstash QStash expert for serverless message queues, scheduled
  jobs, and reliable HTTP-based task delivery without managing infrastructure.
risk: unknown
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Upstash QStash

Upstash QStash expert for serverless message queues, scheduled jobs, and
reliable HTTP-based task delivery without managing infrastructure.

## Principles

- HTTP is the interface - if it speaks HTTPS, it speaks QStash
- Endpoints must be public - QStash calls your URLs from the cloud
- Verify signatures always - never trust unverified webhooks
- Schedules are fire-and-forget - QStash handles the cron
- Retries are built-in - but configure them for your use case
- Delays are free - schedule seconds to days in the future
- Callbacks complete the loop - know when delivery succeeds or fails
- Deduplication prevents double-processing - use message IDs

## Capabilities

- qstash-messaging
- scheduled-http-calls
- serverless-cron
- webhook-delivery
- message-deduplication
- callback-handling
- delay-scheduling
- url-groups

## Scope

- complex-workflows -> inngest
- redis-queues -> bullmq-specialist
- event-sourcing -> event-architect
- workflow-orchestration -> temporal-craftsman

## Tooling

### Core

- qstash-sdk
- upstash-console

### Frameworks

- nextjs
- cloudflare-workers
- vercel-functions
- aws-lambda
- netlify-functions

### Patterns

- scheduled-jobs
- delayed-messages
- webhook-fanout
- callback-verification

### Related

- upstash-redis
- upstash-kafka

## Patterns

### Basic Message Publishing

Sending messages to be delivered to endpoints

**When to use**: Need reliable async HTTP calls

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Simple message to endpoint
await qstash.publishJSON({
  url: 'https://myapp.com/api/process',
  body: {
    userId: '123',
    action: 'welcome-email',
  },
});

// With delay (process in 1 hour)
await qstash.publishJSON({
  url: 'https://myapp.com/api/reminder',
  body: { userId: '123' },
  delay: 60 * 60,  // seconds
});

// With specific delivery time
await qstash.publishJSON({
  url: 'https://myapp.com/api/scheduled',
  body: { report: 'daily' },
  notBefore: Math.floor(Date.now() / 1000) + 86400,  // tomorrow
});

### Scheduled Cron Jobs

Setting up recurring scheduled tasks

**When to use**: Need periodic background jobs without infrastructure

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Create a scheduled job
const schedule = await qstash.schedules.create({
  destination: 'https://myapp.com/api/cron/daily-report',
  cron: '0 9 * * *',  // Every day at 9 AM UTC
  body: JSON.stringify({ type: 'daily' }),
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('Schedule created:', schedule.scheduleId);

// List all schedules
const schedules = await qstash.schedules.list();

// Delete a schedule
await qstash.schedules.delete(schedule.scheduleId);

### Signature Verification

Verifying QStash message signatures in your endpoint

**When to use**: Any endpoint receiving QStash messages (always!)

// app/api/webhook/route.ts (Next.js App Router)
import { Receiver } from '@upstash/qstash';
import { NextRequest, NextResponse } from 'next/server';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get('upstash-signature');
  const body = await req.text();

  // ALWAYS verify signature
  const isValid = await receiver.verify({
    signature: signature!,
    body,
    url: req.url,
  });

  if (!isValid) {
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 401 }
    );
  }

  // Safe to process
  const data = JSON.parse(body);
  await processMessage(data);

  return NextResponse.json({ success: true });
}

### Callback for Delivery Status

Getting notified when messages are delivered or fail

**When to use**: Need to track delivery status for critical messages

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Publish with callback
await qstash.publishJSON({
  url: 'https://myapp.com/api/critical-task',
  body: { taskId: '456' },
  callback: 'https://myapp.com/api/qstash-callback',
  failureCallback: 'https://myapp.com/api/qstash-failed',
});

// Callback endpoint receives delivery status
// app/api/qstash-callback/route.ts
export async function POST(req: NextRequest) {
  // Verify signature first!
  const data = await req.json();

  // data contains:
  // - sourceMessageId: original message ID
  // - url: destination URL
  // - status: HTTP status code
  // - body: response body

  if (data.status >= 200 && data.status < 300) {
    await markTaskComplete(data.sourceMessageId);
  }

  return NextResponse.json({ received: true });
}

### URL Groups (Fan-out)

Sending messages to multiple endpoints at once

**When to use**: Need to notify multiple services about an event

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Create a URL group
await qstash.urlGroups.addEndpoints({
  name: 'order-processors',
  endpoints: [
    { url: 'https://inventory.myapp.com/api/process' },
    { url: 'https://shipping.myapp.com/api/process' },
    { url: 'https://analytics.myapp.com/api/track' },
  ],
});

// Publish to the group - all endpoints receive the message
await qstash.publishJSON({
  urlGroup: 'order-processors',
  body: {
    orderId: '789',
    event: 'order.placed',
  },
});

### Message Deduplication

Preventing duplicate message processing

**When to use**: Idempotency is critical (payments, notifications)

import { Client } from '@upstash/qstash';

const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

// Deduplicate by custom ID (within deduplication window)
await qstash.publishJSON({
  url: 'https://myapp.com/api/charge',
  body: { orderId: '123', amount: 5000 },
  deduplicationId: 'charge-order-123',  // Won't send again within window
});

// Content-based deduplication
await qstash.publishJSON({
  url: 'https://myapp.com/api/notify',
  body: { userId: '456', message: 'Hello' },
  contentBasedDeduplication: true,  // Hash of body used as ID
});

## Sharp Edges

### Not verifying QStash webhook signatures

Severity: CRITICAL

Situation: Endpoint accepts any POST request. Attacker discovers your callback URL.
Fake messages flood your system. Malicious payloads processed as trusted.

Symptoms:
- No Receiver import in webhook handler
- Missing upstash-signature header check
- Processing request before verification

Why this breaks:
QStash endpoints are public URLs. Without signature verification, anyone
can send requests. This is a direct path to unauthorized message processing
and potential data manipulation.

Recommended fix:

# Always verify signatures with both keys:
```typescript
import { Receiver } from '@upstash/qstash';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(req: NextRequest) {
  const signature = req.headers.get('upstash-signature');
  const body = await req.text();  // Raw body required

  const isValid = await receiver.verify({
    signature: signature!,
    body,
    url: req.url,
  });

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // Safe to process
}
```

# Why two keys?
- QStash rotates signing keys
- nextSigningKey becomes current during rotation
- Both must be checked for seamless key rotation

### Callback endpoint taking too long to respond

Severity: HIGH

Situation: Webhook handler does heavy processing. Takes 30+ seconds. QStash times out.
Marks message as failed. Retries. Double processing begins.

Symptoms:
- Webhook timeouts in QStash dashboard
- Messages marked failed then retried
- Duplicate processing of same message

Why this breaks:
QStash has a 30-second timeout for callbacks. If your endpoint doesn't respond
in time, QStash considers it failed and retries. Long-running handlers create
duplicate message processing and wasted retries.

Recommended fix:

# Design for fast acknowledgment:
```typescript
export async function POST(req: NextRequest) {
  // 1. Verify signature first (fast)
  // 2. Parse and validate message (fast)
  // 3. Queue for async processing (fast)

  const message = await parseMessage(req);

  // Don't do this:
  // await processHeavyWork(message);  // Could timeout!

  // Do this instead:
  await db.jobs.create({ data: message, status: 'pending' });
  // Or use another QStash message for the heavy work

  return NextResponse.json({ queued: true });  // Respond fast
}
```

# Alternative: Use QStash for the heavy work
```typescript
// Webhook receives trigger
await qstash.publishJSON({
  url: 'https://myapp.com/api/heavy-process',
  body: { jobId: message.id },
});
return NextResponse.json({ delegated: true });
```

# For Vercel: Consider using Edge runtime for faster cold starts

### Hitting QStash rate limits unexpectedly

Severity: HIGH

Situation: Burst of events triggers mass message publishing. QStash rate limit hit.
Messages rejected. Users don't get notifications. Critical tasks delayed.

Symptoms:
- 429 errors from QStash
- Messages not being delivered
- Sudden drop in processing during peak times

Why this breaks:
QStash has plan-based rate limits. Free tier: 500 messages/day. Pro: higher
but still limited. Bursts can exhaust limits quickly. Without monitoring,
you won't know until users complain.

Recommended fix:

# Check your plan limits:
- Free: 500 messages/day
- Pay as you go: Check dashboard
- Pro: Higher limits, check dashboard

# Implement rate limit handling:
```typescript
try {
  await qstash.publishJSON({ url, body });
} catch (error) {
  if (error.message?.includes('rate limit')) {
    // Queue locally and retry later
    await localQueue.add('qstash-retry', { url, body });
  }
  throw error;
}
```

# Batch messages when possible:
```typescript
// Instead of 100 individual publishes
await qstash.batchJSON({
  messages: items.map(item => ({
    url: 'https://myapp.com/api/process',
    body: { itemId: item.id },
  })),
});
```

# Monitor in dashboard:
Upstash Console shows usage and limits

### Not using deduplication for critical operations

Severity: HIGH

Situation: Network hiccup during publish. SDK retries. Same message sent twice.
Customer charged twice. Email sent twice. Data corrupted.

Symptoms:
- Duplicate charges or emails
- Double processing of same event
- User complaints about duplicates

Why this breaks:
Network failures and retries happen. Without deduplication, the same logical
message can be sent multiple times. QStash provides deduplication, but you
must use it for critical operations.

Recommended fix:

# Use deduplication for critical messages:
```typescript
// Custom ID (best for business operations)
await qstash.publishJSON({
  url: 'https://myapp.com/api/charge',
  body: { orderId: '123', amount: 5000 },
  deduplicationId: `charge-${orderId}`,  // Same ID = same message
});

// Content-based (good for notifications)
await qstash.publishJSON({
  url: 'https://myapp.com/api/notify',
  body: { userId: '456', type: 'welcome' },
  contentBasedDeduplication: true,  // Hash of body
});
```

# Deduplication window:
- Default: 60 seconds
- Messages with same ID in window are deduplicated
- Plan for this in your retry logic

# Also make endpoints idempotent:
Check if operation already completed before processing

### Expecting QStash to reach private/localhost endpoints

Severity: CRITICAL

Situation: Development works with local server. Deploy to production with internal URL.
QStash can't reach it. All messages fail silently. No processing happens.

Symptoms:
- Messages show "failed" in QStash dashboard
- Works locally but fails in "production"
- Using http:// instead of https://

Why this breaks:
QStash runs in Upstash's cloud. It can only reach public, internet-accessible
URLs. localhost, internal IPs, and private networks are unreachable. This is
a fundamental architecture requirement, not a configuration issue.

Recommended fix:

# Production requirements:
- URL must be publicly accessible
- HTTPS required (HTTP will fail)
- No localhost, 127.0.0.1, or private IPs

# Local development options:

# Option 1: ngrok/localtunnel
```bash
ngrok http 3000
# Use the ngrok URL for QStash testing
```

# Option 2: QStash local development mode
```typescript
// In development, skip QStash and call directly
if (process.env.NODE_ENV === 'development') {
  await fetch('http://localhost:3000/api/process', {
    method: 'POST',
    body: JSON.stringify(data),
  });
} else {
  await qstash.publishJSON({ url, body: data });
}
```

# Option 3: Use Vercel preview URLs
Preview deploys give you public URLs for testing

### Using default retry behavior for all message types

Severity: MEDIUM

Situation: Critical payment webhook uses defaults. 3 retries over minutes. Payment
processor is temporarily down for 15 minutes. Message marked as failed.
Payment reconciliation manual work required.

Symptoms:
- Critical messages marked failed
- Manual intervention needed for retries
- Temporary outages causing permanent failures

Why this breaks:
Default retry behavior (3 attempts, short backoff) works for many cases but
not all. Some endpoints need more attempts, longer backoff, or different
strategies. One size doesn't fit all.

Recommended fix:

# Configure retries per message:
```typescript
// Critical operations: more retries, longer backoff
await qstash.publishJSON({
  url: 'https://myapp.com/api/payment-webhook',
  body: { paymentId: '123' },
  retries: 5,
  // Backoff: 10s, 30s, 1m, 5m, 30m
});

// Non-critical notifications: fewer retries
await qstash.publishJSON({
  url: 'https://myapp.com/api/analytics',
  body: { event: 'pageview' },
  retries: 1,  // Fail fast, not critical
});
```

# Consider your endpoint's recovery time:
- Database down: May need 5+ minutes
- Third-party API: May need hours
- Internal service: Usually quick

# Use failure callbacks for dead letter handling:
```typescript
await qstash.publishJSON({
  url: 'https://myapp.com/api/critical',
  body: data,
  failureCallback: 'https://myapp.com/api/dead-letter',
});
```

### Sending large payloads instead of references

Severity: MEDIUM

Situation: Message contains entire document (5MB). QStash rejects - body too large.
Even if accepted, slow to transmit. Expensive. Wastes bandwidth.

Symptoms:
- Message publish failures
- Slow message delivery
- High bandwidth costs

Why this breaks:
QStash has message size limits (around 500KB body). Large payloads slow
delivery, increase costs, and can fail entirely. Messages should be
lightweight triggers, not data carriers.

Recommended fix:

# Send references, not data:
```typescript
// BAD: Large payload
await qstash.publishJSON({
  url: 'https://myapp.com/api/process',
  body: { document: largeDocumentContent },  // 5MB!
});

// GOOD: Reference only
await qstash.publishJSON({
  url: 'https://myapp.com/api/process',
  body: { documentId: 'doc_123' },  // Fetch in handler
});
```

# In your handler:
```typescript
export async function POST(req: NextRequest) {
  const { documentId } = await req.json();
  const document = await storage.get(documentId);  // Fetch actual data
  await processDocument(document);
}
```

# Large data storage options:
- S3/R2/Blob storage for files
- Database for structured data
- Redis for temporary data (Upstash Redis pairs well)

### Not using callback/failureCallback for critical flows

Severity: MEDIUM

Situation: Important task published. QStash delivers. Endpoint processes. But your
system doesn't know it succeeded. User stuck waiting. No feedback loop.

Symptoms:
- No visibility into message delivery
- Users waiting for actions that completed
- No alerting on failures

Why this breaks:
QStash is fire-and-forget by default. Without callbacks, you don't know
if messages were delivered successfully. For critical flows, you need
the feedback loop to update state and handle failures.

Recommended fix:

# Use callbacks for critical operations:
```typescript
await qstash.publishJSON({
  url: 'https://myapp.com/api/send-email',
  body: { userId: '123', template: 'welcome' },
  callback: 'https://myapp.com/api/email-callback',
  failureCallback: 'https://myapp.com/api/email-failed',
});
```

# Handle the callback:
```typescript
// app/api/email-callback/route.ts
export async function POST(req: NextRequest) {
  // Verify signature first!
  const data = await req.json();

  // data.sourceMessageId - original message
  // data.status - HTTP status code
  // data.body - response from endpoint

  await db.emailLogs.update({
    where: { messageId: data.sourceMessageId },
    data: { status: 'delivered' },
  });

  return NextResponse.json({ received: true });
}
```

# Failure callback for alerting:
```typescript
// app/api/email-failed/route.ts
export async function POST(req: NextRequest) {
  const data = await req.json();
  await alerting.notify(`Email failed: ${data.sourceMessageId}`);
  await db.emailLogs.update({
    where: { messageId: data.sourceMessageId },
    data: { status: 'failed', error: data.body },
  });
}
```

### Cron schedules using wrong timezone

Severity: MEDIUM

Situation: Scheduled daily report at "9am". But 9am in which timezone? QStash uses UTC.
Report runs at 4am local time. Users confused. Support tickets filed.

Symptoms:
- Schedules running at unexpected times
- Off-by-one-hour issues during DST
- User complaints about report timing

Why this breaks:
QStash cron schedules run in UTC. If you think in local time but configure
in UTC, schedules will run at unexpected times. This is especially tricky
with daylight saving time changes.

Recommended fix:

# QStash uses UTC:
```typescript
// This runs at 9am UTC, not local time
await qstash.schedules.create({
  destination: 'https://myapp.com/api/daily-report',
  cron: '0 9 * * *',  // 9am UTC
});
```

# Convert to UTC:
- 9am EST = 2pm UTC (winter) / 1pm UTC (summer)
- 9am PST = 5pm UTC (winter) / 4pm UTC (summer)

# Document timezone in schedule name:
```typescript
await qstash.schedules.create({
  destination: 'https://myapp.com/api/daily-report',
  cron: '0 14 * * *',  // 9am EST (14:00 UTC)
  body: JSON.stringify({
    timezone: 'America/New_York',
    localTime: '9:00 AM',
  }),
});
```

# Handle DST programmatically if needed:
Update schedules when DST changes, or accept UTC timing

### URL groups with dead or outdated endpoints

Severity: MEDIUM

Situation: URL group has 5 endpoints. One service deprecated months ago. Messages
still fan out to it. Failures in dashboard. Wasted attempts. Slower delivery.

Symptoms:
- Failed deliveries in URL groups
- Messages to deprecated services
- Slow fan-out due to timeouts

Why this breaks:
URL groups persist until explicitly updated. When services change, endpoints
become stale. QStash tries to deliver to dead URLs, wastes retries, and
the failure noise obscures real issues.

Recommended fix:

# Audit URL groups regularly:
```typescript
const groups = await qstash.urlGroups.list();
for (const group of groups) {
  console.log(`Group: ${group.name}`);
  for (const endpoint of group.endpoints) {
    // Check if endpoint is still valid
    try {
      await fetch(endpoint.url, { method: 'HEAD' });
      console.log(`  OK: ${endpoint.url}`);
    } catch {
      console.log(`  DEAD: ${endpoint.url}`);
    }
  }
}
```

# Update groups when services change:
```typescript
// Remove dead endpoint
await qstash.urlGroups.removeEndpoints({
  name: 'order-processors',
  endpoints: [{ url: 'https://old-service.myapp.com/api/process' }],
});
```

# Automate in CI/CD:
Check URL group health as part of deployment

## Validation Checks

### Webhook signature verification

Severity: CRITICAL

Message: QStash webhook handlers must verify signatures using Receiver

Fix action: Add signature verification: const receiver = new Receiver({ currentSigningKey, nextSigningKey }); await receiver.verify({ signature, body, url })

### Both signing keys configured

Severity: CRITICAL

Message: QStash Receiver must have both currentSigningKey and nextSigningKey for key rotation

Fix action: Configure both keys: new Receiver({ currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY, nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY })

### QStash token hardcoded

Severity: CRITICAL

Message: QStash token must not be hardcoded - use environment variables

Fix action: Use process.env.QSTASH_TOKEN

### QStash signing keys hardcoded

Severity: CRITICAL

Message: QStash signing keys must not be hardcoded

Fix action: Use process.env.QSTASH_CURRENT_SIGNING_KEY and process.env.QSTASH_NEXT_SIGNING_KEY

### Localhost URL in QStash publish

Severity: CRITICAL

Message: QStash cannot reach localhost - endpoints must be publicly accessible

Fix action: Use a public URL (e.g., your deployed domain or ngrok for testing)

### HTTP URL instead of HTTPS

Severity: ERROR

Message: QStash requires HTTPS URLs for security

Fix action: Change http:// to https://

### QStash publish without error handling

Severity: ERROR

Message: QStash publish calls should have error handling for rate limits and failures

Fix action: Wrap in try/catch and handle errors appropriately

### Using parsed JSON for signature verification

Severity: CRITICAL

Message: Signature verification requires raw body (req.text()), not parsed JSON

Fix action: Use await req.text() to get raw body for verification

### Callback endpoint without signature verification

Severity: CRITICAL

Message: Callback endpoints must also verify signatures - they receive QStash requests too

Fix action: Add Receiver signature verification to callback handlers

### Schedule without destination URL

Severity: ERROR

Message: QStash schedules require a destination URL

Fix action: Add destination: 'https://your-app.com/api/endpoint' to schedule options

## Collaboration

### Delegation Triggers

- complex workflow|multi-step|state machine -> inngest (Need durable step functions with checkpointing)
- redis queue|worker process|job priority -> bullmq-specialist (Need traditional queue with workers)
- ai background|long running ai|model inference -> trigger-dev (Need AI-specific background processing)
- deploy|vercel|production|environment -> vercel-deployment (Need deployment configuration for QStash)
- database|persistence|state|sync -> supabase-backend (Need database for job state)
- auth|user context|session -> nextjs-supabase-auth (Need user context in message handlers)

### Serverless Background Jobs

Skills: upstash-qstash, nextjs-app-router, vercel-deployment

Workflow:

```
1. Define API route handlers (nextjs-app-router)
2. Configure QStash integration (upstash-qstash)
3. Deploy with environment vars (vercel-deployment)
```

### Reliable Webhooks

Skills: upstash-qstash, stripe-integration, supabase-backend

Workflow:

```
1. Receive webhooks from Stripe (stripe-integration)
2. Queue for reliable processing (upstash-qstash)
3. Persist state to database (supabase-backend)
```

### Scheduled Reports

Skills: upstash-qstash, email-systems, supabase-backend

Workflow:

```
1. Configure cron schedule (upstash-qstash)
2. Query data for report (supabase-backend)
3. Send via email system (email-systems)
```

### Fan-out Notifications

Skills: upstash-qstash, email-systems, slack-bot-builder

Workflow:

```
1. Publish to URL group (upstash-qstash)
2. Email handler receives (email-systems)
3. Slack handler receives (slack-bot-builder)
```

### Gradual Migration to Workflows

Skills: upstash-qstash, inngest

Workflow:

```
1. Start with simple QStash messages (upstash-qstash)
2. Identify multi-step patterns
3. Migrate complex flows to Inngest (inngest)
4. Keep simple schedules in QStash
```

## Related Skills

Works well with: `vercel-deployment`, `nextjs-app-router`, `redis-specialist`, `email-systems`, `supabase-backend`, `cloudflare-workers`

## When to Use
- User mentions or implies: qstash
- User mentions or implies: upstash queue
- User mentions or implies: serverless cron
- User mentions or implies: scheduled http
- User mentions or implies: message queue serverless
- User mentions or implies: vercel cron
- User mentions or implies: delayed message

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
