---
name: workflow-automation
description: Workflow automation is the infrastructure that makes AI agents
  reliable. Without durable execution, a network hiccup during a 10-step payment
  flow means lost money and angry customers. With it, workflows resume exactly
  where they left off.
risk: critical
source: vibeship-spawner-skills (Apache 2.0)
date_added: 2026-02-27
---

# Workflow Automation

Workflow automation is the infrastructure that makes AI agents reliable.
Without durable execution, a network hiccup during a 10-step payment
flow means lost money and angry customers. With it, workflows resume
exactly where they left off.

This skill covers the platforms (n8n, Temporal, Inngest) and patterns
(sequential, parallel, orchestrator-worker) that turn brittle scripts
into production-grade automation.

Key insight: The platforms make different tradeoffs. n8n optimizes for
accessibility, Temporal for correctness, Inngest for developer experience.
Pick based on your actual needs, not hype.

## Principles

- Durable execution is non-negotiable for money or state-critical workflows
- Events are the universal language of workflow triggers
- Steps are checkpoints - each should be independently retryable
- Start simple, add complexity only when reliability demands it
- Observability isn't optional - you need to see where workflows fail
- Workflows and agents co-evolve - design for both

## Capabilities

- workflow-automation
- workflow-orchestration
- durable-execution
- event-driven-workflows
- step-functions
- job-queues
- background-jobs
- scheduled-tasks

## Scope

- multi-agent-coordination → multi-agent-orchestration
- ci-cd-pipelines → devops
- data-pipelines → data-engineer
- api-design → api-designer

## Tooling

### Platforms

- n8n - When: Low-code automation, quick prototyping, non-technical users Note: Self-hostable, 400+ integrations, great for visual workflows
- Temporal - When: Mission-critical workflows, financial transactions, microservices Note: Strongest durability guarantees, steeper learning curve
- Inngest - When: Event-driven serverless, TypeScript codebases, AI workflows Note: Best developer experience, works with any hosting
- AWS Step Functions - When: AWS-native stacks, existing Lambda functions Note: Tight AWS integration, JSON-based workflow definition
- Azure Durable Functions - When: Azure stacks, .NET or TypeScript Note: Good AI agent support, checkpoint and replay

## Patterns

### Sequential Workflow Pattern

Steps execute in order, each output becomes next input

**When to use**: Content pipelines, data processing, ordered operations

# SEQUENTIAL WORKFLOW:

"""
Step 1 → Step 2 → Step 3 → Output
  ↓         ↓         ↓
(checkpoint at each step)
"""

## Inngest Example (TypeScript)
"""
import { inngest } from "./client";

export const processOrder = inngest.createFunction(
  { id: "process-order" },
  { event: "order/created" },
  async ({ event, step }) => {
    // Step 1: Validate order
    const validated = await step.run("validate-order", async () => {
      return validateOrder(event.data.order);
    });

    // Step 2: Process payment (durable - survives crashes)
    const payment = await step.run("process-payment", async () => {
      return chargeCard(validated.paymentMethod, validated.total);
    });

    // Step 3: Create shipment
    const shipment = await step.run("create-shipment", async () => {
      return createShipment(validated.items, validated.address);
    });

    // Step 4: Send confirmation
    await step.run("send-confirmation", async () => {
      return sendEmail(validated.email, { payment, shipment });
    });

    return { success: true, orderId: event.data.orderId };
  }
);
"""

## Temporal Example (TypeScript)
"""
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { validateOrder, chargeCard, createShipment, sendEmail } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '30 seconds',
    retry: {
      maximumAttempts: 3,
      backoffCoefficient: 2,
    }
  });

export async function processOrderWorkflow(order: Order): Promise<void> {
  const validated = await validateOrder(order);
  const payment = await chargeCard(validated.paymentMethod, validated.total);
  const shipment = await createShipment(validated.items, validated.address);
  await sendEmail(validated.email, { payment, shipment });
}
"""

## n8n Pattern
"""
[Webhook: order.created]
    ↓
[HTTP Request: Validate Order]
    ↓
[HTTP Request: Process Payment]
    ↓
[HTTP Request: Create Shipment]
    ↓
[Send Email: Confirmation]

Configure each node with retry on failure.
Use Error Trigger for dead letter handling.
"""

### Parallel Workflow Pattern

Independent steps run simultaneously, aggregate results

**When to use**: Multiple independent analyses, data from multiple sources

# PARALLEL WORKFLOW:

"""
        ┌→ Step A ─┐
Input ──┼→ Step B ─┼→ Aggregate → Output
        └→ Step C ─┘
"""

## Inngest Example
"""
export const analyzeDocument = inngest.createFunction(
  { id: "analyze-document" },
  { event: "document/uploaded" },
  async ({ event, step }) => {
    // Run analyses in parallel
    const [security, performance, compliance] = await Promise.all([
      step.run("security-analysis", () =>
        analyzeForSecurityIssues(event.data.document)
      ),
      step.run("performance-analysis", () =>
        analyzeForPerformance(event.data.document)
      ),
      step.run("compliance-analysis", () =>
        analyzeForCompliance(event.data.document)
      ),
    ]);

    // Aggregate results
    const report = await step.run("generate-report", () =>
      generateReport({ security, performance, compliance })
    );

    return report;
  }
);
"""

## AWS Step Functions (Amazon States Language)
"""
{
  "Type": "Parallel",
  "Branches": [
    {
      "StartAt": "SecurityAnalysis",
      "States": {
        "SecurityAnalysis": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...:security-analyzer",
          "End": true
        }
      }
    },
    {
      "StartAt": "PerformanceAnalysis",
      "States": {
        "PerformanceAnalysis": {
          "Type": "Task",
          "Resource": "arn:aws:lambda:...:performance-analyzer",
          "End": true
        }
      }
    }
  ],
  "Next": "AggregateResults"
}
"""

### Orchestrator-Worker Pattern

Central coordinator dispatches work to specialized workers

**When to use**: Complex tasks requiring different expertise, dynamic subtask creation

# ORCHESTRATOR-WORKER PATTERN:

"""
┌─────────────────────────────────────┐
│          ORCHESTRATOR               │
│  - Analyzes task                    │
│  - Creates subtasks                 │
│  - Dispatches to workers            │
│  - Aggregates results               │
└─────────────────────────────────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌───────┐  ┌───────┐  ┌───────┐
│Worker1│  │Worker2│  │Worker3│
│Create │  │Modify │  │Delete │
└───────┘  └───────┘  └───────┘
"""

## Temporal Example
"""
export async function orchestratorWorkflow(task: ComplexTask) {
  // Orchestrator decides what work needs to be done
  const plan = await analyzeTask(task);

  // Dispatch to specialized worker workflows
  const results = await Promise.all(
    plan.subtasks.map(subtask => {
      switch (subtask.type) {
        case 'create':
          return executeChild(createWorkerWorkflow, { args: [subtask] });
        case 'modify':
          return executeChild(modifyWorkerWorkflow, { args: [subtask] });
        case 'delete':
          return executeChild(deleteWorkerWorkflow, { args: [subtask] });
      }
    })
  );

  // Aggregate results
  return aggregateResults(results);
}
"""

## Inngest with AI Orchestration
"""
export const aiOrchestrator = inngest.createFunction(
  { id: "ai-orchestrator" },
  { event: "task/complex" },
  async ({ event, step }) => {
    // AI decides what needs to be done
    const plan = await step.run("create-plan", async () => {
      return await llm.chat({
        messages: [
          { role: "system", content: "Break this task into subtasks..." },
          { role: "user", content: event.data.task }
        ]
      });
    });

    // Execute each subtask as a durable step
    const results = [];
    for (const subtask of plan.subtasks) {
      const result = await step.run(`execute-${subtask.id}`, async () => {
        return executeSubtask(subtask);
      });
      results.push(result);
    }

    // Final synthesis
    return await step.run("synthesize", async () => {
      return synthesizeResults(results);
    });
  }
);
"""

### Event-Driven Trigger Pattern

Workflows triggered by events, not schedules

**When to use**: Reactive systems, user actions, webhook integrations

# EVENT-DRIVEN TRIGGERS:

## Inngest Event-Based
"""
// Define events with TypeScript types
type Events = {
  "user/signed.up": {
    data: { userId: string; email: string };
  };
  "order/completed": {
    data: { orderId: string; total: number };
  };
};

// Function triggered by event
export const onboardUser = inngest.createFunction(
  { id: "onboard-user" },
  { event: "user/signed.up" },  // Trigger on this event
  async ({ event, step }) => {
    // Wait 1 hour, then send welcome email
    await step.sleep("wait-for-exploration", "1 hour");

    await step.run("send-welcome", async () => {
      return sendWelcomeEmail(event.data.email);
    });

    // Wait 3 days for engagement check
    await step.sleep("wait-for-engagement", "3 days");

    const engaged = await step.run("check-engagement", async () => {
      return checkUserEngagement(event.data.userId);
    });

    if (!engaged) {
      await step.run("send-nudge", async () => {
        return sendNudgeEmail(event.data.email);
      });
    }
  }
);

// Send events from anywhere
await inngest.send({
  name: "user/signed.up",
  data: { userId: "123", email: "user@example.com" }
});
"""

## n8n Webhook Trigger
"""
[Webhook: POST /api/webhooks/order]
    ↓
[Switch: event.type]
    ↓ order.created
[Process New Order Subworkflow]
    ↓ order.cancelled
[Handle Cancellation Subworkflow]
"""

### Retry and Recovery Pattern

Automatic retry with backoff, dead letter handling

**When to use**: Any workflow with external dependencies

# RETRY AND RECOVERY:

## Temporal Retry Configuration
"""
const activities = proxyActivities<typeof activitiesType>({
  startToCloseTimeout: '30 seconds',
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,
    maximumInterval: '1 minute',
    maximumAttempts: 5,
    nonRetryableErrorTypes: [
      'ValidationError',      // Don't retry validation failures
      'InsufficientFunds',    // Don't retry payment failures
    ]
  }
});
"""

## Inngest Retry Configuration
"""
export const processPayment = inngest.createFunction(
  {
    id: "process-payment",
    retries: 5,  // Retry up to 5 times
  },
  { event: "payment/initiated" },
  async ({ event, step, attempt }) => {
    // attempt is 0-indexed retry count

    const result = await step.run("charge-card", async () => {
      try {
        return await stripe.charges.create({...});
      } catch (error) {
        if (error.code === 'card_declined') {
          // Don't retry card declines
          throw new NonRetriableError("Card declined");
        }
        throw error;  // Retry other errors
      }
    });

    return result;
  }
);
"""

## Dead Letter Handling
"""
// n8n: Use Error Trigger node
[Error Trigger]
    ↓
[Log to Error Database]
    ↓
[Send Alert to Slack]
    ↓
[Create Ticket in Jira]

// Inngest: Handle in onFailure
export const myFunction = inngest.createFunction(
  {
    id: "my-function",
    onFailure: async ({ error, event, step }) => {
      await step.run("alert-team", async () => {
        await slack.postMessage({
          channel: "#errors",
          text: `Function failed: ${error.message}`
        });
      });
    }
  },
  { event: "..." },
  async ({ step }) => { ... }
);
"""

### Scheduled Workflow Pattern

Time-based triggers for recurring tasks

**When to use**: Daily reports, periodic sync, batch processing

# SCHEDULED WORKFLOWS:

## Inngest Cron
"""
export const dailyReport = inngest.createFunction(
  { id: "daily-report" },
  { cron: "0 9 * * *" },  // Every day at 9 AM
  async ({ step }) => {
    const data = await step.run("gather-metrics", async () => {
      return gatherDailyMetrics();
    });

    await step.run("generate-report", async () => {
      return generateAndSendReport(data);
    });
  }
);

export const syncInventory = inngest.createFunction(
  { id: "sync-inventory" },
  { cron: "*/15 * * * *" },  // Every 15 minutes
  async ({ step }) => {
    await step.run("sync", async () => {
      return syncWithSupplier();
    });
  }
);
"""

## Temporal Cron Workflow
"""
// Schedule workflow to run on cron
const handle = await client.workflow.start(dailyReportWorkflow, {
  taskQueue: 'reports',
  workflowId: 'daily-report',
  cronSchedule: '0 9 * * *',  // 9 AM daily
});
"""

## n8n Schedule Trigger
"""
[Schedule Trigger: Every day at 9:00 AM]
    ↓
[HTTP Request: Get Metrics]
    ↓
[Code Node: Generate Report]
    ↓
[Send Email: Report]
"""

## Sharp Edges

### Non-Idempotent Steps in Durable Workflows

Severity: CRITICAL

Situation: Writing workflow steps that modify external state

Symptoms:
Customer charged twice. Email sent three times. Database record
created multiple times. Workflow retries cause duplicate side effects.

Why this breaks:
Durable execution replays workflows from the beginning on restart.
If step 3 crashes and the workflow resumes, steps 1 and 2 run again.
Without idempotency keys, external services don't know these are retries.

Recommended fix:

# ALWAYS use idempotency keys for external calls:

### Stripe example:
await stripe.paymentIntents.create({
  amount: 1000,
  currency: 'usd',
  idempotency_key: `order-${orderId}-payment`  # Critical!
});

### Email example:
await step.run("send-confirmation", async () => {
  const alreadySent = await checkEmailSent(orderId);
  if (alreadySent) return { skipped: true };
  return sendEmail(customer, orderId);
});

### Database example:
await db.query(`
  INSERT INTO orders (id, ...) VALUES ($1, ...)
  ON CONFLICT (id) DO NOTHING
`, [orderId]);

# Generate idempotency key from stable inputs, not random values

### Workflow Runs for Hours/Days Without Checkpoints

Severity: HIGH

Situation: Long-running workflows with infrequent steps

Symptoms:
Memory consumption grows. Worker timeouts. Lost progress after
crashes. "Workflow exceeded maximum duration" errors.

Why this breaks:
Workflows hold state in memory until checkpointed. A workflow that
runs for 24 hours with one step per hour accumulates state for 24h.
Workers have memory limits. Functions have execution time limits.

Recommended fix:

# Break long workflows into checkpointed steps:

### WRONG - one long step:
await step.run("process-all", async () => {
  for (const item of thousandItems) {
    await processItem(item);  // Hours of work, one checkpoint
  }
});

### CORRECT - many small steps:
for (const item of thousandItems) {
  await step.run(`process-${item.id}`, async () => {
    return processItem(item);  // Checkpoint after each
  });
}

## For very long waits, use sleep:
await step.sleep("wait-for-trial", "14 days");
// Doesn't consume resources while waiting

## Consider child workflows for long processes:
await step.invoke("process-batch", {
  function: batchProcessor,
  data: { items: batch }
});

### Activities Without Timeout Configuration

Severity: HIGH

Situation: Calling external services from workflow activities

Symptoms:
Workflows hang indefinitely. Worker pool exhausted. Dead workflows
that never complete or fail. Manual intervention needed to kill stuck
workflows.

Why this breaks:
External APIs can hang forever. Without timeout, your workflow waits
forever. Unlike HTTP clients, workflow activities don't have default
timeouts in most platforms.

Recommended fix:

# ALWAYS set timeouts on activities:

### Temporal:
const activities = proxyActivities<typeof activitiesType>({
  startToCloseTimeout: '30 seconds',  # Required!
  scheduleToCloseTimeout: '5 minutes',
  heartbeatTimeout: '10 seconds',  # For long activities
  retry: {
    maximumAttempts: 3,
    initialInterval: '1 second',
  }
});

### Inngest:
await step.run("call-api", { timeout: "30s" }, async () => {
  return fetch(url, { signal: AbortSignal.timeout(25000) });
});

## AWS Step Functions:
{
  "Type": "Task",
  "TimeoutSeconds": 30,
  "HeartbeatSeconds": 10,
  "Resource": "arn:aws:lambda:..."
}

# Rule: Activity timeout < Workflow timeout

### Side Effects Outside Step/Activity Boundaries

Severity: CRITICAL

Situation: Writing code that runs during workflow replay

Symptoms:
Random failures on replay. "Workflow corrupted" errors. Different
behavior on replay than initial run. Non-determinism errors.

Why this breaks:
Workflow code runs on EVERY replay. If you generate a random ID in
workflow code, you get a different ID each replay. If you read the
current time, you get a different time. This breaks determinism.

Recommended fix:

# WRONG - side effects in workflow code:
export async function orderWorkflow(order) {
  const orderId = uuid();  // Different every replay!
  const now = new Date();  // Different every replay!
  await activities.process(orderId, now);
}

# CORRECT - side effects in activities:
export async function orderWorkflow(order) {
  const orderId = await activities.generateOrderId();  # Recorded
  const now = await activities.getCurrentTime();       # Recorded
  await activities.process(orderId, now);
}

# Also CORRECT - Temporal workflow.now() and sideEffect:
import { sideEffect } from '@temporalio/workflow';

const orderId = await sideEffect(() => uuid());
const now = workflow.now();  # Deterministic replay-safe time

# Side effects that are safe in workflow code:
# - Reading function arguments
# - Simple calculations (no randomness)
# - Logging (usually)

### Retry Configuration Without Exponential Backoff

Severity: MEDIUM

Situation: Configuring retry behavior for failing steps

Symptoms:
Overwhelming failing services. Rate limiting. Cascading failures.
Retry storms causing outages. Being blocked by external APIs.

Why this breaks:
When a service is struggling, immediate retries make it worse.
100 workflows retrying instantly = 100 requests hitting a service
that's already failing. Backoff gives the service time to recover.

Recommended fix:

# ALWAYS use exponential backoff:

### Temporal:
const activities = proxyActivities({
  retry: {
    initialInterval: '1 second',
    backoffCoefficient: 2,       # 1s, 2s, 4s, 8s, 16s...
    maximumInterval: '1 minute',  # Cap the backoff
    maximumAttempts: 5,
  }
});

### Inngest (built-in backoff):
{
  id: "my-function",
  retries: 5,  # Uses exponential backoff by default
}

### Manual backoff:
const backoff = (attempt) => {
  const base = 1000;
  const max = 60000;
  const delay = Math.min(base * Math.pow(2, attempt), max);
  const jitter = delay * 0.1 * Math.random();
  return delay + jitter;
};

# Add jitter to prevent thundering herd

### Storing Large Data in Workflow State

Severity: HIGH

Situation: Passing large payloads between workflow steps

Symptoms:
Slow workflow execution. Memory errors. "Payload too large" errors.
Expensive storage costs. Slow replays.

Why this breaks:
Workflow state is persisted and replayed. A 10MB payload is stored,
serialized, and deserialized on every step. This adds latency and
cost. Some platforms have hard limits (e.g., Step Functions 256KB).

Recommended fix:

# WRONG - large data in workflow:
await step.run("fetch-data", async () => {
  const largeDataset = await fetchAllRecords();  // 100MB!
  return largeDataset;  // Stored in workflow state
});

# CORRECT - store reference, not data:
await step.run("fetch-data", async () => {
  const largeDataset = await fetchAllRecords();
  const s3Key = await uploadToS3(largeDataset);
  return { s3Key };  // Just the reference
});

const processed = await step.run("process-data", async () => {
  const data = await downloadFromS3(fetchResult.s3Key);
  return processData(data);
});

# For Step Functions, use S3 for large payloads:
{
  "Type": "Task",
  "Resource": "arn:aws:states:::s3:putObject",
  "Parameters": {
    "Bucket": "my-bucket",
    "Key.$": "$.outputKey",
    "Body.$": "$.largeData"
  }
}

### Missing Dead Letter Queue or Failure Handler

Severity: HIGH

Situation: Workflows that exhaust all retries

Symptoms:
Failed workflows silently disappear. No alerts when things break.
Customer issues discovered days later. Manual recovery impossible.

Why this breaks:
Even with retries, some workflows will fail permanently. Without
dead letter handling, you don't know they failed. The customer
waits forever, you're unaware, and there's no data to debug.

Recommended fix:

# Inngest onFailure handler:
export const myFunction = inngest.createFunction(
  {
    id: "process-order",
    onFailure: async ({ error, event, step }) => {
      // Log to error tracking
      await step.run("log-error", () =>
        sentry.captureException(error, { extra: { event } })
      );

      // Alert team
      await step.run("alert", () =>
        slack.postMessage({
          channel: "#alerts",
          text: `Order ${event.data.orderId} failed: ${error.message}`
        })
      );

      // Queue for manual review
      await step.run("queue-review", () =>
        db.insert(failedOrders, { orderId, error, event })
      );
    }
  },
  { event: "order/created" },
  async ({ event, step }) => { ... }
);

# n8n Error Trigger:
[Error Trigger]  →  [Log to DB]  →  [Slack Alert]  →  [Create Ticket]

# Temporal: Use workflow.failed or workflow signals

### n8n Workflow Without Error Trigger

Severity: MEDIUM

Situation: Building production n8n workflows

Symptoms:
Workflow fails silently. Errors only visible in execution logs.
No alerts, no recovery, no visibility until someone notices.

Why this breaks:
n8n doesn't notify on failure by default. Without an Error Trigger
node connected to alerting, failures are only visible in the UI.
Production failures go unnoticed.

Recommended fix:

# Every production n8n workflow needs:

1. Error Trigger node
   - Catches any node failure in the workflow
   - Provides error details and context

2. Connected error handling:
   [Error Trigger]
       ↓
   [Set: Extract Error Details]
       ↓
   [HTTP: Log to Error Service]
       ↓
   [Slack/Email: Alert Team]

3. Consider dead letter pattern:
   [Error Trigger]
       ↓
   [Redis/Postgres: Store Failed Job]
       ↓
   [Separate Recovery Workflow]

# Also use:
- Retry on node failures (built-in)
- Node timeout settings
- Workflow timeout

### Long-Running Temporal Activities Without Heartbeat

Severity: MEDIUM

Situation: Activities that run for more than a few seconds

Symptoms:
Activity timeouts even when work is progressing. Lost work when
workers restart. Can't cancel long-running activities.

Why this breaks:
Temporal detects stuck activities via heartbeat. Without heartbeat,
Temporal can't tell if activity is working or stuck. Long activities
appear hung, may timeout, and can't be gracefully cancelled.

Recommended fix:

# For any activity > 10 seconds, add heartbeat:

import { heartbeat, activityInfo } from '@temporalio/activity';

export async function processLargeFile(fileUrl: string): Promise<void> {
  const chunks = await downloadChunks(fileUrl);

  for (let i = 0; i < chunks.length; i++) {
    // Check for cancellation
    const { cancelled } = activityInfo();
    if (cancelled) {
      throw new CancelledFailure('Activity cancelled');
    }

    await processChunk(chunks[i]);

    // Report progress
    heartbeat({ progress: (i + 1) / chunks.length });
  }
}

# Configure heartbeat timeout:
const activities = proxyActivities({
  startToCloseTimeout: '10 minutes',
  heartbeatTimeout: '30 seconds',  # Must heartbeat every 30s
});

# If no heartbeat for 30s, activity is considered stuck

## Validation Checks

### External Calls Without Idempotency Key

Severity: ERROR

Stripe/payment calls should use idempotency keys

Message: Payment call without idempotency_key. Add idempotency key to prevent duplicate charges on retry.

### Email Sending Without Deduplication

Severity: WARNING

Email sends in workflows should check for already-sent

Message: Email sent in workflow without deduplication check. Retries may send duplicate emails.

### Temporal Activities Without Timeout

Severity: ERROR

All Temporal activities need timeout configuration

Message: proxyActivities without timeout. Add startToCloseTimeout to prevent indefinite hangs.

### Inngest Steps Calling External APIs Without Timeout

Severity: WARNING

External API calls should have timeouts

Message: External API call in step without timeout. Add timeout to prevent workflow hangs.

### Random Values in Workflow Code

Severity: ERROR

Random values break determinism on replay

Message: Random value in workflow code. Move to activity/step or use sideEffect.

### Date.now() in Workflow Code

Severity: ERROR

Current time breaks determinism on replay

Message: Current time in workflow code. Use workflow.now() or move to activity/step.

### Inngest Function Without onFailure Handler

Severity: WARNING

Production functions should have failure handlers

Message: Inngest function without onFailure handler. Add failure handling for production reliability.

### Step Without Error Handling

Severity: WARNING

Steps should handle errors gracefully

Message: Step without try/catch. Consider handling specific error cases.

### Potentially Large Data Returned from Step

Severity: INFO

Large data in workflow state slows execution

Message: Returning potentially large data from step. Consider storing in S3/DB and returning reference.

### Retry Without Backoff Configuration

Severity: WARNING

Retries should use exponential backoff

Message: Retry configured without backoff. Add backoffCoefficient and initialInterval.

## Collaboration

### Delegation Triggers

- user needs multi-agent coordination -> multi-agent-orchestration (Workflow provides infrastructure, orchestration provides patterns)
- user needs tool building for workflows -> agent-tool-builder (Tools that workflows can invoke)
- user needs Zapier/Make integration -> zapier-make-patterns (No-code automation platforms)
- user needs browser automation in workflow -> browser-automation (Playwright/Puppeteer activities)
- user needs computer control in workflow -> computer-use-agents (Desktop automation activities)
- user needs LLM integration in workflow -> llm-architect (AI-powered workflow steps)

## Related Skills

Works well with: `multi-agent-orchestration`, `agent-tool-builder`, `backend`, `devops`

## When to Use
- User mentions or implies: workflow
- User mentions or implies: automation
- User mentions or implies: n8n
- User mentions or implies: temporal
- User mentions or implies: inngest
- User mentions or implies: step function
- User mentions or implies: background job
- User mentions or implies: durable execution
- User mentions or implies: event-driven
- User mentions or implies: scheduled task
- User mentions or implies: job queue
- User mentions or implies: cron
- User mentions or implies: trigger

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
