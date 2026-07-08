---
title: Set Queue Priority for Workflows
impact: HIGH
impactDescription: Ensures important work runs first
tags: queue, priority, ordering, scheduling
---

## Set Queue Priority for Workflows

Use priority to control which workflows run first. Lower numbers = higher priority.

**Incorrect (no priority control):**

```python
queue = Queue("tasks")

# All tasks treated equally - urgent tasks may wait
for task in tasks:
    queue.enqueue(process_task, task)
```

**Correct (with priority):**

```python
from dbos import Queue, SetEnqueueOptions

# Must enable priority on the queue
queue = Queue("tasks", priority_enabled=True)

@DBOS.workflow()
def process_task(task):
    pass

def enqueue_task(task, is_urgent: bool):
    # Priority 1 = highest, runs before priority 10
    priority = 1 if is_urgent else 10
    with SetEnqueueOptions(priority=priority):
        queue.enqueue(process_task, task)
```

Priority behavior:
- Range: 1 to 2,147,483,647 (lower = higher priority)
- Workflows without priority have highest priority (run first)
- Same priority = FIFO order
- Must set `priority_enabled=True` on queue

Example with multiple priority levels:

```python
queue = Queue("jobs", priority_enabled=True)

PRIORITY_CRITICAL = 1
PRIORITY_HIGH = 10
PRIORITY_NORMAL = 100
PRIORITY_LOW = 1000

def enqueue_job(job, level):
    with SetEnqueueOptions(priority=level):
        queue.enqueue(process_job, job)
```

Reference: [Queue Priority](https://docs.dbos.dev/python/tutorials/queue-tutorial#priority)
