---
id: workflow-resumable-stream-routes
title: Workflow resumable stream routes
status: active
candidateKinds: ["slow_route"]
frameworks: ["*"]
routePatterns: ["(^|/)api/.*/stream/?$", "(^|/)chat/.*/stream/?$", "\\[id\\].*/stream"]
priority: 98
citations: ["https://workflow-sdk.dev/docs/ai/resumable-streams", "https://workflow-sdk.dev/docs/foundations/streaming", "https://vercel.com/docs/workflow"]
maxBriefChars: 850
---

## Investigation Brief
Stream-shaped routes may be Workflow SDK reconnection endpoints. Long wall-clock duration can be the live client connection.

## Evidence To Check
Look for `WorkflowChatTransport`, `getRun`, `run.getReadable`, `startIndex`, `x-workflow-run-id`, `x-workflow-stream-tail-index`, `getWritable`, or `createUIMessageStreamResponse`. Compare CPU, TTFB, wall-clock. Check full replay, missing tail-index, unreleased locks, or unclosed streams.

## Do Not Recommend When
Do not cache stream endpoints or remove resumability. Do not call high duration a bug when CPU is low, TTFB is healthy, and the route only holds a client connection.

## Verification
Name whether the route starts or reconnects a run, then cite the exact waste: replay, missing tail-index, lock leak, unclosed stream, high CPU, or avoidable pre-first-byte work.
