---
id: route-error-durable-offload
title: Durable offload for timeout-heavy routes
status: active
candidateKinds: ["route_errors"]
frameworks: ["*"]
priority: 84
citations: ["https://vercel.com/docs/workflow", "https://workflow-sdk.dev/docs/foundations/starting-workflows", "https://workflow-sdk.dev/docs/foundations/workflows-and-steps", "https://vercel.com/docs/queues", "https://vercel.com/docs/functions/limitations"]
maxBriefChars: 850
---

## Investigation Brief
Timeout-heavy routes often need a job boundary, not a higher limit. Workflow fits durable multi-step work that can continue after the response; return a run ID instead of waiting on `returnValue`.

## Evidence To Check
Use `errorStatusPattern`, `errorCodes`, and source flow. Look for fan-out, polling, batch work, AI jobs, uploads, sleeps, approval, multi-step side effects. If Workflow is already used, check whether the route waits or streams progress.

## Do Not Recommend When
Do not offload work that must finish before responding. Do not claim savings from offload alone: Workflow Steps/Storage bill separately, and invoked functions still use compute billing.

## Verification
Name the timeout/error class, long-running operation, post-enqueue response contract, and queue or workflow boundary that preserves semantics.
