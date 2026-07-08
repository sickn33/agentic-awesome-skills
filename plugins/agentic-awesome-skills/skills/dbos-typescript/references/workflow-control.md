---
title: Cancel, Resume, and Fork Workflows
impact: CRITICAL
impactDescription: Enables operational control over long-running workflows
tags: workflow, cancel, resume, fork, management
---

## Cancel, Resume, and Fork Workflows

DBOS provides methods to cancel, resume, and fork workflows for operational control.

**Incorrect (no way to handle stuck or failed workflows):**

```typescript
// Workflow is stuck or failed - no recovery mechanism
const handle = await DBOS.startWorkflow(processTask)("data");
// If the workflow fails, there's no way to retry or recover
```

**Correct (using cancel, resume, and fork):**

```typescript
// Cancel a workflow - stops at its next step
await DBOS.cancelWorkflow(workflowID);

// Resume from the last completed step
const handle = await DBOS.resumeWorkflow<string>(workflowID);
const result = await handle.getResult();
```

Cancellation sets the workflow status to `CANCELLED` and preempts execution at the beginning of the next step. Cancelling also cancels all child workflows.

Resume restarts a workflow from its last completed step. Use this for workflows that are cancelled or have exceeded their maximum recovery attempts. You can also use this to start an enqueued workflow immediately, bypassing its queue.

Fork a workflow from a specific step:

```typescript
// List steps to find the right step ID
const steps = await DBOS.listWorkflowSteps(workflowID);
// steps[i].functionID is the step's ID

// Fork from a specific step
const forkHandle = await DBOS.forkWorkflow<string>(
  workflowID,
  startStep,
  {
    newWorkflowID: "new-wf-id",
    applicationVersion: "2.0.0",
    timeoutMS: 60000,
  }
);
const forkResult = await forkHandle.getResult();
```

Forking creates a new workflow with a new ID, copying the original workflow's inputs and step outputs up to the selected step. Useful for recovering from downstream service outages or patching workflows that failed due to a bug.

Reference: [Workflow Management](https://docs.dbos.dev/typescript/tutorials/workflow-management)
