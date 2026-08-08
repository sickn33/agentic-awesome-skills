---
name: bullmq-specialist
description: BullMQ expert for Redis-backed job queues, background processing,
  and reliable async execution in Node.js/TypeScript applications.
risk: none
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# BullMQ Specialist

BullMQ expert for Redis-backed job queues, background processing, and
reliable async execution in Node.js/TypeScript applications.

## Principles

- Jobs are fire-and-forget from the producer side - let the queue handle delivery
- Always set explicit job options - defaults rarely match your use case
- Idempotency is your responsibility - jobs may run more than once
- Backoff strategies prevent thundering herds - exponential beats linear
- Dead letter queues are not optional - failed jobs need a home
- Concurrency limits protect downstream services - start conservative
- Job data should be small - pass IDs, not payloads
- Graceful shutdown prevents orphaned jobs - handle SIGTERM properly

## Capabilities

- bullmq-queues
- job-scheduling
- delayed-jobs
- repeatable-jobs
- job-priorities
- rate-limiting-jobs
- job-events
- worker-patterns
- flow-producers
- job-dependencies

## Scope

- redis-infrastructure -> redis-specialist
- serverless-queues -> upstash-qstash
- workflow-orchestration -> temporal-craftsman
- event-sourcing -> event-architect
- email-delivery -> email-systems

## Tooling

### Core

- bullmq
- ioredis

### Hosting

- upstash
- redis-cloud
- elasticache
- railway

### Monitoring

- bull-board
- arena
- bullmq-pro

### Patterns

- delayed-jobs
- repeatable-jobs
- job-flows
- rate-limiting
- sandboxed-processors

## Patterns

### Basic Queue Setup

Production-ready BullMQ queue with proper configuration

**When to use**: Starting any new queue implementation

import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

// Shared connection for all queues
const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,  // Required for BullMQ
  enableReadyCheck: false,
});

// Create queue with sensible defaults
const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// Worker with concurrency limit
const worker = new Worker('emails', async (job) => {
  await sendEmail(job.data);
}, {
  connection,
  concurrency: 5,
  limiter: {
    max: 100,
    duration: 60000,  // 100 jobs per minute
  },
});

// Handle events
worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

### Delayed and Scheduled Jobs

Jobs that run at specific times or after delays

**When to use**: Scheduling future tasks, reminders, or timed actions

// Delayed job - runs once after delay
await queue.add('reminder', { userId: 123 }, {
  delay: 24 * 60 * 60 * 1000,  // 24 hours
});

// Repeatable job - runs on schedule
await queue.add('daily-digest', { type: 'summary' }, {
  repeat: {
    pattern: '0 9 * * *',  // Every day at 9am
    tz: 'America/New_York',
  },
});

// Remove repeatable job
await queue.removeRepeatable('daily-digest', {
  pattern: '0 9 * * *',
  tz: 'America/New_York',
});

### Job Flows and Dependencies

Complex multi-step job processing with parent-child relationships

**When to use**: Jobs depend on other jobs completing first

import { FlowProducer } from 'bullmq';

const flowProducer = new FlowProducer({ connection });

// Parent waits for all children to complete
await flowProducer.add({
  name: 'process-order',
  queueName: 'orders',
  data: { orderId: 123 },
  children: [
    {
      name: 'validate-inventory',
      queueName: 'inventory',
      data: { orderId: 123 },
    },
    {
      name: 'charge-payment',
      queueName: 'payments',
      data: { orderId: 123 },
    },
    {
      name: 'notify-warehouse',
      queueName: 'notifications',
      data: { orderId: 123 },
    },
  ],
});

### Graceful Shutdown

Properly close workers without losing jobs

**When to use**: Deploying or restarting workers

const shutdown = async () => {
  console.log('Shutting down gracefully...');

  // Stop accepting new jobs
  await worker.pause();

  // Wait for current jobs to finish (with timeout)
  await worker.close();

  // Close queue connection
  await queue.close();

  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

### Bull Board Dashboard

Visual monitoring for BullMQ queues

**When to use**: Need visibility into queue status and job states

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
    new BullMQAdapter(orderQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

## Validation Checks

### Redis connection missing maxRetriesPerRequest

Severity: ERROR

BullMQ requires maxRetriesPerRequest null for proper reconnection handling

Message: BullMQ queue/worker created without maxRetriesPerRequest: null on Redis connection. This will cause workers to stop on Redis connection issues.

### No stalled job event handler

Severity: WARNING

Workers should handle stalled events to detect crashed workers

Message: Worker created without 'stalled' event handler. Stalled jobs indicate worker crashes and should be monitored.

### No failed job event handler

Severity: WARNING

Workers should handle failed events for monitoring and alerting

Message: Worker created without 'failed' event handler. Failed jobs should be logged and monitored.

### No graceful shutdown handling

Severity: WARNING

Workers should gracefully shut down on SIGTERM/SIGINT

Message: Worker file without graceful shutdown handling. Jobs may be orphaned on deployment.

### Awaiting queue.add in request handler

Severity: INFO

Queue additions should be fire-and-forget in request handlers

Message: Queue.add awaited in request handler. Consider fire-and-forget for faster response.

### Potentially large data in job payload

Severity: WARNING

Job data should be small - pass IDs not full objects

Message: Job appears to have large inline data. Pass IDs instead of full objects to keep Redis memory low.

### Job without timeout configuration

Severity: INFO

Jobs should have timeouts to prevent infinite execution

Message: Job added without explicit timeout. Consider adding timeout to prevent stuck jobs.

### Retry without backoff strategy

Severity: WARNING

Retries should use exponential backoff to avoid thundering herd

Message: Job has retry attempts but no backoff strategy. Use exponential backoff to prevent thundering herd.

### Repeatable job without explicit timezone

Severity: WARNING

Repeatable jobs should specify timezone to avoid DST issues

Message: Repeatable job without explicit timezone. Will use server local time which can drift with DST.

### Potentially high worker concurrency

Severity: INFO

High concurrency can overwhelm downstream services

Message: Worker concurrency is high. Ensure downstream services can handle this load (DB connections, API rate limits).

## Collaboration

### Delegation Triggers

- redis infrastructure|redis cluster|memory tuning -> redis-specialist (Queue needs Redis infrastructure)
- serverless queue|edge queue|no redis -> upstash-qstash (Need queues without managing Redis)
- complex workflow|saga|compensation|long-running -> temporal-craftsman (Need workflow orchestration beyond simple jobs)
- event sourcing|CQRS|event streaming -> event-architect (Need event-driven architecture)
- deploy|kubernetes|scaling|infrastructure -> devops (Queue needs infrastructure)
- monitor|metrics|alerting|dashboard -> performance-hunter (Queue needs monitoring)

### Email Queue Stack

Skills: bullmq-specialist, email-systems, redis-specialist

Workflow:

```
1. Email request received (API)
2. Job queued with rate limiting (bullmq-specialist)
3. Worker processes with backoff (bullmq-specialist)
4. Email sent via provider (email-systems)
5. Status tracked in Redis (redis-specialist)
```

### Background Processing Stack

Skills: bullmq-specialist, backend, devops

Workflow:

```
1. API receives request (backend)
2. Long task queued for background (bullmq-specialist)
3. Worker processes async (bullmq-specialist)
4. Result stored/notified (backend)
5. Workers scaled per load (devops)
```

### AI Processing Pipeline

Skills: bullmq-specialist, ai-workflow-automation, performance-hunter

Workflow:

```
1. AI task submitted (ai-workflow-automation)
2. Job flow created with dependencies (bullmq-specialist)
3. Workers process stages (bullmq-specialist)
4. Performance monitored (performance-hunter)
5. Results aggregated (ai-workflow-automation)
```

### Scheduled Tasks Stack

Skills: bullmq-specialist, backend, redis-specialist

Workflow:

```
1. Repeatable jobs defined (bullmq-specialist)
2. Cron patterns with timezone (bullmq-specialist)
3. Jobs execute on schedule (bullmq-specialist)
4. State managed in Redis (redis-specialist)
5. Results handled (backend)
```

## Related Skills

Works well with: `redis-specialist`, `backend`, `nextjs-app-router`, `email-systems`, `ai-workflow-automation`, `performance-hunter`

## When to Use
- User mentions or implies: bullmq
- User mentions or implies: bull queue
- User mentions or implies: redis queue
- User mentions or implies: background job
- User mentions or implies: job queue
- User mentions or implies: delayed job
- User mentions or implies: repeatable job
- User mentions or implies: worker process
- User mentions or implies: job scheduling
- User mentions or implies: async processing

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
