---
title: Use Streams for Real-Time Data
impact: MEDIUM
impactDescription: Enables streaming results from long-running workflows
tags: communication, stream, real-time, async-generator
---

## Use Streams for Real-Time Data

Workflows can stream data to clients in real-time using `DBOS.writeStream`, `DBOS.closeStream`, and `DBOS.readStream`. Useful for LLM output streaming or progress reporting.

**Incorrect (accumulating results then returning at end):**

```typescript
async function processWorkflowFn() {
  const results: string[] = [];
  for (const chunk of data) {
    results.push(await processChunk(chunk));
  }
  return results; // Client must wait for entire workflow to complete
}
```

**Correct (streaming results as they become available):**

```typescript
async function processWorkflowFn() {
  for (const chunk of data) {
    const result = await DBOS.runStep(() => processChunk(chunk), { name: "process" });
    await DBOS.writeStream("results", result);
  }
  await DBOS.closeStream("results"); // Signal completion
}
const processWorkflow = DBOS.registerWorkflow(processWorkflowFn);

// Read the stream from outside
const handle = await DBOS.startWorkflow(processWorkflow)();
for await (const value of DBOS.readStream<string>(handle.workflowID, "results")) {
  console.log(`Received: ${value}`);
}
```

Key behaviors:
- A workflow may have any number of streams, each identified by a unique key
- Streams are immutable and append-only
- Writes from workflows happen exactly-once
- Writes from steps happen at-least-once (retried steps may write duplicates)
- Streams are automatically closed when the workflow terminates
- `readStream` returns an async generator that yields values until the stream is closed

You can also read streams from outside the DBOS application using `DBOSClient.readStream`.

Reference: [Workflow Streaming](https://docs.dbos.dev/typescript/tutorials/workflow-communication#workflow-streaming)
