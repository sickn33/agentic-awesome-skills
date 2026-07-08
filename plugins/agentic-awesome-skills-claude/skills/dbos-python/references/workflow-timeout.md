---
title: Set Workflow Timeouts
impact: CRITICAL
impactDescription: Prevents runaway workflows from consuming resources
tags: timeout, cancel, deadline, limits
---

## Set Workflow Timeouts

Use `SetWorkflowTimeout` to limit workflow execution time. Timed-out workflows are cancelled.

**Incorrect (no timeout):**

```python
@DBOS.workflow()
def potentially_long_workflow():
    # Could run forever!
    while not done:
        process_next()
```

**Correct (with timeout):**

```python
from dbos import SetWorkflowTimeout

@DBOS.workflow()
def bounded_workflow():
    while not done:
        process_next()

# Workflow must complete within 60 seconds
with SetWorkflowTimeout(60):
    bounded_workflow()

# Or with start_workflow
with SetWorkflowTimeout(60):
    handle = DBOS.start_workflow(bounded_workflow)
```

Timeout behavior:
- Timeout is **start-to-completion** (doesn't count queue wait time)
- Timeouts are **durable** (persist across restarts)
- Cancellation happens at the **beginning of the next step**
- **All child workflows** are also cancelled

With queues:

```python
queue = Queue("example_queue")

# Timeout starts when dequeued, not when enqueued
with SetWorkflowTimeout(30):
    queue.enqueue(my_workflow)
```

Timeouts work with long durations (hours, days, weeks) since they're stored in the database.

Reference: [Workflow Timeouts](https://docs.dbos.dev/python/tutorials/workflow-tutorial#workflow-timeouts)
